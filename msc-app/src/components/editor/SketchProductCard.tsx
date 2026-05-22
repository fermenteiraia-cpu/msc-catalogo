import type { CSSProperties } from "react";

import type { PieceWithProduct, SizeClass } from "@/lib/queries/pieces";
import { brl, pieceFinalPrice } from "@/lib/money";
import { cn } from "@/lib/utils";

interface SketchProductCardProps {
  piece: PieceWithProduct;
  selected: boolean;
  onSelect: (pieceId: string) => void;
}

/** Per-size text scale (px). The photo area is elastic; only text is fixed. */
const SIZE_STYLE: Record<
  SizeClass,
  { nameSize: number; priceSize: number; badge: { bg: string; label: string } }
> = {
  D: {
    nameSize: 11,
    priceSize: 19,
    badge: { bg: "rgba(220,38,38,0.9)", label: "D · Destaque" },
  },
  G: {
    nameSize: 10,
    priceSize: 15,
    badge: { bg: "rgba(220,38,38,0.7)", label: "G · Grande" },
  },
  M: {
    nameSize: 9,
    priceSize: 13,
    badge: { bg: "rgba(34,94,80,0.75)", label: "M · Médio" },
  },
  P: {
    nameSize: 8,
    priceSize: 11,
    badge: { bg: "rgba(48,48,96,0.75)", label: "P" },
  },
};

/** Muted photo placeholder that fills whatever space the card gives it. */
function PhotoPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-sm bg-muted text-muted-foreground">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    </div>
  );
}

/**
 * One product card inside the editor sketch page (mockup Tela 4, linhas
 * 1554-1651). The card fills 100% of its row's height — the photo area is the
 * elastic element so a page with few products never leaves dead space
 * (Sally, 2026-05-21). Layout adapts to the piece's size class:
 *   D → horizontal (photo + info side by side)
 *   G/M/P → vertical (photo on top, name + price fixed below).
 * Clicking selects the piece; the selected card gets a green outline.
 */
export function SketchProductCard({
  piece,
  selected,
  onSelect,
}: SketchProductCardProps) {
  const size = piece.size_class;
  const style = SIZE_STYLE[size];
  const product = piece.product;
  const name = product?.name ?? "Produto sem nome";
  const finalPrice = pieceFinalPrice(piece);

  const outline: CSSProperties = selected
    ? { outline: "2px solid #4ADE80", outlineOffset: 2 }
    : {};

  const sizeBadge = (
    <div
      className="absolute right-1 top-1 z-10 rounded font-bold text-white"
      style={{ background: style.badge.bg, fontSize: 6, padding: "1px 5px" }}
    >
      {style.badge.label}
    </div>
  );

  const parcelasBadge = piece.parcelas > 0 && (
    <div
      className="absolute z-10 font-bold"
      style={{
        top: -3,
        left: -3,
        background: "#F5C84B",
        color: "#1A1A1A",
        fontSize: 6,
        padding: "1px 4px",
        borderRadius: 999,
      }}
    >
      ★ {piece.parcelas}x
    </div>
  );

  const priceNode = (
    <div
      className="font-extrabold leading-none text-[#DC2626]"
      style={{ fontSize: style.priceSize }}
    >
      {finalPrice !== null ? brl.format(finalPrice) : "—"}
    </div>
  );

  const photo = product?.image_url ? (
    <img
      src={product.image_url}
      alt=""
      loading="lazy"
      className="h-full w-full rounded-sm object-cover"
    />
  ) : (
    <PhotoPlaceholder />
  );

  /* ---- Destaque: horizontal layout ---- */
  if (size === "D") {
    return (
      <button
        type="button"
        onClick={() => onSelect(piece.id)}
        className="relative flex h-full w-full items-stretch gap-2 rounded bg-white p-2 text-left"
        style={outline}
        aria-pressed={selected}
      >
        {parcelasBadge}
        {sizeBadge}
        <div className="h-full w-[38%] flex-shrink-0">{photo}</div>
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div
            className="font-bold leading-tight"
            style={{ fontSize: style.nameSize }}
          >
            {name}
          </div>
          {piece.desconto_percent > 0 && product?.price_cash != null && (
            <div className="text-muted-foreground" style={{ fontSize: 7 }}>
              DE: {brl.format(product.price_cash)}
            </div>
          )}
          <div
            className="font-bold text-[hsl(var(--primary))]"
            style={{ fontSize: 7 }}
          >
            1+{Math.max(piece.parcelas - 1, 1)}X SEM JUROS
          </div>
          <div className="mt-0.5">{priceNode}</div>
        </div>
      </button>
    );
  }

  /* ---- Grande / Médio / Pequeno: vertical layout ---- */
  return (
    <button
      type="button"
      onClick={() => onSelect(piece.id)}
      className={cn(
        "relative flex h-full w-full flex-col rounded bg-white text-center",
        size === "P" ? "p-1" : "p-1.5",
      )}
      style={outline}
      aria-pressed={selected}
    >
      {parcelasBadge}
      {sizeBadge}
      <div className="min-h-0 flex-1">{photo}</div>
      <div className="flex-shrink-0 pt-1">
        <div
          className="line-clamp-2 font-semibold leading-tight"
          style={{ fontSize: style.nameSize }}
        >
          {name}
        </div>
        <div className="mt-0.5">{priceNode}</div>
      </div>
    </button>
  );
}
