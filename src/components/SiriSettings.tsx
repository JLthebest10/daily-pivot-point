import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createToken, listTokens, revokeToken } from "@/lib/siri.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionTitle } from "@/components/ui-kit";

const PUBLISHED = "https://lifehubb.lovable.app";

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  } catch {
    toast.error("Não foi possível copiar. Selecione e copie manualmente.");
  }
}

export function SiriSettings() {
  const qc = useQueryClient();
  const list = useServerFn(listTokens);
  const create = useServerFn(createToken);
  const revoke = useServerFn(revokeToken);
  const tokens = useQuery({ queryKey: ["api_tokens"], queryFn: () => list() });
  const [name, setName] = useState("iPhone");
  const [fresh, setFresh] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const endpoint = `${PUBLISHED}/api/public/siri/events`;

  async function generate() {
    setBusy(true);
    try {
      const { token } = await create({ data: { name: name.trim() || "iPhone" } });
      setFresh(token);
      await qc.invalidateQueries({ queryKey: ["api_tokens"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await revoke({ data: { id } });
      toast.success("Chave revogada. O Atalho com ela para de funcionar.");
      await qc.invalidateQueries({ queryKey: ["api_tokens"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <section className="mt-8">
      <SectionTitle>Siri e Atalhos</SectionTitle>
      <div className="surface space-y-4 px-4 py-4">
        <p className="text-sm text-muted-foreground">
          Crie eventos falando com a Siri, sem abrir o Life Hub. Gere uma chave e cole no Atalho do iPhone.
          A chave só cria eventos na sua conta.
        </p>

        {fresh ? (
          <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
            <p className="text-xs font-medium">Copie agora: esta chave não aparece de novo.</p>
            <code className="block break-all rounded bg-muted px-2 py-1.5 text-[11px]">{fresh}</code>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => copy(fresh, "Chave")}>
                <Copy className="size-4" /> Copiar chave
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setFresh(null)}>
                Já copiei
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Nome do aparelho"
              placeholder="iPhone"
              maxLength={60}
            />
            <Button onClick={generate} disabled={busy}>
              <KeyRound className="size-4" /> Gerar chave
            </Button>
          </div>
        )}

        {(tokens.data ?? []).length > 0 && (
          <ul className="space-y-1.5">
            {tokens.data!.map((t) => (
              <li key={t.id} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <KeyRound className="size-4 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{t.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {t.last_used_at
                      ? `Usada em ${new Date(t.last_used_at).toLocaleString("pt-BR")}`
                      : "Ainda não usada"}
                  </span>
                </span>
                <Button size="icon" variant="ghost" aria-label="Revogar chave" onClick={() => remove(t.id)}>
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <details className="text-sm">
          <summary className="cursor-pointer font-medium">Como montar o Atalho no iPhone</summary>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>Abra o app <b>Atalhos</b>, toque em <b>+</b> e dê o nome <b>Novo evento no Life Hub</b> (é a frase que você fala para a Siri).</li>
            <li>Adicione <b>Pedir Entrada</b> → tipo Texto, pergunta “Qual o evento?”.</li>
            <li>Adicione <b>Pedir Entrada</b> → tipo <b>Data e Hora</b>, pergunta “Quando?”.</li>
            <li>Adicione <b>Formatar Data</b> com a data do passo 3 → Formato <b>ISO 8601</b>, ligue “Incluir Hora”.</li>
            <li>
              Adicione <b>Obter Conteúdo do URL</b> com o endereço abaixo. Toque em <b>Mostrar Mais</b>:
              Método <b>POST</b>; em Cabeçalhos adicione <b>Authorization</b> = <b>Bearer</b> + espaço + sua chave;
              Corpo da Solicitação <b>JSON</b> com os campos <b>title</b> (Entrada do passo 2) e <b>date</b> (Data
              Formatada).
            </li>
            <li>Adicione <b>Obter Valor do Dicionário</b> → chave <b>message</b>, e depois <b>Mostrar Resultado</b>. A Siri lê a confirmação.</li>
            <li>Diga: “E aí Siri, novo evento no Life Hub”.</li>
          </ol>
          <div className="mt-3 flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded bg-muted px-2 py-1.5 text-[11px]">{endpoint}</code>
            <Button size="sm" variant="secondary" onClick={() => copy(endpoint, "Endereço")}>
              <Copy className="size-4" />
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Campos opcionais no JSON: time (HH:MM), duration_min, location, description, importance (baixa,
            normal, alta) e add_alarm (true/false).
          </p>
        </details>
      </div>
    </section>
  );
}
