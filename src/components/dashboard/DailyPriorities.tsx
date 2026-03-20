import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Priority {
    title: string;
    value: string | number;
    detail: string;
    tone: string;
}

export function DailyPriorities({ priorities }: { priorities: Priority[] }) {
    return (
        <Card className="shadow-card border-border/50 lg:col-span-2">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-semibold">Priorités du jour</h3>
                    <span className="text-xs text-muted-foreground">Mise à jour temps réel</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {priorities.map((item) => (
                        <div key={item.title} className="rounded-xl border border-border p-4 bg-card">
                            <p className="text-xs text-muted-foreground mb-1">{item.title}</p>
                            <p className={cn("text-xl font-display font-bold", item.tone)}>{item.value}</p>
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{item.detail}</p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
