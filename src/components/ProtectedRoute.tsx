import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUserRole, canAccess } from "@/hooks/use-user-role";
import { useFailsafeRedirect } from "@/hooks/use-failsafe-redirect";
import { useWorkspace } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw, LogOut, User } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildRelativeAppPath } from "@/lib/public-app-url";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredSection?: string;
  allowWithoutWorkspace?: boolean;
}

export function ProtectedRoute({ children, requiredSection, allowWithoutWorkspace = false }: ProtectedRouteProps) {
  const { user, loading, signOut } = useAuth();
  const { data: roleData, isLoading: roleLoading } = useUserRole();
  const { status: workspaceStatus, memberships, activeWorkspaceIdentifier } = useWorkspace();
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
                window.location.href = buildRelativeAppPath("/login");
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

  if (loading || workspaceStatus === "loading" || (user && roleLoading && !timedOut) || isSigningOut) {
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

  if (!user) {
    return (
      <Navigate
        to={buildRelativeAppPath("/login", { workspaceIdentifier: activeWorkspaceIdentifier })}
        replace
      />
    );
  }

  if (!user.email_confirmed_at) {
    return (
      <Navigate
        to={buildRelativeAppPath("/verify-email", {
          workspaceIdentifier: activeWorkspaceIdentifier,
          searchParams: { email: user.email ?? "" },
        })}
        replace
      />
    );
  }

  if (!allowWithoutWorkspace && workspaceStatus === "needs-selection") {
    return (
      <Navigate
        to={buildRelativeAppPath("/select-workspace", {
          workspaceIdentifier: activeWorkspaceIdentifier,
          searchParams: { redirect: `${location.pathname}${location.search}` },
        })}
        replace
      />
    );
  }

  if (!allowWithoutWorkspace && workspaceStatus === "not-authorized") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full bg-card rounded-3xl shadow-card border border-border/80 p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-display font-bold text-foreground">Workspace inaccessible</h2>
            <p className="text-muted-foreground text-sm leading-7">
              Le workspace demandé ne correspond à aucun accès actif sur votre compte. Choisissez un autre espace avant de continuer.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {memberships.length > 0 ? (
              <Button
                onClick={() =>
                  window.location.assign(
                    buildRelativeAppPath("/select-workspace", {
                      searchParams: { redirect: `${location.pathname}${location.search}` },
                    }),
                  )
                }
                className="w-full gap-2 rounded-xl h-11"
              >
                <User className="w-4 h-4" />
                Choisir un autre workspace
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={() => {
                signOut().then(() => {
                  window.location.assign(buildRelativeAppPath("/login"));
                });
              }}
              className="w-full gap-2 rounded-xl h-11"
            >
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!allowWithoutWorkspace && workspaceStatus === "no-team") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full bg-card rounded-3xl shadow-card border border-border/80 p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto">
            <User className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-display font-bold text-foreground">Aucun workspace disponible</h2>
            <p className="text-muted-foreground text-sm leading-7">
              Votre compte ne dispose pas encore d’un espace Planify exploitable. Déconnectez-vous puis reconnectez-vous si l’équipe vient d’être créée.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              signOut().then(() => {
                window.location.assign(buildRelativeAppPath("/login"));
              });
            }}
            className="w-full gap-2 rounded-xl h-11"
          >
            <LogOut className="w-4 h-4" />
            Retour à la connexion
          </Button>
        </div>
      </div>
    );
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
                  window.location.href = buildRelativeAppPath("/login");
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
    return <Navigate to={buildRelativeAppPath("/dashboard", { workspaceIdentifier: activeWorkspaceIdentifier })} replace />;
  }

  // Force onboarding for prestataires
  if (roleData?.role === "prestataire" && !roleData.isOnboarded && location.pathname !== "/onboarding/prestataire") {
    return <Navigate to={buildRelativeAppPath("/onboarding/prestataire", { workspaceIdentifier: activeWorkspaceIdentifier })} replace />;
  }

  return <>{children}</>;
}
