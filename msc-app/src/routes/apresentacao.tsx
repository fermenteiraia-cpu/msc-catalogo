import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useCatalog } from "@/lib/queries/catalogs";
import { useCatalogPieces } from "@/lib/queries/pieces";
import { useTermTemplates } from "@/lib/queries/briefing";
import { campaignSpecSchema } from "@/lib/schemas/campaign-spec";
import { buildEditorPages } from "@/components/editor/pages";
import { EditorCover } from "@/components/editor/EditorCover";
import { EditorSketch } from "@/components/editor/EditorSketch";
import { SheetScaler } from "@/components/editor/SheetScaler";

const NOOP = () => {};

/**
 * Tela 5 — Modo Apresentação (mockup ux-design-directions.html linhas
 * 1775-1822). Mostra o catálogo página a página em tela cheia, pra Amanda
 * apresentar pro Marcos. Navega com as setas; ESC ou "E" volta pro editor.
 */
export function ApresentacaoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const catalogQuery = useCatalog(id);
  const catalog = catalogQuery.data ?? null;
  const piecesQuery = useCatalogPieces(catalog ? catalog.id : undefined);
  const pieces = useMemo(() => piecesQuery.data ?? [], [piecesQuery.data]);
  const termTemplatesQuery = useTermTemplates();
  const termTemplates = termTemplatesQuery.data ?? [];

  const spec = useMemo(() => {
    if (!catalog) return null;
    const parsed = campaignSpecSchema.safeParse(catalog.campaign_spec);
    return parsed.success ? parsed.data : null;
  }, [catalog]);

  const editorPages = useMemo(() => buildEditorPages(pieces), [pieces]);
  const [pageIndex, setPageIndex] = useState(0);
  const safeIndex = Math.min(pageIndex, editorPages.length - 1);

  const exitToEditor = useCallback(() => {
    navigate(`/catalogos/${id}/editor`);
  }, [navigate, id]);

  const goPrev = useCallback(() => {
    setPageIndex((i) => Math.max(i - 1, 0));
  }, []);

  const goNext = useCallback(() => {
    setPageIndex((i) => Math.min(i + 1, editorPages.length - 1));
  }, [editorPages.length]);

  // Keyboard navigation (mockup linha 1811-1816).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") exitToEditor();
      else if (e.key === "e" || e.key === "E") exitToEditor();
      else if (e.key === "f" || e.key === "F") {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen().catch(NOOP);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext, exitToEditor]);

  if (catalogQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a1a2e] text-sm text-white/70">
        Carregando a apresentação…
      </div>
    );
  }
  if (catalogQuery.isError || !catalog) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#1a1a2e] text-center text-white">
        <p className="text-sm text-white/70">Catálogo não encontrado.</p>
        <Link to="/" className="text-sm text-white underline">
          ← Voltar para a página inicial
        </Link>
      </div>
    );
  }

  const currentPage = editorPages[safeIndex];
  const pageLabel = currentPage?.kind === "cover" ? "Capa" : `Página ${safeIndex + 1}`;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-[#1a1a2e] px-4 py-20 text-white">
      {/* Indicador de navegação topo */}
      <div className="absolute left-1/2 top-6 flex -translate-x-1/2 items-center gap-3 rounded-full bg-white/10 px-4 py-2 backdrop-blur">
        <span className="text-[11px] uppercase tracking-wide text-white/60">
          {catalog.name}
        </span>
        <span className="text-[13px] font-semibold">
          {pageLabel} · {safeIndex + 1} de {editorPages.length}
        </span>
        <div className="flex gap-1">
          {editorPages.map((_, i) => (
            <span
              key={i}
              className={
                "h-1.5 w-1.5 rounded-full " +
                (i === safeIndex ? "bg-white" : "bg-white/30")
              }
            />
          ))}
        </div>
      </div>

      {/* Setas laterais */}
      <button
        type="button"
        onClick={goPrev}
        disabled={safeIndex === 0}
        aria-label="Página anterior"
        className="absolute left-8 top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white backdrop-blur transition-opacity hover:bg-white/20 disabled:opacity-25"
      >
        ←
      </button>
      <button
        type="button"
        onClick={goNext}
        disabled={safeIndex === editorPages.length - 1}
        aria-label="Próxima página"
        className="absolute right-8 top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white backdrop-blur transition-opacity hover:bg-white/20 disabled:opacity-25"
      >
        →
      </button>

      {/* Página em tela cheia */}
      <div
        className="overflow-hidden rounded-xl shadow-2xl"
        style={{ width: "calc(70vh * 748 / 862)", maxWidth: "88vw" }}
      >
        {currentPage?.kind === "cover" ? (
          spec ? (
            <SheetScaler>
              <EditorCover
                spec={spec}
                termTemplates={termTemplates}
                pieces={currentPage.pieces}
                pageCount={editorPages.length}
                selectedPieceId={null}
                onSelectPiece={NOOP}
              />
            </SheetScaler>
          ) : (
            <div
              className="flex items-center justify-center rounded-xl bg-white/10 text-center text-sm text-white/60"
              style={{ aspectRatio: "748 / 862" }}
            >
              Não foi possível ler os dados da capa.
            </div>
          )
        ) : (
          <SheetScaler>
            <EditorSketch
              pieces={currentPage?.pieces ?? []}
              pageNumber={safeIndex + 1}
              pageCount={editorPages.length}
              selectedPieceId={null}
              onSelectPiece={NOOP}
            />
          </SheetScaler>
        )}
      </div>

      {/* Dica do meio */}
      <p className="absolute bottom-20 left-1/2 max-w-[540px] -translate-x-1/2 text-center text-xs text-white/60">
        💡 Marcos pediu mudança? Aperta{" "}
        <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-white">
          E
        </kbd>{" "}
        e edita ali mesmo. Continua aqui depois — sem perder a página.
      </p>

      {/* Atalhos de teclado */}
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-wrap items-center justify-center gap-4 text-xs text-white/60">
        <span>
          <kbd className="rounded bg-white/10 px-2 py-0.5 font-mono">←</kbd>{" "}
          <kbd className="rounded bg-white/10 px-2 py-0.5 font-mono">→</kbd>{" "}
          navegar
        </span>
        <span>
          <kbd className="rounded bg-white/15 px-2 py-0.5 font-mono text-white">
            E
          </kbd>{" "}
          <strong className="text-white">editar essa página</strong>
        </span>
        <span>
          <kbd className="rounded bg-white/10 px-2 py-0.5 font-mono">ESC</kbd>{" "}
          sair
        </span>
        <span>
          <kbd className="rounded bg-white/10 px-2 py-0.5 font-mono">F</kbd>{" "}
          tela cheia
        </span>
      </div>
    </main>
  );
}
