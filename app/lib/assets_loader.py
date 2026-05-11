"""
Carrega os assets de marca das Lojas MSC (mascote, logos).
Procura na pasta msc_brand (pasta pai do app).
Faz remocao automatica de fundo branco quando o PNG nao tem alpha.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

ROOT = Path(__file__).parent.parent
BRAND_DIR = ROOT.parent

ASSET_ALIASES = {
    "mascote":    ["mascote", "mascot", "vovo", "papai_msc"],
    "logo_dark":  ["logo_msc", "logo_azul", "logo_dark", "logo"],
    "logo_white": ["logo_white", "logo_branco", "logo_branca", "msc_branco"],
}

LATO_BLACK = None
LATO_BOLD  = None
for p in [
    "C:/Windows/Fonts/Lato-Black.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/segoeuib.ttf",
    "/usr/share/fonts/truetype/lato/Lato-Black.ttf",
]:
    if os.path.exists(p):
        LATO_BLACK = p
        break
for p in [
    "C:/Windows/Fonts/Lato-Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
    "/usr/share/fonts/truetype/lato/Lato-Bold.ttf",
]:
    if os.path.exists(p):
        LATO_BOLD = p
        break

if not LATO_BLACK:
    LATO_BLACK = LATO_BOLD or "arial.ttf"
if not LATO_BOLD:
    LATO_BOLD = LATO_BLACK


def _scan_dir(d):
    if not d.exists():
        return {}
    found = {}
    for p in d.iterdir():
        if p.is_file() and p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp"):
            key = p.stem.lower().replace(" ", "_").replace("-", "_")
            found[key] = p
    return found


def find_asset(kind):
    aliases = ASSET_ALIASES.get(kind, [kind])
    excludes = ["white", "branco", "branca"] if kind == "logo_dark" else []
    candidates = []
    for d in [BRAND_DIR]:
        for name, path in _scan_dir(d).items():
            if any(x in name for x in excludes):
                continue
            for alias in aliases:
                if alias in name:
                    candidates.append(path)
                    break
    if not candidates:
        return None
    pngs = [p for p in candidates if p.suffix.lower() == ".png"]
    return pngs[0] if pngs else candidates[0]


def _has_alpha(img):
    if img.mode != "RGBA":
        return False
    return img.split()[-1].getextrema()[0] < 250


def _trim(img):
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def _remove_white_bg(img, threshold=240, feather=2):
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r >= threshold and g >= threshold and b >= threshold:
                m = (r + g + b) / 3
                t = max(0, min(1, (m - threshold) / max(1, 255 - threshold)))
                px[x, y] = (r, g, b, int(a * (1 - t)))
    if feather:
        alpha = img.split()[-1].filter(ImageFilter.GaussianBlur(feather))
        img.putalpha(alpha)
    return _trim(img)


def _smart_load(path, threshold=240, feather=1):
    img = Image.open(path).convert("RGBA")
    if _has_alpha(img):
        return _trim(img)
    return _remove_white_bg(img, threshold, feather)


def _resize_h(img, target_h):
    if not target_h:
        return img
    r = target_h / img.size[1]
    return img.resize((max(1, int(img.size[0] * r)), target_h), Image.LANCZOS)


def load_mascote(target_h=None):
    p = find_asset("mascote")
    if p:
        return _resize_h(_smart_load(p, threshold=248, feather=1), target_h)
    return Image.new("RGBA", (10, 10), (0, 0, 0, 0))


def load_logo(variant="dark", target_h=None):
    key = "logo_white" if variant == "white" else "logo_dark"
    p = find_asset(key)
    if p:
        return _resize_h(_smart_load(p, threshold=235, feather=1), target_h)
    return Image.new("RGBA", (10, 10), (0, 0, 0, 0))


def asset_status():
    return {
        "mascote":    find_asset("mascote"),
        "logo_dark":  find_asset("logo_dark"),
        "logo_white": find_asset("logo_white"),
    }


if __name__ == "__main__":
    for k, v in asset_status().items():
        print(f"  {k:12} -> {v if v else 'AUSENTE'}")
