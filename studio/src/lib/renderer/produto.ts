/**
 * Render de uma peca de produto (IG, Story, WhatsApp, TV).
 */
import { Image as CanvasImage } from "@napi-rs/canvas";
import sharp from "sharp";
import {
  newCanvas,
  fontSpec,
  ensureFonts,
  fmtMoney,
  fmtMoneySplit,
  measureText,
  wrapText,
  rgba,
  removeWhiteBg,
  canvasToBuffer,
} from "./canvas-utils";
import { makeHeartsBg } from "./hearts";
import { render3DText } from "./text3d";
import { loadCleanAsset } from "./assets-loader";
import { baixarImagem, type TerasoftProduto } from "@/lib/terasoft";

export type Formato = "ig" | "story" | "wa" | "tv";

const SIZES: Record<Formato, [number, number]> = {
  ig: [1080, 1080],
  story: [1080, 1920],
  wa: [1080, 1920],
  tv: [1920, 1080],
};

interface RenderProdutoOpts {
  produto: TerasoftProduto;
  valorAvista: number;
  valorPromo: number;
  parcelas: number;
  fmt: Formato;
  headlineTop?: string;
  headlineMain?: string;
}

async function loadProductPhoto(produto: TerasoftProduto): Promise<Buffer | null> {
  const path = await baixarImagem(produto);
  if (!path) return null;
  return removeWhiteBg(path, 235);
}

async function pngToCanvasImage(buf: Buffer) {
  const img = new CanvasImage();
  img.src = buf;
  const meta = await sharp(buf).metadata();
  return { img, width: meta.width!, height: meta.height! };
}

export async function renderProduto(opts: RenderProdutoOpts): Promise<Buffer> {
  ensureFonts();
  const { produto, valorAvista, valorPromo, parcelas, fmt } = opts;
  const headlineTop = opts.headlineTop ?? "MÊS DAS";
  const headlineMain = opts.headlineMain ?? "mães";

  const [W, H] = SIZES[fmt];

  if (fmt === "tv") {
    return renderTV(opts, W, H, headlineTop, headlineMain);
  }
  return renderVerticalOrSquare(opts, W, H, headlineTop, headlineMain);
}

