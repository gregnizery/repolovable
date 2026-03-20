import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Search, X, FileText, Receipt, Users, Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRole, canAccess, canEdit } from "@/hooks/use-user-role";

interface SearchResult {
    id: string;
    label: string;
    sublabel?: string;
    href: string;
    group: "Clients" | "Missions" | "Devis" | "Factures";
    status?: string;
}

interface GlobalSearchProps {
    open: boolean;
    onClose: () => void;
}

const GROUP_ICONS: Record<string, React.ReactNode> = {
    Clients: <Users className="h-3.5 w-3.5" />,
    Missions: <Calendar className="h-3.5 w-3.5" />,
    Devis: <FileText className="h-3.5 w-3.5" />,
    Factures: <Receipt className="h-3.5 w-3.5" />,
};

const STATUS_COLORS: Record<string, string> = {
    // missions
    planifiée: "bg-info/10 text-info",
    en_cours: "bg-warning/10 text-warning",
    terminée: "bg-success/10 text-success",
    annulée: "bg-muted text-muted-foreground",
    // devis
    brouillon: "bg-muted text-muted-foreground",
    envoyé: "bg-info/10 text-info",
    signé: "bg-success/10 text-success",
    refusé: "bg-destructive/10 text-destructive",
    expiré: "bg-warning/10 text-warning",
    // factures
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

    // ── Focus on open ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setQuery("");
            setActiveIdx(0);
        }
    }, [open]);

    // ── Keyboard shortcut Cmd/Ctrl+K ─────────────────────────────────────────
    // (handled in parent TopBar)

    // ── Search query ─────────────────────────────────────────────────────────
    const { data: results = [], isFetching } = useQuery<SearchResult[]>({
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ? (supabase as any).from("devis").select("id, number, status, total_ttc, clients(name)").or(`number.ilike.%${q}%`).limit(5)
                : Promise.resolve({ data: [] });

            const fetchFactures = canAccess(role, "finance")
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ? (supabase as any).from("factures").select("id, number, status, total_ttc, clients(name)").or(`number.ilike.%${q}%`).limit(5)
                : Promise.resolve({ data: [] });

            const [{ data: clients }, { data: missions }, { data: devis }, { data: factures }] = await Promise.all([
                fetchClients, fetchMissions, fetchDevis, fetchFactures
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ]) as any[];

            const out: SearchResult[] = [];

            for (const c of clients ?? []) {
                out.push({ id: c.id, group: "Clients", label: c.name, sublabel: c.company || c.email || undefined, href: `/clients/${c.id}` });
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const m of (missions as any) ?? []) {
                out.push({ id: m.id, group: "Missions", label: m.title, sublabel: m.clients?.name, href: `/missions/${m.id}`, status: m.status });
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const d of (devis as any) ?? []) {
                out.push({ id: d.id, group: "Devis", label: d.number, sublabel: `${d.clients?.name || ""} · ${Number(d.total_ttc).toLocaleString("fr-FR")} €`.trim().replace(/^·\s*/, ""), href: `/finance/devis/${d.id}`, status: d.status });
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const f of (factures as any) ?? []) {
                out.push({ id: f.id, group: "Factures", label: f.number, sublabel: `${f.clients?.name || ""} · ${Number(f.total_ttc).toLocaleString("fr-FR")} €`.trim().replace(/^·\s*/, ""), href: `/finance/factures/${f.id}`, status: f.status });
            }

            return out;
        },
        enabled: !!user && open && query.length >= 2,
        staleTime: 0,
    });

    // ── Group results ─────────────────────────────────────────────────────────
    const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
        if (!acc[r.group]) acc[r.group] = [];
        acc[r.group].push(r);
        return acc;
    }, {});

    const flat = Object.values(grouped).flat();

    // ── Keyboard navigation ───────────────────────────────────────────────────
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, flat.length - 1)); }
        if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
        if (e.key === "Enter" && flat[activeIdx]) { navigate(flat[activeIdx].href); onClose(); }
        if (e.key === "Escape") onClose();
    }, [flat, activeIdx, navigate, onClose]);

    // Keep active item scrolled into view
    useEffect(() => {
        if (!listRef.current) return;
        const el = listRef.current.querySelector(`[data-idx="${activeIdx}"]`) as HTMLElement | null;
        el?.scrollIntoView({ block: "nearest" });
    }, [activeIdx]);

    useEffect(() => { setActiveIdx(0); }, [results]);

    if (!open) return null;

    const quick = [
        ...(canEdit(role, "clients") ? [{ label: "Nouveau client", href: "/clients/nouveau", icon: <Users className="h-4 w-4" /> }] : []),
        ...(canEdit(role, "missions") ? [{ label: "Nouvelle mission", href: "/missions/nouveau", icon: <Calendar className="h-4 w-4" /> }] : []),
        ...(canEdit(role, "finance") ? [
            { label: "Nouveau devis", href: "/finance/devis/nouveau", icon: <FileText className="h-4 w-4" /> },
            { label: "Nouvelle facture", href: "/finance/factures/nouveau", icon: <Receipt className="h-4 w-4" /> },
        ] : []),
    ];

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-in fade-in-0 duration-150" onClick={onClose} />

            {/* Panel */}
            <div className="fixed top-[10%] left-1/2 -translate-x-1/2 w-full max-w-xl z-50 animate-in fade-in-0 zoom-in-95 duration-150">
                <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
                    {/* Search input */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                        {isFetching
                            ? <Loader2 className="h-5 w-5 text-muted-foreground animate-spin shrink-0" />
                            : <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                        }
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Rechercher clients, missions, devis, factures..."
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                        {query && (
                            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        )}
                        <kbd className="hidden sm:inline-flex text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">Esc</kbd>
                    </div>

                    {/* Results */}
                    <div ref={listRef} className="max-h-[60vh] overflow-y-auto">
                        {query.length < 2 ? (
                            <div className="p-3">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">Accès rapide</p>
                                {quick.map((q) => (
                                    <button
                                        key={q.href}
                                        onClick={() => { navigate(q.href); onClose(); }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-muted transition-colors text-left"
                                    >
                                        <span className="p-1.5 rounded-lg bg-primary/10 text-primary">{q.icon}</span>
                                        {q.label}
                                    </button>
                                ))}
                            </div>
                        ) : results.length === 0 && !isFetching ? (
                            <div className="py-12 text-center text-muted-foreground">
                                <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Aucun résultat pour &ldquo;{query}&rdquo;</p>
                            </div>
                        ) : (
                            <div className="p-2">
                                {Object.entries(grouped).map(([group, items]) => (
                                    <div key={group} className="mb-1">
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 py-1.5 flex items-center gap-1.5">
                                            {GROUP_ICONS[group]} {group}
                                        </p>
                                        {items.map((item) => {
                                            const idx = flat.indexOf(item);
                                            return (
                                                <button
                                                    key={item.id}
                                                    data-idx={idx}
                                                    onClick={() => { navigate(item.href); onClose(); }}
                                                    className={cn(
                                                        "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                                                        idx === activeIdx ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                                                    )}
                                                >
                                                    <div className="min-w-0">
                                                        <p className="font-medium truncate">{item.label}</p>
                                                        {item.sublabel && (
                                                            <p className={cn("text-xs truncate mt-0.5", idx === activeIdx ? "text-primary-foreground/70" : "text-muted-foreground")}>
                                                                {item.sublabel}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {item.status && (
                                                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                                                            idx === activeIdx ? "bg-white/20 text-white" : (STATUS_COLORS[item.status] ?? "bg-muted text-muted-foreground")
                                                        )}>
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

                    {/* Footer hint */}
                    {results.length > 0 && (
                        <div className="border-t border-border px-4 py-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1"><kbd className="bg-muted border border-border rounded px-1">↑↓</kbd> Naviguer</span>
                            <span className="flex items-center gap-1"><kbd className="bg-muted border border-border rounded px-1">↵</kbd> Ouvrir</span>
                            <span className="flex items-center gap-1"><kbd className="bg-muted border border-border rounded px-1">Esc</kbd> Fermer</span>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
