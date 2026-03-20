import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Card, CardContent } from "@/components/ui/card";

interface DevisConversionChartProps {
  devisList: { status: string; total_ttc: number }[];
}

const STATUS_ORDER = ["brouillon", "envoyé", "signé", "refusé", "expiré"];
const STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  "envoyé": "Envoyé",
  "signé": "Signé",
  "refusé": "Refusé",
  "expiré": "Expiré",
};

export function DevisConversionChart({ devisList }: DevisConversionChartProps) {
  const data = useMemo(() => {
    return STATUS_ORDER.map((status) => {
      const items = devisList.filter((d) => d.status === status);
      return {
        status: STATUS_LABELS[status] || status,
        count: items.length,
        montant: items.reduce((s, d) => s + Number(d.total_ttc), 0),
      };
    }).filter((d) => d.count > 0);
  }, [devisList]);

  const conversionRate = useMemo(() => {
    const total = devisList.filter((d) => d.status !== "brouillon").length;
    const signed = devisList.filter((d) => d.status === "signé").length;
    return total > 0 ? Math.round((signed / total) * 100) : 0;
  }, [devisList]);

  return (
    <Card className="shadow-card border-border/50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">Conversion des devis</h3>
          <span className="text-sm font-medium px-3 py-1 rounded-full bg-success/10 text-success">
            {conversionRate}% de conversion
          </span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="status" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                formatter={(value: number, name: string) =>
                  name === "montant" ? [`${value.toLocaleString()}€`, "Montant"] : [value, "Nombre"]
                }
              />
              <Legend />
              <Bar yAxisId="left" dataKey="count" name="Nombre" fill="hsl(var(--info))" radius={[6, 6, 0, 0]} />
              <Bar yAxisId="right" dataKey="montant" name="Montant" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
