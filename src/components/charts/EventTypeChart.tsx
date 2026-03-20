import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent } from "@/components/ui/card";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--warning))",
  "hsl(var(--success))",
  "hsl(var(--destructive))",
  "hsl(var(--accent))",
];

interface EventTypeChartProps {
  missions: { event_type: string | null; amount: number | null }[];
}

export function EventTypeChart({ missions }: EventTypeChartProps) {
  const data = useMemo(() => {
    const groups: Record<string, { count: number; revenue: number }> = {};
    missions.forEach((m) => {
      const type = m.event_type || "Autre";
      if (!groups[type]) groups[type] = { count: 0, revenue: 0 };
      groups[type].count++;
      groups[type].revenue += Number(m.amount) || 0;
    });
    return Object.entries(groups)
      .map(([name, { count, revenue }]) => ({ name, count, revenue }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [missions]);

  if (data.length === 0) return null;

  return (
    <Card className="shadow-card border-border/50">
      <CardContent className="p-6">
        <h3 className="font-display font-semibold mb-4">CA par type d'événement</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
                paddingAngle={3}
                dataKey="revenue"
                nameKey="name"
              >
                {data.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value.toLocaleString()}€`, "CA"]}
                contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
              />
              <Legend iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
