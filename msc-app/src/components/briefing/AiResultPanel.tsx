import { ArrowRight, Loader2, RefreshCw, Sparkles } from "lucide-react";

import type { CampaignSpec } from "@/lib/schemas/campaign-spec";
import { Button } from "@/components/ui/button";
import { useTermTemplates } from "@/lib/queries/briefing";
import { CoverWireframe } from "@/components/briefing/CoverWireframe";
import { ArtStyleFields } from "@/components/briefing/ArtStyleFields";
import { ReadyPhrasesPanel } from "@/components/briefing/ReadyPhrasesPanel";
import { DiscountSealPreview } from "@/components/briefing/DiscountSealPreview";
import { PeriodSloganFields } from "@/components/briefing/PeriodSloganFields";
import { BrandLockedPanel } from "@/components/briefing/BrandLockedPanel";

interface AiResultPanelProps {
  /** O CampaignSpec já gerado e em pré-edição. Null antes da IA responder. */
  spec: CampaignSpec | null;
  /** True enquanto a Edge Function está rodando (~5-15s). */
  isGenerating: boolean;
  onSpecChange: (next: CampaignSpec) => void;
  onProceed: () => void;
  onRetry: () => void;
  proceedDisabled: boolean;
}

/** Estado vazio/instrucional — antes da IA responder (mockup: coluna direita). */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-white px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
        <Sparkles className="h-6 w-6 text-primary" />
      </div>
      <h2 className="text-sm font-semibold text-foreground">
        O resultado da IA aparece aqui
      </h2>
      <p className="max-w-xs text-xs text-muted-foreground">
        Escolha por onde começar, conte o tema e clique em{" "}
        <strong>“Montar minha campanha”</strong>. Em alguns segundos a IA
        preenche cores, enfeites, letras e frases — e você ajusta o que quiser.
      </p>
    </div>
  );
}

/** Estado de carregamento — enquanto a IA monta a campanha. */
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-white px-6 py-16 text-center shadow-sm">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
      <h2 className="text-sm font-semibold text-foreground">
        A IA está montando sua campanha…
      </h2>
      <p className="max-w-xs text-xs text-muted-foreground">
        Isso leva alguns segundos. Estamos escolhendo cores, enfeites, estilo
        das letras e as frases prontas da capa.
      </p>
    </div>
  );
}

/**
 * Briefing — coluna direita "ai-result" (mockup linhas 802-970).
 * Antes da IA responder mostra um placeholder; depois renderiza o resultado
 * completo e editável. Todos os sub-componentes compartilham o mesmo `spec`,
 * então o wireframe no topo atualiza ao vivo conforme a Amanda edita.
 */
export function AiResultPanel({
  spec,
  isGenerating,
  onSpecChange,
  onProceed,
  onRetry,
  proceedDisabled,
}: AiResultPanelProps) {
  const termTemplatesQuery = useTermTemplates();
  const termTemplates = termTemplatesQuery.data ?? [];

  if (isGenerating && !spec) {
    return <LoadingState />;
  }

  if (!spec) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-3.5 rounded-lg border border-border bg-white p-5 shadow-sm">
      {/* Status */}
      <div className="flex items-center gap-2 rounded-sm bg-secondary px-3 py-2.5 text-xs font-medium text-primary">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        ✅ Pronto! A IA já preencheu tudo. Dá uma olhada e mexe no que precisar.
      </div>

      {/* Mini-visualização — centralizada e com largura controlada, pra não
          esticar feio agora que o painel ocupa a coluna larga */}
      <div className="mx-auto w-full max-w-[320px]">
        <CoverWireframe spec={spec} termTemplates={termTemplates} />
      </div>

      {/* Arte e estilo (editável) */}
      <ArtStyleFields spec={spec} onChange={onSpecChange} />

      {/* Frases prontas */}
      <ReadyPhrasesPanel spec={spec} onChange={onSpecChange} />

      {/* Selo de desconto principal */}
      <DiscountSealPreview spec={spec} />

      {/* Período + slogan */}
      <PeriodSloganFields spec={spec} onChange={onSpecChange} />

      {/* Casa MSC — somente leitura */}
      <BrandLockedPanel />

      {/* Ações finais */}
      <Button
        className="mt-2"
        onClick={onProceed}
        disabled={proceedDisabled}
      >
        Tudo certo, escolher os produtos
        <ArrowRight className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        className="text-xs"
        onClick={onRetry}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        Não gostei, pedir pra IA tentar de novo
      </Button>
    </div>
  );
}
