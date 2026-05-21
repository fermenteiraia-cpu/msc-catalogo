interface ThemeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

/**
 * Briefing — campo "Tema da campanha" (mockup linhas 788-793).
 * Textarea livre + linha de dica sobre o que a IA deduz do tema.
 */
export function ThemeInput({ value, onChange, disabled }: ThemeInputProps) {
  return (
    <div>
      <label
        htmlFor="briefing-theme"
        className="mb-1.5 block text-xs font-medium text-muted-foreground"
      >
        Tema da campanha
      </label>
      <textarea
        id="briefing-theme"
        rows={2}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ex.: campanha mês das mães 2026"
        className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
      />
      <small className="mt-1.5 block text-xs text-muted-foreground">
        Com isso a IA já adivinha as cores, os enfeites, o estilo das letras e o
        clima da campanha.
      </small>
    </div>
  );
}
