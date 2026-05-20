import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { Card } from "@/components/ui/card";
import { ProductRow } from "@/components/produtos/ProductRow";
import {
  useProductsList,
  type FotoFilter,
  type ProductFilters,
} from "@/lib/queries/products";
import {
  useCatalogPieces,
  type PieceWithProduct,
} from "@/lib/queries/pieces";

interface ProductTableProps {
  catalogId: string;
}

/**
 * The dense product list (left column). Filters come from the URL search params.
 * Joins in-memory against the catalog's pieces to flag rows as selected and
 * surface position / desconto / parcelas / is_destaque.
 */
export function ProductTable({ catalogId }: ProductTableProps) {
  const [searchParams] = useSearchParams();

  const filters = useMemo<ProductFilters>(() => {
    const fotoRaw = searchParams.get("foto");
    const foto: FotoFilter | undefined =
      fotoRaw === "com" || fotoRaw === "sem" || fotoRaw === "todas"
        ? fotoRaw
        : undefined;
    return {
      q: searchParams.get("q") ?? undefined,
      grupo: searchParams.get("grupo") ?? undefined,
      subgrupo: searchParams.get("subgrupo") ?? undefined,
      marca: searchParams.get("marca") ?? undefined,
      foto,
    };
  }, [searchParams]);

  const listQuery = useProductsList(filters);
  const piecesQuery = useCatalogPieces(catalogId);

  const products = listQuery.data?.products ?? [];
  const totalCount = listQuery.data?.totalCount ?? 0;

  const codeToPiece = useMemo(() => {
    const map = new Map<string, PieceWithProduct>();
    for (const piece of piecesQuery.data ?? []) {
      for (const code of piece.product_codes) map.set(code, piece);
    }
    return map;
  }, [piecesQuery.data]);

  if (listQuery.isLoading) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        Carregando produtos...
      </Card>
    );
  }

  if (listQuery.isError) {
    return (
      <Card className="p-6 text-sm text-destructive">
        Erro ao carregar produtos. Tente recarregar a página.
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        Nenhum produto bate com esses filtros. Use 'Limpar filtros' acima.
      </Card>
    );
  }

  const selectedCount = piecesQuery.data?.length ?? 0;

  return (
    <div>
      {/* Header da seção (mockup linha 1060) — fica acima da tabela */}
      <h2 className="mb-2 text-sm font-semibold text-foreground">
        Catálogo Terasoft{" "}
        <span className="text-xs font-normal text-muted-foreground">
          ({totalCount} produtos batendo com seus filtros)
        </span>
      </h2>

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-muted/40">
            <tr className="border-b border-border">
              <th className="w-8 px-1 py-1.5 text-center text-[11px] font-semibold text-muted-foreground">
                #
              </th>
              <th className="w-9 px-1 py-1.5"></th>
              <th className="px-1.5 py-1.5 text-left text-[11px] font-semibold text-muted-foreground">
                Produto
              </th>
              <th className="w-[90px] px-1.5 py-1.5 text-left text-[11px] font-semibold text-muted-foreground">
                À vista
              </th>
              <th className="w-[80px] px-1.5 py-1.5 text-left text-[11px] font-semibold text-muted-foreground">
                Desconto
              </th>
              <th className="w-[68px] px-1.5 py-1.5 text-left text-[11px] font-semibold text-muted-foreground">
                Parc.
              </th>
              <th className="w-[90px] px-1.5 py-1.5 text-left text-[11px] font-semibold text-muted-foreground">
                Final
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const selectedPiece =
                codeToPiece.get(product.terasoft_code) ?? null;
              return (
                <ProductRow
                  key={product.id}
                  product={product}
                  selectedPiece={selectedPiece}
                  catalogId={catalogId}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Mostrando <strong>{products.length}</strong> de{" "}
        <strong>{totalCount}</strong> · Use os filtros pra refinar
        {selectedCount > 0 ? (
          <>
            {" "}· <strong>{selectedCount}</strong>{" "}
            {selectedCount === 1 ? "já está" : "já estão"} no seu carrinho à
            direita
          </>
        ) : null}
      </p>
    </div>
  );
}
