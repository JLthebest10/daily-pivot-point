import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useList, useRemove, useSave } from "@/lib/db";
import { toISODate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormModal, LoadingList, PageHeader, SectionTitle, StatCard } from "@/components/ui-kit";
import type { Pet } from "./pets.index";

export const Route = createFileRoute("/_authenticated/pets/$id")({
  head: () => ({
    meta: [
      { title: "Pet — Life Hub" },
      { name: "description", content: "Histórico de saúde e peso do seu pet." },
      { property: "og:title", content: "Pet — Life Hub" },
      { property: "og:description", content: "Vacinas, consultas e evolução de peso." },
    ],
  }),
  component: PetDetail,
});

type Weight = { id: string; pet_id: string; date: string; weight_kg: number };
type Record_ = { id: string; pet_id: string; type: string; title: string; date: string; notes: string | null };

const TYPES = [
  { value: "vet", label: "Consulta" },
  { value: "vaccine", label: "Vacina" },
  { value: "med", label: "Medicação" },
  { value: "other", label: "Outro" },
];

function PetDetail() {
  const { id } = Route.useParams();
  const pets = useList<Pet>("pets", { eq: { id } });
  const weights = useList<Weight>("pet_weights", {
    eq: { pet_id: id },
    order: { column: "date", ascending: false },
  });
  const records = useList<Record_>("pet_records", {
    eq: { pet_id: id },
    order: { column: "date", ascending: false },
  });
  const saveWeight = useSave("pet_weights", "Peso registrado");
  const saveRecord = useSave("pet_records", "Registro salvo");
  const removeRecord = useRemove("pet_records");

  const [weightOpen, setWeightOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [weight, setWeight] = useState({ date: toISODate(), weight_kg: "" });
  const [record, setRecord] = useState({
    type: "vet",
    title: "",
    date: toISODate(),
    notes: "",
  });

  const pet = (pets.data ?? [])[0];
  const last = (weights.data ?? [])[0];

  if (pets.isLoading) return <LoadingList />;

  return (
    <>
      <Link to="/pets" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Pets
      </Link>
      <PageHeader title={pet?.name ?? "Pet"} subtitle={pet?.notes ?? undefined} />

      <div className="grid grid-cols-2 gap-2">
        <StatCard
          label="Peso atual"
          value={last ? `${Number(last.weight_kg).toFixed(1)} kg` : "—"}
          hint={last ? new Date(last.date).toLocaleDateString("pt-BR") : undefined}
        />
        <StatCard label="Registros" value={String((records.data ?? []).length)} />
      </div>

      <section className="mt-8">
        <SectionTitle
          action={
            <Button variant="ghost" size="sm" onClick={() => setWeightOpen(true)}>
              <Plus className="size-4" /> Peso
            </Button>
          }
        >
          Histórico de peso
        </SectionTitle>
        {(weights.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum peso registrado.</p>
        ) : (
          <ul className="space-y-2">
            {(weights.data ?? []).map((w) => (
              <li key={w.id} className="surface flex items-center justify-between px-4 py-3">
                <span className="text-sm">{new Date(w.date).toLocaleDateString("pt-BR")}</span>
                <span className="num text-sm font-medium">{Number(w.weight_kg).toFixed(1)} kg</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <SectionTitle
          action={
            <Button variant="ghost" size="sm" onClick={() => setRecordOpen(true)}>
              <Plus className="size-4" /> Registro
            </Button>
          }
        >
          Saúde
        </SectionTitle>
        {(records.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum registro de saúde.</p>
        ) : (
          <ul className="space-y-2">
            {(records.data ?? []).map((r) => (
              <li key={r.id} className="surface flex items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {TYPES.find((t) => t.value === r.type)?.label ?? r.type} ·{" "}
                    {new Date(r.date).toLocaleDateString("pt-BR")}
                    {r.notes ? ` · ${r.notes}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Excluir"
                  onClick={() => removeRecord.mutate(r.id)}
                >
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <FormModal open={weightOpen} onOpenChange={setWeightOpen} title="Registrar peso">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await saveWeight.mutateAsync({
              pet_id: id,
              date: weight.date,
              weight_kg: Number(weight.weight_kg),
            });
            setWeight({ date: toISODate(), weight_kg: "" });
            setWeightOpen(false);
          }}
        >
          <Field label="Data">
            <Input
              type="date"
              value={weight.date}
              onChange={(e) => setWeight({ ...weight, date: e.target.value })}
            />
          </Field>
          <Field label="Peso (kg)">
            <Input
              type="number"
              step="0.01"
              min={0}
              value={weight.weight_kg}
              onChange={(e) => setWeight({ ...weight, weight_kg: e.target.value })}
              required
            />
          </Field>
          <Button type="submit" className="w-full">
            Salvar
          </Button>
        </form>
      </FormModal>

      <FormModal open={recordOpen} onOpenChange={setRecordOpen} title="Novo registro">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await saveRecord.mutateAsync({
              pet_id: id,
              type: record.type,
              title: record.title.trim(),
              date: record.date,
              notes: record.notes || null,
            });
            setRecord({ type: "vet", title: "", date: toISODate(), notes: "" });
            setRecordOpen(false);
          }}
        >
          <Field label="Tipo">
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={record.type}
              onChange={(e) => setRecord({ ...record, type: e.target.value })}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Título">
            <Input
              value={record.title}
              onChange={(e) => setRecord({ ...record, title: e.target.value })}
              required
            />
          </Field>
          <Field label="Data">
            <Input
              type="date"
              value={record.date}
              onChange={(e) => setRecord({ ...record, date: e.target.value })}
            />
          </Field>
          <Field label="Observações">
            <Input
              value={record.notes}
              onChange={(e) => setRecord({ ...record, notes: e.target.value })}
            />
          </Field>
          <Button type="submit" className="w-full">
            Salvar
          </Button>
        </form>
      </FormModal>
    </>
  );
}
