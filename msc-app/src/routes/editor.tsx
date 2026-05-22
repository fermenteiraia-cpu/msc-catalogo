import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { Check, Loader2, Trash2 } from "lucide-react";

import type { AppLayoutContext } from "@/components/AppLayout";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCatalog } from "@/lib/queries/catalogs";
import {
  useCatalogPieces,
  useRemovePiece,
  type PieceWithProduct,
} from "@/lib/queries/pieces";
import { useTermTemplates, useUpdateCatalogSpec } from "@/lib/queries/briefing";
import {
  campaignSpecSchema,
  type CampaignSpec,
} from "@/lib/schemas/campaign-spec";
import {
  buildEditorPages,
  CUSTO_RENDER_BRL,
  groupBySize,
} from "@/components/editor/pages";
import { EditorSketch } from "@/components/editor/EditorSketch";
import { EditorCover } from "@/components/editor/EditorCover";
import { FinalArtViewer } from "@/components/editor/FinalArtViewer";
import { SelectedElementPanel } from "@/components/editor/SelectedElementPanel";
import { CoverInfoPanel } from "@/components/editor/CoverInfoPanel";
import { EditorReadyPhrases } from "@/components/editor/EditorReadyPhrases";
import { PriceAuditPanel } from "@/components/editor/PriceAuditPanel";
import { brl } from "@/lib/money";

type SaveState = "idle" | "saving" | "saved";
const SAVE_DEBOUNCE_MS = 900;

/**
 * Builds the "Fileira N · coluna C (de T)" label for the selected piece by
 * locating it inside its page's size-grouped layout.
 */
function buildPositionLabel(
  page: PieceWithProduct[],
  pieceId: string,
): string {
  const rows = groupBySize(page);
  let fileira = 0;
  for (const row of rows) {
    fileira += 1;
    const col = row.items.findIndex((p) => p.id === pieceId);
    if (col >= 0) {
      return `Fileira ${fileira} · coluna ${col + 1} (de ${row.items.length})`;
    }
  }
  return "—";
}

/**
 * Tela 4 — Editor inline. Página 1 é a CAPA (faixa do título + produtos); as
 * demais são páginas internas. Preview do esboço + auditoria + acabamento 3D.
 * Implementa o mockup ux-design-directions.html linhas 1408-1773, fiel ao
 * encarte MSC real (correção David, 2026-05-22).
 */
