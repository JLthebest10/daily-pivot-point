import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { currentUserId, db, useList } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { toISODate, fromISODate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingList, PageHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/dieta/evolucao")({
  head: () => ({
    meta: [
      { title: "Evolução visual — Life Hub" },
      {
        name: "description",
        content: "Fotos diárias do seu corpo, lado a lado, para acompanhar sua evolução.",
      },
      { property: "og:title", content: "Evolução visual — Life Hub" },
      { property: "og:description", content: "Acompanhe sua evolução corporal em fotos diárias." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EvolutionPage,
});

type Photo = { id: string; date: string; path: string; note: string | null };

function EvolutionPage() {
  const qc = useQueryClient();
  const photos = useList<Photo>("body_photos", { order: { column: "date", ascending: false } });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});

  const list = photos.data ?? [];

  useEffect(() => {
    let active = true;
    async function load() {
      const missing = list.filter((p) => !urls[p.id]);
      if (missing.length === 0) return;
      const entries = await Promise.all(
        missing.map(async (p) => {
          const { data } = await supabase.storage.from("media").createSignedUrl(p.path, 3600);
          return [p.id, data?.signedUrl ?? ""] as const;
        }),
      );
      if (active) setUrls((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    }
    void load();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.map((p) => p.id).join(",")]);

  async function upload(file: File) {
    setUploading(true);
    try {
      const user_id = await currentUserId();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user_id}/evolucao/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("media").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await db
        .from("body_photos")
        .insert({ user_id, path, date: toISODate() });
      if (error) throw error;
      qc.invalidateQueries();
      toast.success("Foto salva!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removePhoto(photo: Photo) {
    await supabase.storage.from("media").remove([photo.path]);
    const { error } = await db.from("body_photos").delete().eq("id", photo.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries();
    toast.success("Foto removida");
  }

  return (
    <>
      <Link to="/dieta" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Dieta
      </Link>
      <PageHeader
        title="Evolução visual"
        subtitle={`${list.length} foto${list.length === 1 ? "" : "s"} registrada${list.length === 1 ? "" : "s"}`}
        action={
          <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Camera className="size-4" /> {uploading ? "Enviando..." : "Nova foto"}
          </Button>
        }
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      {photos.isLoading ? (
        <LoadingList rows={2} />
      ) : list.length === 0 ? (
        <EmptyState
          title="Nenhuma foto ainda."
          description="Tire uma foto por dia e acompanhe sua evolução lado a lado."
          actionLabel="Tirar primeira foto"
          onAction={() => fileRef.current?.click()}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {list.map((p) => (
            <figure key={p.id} className="surface overflow-hidden p-0">
              <div className="aspect-[3/4] w-full bg-muted">
                {urls[p.id] ? (
                  <img
                    src={urls[p.id]}
                    alt={`Foto de evolução de ${fromISODate(p.date).toLocaleDateString("pt-BR")}`}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                ) : null}
              </div>
              <figcaption className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="num text-xs text-muted-foreground">
                  {fromISODate(p.date).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <button
                  aria-label="Remover foto"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => void removePhoto(p)}
                >
                  <Trash2 className="size-4" />
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </>
  );
}
