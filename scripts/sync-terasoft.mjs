#!/usr/bin/env node
/**
 * sync-terasoft.mjs
 *
 * Pulls every product from the Terasoft ERP and upserts into Supabase.
 * Runs in GitHub Actions (Node 22 + undici for TLS bypass of Terasoft's
 * self-signed cert).
 *
 * Env vars (all required):
 *   TERASOFT_USER, TERASOFT_PASS, TERASOFT_URL (optional — has default)
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional (when triggered by a user via the trigger-sync Edge Function):
 *   SYNC_RUN_ID           — pre-created sync_runs row to update
 *   TRIGGERED_BY_USER_ID  — uuid of the user who clicked the button
 *
 * When SYNC_RUN_ID is absent, the script creates a new sync_runs row with
 * triggered_by = 'cron'.
 *
 * Hard-coded for the single MVP tenant. Multi-tenant comes later.
 */

import { Agent, fetch } from "undici";
import { createClient } from "@supabase/supabase-js";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------
const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const TERASOFT_URL_DEFAULT = "https://apiserver.ip.inf.br:12067/consulta";
const BATCH_SIZE = 200;

// -----------------------------------------------------------------------------
// Env & arg parsing
// -----------------------------------------------------------------------------
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[FATAL] Missing env var: ${name}`);
    process.exit(1);
  }
  return value;
}

const TERASOFT_USER = requireEnv("TERASOFT_USER");
const TERASOFT_PASS = requireEnv("TERASOFT_PASS");
const TERASOFT_URL = process.env.TERASOFT_URL || TERASOFT_URL_DEFAULT;
const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const SYNC_RUN_ID = process.env.SYNC_RUN_ID || null;
const TRIGGERED_BY_USER_ID = process.env.TRIGGERED_BY_USER_ID || null;
const GITHUB_RUN_ID = process.env.GITHUB_RUN_ID || null;
const GITHUB_SERVER_URL = process.env.GITHUB_SERVER_URL || "https://github.com";
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || null;
const GITHUB_RUN_URL =
  GITHUB_REPOSITORY && GITHUB_RUN_ID
    ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`
    : null;

// -----------------------------------------------------------------------------
// Supabase client (service role — bypasses RLS, runs as system)
// -----------------------------------------------------------------------------
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// -----------------------------------------------------------------------------
// Terasoft fetch (TLS bypass via undici Agent)
// -----------------------------------------------------------------------------
const terasoftDispatcher = new Agent({
  connect: { rejectUnauthorized: false },
});

