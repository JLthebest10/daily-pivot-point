import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { currentUserId, db } from "@/lib/db";
import { cn } from "@/lib/utils";

export function useToggleCompletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      habitId,
      date,
      completionId,
      value,
    }: {
      habitId: string;
      date: string;
      completionId?: string;
      value?: number;
    }) => {
      if (completionId) {
        const { error } = await db.from("habit_completions").delete().eq("id", completionId);
        if (error) throw error;
        return;
      }
      const user_id = await currentUserId();
      const { error } = await db
        .from("habit_completions")
        .insert({ habit_id: habitId, date, value: value ?? 1, user_id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function HabitCheck({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  const [pop, setPop] = useState(false);
  return (
    <button
      aria-label={`${checked ? "Desmarcar" : "Concluir"} ${label}`}
      aria-pressed={checked}
      onClick={() => {
        if (!checked) {
          setPop(true);
          setTimeout(() => setPop(false), 300);
        }
        onToggle();
      }}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-transparent hover:border-primary/60",
        pop && "animate-pop",
      )}
    >
      <Check className="size-4" strokeWidth={3} />
    </button>
  );
}
