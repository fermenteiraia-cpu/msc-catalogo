import { useState } from "react";

import { CatalogGrid } from "@/components/home/CatalogGrid";
import { CatalogTabs } from "@/components/home/CatalogTabs";
import { ContinueCard } from "@/components/home/ContinueCard";
import { HomeHeader } from "@/components/home/HomeHeader";
import {
  useCatalogsList,
  useLastDraftCatalog,
  type CatalogFilter,
} from "@/lib/queries/catalogs";

/**
 * Tela 1 — Home / Lista de catálogos.
 * Mirrors ux-design-directions.html lines 542-684.
 *
 * Owns the active tab filter; everything else is composed from the
 * `home/` components and the `queries/catalogs` hooks.
 */
export function HomePage() {
  const [filter, setFilter] = useState<CatalogFilter>("todas");

  const listQuery = useCatalogsList(filter);
  const lastDraftQuery = useLastDraftCatalog();

  const catalogs = listQuery.data ?? [];
  const continueDraftId = lastDraftQuery.data?.id ?? null;

  return (
    <div className="space-y-6">
      <HomeHeader />
      <ContinueCard />
      <div className="space-y-4">
        <CatalogTabs active={filter} onChange={setFilter} />
        <CatalogGrid
          catalogs={catalogs}
          continueDraftId={continueDraftId}
          isLoading={listQuery.isLoading}
        />
      </div>
    </div>
  );
}
