import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSupplier, useDeleteSupplier } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Trash2, Mail, Phone, MapPin, Users, LinkIcon, StickyNote, Package, Calendar } from "lucide-react";
import { useState } from "react";
import { SupplierFormDialog } from "@/components/suppliers/SupplierFormDialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function useSupplierSubrentRequests(supplierTeamId: string | null | undefined) {
    const { user } = useAuth();
    return useQuery({
        queryKey: ["subrent_requests_supplier", supplierTeamId],
        queryFn: async () => {
            if (!supplierTeamId) return [];
            const { data, error } = await supabase
                .from("subrent_requests")
                .select("*, missions(title)")
                .or(`provider_team_id.eq.${supplierTeamId},requester_team_id.eq.${supplierTeamId}`)
                .order("created_at", { ascending: false })
                .limit(20);
            if (error) throw error;
            return data;
        },
        enabled: !!user && !!supplierTeamId,
    });
}

const statusConfig: Record<string, { label: string; class: string }> = {
    pending: { label: "En attente", class: "bg-warning/10 text-warning" },
    accepted: { label: "Acceptée", class: "bg-success/10 text-success" },
    rejected: { label: "Refusée", class: "bg-destructive/10 text-destructive" },
    completed: { label: "Terminée", class: "bg-info/10 text-info" },
};

export default function SupplierDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: supplier, isLoading } = useSupplier(id);
    const deleteSupplierMutation = useDeleteSupplier();
    const { data: subrentRequests } = useSupplierSubrentRequests(supplier?.connected_team_id);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const confirmDelete = async () => {
        if (supplier) {
            await deleteSupplierMutation.mutateAsync(supplier.id);
            navigate("/suppliers");
        }
    };

    if (isLoading) {
        return (
            <AppLayout>
                <div className="flex-1 max-w-4xl space-y-6 animate-fade-in">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-64 w-full rounded-xl" />
                </div>
            </AppLayout>
        );
    }

    if (!supplier) {
        return (
            <AppLayout>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <h2 className="text-xl font-semibold mb-2">Fournisseur introuvable</h2>
                        <Button variant="outline" onClick={() => navigate("/suppliers")}>
                            <ArrowLeft className="h-4 w-4 mr-2" /> Retour
                        </Button>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="flex-1 max-w-5xl space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => navigate("/suppliers")} className="rounded-full">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-display font-bold tracking-tight">{supplier.name}</h1>
                                {supplier.connected_team_id && (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                                        <LinkIcon className="h-3 w-3" /> Planify
                                    </span>
                                )}
                            </div>
                            {supplier.contact_name && <p className="text-muted-foreground mt-0.5">{supplier.contact_name}</p>}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsFormOpen(true)}>
                            <Edit className="h-4 w-4 mr-2" /> Modifier
                        </Button>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(true)} className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main info */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="border-border/40">
                            <CardHeader><CardTitle className="text-base">Coordonnées</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                {supplier.email && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"><Mail className="h-4 w-4 text-muted-foreground" /></div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Email</p>
                                            <a href={`mailto:${supplier.email}`} className="text-sm font-medium hover:text-primary transition-colors">{supplier.email}</a>
                                        </div>
                                    </div>
                                )}
                                {supplier.phone && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"><Phone className="h-4 w-4 text-muted-foreground" /></div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Téléphone</p>
                                            <a href={`tel:${supplier.phone}`} className="text-sm font-medium hover:text-primary transition-colors">{supplier.phone}</a>
                                        </div>
                                    </div>
                                )}
                                {supplier.address && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"><MapPin className="h-4 w-4 text-muted-foreground" /></div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Adresse</p>
                                            <p className="text-sm font-medium">{supplier.address}</p>
                                        </div>
                                    </div>
                                )}
                                {!supplier.email && !supplier.phone && !supplier.address && (
                                    <p className="text-sm text-muted-foreground italic">Aucune coordonnée renseignée.</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Subrent history */}
                        {supplier.connected_team_id && (
                            <Card className="border-border/40">
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Package className="h-4 w-4" /> Historique des sous-locations
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {!subrentRequests || subrentRequests.length === 0 ? (
                                        <p className="text-sm text-muted-foreground italic">Aucune demande de sous-location avec ce partenaire.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {subrentRequests.map((req: any) => {
                                                const sc = statusConfig[req.status] || { label: req.status, class: "bg-muted text-muted-foreground" };
                                                return (
                                                    <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                                                        <div>
                                                            <p className="text-sm font-medium">{req.materiel_name} × {req.quantity}</p>
                                                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                                <Calendar className="h-3 w-3" />
                                                                {format(new Date(req.start_date), "d MMM", { locale: fr })} → {format(new Date(req.end_date), "d MMM yyyy", { locale: fr })}
                                                            </p>
                                                        </div>
                                                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${sc.class}`}>{sc.label}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <Card className="border-border/40">
                            <CardHeader><CardTitle className="text-base flex items-center gap-2"><StickyNote className="h-4 w-4" /> Notes</CardTitle></CardHeader>
                            <CardContent>
                                {supplier.notes ? (
                                    <p className="text-sm whitespace-pre-wrap">{supplier.notes}</p>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">Aucune note. Cliquez sur Modifier pour en ajouter.</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-border/40">
                            <CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Type</span>
                                    <span className="font-medium">{supplier.connected_team_id ? "Connecté Planify" : "Manuel"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Créé le</span>
                                    <span className="font-medium">{format(new Date(supplier.created_at), "d MMM yyyy", { locale: fr })}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Modifié le</span>
                                    <span className="font-medium">{format(new Date(supplier.updated_at), "d MMM yyyy", { locale: fr })}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <SupplierFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} supplier={supplier} />

                <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer ce fournisseur ?</AlertDialogTitle>
                            <AlertDialogDescription>
                                <strong>{supplier.name}</strong> sera définitivement supprimé.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                Supprimer
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AppLayout>
    );
}
