import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

import { buttonVariants } from "@/components/ui/button";
import { useLastDraftCatalog, type CatalogSummary } from "@/lib/queries/catalogs";
import { cn } from "@/lib/utils";

/**
 * Builds the descriptive line for the continue card.
 * Mockup line 609 reference; copy adapted to real data (pieceCount + time).
 */
function describeDraft(draft: CatalogSummary): string {
  const editedAt = formatDistanceToNow(new Date(draft.updated_at), {
    addSuffix: true,
    locale: ptBR,
  });

  if (draft.pieceCount === 0) {
    return `Briefing definido, nenhum produto selecionado ainda. Editado ${editedAt}.`;
  }

  const noun = draft.pieceCount === 1 ? "produto selecionado" : "produtos selecionados";
  return `Você tem ${draft.pieceCount} ${noun}. Editado ${editedAt}.`;
}

/**
 * "Continue de onde você parou" card — mockup lines 604-612.
 * Renders nothing when there is no draft catalog.
 */
export function ContinueCard() {
  const draftQuery = useLastDraftCatalog();
  const draft = draftQuery.data ?? null;

  if (!draft) return null;

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-gradient-to-br from-primary to-primary/80 px-6 py-5 text-white">
      <div className="min-w-0">
        <div className="mb-1 text-xs opacity-80">
          📌 Continue de onde você parou
        </div>
        <div className="mb-1 truncate text-lg font-semibold">{draft.name}</div>
        <div className="text-[13px] opacity-85">{describeDraft(draft)}</div>
      </div>
      <Link
        to={`/catalogos/${draft.id}/produtos`}
        className={cn(
          buttonVariants({ variant: "default" }),
          "flex-shrink-0 bg-white text-primary hover:bg-white/90",
        )}
      >
        Continuar →
      </Link>
    </div>
  );
}
