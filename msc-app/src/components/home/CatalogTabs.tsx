import { useCatalogCounts, type CatalogFilter } from "@/lib/queries/catalogs";
import { cn } from "@/lib/utils";

export interface CatalogTabsProps {
  /** Currently active filter (owned by HomePage). */
  active: CatalogFilter;
  /** Notifies HomePage of a tab change. */
  onChange: (filter: CatalogFilter) => void;
}

/**
 * "Suas campanhas" heading + filter tabs — mockup lines 615-622.
 * Tab state lives in HomePage; this component is presentational.
 */
export function CatalogTabs({ active, onChange }: CatalogTabsProps) {
  const countsQuery = useCatalogCounts();
  const counts = countsQuery.data;

  const tabs: ReadonlyArray<{ key: CatalogFilter; label: string }> = [
    { key: "todas", label: "Todas" },
    {
      key: "rascunho",
      label: `Rascunho (${counts?.rascunho ?? 0})`,
    },
    {
      key: "publicadas",
      label: `Publicadas (${counts?.publicadas ?? 0})`,
    },
  ];

  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-semibold text-foreground">
        Suas campanhas
      </h2>
      <div className="flex items-center gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
              active === tab.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
