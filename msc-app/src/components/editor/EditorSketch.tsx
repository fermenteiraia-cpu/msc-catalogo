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
        className="flex flex-shrink-0 justify-around rounded-sm bg-[#C0246A] px-1.5 py-1 font-bold uppercase tracking-widest text-white"
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
      className="flex flex-shrink-0 items-center justify-between rounded-sm bg-[#C0246A] px-1.5 py-1 font-semibold text-white"
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
 * The editable sketch of one interior catalog page (mockup Tela 4, linhas
 * 1544-1658). A print-aspect (11/14) sheet on the campaign gradient with the
 * locked MSC strips top and bottom. The product rows STRETCH to fill the
 * sheet — a page with few products shows generous cards instead of dead space
 * (Sally, 2026-05-21).
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
      className="relative flex flex-col gap-1.5 rounded-xl p-3 shadow-md"
      style={{
        aspectRatio: "11 / 14",
        background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
      }}
    >
      <div
        className="absolute left-2 top-0.5 z-10 text-white/85"
        style={{ fontSize: 9 }}
      >
        PÁGINA {pageNumber} de {pageCount} · 2200×2540
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
        <div className="flex min-h-0 flex-1 flex-col gap-1.5">
          {rows.map((row) => (
            <div
              key={row.size}
              className="grid min-h-0 gap-1.5"
              style={{
                flex: row.weight,
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

      <MscStrip variant="footer" pageLabel={pageLabel} />
    </div>
  );
}
