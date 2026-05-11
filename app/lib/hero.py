"""
Hero artwork das Lojas MSC.
Layout zoneado: mascote (esq) | lettering+logo (centro) | CTA (dir) | rodape
"""
from __future__ import annotations
import math, random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

import assets_loader as AL

LATO_BLACK = "/usr/share/fonts/truetype/lato/Lato-Black.ttf"
LATO_BOLD  = "/usr/share/fonts/truetype/lato/Lato-Bold.ttf"


def _heart_shape(d, cx, cy, size, color):
    s = size
    d.ellipse((cx - s, cy - s, cx, cy), fill=color)
    d.ellipse((cx, cy - s, cx + s, cy), fill=color)
    d.polygon([(cx - s, cy - s // 4), (cx + s, cy - s // 4), (cx, cy + int(s * 0.9))], fill=color)


def _heart_3d(layer, cx, cy, size, front, side):
    for d in range(size // 6, 0, -1):
        _heart_shape(ImageDraw.Draw(layer), cx + d, cy + d, size, side)
    _heart_shape(ImageDraw.Draw(layer), cx, cy, size, front)
    h = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    _heart_shape(ImageDraw.Draw(h), cx - size // 5, cy - size // 4, size // 3, (255, 255, 255, 140))
    layer.alpha_composite(h)


def make_hearts_bg(w, h, count=70, seed=123):
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    rnd = random.Random(seed)
    pinks = [
        ((255, 130, 165), (200, 60, 100)),
        ((255, 165, 195), (210, 90, 130)),
        ((250, 110, 145), (180, 40, 80)),
    ]
    for _ in range(count):
        cx = rnd.randint(-20, w + 20)
        cy = rnd.randint(-20, h + 20)
        s = rnd.choice([10, 14, 18, 22, 28, 36, 50])
        front, side = rnd.choice(pinks)
        a = rnd.randint(140, 230) if s > 20 else rnd.randint(80, 160)
        _heart_3d(layer, cx, cy, s, (*front, a), (*side, max(0, a - 30)))
    return layer


def render_3d_text(text, font_path, font_size, front_color, side_color,
                   depth=14, outline_color=(255, 255, 255), outline_w=8, glow=True):
    font = ImageFont.truetype(font_path, font_size)
    bb = ImageDraw.Draw(Image.new("RGB", (10, 10))).textbbox((0, 0), text, font=font, stroke_width=outline_w)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    pad = depth + outline_w + 30
    canvas = Image.new("RGBA", (tw + pad * 2, th + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    for k in range(depth, 0, -1):
        d.text((pad - bb[0] + k, pad - bb[1] + k), text, font=font,
               fill=side_color, stroke_width=outline_w, stroke_fill=outline_color)
    face = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    fd = ImageDraw.Draw(face)
    fd.text((pad - bb[0], pad - bb[1]), text, font=font, fill=front_color,
            stroke_width=outline_w, stroke_fill=outline_color)
    canvas.alpha_composite(face)
    grad = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    for y in range(canvas.size[1]):
        a = int(120 * (1 - y / canvas.size[1]))
        gd.line([(0, y), (canvas.size[0], y)], fill=(255, 255, 255, a))
    mask = Image.new("L", canvas.size, 0)
    md = ImageDraw.Draw(mask)
    md.text((pad - bb[0], pad - bb[1]), text, font=font, fill=255, stroke_width=outline_w)
    grad.putalpha(ImageChops.multiply(grad.split()[-1], mask))
    canvas.alpha_composite(grad)
    if glow:
        gl = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        gld = ImageDraw.Draw(gl)
        gld.text((pad - bb[0], pad - bb[1]), text, font=font, fill=(255, 180, 200),
                 stroke_width=outline_w + 12)
        gl = gl.filter(ImageFilter.GaussianBlur(8))
        out = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        out.alpha_composite(gl)
        out.alpha_composite(canvas)
        canvas = out
    return canvas


def gradient(w, h, c1, c2):
    img = Image.new("RGB", (w, h), c1)
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        c = (int(c1[0] + (c2[0] - c1[0]) * t),
             int(c1[1] + (c2[1] - c1[1]) * t),
             int(c1[2] + (c2[2] - c1[2]) * t))
        for x in range(w):
            px[x, y] = c
    return img


def render_hero_maes(W=1500, H=600,
                    headline_top="MÊS DAS",
                    headline_main="mães",
                    cta_value="50%",
                    cta_label="DE DESCONTO",
                    cta_topline="Toda loja com até",
                    terms=None,
                    period_lines=("Sorteio para as compras efetuadas",
                                  "do dia 01/05 ao dia 09/05"),
                    bg_top=(255, 200, 215),
                    bg_bot=(255, 130, 175),
                    front_main=(255, 110, 145),
                    side_main=(170, 30, 70)):

    if terms is None:
        terms = [
            "Parcelamento facilitado",
            "Em 16X no carnê da loja",
            "Ou 1+9x sem juros nos cartões",
            "Entrega e montagem grátis",
        ]

    # ----- ZONAS (em pixels) -----
    PAD = 30
    MASCOTE_W = int(W * 0.22)
    CTA_W     = int(W * 0.26)
    CENTER_X0 = MASCOTE_W + PAD
    CENTER_X1 = W - CTA_W - PAD
    CENTER_W  = CENTER_X1 - CENTER_X0
    CENTER_CX = (CENTER_X0 + CENTER_X1) // 2
    FOOTER_H  = int(H * 0.10)

    # ----- fundo -----
    canvas = gradient(W, H, bg_top, bg_bot).convert("RGBA")
    canvas.alpha_composite(make_hearts_bg(W, H, count=70))

    # ----- mascote (zona esquerda) -----
    mascote_h = int(H * 0.92)
    mascote = AL.load_mascote(target_h=mascote_h)
    # cabe na zona em largura?
    if mascote.size[0] > MASCOTE_W:
        ratio = MASCOTE_W / mascote.size[0]
        mascote = mascote.resize(
            (MASCOTE_W, max(1, int(mascote.size[1] * ratio))),
            Image.LANCZOS,
        )
    mx = (MASCOTE_W - mascote.size[0]) // 2
    my = (H - FOOTER_H - mascote.size[1]) // 2
    canvas.alpha_composite(mascote, (mx, max(0, my)))

    # ----- lettering centro -----
    # "MÊS DAS"  - tamanho calibrado para caber no centro
    top_size = int(H * 0.13)
    mes_das = render_3d_text(headline_top, LATO_BLACK, top_size,
                             front_color=(255, 90, 130), side_color=(180, 40, 80),
                             depth=8, outline_w=4)
    if mes_das.size[0] > CENTER_W * 0.85:
        r = (CENTER_W * 0.85) / mes_das.size[0]
        mes_das = mes_das.resize(
            (int(mes_das.size[0]*r), int(mes_das.size[1]*r)), Image.LANCZOS)

    # "mães" gigante
    main_size = int(H * 0.40)
    main = render_3d_text(headline_main, LATO_BLACK, main_size,
                          front_color=front_main, side_color=side_main,
                          depth=18, outline_w=10)
    if main.size[0] > CENTER_W * 0.95:
        r = (CENTER_W * 0.95) / main.size[0]
        main = main.resize(
            (int(main.size[0]*r), int(main.size[1]*r)), Image.LANCZOS)

    # logo MSC abaixo do main
    logo_h = int(H * 0.16)
    logo = AL.load_logo("dark", target_h=logo_h)
    # caso o logo seja muito largo, comprime
    if logo.size[0] > CENTER_W * 0.55:
        r = (CENTER_W * 0.55) / logo.size[0]
        logo = logo.resize(
            (int(logo.size[0]*r), int(logo.size[1]*r)), Image.LANCZOS)

    # posicionar verticalmente: mes_das no topo, main no meio, logo abaixo
    block_h = mes_das.size[1] + main.size[1] + logo.size[1] + 30
    block_top = (H - FOOTER_H - block_h) // 2

    canvas.alpha_composite(mes_das,
                           (CENTER_CX - mes_das.size[0]//2, block_top))
    main_y = block_top + mes_das.size[1] - 8
    canvas.alpha_composite(main,
                           (CENTER_CX - main.size[0]//2, main_y))
    logo_y = main_y + main.size[1] - 8
    canvas.alpha_composite(logo,
                           (CENTER_CX - logo.size[0]//2, logo_y))

    # coracao no centro do "ã"
    h_decor = Image.new("RGBA", (90, 90), (0, 0, 0, 0))
    _heart_3d(h_decor, 45, 45, 24, (255, 80, 130, 255), (160, 30, 70, 255))
    canvas.alpha_composite(h_decor, (CENTER_CX - 45, main_y - 5))

    # ----- CTA direita -----
    d = ImageDraw.Draw(canvas)
    cta_x = CENTER_X1 + PAD
    cta_top = int(H * 0.10)
    f_top = ImageFont.truetype(LATO_BOLD, int(H * 0.055))
    d.text((cta_x, cta_top), cta_topline, font=f_top, fill=(255, 255, 255))
    f_big = ImageFont.truetype(LATO_BLACK, int(H * 0.26))
    d.text((cta_x, cta_top + int(H * 0.06)), cta_value, font=f_big, fill=(255, 255, 255))
    f_lbl = ImageFont.truetype(LATO_BLACK, int(H * 0.065))
    d.text((cta_x, cta_top + int(H * 0.34)), cta_label, font=f_lbl, fill=(255, 255, 255))
    f_term = ImageFont.truetype(LATO_BOLD, int(H * 0.035))
    for i, t in enumerate(terms):
        d.text((cta_x, cta_top + int(H * 0.45) + i * int(H * 0.055)),
               t, font=f_term, fill=(255, 255, 255))

    # ----- rodape com 'Sorteio' -----
    foot_top = H - FOOTER_H
    layer_foot = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    fd = ImageDraw.Draw(layer_foot)
    fd.rectangle((0, foot_top, W, H), fill=(180, 35, 75, 200))
    canvas.alpha_composite(layer_foot)
    f_per = ImageFont.truetype(LATO_BOLD, int(FOOTER_H * 0.36))
    n = len(period_lines)
    line_h = int(FOOTER_H * 0.42)
    base_y = foot_top + (FOOTER_H - line_h * n) // 2
    for i, line in enumerate(period_lines):
        bb = d.textbbox((0, 0), line, font=f_per)
        d.text((W//2 - (bb[2]-bb[0])//2 - bb[0], base_y + i * line_h - bb[1]),
               line, font=f_per, fill=(255, 255, 255))

    return canvas.convert("RGB")


if __name__ == "__main__":
    print("Status dos assets:")
    for k, v in AL.asset_status().items():
        print(f"  {k:12} -> {v}")
    img = render_hero_maes()
    out = Path(__file__).parent / "output" / "hero" / "hero_maes_v3.jpg"
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, quality=92)
    print(f"Salvo: {out}")
