import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CATEGORIES, CHORD_LIBRARY, searchChords, type CategoryKey, type Voicing } from "@/lib/chords";
import { useList } from "@/lib/db";
import { customRef, rowToVoicing, type CustomChordRow } from "@/lib/guitar";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChordDiagram } from "./ChordDiagram";
import { cn } from "@/lib/utils";

export function useCustomChords(): Voicing[] {
  const q = useList<CustomChordRow>("guitar_custom_chords", { order: { column: "created_at" } });
  return useMemo(() => (q.data ?? []).map(rowToVoicing).filter((v): v is Voicing => !!v), [q.data]);
}

/** Search + category browser. Shows one voicing per chord name unless `allVoicings`. */
export function ChordBrowser({
  onSelect,
  allVoicings = false,
  size = "sm",
}: {
  onSelect: (v: Voicing) => void;
  allVoicings?: boolean;
  size?: "sm" | "md";
}) {
  const custom = useCustomChords();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<CategoryKey | "todos" | "meus">("todos");
  const list = useMemo(() => {
    const base = cat === "meus" ? custom : [...custom, ...CHORD_LIBRARY];
    let res = searchChords(query, base);
    if (cat !== "todos" && cat !== "meus") res = res.filter((v) => v.category === cat);
    if (!allVoicings) {
      const seen = new Set<string>();
      res = res.filter((v) => (seen.has(v.id ?? v.name) ? false : (seen.add(v.id ?? v.name), true)));
    }
    return res.slice(0, 240);
  }, [query, cat, custom, allVoicings]);

  return (
    <div>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ex.: Am, G7, F#m, Bb, C/E"
          className="pl-8"
          autoCapitalize="off"
          autoCorrect="off"
        />
      </div>
      <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {[{ key: "todos", label: "Todos" }, ...CATEGORIES, { key: "meus", label: "Meus acordes" }].map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setCat(c.key as typeof cat)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors",
              cat === c.key ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhum acorde encontrado. Você pode cadastrar uma posição própria na Biblioteca.
        </p>
      ) : (
        <div className={cn("mt-3 grid gap-2", size === "sm" ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-4")}>
          {list.map((v, i) => (
            <button
              key={v.name + v.frets.join() + i}
              type="button"
              onClick={() => onSelect(v)}
              className="surface flex justify-center px-1 py-2 transition-colors hover:bg-muted/50"
            >
              <ChordDiagram voicing={v} size={size} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChordPickerDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (ref: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Escolher acorde</DialogTitle>
          <p className="text-xs text-muted-foreground">Seus acordes criados aparecem em “Meus acordes”.</p>
        </DialogHeader>
        {open && (
          <ChordBrowser
            onSelect={(v) => {
              onPick(v.id ? customRef(v.id) : v.name);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
