import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  useDistinctBrands,
  useDistinctGroups,
  useDistinctSubgroups,
} from "@/lib/queries/products";
import { useLastSyncRun, useTriggerSync } from "@/lib/queries/sync";

/**
 * Native select styled to match the Input — kept inline so we don't ship
 * a generic Select component (out of scope for Phase 4d).
 */
function NativeSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-sm ring-offset-background",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

/**
 * 6 filter controls + a "Limpar filtros" reset + a sync button.
 * All filter state is URL-backed via useSearchParams. The search input is
 * debounced 300ms before pushing into the URL.
 */
export function FiltersBar() {
  const [searchParams, setSearchParams] = useSearchParams();

  const qFromUrl = searchParams.get("q") ?? "";
  const grupo = searchParams.get("grupo") ?? "";
  const subgrupo = searchParams.get("subgrupo") ?? "";
  const marca = searchParams.get("marca") ?? "";
  const foto = (searchParams.get("foto") as "com" | "sem" | "todas" | "") || "";

  const [qLocal, setQLocal] = useState(qFromUrl);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local q in sync if URL changes externally (e.g., "Limpar filtros").
  useEffect(() => {
    setQLocal(qFromUrl);
  }, [qFromUrl]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (qLocal === qFromUrl) return;
    debounceRef.current = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (qLocal) next.set("q", qLocal);
      else next.delete("q");
      setSearchParams(next, { replace: true });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qLocal]);

  const groupsQuery = useDistinctGroups();
  const subgroupsQuery = useDistinctSubgroups(grupo || undefined);
  const brandsQuery = useDistinctBrands(
    grupo || undefined,
    subgrupo || undefined,
  );

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);

    // Cascading: if the parent changes, clear children that no longer apply.
    if (key === "grupo") {
      next.delete("subgrupo");
      next.delete("marca");
    } else if (key === "subgrupo") {
      next.delete("marca");
    }

    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("q");
    next.delete("grupo");
    next.delete("subgrupo");
    next.delete("marca");
    next.delete("foto");
    setSearchParams(next, { replace: true });
    setQLocal("");
  };

  /* ------------- Sync button ------------- */

  const lastSyncQuery = useLastSyncRun();
  const triggerSync = useTriggerSync();
  const lastSync = lastSyncQuery.data;
  const status = lastSync?.status ?? null;

  // Show "✓ Sincronizado" for ~30s after a successful sync.
  const [justSucceeded, setJustSucceeded] = useState(false);
  const prevStatusRef = useRef<typeof status>(null);
  useEffect(() => {
    if (prevStatusRef.current === "running" && status === "success") {
      setJustSucceeded(true);
      const t = setTimeout(() => setJustSucceeded(false), 30_000);
      return () => clearTimeout(t);
    }
    prevStatusRef.current = status;
  }, [status]);

  const [feedback, setFeedback] = useState<string | null>(null);
  const isRunning = status === "running" || triggerSync.isPending;

  let syncLabel = "Sincronizar";
  if (isRunning) syncLabel = "Sincronizando...";
  else if (justSucceeded) syncLabel = "Sincronizado";
  else if (status === "failed") syncLabel = "Tentar de novo";

  const handleSync = () => {
    setFeedback(null);
    triggerSync.mutate(undefined, {
      onSuccess: (result) => {
        if (result.ok) {
          setFeedback(
            "Sincronização iniciada. Pode levar 1-2 minutos.",
          );
        } else {
          setFeedback(result.error.message);
        }
      },
    });
  };

  const lastSyncText = (() => {
    if (!lastSync?.completed_at) return null;
    try {
      const date = new Date(lastSync.completed_at);
      const rel = formatDistanceToNow(date, { addSuffix: false, locale: ptBR });
      return `Última sync: há ${rel}`;
    } catch {
      return null;
    }
  })();

  return (
    <section className="mb-4">
      <div className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-background p-3">
        {/* 1. Buscar produto */}
        <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <Label className="text-xs">Buscar produto</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={qLocal}
              onChange={(e) => setQLocal(e.target.value)}
              placeholder="redmi, geladeira, sofá..."
              className="h-9 pl-8"
            />
          </div>
        </div>

        {/* 2. Grupo */}
        <div className="flex w-[170px] flex-col gap-1.5">
          <Label className="text-xs">Grupo</Label>
          <NativeSelect
            value={grupo}
            onChange={(v) => setParam("grupo", v)}
            options={groupsQuery.data ?? []}
            placeholder="Todos"
            disabled={groupsQuery.isLoading}
          />
        </div>

        {/* 3. Subgrupo */}
        <div className="flex w-[170px] flex-col gap-1.5">
          <Label className="text-xs">Subgrupo</Label>
          <NativeSelect
            value={subgrupo}
            onChange={(v) => setParam("subgrupo", v)}
            options={subgroupsQuery.data ?? []}
            placeholder="Todos"
            disabled={subgroupsQuery.isLoading}
          />
        </div>

        {/* 4. Marca */}
        <div className="flex w-[160px] flex-col gap-1.5">
          <Label className="text-xs">Marca</Label>
          <NativeSelect
            value={marca}
            onChange={(v) => setParam("marca", v)}
            options={brandsQuery.data ?? []}
            placeholder="Todas"
            disabled={brandsQuery.isLoading}
          />
        </div>

        {/* 5. Foto */}
        <div className="flex w-[130px] flex-col gap-1.5">
          <Label className="text-xs">Foto</Label>
          <select
            value={foto}
            onChange={(e) => setParam("foto", e.target.value)}
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            <option value="">Todas</option>
            <option value="com">Com foto</option>
            <option value="sem">Sem foto</option>
          </select>
        </div>

        {/* 6. Limpar filtros */}
        <Button
          variant="secondary"
          onClick={clearFilters}
          className="h-9 px-3 text-xs"
        >
          Limpar filtros
        </Button>

        {/* 7. Sync Terasoft */}
        <Button
          variant="outline"
          onClick={handleSync}
          disabled={isRunning}
          className="h-9 gap-1.5 px-3 text-xs"
          title="Atualiza produtos da Terasoft"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", isRunning && "animate-spin")}
          />
          {syncLabel}
        </Button>
      </div>

      {lastSyncText ? (
        <p className="mt-2 text-xs text-muted-foreground">{lastSyncText}</p>
      ) : null}
      {feedback ? (
        <p className="mt-1 text-xs text-muted-foreground">{feedback}</p>
      ) : null}
    </section>
  );
}
