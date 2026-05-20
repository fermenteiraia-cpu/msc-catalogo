import { memo, useEffect, useRef, useState, type MouseEvent } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ProductRow as Product } from "@/lib/queries/products";
import type { PieceWithProduct } from "@/lib/queries/pieces";
import {
  useAddPieceToCatalog,
  useRemovePiece,
  useUpdatePiece,
} from "@/lib/queries/pieces";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

interface ProductRowProps {
  product: Product;
  selectedPiece: PieceWithProduct | null;
  catalogId: string;
}

/**
 * One row of the products table. Encapsulates per-row click handling.
 *
 * NOTE: The ⭐ "destaque" UI was removed from this screen (David, 2026-05-20)
 * because the user selecting products doesn't yet know which ones will become
 * standalone social-media pieces. That decision moves to the post-render screen.
 * The `is_destaque` DB column is kept for future use.
 *
 * Wrapped in React.memo to skip re-renders when neither the product itself nor
 * the relevant piece fields changed. Critical when the cache invalidates and
 * 100 rows would otherwise re-render.
 */
function ProductRowImpl({
  product,
  selectedPiece,
  catalogId,
}: ProductRowProps) {
  const addPiece = useAddPieceToCatalog();
  const updatePiece = useUpdatePiece();
  const removePiece = useRemovePiece();

  const isSelected = Boolean(selectedPiece);

  // Locally-edited values so typing into the inputs feels responsive.
  const [discountInput, setDiscountInput] = useState<string>(() =>
    selectedPiece ? String(selectedPiece.desconto_percent) : "",
  );
  const [parcInput, setParcInput] = useState<string>(() =>
    selectedPiece ? String(selectedPiece.parcelas) : "",
  );

  // Keep local state in sync if server-side values change (e.g., bulk apply).
  useEffect(() => {
    if (selectedPiece) {
      setDiscountInput(String(selectedPiece.desconto_percent));
      setParcInput(String(selectedPiece.parcelas));
    } else {
      setDiscountInput("");
      setParcInput("");
    }
  }, [
    selectedPiece?.id,
    selectedPiece?.desconto_percent,
    selectedPiece?.parcelas,
  ]);

  const discountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const parcTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = (e: MouseEvent) => e.stopPropagation();

  const handleAddRow = () => {
    if (isSelected) return;
    addPiece.mutate({ catalogId, terasoftCode: product.terasoft_code });
  };

  /**
   * Desselecionar pelo próprio badge da row (David, 2026-05-20):
   * complementa o ✕ do carrinho, pra Amanda poder remover sem precisar
   * varrer com o olhar até a coluna direita.
   */
  const handleDeselectClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (!selectedPiece) return;
    removePiece.mutate({ pieceId: selectedPiece.id, catalogId });
  };

  const handleDiscountChange = (raw: string) => {
    setDiscountInput(raw);
    if (!selectedPiece) return;
    if (discountTimerRef.current) clearTimeout(discountTimerRef.current);
    discountTimerRef.current = setTimeout(() => {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > 100) return;
      updatePiece.mutate({
        pieceId: selectedPiece.id,
        catalogId,
        patch: { desconto_percent: n },
      });
    }, 300);
  };

  const handleParcChange = (raw: string) => {
    setParcInput(raw);
    if (!selectedPiece) return;
    if (parcTimerRef.current) clearTimeout(parcTimerRef.current);
    parcTimerRef.current = setTimeout(() => {
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1 || n > 24) return;
      updatePiece.mutate({
        pieceId: selectedPiece.id,
        catalogId,
        patch: { parcelas: n },
      });
    }, 300);
  };

  const priceFinal =
    selectedPiece && product.price_cash !== null
      ? product.price_cash * (1 - selectedPiece.desconto_percent / 100)
      : null;

  return (
    <tr
      onClick={isSelected ? undefined : handleAddRow}
      className={cn(
        "border-b border-border last:border-b-0 align-middle",
        isSelected
          ? "bg-primary/5 border-l-[3px] border-l-primary"
          : "cursor-pointer hover:bg-muted/50",
      )}
    >
      {/* # column */}
      <td className="px-1 py-1.5 text-center">
        {selectedPiece ? (
          <button
            type="button"
            onClick={handleDeselectClick}
            title="Clique pra remover do catálogo"
            aria-label="Remover do catálogo"
            className="group/badge inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground transition-colors hover:bg-destructive"
          >
            {/* Número visível por padrão, '×' no hover */}
            <span className="group-hover/badge:hidden">
              {selectedPiece.position}
            </span>
            <span className="hidden group-hover/badge:inline">×</span>
          </button>
        ) : (
          <span className="inline-block h-4 w-4 rounded-sm border border-input" />
        )}
      </td>

      {/* Photo */}
      <td className="px-1 py-1">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt=""
            loading="lazy"
            className="h-7 w-7 rounded-sm object-cover"
          />
        ) : (
          <div className="h-7 w-7 rounded-sm bg-muted" aria-hidden />
        )}
      </td>

      {/* Produto */}
      <td className="px-1.5 py-1.5">
        <div
          className={cn(
            "text-xs",
            selectedPiece ? "font-semibold" : "font-medium",
          )}
        >
          {product.name}
        </div>
        <div className="text-[10px] font-mono text-muted-foreground">
          Cód. {product.terasoft_code}
        </div>
      </td>

      {/* À vista */}
      <td className="px-1.5 py-1.5 text-xs tabular-nums">
        {product.price_cash !== null ? brl.format(product.price_cash) : "—"}
      </td>

      {/* Desconto */}
      <td className="px-1 py-1">
        {selectedPiece ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              max={100}
              value={discountInput}
              onClick={stop}
              onChange={(e) => handleDiscountChange(e.target.value)}
              aria-label={`Desconto em porcentagem para ${product.name}`}
              className="h-7 w-[60px] px-1.5 py-0 text-[11px]"
            />
            <span className="text-[11px] text-muted-foreground">%</span>
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">—</span>
        )}
      </td>

      {/* Parc. */}
      <td className="px-1 py-1">
        {selectedPiece ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={1}
              max={24}
              value={parcInput}
              onClick={stop}
              onChange={(e) => handleParcChange(e.target.value)}
              aria-label={`Número de parcelas para ${product.name}`}
              className="h-7 w-[48px] px-1.5 py-0 text-[11px]"
            />
            <span className="text-[11px] text-muted-foreground">x</span>
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">—</span>
        )}
      </td>

      {/* Final */}
      <td className="px-1.5 py-1.5 text-xs tabular-nums">
        {priceFinal !== null ? (
          <span className="font-bold text-destructive">
            {brl.format(priceFinal)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}

/**
 * Re-render only when the product itself or the relevant piece fields change.
 * The piece reference can be replaced on every cache update — we compare by
 * the fields that actually drive the row's visual.
 */
export const ProductRow = memo(ProductRowImpl, (prev, next) => {
  if (prev.product.id !== next.product.id) return false;
  if (prev.catalogId !== next.catalogId) return false;

  const a = prev.selectedPiece;
  const b = next.selectedPiece;
  if (a === b) return true;
  if (!a || !b) return false;

  return (
    a.id === b.id &&
    a.position === b.position &&
    a.desconto_percent === b.desconto_percent &&
    a.parcelas === b.parcelas
  );
});
