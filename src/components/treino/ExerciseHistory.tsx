import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDecimal, type PastSession } from "@/lib/training";
import { shortDate } from "@/lib/format";

/** Sessões anteriores série a série + gráfico da maior carga ao longo do tempo. */
export function ExerciseHistory({ history, limit = 6 }: { history: PastSession[]; limit?: number }) {
  if (history.length === 0)
    return <p className="text-xs text-muted-foreground">Nenhuma sessão finalizada ainda.</p>;
  const chart = [...history]
    .reverse()
    .map((h) => ({
      date: shortDate(h.date),
      kg: Math.max(...h.sets.map((s) => Number(s.weight))),
      vol: h.sets.reduce((a, s) => a + Number(s.weight) * s.reps, 0),
    }));
  return (
    <div className="space-y-3">
      {chart.length > 1 && (
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${formatDecimal(v)} kg`, "Maior carga"]}
              />
              <Line type="monotone" dataKey="kg" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <ul className="space-y-1.5">
        {history.slice(0, limit).map((h) => (
          <li key={h.session_id} className="flex gap-3 text-xs">
            <span className="num w-11 shrink-0 text-muted-foreground">{shortDate(h.date)}</span>
            <span className="num flex flex-wrap gap-x-2.5 gap-y-0.5">
              {h.sets.map((s) => (
                <span key={s.id}>
                  {formatDecimal(s.weight)}×{s.reps}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
