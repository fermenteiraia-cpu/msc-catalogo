import { useState } from "react";

import {
  CampaignStepper,
  type CampaignStep,
  type CampaignStepperProps,
} from "@/components/CampaignStepper";
import { HomeSidebar } from "@/components/HomeSidebar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";

/** Which content block the sidebar renders. */
export type SidebarMode = "home" | "campaign";

export interface SidebarProps {
  mode: SidebarMode;
  currentStep: CampaignStep;
  stepSubtitles?: CampaignStepperProps["stepSubtitles"];
}

/**
 * Derives a friendly display name and avatar initial from the user's email.
 * Until profiles are wired up, the prefix of the email is the source of truth.
 */
function displayNameFromEmail(email: string | null | undefined): string {
  if (!email) return "Usuário";
  const prefix = email.split("@")[0] ?? email;
  if (!prefix) return "Usuário";
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

function avatarInitial(email: string | null | undefined): string {
  if (!email) return "?";
  const first = email.trim().charAt(0);
  return first ? first.toUpperCase() : "?";
}

/**
 * Application sidebar. Visual structure mirrors ux-design-directions.html:
 *   - Logo block (lines 546-552 home / 690-696 campaign)
 *   - mode='home'    → "Workspace"/"Recursos" nav (<HomeSidebar />, lines 554-573)
 *   - mode='campaign'→ "Etapas da campanha" + <CampaignStepper /> (lines 698-716)
 *   - Spacer (line 575 home / 718 campaign)
 *   - User card (lines 577-583 home / 720-726 campaign)
 */
export function Sidebar({ mode, currentStep, stepSubtitles }: SidebarProps) {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const [signingOut, setSigningOut] = useState(false);

  const email = user?.email ?? null;
  const name = displayNameFromEmail(email);
  const initial = avatarInitial(email);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <aside className="flex w-64 min-h-screen flex-col gap-1 border-r border-border bg-white px-3 py-4">
      {/* Logo */}
      <div className="mb-4 flex items-center gap-2.5 px-3 py-2">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          M
        </div>
        <div className="flex flex-col leading-tight">
          <strong className="text-sm font-semibold">MSC-Catalogo</strong>
          <small className="text-[11px] text-muted-foreground">
            Sempre perto de você
          </small>
        </div>
      </div>

      {/* Mode-specific content block */}
      {mode === "home" ? (
        <HomeSidebar />
      ) : (
        <>
          {/* Section: Etapas da campanha */}
          <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Etapas da campanha
          </div>

          <CampaignStepper
            currentStep={currentStep}
            stepSubtitles={stepSubtitles}
          />
        </>
      )}

      {/* Spacer pushes the user card to the bottom */}
      <div className="flex-1" />

      {/* User card */}
      <div className="mt-2 flex items-center gap-2.5 border-t border-border px-3 pt-3">
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--primary)), #5050A0)",
          }}
        >
          {initial}
        </div>
        <div className="flex min-w-0 flex-col leading-tight">
          <strong className="truncate text-[13px] font-medium">{name}</strong>
          <small className="truncate text-[11px] text-muted-foreground">
            Lojas MSC · Marketing
          </small>
        </div>
      </div>

      <div className="px-3 pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs text-muted-foreground hover:text-foreground"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? "Saindo..." : "Sair"}
        </Button>
      </div>
    </aside>
  );
}
