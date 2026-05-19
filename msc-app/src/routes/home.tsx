import { useAuthStore } from "@/stores/auth";

/**
 * Phase 2 landing page rendered inside <AppLayout />.
 * The real Briefing / Produtos / Editor flows arrive in Phase 4.
 */
export function HomePlaceholder() {
  const user = useAuthStore((s) => s.user);
  const emailPrefix = user?.email?.split("@")[0] ?? "Usuário";
  const displayName =
    emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">
        Bem-vindo, {displayName}
      </h1>
      <p className="text-sm text-muted-foreground">
        Em construção — Fase 4 vai trazer os fluxos completos (catálogos,
        briefing, produtos, editor).
      </p>
      <p className="text-xs text-muted-foreground">
        Status atual: Fase 2 (fundação) concluída — auth, layout, navegação.
      </p>
    </div>
  );
}
