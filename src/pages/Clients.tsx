import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { WorkspaceHero, WorkspacePage, WorkspacePanel } from "@/components/layout/Workspace";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useClients } from "@/hooks/use-data";
import { Search, Plus, LayoutGrid, List, Users, Building2, User, Download } from "lucide-react";
import { exportToCSV } from "@/lib/export-csv";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { useUserRole, canEdit } from "@/hooks/use-user-role";

const statusColors: Record<string, string> = {
  actif: "bg-success/10 text-success",
  prospect: "bg-warning/10 text-warning",
  inactif: "bg-muted text-muted-foreground",
};

export default function Clients() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { data: clients = [], isLoading } = useClients();
  const { data: roleData } = useUserRole();
  const canEditClients = canEdit(roleData?.role, "clients");
  useRealtimeSync("clients", [["clients"]]);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <WorkspacePage>
        <WorkspaceHero
          eyebrow="Relation"
          title="Collection Clients"
          description="Parcourez la base client en vue carte ou liste dense, lancez les actions commerciales et gardez un aperçu clair des comptes actifs."
          actions={(
            <>
              <Button variant="outline" className="rounded-2xl gap-2" onClick={() => exportToCSV(clients, [
                { key: "name", label: "Nom" },
                { key: "email", label: "Email" },
                { key: "phone", label: "Téléphone" },
                { key: "company", label: "Entreprise" },
                { key: "address", label: "Adresse" },
                { key: "created_at", label: "Créé le", format: (v) => v ? new Date(v as string).toLocaleDateString("fr-FR") : "" },
              ], "clients")}>
                <Download className="h-4 w-4" />
                Exporter
              </Button>
              {canEditClients && (
                <Button className="rounded-2xl gap-2" onClick={() => navigate("/clients/nouveau")}>
                  <Plus className="h-4 w-4" />
                  Nouveau client
                </Button>
              )}
            </>
          )}
          aside={(
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-inner">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Base active</p>
                <p className="mt-2 text-2xl font-display font-bold text-foreground">{clients.length}</p>
                <p className="mt-1 text-sm text-muted-foreground">client{clients.length > 1 ? "s" : ""} suivis dans la collection.</p>
              </div>
              <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-inner">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Entreprises</p>
                <p className="mt-2 text-2xl font-display font-bold text-primary">{clients.filter((c) => !!c.company).length}</p>
                <p className="mt-1 text-sm text-muted-foreground">comptes B2B ou associations.</p>
              </div>
              <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-inner">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Mode d’affichage</p>
                <p className="mt-2 text-lg font-display font-semibold text-foreground">{view === "grid" ? "Cartes enrichies" : "Table dense"}</p>
                <p className="mt-1 text-sm text-muted-foreground">Basculer selon le niveau de détail souhaité.</p>
              </div>
            </div>
          )}
        />

        <WorkspacePanel
          title="Filtrer et parcourir"
          description="Recherche instantanée, alternance carte/liste et lecture rapide des fiches relationnelles."
        >
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-11 rounded-2xl" />
            </div>
            <div className="flex items-center border border-border rounded-2xl overflow-hidden bg-background/80">
              <button onClick={() => setView("grid")} className={cn("p-2.5", view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button onClick={() => setView("list")} className={cn("p-2.5", view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </WorkspacePanel>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} variant="client" />
            ))}
          </div>
        ) : filtered.length === 0 && search ? (
          <EmptyState
            icon={Search}
            title="Aucun résultat"
            description={`Aucun client ne correspond à "${search}". Essayez un autre terme de recherche.`}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aucun client pour le moment"
            description={canEditClients ? "Commencez par ajouter votre premier client pour gérer vos relations et suivre vos missions." : "Aucun client n'a été enregistré pour le moment."}
            actionLabel={canEditClients ? "Ajouter un client" : undefined}
            onAction={canEditClients ? () => navigate("/clients/nouveau") : undefined}
          />
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(client => (
              <Card key={client.id} className="shadow-card border-border/50 hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={() => navigate(`/clients/${client.id}`)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      {client.company ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
                    </div>
                  </div>
                  <h3 className="font-semibold group-hover:text-primary transition-colors">{client.name}</h3>
                  {client.company && <p className="text-sm text-muted-foreground">{client.company}</p>}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">{client.email}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="shadow-card border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-medium text-muted-foreground">Client</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Email</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Téléphone</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => navigate(`/clients/${c.id}`)}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                            {c.name.split(" ").map(w => w[0]).join("")}
                          </div>
                          <div>
                            <p className="font-medium">{c.name}</p>
                            {c.company && <p className="text-xs text-muted-foreground">{c.company}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{c.email}</td>
                      <td className="p-4 text-muted-foreground">{c.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </WorkspacePage>
    </AppLayout>
  );
}
