/**
 * Cliente HTTP da Pluggy (agregador de Open Finance).
 * Server-only: usa PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET.
 */

const BASE = "https://api.pluggy.ai";

export type PluggyAccount = {
  id: string;
  name: string;
  type: string;
  subtype?: string | null;
  number?: string | null;
  balance?: number | null;
};

export type PluggyTransaction = {
  id: string;
  description: string;
  descriptionRaw?: string | null;
  amount: number;
  date: string;
  type?: string | null;
  category?: string | null;
  paymentData?: { paymentMethod?: string | null } | null;
};

export type PluggyItem = {
  id: string;
  status: string;
  connector?: { name?: string | null; imageUrl?: string | null } | null;
};

async function apiKey(): Promise<string> {
  const clientId = process.env["PLUGGY_CLIENT_ID"];
  const clientSecret = process.env["PLUGGY_CLIENT_SECRET"];
  if (!clientId || !clientSecret) {
    throw new Error("Conexão bancária não configurada. Adicione as chaves da Pluggy.");
  }
  const res = await fetch(`${BASE}/auth`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  if (!res.ok) {
    console.error("pluggy auth failed", res.status, await res.text());
    throw new Error("Não foi possível autenticar no serviço bancário.");
  }
  const json = (await res.json()) as { apiKey: string };
  return json.apiKey;
}

async function get<T>(path: string): Promise<T> {
  const key = await apiKey();
  const res = await fetch(`${BASE}${path}`, { headers: { "X-API-KEY": key } });
  if (!res.ok) {
    console.error("pluggy GET failed", path, res.status, await res.text());
    throw new Error("O banco não respondeu. Tente novamente em instantes.");
  }
  return (await res.json()) as T;
}

/** Token de curta duração usado pelo widget de conexão no navegador. */
export async function createConnectTokenRaw(itemId?: string): Promise<string> {
  const key = await apiKey();
  const res = await fetch(`${BASE}/connect_token`, {
    method: "POST",
    headers: { "content-type": "application/json", "X-API-KEY": key },
    body: JSON.stringify(itemId ? { itemId } : {}),
  });
  if (!res.ok) {
    console.error("pluggy connect_token failed", res.status, await res.text());
    throw new Error("Não foi possível iniciar a conexão com o banco.");
  }
  const json = (await res.json()) as { accessToken: string };
  return json.accessToken;
}

export async function getItem(itemId: string): Promise<PluggyItem> {
  return get<PluggyItem>(`/items/${itemId}`);
}

export async function listAccounts(itemId: string): Promise<PluggyAccount[]> {
  const json = await get<{ results: PluggyAccount[] }>(`/accounts?itemId=${itemId}`);
  return json.results ?? [];
}

export async function listTransactions(
  accountId: string,
  from: string,
): Promise<PluggyTransaction[]> {
  const all: PluggyTransaction[] = [];
  for (let page = 1; page <= 20; page++) {
    const json = await get<{ results: PluggyTransaction[]; totalPages?: number }>(
      `/transactions?accountId=${accountId}&from=${from}&pageSize=500&page=${page}`,
    );
    all.push(...(json.results ?? []));
    if (!json.totalPages || page >= json.totalPages) break;
  }
  return all;
}

export async function deleteItem(itemId: string): Promise<void> {
  const key = await apiKey();
  await fetch(`${BASE}/items/${itemId}`, { method: "DELETE", headers: { "X-API-KEY": key } });
}
