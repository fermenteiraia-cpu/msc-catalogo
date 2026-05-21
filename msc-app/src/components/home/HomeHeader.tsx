import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

import { buttonVariants } from "@/components/ui/button";
import { useCatalogCounts } from "@/lib/queries/catalogs";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";

/**
 * Capitalized first part of the user's email — same logic the placeholder
 * Home used. Falls back to "Usuário".
 */
function firstNameFromEmail(email: string | null | undefined): string {
  const prefix = email?.split("@")[0];
  if (!prefix) return "Usuário";
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

/** Singular/plural helper for the rascunho count. */
function rascunhoLabel(n: number): string {
  return n === 1 ? "1 campanha em rascunho" : `${n} campanhas em rascunho`;
}

/** Singular/plural helper for the publicadas count. */
function publicadasLabel(n: number): string {
  return n === 1 ? "1 publicada" : `${n} publicadas`;
}

/**
 * Home header — mockup lines 587-602.
 * Greeting + dynamic counts subtitle on the left, "Nova campanha" on the right.
 */
export function HomeHeader() {
  const user = useAuthStore((s) => s.user);
  const firstName = firstNameFromEmail(user?.email);

  const countsQuery = useCatalogCounts();
  const counts = countsQuery.data;

  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Oi, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {counts ? (
            <>
              Você tem{" "}
              <strong className="font-semibold text-foreground">
                {rascunhoLabel(counts.rascunho)}
              </strong>{" "}
              e{" "}
              <strong className="font-semibold text-foreground">
                {publicadasLabel(counts.publicadas)}
              </strong>
              .
            </>
          ) : (
            "Carregando suas campanhas..."
          )}
        </p>
      </div>
      <Link
        to="/catalogos/novo"
        className={cn(buttonVariants({ variant: "default" }), "flex-shrink-0")}
      >
        <Plus className="h-4 w-4" />
        Nova campanha
      </Link>
    </header>
  );
}
