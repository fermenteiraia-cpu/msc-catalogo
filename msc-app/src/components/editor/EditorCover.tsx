import type { CampaignSpec } from "@/lib/schemas/campaign-spec";
import type { TermTemplate } from "@/lib/queries/briefing";
import { resolveTermText } from "@/components/editor/term-display";

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
          <span className="ml-1 align-middle text-4xl">{emoji}</span>
        ) : null}
      </>
    );
  }
  return (
    <>
      {word.slice(0, tildeIndex)}
      <span className="relative">
        ã
        <span className="absolute -top-5 left-0.5 text-3xl">{emoji}</span>
      </span>
      {word.slice(tildeIndex + 1)}
    </>
  );
}

/**
 * Página 1 do Editor — a CAPA do catálogo (mockup Tela 1 / wireframe da capa).
 * Desenha a folha de impressão (11/14) a partir do `campaign_spec`. O hero
 * (headline + mascote + selo) é grande e distribuído pra capa preencher a
 * folha, sem o vazio gigante no topo (correção David, 2026-05-22): faixa MSC,
 * hero, frases prontas e período.
 */
export function EditorCover({ spec, termTemplates }: EditorCoverProps) {
  const { creative, cta_blocks, terms_on_cover, period } = spec;
  const headline = creative.headline;
  const palette = creative.palette;
  const cta = cta_blocks[0];

  const coverGradient = `linear-gradient(135deg, ${palette.secondary} 0%, ${palette.primary} 100%)`;

  const termById = new Map(termTemplates.map((t) => [t.template_id, t]));
  const termPhrases = terms_on_cover.items
    .map((item) =>
      resolveTermText(
        termById.get(item.template_id),
        { template_id: item.template_id, params: item.params },
        spec,
      ),
    )
    .filter((phrase) => phrase.length > 0)
    .slice(0, 4);

  const periodLine =
    period.display_on_cover.enabled &&
    period.display_on_cover.lines &&
    period.display_on_cover.lines.length > 0
      ? period.display_on_cover.lines[0]
      : `Válido de ${shortDate(period.start_date)} a ${shortDate(period.end_date)}`;

  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-xl p-4 shadow-md"
      style={{ background: coverGradient, aspectRatio: "11 / 14" }}
    >
      {/* Faixa LOJAS MSC topo */}
      <div
        className="flex flex-shrink-0 justify-around rounded-sm px-2 py-1.5 font-bold uppercase tracking-widest text-white"
        style={{ background: "rgba(0,0,0,0.3)", fontSize: 9 }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i}>LOJAS MSC</span>
        ))}
      </div>

      {/* HERO — preenche o miolo da folha */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-evenly gap-2 py-2">
        {/* Headline */}
        <div className="text-center">
          {headline.top && (
            <div
              className="text-lg font-bold uppercase tracking-wide text-white"
              style={{ textShadow: `1px 1px 0 ${palette.primary}` }}
            >
              {headline.top}
            </div>
          )}
          <div
            className="text-[72px] font-black uppercase leading-[0.95] text-white"
            style={{
              textShadow: `3px 3px 0 ${palette.primary}, 7px 7px 0 rgba(0,0,0,0.35)`,
            }}
          >
            <MainWord word={headline.main} ornament={headline.ornament} />
          </div>
          {headline.sub && (
            <div className="mt-1.5 text-sm font-bold uppercase tracking-wide text-white/85">
              {headline.sub}
            </div>
          )}
        </div>

        {/* Mascote + selo de CTA */}
        <div className="flex items-center justify-center gap-5">
          <div className="flex h-[210px] w-[170px] items-center justify-center rounded-lg border-2 border-dashed border-white/70 bg-white/45 text-[100px]">
            👴
          </div>
          {cta && (
            <div
              className="rounded-2xl border-2 border-dashed px-3 py-4 text-center"
              style={{
                background: palette.accent_seal,
                borderColor: "rgba(0,0,0,0.4)",
              }}
            >
              {cta.topline && (
                <div className="text-[9px] font-semibold uppercase text-[#78350F]">
                  {cta.topline}
                </div>
              )}
              <div className="text-[42px] font-black leading-none text-[#DC2626]">
                {cta.value}
              </div>
              <div className="text-[9px] font-bold uppercase text-[#78350F]">
                {cta.label}
              </div>
            </div>
          )}
        </div>

        {/* Slogan */}
        {creative.slogan_on_cover && (
          <div className="rounded-full bg-white/80 px-5 py-1.5 text-center text-sm font-semibold italic text-foreground">
            {creative.slogan_on_cover}
          </div>
        )}
      </div>

      {/* Frases prontas */}
      {termPhrases.length > 0 && (
        <div className="grid flex-shrink-0 grid-cols-2 gap-2 text-[11px] font-medium text-foreground/90">
          {termPhrases.map((phrase, i) => (
            <div
              key={`${phrase}-${i}`}
              className="rounded-sm bg-white/80 px-3 py-2 text-center"
            >
              {phrase}
            </div>
          ))}
        </div>
      )}

      {/* Footer período */}
      <div
        className="mt-2.5 flex-shrink-0 rounded-sm px-2 py-2 text-center font-bold uppercase tracking-wide text-white"
        style={{ background: "rgba(0,0,0,0.3)", fontSize: 11 }}
      >
        {periodLine}
      </div>
    </div>
  );
}
