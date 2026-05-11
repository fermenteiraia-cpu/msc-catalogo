/**
 * Decoracao de fundo: coracoes 3D rosa espalhados.
 */
import { createCanvas, SKRSContext2D } from "@napi-rs/canvas";
import { rgba, type Color } from "./canvas-utils";

interface RNG { next: () => number }
function mulberry32(seed: number): RNG {
  let t = seed >>> 0;
  return {
    next() {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    },
  };
}

function heartShape(ctx: SKRSContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.fillStyle = color;
  // 2 semicirculos + triangulo
  ctx.beginPath();
  ctx.arc(cx - size / 2, cy - size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + size / 2, cy - size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - size, cy - size / 4);
  ctx.lineTo(cx + size, cy - size / 4);
  ctx.lineTo(cx, cy + size * 0.9);
  ctx.closePath();
  ctx.fill();
}

function drawHeart3d(ctx: SKRSContext2D, cx: number, cy: number, size: number, frontHex: string, sideHex: string) {
  // extrusao: copias deslocadas
  for (let d = Math.floor(size / 6); d >= 1; d--) {
    heartShape(ctx, cx + d, cy + d, size, sideHex);
  }
  heartShape(ctx, cx, cy, size, frontHex);
  // highlight
  heartShape(ctx, cx - size / 5, cy - size / 4, size / 3, "rgba(255,255,255,0.55)");
}

export interface HeartsOptions {
  width: number;
  height: number;
  count?: number;
  seed?: number;
  bgTop?: Color;
  bgBot?: Color;
}

/** Devolve canvas pronto com gradiente rosa + coracoes espalhados. */
export function makeHeartsBg({
  width: W,
  height: H,
  count,
  seed = 123,
  bgTop = [255, 200, 215],
  bgBot = [255, 130, 175],
}: HeartsOptions) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // gradiente
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, rgba(bgTop));
  grad.addColorStop(1, rgba(bgBot));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // coracoes
  const n = count ?? Math.max(40, Math.floor((W * H) / 30000));
  const rnd = mulberry32(seed);
  const palettes: Array<[string, string]> = [
    ["#FF82A5", "#C8466478"],
    ["#FFA5C3", "#D25A8278"],
    ["#FA6E91", "#B4285078"],
  ];
  const sizes = [10, 14, 18, 22, 28, 36, 50];
  for (let i = 0; i < n; i++) {
    const cx = -20 + Math.floor(rnd.next() * (W + 40));
    const cy = -20 + Math.floor(rnd.next() * (H + 40));
    const s = sizes[Math.floor(rnd.next() * sizes.length)];
    const [fr, si] = palettes[Math.floor(rnd.next() * palettes.length)];
    const a = s > 20 ? 0.55 + rnd.next() * 0.35 : 0.30 + rnd.next() * 0.30;
    const front = fr.replace(/^#/, "rgba(") + "," + a.toFixed(2) + ")"; // hack — revert
    // melhor reconstruir manual:
    const reA = (hex: string, alpha: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    };
    const frontC = reA(fr, a);
    const sideA = Math.max(0.15, a - 0.15);
    const sideC = reA(si.slice(0, 7), sideA);
    drawHeart3d(ctx, cx, cy, s, frontC, sideC);
  }

  return canvas;
}
