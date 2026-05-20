import { useEffect, useRef } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type Query,
} from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { err, ok, type AppError, type Result } from "@/lib/result";

/** Enum mirrored from the public.sync_runs table — never invent other values. */
export type SyncStatus = "running" | "success" | "failed";

export interface SyncRunRow {
  id: string;
  tenant_id: string;
  triggered_by: string | null;
  triggered_by_user_id: string | null;
  status: SyncStatus;
  products_synced: number | null;
  started_at: string | null;
  completed_at: string | null;
  github_run_id: string | null;
  github_run_url: string | null;
}

/**
 * Returns the most recent sync_runs row for the tenant.
 * Polls every 5s while status === 'running'; otherwise no polling.
 */
export function useLastSyncRun() {
  return useQuery({
    queryKey: ["last-sync-run"],
    queryFn: async (): Promise<SyncRunRow | null> => {
      const { data, error } = await supabase
        .from("sync_runs")
        .select(
          "id,tenant_id,triggered_by,triggered_by_user_id,status,products_synced,started_at,completed_at,github_run_id,github_run_url",
        )
        .order("started_at", { ascending: false })
        .limit(1);

      if (error) throw new Error(error.message);

      const rows = (data ?? []) as unknown as SyncRunRow[];
      return rows[0] ?? null;
    },
    refetchInterval: (query: Query<SyncRunRow | null>) =>
      query.state.data?.status === "running" ? 5000 : false,
  });
}

interface TriggerSyncResponse {
  ok: boolean;
  sync_run_id: string;
  message: string;
}

/**
 * Invokes the `trigger-sync` Supabase Edge Function. Invalidates the last
 * sync-run query on success so polling kicks in.
 */
export function useTriggerSync(): ReturnType<
  typeof useMutation<Result<TriggerSyncResponse, AppError>, never, void>
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<Result<TriggerSyncResponse, AppError>> => {
      const { data, error } = await supabase.functions.invoke<TriggerSyncResponse>(
        "trigger-sync",
        { method: "POST" },
      );

      if (error) {
        return err({
          code: "TRIGGER_SYNC_FAILED",
          message: "Falha ao iniciar sincronização. Tente de novo.",
          retryable: true,
          details: error,
        });
      }
      if (!data || !data.ok) {
        return err({
          code: "TRIGGER_SYNC_REJECTED",
          message: data?.message ?? "Não foi possível iniciar a sincronização.",
        });
      }
      return ok(data);
    },
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ["last-sync-run"] });
      }
    },
  });
}

/**
 * Side-effect hook: when the last sync run transitions running → success,
 * invalidate the products list so the table picks up freshly-synced rows.
 *
 * Mount once near the top of the produtos page.
 */
export function useInvalidateProductsOnSyncSuccess() {
  const { data } = useLastSyncRun();
  const queryClient = useQueryClient();
  const prevStatusRef = useRef<SyncStatus | null>(null);

  useEffect(() => {
    const prev = prevStatusRef.current;
    const next = data?.status ?? null;
    if (prev === "running" && next === "success") {
      queryClient.invalidateQueries({ queryKey: ["products-list"] });
    }
    prevStatusRef.current = next;
  }, [data?.status, queryClient]);
}
