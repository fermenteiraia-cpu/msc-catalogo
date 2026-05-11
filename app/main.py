"""
MSC Studio - mini app local.
Roda em http://localhost:8000
"""
import sys, json, re, unicodedata
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT / "lib"))

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional

import terasoft_client as ts
import renderer as R
import assets_loader as AL

app = FastAPI(title="MSC Studio")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

CAMP_DIR = ROOT.parent / "campanhas"
CAMP_DIR.mkdir(exist_ok=True)


def slugify(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^a-zA-Z0-9]+", "_", s).strip("_").lower()
    return s or "campanha"


@app.get("/")
def root():
    return FileResponse(ROOT / "static" / "index.html")


@app.get("/api/health")
def health():
    return {"ok": True, "assets": {k: str(v) if v else None for k, v in AL.asset_status().items()}}


@app.get("/api/produtos")
def list_produtos(grupo: Optional[str] = None, subgrupo: Optional[str] = None,
                  grade: Optional[str] = None, marca: Optional[str] = None,
                  busca: Optional[str] = None, com_foto: bool = True,
                  apenas_ativos: bool = True, limit: int = 200, offset: int = 0):
    produtos = ts.consultar_produtos()
    out = []
    bsearch = (busca or "").strip().lower()
    for p in produtos:
        if apenas_ativos and p.get("STATUS") != "S":
            continue
        if com_foto and not p.get("IMAGEM"):
            continue
        if grupo and p.get("GRUPO") != grupo:
            continue
        if subgrupo and p.get("SUBGRUPO") != subgrupo:
            continue
        if grade and p.get("GRADE") != grade:
            continue
        if marca and p.get("MARCA") != marca:
            continue
        if bsearch:
            hay = (p.get("NOME", "") + " " + p.get("CODIGO", "")).lower()
            if bsearch not in hay:
                continue
        out.append({
            "codigo": p.get("CODIGO"),
            "nome": p.get("NOME"),
            "grupo": p.get("GRUPO"),
            "subgrupo": p.get("SUBGRUPO"),
            "grade": p.get("GRADE"),
            "marca": p.get("MARCA"),
            "valorvenda": p.get("VALORVENDA"),
            "valorpromocao": p.get("VALORPROMOCAO"),
            "imagem": p.get("IMAGEM"),
        })
    return {"total": len(out), "produtos": out[offset: offset + limit]}


@app.get("/api/filtros")
def get_filtros(grupo: Optional[str] = None):
    """Devolve listas distintas de grupo/subgrupo/grade/marca para popular dropdowns."""
    produtos = ts.consultar_produtos()
    grupos, subgrupos, grades, marcas = set(), set(), set(), set()
    for p in produtos:
        if p.get("STATUS") != "S":
            continue
        if grupo and p.get("GRUPO") != grupo:
            continue
        grupos.add(p.get("GRUPO") or "")
        subgrupos.add(p.get("SUBGRUPO") or "")
        grades.add(p.get("GRADE") or "")
        marcas.add(p.get("MARCA") or "")
    drop = lambda s: sorted([x for x in s if x and x != "NAO CLASSIFICADO"])
    return {
        "grupos":   drop(grupos) if grupo is None else [],
        "subgrupos": drop(subgrupos),
        "grades":    drop(grades),
        "marcas":    drop(marcas),
    }


@app.get("/api/produto/{codigo}/foto")
def produto_foto(codigo: str):
    produtos = ts.consultar_produtos()
    p = ts.buscar_produto(codigo, produtos)
    if not p:
        raise HTTPException(404, "produto nao encontrado")
    path = ts.baixar_imagem(p)
    if not path:
        raise HTTPException(404, "sem foto")
    return FileResponse(path, media_type="image/jpeg")


class ItemPromo(BaseModel):
    codigo: str
    desconto_pct: Optional[float] = None
    valor_promo_override: Optional[float] = None
    parcelas: int = 10
    destaque: bool = False


class CampanhaIn(BaseModel):
    nome: str = "Campanha"
    headline: str = "PROMOÇÃO"
    subtitulo: str = ""
    layout_catalogo: str = "4x3"
    itens: List[ItemPromo]


