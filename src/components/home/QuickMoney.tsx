import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSave } from "@/lib/db";
import { money, toISODate } from "@/lib/format";

const CATEGORIES = [
  "Alimentação",
  "Compras",
  "Educação",
  "Freelance",
  "Investimentos",
  "Lazer",
  "Moradia",
  "Salário",
  "Saúde",
  "Transporte",
  "Outros",
];

export function QuickMoney({ balance }: { balance: number }) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Outros");
  const save = useSave("transactions", "Lançamento salvo");

  const submit = async (type: "income" | "expense") => {
    const value = Number(String(amount).replace(",", "."));
    if (!value || value <= 0) return;
    await save.mutateAsync({
      type,
      amount: value,
      date: toISODate(),
      category,
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
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger aria-label="Categoria do lançamento" className="w-full">
          <SelectValue placeholder="Escolha a categoria" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIES.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
