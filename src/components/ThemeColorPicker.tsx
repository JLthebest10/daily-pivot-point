import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { applyPrimaryColor, cachePrimaryColor, isValidHex } from "@/lib/theme-color";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PRESETS = ["#4f7a5e", "#2563eb", "#0ea5a4", "#7c3aed", "#db2777", "#ea580c", "#ca8a04", "#334155"];
/** Approximate hex of the factory green, used only as the picker's starting point. */
const FACTORY_HINT = "#3e6b4f";

export function ThemeColorPicker() {
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const saved = profile?.primary_color ?? null;
  const [hex, setHex] = useState(saved ?? FACTORY_HINT);
  const [text, setText] = useState(saved ?? "");

  useEffect(() => {
    setHex(saved ?? FACTORY_HINT);
    setText(saved ?? "");
  }, [saved]);

  function preview(v: string) {
    setHex(v);
    setText(v);
    applyPrimaryColor(v);
  }

  const dirty = isValidHex(text) && text.toLowerCase() !== (saved ?? "").toLowerCase();

  return (
    <div className="surface space-y-4 px-4 py-4">
      <div className="flex items-center gap-3">
        <label className="relative size-12 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border bg-primary">
          <input
            type="color"
            aria-label="Escolher cor"
            value={hex}
            onChange={(e) => preview(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Cor principal</p>
          <p className="text-xs text-muted-foreground">
            {saved ? `Personalizada · ${saved.toUpperCase()}` : "Original do sistema"}
          </p>
        </div>
        <Input
          aria-label="Código HEX"
          value={text}
          placeholder="#RRGGBB"
          maxLength={7}
          className={cn("num w-28 uppercase", text && !isValidHex(text) && "border-destructive")}
          onChange={(e) => {
            let v = e.target.value.trim();
            if (v && !v.startsWith("#")) v = `#${v}`;
            setText(v);
            if (isValidHex(v)) {
              setHex(v);
              applyPrimaryColor(v);
            }
          }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Cor ${c}`}
            onClick={() => preview(c)}
            className={cn(
              "size-8 rounded-full border-2 border-transparent transition-transform active:scale-90",
              text.toLowerCase() === c && "border-foreground",
            )}
            style={{ background: c }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-muted/50 p-3">
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
            await update.mutateAsync({ primary_color: text.toLowerCase() });
            cachePrimaryColor(text.toLowerCase());
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
            cachePrimaryColor(null);
            setText("");
            setHex(FACTORY_HINT);
            await update.mutateAsync({ primary_color: null });
            toast.success("Cor original restaurada");
          }}
        >
          <RotateCcw className="size-4" /> Voltar pra cor original do sistema
        </Button>
      </div>
    </div>
  );
}
