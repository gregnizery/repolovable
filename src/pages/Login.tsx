import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFailsafeRedirect } from "@/hooks/use-failsafe-redirect";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, user } = useAuth();
  const { toast } = useToast();

  const invitationToken = searchParams.get("token");
  const urlEmail = searchParams.get("email");

  const [email, setEmail] = useState(urlEmail || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { shouldBlock, clearFailsafe } = useFailsafeRedirect();


  useEffect(() => {
    async function checkToken() {
      if (invitationToken) {
        try {
          const { data, error } = await supabase.functions.invoke("view-invitation", {
            body: { token: invitationToken }
          });
          if (!error && data?.success) {
            setEmail(data.email);
          }
        } catch (err) {
          console.error("Error verifying login token:", err);
        }
      }
    }
    checkToken();
  }, [invitationToken]);


  useEffect(() => {
    // Only redirect if a user exists AND there's no error in the URL
    // And if we're not currently blocking via failsafe
    if (user && !searchParams.get("error") && !shouldBlock) {
      if (invitationToken) {
        navigate(`/invitation?token=${invitationToken}`, { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, navigate, invitationToken, searchParams, shouldBlock]);

  if (shouldBlock) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 text-center forced-light">
        <div className="max-w-sm space-y-6">
          <div className="w-16 h-16 bg-warning/10 text-warning rounded-2xl flex items-center justify-center mx-auto animate-bounce">
            <EyeOff className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-display font-bold">Sécurité : Boucle bloquée</h2>
          <p className="text-sm text-muted-foreground">Trop de tentatives de redirection détectées. Vos données locales ont été nettoyées.</p>
          <Button onClick={() => { clearFailsafe(); window.location.href = "/login"; }} className="w-full h-11 rounded-xl">
            Retenter une connexion propre
          </Button>
        </div>
      </div>
    );
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      if (error.message.includes("Email not confirmed")) {
        navigate(`/verify-email?email=${encodeURIComponent(email)}`, { replace: true });
        toast({
          title: "Email non confirmé",
          description: "Veuillez vérifier votre boîte de réception.",
        });
      } else {
        toast({ title: "Erreur de connexion", description: error.message, variant: "destructive" });
      }
    } else {
      // useEffect will handle redirection
    }
  };

  return (
    <div className="min-h-screen flex forced-light bg-background text-foreground">
      <div className="hidden lg:flex lg:w-1/2 gradient-hero items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full bg-white/20" style={{
              width: `${100 + i * 80}px`, height: `${100 + i * 80}px`,
              top: `${10 + i * 12}%`, left: `${-5 + i * 15}%`,
            }} />
          ))}
        </div>
        <div className="relative text-white text-center max-w-md space-y-6">
          <div className="w-24 h-24 rounded-[2rem] bg-white/95 flex items-center justify-center mx-auto shadow-card">
            <span className="text-5xl font-black gradient-primary bg-clip-text text-transparent">P</span>
          </div>
          <h2 className="text-3xl font-display font-bold">Bienvenue sur Planify</h2>
          <p className="text-white/80 text-lg">Pilotez vos prestations, gérez vos équipes et développez votre activité.</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8 animate-slide-up">
          <div className="lg:hidden flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl gradient-primary shadow-glow flex items-center justify-center text-xl font-bold text-white">P</div>
            <span className="font-display font-bold text-2xl">Planify</span>
          </div>

          <div>
            <h1 className="text-2xl font-display font-bold">Connexion</h1>
            <p className="text-muted-foreground text-sm mt-1">Accédez à votre espace de gestion</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@entreprise.fr"
                value={email}
                onChange={e => !invitationToken && setEmail(e.target.value)}
                className={`h-11 ${invitationToken ? "bg-secondary/60 text-muted-foreground cursor-not-allowed border-border/60" : ""}`}
                required
                disabled={!!invitationToken}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
              </div>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="h-11 pr-10" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 gradient-primary text-white font-semibold rounded-xl hover:opacity-90 transition-opacity">
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link to={`/register${invitationToken ? `?token=${invitationToken}` : ""}`} className="text-primary font-medium hover:underline">Créer un compte</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
