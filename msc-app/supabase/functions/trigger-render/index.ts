// supabase/functions/trigger-render/index.ts
//
// Edge Function (Deno). Dispara o GitHub Action `render-catalog.yml`, que roda
// o gpt-image pra gerar a arte final 3D de cada página do catálogo.
//
// O render roda no GitHub Actions (e não numa Edge Function) porque cada
// página leva ~3 min — tempo que estoura o limite de uma função no plano
// grátis do Supabase. Mesmo padrão da `trigger-sync` (Terasoft).
//
// Fluxo:
//   1. Valida a sessão do usuário (Authorization header).
//   2. Cria uma linha em render_runs (status 'queued') via service role.
//   3. POST workflow_dispatches no GitHub com o PAT.
//   4. Devolve render_run_id pro frontend (que faz poll do status).
//
// Env vars (Supabase secrets):
//   SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY — do runtime
//   GITHUB_PAT / GITHUB_OWNER / GITHUB_REPO / GITHUB_REF — já usados na sync
//   GITHUB_RENDER_WORKFLOW_FILE — opcional (default "render-catalog.yml")

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TENANT_ID = "00000000-0000-0000-0000-000000000001";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { code: "METHOD_NOT_ALLOWED", message: "Use POST." });
  }

  // --- 1. Auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(401, {
      code: "AUTH_REQUIRED",
      message: "Você precisa estar autenticado.",
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(500, {
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
      code: "AUTH_INVALID",
      message: "Sessão inválida ou expirada.",
    });
  }
  const userId = userData.user.id;

  // --- Body: catalogId
  let catalogId: string | null = null;
  try {
    const body = await req.json();
    catalogId = typeof body?.catalogId === "string" ? body.catalogId : null;
  } catch {
    catalogId = null;
  }
  if (!catalogId) {
    return jsonResponse(400, {
      code: "CATALOG_ID_REQUIRED",
      message: "É preciso informar qual catálogo renderizar.",
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Catálogo existe?
  const { data: catalog, error: catalogError } = await adminClient
    .from("catalogs")
    .select("id")
    .eq("id", catalogId)
    .maybeSingle();
  if (catalogError || !catalog) {
    return jsonResponse(404, {
      code: "CATALOG_NOT_FOUND",
      message: "Catálogo não encontrado.",
    });
  }

  // Já existe um render em andamento? Evita disparos duplicados.
  const { data: running } = await adminClient
    .from("render_runs")
    .select("id")
    .eq("catalog_id", catalogId)
    .in("status", ["queued", "running"])
    .limit(1)
    .maybeSingle();
  if (running) {
    return jsonResponse(409, {
      code: "RENDER_ALREADY_RUNNING",
      message: "Já tem uma geração de arte em andamento pra esse catálogo.",
      render_run_id: running.id,
    });
  }

  // --- 2. Cria render_runs
  const { data: renderRun, error: renderRunError } = await adminClient
    .from("render_runs")
    .insert({
      tenant_id: TENANT_ID,
      catalog_id: catalogId,
      triggered_by: `user:${userId}`,
      triggered_by_user_id: userId,
      status: "queued",
    })
    .select("id")
    .single();
  if (renderRunError || !renderRun) {
    return jsonResponse(500, {
      code: "RENDER_RUN_CREATE_FAILED",
      message: "Não foi possível registrar a geração de arte.",
      details: renderRunError?.message,
    });
  }
  const renderRunId = renderRun.id as string;

  // --- 3. Dispara o workflow no GitHub
  // .trim() — alguns secrets vieram com espaço/tab perdido no fim.
  const ghPat = Deno.env.get("GITHUB_PAT")?.trim();
  const ghOwner = Deno.env.get("GITHUB_OWNER")?.trim();
  const ghRepo = Deno.env.get("GITHUB_REPO")?.trim();
  const ghRef = (Deno.env.get("GITHUB_REF") || "main").trim();
  const ghWorkflowFile = (
    Deno.env.get("GITHUB_RENDER_WORKFLOW_FILE") || "render-catalog.yml"
  ).trim();

  if (!ghPat || !ghOwner || !ghRepo) {
    await adminClient
      .from("render_runs")
      .update({
        status: "failed",
        error: {
          code: "GITHUB_CONFIG_MISSING",
          message: "GITHUB_PAT/OWNER/REPO não configurados nos secrets.",
        },
        completed_at: new Date().toISOString(),
      })
      .eq("id", renderRunId);
    return jsonResponse(500, {
      code: "GITHUB_CONFIG_MISSING",
      message: "Configuração do GitHub incompleta. Contate o administrador.",
    });
  }

  const dispatchUrl = `https://api.github.com/repos/${ghOwner}/${ghRepo}/actions/workflows/${ghWorkflowFile}/dispatches`;
  const dispatchResponse = await fetch(dispatchUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ghPat}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ref: ghRef,
      inputs: {
        render_run_id: renderRunId,
        catalog_id: catalogId,
        triggered_by_user_id: userId,
      },
    }),
  });

  if (!dispatchResponse.ok) {
    const errorBody = await dispatchResponse.text();
    console.error("[trigger-render] GitHub dispatch failed:", errorBody);
    await adminClient
      .from("render_runs")
      .update({
        status: "failed",
        error: {
          code: "GITHUB_DISPATCH_FAILED",
          message: `GitHub respondeu ${dispatchResponse.status}`,
          details: errorBody.slice(0, 500),
        },
        completed_at: new Date().toISOString(),
      })
      .eq("id", renderRunId);
    return jsonResponse(502, {
      code: "GITHUB_DISPATCH_FAILED",
      message:
        "Não foi possível iniciar a geração da arte. Tente novamente em instantes.",
    });
  }

  // --- 4. Sucesso
  return jsonResponse(200, {
    ok: true,
    render_run_id: renderRunId,
    message: "Geração da arte iniciada. Cada página leva uns 3 minutos.",
  });
});
