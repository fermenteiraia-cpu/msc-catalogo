"""
polish_with_ai.py — Tira screenshot full-page do HTML do esboço e manda pro
gpt-image-2 polir. Salva os 3 artefatos: esboço HTML, screenshot (input da IA),
e arte final (output da IA).

Uso (servidor HTTP do esboço precisa estar rodando em :8765):
  OPENAI_API_KEY=... py scripts/polish_with_ai.py
"""
from __future__ import annotations

import base64
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
from openai import OpenAI

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / ".tmp_validate"
OUT.mkdir(exist_ok=True)

HTML_URL = "http://localhost:8765/catalogo.html"
SCREENSHOT_PATH = OUT / "esboco_screenshot.png"
POLISHED_PATH = OUT / "arte_final_ia.png"

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    print("[FATAL] OPENAI_API_KEY ausente", file=sys.stderr)
    sys.exit(2)


# -----------------------------------------------------------------------------
# 1) Screenshot full-page do HTML
# -----------------------------------------------------------------------------
print(f"[v] screenshot {HTML_URL}")
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    context = browser.new_context(viewport={"width": 1240, "height": 900}, device_scale_factor=2)
    page = context.new_page()
    page.goto(HTML_URL, wait_until="networkidle", timeout=30000)
    page.screenshot(path=str(SCREENSHOT_PATH), full_page=True)
    browser.close()
print(f"[v] screenshot salvo: {SCREENSHOT_PATH} ({SCREENSHOT_PATH.stat().st_size // 1024} KB)")


# -----------------------------------------------------------------------------
# 2) Manda pro gpt-image-2 (image-to-image / edits)
# -----------------------------------------------------------------------------
prompt = (
    "Polish this Brazilian retail catalog flyer into a premium 3D rendered version. "
    "CRITICAL: preserve EVERY piece of text, every product name, every price, and "
    "every layout element exactly as shown — do not invent, translate, or rephrase "
    "any text. Keep the same composition: angel mascot on the left of the hero, the "
    "big 3D headline in the center with the LOJAS MSC logo, the 50% discount panel "
    "on the right with the bullet terms, the sorteio pill, the 6×2 product grid, "
    "the bottom MSC footer. Apply: deeper saturated red gradient background with "
    "soft 3D hearts and balloons floating, glossy 3D extruded letters with red and "
    "dark shadow on the headline, polished plastic-3D look on the product cards, "
    "bold yellow price pills with crisp typography, professional Brazilian retail "
    "encarte aesthetic like Lojas MSC, Carrefour, Casas Bahia."
)

client = OpenAI(api_key=OPENAI_API_KEY)

# Tenta gpt-image-2 primeiro; cai pra gpt-image-1 se a API não conhecer ainda.
MODELS = ["gpt-image-2", "gpt-image-1"]
result = None
last_err: Exception | None = None
for model_name in MODELS:
    try:
        print(f"[v] tentando modelo {model_name}…")
        with open(SCREENSHOT_PATH, "rb") as fh:
            result = client.images.edit(
                model=model_name,
                image=fh,
                prompt=prompt,
                size="1024x1536",  # vertical, formato catálogo
            )
        print(f"[v] sucesso com {model_name}")
        break
    except Exception as e:
        last_err = e
        msg = str(e)
        print(f"[v] {model_name} falhou: {msg[:200]}")
        if "model" not in msg.lower() and "not found" not in msg.lower():
            # Erro real (não "modelo desconhecido") — propaga
            raise

if result is None:
    raise SystemExit(f"[FATAL] nenhum modelo aceito: {last_err}")


# -----------------------------------------------------------------------------
# 3) Salva o resultado
# -----------------------------------------------------------------------------
b64 = result.data[0].b64_json
if not b64:
    print("[FATAL] resposta sem b64_json", file=sys.stderr)
    sys.exit(1)

POLISHED_PATH.write_bytes(base64.b64decode(b64))
size_kb = POLISHED_PATH.stat().st_size // 1024
print(f"[v] arte final salva: {POLISHED_PATH} ({size_kb} KB)")
print("[v] FIM")
