import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent } from "@/components/ui/card";

const STATUS_COLORS: Record<string, string> = {
  "planifiée": "hsl(var(--info))",
  en_cours: "hsl(var(--warning))",
  "terminée": "hsl(var(--success))",
  "annulée": "hsl(var(--destructive))",
};

const STATUS_LABELS: Record<string, string> = {
  "planifiée": "Planifiée",
  en_cours: "En cours",
  "terminée": "Terminée",
  "annulée": "Annulée",
};

interface MissionStatusChartProps {
  missions: { status: string }[];
}

export function MissionStatusChart({ missions }: MissionStatusChartProps) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    missions.forEach((m) => {
      counts[m.status] = (counts[m.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, value]) => ({
      name: STATUS_LABELS[status] || status,
      value,
      color: STATUS_COLORS[status] || "hsl(var(--muted))",
    }));
  }, [missions]);

  if (data.length === 0) return null;

  return (
    <Card className="shadow-card border-border/50">
      <CardContent className="p-6">
        <h3 className="font-display font-semibold mb-4">Statut des missions</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [value, name]}
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
