"""
render_catalog.py — Integra o renderer Python existente (app/lib/renderer.py) com
o pipeline Supabase atual. Lê o catálogo e as peças do Postgres, monta o formato
que o renderer espera e gera as páginas (JPG + upload pro Storage).

Roda no GitHub Actions (workflow render-catalog.yml). Para teste local:

  CATALOG_ID=<uuid> RENDER_RUN_ID=<uuid> \
  NEXT_PUBLIC_SUPABASE_URL=<...> SUPABASE_SERVICE_ROLE_KEY=<legacy_jwt> \
  TERASOFT_USER=<...> TERASOFT_PASS=<...> \
  python scripts/render_catalog.py
"""
from __future__ import annotations

import os
import sys
import time
import traceback
from pathlib import Path
from typing import Any

import requests

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "app" / "lib"))

# -----------------------------------------------------------------------------
# Config
# -----------------------------------------------------------------------------
SUPABASE_URL = (
    os.environ.get("SUPABASE_URL")
    or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
)
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
CATALOG_ID = os.environ.get("CATALOG_ID")
RENDER_RUN_ID = os.environ.get("RENDER_RUN_ID")  # opcional (modo local sem subir)

HEADERS = {
    "Authorization": f"Bearer {SERVICE_KEY}",
    "apikey": SERVICE_KEY,
    "Content-Type": "application/json",
}


def _patch_render_run(payload: dict) -> None:
    """Atualiza a linha em render_runs (best-effort)."""
    if not RENDER_RUN_ID:
        return
    try:
        requests.patch(
            f"{SUPABASE_URL}/rest/v1/render_runs?id=eq.{RENDER_RUN_ID}",
            headers={**HEADERS, "Prefer": "return=minimal"},
            json=payload,
            timeout=30,
        )
    except Exception as e:
        print(f"[warn] não consegui atualizar render_run: {e}", file=sys.stderr)


