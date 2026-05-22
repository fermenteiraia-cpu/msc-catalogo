import type { PieceWithProduct, SizeClass } from "@/lib/queries/pieces";

/**
 * How many product cards fit on one interior catalog page.
 * The mockup page (Tela 4) holds a mixed layout of 1 Destaque + 2 Grandes +
 * 4 Médios + 5 Pequenos = 12 cards.
 */
export const PIECES_PER_PAGE = 12;

/** Custo estimado por página renderizada (gpt-image-2). Mockup linha 1484. */
export const CUSTO_RENDER_BRL = 1.07;

/**
 * A page of the catalog as the Editor sees it. Page 1 is always the cover;
 * the rest are interior product pages.
 */
export type EditorPage =
  | { kind: "cover" }
  | { kind: "products"; pieces: PieceWithProduct[] };

/**
 * Builds the Editor's page list: the cover first, then interior product pages
 * chunked by PIECES_PER_PAGE. A catalog with no products is just the cover.
 */
export function buildEditorPages(
  pieces: ReadonlyArray<PieceWithProduct>,
): EditorPage[] {
  const sorted = [...pieces].sort((a, b) => a.position - b.position);
  const pages: EditorPage[] = [{ kind: "cover" }];
  for (let i = 0; i < sorted.length; i += PIECES_PER_PAGE) {
    pages.push({
      kind: "products",
      pieces: sorted.slice(i, i + PIECES_PER_PAGE),
    });
  }
  return pages;
}

/** Top-to-bottom order of size rows on a page (mockup: D, G, M, P). */
const SIZE_ORDER: ReadonlyArray<SizeClass> = ["D", "G", "M", "P"];

/** Max cards side by side per size class (mockup grid). */
export const SIZE_COLUMNS: Record<SizeClass, number> = {
  D: 1,
  G: 2,
  M: 4,
  P: 5,
};

/**
 * Vertical weight of one visual line per size class. The sketch sheet has a
 * fixed print ratio (11/14); rows stretch to fill it so a page is never half
 * empty (Sally, 2026-05-21). A Destaque line is the tallest, a Pequeno line
 * the shortest.
 */
const SIZE_ROW_WEIGHT: Record<SizeClass, number> = {
  D: 4,
  G: 3,
  M: 2,
  P: 1.5,
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
  /** Columns actually used — capped at the item count so few cards fill width. */
  columns: number;
  /** Flex weight so the row stretches to fill the sheet height. */
  weight: number;
  items: PieceWithProduct[];
}

/**
 * Groups one page's pieces into size rows, in print order (D, G, M, P).
 * Each row carries the column count (capped at its item count so a handful
 * of cards spread across the full width) and a flex weight (size weight ×
 * number of visual lines) so the rows together fill the whole sheet.
 */
export function groupBySize(pieces: ReadonlyArray<PieceWithProduct>): SizeRow[] {
  return SIZE_ORDER.map<SizeRow>((size) => {
    const items = pieces.filter((p) => p.size_class === size);
    const columns = Math.min(SIZE_COLUMNS[size], Math.max(items.length, 1));
    const visualLines = Math.max(Math.ceil(items.length / columns), 1);
    return {
      size,
      columns,
      weight: SIZE_ROW_WEIGHT[size] * visualLines,
      items,
    };
  }).filter((row) => row.items.length > 0);
}
