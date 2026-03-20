import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useAcceptInvitation } from "@/hooks/use-team";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Users, Shield, ArrowRight, LogOut, Mail, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InvitationData {
  email: string;
  team_name: string;
  inviter_name: string;
  role: string;
}

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const acceptMutation = useAcceptInvitation();
  const token = searchParams.get("token");

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [fetchingInv, setFetchingInv] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    async function fetchInvitation() {
      if (!token) {
        console.error("Missing token in URL");
        setFetchingInv(false);
        return;
      }

      console.log("Fetching invitation for token:", token);

      try {
        const { data, error: funcError } = await supabase.functions.invoke("view-invitation", {
          body: { token: token.trim() }
        });

        console.log("Invitation data received:", data);

        if (funcError || !data || !data.success) {
          console.error("Function error:", funcError || data?.error);
          setError(data?.error || "Invitation introuvable ou expirée");
        } else {
          setInvitation(data);
        }
      } catch (err) {
        console.error("Error fetching invitation:", err);
        setError("Erreur technique lors de la récupération de l'invitation");
      } finally {
        setFetchingInv(false);
      }
    }

    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    try {
      const result = await acceptMutation.mutateAsync(token);
      if (result?.success) {
        setAccepted(true);
        const targetPath = result.role === "prestataire" ? "/onboarding/prestataire" : "/dashboard";
        setTimeout(() => navigate(targetPath), 2000);
      }
    } catch (err: unknown) {
      toast({
        title: "Erreur",
        description: err.message || "Erreur lors de l'acceptation de l'invitation",
        variant: "destructive",
      });
    }
  };

  const handleLogoutAndSwitch = async () => {
    await signOut();
    navigate(`/register?token=${token}&email=${invitation?.email}`);
  };

  if (authLoading || fetchingInv) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground animate-pulse">Chargement de l'invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background forced-light">
        <Card className="max-w-md w-full border-border/70 shadow-card overflow-hidden bg-card">
          <div className="h-2 bg-destructive" />
          <CardContent className="p-10 text-center space-y-6">
            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto text-destructive">
              <XCircle className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-display font-bold text-foreground">Lien invalide</h2>
              <p className="text-muted-foreground leading-relaxed">
                {error || "Ce lien d'invitation est invalide ou n'est plus disponible."}
              </p>
            </div>
            <Button
              onClick={() => navigate("/login")}
              className="w-full h-12 gradient-primary text-white rounded-xl shadow-lg shadow-primary/20"
            >
              Retourner à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background forced-light">
        <Card className="max-w-md w-full border-border/70 shadow-card overflow-hidden bg-card">
          <div className="h-2 bg-success" />
          <CardContent className="p-10 text-center space-y-6">
            <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto text-success">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-display font-bold text-foreground">Bienvenue dans l'équipe !</h2>
              <p className="text-muted-foreground">
                Vous avez rejoint <strong>{invitation?.team_name}</strong> avec succès.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-primary font-medium">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Redirection en cours...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isWrongAccount = user && invitation && user.email?.toLowerCase() !== invitation.email.toLowerCase();
  const isCorrectAccount = user && invitation && user.email?.toLowerCase() === invitation.email.toLowerCase();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background forced-light text-foreground">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-accent-foreground/10 blur-[120px]" />
      </div>

      <Card className="max-w-xl w-full border-border/70 shadow-card overflow-hidden bg-card animate-in zoom-in-95 duration-500 relative z-10">
        <div className="h-2 w-full gradient-primary" />

        <CardContent className="p-10 md:p-12 space-y-10">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-primary/20 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                P
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center text-primary">
                <Shield className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">
                Rejoindre l'équipe
              </h1>
              <p className="text-muted-foreground text-lg max-w-sm mx-auto leading-relaxed">
                <strong>{invitation?.inviter_name}</strong> vous invite à collaborer au sein de <strong>{invitation?.team_name}</strong>.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-secondary/50 border border-border/60 flex items-start gap-4 transition-colors hover:bg-secondary/70">
              <div className="w-10 h-10 rounded-xl bg-card shadow-sm flex items-center justify-center text-muted-foreground shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Équipe</p>
                <p className="font-bold text-foreground">{invitation?.team_name}</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-secondary/50 border border-border/60 flex items-start gap-4 transition-colors hover:bg-secondary/70">
              <div className="w-10 h-10 rounded-xl bg-card shadow-sm flex items-center justify-center text-muted-foreground shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rôle</p>
                <p className="font-bold text-foreground capitalize">{invitation?.role}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {!user ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-warning/10 border border-warning/20 flex gap-3 items-center">
                  <Mail className="h-5 w-5 text-warning shrink-0" />
                  <p className="text-sm text-warning-foreground">
                    Vous allez être inscrit avec l'email : <strong>{invitation?.email}</strong>
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/login?token=${token}`)}
                    className="h-14 font-semibold rounded-2xl transition-all text-base"
                  >
                    Se connecter
                  </Button>
                  <Button
                    onClick={() => navigate(`/register?token=${token}`)}
                    className="h-14 gradient-primary text-white font-semibold rounded-2xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all text-base gap-2 group"
                  >
                    <UserPlus className="w-5 h-5" />
                    S'inscrire
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            ) : isWrongAccount ? (
              <div className="space-y-4">
                <div className="p-6 rounded-2xl bg-destructive/5 border border-destructive/10 space-y-4">
                  <div className="flex gap-3">
                    <XCircle className="h-6 w-6 text-destructive shrink-0" />
                    <div className="space-y-1">
                      <p className="font-bold text-destructive">Mauvais compte détecté</p>
                      <p className="text-sm text-destructive-foreground/80 leading-relaxed">
                        Vous êtes actuellement connecté avec <strong>{user.email}</strong>, mais cette invitation est destinée à <strong>{invitation?.email}</strong>.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleLogoutAndSwitch}
                    className="w-full h-12 bg-destructive text-white font-semibold rounded-xl hover:bg-destructive/90 gap-2 shadow-lg shadow-destructive/10"
                  >
                    <LogOut className="w-5 h-5" />
                    Changer de compte
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex gap-3 items-center justify-center mb-6">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  <p className="text-sm text-primary">
                    Prêt à rejoindre en tant que <strong>{user.email}</strong>
                  </p>
                </div>
                <Button
                  onClick={handleAccept}
                  disabled={acceptMutation.isPending}
                  className="w-full h-16 gradient-primary text-white text-lg font-bold rounded-2xl shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all gap-3 group"
                >
                  {acceptMutation.isPending ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      Accepter l'invitation
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </div>
            )}

            <p className="text-center text-muted-foreground text-sm">
              En rejoignant, vous acceptez les conditions de collaboration de Planify.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
