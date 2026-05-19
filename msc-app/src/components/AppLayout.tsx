import { Outlet } from "react-router-dom";

import { Sidebar } from "@/components/Sidebar";
import type { CampaignStep, CampaignStepperProps } from "@/components/CampaignStepper";

export interface AppLayoutProps {
  /** Defaults to step 1 (Briefing) during Phase 2 — later routes will set this. */
  currentStep?: CampaignStep;
  stepSubtitles?: CampaignStepperProps["stepSubtitles"];
}

/**
 * Two-column shell: fixed sidebar on the left, scrollable main on the right.
 * Nested routes render inside <Outlet />.
 */
export function AppLayout({ currentStep = 1, stepSubtitles }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar currentStep={currentStep} stepSubtitles={stepSubtitles} />
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
