import { useState, useMemo, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { usePaiements } from "@/hooks/use-data";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Upload, FileSpreadsheet, CheckCircle2, XCircle, Link2, Unlink,
  ArrowRight, Loader2, Trash2, AlertCircle, Search
} from "lucide-react";

interface ParsedTransaction {
  transaction_date: string;
  label: string;
  amount: number;
  reference: string;
}

interface BankTransaction {
  id: string;
  transaction_date: string;
  label: string;
  amount: number;
  reference: string | null;
  bank_name: string | null;
  reconciled_paiement_id: string | null;
  status: string;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; class: string; icon: typeof CheckCircle2 }> = {
  pending: { label: "En attente", class: "bg-warning/10 text-warning", icon: AlertCircle },
  matched: { label: "Rapproché", class: "bg-success/10 text-success", icon: CheckCircle2 },
  ignored: { label: "Ignoré", class: "bg-muted text-muted-foreground", icon: XCircle },
};

function parseCSV(text: string): ParsedTransaction[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  // Detect separator
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/"/g, ""));

  // Try to find columns
  const dateIdx = headers.findIndex(h => /date/.test(h));
  const labelIdx = headers.findIndex(h => /lib[eé]ll[eé]|label|description|intitul/.test(h));
  const amountIdx = headers.findIndex(h => /montant|amount|crédit|credit|débit|debit|valeur/.test(h));
  const creditIdx = headers.findIndex(h => /crédit|credit/.test(h));
  const debitIdx = headers.findIndex(h => /débit|debit/.test(h));
  const refIdx = headers.findIndex(h => /ref|référence|reference/.test(h));

  if (dateIdx === -1 || (amountIdx === -1 && creditIdx === -1)) {
    throw new Error("Colonnes requises introuvables. Attendu: date, libellé, montant (ou crédit/débit)");
  }

  const results: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim().replace(/^"|"$/g, ""));
    if (cols.length < 2) continue;

    const rawDate = cols[dateIdx];
    if (!rawDate) continue;

    // Parse date (DD/MM/YYYY or YYYY-MM-DD)
    let parsedDate: string;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
      const [d, m, y] = rawDate.split("/");
      parsedDate = `${y}-${m}-${d}`;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      parsedDate = rawDate;
    } else {
      continue;
    }

    let amount: number;
    if (creditIdx !== -1 && debitIdx !== -1) {
      const credit = parseFloat((cols[creditIdx] || "0").replace(/\s/g, "").replace(",", ".")) || 0;
      const debit = parseFloat((cols[debitIdx] || "0").replace(/\s/g, "").replace(",", ".")) || 0;
      amount = credit - debit;
    } else {
      amount = parseFloat((cols[amountIdx] || "0").replace(/\s/g, "").replace(",", ".")) || 0;
    }

    if (amount === 0) continue;

    results.push({
      transaction_date: parsedDate,
      label: cols[labelIdx >= 0 ? labelIdx : 1] || "Transaction",
      amount,
      reference: refIdx >= 0 ? cols[refIdx] || "" : "",
    });
  }

  return results;
}

function computeMatchScore(
  tx: BankTransaction,
  paiement: { amount: number; payment_date: string; reference: string | null; factures?: { number?: string; clients?: { name?: string } } | null }
): number {
  let score = 0;

  // Amount match (most important)
  if (Math.abs(tx.amount - Number(paiement.amount)) < 0.01) {
    score += 50;
  } else if (Math.abs(tx.amount - Number(paiement.amount)) < 1) {
    score += 30;
  }

  // Date proximity
  const txDate = new Date(tx.transaction_date).getTime();
  const payDate = new Date(paiement.payment_date).getTime();
  const diffDays = Math.abs(txDate - payDate) / (1000 * 60 * 60 * 24);
  if (diffDays === 0) score += 25;
  else if (diffDays <= 1) score += 20;
  else if (diffDays <= 3) score += 15;
  else if (diffDays <= 7) score += 8;

  // Reference match
  if (tx.reference && paiement.reference) {
    if (tx.reference.toLowerCase().includes(paiement.reference.toLowerCase()) ||
        paiement.reference.toLowerCase().includes(tx.reference.toLowerCase())) {
      score += 20;
    }
  }

  // Label contains client name or invoice number
  const label = tx.label.toLowerCase();
  if (paiement.factures?.clients?.name && label.includes(paiement.factures.clients.name.toLowerCase())) {
    score += 10;
  }
  if (paiement.factures?.number && label.includes(paiement.factures.number.toLowerCase())) {
    score += 15;
  }

  return score;
}

