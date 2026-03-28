import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Calendar,
    ShieldCheck,
    FileCheck,
    Info,
    ArrowRight,
    ChevronRight,
    Zap,
    Globe,
    Database
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { buildRelativeAppPath } from "@/lib/public-app-url";

export default function Reforme2026() {
    const navigate = useNavigate();

    const timeline = [
        {
            date: "Février 2026",
            title: "Phase Pilote",
            desc: "Lancement de la phase pilote pour tester les échanges avec le Portail Public de Facturation (PPF).",
            status: "upcoming"
        },
        {
            date: "1er Septembre 2026",
            title: "Réception Obligatoire",
            desc: "Toutes les entreprises assujetties à la TVA doivent être en mesure de recevoir des factures électroniques.",
            status: "critical"
        },
        {
            date: "1er Septembre 2026",
            title: "Émission E-Invoicing (Grandes Entreprises/ETI)",
            desc: "Obligation d'émission pour les grandes entreprises et les entreprises de taille intermédiaire (ETI).",
            status: "critical"
        },
        {
            date: "1er Septembre 2027",
            title: "Émission E-Invoicing (PME/TPE)",
            desc: "Généralisation de l'obligation d'émission à toutes les PME et micro-entreprises.",
            status: "later"
        }
    ];

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto flex items-center justify-between h-16 px-6">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
                        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-sm font-bold text-white">P</div>
                        <span className="font-display font-bold text-lg">Planify</span>
                    </div>
                    <Button variant="outline" className="rounded-xl" onClick={() => navigate(buildRelativeAppPath("/login"))}>Accéder à mon espace</Button>
                </div>
            </header>

            <div className="container mx-auto px-6 py-12 max-w-5xl">
                {/* Hero Section */}
                <section className="mb-20 text-center">
                    <div className="inline-flex items-center gap-2 text-sm font-medium text-primary bg-primary/10 rounded-full px-4 py-1.5 mb-6">
                        <ShieldCheck className="h-3.5 w-3.5" /> Planify est prêt pour 2026
                    </div>
                    <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">
                        Réforme de la facturation électronique 2026
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                        Comprendre les enjeux, le calendrier et comment Planify vous accompagne dans cette transition majeure de la gestion d'entreprise en France.
                    </p>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
                    <Card className="border-none shadow-card bg-card/50 backdrop-blur-sm group hover:shadow-lg transition-all duration-300">
                        <CardContent className="p-8">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <FileCheck className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-display font-bold mb-3">Conformité Totale</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Mise à jour automatique de vos documents avec toutes les mentions légales obligatoires (TVA Intra, RCS, Capital Social).
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-card bg-card/50 backdrop-blur-sm group hover:shadow-lg transition-all duration-300">
                        <CardContent className="p-8">
                            <div className="w-12 h-12 rounded-xl bg-accent-foreground/10 text-accent-foreground flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Globe className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-display font-bold mb-3">Format Factur-X</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Planify intègre le format hybride Factur-X combinant un PDF lisible et un fichier XML structuré pour l'automatisation.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-card bg-card/50 backdrop-blur-sm group hover:shadow-lg transition-all duration-300">
                        <CardContent className="p-8">
                            <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Database className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-display font-bold mb-3">E-Reporting</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Transmission simplifiée de vos données de transaction à l'administration via le Portail Public de Facturation (PPF).
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Timeline */}
                <section className="mb-20">
                    <div className="flex items-center gap-3 mb-10">
                        <Calendar className="h-6 w-6 text-primary" />
                        <h2 className="text-3xl font-display font-bold">Calendrier de déploiement</h2>
                    </div>

                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/50 before:to-transparent">
                        {timeline.map((item, index) => (
                            <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                {/* Icon */}
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full border border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${item.status === 'critical' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                                    }`}>
                                    {item.status === 'critical' ? <Zap className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </div>
                                {/* Content */}
                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm group-hover:border-primary/50 transition-colors">
                                    <div className="flex items-center justify-between space-x-2 mb-1">
                                        <div className="font-bold text-primary">{item.date}</div>
                                    </div>
                                    <div className="font-display font-bold text-lg mb-2">{item.title}</div>
                                    <div className="text-muted-foreground text-sm">{item.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Technical Details */}
                <section className="bg-card/50 backdrop-blur-sm rounded-3xl p-8 md:p-12 border border-border/50 mb-20">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl font-display font-bold mb-6">Prêt pour l'interopérabilité</h2>
                            <p className="text-muted-foreground mb-6">
                                Dès Septembre 2026, toutes les entreprises françaises auront l'obligation de recevoir leurs factures au format électronique. Planify se connecte nativement aux plateformes certifiées (PDP) et au Portail Public de Facturation (PPF).
                            </p>
                            <ul className="space-y-4">
                                {[
                                    "Archivage légal sécurisé pendant 10 ans",
                                    "Validation de la conformité des mentions obligatoires",
                                    "Signature électronique intégrée aux documents",
                                    "Connecteurs API pour l'export automatisé"
                                ].map((text, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm font-medium">
                                        <div className="w-5 h-5 rounded-full bg-success/10 text-success flex items-center justify-center">
                                            <ChevronRight className="h-3 w-3" />
                                        </div>
                                        {text}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="relative">
                            <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl">
                                <img
                                    src="/reforme_2026_illustration_1772299366201.png"
                                    alt="Illustration Réforme 2026"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="absolute -bottom-6 -right-6 bg-background p-6 rounded-2xl border border-border/50 shadow-xl max-w-[200px]">
                                <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">VOTRE PARTENAIRE</p>
                                <p className="text-sm font-medium">Accompagnement personnalisé vers la dématérialisation.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQ mini */}
                <section className="max-w-3xl mx-auto mb-20">
                    <h2 className="text-3xl font-display font-bold mb-8 text-center">Foire aux questions</h2>
                    <div className="space-y-6">
                        <div className="p-6 rounded-2xl bg-card/30 border border-border/30">
                            <h4 className="font-bold mb-2">Qu'est-ce qu'une facture conforme en 2026 ?</h4>
                            <p className="text-sm text-muted-foreground">Une facture conforme n'est plus un simple PDF. C'est un document au format Factur-X, UBL ou CII qui contient des données structurées exploitables automatiquement par les systèmes d'information.</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-card/30 border border-border/30">
                            <h4 className="font-bold mb-2">Dois-je payer plus pour cette conformité ?</h4>
                            <p className="text-sm text-muted-foreground">Non, chez Planify, la conformité légale fait partie intégrante de notre service. Toutes les mises à jour liées à la réforme 2026 sont incluses dans votre abonnement actuel.</p>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="text-center">
                    <h2 className="text-3xl font-display font-bold mb-6">Préparez demain, dès aujourd'hui</h2>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button size="lg" className="gradient-primary text-white rounded-xl px-8" onClick={() => navigate(buildRelativeAppPath("/register"))}>
                            Créer mon compte Planify
                        </Button>
                        <Button size="lg" variant="outline" className="rounded-xl px-8 group" onClick={() => navigate("/")}>
                            Retour à l'accueil <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </div>
                </section>
            </div>

            <footer className="border-t border-border mt-20 py-12">
                <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md gradient-primary flex items-center justify-center text-[10px] font-bold text-white">P</div>
                        <span>© 2026 Planify. Tous droits réservés.</span>
                    </div>
                    <div className="flex items-center gap-8">
                        <a href="#" className="hover:text-primary transition-colors">Mentions légales</a>
                        <a href="#" className="hover:text-primary transition-colors">Confidentialité</a>
                        <a href="#" className="hover:text-primary transition-colors">Assistance</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
