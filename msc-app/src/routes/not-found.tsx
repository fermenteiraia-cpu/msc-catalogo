import { Link } from "react-router-dom";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Catch-all route. Renders for any URL that doesn't match a defined route,
 * so a wrong/not-yet-built path shows a friendly message instead of a blank
 * white screen (the React tree unmounting silently).
 */
export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
      <h1 className="text-3xl font-bold text-primary">Página não encontrada</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Essa tela ainda não existe ou o endereço está errado. Pode ser uma
        parte do app que ainda está em construção.
      </p>
      <Link to="/" className={cn(buttonVariants({ variant: "default" }))}>
        ← Voltar para a página inicial
      </Link>
    </div>
  );
}
