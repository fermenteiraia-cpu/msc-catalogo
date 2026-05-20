import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBulkApplyPricing } from "@/lib/queries/pieces";

interface BulkActionsProps {
  catalogId: string;
  pieceCount: number;
}

/**
 * Aplica desconto + parcelas a TODAS as peças do catálogo de uma vez.
 *
 * Layout (David, 2026-05-20): linha única e compacta, ocupando só o espaço
 * necessário — antes era um banner vertical herdado do mockup, mas no slot
 * "abaixo dos filtros / acima da tabela" precisava ser mais discreto.
 */
export function BulkActions({ catalogId, pieceCount }: BulkActionsProps) {
  const bulkApply = useBulkApplyPricing();
  const [desconto, setDesconto] = useState<string>("");
  const [parcelas, setParcelas] = useState<string>("");
  const [feedback, setFeedback] = useState<
    { kind: "ok" | "err"; message: string } | null
  >(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (feedback?.kind === "ok") {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => setFeedback(null), 2500);
    }
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, [feedback]);

  const isDisabled = pieceCount === 0;

  const handleApply = () => {
    setFeedback(null);
    const descNum = Number(desconto);
    const parcNum = Number(parcelas);
    if (
      !Number.isFinite(descNum) ||
      descNum < 0 ||
      descNum > 100 ||
      !Number.isInteger(parcNum) ||
      parcNum < 1 ||
      parcNum > 24
    ) {
      setFeedback({
        kind: "err",
        message: "Desconto 0-100 e parcelas 1-24, por favor.",
      });
      return;
    }
    bulkApply.mutate(
      { catalogId, desconto_percent: descNum, parcelas: parcNum },
      {
        onSuccess: (result) => {
          if (result.ok) {
            setFeedback({ kind: "ok", message: "Aplicado" });
          } else {
            setFeedback({ kind: "err", message: result.error.message });
          }
        },
      },
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
      <span className="text-muted-foreground">Aplicar a todos os</span>
      <strong className="text-foreground">{pieceCount} produtos</strong>
      <span className="text-muted-foreground">: desconto de</span>

      <div className="flex items-center gap-0.5">
        <Input
          type="number"
          min={0}
          max={100}
          value={desconto}
          placeholder="30"
          onChange={(e) => setDesconto(e.target.value)}
          disabled={isDisabled}
          aria-label="Desconto em porcentagem"
          className="h-7 w-[58px] px-2 py-0 text-xs"
        />
        <span className="text-muted-foreground">%</span>
      </div>

      <span className="text-muted-foreground">e parcelar em</span>

      <div className="flex items-center gap-0.5">
        <Input
          type="number"
          min={1}
          max={24}
          value={parcelas}
          placeholder="10"
          onChange={(e) => setParcelas(e.target.value)}
          disabled={isDisabled}
          aria-label="Número de parcelas"
          className="h-7 w-[54px] px-2 py-0 text-xs"
        />
        <span className="text-muted-foreground">x</span>
      </div>

      <Button
        size="sm"
        onClick={handleApply}
        disabled={isDisabled || bulkApply.isPending}
        className="ml-1 h-7 px-4 text-xs"
      >
        {bulkApply.isPending
          ? "Aplicando..."
          : feedback?.kind === "ok"
            ? "✓ Aplicado"
            : "Aplicar"}
      </Button>

      {feedback?.kind === "err" ? (
        <span className="text-destructive">{feedback.message}</span>
      ) : null}
    </div>
  );
}
