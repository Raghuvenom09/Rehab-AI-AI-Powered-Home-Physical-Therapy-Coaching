import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Target, Zap, CalendarDays, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useProgressStats } from "@/hooks/use-session";

// ─── Tooltip ─────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-2 shadow-md">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-mono-data text-sm font-bold text-primary">{payload[0].value}%</p>
      </div>
    );
  }
  return null;
};

// ─── Metric card skeleton ────────────────────────────────────────────────────

const MetricSkeleton = () => (
  <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-7 shadow-sm">
    <Skeleton className="h-4 w-32" />
    <Skeleton className="h-9 w-20" />
    <Skeleton className="h-3 w-28" />
  </div>
);

// ─── Empty state ─────────────────────────────────────────────────────────────

const EmptyState = () => (
  <div className="mt-24 flex flex-col items-center gap-4 text-center">
    <CalendarDays className="h-12 w-12 text-muted-foreground/40" strokeWidth={1} />
    <h2 className="text-xl text-foreground" style={{ fontFamily: "'DM Serif Display', serif" }}>
      No sessions yet
    </h2>
    <p className="max-w-xs text-sm text-muted-foreground">
      Complete your first exercise session and your progress will appear here.
    </p>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const Progress = () => {
  const { data: stats, isLoading, isError } = useProgressStats();

  // Build metric cards from real data
  const accuracyDisplay =
    stats?.latestAccuracy != null ? `${stats.latestAccuracy}%` : "—";

  const accuracySub = (() => {
    if (stats?.improvementPercent == null) return "no comparison yet";
    const sign = stats.improvementPercent >= 0 ? "+" : "";
    return `${sign}${stats.improvementPercent}% from last week`;
  })();

  const improvementDisplay =
    stats?.improvementPercent != null
      ? `${stats.improvementPercent >= 0 ? "+" : ""}${stats.improvementPercent}%`
      : "—";

  const metrics = [
    {
      icon: Zap,
      label: "Sessions This Month",
      value: isLoading ? null : String(stats?.thisMonthSessions ?? 0),
      sub: `${stats?.totalSessions ?? 0} total completed`,
    },
    {
      icon: Target,
      label: "Latest Accuracy",
      value: isLoading ? null : accuracyDisplay,
      sub: accuracySub,
    },
    {
      icon: TrendingUp,
      label: "Week-over-Week",
      value: isLoading ? null : improvementDisplay,
      sub: "accuracy improvement",
    },
  ];

  const chartData = stats?.dailyAccuracy ?? [];
  const hasData = !isLoading && (stats?.totalSessions ?? 0) > 0;
  const noData = !isLoading && (stats?.totalSessions ?? 0) === 0;

  return (
    <div className="min-h-screen pt-14 bg-background">
      <div className="container mx-auto max-w-5xl px-6 py-16">
        <h1
          className="animate-fade-up text-3xl text-foreground md:text-4xl"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          Your Progress
        </h1>
        <p className="animate-fade-up-delay-1 mt-2 text-muted-foreground">
          Track your rehabilitation journey over time.
        </p>

        {isError && (
          <p className="mt-6 text-sm text-destructive">
            Failed to load progress data. Please refresh and try again.
          </p>
        )}

        {noData && <EmptyState />}

        {/* ── Metric cards ── */}
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {metrics.map((m, i) =>
            isLoading ? (
              <MetricSkeleton key={i} />
            ) : (
              <div
                key={m.label}
                className="flex flex-col gap-4 rounded-xl border border-border bg-card p-7 shadow-sm transition-smooth hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <m.icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  <span className="text-sm font-medium text-muted-foreground">{m.label}</span>
                </div>
                <div className="font-mono-data text-3xl font-bold text-foreground">{m.value}</div>
                <span className="text-xs text-muted-foreground">{m.sub}</span>
              </div>
            )
          )}
        </div>

        {/* ── Accuracy chart ── */}
        {(isLoading || hasData) && (
          <div className="mt-12 animate-fade-up-delay-3 rounded-xl border border-border bg-card p-8 shadow-sm">
            <h2
              className="mb-8 text-xl text-foreground"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              Accuracy Over Time
            </h2>

            {isLoading ? (
              <Skeleton className="h-72 w-full rounded-lg" />
            ) : chartData.length === 0 ? (
              <p className="py-20 text-center text-sm text-muted-foreground">
                No chart data yet — complete more sessions to see trends.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <XAxis
                    dataKey="day"
                    stroke="hsl(210 15% 80%)"
                    tick={{ fill: "hsl(210 10% 45%)", fontSize: 12, fontFamily: "Inter" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="hsl(210 15% 80%)"
                    tick={{ fill: "hsl(210 10% 45%)", fontSize: 12, fontFamily: "JetBrains Mono" }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    stroke="hsl(210 70% 32%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(210 70% 32%)", r: 3, strokeWidth: 0 }}
                    activeDot={{
                      r: 5,
                      fill: "hsl(210 70% 32%)",
                      stroke: "hsl(210 70% 32% / 0.2)",
                      strokeWidth: 8,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* ── Recent sessions table ── */}
        {(isLoading || hasData) && (
          <div className="mt-10 rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-8 py-5">
              <h2
                className="text-xl text-foreground"
                style={{ fontFamily: "'DM Serif Display', serif" }}
              >
                Recent Sessions
              </h2>
            </div>

            {isLoading ? (
              <div className="flex flex-col gap-3 p-6">
                {[1, 2, 3].map((k) => (
                  <Skeleton key={k} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : (stats?.recentSessions ?? []).length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No sessions yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {(stats?.recentSessions ?? []).map((s) => {
                  const date = s.completed_at
                    ? new Date(s.completed_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—";
                  const accuracy =
                    s.avg_accuracy != null ? `${Math.round(Number(s.avg_accuracy))}%` : "—";

                  return (
                    <li
                      key={s.id}
                      className="flex items-center justify-between px-8 py-4 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {s.exercise?.name ?? "Exercise"}
                          </p>
                          <p className="text-xs text-muted-foreground">{date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono-data text-sm font-semibold text-foreground">
                          {accuracy}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {s.total_sets ?? 0} sets · {s.total_reps ?? 0} reps
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Progress;
