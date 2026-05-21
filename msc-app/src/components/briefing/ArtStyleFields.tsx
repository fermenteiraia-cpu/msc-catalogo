import { useState } from "react";
import { Pencil, Plus, X } from "lucide-react";

import type { CampaignSpec } from "@/lib/schemas/campaign-spec";

type Headline = CampaignSpec["creative"]["headline"];
type Ornament = Headline["ornament"];
type LetteringStyle = Headline["lettering_style"];

interface ArtStyleFieldsProps {
  spec: CampaignSpec;
  onChange: (next: CampaignSpec) => void;
}

/** Opções do <select> de ornamento (mockup linhas 879-885). */
const ORNAMENT_OPTIONS: ReadonlyArray<{ value: Ornament; label: string }> = [
  { value: "heart-in-tilde", label: '❤️ Coração no til do "ã"' },
  { value: "balloon", label: "🎈 Balões" },
  { value: "flag-bunting", label: "🎉 Bandeirinhas" },
  { value: "money-rain", label: "💵 Chuva de dinheiro" },
  { value: "none", label: "Nenhum" },
];

/** Opções do <select> de estilo das letras (mockup linhas 889-894). */
const LETTERING_OPTIONS: ReadonlyArray<{
  value: LetteringStyle;
  label: string;
}> = [
  { value: "3d-bubble-glossy", label: "3D brilhante (estilo balão)" },
  { value: "3d-extrusion", label: "3D em relevo" },
  { value: "neon", label: "Letreiro neon" },
  { value: "flat-bold", label: "Letra grossa chapada" },
];

/** Rótulo humano do modo de paleta. */
const PALETTE_MODE_LABEL: Record<
  CampaignSpec["creative"]["palette"]["mode"],
  string
> = {
  "light-warm": "Tons claros e quentes",
  "dark-cool": "Tons escuros e frios",
  "light-vibrant": "Tons claros e vibrantes",
  "dark-vibrant": "Tons escuros e vibrantes",
};

/** Wrapper visual de um campo da IA — borda + label uppercase. */
function AiField({
  label,
  editable,
  children,
}: {
  label: string;
  editable?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-white p-3 transition-colors hover:border-primary">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {editable && <Pencil className="h-2.5 w-2.5" />}
        {label}
      </div>
      {children}
    </div>
  );
}

/**
 * Briefing — seção "🎨 Arte e estilo (livre pra mexer)" (mockup linhas
 * 866-919). Todos os campos são editáveis: a pré-edição da Amanda acontece
 * aqui e o wireframe acima reflete cada mudança ao vivo.
 */
