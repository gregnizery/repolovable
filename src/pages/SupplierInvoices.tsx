import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSupplierInvoices, useCreateSupplierInvoice, useDeleteSupplierInvoice, useUpdateSupplierInvoice } from "@/hooks/use-logistics";
import { useSuppliers } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListViewToggle } from "@/components/ListViewToggle";
import { GroupBySelect } from "@/components/GroupBySelect";
import { SortableHeader, SortDirection } from "@/components/SortableHeader";
import { Plus, Search, ShoppingCart, Trash2, MoreVertical, CheckCircle2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const statusConfig: Record<string, { label: string; class: string }> = {
  "à_payer": { label: "À payer", class: "bg-warning/10 text-warning" },
  "payée": { label: "Payée", class: "bg-success/10 text-success" },
  "en_retard": { label: "En retard", class: "bg-destructive/10 text-destructive" },
};

const groupByOptions = [
  { key: "none", label: "Toutes" },
  { key: "status", label: "Statut" },
  { key: "supplier", label: "Fournisseur" },
];

export default function SupplierInvoices() {
  const { data: invoices, isLoading } = useSupplierInvoices();
  const { data: suppliers } = useSuppliers();
  const createInvoice = useCreateSupplierInvoice();
  const deleteInvoice = useDeleteSupplierInvoice();
  const updateInvoice = useUpdateSupplierInvoice();

  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "table">("table");
  const [groupBy, setGroupBy] = useState("none");
  const [sortKey, setSortKey] = useState<string | null>("date");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({ number: "", supplier_id: "", date: new Date().toISOString().split("T")[0], due_date: "", total_ht: "", tva_rate: "20", notes: "" });

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    let list = invoices || [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((i: any) => i.number?.toLowerCase().includes(q) || i.suppliers?.name?.toLowerCase().includes(q));
    }
    if (sortKey) {
      list = [...list].sort((a: any, b: any) => {
        const av = sortKey === "supplier" ? (a.suppliers?.name ?? "") : (a[sortKey] ?? "");
        const bv = sortKey === "supplier" ? (b.suppliers?.name ?? "") : (b[sortKey] ?? "");
        const cmp = ["total_ht", "total_ttc"].includes(sortKey) ? Number(av) - Number(bv) : String(av).localeCompare(String(bv));
        return sortDir === "desc" ? -cmp : cmp;
      });
    }
    return list;
  }, [invoices, search, sortKey, sortDir]);

  const totalTTC = filtered.reduce((s: number, i: any) => s + Number(i.total_ttc || 0), 0);
  const totalUnpaid = filtered.filter((i: any) => i.status !== "payée").reduce((s: number, i: any) => s + Number(i.total_ttc || 0), 0);

  const grouped = useMemo(() => {
    if (groupBy === "none") return { "": filtered };
    const g: Record<string, any[]> = {};
    filtered.forEach((i: any) => {
      const key = groupBy === "status" ? (statusConfig[i.status]?.label || i.status) : (i.suppliers?.name || "Sans fournisseur");
      (g[key] ??= []).push(i);
    });
    return g;
  }, [filtered, groupBy]);

  const handleSubmit = async () => {
    const ht = parseFloat(form.total_ht) || 0;
    const tva = parseFloat(form.tva_rate) / 100;
    await createInvoice.mutateAsync({
      number: form.number,
      supplier_id: form.supplier_id || null,
      date: form.date,
      due_date: form.due_date || null,
      total_ht: ht,
      tva_rate: tva,
      total_ttc: ht * (1 + tva),
      notes: form.notes || null,
    });
    setIsFormOpen(false);
    setForm({ number: "", supplier_id: "", date: new Date().toISOString().split("T")[0], due_date: "", total_ht: "", tva_rate: "20", notes: "" });
  };

  const markPaid = (id: string) => updateInvoice.mutate({ id, status: "payée" });

  return (
    <AppLayout>
      <div className="flex-1 space-y-6 animate-fade-in max-w-7xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Factures d'achat</h1>
            <p className="text-muted-foreground mt-1">
              {filtered.length} facture{filtered.length > 1 ? "s" : ""} · Total : {totalTTC.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
              {totalUnpaid > 0 && <span className="text-warning ml-2">· Impayé : {totalUnpaid.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</span>}
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="shadow-md"><Plus className="h-4 w-4 mr-2" /> Nouvelle facture</Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex items-center gap-3">
            <GroupBySelect options={groupByOptions} value={groupBy} onChange={setGroupBy} />
            <ListViewToggle view={view} onViewChange={setView} />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-4 bg-muted/30 rounded-2xl border border-dashed max-w-2xl mx-auto">
            <ShoppingCart className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Aucune facture d'achat</h3>
            <p className="text-muted-foreground mb-6">Enregistrez les factures reçues de vos fournisseurs.</p>
            <Button onClick={() => setIsFormOpen(true)}><Plus className="h-4 w-4 mr-2" /> Première facture</Button>
          </div>
        ) : (
          Object.entries(grouped).map(([label, items]) => (
            <div key={label} className="space-y-3">
              {label && <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">{label}</h3>}
              {view === "table" ? (
                <div className="border border-border/40 rounded-xl overflow-hidden bg-card">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 border-b border-border/40">
                      <tr>
                        <SortableHeader label="N°" sortKey="number" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort} />
                        <SortableHeader label="Fournisseur" sortKey="supplier" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort} />
                        <SortableHeader label="Date" sortKey="date" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort} />
                        <th className="p-3 text-left font-medium text-muted-foreground">Échéance</th>
                        <SortableHeader label="Montant TTC" sortKey="total_ttc" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort} align="right" />
                        <th className="p-3 text-left font-medium text-muted-foreground">Statut</th>
                        <th className="p-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {items.map((inv: any) => {
                        const sc = statusConfig[inv.status] || { label: inv.status, class: "bg-muted" };
                        return (
                          <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                            <td className="p-3 font-medium">{inv.number}</td>
                            <td className="p-3 text-muted-foreground">{inv.suppliers?.name || "—"}</td>
                            <td className="p-3 text-muted-foreground tabular-nums">{format(new Date(inv.date), "dd/MM/yyyy")}</td>
                            <td className="p-3 text-muted-foreground tabular-nums">{inv.due_date ? format(new Date(inv.due_date), "dd/MM/yyyy") : "—"}</td>
                            <td className="p-3 text-right font-semibold tabular-nums">{Number(inv.total_ttc).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</td>
                            <td className="p-3"><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${sc.class}`}>{sc.label}</span></td>
                            <td className="p-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {inv.status !== "payée" && <DropdownMenuItem onClick={() => markPaid(inv.id)}><CheckCircle2 className="h-4 w-4 mr-2" /> Marquer payée</DropdownMenuItem>}
                                  <DropdownMenuItem onClick={() => setDeleteId(inv.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Supprimer</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {items.map((inv: any) => {
                    const sc = statusConfig[inv.status] || { label: inv.status, class: "bg-muted" };
                    return (
                      <Card key={inv.id} className="border-border/40">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{inv.number}</p>
                              <p className="text-xs text-muted-foreground mt-1">{inv.suppliers?.name || "—"} · {format(new Date(inv.date), "d MMM yyyy", { locale: fr })}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold tabular-nums">{Number(inv.total_ttc).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</p>
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${sc.class}`}>{sc.label}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}

        {/* Form */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Nouvelle facture d'achat</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>N° facture *</Label><Input value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} placeholder="FA-2026-001" /></div>
              <div><Label>Fournisseur</Label>
                <Select value={form.supplier_id || "none"} onValueChange={v => setForm({ ...form, supplier_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {suppliers?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                <div><Label>Échéance</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Total HT (€) *</Label><Input type="number" step="0.01" value={form.total_ht} onChange={e => setForm({ ...form, total_ht: e.target.value })} /></div>
                <div><Label>TVA (%)</Label><Input type="number" value={form.tva_rate} onChange={e => setForm({ ...form, tva_rate: e.target.value })} /></div>
              </div>
              {form.total_ht && <p className="text-sm text-muted-foreground">Total TTC : {(parseFloat(form.total_ht) * (1 + parseFloat(form.tva_rate) / 100)).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</p>}
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
              <Button onClick={handleSubmit} disabled={!form.number || !form.total_ht || createInvoice.isPending}>
                {createInvoice.isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Supprimer cette facture ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={() => { if (deleteId) { deleteInvoice.mutate(deleteId); setDeleteId(null); } }}>Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
