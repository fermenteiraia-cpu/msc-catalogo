import type { PieceWithProduct } from "@/lib/queries/pieces";
import { groupBySize } from "@/components/editor/pages";
import { SketchProductCard } from "@/components/editor/SketchProductCard";

interface EditorSketchProps {
  /** Pieces that belong to the interior page currently open (never the cover). */
  pieces: PieceWithProduct[];
  /** 1-based number of this page within the catalog (page 1 is the cover). */
  pageNumber: number;
  /** Total number of catalog pages (cover included). */
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
        className="flex flex-shrink-0 justify-around rounded-sm bg-[#C0246A] px-1.5 py-1.5 font-bold uppercase tracking-widest text-white"
        style={{ fontSize: 8 }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i}>LOJAS MSC</span>
        ))}
      </div>
    );
  }
  return (
    <div
      className="flex flex-shrink-0 items-center justify-between rounded-sm bg-[#C0246A] px-2 py-1.5 font-semibold text-white"
      style={{ fontSize: 8 }}
    >
      <span className="font-bold">
        LOJAS MSC · TODA LOJA EM ATÉ 10X SEM JUROS
      </span>
      <span className="opacity-80">{pageLabel}</span>
    </div>
  );
}

/**
 * The editable sketch of one interior catalog page (mockup Tela 4, linhas
 * 1544-1658). A print-aspect (11/14) sheet with the locked MSC strips top and
 * bottom. The product cards keep real catalog proportions; the grid of rows is
 * centered vertically so a page reads as a curated highlights spread instead
 * of cramming cards in a corner or stretching them (correção David, 2026-05-22).
 */
export function EditorSketch({
  pieces,
  pageNumber,
  pageCount,
  selectedPieceId,
  onSelectPiece,
  gradientFrom,
  gradientTo,
}: EditorSketchProps) {
  const rows = groupBySize(pieces);
  const pageLabel = `página ${pageNumber} de ${pageCount}`;

  return (
    <div
      className="relative flex flex-col gap-2 overflow-hidden rounded-xl p-3 shadow-md"
      style={{
        aspectRatio: "11 / 14",
        background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
      }}
    >
      <div
        className="absolute right-3 top-1 z-10 text-white/80"
        style={{ fontSize: 9 }}
      >
        {pageLabel}
      </div>

      <MscStrip variant="top" />

      {pieces.length === 0 ? (
        <div
          className="flex flex-1 items-center justify-center rounded-md bg-white/85 text-center text-muted-foreground"
          style={{ fontSize: 11 }}
        >
          Esta página ainda não tem produtos.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col justify-evenly gap-3 py-2">
          {rows.map((row) => (
            <div
              key={row.size}
              className="grid items-start gap-3"
              style={{
                gridTemplateColumns: `repeat(${row.columns}, minmax(0, 1fr))`,
                justifyItems: "center",
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

      <MscStrip variant="footer" pageLabel={pageLabel} />
    </div>
  );
}
