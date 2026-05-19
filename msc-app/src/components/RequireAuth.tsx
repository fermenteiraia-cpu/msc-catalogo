import { Navigate, Outlet } from "react-router-dom";

import { useAuthStore } from "@/stores/auth";

/**
 * Route guard rendered as an element on a parent <Route>.
 * - Shows a minimal "Carregando..." while auth bootstrap is in flight.
 * - Redirects to /login when initialized but unauthenticated.
 * - Renders nested routes via <Outlet /> when authenticated.
 */
export function RequireAuth() {
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <p className="text-sm">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
