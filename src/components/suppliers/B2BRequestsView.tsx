import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSubrentRequests, useUpdateSubrentRequestStatus } from "@/hooks/use-data";
import { useUserRole } from "@/hooks/use-user-role";
import { Loader2, ArrowRightLeft, Calendar, Package, ArrowDownRight, ArrowUpRight, Check, X } from "lucide-react";
interface RequestItem {
    id: string;
    materiel_name: string;
    quantity: number;
    start_date: string;
    end_date: string;
    notes: string | null;
    status: string;
    provider_team_id: string;
    requester_team_id: string;
    requester?: { name: string } | null;
    provider?: { name: string } | null;
}

const getStatusBadge = (status: string) => {
    switch (status) {
        case "pending": return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">En attente</Badge>;
        case "accepted": return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Acceptée</Badge>;
        case "rejected": return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Refusée</Badge>;
        case "cancelled": return <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Annulée</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
};

export function B2BRequestsView() {
    const { data: requests, isLoading } = useSubrentRequests();
    const { data: roleData } = useUserRole();
    const updateStatus = useUpdateSubrentRequestStatus();

    if (isLoading || !roleData) {
        return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 text-muted-foreground animate-spin" /></div>;
    }

    const teamId = roleData.teamId;
    const incoming = requests?.filter(r => r.provider_team_id === teamId) || [];
    const outgoing = requests?.filter(r => r.requester_team_id === teamId) || [];

    const handleStatusChange = (id: string, status: "accepted" | "rejected" | "cancelled") => {
        updateStatus.mutate({ id, status });
    };

    const renderRequestCard = (req: RequestItem, type: "incoming" | "outgoing") => {
        return (
            <Card key={req.id} className="overflow-hidden">
                <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                {req.materiel_name}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1.5">
                                {type === "incoming" ? (
                                    <><ArrowDownRight className="h-4 w-4 text-info" /> Reçue de : <span className="font-medium text-foreground">{req.requester?.name || "Équipe inconnue"}</span></>
                                ) : (
                                    <><ArrowUpRight className="h-4 w-4 text-warning" /> Envoyée à : <span className="font-medium text-foreground">{req.provider?.name || "Équipe inconnue"}</span></>
                                )}
                            </CardDescription>
                        </div>
                        {getStatusBadge(req.status)}
                    </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Package className="h-4 w-4" />
                            <span>Quantité : <strong className="text-foreground">{req.quantity}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Du <strong>{new Date(req.start_date).toLocaleDateString()}</strong> au <strong>{new Date(req.end_date).toLocaleDateString()}</strong></span>
                        </div>
                    </div>

                    {req.notes && (
                        <div className="bg-muted/50 p-3 rounded-md text-sm">
                            <span className="font-semibold text-xs uppercase text-muted-foreground block mb-1">Notes :</span>
                            {req.notes}
                        </div>
                    )}

                    {/* Actions */}
                    {req.status === "pending" && (
                        <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                            {type === "incoming" ? (
                                <>
                                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleStatusChange(req.id, "rejected")} disabled={updateStatus.isPending}>
                                        <X className="h-4 w-4 mr-1" /> Refuser
                                    </Button>
                                    <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={() => handleStatusChange(req.id, "accepted")} disabled={updateStatus.isPending}>
                                        <Check className="h-4 w-4 mr-1" /> Accepter
                                    </Button>
                                </>
                            ) : (
                                <Button variant="outline" size="sm" onClick={() => handleStatusChange(req.id, "cancelled")} disabled={updateStatus.isPending}>
                                    Annuler la demande
                                </Button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    return (
        <Tabs defaultValue="incoming" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                <TabsTrigger value="incoming" className="gap-2">
                    <ArrowDownRight className="h-4 w-4" /> Demandes reçues
                    {incoming.filter(r => r.status === "pending").length > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full ml-1">
                            {incoming.filter(r => r.status === "pending").length}
                        </span>
                    )}
                </TabsTrigger>
                <TabsTrigger value="outgoing" className="gap-2">
                    <ArrowUpRight className="h-4 w-4" /> Demandes envoyées
                </TabsTrigger>
            </TabsList>

            <TabsContent value="incoming" className="space-y-4">
                {incoming.length === 0 ? (
                    <div className="text-center py-12 px-4 border border-dashed rounded-2xl bg-muted/10">
                        <ArrowDownRight className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                        <h3 className="text-lg font-medium mb-1">Aucune demande reçue</h3>
                        <p className="text-muted-foreground text-sm">Vous n'avez pas encore reçu de demandes de sous-location de la part de votre réseau B2B.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {incoming.map(req => renderRequestCard(req, "incoming"))}
                    </div>
                )}
            </TabsContent>

            <TabsContent value="outgoing" className="space-y-4">
                {outgoing.length === 0 ? (
                    <div className="text-center py-12 px-4 border border-dashed rounded-2xl bg-muted/10">
                        <ArrowUpRight className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                        <h3 className="text-lg font-medium mb-1">Aucune demande envoyée</h3>
                        <p className="text-muted-foreground text-sm">Vous n'avez pas encore envoyé de demandes de sous-location à votre réseau.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {outgoing.map(req => renderRequestCard(req, "outgoing"))}
                    </div>
                )}
            </TabsContent>
        </Tabs>
    );
}
