// supabase/functions/generate-briefing/index.ts
//
// Edge Function (Deno). Transforma o tema livre da Amanda (marketing) num
// CampaignSpec estruturado, usando Claude Sonnet 4.5.
//
// Fluxo:
//   1. Lê Authorization header → valida session via Supabase getUser
//   2. Valida o body { theme, mode, baseCatalogId?, imageUrls? }
//   3. Carrega o house_config corrente (service role) pra contexto de marca
//   4. Para mode='aproveitar', carrega o campaign_spec do catálogo base
//   5. Chama a Anthropic API via fetch direto (cert válido — sem bypass TLS)
//   6. Faz strip de cercas markdown + validação estrutural do CampaignSpec
//   7. Registra um ai_runs row (provider 'anthropic', purpose 'briefer')
//   8. Retorna { ok:true, spec } ou { ok:false, code, message }
//
// Env vars (Supabase secrets):
//   SUPABASE_URL                 — runtime
//   SUPABASE_SERVICE_ROLE_KEY    — runtime
//   SUPABASE_ANON_KEY            — runtime
//   ANTHROPIC_API_KEY            — chave da Anthropic

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.4";

// Snapshot fixado do Claude Sonnet 4.5.
const CLAUDE_BRIEFER_MODEL = "claude-sonnet-4-5-20250929";

// CORS pra o SPA Vite chamar.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TENANT_ID = "00000000-0000-0000-0000-000000000001";

const KNOWN_TEMPLATE_IDS = [
  "carne_msc",
  "cartao_sem_juros",
  "parc_facilitado",
  "entrega_montagem_gratis",
  "tv_polegadas",
  "selo_mdf",
  "peso_colchao",
  "legal_validity",
] as const;

// SYSTEM PROMPT — portado verbatim do legacy claude-briefer.ts.
const SYSTEM_PROMPT =
  `Você é o briefer criativo da Lojas MSC, uma rede de varejo brasileira.

Você recebe da Amanda (time de marketing) uma descrição livre de uma campanha promocional, junto com o house_config da marca (contexto de marca, lojas, redes sociais e textos legais).

Sua tarefa é transformar essa descrição em um JSON estruturado seguindo EXATAMENTE o schema CampaignSpec abaixo.

REGRAS CRÍTICAS:
- Responda APENAS com o JSON cru. Sem markdown, sem cercas de código, sem comentários, sem texto antes ou depois.
- NUNCA invente textos legais, preços ou constantes da marca. Esses valores vêm do house_config e de templates.
- Você só preenche os campos de "creative", escolhe o "theme_key", sugere os "cta_blocks", escolhe os "terms_on_cover.items.template_id" a partir da lista conhecida, e deriva "audit_config.forbidden_strings".
- Para terms_on_cover.items, use SOMENTE template_ids desta lista: ${
    KNOWN_TEMPLATE_IDS.join(", ")
  }.
- Os params de cada template devem ser um objeto (pode ser vazio {}) — não invente valores legais; deixe params mínimos quando não tiver certeza.
- audit_config.forbidden_strings: liste termos que NÃO podem aparecer na peça (ex: nomes de concorrentes, promessas proibidas, termos fora do tom da campanha).

Schema CampaignSpec (responda com um objeto JSON exatamente nesta forma):
{
  "campaign": { "name": string, "slug": string (url-safe, minúsculas, hifens), "theme_key": "maes" | "abril" | "natal" | "black-friday" | "custom" },
  "creative": {
    "headline": {
      "top": string | null,
      "main": string,
      "sub": string | null,
      "ornament": "heart-in-tilde" | "balloon" | "flag-bunting" | "money-rain" | "none",
      "lettering_style": "3d-bubble-glossy" | "3d-extrusion" | "neon" | "flat-bold"
    },
    "palette": {
      "mode": "light-warm" | "dark-cool" | "light-vibrant" | "dark-vibrant",
      "primary": string (hex),
      "secondary": string (hex),
      "accent_seal": string (hex),
      "bg_style": string (máximo 8 palavras)
    },
    "decoration": {
      "elements": string[] (3 a 6 itens),
      "density": "baixa" | "média" | "alta",
      "mood": string[] (2 a 4 itens)
    },
    "slogan_on_cover": string | null
  },
  "cta_blocks": [ { "topline": string | null, "value": string, "label": string, "shape": "stacked" | "square" | "torn-calendar" | "circle", "color_scheme": "primary" | "secondary" | "white-on-transparent" } ] (1 a 2 itens),
  "terms_on_cover": { "render_mode": "text_list" | "side_seal" | "absorbed_in_cta" | "none", "items": [ { "template_id": string, "params": object } ] },
  "period": { "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "display_on_cover": { "enabled": boolean, "lines": string[] | null } },
  "audit_config": { "forbidden_strings": string[] }
}`;

