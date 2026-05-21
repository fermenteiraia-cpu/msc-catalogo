import { useState } from "react";
import { Check, Plus, X } from "lucide-react";

import type { CampaignSpec } from "@/lib/schemas/campaign-spec";
import {
  renderTermPattern,
  useTermTemplates,
  type TermTemplate,
} from "@/lib/queries/briefing";

interface ReadyPhrasesPanelProps {
  spec: CampaignSpec;
  onChange: (next: CampaignSpec) => void;
}

/**
 * Briefing — painel amarelo "📋 Frases prontas que vão na capa" (mockup
 * linhas 921-933). Lista as frases que a IA escolheu (cada item referencia
 * um term_template) e abre um seletor pra trocar/adicionar frases.
 */
export function ReadyPhrasesPanel({ spec, onChange }: ReadyPhrasesPanelProps) {
  const templatesQuery = useTermTemplates();
  const templates = templatesQuery.data ?? [];
  const [pickerOpen, setPickerOpen] = useState(false);

  const termById = new Map(templates.map((t) => [t.template_id, t]));
  const items = spec.terms_on_cover.items;

  function setItems(next: CampaignSpec["terms_on_cover"]["items"]) {
    onChange({
      ...spec,
      terms_on_cover: { ...spec.terms_on_cover, items: next },
    });
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function toggleTemplate(tpl: TermTemplate) {
    const existingIndex = items.findIndex(
      (it) => it.template_id === tpl.template_id,
    );
    if (existingIndex >= 0) {
      removeItem(existingIndex);
    } else {
      setItems([...items, { template_id: tpl.template_id, params: {} }]);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="border-b border-[#fcd34d] py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#78350f]">
        📋 Frases prontas que vão na capa
      </div>

      <div className="rounded-md border border-[#fcd34d] bg-[#fef3c7] px-3 py-2.5">
        <div className="mb-2 text-[11px] text-[#78350f]">
          {items.length > 0
            ? `A IA escolheu ${items.length} ${
                items.length === 1 ? "frase" : "frases"
              } da nossa biblioteca:`
            : "Nenhuma frase escolhida ainda."}
        </div>

        <div className="flex flex-col gap-1">
          {items.map((item, i) => {
            const tpl = termById.get(item.template_id);
            const text = tpl
              ? renderTermPattern(
                  tpl.pattern,
                  item.params as Record<string, unknown>,
                )
              : item.template_id;
            return (
              <div
                key={`${item.template_id}-${i}`}
                className="flex items-center justify-between gap-2 rounded-sm bg-white px-2 py-1.5 text-xs"
              >
                <span>{text}</span>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={`Remover frase ${text}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setPickerOpen((open) => !open)}
          className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-md border border-input bg-white px-3 py-1.5 text-xs font-medium hover:bg-secondary"
        >
          <Plus className="h-3.5 w-3.5" />
          {pickerOpen ? "Fechar" : "Trocar ou adicionar frase"}
        </button>

        {/* Seletor de templates da biblioteca */}
        {pickerOpen && (
          <div className="mt-2 flex flex-col gap-1 rounded-sm border border-[#fcd34d] bg-white p-2">
            {templatesQuery.isLoading && (
              <div className="px-1 py-1 text-[11px] text-muted-foreground">
                Carregando a biblioteca de frases…
              </div>
            )}
            {templates.map((tpl) => {
              const selected = items.some(
                (it) => it.template_id === tpl.template_id,
              );
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => toggleTemplate(tpl)}
                  className="flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-secondary"
                >
                  <span>
                    {renderTermPattern(tpl.pattern, {})}
                    {tpl.category && (
                      <span className="ml-1.5 text-[10px] text-muted-foreground">
                        {tpl.category}
                      </span>
                    )}
                  </span>
                  {selected && (
                    <Check className="h-3.5 w-3.5 flex-shrink-0 text-success" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
