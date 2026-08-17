import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, PawPrint, Plus, Trash2 } from "lucide-react";
import { useList, useRemove, useSave } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorNote, Field, FormModal, LoadingList, PageHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/pets/")({
  head: () => ({
    meta: [
      { title: "Pets — Life Hub" },
      { name: "description", content: "Saúde, peso e histórico dos seus pets." },
      { property: "og:title", content: "Pets — Life Hub" },
      { property: "og:description", content: "Acompanhe vacinas, consultas e peso dos seus pets." },
    ],
  }),
  component: PetsPage,
});

export type Pet = {
  id: string;
  name: string;
  birth_date: string | null;
  notes: string | null;
};

function PetsPage() {
  const pets = useList<Pet>("pets", { order: { column: "created_at" } });
  const save = useSave("pets", "Pet salvo");
  const remove = useRemove("pets", "Pet removido");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", birth_date: "", notes: "" });

  return (
    <>
      <PageHeader
        title="Pets"
        subtitle={`${(pets.data ?? []).length} cadastrados`}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Novo pet
          </Button>
        }
      />

      <ErrorNote error={pets.error} />
      {pets.isLoading ? (
        <LoadingList />
      ) : (pets.data ?? []).length === 0 ? (
        <EmptyState
          title="Nenhum pet cadastrado."
          description="Registre vacinas, consultas e o peso ao longo do tempo."
          actionLabel="Cadastrar pet"
          onAction={() => setOpen(true)}
        />
      ) : (
        <ul className="space-y-2">
          {(pets.data ?? []).map((p) => (
            <li key={p.id} className="surface flex items-center gap-3 px-4 py-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <PawPrint className="size-5" />
              </span>
              <Link to="/pets/$id" params={{ id: p.id }} className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {p.birth_date
                    ? `Nasc. ${new Date(p.birth_date).toLocaleDateString("pt-BR")}`
                    : "Sem data de nascimento"}
                </p>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Excluir"
                onClick={() => remove.mutate(p.id)}
              >
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
              <ChevronRight className="size-4 text-muted-foreground" />
            </li>
          ))}
        </ul>
      )}

      <FormModal open={open} onOpenChange={setOpen} title="Novo pet">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await save.mutateAsync({
              name: form.name.trim(),
              birth_date: form.birth_date || null,
              notes: form.notes || null,
            });
            setForm({ name: "", birth_date: "", notes: "" });
            setOpen(false);
          }}
        >
          <Field label="Nome">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Nascimento">
            <Input
              type="date"
              value={form.birth_date}
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
            />
          </Field>
          <Field label="Observações">
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Raça, alergias..."
            />
          </Field>
          <Button type="submit" className="w-full" disabled={save.isPending}>
            Salvar pet
          </Button>
        </form>
      </FormModal>
    </>
  );
}
