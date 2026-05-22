import type { PieceWithProduct, SizeClass } from "@/lib/queries/pieces";

/**
 * Quantos produtos cabem embaixo da faixa do hero, na capa (página 1).
 * O catálogo real (Mês das Mães) traz ~12-14 produtos na capa, abaixo da
 * faixa rosa do título.
 */
export const COVER_PRODUCT_COUNT = 14;

/** Quantos produtos cabem numa página interna densa. */
export const PIECES_PER_PAGE = 24;

/** Custo estimado por página renderizada (gpt-image-2). */
export const CUSTO_RENDER_BRL = 1.07;

/**
 * Uma página do catálogo como o Editor a enxerga. A página 1 é a capa
 * (faixa do título + produtos); as demais são páginas internas de produtos.
 */
export type EditorPage =
  | { kind: "cover"; pieces: PieceWithProduct[] }
  | { kind: "products"; pieces: PieceWithProduct[] };

/**
 * Monta a lista de páginas do Editor: a capa primeiro (com os primeiros
 * COVER_PRODUCT_COUNT produtos), depois as páginas internas em blocos de
 * PIECES_PER_PAGE.
 */
export function buildEditorPages(
  pieces: ReadonlyArray<PieceWithProduct>,
): EditorPage[] {
  const sorted = [...pieces].sort((a, b) => a.position - b.position);
  const coverPieces = sorted.slice(0, COVER_PRODUCT_COUNT);
  const rest = sorted.slice(COVER_PRODUCT_COUNT);

  const pages: EditorPage[] = [{ kind: "cover", pieces: coverPieces }];
  for (let i = 0; i < rest.length; i += PIECES_PER_PAGE) {
    pages.push({ kind: "products", pieces: rest.slice(i, i + PIECES_PER_PAGE) });
  }
  return pages;
}

/** Top-to-bottom order of size rows on a page (mockup: D, G, M, P). */
const SIZE_ORDER: ReadonlyArray<SizeClass> = ["D", "G", "M", "P"];

/**
 * Cards lado a lado por classe de tamanho — fixo, como num encarte real:
 * Pequenos vão 6 por fileira, Médios 4, Grandes 2, Destaque ocupa a fileira.
 */
export const SIZE_COLUMNS: Record<SizeClass, number> = {
  D: 1,
  G: 2,
  M: 4,
  P: 6,
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
 * Agrupa os produtos de uma página em fileiras por tamanho, na ordem de
 * impressão (D, G, M, P). As colunas são fixas por classe — uma fileira com
 * poucos produtos deixa células livres à direita, igual a um encarte real
 * meio preenchido (não estica os cards).
 */
export function groupBySize(pieces: ReadonlyArray<PieceWithProduct>): SizeRow[] {
  return SIZE_ORDER.map<SizeRow>((size) => ({
    size,
    columns: SIZE_COLUMNS[size],
    items: pieces.filter((p) => p.size_class === size),
  })).filter((row) => row.items.length > 0);
}
