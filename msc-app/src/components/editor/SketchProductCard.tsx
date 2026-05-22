import type { CSSProperties } from "react";

import type { PieceWithProduct, SizeClass } from "@/lib/queries/pieces";
import { brl, pieceFinalPrice } from "@/lib/money";
import { cn } from "@/lib/utils";

interface SketchProductCardProps {
  piece: PieceWithProduct;
  selected: boolean;
  onSelect: (pieceId: string) => void;
}

/**
 * Per-size visual scale. `maxWidth` gives the P/M/G classes a real size
 * hierarchy (a Pequeno card is genuinely smaller than a Médio); D is a
 * full-width banner so it has no cap.
 */
const SIZE_STYLE: Record<
  SizeClass,
  {
    nameSize: number;
    priceSize: number;
    maxWidth: number;
    badge: { bg: string; label: string };
  }
> = {
  D: {
    nameSize: 13,
    priceSize: 26,
    maxWidth: 9999,
    badge: { bg: "rgba(220,38,38,0.92)", label: "Destaque" },
  },
  G: {
    nameSize: 12,
    priceSize: 20,
    maxWidth: 300,
    badge: { bg: "rgba(220,38,38,0.78)", label: "Grande" },
  },
  M: {
    nameSize: 11,
    priceSize: 17,
    maxWidth: 230,
    badge: { bg: "rgba(34,94,80,0.8)", label: "Médio" },
  },
  P: {
    nameSize: 9,
    priceSize: 13,
    maxWidth: 170,
    badge: { bg: "rgba(48,48,96,0.8)", label: "Pequeno" },
  },
};

/** Muted photo placeholder that fills the photo box. */
function PhotoPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
      <svg
        width="26"
        height="26"
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
 * 1554-1651). The card keeps a real catalog proportion — a square photo on a
 * white field plus a name+price strip — and NEVER stretches into a tall
 * sliver (correção David, 2026-05-22). Layout per size class:
 *   D → horizontal banner (photo left, info right)
 *   G/M/P → vertical card (square photo on top, name + price below).
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
    ? { outline: "2.5px solid #16A34A", outlineOffset: 2 }
    : {};

  const parcelasBadge = piece.parcelas > 0 && (
    <div
      className="absolute z-10 font-bold"
      style={{
        top: -6,
        left: -6,
        background: "#F5C84B",
        color: "#1A1A1A",
        fontSize: 9,
        padding: "2px 7px",
        borderRadius: 999,
        boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
      }}
    >
      ★ 1+{Math.max(piece.parcelas - 1, 1)}x
    </div>
  );

  const sizeBadge = (
    <div
      className="absolute right-1.5 top-1.5 z-10 rounded font-bold uppercase tracking-wide text-white"
      style={{ background: style.badge.bg, fontSize: 7, padding: "2px 6px" }}
    >
      {style.badge.label}
    </div>
  );

  const photo = product?.image_url ? (
    <img
      src={product.image_url}
      alt=""
      loading="lazy"
      className="h-full w-full object-contain"
    />
  ) : (
    <PhotoPlaceholder />
  );

  const priceNode = (
    <div
      className="font-extrabold leading-none text-[#DC2626]"
      style={{ fontSize: style.priceSize }}
    >
      {finalPrice !== null ? brl.format(finalPrice) : "—"}
    </div>
  );

  /* ---- Destaque: horizontal banner ---- */
  if (size === "D") {
    return (
      <button
        type="button"
        onClick={() => onSelect(piece.id)}
        className="relative flex w-full items-stretch gap-3 overflow-hidden rounded-md bg-white p-2.5 text-left shadow-sm"
        style={outline}
        aria-pressed={selected}
      >
        {parcelasBadge}
        {sizeBadge}
        <div className="aspect-[4/3] w-[40%] flex-shrink-0 overflow-hidden rounded bg-white">
          {photo}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          <div
            className="font-bold leading-tight text-foreground"
            style={{ fontSize: style.nameSize }}
          >
            {name}
          </div>
          {piece.desconto_percent > 0 && product?.price_cash != null && (
            <div
              className="text-muted-foreground line-through"
              style={{ fontSize: 9 }}
            >
              de {brl.format(product.price_cash)}
            </div>
          )}
          {priceNode}
          <div
            className="font-bold uppercase text-[hsl(var(--primary))]"
            style={{ fontSize: 8 }}
          >
            1+{Math.max(piece.parcelas - 1, 1)}x sem juros
          </div>
        </div>
      </button>
    );
  }

  /* ---- Grande / Médio / Pequeno: vertical card ---- */
  return (
    <button
      type="button"
      onClick={() => onSelect(piece.id)}
      className={cn(
        "relative flex w-full flex-col overflow-hidden rounded-md bg-white shadow-sm",
        size === "P" ? "p-1.5" : "p-2",
      )}
      style={{ ...outline, maxWidth: style.maxWidth }}
      aria-pressed={selected}
    >
      {parcelasBadge}
      {sizeBadge}
      <div className="aspect-[4/5] w-full overflow-hidden rounded bg-white">
        {photo}
      </div>
      <div className="flex flex-col items-center pt-1.5 text-center">
        <div
          className="line-clamp-2 font-semibold leading-tight text-foreground"
          style={{ fontSize: style.nameSize }}
        >
          {name}
        </div>
        <div className="mt-1">{priceNode}</div>
      </div>
    </button>
  );
}