async function fetchTerasoftProducts() {
  const url = new URL(TERASOFT_URL);
  url.searchParams.set("ep", "PRODUTOS");
  url.searchParams.set("ultimaalteracao", "2020-01-01 00:00:00");

  const auth =
    "Basic " +
    Buffer.from(`${TERASOFT_USER}:${TERASOFT_PASS}`).toString("base64");

  console.log(`[terasoft] GET ${url.toString()}`);
  const t0 = Date.now();

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Authorization: auth, Accept: "application/json" },
    dispatcher: terasoftDispatcher,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Terasoft responded ${response.status}: ${body.slice(0, 300)}`,
    );
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error("Terasoft response is not an array");
  }

  console.log(
    `[terasoft] ${payload.length} produtos em ${((Date.now() - t0) / 1000).toFixed(1)}s`,
  );
  return payload;
}

// -----------------------------------------------------------------------------
// Mapping Terasoft → products row
// -----------------------------------------------------------------------------
function mapProduct(p, syncRunId) {
  // Skip rows missing essentials
  const codigo = (p.CODIGO ?? "").toString().trim();
  const nome = (p.NOME ?? "").toString().trim();
  if (!codigo || !nome) return null;

  // Price priority: promo when set, else regular
  const promoNum = typeof p.VALORPROMOCAO === "number" ? p.VALORPROMOCAO : null;
  const cashNum = typeof p.VALORVENDA === "number" ? p.VALORVENDA : null;
  const price_cash = promoNum && promoNum > 0 ? promoNum : cashNum && cashNum > 0 ? cashNum : null;

  // Normalize brand — "NAO CLASSIFICADO" → null
  const marca = (p.MARCA ?? "").toString().trim();
  const brand = marca && marca.toUpperCase() !== "NAO CLASSIFICADO" ? marca : null;

  // GRUPO / SUBGRUPO — separated (Migration 0004 added these columns)
  const grupoRaw = (p.GRUPO ?? "").toString().trim();
  const subgrupoRaw = (p.SUBGRUPO ?? "").toString().trim();
  const grupo =
    grupoRaw && grupoRaw.toUpperCase() !== "NAO CLASSIFICADO" ? grupoRaw : null;
  const subgrupo =
    subgrupoRaw && subgrupoRaw.toUpperCase() !== "NAO CLASSIFICADO"
      ? subgrupoRaw
      : null;

  // category kept for backward compat — falls back to subgrupo → grupo
  const category = subgrupo ?? grupo;

  // Image URL — null if empty
  const imagem = (p.IMAGEM ?? "").toString().trim();
  const image_url = imagem || null;

  // Availability — 'S' = sim
  const status = (p.STATUS ?? "").toString().trim().toUpperCase();
  const is_available = status === "S";

  return {
    tenant_id: TENANT_ID,
    terasoft_code: codigo,
    name: nome,
    grupo,
    subgrupo,
    category,
    brand,
    price_cash,
    image_url,
    is_available,
    synced_at: new Date().toISOString(),
    last_sync_run_id: syncRunId,
  };
}

// -----------------------------------------------------------------------------
// sync_runs lifecycle
// -----------------------------------------------------------------------------
async function ensureSyncRun() {
  if (SYNC_RUN_ID) {
    // Update the pre-created row (Edge Function trigger-sync created it)
    const { error } = await supabase
      .from("sync_runs")
      .update({
        status: "running",
        github_run_id: GITHUB_RUN_ID,
        github_run_url: GITHUB_RUN_URL,
        started_at: new Date().toISOString(),
      })
      .eq("id", SYNC_RUN_ID);

    if (error) {
      console.error("[sync_runs] failed to update existing row:", error);
      throw new Error(`sync_runs update failed: ${error.message}`);
    }
    console.log(`[sync_runs] using existing row ${SYNC_RUN_ID}`);
    return SYNC_RUN_ID;
  }

  // No SYNC_RUN_ID — cron run. Create a new row.
  const { data, error } = await supabase
    .from("sync_runs")
    .insert({
      tenant_id: TENANT_ID,
      triggered_by: "cron",
      status: "running",
      github_run_id: GITHUB_RUN_ID,
      github_run_url: GITHUB_RUN_URL,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[sync_runs] failed to create row:", error);
    throw new Error(`sync_runs insert failed: ${error?.message ?? "no data"}`);
  }
  console.log(`[sync_runs] created row ${data.id} (cron)`);
  return data.id;
}

async function finishSyncRun(syncRunId, status, stats) {
  const { error } = await supabase
    .from("sync_runs")
    .update({
      status,
      products_synced: stats.synced,
      products_skipped: stats.skipped,
      error: stats.error ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", syncRunId);

  if (error) {
    console.error("[sync_runs] failed to finalize row:", error);
  }
}

// -----------------------------------------------------------------------------
// Audit log
// -----------------------------------------------------------------------------
async function writeAuditLog(syncRunId, stats) {
  const { error } = await supabase.from("audit_log").insert({
    tenant_id: TENANT_ID,
    entity_type: "products",
    entity_id: null,
    action: "update",
    actor: TRIGGERED_BY_USER_ID ? `user:${TRIGGERED_BY_USER_ID}` : "system:cron",
    actor_user_id: TRIGGERED_BY_USER_ID,
    changes: {
      sync_run_id: syncRunId,
      synced: stats.synced,
      skipped: stats.skipped,
      source: "terasoft",
      via: "github-action",
    },
    metadata: {
      github_run_id: GITHUB_RUN_ID,
      github_run_url: GITHUB_RUN_URL,
    },
  });

  if (error) {
    console.error("[audit_log] insert failed (non-fatal):", error.message);
  }
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------
async function main() {
  console.log(
    `[start] sync-terasoft — triggered_by=${TRIGGERED_BY_USER_ID ? `user:${TRIGGERED_BY_USER_ID}` : "cron"}, github_run=${GITHUB_RUN_ID ?? "(local)"}`,
  );

  let syncRunId;
  try {
    syncRunId = await ensureSyncRun();
  } catch (e) {
    console.error("[fatal] could not create/update sync_runs row:", e);
    process.exit(1);
  }

  let stats = { synced: 0, skipped: 0, error: null };

  try {
    // 1. Fetch
    const raw = await fetchTerasoftProducts();

    // 2. Map + filter
    const rows = [];
    for (const p of raw) {
      const mapped = mapProduct(p, syncRunId);
      if (mapped) {
        rows.push(mapped);
      } else {
        stats.skipped++;
      }
    }
    console.log(
      `[map] ${rows.length} rows válidas, ${stats.skipped} ignoradas`,
    );

    // 3. Upsert in batches
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from("products")
        .upsert(batch, { onConflict: "tenant_id,terasoft_code" });

      if (error) {
        throw new Error(
          `Upsert batch ${i / BATCH_SIZE + 1} failed: ${error.message}`,
        );
      }
      stats.synced += batch.length;
      console.log(
        `[upsert] batch ${i / BATCH_SIZE + 1}: ${batch.length} rows (total: ${stats.synced})`,
      );
    }

    // 4. Audit + finalize
    await writeAuditLog(syncRunId, stats);
    await finishSyncRun(syncRunId, "success", stats);

    console.log(
      `[done] ✓ ${stats.synced} produtos sincronizados, ${stats.skipped} ignorados.`,
    );
    process.exit(0);
  } catch (e) {
    const errPayload = {
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    };
    stats.error = errPayload;
    console.error("[fail]", errPayload.message);
    await finishSyncRun(syncRunId, "failed", stats);
    await writeAuditLog(syncRunId, stats);
    process.exit(1);
  }
}

main();
