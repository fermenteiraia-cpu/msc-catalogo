import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { err, ok, type AppError, type Result } from "@/lib/result";

export type RenderRunStatus = "queued" | "running" | "success" | "failed";

export interface RenderRun {
  id: string;
  catalog_id: string;
  status: RenderRunStatus;
  pages_total: number;
  pages_done: number;
  github_run_url: string | null;
  error: { message?: string } | null;
  started_at: string;
  completed_at: string | null;
}

export type PageRenderStatus = "pending" | "rendering" | "ready" | "failed";

export interface CatalogPageRender {
  id: string;
  catalog_id: string;
  page_index: number;
  page_kind: string;
  status: PageRenderStatus;
  image_url: string | null;
  error: { message?: string } | null;
}

/** Um render_run em 'queued' ou 'running' ainda está acontecendo. */
export function isRunActive(run: RenderRun | null | undefined): boolean {
  return Boolean(run && (run.status === "queued" || run.status === "running"));
}

/**
 * Último render_run do catálogo. Enquanto estiver ativo (queued/running),
 * refaz a busca a cada 4s pra acompanhar o progresso.
 */
export function useLatestRenderRun(catalogId: string | undefined) {
  return useQuery({
    queryKey: ["render-run", catalogId ?? null],
    enabled: Boolean(catalogId),
    refetchInterval: (query) => {
      const data = query.state.data as RenderRun | null | undefined;
      return isRunActive(data) ? 4000 : false;
    },
    queryFn: async (): Promise<RenderRun | null> => {
      if (!catalogId) return null;
      const { data, error } = await supabase
        .from("render_runs")
        .select(
          "id,catalog_id,status,pages_total,pages_done,github_run_url,error,started_at,completed_at",
        )
        .eq("catalog_id", catalogId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as unknown as RenderRun | null) ?? null;
    },
  });
}

/**
 * Artes renderizadas de cada página do catálogo. Enquanto um render está
 * ativo, refaz a busca a cada 4s pra ir mostrando as páginas que ficam prontas.
 */
export function useCatalogPageRenders(
  catalogId: string | undefined,
  runActive: boolean,
) {
  return useQuery({
    queryKey: ["page-renders", catalogId ?? null],
    enabled: Boolean(catalogId),
    refetchInterval: runActive ? 4000 : false,
    queryFn: async (): Promise<CatalogPageRender[]> => {
      if (!catalogId) return [];
      const { data, error } = await supabase
        .from("catalog_page_renders")
        .select("id,catalog_id,page_index,page_kind,status,image_url,error")
        .eq("catalog_id", catalogId)
        .order("page_index", { ascending: true });
      if (error) throw new Error(error.message);
      return (data as unknown as CatalogPageRender[]) ?? [];
    },
  });
}

/**
 * Dispara a geração da arte final chamando a Edge Function trigger-render
 * (que aciona o workflow do GitHub Actions).
 */
export function useTriggerRender() {
  const queryClient = useQueryClient();

  return useMutation<
    Result<{ renderRunId: string }, AppError>,
    never,
    { catalogId: string }
  >({
    mutationFn: async ({ catalogId }) => {
      const { data, error } = await supabase.functions.invoke<{
        ok?: boolean;
        render_run_id?: string;
        code?: string;
        message?: string;
      }>("trigger-render", { method: "POST", body: { catalogId } });

      if (error) {
        let payload: { code?: string; message?: string } | null = null;
        const ctx = (error as { context?: unknown }).context;
        if (ctx instanceof Response) {
          try {
            payload = await ctx.json();
          } catch {
            payload = null;
          }
        }
        return err({
          code: payload?.code ?? "RENDER_TRIGGER_FAILED",
          message:
            payload?.message ??
            "Não foi possível iniciar a geração da arte. Tente de novo.",
          retryable: true,
          details: error,
        });
      }

      if (!data?.ok || !data.render_run_id) {
        return err({
          code: data?.code ?? "RENDER_TRIGGER_FAILED",
          message:
            data?.message ?? "Não foi possível iniciar a geração da arte.",
          retryable: true,
        });
      }

      return ok({ renderRunId: data.render_run_id });
    },
    onSettled: (_result, _err, variables) => {
      // Em qualquer caso, recarrega o status — se já houver um run rodando,
      // o poll assume daqui.
      queryClient.invalidateQueries({
        queryKey: ["render-run", variables.catalogId],
      });
      queryClient.invalidateQueries({
        queryKey: ["page-renders", variables.catalogId],
      });
    },
  });
}
