import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, ClipboardCheck, LucideIcon } from "lucide-react";

interface Action {
    label: string;
    href: string;
    icon: LucideIcon;
}

export function QuickActions({ actions }: { actions: Action[] }) {
    return (
        <Card className="shadow-card border-border/50">
            <CardContent className="p-6">
                <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-primary" /> Actions rapides
                </h3>
                <div className="space-y-2">
                    {actions.map((action) => (
                        <Link
                            key={action.label}
                            to={action.href}
                            className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <action.icon className="h-4 w-4 text-muted-foreground" />
                                {action.label}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
