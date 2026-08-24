import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useList } from "@/lib/db";
import { addDays, shortDate, toISODate } from "@/lib/format";
import { LoadingList, PageHeader, StatCard } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dieta/consistencia")({
  head: () => ({
    meta: [
      { title: "Consistência da dieta — Life Hub" },
      { name: "description", content: "Gráfico da sua consistência alimentar nos últimos 30 dias." },
      { property: "og:title", content: "Consistência da dieta — Life Hub" },
      { property: "og:description", content: "Veja sua aderência ao plano alimentar dia a dia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConsistencyPage,
});

type Meal = { id: string; days: number[]; archived: boolean };
type MealLog = { id: string; meal_id: string; date: string };

function ConsistencyPage() {
  const from = toISODate(addDays(new Date(), -29));
  const meals = useList<Meal>("meals");
  const logs = useList<MealLog>("meal_logs", { gte: ["date", from] });

  const data = useMemo(() => {
    const active = (meals.data ?? []).filter((m) => !m.archived);
    const byDate = new Map<string, Set<string>>();
    for (const l of logs.data ?? []) {
      const set = byDate.get(l.date) ?? new Set<string>();
      set.add(l.meal_id);
      byDate.set(l.date, set);
    }
    return Array.from({ length: 30 }, (_, i) => {
      const d = addDays(new Date(), i - 29);
      const iso = toISODate(d);
      const scheduled = active.filter((m) => m.days.includes(d.getDay()));
      const done = scheduled.filter((m) => byDate.get(iso)?.has(m.id)).length;
      return {
        iso,
        label: shortDate(iso),
        pct: scheduled.length ? Math.round((done / scheduled.length) * 100) : 0,
        done,
        total: scheduled.length,
      };
    });
  }, [meals.data, logs.data]);

  const tracked = data.filter((d) => d.total > 0);
  const avg = tracked.length ? Math.round(tracked.reduce((a, d) => a + d.pct, 0) / tracked.length) : 0;
  const perfect = tracked.filter((d) => d.pct === 100).length;
  let streak = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i]!.total > 0 && data[i]!.pct === 100) streak += 1;
    else if (data[i]!.total > 0) break;
  }

  return (
    <>
      <Link
        to="/dieta"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Dieta
      </Link>
      <PageHeader title="Consistência" subtitle="Sua aderência ao plano nos últimos 30 dias." />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard label="Média" value={`${avg}%`} tone={avg >= 80 ? "positive" : undefined} />
        <StatCard label="Dias 100%" value={String(perfect)} />
        <StatCard label="Sequência" value={String(streak)} />
      </div>

      {meals.isLoading ? (
        <LoadingList rows={3} />
      ) : (
        <>
          <div className="surface px-2 py-4">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dietGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                    interval={6}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v}%`, "Conclusão"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="pct"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fill="url(#dietGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="mt-6 mb-2 text-sm font-medium">Mapa diário</p>
          <div className="surface grid grid-cols-10 gap-1.5 px-4 py-4">
            {data.map((d) => (
              <span
                key={d.iso}
                title={`${d.label}: ${d.done}/${d.total}`}
                className={cn(
                  "aspect-square rounded-md",
                  d.total === 0
                    ? "bg-muted"
                    : d.pct === 100
                      ? "bg-primary"
                      : d.pct >= 50
                        ? "bg-primary/60"
                        : d.pct > 0
                          ? "bg-primary/30"
                          : "bg-destructive/25",
                )}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}
