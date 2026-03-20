import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUserRole, canAccess } from "@/hooks/use-user-role";
import { useFailsafeRedirect } from "@/hooks/use-failsafe-redirect";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw, LogOut, User } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredSection?: string;
}

export function ProtectedRoute({ children, requiredSection }: ProtectedRouteProps) {
  const { user, loading, signOut } = useAuth();
  const { data: roleData, isLoading: roleLoading } = useUserRole();
  const { shouldBlock, clearFailsafe } = useFailsafeRedirect();
  const queryClient = useQueryClient();
  const [timedOut, setTimedOut] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const location = useLocation();

  // Safety net: if loading takes more than 5 seconds, give up and let the user through (or kick them out)
  useEffect(() => {
    if (!loading && user && roleLoading) {
      const t = setTimeout(() => setTimedOut(true), 5000);
      return () => clearTimeout(t);
    }
    setTimedOut(false);
  }, [loading, user, roleLoading]);


  // Handle "authenticated but no DB profile" case (orphan session auto-sync)
  useEffect(() => {
    let syncAttempts = 0;
    const maxAttempts = 2;

    async function attemptSync() {
      if (user && !roleLoading && !roleData && !isSigningOut && !shouldBlock && !loading && !timedOut) {
        if (syncAttempts < maxAttempts) {
          syncAttempts++;
          console.warn(`Orphan session detected. Auto-sync attempt ${syncAttempts}...`);
          try {
            const { error } = await supabase.functions.invoke("resync-profile");
            if (!error) {
              // Invalidate user-role query to trigger a reload
              queryClient.invalidateQueries({ queryKey: ["user-role", user.id] });
              return;
            }
          } catch (e) {
            console.error("Auto-sync failed:", e);
          }
        }
      }
    }

    if (user && !roleData && !roleLoading && !loading) {
      attemptSync();
    }
  }, [user, roleLoading, roleData, isSigningOut, shouldBlock, loading, timedOut, queryClient]);

  // --- CIRCUIT BREAKER UI ---
  if (shouldBlock) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 forced-light">
        <div className="max-w-md w-full bg-card rounded-3xl shadow-card border border-border/80 p-8 text-center space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-warning/10 text-warning rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-display font-bold text-foreground">Boucle de redirection stoppée</h2>
            <p className="text-muted-foreground text-sm">
              Une erreur de session inhabituelle a été détectée (plusieurs redirections en quelques secondes).
              Pour votre sécurité, nous avons interrompu le chargement.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => {
                clearFailsafe();
                window.location.reload();
              }}
              className="w-full gap-2 rounded-xl h-11 transition-all active:scale-95"
            >
              <RefreshCcw className="w-4 h-4" />
              Réessayer le chargement
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                clearFailsafe();
                localStorage.clear();
                window.location.href = "/login";
              }}
              className="w-full gap-2 rounded-xl h-11 transition-all active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              Forcer la déconnexion locale
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || (user && roleLoading && !timedOut) || isSigningOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold animate-pulse">P</div>
          <p className="text-sm text-muted-foreground whitespace-nowrap">
            {isSigningOut ? "Déconnexion..." : "Vérification de la session..."}
          </p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!user.email_confirmed_at) {
    return <Navigate to={`/verify-email?email=${encodeURIComponent(user.email || "")}`} replace />;
  }


  // Handle "authenticated but no DB profile" case (orphan session UI fallback)
  if (!roleData && !roleLoading && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 forced-light">
        <div className="max-w-md w-full bg-card rounded-3xl shadow-card border border-border/80 p-8 text-center space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-accent text-accent-foreground rounded-2xl flex items-center justify-center mx-auto">
            <RefreshCcw className="w-8 h-8 animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-display font-bold text-foreground">Synchronisation automatique</h2>
            <p className="text-muted-foreground text-sm">
              Nous préparons votre espace de travail. Cela ne prendra que quelques secondes...
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              onClick={() => {
                localStorage.clear();
                signOut().then(() => {
                  window.location.href = "/login";
                });
              }}
              className="w-full gap-2 rounded-xl h-11 transition-all active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              Retour à la connexion
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If we get here and have no roleData, but we're NOT signing out, 
  // it might be a transient state or the useEffect is about to trigger.
  if (!roleData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold animate-pulse">P</div>
          <p className="text-sm text-muted-foreground whitespace-nowrap">Vérification de votre profil...</p>
        </div>
      </div>
    );
  }

  // If a section is required, check role access
  if (requiredSection && roleData && !canAccess(roleData.role, requiredSection)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Force onboarding for prestataires
  if (roleData?.role === "prestataire" && !roleData.isOnboarded && location.pathname !== "/onboarding/prestataire") {
    return <Navigate to="/onboarding/prestataire" replace />;
  }

  return <>{children}</>;
}
