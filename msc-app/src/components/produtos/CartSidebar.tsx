import { Badge } from "@/components/ui/badge";
import { CartItem } from "@/components/produtos/CartItem";
import { useCatalogPieces } from "@/lib/queries/pieces";

interface CartSidebarProps {
  catalogId: string;
}

/**
 * Right column persistent cart. Header (selected count), ordered list of
 * selected pieces, footer.
 *
 * NOTE (David, 2026-05-20): BulkActions moved out of this sidebar to the main
 * area (between filters and the table). ⭐ "destaques" removed entirely from
 * this screen — decision deferred to the post-render screen.
 */
export function CartSidebar({ catalogId }: CartSidebarProps) {
  const piecesQuery = useCatalogPieces(catalogId);
  const pieces = piecesQuery.data ?? [];

  return (
    <aside className="sticky top-4 flex max-h-[calc(100vh-100px)] w-full flex-col self-start overflow-hidden rounded-lg border bg-card">
      {/* Header */}
      <div className="bg-primary p-3 text-primary-foreground">
        <div className="flex items-center justify-between">
          <strong className="text-sm">🛒 Seus produtos</strong>
          <Badge variant="secondary" className="text-[10px]">
            {pieces.length}{" "}
            {pieces.length === 1 ? "selecionado" : "selecionados"}
          </Badge>
        </div>
      </div>

      {/* Pieces list */}
      <div className="flex-1 overflow-y-auto p-2">
        {pieces.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            Nenhum produto selecionado ainda. Use a lista à esquerda.
          </p>
        ) : (
          <>
            <div className="px-1.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Ordem de escolha
            </div>
            {pieces.map((piece) => (
              <CartItem key={piece.id} piece={piece} catalogId={catalogId} />
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-secondary p-2 text-xs text-muted-foreground">
        💡 Use o botão ✕ pra remover um produto da lista.
      </div>
    </aside>
  );
}