type BriefingMode = "do-zero" | "aproveitar" | "imagem";

interface BriefingBody {
  theme: string;
  mode: BriefingMode;
  baseCatalogId?: string;
  imageUrls?: string[];
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Remove cercas de código markdown caso o modelo as tenha incluído. */
function stripFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

/**
 * Checagem estrutural leve do CampaignSpec. A validação Zod completa roda no
 * cliente — aqui só garantimos que os campos essenciais existem antes de
 * devolver pro frontend.
 */
function looksLikeCampaignSpec(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  const campaign = obj.campaign as Record<string, unknown> | undefined;
  const creative = obj.creative as Record<string, unknown> | undefined;
  if (!campaign || typeof campaign.name !== "string") return false;
  if (!creative || typeof creative.headline !== "object") return false;
  if (!Array.isArray(obj.cta_blocks)) return false;
  if (typeof obj.period !== "object" || obj.period === null) return false;
  return true;
}

interface AnthropicTextBlock {
  type: "text";
  text: string;
}

interface AnthropicResponse {
  content: Array<AnthropicTextBlock | { type: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

/** Tipo de bloco aceito pela mensagem do usuário (texto ou imagem). */
type UserContentBlock =
  | { type: "text"; text: string }
  | {
    type: "image";
    source: { type: "url"; url: string };
  };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, {
      ok: false,
      code: "METHOD_NOT_ALLOWED",
      message: "Use POST.",
    });
  }

  // --- 1. Auth: pega o user do JWT no Authorization header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(401, {
      ok: false,
      code: "AUTH_REQUIRED",
      message: "Você precisa estar autenticado.",
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(500, {
      ok: false,
      code: "SERVER_MISCONFIGURED",
      message: "Configuração do servidor incompleta.",
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();

  if (userError || !userData?.user) {
    return jsonResponse(401, {
      ok: false,
      code: "AUTH_INVALID",
      message: "Sessão inválida ou expirada.",
    });
  }

  // --- 2. Valida o body
  let body: BriefingBody;
  try {
    body = (await req.json()) as BriefingBody;
  } catch {
    return jsonResponse(400, {
      ok: false,
      code: "INPUT_INVALID",
      message: "Corpo da requisição inválido.",
    });
  }

  const theme = typeof body.theme === "string" ? body.theme.trim() : "";
  const mode = body.mode;
  if (theme.length < 4) {
    return jsonResponse(400, {
      ok: false,
      code: "INPUT_INVALID",
      message: "Conta um pouco mais sobre o tema da campanha.",
    });
  }
  if (mode !== "do-zero" && mode !== "aproveitar" && mode !== "imagem") {
    return jsonResponse(400, {
      ok: false,
      code: "INPUT_INVALID",
      message: "Modo de início inválido.",
    });
  }

  // --- 3. ANTHROPIC_API_KEY
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    return jsonResponse(500, {
      ok: false,
      code: "AI_CONFIG_MISSING",
      message:
        "A chave da IA não está configurada. Contate o administrador.",
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // --- 4. Carrega o house_config corrente
  const { data: houseConfig, error: houseConfigError } = await adminClient
    .from("house_config")
    .select("data, version")
    .eq("tenant_id", TENANT_ID)
    .eq("is_current", true)
    .single();

  if (houseConfigError || !houseConfig) {
    return jsonResponse(500, {
      ok: false,
      code: "HOUSE_CONFIG_MISSING",
      message:
        "Não foi possível carregar a configuração da marca. Contate o suporte.",
    });
  }

  // --- 5. Para 'aproveitar', carrega o campaign_spec do catálogo base
  let baseSpec: unknown = null;
  if (mode === "aproveitar" && body.baseCatalogId) {
    const { data: baseCatalog } = await adminClient
      .from("catalogs")
      .select("campaign_spec")
      .eq("id", body.baseCatalogId)
      .eq("tenant_id", TENANT_ID)
      .maybeSingle();
    baseSpec = baseCatalog?.campaign_spec ?? null;
  }

  // --- 6. Monta a mensagem do usuário
  const today = new Date().toISOString().slice(0, 10);

  const parts: string[] = [
    `Data de hoje: ${today}. Use o ano corrente quando a campanha não especificar o ano.`,
    "",
    "Descrição da campanha (Amanda):",
    theme,
  ];

  if (mode === "aproveitar" && baseSpec) {
    parts.push(
      "",
      "Campanha anterior usada como ponto de partida (ajuste o necessário, mantenha o que fizer sentido):",
      JSON.stringify(baseSpec, null, 2),
    );
  }

  if (mode === "imagem") {
    parts.push(
      "",
      "A Amanda anexou imagens de inspiração. Use-as como referência visual (cores, enfeites, clima) para preencher o creative.",
    );
  }

  parts.push(
    "",
    "house_config (contexto de marca — não invente nada além disso):",
    JSON.stringify(houseConfig.data, null, 2),
  );

  const userContent: UserContentBlock[] = [
    { type: "text", text: parts.join("\n") },
  ];

  if (mode === "imagem" && Array.isArray(body.imageUrls)) {
    for (const url of body.imageUrls.slice(0, 3)) {
      if (typeof url === "string" && url.length > 0) {
        userContent.push({ type: "image", source: { type: "url", url } });
      }
    }
  }

  // --- 7. Chama a Anthropic API (fetch direto — cert válido)
  const startedAt = Date.now();
  let anthropicResponse: Response;
  try {
    anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CLAUDE_BRIEFER_MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      }),
    });
  } catch (error) {
    return jsonResponse(502, {
      ok: false,
      code: "AI_REQUEST_FAILED",
      message: "Falha ao chamar o serviço de IA. Tente novamente em instantes.",
      details: error instanceof Error ? error.message : String(error),
    });
  }

