import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSave } from "@/lib/db";
import { money, toISODate } from "@/lib/format";

export function QuickMoney({ balance }: { balance: number }) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const save = useSave("transactions", "Lançamento salvo");

  const submit = async (type: "income" | "expense") => {
    const value = Number(String(amount).replace(",", "."));
    if (!value || value <= 0) return;
    await save.mutateAsync({
      type,
      amount: value,
      date: toISODate(),
      category: type === "income" ? "Outros" : "Compras",
      description: description.trim() || (type === "income" ? "Entrada rápida" : "Saída rápida"),
    });
    setAmount("");
    setDescription("");
  };

  return (
    <div className="surface space-y-3 px-4 py-4">
      <div className="flex gap-2">
        <Input
          inputMode="decimal"
          placeholder="0,00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="num w-28"
        />
        <Input
          placeholder="Descrição (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={save.isPending}
          onClick={() => submit("income")}
        >
          <ArrowUpRight className="size-4" /> Entrada
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={save.isPending}
          onClick={() => submit("expense")}
        >
          <ArrowDownLeft className="size-4" /> Saída
        </Button>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Saldo do mês: <span className="num font-medium text-foreground">{money(balance)}</span>
        </span>
        <Link to="/financas" className="text-primary">
          Ver finanças
        </Link>
      </div>
    </div>
  );
}
