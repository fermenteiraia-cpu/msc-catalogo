"""
render_catalog_html.py — Pipeline novo. Gera HTML do esboço, tira screenshot,
polo com gpt-image-2, sobe os 3 artefatos no Storage e atualiza o DB.

Variáveis de ambiente:
  SUPABASE_URL  (ou NEXT_PUBLIC_SUPABASE_URL)
  SUPABASE_SERVICE_ROLE_KEY
  OPENAI_API_KEY
  CATALOG_ID
  RENDER_RUN_ID         (opcional — sem ele roda em modo local, só salva em disco)
  STYLE                 (opcional — sobrescreve o estilo deduzido do theme_key)
"""
from __future__ import annotations

import base64
import html
import json
import os
import shutil
import sys
import time
import traceback
from pathlib import Path
from typing import Any

import requests
import yaml
from openai import OpenAI
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / ".tmp_html_render"
OUT.mkdir(exist_ok=True)

SUPABASE_URL = (
    os.environ.get("SUPABASE_URL")
    or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
)
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
CATALOG_ID = os.environ.get("CATALOG_ID")
RENDER_RUN_ID = os.environ.get("RENDER_RUN_ID")
STYLE_OVERRIDE = os.environ.get("STYLE")

HEADERS = {
    "Authorization": f"Bearer {SERVICE_KEY}",
    "apikey": SERVICE_KEY,
    "Content-Type": "application/json",
}

# theme_key (do briefing) → arquivo de estilo default
THEME_TO_STYLE = {
    "maes": "festivo-maes",
    "abril": "trabalhador",
    "natal": "natal",
    "black-friday": "black-friday",
    "criancas": "dia-das-criancas",
    "custom": "minimalista",
}

STYLES_DIR = ROOT / "docs" / "render" / "styles"
TEMPLATE_PATH = ROOT / "docs" / "render" / "prompt_template.md"


# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
def supa(path: str, **p) -> Any:
    r = requests.get(f"{SUPABASE_URL}/rest/v1/{path}", headers=HEADERS, params=p, timeout=30)
    r.raise_for_status()
    return r.json()


def patch_render_run(payload: dict) -> None:
    if not RENDER_RUN_ID:
        return
    try:
        requests.patch(
            f"{SUPABASE_URL}/rest/v1/render_runs?id=eq.{RENDER_RUN_ID}",
            headers={**HEADERS, "Prefer": "return=minimal"},
            json=payload, timeout=30,
        )
    except Exception as e:
        print(f"[warn] patch render_run falhou: {e}", file=sys.stderr)


def fmt_brl(v: float) -> str:
    return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def storage_url(bucket: str, path: str) -> str:
    return f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}?v={int(time.time()*1000)}"


def storage_upload(bucket: str, remote_path: str, local_path: Path, content_type: str) -> None:
    url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{remote_path}"
    with open(local_path, "rb") as fh:
        r = requests.put(
            url,
            headers={
                "apikey": SERVICE_KEY,
                "Authorization": f"Bearer {SERVICE_KEY}",
                "Content-Type": content_type,
            },
            data=fh.read(),
            timeout=120,
        )
    if r.status_code >= 400:
        raise RuntimeError(f"upload {remote_path} falhou ({r.status_code}): {r.text[:200]}")


