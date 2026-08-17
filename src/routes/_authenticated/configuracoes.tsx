import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { useTheme } from "@/hooks/use-theme";
import { deviceAccount } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, PageHeader, SectionTitle } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Life Hub" },
      { name: "description", content: "Ajuste seu nome, tema e metas pessoais no Life Hub." },
      { property: "og:title", content: "Configurações — Life Hub" },
      { property: "og:description", content: "Preferências e metas do seu Life Hub." },
    ],
  }),
  component: SettingsPage,
});

const THEMES = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
  { value: "system", label: "Sistema" },
] as const;

function SettingsPage() {
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState("");
  const [workoutGoal, setWorkoutGoal] = useState("4");
  const [savingsGoal, setSavingsGoal] = useState("0");
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? "");
    setWorkoutGoal(String(profile.weekly_workout_goal ?? 4));
    setSavingsGoal(String(profile.monthly_savings_goal ?? 0));
  }, [profile]);

  useEffect(() => {
    setAccount(deviceAccount()?.email ?? null);
  }, []);

  return (
    <>
      <PageHeader title="Configurações" subtitle="Este app é só seu — sem login." />

      <form
        className="surface space-y-4 px-4 py-5"
        onSubmit={async (e) => {
          e.preventDefault();
          await update.mutateAsync({
            name: name.trim(),
            weekly_workout_goal: Number(workoutGoal) || 0,
            monthly_savings_goal: Number(savingsGoal) || 0,
          });
          toast.success("Preferências salvas");
        }}
      >
        <Field label="Seu nome">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
        </Field>
        <Field label="Meta de treinos por semana">
          <Input
            type="number"
            min={0}
            value={workoutGoal}
            onChange={(e) => setWorkoutGoal(e.target.value)}
          />
        </Field>
        <Field label="Meta de economia mensal (R$)">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={savingsGoal}
            onChange={(e) => setSavingsGoal(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={update.isPending}>
          Salvar
        </Button>
      </form>

      <section className="mt-8">
        <SectionTitle>Aparência</SectionTitle>
        <div className="flex gap-2">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTheme(t.value)}
              className={cn(
                "surface px-4 py-2 text-sm",
                theme === t.value && "border-primary text-primary",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <SectionTitle>Seus dados</SectionTitle>
        <p className="text-sm text-muted-foreground">
          Seus dados ficam salvos na nuvem e ligados a este dispositivo
          {account ? ` (${account})` : ""}. Não é preciso digitar senha para usar o app.
        </p>
      </section>
    </>
  );
}
