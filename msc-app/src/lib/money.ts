import type { PieceWithProduct } from "@/lib/queries/pieces";

/** Shared pt-BR currency formatter. */
export const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * Final price shown for a piece.
 * A manual override (set in the Editor) always wins; otherwise the price is
 * the product's cash price minus the per-piece discount. Returns null when the
 * product has no price at all.
 */
export function pieceFinalPrice(piece: PieceWithProduct): number | null {
  if (piece.preco_final_override !== null) return piece.preco_final_override;
  const base = piece.product?.price_cash;
  if (base === null || base === undefined) return null;
  return base * (1 - piece.desconto_percent / 100);
}
