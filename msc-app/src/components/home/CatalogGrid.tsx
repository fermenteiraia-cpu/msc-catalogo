import { CatalogCard } from "@/components/home/CatalogCard";
import { Card } from "@/components/ui/card";
import type { CatalogSummary } from "@/lib/queries/catalogs";

export interface CatalogGridProps {
  catalogs: CatalogSummary[];
  /** Id of the "continue" draft catalog, so its card gets the highlight. */
  continueDraftId: string | null;
  isLoading: boolean;
}

/** Three placeholder cards shown while the list query is in flight. */
function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="overflow-hidden">
          <div className="h-[120px] animate-pulse bg-muted" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </Card>
      ))}
    </div>
  );
}

/**
 * Responsive grid of catalog cards — mockup lines 624-682.
 * Handles loading (3 skeletons) and empty states.
 */
export function CatalogGrid({
  catalogs,
  continueDraftId,
  isLoading,
}: CatalogGridProps) {
  if (isLoading) {
    return <GridSkeleton />;
  }

  if (catalogs.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="text-sm text-muted-foreground">
          Você ainda não tem campanhas. Comece com &ldquo;Nova campanha&rdquo;
          acima.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {catalogs.map((catalog) => (
        <CatalogCard
          key={catalog.id}
          catalog={catalog}
          isContinueDraft={catalog.id === continueDraftId}
        />
      ))}
    </div>
  );
}