  const latencyMs = Date.now() - startedAt;

  if (!anthropicResponse.ok) {
    const errorText = await anthropicResponse.text();
    console.error("[generate-briefing] Anthropic error:", errorText);
    await adminClient.from("ai_runs").insert({
      tenant_id: TENANT_ID,
      provider: "anthropic",
      model: CLAUDE_BRIEFER_MODEL,
      purpose: "briefer",
      latency_ms: latencyMs,
      status: "failed",
      error: {
        code: "AI_REQUEST_FAILED",
        message: `Anthropic respondeu ${anthropicResponse.status}`,
        details: errorText.slice(0, 500),
      },
    });
    return jsonResponse(502, {
      ok: false,
      code: "AI_REQUEST_FAILED",
      message: "O serviço de IA respondeu com erro. Tente novamente.",
    });
  }

  let anthropicData: AnthropicResponse;
  try {
    anthropicData = (await anthropicResponse.json()) as AnthropicResponse;
  } catch {
    return jsonResponse(502, {
      ok: false,
      code: "AI_OUTPUT_NOT_JSON",
      message: "A IA retornou uma resposta inesperada.",
    });
  }

  const textBlock = anthropicData.content.find(
    (block): block is AnthropicTextBlock => block.type === "text",
  );

  const inputTokens = anthropicData.usage?.input_tokens ?? 0;
  const outputTokens = anthropicData.usage?.output_tokens ?? 0;

  if (!textBlock) {
    await adminClient.from("ai_runs").insert({
      tenant_id: TENANT_ID,
      provider: "anthropic",
      model: CLAUDE_BRIEFER_MODEL,
      purpose: "briefer",
      latency_ms: latencyMs,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      status: "failed",
      error: { code: "AI_OUTPUT_EMPTY", message: "Sem conteúdo de texto." },
    });
    return jsonResponse(502, {
      ok: false,
      code: "AI_OUTPUT_EMPTY",
      message: "A IA não retornou nenhum conteúdo.",
    });
  }

  // --- 8. Parse + checagem estrutural
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFences(textBlock.text));
  } catch (error) {
    await adminClient.from("ai_runs").insert({
      tenant_id: TENANT_ID,
      provider: "anthropic",
      model: CLAUDE_BRIEFER_MODEL,
      purpose: "briefer",
      latency_ms: latencyMs,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      status: "failed",
      error: {
        code: "AI_OUTPUT_NOT_JSON",
        message: error instanceof Error ? error.message : String(error),
      },
    });
    return jsonResponse(502, {
      ok: false,
      code: "AI_OUTPUT_NOT_JSON",
      message: "A IA retornou um conteúdo que não é JSON válido.",
    });
  }

  if (!looksLikeCampaignSpec(parsed)) {
    await adminClient.from("ai_runs").insert({
      tenant_id: TENANT_ID,
      provider: "anthropic",
      model: CLAUDE_BRIEFER_MODEL,
      purpose: "briefer",
      latency_ms: latencyMs,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      status: "failed",
      error: {
        code: "AI_OUTPUT_INVALID",
        message: "Estrutura do CampaignSpec inválida.",
      },
    });
    return jsonResponse(502, {
      ok: false,
      code: "AI_OUTPUT_INVALID",
      message: "A IA retornou um briefing fora do formato esperado.",
    });
  }

  // --- 9. Registra o ai_run de sucesso
  await adminClient.from("ai_runs").insert({
    tenant_id: TENANT_ID,
    provider: "anthropic",
    model: CLAUDE_BRIEFER_MODEL,
    purpose: "briefer",
    latency_ms: latencyMs,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    status: "success",
  });

  return jsonResponse(200, {
    ok: true,
    spec: parsed,
    houseConfigVersion: houseConfig.version ?? 1,
  });
});
