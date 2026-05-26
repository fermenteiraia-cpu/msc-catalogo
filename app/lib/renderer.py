"""
Renderer das pecas MSC integrado com o motor de hero 3D.

Arquitetura:
  hero_block(W, H, headline_top, headline_main, ...)  -> Image (capa/topo da peca)
  bg_canvas(W, H)  -> fundo gradiente + coracoes
  produto_block(produto, valor_avista, valor_promo, parcelas, W, H)  -> bloco do produto
  
Composicoes:
  render_produto(fmt='ig')    -> hero pequeno em cima + produto centralizado embaixo
  render_produto(fmt='story') -> hero medio + produto + selo
  render_produto(fmt='tv')    -> hero a esquerda + produto a direita
  render_catalog_pages()       -> pagina 1 = hero full / paginas seguintes = grade
"""
import math
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

import sys
sys.path.insert(0, str(Path(__file__).parent))
import assets_loader as AL
from terasoft_client import baixar_imagem

LATO_BLACK = AL.LATO_BLACK
LATO_BOLD = AL.LATO_BOLD


def font(s, w="black"):
    return ImageFont.truetype(LATO_BLACK if w == "black" else LATO_BOLD, s)


def fmt_money(v):
    s = f"{float(v):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"R$ {s}"


def fmt_split(v):
    s = f"{float(v):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    i, c = s.rsplit(",", 1)
    return f"R$ {i}", f",{c}"


# v2 (T2.3): estrela 12-pontas pro selo "10x SEM JUROS" do catálogo
def star_polygon_points(cx, cy, r_out, r_in, points=12, rotation_deg=-90):
    """Calcula vértices de polígono estrela com `points` pontas.
    rotation_deg=-90: estrela apontando pra cima (vs lado).
    Retorna lista [(x1,y1), (x2,y2), ...] alternando r_out/r_in (2*points vértices)."""
    verts = []
    total = points * 2
    for i in range(total):
        angle_deg = rotation_deg + (360.0 / total) * i
        angle = math.radians(angle_deg)
        r = r_out if i % 2 == 0 else r_in
        x = cx + r * math.cos(angle)
        y = cy + r * math.sin(angle)
        verts.append((x, y))
    return verts


def draw_star_seal(draw_or_layer, cx, cy, r_out, r_in=None, points=12,
                   fill=(245, 200, 75), outline=(184, 134, 11), outline_w=3):
    """Desenha estrela 12-pontas (selo clássico de promoção) centrada em (cx,cy)."""
    if r_in is None:
        r_in = int(r_out * 0.72)  # razão padrão estrela "selo de promoção"
    verts = star_polygon_points(cx, cy, r_out, r_in, points=points)
    if hasattr(draw_or_layer, 'polygon'):
        draw_or_layer.polygon(verts, fill=fill, outline=outline)
        # PIL polygon outline é width=1 sempre; pra width maior precisa desenhar linhas
        if outline_w > 1:
            n = len(verts)
            for i in range(n):
                a = verts[i]
                b = verts[(i + 1) % n]
                draw_or_layer.line([a, b], fill=outline, width=outline_w)
    else:
        # caller passou ImageDraw já
        ImageDraw.Draw(draw_or_layer).polygon(verts, fill=fill, outline=outline)


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


# ============= CORACOES 3D (decoracao do fundo) =============
# v2 (visual spike T2.1): coracoes com profundidade real
#   - face com gradient (highlight no topo, mais escuro embaixo)
#   - sombra com GaussianBlur (nao pixel-art 8-bit como v1)
#   - menor densidade (paleta coral aguenta menos decoracao)

