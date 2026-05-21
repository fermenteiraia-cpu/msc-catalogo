import { Pencil } from "lucide-react";

import type { CampaignSpec } from "@/lib/schemas/campaign-spec";

interface PeriodSloganFieldsProps {
  spec: CampaignSpec;
  onChange: (next: CampaignSpec) => void;
}

/**
 * Briefing — "Quando a promoção vale" (linhas 947-951) + "Frase de campanha"
 * (linhas 954-957). Datas editáveis e slogan editável; quando o slogan é
 * nulo, mostra a frase italic de tranquilização.
 */
export function PeriodSloganFields({ spec, onChange }: PeriodSloganFieldsProps) {
  const period = spec.period;

  function patchPeriod(patch: Partial<typeof period>) {
    onChange({ ...spec, period: { ...period, ...patch } });
  }

  function patchSlogan(value: string) {
    onChange({
      ...spec,
      creative: {
        ...spec.creative,
        slogan_on_cover: value === "" ? null : value,
      },
    });
  }

  const periodLines = period.display_on_cover.lines ?? [];

  return (
    <>
      {/* Período */}
      <div className="flex flex-col gap-1 rounded-md border border-border bg-white p-3 transition-colors hover:border-primary">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Quando a promoção vale
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <input
            type="date"
            value={period.start_date}
            onChange={(e) => patchPeriod({ start_date: e.target.value })}
            className="rounded-md border border-input bg-background px-2 py-1 text-xs"
            aria-label="Início da promoção"
          />
          <span className="text-muted-foreground">→</span>
          <input
            type="date"
            value={period.end_date}
            onChange={(e) => patchPeriod({ end_date: e.target.value })}
            className="rounded-md border border-input bg-background px-2 py-1 text-xs"
            aria-label="Fim da promoção"
          />
        </div>
        {period.display_on_cover.enabled && periodLines.length > 0 && (
          <div className="mt-1 text-[11px] italic text-muted-foreground">
            Mostrar na capa: “{periodLines.join(" ")}”
          </div>
        )}
      </div>

      {/* Slogan */}
      <div className="flex flex-col gap-1 rounded-md border border-border bg-white p-3 transition-colors hover:border-primary">
        <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Pencil className="h-2.5 w-2.5" />
          Frase de campanha
        </div>
        <input
          type="text"
          value={spec.creative.slogan_on_cover ?? ""}
          onChange={(e) => patchSlogan(e.target.value)}
          placeholder="(essa campanha não tem frase própria, e tudo bem)"
          className="rounded-sm border border-transparent bg-transparent text-sm focus:border-input focus:bg-background focus:px-2 focus:py-1 focus:outline-none"
        />
        {spec.creative.slogan_on_cover === null && (
          <div className="text-[11px] italic text-muted-foreground">
            (essa campanha não tem frase própria, e tudo bem)
          </div>
        )}
      </div>
    </>
  );
}
