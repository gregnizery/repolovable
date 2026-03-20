import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, TrendingUp, Users, ShieldAlert, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Team = {
    id: string;
    name: string;
    plan: "free" | "pro" | "suite";
    created_at: string;
    owner_id: string;
};

export default function SuperAdmin() {
    const [search, setSearch] = useState("");
    const queryClient = useQueryClient();

    const { data: teams = [], isLoading } = useQuery({
        queryKey: ["superadmin-teams"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("teams")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data as Team[];
        },
    });

    const updatePlan = useMutation({
        mutationFn: async ({ teamId, plan }: { teamId: string; plan: Team["plan"] }) => {
            const { error } = await supabase
                .from("teams")
                .update({ plan })
                .eq("id", teamId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["superadmin-teams"] });
            toast.success("Plan mis à jour");
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => toast.error("Erreur: " + err.message),
    });

    const deleteTeam = useMutation({
        mutationFn: async (teamId: string) => {
            const { error } = await supabase.rpc("delete_team_safely", { p_team_id: teamId });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["superadmin-teams"] });
            toast.success("Équipe supprimée définitivement");
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => toast.error("Erreur: " + err.message),
    });

    const filteredTeams = teams.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.id.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <AppLayout>
            <div className="space-y-6 max-w-7xl mx-auto">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-destructive">
                        <ShieldAlert className="h-6 w-6" />
                        <h1 className="text-2xl font-display font-bold">Console SuperAdmin</h1>
                    </div>
                    <p className="text-muted-foreground">Gestion globale des équipes et abonnements.</p>
                </div>

                <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-2xl border border-border/50">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher une équipe par nom ou ID..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-10 h-11 bg-background rounded-xl border-border/50 focus:ring-primary"
                        />
                    </div>
                    <div className="hidden sm:flex items-center gap-4 px-4 border-l border-border/50">
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Équipes</p>
                            <p className="text-xl font-bold">{teams.length}</p>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center p-20">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredTeams.map((team) => (
                            <Card key={team.id} className="shadow-card border-border/50 hover:border-primary/20 transition-all overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-6">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-lg">
                                                    {team.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg">{team.name}</h3>
                                                    <p className="text-xs text-muted-foreground font-mono">{team.id}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-4">
                                            <div className="flex bg-muted/50 p-1 rounded-xl border border-border/50">
                                                {(["free", "pro", "suite"] as const).map((plan) => (
                                                    <button
                                                        key={plan}
                                                        onClick={() => updatePlan.mutate({ teamId: team.id, plan })}
                                                        disabled={updatePlan.isPending}
                                                        className={cn(
                                                            "px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wide",
                                                            team.plan === plan
                                                                ? "bg-background text-primary shadow-sm ring-1 ring-border/50"
                                                                : "text-muted-foreground hover:text-foreground"
                                                        )}
                                                    >
                                                        {plan}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="h-8 w-px bg-border/50 hidden md:block" />

                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="rounded-xl h-10 w-10"
                                                onClick={() => {
                                                    if (confirm(`ATTENTION: Êtes-vous sûr de vouloir supprimer DÉFINITIVEMENT l'équipe "${team.name}" ? Toutes ses données seront effacées.`)) {
                                                        deleteTeam.mutate(team.id);
                                                    }
                                                }}
                                                disabled={deleteTeam.isPending}
                                            >
                                                {deleteTeam.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
