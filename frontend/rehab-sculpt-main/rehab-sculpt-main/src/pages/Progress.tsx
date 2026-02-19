import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Target, Zap } from "lucide-react";

const chartData = [
  { day: "Mon", accuracy: 62 },
  { day: "Tue", accuracy: 68 },
  { day: "Wed", accuracy: 65 },
  { day: "Thu", accuracy: 74 },
  { day: "Fri", accuracy: 78 },
  { day: "Sat", accuracy: 82 },
  { day: "Sun", accuracy: 87 },
];

const metrics = [
  { icon: Zap, label: "Total Sessions", value: "24", sub: "this month" },
  { icon: Target, label: "Accuracy", value: "87%", sub: "+12% from last week" },
  { icon: TrendingUp, label: "Improvement", value: "+34%", sub: "over 4 weeks" },
];

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

const Progress = () => {
  return (
    <div className="min-h-screen pt-14 bg-background">
      <div className="container mx-auto max-w-5xl px-6 py-16">
        <h1 className="animate-fade-up text-3xl text-foreground md:text-4xl" style={{ fontFamily: "'DM Serif Display', serif" }}>
          Your Progress
        </h1>
        <p className="animate-fade-up-delay-1 mt-2 text-muted-foreground">
          Track your rehabilitation journey over time.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {metrics.map((m, i) => (
            <div
              key={m.label}
              className={`animate-fade-up-delay-${i + 1} flex flex-col gap-4 rounded-xl border border-border bg-card p-7 shadow-sm transition-smooth hover:-translate-y-1 hover:shadow-md`}
            >
              <div className="flex items-center gap-3">
                <m.icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                <span className="text-sm font-medium text-muted-foreground">{m.label}</span>
              </div>
              <div className="font-mono-data text-3xl font-bold text-foreground">{m.value}</div>
              <span className="text-xs text-muted-foreground">{m.sub}</span>
            </div>
          ))}
        </div>

        <div className="mt-12 animate-fade-up-delay-3 rounded-xl border border-border bg-card p-8 shadow-sm">
          <h2 className="mb-8 text-xl text-foreground" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Accuracy Over Time
          </h2>
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
                domain={[50, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke="hsl(210 70% 32%)"
                strokeWidth={2}
                dot={{ fill: "hsl(210 70% 32%)", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "hsl(210 70% 32%)", stroke: "hsl(210 70% 32% / 0.2)", strokeWidth: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Progress;
