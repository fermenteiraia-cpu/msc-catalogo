import type { CampaignSpec } from "@/lib/schemas/campaign-spec";

interface DiscountSealPreviewProps {
  spec: CampaignSpec;
}

/** Rótulo humano do formato do selo. */
const SHAPE_LABEL: Record<
  CampaignSpec["cta_blocks"][number]["shape"],
  string
> = {
  stacked: "empilhado",
  square: "quadrado",
  "torn-calendar": "folhinha rasgada",
  circle: "redondo",
};

/**
 * Briefing — "Selo de desconto principal" (mockup linhas 935-944).
 * Renderiza visualmente o primeiro cta_block como um cartão de selo.
 */
export function DiscountSealPreview({ spec }: DiscountSealPreviewProps) {
  const cta = spec.cta_blocks[0];
  const sealCount = spec.cta_blocks.length;

  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-white p-3 transition-colors hover:border-primary">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Selo de desconto principal
      </div>

      <div className="rounded-sm bg-gradient-to-br from-[#fef3c7] to-[#fde68a] p-3 text-center">
        {cta.topline && (
          <div className="text-[11px] text-[#78350f]">{cta.topline}</div>
        )}
        <div className="text-[32px] font-black leading-none text-[#DC2626]">
          {cta.value}
        </div>
        <div className="text-[11px] font-bold text-[#78350f]">
          {cta.label}
        </div>
      </div>

      <div className="mt-1.5 text-[11px] text-muted-foreground">
        <strong>Formato:</strong> {SHAPE_LABEL[cta.shape]} ·{" "}
        {sealCount === 1
          ? "1 selo grande na capa"
          : `${sealCount} selos na capa`}
      </div>
    </div>
  );
}
