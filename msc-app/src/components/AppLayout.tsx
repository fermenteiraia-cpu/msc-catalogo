import { useState, useCallback, useMemo } from "react";
import { Outlet } from "react-router-dom";

import { Sidebar } from "@/components/Sidebar";
import type { CampaignStep, CampaignStepperProps } from "@/components/CampaignStepper";

export interface AppLayoutProps {
  /** Defaults to step 1 (Briefing) during Phase 2 — later routes will set this. */
  currentStep?: CampaignStep;
  stepSubtitles?: CampaignStepperProps["stepSubtitles"];
}

/**
 * Shape exposed to nested routes via `useOutletContext<AppLayoutContext>()`.
 * Routes call `setStepper({ currentStep, stepSubtitles })` inside an effect to
 * drive the Sidebar dynamically without prop drilling.
 */
export interface AppLayoutContext {
  setStepper: (state: {
    currentStep: CampaignStep;
    stepSubtitles?: CampaignStepperProps["stepSubtitles"];
  }) => void;
  resetStepper: () => void;
}

/**
 * Two-column shell: fixed sidebar on the left, scrollable main on the right.
 * Nested routes render inside <Outlet /> and may override the stepper state
 * via the outlet context.
 */
export function AppLayout({
  currentStep: defaultCurrentStep = 1,
  stepSubtitles: defaultStepSubtitles,
}: AppLayoutProps) {
  const [stepper, setStepperState] = useState<{
    currentStep: CampaignStep;
    stepSubtitles?: CampaignStepperProps["stepSubtitles"];
  }>({
    currentStep: defaultCurrentStep,
    stepSubtitles: defaultStepSubtitles,
  });

  const setStepper = useCallback(
    (state: {
      currentStep: CampaignStep;
      stepSubtitles?: CampaignStepperProps["stepSubtitles"];
    }) => {
      setStepperState(state);
    },
    [],
  );

  const resetStepper = useCallback(() => {
    setStepperState({
      currentStep: defaultCurrentStep,
      stepSubtitles: defaultStepSubtitles,
    });
  }, [defaultCurrentStep, defaultStepSubtitles]);

  const outletContext = useMemo<AppLayoutContext>(
    () => ({ setStepper, resetStepper }),
    [setStepper, resetStepper],
  );

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        currentStep={stepper.currentStep}
        stepSubtitles={stepper.stepSubtitles}
      />
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet context={outletContext} />
      </main>
    </div>
  );
}
