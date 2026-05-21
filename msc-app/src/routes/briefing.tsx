import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { Check, Loader2, Sparkles } from "lucide-react";

import type { AppLayoutContext } from "@/components/AppLayout";
import type { CampaignSpec } from "@/lib/schemas/campaign-spec";
import { Button } from "@/components/ui/button";
import { StartModes, type InspirationImage } from "@/components/briefing/StartModes";
import { ThemeInput } from "@/components/briefing/ThemeInput";
import { AiResultPanel } from "@/components/briefing/AiResultPanel";
import {
  useCreateCatalogFromBriefing,
  useGenerateBriefing,
  useUpdateCatalogSpec,
  type BriefingMode,
} from "@/lib/queries/briefing";

/** Estado do indicador de salvamento (linha 738-743 do mockup). */
type SaveState = "idle" | "saving" | "saved";

/** Intervalo de debounce do auto-save da pré-edição. */
const SAVE_DEBOUNCE_MS = 900;

/**
 * Tela 2 — Briefing por IA. A Amanda dá um tema, a IA monta o CampaignSpec,
 * ela pré-edita na coluna direita, e segue pra escolher produtos.
 * Implementa o mockup ux-design-directions.html linhas 686-974.
 */
export function BriefingPage() {
  const navigate = useNavigate();
  const { setStepper, resetStepper } = useOutletContext<AppLayoutContext>();

  // --- Estado da coluna esquerda
  const [mode, setMode] = useState<BriefingMode>("aproveitar");
  const [theme, setTheme] = useState("");
  const [baseCatalogId, setBaseCatalogId] = useState<string | null>(null);
  const [inspirations, setInspirations] = useState<InspirationImage[]>([]);

  // --- Estado do resultado da IA / catálogo
  const [spec, setSpec] = useState<CampaignSpec | null>(null);
  const [catalogId, setCatalogId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [formError, setFormError] = useState<string | null>(null);

  const generateMutation = useGenerateBriefing();
  const createMutation = useCreateCatalogFromBriefing();
  const updateMutation = useUpdateCatalogSpec();

  // Stepper: passo 1 (Briefing).
  useEffect(() => {
    setStepper({ currentStep: 1 });
    return () => resetStepper();
  }, [setStepper, resetStepper]);

  /* ------------------------------------------------------------------
   *  Geração — chama a Edge Function e cria o catálogo
   * ------------------------------------------------------------------ */

  const runGeneration = useCallback(async () => {
    setFormError(null);

    if (theme.trim().length < 4) {
      setFormError("Conta um pouco mais sobre o tema da campanha.");
      return;
    }
    if (mode === "aproveitar" && !baseCatalogId) {
      setFormError("Escolha qual campanha anterior você quer aproveitar.");
      return;
    }
    if (mode === "imagem" && inspirations.length === 0) {
      setFormError("Anexe pelo menos uma imagem de inspiração.");
      return;
    }

    const result = await generateMutation.mutateAsync({
      theme: theme.trim(),
      mode,
      baseCatalogId: mode === "aproveitar" ? baseCatalogId ?? undefined : undefined,
      imageUrls:
        mode === "imagem" ? inspirations.map((img) => img.url) : undefined,
    });

    if (!result.ok) {
      setFormError(result.error.message);
      return;
    }

    const generated = result.value.spec;
    setSpec(generated);

    if (catalogId) {
      // "Tentar de novo" — substitui o spec do catálogo existente.
      const updateResult = await updateMutation.mutateAsync({
        catalogId,
        spec: generated,
      });
      setSaveState(updateResult.ok ? "saved" : "idle");
      if (!updateResult.ok) setFormError(updateResult.error.message);
      return;
    }

    // Primeira geração — cria a linha em catalogs imediatamente.
    setSaveState("saving");
    const createResult = await createMutation.mutateAsync({
      spec: generated,
      houseConfigVersion: result.value.houseConfigVersion,
    });
    if (!createResult.ok) {
      setSaveState("idle");
      setFormError(createResult.error.message);
      return;
    }
    setCatalogId(createResult.value.catalogId);
    setSaveState("saved");
  }, [
    theme,
    mode,
    baseCatalogId,
    inspirations,
    catalogId,
    generateMutation,
    createMutation,
    updateMutation,
  ]);

  /* ------------------------------------------------------------------
   *  Auto-save com debounce — persiste a pré-edição
   * ------------------------------------------------------------------ */

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Pula o primeiro efeito (a criação do catálogo já salvou o spec inicial).
  const skipNextSaveRef = useRef(true);

  useEffect(() => {
    if (!spec || !catalogId) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveState("saving");

    saveTimerRef.current = setTimeout(() => {
      void updateMutation
        .mutateAsync({ catalogId, spec })
        .then((result) => {
          setSaveState(result.ok ? "saved" : "idle");
          if (!result.ok) setFormError(result.error.message);
        });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // updateMutation é estável; só re-roda quando o spec editado muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, catalogId]);

  /* ------------------------------------------------------------------
   *  Handlers
   * ------------------------------------------------------------------ */

  function handleSpecChange(next: CampaignSpec) {
    setSpec(next);
  }

  function handleProceed() {
    if (catalogId) {
      navigate(`/catalogos/${catalogId}/produtos`);
    }
  }

  const isGenerating = generateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 text-xs text-muted-foreground">
            <Link to="/" className="font-medium text-primary hover:underline">
              Início
            </Link>{" "}
            · Nova campanha
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            Vamos montar sua campanha
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Conta o tema, a IA prepara tudo. Você ajusta o que quiser depois.
          </p>
        </div>
        <div className="flex-shrink-0">
          {saveState === "saving" && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Salvando…
            </span>
          )}
          {saveState === "saved" && (
            <span className="flex items-center gap-1 text-[11px] text-success">
              <Check className="h-3 w-3" />
              Salvo agora
            </span>
          )}
        </div>
      </header>

      {/* Grid de duas colunas — formulário estreito (380px) à esquerda,
          resultado da IA largo (1fr) à direita. Correção Sally 2026-05-20:
          o conteúdo rico (preview + campos) precisa da coluna larga. */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[380px_1fr]">
        {/* Coluna esquerda — formulário */}
        <div className="flex flex-col gap-5">
          <StartModes
            mode={mode}
            onModeChange={setMode}
            baseCatalogId={baseCatalogId}
            onBaseCatalogChange={setBaseCatalogId}
            inspirations={inspirations}
            onInspirationsChange={setInspirations}
            disabled={isGenerating}
          />

          <ThemeInput
            value={theme}
            onChange={setTheme}
            disabled={isGenerating}
          />

          {formError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {formError}
            </div>
          )}

          <Button
            size="lg"
            className="self-start"
            onClick={() => void runGeneration()}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isGenerating ? "Montando…" : "Montar minha campanha"}
          </Button>
        </div>

        {/* Coluna direita — resultado da IA */}
        <div className="xl:sticky xl:top-6 xl:self-start">
          <AiResultPanel
            spec={spec}
            isGenerating={isGenerating}
            onSpecChange={handleSpecChange}
            onProceed={handleProceed}
            onRetry={() => void runGeneration()}
            proceedDisabled={!catalogId || saveState === "saving"}
          />
        </div>
      </div>
    </div>
  );
}
