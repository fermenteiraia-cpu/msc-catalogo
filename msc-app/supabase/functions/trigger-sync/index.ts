// supabase/functions/trigger-sync/index.ts
//
// Edge Function (Deno). Dispara o GitHub Action `sync-terasoft.yml` em nome
// de um usuário autenticado. Não toca em Terasoft (TLS self-signed problema é
// isolado no GitHub Action / Node).
//
// Fluxo:
//   1. Lê Authorization header → valida session via Supabase
//   2. Cria sync_runs row (status='running') usando service role
//   3. POST api.github.com/.../workflow_dispatches com PAT
//   4. Retorna sync_run_id pro frontend (que pode poll status)
//
// Env vars (Supabase secrets):
//   SUPABASE_URL                 — já vem do runtime
//   SUPABASE_SERVICE_ROLE_KEY    — já vem do runtime
//   SUPABASE_ANON_KEY            — já vem do runtime
//   GITHUB_PAT                   — fine-grained PAT, scope Actions:R/W
//   GITHUB_OWNER                 — "fermenteiraia-cpu"
//   GITHUB_REPO                  — "msc-catalogo"
//   GITHUB_WORKFLOW_FILE         — "sync-terasoft.yml"
//   GITHUB_REF                   — "main" (branch do workflow)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.4";

// CORS pra o SPA Vite chamar
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
    return jsonResponse(405, {
      code: "METHOD_NOT_ALLOWED",
      message: "Use POST.",
    });
  }

  // --- 1. Auth: pega o user do JWT no Authorization header
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

  // Client com o JWT do user pra validar identidade
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

  // --- 2. Cria sync_runs row (service role bypassa RLS)
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const TENANT_ID = "00000000-0000-0000-0000-000000000001";

  const { data: syncRun, error: syncRunError } = await adminClient
    .from("sync_runs")
    .insert({
      tenant_id: TENANT_ID,
      triggered_by: `user:${userId}`,
      triggered_by_user_id: userId,
      status: "running",
    })
    .select("id")
    .single();

  if (syncRunError || !syncRun) {
    return jsonResponse(500, {
      code: "SYNC_RUN_CREATE_FAILED",
      message: "Não foi possível registrar a sincronização.",
      details: syncRunError?.message,
    });
  }

  const syncRunId = syncRun.id as string;

  // --- 3. POST workflow_dispatch pro GitHub
  const ghPat = Deno.env.get("GITHUB_PAT");
  const ghOwner = Deno.env.get("GITHUB_OWNER");
  const ghRepo = Deno.env.get("GITHUB_REPO");
  const ghWorkflowFile =
    Deno.env.get("GITHUB_WORKFLOW_FILE") || "sync-terasoft.yml";
  const ghRef = Deno.env.get("GITHUB_REF") || "main";

  if (!ghPat || !ghOwner || !ghRepo) {
    // Marca o sync_runs como failed pra UI não ficar pendurada
    await adminClient
      .from("sync_runs")
      .update({
        status: "failed",
        error: {
          code: "GITHUB_CONFIG_MISSING",
          message: "GITHUB_PAT/OWNER/REPO não configurados nos secrets.",
        },
        completed_at: new Date().toISOString(),
      })
      .eq("id", syncRunId);

    return jsonResponse(500, {
      code: "GITHUB_CONFIG_MISSING",
      message:
        "Configuração do GitHub incompleta. Contate o administrador (secrets faltando).",
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
        sync_run_id: syncRunId,
        triggered_by_user_id: userId,
      },
    }),
  });

  if (!dispatchResponse.ok) {
    const errorBody = await dispatchResponse.text();
    console.error("[trigger-sync] GitHub dispatch failed:", errorBody);

    await adminClient
      .from("sync_runs")
      .update({
        status: "failed",
        error: {
          code: "GITHUB_DISPATCH_FAILED",
          message: `GitHub respondeu ${dispatchResponse.status}`,
          details: errorBody.slice(0, 500),
        },
        completed_at: new Date().toISOString(),
      })
      .eq("id", syncRunId);

    return jsonResponse(502, {
      code: "GITHUB_DISPATCH_FAILED",
      message:
        "Não foi possível disparar a sincronização. Tente novamente em instantes.",
    });
  }

  // --- 4. Sucesso — frontend vai poll sync_runs.status
  return jsonResponse(200, {
    ok: true,
    sync_run_id: syncRunId,
    message: "Sincronização iniciada. Pode levar 1-2 minutos.",
  });
});
