/**
 * Utilitarios de canvas + Sharp.
 * @napi-rs/canvas roda em Linux/Mac/Win (Vercel suporta) e tem API igual ao canvas do navegador.
 */
import { createCanvas, SKRSContext2D, Image as CanvasImage, GlobalFonts } from "@napi-rs/canvas";
import sharp from "sharp";
import path from "path";
import fs from "fs";

export type Color = [number, number, number] | [number, number, number, number];

export function rgba(c: Color): string {
  if (c.length === 4) return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c[3] / 255})`;
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/* ---------------- Fontes ---------------- */
const FONTS_LOADED = { ok: false };
export function ensureFonts() {
  if (FONTS_LOADED.ok) return;
  // Procura Lato em locais comuns. Se nao achar, fallback para Arial/system.
  const candidates = [
    { p: "C:/Windows/Fonts/Lato-Black.ttf", name: "LatoBlack" },
    { p: "C:/Windows/Fonts/Lato-Bold.ttf", name: "LatoBold" },
    { p: "C:/Windows/Fonts/Lato-Regular.ttf", name: "LatoRegular" },
    { p: "/usr/share/fonts/truetype/lato/Lato-Black.ttf", name: "LatoBlack" },
    { p: "/usr/share/fonts/truetype/lato/Lato-Bold.ttf", name: "LatoBold" },
    { p: "/usr/share/fonts/truetype/lato/Lato-Regular.ttf", name: "LatoRegular" },
    // Fontes empacotadas no projeto (recomendado para producao)
    { p: path.join(process.cwd(), "public/fonts/Lato-Black.ttf"), name: "LatoBlack" },
    { p: path.join(process.cwd(), "public/fonts/Lato-Bold.ttf"), name: "LatoBold" },
    { p: path.join(process.cwd(), "public/fonts/Lato-Regular.ttf"), name: "LatoRegular" },
  ];
  for (const c of candidates) {
    if (fs.existsSync(c.p)) {
      try {
        GlobalFonts.registerFromPath(c.p, c.name);
      } catch {}
    }
  }
  FONTS_LOADED.ok = true;
}

export function fontSpec(weight: "black" | "bold" | "regular", size: number): string {
  const family =
    weight === "black"
      ? `"LatoBlack", "Arial Black", "Helvetica", sans-serif`
      : weight === "bold"
      ? `"LatoBold", "Arial", sans-serif`
      : `"LatoRegular", "Arial", sans-serif`;
  return `${size}px ${family}`;
}

/* ---------------- Helpers de canvas ---------------- */
export function newCanvas(w: number, h: number) {
  ensureFonts();
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  return { canvas, ctx };
}

export function drawGradient(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, c1: Color, c2: Color) {
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, rgba(c1));
  grad.addColorStop(1, rgba(c2));
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
}

/* ---------------- Texto util ---------------- */
export function measureText(ctx: SKRSContext2D, text: string): { w: number; h: number; asc: number; desc: number } {
  const m = ctx.measureText(text);
  const asc = (m as any).actualBoundingBoxAscent ?? m.fontBoundingBoxAscent ?? 0;
  const desc = (m as any).actualBoundingBoxDescent ?? m.fontBoundingBoxDescent ?? 0;
  return { w: m.width, h: asc + desc, asc, desc };
}

export function wrapText(ctx: SKRSContext2D, text: string, maxWidth: number, maxLines = 999): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const cand = cur ? cur + " " + w : w;
    if (ctx.measureText(cand).width <= maxWidth) {
      cur = cand;
    } else {
      if (cur) lines.push(cur);
      cur = w;
      if (lines.length >= maxLines) break;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines.slice(0, maxLines);
}

export function fmtMoney(v: number): string {
  return "R$ " + v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function fmtMoneySplit(v: number): [string, string] {
  const [i, c] = v.toFixed(2).split(".");
  return ["R$ " + i.replace(/\B(?=(\d{3})+(?!\d))/g, "."), "," + c];
}

/* ---------------- Sharp helpers ---------------- */
export async function canvasToBuffer(canvas: any, format: "jpeg" | "png" = "jpeg", quality = 92): Promise<Buffer> {
  const png = await canvas.encode("png");
  if (format === "png") return png;
  return sharp(png).jpeg({ quality }).toBuffer();
}

/** Retorna { buffer, width, height } da imagem PNG/JPG no path */
export async function loadImageAsCanvasImage(filePath: string) {
  const buf = await fs.promises.readFile(filePath);
  const img = new CanvasImage();
  img.src = buf;
  return img;
}

/** Remove fundo branco de uma imagem (foto de produto). */
export async function removeWhiteBg(filePath: string, threshold = 235): Promise<Buffer> {
  // Le, converte para RGBA, joga pixels claros para alpha 0
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  const total = info.width * info.height;
  for (let i = 0; i < total; i++) {
    const off = i * 4;
    const r = out[off];
    const g = out[off + 1];
    const b = out[off + 2];
    if (r > threshold && g > threshold && b > threshold) {
      const m = (r + g + b) / 3;
      const t = Math.max(0, Math.min(1, (m - threshold) / (255 - threshold)));
      out[off + 3] = Math.round(out[off + 3] * (1 - t));
    }
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .blur(0.5)
    .png()
    .toBuffer();
}

/** Faz trim das bordas transparentes. */
export async function trimAlpha(input: Buffer): Promise<Buffer> {
  return sharp(input).trim().png().toBuffer();
}