def _heart_shape(d, cx, cy, size, color):
    s = size
    d.ellipse((cx - s, cy - s, cx, cy), fill=color)
    d.ellipse((cx, cy - s, cx + s, cy), fill=color)
    d.polygon([(cx - s, cy - s // 4), (cx + s, cy - s // 4), (cx, cy + int(s * 0.9))], fill=color)


def _heart_with_depth(canvas_size, cx, cy, size, front, side, alpha):
    """v2: coracao com sombra blur + gradient interno (vs v1 que era 8-bit stepping)."""
    # 1. Shadow layer: silhueta deslocada com blur gaussiano
    shadow = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    shadow_offset = max(2, size // 8)
    _heart_shape(sd, cx + shadow_offset, cy + shadow_offset, size,
                 (*side, max(0, alpha - 40)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(max(1, size // 10)))

    # 2. Face layer: cor principal
    face = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    fd = ImageDraw.Draw(face)
    _heart_shape(fd, cx, cy, size, (*front, alpha))

    # 3. Highlight: gradient interno suave (topo mais claro)
    hl_size = max(1, size // 2)
    hl_off_x = size // 5
    hl_off_y = size // 4
    hl = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    hld = ImageDraw.Draw(hl)
    _heart_shape(hld, cx - hl_off_x, cy - hl_off_y, hl_size,
                 (255, 255, 255, min(180, alpha)))
    hl = hl.filter(ImageFilter.GaussianBlur(max(1, hl_size // 4)))

    return shadow, face, hl


def make_hearts_bg(w, h, count=70, seed=123, palette=None):
    """v2: paleta coral suave + corações com profundidade real."""
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    rnd = random.Random(seed)
    # Paleta coral lavada (não mais o pink saturado da v1)
    if palette is None:
        palette = [
            ((250, 145, 155), (200, 90, 105)),   # coral médio
            ((252, 175, 180), (215, 120, 135)),  # coral claro
            ((245, 125, 145), (190, 75, 95)),    # coral pop
        ]
    # Aplicar em 3 passes: shadows primeiro, depois faces, depois highlights
    # (cada um é uma layer separada que compõe na ordem correta)
    shadows = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    faces = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    highlights = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    for _ in range(count):
        cx = rnd.randint(-20, w + 20)
        cy = rnd.randint(-20, h + 20)
        s = rnd.choice([12, 16, 22, 30, 42, 56])  # tamanhos um pouco maiores p/ visual mais limpo
        front, side = rnd.choice(palette)
        # Alphas mais sutis na v2 (corações não competem com lettering)
        a = rnd.randint(110, 170) if s > 30 else rnd.randint(60, 120)
        sh, fc, hl = _heart_with_depth((w, h), cx, cy, s, front, side, a)
        shadows.alpha_composite(sh)
        faces.alpha_composite(fc)
        highlights.alpha_composite(hl)

    layer.alpha_composite(shadows)
    layer.alpha_composite(faces)
    layer.alpha_composite(highlights)
    return layer


def bg_canvas(W, H, bg_top=(253, 220, 220), bg_bot=(250, 165, 168), hearts=True, density=70000):
    """v2: paleta CORAL LAVADO (não rosa pink saturado).
    Cores sampleadas do PDF oficial Mês das Mães:
      top:    rgb(253, 220, 220) — coral muito claro (quase rosé)
      bottom: rgb(250, 165, 168) — coral médio salmon
    Densidade default reduzida de 30000 → 70000 (menos corações, mais respirável)."""
    canvas = gradient(W, H, bg_top, bg_bot).convert("RGBA")
    if hearts:
        canvas.alpha_composite(make_hearts_bg(W, H, count=int(W * H / density)))
    return canvas


def remove_white_bg(img, threshold=235, feather=1):
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r > threshold and g > threshold and b > threshold:
                m = (r + g + b) / 3
                t = max(0, min(1, (m - threshold) / (255 - threshold)))
                px[x, y] = (r, g, b, int(255 * (1 - t)))
    if feather:
        alpha = img.split()[-1].filter(ImageFilter.GaussianBlur(feather))
        img.putalpha(alpha)
    return img


# ============= LETTERING 3D =============
def render_3d_text(text, font_path, font_size, front_color, side_color,
                   depth=14, outline_color=(255, 255, 255), outline_w=8, glow=True):
    f = ImageFont.truetype(font_path, font_size)
    bb = ImageDraw.Draw(Image.new("RGB", (10, 10))).textbbox((0, 0), text, font=f, stroke_width=outline_w)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    pad = depth + outline_w + 30
    canvas = Image.new("RGBA", (tw + pad * 2, th + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    for k in range(depth, 0, -1):
        d.text((pad - bb[0] + k, pad - bb[1] + k), text, font=f,
               fill=side_color, stroke_width=outline_w, stroke_fill=outline_color)
    face = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    fd = ImageDraw.Draw(face)
    fd.text((pad - bb[0], pad - bb[1]), text, font=f, fill=front_color,
            stroke_width=outline_w, stroke_fill=outline_color)
    canvas.alpha_composite(face)
    grad = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    for y in range(canvas.size[1]):
        a = int(120 * (1 - y / canvas.size[1]))
        gd.line([(0, y), (canvas.size[0], y)], fill=(255, 255, 255, a))
    mask = Image.new("L", canvas.size, 0)
    md = ImageDraw.Draw(mask)
    md.text((pad - bb[0], pad - bb[1]), text, font=f, fill=255, stroke_width=outline_w)
    grad.putalpha(ImageChops.multiply(grad.split()[-1], mask))
    canvas.alpha_composite(grad)
    if glow:
        gl = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        gld = ImageDraw.Draw(gl)
        gld.text((pad - bb[0], pad - bb[1]), text, font=f, fill=(255, 180, 200),
                 stroke_width=outline_w + 12)
        gl = gl.filter(ImageFilter.GaussianBlur(8))
        out = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        out.alpha_composite(gl)
        out.alpha_composite(canvas)
        canvas = out
    return canvas


# ============= HERO BLOCK (capa de campanha) =============
def render_hero_block(W, H, headline_top="MÊS DAS", headline_main="mães",
                      cta_value="50%", cta_label="DE DESCONTO",
                      cta_topline="Toda loja com até",
                      include_terms=True, include_period=True,
                      period_lines=("Sorteio para as compras efetuadas",
                                    "do dia 01/05 ao dia 09/05"),
                      front_main=(255, 110, 145), side_main=(170, 30, 70),
                      bg_top=(253, 220, 220), bg_bot=(250, 165, 168)):
    """Hero artwork campanha-completo: mascote | lettering+logo | CTA + rodape."""
    canvas = bg_canvas(W, H, bg_top=bg_top, bg_bot=bg_bot, density=int(W * H / 70))
    PAD = max(20, int(W * 0.02))
    MASCOTE_W = int(W * 0.22)
    CTA_W = int(W * 0.26)
    CENTER_X0 = MASCOTE_W + PAD
    CENTER_X1 = W - CTA_W - PAD
    CENTER_W = CENTER_X1 - CENTER_X0
    CENTER_CX = (CENTER_X0 + CENTER_X1) // 2
    FOOTER_H = int(H * 0.10) if include_period else 0

    # mascote
    mascote = AL.load_mascote(target_h=int(H * 0.92))
    if mascote.size[0] > MASCOTE_W:
        r = MASCOTE_W / mascote.size[0]
        mascote = mascote.resize((MASCOTE_W, int(mascote.size[1] * r)), Image.LANCZOS)
    mx = (MASCOTE_W - mascote.size[0]) // 2
    my = max(0, (H - FOOTER_H - mascote.size[1]) // 2)
    canvas.alpha_composite(mascote, (mx, my))

    # lettering top
    top_size = max(20, int(H * 0.13))
    mes_das = render_3d_text(headline_top, LATO_BLACK, top_size,
                             front_color=(255, 90, 130), side_color=(180, 40, 80),
                             depth=8, outline_w=4)
    if mes_das.size[0] > CENTER_W * 0.85:
        r = (CENTER_W * 0.85) / mes_das.size[0]
        mes_das = mes_das.resize((int(mes_das.size[0] * r), int(mes_das.size[1] * r)), Image.LANCZOS)

    # v2 (T2.2): tenta carregar lettering pré-renderizado primeiro (ex.: "mães" com til-coração)
    # target_h ajustado: 0.42 não 0.55 — o asset tem halo extra que ocupa altura visual
    main_target_h = max(100, int(H * 0.42))
    main = AL.load_lettering(headline_main, target_h=main_target_h)
    if main is None:
        # Fallback: render programático com Lato Black (palavras sem asset)
        main_size = max(48, int(H * 0.40))
        main = render_3d_text(headline_main, LATO_BLACK, main_size,
                              front_color=front_main, side_color=side_main,
                              depth=18, outline_w=10)
    if main.size[0] > CENTER_W * 0.95:
        r = (CENTER_W * 0.95) / main.size[0]
        main = main.resize((int(main.size[0] * r), int(main.size[1] * r)), Image.LANCZOS)

    logo_h = max(30, int(H * 0.16))
    logo = AL.load_logo("dark", target_h=logo_h)
    if logo.size[0] > CENTER_W * 0.55:
        r = (CENTER_W * 0.55) / logo.size[0]
        logo = logo.resize((int(logo.size[0] * r), int(logo.size[1] * r)), Image.LANCZOS)

    block_h = mes_das.size[1] + main.size[1] + logo.size[1] + 30
    block_top = max(10, (H - FOOTER_H - block_h) // 2)
    canvas.alpha_composite(mes_das, (CENTER_CX - mes_das.size[0] // 2, block_top))
    main_y = block_top + mes_das.size[1] - 8
    canvas.alpha_composite(main, (CENTER_CX - main.size[0] // 2, main_y))
    logo_y = main_y + main.size[1] - 8
    canvas.alpha_composite(logo, (CENTER_CX - logo.size[0] // 2, logo_y))

    # CTA direita
    d = ImageDraw.Draw(canvas)
    cta_x = CENTER_X1 + PAD
    cta_top = int(H * 0.10)
    d.text((cta_x, cta_top), cta_topline, font=font(max(16, int(H * 0.055)), "bold"),
           fill=(255, 255, 255))
    d.text((cta_x, cta_top + int(H * 0.06)), cta_value, font=font(max(40, int(H * 0.26)), "black"),
           fill=(255, 255, 255))
    d.text((cta_x, cta_top + int(H * 0.34)), cta_label, font=font(max(16, int(H * 0.065)), "black"),
           fill=(255, 255, 255))
    if include_terms:
        terms = ["Parcelamento facilitado", "Em 16X no carnê da loja",
                 "Ou 1+9x sem juros nos cartões", "Entrega e montagem grátis"]
        for i, t in enumerate(terms):
            d.text((cta_x, cta_top + int(H * 0.45) + i * int(H * 0.055)), t,
                   font=font(max(12, int(H * 0.035)), "bold"), fill=(255, 255, 255))

    # rodape periodo
    if include_period:
        foot_top = H - FOOTER_H
        layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        ld.rectangle((0, foot_top, W, H), fill=(180, 35, 75, 200))
        canvas.alpha_composite(layer)
        f_per = font(max(14, int(FOOTER_H * 0.36)), "bold")
        n = len(period_lines)
        line_h = int(FOOTER_H * 0.42)
        base_y = foot_top + (FOOTER_H - line_h * n) // 2
        for i, line in enumerate(period_lines):
            bb = d.textbbox((0, 0), line, font=f_per)
            d.text((W // 2 - (bb[2] - bb[0]) // 2 - bb[0], base_y + i * line_h - bb[1]),
                   line, font=f_per, fill=(255, 255, 255))

    return canvas


# ============= PRODUTO =============
def _photo_recortada(produto, max_w, max_h):
    img_path = baixar_imagem(produto)
    if not img_path:
        return None
    photo = Image.open(img_path).convert("RGB")
    photo_t = remove_white_bg(photo, threshold=235, feather=1)
    photo_t.thumbnail((max_w, max_h))
    return photo_t


def render_produto(produto, valor_avista, valor_promo, parcelas, fmt,
                   headline_top="MÊS DAS", headline_main="mães"):
    """fmt em {ig, story, wa, tv}."""
    sizes = {"ig": (1080, 1080), "story": (1080, 1920),
             "wa": (1080, 1920), "tv": (1920, 1080)}
    W, H = sizes[fmt]

    if fmt == "tv":
        return _render_tv(produto, valor_avista, valor_promo, parcelas, W, H,
                          headline_top, headline_main)

    # Vertical/quadrado: hero strip no topo + produto + preço
    canvas = bg_canvas(W, H)
    d = ImageDraw.Draw(canvas)

    # ---- HEADER STRIP com lettering 3D ----
    if fmt == "ig":
        header_h = int(H * 0.30)
        photo_zone = (int(H * 0.30), int(H * 0.62))
    else:  # story / wa
        header_h = int(H * 0.22)
        photo_zone = (int(H * 0.23), int(H * 0.55))

    # mes das
    top_size = int(header_h * 0.32)
    mes_das = render_3d_text(headline_top, LATO_BLACK, top_size,
                             front_color=(255, 90, 130), side_color=(180, 40, 80),
                             depth=6, outline_w=3)
    max_w = int(W * 0.55)
    if mes_das.size[0] > max_w:
        r = max_w / mes_das.size[0]
        mes_das = mes_das.resize((int(mes_das.size[0] * r), int(mes_das.size[1] * r)), Image.LANCZOS)
    # maes
    main_size = int(header_h * 0.65)
    main = render_3d_text(headline_main, LATO_BLACK, main_size,
                          front_color=(255, 110, 145), side_color=(170, 30, 70),
                          depth=12, outline_w=7)
    if main.size[0] > W * 0.55:
        r = (W * 0.55) / main.size[0]
        main = main.resize((int(main.size[0] * r), int(main.size[1] * r)), Image.LANCZOS)

    # mascote pequeno na esquerda do header
    mascote_h = int(header_h * 0.95)
    mascote = AL.load_mascote(target_h=mascote_h)
    max_mw = int(W * 0.25)
    if mascote.size[0] > max_mw:
        r = max_mw / mascote.size[0]
        mascote = mascote.resize((max_mw, int(mascote.size[1] * r)), Image.LANCZOS)
    canvas.alpha_composite(mascote, (10, max(0, (header_h - mascote.size[1]) // 2)))

    # logo dark posicionado no rodape (nao concorre com lettering)
    logo_h = int(H * 0.05)
    logo = AL.load_logo("dark", target_h=logo_h)
    if logo.size[0] > W * 0.32:
        r = (W * 0.32) / logo.size[0]
        logo = logo.resize((int(logo.size[0] * r), int(logo.size[1] * r)), Image.LANCZOS)
    # guardar logo para colar depois (apos os textos)
    _logo_to_paste = (logo, ((W - logo.size[0]) // 2, int(H * 0.965 - logo.size[1])))

    # lettering: "MES DAS" no topo + "maes" gigante. centralizado horizontalmente,
    # mascote sobreposto na esquerda mas com lettering tomando toda largura visualmente
    canvas.alpha_composite(mes_das, ((W - mes_das.size[0]) // 2, int(H * 0.018)))
    main_y = int(H * 0.018) + mes_das.size[1] - 8
    canvas.alpha_composite(main, ((W - main.size[0]) // 2, main_y))

    # ---- FOTO RECORTADA ----
    pz_top, pz_bot = photo_zone
    pz_h = pz_bot - pz_top
    photo = _photo_recortada(produto, int(W * 0.75), pz_h)
    if photo:
        canvas.alpha_composite(photo, ((W - photo.size[0]) // 2,
                                       pz_top + (pz_h - photo.size[1]) // 2))

    # ---- NOME + PRECO ----
    nome = produto.get("NOME", "")
    f_nome = font(int(W * 0.038), "black")
    words = nome.split()
    lines, cur = [], ""
    for w in words:
        cand = (cur + " " + w).strip()
        if d.textlength(cand, font=f_nome) <= W * 0.92:
            cur = cand
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    ny = pz_bot + 20
    for line in lines[:2]:
        bb = d.textbbox((0, 0), line, font=f_nome)
        tx = (W - (bb[2] - bb[0])) // 2
        d.text((tx + 2, ny + 2), line, font=f_nome, fill=(150, 25, 50))
        d.text((tx, ny), line, font=f_nome, fill=(255, 255, 255))
        ny += (bb[3] - bb[1]) + 4

    # codigo
    cod = f"(Cód. {produto.get('CODIGO', '')})"
    f_cod = font(int(W * 0.018), "regular")
    bb = d.textbbox((0, 0), cod, font=f_cod)
    d.text(((W - (bb[2] - bb[0])) // 2, ny + 4), cod, font=f_cod, fill=(255, 255, 255, 220))
    ny += int(W * 0.030)

    # de (riscado)
    de_text = f"DE: {fmt_money(valor_avista)}"
    f_de = font(int(W * 0.022), "bold")
    bb = d.textbbox((0, 0), de_text, font=f_de)
    dx = (W - (bb[2] - bb[0])) // 2
    d.text((dx, ny - bb[1]), de_text, font=f_de, fill=(255, 255, 255, 230))
    de_w = d.textlength(de_text, font=f_de)
    d.line((dx, ny + 18, dx + de_w, ny + 18), fill=(255, 255, 255, 230), width=2)
    ny += int(W * 0.035)

    # POR 1+Nx sem juros
    por = f"POR: 1+{parcelas - 1}X SEM JUROS"
    f_por = font(int(W * 0.028), "black")
    bb = d.textbbox((0, 0), por, font=f_por)
    d.text(((W - (bb[2] - bb[0])) // 2, ny - bb[1]), por, font=f_por, fill=(255, 255, 255))
    ny += int(W * 0.040)

    # selo amarelo
    val_parc = float(valor_promo) / parcelas
    big_int, big_cents = fmt_split(val_parc)
    f_big = font(int(W * 0.085), "black")
    bb = d.textbbox((0, 0), big_int, font=f_big)
    bw, bh = bb[2] - bb[0], bb[3] - bb[1]
    cx, cy = W // 2, ny + bh // 2 + 8
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    ld.ellipse((cx - bw // 2 - 70, cy - bh // 2 - 22,
                cx + bw // 2 + 110, cy + bh // 2 + 22),
               fill=(255, 200, 50, 240))
    canvas.alpha_composite(layer)
    d.text((cx - bw // 2, cy - bh // 2 - bb[1]), big_int, font=f_big, fill=(220, 38, 51))
    d.text((cx + bw // 2 + 4, cy - bh // 8), big_cents,
           font=font(int(W * 0.040), "black"), fill=(220, 38, 51))
    ny += int(W * 0.110)

    # à vista
    avt = f"OU À VISTA: {fmt_money(valor_promo)}"
    f_av = font(int(W * 0.022), "bold")
    bb = d.textbbox((0, 0), avt, font=f_av)
    d.text(((W - (bb[2] - bb[0])) // 2, ny - bb[1]), avt, font=f_av, fill=(255, 255, 255))

    # cola logo no rodape
    canvas.alpha_composite(_logo_to_paste[0], _logo_to_paste[1])

    return canvas.convert("RGB")


def _render_tv(produto, valor_avista, valor_promo, parcelas, W, H,
               headline_top, headline_main):
    """TV horizontal 1920x1080 com 3 zonas: hero esquerda | foto centro | preco direita."""
    canvas = bg_canvas(W, H)
    d = ImageDraw.Draw(canvas)

    # ZONAS: 35% hero | 30% foto | 35% info
    PAD = 24
    Z1_W = int(W * 0.35)  # zona hero (mascote+lettering)
    Z2_W = int(W * 0.30)  # zona foto
    Z3_W = int(W * 0.35)  # zona info+preco
    Z1_X0, Z1_X1 = 0, Z1_W
    Z2_X0, Z2_X1 = Z1_X1, Z1_X1 + Z2_W
    Z3_X0, Z3_X1 = Z2_X1, Z2_X1 + Z3_W

    # ----- ZONA 1: mascote (esq) + lettering (centro-zona1) -----
    mh = int(H * 0.78)
    mascote = AL.load_mascote(target_h=mh)
    max_mw = int(Z1_W * 0.42)
    if mascote.size[0] > max_mw:
        r = max_mw / mascote.size[0]
        mascote = mascote.resize((max_mw, int(mascote.size[1] * r)), Image.LANCZOS)
    canvas.alpha_composite(mascote, (10, (H - mascote.size[1]) // 2))

    let_x = mascote.size[0] + 20
    let_w = Z1_X1 - let_x - 10
    top_size = int(H * 0.10)
    mes_das = render_3d_text(headline_top, LATO_BLACK, top_size,
                             front_color=(255, 90, 130), side_color=(180, 40, 80),
                             depth=5, outline_w=3)
    if mes_das.size[0] > let_w:
        r = let_w / mes_das.size[0]
        mes_das = mes_das.resize((int(mes_das.size[0]*r), int(mes_das.size[1]*r)), Image.LANCZOS)
    main_size = int(H * 0.26)
    main = render_3d_text(headline_main, LATO_BLACK, main_size,
                          front_color=(255, 110, 145), side_color=(170, 30, 70),
                          depth=10, outline_w=6)
    if main.size[0] > let_w:
        r = let_w / main.size[0]
        main = main.resize((int(main.size[0]*r), int(main.size[1]*r)), Image.LANCZOS)
    let_block_h = mes_das.size[1] + main.size[1]
    let_cy = (H - let_block_h) // 2
    let_cx = let_x + let_w // 2
    canvas.alpha_composite(mes_das, (let_cx - mes_das.size[0]//2, let_cy))
    canvas.alpha_composite(main, (let_cx - main.size[0]//2, let_cy + mes_das.size[1] - 5))

    # ----- ZONA 2: foto recortada -----
    photo_max_h = int(H * 0.78)
    photo_max_w = Z2_W - 2 * PAD
    photo = _photo_recortada(produto, photo_max_w, photo_max_h)
    if photo:
        px = Z2_X0 + (Z2_W - photo.size[0]) // 2
        py = (H - photo.size[1]) // 2
        canvas.alpha_composite(photo, (px, py))

    # ----- ZONA 3: info -----
    info_x = Z3_X0 + PAD
    info_w = Z3_W - 2 * PAD

    # nome (preto + sombra clara)
    nome = produto.get("NOME", "")
    f_nome = font(int(H * 0.040), "black")
    words = nome.split()
    lines, cur = [], ""
    for w in words:
        cand = (cur + " " + w).strip()
        if d.textlength(cand, font=f_nome) <= info_w:
            cur = cand
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    cur_y = int(H * 0.14)
    for line in lines[:3]:
        bb = d.textbbox((0, 0), line, font=f_nome)
        d.text((info_x + 2, cur_y + 2), line, font=f_nome, fill=(150, 25, 50))
        d.text((info_x, cur_y), line, font=f_nome, fill=(255, 255, 255))
        cur_y += (bb[3] - bb[1]) + 6

    cur_y += 4
    d.text((info_x, cur_y), f"(Cód. {produto.get('CODIGO','')})",
           font=font(int(H * 0.022), "bold"), fill=(255, 255, 255, 220))
    cur_y += int(H * 0.04)

    de_text = f"DE: {fmt_money(valor_avista)}"
    f_de = font(int(H * 0.030), "bold")
    d.text((info_x, cur_y), de_text, font=f_de, fill=(255, 255, 255))
    de_w = d.textlength(de_text, font=f_de)
    d.line((info_x, cur_y + 22, info_x + de_w, cur_y + 22), fill=(255, 255, 255), width=3)
    cur_y += int(H * 0.045)

    d.text((info_x, cur_y), f"POR: 1+{parcelas - 1}X SEM JUROS",
           font=font(int(H * 0.034), "black"), fill=(255, 255, 255))
    cur_y += int(H * 0.045)

    val_parc = float(valor_promo) / parcelas
    big_int, big_cents = fmt_split(val_parc)
    f_big = font(int(H * 0.10), "black")
    bb = d.textbbox((0, 0), big_int, font=f_big)
    bw, bh = bb[2] - bb[0], bb[3] - bb[1]
    f_cents = font(int(H * 0.05), "black")
    bb_c = d.textbbox((0, 0), big_cents, font=f_cents)
    cw = bb_c[2] - bb_c[0]
    # selo amarelo encaixado dentro de info_w
    selo_x0 = info_x - 12
    selo_x1 = min(Z3_X1 - PAD, info_x + bw + cw + 30)
    selo_y0 = cur_y - 14
    selo_y1 = cur_y + bh + 22
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    ld.ellipse((selo_x0, selo_y0, selo_x1, selo_y1), fill=(255, 200, 50, 240))
    canvas.alpha_composite(layer)
    d.text((info_x, cur_y - bb[1]), big_int, font=f_big, fill=(220, 38, 51))
    d.text((info_x + bw + 6, cur_y + 36), big_cents, font=f_cents, fill=(220, 38, 51))
    cur_y += int(H * 0.13)

    d.text((info_x, cur_y), f"OU À VISTA: {fmt_money(valor_promo)}",
           font=font(int(H * 0.028), "bold"), fill=(255, 255, 255))

    return canvas.convert("RGB")



def render_card_compact(produto, valor_avista, valor_promo, parcelas, size=(700, 900)):
    W, H = size
    img = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    d = ImageDraw.Draw(img)
    try:
        d.rounded_rectangle((0, 0, W - 1, H - 1), radius=18, outline=(220, 220, 220), width=2)
    except AttributeError:
        d.rectangle((0, 0, W - 1, H - 1), outline=(220, 220, 220), width=2)

    pad = max(15, int(min(W, H) * 0.025))
    photo_h = int(H * 0.55)
    img_path = baixar_imagem(produto)
    if img_path:
        photo = Image.open(img_path).convert("RGB")
        photo.thumbnail((W - 2 * pad, photo_h - 10))
        img.paste(photo, ((W - photo.size[0]) // 2, pad + (photo_h - photo.size[1]) // 2))

    # v2 (T2.3): badge "Nx SEM JUROS" como ESTRELA 12-pontas
    bw_badge = max(70, int(W * 0.20))  # ligeiramente maior pra acomodar estrela
    r_out = bw_badge // 2
    cx = pad + r_out
    cy = pad + r_out

    # Sombra suave atrás da estrela
    shadow_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow_layer)
    shadow_verts = star_polygon_points(cx + 2, cy + 3, r_out, int(r_out * 0.72), points=12)
    sd.polygon(shadow_verts, fill=(0, 0, 0, 60))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(2))
    img.alpha_composite(shadow_layer)

    # Estrela amarela com borda dourada escura
    star_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sld = ImageDraw.Draw(star_layer)
    draw_star_seal(sld, cx, cy, r_out, points=12,
                   fill=(245, 200, 75), outline=(184, 134, 11), outline_w=3)
    img.alpha_composite(star_layer)

    # Texto centralizado na estrela: "Nx" grande + "SEM JUROS" pequeno
    f_b1 = font(max(14, int(bw_badge * 0.26)), "black")
    f_b2 = font(max(8, int(bw_badge * 0.13)), "black")
    nx_txt = f"{parcelas}x"
    bb1 = d.textbbox((0, 0), nx_txt, font=f_b1)
    bb2 = d.textbbox((0, 0), "SEM JUROS", font=f_b2)
    nx_w = bb1[2] - bb1[0]
    nx_h = bb1[3] - bb1[1]
    sj_w = bb2[2] - bb2[0]
    sj_h = bb2[3] - bb2[1]
    total_h = nx_h + sj_h + 2
    nx_y = cy - total_h // 2 - bb1[1]
    sj_y = nx_y + nx_h - bb1[1] + 2 - bb2[1]
    d.text((cx - nx_w // 2 - bb1[0], nx_y), nx_txt, font=f_b1, fill=(0, 0, 0))
    d.text((cx - sj_w // 2 - bb2[0], sj_y), "SEM JUROS", font=f_b2, fill=(0, 0, 0))

    # nome
    nome = produto.get("NOME", "")
    nome_font = font(max(14, int(W * 0.028)), "black")
    words = nome.split()
    lines, cur = [], ""
    for w in words:
        c = (cur + " " + w).strip()
        if d.textlength(c, font=nome_font) <= W - 2 * pad:
            cur = c
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    ny = pad + photo_h + 8
    for line in lines[:2]:
        bb = d.textbbox((0, 0), line, font=nome_font)
        d.text(((W - (bb[2] - bb[0])) // 2, ny - bb[1]), line, font=nome_font, fill=(220, 38, 51))
        ny += (bb[3] - bb[1]) + 2

    cod = f"(Cód. {produto.get('CODIGO', '')})"
    f_cod = font(max(10, int(W * 0.017)), "regular")
    bb = d.textbbox((0, 0), cod, font=f_cod)
    d.text(((W - (bb[2] - bb[0])) // 2, ny + 2), cod, font=f_cod, fill=(140, 140, 140))
    ny += max(20, int(W * 0.035))

    de = f"DE: {fmt_money(valor_avista)}"
    f_de = font(max(11, int(W * 0.020)), "bold")
    bb = d.textbbox((0, 0), de, font=f_de)
    dx = (W - (bb[2] - bb[0])) // 2
    d.text((dx, ny - bb[1]), de, font=f_de, fill=(0, 80, 200))
    de_w = d.textlength(de, font=f_de)
    d.line((dx, ny + 12, dx + de_w, ny + 12), fill=(0, 80, 200), width=2)
    ny += max(22, int(W * 0.040))

    por = f"POR: 1+{parcelas - 1}X SEM JUROS"
    f_por = font(max(13, int(W * 0.024)), "black")
    bb = d.textbbox((0, 0), por, font=f_por)
    d.text(((W - (bb[2] - bb[0])) // 2, ny - bb[1]), por, font=f_por, fill=(220, 38, 51))
    ny += max(22, int(W * 0.040))

    val_parc = float(valor_promo) / parcelas
    big_int, big_cents = fmt_split(val_parc)
    f_big = font(max(34, int(W * 0.075)), "black")
    bb = d.textbbox((0, 0), big_int, font=f_big)
    bw_, bh_ = bb[2] - bb[0], bb[3] - bb[1]
    cx_text = W // 2 - bw_ // 2 - 8
    d.text((cx_text, ny - bb[1]), big_int, font=f_big, fill=(220, 38, 51))
    d.text((cx_text + bw_ + 4, ny + 14), big_cents, font=font(max(16, int(W * 0.034)), "black"),
           fill=(220, 38, 51))
    ny += max(50, int(W * 0.085))

    av = f"OU À VISTA: {fmt_money(valor_promo)}"
    f_av = font(max(11, int(W * 0.018)), "bold")
    bb = d.textbbox((0, 0), av, font=f_av)
    d.text(((W - (bb[2] - bb[0])) // 2, ny - bb[1]), av, font=f_av, fill=(40, 40, 40))

    return img


# ============= CATALOGO COM CAPA HERO =============
def render_catalog_pages(produtos_promo, page_size=(2200, 2540), cols=4, rows=3,
                         headline_top="MÊS DAS", headline_main="mães",
                         titulo_strip="MÊS DAS MÃES", subtitulo_strip="LOJAS MSC",
                         footer_text="LOJAS MSC  |  TODA LOJA EM ATÉ 10X SEM JUROS",
                         bg_top=(253, 220, 220), bg_bot=(250, 165, 168),
                         hero_front=(255, 110, 145), hero_side=(170, 30, 70)):
    """Catálogo: pág 1 = hero+grade, pág 2+ = grade. Aceita paleta da campanha."""
    pages = []
    W, H = page_size

    per_page = cols * rows
    n = len(produtos_promo)
    n_grid_pages = max(1, math.ceil(n / per_page))

    for p_idx in range(n_grid_pages):
        chunk = produtos_promo[p_idx * per_page: (p_idx + 1) * per_page]
        canvas = bg_canvas(W, H, bg_top=bg_top, bg_bot=bg_bot, density=70000)
        d = ImageDraw.Draw(canvas)

        # Footer strip "LOJAS MSC | ATÉ 10X" — usado em todas as páginas.
        ft = int(H * 0.04)

        if p_idx == 0:
            # ============ PÁGINA 1 — CAPA com HERO + grade 2×6 ============
            # Hero ocupa ~40% do topo (anjo + 3D headline + selo 50% + sorteio).
            hero_h = int(H * 0.42)
            hero = render_hero_block(
                W, hero_h,
                headline_top=headline_top, headline_main=headline_main,
                include_terms=True, include_period=True,
                front_main=hero_front, side_main=hero_side,
                bg_top=bg_top, bg_bot=bg_bot,
            )
            canvas.alpha_composite(hero, (0, 0))

            # Grade 2 fileiras × 6 colunas embaixo do hero (igual à referência MSC).
            p1_cols, p1_rows = 6, 2
            margin_x = max(20, int(W * 0.018))
            margin_top = hero_h + 24
            margin_bot = ft + 24
            grid_w = W - 2 * margin_x
            grid_h = H - margin_top - margin_bot
            gap = 14
            cell_w = (grid_w - (p1_cols - 1) * gap) // p1_cols
            cell_h = (grid_h - (p1_rows - 1) * gap) // p1_rows

            for i, item in enumerate(chunk[: p1_cols * p1_rows]):
                row = i // p1_cols
                col = i % p1_cols
                x = margin_x + col * (cell_w + gap)
                y = margin_top + row * (cell_h + gap)
                card = render_card_compact(
                    item["produto"], item["valor_avista"], item["valor_promo"],
                    item.get("parcelas", 10), size=(cell_w, cell_h),
                )
                canvas.paste(card, (x, y), card)
        else:
            # ============ PÁGINAS 2+ — header pequeno + grade cols×rows ============
            header_h = int(H * 0.07)
            d.rectangle((0, 0, W, header_h), fill=(220, 38, 51))
            ts = max(28, int(W * 0.030))
            ss = max(14, int(ts * 0.42))
            bb = d.textbbox((0, 0), titulo_strip, font=font(ts, "black"))
            d.text((W // 2 - (bb[2] - bb[0]) // 2 - bb[0], int(header_h * 0.18) - bb[1]),
                   titulo_strip, font=font(ts, "black"), fill=(255, 200, 50))
            bb2 = d.textbbox((0, 0), subtitulo_strip, font=font(ss, "black"))
            d.text((W // 2 - (bb2[2] - bb2[0]) // 2 - bb2[0],
                    int(header_h * 0.18) + (bb[3] - bb[1]) + 4 - bb2[1]),
                   subtitulo_strip, font=font(ss, "black"), fill=(255, 255, 255))

            logo = AL.load_logo("white", target_h=int(header_h * 0.6))
            if logo.size[0] > 10:
                canvas.alpha_composite(logo, (W - logo.size[0] - 30,
                                              (header_h - logo.size[1]) // 2))

            margin_x = max(20, int(W * 0.018))
            margin_top = header_h + 30
            margin_bot = int(H * 0.05)
            grid_w = W - 2 * margin_x
            grid_h = H - margin_top - margin_bot
            gap = 18
            cell_w = (grid_w - (cols - 1) * gap) // cols
            cell_h = (grid_h - (rows - 1) * gap) // rows

            for i, item in enumerate(chunk):
                row = i // cols
                col = i % cols
                x = margin_x + col * (cell_w + gap)
                y = margin_top + row * (cell_h + gap)
                card = render_card_compact(
                    item["produto"], item["valor_avista"], item["valor_promo"],
                    item.get("parcelas", 10), size=(cell_w, cell_h),
                )
                canvas.paste(card, (x, y), card)

        # ===== Footer comum a todas as páginas =====
        d.rectangle((0, H - ft, W, H), fill=(167, 25, 35))
        f_foot = font(max(14, int(ft * 0.45)), "bold")
        bb = d.textbbox((0, 0), footer_text, font=f_foot)
        d.text((W // 2 - (bb[2] - bb[0]) // 2 - bb[0],
                H - ft + (ft - (bb[3] - bb[1])) // 2 - bb[1]),
               footer_text, font=f_foot, fill=(255, 255, 255))
        pn = f"página {p_idx + 1} de {n_grid_pages}"
        d.text((W - 240, H - ft + 10), pn, font=font(max(10, int(ft * 0.36)), "regular"),
               fill=(255, 255, 255, 200))

        pages.append(canvas.convert("RGB"))
    return pages


def save_pdf_from_pages(pages, pdf_path):
    if not pages:
        return
    pages[0].save(pdf_path, format="PDF", save_all=True, append_images=pages[1:])
    return pdf_path
