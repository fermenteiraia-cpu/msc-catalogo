/**
 * Carrega assets de marca (mascote, logo) com remocao automatica de fundo branco.
 * Procura nas pastas: ASSETS_DIR (env), pasta pai do projeto, e public/brand/.
 */
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { Image as CanvasImage } from "@napi-rs/canvas";
import { removeWhiteBg, trimAlpha } from "./canvas-utils";

const ASSET_ALIASES: Record<string, string[]> = {
  mascote: ["mascote", "mascot", "vovo", "papai_msc"],
  logo_dark: ["logo_msc", "logo_azul", "logo_dark", "logo"],
  logo_white: ["logo_white", "logo_branco", "logo_branca", "msc_branco"],
};

function searchDirs(): string[] {
  const dirs: string[] = [];
  if (process.env.ASSETS_DIR) {
    dirs.push(path.resolve(process.cwd(), process.env.ASSETS_DIR));
  }
  dirs.push(path.resolve(process.cwd(), ".."));
  dirs.push(path.resolve(process.cwd(), "../msc_brand"));
  dirs.push(path.resolve(process.cwd(), "public/brand"));
  return dirs;
}

function scanDir(d: string): Array<{ name: string; path: string }> {
  if (!fs.existsSync(d)) return [];
  const out: Array<{ name: string; path: string }> = [];
  for (const f of fs.readdirSync(d)) {
    const ext = path.extname(f).toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) continue;
    const stem = path.basename(f, ext).toLowerCase().replace(/[\s-]+/g, "_");
    out.push({ name: stem, path: path.join(d, f) });
  }
  return out;
}

export function findAsset(kind: keyof typeof ASSET_ALIASES): string | null {
  const aliases = ASSET_ALIASES[kind] || [kind];
  const excludes: string[] = kind === "logo_dark" ? ["white", "branco", "branca"] : [];
  const candidates: string[] = [];
  for (const dir of searchDirs()) {
    for (const f of scanDir(dir)) {
      if (excludes.some((x) => f.name.includes(x))) continue;
      if (aliases.some((a) => f.name.includes(a))) {
        candidates.push(f.path);
      }
    }
  }
  if (!candidates.length) return null;
  // prefere PNG
  const pngs = candidates.filter((p) => p.toLowerCase().endsWith(".png"));
  return pngs[0] ?? candidates[0];
}

async function hasRealAlpha(filePath: string): Promise<boolean> {
  const meta = await sharp(filePath).metadata();
  if (!meta.hasAlpha) return false;
  // tem canal alpha mas pode ser todo 255 (opaco). Verificar.
  const stats = await sharp(filePath).stats();
  const alphaCh = stats.channels[3];
  if (alphaCh && typeof alphaCh.min === "number" && alphaCh.min < 250) return true;
  return false;
}

const cache = new Map<string, Buffer>();

export async function loadCleanAsset(kind: keyof typeof ASSET_ALIASES): Promise<Buffer | null> {
  const ck = "v1:" + kind;
  if (cache.has(ck)) return cache.get(ck)!;
  const p = findAsset(kind);
  if (!p) return null;
  let buf: Buffer;
  if (await hasRealAlpha(p)) {
    buf = await sharp(p).png().toBuffer();
    buf = await trimAlpha(buf);
  } else {
    const threshold = kind === "mascote" ? 248 : 235;
    const cleaned = await removeWhiteBg(p, threshold);
    buf = await trimAlpha(cleaned);
  }
  cache.set(ck, buf);
  return buf;
}

export async function loadCleanAssetAsCanvasImage(kind: keyof typeof ASSET_ALIASES, targetH?: number) {
  const buf = await loadCleanAsset(kind);
  if (!buf) return null;
  let finalBuf = buf;
  if (targetH) {
    finalBuf = await sharp(buf).resize({ height: targetH }).png().toBuffer();
  }
  const meta = await sharp(finalBuf).metadata();
  const img = new CanvasImage();
  img.src = finalBuf;
  return { img, width: meta.width!, height: meta.height!, buffer: finalBuf };
}

export async function assetStatus() {
  return {
    mascote: findAsset("mascote"),
    logo_dark: findAsset("logo_dark"),
    logo_white: findAsset("logo_white"),
  };
}
