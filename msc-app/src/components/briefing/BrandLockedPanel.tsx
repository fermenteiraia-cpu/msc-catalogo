import { Lock } from "lucide-react";

/**
 * Briefing — painel cinza somente-leitura "🔒 Coisas da marca MSC que entram
 * sozinhas" (mockup linhas 959-965). A Amanda não mexe nisso.
 */
export function BrandLockedPanel() {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="border-b border-border py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        🔒 Coisas da marca MSC que entram sozinhas
      </div>

      <div className="rounded-md bg-muted px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
        <div className="mb-1 flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5" />
          <strong className="text-foreground">A gente já cuida.</strong>
        </div>
        <p className="text-[11px]">
          Mascote, logo, endereço das 9 lojas, redes sociais e textos legais
          entram automaticamente em toda campanha — sem você precisar mexer.
        </p>
      </div>
    </div>
  );
}
