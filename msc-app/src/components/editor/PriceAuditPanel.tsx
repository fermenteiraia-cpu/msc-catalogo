import type { PieceWithProduct } from "@/lib/queries/pieces";
import { Badge } from "@/components/ui/badge";

interface PriceAuditPanelProps {
  /** Every piece in the catalog (not just the open page). */
  pieces: PieceWithProduct[];
}

/**
 * Editor — painel "🔒 Conferência dos preços" (mockup Tela 4, linhas
 * 1758-1768). Resumo de auditoria pré-render: total de produtos, quantos
 * batem com o estoque da Terasoft e quantos tiveram preço ajustado na mão.
 */
export function PriceAuditPanel({ pieces }: PriceAuditPanelProps) {
  const total = pieces.length;

  // "Batem com o estoque": tem produto resolvido e não está indisponível.
  const mismatches = pieces.filter(
    (p) => p.product === null || p.product.is_available === false,
  ).length;

  // "Você ajustou na mão": peças com preço sobrescrito manualmente.
  const manualOverrides = pieces.filter(
    (p) => p.preco_final_override !== null,
  ).length;

  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <h3 className="text-sm font-semibold">🔒 Conferência dos preços</h3>
      <small className="text-xs text-muted-foreground">
        Pra Marcos não pegar erro depois
      </small>

      <div className="mt-4 flex flex-col gap-1 text-xs">
        <div className="flex justify-between">
          <span>Produtos no catálogo</span>
          <strong>{total}</strong>
        </div>
        <div className="flex justify-between">
          <span>Batem com o estoque</span>
          {mismatches === 0 ? (
            <span className="font-medium text-success">✓ todos</span>
          ) : (
            <span className="font-medium text-destructive">
              {mismatches}{" "}
              {mismatches === 1 ? "para conferir" : "para conferir"}
            </span>
          )}
        </div>
        <div className="flex justify-between">
          <span>Você ajustou na mão</span>
          <strong>{manualOverrides}</strong>
        </div>
        <div className="mt-1 flex justify-between border-t border-border pt-1.5">
          <span>Conferência final</span>
          <Badge variant="secondary" className="text-[9px]">
            depois da IA
          </Badge>
        </div>
      </div>
    </div>
  );
}
