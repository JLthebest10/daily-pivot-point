import { useState } from "react";
import { Search } from "lucide-react";
import { MUSCLE_GROUPS, firstReps, type LibraryExercise } from "@/lib/training";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormModal } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import { ExerciseForm, selectClass } from "./ExerciseForm";
import { ExerciseThumb } from "./ExerciseMedia";

export type Prescription = { sets: number; reps: string; rest: number; note: string };

/** "+ Exercício": criar novo ou escolher da biblioteca, depois ajustar a prescrição deste treino. */
export function AddExerciseModal({
  open,
  onOpenChange,
  library,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  library: LibraryExercise[];
  onAdd: (lib: LibraryExercise, p: Prescription) => Promise<void>;
}) {
  const [mode, setMode] = useState<"library" | "new">(library.length ? "library" : "new");
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const [picked, setPicked] = useState<LibraryExercise | null>(null);
  const [p, setP] = useState({ sets: "3", reps: "10", rest: "60", note: "" });
  const [busy, setBusy] = useState(false);

  function choose(lib: LibraryExercise) {
    setPicked(lib);
    setP({
      sets: String(lib.default_sets),
      reps: lib.default_reps,
      rest: String(lib.default_rest_sec),
      note: "",
    });
  }

  function close(v: boolean) {
    onOpenChange(v);
    if (!v) {
      setPicked(null);
      setQ("");
    }
  }

  const filtered = library.filter(
    (l) =>
      (!group || l.muscle_group === group) &&
      l.name.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <FormModal open={open} onOpenChange={close} title={picked ? picked.name : "Adicionar exercício"}>
      {picked ? (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await onAdd(picked, {
                sets: Math.max(1, Number(p.sets) || 3),
                reps: p.reps.trim() || String(firstReps(p.reps)),
                rest: Math.max(0, Number(p.rest) || 0),
                note: p.note.trim(),
              });
              close(false);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="flex items-center gap-3">
            <ExerciseThumb path={picked.media_path} type={picked.media_type} name={picked.name} />
            <p className="text-xs text-muted-foreground">
              Prescrição só deste treino. A mídia e as informações da biblioteca são reaproveitadas.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Séries">
              <Input
                inputMode="numeric"
                value={p.sets}
                onChange={(e) => setP({ ...p, sets: e.target.value.replace(/\D/g, "") })}
              />
            </Field>
            <Field label="Reps">
              <Input value={p.reps} onChange={(e) => setP({ ...p, reps: e.target.value })} />
            </Field>
            <Field label="Descanso (s)">
              <Input
                inputMode="numeric"
                value={p.rest}
                onChange={(e) => setP({ ...p, rest: e.target.value.replace(/\D/g, "") })}
              />
            </Field>
          </div>
          <Field label="Observação neste treino">
            <Input value={p.note} onChange={(e) => setP({ ...p, note: e.target.value })} />
          </Field>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setPicked(null)}>
              Voltar
            </Button>
            <Button type="submit" className="flex-1" disabled={busy}>
              Adicionar ao treino
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            {(
              [
                ["library", "Da biblioteca"],
                ["new", "Criar novo"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setMode(k)}
                className={cn(
                  "rounded-md py-1.5 text-sm transition-colors",
                  mode === k ? "bg-background font-medium shadow-sm" : "text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "new" ? (
            <ExerciseForm
              library={library}
              submitLabel="Salvar e continuar"
              onSaved={choose}
              onUseExisting={choose}
            />
          ) : (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Pesquisar"
                    className="pl-8"
                  />
                </div>
                <select
                  className={cn(selectClass, "w-32")}
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  aria-label="Grupo muscular"
                >
                  <option value="">Todos</option>
                  {MUSCLE_GROUPS.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </div>
              {filtered.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nada encontrado.{" "}
                  <button className="text-primary underline" onClick={() => setMode("new")}>
                    Criar novo
                  </button>
                </p>
              ) : (
                <ul className="max-h-[50vh] space-y-1.5 overflow-y-auto">
                  {filtered.map((l) => (
                    <li key={l.id}>
                      <button
                        type="button"
                        onClick={() => choose(l)}
                        className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-muted"
                      >
                        <span>
                          <ExerciseThumb
                            interactive={false}
                            path={l.media_path}
                            type={l.media_type}
                            name={l.name}
                            className="size-12"
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{l.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {[l.muscle_group, l.equipment, `${l.default_sets}×${l.default_reps}`]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </FormModal>
  );
}
