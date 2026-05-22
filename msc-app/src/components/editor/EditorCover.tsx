import type { CampaignSpec } from "@/lib/schemas/campaign-spec";
import { renderTermPattern, type TermTemplate } from "@/lib/queries/briefing";

interface EditorCoverProps {
  spec: CampaignSpec;
  termTemplates: TermTemplate[];
}

/** Emoji do ornamento, aplicado no til da palavra principal. */
const ORNAMENT_EMOJI: Record<
  CampaignSpec["creative"]["headline"]["ornament"],
  string
> = {
  "heart-in-tilde": "❤️",
  balloon: "🎈",
  "flag-bunting": "🎉",
  "money-rain": "💵",
  none: "",
};

/** Formata uma data ISO YYYY-MM-DD como DD/MM. */
function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return m && d ? `${d}/${m}` : iso;
}

/** Palavra principal com o ornamento no til do "ã" quando aplicável. */
function MainWord({
  word,
  ornament,
}: {
  word: string;
  ornament: CampaignSpec["creative"]["headline"]["ornament"];
}) {
  const emoji = ORNAMENT_EMOJI[ornament];
  const tildeIndex = ornament === "heart-in-tilde" ? word.indexOf("ã") : -1;

  if (tildeIndex === -1 || !emoji) {
    return (
      <>
        {word}
        {emoji && ornament !== "none" ? (
          <span className="ml-1 text-base">{emoji}</span>
        ) : null}
      </>
    );
  }
  return (
    <>
      {word.slice(0, tildeIndex)}
      <span className="relative">
        ã
        <span className="absolute -top-3 left-px text-base">{emoji}</span>
      </span>
      {word.slice(tildeIndex + 1)}
    </>
  );
}

/**
 * Página 1 do Editor — a CAPA do catálogo (mockup Tela 1 / wireframe da capa).
 * Desenha a folha de impressão (11/14) a partir do `campaign_spec`: gradiente
 * da paleta, faixa MSC, headline grande, selo de CTA, frases prontas e
 * período. É o esboço da capa — a IA depois dá o acabamento 3D.
 */
export function EditorCover({ spec, termTemplates }: EditorCoverProps) {
  const { creative, cta_blocks, terms_on_cover, period } = spec;
  const headline = creative.headline;
  const palette = creative.palette;
  const cta = cta_blocks[0];

  const coverGradient = `linear-gradient(135deg, ${palette.secondary} 0%, ${palette.primary} 100%)`;

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
    <div
      className="relative flex flex-col overflow-hidden rounded-xl p-4 shadow-md"
      style={{ background: coverGradient, aspectRatio: "11 / 14" }}
    >
      {/* Faixa LOJAS MSC topo */}
      <div
        className="-mx-1 mb-3 flex flex-shrink-0 justify-around rounded-sm px-1.5 py-1 text-center font-bold tracking-widest text-white"
        style={{ background: "rgba(0,0,0,0.28)", fontSize: 8 }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i}>LOJAS MSC</span>
        ))}
      </div>

      {/* Mascote · headline · CTA */}
      <div
        className="grid flex-1 items-center gap-3"
        style={{ gridTemplateColumns: "80px 1fr 96px" }}
      >
        <div className="flex h-[120px] items-center justify-center rounded border border-dashed border-white/80 bg-white/50 text-[44px]">
          👴
        </div>

        <div className="text-center">
          {headline.top && (
            <div
              className="text-sm font-bold uppercase tracking-wide text-white"
              style={{ textShadow: `1px 1px 0 ${palette.primary}` }}
            >
              {headline.top}
            </div>
          )}
          <div
            className="-mt-0.5 text-[40px] font-black leading-none text-white"
            style={{
              textShadow: `2px 2px 0 ${palette.primary}, 5px 5px 0 rgba(0,0,0,0.35)`,
            }}
          >
            <MainWord word={headline.main} ornament={headline.ornament} />
          </div>
          {headline.sub && (
            <div className="mt-2 text-[9px] font-bold text-foreground/70">
              {headline.sub}
            </div>
          )}
        </div>

        {cta && (
          <div
            className="rounded-lg border-[1.5px] border-dashed px-1 py-1.5 text-center"
            style={{
              background: palette.accent_seal,
              borderColor: "rgba(0,0,0,0.4)",
            }}
          >
            {cta.topline && (
              <div className="text-[7px] font-semibold text-[#78350F]">
                {cta.topline}
              </div>
            )}
            <div className="text-[22px] font-black leading-none text-[#DC2626]">
              {cta.value}
            </div>
            <div className="text-[7px] font-bold text-[#78350F]">
              {cta.label}
            </div>
          </div>
        )}
      </div>

      {/* Frases prontas */}
      {termPhrases.length > 0 && (
        <div className="mt-3 grid flex-shrink-0 grid-cols-2 gap-1.5 text-[8px] text-foreground/85">
          {termPhrases.map((phrase, i) => (
            <div
              key={`${phrase}-${i}`}
              className="rounded-sm bg-white/60 px-2 py-1"
            >
              {phrase}
            </div>
          ))}
        </div>
      )}

      {/* Slogan opcional */}
      {creative.slogan_on_cover && (
        <div className="mt-2 flex-shrink-0 text-center text-[9px] font-semibold italic text-white">
          {creative.slogan_on_cover}
        </div>
      )}

      {/* Footer período */}
      <div
        className="mt-3 flex-shrink-0 rounded-sm px-2 py-1.5 text-center font-semibold text-white"
        style={{ background: "rgba(0,0,0,0.28)", fontSize: 9 }}
      >
        {periodLine}
      </div>
    </div>
  );
}
