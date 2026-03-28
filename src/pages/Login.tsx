import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, KeyRound, ShieldCheck, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFailsafeRedirect } from "@/hooks/use-failsafe-redirect";
import { buildRelativeAppPath } from "@/lib/public-app-url";

const trustSignals = [
  {
    icon: Workflow,
    title: "Flux unifiés",
    text: "Clients, missions, parc et finance restent alignés sans changement de contexte.",
  },
  {
    icon: ShieldCheck,
    title: "Contrôle d’accès",
    text: "Rôles, validations et historique sont intégrés au poste de travail.",
  },
];

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, user } = useAuth();
  const { toast } = useToast();
  const { shouldBlock, clearFailsafe } = useFailsafeRedirect();

  const invitationToken = searchParams.get("token");
  const urlEmail = searchParams.get("email");

  const [email, setEmail] = useState(urlEmail || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    async function checkToken() {
      if (!invitationToken) return;
      try {
        const { data, error } = await supabase.functions.invoke("view-invitation", {
          body: { token: invitationToken },
        });

        if (!error && data?.success) {
          setEmail(data.email);
        }
      } catch (error) {
        console.error("Error verifying login token:", error);
      }
    }

    void checkToken();
  }, [invitationToken]);

  useEffect(() => {
    if (!user || searchParams.get("error") || shouldBlock) return;

    if (invitationToken) {
      navigate(buildRelativeAppPath("/invitation", { searchParams: { token: invitationToken } }), { replace: true });
      return;
    }

    navigate(buildRelativeAppPath("/dashboard"), { replace: true });
  }, [user, navigate, invitationToken, searchParams, shouldBlock]);

  if (shouldBlock) {
    return (
      <div className="auth-shell flex min-h-screen items-center justify-center px-6">
        <div className="auth-panel w-full max-w-md rounded-[2rem] p-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-warning/30 bg-warning/20 text-warning-foreground">
            <EyeOff className="h-5 w-5" />
          </div>
          <p className="auth-kicker">Sécurité</p>
          <h1 className="auth-heading mt-2 text-3xl font-semibold">Boucle de sécurité bloquée</h1>
          <p className="auth-copy mt-3 text-sm leading-7">
            Trop de redirections ont été détectées. Les données locales ont été purgées pour repartir sur une session propre.
          </p>
          <Button
            onClick={() => {
              clearFailsafe();
              window.location.href = buildRelativeAppPath("/login");
            }}
            className="mt-7 w-full gradient-primary text-white"
          >
            Relancer la connexion
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setFormError(null);

    const { error } = await signIn(email, password);

    setLoading(false);

    if (!error) return;

    if (error.message.includes("Email not confirmed")) {
      navigate(buildRelativeAppPath("/verify-email", { searchParams: { email } }), { replace: true });
      toast({
        title: "Email non confirmé",
        description: "Veuillez vérifier votre boîte de réception.",
      });
      return;
    }

    setFormError(error.message);
    toast({
      title: "Connexion refusée",
      description: error.message,
      variant: "destructive",
    });
  };

  return (
    <div className="auth-shell min-h-screen text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-10 px-6 py-10 lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-16">
        <section className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-lg font-semibold text-white shadow-[0_14px_34px_rgba(0,0,0,0.18)]">
                P
              </div>
              <div>
                <p className="auth-kicker">Atelier opératoire</p>
                <p className="auth-heading text-2xl font-semibold">Planify</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="auth-kicker">Connexion</p>
              <h1 className="auth-heading max-w-xl text-4xl font-semibold md:text-6xl">
                Connectez-vous à votre espace d’exploitation.
              </h1>
              <p className="auth-copy max-w-2xl text-lg leading-8">
                Une entrée directe vers les priorités du jour, les validations en attente et les flux opérationnels.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {trustSignals.map((signal) => (
              <div key={signal.title} className="auth-card rounded-[2rem] p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-black text-white">
                    <signal.icon className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{signal.title}</p>
                    <p className="auth-copy text-sm leading-6">{signal.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="auth-panel rounded-[2rem] p-8">
          <div className="mb-8 space-y-2">
            <p className="auth-kicker">Accéder au poste</p>
            <h2 className="auth-heading text-3xl font-semibold">Accéder au poste</h2>
            <p className="auth-copy text-sm leading-7">
              Saisissez vos identifiants pour reprendre votre session de travail.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email" className="auth-label">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="vous@entreprise.fr"
                value={email}
                onChange={(event) => {
                  if (!invitationToken) setEmail(event.target.value);
                  if (formError) setFormError(null);
                }}
                className={`auth-input h-12 rounded-xl ${invitationToken ? "cursor-not-allowed bg-muted text-muted-foreground" : ""}`}
                disabled={!!invitationToken}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="auth-label">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (formError) setFormError(null);
                  }}
                  className="auth-input h-12 rounded-xl pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {formError ? (
              <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-3 text-sm text-destructive">
                {formError}
              </div>
            ) : null}

            <Button type="submit" className="w-full gap-2 gradient-primary text-white" disabled={loading}>
              <KeyRound className="h-4 w-4" />
              {loading ? "Connexion en cours..." : "Se connecter"}
            </Button>
          </form>

          <p className="auth-copy mt-6 text-center text-sm">
            Pas encore de compte ?{" "}
            <Link
              to={buildRelativeAppPath("/register", {
                searchParams: invitationToken ? { token: invitationToken } : undefined,
              })}
              className="font-medium text-primary hover:underline"
            >
              Créer un compte
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
