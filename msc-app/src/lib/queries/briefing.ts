import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { err, ok, type AppError, type Result } from "@/lib/result";
import { TENANT_ID } from "@/lib/constants";
import {
  campaignSpecSchema,
  type CampaignSpec,
} from "@/lib/schemas/campaign-spec";
import { useAuthStore } from "@/stores/auth";

/* ============================================================
 *  Catálogos anteriores — fonte do <select> "Aproveitar"
 * ============================================================ */

/** Catálogo com campaign_spec preenchido, oferecido como ponto de partida. */
export interface ReusableCatalog {
  id: string;
  name: string;
}

/**
 * Lista catálogos que já têm um `campaign_spec` (não-nulo), ordenados pelo
 * mais recente. São os candidatos a "Aproveitar uma campanha anterior".
 */
export function useReusableCatalogs() {
  return useQuery({
    queryKey: ["reusable-catalogs"],
    queryFn: async (): Promise<ReusableCatalog[]> => {
      const { data, error } = await supabase
        .from("catalogs")
        .select("id,name,campaign_spec")
        .not("campaign_spec", "is", null)
        .order("updated_at", { ascending: false });

      if (error) throw new Error(error.message);

      const rows = (data ?? []) as unknown as Array<{
        id: string;
        name: string;
        campaign_spec: unknown;
      }>;
      return rows.map((row) => ({ id: row.id, name: row.name }));
    },
  });
}

/* ============================================================
 *  term_templates — biblioteca de frases prontas
 * ============================================================ */

/** Linha da tabela term_templates. */
export interface TermTemplate {
  id: string;
  template_id: string;
  pattern: string;
  params_schema: Record<string, unknown>;
  category: string | null;
  scope: string | null;
  is_active: boolean;
}

/**
 * Lista os term_templates ativos do tenant — a "biblioteca" de frases que a
 * IA escolhe e que a Amanda pode trocar/adicionar.
 */
export function useTermTemplates() {
  return useQuery({
    queryKey: ["term-templates"],
    queryFn: async (): Promise<TermTemplate[]> => {
      const { data, error } = await supabase
        .from("term_templates")
        .select("id,template_id,pattern,params_schema,category,scope,is_active")
        .eq("is_active", true)
        .order("template_id", { ascending: true });

      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as TermTemplate[];
    },
  });
}

/**
 * Interpola o `pattern` de um term_template com os `params` de um item.
 * Ex.: "Em {parcelas}X no carnê" + { parcelas: 16 } → "Em 16X no carnê".
 * Placeholders sem valor permanecem visíveis ({assim}) pra sinalizar lacuna.
 */
export function renderTermPattern(
  pattern: string,
  params: Record<string, unknown>,
): string {
  return pattern.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    if (value === undefined || value === null || value === "") return match;
    return String(value);
  });
}

/* ============================================================
 *  generate-briefing — invocação da Edge Function
 * ============================================================ */

export type BriefingMode = "do-zero" | "aproveitar" | "imagem";

export interface GenerateBriefingInput {
  theme: string;
  mode: BriefingMode;
  baseCatalogId?: string;
  imageUrls?: string[];
}

export interface GenerateBriefingSuccess {
  spec: CampaignSpec;
  houseConfigVersion: number;
}

interface GenerateBriefingResponse {
  ok: boolean;
  spec?: unknown;
  houseConfigVersion?: number;
  code?: string;
  message?: string;
}

/**
 * Invoca a Edge Function `generate-briefing` e valida a resposta com Zod.
 * Toda falha vira um `Result` — nada é lançado pro chamador.
 */
export function useGenerateBriefing() {
  return useMutation<
    Result<GenerateBriefingSuccess, AppError>,
    never,
    GenerateBriefingInput
  >({
    mutationFn: async (input) => {
      const { data, error } =
        await supabase.functions.invoke<GenerateBriefingResponse>(
          "generate-briefing",
          { method: "POST", body: input },
        );

      if (error) {
        // Tenta extrair a mensagem amigável vinda no corpo da resposta.
        let payload: GenerateBriefingResponse | null = null;
        const ctx = (error as { context?: unknown }).context;
        if (ctx instanceof Response) {
          try {
            payload = (await ctx.json()) as GenerateBriefingResponse;
          } catch {
            payload = null;
          }
        }
        return err({
          code: payload?.code ?? "AI_REQUEST_FAILED",
          message:
            payload?.message ??
            "Não foi possível montar a campanha. Tente novamente em instantes.",
          retryable: true,
          details: error,
        });
      }

      if (!data || !data.ok || !data.spec) {
        return err({
          code: data?.code ?? "AI_REQUEST_FAILED",
          message:
            data?.message ??
            "A IA não conseguiu montar a campanha. Tente de novo.",
          retryable: true,
        });
      }

      const validation = campaignSpecSchema.safeParse(data.spec);
      if (!validation.success) {
        return err({
          code: "AI_OUTPUT_INVALID",
          message:
            "A IA retornou um briefing fora do formato esperado. Tente de novo.",
          retryable: true,
          details: validation.error.flatten(),
        });
      }

      return ok({
        spec: validation.data,
        houseConfigVersion: data.houseConfigVersion ?? 1,
      });
    },
  });
}

/* ============================================================
 *  Catálogo — criar a partir do briefing
 * ============================================================ */

/** Normaliza uma string num slug url-safe. */
function toSlug(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 7);
}

export interface CreateCatalogInput {
  spec: CampaignSpec;
  houseConfigVersion: number;
}

