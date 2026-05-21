import type { CSSProperties } from "react";

import type { PieceWithProduct, SizeClass } from "@/lib/queries/pieces";
import { brl, pieceFinalPrice } from "@/lib/money";
import { cn } from "@/lib/utils";

interface SketchProductCardProps {
  piece: PieceWithProduct;
  selected: boolean;
  onSelect: (pieceId: string) => void;
}

/** Per-size visual scale — fixed px so the card reads like a print thumbnail. */
const SIZE_STYLE: Record<
  SizeClass,
  {
    photoHeight: number;
    nameSize: number;
    priceSize: number;
    badge: { bg: string; label: string };
  }
> = {
  D: {
    photoHeight: 64,
    nameSize: 9,
    priceSize: 16,
    badge: { bg: "rgba(220,38,38,0.9)", label: "D · Destaque" },
  },
  G: {
    photoHeight: 72,
    nameSize: 9,
    priceSize: 13,
    badge: { bg: "rgba(220,38,38,0.7)", label: "G · Grande" },
  },
  M: {
    photoHeight: 52,
    nameSize: 8,
    priceSize: 12,
    badge: { bg: "rgba(34,94,80,0.75)", label: "M · Médio" },
  },
  P: {
    photoHeight: 40,
    nameSize: 7,
    priceSize: 10,
    badge: { bg: "rgba(48,48,96,0.75)", label: "P" },
  },
};

/** Muted photo placeholder when the product has no Terasoft image. */
function PhotoPlaceholder({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-sm bg-muted text-muted-foreground"
      style={{ height }}
    >
      <svg
        width={Math.min(20, height / 2)}
        height={Math.min(20, height / 2)}
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
 * 1554-1651). Layout adapts to the piece's size class:
 *   D → horizontal (photo + info side by side, full row)
 *   G/M/P → vertical (photo on top, info below) at decreasing scale.
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

  /** Badge shown on every card top-right with the size class. */
  const sizeBadge = (
    <div
      className="absolute right-1 top-1 rounded font-bold text-white"
      style={{
        background: style.badge.bg,
        fontSize: 6,
        padding: "1px 5px",
      }}
    >
      {style.badge.label}
    </div>
  );

  /** Yellow "★ Nx" parcelas badge top-left (mockup linha 1557). */
  const parcelasBadge = piece.parcelas > 0 && (
    <div
      className="absolute font-bold"
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
      className="font-extrabold text-[#DC2626]"
      style={{ fontSize: style.priceSize }}
    >
      {finalPrice !== null ? brl.format(finalPrice) : "—"}
    </div>
  );

  /* ---- Destaque: horizontal layout ---- */
  if (size === "D") {
    return (
      <button
        type="button"
        onClick={() => onSelect(piece.id)}
        className="relative flex w-full items-center gap-2 rounded bg-white p-2 text-left"
        style={outline}
        aria-pressed={selected}
      >
        {parcelasBadge}
        {sizeBadge}
        <div className="flex-shrink-0" style={{ width: 96 }}>
          {product?.image_url ? (
            <img
              src={product.image_url}
              alt=""
              loading="lazy"
              className="w-full rounded-sm object-cover"
              style={{ height: style.photoHeight }}
            />
          ) : (
            <PhotoPlaceholder height={style.photoHeight} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="font-bold leading-tight"
            style={{ fontSize: style.nameSize }}
          >
            {name}
          </div>
          {piece.desconto_percent > 0 && product?.price_cash != null && (
            <div className="text-muted-foreground" style={{ fontSize: 6 }}>
              DE: {brl.format(product.price_cash)}
            </div>
          )}
          <div
            className="font-bold text-[hsl(var(--primary))]"
            style={{ fontSize: 6 }}
          >
            1+{Math.max(piece.parcelas - 1, 1)}X SEM JUROS
          </div>
          {priceNode}
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
        "relative flex w-full flex-col rounded bg-white text-center",
        size === "P" ? "p-1" : "p-2",
      )}
      style={outline}
      aria-pressed={selected}
    >
      {parcelasBadge}
      {sizeBadge}
      {product?.image_url ? (
        <img
          src={product.image_url}
          alt=""
          loading="lazy"
          className="mb-1 w-full rounded-sm object-cover"
          style={{ height: style.photoHeight }}
        />
      ) : (
        <div className="mb-1">
          <PhotoPlaceholder height={style.photoHeight} />
        </div>
      )}
      <div
        className="line-clamp-2 font-semibold leading-tight"
        style={{ fontSize: style.nameSize }}
      >
        {name}
      </div>
      {priceNode}
    </button>
  );
}
