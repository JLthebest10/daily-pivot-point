import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  currentUserId,
  db,
  optimisticDelete,
  optimisticInsert,
  restoreTable,
  type Row,
} from "@/lib/db";
import { cn } from "@/lib/utils";

const TABLE = "habit_completions";

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
        const { error } = await db.from(TABLE).delete().eq("id", completionId);
        if (error) throw error;
        return;
      }
      const user_id = await currentUserId();
      const { error } = await db
        .from(TABLE)
        .insert({ habit_id: habitId, date, value: value ?? 1, user_id });
      if (error) throw error;
    },
    // Marca/desmarca na hora; o backend confirma em segundo plano.
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: [TABLE] });
      const snapshots = vars.completionId
        ? optimisticDelete(qc, TABLE, vars.completionId)
        : optimisticInsert(qc, TABLE, {
            id: `optimistic-${Math.random().toString(36).slice(2)}`,
            habit_id: vars.habitId,
            date: vars.date,
            value: vars.value ?? 1,
            created_at: new Date().toISOString(),
          } as Row);
      return { snapshots };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.snapshots) restoreTable(qc, ctx.snapshots);
      toast.error(e.message || "Não foi possível salvar. Tente novamente.");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [TABLE] }),
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
