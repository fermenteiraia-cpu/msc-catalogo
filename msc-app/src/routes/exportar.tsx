import { useEffect, useMemo } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";

import type { AppLayoutContext } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCatalog } from "@/lib/queries/catalogs";
import { useCatalogPieces } from "@/lib/queries/pieces";
import { buildEditorPages } from "@/components/editor/pages";
import { brl, pieceFinalPrice } from "@/lib/money";

/** Cartão de auditoria que só fica disponível depois do render 3D. */
function PendingAuditCard({
  icon,
  title,
  detail,
}: {
  icon: string;
  title: string;
  detail: string;
}) {
  return (
    <Card className="border-l-[3px] border-l-muted-foreground/40 p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <strong className="text-xs">
          {icon} {title}
        </strong>
        <Badge variant="secondary" className="text-[9px]">
          depois da arte 3D
        </Badge>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {detail}
      </p>
    </Card>
  );
}

/**
 * Tela 6 — Exportar (mockup ux-design-directions.html linhas 1824-2062).
 * Conferência final de preços + entregáveis. A auditoria de textos/visual e a
 * exportação dependem da arte 3D — que precisa do plano Supabase Pro —, então
 * essas partes ficam num estado "aguardando a arte final".
 */
export function ExportarPage() {
  const { id } = useParams<{ id: string }>();
  const { setStepper, resetStepper } = useOutletContext<AppLayoutContext>();

  const catalogQuery = useCatalog(id);
  const catalog = catalogQuery.data ?? null;
  const piecesQuery = useCatalogPieces(catalog ? catalog.id : undefined);
  const pieces = useMemo(() => piecesQuery.data ?? [], [piecesQuery.data]);

  useEffect(() => {
    if (!catalog) return;
    setStepper({
      currentStep: 4,
      stepSubtitles: { 2: `${pieces.length} selecionados`, 4: "Revisão de preços" },
    });
    return () => resetStepper();
  }, [catalog, pieces.length, setStepper, resetStepper]);

  const pageCount = useMemo(() => buildEditorPages(pieces).length, [pieces]);
  const manualOverrides = useMemo(
    () => pieces.filter((p) => p.preco_final_override !== null),
    [pieces],
  );
  const renderReady = pieces.some((p) => p.render_url);

  if (catalogQuery.isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Carregando…</div>
    );
  }
  if (catalogQuery.isError || !catalog) {
    return (
      <Card className="mx-auto mt-12 max-w-md p-8 text-center">
        <h1 className="mb-2 text-xl font-semibold">Catálogo não encontrado</h1>
        <Link to="/" className={cn(buttonVariants({ variant: "secondary" }))}>
          ← Voltar para a página inicial
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 text-xs text-muted-foreground">
            <Link to="/" className="text-primary hover:underline">
              Início
            </Link>{" "}
            · {catalog.name} · <span className="text-foreground">Exportar</span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            Pronto pra mandar pra gráfica?
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Última conferência de preços antes de gerar PDF + JPGs sociais +
            mini-site público.
          </p>
        </div>
        <Link
          to={`/catalogos/${catalog.id}/editor`}
          className={cn(buttonVariants({ variant: "secondary" }))}
        >
          ← Voltar ao editor
        </Link>
      </header>

      {/* Conferência final */}
      <section>
        <h2 className="mb-1 text-lg font-semibold">
          Conferência final dos preços e textos
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          A conferência de preços roda agora; a conferência dos textos e do
          visual roda depois que a arte 3D for gerada.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <PendingAuditCard
            icon="🔒"
            title="Textos obrigatórios"
            detail="Confere se a marca MSC e as frases prontas continuam intactas na arte gerada."
          />
          <PendingAuditCard
            icon="⛔"
            title="Textos proibidos"
            detail="Procura termos da lista negra que a IA possa ter inventado na arte."
          />

          {/* Card 3 — Preços (real, roda agora) */}
          <Card className="border-l-[3px] border-l-[hsl(var(--success))] p-3">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <strong className="text-xs">💰 Preços</strong>
              <Badge variant="success" className="text-[9px]">
                ✓ conferido
              </Badge>
            </div>
            <div className="text-[11px] leading-relaxed text-muted-foreground">
              <div>
                Produtos: <strong>{pieces.length}</strong>
              </div>
              <div>
                Ajustados na mão: <strong>{manualOverrides.length}</strong>
              </div>
              <div className="mt-1 text-[hsl(var(--success))]">
                {manualOverrides.length === 0
                  ? "Todos batem com o estoque"
                  : "Confira os preços ajustados na mão abaixo"}
              </div>
            </div>
          </Card>

          <PendingAuditCard
            icon="🎨"
            title="Visual"
            detail="Compara a arte 3D com o esboço aprovado pra ver se a IA não mudou nada."
          />
        </div>
      </section>

      {/* Alerta preços manuais */}
      {manualOverrides.length > 0 && (
        <div className="flex items-start gap-3 rounded-md border border-[#fcd34d] bg-[#fef3c7] p-4">
          <span className="text-lg">⚠</span>
          <div>
            <strong className="text-sm text-[#78350f]">
              {manualOverrides.length}{" "}
              {manualOverrides.length === 1
                ? "preço foi editado"
                : "preços foram editados"}{" "}
              na mão
            </strong>
            <p className="mt-0.5 text-xs text-[#78350f]">
              Confira na tabela abaixo (origem “Editado manual”) se esses preços
              estão certos antes de exportar.
            </p>
          </div>
        </div>
      )}

      {/* Tabela de auditoria */}
      <section>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs text-muted-foreground">
              <tr>
                <th className="w-14 px-3 py-2 text-left font-medium">Foto</th>
                <th className="px-3 py-2 text-left font-medium">Produto</th>
                <th className="w-32 px-3 py-2 text-right font-medium">
                  Preço Terasoft
                </th>
                <th className="w-20 px-3 py-2 text-right font-medium">
                  Desconto
                </th>
                <th className="w-32 px-3 py-2 text-right font-medium">
                  Preço final
                </th>
                <th className="w-28 px-3 py-2 text-left font-medium">Origem</th>
                <th className="w-16 px-3 py-2 text-center font-medium">OK?</th>
              </tr>
            </thead>
            <tbody>
              {pieces.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-6 text-center text-xs text-muted-foreground"
                  >
                    Nenhum produto no catálogo.
                  </td>
                </tr>
              )}
              {pieces.map((piece) => {
                const product = piece.product;
                const manual = piece.preco_final_override !== null;
                const finalPrice = pieceFinalPrice(piece);
                return (
                  <tr
                    key={piece.id}
                    className={cn(
                      "border-t border-border",
                      manual && "bg-[#fffbeb]",
                    )}
                  >
                    <td className="px-3 py-2">
                      {product?.image_url ? (
                        <img
                          src={product.image_url}
                          alt=""
                          loading="lazy"
                          className="h-9 w-9 rounded object-contain"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded bg-muted" />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">
                        {product?.name ?? "Produto sem nome"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Cód. {piece.product_codes[0] ?? "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {product?.price_cash != null
                        ? brl.format(product.price_cash)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {piece.desconto_percent > 0
                        ? `${piece.desconto_percent}%`
                        : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right font-semibold tabular-nums",
                        manual ? "text-[#b45309]" : "text-destructive",
                      )}
                    >
                      {finalPrice != null ? brl.format(finalPrice) : "—"}
                      {manual && " ⚠"}
                    </td>
                    <td className="px-3 py-2">
                      {manual ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Editado manual
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-[10px]">
                          Terasoft ✓
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {manual ? "⚠" : "✓"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Entregáveis */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Entregáveis que serão gerados
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-sm font-semibold">📄 Catálogo PDF</h3>
              <Badge variant="secondary" className="text-[10px]">
                {pageCount} {pageCount === 1 ? "página" : "páginas"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Pronto pra mandar pra gráfica. Tamanho A4, PDF padrão.
            </p>
          </Card>
          <Card className="p-4">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-sm font-semibold">📱 Peças sociais</h3>
              <Badge variant="secondary" className="text-[10px]">
                sob demanda
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Destaques em formatos para Instagram, Story, WhatsApp e TV.
            </p>
          </Card>
          <Card className="p-4">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-sm font-semibold">🌐 Mini-site público</h3>
              <Badge className="text-[10px]">Novo!</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Link compartilhável com QR Code:{" "}
              <code className="text-[11px]">/c/{catalog.slug}</code>
            </p>
          </Card>
        </div>
      </section>

      {/* Exportar — bloqueado até a arte 3D existir */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-secondary p-6">
        <div>
          <strong className="text-sm font-semibold">
            {renderReady ? "Tudo pronto" : "⚠ Falta gerar a arte 3D"}
          </strong>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {renderReady
              ? "A conferência de preços passou. Revise os textos antes de exportar."
              : "O catálogo só pode ser exportado depois que a arte final 3D for gerada no Editor."}
          </p>
        </div>
        <Button
          size="lg"
          disabled
          title="A exportação é liberada depois da geração da arte 3D"
          className="bg-muted text-muted-foreground"
        >
          🔒 Exportar (bloqueado)
        </Button>
      </div>
    </div>
  );
}
