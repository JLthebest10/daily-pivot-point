import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionTitle } from "@/components/ui-kit";
import { money } from "@/lib/format";
import { importStatement } from "@/lib/banking.functions";
import { parseStatement, type ParsedTx } from "@/lib/statement-import";
import { cn } from "@/lib/utils";

const EXPENSE_CATS = ["Moradia", "Alimentação", "Transporte", "Saúde", "Lazer", "Educação", "Outros"];
const INCOME_CATS = ["Salário", "Freelance", "Investimentos", "Outros"];

export function StatementImport() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedTx[]>([]);
  const [fileName, setFileName] = useState("");
  const save = useServerFn(importStatement);

  const importer = useMutation({
    mutationFn: (transactions: ParsedTx[]) => save({ data: { transactions } }),
    onSuccess: (res) => {
      setRows([]);
      setFileName("");
      void qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success(
        res.skipped > 0
          ? `${res.imported} lançamentos importados · ${res.skipped} já existiam`
          : `${res.imported} lançamentos importados`,
      );
    },
    onError: () => toast.error("Não foi possível importar o extrato. Tente novamente."),
  });

  const handleFile = async (file: File) => {
    try {
      const content = await file.text();
      const parsed = parseStatement(file.name, content);
      if (!parsed.length) {
        toast.error("Não encontrei lançamentos nesse arquivo. Exporte em OFX ou CSV.");
        return;
      }
      setRows(parsed);
      setFileName(file.name);
    } catch {
      toast.error("Não foi possível ler o arquivo.");
    }
  };

  const income = rows.filter((r) => r.type === "income").reduce((a, r) => a + r.amount, 0);
  const expense = rows.filter((r) => r.type === "expense").reduce((a, r) => a + r.amount, 0);

  return (
    <div className="space-y-3">
      <SectionTitle
        action={
          <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
            <FileUp className="size-4" /> Escolher arquivo
          </Button>
        }
      >
        Importar extrato
      </SectionTitle>

      <input
        ref={inputRef}
        type="file"
        accept=".ofx,.csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />

      {rows.length === 0 ? (
        <div className="surface px-4 py-4 text-sm text-muted-foreground">
          Exporte o extrato no app do banco (OFX ou CSV) e envie aqui. Os lançamentos entram
          categorizados e sem duplicar o que já foi importado antes.
        </div>
      ) : (
        <div className="surface space-y-3 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{fileName}</p>
              <p className="num text-xs text-muted-foreground">
                {rows.length} lançamentos · +{money(income)} · −{money(expense)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Descartar"
              onClick={() => {
                setRows([]);
                setFileName("");
              }}
            >
              <Trash2 className="size-4 text-muted-foreground" />
            </Button>
          </div>

          <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {rows.map((r, i) => (
              <li key={r.externalId} className="rounded-lg border border-border px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{r.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(`${r.date}T12:00:00`).toLocaleDateString("pt-BR")}
                      {r.paymentMethod ? ` · ${r.paymentMethod}` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "num shrink-0 text-sm font-medium",
                      r.type === "income" ? "text-[var(--color-positive)]" : "text-destructive",
                    )}
                  >
                    {r.type === "income" ? "+" : "−"}
                    {money(r.amount)}
                  </span>
                </div>
                <Select
                  value={r.category}
                  onValueChange={(v) =>
                    setRows((prev) =>
                      prev.map((row, idx) => (idx === i ? { ...row, category: v } : row)),
                    )
                  }
                >
                  <SelectTrigger className="mt-2 h-8 w-44 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(r.type === "income" ? INCOME_CATS : EXPENSE_CATS).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </li>
            ))}
          </ul>

          <Button
            className="w-full"
            disabled={importer.isPending}
            onClick={() => importer.mutate(rows)}
          >
            {importer.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Importar {rows.length} lançamentos
          </Button>
        </div>
      )}
    </div>
  );
}
