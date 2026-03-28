import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useEquipmentCheckouts } from "@/hooks/use-logistics";
import { useMissions } from "@/hooks/use-data";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ListViewToggle } from "@/components/ListViewToggle";
import { GroupBySelect } from "@/components/GroupBySelect";
import { SortableHeader, SortDirection } from "@/components/SortableHeader";
import { Search, ClipboardCheck, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const conditionConfig: Record<string, { label: string; class: string }> = {
  bon: { label: "Bon état", class: "bg-success/10 text-success" },
  usé: { label: "Usé", class: "bg-warning/10 text-warning" },
  endommagé: { label: "Endommagé", class: "bg-destructive/10 text-destructive" },
};

const groupByOptions = [
  { key: "none", label: "Tous" },
  { key: "type", label: "Type" },
  { key: "condition", label: "État" },
];

export default function EquipmentCheckouts() {
  const { data: checkouts, isLoading } = useEquipmentCheckouts();
  const { data: missions } = useMissions();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "table">("table");
  const [groupBy, setGroupBy] = useState("none");
  const [missionFilter, setMissionFilter] = useState("all");
  const [sortKey, setSortKey] = useState<string | null>("checked_at");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const filtered = useMemo(() => {
    let list = checkouts || [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c: any) => c.materiel?.name?.toLowerCase().includes(q) || c.notes?.toLowerCase().includes(q));
    }
    if (missionFilter !== "all") list = list.filter((c: any) => c.mission_id === missionFilter);
    if (sortKey) {
      list = [...list].sort((a: any, b: any) => {
        const av = a[sortKey] ?? "";
        const bv = b[sortKey] ?? "";
        const cmp = String(av).localeCompare(String(bv));
        return sortDir === "desc" ? -cmp : cmp;
      });
    }
    return list;
  }, [checkouts, search, missionFilter, sortKey, sortDir]);

  const grouped = useMemo(() => {
    if (groupBy === "none") return { "": filtered };
    const g: Record<string, any[]> = {};
    filtered.forEach((c: any) => {
      const key = groupBy === "type" ? (c.type === "checkout" ? "📤 Départs" : "📥 Retours") : (conditionConfig[c.condition]?.label || c.condition || "Non spécifié");
      (g[key] ??= []).push(c);
    });
    return g;
  }, [filtered, groupBy]);

  return (
    <AppLayout>
      <div className="flex-1 space-y-6 animate-fade-in max-w-7xl">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Check-in / Check-out</h1>
          <p className="text-muted-foreground mt-1">Suivi des départs et retours de matériel par mission.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={missionFilter} onValueChange={setMissionFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Toutes missions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les missions</SelectItem>
                {missions?.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <GroupBySelect options={groupByOptions} value={groupBy} onChange={setGroupBy} />
            <ListViewToggle view={view} onViewChange={setView} />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-4 bg-muted/30 rounded-2xl border border-dashed max-w-2xl mx-auto">
            <ClipboardCheck className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Aucun mouvement</h3>
            <p className="text-muted-foreground">Les check-in/out de matériel apparaîtront ici. Enregistrez-les depuis le détail d'une mission.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([label, items]) => (
            <div key={label} className="space-y-3">
              {label && <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">{label}</h3>}
              {view === "table" ? (
                <div className="border border-border/40 rounded-xl overflow-hidden bg-card">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 border-b border-border/40">
                      <tr>
                        <th className="p-3 text-left font-medium text-muted-foreground w-10">Type</th>
                        <SortableHeader label="Matériel" sortKey="materiel_name" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort} />
                        <SortableHeader label="Date" sortKey="checked_at" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort} />
                        <th className="p-3 text-left font-medium text-muted-foreground">Qté</th>
                        <th className="p-3 text-left font-medium text-muted-foreground">État</th>
                        <th className="p-3 text-left font-medium text-muted-foreground">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {items.map((c: any) => {
                        const cc = conditionConfig[c.condition] || { label: c.condition, class: "bg-muted" };
                        return (
                          <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                            <td className="p-3">
                              {c.type === "checkout"
                                ? <ArrowUpCircle className="h-5 w-5 text-warning" />
                                : <ArrowDownCircle className="h-5 w-5 text-success" />}
                            </td>
                            <td className="p-3 font-medium">{c.materiel?.name || "—"}</td>
                            <td className="p-3 text-muted-foreground tabular-nums">{format(new Date(c.checked_at), "dd/MM/yyyy HH:mm")}</td>
                            <td className="p-3 tabular-nums">{c.quantity}</td>
                            <td className="p-3"><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cc.class}`}>{cc.label}</span></td>
                            <td className="p-3 text-muted-foreground text-xs max-w-48 truncate">{c.notes || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {items.map((c: any) => {
                    const cc = conditionConfig[c.condition] || { label: c.condition, class: "bg-muted" };
                    return (
                      <Card key={c.id} className="border-border/40">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            {c.type === "checkout"
                              ? <ArrowUpCircle className="h-6 w-6 text-warning shrink-0" />
                              : <ArrowDownCircle className="h-6 w-6 text-success shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{c.materiel?.name}</p>
                              <p className="text-xs text-muted-foreground">{format(new Date(c.checked_at), "d MMM yyyy HH:mm", { locale: fr })} · × {c.quantity}</p>
                            </div>
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cc.class}`}>{cc.label}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </AppLayout>
  );
}
