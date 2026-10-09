import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { currentUserId, db } from "@/lib/db";
import {
  MAX_MEDIA_MB,
  MUSCLE_GROUPS,
  findDuplicate,
  mediaKind,
  type LibraryExercise,
} from "@/lib/training";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui-kit";
import { ExerciseThumb, deleteExerciseMedia, uploadExerciseMedia } from "./ExerciseMedia";

export const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";

/** Cadastro/edição de um exercício da biblioteca (com imagem ou vídeo). */
export function ExerciseForm({
  initial,
  library,
  onSaved,
  onUseExisting,
  submitLabel = "Salvar exercício",
}: {
  initial?: LibraryExercise;
  library: LibraryExercise[];
  onSaved: (ex: LibraryExercise) => void | Promise<void>;
  onUseExisting?: (ex: LibraryExercise) => void;
  submitLabel?: string;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({
    name: initial?.name ?? "",
    muscle_group: initial?.muscle_group ?? "",
    equipment: initial?.equipment ?? "",
    description: initial?.description ?? "",
    default_sets: String(initial?.default_sets ?? 3),
    default_reps: initial?.default_reps ?? "10",
    default_rest_sec: String(initial?.default_rest_sec ?? 60),
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeMedia, setRemoveMedia] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<"" | "upload" | "save">("");
  const [uploading, setUploading] = useState(false);
  // upload começa assim que o arquivo é escolhido; salvar só aguarda terminar
  const uploadRef = useRef<{ file: File; promise: Promise<string> } | null>(null);
  const savedRef = useRef(false);

  // fechou sem salvar: apaga o arquivo enviado
  useEffect(() => () => {
    if (!savedRef.current) discardPending();
  }, []);

  function discardPending() {
    const pending = uploadRef.current;
    uploadRef.current = null;
    if (pending) pending.promise.then((p) => deleteExerciseMedia(p)).catch(() => undefined);
  }

  function startUpload(picked: File) {
    const kind = mediaKind(picked)!;
    discardPending();
    setUploading(true);
    const promise = uploadExerciseMedia(picked, kind);
    const entry = { file: picked, promise };
    uploadRef.current = entry;
    promise
      .catch(() => {
        if (uploadRef.current === entry) {
          toast.error("Não foi possível enviar a mídia. Verifique a internet e tente de novo.");
          uploadRef.current = null;
          setFile(null);
          setPreview(null);
        }
      })
      .finally(() => {
        if (uploadRef.current === entry || !uploadRef.current) setUploading(false);
      });
  }

  const dup = !initial ? findDuplicate(library, f.name) : undefined;
  const fileKind = file ? mediaKind(file) : null;
  const hasStored = !!initial?.media_path && !removeMedia && !file;

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;
    if (!mediaKind(picked)) {
      toast.error("Formato não suportado. Use imagem ou vídeo.");
      return;
    }
    if (picked.size > MAX_MEDIA_MB * 1024 * 1024) {
      toast.error(`Arquivo muito grande (máx. ${MAX_MEDIA_MB} MB).`);
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
    setRemoveMedia(false);
    startUpload(picked);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim() || busy) return;
    setBusy(true);
    try {
      let media_path = initial?.media_path ?? null;
      let media_type = initial?.media_type ?? null;
      const oldPath = initial?.media_path ?? null;
      if (file && fileKind) {
        setStage("upload");
        if (!uploadRef.current || uploadRef.current.file !== file) startUpload(file);
        media_path = await uploadRef.current!.promise;
        media_type = fileKind;
        // mostra a mídia na hora usando o arquivo local, sem baixar de novo
        if (preview) qc.setQueryData(["media-url", media_path], preview);
      } else if (removeMedia) {
        media_path = null;
        media_type = null;
      }
      const values = {
        name: f.name.trim(),
        muscle_group: f.muscle_group || null,
        equipment: f.equipment.trim() || null,
        description: f.description.trim() || null,
        default_sets: Math.max(1, Number(f.default_sets) || 3),
        default_reps: f.default_reps.trim() || "10",
        default_rest_sec: Math.max(0, Number(f.default_rest_sec) || 0),
        media_path,
        media_type,
      };
      setStage("save");
      const q = initial
        ? db.from("exercise_library").update(values).eq("id", initial.id)
        : db.from("exercise_library").insert({ ...values, user_id: await currentUserId() });
      const { data, error } = await q.select().single();
      if (error) throw error;
      savedRef.current = true;
      uploadRef.current = null;
      // apaga a mídia antiga em segundo plano
      if (oldPath && oldPath !== media_path) void deleteExerciseMedia(oldPath);
      if (initial && initial.name !== values.name) {
        // mantém o nome igual nos treinos que usam este exercício
        await db.from("exercises").update({ name: values.name }).eq("library_id", initial.id);
        void qc.invalidateQueries({ queryKey: ["exercises"] });
      }
      // atualiza a lista na hora, sem esperar nova consulta
      qc.setQueriesData<LibraryExercise[]>({ queryKey: ["exercise_library"] }, (rows) => {
        if (!rows) return rows;
        const saved = data as LibraryExercise;
        return initial ? rows.map((r) => (r.id === saved.id ? saved : r)) : [...rows, saved];
      });
      void qc.invalidateQueries({ queryKey: ["exercise_library"] });
      await onSaved(data as LibraryExercise);
    } catch (err) {
      const msg = (err as Error).message || "";
      toast.error(
        /exceeded|too large|413/i.test(msg)
          ? "Arquivo grande demais para enviar."
          : `Não foi possível salvar. ${msg}`,
      );
    } finally {
      setBusy(false);
      setStage("");
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Nome">
        <Input
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          placeholder="Supino inclinado com halteres"
          required
        />
      </Field>
      {dup && (
        <div className="rounded-lg border border-border bg-muted/50 p-3 text-xs">
          <p>
            Já existe <strong>{dup.name}</strong> na sua biblioteca.
          </p>
          {onUseExisting && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mt-2"
              onClick={() => onUseExisting(dup)}
            >
              Usar o existente
            </Button>
          )}
        </div>
      )}

      <div>
        <span className="text-xs font-medium text-muted-foreground">Imagem ou vídeo</span>
        <div className="mt-1.5 flex items-center gap-3">
          {preview && fileKind ? (
            fileKind === "video" ? (
              <video src={preview} muted playsInline className="size-20 rounded-xl object-cover" />
            ) : (
              <img src={preview} alt="" className="size-20 rounded-xl object-cover" />
            )
          ) : (
            <ExerciseThumb
              path={hasStored ? initial?.media_path : null}
              type={hasStored ? initial?.media_type : null}
              name={f.name || "Exercício"}
            />
          )}
          <div className="flex flex-col gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
              <ImagePlus className="size-4" /> {hasStored || file ? "Trocar" : "Escolher"}
            </Button>
            {(hasStored || file) && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  discardPending();
                  setUploading(false);
                  setFile(null);
                  setPreview(null);
                  setRemoveMedia(true);
                }}
              >
                <Trash2 className="size-4" /> Remover
              </Button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={pick} />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground" aria-live="polite">
          {uploading ? "Enviando mídia… você pode continuar preenchendo." : file ? "Mídia enviada ✓" : `Galeria, câmera ou arquivos · até ${MAX_MEDIA_MB} MB`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Grupo muscular">
          <select
            className={selectClass}
            value={f.muscle_group}
            onChange={(e) => setF({ ...f, muscle_group: e.target.value })}
          >
            <option value="">—</option>
            {MUSCLE_GROUPS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </Field>
        <Field label="Equipamento">
          <Input
            value={f.equipment}
            onChange={(e) => setF({ ...f, equipment: e.target.value })}
            placeholder="Halteres"
          />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Séries">
          <Input
            inputMode="numeric"
            value={f.default_sets}
            onChange={(e) => setF({ ...f, default_sets: e.target.value.replace(/\D/g, "") })}
          />
        </Field>
        <Field label="Reps">
          <Input
            value={f.default_reps}
            onChange={(e) => setF({ ...f, default_reps: e.target.value })}
            placeholder="8-12"
          />
        </Field>
        <Field label="Descanso (s)">
          <Input
            inputMode="numeric"
            value={f.default_rest_sec}
            onChange={(e) => setF({ ...f, default_rest_sec: e.target.value.replace(/\D/g, "") })}
          />
        </Field>
      </div>
      <Field label="Instruções">
        <Textarea
          rows={2}
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
        />
      </Field>
      <Button type="submit" className="w-full" disabled={busy}>
        {stage === "upload" ? "Enviando mídia…" : stage === "save" ? "Salvando…" : submitLabel}
      </Button>
    </form>
  );
}