def supa(path: str, **params) -> Any:
    """GET no PostgREST do Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    r = requests.get(url, headers=HEADERS, params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def to_renderer_product(p: dict) -> dict:
    """Traduz uma linha de `products` no formato que o renderer espera."""
    return {
        "CODIGO": p["terasoft_code"],
        "NOME": p.get("name") or "",
        "IMAGEM": p.get("image_url") or "",
        "VALORVENDA": float(p["price_cash"]) if p.get("price_cash") is not None else 0.0,
        "STATUS": "S",
        "GRUPO": p.get("grupo") or "",
        "SUBGRUPO": p.get("subgrupo") or "",
        "MARCA": p.get("brand") or "",
    }


def main() -> None:
    if not (SUPABASE_URL and SERVICE_KEY and CATALOG_ID):
        raise RuntimeError(
            "precisa de SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e CATALOG_ID"
        )

    # Marca como running (idempotente — pode já estar 'queued' ou 'running')
    _patch_render_run({"status": "running"})

    # Import tardio: o terasoft_client falha no import se os secrets não estiverem
    # presentes — só queremos descobrir isso DEPOIS de marcar o run como running.
    import renderer as R  # noqa: E402

    print(f"[render] catálogo {CATALOG_ID}")
    catalogs = supa("catalogs", id=f"eq.{CATALOG_ID}", select="*")
    if not catalogs:
        raise RuntimeError("catálogo não encontrado")
    catalog = catalogs[0]
    spec = catalog.get("campaign_spec") or {}

    pieces = supa(
        "pieces",
        catalog_id=f"eq.{CATALOG_ID}",
        select="*",
        order="position.asc",
    )
    print(f"[render] {len(pieces)} peças")

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
    print(f"[render] {len(by_code)} produtos resolvidos")

    promos: list[dict] = []
    for piece in pieces:
        pc = piece.get("product_codes") or []
        code = pc[0] if pc else None
        prod = by_code.get(code) if code else None
        if not prod or prod.get("price_cash") is None:
            continue
        base = float(prod["price_cash"])
        desconto = float(piece.get("desconto_percent") or 0)
        if piece.get("preco_final_override") is not None:
            valor_promo = float(piece["preco_final_override"])
        else:
            valor_promo = round(base * (1 - desconto / 100.0), 2)
        promos.append(
            {
                "produto": to_renderer_product(prod),
                "valor_avista": base,
                "valor_promo": valor_promo,
                "parcelas": int(piece.get("parcelas") or 10),
                "destaque": bool(piece.get("is_destaque")),
                "codigo": prod["terasoft_code"],
            }
        )

    if not promos:
        raise RuntimeError("nenhum produto válido pra renderizar")
    print(f"[render] {len(promos)} promos prontos")

    # Headline: o renderer usa "main" como a palavra principal em 3D.
    # Pra "DIA DO TRABALHADOR" (várias palavras) mantemos tudo numa string em
    # cima — o lettering 3D fica só com a última palavra.
    headline = (spec.get("creative") or {}).get("headline") or {}
    headline_top_raw = (headline.get("top") or "PROMOÇÃO").upper()
    headline_main_raw = (headline.get("main") or "promo").strip()
    parts = headline_main_raw.split()
    headline_main = (parts[-1] if parts else "promo").lower()
    if len(parts) > 1:
        headline_top = f"{headline_top_raw} {' '.join(parts[:-1]).upper()}".strip()
    else:
        headline_top = headline_top_raw

    campaign_name = (spec.get("campaign") or {}).get("name") or "Campanha"
    print(f"[render] headline_top='{headline_top}' headline_main='{headline_main}'")

    pages = R.render_catalog_pages(
        promos,
        page_size=(2200, 2540),
        cols=4,
        rows=3,
        headline_top=headline_top,
        headline_main=headline_main,
        titulo_strip=campaign_name,
        subtitulo_strip="LOJAS MSC",
    )
    print(f"[render] {len(pages)} páginas geradas")
    _patch_render_run({"pages_total": len(pages)})

    # Salva localmente (útil pra debug + pro teste local sem RENDER_RUN_ID)
    out_dir = ROOT / ".tmp_render_python"
    out_dir.mkdir(exist_ok=True)
    local_paths: list[Path] = []
    for i, page in enumerate(pages, 1):
        out_path = out_dir / f"page-{i}.jpg"
        page.convert("RGB").save(str(out_path), quality=88)
        local_paths.append(out_path)
        print(f"[render] página {i}: {out_path}")

    if not RENDER_RUN_ID:
        print("[render] sem RENDER_RUN_ID — fim (modo local)")
        return

    # Sobe pro Storage e atualiza catalog_page_renders.
    bucket = "catalog-renders"
    for i, page in enumerate(pages):
        png_bytes_path = local_paths[i].with_suffix(".png")
        page.save(str(png_bytes_path), format="PNG")
        storage_path = f"{CATALOG_ID}/page-{i}.png"
        with open(png_bytes_path, "rb") as fh:
            up = requests.put(
                f"{SUPABASE_URL}/storage/v1/object/{bucket}/{storage_path}",
                headers={
                    "Authorization": f"Bearer {SERVICE_KEY}",
                    "Content-Type": "image/png",
                },
                data=fh.read(),
                timeout=60,
            )
        if up.status_code >= 400:
            raise RuntimeError(
                f"upload storage falhou ({up.status_code}): {up.text[:200]}"
            )
        public_url = (
            f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{storage_path}"
            f"?v={int(time.time()*1000)}"
        )
        kind = "cover" if i == 0 else "products"
        upsert = requests.post(
            f"{SUPABASE_URL}/rest/v1/catalog_page_renders?on_conflict=catalog_id,page_index",
            headers={**HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
            json={
                "tenant_id": "00000000-0000-0000-0000-000000000001",
                "catalog_id": CATALOG_ID,
                "page_index": i,
                "page_kind": kind,
                "status": "ready",
                "image_url": public_url,
                "storage_path": storage_path,
                "render_run_id": RENDER_RUN_ID,
            },
            timeout=30,
        )
        if upsert.status_code >= 400:
            raise RuntimeError(
                f"upsert catalog_page_renders falhou ({upsert.status_code}): {upsert.text[:200]}"
            )
        _patch_render_run({"pages_done": i + 1})
        print(f"[render] subiu página {i}")

    _patch_render_run(
        {
            "status": "success",
            "pages_total": len(pages),
            "pages_done": len(pages),
            "completed_at": "now()",
        }
    )
    print("[render] fim")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001
        tb = traceback.format_exc()
        print(f"[FATAL] {e}\n{tb}", file=sys.stderr)
        _patch_render_run(
            {
                "status": "failed",
                "error": {"message": str(e), "traceback": tb[-2000:]},
                "completed_at": "now()",
            }
        )
        sys.exit(1)
