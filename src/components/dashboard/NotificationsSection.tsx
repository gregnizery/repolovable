/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, FileText, Banknote, CheckCircle2 } from "lucide-react";

interface NotificationsSectionProps {
     
    pendingProofs: any[];
     
    pendingCash: any[];
     
    recentSignedDevis: any[];
}

export function NotificationsSection({ pendingProofs, pendingCash, recentSignedDevis }: NotificationsSectionProps) {
    const hasNotifications = pendingProofs.length > 0 || pendingCash.length > 0 || recentSignedDevis.length > 0;

    if (!hasNotifications) return null;

    return (
        <Card className="shadow-card border-border/50 border-primary/20 bg-primary/5">
            <CardContent className="p-6">
                <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary animate-pulse" /> Notifications & Actions requises
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingProofs.map((proof: any) => (
                        <Link key={`proof-${proof.id}`} to={`/finance/factures/${proof.facture_id}`} className="block">
                            <div className="flex gap-3 p-3 rounded-2xl bg-card border border-border/60 hover:border-info/50 transition-colors shadow-card">
                                <div className="p-2 bg-info/10 text-info rounded-xl h-fit"><FileText className="w-4 h-4" /></div>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Justificatif importé</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">La facture {proof.factures?.number} ({proof.factures?.clients?.name}) a reçu un justificatif de {proof.amount_declared}€.</p>
                                </div>
                            </div>
                        </Link>
                    ))}

                    {pendingCash.map((cash: any) => (
                        <Link key={`cash-${cash.id}`} to={`/finance/factures/${cash.facture_id}`} className="block">
                            <div className="flex gap-3 p-3 rounded-2xl bg-card border border-border/60 hover:border-warning/50 transition-colors shadow-card">
                                <div className="p-2 bg-warning/10 text-warning rounded-xl h-fit"><Banknote className="w-4 h-4" /></div>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Espèces à valider</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Un paiement de {cash.amount}€ attend votre validation pour la facture {cash.factures?.number}.</p>
                                </div>
                            </div>
                        </Link>
                    ))}

                    {recentSignedDevis.map((devis: any) => (
                        <Link key={`devis-${devis.id}`} to={`/finance/devis/${devis.id}`} className="block">
                            <div className="flex gap-3 p-3 rounded-2xl bg-card border border-border/60 hover:border-success/50 transition-colors shadow-card">
                                <div className="p-2 bg-success/10 text-success rounded-xl h-fit"><CheckCircle2 className="w-4 h-4" /></div>
                                <div>
                                    <p className="text-sm font-semibold text-success">Devis signé !</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Le devis {devis.number} de {devis.clients?.name} ({devis.total_ttc}€) a été accepté.</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
