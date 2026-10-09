import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dumbbell, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId } from "@/lib/db";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export async function uploadExerciseMedia(file: File, kind: "image" | "video") {
  const uid = await currentUserId();
  const ext = (file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg")).toLowerCase();
  const path = `${uid}/exercises/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("media")
    .upload(path, file, { contentType: file.type || undefined });
  if (error) throw error;
  return path;
}

export async function deleteExerciseMedia(path: string | null | undefined) {
  if (path) await supabase.storage.from("media").remove([path]);
}

export function useMediaUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["media-url", path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("media").createSignedUrl(path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

/** Miniatura à direita do cartão; toque abre o vídeo (com controles) ou amplia a imagem. */
export function ExerciseThumb({
  path,
  type,
  name,
  className,
}: {
  path: string | null | undefined;
  type: "image" | "video" | null | undefined;
  name: string;
  className?: string;
}) {
  const url = useMediaUrl(path);
  const [open, setOpen] = useState(false);
  const box = cn(
    "relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted",
    className,
  );

  if (!path || !type) {
    return (
      <div className={box} aria-hidden>
        <Dumbbell className="size-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className={cn(box, "transition-transform active:scale-95")}
        onClick={() => setOpen(true)}
        aria-label={type === "video" ? `Ver vídeo de ${name}` : `Ampliar imagem de ${name}`}
      >
        {url.data &&
          (type === "video" ? (
            <video
              src={`${url.data}#t=0.1`}
              preload="metadata"
              muted
              playsInline
              className="size-full object-cover"
            />
          ) : (
            <img src={url.data} alt={name} loading="lazy" className="size-full object-cover" />
          ))}
        {type === "video" && (
          <span className="absolute inset-0 flex items-center justify-center bg-foreground/20">
            <span className="flex size-8 items-center justify-center rounded-full bg-background/90">
              <Play className="size-4 fill-foreground text-foreground" />
            </span>
          </span>
        )}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-3">
          <DialogTitle className="px-1 text-sm">{name}</DialogTitle>
          {url.data &&
            (type === "video" ? (
              <video
                src={url.data}
                controls
                playsInline
                autoPlay
                className="max-h-[70vh] w-full rounded-lg bg-foreground"
              />
            ) : (
              <img src={url.data} alt={name} className="max-h-[75vh] w-full rounded-lg object-contain" />
            ))}
        </DialogContent>
      </Dialog>
    </>
  );
}
