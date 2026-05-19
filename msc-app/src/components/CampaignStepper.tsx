import { cn } from "@/lib/utils";

export type CampaignStep = 1 | 2 | 3 | 4;

type StepState = "done" | "active" | "pending";

interface StepDefinition {
  step: CampaignStep;
  label: string;
}

const STEPS: ReadonlyArray<StepDefinition> = [
  { step: 1, label: "1. Briefing" },
  { step: 2, label: "2. Produtos" },
  { step: 3, label: "3. Editor & Preview" },
  { step: 4, label: "4. Exportar" },
];

export interface CampaignStepperProps {
  currentStep: CampaignStep;
  /** Optional override of the subtitle per step (e.g., "32 selecionados · 3 destaques"). */
  stepSubtitles?: Partial<Record<CampaignStep, string>>;
}

function defaultSubtitle(state: StepState): string {
  switch (state) {
    case "done":
      return "Concluído";
    case "active":
      return "Em andamento";
    case "pending":
      return "Pendente";
  }
}

function stateFor(step: CampaignStep, current: CampaignStep): StepState {
  if (step < current) return "done";
  if (step === current) return "active";
  return "pending";
}

function glyphFor(state: StepState): string {
  switch (state) {
    case "done":
      return "✓";
    case "active":
      return "●";
    case "pending":
      return "○";
  }
}

/**
 * Vertical 4-step indicator for the campaign authoring flow.
 * Mirrors the .stepper / .step-item / .step-num / .step-info structure from
 * ux-design-directions.html (lines 102-122). Labels match the mockup exactly.
 */
export function CampaignStepper({
  currentStep,
  stepSubtitles,
}: CampaignStepperProps) {
  return (
    <div className="flex flex-col gap-[2px] py-1">
      {STEPS.map(({ step, label }) => {
        const state = stateFor(step, currentStep);
        const subtitle = stepSubtitles?.[step] ?? defaultSubtitle(state);

        return (
          <div
            key={step}
            className={cn(
              "flex items-start gap-2.5 rounded-md px-3 py-2 transition-colors",
              state === "active" && "bg-secondary",
              state !== "active" && "hover:bg-muted",
            )}
          >
            <span
              className={cn(
                "inline-flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                state === "pending" && "bg-muted text-muted-foreground",
                state === "active" && "bg-primary text-primary-foreground",
                state === "done" &&
                  "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]",
              )}
            >
              {glyphFor(state)}
            </span>
            <div className="flex min-w-0 flex-col leading-snug">
              <strong
                className={cn(
                  "text-[13px] font-medium",
                  state === "active" && "font-semibold text-primary",
                  state === "done" && "text-[hsl(var(--success))]",
                )}
              >
                {label}
              </strong>
              <small className="text-[11px] text-muted-foreground">
                {subtitle}
              </small>
            </div>
          </div>
        );
      })}
    </div>
  );
}
