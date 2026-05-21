import { useEffect, useMemo } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import type { AppLayoutContext } from "@/components/AppLayout";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BulkActions } from "@/components/produtos/BulkActions";
import { FiltersBar } from "@/components/produtos/FiltersBar";
import { ProductTable } from "@/components/produtos/ProductTable";
import { CartSidebar } from "@/components/produtos/CartSidebar";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useCatalogPieces } from "@/lib/queries/pieces";
import { useInvalidateProductsOnSyncSuccess } from "@/lib/queries/sync";

interface CatalogRow {
  id: string;
  name: string;
  slug: string;
}

/**
 * Fetches the catalog for the `:id` route param. Returns null when no row
 * matches (so the page can render the not-found state instead of throwing).
 */
function useCatalog(id: string | undefined) {
  return useQuery({
    queryKey: ["catalog", id ?? null],
    enabled: Boolean(id),
    queryFn: async (): Promise<CatalogRow | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("catalogs")
        .select("id,name,slug")
        .eq("id", id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return (data as unknown as CatalogRow | null) ?? null;
    },
  });
}

/**
 * Tela 3 — Seleção de produtos. Reads `:id` from the route, fetches the
 * catalog and its pieces, wires the stepper subtitle, and lays out the
 * filters + table + cart per the mockup (lines 977-1406).
 */
export function ProdutosPage() {
  const { id } = useParams<{ id: string }>();
  const { setStepper, resetStepper } = useOutletContext<AppLayoutContext>();

  const catalogQuery = useCatalog(id);
  const catalog = catalogQuery.data ?? null;
  const piecesQuery = useCatalogPieces(catalog ? catalog.id : undefined);
  const pieces = piecesQuery.data ?? [];

  // Side-effect: when a sync run finishes, refresh the products list.
  useInvalidateProductsOnSyncSuccess();

  // Compute the dynamic stepper subtitle.
  // ⭐ destaques removidos da Tela 3 (David, 2026-05-20): decisão movida pra
  // tela do catálogo pronto, depois do render IA.
  const dynamicSubtitle = useMemo(() => {
    const n = pieces.length;
    if (n === 0) return "Nenhum selecionado";
    if (n === 1) return "1 selecionado";
    return `${n} selecionados`;
  }, [pieces]);

  // Push state into the layout's stepper context.
  useEffect(() => {
    if (!catalog) return;
    setStepper({
      currentStep: 2,
      stepSubtitles: { 2: dynamicSubtitle },
    });
    return () => resetStepper();
  }, [catalog, dynamicSubtitle, setStepper, resetStepper]);

  /* ----------- Not-found / error states ----------- */

  if (catalogQuery.isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Carregando catálogo...</div>
    );
  }

  if (catalogQuery.isError || !catalog) {
    return (
      <Card className="mx-auto mt-12 max-w-md p-8 text-center">
        <h1 className="mb-2 text-xl font-semibold">Catálogo não encontrado</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {catalogQuery.isError
            ? "Erro ao carregar o catálogo. Tente novamente em instantes."
            : "Esse catálogo não existe ou você não tem acesso."}
        </p>
        <Link
          to="/"
          className={cn(buttonVariants({ variant: "secondary" }))}
        >
          ← Voltar para a página inicial
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 text-xs text-muted-foreground">
            <Link to="/" className="text-primary hover:underline">
              Início
            </Link>{" "}
            · {catalog.name} · <span>Produtos</span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            Selecionar produtos
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Filtre os produtos da Terasoft, escolha o que vai no catálogo e
            defina desconto + parcelamento.
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {/* Volta pra Home — a Tela de Detalhe do catálogo (4c) ainda não
              existe. Quando existir, este link passa a apontar pra ela. */}
          <Link
            to="/"
            className={cn(buttonVariants({ variant: "secondary" }))}
          >
            ← Voltar
          </Link>
          <Link
            to={`/catalogos/${catalog.id}/editor`}
            className={cn(buttonVariants({ variant: "default" }))}
          >
            Continuar pra preview →
          </Link>
        </div>
      </header>

      {/* Filtros */}
      <FiltersBar />

      {/* Bulk pricing — moved out of the cart (David, 2026-05-20): user wants
          desconto/parcelas right below the filters, before the table */}
      <BulkActions catalogId={catalog.id} pieceCount={pieces.length} />

      {/* Body: table + cart */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
        <ProductTable catalogId={catalog.id} />
        <CartSidebar catalogId={catalog.id} />
      </div>
    </div>
  );
}

