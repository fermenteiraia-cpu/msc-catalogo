import type { CampaignSpec } from "@/lib/schemas/campaign-spec";
import type { PieceWithProduct } from "@/lib/queries/pieces";
import type { TermTemplate } from "@/lib/queries/briefing";
import { resolveTermText } from "@/components/editor/term-display";
import { ProductGrid } from "@/components/editor/ProductGrid";
import { MscStrip } from "@/components/editor/EditorSketch";

interface EditorCoverProps {
  spec: CampaignSpec;
  termTemplates: TermTemplate[];
  /** Produtos que aparecem na capa (abaixo da faixa do hero). */
  pieces: PieceWithProduct[];
  pageCount: number;
  selectedPieceId: string | null;
  onSelectPiece: (pieceId: string) => void;
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

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return m && d ? `${d}/${m}` : iso;
}

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
          <span className="ml-1 align-middle text-xl">{emoji}</span>
        ) : null}
      </>
    );
  }
  return (
    <>
      {word.slice(0, tildeIndex)}
      <span className="relative">
        ã
        <span className="absolute -top-3 left-0.5 text-lg">{emoji}</span>
      </span>
      {word.slice(tildeIndex + 1)}
    </>
  );
}

/**
 * Página 1 do Editor — a CAPA do catálogo, fiel ao encarte MSC real: faixa do
 * hero no topo (mascote + título grande + selo de desconto + termos +
 * período) e, abaixo, a grade de produtos da capa. Folha branca, faixa MSC no
 * rodapé.
 */
export function EditorCover({
  spec,
  termTemplates,
  pieces,
  pageCount,
  selectedPieceId,
  onSelectPiece,
}: EditorCoverProps) {
  const { creative, cta_blocks, terms_on_cover, period } = spec;
  const headline = creative.headline;
  const palette = creative.palette;
  const cta = cta_blocks[0];

  const heroGradient = `linear-gradient(135deg, ${palette.secondary} 0%, ${palette.primary} 100%)`;

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
      className="flex flex-col overflow-hidden rounded-xl bg-white shadow-md"
      style={{ aspectRatio: "748 / 862" }}
    >
      {/* ===== Faixa do hero ===== */}
      <div
        className="flex flex-shrink-0 flex-col gap-2 px-3 py-3"
        style={{ background: heroGradient }}
      >
        <div className="flex items-center gap-3">
          {/* Mascote */}
          <div className="flex h-[120px] w-[84px] flex-shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-white/70 bg-white/40 text-[52px]">
            👴
          </div>

          {/* Headline */}
          <div className="flex-1 text-center">
            {headline.top && (
              <div
                className="text-xs font-bold uppercase tracking-wide text-white"
                style={{ textShadow: `1px 1px 0 ${palette.primary}` }}
              >
                {headline.top}
              </div>
            )}
            <div
              className="text-[44px] font-black uppercase leading-[0.92] text-white"
              style={{
                textShadow: `2px 2px 0 ${palette.primary}, 4px 4px 0 rgba(0,0,0,0.35)`,
              }}
            >
              <MainWord word={headline.main} ornament={headline.ornament} />
            </div>
            <div className="mt-1 text-[11px] font-extrabold uppercase italic tracking-wide text-white">
              Lojas MSC
            </div>
            {headline.sub && (
              <div className="text-[8px] font-bold uppercase tracking-wide text-white/85">
                {headline.sub}
              </div>
            )}
          </div>

          {/* Selo de CTA + termos */}
          <div className="flex w-[150px] flex-shrink-0 flex-col gap-1.5">
            {cta && (
              <div
                className="rounded-lg border-2 border-dashed px-2 py-1.5 text-center"
                style={{
                  background: palette.accent_seal,
                  borderColor: "rgba(0,0,0,0.4)",
                }}
              >
                {cta.topline && (
                  <div className="text-[7px] font-semibold uppercase leading-tight text-[#78350F]">
                    {cta.topline}
                  </div>
                )}
                <div className="text-[26px] font-black leading-none text-[#DC2626]">
                  {cta.value}
                </div>
                <div className="text-[7px] font-bold uppercase leading-tight text-[#78350F]">
                  {cta.label}
                </div>
              </div>
            )}
            {termPhrases.length > 0 && (
              <div className="flex flex-col gap-0.5">
                {termPhrases.map((phrase, i) => (
                  <div
                    key={`${phrase}-${i}`}
                    className="rounded-sm bg-white/85 px-1.5 py-0.5 text-[7px] font-medium leading-tight text-foreground"
                  >
                    {phrase}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Slogan + período */}
        <div className="flex items-center justify-center gap-2">
          {creative.slogan_on_cover && (
            <span className="rounded-full bg-white/85 px-3 py-0.5 text-[9px] font-semibold italic text-foreground">
              {creative.slogan_on_cover}
            </span>
          )}
          <span
            className="rounded-full px-3 py-0.5 text-[9px] font-bold uppercase text-white"
            style={{ background: "rgba(0,0,0,0.28)" }}
          >
            {periodLine}
          </span>
        </div>
      </div>

      {/* ===== Grade de produtos da capa ===== */}
      <div className="min-h-0 flex-1 overflow-hidden p-2.5">
        <ProductGrid
          pieces={pieces}
          selectedPieceId={selectedPieceId}
          onSelectPiece={onSelectPiece}
          emptyLabel="Escolha produtos pra montar a capa do catálogo."
        />
      </div>

      <MscStrip variant="footer" pageLabel={`página 1 de ${pageCount}`} />
    </div>
  );
}
