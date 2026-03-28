import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useUserRole } from "@/hooks/use-user-role";
import { useCreateProvider, getTeamId } from "@/hooks/use-data";
import { useWorkspace } from "@/hooks/use-workspace";
import {
    CheckCircle2,
    Rocket,
    Euro,
    Building2,
    CreditCard,
    Loader2,
    ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { buildRelativeAppPath } from "@/lib/public-app-url";

export default function ProviderOnboarding() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const { data: roleData, isLoading: roleLoading } = useUserRole();
    const { activeTeamId } = useWorkspace();
    const createProvider = useCreateProvider();

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: "",
        daily_rate: 0,
        hourly_rate: 0,
        specialties: "",
        siret: "",
        tva_number: "",
        iban: "",
        bic: "",
    });

    // Check if provider record already exists and is onboarded
    useEffect(() => {
        if (!authLoading && !roleLoading && roleData) {
            // If not a prestataire or already onboarded, go to dashboard
            if (roleData.role !== "prestataire" || roleData.isOnboarded) {
                navigate(buildRelativeAppPath("/dashboard"));
            }
        }
    }, [authLoading, roleLoading, roleData, navigate]);

    if (authLoading || roleLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const handleSubmit = async () => {
        if (!user) return;
        const teamId = await getTeamId(user.id, activeTeamId);
        if (!teamId) {
            toast.error("Équipe non trouvée. Veuillez contacter votre administrateur.");
            return;
        }

        try {
            await createProvider.mutateAsync({
                user_id: user.id,
                name: formData.name || user.email || "Prestataire",
                daily_rate: Number(formData.daily_rate),
                hourly_rate: Number(formData.hourly_rate),
                specialties: formData.specialties.split(",").map(s => s.trim()).filter(Boolean),
                legal_info: {
                    siret: formData.siret,
                    tva_number: formData.tva_number,
                    iban: formData.iban,
                    bic: formData.bic
                },
                contact_info: {
                    email: user.email
                }
            });
            setStep(3); // Success step
            setTimeout(() => navigate(buildRelativeAppPath("/dashboard")), 3000);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-2xl space-y-8 animate-fade-in">
                <div className="text-center space-y-2">
                    <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary mb-4">
                        <Rocket className="h-8 w-8" />
                    </div>
                    <h1 className="text-3xl font-display font-bold">Bienvenue sur Planify</h1>
                    <p className="text-muted-foreground">Complétez votre profil prestataire pour commencer à recevoir des missions.</p>
                </div>

                <div className="flex items-center justify-center gap-4 mb-8">
                    {[1, 2].map((s) => (
                        <div key={s} className="flex items-center gap-2">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                                {s}
                            </div>
                            <span className={`text-sm font-medium ${step >= s ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {s === 1 ? "Profil & Tarifs" : "Infos Légales"}
                            </span>
                            {s === 1 && <div className="h-px w-12 bg-muted mx-2" />}
                        </div>
                    ))}
                </div>

                {step === 1 && (
                    <Card className="border-border/50 shadow-xl rounded-3xl overflow-hidden">
                        <CardHeader className="bg-muted/30 pb-6">
                            <CardTitle className="flex items-center gap-2">
                                <Euro className="h-5 w-5 text-primary" /> Vos Tarifs & Spécialités
                            </CardTitle>
                            <CardDescription>Ces informations seront utilisées pour générer automatiquement vos lignes de devis.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nom / Raison Sociale</Label>
                                    <Input
                                        id="name"
                                        className="rounded-xl h-12"
                                        placeholder="Votre nom complet"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="specialties">Spécialités (séparées par des virgules)</Label>
                                    <Input
                                        id="specialties"
                                        className="rounded-xl h-12"
                                        placeholder="DJ, Son, Lumière..."
                                        value={formData.specialties}
                                        onChange={e => setFormData({ ...formData, specialties: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="daily">Taux Journalier (€ HT)</Label>
                                    <Input
                                        id="daily"
                                        type="number"
                                        className="rounded-xl h-12"
                                        placeholder="400"
                                        value={formData.daily_rate}
                                        onChange={e => setFormData({ ...formData, daily_rate: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="hourly">Taux Horaire (€ HT)</Label>
                                    <Input
                                        id="hourly"
                                        type="number"
                                        className="rounded-xl h-12"
                                        placeholder="50"
                                        value={formData.hourly_rate}
                                        onChange={e => setFormData({ ...formData, hourly_rate: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <Button className="w-full h-12 rounded-xl gradient-primary text-white font-bold text-base shadow-md group" onClick={() => setStep(2)}>
                                Continuer <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {step === 2 && (
                    <Card className="border-border/50 shadow-xl rounded-2xl overflow-hidden">
                        <CardHeader className="bg-muted/30 pb-6">
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-primary" /> Informations Administratives
                            </CardTitle>
                            <CardDescription>Ces informations sont nécessaires pour la facturation et les paiements.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="siret">Numéro SIRET</Label>
                                    <Input id="siret" className="rounded-xl h-12" placeholder="123 456 789 00012" value={formData.siret} onChange={e => setFormData({ ...formData, siret: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="tva">N° TVA (Si applicable)</Label>
                                    <Input id="tva" className="rounded-xl h-12" placeholder="FR 12 123456789" value={formData.tva_number} onChange={e => setFormData({ ...formData, tva_number: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="iban">IBAN</Label>
                                    <Input id="iban" className="rounded-xl h-12 font-mono" placeholder="FR76 ..." value={formData.iban} onChange={e => setFormData({ ...formData, iban: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bic">BIC / SWIFT</Label>
                                    <Input id="bic" className="rounded-xl h-12 font-mono" placeholder="XXXXXX" value={formData.bic} onChange={e => setFormData({ ...formData, bic: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <Button variant="ghost" className="h-12 flex-1 rounded-xl" onClick={() => setStep(1)}>Retour</Button>
                                <Button className="h-12 flex-2 gradient-primary text-white font-bold text-base shadow-md rounded-xl" onClick={handleSubmit} disabled={createProvider.isPending}>
                                    {createProvider.isPending ? "Enregistrement..." : "Terminer mon profil"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {step === 3 && (
                    <Card className="border-border/50 shadow-xl rounded-2xl p-12 text-center space-y-6">
                        <div className="h-20 w-20 bg-success/10 rounded-full flex items-center justify-center mx-auto text-success animate-bounce">
                            <CheckCircle2 className="h-10 w-10" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold">Profil enregistré !</h2>
                            <p className="text-muted-foreground">Votre profil est désormais complet. Redirection vers votre tableau de bord...</p>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
