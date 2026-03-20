import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function UpcomingMissionsList({ missions }: { missions: any[] }) {
    return (
        <Card className="shadow-card border-border/50">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-semibold">Prochaines missions</h3>
                    <Link to="/missions" className="text-sm text-primary font-medium hover:underline">Voir tout</Link>
                </div>
                {missions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Aucune mission planifiée</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {missions.slice(0, 3).map((m) => (
                            <div key={m.id} className="rounded-xl border border-border p-4 hover:shadow-md transition-shadow bg-card">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-info/10 text-info">{m.event_type || "Mission"}</span>
                                    {m.start_date && <span className="text-xs text-muted-foreground">{new Date(m.start_date).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).replace(" à", " -")}</span>}
                                </div>
                                <h4 className="font-semibold text-sm mb-1">{m.title}</h4>
                                <p className="text-xs text-muted-foreground mb-2">{m.location || ""}</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">{m.clients?.name || ""}</span>
                                    <span className="text-sm font-semibold">{(m.amount || 0).toLocaleString()}€</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
