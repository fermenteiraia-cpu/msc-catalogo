import type { PieceWithProduct, SizeClass } from "@/lib/queries/pieces";

/**
 * How many pieces fit on one catalog page in the Editor.
 * The mockup page (Tela 4) holds a mixed layout of 1 Destaque + 2 Grandes +
 * 4 Médios + 5 Pequenos = 12 cards.
 */
export const PIECES_PER_PAGE = 12;

/** Custo estimado por página renderizada (gpt-image-2). Mockup linha 1484. */
export const CUSTO_RENDER_BRL = 1.07;

/**
 * Splits the catalog's pieces (ordered by position) into pages of
 * PIECES_PER_PAGE. Always returns at least one (possibly empty) page so the
 * Editor has something to render.
 */
export function paginatePieces(
  pieces: ReadonlyArray<PieceWithProduct>,
): PieceWithProduct[][] {
  const sorted = [...pieces].sort((a, b) => a.position - b.position);
  const pages: PieceWithProduct[][] = [];
  for (let i = 0; i < sorted.length; i += PIECES_PER_PAGE) {
    pages.push(sorted.slice(i, i + PIECES_PER_PAGE));
  }
  return pages.length > 0 ? pages : [[]];
}

/** Top-to-bottom order of size rows on a page (mockup: D, G, M, P). */
const SIZE_ORDER: ReadonlyArray<SizeClass> = ["D", "G", "M", "P"];

/** How many cards sit side by side per size class (mockup grid). */
export const SIZE_COLUMNS: Record<SizeClass, number> = {
  D: 1,
  G: 2,
  M: 4,
  P: 5,
};

/** Human label for each size class. */
export const SIZE_LABEL: Record<SizeClass, string> = {
  P: "Pequeno",
  M: "Médio",
  G: "Grande",
  D: "Destaque",
};

/** Approximate print dimensions per size class (mockup linha 1721). */
export const SIZE_DIMENSIONS: Record<SizeClass, string> = {
  P: "360 × 460 px (~5 × 6 cm na impressão)",
  M: "540 × 680 px (~7 × 9 cm na impressão)",
  G: "820 × 900 px (~11 × 12 cm na impressão)",
  D: "1700 × 1000 px (~22 × 13 cm na impressão)",
};

export interface SizeRow {
  size: SizeClass;
  columns: number;
  items: PieceWithProduct[];
}

/**
 * Groups one page's pieces into size rows, in print order (D, G, M, P).
 * Empty size classes are dropped.
 */
export function groupBySize(pieces: ReadonlyArray<PieceWithProduct>): SizeRow[] {
  return SIZE_ORDER.map<SizeRow>((size) => ({
    size,
    columns: SIZE_COLUMNS[size],
    items: pieces.filter((p) => p.size_class === size),
  })).filter((row) => row.items.length > 0);
}
