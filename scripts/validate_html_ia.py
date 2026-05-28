"""
validate_html_ia.py — Validação rápida: gera HTML estático do catálogo +
manda screenshot pro gpt-image-2 polir. Não toca no pipeline atual.

Uso:
  NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... OPENAI_API_KEY=... \
  CATALOG_ID=<uuid> \
  py scripts/validate_html_ia.py
"""
from __future__ import annotations

import base64
import html
import json
import os
import shutil
import sys
from pathlib import Path
from typing import Any

import requests

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / ".tmp_validate"
OUT.mkdir(exist_ok=True)

SUPABASE_URL = (
    os.environ.get("SUPABASE_URL")
    or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
)
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
CATALOG_ID = os.environ.get("CATALOG_ID")

if not (SUPABASE_URL and SERVICE_KEY and CATALOG_ID and OPENAI_API_KEY):
    print(
        "[FATAL] precisa de SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, CATALOG_ID",
        file=sys.stderr,
    )
    sys.exit(2)

H = {"Authorization": f"Bearer {SERVICE_KEY}", "apikey": SERVICE_KEY}


def supa(path: str, **p) -> Any:
    r = requests.get(f"{SUPABASE_URL}/rest/v1/{path}", headers=H, params=p, timeout=30)
    r.raise_for_status()
    return r.json()


# -------------------------------------------------------------------------
# Fetch dados
# -------------------------------------------------------------------------
print(f"[v] catálogo {CATALOG_ID}")
catalog = supa("catalogs", id=f"eq.{CATALOG_ID}", select="*")[0]
spec = catalog.get("campaign_spec") or {}
pieces = supa(
    "pieces", catalog_id=f"eq.{CATALOG_ID}", select="*", order="position.asc"
)

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
    promos.append(
        {
            "name": p.get("name") or "",
            "img": p.get("image_url") or "",
            "parcelas": int(piece.get("parcelas") or 10),
            "price": float(valor),
            "avista": base,
        }
    )

print(f"[v] {len(promos)} produtos resolvidos")

# Headline + paleta + período + cta
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
accent = palette.get("accent_seal") or "#2E86AB"

# -------------------------------------------------------------------------
# Copia assets pra OUT dir (pra HTML usar caminhos relativos)
# -------------------------------------------------------------------------
shutil.copy(ROOT / "mascote_msc.png", OUT / "mascote.png")
shutil.copy(ROOT / "logo_msc.png", OUT / "logo.png")
shutil.copy(ROOT / "logo_msc_branco.png", OUT / "logo_branco.png")

# -------------------------------------------------------------------------
# HTML
# -------------------------------------------------------------------------
def fmt_brl(v: float) -> str:
    return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


cards_html = ""
for p in promos[:12]:
    parc = p["parcelas"]
    per_parc = p["price"] / parc
    name_safe = html.escape(p["name"])
    cards_html += f"""
    <div class="card">
      <div class="star">
        <div class="star-burst"></div>
        <div class="star-num">{parc}x</div>
        <div class="star-lbl">SEM JUROS</div>
      </div>
      <div class="photo"><img src="{html.escape(p['img'])}" alt="" loading="lazy"></div>
      <div class="name">{name_safe}</div>
      <div class="por">POR: 1+{parc - 1}X SEM JUROS</div>
      <div class="price-pill">{fmt_brl(per_parc)}</div>
      <div class="avista">OU À VISTA: {fmt_brl(p['price'])}</div>
    </div>"""

