import { useEffect, useState } from "react";
import { AlertTriangle, Download } from "lucide-react";

import { supabase } from "@/lib/supabase";

interface HtmlOverridePanelProps {
  catalogId: string;
}

const BUCKET = "catalog-renders";

function publicUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Esboço HTML — camada 2 de override (mockup David, 2026-05-26).
 *
 * O `render_catalog_html.py` gera um HTML do esboço e sobe pro Storage. A
 * Sally / Amanda pode baixar esse arquivo, editar e subir como `override` —
 * o próximo render usa o HTML editado em vez de gerar do zero.
 *
 * Esta primeira versão mostra:
 *   - Link de download do HTML atual.
 *   - Aviso amarelo quando há override ativo (esboço desconectado do banco).
 *
 * O upload da customização chega numa próxima entrega (precisa de RLS no
 * bucket + UI de file input — escopo pra a próxima iteração).
 */
export function HtmlOverridePanel({ catalogId }: HtmlOverridePanelProps) {
  const [hasOverride, setHasOverride] = useState<boolean | null>(null);
  const [hasAuto, setHasAuto] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    async function check() {
      const overrideUrl = publicUrl(`${catalogId}/catalogo.override.html`);
      const autoUrl = publicUrl(`${catalogId}/catalogo.html`);
      const [ov, au] = await Promise.all([
        fetch(overrideUrl, { method: "HEAD" })
          .then((r) => r.ok)
          .catch(() => false),
        fetch(autoUrl, { method: "HEAD" })
          .then((r) => r.ok)
          .catch(() => false),
      ]);
      if (alive) {
        setHasOverride(ov);
        setHasAuto(au);
      }
    }
    void check();
    return () => {
      alive = false;
    };
  }, [catalogId]);

  // Não tem HTML ainda (renderer não rodou) — esconde o painel.
  if (hasAuto === false && hasOverride === false) {
    return null;
  }

  const downloadUrl = publicUrl(`${catalogId}/catalogo.html`);

  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-lg">📄</span>
        <h3 className="text-sm font-semibold">Esboço HTML</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        O HTML do rascunho que vai pra IA. Dá pra baixar, editar (nomes,
        fotos, layout, qualquer elemento) e subir de volta como customização.
      </p>

      {hasOverride && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-[#fcd34d] bg-[#fef3c7] px-3 py-2 text-xs text-[#78350f]">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <div>
            <strong>Esboço customizado ativo.</strong>
            <p className="mt-0.5">
              Esse esboço foi editado manualmente e está desconectado do banco.
              Se você mudar preço, produto ou desconto na Tela 3, o esboço NÃO
              atualiza sozinho — precisa baixar de novo, ajustar e subir.
            </p>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2">
        <a
          href={downloadUrl}
          download={`catalogo-${catalogId.slice(0, 8)}.html`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-secondary px-3 py-2 text-xs font-medium hover:bg-muted"
        >
          <Download className="h-3.5 w-3.5" />
          Baixar HTML atual
        </a>
        <p className="text-[11px] text-muted-foreground">
          Upload do customizado e botão de "voltar ao automático" chegam na
          próxima entrega. Por enquanto, depois de editar, manda o arquivo
          pra mim que eu subo, ou usa o painel do Supabase Storage diretamente
          (bucket <code>catalog-renders</code>, pasta{" "}
          <code>{catalogId.slice(0, 8)}…</code>, nome{" "}
          <code>catalogo.override.html</code>).
        </p>
      </div>
    </div>
  );
}
