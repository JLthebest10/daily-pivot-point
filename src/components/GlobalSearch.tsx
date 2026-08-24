import { useNavigate } from "@tanstack/react-router";
import { useList } from "@/lib/db";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type Item = { id: string; label: string; group: string; to: string };

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const habits = useList<{ id: string; name: string }>("habits", { enabled: open });
  const workouts = useList<{ id: string; name: string }>("workouts", { enabled: open });
  const exercises = useList<{ id: string; name: string; workout_id: string }>("exercises", {
    enabled: open,
  });
  const tasks = useList<{ id: string; title: string }>("tasks", { enabled: open });
  const events = useList<{ id: string; title: string }>("events", { enabled: open });
  const meals = useList<{ id: string; name: string }>("meals", { enabled: open });
  const purchases = useList<{ id: string; product: string }>("purchases", { enabled: open });
  const transactions = useList<{ id: string; description: string | null; category: string }>(
    "transactions",
    { enabled: open },
  );

  const items: Item[] = [
    ...(habits.data ?? []).map((h) => ({
      id: h.id,
      label: h.name,
      group: "Hábitos",
      to: `/habitos/${h.id}`,
    })),
    ...(workouts.data ?? []).map((w) => ({
      id: w.id,
      label: w.name,
      group: "Treinos",
      to: `/treino/${w.id}`,
    })),
    ...(exercises.data ?? []).map((e) => ({
      id: e.id,
      label: e.name,
      group: "Exercícios",
      to: `/treino/${e.workout_id}`,
    })),
    ...(tasks.data ?? []).map((t) => ({
      id: t.id,
      label: t.title,
      group: "Tarefas",
      to: "/tarefas",
    })),
    ...(events.data ?? []).map((e) => ({
      id: e.id,
      label: e.title,
      group: "Eventos",
      to: "/calendario",
    })),
    ...(meals.data ?? []).map((m) => ({
      id: m.id,
      label: m.name,
      group: "Dieta",
      to: "/dieta",
    })),
    ...(purchases.data ?? []).map((p) => ({
      id: p.id,
      label: p.product,
      group: "Compras",
      to: "/financas",
    })),
    ...(transactions.data ?? []).map((t) => ({
      id: t.id,
      label: t.description || t.category,
      group: "Transações",
      to: "/financas",
    })),
  ];

  const groups = Array.from(new Set(items.map((i) => i.group)));

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar em tudo..." />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group} heading={group}>
            {items
              .filter((i) => i.group === group)
              .map((i) => (
                <CommandItem
                  key={i.group + i.id}
                  value={`${i.label} ${i.group}`}
                  onSelect={() => {
                    onOpenChange(false);
                    navigate({ to: i.to });
                  }}
                >
                  {i.label}
                </CommandItem>
              ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
