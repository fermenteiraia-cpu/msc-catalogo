import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

/**
 * Product row shape used across the produtos screen.
 * Matches the public.products columns we actually read in the UI.
 */
export interface ProductRow {
  id: string;
  terasoft_code: string;
  name: string;
  grupo: string | null;
  subgrupo: string | null;
  brand: string | null;
  category: string | null;
  price_cash: number | null;
  image_url: string | null;
  is_available: boolean | null;
}

export type FotoFilter = "com" | "sem" | "todas";

export interface ProductFilters {
  q?: string;
  grupo?: string;
  subgrupo?: string;
  marca?: string;
  foto?: FotoFilter;
}

/**
 * Sanitize free-text search before pushing into Postgres ilike.
 * Strips PostgREST-meaningful characters and collapses whitespace.
 */
export function sanitizeQ(raw: string): string {
  return raw
    .replace(/[%,()*]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

// Distinct values change only when a Terasoft sync brings new data.
// useInvalidateProductsOnSyncSuccess (in queries/sync.ts) invalidates these
// keys when a run finishes, so Infinity is safe here.
interface GrupoRow {
  grupo: string | null;
}
interface SubgrupoRow {
  subgrupo: string | null;
}
interface BrandRow {
  brand: string | null;
}

/**
 * Distinct grupos across the tenant's products. Sorted alphabetically.
 */
export function useDistinctGroups() {
  return useQuery({
    queryKey: ["product-distinct-groups"],
    staleTime: Infinity,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("grupo")
        .not("grupo", "is", null)
        .limit(5000);

      if (error) throw new Error(error.message);

      const rows = (data ?? []) as unknown as GrupoRow[];
      const set = new Set<string>();
      for (const row of rows) {
        if (row.grupo) set.add(row.grupo);
      }
      return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
    },
  });
}

/**
 * Distinct subgrupos. When `grupo` is provided, scoped to that grupo;
 * otherwise returns ALL subgrupos for the tenant.
 */
export function useDistinctSubgroups(grupo?: string) {
  return useQuery({
    queryKey: ["product-distinct-subgroups", grupo ?? null],
    staleTime: Infinity,
    queryFn: async (): Promise<string[]> => {
      let query = supabase
        .from("products")
        .select("subgrupo")
        .not("subgrupo", "is", null)
        .limit(5000);

      if (grupo) {
        query = query.eq("grupo", grupo);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const rows = (data ?? []) as unknown as SubgrupoRow[];
      const set = new Set<string>();
      for (const row of rows) {
        if (row.subgrupo) set.add(row.subgrupo);
      }
      return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
    },
  });
}

/**
 * Distinct brands, cascading from optional grupo + subgrupo filters.
 */
export function useDistinctBrands(grupo?: string, subgrupo?: string) {
  return useQuery({
    queryKey: ["product-distinct-brands", grupo ?? null, subgrupo ?? null],
    staleTime: Infinity,
    queryFn: async (): Promise<string[]> => {
      let query = supabase
        .from("products")
        .select("brand")
        .not("brand", "is", null)
        .limit(5000);

      if (grupo) query = query.eq("grupo", grupo);
      if (subgrupo) query = query.eq("subgrupo", subgrupo);

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const rows = (data ?? []) as unknown as BrandRow[];
      const set = new Set<string>();
      for (const row of rows) {
        if (row.brand) set.add(row.brand);
      }
      return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
    },
  });
}

export interface ProductsListResult {
  products: ProductRow[];
  totalCount: number;
}

/**
 * Paginated-but-capped products list (MVP-1: hard limit 100, no pagination).
 *
 * Returns the rows AND the unfiltered-by-limit total count, so the UI can
 * say "Mostrando 100 de 451".
 */
export function useProductsList(filters: ProductFilters) {
  return useQuery({
    queryKey: ["products-list", filters],
    queryFn: async (): Promise<ProductsListResult> => {
      const cleanQ = filters.q ? sanitizeQ(filters.q) : "";

      // 1) total count (head only)
      let countQuery = supabase
        .from("products")
        .select("id", { count: "exact", head: true });

      if (cleanQ) {
        countQuery = countQuery.or(
          `name.ilike.%${cleanQ}%,terasoft_code.ilike.%${cleanQ}%`,
        );
      }
      if (filters.grupo) countQuery = countQuery.eq("grupo", filters.grupo);
      if (filters.subgrupo)
        countQuery = countQuery.eq("subgrupo", filters.subgrupo);
      if (filters.marca) countQuery = countQuery.eq("brand", filters.marca);
      if (filters.foto === "com") {
        countQuery = countQuery.not("image_url", "is", null);
      } else if (filters.foto === "sem") {
        countQuery = countQuery.is("image_url", null);
      }

      const { count, error: countError } = await countQuery;
      if (countError) throw new Error(countError.message);

      // 2) page data (limit 100)
      let dataQuery = supabase
        .from("products")
        .select(
          "id,terasoft_code,name,grupo,subgrupo,brand,category,price_cash,image_url,is_available",
        );

      if (cleanQ) {
        dataQuery = dataQuery.or(
          `name.ilike.%${cleanQ}%,terasoft_code.ilike.%${cleanQ}%`,
        );
      }
      if (filters.grupo) dataQuery = dataQuery.eq("grupo", filters.grupo);
      if (filters.subgrupo)
        dataQuery = dataQuery.eq("subgrupo", filters.subgrupo);
      if (filters.marca) dataQuery = dataQuery.eq("brand", filters.marca);
      if (filters.foto === "com") {
        dataQuery = dataQuery.not("image_url", "is", null);
      } else if (filters.foto === "sem") {
        dataQuery = dataQuery.is("image_url", null);
      }

      const { data, error } = await dataQuery
        .order("name", { ascending: true })
        .limit(100);

      if (error) throw new Error(error.message);

      return {
        products: (data ?? []) as unknown as ProductRow[],
        totalCount: count ?? 0,
      };
    },
  });
}
