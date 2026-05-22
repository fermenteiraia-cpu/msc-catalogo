import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Largura de projeto da folha do catálogo. EditorCover e EditorSketch são
 * desenhados nesta largura fixa (tamanhos em px batem entre si); o SheetScaler
 * cuida de encaixar isso em qualquer espaço.
 */
export const SHEET_DESIGN_WIDTH = 620;

/** Proporção da folha (largura / altura), igual à do encarte MSC real. */
const SHEET_ASPECT = "748 / 862";

/**
 * Renderiza a folha do catálogo numa largura fixa de projeto e a escala com
 * transform pra preencher o espaço disponível — assim a capa e as páginas
 * ficam idênticas no Editor (coluna estreita) e no Modo Apresentação (tela
 * cheia), sem texto cortado nem proporção quebrada.
 */
export function SheetScaler({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // O ResizeObserver dispara assim que observado — sem setState síncrono.
    const ro = new ResizeObserver(() => {
      setScale(el.clientWidth / SHEET_DESIGN_WIDTH);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: SHEET_ASPECT }}
    >
      <div
        style={{
          width: SHEET_DESIGN_WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}
