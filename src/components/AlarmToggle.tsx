import { Switch } from "@/components/ui/switch";

export function AlarmToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-xl border border-border px-3 py-3">
      <span>
        <span className="block text-sm font-medium">Adicionar alarme</span>
        <span className="block text-xs text-muted-foreground">
          Receba um alerta no horário programado pelo app Lembretes do iPhone
        </span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label="Adicionar alarme" />
    </label>
  );
}
