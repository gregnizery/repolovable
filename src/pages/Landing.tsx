import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Zap, Shield, BarChart3, Calendar, FileText, Package } from "lucide-react";

const features = [
  { icon: Calendar, title: "Planning intelligent", desc: "Planifiez vos missions, évitez les conflits et optimisez vos équipes." },
  { icon: FileText, title: "Devis & Factures", desc: "Créez des documents professionnels en quelques clics, signez en ligne." },
  { icon: BarChart3, title: "Suivi financier", desc: "Tableau de bord temps réel de votre CA, paiements et relances." },
  { icon: Package, title: "Gestion matériel", desc: "Inventaire, disponibilités, scan QR et suivi de chaque équipement." },
  { icon: Shield, title: "Sécurité & rôles", desc: "Permissions granulaires par rôle, données chiffrées, audit trail." },
  { icon: Zap, title: "Automatisations", desc: "Relances automatiques, notifications, intégration Stripe et Google." },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-lg font-bold text-white">P</div>
            <span className="font-display font-bold text-xl">Planify</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/login")}>Connexion</Button>
            <Button className="gradient-primary text-white rounded-xl hover:opacity-90" onClick={() => navigate("/register")}>Commencer</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-5" />
        <div className="container mx-auto px-6 py-24 md:py-32 text-center relative">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-primary bg-primary/10 rounded-full px-4 py-1.5 mb-6">
            <Zap className="h-3.5 w-3.5" /> Nouveau : Signature électronique intégrée
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold max-w-3xl mx-auto leading-tight">
            Pilotez vos prestations avec{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent-foreground">élégance</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mt-6">
            De la prospection au paiement, Planify centralise tout votre cycle métier en une interface intuitive et puissante.
          </p>
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button size="lg" className="gradient-primary text-white rounded-xl gap-2 text-base hover:opacity-90" onClick={() => navigate("/register")}>
              Démarrer gratuitement <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="rounded-xl text-base" onClick={() => navigate("/login")}>
              Voir la démo
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-display font-bold">Tout ce dont vous avez besoin</h2>
          <p className="text-muted-foreground mt-2">Une suite complète pour gérer votre activité événementielle.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="p-6 rounded-2xl border border-border/50 bg-card shadow-card hover:shadow-lg transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reform 2026 Banner */}
      <section className="bg-primary/5 border-y border-primary/10 py-16">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest mb-4">
              <Shield className="h-4 w-4" /> Conformité Légale
            </div>
            <h2 className="text-3xl font-display font-bold mb-4">Prêt pour la réforme de la facturation 2026 ?</h2>
            <p className="text-muted-foreground text-lg mb-6">
              Planify est déjà aux normes pour l'e-invoicing et le e-reporting. Ne laissez pas la complexité administrative freiner votre croissance.
            </p>
            <Button className="gradient-primary text-white rounded-xl gap-2 hover:opacity-90" onClick={() => navigate("/reforme-2026")}>
              Découvrir notre dossier spécial 2026 <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="w-full md:w-80 aspect-square rounded-3xl overflow-hidden shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
            <img
              src="/reforme_2026_illustration_1772299366201.png"
              alt="Compliance 2026"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-20">
        <div className="rounded-3xl gradient-hero p-12 md:p-16 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="absolute rounded-full bg-white/20" style={{ width: `${200 + i * 100}px`, height: `${200 + i * 100}px`, top: `${-20 + i * 20}%`, right: `${-10 + i * 15}%` }} />
            ))}
          </div>
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Prêt à transformer votre gestion ?</h2>
            <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">Rejoignez les professionnels qui font confiance à Planify pour piloter leurs prestations.</p>
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 rounded-xl text-base font-semibold" onClick={() => navigate("/register")}>
              Commencer maintenant
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md gradient-primary flex items-center justify-center text-[10px] font-bold text-white opacity-70">P</div>
            <span>© 2026 Planify. Tous droits réservés.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
