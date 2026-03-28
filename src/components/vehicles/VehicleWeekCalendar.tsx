import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Truck, Calendar } from "lucide-react";
import { format, startOfWeek, addDays, isSameDay, isWithinInterval, addWeeks, subWeeks, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useVehicleWeekTransports } from "@/hooks/use-vehicles";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Vehicle {
  id: string;
  name: string;
  plate_number?: string | null;
  status: string;
  type: string;
}

interface VehicleWeekCalendarProps {
  vehicles: Vehicle[];
}

const statusColors: Record<string, string> = {
  "planifié": "bg-accent text-accent-foreground",
  "en_route": "bg-warning/80 text-warning-foreground",
  "terminé": "bg-success/30 text-success",
  "annulé": "bg-muted text-muted-foreground line-through",
};

const typeLabels: Record<string, string> = {
  livraison: "Livraison",
  recuperation: "Récup.",
};

export function VehicleWeekCalendar({ vehicles }: VehicleWeekCalendarProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekEnd = addDays(weekStart, 6);

  const { data: transports = [] } = useVehicleWeekTransports(
    format(weekStart, "yyyy-MM-dd"),
    format(addDays(weekEnd, 1), "yyyy-MM-dd")
  );

  const days = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const transportsByVehicle = useMemo(() => {
    const map: Record<string, typeof transports> = {};
    for (const t of transports) {
      if (!t.vehicle_id) continue;
      if (!map[t.vehicle_id]) map[t.vehicle_id] = [];
      map[t.vehicle_id].push(t);
    }
    return map;
  }, [transports]);

  const getTransportsForDay = (vehicleId: string, day: Date) => {
    const vTransports = transportsByVehicle[vehicleId] || [];
    return vTransports.filter((t) => {
      if (!t.scheduled_at) return false;
      return isSameDay(parseISO(t.scheduled_at), day);
    });
  };

  const isToday = (day: Date) => isSameDay(day, new Date());

  return (
    <Card className="shadow-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Planning véhicules
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => setWeekStart(s => subWeeks(s, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-xs rounded-lg h-7 px-2" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
              Aujourd'hui
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => setWeekStart(s => addWeeks(s, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {format(weekStart, "d MMM", { locale: fr })} — {format(weekEnd, "d MMM yyyy", { locale: fr })}
        </p>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[600px]">
          <thead>
            <tr>
              <th className="text-left p-2 pl-4 w-[140px] border-b border-border/50 text-muted-foreground font-medium">
                Véhicule
              </th>
              {days.map((day) => (
                <th
                  key={day.toISOString()}
                  className={cn(
                    "p-2 text-center border-b border-border/50 font-medium",
                    isToday(day) ? "text-primary bg-primary/5" : "text-muted-foreground"
                  )}
                >
                  <div>{format(day, "EEE", { locale: fr })}</div>
                  <div className={cn(
                    "text-sm font-semibold mt-0.5",
                    isToday(day) && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center mx-auto"
                  )}>
                    {format(day, "d")}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  Aucun véhicule enregistré
                </td>
              </tr>
            ) : (
              vehicles.map((v) => (
                <tr key={v.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-2 pl-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <Truck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{v.name}</p>
                        {v.plate_number && (
                          <p className="text-[10px] text-muted-foreground">{v.plate_number}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  {days.map((day) => {
                    const dayTransports = getTransportsForDay(v.id, day);
                    return (
                      <td
                        key={day.toISOString()}
                        className={cn(
                          "p-1 text-center align-top border-l border-border/20",
                          isToday(day) && "bg-primary/5"
                        )}
                      >
                        <div className="space-y-0.5 min-h-[28px]">
                          {dayTransports.map((t) => (
                            <Tooltip key={t.id}>
                              <TooltipTrigger asChild>
                                <div className={cn(
                                  "rounded px-1.5 py-0.5 text-[10px] font-medium truncate cursor-default",
                                  statusColors[t.status] || "bg-muted text-muted-foreground"
                                )}>
                                  {typeLabels[t.type] || t.type}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs max-w-[200px]">
                                <p className="font-semibold">{(t as any).missions?.title || "Mission"}</p>
                                <p>{typeLabels[t.type] || t.type} · {t.status}</p>
                                {t.scheduled_at && (
                                  <p className="text-muted-foreground">
                                    {format(parseISO(t.scheduled_at), "HH:mm", { locale: fr })}
                                  </p>
                                )}
                                {t.address && <p className="text-muted-foreground truncate">{t.address}</p>}
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
