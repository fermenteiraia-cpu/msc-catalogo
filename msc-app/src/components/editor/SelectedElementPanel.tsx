import { useState } from "react";

import type { PieceWithProduct, SizeClass } from "@/lib/queries/pieces";
import { useUpdatePiece } from "@/lib/queries/pieces";
import { brl, pieceFinalPrice } from "@/lib/money";
import { SIZE_DIMENSIONS, SIZE_LABEL } from "@/components/editor/pages";
import { cn } from "@/lib/utils";

interface SelectedElementPanelProps {
  piece: PieceWithProduct | null;
  catalogId: string;
  /** "Fileira 3 · coluna 1 (de 4)" — computed by the page from the layout. */
  positionLabel: string;
}

const SIZE_ORDER: ReadonlyArray<SizeClass> = ["P", "M", "G", "D"];

/** Parses a free-typed price ("1.234,56" / "1234.56" / "R$ 99") into a number. */
function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/[^\d,.-]/g, "").trim();
  if (cleaned === "") return null;
  // pt-BR: dot = thousands, comma = decimals.
  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Editor — painel "Elemento selecionado" (mockup Tela 4, linhas 1690-1740).
 * Shows the selected piece: size selector P/M/G/D, position, manual final
 * price and the photo control.
 */
export function SelectedElementPanel({
  piece,
  catalogId,
  positionLabel,
}: SelectedElementPanelProps) {
  const updatePiece = useUpdatePiece();

  // Local draft of the price input so typing feels instant; committed on blur.
  const [priceDraft, setPriceDraft] = useState("");
  const [draftFor, setDraftFor] = useState<string | null>(null);

  // Render-phase adjustment: re-seed the draft when the selected piece changes
  // (no setState-in-effect — runs only on a real id change).
  const currentPieceId = piece?.id ?? null;
  if (currentPieceId !== draftFor) {
    setDraftFor(currentPieceId);
    if (piece) {
      const final = pieceFinalPrice(piece);
      setPriceDraft(final !== null ? brl.format(final) : "");
    } else {
      setPriceDraft("");
    }
  }

  if (!piece) {
    return (
      <div className="rounded-lg border border-border bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-lg">🎨</span>
          <h3 className="text-sm font-semibold">Nenhum elemento selecionado</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Clique num produto no esboço ao lado pra ajustar tamanho, posição e
          preço aqui.
        </p>
      </div>
    );
  }

  const productName = piece.product?.name ?? "Produto sem nome";

  function applySize(size: SizeClass) {
    if (!piece || size === piece.size_class) return;
    updatePiece.mutate({
      pieceId: piece.id,
      catalogId,
      patch: { size_class: size },
    });
  }

  function commitPrice() {
    if (!piece) return;
    const parsed = parsePrice(priceDraft);
    // Empty input clears the override (back to the computed price).
    const next = priceDraft.trim() === "" ? null : parsed;
    if (next === piece.preco_final_override) return;
    if (priceDraft.trim() !== "" && parsed === null) {
      // Invalid text — restore the last good value.
      const final = pieceFinalPrice(piece);
      setPriceDraft(final !== null ? brl.format(final) : "");
      return;
    }
    updatePiece.mutate({
      pieceId: piece.id,
      catalogId,
      patch: { preco_final_override: next },
    });
  }

  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-lg">🎨</span>
        <h3 className="truncate text-sm font-semibold">{productName}</h3>
      </div>
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2 py-0.5 text-[10px] font-medium">
        Arte livre · mexe à vontade
      </span>

      {/* Seletor de tamanho do card */}
      <div className="mt-4 rounded-md border border-border bg-secondary p-3">
        <label className="text-xs font-semibold text-foreground">
          Tamanho do card
        </label>
        <div className="mt-1.5 grid grid-cols-4 gap-1">
          {SIZE_ORDER.map((size) => {
            const active = size === piece.size_class;
            return (
              <button
                key={size}
                type="button"
                onClick={() => applySize(size)}
                disabled={updatePiece.isPending}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-md px-1 py-2 transition-colors disabled:opacity-60",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-white text-foreground hover:bg-muted",
                )}
              >
                <span className="text-base font-extrabold">
                  {size}
                  {active ? " ⭐" : ""}
                </span>
                <span
                  className={cn(
                    "text-[9px]",
                    active ? "opacity-85" : "text-muted-foreground",
                  )}
                >
                  {SIZE_LABEL[size]}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 rounded-sm bg-white px-2.5 py-2 text-[11px]">
          <div className="font-medium text-foreground">
            Atual:{" "}
            <strong className="text-[hsl(var(--primary))]">
              {SIZE_LABEL[piece.size_class]} ({piece.size_class})
            </strong>
          </div>
          <div className="mt-0.5 text-muted-foreground">
            📐 {SIZE_DIMENSIONS[piece.size_class]}
          </div>
        </div>
        <small className="mt-1.5 block text-[11px] text-muted-foreground">
          💡 Quando você muda, o catálogo reorganiza sozinho.
        </small>
      </div>

      {/* Posição na página */}
      <div className="mt-4">
        <label className="text-xs font-medium text-muted-foreground">
          Posição na página
        </label>
        <input
          className="mt-1 w-full rounded-md border border-input bg-muted px-3 py-2 text-xs"
          value={positionLabel}
          readOnly
        />
        <small className="mt-1 block text-[11px] text-muted-foreground">
          Arrasta o card no esboço pra mudar
        </small>
      </div>

      {/* Preço final (editável → preco_final_override) */}
      <div className="mt-3">
        <label className="text-xs font-medium text-muted-foreground">
          Preço final
        </label>
        <input
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          value={priceDraft}
          onChange={(e) => setPriceDraft(e.target.value)}
          onBlur={commitPrice}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          placeholder="R$ 0,00"
          inputMode="decimal"
        />
        <small className="mt-1 block text-[11px] text-muted-foreground">
          {piece.preco_final_override !== null
            ? "Preço ajustado na mão. Apague o campo pra voltar ao preço calculado."
            : "Edita aqui se Marcos pediu mudança."}
        </small>
      </div>

      {/* ===== Overrides do esboço (sobrescrevem o produto-mestre) ===== */}
      <div className="mt-4 border-t border-border pt-3">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Ajustes do esboço
        </div>

        {/* Override do nome */}
        <div className="mt-2">
          <label className="text-xs font-medium text-muted-foreground">
            Nome no esboço
          </label>
          <input
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            defaultValue={piece.display_name ?? ""}
            onBlur={(e) => {
              const value = e.target.value.trim();
              const next = value === "" ? null : value;
              if (next === piece.display_name) return;
              updatePiece.mutate({
                pieceId: piece.id,
                catalogId,
                patch: { display_name: next },
              });
            }}
            placeholder={productName}
          />
          <small className="mt-1 block text-[11px] text-muted-foreground">
            {piece.display_name !== null
              ? "Encurtado pra arte. Apague o campo pra voltar ao nome da Terasoft."
              : "Encurte aqui se o nome da Terasoft é longo demais."}
          </small>
        </div>

        {/* Override da foto */}
        <div className="mt-3">
          <label className="text-xs font-medium text-muted-foreground">
            URL da foto (substituir)
          </label>
          <input
            type="url"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            defaultValue={piece.display_image_url ?? ""}
            onBlur={(e) => {
              const value = e.target.value.trim();
              const next = value === "" ? null : value;
              if (next === piece.display_image_url) return;
              updatePiece.mutate({
                pieceId: piece.id,
                catalogId,
                patch: { display_image_url: next },
              });
            }}
            placeholder="https://… (vazio = foto original)"
          />
          <small className="mt-1 block text-[11px] text-muted-foreground">
            Cola o URL de uma foto melhor. Apague pra voltar à foto da Terasoft.
          </small>
        </div>

        {/* Tarja opcional */}
        <div className="mt-3">
          <label className="text-xs font-medium text-muted-foreground">
            Tarja (opcional)
          </label>
          <input
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            defaultValue={piece.badge_label ?? ""}
            onBlur={(e) => {
              const value = e.target.value.trim();
              const next = value === "" ? null : value;
              if (next === piece.badge_label) return;
              updatePiece.mutate({
                pieceId: piece.id,
                catalogId,
                patch: { badge_label: next },
              });
            }}
            placeholder="ex: NOVIDADE, ÚLTIMAS UNIDADES"
            maxLength={32}
          />
          <small className="mt-1 block text-[11px] text-muted-foreground">
            Aparece como tarja amarela na arte final. Vazio = sem tarja.
          </small>
        </div>
      </div>
    </div>
  );
}
