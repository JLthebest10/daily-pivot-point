import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronRight, Plus, Search } from "lucide-react";
import { useList } from "@/lib/db";
import { shortDate, toISODate } from "@/lib/format";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  STATUS_STYLE,
  countByTopic,
  filterAndSort,
  statusCounts,
  topicStatus,
  type Card,
  type SortKey,
  type StatusFilter,
  type Topic,
} from "@/lib/flashcards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorNote, FormModal, LoadingList, PageHeader } from "@/components/ui-kit";
import { TopicForm, selectCls } from "@/components/flashcards/TopicForm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/flashcards/")({
  head: () => ({
    meta: [
      { title: "Flashcards — Life Hub" },
      { name: "description", content: "Assuntos que você precisa transformar em flashcards." },
      { property: "og:title", content: "Flashcards — Life Hub" },
      { property: "og:description", content: "Organize os assuntos que você precisa transformar em conhecimento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FlashcardsPage,
});


const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "pendente", label: "Pendentes" },
  { key: "andamento", label: "Em andamento" },
  { key: "concluido", label: "Concluídos" },
];

function FlashcardsPage() {
  const topicsQ = useList<Topic>("flashcard_topics", { eq: { archived: false } });
  const cardsQ = useList<Card>("flashcards");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recentes");

  const topics = topicsQ.data ?? [];
  const counts = useMemo(() => countByTopic(cardsQ.data ?? []), [cardsQ.data]);
  const stats = statusCounts(topics, counts);
  const list = filterAndSort(topics, counts, { status, query, sort });

  return (
    <>
      <PageHeader
        title="Flashcards"
        subtitle="Organize os assuntos que você precisa transformar em conhecimento."
        action={
          <Button onClick={() => setOpen(true)} className="shrink-0">
            <Plus className="size-4" /> Novo assunto
          </Button>
        }
      />
      <ErrorNote error={topicsQ.error} />

      {topicsQ.isLoading ? (
        <LoadingList />
      ) : topics.length === 0 ? (
        <EmptyState
          title="Você ainda não adicionou assuntos para transformar em flashcards."
          actionLabel="Adicionar primeiro assunto"
          onAction={() => setOpen(true)}
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-4 gap-2">
            {[
              ["Total", stats.total],
              ["Pendentes", stats.pendente],
              ["Andamento", stats.andamento],
              ["Concluídos", stats.concluido],
            ].map(([label, n]) => (
              <div key={label} className="surface px-2 py-2.5 text-center">
                <p className="num text-lg font-semibold">{n}</p>
                <p className="truncate text-[10px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatus(f.key)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors",
                  status === f.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar assunto ou matéria"
                className="pl-8"
              />
            </div>
            <select
              aria-label="Ordenar"
              className={cn(selectCls, "w-36")}
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="recentes">Mais recentes</option>
              <option value="antigos">Mais antigos</option>
              <option value="prioridade">Prioridade</option>
              <option value="prazo">Prazo</option>
            </select>
          </div>

          {list.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum assunto encontrado.</p>
          ) : (
            <ul className="space-y-2">
              {list.map((t) => {
                const n = counts.get(t.id) ?? 0;
                const st = topicStatus(t, n);
                return (
                  <li key={t.id}>
                    <Link
                      to="/flashcards/$id"
                      params={{ id: t.id }}
                      className="surface flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold">{t.name}</p>
                          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_STYLE[st])}>
                            {STATUS_LABEL[st]}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {[
                            t.category,
                            `${n} ${n === 1 ? "cartão" : "cartões"}`,
                            `adicionado ${shortDate(toISODate(new Date(t.created_at)))}`,
                            t.priority && `prioridade ${PRIORITY_LABEL[t.priority].toLowerCase()}`,
                            t.deadline && `prazo ${shortDate(t.deadline)}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary">
                        Abrir <ChevronRight className="size-4" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <FormModal open={open} onOpenChange={setOpen} title="Novo assunto">
        {open && <TopicForm onDone={() => setOpen(false)} />}
      </FormModal>
    </>
  );
}