async function renderVerticalOrSquare(
  opts: RenderProdutoOpts,
  W: number,
  H: number,
  headlineTop: string,
  headlineMain: string,
): Promise<Buffer> {
  const { produto, valorAvista, valorPromo, parcelas, fmt } = opts;
  // fundo + coracoes
  const bg = makeHeartsBg({ width: W, height: H });
  const { canvas, ctx } = newCanvas(W, H);
  ctx.drawImage(bg, 0, 0);

  // ---- header: lettering 3D + mascote ----
  const photoTop = fmt === "ig" ? Math.round(H * 0.30) : Math.round(H * 0.23);
  const photoBot = fmt === "ig" ? Math.round(H * 0.62) : Math.round(H * 0.55);
  const headerSize = photoTop;

  // mascote canto superior esquerdo
  const mascoteAsset = await loadCleanAsset("mascote");
  if (mascoteAsset) {
    const mh = Math.round(headerSize * 0.95);
    const resized = await sharp(mascoteAsset).resize({ height: mh }).png().toBuffer();
    const meta = await sharp(resized).metadata();
    const maxMW = Math.round(W * 0.25);
    let mascotImg = resized;
    let mw = meta.width ?? 0;
    let mhh = meta.height ?? mh;
    if (mw > maxMW) {
      mascotImg = await sharp(resized).resize({ width: maxMW }).png().toBuffer();
      const m2 = await sharp(mascotImg).metadata();
      mw = m2.width ?? maxMW;
      mhh = m2.height ?? mh;
    }
    const ci = new CanvasImage();
    ci.src = mascotImg;
    ctx.drawImage(ci, 10, Math.max(0, Math.round((headerSize - mhh) / 2)));
  }

  // lettering 3D MES DAS / maes
  const topSize = Math.round(headerSize * 0.32);
  const mainSize = Math.round(headerSize * 0.65);

  const mesDasBuf = await render3DText({
    text: headlineTop,
    fontSize: topSize,
    weight: "black",
    frontColor: [255, 90, 130],
    sideColor: [180, 40, 80],
    depth: 6,
    outlineWidth: 3,
    glow: true,
  });
  const mesMeta = await sharp(mesDasBuf).metadata();
  let mesFinal = mesDasBuf;
  let mesW = mesMeta.width ?? 1;
  let mesH = mesMeta.height ?? 1;
  if (mesW > W * 0.55) {
    const r = (W * 0.55) / mesW;
    mesFinal = await sharp(mesDasBuf)
      .resize({ width: Math.round(mesW * r) })
      .png()
      .toBuffer();
    const m2 = await sharp(mesFinal).metadata();
    mesW = m2.width ?? mesW;
    mesH = m2.height ?? mesH;
  }
  const mesImg = new CanvasImage();
  mesImg.src = mesFinal;
  ctx.drawImage(mesImg, Math.round((W - mesW) / 2), Math.round(H * 0.018));

  const maesBuf = await render3DText({
    text: headlineMain,
    fontSize: mainSize,
    weight: "black",
    frontColor: [255, 110, 145],
    sideColor: [170, 30, 70],
    depth: 12,
    outlineWidth: 7,
    glow: true,
  });
  const maesMeta = await sharp(maesBuf).metadata();
  let maesFinal = maesBuf;
  let maesW = maesMeta.width ?? 1;
  let maesH = maesMeta.height ?? 1;
  if (maesW > W * 0.55) {
    const r = (W * 0.55) / maesW;
    maesFinal = await sharp(maesBuf)
      .resize({ width: Math.round(maesW * r) })
      .png()
      .toBuffer();
    const m2 = await sharp(maesFinal).metadata();
    maesW = m2.width ?? maesW;
    maesH = m2.height ?? maesH;
  }
  const maesImg = new CanvasImage();
  maesImg.src = maesFinal;
  const maesY = Math.round(H * 0.018) + mesH - 8;
  ctx.drawImage(maesImg, Math.round((W - maesW) / 2), maesY);

  // ---- foto recortada do produto ----
  const photoBuf = await loadProductPhoto(produto);
  if (photoBuf) {
    const targetW = Math.round(W * 0.75);
    const targetH = photoBot - photoTop;
    const resized = await sharp(photoBuf)
      .resize({ width: targetW, height: targetH, fit: "inside" })
      .png()
      .toBuffer();
    const meta = await sharp(resized).metadata();
    const pw = meta.width ?? 1;
    const ph = meta.height ?? 1;
    const pi = new CanvasImage();
    pi.src = resized;
    ctx.drawImage(pi, Math.round((W - pw) / 2), photoTop + Math.round((targetH - ph) / 2));
  }

  // ---- nome ----
  const nome = produto.NOME ?? "";
  ctx.font = fontSpec("black", Math.round(W * 0.038));
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";
  const lines = wrapText(ctx, nome, W * 0.92, 2);
  let ny = photoBot + 30;
  for (const ln of lines) {
    const tm = measureText(ctx, ln);
    // sombra suave
    ctx.fillStyle = "rgba(150,25,50,1)";
    ctx.fillText(ln, W / 2 + 2, ny + 2);
    ctx.fillStyle = "white";
    ctx.fillText(ln, W / 2, ny);
    ny += tm.h + 6;
  }

  // ---- codigo ----
  ctx.font = fontSpec("regular", Math.round(W * 0.018));
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(`(Cód. ${produto.CODIGO})`, W / 2, ny + 4);
  ny += Math.round(W * 0.030);

  // ---- DE: riscado ----
  ctx.font = fontSpec("bold", Math.round(W * 0.022));
  const deText = `DE: ${fmtMoney(valorAvista)}`;
  const deM = measureText(ctx, deText);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText(deText, W / 2, ny);
  // strike
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - deM.w / 2, ny - deM.asc / 2);
  ctx.lineTo(W / 2 + deM.w / 2, ny - deM.asc / 2);
  ctx.stroke();
  ny += Math.round(W * 0.035);

  // ---- POR ----
  ctx.font = fontSpec("black", Math.round(W * 0.028));
  const por = `POR: 1+${parcelas - 1}X SEM JUROS`;
  ctx.fillStyle = "white";
  ctx.fillText(por, W / 2, ny);
  ny += Math.round(W * 0.040);

  // ---- selo amarelo + preco ----
  const valParc = valorPromo / parcelas;
  const [bigInt, bigCents] = fmtMoneySplit(valParc);
  ctx.font = fontSpec("black", Math.round(W * 0.085));
  const intM = measureText(ctx, bigInt);
  ctx.font = fontSpec("black", Math.round(W * 0.040));
  const centsM = measureText(ctx, bigCents);

  const seloW = intM.w + centsM.w + 80;
  const seloH = intM.h + 30;
  const cx = W / 2;
  const cy = ny + intM.h / 2 + 10;

  ctx.fillStyle = "rgba(255,200,50,0.94)";
  ctx.beginPath();
  ctx.ellipse(cx, cy, seloW / 2 + 30, seloH / 2 + 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgb(220,38,51)";
  ctx.font = fontSpec("black", Math.round(W * 0.085));
  ctx.textAlign = "left";
  ctx.fillText(bigInt, cx - intM.w / 2 - 6, cy + intM.h / 4);
  ctx.font = fontSpec("black", Math.round(W * 0.040));
  ctx.fillText(bigCents, cx + intM.w / 2 + 4, cy);
  ctx.textAlign = "center";
  ny += Math.round(W * 0.110);

  // à vista
  ctx.font = fontSpec("bold", Math.round(W * 0.022));
  ctx.fillStyle = "white";
  ctx.fillText(`OU À VISTA: ${fmtMoney(valorPromo)}`, W / 2, ny);

  // logo MSC no rodape
  const logoAsset = await loadCleanAsset("logo_dark");
  if (logoAsset) {
    const lh = Math.round(H * 0.05);
    const logoBuf = await sharp(logoAsset).resize({ height: lh }).png().toBuffer();
    const meta = await sharp(logoBuf).metadata();
    const lw = meta.width ?? 1;
    const li = new CanvasImage();
    li.src = logoBuf;
    ctx.drawImage(li, Math.round((W - lw) / 2), Math.round(H * 0.965 - lh));
  }

  return canvasToBuffer(canvas, "jpeg", 92);
}

