import type { PieceWithProduct } from "@/lib/queries/pieces";
import { groupBySize } from "@/components/editor/pages";
import { SketchProductCard } from "@/components/editor/SketchProductCard";

interface ProductGridProps {
  pieces: PieceWithProduct[];
  selectedPieceId: string | null;
  onSelectPiece: (pieceId: string) => void;
  /** Mensagem quando a página/seção não tem produtos. */
  emptyLabel?: string;
}

/**
 * Grade de produtos de uma página do catálogo — usada tanto na capa (abaixo
 * da faixa do hero) quanto nas páginas internas. As fileiras são agrupadas
 * por tamanho (Destaque, Grande, Médio, Pequeno) e preenchem de cima pra
 * baixo, denso, como num encarte real.
 */
export function ProductGrid({
  pieces,
  selectedPieceId,
  onSelectPiece,
  emptyLabel = "Sem produtos nesta página.",
}: ProductGridProps) {
  const rows = groupBySize(pieces);

  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-center text-[11px] text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div
          key={row.size}
          className="grid items-start gap-2"
          style={{
            gridTemplateColumns: `repeat(${row.columns}, minmax(0, 1fr))`,
          }}
        >
          {row.items.map((piece) => (
            <SketchProductCard
              key={piece.id}
              piece={piece}
              selected={piece.id === selectedPieceId}
              onSelect={onSelectPiece}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