@app.post("/api/campanha/gerar")
def gerar_campanha(c: CampanhaIn):
    if not c.itens:
        raise HTTPException(400, "lista de itens vazia")

    produtos = ts.consultar_produtos()
    promos = []
    for it in c.itens:
        p = ts.buscar_produto(it.codigo, produtos)
        if not p:
            continue
        valor_avista = p.get("VALORVENDA")
        if valor_avista is None:
            continue
        if it.valor_promo_override is not None:
            valor_promo = float(it.valor_promo_override)
        elif it.desconto_pct is not None:
            valor_promo = round(float(valor_avista) * (1 - float(it.desconto_pct) / 100.0), 2)
        else:
            valor_promo = float(valor_avista)
        promos.append({
            "produto": p, "valor_avista": float(valor_avista),
            "valor_promo": valor_promo, "parcelas": it.parcelas,
            "destaque": it.destaque, "codigo": p["CODIGO"],
        })

    if not promos:
        raise HTTPException(400, "nenhum produto valido")

    slug = slugify(c.nome) + "_" + datetime.now().strftime("%Y%m%d_%H%M%S")
    out_dir = CAMP_DIR / slug
    out_dir.mkdir(exist_ok=True)
    (out_dir / "individual").mkdir(exist_ok=True)
    (out_dir / "ig").mkdir(exist_ok=True)
    (out_dir / "story").mkdir(exist_ok=True)
    (out_dir / "wa").mkdir(exist_ok=True)
    (out_dir / "tv").mkdir(exist_ok=True)

    arquivos = []

    # split do headline: ultima palavra vira o lettering 3D principal (lowercase),
    # o resto vira o "MES DAS" no topo
    h_parts = c.headline.strip().split()
    if len(h_parts) >= 2:
        h_top = " ".join(h_parts[:-1]).upper()
        h_main = h_parts[-1].lower()
    else:
        h_top = "PROMOÇÃO"
        h_main = (c.headline or "promo").lower()

    # ---- HERO da campanha (paisagem) ----
    hero_img = R.render_hero_block(1500, 600,
                                   headline_top=h_top, headline_main=h_main,
                                   include_terms=True, include_period=True)
    hero_path = out_dir / f"hero_{slug}.jpg"
    hero_img.convert("RGB").save(str(hero_path), quality=92)
    arquivos.append({"tipo": "hero", "path": str(hero_path),
                     "rel": f"campanhas/{slug}/{hero_path.name}"})

    # catalogo (todos os produtos)
    cols, rows = (4, 3) if c.layout_catalogo == "4x3" else \
                 (3, 2) if c.layout_catalogo == "3x2" else \
                 (3, 3) if c.layout_catalogo == "3x3" else \
                 (4, 4) if c.layout_catalogo == "4x4" else (4, 3)
    pages = R.render_catalog_pages(promos, page_size=(2200, 2540), cols=cols, rows=rows,
                                   headline_top=h_top, headline_main=h_main,
                                   titulo_strip=c.headline,
                                   subtitulo_strip=c.subtitulo or "LOJAS MSC")
    pdf_path = out_dir / f"catalogo_{slug}.pdf"
    R.save_pdf_from_pages(pages, str(pdf_path))
    arquivos.append({"tipo": "catalogo_pdf", "path": str(pdf_path),
                     "rel": f"campanhas/{slug}/{pdf_path.name}", "n_pages": len(pages)})

    for i, page in enumerate(pages, 1):
        png_path = out_dir / f"catalogo_pag{i}.jpg"
        page.save(png_path, quality=88)
        arquivos.append({"tipo": "catalogo_png", "path": str(png_path),
                         "rel": f"campanhas/{slug}/{png_path.name}", "page": i})

    # pecas avulsas (so destaques)
    destaques = [x for x in promos if x["destaque"]]
    for item in destaques:
        for fmt in ("ig", "story", "wa", "tv"):
            img = R.render_produto(item["produto"], item["valor_avista"],
                                   item["valor_promo"], item["parcelas"], fmt,
                                   headline_top=h_top, headline_main=h_main)
            out_path = out_dir / fmt / f"{item['codigo']}_{fmt}.jpg"
            img.save(out_path, quality=92)
            arquivos.append({"tipo": fmt, "path": str(out_path),
                             "rel": f"campanhas/{slug}/{fmt}/{out_path.name}",
                             "codigo": item["codigo"]})

    return {
        "ok": True, "slug": slug,
        "n_total": len(promos), "n_destaques": len(destaques),
        "n_paginas_catalogo": len(pages),
        "arquivos": arquivos,
        "out_dir": str(out_dir),
    }


# Serve campanhas geradas
app.mount("/campanhas", StaticFiles(directory=str(CAMP_DIR)), name="campanhas")
# Serve static frontend
app.mount("/static", StaticFiles(directory=str(ROOT / "static")), name="static")


if __name__ == "__main__":
    import uvicorn
    print("\n" + "=" * 60)
    print("  MSC Studio rodando em:  http://localhost:8000")
    print("=" * 60 + "\n")
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="warning")
