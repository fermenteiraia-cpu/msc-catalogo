import type { CampaignSpec } from "@/lib/schemas/campaign-spec";
import { Badge } from "@/components/ui/badge";
import { renderTermPattern, type TermTemplate } from "@/lib/queries/briefing";

interface CoverWireframeProps {
  spec: CampaignSpec;
  termTemplates: TermTemplate[];
}

/** Emoji do ornamento, usado no til da palavra principal. */
const ORNAMENT_EMOJI: Record<CampaignSpec["creative"]["headline"]["ornament"], string> = {
  "heart-in-tilde": "❤️",
  balloon: "🎈",
  "flag-bunting": "🎉",
  "money-rain": "💵",
  none: "",
};

/** Formata uma data ISO YYYY-MM-DD como DD/MM (pra footer do rascunho). */
function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return m && d ? `${d}/${m}` : iso;
}

/**
 * Renderiza a palavra principal aplicando o ornamento no til quando o
 * ornamento é "heart-in-tilde" e há um caractere "ã" na palavra.
 */
function MainWord({
  word,
  ornament,
}: {
  word: string;
  ornament: CampaignSpec["creative"]["headline"]["ornament"];
}) {
  const emoji = ORNAMENT_EMOJI[ornament];
  const tildeIndex =
    ornament === "heart-in-tilde" ? word.indexOf("ã") : -1;

  if (tildeIndex === -1 || !emoji) {
    return (
      <>
        {word}
        {emoji && ornament !== "none" ? (
          <span className="ml-0.5 text-sm">{emoji}</span>
        ) : null}
      </>
    );
  }

  return (
    <>
      {word.slice(0, tildeIndex)}
      <span className="relative">
        ã
        <span className="absolute -top-2 left-px text-sm">{emoji}</span>
      </span>
      {word.slice(tildeIndex + 1)}
    </>
  );
}

/**
 * Briefing — mini-visualização low-fi da capa (mockup linhas 811-864).
 * Tudo é derivado do `spec` ao vivo: gradiente da paleta, headline,
 * selo de CTA, frases de termo e período. NÃO é a peça final.
 */
export function CoverWireframe({ spec, termTemplates }: CoverWireframeProps) {
  const { creative, cta_blocks, terms_on_cover, period } = spec;
  const headline = creative.headline;
  const palette = creative.palette;
  const cta = cta_blocks[0];

  // Gradiente da capa: secondary → primary da paleta gerada.
  const coverGradient = `linear-gradient(135deg, ${palette.secondary} 0%, ${palette.primary} 100%)`;

  // Resolve as frases de termo a partir dos templates.
  const termById = new Map(termTemplates.map((t) => [t.template_id, t]));
  const termPhrases = terms_on_cover.items
    .map((item) => {
      const tpl = termById.get(item.template_id);
      if (!tpl) return item.template_id;
      return renderTermPattern(
        tpl.pattern,
        item.params as Record<string, unknown>,
      );
    })
    .slice(0, 4);

  const periodLine =
    period.display_on_cover.enabled &&
    period.display_on_cover.lines &&
    period.display_on_cover.lines.length > 0
      ? period.display_on_cover.lines[0]
      : `${shortDate(period.start_date)} ao ${shortDate(period.end_date)}`;

  return (
    <div className="my-1">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          🖼️ Como vai parecer (rascunho)
        </div>
        <Badge variant="secondary" className="text-[9px]">
          não é a peça final
        </Badge>
      </div>

      {/* Capa wireframe */}
      <div
        className="relative overflow-hidden rounded-lg p-4 shadow-md"
        style={{ background: coverGradient, aspectRatio: "11 / 14" }}
      >
        {/* Faixa LOJAS MSC topo */}
        <div
          className="-mx-1 -mt-2 mb-2 flex justify-around rounded-sm px-1.5 py-1 text-center text-[7px] font-bold tracking-widest text-white"
          style={{ background: "rgba(0,0,0,0.28)" }}
        >
          <span>LOJAS msc</span>
          <span>LOJAS msc</span>
          <span>LOJAS msc</span>
          <span>LOJAS msc</span>
          <span>LOJAS msc</span>
        </div>

        {/* Grid: mascote · headline · CTA */}
        <div
          className="grid items-center gap-2"
          style={{
            gridTemplateColumns: "60px 1fr 70px",
            minHeight: "110px",
          }}
        >
          {/* Mascote placeholder */}
          <div className="flex h-[90px] items-center justify-center rounded border border-dashed border-white/80 bg-white/50 text-[32px]">
            👴
          </div>

          {/* Headline */}
          <div className="text-center">
            {headline.top && (
              <div
                className="text-[11px] font-bold uppercase tracking-wide text-white"
                style={{ textShadow: `1px 1px 0 ${palette.primary}` }}
              >
                {headline.top}
              </div>
            )}
            <div
              className="-mt-0.5 text-[30px] font-black leading-none text-white"
              style={{
                textShadow: `2px 2px 0 ${palette.primary}, 4px 4px 0 rgba(0,0,0,0.35)`,
              }}
            >
              <MainWord word={headline.main} ornament={headline.ornament} />
            </div>
            {headline.sub && (
              <div className="mt-1.5 text-[7px] font-bold text-foreground/70">
                {headline.sub}
              </div>
            )}
          </div>

          {/* CTA / selo */}
          {cta && (
            <div
              className="rounded-lg border-[1.5px] border-dashed px-0.5 py-1 text-center"
              style={{
                background: palette.accent_seal,
                borderColor: "rgba(0,0,0,0.4)",
              }}
            >
              {cta.topline && (
                <div className="text-[6px] font-semibold text-[#78350F]">
                  {cta.topline}
                </div>
              )}
              <div className="text-[18px] font-black leading-none text-[#DC2626]">
                {cta.value}
              </div>
              <div className="text-[6px] font-bold text-[#78350F]">
                {cta.label}
              </div>
            </div>
          )}
        </div>

        {/* Frases de termo */}
        {termPhrases.length > 0 && (
          <div className="mt-2.5 grid grid-cols-2 gap-1 text-[6px] text-foreground/85">
            {termPhrases.map((phrase, i) => (
              <div
                key={`${phrase}-${i}`}
                className="rounded-sm bg-white/60 px-1.5 py-0.5"
              >
                {phrase}
              </div>
            ))}
          </div>
        )}

        {/* Footer período */}
        <div
          className="absolute bottom-2 left-1 right-1 rounded-sm px-1.5 py-1 text-center text-[7px] font-semibold text-white"
          style={{ background: "rgba(0,0,0,0.28)" }}
        >
          {periodLine}
        </div>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        💡 Esse rascunho atualiza quando você muda as opções abaixo. Não vai
        sair exatamente assim — só serve pra você ter ideia de como as decisões
        se encaixam.
      </p>
    </div>
  );
}
