import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, RefreshCw, Package, AlertTriangle, CheckCircle,
  Search, Clock, Wifi, WifiOff, ChevronDown, ChevronUp,
  MapPin, Wrench, XCircle, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const POLL_INTERVAL = 30_000; // 30s

interface ConflictInfo {
  type: string;
  mission_title: string;
  quantity: number;
  detail: string;
}

interface DispoItem {
  id: string;
  name: string;
  category: string | null;
  location: string | null;
  serial_number: string | null;
  rental_price: number | null;
  status: string;
  stock_total: number;
  assigned: number;
  blocked: number;
  disponible: number;
  conflicts: ConflictInfo[];
}

interface Summary {
  total: number;
  disponible: number;
  en_mission: number;
  maintenance: number;
  hors_service: number;
  conflicts: number;
  total_stock: number;
  total_available: number;
  total_assigned: number;
  total_blocked: number;
}

interface DispoData {
  items: DispoItem[];
  summary: Summary;
  timestamp: string;
}

const statusConfig: Record<string, { label: string; class: string; icon: typeof Package }> = {
  disponible: { label: "Disponible", class: "bg-success/10 text-success", icon: CheckCircle },
  en_mission: { label: "En mission", class: "bg-info/10 text-info", icon: Activity },
  maintenance: { label: "Maintenance", class: "bg-warning/10 text-warning", icon: Wrench },
  hors_service: { label: "Hors service", class: "bg-destructive/10 text-destructive", icon: XCircle },
};

