import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";

interface FinalArtViewerProps {
  /** URL of the rendered 3D art for the open page, or null before generating. */
  artUrl: string | null;
  /** True while the render Edge Function is running (~3 min). */
  isGenerating: boolean;
}

/** Diagonal hatch background used by the empty/loading states (mockup linha 1677). */
const HATCH =
  "repeating-linear-gradient(45deg, #f4f4f8, #f4f4f8 10px, #e8e8ee 10px, #e8e8ee 20px)";

/**
 * Editor — coluna direita "Arte final (acabamento 3D)" (mockup Tela 4,
 * linhas 1671-1683). Read-only viewer: empty placeholder until the IA render
 * finishes, then the generated 3D page.
 */
export function FinalArtViewer({ artUrl, isGenerating }: FinalArtViewerProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold">
          ✨ Arte final (acabamento 3D)
        </h3>
        <Badge variant="secondary">
          {isGenerating
            ? "gerando…"
            : artUrl
              ? "pronta"
              : "esperando você"}
        </Badge>
      </div>

      {artUrl && !isGenerating ? (
        <img
          src={artUrl}
          alt="Arte final 3D da página"
          className="w-full rounded-xl border border-border shadow-sm"
          style={{ aspectRatio: "11 / 14", objectFit: "cover" }}
        />
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-8 text-center"
          style={{ aspectRatio: "11 / 14", background: HATCH }}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              <strong className="text-sm text-muted-foreground">
                A IA está dando o acabamento 3D…
              </strong>
              <p className="max-w-[240px] text-xs leading-relaxed text-muted-foreground">
                Demora uns 3 minutos. Pode ir pegar um café — a gente te chama
                quando ficar pronto.
              </p>
            </>
          ) : (
            <>
              <svg
                className="h-12 w-12 text-muted-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              <strong className="text-sm text-muted-foreground">
                A arte final 3D vai aparecer aqui
              </strong>
              <p className="max-w-[240px] text-xs leading-relaxed text-muted-foreground">
                Quando você apertar “✨ Gerar arte final”, a IA pega seu esboço
                e transforma em peça 3D premium. Vai e pega um café — em uns 3
                minutos a gente te chama.
              </p>
              <p className="max-w-[240px] text-[11px] italic leading-relaxed text-muted-foreground">
                A IA é a maquiadora da peça: deixa bonita, mas não muda nem uma
                palavra do que você escreveu.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