export interface CreateCatalogSuccess {
  catalogId: string;
}

/**
 * Cria a linha em `catalogs` (status 'draft') a partir do CampaignSpec gerado,
 * e registra a entrada de `audit_log`. Em colisão de slug (23505), tenta de
 * novo com um sufixo aleatório.
 */
export function useCreateCatalogFromBriefing() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation<
    Result<CreateCatalogSuccess, AppError>,
    never,
    CreateCatalogInput
  >({
    mutationFn: async ({ spec, houseConfigVersion }) => {
      if (!user) {
        return err({
          code: "AUTH_REQUIRED",
          message: "Você precisa estar autenticado.",
          retryable: false,
        });
      }

      const baseSlug = toSlug(spec.campaign.slug || spec.campaign.name);
      let slug = baseSlug || `campanha-${randomSuffix()}`;

      const buildRow = (catalogSlug: string) => ({
        tenant_id: TENANT_ID,
        name: spec.campaign.name,
        slug: catalogSlug,
        theme_key: spec.campaign.theme_key,
        status: "draft" as const,
        campaign_spec: spec,
        period_start: spec.period.start_date,
        period_end: spec.period.end_date,
        house_config_version: houseConfigVersion,
        created_by: user.id,
      });

      let insertResult = await supabase
        .from("catalogs")
        .insert(buildRow(slug))
        .select("id")
        .single();

      // 23505 = unique_violation no Postgres (slug duplicado).
      if (insertResult.error?.code === "23505") {
        slug = `${baseSlug || "campanha"}-${randomSuffix()}`;
        insertResult = await supabase
          .from("catalogs")
          .insert(buildRow(slug))
          .select("id")
          .single();
      }

      if (insertResult.error || !insertResult.data) {
        return err({
          code: "CATALOG_INSERT_FAILED",
          message: "Não foi possível salvar a campanha gerada.",
          retryable: true,
          details: insertResult.error?.message,
        });
      }

      const catalogId = (insertResult.data as { id: string }).id;

      await supabase.from("audit_log").insert({
        tenant_id: TENANT_ID,
        entity_type: "catalog",
        entity_id: catalogId,
        action: "create",
        actor: `user:${user.id}`,
        actor_user_id: user.id,
        changes: { campaign_spec: spec },
        metadata: { source: "ai-briefer" },
      });

      return ok({ catalogId });
    },
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ["catalogs-list"] });
        queryClient.invalidateQueries({ queryKey: ["catalog-counts"] });
        queryClient.invalidateQueries({ queryKey: ["reusable-catalogs"] });
      }
    },
  });
}

/* ============================================================
 *  Catálogo — atualizar (pré-edição com debounce)
 * ============================================================ */

export interface UpdateCatalogInput {
  catalogId: string;
  spec: CampaignSpec;
}

/**
 * Persiste o CampaignSpec editado de volta no catálogo, junto com name e
 * período derivados do spec. Chamado com debounce conforme a Amanda mexe nos
 * campos da coluna direita.
 */
export function useUpdateCatalogSpec() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation<Result<null, AppError>, never, UpdateCatalogInput>({
    mutationFn: async ({ catalogId, spec }) => {
      const { error } = await supabase
        .from("catalogs")
        .update({
          name: spec.campaign.name,
          theme_key: spec.campaign.theme_key,
          campaign_spec: spec,
          period_start: spec.period.start_date,
          period_end: spec.period.end_date,
        })
        .eq("id", catalogId);

      if (error) {
        return err({
          code: "CATALOG_UPDATE_FAILED",
          message: "Não foi possível salvar suas alterações.",
          retryable: true,
          details: error.message,
        });
      }

      if (user) {
        await supabase.from("audit_log").insert({
          tenant_id: TENANT_ID,
          entity_type: "catalog",
          entity_id: catalogId,
          action: "update",
          actor: `user:${user.id}`,
          actor_user_id: user.id,
          changes: { campaign_spec: spec },
          metadata: { source: "briefing-pre-edit" },
        });
      }

      return ok(null);
    },
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ["catalogs-list"] });
      }
    },
  });
}

/* ============================================================
 *  Upload de imagens de inspiração para o Storage
 * ============================================================ */

const INSPIRATION_BUCKET = "briefing-inspirations";

export interface UploadInspirationsSuccess {
  urls: string[];
}

/**
 * Faz upload de até 3 imagens de inspiração para o bucket público
 * `briefing-inspirations` e devolve as URLs públicas. Se o bucket não existir,
 * o erro é capturado e vira uma mensagem amigável.
 */
export async function uploadInspirationImages(
  files: File[],
): Promise<Result<UploadInspirationsSuccess, AppError>> {
  const urls: string[] = [];

  for (const file of files.slice(0, 3)) {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from(INSPIRATION_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("not found") || msg.includes("bucket")) {
        return err({
          code: "STORAGE_BUCKET_MISSING",
          message:
            "O espaço para imagens de inspiração ainda não foi criado. Contate o administrador.",
          retryable: false,
          details: error.message,
        });
      }
      return err({
        code: "STORAGE_UPLOAD_FAILED",
        message: "Não foi possível enviar a imagem. Tente novamente.",
        retryable: true,
        details: error.message,
      });
    }

    const { data: publicData } = supabase.storage
      .from(INSPIRATION_BUCKET)
      .getPublicUrl(path);
    urls.push(publicData.publicUrl);
  }

  return ok({ urls });
}
