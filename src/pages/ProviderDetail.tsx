/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useProvider, useDeleteProvider } from "@/hooks/use-data";
import { useAuth } from "@/hooks/use-auth";
import { useUserRole } from "@/hooks/use-user-role";
import {
    Button
} from "@/components/ui/button";
import {
    ArrowLeft,
    Edit,
    Trash2,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Briefcase,
    CreditCard,
    FileText,
    ShieldCheck,
    Building2,
    Euro
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProviderFormDialog } from "@/components/providers/ProviderFormDialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProviderDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: roleData } = useUserRole();
    const { data: provider, isLoading } = useProvider(id);
    const deleteMutation = useDeleteProvider();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const isOwnProfile = provider?.user_id === user?.id;
    const canManage = roleData?.role === 'admin' || roleData?.role === 'manager';
    const canEditProfile = canManage || (roleData?.role === 'prestataire' && isOwnProfile);

    if (isLoading) {
        return (
            <AppLayout>
                <div className="space-y-6">
                    <Skeleton className="h-10 w-1/4" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Skeleton className="h-64 col-span-2" />
                        <Skeleton className="h-64" />
                    </div>
                </div>
            </AppLayout>
        );
    }

    if (!provider) {
        return (
            <AppLayout>
                <div className="text-center py-20">
                    <h2 className="text-2xl font-bold">Prestataire non trouvé</h2>
                    <Button variant="ghost" className="mt-4" onClick={() => navigate("/prestataires")}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Retour à la liste
                    </Button>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="space-y-6 max-w-7xl animate-fade-in">
                {/* Header Actions */}
                <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => navigate("/prestataires")} className="rounded-xl">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Retour
                    </Button>
                    {canEditProfile && (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsFormOpen(true)} className="rounded-xl gap-2">
                                <Edit className="h-4 w-4" /> Modifier
                            </Button>
                            {canManage && (
                                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(true)} className="rounded-xl gap-2 text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-4 w-4" /> Supprimer
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {/* Profile Header */}
                <div className="relative">
                    <div className="h-32 w-full bg-gradient-to-r from-primary/20 to-secondary/20 rounded-3xl" />
                    <div className="px-8 -mt-12 flex flex-col md:flex-row md:items-end gap-6">
                        <div className="h-24 w-24 rounded-3xl bg-background border-4 border-background shadow-xl flex items-center justify-center text-primary text-3xl font-bold">
                            {provider.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="pb-2 space-y-1">
                            <h1 className="text-3xl font-display font-bold">{provider.name}</h1>
                            <div className="flex flex-wrap gap-2">
                                {provider.specialties?.map(s => (
                                    <Badge key={s} variant="secondary" className="bg-primary/5 text-primary border-primary/10">
                                        {s}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        <Tabs defaultValue="overview" className="w-full">
                            <TabsList className="bg-muted/50 p-1 rounded-xl">
                                <TabsTrigger value="overview" className="rounded-lg">Vue d'ensemble</TabsTrigger>
                                <TabsTrigger value="history" className="rounded-lg">Historique</TabsTrigger>
                                <TabsTrigger value="docs" className="rounded-lg">Documents</TabsTrigger>
                            </TabsList>

                            <TabsContent value="overview" className="space-y-6 mt-6">
                                <Card className="border-border/50 shadow-sm rounded-2xl">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Building2 className="h-5 w-5 text-primary" /> Informations Légales
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4 text-sm">
                                            <div>
                                                <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">SIRET</p>
                                                <p className="font-medium">{(provider.legal_info as any)?.siret || "Non renseigné"}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">TVA Intracommunautaire</p>
                                                <p className="font-medium">{(provider.legal_info as any)?.vat_number || "Non renseigné"}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4 text-sm">
                                            <div>
                                                <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Structure Juridique</p>
                                                <p className="font-medium">{(provider.legal_info as any)?.structure || "Auto-entrepreneur / Freelance"}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Assurance RC Pro</p>
                                                <div className="flex items-center gap-2 text-success">
                                                    <ShieldCheck className="h-4 w-4" />
                                                    <span className="font-medium">À jour</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {(canManage || isOwnProfile) && (
                                    <Card className="border-border/50 shadow-sm rounded-2xl">
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <CreditCard className="h-5 w-5 text-primary" /> Coordonnées Bancaires (RIB)
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4 text-sm">
                                            <div>
                                                <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">IBAN</p>
                                                <p className="font-mono bg-muted/30 p-2 rounded-lg mt-1 select-all">
                                                    {(provider.legal_info as any)?.iban || "Non renseigné"}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">BIC / SWIFT</p>
                                                <p className="font-mono bg-muted/30 p-2 rounded-lg mt-1 select-all w-fit px-4">
                                                    {(provider.legal_info as any)?.bic || "Non renseigné"}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </TabsContent>

                            <TabsContent value="history" className="mt-6">
                                <Card className="border-border/50 shadow-sm rounded-2xl">
                                    <CardContent className="py-20 text-center space-y-4">
                                        <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                                            <Calendar className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Aucune mission passée enregistrée</p>
                                            <p className="text-xs text-muted-foreground">L'historique des interventions s'affichera ici une fois lié à des factures.</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="docs" className="mt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(provider.legal_info as any)?.id_document_url && (
                                        <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/50 rounded-2xl group hover:bg-muted/30 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-background border rounded-xl flex items-center justify-center">
                                                    <FileText className="h-5 w-5 text-primary/70" />
                                                </div>
                                                <span className="text-sm font-medium">Pièce d'identité</span>
                                            </div>
                                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => window.open((provider.legal_info as any).id_document_url, '_blank')}>
                                                Voir
                                            </Button>
                                        </div>
                                    )}
                                    {['RIB', 'Attestation URSSAF', 'RC Pro'].map(doc => (
                                        <div key={doc} className="flex items-center justify-between p-4 bg-muted/20 border border-border/50 rounded-2xl group hover:bg-muted/30 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-background border rounded-xl flex items-center justify-center">
                                                    <FileText className="h-5 w-5 text-primary/70" />
                                                </div>
                                                <span className="text-sm font-medium">{doc}</span>
                                            </div>
                                            <span className="text-xs text-muted-foreground italic">Non disponible</span>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Sidebar Info */}
                    <div className="space-y-6">
                        <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden bg-primary/5 border-primary/10">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary/80 flex items-center gap-2">
                                    <Euro className="h-4 w-4" /> Tarification
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-end border-b border-primary/10 pb-3">
                                    <p className="text-sm text-muted-foreground font-medium">Taux Journalier (TJM)</p>
                                    <p className="text-2xl font-bold text-primary">{(provider.daily_rate || 0).toLocaleString('fr-FR')} €</p>
                                </div>
                                <div className="flex justify-between items-end border-b border-primary/10 pb-3">
                                    <p className="text-sm text-muted-foreground font-medium">Taux Horaire</p>
                                    <p className="text-xl font-bold text-primary/80">{(provider.hourly_rate || 0).toLocaleString('fr-FR')} €</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-border/50 shadow-sm rounded-2xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Coordonnées</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div className="flex items-start gap-3">
                                    <Mail className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                        <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                                        <p className="font-medium truncate">{(provider.contact_info as any)?.email || "Non renseigné"}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Phone className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-0.5">Téléphone</p>
                                        <p className="font-medium">{(provider.contact_info as any)?.phone || "Non renseigné"}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 border-t border-border pt-3">
                                    <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-0.5">Adresse</p>
                                        <p className="font-medium">{(provider.contact_info as any)?.address || "Non renseigné"}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <ProviderFormDialog
                    open={isFormOpen}
                    onOpenChange={setIsFormOpen}
                    provider={provider}
                />

                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer le prestataire ?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Cette action est irréversible. Toutes les données associées à ce prestataire seront supprimées.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={async () => {
                                await deleteMutation.mutateAsync(provider.id);
                                navigate("/prestataires");
                            }} className="bg-destructive text-white hover:bg-destructive/90">
                                {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AppLayout>
    );
}
