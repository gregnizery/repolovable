import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
    label: string;
    value: string | number;
    sub?: string;
    icon: LucideIcon;
    color: string;
}

export function StatCards({ stats }: { stats: StatCardProps[] }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
                <Card key={stat.label} className="shadow-card hover:shadow-lg transition-shadow duration-300 border-border/50">
                    <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                                <p className="text-2xl font-display font-bold">{stat.value}</p>
                                {stat.sub && <p className="text-xs text-muted-foreground">{stat.sub}</p>}
                            </div>
                            <div className={cn("p-2.5 rounded-xl", stat.color)}>
                                <stat.icon className="h-5 w-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
