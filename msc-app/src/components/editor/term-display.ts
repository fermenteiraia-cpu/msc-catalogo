import type { CampaignSpec } from "@/lib/schemas/campaign-spec";
import { renderTermPattern, type TermTemplate } from "@/lib/queries/briefing";

interface TermItem {
  template_id: string;
  params: Record<string, unknown>;
}

/** Formata uma data ISO YYYY-MM-DD como DD/MM. */
function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return m && d ? `${d}/${m}` : iso;
}

/**
 * Resolve o texto final de uma frase pronta para exibição.
 *
 * O briefing por IA às vezes devolve `params` vazios — então preenchemos os
 * placeholders comuns com valores derivados: as datas saem do período da
 * campanha, e entrada/parcelas caem no padrão da casa MSC (1+9X = "até 10X").
 * Qualquer placeholder que ainda sobre é removido, pra nunca exibir `{cru}`.
 *
 * NOTA: o certo é a Edge Function `generate-briefing` preencher esses params
 * na origem — isto aqui é a malha de segurança da camada de exibição.
 */
export function resolveTermText(
  tpl: TermTemplate | undefined,
  item: TermItem,
  spec: CampaignSpec | null,
): string {
  if (!tpl) return item.template_id;

  const houseDefaults: Record<string, unknown> = { entrada: 1, parcelas: 9 };
  const periodDefaults: Record<string, unknown> = spec
    ? {
        start_date: shortDate(spec.period.start_date),
        end_date: shortDate(spec.period.end_date),
      }
    : {};

  const merged = { ...houseDefaults, ...periodDefaults, ...item.params };
  const text = renderTermPattern(tpl.pattern, merged);

  // Remove qualquer placeholder {ainda_aberto} e normaliza espaços.
  return text
    .replace(/\s*\{[^}]+\}\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
