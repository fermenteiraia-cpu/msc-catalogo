import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  extractPaletteColor,
  type CatalogStatus,
  type CatalogSummary,
} from "@/lib/queries/catalogs";
import { cn } from "@/lib/utils";

export interface CatalogCardProps {
  catalog: CatalogSummary;
  /** When true, the card gets the "Em andamento" highlight treatment. */
  isContinueDraft: boolean;
}

/** Portuguese label + Badge variant per catalog status (mockup lines 630, 643). */
const STATUS_META: Record<
  CatalogStatus,
  { label: string; variant: "default" | "secondary" | "success" | "outline" }
> = {
  draft: { label: "Rascunho", variant: "secondary" },
  generating: { label: "Gerando", variant: "outline" },
  ready: { label: "Pronto", variant: "default" },
  pending_approval: { label: "Aguardando aprovação", variant: "outline" },
  published: { label: "Publicada", variant: "success" },
  archived: { label: "Arquivada", variant: "outline" },
};

/**
 * One catalog card — mockup lines 625-637 (draft) / 638-648 (published).
 * The whole card navigates to the produtos screen (MVP-1 routing).
 */
export function CatalogCard({ catalog, isContinueDraft }: CatalogCardProps) {
  const navigate = useNavigate();
  const status = STATUS_META[catalog.status];

  // Preview gradient: use the campaign_spec palette color when present,
  // otherwise fall back to the MSC blue.
  const paletteColor = extractPaletteColor(catalog.campaign_spec);
  const previewStyle = paletteColor
    ? {
        backgroundImage: `linear-gradient(135deg, ${paletteColor}, ${paletteColor}b3)`,
      }
    : undefined;

  const goToCatalog = () => navigate(`/catalogos/${catalog.id}/produtos`);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={goToCatalog}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          goToCatalog();
        }
      }}
      className={cn(
        "cursor-pointer overflow-hidden transition-shadow hover:shadow-md",
        isContinueDraft &&
          "outline outline-2 -outline-offset-2 outline-primary",
      )}
    >
      {/* Preview area */}
      <div
        className={cn(
          "flex h-[120px] items-center justify-center px-4 text-center text-base font-bold uppercase text-white",
          !paletteColor && "bg-gradient-to-br from-primary to-primary/70",
        )}
        style={previewStyle}
      >
        {catalog.name}
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="truncate">{catalog.name}</span>
          {isContinueDraft && (
            <Badge variant="default" className="flex-shrink-0">
              Em andamento
            </Badge>
          )}
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Badge variant={status.variant}>{status.label}</Badge>
          <span>·</span>
          <CatalogMeta catalog={catalog} />
        </div>
      </div>
    </Card>
  );
}

/**
 * Status-dependent meta text:
 *   - draft     → "N produto(s) · Editado há {tempo}"
 *   - published → short Brazilian date (e.g. "30 abr")
 *   - other     → relative updated time
 */
function CatalogMeta({ catalog }: { catalog: CatalogSummary }) {
  if (catalog.status === "published") {
    const dateSource = catalog.published_at ?? catalog.updated_at;
    return (
      <span>{format(new Date(dateSource), "d MMM", { locale: ptBR })}</span>
    );
  }

  if (catalog.status === "draft") {
    const noun = catalog.pieceCount === 1 ? "produto" : "produtos";
    const editedAt = formatDistanceToNow(new Date(catalog.updated_at), {
      addSuffix: true,
      locale: ptBR,
    });
    return (
      <span>
        {catalog.pieceCount} {noun} · Editado {editedAt}
      </span>
    );
  }

  const editedAt = formatDistanceToNow(new Date(catalog.updated_at), {
    addSuffix: true,
    locale: ptBR,
  });
  return <span>Editado {editedAt}</span>;
}
