import type { CampaignSpec } from "@/lib/schemas/campaign-spec";

interface CoverInfoPanelProps {
  spec: CampaignSpec | null;
}

/**
 * Editor — painel "Capa da campanha" (substitui o "Elemento selecionado"
 * quando a página aberta é a capa). Resumo só-leitura do que está na capa:
 * o texto grande, as cores e o tema. Esses valores vêm do Briefing — aqui no
 * Editor a capa só se ajusta pelas frases prontas (painel ao lado).
 */
export function CoverInfoPanel({ spec }: CoverInfoPanelProps) {
  if (!spec) {
    return (
      <div className="rounded-lg border border-border bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-lg">🖼️</span>
          <h3 className="text-sm font-semibold">Capa da campanha</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Não foi possível ler os dados da capa dessa campanha.
        </p>
      </div>
    );
  }

  const { creative, campaign } = spec;
  const headline = creative.headline;
  const palette = creative.palette;

  const swatches: ReadonlyArray<{ key: string; label: string; color: string }> =
    [
      { key: "primary", label: "principal", color: palette.primary },
      { key: "secondary", label: "fundo", color: palette.secondary },
      { key: "accent_seal", label: "selo", color: palette.accent_seal },
    ];

  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-lg">🖼️</span>
        <h3 className="truncate text-sm font-semibold">Capa da campanha</h3>
      </div>
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2 py-0.5 text-[10px] font-medium">
        🔒 Casa MSC · definida no Briefing
      </span>

      {/* Texto grande da capa */}
      <div className="mt-4">
        <label className="text-xs font-medium text-muted-foreground">
          Texto grande
        </label>
        <div className="mt-1 rounded-md border border-border bg-muted px-3 py-2 text-sm">
          {headline.top && (
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {headline.top}
            </div>
          )}
          <div className="font-bold leading-tight text-foreground">
            {headline.main}
          </div>
          {headline.sub && (
            <div className="text-[11px] text-muted-foreground">
              {headline.sub}
            </div>
          )}
        </div>
      </div>

      {/* Cores da campanha */}
      <div className="mt-3">
        <label className="text-xs font-medium text-muted-foreground">
          Cores da campanha
        </label>
        <div className="mt-1.5 flex gap-4">
          {swatches.map((s) => (
            <div key={s.key} className="flex flex-col items-center gap-1">
              <span
                className="h-7 w-7 rounded-sm border border-border"
                style={{ background: s.color }}
              />
              <span className="font-mono text-[9px] text-muted-foreground">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tema */}
      <div className="mt-3">
        <label className="text-xs font-medium text-muted-foreground">
          Tema
        </label>
        <input
          className="mt-1 w-full rounded-md border border-input bg-muted px-3 py-2 text-xs"
          value={campaign.name}
          readOnly
        />
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        💡 O texto grande, as cores e o selo são definidos no Briefing. Aqui no
        Editor, o que dá pra ajustar na capa são as <strong>frases prontas</strong>{" "}
        — no painel ao lado.
      </p>
    </div>
  );
}
