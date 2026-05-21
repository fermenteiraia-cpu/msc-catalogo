import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

/**
 * Catalog status enum mirrors the Postgres `catalog_status` type.
 */
export type CatalogStatus =
  | "draft"
  | "generating"
  | "ready"
  | "pending_approval"
  | "published"
  | "archived";

/**
 * Tab filter for the Home catalog list.
 */
export type CatalogFilter = "todas" | "rascunho" | "publicadas";

/**
 * Summary shape used by the Home screen cards. `campaign_spec` is left as
 * `unknown` on purpose — it is free-form jsonb and must be parsed defensively.
 */
export interface CatalogSummary {
  id: string;
  name: string;
  slug: string;
  status: CatalogStatus;
  theme_key: string | null;
  campaign_spec: unknown;
  updated_at: string;
  created_at: string;
  period_start: string | null;
  published_at: string | null;
  pieceCount: number;
}

/** Raw catalog row as selected from Supabase (no piece count yet). */
interface CatalogRow {
  id: string;
  name: string;
  slug: string;
  status: CatalogStatus;
  theme_key: string | null;
  campaign_spec: unknown;
  updated_at: string;
  created_at: string;
  period_start: string | null;
  published_at: string | null;
}

const CATALOG_COLUMNS =
  "id,name,slug,status,theme_key,campaign_spec,updated_at,created_at,period_start,published_at";

interface PieceCatalogIdRow {
  catalog_id: string;
}

/**
 * Fetches a count of pieces per catalog in a SINGLE batched query, then folds
 * the rows into a Map in memory. Avoids the N+1 of one query per catalog.
 */
async function fetchPieceCounts(
  catalogIds: ReadonlyArray<string>,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (catalogIds.length === 0) return counts;

  const { data, error } = await supabase
    .from("pieces")
    .select("catalog_id")
    .in("catalog_id", [...catalogIds]);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as PieceCatalogIdRow[];
  for (const row of rows) {
    counts.set(row.catalog_id, (counts.get(row.catalog_id) ?? 0) + 1);
  }
  return counts;
}

/**
 * Lists catalogs for the Home screen, ordered by most-recently-updated.
 * Each catalog is enriched with its piece count.
 */
export function useCatalogsList(filter: CatalogFilter) {
  return useQuery({
    queryKey: ["catalogs-list", filter],
    queryFn: async (): Promise<CatalogSummary[]> => {
      let query = supabase
        .from("catalogs")
        .select(CATALOG_COLUMNS)
        .order("updated_at", { ascending: false });

      if (filter === "rascunho") {
        query = query.eq("status", "draft");
      } else if (filter === "publicadas") {
        query = query.eq("status", "published");
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const rows = (data ?? []) as unknown as CatalogRow[];
      const counts = await fetchPieceCounts(rows.map((row) => row.id));

      return rows.map((row) => ({
        ...row,
        pieceCount: counts.get(row.id) ?? 0,
      }));
    },
  });
}

/**
 * Head-count of catalogs per status. Used by the header subtitle and tabs.
 */
export function useCatalogCounts() {
  return useQuery({
    queryKey: ["catalog-counts"],
    queryFn: async (): Promise<{ rascunho: number; publicadas: number }> => {
      const draftPromise = supabase
        .from("catalogs")
        .select("id", { count: "exact", head: true })
        .eq("status", "draft");

      const publishedPromise = supabase
        .from("catalogs")
        .select("id", { count: "exact", head: true })
        .eq("status", "published");

      const [draftResult, publishedResult] = await Promise.all([
        draftPromise,
        publishedPromise,
      ]);

      if (draftResult.error) throw new Error(draftResult.error.message);
      if (publishedResult.error) {
        throw new Error(publishedResult.error.message);
      }

      return {
        rascunho: draftResult.count ?? 0,
        publicadas: publishedResult.count ?? 0,
      };
    },
  });
}

/**
 * Returns the single most-recently-updated draft catalog, or null when the
 * tenant has no drafts. Includes its piece count.
 */
export function useLastDraftCatalog() {
  return useQuery({
    queryKey: ["last-draft-catalog"],
    queryFn: async (): Promise<CatalogSummary | null> => {
      const { data, error } = await supabase
        .from("catalogs")
        .select(CATALOG_COLUMNS)
        .eq("status", "draft")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);

      const row = (data as unknown as CatalogRow | null) ?? null;
      if (!row) return null;

      const counts = await fetchPieceCounts([row.id]);
      return { ...row, pieceCount: counts.get(row.id) ?? 0 };
    },
  });
}

/** Single catalog detail, used by the Produtos and Editor screens. */
export interface CatalogDetail {
  id: string;
  name: string;
  slug: string;
  status: CatalogStatus;
  theme_key: string | null;
  campaign_spec: unknown;
  updated_at: string;
}

/**
 * Fetches one catalog by id. Returns null when no row matches (so the page
 * can render a not-found state instead of throwing).
 */
export function useCatalog(id: string | undefined) {
  return useQuery({
    queryKey: ["catalog-detail", id ?? null],
    enabled: Boolean(id),
    queryFn: async (): Promise<CatalogDetail | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("catalogs")
        .select("id,name,slug,status,theme_key,campaign_spec,updated_at")
        .eq("id", id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return (data as unknown as CatalogDetail | null) ?? null;
    },
  });
}

/**
 * Defensively extracts a `creative.palette.primary` hex color from the
 * free-form `campaign_spec` jsonb. Returns null when absent or malformed.
 */
export function extractPaletteColor(spec: unknown): string | null {
  if (typeof spec !== "object" || spec === null) return null;
  const creative = (spec as Record<string, unknown>).creative;
  if (typeof creative !== "object" || creative === null) return null;
  const palette = (creative as Record<string, unknown>).palette;
  if (typeof palette !== "object" || palette === null) return null;
  const primary = (palette as Record<string, unknown>).primary;
  if (typeof primary !== "string") return null;
  const hex = primary.trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(hex) ? hex : null;
}
