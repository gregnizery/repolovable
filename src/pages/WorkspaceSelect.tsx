import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2, ChevronRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import {
  getWorkspaceIdentifierForMembership,
  useWorkspace,
} from "@/hooks/use-workspace";
import { buildRelativeAppPath } from "@/lib/public-app-url";

export default function WorkspaceSelect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signOut } = useAuth();
  const { memberships, selectWorkspace } = useWorkspace();

  const redirectPath = useMemo(() => {
    const raw = searchParams.get("redirect");
    if (!raw || !raw.startsWith("/")) {
      return "/dashboard";
    }
    return raw;
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <Card className="w-full max-w-3xl border-border/70 shadow-card">
        <CardHeader className="space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Workspace
          </p>
          <CardTitle className="text-3xl font-semibold tracking-[-0.04em] text-foreground">
            Choisissez l’espace à ouvrir
          </CardTitle>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            Vous appartenez à plusieurs workspaces Planify. Le POC Azure utilise un
            workspace explicite pour éviter d’ouvrir silencieusement la mauvaise équipe.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {memberships.map((membership) => {
            const identifier = getWorkspaceIdentifierForMembership(membership);
            const team = membership.teams;

            return (
              <button
                key={`${membership.team_id}:${membership.role}`}
                type="button"
                onClick={() => {
                  selectWorkspace(identifier);
                  navigate(
                    buildRelativeAppPath(redirectPath, { workspaceIdentifier: identifier }),
                    { replace: true },
                  );
                }}
                className="flex w-full items-center justify-between rounded-[1.5rem] border border-border/70 bg-card px-5 py-4 text-left transition-colors hover:border-primary/30 hover:bg-muted/30"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-foreground">
                      {team?.name ?? "Workspace"}
                    </p>
                    <p className="truncate font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {identifier ?? membership.team_id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-border/70 bg-background px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {membership.role}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            );
          })}

          <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Route demandée: <span className="font-mono">{redirectPath}</span>
            </p>
            <Button
              variant="outline"
              className="gap-2 rounded-xl"
              onClick={async () => {
                await signOut();
                navigate(buildRelativeAppPath("/login"), { replace: true });
              }}
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
