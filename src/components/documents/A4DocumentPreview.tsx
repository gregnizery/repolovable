import { useMemo, useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, Trash2 } from "lucide-react";

export interface A4LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal?: number;
}

export interface A4DocumentData {
  type: "devis" | "facture" | "facture_fournisseur";
  number: string;
  date: string;
  validUntil?: string;
  dueDate?: string;
  status?: string;
  notes?: string;
  tvaRate: number;
  items: A4LineItem[];
  emitterName?: string;
  emitterCompany?: string;
  emitterSiret?: string;
  emitterAddress?: string;
  emitterPhone?: string;
  emitterEmail?: string;
  emitterLogoUrl?: string;
  emitterIban?: string;
  emitterBic?: string;
  accentColor?: string;
  recipientLabel?: string;
  recipientName?: string;
  recipientCompany?: string;
  recipientAddress?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  subtotalHT?: number;
  discountAmount?: number;
  discountLabel?: string;
  totalHT?: number;
  tvaAmount?: number;
  totalTTC?: number;
  // Interactions
  onClickField?: (field: string) => void;
  activeField?: string | null;
  // Inline editing callbacks
  editable?: boolean;
  // Client selection
  onSelectClient?: (id: string) => void;
  clients?: { id: string; name: string; company?: string | null }[];
  onChangeNotes?: (notes: string) => void;
  onChangeDate?: (date: string) => void;
  onChangeValidUntil?: (date: string) => void;
  onChangeDueDate?: (date: string) => void;
  onChangeItem?: (index: number, field: keyof A4LineItem, value: string | number) => void;
  onAddItem?: () => void;
  onRemoveItem?: (index: number) => void;
}

const typeLabels = { devis: "DEVIS", facture: "FACTURE", facture_fournisseur: "FACTURE FOURNISSEUR" };

function fmtPrice(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string) {
  try {
    return format(new Date(d), "d MMMM yyyy", { locale: fr });
  } catch {
    return d;
  }
}

/* Tiny inline editable text */
function InlineText({
  value,
  onChange,
  placeholder,
  className,
  multiline,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  if (!editing) {
    return (
      <span
        className={cn(
          "inline-block min-w-[30px] cursor-text rounded px-0.5 -mx-0.5 transition-colors hover:bg-primary/10",
          !value && "text-gray-300 italic",
          className,
        )}
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      >
        {value || placeholder || "—"}
      </span>
    );
  }

  const commit = () => { onChange(draft); setEditing(false); };

  if (multiline) {
    return (
      <textarea
        ref={ref as any}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
        className={cn("w-full resize-none rounded border border-primary/30 bg-primary/10 px-1 py-0.5 text-black outline-none", className)}
        rows={3}
        onClick={e => e.stopPropagation()}
      />
    );
  }

  return (
    <input
      ref={ref as any}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
      className={cn("rounded border border-primary/30 bg-primary/10 px-1 py-0.5 text-black outline-none", className)}
      style={{ width: Math.max(40, (draft.length + 2) * 6) + "px" }}
      onClick={e => e.stopPropagation()}
    />
  );
}

/* Inline editable number */
function InlineNumber({
  value,
  onChange,
  className,
  suffix,
  min = 0,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
  suffix?: string;
  min?: number;
  step?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(String(value)); }, [value]);
  useEffect(() => { if (editing) { ref.current?.focus(); ref.current?.select(); } }, [editing]);

  if (!editing) {
    return (
      <span
        className={cn("cursor-text rounded px-0.5 -mx-0.5 transition-colors hover:bg-primary/10", className)}
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      >
        {suffix ? `${fmtPrice(value)} ${suffix}` : value}
      </span>
    );
  }

  const commit = () => {
    const parsed = step < 1 ? parseFloat(draft) : parseInt(draft);
    onChange(Math.max(min, isNaN(parsed) ? 0 : parsed));
    setEditing(false);
  };

  return (
    <input
      ref={ref}
      type="number"
      value={draft}
      min={min}
      step={step}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(String(value)); setEditing(false); } }}
      className={cn("w-[70px] rounded border border-primary/30 bg-primary/10 px-1 py-0.5 text-black outline-none", className)}
      onClick={e => e.stopPropagation()}
    />
  );
}

