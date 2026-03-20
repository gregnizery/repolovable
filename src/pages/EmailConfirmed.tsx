import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function EmailConfirmed() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [countdown, setCountdown] = useState(5);

  const isInvitation = !!searchParams.get("token");

  useEffect(() => {
    if (countdown <= 0) {
      if (user) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, user, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background forced-light text-foreground">
      <Card className="max-w-md w-full shadow-xl border-0">
        <CardContent className="p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-display font-bold">
              Compte vérifié !
            </h1>
            <p className="text-muted-foreground text-sm">
              {isInvitation
                ? "Votre email a été confirmé et vous avez rejoint l'équipe avec succès."
                : "Votre email a été confirmé. Votre compte est maintenant actif."}
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <Button
              onClick={() => user ? navigate("/dashboard") : navigate("/login")}
              className="w-full gradient-primary text-white rounded-xl hover:opacity-90"
            >
              {user ? "Accéder au tableau de bord" : "Se connecter"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Redirection automatique dans {countdown}s…
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