# CSS pesado mas tudo embarcado em um único arquivo.
html_doc = f"""<!DOCTYPE html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<title>{html.escape(campaign_name)} — esboço</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: 'Lato', 'Segoe UI', Arial, sans-serif;
    background: linear-gradient(135deg, {primary} 0%, #8b1a25 100%);
    color: #fff;
    -webkit-font-smoothing: antialiased;
  }}
  .page {{
    width: 1200px;
    margin: 0 auto;
    padding: 24px 20px 16px;
    background: radial-gradient(ellipse at top, {primary} 0%, #a01a28 70%, #6b1018 100%);
    position: relative;
    overflow: hidden;
  }}
  /* Corações decorativos no fundo */
  .page::before {{
    content: '';
    position: absolute; inset: 0;
    background-image:
      radial-gradient(circle at 10% 20%, rgba(255,255,255,0.08) 0, transparent 18px),
      radial-gradient(circle at 85% 15%, rgba(255,255,255,0.10) 0, transparent 22px),
      radial-gradient(circle at 30% 60%, rgba(255,255,255,0.06) 0, transparent 14px),
      radial-gradient(circle at 70% 80%, rgba(255,255,255,0.07) 0, transparent 16px),
      radial-gradient(circle at 15% 88%, rgba(255,255,255,0.05) 0, transparent 12px);
    pointer-events: none;
    z-index: 0;
  }}
  .page > * {{ position: relative; z-index: 1; }}

  /* ---- HERO ---- */
  .hero {{
    display: grid;
    grid-template-columns: 200px 1fr 260px;
    gap: 16px;
    align-items: center;
    margin-bottom: 14px;
    padding: 16px 12px;
  }}
  .hero .mascote {{ width: 100%; height: auto; filter: drop-shadow(0 8px 12px rgba(0,0,0,0.25)); }}
  .headline {{ text-align: center; }}
  .headline .top {{
    font-weight: 900; font-size: 32px; color: #fff;
    text-shadow: 2px 2px 0 {primary}, 4px 4px 0 rgba(0,0,0,0.3);
    letter-spacing: 1px;
  }}
  .headline .main {{
    font-weight: 900; font-size: 64px; color: #fff;
    text-shadow:
      0 0 0 #fff,
      3px 3px 0 {primary},
      6px 6px 0 #6b1018,
      8px 8px 16px rgba(0,0,0,0.35);
    line-height: 0.95; margin-top: 4px;
    letter-spacing: 1px;
  }}
  .headline .logo-msc {{ height: 64px; margin-top: 10px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4)); }}
  .cta {{
    color: #fff; text-align: right; padding-right: 4px;
  }}
  .cta-top {{ font-weight: 700; font-size: 20px; }}
  .cta-value {{
    font-weight: 900; font-size: 120px; line-height: 1;
    text-shadow: 3px 3px 0 {primary}, 6px 6px 0 rgba(0,0,0,0.3);
  }}
  .cta-label {{ font-weight: 900; font-size: 22px; letter-spacing: 1px; margin-top: -8px; }}
  .terms {{ list-style: none; margin-top: 12px; text-align: right; font-size: 14px; }}
  .terms li {{ margin: 2px 0; font-weight: 600; }}
  .terms li::before {{ content: '• '; opacity: 0.7; }}

  .sorteio {{
    text-align: center; font-weight: 700; font-size: 15px;
    background: rgba(0,0,0,0.18); color: #fff;
    padding: 8px 16px; border-radius: 999px;
    display: inline-block; margin: 0 auto 18px; position: relative; left: 50%; transform: translateX(-50%);
  }}

  /* ---- GRID ---- */
  .grid {{
    display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px;
  }}
  .card {{
    background: #fff; color: #222;
    border-radius: 10px; padding: 10px 8px 8px;
    position: relative;
    box-shadow: 0 4px 10px rgba(0,0,0,0.18);
    display: flex; flex-direction: column; align-items: center;
    min-height: 280px;
  }}
  .star {{
    position: absolute; top: -10px; left: -8px;
    width: 56px; height: 56px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    z-index: 2;
  }}
  .star-burst {{
    position: absolute; inset: 0;
    background: {secondary};
    /* 12-point star via clip-path */
    clip-path: polygon(
      50% 0%, 58% 30%, 80% 14%, 70% 38%, 100% 38%, 76% 52%,
      94% 78%, 66% 70%, 65% 100%, 50% 78%, 35% 100%, 34% 70%,
      6% 78%, 24% 52%, 0% 38%, 30% 38%, 20% 14%, 42% 30%);
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
  }}
  .star-num {{ position: relative; font-weight: 900; font-size: 16px; line-height: 1; color: #222; }}
  .star-lbl {{ position: relative; font-weight: 800; font-size: 7px; line-height: 1; color: #222; }}

  .photo {{ width: 100%; height: 110px; display: flex; align-items: center; justify-content: center; overflow: hidden; }}
  .photo img {{ max-width: 100%; max-height: 100%; object-fit: contain; }}

  .name {{
    font-weight: 800; font-size: 9.5px; text-align: center;
    line-height: 1.15; margin-top: 6px; color: #b81e2b;
    text-transform: uppercase;
    height: 26px; overflow: hidden;
  }}
  .por {{ font-size: 8px; font-weight: 800; color: {primary}; margin-top: 4px; text-align: center; }}
  .price-pill {{
    background: {secondary}; color: #6b1018;
    font-weight: 900; font-size: 20px;
    padding: 4px 10px; border-radius: 6px;
    margin-top: 4px; text-align: center;
    border: 2px solid #b8860b;
    box-shadow: 0 2px 4px rgba(0,0,0,0.15);
  }}
  .avista {{ font-size: 8px; color: #555; margin-top: 4px; text-align: center; font-weight: 700; }}

  /* ---- FOOTER ---- */
  .footer {{
    margin-top: 14px;
    background: #6b1018;
    color: #fff; padding: 10px 16px;
    display: flex; justify-content: space-between;
    font-weight: 800; font-size: 12px;
    border-radius: 4px;
  }}
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
    <div class="grid">
      {cards_html}
    </div>
    <div class="footer">
      <span>LOJAS MSC | TODA LOJA EM ATÉ 10X SEM JUROS</span>
      <span>página 1 de 1</span>
    </div>
  </div>
</body></html>
"""

(OUT / "catalogo.html").write_text(html_doc, encoding="utf-8")
print(f"[v] HTML salvo: {OUT / 'catalogo.html'}")
print(f"[v] abre no navegador: file:///{(OUT / 'catalogo.html').as_posix()}")
