#!/usr/bin/env node
/**
 * render-catalog.mjs
 *
 * Gera a arte final 3D de cada página de um catálogo, usando o gpt-image da
 * OpenAI. Roda no GitHub Actions (Node 22) — e não numa Edge Function —
 * porque cada página leva ~3 min, tempo que estoura o limite do plano grátis.
 *
 * Env vars (obrigatórias):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   OPENAI_API_KEY
 *   RENDER_RUN_ID   — linha em render_runs criada pela Edge Function trigger-render
 *   CATALOG_ID      — catálogo a renderizar
 *
 * Opcionais:
 *   TRIGGERED_BY_USER_ID
 *   OPENAI_IMAGE_MODEL    (default "gpt-image-1")
 *   OPENAI_IMAGE_QUALITY  (default "medium")
 *   GITHUB_RUN_ID / GITHUB_SERVER_URL / GITHUB_REPOSITORY (preenchidos pelo CI)
 */

import { createClient } from "@supabase/supabase-js";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const RENDER_BUCKET = "catalog-renders";

// Paginação — igual ao buildEditorPages do front (src/components/editor/pages.ts).
const COVER_PRODUCT_COUNT = 14;
const PIECES_PER_PAGE = 24;

const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const OPENAI_IMAGE_QUALITY = process.env.OPENAI_IMAGE_QUALITY || "medium";
const OPENAI_IMAGE_SIZE = "1024x1536"; // retrato, próximo da folha do catálogo

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[FATAL] Falta a variável de ambiente: ${name}`);
    process.exit(1);
  }
  return value;
}

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const OPENAI_API_KEY = requireEnv("OPENAI_API_KEY");
const RENDER_RUN_ID = requireEnv("RENDER_RUN_ID");
const CATALOG_ID = requireEnv("CATALOG_ID");

const GITHUB_RUN_ID = process.env.GITHUB_RUN_ID || null;
const GITHUB_SERVER_URL = process.env.GITHUB_SERVER_URL || "https://github.com";
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || null;
const GITHUB_RUN_URL =
  GITHUB_RUN_ID && GITHUB_REPOSITORY
    ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`
    : null;

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* ------------------------------------------------------------------ */
/* Carregamento dos dados                                              */
/* ------------------------------------------------------------------ */

async function loadCatalog() {
  const { data, error } = await supabase
    .from("catalogs")
    .select("id,name,campaign_spec")
    .eq("id", CATALOG_ID)
    .maybeSingle();
  if (error) throw new Error(`Erro ao carregar catálogo: ${error.message}`);
  if (!data) throw new Error("Catálogo não encontrado.");
  return data;
}

async function loadPieces() {
  const { data: pieceRows, error: pieceError } = await supabase
    .from("pieces")
    .select(
      "id,position,size_class,product_codes,desconto_percent,parcelas,preco_final_override",
    )
    .eq("catalog_id", CATALOG_ID)
    .order("position", { ascending: true });
  if (pieceError) throw new Error(`Erro ao carregar peças: ${pieceError.message}`);

  const pieces = pieceRows ?? [];
  const codes = [
    ...new Set(pieces.flatMap((p) => p.product_codes ?? [])),
  ];

  let products = [];
  if (codes.length > 0) {
    const { data: prodRows, error: prodError } = await supabase
      .from("products")
      .select("terasoft_code,name,price_cash")
      .in("terasoft_code", codes);
    if (prodError) throw new Error(`Erro ao carregar produtos: ${prodError.message}`);
    products = prodRows ?? [];
  }
  const byCode = new Map(products.map((p) => [p.terasoft_code, p]));

  return pieces.map((piece) => {
    const product = byCode.get(piece.product_codes?.[0]) ?? null;
    const base = product?.price_cash ?? null;
    const finalPrice =
      piece.preco_final_override != null
        ? Number(piece.preco_final_override)
        : base != null
          ? base * (1 - Number(piece.desconto_percent ?? 0) / 100)
          : null;
    return {
      name: product?.name ?? "Produto",
      finalPrice,
      parcelas: Number(piece.parcelas ?? 10),
    };
  });
}

/** Divide as peças em páginas: capa (primeiras 14) + páginas internas (24). */
function buildPages(pieces) {
  const pages = [{ kind: "cover", pieces: pieces.slice(0, COVER_PRODUCT_COUNT) }];
  const rest = pieces.slice(COVER_PRODUCT_COUNT);
  for (let i = 0; i < rest.length; i += PIECES_PER_PAGE) {
    pages.push({ kind: "products", pieces: rest.slice(i, i + PIECES_PER_PAGE) });
  }
  return pages;
}

/* ------------------------------------------------------------------ */
/* Prompt do gpt-image                                                 */
/* ------------------------------------------------------------------ */

function productLines(pieces) {
  return pieces
    .map((p) => {
      const price = p.finalPrice != null ? brl.format(p.finalPrice) : "";
      return `- ${p.name} — ${price} (em ${p.parcelas}x sem juros)`;
    })
    .join("\n");
}

