import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  uploadInspirationImages,
  useReusableCatalogs,
  type BriefingMode,
} from "@/lib/queries/briefing";

export interface InspirationImage {
  /** URL pública no Storage. */
  url: string;
  /** Nome original do arquivo (exibição). */
  name: string;
}

interface StartModesProps {
  mode: BriefingMode;
  onModeChange: (mode: BriefingMode) => void;
  baseCatalogId: string | null;
  onBaseCatalogChange: (id: string | null) => void;
  inspirations: InspirationImage[];
  onInspirationsChange: (images: InspirationImage[]) => void;
  disabled: boolean;
}

/**
 * Briefing — bloco "Por onde a gente começa?" (mockup linhas 750-786).
 * Modo padrão: "Aproveitar uma campanha anterior" com badge e <select>.
 * Os outros dois modos ficam dentro de um <details> recolhido.
 */
export function StartModes({
  mode,
  onModeChange,
  baseCatalogId,
  onBaseCatalogChange,
  inspirations,
  onInspirationsChange,
  disabled,
}: StartModesProps) {
  const reusableQuery = useReusableCatalogs();
  const reusable = reusableQuery.data ?? [];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);
    const files = Array.from(fileList).slice(
      0,
      Math.max(0, 3 - inspirations.length),
    );
    if (files.length === 0) {
      setUploadError("Você já anexou o máximo de 3 imagens.");
      return;
    }
    setUploading(true);
    const result = await uploadInspirationImages(files);
    setUploading(false);
    if (!result.ok) {
      setUploadError(result.error.message);
      return;
    }
    const added = result.value.urls.map((url, i) => ({
      url,
      name: files[i]?.name ?? "imagem",
    }));
    onInspirationsChange([...inspirations, ...added]);
  }

  function removeInspiration(url: string) {
    onInspirationsChange(inspirations.filter((img) => img.url !== url));
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        Por onde a gente começa?
      </label>

      {/* Modo padrão — Aproveitar campanha anterior */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onModeChange("aproveitar")}
          className={cn(
            "flex items-start gap-2.5 rounded-lg border px-4 py-4 text-left transition-colors disabled:opacity-60",
            mode === "aproveitar"
              ? "border-primary bg-secondary"
              : "border-border hover:bg-secondary",
          )}
        >
          <span
            className={cn(
              "mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2",
              mode === "aproveitar"
                ? "border-primary bg-[radial-gradient(circle,hsl(var(--primary))_40%,transparent_50%)]"
                : "border-border",
            )}
          />
          <span className="flex-1">
            <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
              📋 Aproveitar uma campanha anterior
              <Badge variant="secondary" className="bg-accent text-accent-foreground">
                ⭐ jeito mais rápido
              </Badge>
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Parte de uma campanha pronta e ajusta o necessário
            </span>
            {mode === "aproveitar" && (
              <select
                value={baseCatalogId ?? ""}
                disabled={disabled || reusable.length === 0}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  onBaseCatalogChange(e.target.value || null)
                }
                className="mt-2 block w-full max-w-[280px] rounded-md border border-input bg-background px-3 py-1.5 text-xs disabled:opacity-60"
              >
                <option value="">
                  {reusable.length === 0
                    ? "Nenhuma campanha anterior disponível"
                    : "Escolha uma campanha…"}
                </option>
                {reusable.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
          </span>
        </button>
      </div>

      {/* Outros modos — recolhidos */}
      <details className="mt-3">
        <summary className="cursor-pointer py-1.5 text-xs text-muted-foreground">
          Começar de outro jeito (raro)
        </summary>
        <div className="mt-2 flex flex-col gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onModeChange("do-zero")}
            className={cn(
              "flex items-start gap-2.5 rounded-lg border px-4 py-3 text-left transition-colors disabled:opacity-60",
              mode === "do-zero"
                ? "border-primary bg-secondary"
                : "border-border hover:bg-secondary",
            )}
          >
            <span
              className={cn(
                "mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2",
                mode === "do-zero"
                  ? "border-primary bg-[radial-gradient(circle,hsl(var(--primary))_40%,transparent_50%)]"
                  : "border-border",
              )}
            />
            <span className="flex-1">
              <span className="block text-sm font-medium">
                📄 Começar do zero
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                A IA cria tudo só com o tema
              </span>
            </span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => onModeChange("imagem")}
            className={cn(
              "flex items-start gap-2.5 rounded-lg border px-4 py-3 text-left transition-colors disabled:opacity-60",
              mode === "imagem"
                ? "border-primary bg-secondary"
                : "border-border hover:bg-secondary",
            )}
          >
            <span
              className={cn(
                "mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2",
                mode === "imagem"
                  ? "border-primary bg-[radial-gradient(circle,hsl(var(--primary))_40%,transparent_50%)]"
                  : "border-border",
              )}
            />
            <span className="flex-1">
              <span className="block text-sm font-medium">
                🎨 Me inspirar numa imagem
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Anexa até 3 imagens. Você escolhe quão fiel a IA será.
              </span>

              {mode === "imagem" && (
                <span className="mt-2 block" onClick={(e) => e.stopPropagation()}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      void handleFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    disabled={disabled || uploading || inspirations.length >= 3}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-60"
                  >
                    {uploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ImagePlus className="h-3.5 w-3.5" />
                    )}
                    {uploading
                      ? "Enviando…"
                      : `Anexar imagens (${inspirations.length}/3)`}
                  </button>

                  {inspirations.length > 0 && (
                    <span className="mt-2 flex flex-wrap gap-2">
                      {inspirations.map((img) => (
                        <span
                          key={img.url}
                          className="group relative inline-block h-14 w-14 overflow-hidden rounded-md border border-border"
                        >
                          <img
                            src={img.url}
                            alt={img.name}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeInspiration(img.url)}
                            className="absolute right-0.5 top-0.5 rounded-full bg-foreground/70 p-0.5 text-background"
                            aria-label={`Remover ${img.name}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </span>
                  )}

                  {uploadError && (
                    <span className="mt-1.5 block text-xs text-destructive">
                      {uploadError}
                    </span>
                  )}
                </span>
              )}
            </span>
          </button>
        </div>
      </details>
    </div>
  );
}
