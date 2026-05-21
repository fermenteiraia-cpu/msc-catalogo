import type { PieceWithProduct } from "@/lib/queries/pieces";
import { groupBySize } from "@/components/editor/pages";
import { SketchProductCard } from "@/components/editor/SketchProductCard";

interface EditorSketchProps {
  /** Pieces that belong to the page currently open. */
  pieces: PieceWithProduct[];
  /** 0-based index of the open page. */
  pageIndex: number;
  /** Total number of catalog pages. */
  pageCount: number;
  selectedPieceId: string | null;
  onSelectPiece: (pieceId: string) => void;
  /** Campaign colors for the page background gradient. */
  gradientFrom: string;
  gradientTo: string;
}

/** Repeated "LOJAS MSC" pink strip (🔒 Casa MSC — não editável). */
function MscStrip({
  variant,
  pageLabel,
}: {
  variant: "top" | "footer";
  pageLabel?: string;
}) {
  if (variant === "top") {
    return (
      <div
        className="mb-1.5 flex justify-around rounded-sm bg-[#C0246A] px-1.5 py-1 font-bold uppercase tracking-widest text-white"
        style={{ fontSize: 7 }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i}>LOJAS MSC</span>
        ))}
      </div>
    );
  }
  return (
    <div
      className="flex items-center justify-between rounded-sm bg-[#C0246A] px-1.5 py-1 font-semibold text-white"
      style={{ fontSize: 7 }}
    >
      <span className="font-bold">
        LOJAS MSC · TODA LOJA EM ATÉ 10X SEM JUROS
      </span>
      <span className="opacity-80">{pageLabel}</span>
    </div>
  );
}

/**
 * The editable sketch of one catalog page (mockup Tela 4, linhas 1544-1658).
 * A print-aspect (11/14) page on the campaign gradient, with the locked MSC
 * strips top and bottom and the product cards laid out in mixed-size rows
 * (Destaque full-width, then Grandes, Médios, Pequenos).
 */
export function EditorSketch({
  pieces,
  pageIndex,
  pageCount,
  selectedPieceId,
  onSelectPiece,
  gradientFrom,
  gradientTo,
}: EditorSketchProps) {
  const rows = groupBySize(pieces);
  const pageLabel = `página ${pageIndex + 1} de ${pageCount}`;

  return (
    <div
      className="relative rounded-xl p-3 shadow-md"
      style={{
        aspectRatio: "11 / 14",
        background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
      }}
    >
      <div
        className="absolute left-2 top-1 z-10 text-white/85"
        style={{ fontSize: 9 }}
      >
        PÁGINA {pageIndex + 1} de {pageCount} · 2200×2540
      </div>

      <MscStrip variant="top" />

      {pieces.length === 0 ? (
        <div
          className="flex items-center justify-center rounded-md bg-white/85 text-center text-muted-foreground"
          style={{ height: "70%", fontSize: 11 }}
        >
          Esta página ainda não tem produtos.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {rows.map((row) => (
            <div
              key={row.size}
              className="grid gap-1.5"
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
      )}

      <div className="mt-1.5">
        <MscStrip variant="footer" pageLabel={pageLabel} />
      </div>
    </div>
  );
}