/* Inline date input */
function InlineDateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  if (!editing) {
    return (
      <span
        className="cursor-text rounded px-0.5 -mx-0.5 transition-colors hover:bg-primary/10"
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      >
        {value ? fmtDate(value) : "—"}
      </span>
    );
  }

  return (
    <input
      ref={ref}
      type="date"
      value={value}
      onChange={e => { onChange(e.target.value); setEditing(false); }}
      onBlur={() => setEditing(false)}
      className="rounded border border-primary/30 bg-primary/10 px-1 py-0.5 text-[9px] text-black outline-none"
      onClick={e => e.stopPropagation()}
    />
  );
}

export function A4DocumentPreview({ data }: { data: A4DocumentData }) {
  const editable = data.editable ?? false;
  const accentColor = data.accentColor || "hsl(var(--primary))";

  const totals = useMemo(() => {
    const subtotalHT = data.subtotalHT ?? data.items.reduce((sum, item) => sum + (item.lineTotal ?? item.quantity * item.unitPrice), 0);
    const discountAmount = data.discountAmount ?? 0;
    const totalHT = data.totalHT ?? Math.max(0, subtotalHT - discountAmount);
    const tva = data.tvaAmount ?? totalHT * data.tvaRate;
    const totalTTC = data.totalTTC ?? totalHT + tva;
    return { subtotalHT, discountAmount, totalHT, tva, totalTTC };
  }, [data.items, data.tvaRate]);

  const clickable = (field: string) =>
    data.onClickField && !editable
      ? {
          onClick: () => data.onClickField!(field),
          className: cn(
            "cursor-pointer rounded px-1 -mx-1 transition-colors hover:bg-primary/10",
            data.activeField === field && "bg-primary/10 ring-1 ring-primary/30"
          ),
        }
      : {};

  return (
    <div className="w-full flex justify-center">
      <div
        className="bg-white text-black shadow-2xl border border-border/30 origin-top"
        style={{
          width: "595px",
          minHeight: "842px",
          fontFamily: "Helvetica, Arial, sans-serif",
          fontSize: "10px",
          lineHeight: "1.4",
          padding: "45px",
          position: "relative",
        }}
      >
        {/* HEADER */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex-1">
            {data.emitterLogoUrl ? (
              <img
                src={data.emitterLogoUrl}
                alt="Logo"
                className="max-w-[110px] max-h-[55px] object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : data.emitterCompany ? (
              <div className="text-[16px] font-bold text-gray-800">
                {data.emitterCompany}
              </div>
            ) : null}
          </div>
          <div
            className="px-4 py-1.5 text-white font-bold text-[14px] tracking-wide"
            style={{ backgroundColor: accentColor }}
          >
            {typeLabels[data.type]}
          </div>
        </div>

        {/* EMITTER + RECIPIENT */}
        <div className="flex justify-between mb-6 gap-8">
          <div className="flex-1 space-y-0.5" {...clickable("emitter")}>
            <div className="text-[8px] font-bold uppercase tracking-widest text-gray-400 mb-1">Émetteur</div>
            {data.emitterCompany && <div className="font-bold text-[11px]">{data.emitterCompany}</div>}
            {data.emitterName && <div className="text-gray-600">{data.emitterName}</div>}
            {data.emitterAddress && <div className="text-gray-500 whitespace-pre-line">{data.emitterAddress}</div>}
            {data.emitterPhone && <div className="text-gray-500">{data.emitterPhone}</div>}
            {data.emitterEmail && <div className="text-gray-500">{data.emitterEmail}</div>}
            {data.emitterSiret && <div className="text-gray-400 text-[9px]">SIRET : {data.emitterSiret}</div>}
          </div>

          <div className="flex-1 space-y-0.5" {...clickable("recipient")}>
            <div className="text-[8px] font-bold uppercase tracking-widest text-gray-400 mb-1">
              {data.recipientLabel || "Client"}
            </div>
            {data.recipientName ? (
              <>
                <div className="font-bold text-[11px]">{data.recipientName}</div>
                {data.recipientCompany && <div className="text-gray-600">{data.recipientCompany}</div>}
                {data.recipientAddress && <div className="text-gray-500 whitespace-pre-line">{data.recipientAddress}</div>}
                {data.recipientEmail && <div className="text-gray-500">{data.recipientEmail}</div>}
                {data.recipientPhone && <div className="text-gray-500">{data.recipientPhone}</div>}
                {editable && data.onSelectClient && data.clients && (
                  <select
                    className="mt-1 w-full cursor-pointer rounded border border-dashed border-gray-300 bg-transparent px-1 py-0.5 text-[9px] outline-none hover:border-[hsl(var(--primary))]"
                    value=""
                    onChange={(e) => { if (e.target.value) data.onSelectClient!(e.target.value); }}
                    onClick={e => e.stopPropagation()}
                  >
                    <option value="">Changer de client…</option>
                    {data.clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>
                    ))}
                  </select>
                )}
              </>
            ) : editable && data.onSelectClient && data.clients ? (
              <select
                className="w-full cursor-pointer rounded border border-dashed border-gray-200 bg-transparent p-2 text-[10px] text-gray-400 outline-none hover:border-[hsl(var(--primary))]"
                value=""
                onChange={(e) => { if (e.target.value) data.onSelectClient!(e.target.value); }}
                onClick={e => e.stopPropagation()}
              >
                <option value="">Sélectionner un client…</option>
                {data.clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>
                ))}
              </select>
            ) : (
              <div
                className="cursor-pointer rounded border border-dashed border-gray-200 p-3 text-center text-[10px] italic text-gray-300 hover:bg-primary/5"
                onClick={() => data.onClickField?.("recipient")}
              >
                Cliquez pour sélectionner un client
              </div>
            )}
          </div>
        </div>

        {/* DOCUMENT INFO */}
        <div className="flex gap-6 mb-6 text-[9px]">
          <div>
            <span className="text-gray-400 uppercase tracking-wider font-bold">N° </span>
            <span className="font-bold text-[11px]">{data.number || "—"}</span>
          </div>
          <div>
            <span className="text-gray-400 uppercase tracking-wider font-bold">Date </span>
            {editable && data.onChangeDate ? (
              <InlineDateField value={data.date} onChange={data.onChangeDate} />
            ) : (
              <span>{data.date ? fmtDate(data.date) : "—"}</span>
            )}
          </div>
          {data.type === "devis" && (
            <div>
              <span className="text-gray-400 uppercase tracking-wider font-bold">Valide jusqu'au </span>
              {editable && data.onChangeValidUntil ? (
                <InlineDateField value={data.validUntil || ""} onChange={data.onChangeValidUntil} />
              ) : (
                <span>{data.validUntil ? fmtDate(data.validUntil) : "—"}</span>
              )}
            </div>
          )}
          {data.type !== "devis" && (
            <div>
              <span className="text-gray-400 uppercase tracking-wider font-bold">Échéance </span>
              {editable && data.onChangeDueDate ? (
                <InlineDateField value={data.dueDate || ""} onChange={data.onChangeDueDate} />
              ) : (
                <span>{data.dueDate ? fmtDate(data.dueDate) : "—"}</span>
              )}
            </div>
          )}
        </div>

        {/* TABLE */}
        <div className="mb-6">
          <div
            className="grid gap-2 py-2 px-2 text-[8px] font-bold uppercase tracking-wider text-gray-500"
            style={{ gridTemplateColumns: editable ? "1fr 60px 90px 90px 24px" : "1fr 60px 90px 90px", backgroundColor: "#f2f2f2" }}
          >
            <div>Description</div>
            <div className="text-center">Qté</div>
            <div className="text-right">Prix unit. HT</div>
            <div className="text-right">Total HT</div>
            {editable && <div />}
          </div>

          {data.items.length === 0 ? (
            <div
              className="cursor-pointer border-b border-gray-100 py-6 text-center italic text-gray-300 hover:bg-primary/5"
              onClick={() => editable ? data.onAddItem?.() : data.onClickField?.("items")}
            >
              {editable ? "+ Ajouter une ligne" : "Cliquez pour ajouter des lignes"}
            </div>
          ) : (
            data.items.map((item, idx) => (
              <div
                key={idx}
                className={cn(
                  "grid gap-2 py-2 px-2 border-b border-gray-100 transition-colors",
                  editable ? "hover:bg-primary/5" : "hover:bg-primary/5",
                  data.activeField === `item-${idx}` && "bg-primary/10"
                )}
                style={{ gridTemplateColumns: editable ? "1fr 60px 90px 90px 24px" : "1fr 60px 90px 90px" }}
                onClick={() => !editable && data.onClickField?.(`item-${idx}`)}
              >
                <div className="text-gray-700">
                  {editable && data.onChangeItem ? (
                    <InlineText
                      value={item.description}
                      onChange={v => data.onChangeItem!(idx, "description", v)}
                      placeholder="Description…"
                    />
                  ) : (
                    item.description || <span className="text-gray-300 italic">Description…</span>
                  )}
                </div>
                <div className="text-center text-gray-600">
                  {editable && data.onChangeItem ? (
                    <InlineNumber value={item.quantity} onChange={v => data.onChangeItem!(idx, "quantity", v)} min={1} className="w-[40px] text-center" />
                  ) : item.quantity}
                </div>
                <div className="text-right text-gray-600">
                  {editable && data.onChangeItem ? (
                    <InlineNumber value={item.unitPrice} onChange={v => data.onChangeItem!(idx, "unitPrice", v)} suffix="EUR" step={0.01} className="w-[60px] text-right" />
                  ) : `${fmtPrice(item.unitPrice)} EUR`}
                </div>
                <div className="text-right font-semibold">{fmtPrice(item.lineTotal ?? item.quantity * item.unitPrice)} EUR</div>
                {editable && (
                  <div className="flex items-center justify-center">
                    {data.items.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); data.onRemoveItem?.(idx); }}
                        className="text-gray-300 hover:text-red-500 transition-colors p-0.5 rounded hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}

          {/* Add row button in editable mode */}
          {editable && data.onAddItem && data.items.length > 0 && (
            <div
              className="flex cursor-pointer items-center justify-center gap-1 border-b border-gray-100 py-2 text-center text-[9px] text-gray-400 transition-colors hover:bg-primary/5 hover:text-[hsl(var(--primary))]"
              onClick={data.onAddItem}
            >
              <Plus className="h-3 w-3" /> Ajouter une ligne
            </div>
          )}
        </div>

        {/* TOTALS */}
        <div className="flex justify-end mb-6" {...clickable("totals")}>
          <div className="w-[240px] space-y-1.5">
            <div className="flex justify-between text-gray-600">
              <span>Sous-total HT</span>
              <span className="font-semibold">{fmtPrice(totals.subtotalHT)} EUR</span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>{data.discountLabel || "Remise"}</span>
                <span>-{fmtPrice(totals.discountAmount)} EUR</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Net HT</span>
              <span>{fmtPrice(totals.totalHT)} EUR</span>
            </div>
            {data.tvaRate > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>TVA ({(data.tvaRate * 100).toFixed(0)}%)</span>
                <span>{fmtPrice(totals.tva)} EUR</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-[12px] pt-2 border-t border-gray-300">
              <span>{data.tvaRate > 0 ? "Total TTC" : "Total"}</span>
              <span style={{ color: accentColor }}>{fmtPrice(totals.totalTTC)} EUR</span>
            </div>
          </div>
        </div>

        {/* NOTES */}
        {editable ? (
          <div className="mb-6">
            <div className="text-[8px] font-bold uppercase tracking-widest text-gray-400 mb-1">Notes & conditions</div>
            <InlineText
              value={data.notes || ""}
              onChange={v => data.onChangeNotes?.(v)}
              placeholder="+ Ajouter des notes ou conditions"
              multiline
              className="text-gray-500 text-[9px] w-full"
            />
          </div>
        ) : data.notes ? (
          <div className="mb-6" {...clickable("notes")}>
            <div className="text-[8px] font-bold uppercase tracking-widest text-gray-400 mb-1">Notes & conditions</div>
            <div className="text-gray-500 text-[9px] whitespace-pre-line">{data.notes}</div>
          </div>
        ) : (
          <div
            className="mb-6 cursor-pointer rounded border border-dashed border-gray-200 py-3 text-center text-[9px] italic text-gray-300 hover:bg-primary/5"
            onClick={() => data.onClickField?.("notes")}
          >
            + Ajouter des notes ou conditions
          </div>
        )}

        {/* BANK INFO */}
        {(data.emitterIban || data.emitterBic) && (
          <div className="mb-4" {...clickable("bank")}>
            <div className="text-[8px] font-bold uppercase tracking-widest text-gray-400 mb-1">Coordonnées bancaires</div>
            <div className="text-[9px] text-gray-500 space-y-0.5">
              {data.emitterIban && <div>IBAN : {data.emitterIban}</div>}
              {data.emitterBic && <div>BIC : {data.emitterBic}</div>}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="absolute bottom-6 left-[45px] right-[45px] text-[6.5px] text-gray-400 flex justify-between">
          <span>{[data.emitterCompany, data.emitterSiret ? `SIRET : ${data.emitterSiret}` : ""].filter(Boolean).join(" | ")}</span>
          <span>1</span>
        </div>
      </div>
    </div>
  );
}