# -----------------------------------------------------------------------------
# Build HTML
# -----------------------------------------------------------------------------
def build_html(spec: dict, promos: list[dict]) -> str:
    hl = (spec.get("creative") or {}).get("headline") or {}
    headline_top = (hl.get("top") or "PROMOÇÃO").upper()
    headline_main = (hl.get("main") or "OFERTAS").upper()
    campaign_name = (spec.get("campaign") or {}).get("name") or "Campanha"

    cta = (spec.get("cta_blocks") or [{}])[0]
    cta_topline = cta.get("topline") or "Toda loja com até"
    cta_value = cta.get("value") or "50%"
    cta_label = cta.get("label") or "DE DESCONTO"

    period = spec.get("period") or {}
    sd = (period.get("start_date") or "").split("-")
    ed = (period.get("end_date") or "").split("-")
    sorteio_line = ""
    if len(sd) == 3 and len(ed) == 3:
        sorteio_line = f"do dia {sd[2]}/{sd[1]} ao dia {ed[2]}/{ed[1]}"

    palette = (spec.get("creative") or {}).get("palette") or {}
    primary = palette.get("primary") or "#E63946"
    secondary = palette.get("secondary") or "#F1C40F"

    cards = ""
    for p in promos[:12]:
        parc = p["parcelas"]
        per_parc = p["price"] / parc if parc else p["price"]
        # Tarja opcional ("NOVIDADE", "ÚLTIMAS UNIDADES") quando badge_label preenchido.
        badge_html = (
            f'<div class="badge">{html.escape(p["badge"])}</div>'
            if p.get("badge") else ""
        )
        cards += f"""
        <div class="card">
          {badge_html}
          <div class="star">
            <div class="star-burst"></div>
            <div class="star-num">{parc}x</div>
            <div class="star-lbl">SEM JUROS</div>
          </div>
          <div class="photo"><img src="{html.escape(p['img'])}" alt="" loading="lazy"></div>
          <div class="name">{html.escape(p['name'])}</div>
          <div class="por">POR: 1+{parc - 1}X SEM JUROS</div>
          <div class="price-pill">{fmt_brl(per_parc)}</div>
          <div class="avista">OU À VISTA: {fmt_brl(p['price'])}</div>
        </div>"""

    return f"""<!DOCTYPE html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<title>{html.escape(campaign_name)} — esboço</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: 'Lato', 'Segoe UI', Arial, sans-serif;
         background: linear-gradient(135deg, {primary} 0%, #8b1a25 100%);
         color: #fff; -webkit-font-smoothing: antialiased; }}
  .page {{ width: 1200px; margin: 0 auto; padding: 24px 20px 16px;
          background: radial-gradient(ellipse at top, {primary} 0%, #a01a28 70%, #6b1018 100%);
          position: relative; overflow: hidden; }}
  .page::before {{ content: ''; position: absolute; inset: 0;
    background-image:
      radial-gradient(circle at 10% 20%, rgba(255,255,255,0.08) 0, transparent 18px),
      radial-gradient(circle at 85% 15%, rgba(255,255,255,0.10) 0, transparent 22px),
      radial-gradient(circle at 30% 60%, rgba(255,255,255,0.06) 0, transparent 14px),
      radial-gradient(circle at 70% 80%, rgba(255,255,255,0.07) 0, transparent 16px),
      radial-gradient(circle at 15% 88%, rgba(255,255,255,0.05) 0, transparent 12px);
    pointer-events: none; z-index: 0; }}
  .page > * {{ position: relative; z-index: 1; }}
  .hero {{ display: grid; grid-template-columns: 200px 1fr 260px; gap: 16px;
          align-items: center; margin-bottom: 14px; padding: 16px 12px; }}
  .hero .mascote {{ width: 100%; height: auto;
                   filter: drop-shadow(0 8px 12px rgba(0,0,0,0.25)); }}
  .headline {{ text-align: center; }}
  .headline .top {{ font-weight: 900; font-size: 32px; color: #fff;
                   text-shadow: 2px 2px 0 {primary}, 4px 4px 0 rgba(0,0,0,0.3);
                   letter-spacing: 1px; }}
  .headline .main {{ font-weight: 900; font-size: 64px; color: #fff;
                    text-shadow: 0 0 0 #fff, 3px 3px 0 {primary},
                                  6px 6px 0 #6b1018, 8px 8px 16px rgba(0,0,0,0.35);
                    line-height: 0.95; margin-top: 4px; letter-spacing: 1px; }}
  .headline .logo-msc {{ height: 64px; margin-top: 10px;
                        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4)); }}
  .cta {{ color: #fff; text-align: right; padding-right: 4px; }}
  .cta-top {{ font-weight: 700; font-size: 20px; }}
  .cta-value {{ font-weight: 900; font-size: 120px; line-height: 1;
                text-shadow: 3px 3px 0 {primary}, 6px 6px 0 rgba(0,0,0,0.3); }}
  .cta-label {{ font-weight: 900; font-size: 22px; letter-spacing: 1px; margin-top: -8px; }}
  .terms {{ list-style: none; margin-top: 12px; text-align: right; font-size: 14px; }}
  .terms li {{ margin: 2px 0; font-weight: 600; }}
  .terms li::before {{ content: '• '; opacity: 0.7; }}
  .sorteio {{ text-align: center; font-weight: 700; font-size: 15px;
             background: rgba(0,0,0,0.18); color: #fff; padding: 8px 16px;
             border-radius: 999px; display: inline-block;
             margin: 0 auto 18px; position: relative;
             left: 50%; transform: translateX(-50%); }}
  .grid {{ display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }}
  .card {{ background: #fff; color: #222; border-radius: 10px;
          padding: 10px 8px 8px; position: relative;
          box-shadow: 0 4px 10px rgba(0,0,0,0.18);
          display: flex; flex-direction: column; align-items: center;
          min-height: 280px; }}
  .star {{ position: absolute; top: -10px; left: -8px; width: 56px; height: 56px;
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; z-index: 2; }}
  .star-burst {{ position: absolute; inset: 0; background: {secondary};
                clip-path: polygon(
                  50% 0%, 58% 30%, 80% 14%, 70% 38%, 100% 38%, 76% 52%,
                  94% 78%, 66% 70%, 65% 100%, 50% 78%, 35% 100%, 34% 70%,
                  6% 78%, 24% 52%, 0% 38%, 30% 38%, 20% 14%, 42% 30%);
                filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3)); }}
  .star-num {{ position: relative; font-weight: 900; font-size: 16px;
              line-height: 1; color: #222; }}
  .star-lbl {{ position: relative; font-weight: 800; font-size: 7px;
              line-height: 1; color: #222; }}
  .photo {{ width: 100%; height: 110px; display: flex; align-items: center;
           justify-content: center; overflow: hidden; }}
  .photo img {{ max-width: 100%; max-height: 100%; object-fit: contain; }}
  .name {{ font-weight: 800; font-size: 9.5px; text-align: center;
          line-height: 1.15; margin-top: 6px; color: #b81e2b;
          text-transform: uppercase; height: 26px; overflow: hidden; }}
  .por {{ font-size: 8px; font-weight: 800; color: {primary}; margin-top: 4px;
         text-align: center; }}
  .price-pill {{ background: {secondary}; color: #6b1018;
                font-weight: 900; font-size: 20px; padding: 4px 10px;
                border-radius: 6px; margin-top: 4px; text-align: center;
                border: 2px solid #b8860b;
                box-shadow: 0 2px 4px rgba(0,0,0,0.15); }}
  .avista {{ font-size: 8px; color: #555; margin-top: 4px; text-align: center;
            font-weight: 700; }}
  /* Tarja opcional ("NOVIDADE", "ÚLTIMAS UNIDADES"). Vai NO TOPO direito. */
  .card .badge {{ position: absolute; top: -8px; right: -6px; z-index: 3;
                 background: {secondary}; color: #6b1018;
                 font-weight: 900; font-size: 9px;
                 padding: 3px 8px; border-radius: 4px;
                 transform: rotate(8deg);
                 box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                 border: 1.5px solid #b8860b;
                 letter-spacing: 0.5px; }}
  .footer {{ margin-top: 14px; background: #6b1018; color: #fff;
            padding: 10px 16px; border-radius: 4px;
            display: flex; flex-direction: column; gap: 4px; }}
  .footer .repeat {{ display: flex; justify-content: space-around;
                    font-weight: 900; font-size: 16px;
                    letter-spacing: 2px; font-style: italic; }}
  .footer .meta {{ display: flex; justify-content: space-between;
                  font-weight: 700; font-size: 11px; opacity: 0.92; }}
</style>
</head>
<body>
  <div class="page">
    <div class="hero">
      <img class="mascote" src="mascote.png" alt="Mascote MSC">
      <div class="headline">
        <div class="top">{html.escape(headline_top)}</div>
        <div class="main">{html.escape(headline_main)}</div>
        <img class="logo-msc" src="logo_branco.png" alt="Lojas MSC">
      </div>
      <div class="cta">
        <div class="cta-top">{html.escape(cta_topline)}</div>
        <div class="cta-value">{html.escape(cta_value)}</div>
        <div class="cta-label">{html.escape(cta_label)}</div>
        <ul class="terms">
          <li>Parcelamento facilitado</li>
          <li>Em 16X no carnê da loja</li>
          <li>Ou 1+9x sem juros nos cartões</li>
          <li>Entrega e montagem grátis</li>
        </ul>
      </div>
    </div>
    {f'<div class="sorteio">Sorteio para as compras efetuadas {sorteio_line}</div>' if sorteio_line else ''}
    <div class="grid">{cards}</div>
    <div class="footer">
      <div class="repeat">
        <span>LOJAS MSC</span><span>LOJAS MSC</span><span>LOJAS MSC</span>
        <span>LOJAS MSC</span><span>LOJAS MSC</span><span>LOJAS MSC</span>
      </div>
      <div class="meta">
        <span>TODA LOJA EM ATÉ 10X SEM JUROS</span>
        <span>página 1 de 1</span>
      </div>
    </div>
  </div>
</body></html>
"""


# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------
def main() -> None:
    if not (SUPABASE_URL and SERVICE_KEY and OPENAI_API_KEY and CATALOG_ID):
        raise RuntimeError("env vars faltando")

    patch_render_run({"status": "running"})

    # 1) Fetch catalog + pieces + products
    print(f"[render] catálogo {CATALOG_ID}")
    catalog = supa("catalogs", id=f"eq.{CATALOG_ID}", select="*")[0]
    spec = catalog.get("campaign_spec") or {}

    pieces = supa("pieces", catalog_id=f"eq.{CATALOG_ID}", select="*", order="position.asc")
    codes: list[str] = []
    for piece in pieces:
        pc = piece.get("product_codes") or []
        if pc:
            codes.append(pc[0])
    codes = list(dict.fromkeys(codes))

    products: list[dict] = []
    if codes:
        quoted = ",".join(f'"{c}"' for c in codes)
        products = supa("products", terasoft_code=f"in.({quoted})", select="*")
    by_code = {p["terasoft_code"]: p for p in products}

    promos: list[dict] = []
    for piece in pieces:
        pc = piece.get("product_codes") or []
        code = pc[0] if pc else None
        p = by_code.get(code) if code else None
        if not p or p.get("price_cash") is None:
            continue
        base = float(p["price_cash"])
        desconto = float(piece.get("desconto_percent") or 0)
        if piece.get("preco_final_override") is not None:
            valor = float(piece["preco_final_override"])
        else:
            valor = round(base * (1 - desconto / 100.0), 2)
        # Overrides per-piece (display_name, display_image_url, badge_label)
        # ganham do produto-mestre quando preenchidos. Permite Amanda/Sally
        # ajustarem o que aparece na arte sem mexer no produto da Terasoft.
        promos.append({
            "name": (piece.get("display_name") or p.get("name") or "").strip(),
            "img": (piece.get("display_image_url") or p.get("image_url") or "").strip(),
            "badge": (piece.get("badge_label") or "").strip(),
            "parcelas": int(piece.get("parcelas") or 10),
            "price": float(valor),
            "avista": base,
        })

    if not promos:
        raise RuntimeError("nenhum produto válido pra renderizar")
    print(f"[render] {len(promos)} promos prontos (usando os 12 primeiros)")

    # 2) Build HTML (ou usa override customizado se existir no Storage)
    shutil.copy(ROOT / "mascote_msc.png", OUT / "mascote.png")
    shutil.copy(ROOT / "logo_msc.png", OUT / "logo.png")
    shutil.copy(ROOT / "logo_msc_branco.png", OUT / "logo_branco.png")

    html_path = OUT / "catalogo.html"
    override_url = (
        f"{SUPABASE_URL}/storage/v1/object/public/catalog-renders/"
        f"{CATALOG_ID}/catalogo.override.html"
    )
    override_ok = False
    try:
        r = requests.get(override_url, timeout=10)
        if r.status_code == 200 and r.text.strip().lower().startswith("<!doctype"):
            html_path.write_text(r.text, encoding="utf-8")
            override_ok = True
            print(f"[render] HTML customizado detectado e baixado: {override_url}")
    except Exception as e:
        print(f"[warn] falha ao checar override ({e}), seguindo automático")

    if not override_ok:
        html_doc = build_html(spec, promos)
        html_path.write_text(html_doc, encoding="utf-8")
        print(f"[render] HTML automático: {html_path}")

    # 3) Screenshot via Playwright
    screenshot_path = OUT / "esboco.png"
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        ctx = browser.new_context(
            viewport={"width": 1240, "height": 900},
            device_scale_factor=2,
        )
        page = ctx.new_page()
        page.goto(html_path.as_uri(), wait_until="networkidle", timeout=30000)
        page.screenshot(path=str(screenshot_path), full_page=True)
        browser.close()
    print(f"[render] screenshot: {screenshot_path}")

    # 4) Resolve estilo
    theme_key = (spec.get("campaign") or {}).get("theme_key") or "custom"
    style_name = STYLE_OVERRIDE or THEME_TO_STYLE.get(theme_key, "minimalista")
    style_path = STYLES_DIR / f"{style_name}.yaml"
    if not style_path.exists():
        print(f"[warn] estilo '{style_name}' não existe, usando minimalista")
        style_path = STYLES_DIR / "minimalista.yaml"
    style = yaml.safe_load(style_path.read_text(encoding="utf-8"))
    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    # Remove comment lines starting with #
    template_clean = "\n".join(
        line for line in template.splitlines() if not line.startswith("#")
    ).strip()
    prompt = template_clean.format(**style)
    print(f"[render] estilo: {style_name} (theme_key={theme_key})")

    # 5) gpt-image-2 polish
    client = OpenAI(api_key=OPENAI_API_KEY)
    print("[render] chamando gpt-image-2…")
    with open(screenshot_path, "rb") as fh:
        result = client.images.edit(
            model="gpt-image-2",
            image=fh,
            prompt=prompt,
            size="1024x1536",
        )
    polished_path = OUT / "arte_final.png"
    polished_path.write_bytes(base64.b64decode(result.data[0].b64_json))
    print(f"[render] arte final: {polished_path}")

    # 6) Modo local: pára aqui
    if not RENDER_RUN_ID:
        print("[render] sem RENDER_RUN_ID — fim (modo local)")
        return

    # 7) Upload os 3 artefatos no Storage
    bucket = "catalog-renders"
    storage_upload(bucket, f"{CATALOG_ID}/catalogo.html", html_path, "text/html; charset=utf-8")
    storage_upload(bucket, f"{CATALOG_ID}/esboco.png", screenshot_path, "image/png")
    storage_upload(bucket, f"{CATALOG_ID}/page-0.png", polished_path, "image/png")
    polished_url = storage_url(bucket, f"{CATALOG_ID}/page-0.png")
    print("[render] artefatos no Storage")

    # 8) Upsert catalog_page_renders (cover apenas — page 2+ fica pra próxima iter)
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/catalog_page_renders?on_conflict=catalog_id,page_index",
        headers={**HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
        json={
            "tenant_id": "00000000-0000-0000-0000-000000000001",
            "catalog_id": CATALOG_ID,
            "page_index": 0,
            "page_kind": "cover",
            "status": "ready",
            "image_url": polished_url,
            "storage_path": f"{CATALOG_ID}/page-0.png",
            "render_run_id": RENDER_RUN_ID,
        },
        timeout=30,
    )
    if r.status_code >= 400:
        raise RuntimeError(f"upsert catalog_page_renders falhou ({r.status_code}): {r.text[:200]}")

    patch_render_run({
        "status": "success",
        "pages_total": 1,
        "pages_done": 1,
        "completed_at": "now()",
    })
    print("[render] FIM")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001
        tb = traceback.format_exc()
        print(f"[FATAL] {e}\n{tb}", file=sys.stderr)
        patch_render_run({
            "status": "failed",
            "error": {"message": str(e), "traceback": tb[-2000:]},
            "completed_at": "now()",
        })
        sys.exit(1)
