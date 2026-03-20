import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Lock,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Rocket,
  Mail,
  Building2,
  Loader2,
  UserCheck,
  ArrowRight,
  AlertTriangle,
  Copy,
  RotateCcw
} from "lucide-react";

// Error codes for debugging registration issues
function getRegistrationErrorCode(message: string): { code: string; label: string } {
  const msg = message.toLowerCase();
  if (msg.includes("already registered") || msg.includes("already been registered") || msg.includes("user already exists") || msg.includes("already exists"))
    return { code: "REG-001", label: "Email déjà utilisé" };
  if (msg.includes("database error finding user") || msg.includes("database error"))
    return { code: "REG-002", label: "Erreur base de données (trigger)" };
  if (msg.includes("invalid email") || msg.includes("invalid_email"))
    return { code: "REG-003", label: "Email invalide" };
  if (msg.includes("weak password") || msg.includes("password"))
    return { code: "REG-004", label: "Mot de passe trop faible" };
  if (msg.includes("rate limit") || msg.includes("too many requests") || msg.includes("email rate limit"))
    return { code: "REG-005", label: "Trop de tentatives" };
  if (msg.includes("signup disabled") || msg.includes("signups not allowed"))
    return { code: "REG-006", label: "Inscriptions désactivées" };
  if (msg.includes("network") || msg.includes("fetch"))
    return { code: "REG-007", label: "Erreur réseau" };
  if (msg.includes("timeout"))
    return { code: "REG-008", label: "Timeout serveur" };
  return { code: "REG-999", label: "Erreur inconnue" };
}
import { motion, AnimatePresence } from "framer-motion";
import { CompanyAutocomplete } from "@/components/CompanyAutocomplete";
import { supabase } from "@/integrations/supabase/client";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp, user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const invitationToken = searchParams.get("token");
  const invitedEmail = searchParams.get("email");
  const redirectParam = searchParams.get("redirect");
  const isInvitation = !!invitationToken || redirectParam?.includes("invitation");

  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState(invitedEmail || "");
  const [password, setPassword] = useState("");
  const [invitationRole, setInvitationRole] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [loading, setLoading] = useState(false);
  const [userExists, setUserExists] = useState(false);
  const [registrationError, setRegistrationError] = useState<{ code: string; label: string; raw: string } | null>(null);

  useEffect(() => {
    async function checkToken() {
      if (invitationToken) {
        try {
          const { data, error } = await supabase.functions.invoke("view-invitation", {
            body: { token: invitationToken }
          });
          if (!error && data?.success) {
            setEmail(data.email);
            setInvitationRole(data.role);
          }
        } catch (err) {
          console.error("Error verifying registration token:", err);
        }
      }
    }
    checkToken();
  }, [invitationToken]);

  useEffect(() => {
    // Only redirect if a user exists AND their email is confirmed OR they have an invitation
    // This prevents the "flash" that hides the VerifyEmail screen after signup
    if (user && !authLoading) {
      if (invitationToken) {
        navigate(`/invitation?token=${invitationToken}`, { replace: true });
      } else if (redirectParam) {
        navigate(redirectParam, { replace: true });
      } else if (user.email_confirmed_at) {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, authLoading, navigate, invitationToken, redirectParam]);

  const validateStep = () => {
    if (step === 1) return firstName.trim() !== "" && lastName.trim() !== "";
    if (step === 2 && !isInvitation) return company.trim() !== "";
    if (step === 3 && !isInvitation) return !!selectedPlan;
    if (step === 4 || (step === 3 && isInvitation)) return email.includes("@") && password.length >= 8;
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (step === 1 && isInvitation) {
        setStep(4); // Skip Company (2) and Plan (3) for invitations
      } else if (step === 2 && isInvitation) {
        setStep(4); // Fallback
      } else {
        setStep(step + 1);
      }
    } else {
      toast({
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs obligatoires correctement.",
        variant: "destructive"
      });
    }
  };

  const handleBack = () => {
    if (step === 4 && isInvitation) {
      setStep(1);
    } else {
      setStep(step - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Determine the role that will be sent to Supabase
    const computedRole = invitationRole ?? (isInvitation ? "prestataire" : "admin");

    // Validation for admin registrations: require a company name
    if (computedRole === "admin" && !company.trim()) {
      toast({
        title: "Champ manquant",
        description: "Un administrateur doit renseigner le nom de son entreprise.",
        variant: "destructive",
      });
      return;
    }

    if (step < 3) {
      handleNext();
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, {
      first_name: firstName,
      last_name: lastName,
      role: computedRole,
      ...(company ? { company_name: company } : {}),
      ...(!isInvitation ? { plan: selectedPlan } : {}),
      ...(invitationToken ? { invitation_token: invitationToken } : {}),
    });
    setLoading(false);

    if (error) {
      const errInfo = getRegistrationErrorCode(error.message || "");
      if (errInfo.code === "REG-001") {
        // Only show "On se connaît" for confirmed duplicate emails
        setUserExists(true);
      } else {
        // Show error screen with diagnostic code
        setRegistrationError({ ...errInfo, raw: error.message || "Unknown error" });
      }
    } else {
      navigate(`/verify-email?email=${encodeURIComponent(email)}`, { replace: true });
    }
  };

  const totalSteps = isInvitation ? 3 : 4;
  const currentDisplayStep = isInvitation && step === 4 ? 3 : step;
  const progress = (currentDisplayStep / totalSteps) * 100;

  const PLANS = [
    { id: "free", name: "Free", description: "Pour débuter", price: "0€", icon: Rocket },
    { id: "pro", name: "Pro", description: "Le standard", price: "0€", icon: CheckCircle2, popular: true },
    { id: "suite", name: "Suite", description: "L'excellence", price: "0€", icon: Rocket }
  ];

  const planStyles = {
    free: {
      surface: "border-success/25 bg-success/5 shadow-card",
      icon: "bg-success/15 text-success",
    },
    pro: {
      surface: "border-primary/25 bg-primary/5 shadow-card",
      icon: "bg-primary text-primary-foreground",
    },
    suite: {
      surface: "border-accent/25 bg-accent/5 shadow-card",
      icon: "bg-accent text-accent-foreground",
    },
  } as const;

  if (registrationError) {
    const handleCopyError = () => {
      navigator.clipboard.writeText(`${registrationError.code} | ${registrationError.raw}`);
      toast({ title: "Copié !", description: "Code d'erreur copié dans le presse-papier." });
    };

    return (
      <div className="min-h-screen flex bg-background forced-light text-foreground">
        <div className="hidden lg:flex lg:w-1/2 gradient-hero items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="absolute rounded-full bg-white/20" style={{
                width: `${120 + i * 60}px`, height: `${120 + i * 60}px`,
                top: `${15 + i * 10}%`, right: `${-5 + i * 12}%`,
              }} />
            ))}
          </div>
          <div className="relative text-white text-center max-w-md space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mx-auto p-3">
              <img src="/assets/logo.png" alt="Planify" className="w-full h-full object-contain brightness-0 invert" />
            </div>
            <h2 className="text-3xl font-display font-bold">Oups, un souci technique</h2>
            <p className="text-white/80 text-lg">Pas de panique, ça arrive. On va régler ça ensemble.</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-sm text-center space-y-6"
          >
            <div className="lg:hidden flex items-center justify-center gap-3 mb-4">
              <img src="/assets/logo.png" alt="Planify" className="w-10 h-10 object-contain" />
              <span className="font-display font-bold text-2xl tracking-tight text-foreground">Planify</span>
            </div>

            <div className="relative mx-auto w-24 h-24">
              <div className="w-full h-full bg-accent/10 rounded-full border-4 border-accent/20 flex items-center justify-center shadow-card">
                <AlertTriangle className="h-10 w-10 text-accent" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">
                L'inscription a échoué
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {registrationError.label}
              </p>
            </div>

            <div
              onClick={handleCopyError}
              className="bg-sidebar text-sidebar-foreground p-4 rounded-2xl cursor-pointer hover:bg-sidebar/95 transition-colors group border border-sidebar-border"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-widest text-sidebar-foreground/60">Code d'erreur</span>
                <Copy className="h-3.5 w-3.5 text-sidebar-foreground/60 group-hover:text-sidebar-foreground transition-colors" />
              </div>
              <p className="font-mono text-lg font-bold text-accent">{registrationError.code}</p>
              <p className="font-mono text-[11px] text-sidebar-foreground/65 mt-1 truncate">{registrationError.raw}</p>
            </div>

            <p className="text-xs text-muted-foreground">
              Communique ce code au support pour un diagnostic rapide.
            </p>

            <div className="space-y-3 pt-2">
              <Button
                onClick={() => { setRegistrationError(null); }}
                className="w-full h-12 gradient-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl transition-all group"
              >
                <span className="flex items-center justify-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Réessayer l'inscription
                </span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/login')}
                className="w-full h-10 text-sm text-muted-foreground hover:text-foreground rounded-xl"
              >
                J'ai déjà un compte → Se connecter
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (userExists) {
    return (
      <div className="min-h-screen flex bg-background forced-light text-foreground">
        <div className="hidden lg:flex lg:w-1/2 gradient-hero items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="absolute rounded-full bg-white/20" style={{
                width: `${120 + i * 60}px`, height: `${120 + i * 60}px`,
                top: `${15 + i * 10}%`, right: `${-5 + i * 12}%`,
              }} />
            ))}
          </div>
          <div className="relative text-white text-center max-w-md space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mx-auto p-3">
              <img src="/assets/logo.png" alt="Planify" className="w-full h-full object-contain brightness-0 invert" />
            </div>
            <h2 className="text-3xl font-display font-bold">Content de vous revoir !</h2>
            <p className="text-white/80 text-lg">Votre compte existe déjà, connectez-vous pour continuer.</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-sm text-center space-y-8"
          >
            <div className="lg:hidden flex items-center justify-center gap-3 mb-4">
              <img src="/assets/logo.png" alt="Planify" className="w-10 h-10 object-contain" />
              <span className="font-display font-bold text-2xl tracking-tight text-foreground">Planify</span>
            </div>

            <div className="relative mx-auto w-28 h-28">
              <motion.div
                className="absolute inset-0 bg-primary/10 rounded-full"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="relative w-full h-full bg-white rounded-full border-4 border-primary/20 flex items-center justify-center shadow-xl">
                <UserCheck className="h-11 w-11 text-primary" />
              </div>
              <motion.div
                className="absolute -bottom-1.5 -right-1.5 bg-card rounded-full p-1.5 shadow-card border border-border/60"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
              >
                <span className="text-lg">👋</span>
              </motion.div>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">
                On se connaît, non ?
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                L'adresse <span className="font-semibold text-foreground">{email}</span> est déjà associée à un compte Planify.
              </p>
            </div>

            <div className="bg-card p-5 rounded-2xl border border-border/60 space-y-1 shadow-card">
              <p className="text-sm text-foreground font-medium">Connectez-vous pour retrouver votre espace</p>
              <p className="text-xs text-muted-foreground">Vos données vous attendent ✨</p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => navigate(`/login${invitationToken ? `?token=${invitationToken}` : ""}`)}
                className="w-full h-12 gradient-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all group"
              >
                <span className="flex items-center justify-center gap-2">
                  Se connecter
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setUserExists(false); setEmail(""); setPassword(""); }}
                className="w-full h-10 text-sm text-muted-foreground hover:text-foreground rounded-xl"
              >
                Utiliser une autre adresse email
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background forced-light text-foreground">
      <div className="hidden lg:flex lg:w-1/2 gradient-hero items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full bg-white/20" style={{
              width: `${120 + i * 60}px`, height: `${120 + i * 60}px`,
              top: `${15 + i * 10}%`, right: `${-5 + i * 12}%`,
            }} />
          ))}
        </div>
        <div className="relative text-white text-center max-w-md space-y-6">
          <div className="w-24 h-24 rounded-3xl bg-white flex items-center justify-center mx-auto shadow-2xl">
            <span className="text-5xl font-black gradient-primary bg-clip-text text-transparent">P</span>
          </div>
          <h2 className="text-3xl font-display font-bold">
            {isInvitation ? "Vous êtes invité(e) !" : "La gestion simplifiée commence ici"}
          </h2>
          <p className="text-white/80 text-lg">
            {isInvitation
              ? "Rejoignez votre équipe et collaborez sur vos projets en temps réel."
              : "Rejoignez des milliers de professionnels qui automatisent leur facturation avec Planify."}
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-xl font-bold text-white">P</div>
            <span className="font-display font-bold text-3xl tracking-tight text-foreground">Planify</span>
          </div>

          {step < 5 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2 text-center lg:text-left transition-all duration-500">
                <h1 className="text-3xl font-display font-bold tracking-tight text-foreground transition-all">
                  {step === 1 && "Commençons par faire connaissance"}
                  {step === 2 && "Parlez-nous de votre entreprise"}
                  {step === 3 && "Choisissez votre plan"}
                  {step === 4 && "Sécurisez votre compte"}
                </h1>
                <p className="text-muted-foreground">
                  Étape {currentDisplayStep} sur {totalSteps}
                </p>
              </div>

              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full gradient-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                />
              </div>

              <AnimatePresence mode="wait">
                <motion.form
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                  onSubmit={handleSubmit}
                >
                  {step === 1 && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-foreground/85 font-medium ml-1">Votre prénom</Label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Jean" value={firstName} onChange={e => setFirstName(e.target.value)} className="h-12 pl-12 rounded-xl transition-all font-medium" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground/85 font-medium ml-1">Votre nom</Label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Dupont" value={lastName} onChange={e => setLastName(e.target.value)} className="h-12 pl-12 rounded-xl transition-all font-medium" required />
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 2 && !isInvitation && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-foreground/85 font-medium ml-1">Raison sociale</Label>
                        <div className="relative">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                          <CompanyAutocomplete
                            value={company}
                            onChange={setCompany}
                            className="pl-12 h-12 rounded-xl transition-all font-medium"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground italic leading-relaxed">
                        L'autocomplétion récupère les données officielles de l'État. Vous pourrez affiner vos réglages plus tard.
                      </p>
                    </div>
                  )}

                  {step === 3 && !isInvitation && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-3">
                        {PLANS.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => setSelectedPlan(p.id)}
                            aria-pressed={selectedPlan === p.id}
                            className={cn(
                              "relative p-4 rounded-2xl border-2 transition-all cursor-pointer group hover:shadow-card",
                              selectedPlan === p.id
                                ? planStyles[p.id as keyof typeof planStyles].surface
                                : "border-border/60 bg-card hover:border-primary/20"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                selectedPlan === p.id ? planStyles[p.id as keyof typeof planStyles].icon : "bg-secondary text-muted-foreground group-hover:bg-secondary/80"
                              )}>
                                <p.icon className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-bold text-foreground">{p.name}</h3>
                                  <span className="text-sm font-bold text-primary">{p.price}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{p.description}</p>
                              </div>
                            </div>
                            {p.popular && (
                              <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 bg-accent text-accent-foreground text-[10px] font-bold rounded-full uppercase tracking-wider shadow-sm">
                                Populaire
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-[11px] text-muted-foreground text-center italic">
                        Les plans sont gratuits pendant la phase de test.
                      </p>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-foreground/85 font-medium ml-1">Email professionnel</Label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="jean.dupont@entreprise.fr"
                            value={email}
                            onChange={e => !invitationToken && setEmail(e.target.value)}
                            className={cn("h-12 pl-12 rounded-xl transition-all font-medium", invitationToken && "bg-secondary/80 text-muted-foreground cursor-not-allowed border-border/60")}
                            required
                            disabled={!!invitationToken}
                          />
                        </div>
                        {invitationToken && (
                          <p className="text-[11px] text-warning font-medium flex items-center gap-1.5 ml-1 mt-1">
                            <Mail className="w-3 h-3" />
                            Email réservé pour l'invitation
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground/85 font-medium ml-1">Mot de passe</Label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="password" placeholder="Min. 8 caractères" value={password} onChange={e => setPassword(e.target.value)} className="h-12 pl-12 rounded-xl transition-all font-medium" required minLength={8} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    {step > 1 && (
                      <Button type="button" variant="outline" onClick={handleBack} className="h-12 w-14 rounded-xl text-muted-foreground hover:text-foreground transition-all">
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                    )}
                    <Button
                      type={step === 4 ? "submit" : "button"}
                      onClick={step < 4 ? handleNext : undefined}
                      disabled={loading}
                      className="flex-1 h-12 gradient-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all group"
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : (
                        <span className="flex items-center justify-center gap-2">
                          {step === 4 ? "Terminer l'inscription" : "Continuer"}
                          <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                      )}
                    </Button>
                  </div>
                </motion.form>
              </AnimatePresence>

              <p className="text-center text-sm text-muted-foreground pt-4">
                Déjà un compte ?{" "}
                <Link to={`/login${invitationToken ? `?token=${invitationToken}` : ""}`} className="text-primary font-bold hover:underline">Se connecter</Link>
              </p>
            </div>
          )}

          {step === 5 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8 py-4"
            >
              <div className="relative mx-auto w-32 h-32">
                <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping" />
                <div className="relative w-full h-full bg-card rounded-full border-4 border-primary/20 flex items-center justify-center shadow-card">
                  <Mail className="h-12 w-12 text-primary" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-card rounded-full p-2 shadow-card border border-border/60">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-3xl font-display font-bold text-foreground tracking-tight">Vérifiez vos e-mails</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Un lien de confirmation a été envoyé à :<br />
                  <span className="font-bold text-foreground">{email}</span>
                </p>
                <p className="text-sm text-muted-foreground bg-card p-4 rounded-2xl border border-border/60 shadow-card">
                  Cliquez sur le lien dans l'e-mail pour activer votre compte et commencer à utiliser Planify.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Button
                  asChild
                  className="h-12 gradient-primary text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                    Ouvrir Gmail
                    <Rocket className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/login")}
                  className="h-12 rounded-xl text-muted-foreground hover:bg-secondary transition-all"
                >
                  Se connecter
                </Button>
              </div>

              <div className="pt-4 border-t border-border/60 italic">
                <p className="text-xs text-muted-foreground">
                  Vous ne trouvez pas l'e-mail ? Pensez à vérifier vos spams ou réessayez l'inscription dans quelques minutes.
                </p>
              </div>
            </motion.div>
          )}
        </div>

        <div className="absolute bottom-8 right-8 hidden md:block">
          <div className="flex items-center gap-3 bg-card p-4 rounded-2xl border border-border/60 shadow-card cursor-pointer hover:bg-secondary/60 transition-all translate-y-0 hover:-translate-y-1">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Rocket className="h-5 w-5" />
            </div>
            <div className="text-xs leading-tight pr-2">
              <p className="font-bold text-foreground">Besoin d'aide ?</p>
              <p className="text-muted-foreground">Contactez notre support</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
