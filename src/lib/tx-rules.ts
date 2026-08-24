/**
 * Regras de categorização automática das transações importadas do banco.
 * Cada regra casa palavras-chave no descritivo (sem acento, minúsculo).
 * Amplie a lista à vontade — a ordem importa: a primeira que casar vence.
 */

export const EXPENSE_RULES: Array<{ category: string; keywords: string[] }> = [
  {
    category: "Alimentação",
    keywords: [
      "ifood", "rappi", "restaurante", "padaria", "mercado", "supermercado",
      "hortifruti", "lanchonete", "pizzaria", "burger", "bk ", "mcdonald",
      "acai", "cafe", "coffee", "atacadao", "assai", "carrefour", "pao de acucar",
    ],
  },
  {
    category: "Transporte",
    keywords: [
      "uber", "99app", "99 pop", "99pop", "cabify", "posto", "combustivel",
      "gasolina", "estacionamento", "pedagio", "onibus", "metro", "bilhete unico",
    ],
  },
  {
    category: "Moradia",
    keywords: [
      "aluguel", "condominio", "energia", "eletropaulo", "cemig", "coelba",
      "equatorial", "agua", "saneamento", "sabesp", "internet", "vivo", "claro",
      "tim ", "oi fibra", "gas ",
    ],
  },
  {
    category: "Saúde",
    keywords: [
      "farmacia", "drogaria", "drogasil", "pacheco", "clinica", "laboratorio",
      "hospital", "unimed", "amil", "dentista", "psicolog", "academia", "smartfit",
    ],
  },
  {
    category: "Lazer",
    keywords: [
      "netflix", "spotify", "disney", "hbo", "max ", "prime video", "youtube",
      "cinema", "bar ", "pub ", "steam", "playstation", "xbox", "ingresso",
    ],
  },
  {
    category: "Educação",
    keywords: ["curso", "faculdade", "universidade", "livraria", "udemy", "alura", "escola"],
  },
];

export const INCOME_RULES: Array<{ category: string; keywords: string[] }> = [
  { category: "Salário", keywords: ["salario", "pagamento de salario", "folha", "provento"] },
  { category: "Freelance", keywords: ["freela", "servico prestado", "nota fiscal"] },
  { category: "Investimentos", keywords: ["rendimento", "dividendo", "juros", "cdb", "tesouro"] },
];

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Descobre a categoria do Life Hub a partir do descritivo do banco. */
export function categorize(description: string, type: "income" | "expense"): string {
  const text = normalize(description ?? "");
  const rules = type === "income" ? INCOME_RULES : EXPENSE_RULES;
  for (const rule of rules) {
    if (rule.keywords.some((k) => text.includes(normalize(k)))) return rule.category;
  }
  return "Outros";
}

/** Forma de pagamento simplificada para exibição. */
export function paymentLabel(raw?: string | null): string | null {
  if (!raw) return null;
  const t = normalize(raw);
  if (t.includes("pix")) return "Pix";
  if (t.includes("credit")) return "Crédito";
  if (t.includes("debit")) return "Débito";
  if (t.includes("boleto")) return "Boleto";
  if (t.includes("ted") || t.includes("doc")) return "Transferência";
  return null;
}
