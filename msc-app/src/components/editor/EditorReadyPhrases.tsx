import { useState } from "react";
import { Check, Plus, X } from "lucide-react";

import type { CampaignSpec } from "@/lib/schemas/campaign-spec";
import {
  renderTermPattern,
  useTermTemplates,
  type TermTemplate,
} from "@/lib/queries/briefing";

interface EditorReadyPhrasesProps {
  /** Campaign spec parsed from the catalog, or null when it failed to parse. */
  spec: CampaignSpec | null;
  /** Persists an edited spec (the Editor page debounces + saves). */
  onChange: (next: CampaignSpec) => void;
}

/**
 * Editor — painel amarelo "📋 Frases prontas da capa" (mockup Tela 4, linhas
 * 1742-1756). Mostra as frases prontas que a campanha já tem e deixa
 * trocar/adicionar a partir da biblioteca de term_templates.
 */
export function EditorReadyPhrases({ spec, onChange }: EditorReadyPhrasesProps) {
  const templatesQuery = useTermTemplates();
  const templates = templatesQuery.data ?? [];
  const [pickerOpen, setPickerOpen] = useState(false);

  const termById = new Map(templates.map((t) => [t.template_id, t]));
  const items = spec?.terms_on_cover.items ?? [];

  function setItems(next: CampaignSpec["terms_on_cover"]["items"]) {
    if (!spec) return;
    onChange({
      ...spec,
      terms_on_cover: { ...spec.terms_on_cover, items: next },
    });
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function toggleTemplate(tpl: TermTemplate) {
    const existing = items.findIndex(
      (it) => it.template_id === tpl.template_id,
    );
    if (existing >= 0) {
      removeItem(existing);
    } else {
      setItems([...items, { template_id: tpl.template_id, params: {} }]);
    }
  }

  return (
    <div className="rounded-lg border border-[#fcd34d] bg-[#fef3c7] p-4">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-lg">📋</span>
        <h3 className="text-sm font-semibold text-[#78350f]">
          Frases prontas da capa
        </h3>
      </div>
      <span className="inline-flex items-center gap-1 rounded-full border border-[#fcd34d] bg-[#fef3c7] px-2 py-0.5 text-[10px] font-medium text-[#78350f]">
        Frase pronta · ajustável
      </span>

      {!spec ? (
        <p className="mt-3 text-xs text-[#78350f]">
          Não foi possível ler as frases dessa campanha.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-col gap-1.5">
            {items.length === 0 && (
              <p className="text-xs text-[#78350f]">
                Nenhuma frase pronta ainda. Adicione abaixo.
              </p>
            )}
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
                  className="flex items-center justify-between gap-2 rounded-sm bg-white px-2 py-1.5 text-[11px]"
                >
                  <span>{text}</span>
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Remover frase ${text}`}
                  >
                    <X className="h-3 w-3" />
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
            {pickerOpen ? "Fechar" : "Adicionar frase pronta"}
          </button>

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
                    className="flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-[11px] hover:bg-secondary"
                  >
                    <span>{renderTermPattern(tpl.pattern, {})}</span>
                    {selected && (
                      <Check className="h-3.5 w-3.5 flex-shrink-0 text-success" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
