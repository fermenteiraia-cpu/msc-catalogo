import { Home, LayoutGrid, History, Settings } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { useCatalogCounts } from "@/lib/queries/catalogs";
import { cn } from "@/lib/utils";

/**
 * Home-mode sidebar content: "Workspace" + "Recursos" nav blocks.
 * Mirrors ux-design-directions.html lines 554-573.
 *
 * Rendered as a content block by <Sidebar mode="home" />. The logo and the
 * user card are owned by Sidebar so they stay shared across both modes.
 */
export function HomeSidebar() {
  const countsQuery = useCatalogCounts();
  const counts = countsQuery.data;
  // Total catalog count for the "Campanhas" nav badge.
  const totalCampaigns =
    counts !== undefined ? counts.rascunho + counts.publicadas : 0;

  return (
    <nav className="flex flex-col gap-1">
      {/* Section: Workspace */}
      <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Workspace
      </div>

      {/* Início — active */}
      <Link
        to="/"
        className={cn(
          "flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium",
          "bg-primary/10 text-primary",
        )}
      >
        <Home className="h-4 w-4 flex-shrink-0" />
        Início
      </Link>

      {/* Campanhas — MVP-1: disabled */}
      <span
        title="Em breve"
        aria-disabled="true"
        className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-foreground opacity-50"
      >
        <LayoutGrid className="h-4 w-4 flex-shrink-0" />
        Campanhas
        <Badge variant="secondary" className="ml-auto px-1.5 py-0 text-[10px]">
          {totalCampaigns}
        </Badge>
      </span>

      {/* Histórico — MVP-1: disabled */}
      <span
        title="Em breve"
        aria-disabled="true"
        className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-foreground opacity-50"
      >
        <History className="h-4 w-4 flex-shrink-0" />
        Histórico
      </span>

      {/* Section: Recursos */}
      <div className="mt-4 px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Recursos
      </div>

      {/* Configurações — MVP-1: disabled */}
      <span
        title="Em breve"
        aria-disabled="true"
        className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-foreground opacity-50"
      >
        <Settings className="h-4 w-4 flex-shrink-0" />
        Configurações
      </span>
    </nav>
  );
}
