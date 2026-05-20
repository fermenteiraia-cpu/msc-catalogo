import { X } from "lucide-react";
import type { MouseEvent } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useRemovePiece,
  type PieceWithProduct,
} from "@/lib/queries/pieces";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

interface CartItemProps {
  piece: PieceWithProduct;
  catalogId: string;
}

/**
 * One row in the right-column cart. Position badge + thumb + name + final
 * price + remove button. Style mirrors mockup lines 1326-1396.
 */
export function CartItem({ piece, catalogId }: CartItemProps) {
  const removePiece = useRemovePiece();

  const product = piece.product;
  const finalPrice =
    product?.price_cash !== null && product?.price_cash !== undefined
      ? product.price_cash * (1 - piece.desconto_percent / 100)
      : null;

  const isTopFive = piece.position <= 5;

  const handleRemove = (e: MouseEvent) => {
    e.stopPropagation();
    removePiece.mutate({ pieceId: piece.id, catalogId });
  };

  return (
    <div className="mb-0.5 flex items-center gap-2 rounded-sm p-1.5 hover:bg-secondary">
      <div
        className={cn(
          "inline-flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
          isTopFive
            ? "bg-primary text-primary-foreground"
            : "bg-muted-foreground text-white",
        )}
      >
        {piece.position}
      </div>

      {product?.image_url ? (
        <img
          src={product.image_url}
          alt=""
          loading="lazy"
          className="h-8 w-8 flex-shrink-0 rounded-sm object-cover"
        />
      ) : (
        <div
          className="h-8 w-8 flex-shrink-0 rounded-sm bg-muted"
          aria-hidden
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">
          {product?.name ?? "Produto sem nome"}
        </div>
        <div className="text-[10px] font-semibold text-destructive">
          {finalPrice !== null ? brl.format(finalPrice) : "—"}
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleRemove}
        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        aria-label="Remover do catálogo"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