async function renderTV(
  opts: RenderProdutoOpts,
  W: number,
  H: number,
  headlineTop: string,
  headlineMain: string,
): Promise<Buffer> {
  const { produto, valorAvista, valorPromo, parcelas } = opts;
  const bg = makeHeartsBg({ width: W, height: H });
  const { canvas, ctx } = newCanvas(W, H);
  ctx.drawImage(bg, 0, 0);

  // 3 zonas: 35% hero | 30% foto | 35% info
  const Z1W = Math.round(W * 0.35);
  const Z2W = Math.round(W * 0.30);
  const Z3W = Math.round(W * 0.35);
  const Z1X1 = Z1W;
  const Z2X0 = Z1X1;
  const Z2X1 = Z2X0 + Z2W;
  const Z3X0 = Z2X1;

  // mascote
  const mascoteAsset = await loadCleanAsset("mascote");
  if (mascoteAsset) {
    const mh = Math.round(H * 0.78);
    let mascotBuf = await sharp(mascoteAsset).resize({ height: mh }).png().toBuffer();
    const maxMw = Math.round(Z1W * 0.42);
    let meta = await sharp(mascotBuf).metadata();
    if ((meta.width ?? 0) > maxMw) {
      mascotBuf = await sharp(mascoteAsset).resize({ width: maxMw }).png().toBuffer();
      meta = await sharp(mascotBuf).metadata();
    }
    const ci = new CanvasImage();
    ci.src = mascotBuf;
    const mh2 = meta.height ?? mh;
    ctx.drawImage(ci, 10, Math.round((H - mh2) / 2));
  }

  // lettering centralizado dentro da zona 1
  const letX = (mascoteAsset ? Math.round(W * 0.16) : 0) + 20;
  const letW = Z1X1 - letX - 10;
  const topSize = Math.round(H * 0.10);
  const mainSize = Math.round(H * 0.26);

  const mesDasBuf = await render3DText({
    text: headlineTop,
    fontSize: topSize,
    weight: "black",
    frontColor: [255, 90, 130],
    sideColor: [180, 40, 80],
    depth: 5,
    outlineWidth: 3,
    glow: true,
  });
  let mesFinal = mesDasBuf;
  let mesMeta = await sharp(mesFinal).metadata();
  if ((mesMeta.width ?? 0) > letW) {
    mesFinal = await sharp(mesDasBuf).resize({ width: letW }).png().toBuffer();
    mesMeta = await sharp(mesFinal).metadata();
  }

  const maesBuf = await render3DText({
    text: headlineMain,
    fontSize: mainSize,
    weight: "black",
    frontColor: [255, 110, 145],
    sideColor: [170, 30, 70],
    depth: 10,
    outlineWidth: 6,
    glow: true,
  });
  let maesFinal = maesBuf;
  let maesMeta = await sharp(maesFinal).metadata();
  if ((maesMeta.width ?? 0) > letW) {
    maesFinal = await sharp(maesBuf).resize({ width: letW }).png().toBuffer();
    maesMeta = await sharp(maesFinal).metadata();
  }

  const blockH = (mesMeta.height ?? 0) + (maesMeta.height ?? 0);
  const letCY = Math.round((H - blockH) / 2);
  const letCX = letX + Math.round(letW / 2);

  const mImg = new CanvasImage();
  mImg.src = mesFinal;
  ctx.drawImage(mImg, letCX - Math.round((mesMeta.width ?? 0) / 2), letCY);
  const maImg = new CanvasImage();
  maImg.src = maesFinal;
  ctx.drawImage(
    maImg,
    letCX - Math.round((maesMeta.width ?? 0) / 2),
    letCY + (mesMeta.height ?? 0) - 5,
  );

  // foto recortada
  const photoBuf = await loadProductPhoto(produto);
  if (photoBuf) {
    const photoH = Math.round(H * 0.78);
    const photoW = Z2W - 48;
    const resized = await sharp(photoBuf)
      .resize({ width: photoW, height: photoH, fit: "inside" })
      .png()
      .toBuffer();
    const meta = await sharp(resized).metadata();
    const ci = new CanvasImage();
    ci.src = resized;
    const px = Z2X0 + Math.round((Z2W - (meta.width ?? 1)) / 2);
    const py = Math.round((H - (meta.height ?? 1)) / 2);
    ctx.drawImage(ci, px, py);
  }

  // info direita
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const infoX = Z3X0 + 24;
  const infoW = Z3W - 48;

  ctx.font = fontSpec("black", Math.round(H * 0.040));
  const lines = wrapText(ctx, produto.NOME ?? "", infoW, 3);
  let cy = Math.round(H * 0.18);
  for (const ln of lines) {
    const m = measureText(ctx, ln);
    ctx.fillStyle = "rgba(150,25,50,1)";
    ctx.fillText(ln, infoX + 2, cy + 2);
    ctx.fillStyle = "white";
    ctx.fillText(ln, infoX, cy);
    cy += m.h + 8;
  }
  cy += 4;
  ctx.font = fontSpec("bold", Math.round(H * 0.022));
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(`(Cód. ${produto.CODIGO})`, infoX, cy);
  cy += Math.round(H * 0.04);

  ctx.font = fontSpec("bold", Math.round(H * 0.030));
  const deText = `DE: ${fmtMoney(valorAvista)}`;
  ctx.fillStyle = "white";
  ctx.fillText(deText, infoX, cy);
  const deM = measureText(ctx, deText);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(infoX, cy - deM.asc / 2);
  ctx.lineTo(infoX + deM.w, cy - deM.asc / 2);
  ctx.stroke();
  cy += Math.round(H * 0.045);

  ctx.font = fontSpec("black", Math.round(H * 0.034));
  ctx.fillText(`POR: 1+${parcelas - 1}X SEM JUROS`, infoX, cy);
  cy += Math.round(H * 0.045);

  // selo
  const valParc = valorPromo / parcelas;
  const [bigInt, bigCents] = fmtMoneySplit(valParc);
  ctx.font = fontSpec("black", Math.round(H * 0.10));
  const intM = measureText(ctx, bigInt);
  ctx.font = fontSpec("black", Math.round(H * 0.05));
  const centsM = measureText(ctx, bigCents);

  ctx.fillStyle = "rgba(255,200,50,0.94)";
  ctx.beginPath();
  const seloRX = (intM.w + centsM.w + 90) / 2;
  const seloRY = (intM.h + 30) / 2;
  ctx.ellipse(infoX + seloRX, cy + seloRY - 10, seloRX, seloRY + 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgb(220,38,51)";
  ctx.font = fontSpec("black", Math.round(H * 0.10));
  ctx.fillText(bigInt, infoX, cy + intM.h / 4);
  ctx.font = fontSpec("black", Math.round(H * 0.05));
  ctx.fillText(bigCents, infoX + intM.w + 6, cy);
  cy += Math.round(H * 0.13);

  ctx.font = fontSpec("bold", Math.round(H * 0.028));
  ctx.fillStyle = "white";
  ctx.fillText(`OU À VISTA: ${fmtMoney(valorPromo)}`, infoX, cy);

  return canvasToBuffer(canvas, "jpeg", 92);
}
