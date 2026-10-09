import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import {
  applyBackgroundColor,
  applyPrimaryColor,
  cacheBackgroundColor,
  cachePrimaryColor,
  cachedBackgroundColor,
  cachedPrimaryColor,
  isValidHex,
} from "@/lib/theme-color";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PRIMARY_PRESETS = ["#4f7a5e", "#2563eb", "#0ea5a4", "#7c3aed", "#db2777", "#ea580c", "#ca8a04", "#334155"];
const BG_PRESETS = ["#faf9f6", "#ffffff", "#f1f5f9", "#fdf2f8", "#eef2ff", "#1e293b", "#18181b", "#0b1220"];
/** Approximate hexes of the factory colors, used only as the pickers' starting point. */
const PRIMARY_HINT = "#3e6b4f";
const BG_HINT = "#faf9f6";

function ColorRow(props: {
  label: string;
  saved: string | null;
  hint: string;
  presets: string[];
  apply: (hex: string | null) => void;
  text: string;
  setText: (v: string) => void;
}) {
  const { label, saved, hint, presets, apply, text, setText } = props;
  const hex = isValidHex(text) ? text : saved ?? hint;
  function preview(v: string) {
    setText(v);
    apply(v);
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label
          className="relative size-12 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border shadow-sm"
          style={{ background: hex }}
        >
          <input
            type="color"
            aria-label={`Escolher ${label.toLowerCase()}`}
            value={hex}
            onChange={(e) => preview(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">
            {saved ? `Personalizada · ${saved.toUpperCase()}` : "Original do sistema"}
          </p>
        </div>
        <Input
          aria-label={`Código HEX — ${label}`}
          value={text}
          placeholder="#RRGGBB"
          maxLength={7}
          className={cn("num w-28 uppercase", text && !isValidHex(text) && "border-destructive")}
          onChange={(e) => {
            let v = e.target.value.trim();
            if (v && !v.startsWith("#")) v = `#${v}`;
            setText(v);
            if (isValidHex(v)) apply(v);
          }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`${label} ${c}`}
            onClick={() => preview(c)}
            className={cn(
              "size-8 rounded-full border-2 border-border transition-transform active:scale-90",
              text.toLowerCase() === c && "border-foreground",
            )}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

export function ThemeColorPicker() {
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const savedP = profile?.primary_color ?? null;
  const savedB = profile?.background_color ?? null;
  const [pText, setPText] = useState(savedP ?? "");
  const [bText, setBText] = useState(savedB ?? "");

  useEffect(() => setPText(savedP ?? ""), [savedP]);
  useEffect(() => setBText(savedB ?? ""), [savedB]);

  // Leaving the screen without saving reverts the live preview.
  useEffect(
    () => () => {
      applyPrimaryColor(cachedPrimaryColor());
      applyBackgroundColor(cachedBackgroundColor());
    },
    [],
  );

  const norm = (v: string) => (isValidHex(v) ? v.toLowerCase() : null);
  const nextP = pText ? norm(pText) : null;
  const nextB = bText ? norm(bText) : null;
  const invalid = (pText && !nextP) || (bText && !nextB);
  const dirty = !invalid && (nextP !== savedP || nextB !== savedB);

  return (
    <div className="surface space-y-5 px-4 py-4">
      <ColorRow
        label="Cor principal"
        saved={savedP}
        hint={PRIMARY_HINT}
        presets={PRIMARY_PRESETS}
        apply={applyPrimaryColor}
        text={pText}
        setText={setPText}
      />
      <div className="h-px bg-border" />
      <ColorRow
        label="Cor do fundo"
        saved={savedB}
        hint={BG_HINT}
        presets={BG_PRESETS}
        apply={applyBackgroundColor}
        text={bText}
        setText={setBText}
      />
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
        <Button size="sm">Botão</Button>
        <span className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">Selecionado</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-2/3 rounded-full bg-primary" />
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          className="flex-1"
          disabled={!dirty || update.isPending}
          onClick={async () => {
            await update.mutateAsync({ primary_color: nextP, background_color: nextB });
            cachePrimaryColor(nextP);
            cacheBackgroundColor(nextB);
            toast.success("Tema salvo");
          }}
        >
          Salvar tema
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={async () => {
            applyPrimaryColor(null);
            applyBackgroundColor(null);
            cachePrimaryColor(null);
            cacheBackgroundColor(null);
            setPText("");
            setBText("");
            await update.mutateAsync({ primary_color: null, background_color: null });
            toast.success("Cores originais restauradas");
          }}
        >
          <RotateCcw className="size-4" /> Voltar pra cor original do sistema
        </Button>
      </div>
    </div>
  );
}
