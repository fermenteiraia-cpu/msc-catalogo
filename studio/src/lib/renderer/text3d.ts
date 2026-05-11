/**
 * Lettering 3D extrudido (replicacao do efeito Python em canvas/JS).
 * Tecnica: multiplas copias do texto deslocadas para criar profundidade,
 * stroke branco grosso, fill com gradiente, glow externo opcional.
 */
import { createCanvas, SKRSContext2D } from "@napi-rs/canvas";
import { fontSpec, ensureFonts, type Color, rgba } from "./canvas-utils";
import sharp from "sharp";

export interface Text3dOptions {
  text: string;
  fontSize: number;
  weight?: "black" | "bold";
  frontColor: Color;
  sideColor: Color;
  outlineColor?: Color;
  outlineWidth?: number;
  depth?: number;
  glow?: boolean;
  glowColor?: Color;
}

/**
 * Renderiza um texto 3D e devolve buffer PNG transparente.
 * O caller decide o tamanho/posicao do canvas final.
 */
export async function render3DText(opts: Text3dOptions): Promise<Buffer> {
  ensureFonts();
  const {
    text,
    fontSize,
    weight = "black",
    frontColor,
    sideColor,
    outlineColor = [255, 255, 255],
    outlineWidth = 8,
    depth = 14,
    glow = true,
    glowColor = [255, 180, 200],
  } = opts;

  // --- medir o texto num canvas temporário ---
  const tmp = createCanvas(10, 10);
  const tctx = tmp.getContext("2d");
  tctx.font = fontSpec(weight, fontSize);
  const metrics = tctx.measureText(text);
  const tw = Math.ceil(metrics.width);
  const asc = (metrics as any).actualBoundingBoxAscent ?? fontSize;
  const desc = (metrics as any).actualBoundingBoxDescent ?? fontSize * 0.3;
  const th = Math.ceil(asc + desc);

  const pad = depth + outlineWidth + 30;
  const W = tw + pad * 2;
  const H = th + pad * 2;
  const baselineY = pad + asc;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.font = fontSpec(weight, fontSize);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  // --- extrusao: layers offset diagonal ---
  for (let k = depth; k >= 1; k--) {
    ctx.lineJoin = "round";
    ctx.lineWidth = outlineWidth;
    ctx.strokeStyle = rgba(outlineColor);
    ctx.fillStyle = rgba(sideColor);
    ctx.strokeText(text, pad + k, baselineY + k);
    ctx.fillText(text, pad + k, baselineY + k);
  }

  // --- face frontal: stroke branco + fill com cor ---
  ctx.lineJoin = "round";
  ctx.lineWidth = outlineWidth;
  ctx.strokeStyle = rgba(outlineColor);
  ctx.fillStyle = rgba(frontColor);
  ctx.strokeText(text, pad, baselineY);
  ctx.fillText(text, pad, baselineY);

  // --- gradient overlay top->bottom (mais claro em cima) ---
  // Para isso, vamos desenhar uma camada translucida apenas dentro do
  // contorno do texto. Tecnica: source-atop sobre o texto ja desenhado.
  const gradLayer = createCanvas(W, H);
  const gctx = gradLayer.getContext("2d");
  gctx.font = fontSpec(weight, fontSize);
  gctx.textBaseline = "alphabetic";
  gctx.textAlign = "left";
  // primeiro desenha o texto como mascara
  gctx.fillStyle = "white";
  gctx.fillText(text, pad, baselineY);
  // agora aplica gradient com source-atop
  gctx.globalCompositeOperation = "source-atop";
  const linear = gctx.createLinearGradient(0, 0, 0, H);
  linear.addColorStop(0, "rgba(255,255,255,0.5)");
  linear.addColorStop(1, "rgba(255,255,255,0)");
  gctx.fillStyle = linear;
  gctx.fillRect(0, 0, W, H);
  // volta para normal e cola no canvas principal
  ctx.globalCompositeOperation = "screen";
  ctx.drawImage(gradLayer, 0, 0);
  ctx.globalCompositeOperation = "source-over";

  // --- glow: render do texto com stroke gigante + blur ---
  let outBuf = await canvas.encode("png");
  if (glow) {
    const glowCanvas = createCanvas(W, H);
    const glctx = glowCanvas.getContext("2d");
    glctx.font = fontSpec(weight, fontSize);
    glctx.textBaseline = "alphabetic";
    glctx.lineJoin = "round";
    glctx.lineWidth = outlineWidth + 12;
    glctx.strokeStyle = rgba(glowColor);
    glctx.fillStyle = rgba(glowColor);
    glctx.strokeText(text, pad, baselineY);
    const glowPng = await glowCanvas.encode("png");
    const blurred = await sharp(glowPng).blur(8).png().toBuffer();
    // compose: glow embaixo, texto em cima
    outBuf = await sharp(blurred)
      .composite([{ input: outBuf, blend: "over" }])
      .png()
      .toBuffer();
  }

  return outBuf;
}