export function BankReconciliation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: paiements = [] } = usePaiements();

  const { data: bankTransactions = [], isLoading } = useQuery({
    queryKey: ["bank_transactions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("bank_transactions")
        .select("*")
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return (data || []) as BankTransaction[];
    },
    enabled: !!user,
  });

  // Compute auto-matches for pending transactions
  const matchSuggestions = useMemo(() => {
    const suggestions: Record<string, { paiementId: string; score: number; paiement: any }> = {};

    const unreconciledPaiements = paiements.filter(p =>
      !bankTransactions.some(bt => bt.reconciled_paiement_id === p.id && bt.status === "matched")
    );

    bankTransactions
      .filter(bt => bt.status === "pending")
      .forEach(bt => {
        let bestMatch: { paiementId: string; score: number; paiement: any } | null = null;

        unreconciledPaiements.forEach(p => {
          const score = computeMatchScore(bt, p as any);
          if (score >= 50 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { paiementId: p.id, score, paiement: p };
          }
        });

        if (bestMatch) {
          suggestions[bt.id] = bestMatch;
        }
      });

    return suggestions;
  }, [bankTransactions, paiements]);

  const importMutation = useMutation({
    mutationFn: async (transactions: ParsedTransaction[]) => {
      const rows = transactions.map(t => ({
        transaction_date: t.transaction_date,
        label: t.label,
        amount: t.amount,
        reference: t.reference || null,
        status: "pending",
      }));

      const { error } = await (supabase as any).from("bank_transactions").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["bank_transactions"] });
      toast.success(`${count} transactions importées`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const reconcileMutation = useMutation({
    mutationFn: async ({ txId, paiementId }: { txId: string; paiementId: string }) => {
      const { error } = await (supabase as any)
        .from("bank_transactions")
        .update({ reconciled_paiement_id: paiementId, status: "matched" })
        .eq("id", txId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank_transactions"] });
      toast.success("Transaction rapprochée");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const unreconcileMutation = useMutation({
    mutationFn: async (txId: string) => {
      const { error } = await (supabase as any)
        .from("bank_transactions")
        .update({ reconciled_paiement_id: null, status: "pending" })
        .eq("id", txId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank_transactions"] });
      toast.success("Rapprochement annulé");
    },
  });

  const ignoreMutation = useMutation({
    mutationFn: async (txId: string) => {
      const { error } = await (supabase as any)
        .from("bank_transactions")
        .update({ status: "ignored" })
        .eq("id", txId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank_transactions"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (txId: string) => {
      const { error } = await (supabase as any)
        .from("bank_transactions")
        .delete()
        .eq("id", txId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank_transactions"] });
      toast.success("Transaction supprimée");
    },
  });

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const transactions = parseCSV(text);
      if (transactions.length === 0) {
        toast.error("Aucune transaction valide trouvée dans le fichier");
        return;
      }
      await importMutation.mutateAsync(transactions);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'import");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [importMutation]);

  const handleAutoReconcileAll = useCallback(async () => {
    const entries = Object.entries(matchSuggestions);
    if (entries.length === 0) {
      toast.info("Aucune correspondance trouvée");
      return;
    }

    for (const [txId, match] of entries) {
      await reconcileMutation.mutateAsync({ txId, paiementId: match.paiementId });
    }
    toast.success(`${entries.length} transactions rapprochées automatiquement`);
  }, [matchSuggestions, reconcileMutation]);

  const filtered = bankTransactions.filter(bt => {
    if (filterStatus !== "all" && bt.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return bt.label.toLowerCase().includes(q) ||
             (bt.reference || "").toLowerCase().includes(q) ||
             String(bt.amount).includes(q);
    }
    return true;
  });

  const stats = useMemo(() => ({
    total: bankTransactions.length,
    pending: bankTransactions.filter(t => t.status === "pending").length,
    matched: bankTransactions.filter(t => t.status === "matched").length,
    ignored: bankTransactions.filter(t => t.status === "ignored").length,
    suggestions: Object.keys(matchSuggestions).length,
  }), [bankTransactions, matchSuggestions]);

  const fmt = (v: number) => v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-4">
      {/* Header with import */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold text-lg">Rapprochement bancaire</h3>
          <p className="text-sm text-muted-foreground">Importez votre relevé CSV et rapprochez les paiements</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl gap-1.5"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Importer CSV
          </Button>
          {stats.suggestions > 0 && (
            <Button
              size="sm"
              className="rounded-xl gap-1.5 bg-success hover:bg-success/90 text-success-foreground"
              onClick={handleAutoReconcileAll}
              disabled={reconcileMutation.isPending}
            >
              {reconcileMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
              Rapprocher auto ({stats.suggestions})
            </Button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border p-3 bg-card text-center">
            <p className="text-lg font-display font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Transactions</p>
          </div>
          <div className="rounded-xl border border-border p-3 bg-card text-center">
            <p className="text-lg font-display font-bold text-warning">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">En attente</p>
          </div>
          <div className="rounded-xl border border-border p-3 bg-card text-center">
            <p className="text-lg font-display font-bold text-success">{stats.matched}</p>
            <p className="text-xs text-muted-foreground">Rapprochées</p>
          </div>
          <div className="rounded-xl border border-border p-3 bg-card text-center">
            <p className="text-lg font-display font-bold text-muted-foreground">{stats.ignored}</p>
            <p className="text-xs text-muted-foreground">Ignorées</p>
          </div>
        </div>
      )}

      {/* Filters */}
      {stats.total > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 h-9 rounded-xl"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 h-9 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="matched">Rapprochées</SelectItem>
              <SelectItem value="ignored">Ignorées</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Empty state */}
      {stats.total === 0 && !isLoading && (
        <Card className="shadow-card border-border/50 border-dashed">
          <CardContent className="p-10 text-center">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h4 className="font-display font-semibold mb-1">Aucune transaction importée</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Importez votre relevé bancaire au format CSV pour commencer le rapprochement.
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Format attendu : colonnes <span className="font-mono bg-muted px-1.5 py-0.5 rounded">date</span>, <span className="font-mono bg-muted px-1.5 py-0.5 rounded">libellé</span>, <span className="font-mono bg-muted px-1.5 py-0.5 rounded">montant</span> (ou <span className="font-mono bg-muted px-1.5 py-0.5 rounded">crédit</span>/<span className="font-mono bg-muted px-1.5 py-0.5 rounded">débit</span>)
            </p>
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" /> Importer un relevé CSV
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Transaction list */}
      {filtered.length > 0 && (
        <Card className="shadow-card border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Libellé</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Montant</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Statut</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Correspondance</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(tx => {
                  const statusConf = STATUS_MAP[tx.status] || STATUS_MAP.pending;
                  const StatusIcon = statusConf.icon;
                  const suggestion = matchSuggestions[tx.id];
                  const matchedPaiement = tx.reconciled_paiement_id
                    ? paiements.find(p => p.id === tx.reconciled_paiement_id)
                    : null;

                  return (
                    <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {new Date(tx.transaction_date).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="p-3">
                        <p className="font-medium truncate max-w-[250px]">{tx.label}</p>
                        {tx.reference && <p className="text-xs text-muted-foreground">{tx.reference}</p>}
                      </td>
                      <td className={cn("p-3 text-right font-semibold whitespace-nowrap tabular-nums", tx.amount > 0 ? "text-success" : "text-destructive")}>
                        {tx.amount > 0 ? "+" : ""}{fmt(tx.amount)} €
                      </td>
                      <td className="p-3">
                        <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full", statusConf.class)}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConf.label}
                        </span>
                      </td>
                      <td className="p-3">
                        {tx.status === "matched" && matchedPaiement && (
                          <div className="text-xs">
                            <p className="font-medium">{(matchedPaiement as any).factures?.number || "Paiement"}</p>
                            <p className="text-muted-foreground">{(matchedPaiement as any).factures?.clients?.name || ""}</p>
                          </div>
                        )}
                        {tx.status === "pending" && suggestion && (
                          <div className="flex items-center gap-2">
                            <div className="text-xs">
                              <p className="font-medium text-primary">{(suggestion.paiement as any).factures?.number || "Paiement"}</p>
                              <p className="text-muted-foreground">{fmt(Number(suggestion.paiement.amount))} € — score {suggestion.score}%</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 rounded-lg text-success hover:bg-success/10"
                              onClick={() => reconcileMutation.mutate({ txId: tx.id, paiementId: suggestion.paiementId })}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                        {tx.status === "pending" && !suggestion && (
                          <span className="text-xs text-muted-foreground italic">Aucune correspondance</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {tx.status === "matched" && (
                            <button
                              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                              title="Annuler le rapprochement"
                              onClick={() => unreconcileMutation.mutate(tx.id)}
                            >
                              <Unlink className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          )}
                          {tx.status === "pending" && (
                            <button
                              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                              title="Ignorer"
                              onClick={() => ignoreMutation.mutate(tx.id)}
                            >
                              <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          )}
                          <button
                            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                            title="Supprimer"
                            onClick={() => deleteMutation.mutate(tx.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
