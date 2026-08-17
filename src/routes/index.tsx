import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
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
  beforeLoad: () => {
    throw redirect({ to: "/hoje", replace: true });
  },
  component: () => null,
});
