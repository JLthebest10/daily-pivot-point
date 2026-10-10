import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Archive,
  ArrowLeft,
  Check,
  FileUp,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { currentUserId, db, useList, useRemove, useSave } from "@/lib/db";
import { shortDate } from "@/lib/format";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  STATUS_STYLE,
  parseImport,
  topicStatus,
  type Card,
  type Topic,
} from "@/lib/flashcards";
import { suggestCards, type Suggestion } from "@/lib/flashcards.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Field, FormModal, LoadingList, PageHeader, SectionTitle } from "@/components/ui-kit";
import { TopicForm } from "@/components/flashcards/TopicForm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/flashcards/$id")({
  head: () => ({
    meta: [
      { title: "Assunto — Flashcards — Life Hub" },
      { name: "description", content: "Crie e organize os flashcards deste assunto." },
      { property: "og:title", content: "Assunto — Flashcards — Life Hub" },
      { property: "og:description", content: "Transforme suas anotações em flashcards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TopicPage,
});

function TopicPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const topicQ = useList<Topic>("flashcard_topics", { eq: { id } });
  const cardsQ = useList<Card>("flashcards", { eq: { topic_id: id }, order: { column: "order_index" } });
  const saveTopic = useSave("flashcard_topics");
  const removeTopic = useRemove("flashcard_topics", "Assunto excluído");
  const saveCard = useSave("flashcards");
  const removeCard = useRemove("flashcards", "Cartão excluído");
  const suggest = useServerFn(suggestCards);

  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [cardForm, setCardForm] = useState<{ id?: string; front: string; back: string } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const topic = topicQ.data?.[0];
  const cards = cardsQ.data ?? [];
  if (topicQ.isLoading) return <LoadingList />;
  if (!topic)
    return (
      <p className="text-sm text-muted-foreground">
        Assunto não encontrado. <Link to="/flashcards" className="text-primary underline">Voltar</Link>
      </p>
    );
  const st = topicStatus(topic, cards.length);
  const nextIndex = cards.length ? Math.max(...cards.map((c) => c.order_index)) + 1 : 0;

  async function insertMany(items: { front: string; back: string }[]) {
    if (!items.length) return;
    setBulkBusy(true);
    try {
      const user_id = await currentUserId();
      const { error } = await db.from("flashcards").insert(
        items.map((c, i) => ({ user_id, topic_id: id, front: c.front, back: c.back, order_index: nextIndex + i })),
      );
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["flashcards"] });
      toast.success(`${items.length} ${items.length === 1 ? "cartão adicionado" : "cartões adicionados"}`);
    } catch (e) {
      toast.error((e as Error).message);
      throw e;
    } finally {
      setBulkBusy(false);
    }
  }

  async function runAI() {
    setAiBusy(true);
    try {
      const r = await suggest({ data: { topicId: id, count: 8 } });
      if (r.error) toast.error(r.error);
      if (r.cards.length) setSuggestions(r.cards);
    } catch {
      toast.error("Não foi possível gerar sugestões agora.");
    } finally {
      setAiBusy(false);
    }
  }

  const imported = parseImport(importText);

  return (
    <>
      <Link to="/flashcards" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Flashcards
      </Link>
      <PageHeader
        title={topic.name}
        subtitle={[topic.category, topic.priority && `Prioridade ${PRIORITY_LABEL[topic.priority].toLowerCase()}`, topic.deadline && `Prazo ${shortDate(topic.deadline)}`]
          .filter(Boolean)
          .join(" · ") || undefined}
        action={
          <Button variant="ghost" size="icon" aria-label="Editar assunto" onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
          </Button>
        }
      />

      <section className="surface mb-5 flex flex-wrap items-center gap-3 px-4 py-3">
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_STYLE[st])}>{STATUS_LABEL[st]}</span>
        <span className="num text-sm text-muted-foreground">
          {cards.length} {cards.length === 1 ? "cartão" : "cartões"}
        </span>
        <div className="ml-auto">
          {topic.completed_at ? (
            <Button size="sm" variant="secondary" onClick={() => saveTopic.mutate({ id, completed_at: null })}>
              <RotateCcw className="size-4" /> Reabrir
            </Button>
          ) : (
            <Button size="sm" onClick={() => saveTopic.mutate({ id, completed_at: new Date().toISOString() })}>
              <Check className="size-4" /> Marcar como concluído
            </Button>
          )}
        </div>
      </section>

      <SectionTitle>Anotações</SectionTitle>
      <div className="surface mb-6 px-4 py-3">
        {topic.notes ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{topic.notes}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sem anotações.{" "}
            <button className="text-primary underline" onClick={() => setEditing(true)}>
              Adicionar
            </button>
          </p>
        )}
      </div>

      <SectionTitle
        action={
          <Button size="sm" variant="ghost" onClick={() => setCardForm({ front: "", back: "" })}>
            <Plus className="size-4" /> Cartão
          </Button>
        }
      >
        Cartões
      </SectionTitle>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Button variant="secondary" size="sm" onClick={runAI} disabled={aiBusy}>
          <Sparkles className="size-4" /> {aiBusy ? "Gerando…" : "Sugerir com IA"}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
          <FileUp className="size-4" /> Importar texto
        </Button>
      </div>

      {cards.length === 0 ? (
        <p className="surface px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhum cartão ainda. Crie o primeiro, importe um texto ou peça sugestões à IA.
        </p>
      ) : (
        <ul className="space-y-2">
          {cards.map((c, i) => (
            <li key={c.id} className="surface px-4 py-3">
              <div className="flex gap-2">
                <span className="num mt-0.5 text-xs text-muted-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-sm font-medium">{c.front}</p>
                  <p className="border-l-2 border-primary/40 pl-2 text-sm text-muted-foreground">{c.back}</p>
                </div>
                <div className="flex shrink-0 flex-col">
                  <Button size="icon" variant="ghost" aria-label="Editar cartão" onClick={() => setCardForm(c)}>
                    <Pencil className="size-4 text-muted-foreground" />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="Excluir cartão" onClick={() => removeCard.mutate(c.id)}>
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 flex gap-2 border-t border-border pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await saveTopic.mutateAsync({ id, archived: true });
            toast.success("Assunto arquivado");
            navigate({ to: "/flashcards" });
          }}
        >
          <Archive className="size-4" /> Arquivar
        </Button>
        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmDel(true)}>
          <Trash2 className="size-4" /> Excluir assunto
        </Button>
      </div>

      <FormModal open={editing} onOpenChange={setEditing} title="Editar assunto">
        {editing && <TopicForm initial={topic} onDone={() => setEditing(false)} />}
      </FormModal>

      <FormModal open={!!cardForm} onOpenChange={(v) => !v && setCardForm(null)} title={cardForm?.id ? "Editar cartão" : "Novo cartão"}>
        {cardForm && (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const front = cardForm.front.trim();
              const back = cardForm.back.trim();
              if (!front || !back) return;
              await saveCard.mutateAsync(
                cardForm.id ? { id: cardForm.id, front, back } : { topic_id: id, front, back, order_index: nextIndex },
              );
              if (cardForm.id) setCardForm(null);
              else {
                toast.success("Cartão adicionado");
                setCardForm({ front: "", back: "" }); // segue criando o próximo
              }
            }}
          >
            <Field label="Frente (pergunta)">
              <Textarea rows={2} value={cardForm.front} maxLength={1000} onChange={(e) => setCardForm({ ...cardForm, front: e.target.value })} required />
            </Field>
            <Field label="Verso (resposta)">
              <Textarea rows={3} value={cardForm.back} maxLength={2000} onChange={(e) => setCardForm({ ...cardForm, back: e.target.value })} required />
            </Field>
            <Button type="submit" className="w-full" disabled={saveCard.isPending}>
              {cardForm.id ? "Salvar cartão" : "Adicionar e criar outro"}
            </Button>
          </form>
        )}
      </FormModal>

      <FormModal open={importOpen} onOpenChange={setImportOpen} title="Importar cartões" description="Uma linha por cartão: pergunta e resposta separadas por tab, “ :: ”, “ ; ” ou “ - ”.">
        <div className="space-y-3">
          <Textarea
            rows={8}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={"Plano sagital :: divide o corpo em direita e esquerda\nMúsculo agonista - principal responsável pelo movimento"}
          />
          <p className="text-xs text-muted-foreground">{imported.length} cartões reconhecidos</p>
          <Button
            className="w-full"
            disabled={!imported.length || bulkBusy}
            onClick={async () => {
              await insertMany(imported);
              setImportText("");
              setImportOpen(false);
            }}
          >
            Adicionar {imported.length || ""} cartões
          </Button>
        </div>
      </FormModal>

      <FormModal open={!!suggestions} onOpenChange={(v) => !v && setSuggestions(null)} title="Sugestões da IA" description="Revise e edite antes de salvar. Remova as que não quiser.">
        {suggestions && (
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <div key={i} className="space-y-1.5 rounded-lg border border-border p-2.5">
                <div className="flex items-start gap-2">
                  <Textarea
                    rows={2}
                    aria-label={`Pergunta ${i + 1}`}
                    value={s.front}
                    onChange={(e) => setSuggestions(suggestions.map((x, j) => (j === i ? { ...x, front: e.target.value } : x)))}
                    className="text-sm font-medium"
                  />
                  <Button size="icon" variant="ghost" aria-label="Remover sugestão" onClick={() => setSuggestions(suggestions.filter((_, j) => j !== i))}>
                    <X className="size-4" />
                  </Button>
                </div>
                <Textarea
                  rows={2}
                  aria-label={`Resposta ${i + 1}`}
                  value={s.back}
                  onChange={(e) => setSuggestions(suggestions.map((x, j) => (j === i ? { ...x, back: e.target.value } : x)))}
                  className="text-sm"
                />
              </div>
            ))}
            <Button
              className="w-full"
              disabled={bulkBusy || !suggestions.some((s) => s.front.trim() && s.back.trim())}
              onClick={async () => {
                await insertMany(
                  suggestions.map((s) => ({ front: s.front.trim(), back: s.back.trim() })).filter((s) => s.front && s.back),
                );
                setSuggestions(null);
              }}
            >
              Salvar {suggestions.length} cartões
            </Button>
          </div>
        )}
      </FormModal>

      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{topic.name}”?</AlertDialogTitle>
            <AlertDialogDescription>O assunto e os {cards.length} cartões dele serão apagados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                removeTopic.mutate(id);
                navigate({ to: "/flashcards" });
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
