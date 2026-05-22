import type { CSSProperties } from "react";

import type { PieceWithProduct, SizeClass } from "@/lib/queries/pieces";
import { brl, pieceFinalPrice } from "@/lib/money";
import { cn } from "@/lib/utils";

interface SketchProductCardProps {
  piece: PieceWithProduct;
  selected: boolean;
  onSelect: (pieceId: string) => void;
}

/** Per-size visual scale (px) — cards are small and dense, like a real encarte. */
const SIZE_STYLE: Record<
  SizeClass,
  { nameSize: number; priceSize: number; burst: number; pad: string }
> = {
  D: { nameSize: 13, priceSize: 32, burst: 58, pad: "p-2.5" },
  G: { nameSize: 10, priceSize: 23, burst: 50, pad: "p-2" },
  M: { nameSize: 8, priceSize: 16, burst: 38, pad: "p-1.5" },
  P: { nameSize: 6.5, priceSize: 12, burst: 30, pad: "p-1" },
};

/** Builds the SVG path of an N-point starburst inside a 100×100 box. */
function burstPath(points: number, outer: number, inner: number): string {
  const cx = 50;
  const cy = 50;
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    d += `${i === 0 ? "M" : "L"}${(cx + r * Math.cos(a)).toFixed(2)},${(
      cy +
      r * Math.sin(a)
    ).toFixed(2)}`;
  }
  return `${d}Z`;
}

const BURST_D = burstPath(14, 50, 36);

/** Selo amarelo "Nx SEM JUROS" (estrela do encarte MSC). */
function Starburst({ parcelas, size }: { parcelas: number; size: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className="absolute -left-1.5 -top-1.5 z-10 drop-shadow"
    >
      <path d={BURST_D} fill="#F5C84B" stroke="#E0A800" strokeWidth="2.5" />
      <text
        x="50"
        y="45"
        textAnchor="middle"
        fontSize="36"
        fontWeight="900"
        fill="#1A1A1A"
      >
        {parcelas}x
      </text>
      <text
        x="50"
        y="68"
        textAnchor="middle"
        fontSize="15"
        fontWeight="800"
        fill="#1A1A1A"
      >
        SEM JUROS
      </text>
    </svg>
  );
}

/** Muted photo placeholder. */
function PhotoPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
      <svg
        width="24"
        height="24"
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
 * One product card inside a catalog page — modelado no encarte MSC real:
 * card branco compacto, foto do produto, estrela amarela "Nx SEM JUROS",
 * nome miúdo e preço grande vermelho. Cards são pequenos e densos.
 *   D → banner horizontal (foto + info lado a lado)
 *   G/M/P → card vertical (foto, nome, preço) em escala decrescente.
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
  const hasDesconto =
    piece.desconto_percent > 0 && product?.price_cash != null;

  const outline: CSSProperties = selected
    ? { outline: "2.5px solid #16A34A", outlineOffset: 1 }
    : {};

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

  /* ---- Destaque: banner horizontal ---- */
  if (size === "D") {
    return (
      <button
        type="button"
        onClick={() => onSelect(piece.id)}
        className={cn(
          "relative flex w-full items-center gap-3 rounded-md border border-[#eee] bg-white text-left shadow-sm",
          style.pad,
        )}
        style={outline}
        aria-pressed={selected}
      >
        <Starburst parcelas={piece.parcelas} size={style.burst} />
        <div className="aspect-[4/3] w-[34%] flex-shrink-0 overflow-hidden">
          {photo}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div
            className="font-bold uppercase leading-tight text-foreground"
            style={{ fontSize: style.nameSize }}
          >
            {name}
          </div>
          {hasDesconto && (
            <div
              className="text-muted-foreground line-through"
              style={{ fontSize: 9 }}
            >
              de {brl.format(product!.price_cash!)}
            </div>
          )}
          {priceNode}
          <div
            className="font-bold uppercase text-[#225E50]"
            style={{ fontSize: 8 }}
          >
            ou {piece.parcelas}x sem juros nos cartões
          </div>
        </div>
      </button>
    );
  }

  /* ---- Grande / Médio / Pequeno: card vertical ---- */
  return (
    <button
      type="button"
      onClick={() => onSelect(piece.id)}
      className={cn(
        "relative flex w-full flex-col items-center rounded border border-[#eee] bg-white text-center shadow-sm",
        style.pad,
      )}
      style={outline}
      aria-pressed={selected}
    >
      <Starburst parcelas={piece.parcelas} size={style.burst} />
      <div className="aspect-square w-full overflow-hidden">{photo}</div>
      <div
        className="mt-0.5 line-clamp-2 w-full font-bold uppercase leading-tight text-foreground"
        style={{ fontSize: style.nameSize }}
      >
        {name}
      </div>
      {hasDesconto && size !== "P" && (
        <div
          className="text-muted-foreground line-through"
          style={{ fontSize: 7 }}
        >
          de {brl.format(product!.price_cash!)}
        </div>
      )}
      <div className="mt-0.5">{priceNode}</div>
    </button>
  );
}
