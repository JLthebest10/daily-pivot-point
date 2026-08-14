import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CalendarDays, Dumbbell, HeartPulse, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Life Hub — organize hábitos, treino e finanças" },
      {
        name: "description",
        content:
          "Um painel pessoal para hábitos, treino, finanças, pets, calendário, tarefas e metas. Simples, rápido e com seus dados salvos com segurança.",
      },
      { property: "og:title", content: "Life Hub — organize hábitos, treino e finanças" },
      {
        property: "og:description",
        content: "Seu sistema operacional pessoal: hábitos, treino, finanças, pets e metas.",
      },
    ],
  }),
  component: Landing,
});

const highlights = [
  { icon: Sparkles, title: "Hábitos", text: "Check rápido, sequências e heatmap de consistência." },
  { icon: Dumbbell, title: "Treino", text: "Séries, cargas, PRs e evolução real ao longo do tempo." },
  { icon: Wallet, title: "Finanças", text: "Entradas, saídas, compras e metas de economia." },
  { icon: CalendarDays, title: "Agenda", text: "Compromissos, tarefas e lembretes no mesmo lugar." },
  { icon: HeartPulse, title: "Pets", text: "Vacinas, consultas, peso e lembretes dos seus gatos." },
];

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/hoje", replace: true });
    });
  }, [navigate]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-muted-foreground">Life Hub</p>
      <h1 className="mt-4 max-w-2xl text-4xl leading-tight font-semibold text-balance sm:text-6xl">
        Sua vida inteira em um painel só.
      </h1>
      <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
        Hábitos, treino, finanças, pets, calendário, tarefas e metas — conectados, com histórico
        real e uma interface que não atrapalha.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link to="/auth">Começar agora</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/auth" search={{ mode: "login" }}>
            Já tenho conta
          </Link>
        </Button>
      </div>

      <ul className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {highlights.map((h) => (
          <li key={h.title} className="surface p-5">
            <h.icon className="size-5 text-primary" aria-hidden />
            <h2 className="mt-3 text-sm font-semibold">{h.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{h.text}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