function buildPagePrompt(page, catalog, spec) {
  const palette = spec?.creative?.palette ?? {};
  const headline = spec?.creative?.headline ?? {};
  const cta = spec?.cta_blocks?.[0] ?? {};
  const colors = [palette.primary, palette.secondary, palette.accent_seal]
    .filter(Boolean)
    .join(", ");

  if (page.kind === "cover") {
    return [
      "Encarte promocional de varejo brasileiro — CAPA — da loja de móveis e eletro 'Lojas MSC'.",
      `Tema da campanha: "${[headline.top, headline.main, headline.sub].filter(Boolean).join(" ")}".`,
      "Faixa do topo com o título em letras grandes, 3D, brilhantes e festivas.",
      cta.value
        ? `Selo de desconto em destaque: "${cta.topline ?? ""} ${cta.value} ${cta.label ?? ""}".`
        : "",
      `Paleta de cores: ${colors || "vibrante e quente"}.`,
      "Abaixo da faixa, uma grade densa de cards de produto — cada card branco com a foto do produto, nome e preço grande em vermelho, e o selo amarelo de parcelamento.",
      "Faixa rosa 'LOJAS MSC' no rodapé.",
      "Produtos desta página:",
      productLines(page.pieces),
      "Estilo: encarte de varejo brasileiro, impressão A4, cores vibrantes, acabamento premium 3D. Todo texto em português, legível e nítido.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "Encarte promocional de varejo brasileiro — PÁGINA INTERNA — da loja 'Lojas MSC'.",
    "Fundo branco, faixas rosas 'LOJAS MSC' no topo e no rodapé.",
    "Grade densa de cards de produto: cada card branco com a foto do produto, nome em maiúsculas, preço grande em vermelho e o selo amarelo de parcelamento '10x sem juros'.",
    `Paleta de apoio: ${colors || "vibrante"}.`,
    "Produtos desta página:",
    productLines(page.pieces),
    "Estilo: encarte de varejo brasileiro, impressão A4, premium, 3D. Todo texto em português, legível e nítido.",
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* OpenAI gpt-image                                                    */
/* ------------------------------------------------------------------ */

async function generateImage(prompt) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_IMAGE_MODEL,
      prompt,
      size: OPENAI_IMAGE_SIZE,
      quality: OPENAI_IMAGE_QUALITY,
      n: 1,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI respondeu ${response.status}: ${text.slice(0, 400)}`);
  }
  const json = await response.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI não devolveu imagem.");
  return Buffer.from(b64, "base64");
}

/* ------------------------------------------------------------------ */
/* render_runs / catalog_page_renders helpers                          */
/* ------------------------------------------------------------------ */

async function updateRun(patch) {
  const { error } = await supabase
    .from("render_runs")
    .update(patch)
    .eq("id", RENDER_RUN_ID);
  if (error) console.error("[render] falha ao atualizar render_run:", error.message);
}

async function upsertPageRender(pageIndex, patch) {
  const { error } = await supabase.from("catalog_page_renders").upsert(
    {
      tenant_id: TENANT_ID,
      catalog_id: CATALOG_ID,
      render_run_id: RENDER_RUN_ID,
      page_index: pageIndex,
      updated_at: new Date().toISOString(),
      ...patch,
    },
    { onConflict: "catalog_id,page_index" },
  );
  if (error) {
    console.error(`[render] falha ao gravar página ${pageIndex}:`, error.message);
  }
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  console.log(`[render] iniciando render do catálogo ${CATALOG_ID}`);

  await updateRun({
    status: "running",
    github_run_id: GITHUB_RUN_ID,
    github_run_url: GITHUB_RUN_URL,
  });

  let catalog;
  let pages;
  try {
    catalog = await loadCatalog();
    const pieces = await loadPieces();
    pages = buildPages(pieces);
  } catch (err) {
    console.error("[render] erro ao preparar:", err.message);
    await updateRun({
      status: "failed",
      error: { message: err.message },
      completed_at: new Date().toISOString(),
    });
    process.exit(1);
  }

  const spec =
    catalog.campaign_spec && typeof catalog.campaign_spec === "object"
      ? catalog.campaign_spec
      : {};

  await updateRun({ pages_total: pages.length, pages_done: 0 });
  console.log(`[render] ${pages.length} página(s) a gerar`);

  let done = 0;
  let failed = 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    console.log(`[render] página ${i + 1}/${pages.length} (${page.kind})…`);
    await upsertPageRender(i, {
      page_kind: page.kind,
      status: "rendering",
      error: null,
    });

    try {
      const prompt = buildPagePrompt(page, catalog, spec);
      const imageBuffer = await generateImage(prompt);

      const storagePath = `${CATALOG_ID}/page-${i}.png`;
      const { error: uploadError } = await supabase.storage
        .from(RENDER_BUCKET)
        .upload(storagePath, imageBuffer, {
          contentType: "image/png",
          upsert: true,
        });
      if (uploadError) throw new Error(`upload falhou: ${uploadError.message}`);

      const { data: publicData } = supabase.storage
        .from(RENDER_BUCKET)
        .getPublicUrl(storagePath);

      await upsertPageRender(i, {
        page_kind: page.kind,
        status: "ready",
        image_url: `${publicData.publicUrl}?v=${Date.now()}`,
        storage_path: storagePath,
        error: null,
      });
      done += 1;
    } catch (err) {
      console.error(`[render] página ${i + 1} falhou:`, err.message);
      failed += 1;
      await upsertPageRender(i, {
        page_kind: page.kind,
        status: "failed",
        error: { message: err.message },
      });
    }

    await updateRun({ pages_done: done });
  }

  const ok = failed === 0;
  await updateRun({
    status: ok ? "success" : "failed",
    pages_done: done,
    error: ok ? null : { message: `${failed} página(s) falharam.` },
    completed_at: new Date().toISOString(),
  });

  console.log(`[render] fim — ${done} ok, ${failed} falhas`);
  if (!ok) process.exit(1);
}

main().catch(async (err) => {
  console.error("[render] erro inesperado:", err);
  await updateRun({
    status: "failed",
    error: { message: String(err?.message ?? err) },
    completed_at: new Date().toISOString(),
  });
  process.exit(1);
});