export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const { setStepper, resetStepper } = useOutletContext<AppLayoutContext>();

  const catalogQuery = useCatalog(id);
  const catalog = catalogQuery.data ?? null;
  const piecesQuery = useCatalogPieces(catalog ? catalog.id : undefined);
  const pieces = useMemo(() => piecesQuery.data ?? [], [piecesQuery.data]);

  const termTemplatesQuery = useTermTemplates();
  const termTemplates = termTemplatesQuery.data ?? [];

  const removePiece = useRemovePiece();
  const updateCatalogSpec = useUpdateCatalogSpec();

  /* ---- Campaign spec (parsed, locally editable for the phrases panel) ---- */
  const [spec, setSpec] = useState<CampaignSpec | null>(null);
  const [seededSpec, setSeededSpec] = useState<CampaignSpec | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [specSeededFor, setSpecSeededFor] = useState<string | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Seed the local spec from the catalog (render-phase adjustment).
  if (catalog && catalog.id !== specSeededFor) {
    setSpecSeededFor(catalog.id);
    const parsed = campaignSpecSchema.safeParse(catalog.campaign_spec);
    const seeded = parsed.success ? parsed.data : null;
    setSpec(seeded);
    setSeededSpec(seeded);
  }

  /* ---- Pages (cover + product pages) + selection ---- */
  const editorPages = useMemo(() => buildEditorPages(pieces), [pieces]);
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [showRenderNotice, setShowRenderNotice] = useState(false);

  const safePageIndex = Math.min(pageIndex, editorPages.length - 1);
  const currentPage = editorPages[safePageIndex];
  const isCover = currentPage?.kind === "cover";
  const currentPagePieces = currentPage?.pieces ?? [];

  const selectedPiece =
    currentPagePieces.find((p) => p.id === selectedPieceId) ?? null;

  /* ---- Stepper ---- */
  useEffect(() => {
    if (!catalog) return;
    const pageLabel = isCover
      ? "Capa"
      : `Página ${safePageIndex + 1} de ${editorPages.length}`;
    setStepper({
      currentStep: 3,
      stepSubtitles: {
        2: `${pieces.length} selecionados`,
        3: pageLabel,
      },
    });
    return () => resetStepper();
  }, [
    catalog,
    pieces.length,
    safePageIndex,
    editorPages.length,
    isCover,
    setStepper,
    resetStepper,
  ]);

  /* ---- Debounced spec save (phrases panel) ---- */
  useEffect(() => {
    if (!spec || !catalog) return;
    if (spec === seededSpec) return; // freshly seeded — nothing to save yet
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSaveState("saving");
      void updateCatalogSpec
        .mutateAsync({ catalogId: catalog.id, spec })
        .then((result) => setSaveState(result.ok ? "saved" : "idle"));
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec]);

  const handleSelect = useCallback((pieceId: string) => {
    setSelectedPieceId((current) => (current === pieceId ? null : pieceId));
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedPiece || !catalog) return;
    removePiece.mutate({ pieceId: selectedPiece.id, catalogId: catalog.id });
    setSelectedPieceId(null);
  }, [selectedPiece, catalog, removePiece]);

  const goToPage = useCallback((index: number) => {
    setPageIndex(index);
    setSelectedPieceId(null);
  }, []);

  /* ---- Loading / not-found ---- */
  if (catalogQuery.isLoading) {
    return (
      <div className="text-sm text-muted-foreground">
        Carregando o editor…
      </div>
    );
  }
  if (catalogQuery.isError || !catalog) {
    return (
      <Card className="mx-auto mt-12 max-w-md p-8 text-center">
        <h1 className="mb-2 text-xl font-semibold">Catálogo não encontrado</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Esse catálogo não existe ou você não tem acesso.
        </p>
        <Link to="/" className={cn(buttonVariants({ variant: "secondary" }))}>
          ← Voltar para a página inicial
        </Link>
      </Card>
    );
  }

  /* ---- Derived ---- */
  const productPageCount = editorPages.length - 1;
  const costEstimate = editorPages.length * CUSTO_RENDER_BRL;
  const positionLabel = selectedPiece
    ? buildPositionLabel(currentPagePieces, selectedPiece.id)
    : "—";
  const currentArtUrl =
    currentPagePieces.find((p) => p.render_url)?.render_url ?? null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 text-xs text-muted-foreground">
            <Link to="/" className="text-primary hover:underline">
              Início
            </Link>{" "}
            · {catalog.name} · <span>Editor</span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            Editor &amp; Preview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Veja a capa e as páginas, ajuste tamanho e preço. Selecione um
            produto pra editar.
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {saveState === "saving" && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Salvando…
            </span>
          )}
          {saveState === "saved" && (
            <span className="flex items-center gap-1 text-[11px] text-success">
              <Check className="h-3 w-3" />
              Salvo agora
            </span>
          )}
          <Button
            variant="secondary"
            disabled
            title="Modo apresentação chega na próxima etapa"
          >
            Modo apresentação
          </Button>
          <Button disabled title="A exportação é a próxima etapa do catálogo">
            Exportar
          </Button>
        </div>
      </header>

      {/* Custo agregado + estado */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="border-border text-xs font-normal">
          📄 Catálogo: 1 capa
          {productPageCount > 0
            ? ` + ${productPageCount} ${
                productPageCount === 1 ? "página" : "páginas"
              } de produtos`
            : ""}{" "}
          ({pieces.length} produtos)
        </Badge>
        <Badge className="text-xs font-normal">
          💰 Custo estimado se gerar agora: {brl.format(costEstimate)}
        </Badge>
      </div>

      {/* Legenda das 3 zonas */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#e8e8ee] px-3 py-1 text-muted-foreground">
          🔒 Cinza: marca MSC (não mexe)
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#fef3c7] px-3 py-1 text-[#78350f]">
          📋 Amarelo: frases prontas (dá pra ajustar números)
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-white px-3 py-1">
          🎨 Branco: arte livre (mexe à vontade)
        </span>
      </div>

      {/* Status bar: esboço pronto + gerar arte final */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#fcd34d] bg-[#fef3c7] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">📐</span>
          <div>
            <strong className="text-[13px] text-[#78350f]">
              Esboço pronto! Agora a IA dá o acabamento 3D premium.
            </strong>
            <p className="mt-0.5 text-xs text-[#78350f]">
              Demora uns 3 minutos. Custa cerca de {brl.format(CUSTO_RENDER_BRL)}{" "}
              por página. Vai e pega um café — a gente te chama quando ficar
              pronto.
            </p>
          </div>
        </div>
        <Button
          size="lg"
          className="whitespace-nowrap"
          onClick={() => setShowRenderNotice(true)}
        >
          ✨ Gerar arte final
        </Button>
      </div>

      {showRenderNotice && (
        <div className="rounded-md border border-primary/30 bg-secondary px-4 py-3 text-sm text-foreground">
          <strong>Falta um passo pra ligar a geração 3D.</strong> O render usa o
          gpt-image (cada página leva ~3 min) e precisa do plano{" "}
          <strong>Supabase Pro</strong> — no plano grátis a função desliga antes
          de terminar. Quando você ativar o Pro, me avise que eu ligo o botão e
          a arte final passa a ser gerada de verdade.
        </div>
      )}

      {/* Navegação entre páginas */}
      {editorPages.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="mr-1 text-muted-foreground">Página:</span>
          {editorPages.map((page, i) => (
            <Button
              key={i}
              size="sm"
              variant={i === safePageIndex ? "default" : "ghost"}
              onClick={() => goToPage(i)}
            >
              {page.kind === "cover" ? "🖼️ Capa" : `Pág. ${i + 1}`}
              {i === safePageIndex ? " (atual)" : ""}
            </Button>
          ))}
        </div>
      )}

      {/* Editor grid: esboço editável | arte final */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Coluna esquerda: esboço / capa */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold">
              {isCover
                ? "🖼️ Capa do catálogo (editável)"
                : `📐 Página ${safePageIndex + 1} (editável)`}
            </h3>
            <Badge variant="secondary">
              {currentPagePieces.length}{" "}
              {currentPagePieces.length === 1 ? "produto" : "produtos"}
            </Badge>
          </div>

          {/* Barra de ferramentas do produto selecionado */}
          <div className="mb-2 flex flex-wrap items-center gap-1 rounded-md border border-border bg-white p-1.5 text-xs">
            {selectedPiece ? (
              <>
                <span className="px-1 font-medium text-muted-foreground">
                  {selectedPiece.product?.name ?? "Produto"}:
                </span>
                <button
                  type="button"
                  disabled
                  title="Troca de foto chega na próxima entrega"
                  className="cursor-not-allowed rounded px-2 py-1 opacity-50"
                >
                  📷 Trocar foto
                </button>
                <button
                  type="button"
                  disabled
                  title="Use o painel “Tamanho do card” abaixo"
                  className="cursor-not-allowed rounded px-2 py-1 opacity-50"
                >
                  📏 Tamanho
                </button>
                <button
                  type="button"
                  disabled
                  title="Arrastar pra mover chega na próxima entrega"
                  className="cursor-not-allowed rounded px-2 py-1 opacity-50"
                >
                  ↔ Mover
                </button>
                <span className="mx-1 h-4 w-px bg-border" />
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  disabled={removePiece.isPending}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </button>
              </>
            ) : (
              <span className="px-1 text-muted-foreground">
                Clique num produto do esboço pra mexer nele.
              </span>
            )}
          </div>

          {isCover ? (
            spec ? (
              <EditorCover
                spec={spec}
                termTemplates={termTemplates}
                pieces={currentPagePieces}
                pageCount={editorPages.length}
                selectedPieceId={selectedPieceId}
                onSelectPiece={handleSelect}
              />
            ) : (
              <div
                className="flex items-center justify-center rounded-xl border border-dashed border-border bg-muted text-center text-sm text-muted-foreground"
                style={{ aspectRatio: "748 / 862" }}
              >
                Não foi possível ler os dados da capa dessa campanha.
              </div>
            )
          ) : (
            <EditorSketch
              pieces={currentPagePieces}
              pageNumber={safePageIndex + 1}
              pageCount={editorPages.length}
              selectedPieceId={selectedPieceId}
              onSelectPiece={handleSelect}
            />
          )}

          {selectedPiece && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-[11px] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
              Selecionado:{" "}
              <strong>{selectedPiece.product?.name ?? "Produto"}</strong>
              <span className="text-muted-foreground">
                · Zona criativa (mexe à vontade)
              </span>
            </div>
          )}

          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            {isCover ? (
              <>
                💡 <strong>Essa é a capa — a primeira página do catálogo.</strong>{" "}
                O título e o selo vêm do Briefing; os produtos abaixo são os
                primeiros da sua seleção. A IA dá o acabamento 3D em cima desse
                esboço.
              </>
            ) : (
              <>
                💡 <strong>Tudo que vai aparecer na peça final está aqui no
                esboço.</strong>{" "}
                Textos, preços, selos, faixas MSC. A IA só vai dar acabamento 3D
                — não escreve nem inventa nada.
              </>
            )}
          </p>
        </div>

        {/* Coluna direita: arte final */}
        <FinalArtViewer artUrl={currentArtUrl} isGenerating={false} />
      </div>

      {/* Painéis de propriedades + auditoria */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {selectedPiece ? (
          <SelectedElementPanel
            piece={selectedPiece}
            catalogId={catalog.id}
            positionLabel={positionLabel}
          />
        ) : isCover ? (
          <CoverInfoPanel spec={spec} />
        ) : (
          <SelectedElementPanel
            piece={null}
            catalogId={catalog.id}
            positionLabel="—"
          />
        )}
        <EditorReadyPhrases spec={spec} onChange={setSpec} />
        <PriceAuditPanel pieces={pieces} />
      </div>
    </div>
  );
}