export function ArtStyleFields({ spec, onChange }: ArtStyleFieldsProps) {
  const creative = spec.creative;
  const headline = creative.headline;
  const palette = creative.palette;
  const decoration = creative.decoration;

  const [newElement, setNewElement] = useState("");

  function patchHeadline(patch: Partial<Headline>) {
    onChange({
      ...spec,
      creative: { ...creative, headline: { ...headline, ...patch } },
    });
  }

  function patchPalette(patch: Partial<typeof palette>) {
    onChange({
      ...spec,
      creative: { ...creative, palette: { ...palette, ...patch } },
    });
  }

  function setElements(elements: string[]) {
    onChange({
      ...spec,
      creative: { ...creative, decoration: { ...decoration, elements } },
    });
  }

  function removeElement(index: number) {
    // O schema exige no mínimo 3 enfeites — não deixa esvaziar abaixo disso.
    if (decoration.elements.length <= 3) return;
    setElements(decoration.elements.filter((_, i) => i !== index));
  }

  function addElement() {
    const value = newElement.trim();
    if (!value) return;
    // O schema permite no máximo 6 enfeites.
    if (decoration.elements.length >= 6) return;
    setElements([...decoration.elements, value]);
    setNewElement("");
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="border-b border-border py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        🎨 Arte e estilo (livre pra mexer)
      </div>

      {/* Linha 1 — as palavras escritas (par coeso, lado a lado) */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {/* Texto de cima */}
      <AiField label="Texto de cima" editable>
        <input
          type="text"
          value={headline.top ?? ""}
          onChange={(e) =>
            patchHeadline({ top: e.target.value === "" ? null : e.target.value })
          }
          placeholder="(sem texto de cima)"
          className="rounded-sm border border-transparent bg-transparent text-sm font-medium focus:border-input focus:bg-background focus:px-2 focus:py-1 focus:outline-none"
        />
      </AiField>

      {/* Palavra grande do centro */}
      <AiField label="Palavra grande do centro" editable>
        <input
          type="text"
          value={headline.main}
          onChange={(e) => patchHeadline({ main: e.target.value })}
          className="rounded-sm border border-transparent bg-transparent text-sm font-medium focus:border-input focus:bg-background focus:px-2 focus:py-1 focus:outline-none"
        />
      </AiField>

      </div>

      {/* Linha 2 — o visual da headline (par coeso, lado a lado) */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {/* Enfeite ao redor da palavra */}
      <AiField label="Enfeite ao redor da palavra">
        <select
          value={headline.ornament}
          onChange={(e) =>
            patchHeadline({ ornament: e.target.value as Ornament })
          }
          className="min-h-[28px] rounded-md border border-input bg-background px-2 py-1 text-xs"
        >
          {ORNAMENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </AiField>

      {/* Estilo das letras */}
      <AiField label="Estilo das letras">
        <select
          value={headline.lettering_style}
          onChange={(e) =>
            patchHeadline({
              lettering_style: e.target.value as LetteringStyle,
            })
          }
          className="min-h-[28px] rounded-md border border-input bg-background px-2 py-1 text-xs"
        >
          {LETTERING_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </AiField>

      </div>

      {/* Cores da campanha — largura cheia (assunto próprio, não pareia) */}
      <AiField label="Cores da campanha">
        <div className="flex gap-4">
          {(
            [
              { key: "primary", label: "principal" },
              { key: "secondary", label: "secundária" },
              { key: "accent_seal", label: "selos" },
            ] as const
          ).map(({ key, label }) => (
            <label
              key={key}
              className="flex cursor-pointer flex-col items-center gap-1"
            >
              <input
                type="color"
                value={palette[key]}
                onChange={(e) => patchPalette({ [key]: e.target.value })}
                className="h-7 w-7 cursor-pointer rounded-sm border border-border bg-transparent p-0"
                aria-label={`Cor ${label}`}
              />
              <span className="font-mono text-[9px] text-muted-foreground">
                {label}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-1 text-xs font-medium text-foreground">
          {PALETTE_MODE_LABEL[palette.mode]}
        </div>
        <div className="text-[11px] italic text-muted-foreground">
          “{palette.bg_style}”
        </div>
      </AiField>

      {/* Enfeites da campanha */}
      <AiField label="Enfeites da campanha">
        <div className="flex flex-wrap gap-1.5">
          {decoration.elements.map((element, i) => (
            <span
              key={`${element}-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-primary"
            >
              {element}
              {decoration.elements.length > 3 && (
                <button
                  type="button"
                  onClick={() => removeElement(i)}
                  className="text-primary/60 hover:text-primary"
                  aria-label={`Remover ${element}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </span>
          ))}
          {decoration.elements.length < 6 && (
            <span className="inline-flex items-center gap-1">
              <input
                type="text"
                value={newElement}
                onChange={(e) => setNewElement(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addElement();
                  }
                }}
                placeholder="novo enfeite"
                className="w-24 rounded-full border border-dashed border-border bg-background px-2 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onClick={addElement}
                className="inline-flex items-center gap-0.5 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-secondary/70"
              >
                <Plus className="h-2.5 w-2.5" />
                adicionar
              </button>
            </span>
          )}
        </div>
        <div className="mt-1.5 text-xs text-foreground">
          <strong>Quantidade:</strong> {decoration.density} ·{" "}
          <strong>Sentimento:</strong> {decoration.mood.join(", ")}
        </div>
      </AiField>
    </div>
  );
}
