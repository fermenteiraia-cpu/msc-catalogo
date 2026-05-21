import { useEffect, type ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AppLayout } from "@/components/AppLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { LoginPage } from "@/routes/login";
import { SignupPage } from "@/routes/signup";
import { HomePage } from "@/routes/home";
import { ProdutosPage } from "@/routes/produtos";
import { NotFoundPage } from "@/routes/not-found";
import { useAuthStore } from "@/stores/auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Wires up the supabase auth subscription exactly once at app startup.
 * Lives inside <BrowserRouter> so it shares the tree but above <Routes>.
 */
function AuthInitializer({ children }: { children: ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthInitializer>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<AppLayout mode="home" />}>
                <Route path="/" element={<HomePage />} />
              </Route>
              <Route element={<AppLayout mode="campaign" />}>
                <Route
                  path="/catalogos/:id/produtos"
                  element={<ProdutosPage />}
                />
              </Route>
            </Route>
            {/* Catch-all: qualquer rota não mapeada cai aqui em vez de
                desmontar a árvore e mostrar tela branca. */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthInitializer>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
