import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { CATEGORIES } from "@/lib/chords";
import { useSave } from "@/lib/db";
import { voicingFromEditor, type CustomChordRow, type FingerPos, type StringState } from "@/lib/guitar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui-kit";
import { selectCls } from "@/components/flashcards/TopicForm";
import { ChordDiagram } from "./ChordDiagram";
import { cn } from "@/lib/utils";

const ROWS = 5;
const STRING_NAMES = ["6ª", "5ª", "4ª", "3ª", "2ª", "1ª"];
const FINGER_NAMES = ["", "Indicador", "Médio", "Anelar", "Mínimo"];

/** Visual fretboard editor. Stores exactly what the user draws (string, fret, finger). */
export function ChordEditor({ initial, onDone }: { initial?: CustomChordRow | undefined; onDone: () => void }) {
  const save = useSave("guitar_custom_chords", initial ? "Acorde atualizado" : "Acorde salvo");
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [strings, setStrings] = useState<StringState[]>(
    initial?.strings ?? ["open", "open", "open", "open", "open", "open"],
  );
  const [positions, setPositions] = useState<FingerPos[]>(initial?.positions ?? []);
  const [base, setBase] = useState(initial?.base_fret ?? 1);
  const [finger, setFinger] = useState(1);

  const pressedOut = positions.some((p) => strings[p.string] === "pressed" && (p.fret < base || p.fret >= base + ROWS));
  const preview = useMemo(() => voicingFromEditor(name.trim() || "Novo acorde", strings, positions, base), [name, strings, positions, base]);
  const allMuted = strings.every((s) => s === "muted");

  function tapCell(string: number, fret: number) {
    const cur = positions.find((p) => p.string === string);
    if (cur && cur.fret === fret && strings[string] === "pressed") {
      if (cur.finger === finger) {
        // same finger again → remove the position, string becomes open
        setPositions((ps) => ps.filter((p) => p.string !== string));
        setStrings((s) => s.map((x, i) => (i === string ? "open" : x)));
        return;
      }
      setPositions((ps) => ps.map((p) => (p.string === string ? { ...p, finger } : p)));
      return;
    }
    setPositions((ps) => [...ps.filter((p) => p.string !== string), { string, fret, finger }]);
    setStrings((s) => s.map((x, i) => (i === string ? "pressed" : x)));
  }

  function setState(string: number, st: "open" | "muted") {
    setStrings((s) => s.map((x, i) => (i === string ? st : x)));
    setPositions((ps) => ps.filter((p) => p.string !== string));
  }

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim() || pressedOut || allMuted) return;
        const used = positions.filter((p) => strings[p.string] === "pressed");
        await save.mutateAsync({
          ...(initial ? { id: initial.id } : {}),
          name: name.trim(),
          category: category || null,
          note: note.trim() || null,
          strings,
          positions: used,
          base_fret: base,
          frets: preview.frets.map((f) => (f == null ? "x" : f)).join(","),
          fingers: preview.fingers.map((f) => f ?? 0).join(","),
        });
        onDone();
      }}
    >
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Dedo que será colocado</p>
        <div className="grid grid-cols-4 gap-1.5">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setFinger(n)}
              aria-pressed={finger === n}
              className={cn(
                "flex flex-col items-center rounded-lg border py-1.5 text-sm transition-colors",
                finger === n ? "border-primary bg-primary text-primary-foreground" : "border-border",
              )}
            >
              <span className="font-semibold">{n}</span>
              <span className="text-[10px] opacity-80">{FINGER_NAMES[n]}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Toque na casa para marcar o dedo</p>
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="icon" className="size-8" aria-label="Casa inicial anterior" disabled={base <= 1} onClick={() => setBase(base - 1)}>
              <Minus className="size-3.5" />
            </Button>
            <span className="num w-16 text-center text-xs">a partir da {base}ª</span>
            <Button type="button" variant="outline" size="icon" className="size-8" aria-label="Próxima casa inicial" disabled={base >= 15} onClick={() => setBase(base + 1)}>
              <Plus className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="mx-auto max-w-xs">
          {/* per-string state */}
          <div className="grid grid-cols-6 gap-1 pl-7">
            {strings.map((st, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">{STRING_NAMES[i]}</span>
                <button
                  type="button"
                  onClick={() => setState(i, "open")}
                  aria-label={`Corda ${STRING_NAMES[i]} solta`}
                  aria-pressed={st === "open"}
                  className={cn("h-8 w-full rounded-md border text-xs font-semibold", st === "open" ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground")}
                >
                  O
                </button>
                <button
                  type="button"
                  onClick={() => setState(i, "muted")}
                  aria-label={`Corda ${STRING_NAMES[i]} abafada`}
                  aria-pressed={st === "muted"}
                  className={cn("h-8 w-full rounded-md border text-xs font-semibold", st === "muted" ? "border-destructive bg-destructive/10 text-destructive" : "border-border text-muted-foreground")}
                >
                  X
                </button>
              </div>
            ))}
          </div>

          {/* fretboard */}
          <div className="mt-2 flex">
            <div className="flex w-7 flex-col">
              {Array.from({ length: ROWS }).map((_, r) => (
                <span key={r} className="flex h-12 items-center text-[10px] text-muted-foreground">{base + r}ª</span>
              ))}
            </div>
            <div className={cn("grid flex-1 grid-cols-6 overflow-hidden rounded-sm border-x border-b border-border", base === 1 ? "border-t-4 border-t-foreground" : "border-t")}>
              {Array.from({ length: ROWS }).flatMap((_, r) =>
                strings.map((st, i) => {
                  const fret = base + r;
                  const p = positions.find((x) => x.string === i && x.fret === fret);
                  const on = p && st === "pressed";
                  return (
                    <button
                      key={`${r}-${i}`}
                      type="button"
                      onClick={() => tapCell(i, fret)}
                      aria-label={`Corda ${STRING_NAMES[i]}, casa ${fret}${on ? `, dedo ${p.finger}` : ""}`}
                      className="relative flex h-12 items-center justify-center border-b border-border/70"
                    >
                      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-muted-foreground" />
                      {on && (
                        <span className="relative flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                          {p.finger}
                        </span>
                      )}
                    </button>
                  );
                }),
              )}
            </div>
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Tocar de novo com o mesmo dedo remove a marcação. Com outro dedo, troca o número.
        </p>
        {pressedOut && <p className="mt-1 text-center text-xs text-destructive">Há dedos fora das casas visíveis. Ajuste a casa inicial.</p>}
      </div>

      <div className="surface flex flex-col items-center py-3">
        <p className="mb-1 text-xs text-muted-foreground">Como vai ficar na biblioteca</p>
        <ChordDiagram voicing={preview} size="md" />
      </div>

      <Field label="Nome do acorde">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: F fácil, Am, G7" maxLength={30} required />
      </Field>
      <Field label="Categoria (opcional)">
        <select className={selectCls} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">—</option>
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
      </Field>
      <Field label="Observação (opcional)">
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: versão que uso em Wonderwall" />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={onDone}>Cancelar</Button>
        <Button type="submit" disabled={!name.trim() || pressedOut || allMuted || save.isPending}>Salvar acorde</Button>
      </div>
    </form>
  );
}
