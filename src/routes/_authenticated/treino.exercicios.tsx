import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { db, useList } from "@/lib/db";
import {
  MUSCLE_GROUPS,
  exerciseHistory,
  type LibraryExercise,
  type Session,
  type SetLog,
  type WorkoutExercise,
} from "@/lib/training";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState, FormModal, LoadingList, PageHeader } from "@/components/ui-kit";
import { ExerciseForm, selectClass } from "@/components/treino/ExerciseForm";
import { ExerciseThumb, deleteExerciseMedia } from "@/components/treino/ExerciseMedia";
import { ExerciseHistory } from "@/components/treino/ExerciseHistory";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/treino/exercicios")({
  head: () => ({
    meta: [
      { title: "Biblioteca de exercícios — Life Hub" },
      { name: "description", content: "Seus exercícios com imagem, vídeo e evolução de carga." },
      { property: "og:title", content: "Biblioteca de exercícios — Life Hub" },
      { property: "og:description", content: "Crie, pesquise e reutilize exercícios nos seus treinos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const qc = useQueryClient();
  const libQ = useList<LibraryExercise>("exercise_library", { order: { column: "name" } });
  const exQ = useList<WorkoutExercise>("exercises");
  const sessQ = useList<Session>("workout_sessions");
  const setsQ = useList<SetLog>("exercise_sets", { order: { column: "created_at", ascending: false } });
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<LibraryExercise | null>(null);
  const [deleting, setDeleting] = useState<LibraryExercise | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const library = libQ.data ?? [];
  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of exQ.data ?? []) if (e.library_id && !e.archived) m.set(e.library_id, (m.get(e.library_id) ?? 0) + 1);
    return m;
  }, [exQ.data]);
  const filtered = library.filter(
    (l) => (!group || l.muscle_group === group) && l.name.toLowerCase().includes(q.trim().toLowerCase()),
  );

  async function remove(l: LibraryExercise) {
    const { error } = await db.from("exercise_library").delete().eq("id", l.id);
    if (error) return toast.error(error.message);
    await deleteExerciseMedia(l.media_path);
    await qc.invalidateQueries({ queryKey: ["exercise_library"] });
    toast.success("Exercício excluído da biblioteca");
    setDeleting(null);
  }

  return (
    <>
      <Link to="/treino" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Treinos
      </Link>
      <PageHeader
        title="Biblioteca"
        subtitle={`${library.length} exercícios`}
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Novo
          </Button>
        }
      />
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar" className="pl-8" />
        </div>
        <select
          className={cn(selectClass, "w-36")}
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

      {libQ.isLoading ? (
        <LoadingList />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nenhum exercício."
          description="Cadastre exercícios com foto ou vídeo e use em qualquer treino."
          actionLabel="Criar exercício"
          onAction={() => setCreating(true)}
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((l) => {
            const used = usage.get(l.id) ?? 0;
            return (
              <li key={l.id} className="surface px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{l.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[l.muscle_group, l.equipment, `${l.default_sets}×${l.default_reps}`, `${l.default_rest_sec}s`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {used ? `Em ${used} treino${used > 1 ? "s" : ""}` : "Não usado em treinos"}
                    </p>
                  </div>
                  <ExerciseThumb path={l.media_path} type={l.media_type} name={l.name} className="size-16" />
                </div>
                <div className="mt-2 flex items-center border-t border-border/60 pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="-ml-2 text-muted-foreground"
                    onClick={() => setOpen({ ...open, [l.id]: !open[l.id] })}
                  >
                    Evolução <ChevronDown className={cn("size-4 transition-transform", open[l.id] && "rotate-180")} />
                  </Button>
                  <Button size="icon" variant="ghost" className="ml-auto" aria-label="Editar" onClick={() => setEditing(l)}>
                    <Pencil className="size-4 text-muted-foreground" />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => setDeleting(l)}>
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </div>
                {open[l.id] && (
                  <div className="pt-2">
                    {l.description && <p className="mb-2 text-xs text-muted-foreground">{l.description}</p>}
                    <ExerciseHistory
                      history={exerciseHistory(setsQ.data ?? [], sessQ.data ?? [], { id: "", library_id: l.id })}
                      limit={10}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <FormModal open={creating} onOpenChange={setCreating} title="Novo exercício">
        {creating && (
          <ExerciseForm
            library={library}
            onSaved={() => {
              toast.success("Exercício salvo na biblioteca");
              setCreating(false);
            }}
            onUseExisting={(ex) => {
              setCreating(false);
              setEditing(ex);
            }}
          />
        )}
      </FormModal>
      <FormModal open={!!editing} onOpenChange={(v) => !v && setEditing(null)} title="Editar exercício">
        {editing && (
          <ExerciseForm
            key={editing.id}
            initial={editing}
            library={library}
            onSaved={() => {
              toast.success("Exercício atualizado");
              setEditing(null);
            }}
          />
        )}
      </FormModal>
      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{deleting?.name}” da biblioteca?</AlertDialogTitle>
            <AlertDialogDescription>
              Os treinos que usam este exercício continuam com ele e com as cargas registradas, mas ele perde a
              imagem/vídeo e não poderá mais ser adicionado a novos treinos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && remove(deleting)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
