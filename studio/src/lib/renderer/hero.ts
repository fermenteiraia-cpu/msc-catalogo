/**
 * Hero artwork da campanha (paisagem 1500x600 default).
 */
import { Image as CanvasImage } from "@napi-rs/canvas";
import sharp from "sharp";
import {
  newCanvas, fontSpec, ensureFonts, canvasToBuffer, measureText, type Color,
} from "./canvas-utils";
import { makeHeartsBg } from "./hearts";
import { render3DText } from "./text3d";
import { loadCleanAsset } from "./assets-loader";

export interface HeroOptions {
  width?: number;
  height?: number;
  headlineTop?: string;
  headlineMain?: string;
  ctaTopline?: string;
  ctaValue?: string;
  ctaLabel?: string;
  terms?: string[];
  periodLines?: string[];
  frontMain?: Color;
  sideMain?: Color;
}

export async function renderHero(opts: HeroOptions = {}): Promise<Buffer> {
  ensureFonts();
  const W = opts.width ?? 1500;
  const H = opts.height ?? 600;
  const headlineTop = opts.headlineTop ?? "MÊS DAS";
  const headlineMain = opts.headlineMain ?? "mães";
  const ctaTopline = opts.ctaTopline ?? "Toda loja com até";
  const ctaValue = opts.ctaValue ?? "50%";
  const ctaLabel = opts.ctaLabel ?? "DE DESCONTO";
  const terms = opts.terms ?? [
    "Parcelamento facilitado",
    "Em 16X no carnê da loja",
    "Ou 1+9x sem juros nos cartões",
    "Entrega e montagem grátis",
  ];
  const periodLines = opts.periodLines ?? [
    "Sorteio para as compras efetuadas",
    "do dia 01/05 ao dia 09/05",
  ];
  const frontMain = opts.frontMain ?? [255, 110, 145];
  const sideMain = opts.sideMain ?? [170, 30, 70];

  const PAD = Math.max(20, Math.round(W * 0.02));
  const MASCOTE_W = Math.round(W * 0.22);
  const CTA_W = Math.round(W * 0.26);
  const CENTER_X0 = MASCOTE_W + PAD;
  const CENTER_X1 = W - CTA_W - PAD;
  const CENTER_W = CENTER_X1 - CENTER_X0;
  const CENTER_CX = Math.round((CENTER_X0 + CENTER_X1) / 2);
  const FOOTER_H = Math.round(H * 0.10);

  const bg = makeHeartsBg({ width: W, height: H, count: Math.round((W * H) / 70) });
  const { canvas, ctx } = newCanvas(W, H);
  ctx.drawImage(bg, 0, 0);

  // mascote
  const mascote = await loadCleanAsset("mascote");
  if (mascote) {
    const mh = Math.round(H * 0.92);
    let mascotBuf = await sharp(mascote).resize({ height: mh }).png().toBuffer();
    let meta = await sharp(mascotBuf).metadata();
    if ((meta.width ?? 0) > MASCOTE_W) {
      mascotBuf = await sharp(mascote).resize({ width: MASCOTE_W }).png().toBuffer();
      meta = await sharp(mascotBuf).metadata();
    }
    const ci = new CanvasImage();
    ci.src = mascotBuf;
    const mw = meta.width ?? 1;
    const mhh = meta.height ?? mh;
    const mx = Math.round((MASCOTE_W - mw) / 2);
    const my = Math.max(0, Math.round((H - FOOTER_H - mhh) / 2));
    ctx.drawImage(ci, mx, my);
  }

  // lettering top
  const topSize = Math.max(20, Math.round(H * 0.13));
  const mesDasBuf = await render3DText({
    text: headlineTop,
    fontSize: topSize,
    weight: "black",
    frontColor: [255, 90, 130],
    sideColor: [180, 40, 80],
    depth: 8,
    outlineWidth: 4,
    glow: true,
  });
  let mesFinal = mesDasBuf;
  let mesMeta = await sharp(mesFinal).metadata();
  if ((mesMeta.width ?? 0) > CENTER_W * 0.85) {
    const r = (CENTER_W * 0.85) / (mesMeta.width ?? 1);
    mesFinal = await sharp(mesDasBuf).resize({ width: Math.round((mesMeta.width ?? 1) * r) }).png().toBuffer();
    mesMeta = await sharp(mesFinal).metadata();
  }

  const mainSize = Math.max(48, Math.round(H * 0.40));
  const maesBuf = await render3DText({
    text: headlineMain,
    fontSize: mainSize,
    weight: "black",
    frontColor: frontMain,
    sideColor: sideMain,
    depth: 18,
    outlineWidth: 10,
    glow: true,
  });
  let maesFinal = maesBuf;
  let maesMeta = await sharp(maesFinal).metadata();
  if ((maesMeta.width ?? 0) > CENTER_W * 0.95) {
    const r = (CENTER_W * 0.95) / (maesMeta.width ?? 1);
    maesFinal = await sharp(maesBuf).resize({ width: Math.round((maesMeta.width ?? 1) * r) }).png().toBuffer();
    maesMeta = await sharp(maesFinal).metadata();
  }

  // logo
  const logoH = Math.max(30, Math.round(H * 0.16));
  const logoAsset = await loadCleanAsset("logo_dark");
  let logoBuf: Buffer | null = null;
  let logoMeta: { width?: number; height?: number } = {};
  if (logoAsset) {
    logoBuf = await sharp(logoAsset).resize({ height: logoH }).png().toBuffer();
    logoMeta = await sharp(logoBuf).metadata();
    if ((logoMeta.width ?? 0) > CENTER_W * 0.55) {
      const r = (CENTER_W * 0.55) / (logoMeta.width ?? 1);
      logoBuf = await sharp(logoAsset).resize({ width: Math.round((logoMeta.width ?? 1) * r) }).png().toBuffer();
      logoMeta = await sharp(logoBuf).metadata();
    }
  }

  const blockH = (mesMeta.height ?? 0) + (maesMeta.height ?? 0) + (logoMeta.height ?? 0) + 30;
  const blockTop = Math.max(10, Math.round((H - FOOTER_H - blockH) / 2));

  const mImg = new CanvasImage();
  mImg.src = mesFinal;
  ctx.drawImage(mImg, CENTER_CX - Math.round((mesMeta.width ?? 0) / 2), blockTop);

  const mainY = blockTop + (mesMeta.height ?? 0) - 8;
  const maImg = new CanvasImage();
  maImg.src = maesFinal;
  ctx.drawImage(maImg, CENTER_CX - Math.round((maesMeta.width ?? 0) / 2), mainY);

  if (logoBuf && logoMeta.width) {
    const logoY = mainY + (maesMeta.height ?? 0) - 8;
    const li = new CanvasImage();
    li.src = logoBuf;
    ctx.drawImage(li, CENTER_CX - Math.round(logoMeta.width / 2), logoY);
  }

  // CTA direita
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const ctaX = CENTER_X1 + PAD;
  const ctaTop = Math.round(H * 0.10);

  ctx.fillStyle = "white";
  ctx.font = fontSpec("bold", Math.max(16, Math.round(H * 0.055)));
  const tm1 = measureText(ctx, ctaTopline);
  ctx.fillText(ctaTopline, ctaX, ctaTop + tm1.asc);

  ctx.font = fontSpec("black", Math.max(40, Math.round(H * 0.26)));
  const tm2 = measureText(ctx, ctaValue);
  ctx.fillText(ctaValue, ctaX, ctaTop + Math.round(H * 0.06) + tm2.asc);

  ctx.font = fontSpec("black", Math.max(16, Math.round(H * 0.065)));
  const tm3 = measureText(ctx, ctaLabel);
  ctx.fillText(ctaLabel, ctaX, ctaTop + Math.round(H * 0.34) + tm3.asc);

  ctx.font = fontSpec("bold", Math.max(12, Math.round(H * 0.035)));
  for (let i = 0; i < terms.length; i++) {
    const tmi = measureText(ctx, terms[i]);
    ctx.fillText(terms[i], ctaX, ctaTop + Math.round(H * 0.45) + i * Math.round(H * 0.055) + tmi.asc);
  }

  // rodape periodo
  const footTop = H - FOOTER_H;
  ctx.fillStyle = "rgba(180,35,75,0.78)";
  ctx.fillRect(0, footTop, W, FOOTER_H);

  ctx.font = fontSpec("bold", Math.max(14, Math.round(FOOTER_H * 0.36)));
  ctx.textAlign = "center";
  ctx.fillStyle = "white";
  const lineH = Math.round(FOOTER_H * 0.42);
  const baseY = footTop + Math.round((FOOTER_H - lineH * periodLines.length) / 2);
  for (let i = 0; i < periodLines.length; i++) {
    const tmi = measureText(ctx, periodLines[i]);
    ctx.fillText(periodLines[i], W / 2, baseY + i * lineH + tmi.asc);
  }

  return canvasToBuffer(canvas, "jpeg", 92);
}
