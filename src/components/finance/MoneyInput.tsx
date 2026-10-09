import { Input } from "@/components/ui/input";
import { formatMoneyInput, parseMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Money field that keeps the raw text while typing (no forced 0, no leading zeros)
 * and only formats as pt-BR on blur. Convert with parseMoney() when saving.
 */
export function MoneyInput({
  value,
  onChange,
  className,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  "aria-label"?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        R$
      </span>
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder={rest.placeholder ?? "0,00"}
        className="num pl-9"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
        onBlur={() => {
          const n = parseMoney(value);
          if (n !== null) onChange(formatMoneyInput(n));
        }}
        required={rest.required}
        autoFocus={rest.autoFocus}
        aria-label={rest["aria-label"]}
      />
    </div>
  );
}
