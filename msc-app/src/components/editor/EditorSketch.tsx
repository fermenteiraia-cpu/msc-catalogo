import type { PieceWithProduct } from "@/lib/queries/pieces";
import { ProductGrid } from "@/components/editor/ProductGrid";

interface EditorSketchProps {
  /** Pieces that belong to the interior page currently open (never the cover). */
  pieces: PieceWithProduct[];
  /** 1-based number of this page within the catalog (page 1 is the cover). */
  pageNumber: number;
  /** Total number of catalog pages (cover included). */
  pageCount: number;
  selectedPieceId: string | null;
  onSelectPiece: (pieceId: string) => void;
}

/** Faixa rosa "LOJAS MSC" repetida (🔒 marca MSC — não editável). */
export function MscStrip({
  variant,
  pageLabel,
}: {
  variant: "top" | "footer";
  pageLabel?: string;
}) {
  if (variant === "top") {
    return (
      <div
        className="flex flex-shrink-0 justify-around bg-[#C0246A] px-2 py-1.5 font-extrabold uppercase italic tracking-wide text-white"
        style={{ fontSize: 10 }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i}>LOJAS MSC</span>
        ))}
      </div>
    );
  }
  return (
    <div
      className="flex flex-shrink-0 items-center justify-between bg-[#C0246A] px-2.5 py-1.5 font-semibold text-white"
      style={{ fontSize: 9 }}
    >
      <span className="font-extrabold uppercase italic">
        LOJAS MSC · TODA LOJA EM ATÉ 10X SEM JUROS
      </span>
      <span className="opacity-80">{pageLabel}</span>
    </div>
  );
}

/**
 * Página interna do catálogo (mockup Tela 4). Folha de impressão branca com
 * as faixas rosas MSC em cima e embaixo e a grade densa de produtos — fiel ao
 * encarte MSC real (correção David, 2026-05-22): fundo branco, não colorido.
 */
export function EditorSketch({
  pieces,
  pageNumber,
  pageCount,
  selectedPieceId,
  onSelectPiece,
}: EditorSketchProps) {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl bg-white shadow-md"
      style={{ aspectRatio: "748 / 862" }}
    >
      <MscStrip variant="top" />
      <div className="min-h-0 flex-1 overflow-hidden p-2.5">
        <ProductGrid
          pieces={pieces}
          selectedPieceId={selectedPieceId}
          onSelectPiece={onSelectPiece}
          emptyLabel="Esta página ainda não tem produtos."
        />
      </div>
      <MscStrip
        variant="footer"
        pageLabel={`página ${pageNumber} de ${pageCount}`}
      />
    </div>
  );
}