export default function MonitoringDisponibilites() {
  const navigate = useNavigate();
  const [data, setData] = useState<DispoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [onlyConflicts, setOnlyConflicts] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const countdownRef = useRef<ReturnType<typeof setInterval>>();

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Session expirée. Veuillez vous reconnecter.");
        setIsConnected(false);
        setLoading(false);
        return;
      }
      const { data: result, error: fnErr } = await supabase.functions.invoke("materiel-disponibilites");
      if (fnErr) throw fnErr;
      setData(result as DispoData);
      setLastRefresh(new Date());
      setCountdown(30);
      setIsConnected(true);
    } catch (err) {
      setError((err as Error).message);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + polling
  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  // Countdown timer
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const manualRefresh = useCallback(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filter items
  const filtered = (data?.items || []).filter(item => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category?.toLowerCase().includes(search.toLowerCase()) ||
      item.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
      item.location?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || item.status === statusFilter;
    const matchConflicts = !onlyConflicts || item.conflicts.length > 0;
    return matchSearch && matchStatus && matchConflicts;
  });

  const summary = data?.summary;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl">
        <button onClick={() => navigate("/materiel")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Retour au matériel
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">Monitoring disponibilités</h1>
            <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
              {isConnected ? (
                <Wifi className="h-3.5 w-3.5 text-success" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-destructive" />
              )}
              Auto-refresh toutes les 30s
              {lastRefresh && (
                <span className="text-xs">
                  · Dernière MàJ {lastRefresh.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
              <Clock className="h-3.5 w-3.5" />
              {countdown}s
            </div>
            <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={manualRefresh} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Rafraîchir
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <SummaryCard label="Total" value={summary.total} icon={Package} className="text-foreground" />
            <SummaryCard label="Disponibles" value={summary.disponible} icon={CheckCircle} className="text-success" />
            <SummaryCard label="En mission" value={summary.en_mission} icon={Activity} className="text-info" />
            <SummaryCard label="Maintenance" value={summary.maintenance} icon={Wrench} className="text-warning" />
            <SummaryCard label="Hors service" value={summary.hors_service} icon={XCircle} className="text-destructive" />
            <SummaryCard label="Conflits" value={summary.conflicts} icon={AlertTriangle} className={summary.conflicts > 0 ? "text-destructive" : "text-muted-foreground"} />
          </div>
        )}

        {/* Stock progress */}
        {summary && summary.total_stock > 0 && (
          <Card className="shadow-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Répartition du stock global</span>
                <span className="text-xs text-muted-foreground">
                  {summary.total_available} dispo / {summary.total_stock} total
                </span>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                <div
                  className="bg-success transition-all duration-500"
                  style={{ width: `${(summary.total_available / summary.total_stock) * 100}%` }}
                />
                <div
                  className="bg-info transition-all duration-500"
                  style={{ width: `${(summary.total_assigned / summary.total_stock) * 100}%` }}
                />
                <div
                  className="bg-destructive transition-all duration-500"
                  style={{ width: `${(summary.total_blocked / summary.total_stock) * 100}%` }}
                />
              </div>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> Disponible ({summary.total_available})</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-info" /> Assigné ({summary.total_assigned})</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> Bloqué ({summary.total_blocked})</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10 rounded-xl" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["all", "disponible", "en_mission", "maintenance", "hors_service"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={cn("text-xs font-medium px-3 py-1.5 rounded-full transition-colors",
                  statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}>
                {s === "all" ? "Tous" : statusConfig[s]?.label || s}
              </button>
            ))}
            <button onClick={() => setOnlyConflicts(!onlyConflicts)}
              className={cn("text-xs font-medium px-3 py-1.5 rounded-full transition-colors gap-1 flex items-center",
                onlyConflicts ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}>
              <AlertTriangle className="h-3 w-3" /> Conflits
            </button>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">Erreur de connexion</p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items list */}
        {loading && !data ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Aucun matériel trouvé</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(item => {
              const isExpanded = expandedItems.has(item.id);
              const usagePercent = item.stock_total > 0
                ? ((item.stock_total - item.disponible) / item.stock_total) * 100
                : 0;
              const hasConflicts = item.conflicts.length > 0;
              const sc = statusConfig[item.status];

              return (
                <Card
                  key={item.id}
                  className={cn(
                    "shadow-card border-border/50 transition-all duration-200",
                    hasConflicts && "border-warning/40",
                  )}
                >
                  <CardContent className="p-0">
                    <div
                      className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                      onClick={() => hasConflicts ? toggleExpand(item.id) : navigate(`/materiel/${item.id}`)}
                    >
                      {/* Status icon */}
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", sc?.class || "bg-muted")}>
                        {sc ? <sc.icon className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm truncate">{item.name}</h3>
                          <Badge variant="outline" className={cn("text-[10px] shrink-0", sc?.class)}>
                            {sc?.label || item.status}
                          </Badge>
                          {hasConflicts && (
                            <Badge variant="outline" className="text-[10px] border-warning/50 text-warning shrink-0">
                              <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                              {item.conflicts.length}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {item.category && <span>{item.category}</span>}
                          {item.location && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="h-3 w-3" /> {item.location}
                            </span>
                          )}
                          {item.serial_number && <span>S/N: {item.serial_number}</span>}
                        </div>
                      </div>

                      {/* Availability bar */}
                      <div className="hidden sm:flex flex-col items-end gap-1 w-40 shrink-0">
                        <div className="flex items-center justify-between w-full text-xs">
                          <span className="text-muted-foreground">Dispo</span>
                          <span className={cn("font-semibold", item.disponible > 0 ? "text-success" : "text-destructive")}>
                            {item.disponible}/{item.stock_total}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden bg-muted">
                          <div
                            className={cn("h-full transition-all duration-500 rounded-full",
                              usagePercent > 80 ? "bg-destructive" : usagePercent > 50 ? "bg-warning" : "bg-success"
                            )}
                            style={{ width: `${100 - usagePercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Mobile availability */}
                      <div className="sm:hidden text-right shrink-0">
                        <span className={cn("text-sm font-bold", item.disponible > 0 ? "text-success" : "text-destructive")}>
                          {item.disponible}
                        </span>
                        <span className="text-xs text-muted-foreground">/{item.stock_total}</span>
                      </div>

                      {/* Expand toggle */}
                      {hasConflicts && (
                        <button className="text-muted-foreground shrink-0" onClick={e => { e.stopPropagation(); toggleExpand(item.id); }}>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      )}
                    </div>

                    {/* Expanded conflicts */}
                    {isExpanded && hasConflicts && (
                      <div className="px-4 pb-4 pt-0 border-t border-border/50">
                        <div className="space-y-2 mt-3">
                          {item.conflicts.map((c, i) => (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-warning/5 border border-warning/20">
                              <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium">{c.mission_title}</p>
                                <p className="text-[11px] text-muted-foreground">{c.detail} · {c.quantity} unité(s)</p>
                              </div>
                              <Badge variant="outline" className="text-[10px]">
                                {c.type === "mission_active" ? "Mission active" : "Retour manquant"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex gap-2 text-xs">
                          <span className="text-muted-foreground">Assigné: <strong className="text-info">{item.assigned}</strong></span>
                          <span className="text-muted-foreground">Bloqué: <strong className="text-destructive">{item.blocked}</strong></span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function SummaryCard({ label, value, icon: Icon, className }: { label: string; value: number; icon: typeof Package; className?: string }) {
  return (
    <Card className="shadow-card border-border/50">
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={cn("h-5 w-5 shrink-0", className)} />
        <div>
          <p className={cn("text-xl font-bold", className)}>{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
