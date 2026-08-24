import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Link2, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, SectionTitle } from "@/components/ui-kit";
import {
  createConnectToken,
  disconnectBank,
  listConnections,
  syncTransactions,
  type BankConnection,
} from "@/lib/banking.functions";

const WIDGET_SRC = "https://cdn.pluggy.ai/pluggy-connect/v2.9.2/pluggy-connect.js";

type PluggyConnectCtor = new (options: {
  connectToken: string;
  includeSandbox?: boolean;
  onSuccess?: (data: { item: { id: string } }) => void;
  onError?: (error: unknown) => void;
}) => { init: () => void };

function loadWidget(): Promise<PluggyConnectCtor> {
  const existing = (window as unknown as { PluggyConnect?: PluggyConnectCtor }).PluggyConnect;
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = WIDGET_SRC;
    script.async = true;
    script.onload = () => {
      const ctor = (window as unknown as { PluggyConnect?: PluggyConnectCtor }).PluggyConnect;
      if (ctor) resolve(ctor);
      else reject(new Error("Widget do banco indisponível."));
    };
    script.onerror = () => reject(new Error("Não foi possível carregar o widget do banco."));
    document.head.appendChild(script);
  });
}

function relative(iso: string | null) {
  if (!iso) return "nunca sincronizado";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.round(h / 24)} d`;
}

const SIX_HOURS = 6 * 60 * 60 * 1000;

export function BankConnections() {
  const qc = useQueryClient();
  const list = useServerFn(listConnections);
  const connectToken = useServerFn(createConnectToken);
  const sync = useServerFn(syncTransactions);
  const disconnect = useServerFn(disconnectBank);
  const [opening, setOpening] = useState(false);
  const autoSynced = useRef(false);

  const connections = useQuery({
    queryKey: ["bank_connections"],
    queryFn: () => list({ data: undefined }) as Promise<BankConnection[]>,
    staleTime: 60_000,
  });

  const refreshAll = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["bank_connections"] });
    void qc.invalidateQueries({ queryKey: ["transactions"] });
  }, [qc]);

  const syncMutation = useMutation({
    mutationFn: (connectionId?: string) =>
      sync({ data: connectionId ? { connectionId } : {} }) as Promise<{ imported: number }>,
    onSuccess: (res) => {
      refreshAll();
      toast.success(
        res.imported > 0
          ? `${res.imported} lançamento(s) importado(s).`
          : "Tudo em dia, nenhum lançamento novo.",
      );
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível sincronizar."),
  });

  const removeMutation = useMutation({
    mutationFn: (vars: { connectionId: string; deleteTransactions: boolean }) =>
      disconnect({ data: vars }),
    onSuccess: () => {
      refreshAll();
      toast.success("Banco desconectado.");
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível desconectar."),
  });

  // Sincroniza sozinho quando a última atualização passou de 6 h.
  useEffect(() => {
    if (autoSynced.current || !connections.data?.length) return;
    const stale = connections.data.some(
      (c) => !c.last_synced_at || Date.now() - new Date(c.last_synced_at).getTime() > SIX_HOURS,
    );
    if (!stale) return;
    autoSynced.current = true;
    syncMutation.mutate(undefined);
  }, [connections.data, syncMutation]);

  const openWidget = async () => {
    setOpening(true);
    try {
      const [Ctor, { token }] = await Promise.all([
        loadWidget(),
        connectToken({ data: {} }) as Promise<{ token: string }>,
      ]);
      const widget = new Ctor({
        connectToken: token,
        includeSandbox: true,
        onSuccess: (payload) => {
          void (async () => {
            const { saveConnection } = await import("@/lib/banking.functions");
            try {
              await saveConnection({ data: { itemId: payload.item.id } });
              refreshAll();
              toast.success("Banco conectado. Importando lançamentos…");
              syncMutation.mutate(undefined);
            } catch (e) {
              toast.error((e as Error).message || "Falha ao salvar a conexão.");
            }
          })();
        },
        onError: () => toast.error("A conexão com o banco foi interrompida."),
      });
      widget.init();
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível abrir a conexão.");
    } finally {
      setOpening(false);
    }
  };

  const rows = connections.data ?? [];

  return (
    <div className="space-y-3">
      <SectionTitle
        action={
          <div className="flex gap-2">
            {rows.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                disabled={syncMutation.isPending}
                onClick={() => syncMutation.mutate(undefined)}
              >
                {syncMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Sincronizar
              </Button>
            )}
            <Button size="sm" variant="secondary" disabled={opening} onClick={openWidget}>
              <Link2 className="size-4" /> Conectar banco
            </Button>
          </div>
        }
      >
        Contas conectadas
      </SectionTitle>

      {connections.error && (
        <p className="text-sm text-destructive">
          {(connections.error as Error).message || "Não foi possível carregar as conexões."}
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="Nenhum banco conectado."
          description="Conecte seu banco pelo Open Finance para importar débitos, Pix e recebimentos automaticamente."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((c) => (
            <li key={c.id} className="surface flex items-center gap-3 px-4 py-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary">
                <Building2 className="size-4 text-muted-foreground" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.institution_name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.status === "ERROR" || c.status === "LOGIN_ERROR"
                    ? "Conexão expirada — reconecte o banco"
                    : `Atualizado ${relative(c.last_synced_at)}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Sincronizar conta"
                disabled={syncMutation.isPending}
                onClick={() => syncMutation.mutate(c.id)}
              >
                <RefreshCw className="size-4 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Desconectar"
                onClick={() => {
                  const alsoDelete = window.confirm(
                    "Apagar também os lançamentos importados deste banco?\n\nOK = apagar · Cancelar = manter",
                  );
                  removeMutation.mutate({ connectionId: c.id, deleteTransactions: alsoDelete });
                }}
              >
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Os dados são lidos via Open Finance, somente leitura. O consentimento expira em até 12 meses
        e pode ser revogado a qualquer momento no app do seu banco.
      </p>
    </div>
  );
}
