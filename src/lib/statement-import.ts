/**
 * Leitura de extratos bancários (OFX e CSV) — 100% no navegador.
 * Gera lançamentos prontos para revisão antes de salvar no Life Hub.
 */
import { categorize, paymentLabel } from "./tx-rules";

export type ParsedTx = {
  /** Chave estável para evitar importar duas vezes o mesmo lançamento. */
  externalId: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // sempre positivo
  type: "income" | "expense";
  category: string;
  paymentMethod: string | null;
};

function normalizeAmount(raw: string): number {
  const cleaned = raw.trim().replace(/\s/g, "").replace(/R\$/i, "");
  // "1.234,56" (pt-BR) x "1234.56" (en)
  const ptBr = /,\d{1,2}$/.test(cleaned);
  const normalized = ptBr ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned.replace(/,/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function toISO(raw: string): string {
  const t = raw.trim();
  // OFX: 20260812 ou 20260812120000[-3:BRT]
  const ofx = /^(\d{4})(\d{2})(\d{2})/.exec(t);
  if (ofx) return `${ofx[1]}-${ofx[2]}-${ofx[3]}`;
  // 2026-08-12
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (iso) return iso[0];
  // 12/08/2026 ou 12-08-2026
  const br = /^(\d{2})[/-](\d{2})[/-](\d{4})/.exec(t);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return "";
}

function hash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function build(
  prefix: string,
  id: string,
  date: string,
  description: string,
  value: number,
  methodHint?: string | null,
): ParsedTx | null {
  if (!date || !value) return null;
  const type: "income" | "expense" = value > 0 ? "income" : "expense";
  const desc = description.trim() || (type === "income" ? "Entrada" : "Saída");
  return {
    externalId: `${prefix}:${id}`,
    date,
    description: desc,
    amount: Math.abs(value),
    type,
    category: categorize(desc, type),
    paymentMethod: paymentLabel(methodHint ?? desc),
  };
}

function tag(block: string, name: string): string {
  const m = new RegExp(`<${name}>([^<\\r\\n]*)`, "i").exec(block);
  return m?.[1]?.trim() ?? "";
}

export function parseOFX(content: string): ParsedTx[] {
  const blocks = content.split(/<STMTTRN>/i).slice(1);
  const out: ParsedTx[] = [];
  for (const raw of blocks) {
    const block = raw.split(/<\/STMTTRN>/i)[0] ?? raw;
    const date = toISO(tag(block, "DTPOSTED"));
    const value = normalizeAmount(tag(block, "TRNAMT"));
    const description = tag(block, "MEMO") || tag(block, "NAME");
    const fitid = tag(block, "FITID") || hash(`${date}|${value}|${description}`);
    const tx = build("ofx", fitid, date, description, value, tag(block, "TRNTYPE"));
    if (tx) out.push(tx);
  }
  return out;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if ((ch === "," || ch === ";") && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

const DATE_KEYS = ["data", "date"];
const DESC_KEYS = ["descrição", "descricao", "description", "title", "histórico", "historico", "estabelecimento"];
const AMOUNT_KEYS = ["valor", "amount", "value"];
const ID_KEYS = ["identificador", "id", "fitid"];

function findIndex(headers: string[], keys: string[]): number {
  return headers.findIndex((h) => keys.some((k) => h.includes(k)));
}

export function parseCSV(content: string): ParsedTx[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]!).map((h) =>
    h.toLowerCase().replace(/^\ufeff/, "").trim(),
  );
  const iDate = findIndex(headers, DATE_KEYS);
  const iDesc = findIndex(headers, DESC_KEYS);
  const iAmount = findIndex(headers, AMOUNT_KEYS);
  const iId = findIndex(headers, ID_KEYS);
  if (iDate < 0 || iAmount < 0) return [];

  const out: ParsedTx[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const date = toISO(cells[iDate] ?? "");
    let value = normalizeAmount(cells[iAmount] ?? "");
    const description = iDesc >= 0 ? (cells[iDesc] ?? "") : "";
    // Fatura de cartão do Nubank vem com valores positivos = despesa.
    const isCardStatement = iId < 0 && headers.includes("category");
    if (isCardStatement && value > 0) value = -value;
    const id = (iId >= 0 ? cells[iId] : "") || hash(`${date}|${value}|${description}`);
    const tx = build("csv", id!, date, description, value);
    if (tx) out.push(tx);
  }
  return out;
}

export function parseStatement(fileName: string, content: string): ParsedTx[] {
  const isOfx = /\.ofx$/i.test(fileName) || /<STMTTRN>/i.test(content);
  const rows = isOfx ? parseOFX(content) : parseCSV(content);
  // Remove duplicatas dentro do próprio arquivo.
  const seen = new Set<string>();
  return rows.filter((r) => (seen.has(r.externalId) ? false : (seen.add(r.externalId), true)));
}
