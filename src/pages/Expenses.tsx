import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useExpenses, useCreateExpense, useDeleteExpense } from "@/hooks/use-expenses";
import { useSuppliers } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ListViewToggle } from "@/components/ListViewToggle";
import { GroupBySelect } from "@/components/GroupBySelect";
import { SortableHeader, SortDirection } from "@/components/SortableHeader";
import { Plus, Search, Wallet, Trash2, Edit, MoreVertical, Receipt } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const categories = [
  { key: "transport", label: "Transport", emoji: "🚛" },
  { key: "achat_materiel", label: "Achat matériel", emoji: "📦" },
  { key: "location", label: "Location", emoji: "🔑" },
  { key: "assurance", label: "Assurance", emoji: "🛡️" },
  { key: "personnel", label: "Personnel", emoji: "👷" },
  { key: "marketing", label: "Marketing", emoji: "📢" },
  { key: "logiciel", label: "Logiciel / SaaS", emoji: "💻" },
  { key: "autre", label: "Autre", emoji: "📋" },
];

const groupByOptions = [
  { key: "none", label: "Tous" },
  { key: "category", label: "Catégorie" },
  { key: "month", label: "Mois" },
];

export default function Expenses() {
  const { data: expenses, isLoading } = useExpenses();
  const { data: suppliers } = useSuppliers();
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "table">("table");
  const [groupBy, setGroupBy] = useState("none");
  const [sortKey, setSortKey] = useState<string | null>("expense_date");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({ description: "", amount: "", category: "autre", expense_date: new Date().toISOString().split("T")[0], supplier_id: "", notes: "" });

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    let list = expenses || [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e: any) => e.description?.toLowerCase().includes(q) || e.category?.toLowerCase().includes(q));
    }
    if (sortKey) {
      list = [...list].sort((a: any, b: any) => {
        const av = a[sortKey] ?? "";
        const bv = b[sortKey] ?? "";
        const cmp = sortKey === "amount" ? Number(av) - Number(bv) : String(av).localeCompare(String(bv));
        return sortDir === "desc" ? -cmp : cmp;
      });
    }
    return list;
  }, [expenses, search, sortKey, sortDir]);

  const totalExpenses = filtered.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

  const grouped = useMemo(() => {
    if (groupBy === "none") return { "": filtered };
    const groups: Record<string, any[]> = {};
    filtered.forEach((e: any) => {
      let key: string;
      if (groupBy === "category") {
        const cat = categories.find(c => c.key === e.category);
        key = cat ? `${cat.emoji} ${cat.label}` : "📋 Autre";
      } else {
        key = format(new Date(e.expense_date), "MMMM yyyy", { locale: fr });
      }
      (groups[key] ??= []).push(e);
    });
    return groups;
  }, [filtered, groupBy]);

  const handleSubmit = async () => {
    await createExpense.mutateAsync({
      description: formData.description,
      amount: parseFloat(formData.amount) || 0,
      category: formData.category,
      expense_date: formData.expense_date,
      supplier_id: formData.supplier_id || null,
      notes: formData.notes || null,
    });
    setIsFormOpen(false);
    setFormData({ description: "", amount: "", category: "autre", expense_date: new Date().toISOString().split("T")[0], supplier_id: "", notes: "" });
  };

  const getCategoryLabel = (key: string) => {
    const cat = categories.find(c => c.key === key);
    return cat ? `${cat.emoji} ${cat.label}` : key;
  };

  return (
    <AppLayout>
      <div className="flex-1 space-y-6 animate-fade-in max-w-7xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Dépenses</h1>
            <p className="text-muted-foreground mt-1">
              {filtered.length} dépense{filtered.length > 1 ? "s" : ""} · Total : {totalExpenses.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="shadow-md">
            <Plus className="h-4 w-4 mr-2" /> Nouvelle dépense
          </Button>
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
            <Wallet className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Aucune dépense</h3>
            <p className="text-muted-foreground mb-6">Enregistrez vos dépenses pour suivre vos coûts.</p>
            <Button onClick={() => setIsFormOpen(true)}><Plus className="h-4 w-4 mr-2" /> Première dépense</Button>
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
                        <SortableHeader label="Date" sortKey="expense_date" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort} />
                        <SortableHeader label="Description" sortKey="description" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort} />
                        <th className="p-3 text-left font-medium text-muted-foreground">Catégorie</th>
                        <SortableHeader label="Montant" sortKey="amount" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort} align="right" />
                        <th className="p-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {items.map((e: any) => (
                        <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3 text-muted-foreground tabular-nums">{format(new Date(e.expense_date), "dd/MM/yyyy")}</td>
                          <td className="p-3 font-medium">{e.description}</td>
                          <td className="p-3"><span className="text-xs px-2.5 py-1 rounded-full bg-muted">{getCategoryLabel(e.category)}</span></td>
                          <td className="p-3 text-right font-semibold tabular-nums">{Number(e.amount).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</td>
                          <td className="p-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setDeleteId(e.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Supprimer</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {items.map((e: any) => (
                    <Card key={e.id} className="border-border/40 group relative">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{e.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">{getCategoryLabel(e.category)} · {format(new Date(e.expense_date), "d MMM yyyy", { locale: fr })}</p>
                          </div>
                          <p className="text-lg font-bold tabular-nums">{Number(e.amount).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</p>
                        </div>
                        {e.notes && <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2">{e.notes}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {/* Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Nouvelle dépense</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Description *</Label><Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Ex: Location camion" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Montant (€) *</Label><Input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} /></div>
                <div><Label>Date</Label><Input type="date" value={formData.expense_date} onChange={e => setFormData({ ...formData, expense_date: e.target.value })} /></div>
              </div>
              <div><Label>Catégorie</Label>
                <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.key} value={c.key}>{c.emoji} {c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Fournisseur (optionnel)</Label>
                <Select value={formData.supplier_id || "none"} onValueChange={v => setFormData({ ...formData, supplier_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {suppliers?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
              <Button onClick={handleSubmit} disabled={!formData.description || !formData.amount || createExpense.isPending}>
                {createExpense.isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Supprimer cette dépense ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={() => { if (deleteId) { deleteExpense.mutate(deleteId); setDeleteId(null); } }}>Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
