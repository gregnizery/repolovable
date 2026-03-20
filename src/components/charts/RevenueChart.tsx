import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";

interface RevenueChartProps {
  paiements: { payment_date: string; amount: number }[];
  months?: number;
}

export function RevenueChart({ paiements, months = 6 }: RevenueChartProps) {
  const data = useMemo(() => {
    const now = new Date();
    const result: { month: string; revenue: number; label: string }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      result.push({ month: key, revenue: 0, label });
    }

    paiements.forEach((p) => {
      const d = new Date(p.payment_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const entry = result.find((r) => r.month === key);
      if (entry) entry.revenue += Number(p.amount);
    });

    return result;
  }, [paiements, months]);

  return (
    <Card className="shadow-card border-border/50">
      <CardContent className="p-6">
        <h3 className="font-display font-semibold mb-4">Chiffre d'affaires mensuel</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} className="text-muted-foreground" />
              <Tooltip
                formatter={(value: number) => [`${value.toLocaleString()}€`, "CA"]}
                contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
