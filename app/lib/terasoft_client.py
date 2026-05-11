"""
Cliente para a API Terasoft das Lojas MSC.
Cache local em app/cache/.

Credenciais SEMPRE vêm de variáveis de ambiente — nunca commitadas no código.
Crie um arquivo `.env` (ver .env.example) na raiz do projeto ou exporte as vars
antes de rodar:

    export TERASOFT_USER="..."
    export TERASOFT_PASS="..."
    # opcional: export TERASOFT_URL="..."
"""
import json
import os
from pathlib import Path
import requests
from urllib3.exceptions import InsecureRequestWarning
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

# Tenta carregar .env do project-root (um nível acima de app/)
_PROJECT_ROOT = Path(__file__).parent.parent.parent
try:
    from dotenv import load_dotenv  # python-dotenv
    load_dotenv(_PROJECT_ROOT / ".env", override=False)
except ImportError:
    # dotenv é opcional — se não tiver instalado, depende das env vars já estarem no shell
    pass

API_URL = os.environ.get("TERASOFT_URL", "https://apiserver.ip.inf.br:12067/consulta")
API_USER = os.environ.get("TERASOFT_USER")
API_PASS = os.environ.get("TERASOFT_PASS")

if not API_USER or not API_PASS:
    raise RuntimeError(
        "TERASOFT_USER e TERASOFT_PASS precisam estar definidos no ambiente.\n"
        "Soluções:\n"
        "  1) Crie um arquivo .env na raiz do projeto (ver .env.example)\n"
        "  2) Ou exporte no shell antes de rodar:\n"
        "        set TERASOFT_USER=seu_user (Windows cmd)\n"
        "        $env:TERASOFT_USER='seu_user' (Windows PowerShell)\n"
        "        export TERASOFT_USER=seu_user (bash/zsh)\n"
    )

ROOT = Path(__file__).parent.parent
CACHE_DIR = ROOT / "cache"
IMG_CACHE = CACHE_DIR / "imagens"
CACHE_DIR.mkdir(exist_ok=True)
IMG_CACHE.mkdir(exist_ok=True)


def consultar_produtos(ultimaalteracao="2020-01-01 00:00:00", use_cache=True):
    cache_file = CACHE_DIR / "produtos.json"
    if use_cache and cache_file.exists():
        with open(cache_file, "r", encoding="utf-8") as f:
            return json.load(f)
    r = requests.get(
        API_URL,
        auth=(API_USER, API_PASS),
        params={"ep": "PRODUTOS", "ultimaalteracao": ultimaalteracao},
        verify=False,
        timeout=60,
    )
    r.raise_for_status()
    data = r.json()
    with open(cache_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return data


def buscar_produto(codigo, produtos=None):
    if produtos is None:
        produtos = consultar_produtos()
    codigo = str(codigo).zfill(6)
    for p in produtos:
        if p.get("CODIGO") == codigo:
            return p
    return None


def baixar_imagem(produto):
    url = produto.get("IMAGEM")
    if not url:
        return None
    codigo = produto.get("CODIGO", "sem_codigo")
    local = IMG_CACHE / f"{codigo}.jpg"
    if local.exists() and local.stat().st_size > 0:
        return str(local)
    try:
        r = requests.get(url, verify=False, timeout=20)
        if r.status_code == 200 and r.headers.get("content-type", "").startswith("image"):
            with open(local, "wb") as f:
                f.write(r.content)
            return str(local)
    except Exception:
        pass
    return None
