import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Search, X, FileText, Receipt, Users, Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRole, canAccess, canEdit } from "@/hooks/use-user-role";
import type { Tables } from "@/integrations/supabase/types";
import type { SearchResultRow } from "@/lib/view-models";

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

type ClientSearchRow = Pick<Tables<"clients">, "id" | "name" | "company" | "email">;
type MissionSearchRow = Pick<Tables<"missions">, "id" | "title" | "status"> & {
  clients: { name: string | null } | null;
};
type DevisSearchRow = Pick<Tables<"devis">, "id" | "number" | "status" | "total_ttc"> & {
  clients: { name: string | null } | null;
};
type FactureSearchRow = Pick<Tables<"factures">, "id" | "number" | "status" | "total_ttc"> & {
  clients: { name: string | null } | null;
};

const GROUP_ICONS: Record<string, ReactNode> = {
  Clients: <Users className="h-3.5 w-3.5" />,
  Missions: <Calendar className="h-3.5 w-3.5" />,
  Devis: <FileText className="h-3.5 w-3.5" />,
  Factures: <Receipt className="h-3.5 w-3.5" />,
};

const STATUS_COLORS: Record<string, string> = {
  planifiée: "bg-info/10 text-info",
  en_cours: "bg-warning/10 text-warning",
  terminée: "bg-success/10 text-success",
  annulée: "bg-muted text-muted-foreground",
  brouillon: "bg-muted text-muted-foreground",
  envoyé: "bg-info/10 text-info",
  signé: "bg-success/10 text-success",
  refusé: "bg-destructive/10 text-destructive",
  expiré: "bg-warning/10 text-warning",
  envoyée: "bg-info/10 text-info",
  payée: "bg-success/10 text-success",
  en_retard: "bg-destructive/10 text-destructive",
};

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: roleData } = useUserRole();
  const role = roleData?.role;
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setActiveIdx(0);
    }
  }, [open]);

  const { data: results = [], isFetching } = useQuery<SearchResultRow[]>({
    queryKey: ["global-search", query, user?.id],
    queryFn: async () => {
      if (!query.trim() || query.length < 2) return [];
      const q = query.toLowerCase().trim();

      const fetchClients = canAccess(role, "clients")
        ? supabase.from("clients").select("id, name, company, email").ilike("name", `%${q}%`).limit(5)
        : Promise.resolve({ data: [] });

      const fetchMissions = canAccess(role, "missions")
        ? supabase.from("missions").select("id, title, status, clients(name)").ilike("title", `%${q}%`).limit(5)
        : Promise.resolve({ data: [] });

      const fetchDevis = canAccess(role, "finance")
        ? supabase.from("devis").select("id, number, status, total_ttc, clients(name)").or(`number.ilike.%${q}%`).limit(5)
        : Promise.resolve({ data: [] });

      const fetchFactures = canAccess(role, "finance")
        ? supabase.from("factures").select("id, number, status, total_ttc, clients(name)").or(`number.ilike.%${q}%`).limit(5)
        : Promise.resolve({ data: [] });

      const [{ data: clientsData }, { data: missionsData }, { data: devisData }, { data: facturesData }] =
        await Promise.all([fetchClients, fetchMissions, fetchDevis, fetchFactures]);

      const clients = (clientsData ?? []) as ClientSearchRow[];
      const missions = (missionsData ?? []) as MissionSearchRow[];
      const devis = (devisData ?? []) as DevisSearchRow[];
      const factures = (facturesData ?? []) as FactureSearchRow[];
      const out: SearchResultRow[] = [];

      for (const client of clients) {
        out.push({
          id: client.id,
          group: "Clients",
          label: client.name,
          sublabel: client.company || client.email || undefined,
          href: `/clients/${client.id}`,
        });
      }
      for (const mission of missions) {
        out.push({
          id: mission.id,
          group: "Missions",
          label: mission.title,
          sublabel: mission.clients?.name,
          href: `/missions/${mission.id}`,
          status: mission.status,
        });
      }
      for (const devisItem of devis) {
        out.push({
          id: devisItem.id,
          group: "Devis",
          label: devisItem.number,
          sublabel: `${devisItem.clients?.name || ""} · ${Number(devisItem.total_ttc).toLocaleString("fr-FR")} €`
            .trim()
            .replace(/^·\s*/, ""),
          href: `/finance/devis/${devisItem.id}`,
          status: devisItem.status,
        });
      }
      for (const facture of factures) {
        out.push({
          id: facture.id,
          group: "Factures",
          label: facture.number,
          sublabel: `${facture.clients?.name || ""} · ${Number(facture.total_ttc).toLocaleString("fr-FR")} €`
            .trim()
            .replace(/^·\s*/, ""),
          href: `/finance/factures/${facture.id}`,
          status: facture.status,
        });
      }

      return out;
    },
    enabled: !!user && open && query.length >= 2,
    staleTime: 0,
  });

  const grouped = results.reduce<Record<string, SearchResultRow[]>>((acc, result) => {
    if (!acc[result.group]) acc[result.group] = [];
    acc[result.group].push(result);
    return acc;
  }, {});
  const flat = Object.values(grouped).flat();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((idx) => Math.min(idx + 1, flat.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((idx) => Math.max(idx - 1, 0));
      }
      if (e.key === "Enter" && flat[activeIdx]) {
        navigate(flat[activeIdx].href);
        onClose();
      }
      if (e.key === "Escape") onClose();
    },
    [flat, activeIdx, navigate, onClose],
  );

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${activeIdx}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  useEffect(() => {
    setActiveIdx(0);
  }, [results]);

  if (!open) return null;

  const quick = [
    ...(canEdit(role, "clients")
      ? [{ label: "Nouveau client", href: "/clients/nouveau", icon: <Users className="h-4 w-4" /> }]
      : []),
    ...(canEdit(role, "missions")
      ? [{ label: "Nouvelle mission", href: "/missions/nouveau", icon: <Calendar className="h-4 w-4" /> }]
      : []),
    ...(canEdit(role, "finance")
      ? [
          { label: "Nouveau devis", href: "/finance/devis/nouveau", icon: <FileText className="h-4 w-4" /> },
          { label: "Nouvelle facture", href: "/finance/factures/nouveau", icon: <Receipt className="h-4 w-4" /> },
        ]
      : []),
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 animate-in fade-in-0 bg-slate-950/52 duration-150" onClick={onClose} />

      <div className="fixed left-1/2 top-24 z-50 w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 animate-in fade-in-0 zoom-in-95 duration-150">
        <div className="overflow-hidden rounded-[32px] border border-border bg-card shadow-[0_30px_80px_-34px_rgba(21,19,50,0.34)]">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              {isFetching ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
              )}
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Rechercher clients, missions, devis, factures..."
                className="flex-1 rounded-md bg-background px-2 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-muted-foreground transition-colors hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd className="hidden rounded-full border border-border bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground sm:inline-flex">
                Esc
              </kbd>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Commandez l’application sans changer de contexte.</p>
          </div>

          <div ref={listRef} className="max-h-[60vh] overflow-y-auto">
            {query.length < 2 ? (
              <div className="p-4">
                <p className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Accès rapide
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {quick.map((item) => (
                    <button
                      key={item.href}
                      onClick={() => {
                        navigate(item.href);
                        onClose();
                      }}
                      className="flex w-full items-center gap-3 rounded-[20px] border border-border bg-card px-4 py-3 text-left text-sm transition-colors hover:border-primary/20 hover:bg-muted/60"
                    >
                      <span className="rounded-[14px] bg-primary/10 p-2 text-primary">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : results.length === 0 && !isFetching ? (
              <div className="py-12 text-center text-muted-foreground">
                <Search className="mx-auto mb-2 h-8 w-8 opacity-30" />
                <p className="text-sm">Aucun résultat pour &ldquo;{query}&rdquo;</p>
              </div>
            ) : (
              <div className="p-3">
                {Object.entries(grouped).map(([group, items]) => (
                  <div key={group} className="mb-2">
                    <p className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {GROUP_ICONS[group]} {group}
                    </p>
                    {items.map((item) => {
                      const idx = flat.indexOf(item);
                      return (
                        <button
                          key={item.id}
                          data-idx={idx}
                          onClick={() => {
                            navigate(item.href);
                            onClose();
                          }}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-[20px] border border-transparent px-3 py-3 text-left text-sm transition-colors",
                            idx === activeIdx
                              ? "border-primary/20 bg-primary/10 text-foreground shadow-sm"
                              : "hover:bg-muted/70",
                          )}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{item.label}</p>
                            {item.sublabel && (
                              <p className={cn("mt-0.5 truncate text-xs", idx === activeIdx ? "text-foreground/70" : "text-muted-foreground")}>
                                {item.sublabel}
                              </p>
                            )}
                          </div>
                          {item.status && (
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                idx === activeIdx ? "bg-card text-foreground" : STATUS_COLORS[item.status] ?? "bg-muted text-muted-foreground",
                              )}
                            >
                              {item.status}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {results.length > 0 && (
            <div className="flex items-center gap-3 border-t border-border px-4 py-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1">↑↓</kbd> Naviguer
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1">↵</kbd> Ouvrir
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1">Esc</kbd> Fermer
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
