import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { WorkspaceBackLink, WorkspaceHero, WorkspacePage, WorkspacePanel } from "@/components/layout/Workspace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useClient, useMissions, useDevisList, useFactures } from "@/hooks/use-data";
import { ArrowLeft, Mail, Phone, Building2, Calendar, FileText, Receipt, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserRole, canEdit } from "@/hooks/use-user-role";
import { useWorkspace } from "@/hooks/use-workspace";
import { buildPublicAppUrl } from "@/lib/public-app-url";

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: client, isLoading } = useClient(id);
  const { data: allMissions = [] } = useMissions();
  const { data: allDevis = [] } = useDevisList();
  const { data: allFactures = [] } = useFactures();
  const { data: roleData } = useUserRole();
  const { activeWorkspaceIdentifier } = useWorkspace();
  const canEditClient = canEdit(roleData?.role, "clients");
  useRealtimeSync("clients", [["client", id!]]);
  useRealtimeSync("missions", [["missions"]]);
  useRealtimeSync("devis", [["devis"]]);
  useRealtimeSync("factures", [["factures"]]);

  const missions = allMissions.filter(m => m.client_id === id);
  const devis = allDevis.filter(d => d.client_id === id);
  const factures = allFactures.filter(f => f.client_id === id);

  const generatePortalLink = async () => {
    if (!id) return;
    const { data, error } = await supabase.functions.invoke("create-client-portal-token", {
      body: { clientId: id, expiresInHours: 168 },
    });
    if (error) return toast.error(error.message);
    const url = buildPublicAppUrl("/public/client-portal", {
      workspaceIdentifier: activeWorkspaceIdentifier,
      searchParams: { token: data.token },
    });
    await navigator.clipboard.writeText(url);
    toast.success("Lien portail client copié");
  };

  if (isLoading) return <AppLayout><div className="space-y-4 max-w-5xl"><Skeleton className="h-8 w-48" /><Skeleton className="h-32 w-full" /></div></AppLayout>;
  if (!client) return <AppLayout><div className="p-12 text-center text-muted-foreground">Client introuvable</div></AppLayout>;

  return (
    <AppLayout>
      <WorkspacePage className="max-w-6xl">
        <WorkspaceBackLink to="/clients" label="Retour aux clients" />

        <WorkspaceHero
          eyebrow="Relation"
          title={client.name}
          description={client.company ? `${client.company} · Fiche relationnelle, missions et documents financiers associés.` : "Fiche relationnelle, missions et documents financiers associés."}
          actions={canEditClient ? (
            <>
              <Button variant="outline" className="gap-2 rounded-2xl" onClick={generatePortalLink}>Portail client</Button>
              <Button variant="outline" className="gap-2 rounded-2xl" onClick={() => navigate(`/clients/${id}/modifier`)}>
                <Edit className="h-4 w-4" />
                Modifier
              </Button>
            </>
          ) : undefined}
          aside={(
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[24px] border border-border/70 bg-card/90 p-4 shadow-sm backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Missions</p>
                <p className="mt-2 text-2xl font-display font-bold text-foreground">{missions.length}</p>
                <p className="mt-1 text-sm text-muted-foreground">activité(s) rattachée(s).</p>
              </div>
              {canEditClient && (
                <>
                  <div className="rounded-[24px] border border-border/70 bg-card/90 p-4 shadow-sm backdrop-blur-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Devis</p>
                    <p className="mt-2 text-2xl font-display font-bold text-primary">{devis.length}</p>
                    <p className="mt-1 text-sm text-muted-foreground">proposition(s) commerciale(s).</p>
                  </div>
                  <div className="rounded-[24px] border border-border/70 bg-card/90 p-4 shadow-sm backdrop-blur-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Factures</p>
                    <p className="mt-2 text-2xl font-display font-bold text-info">{factures.length}</p>
                    <p className="mt-1 text-sm text-muted-foreground">document(s) émis.</p>
                  </div>
                </>
              )}
            </div>
          )}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <WorkspacePanel title="Résumé client" description="Coordonnées et contexte rapide pour agir sans ouvrir d’autres écrans." className="h-fit lg:sticky lg:top-24">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
                  {client.name.split(" ").map(w => w[0]).join("")}
                </div>
                <div>
                  <p className="font-display text-lg font-semibold">{client.name}</p>
                  {client.company && <p className="text-sm text-muted-foreground flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {client.company}</p>}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/70 px-3 py-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{client.email || "—"}</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/70 px-3 py-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{client.phone || "—"}</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/70 px-3 py-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Client depuis {new Date(client.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</span>
                </div>
              </div>
            </div>
          </WorkspacePanel>

          <Tabs defaultValue="missions">
            <TabsList className="bg-muted/50 rounded-2xl">
            <TabsTrigger value="missions" className="rounded-lg">Missions ({missions.length})</TabsTrigger>
            {canEditClient && (
              <>
                <TabsTrigger value="devis" className="rounded-lg">Devis ({devis.length})</TabsTrigger>
                <TabsTrigger value="factures" className="rounded-lg">Factures ({factures.length})</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="missions" className="mt-4 space-y-3">
            {missions.length === 0 ? (
              <WorkspacePanel title="Historique missions"><div className="p-4 text-center text-muted-foreground">Aucune mission pour ce client</div></WorkspacePanel>
            ) : missions.map(m => (
              <Card key={m.id} className="shadow-card border-border/50 hover:shadow-md cursor-pointer transition-shadow" onClick={() => navigate(`/missions/${m.id}`)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{m.title}</p>
                    <p className="text-sm text-muted-foreground">{m.start_date ? new Date(m.start_date).toLocaleString("fr-FR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(" à", " -") : "—"} · {m.location || "—"}</p>
                  </div>
                  <span className="font-semibold">{(m.amount || 0).toLocaleString()}€</span>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="devis" className="mt-4 space-y-3">
            {devis.length === 0 ? (
              <WorkspacePanel title="Historique devis"><div className="p-4 text-center text-muted-foreground">Aucun devis pour ce client</div></WorkspacePanel>
            ) : devis.map(d => (
              <Card key={d.id} className="shadow-card border-border/50 hover:shadow-md cursor-pointer transition-shadow" onClick={() => navigate(`/finance/devis/${d.id}`)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium">{d.number}</p>
                      <p className="text-sm text-muted-foreground">{new Date(d.date).toLocaleDateString("fr-FR")}</p>
                    </div>
                  </div>
                  <span className="font-semibold">{Number(d.total_ttc).toLocaleString()}€</span>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="factures" className="mt-4 space-y-3">
            {factures.length === 0 ? (
              <WorkspacePanel title="Historique factures"><div className="p-4 text-center text-muted-foreground">Aucune facture pour ce client</div></WorkspacePanel>
            ) : factures.map(f => (
              <Card key={f.id} className="shadow-card border-border/50 hover:shadow-md cursor-pointer transition-shadow" onClick={() => navigate(`/finance/factures/${f.id}`)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Receipt className="h-4 w-4 text-info" />
                    <div>
                      <p className="font-medium">{f.number}</p>
                      <p className="text-sm text-muted-foreground">{new Date(f.date).toLocaleDateString("fr-FR")}</p>
                    </div>
                  </div>
                  <span className="font-semibold">{Number(f.total_ttc).toLocaleString()}€</span>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
        </div>
      </WorkspacePage>
    </AppLayout>
  );
}
