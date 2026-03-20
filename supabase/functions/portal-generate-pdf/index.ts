import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlToBytes(str: string) {
    const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
    return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function verifyHs256(token: string, secret: string) {
    const [header, payload, signature] = token.split(".");
    if (!header || !payload || !signature) return null;
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("HMAC", key, b64urlToBytes(signature), enc.encode(`${header}.${payload}`));
    if (!ok) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return JSON.parse(dec.decode(b64urlToBytes(payload))) as any;
}

// ── Exact same helpers & types as generate-pdf ──────────────────────────────
function sanitize(s: string): string {
    return (s || "")
        .replace(/[\u00A0\u202F\u2009\u2007\u2008]/g, " ")
        .replace(/\u2014/g, "-").replace(/\u2013/g, "-")
        .replace(/\u2018|\u2019/g, "'").replace(/\u201C|\u201D/g, '"');
}
function fmt(n: number): string { return sanitize(n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })); }
function fmtDate(d: string): string { return sanitize(new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })); }

interface LineItem { description: string; quantity: number; unit_price: number; sort_order: number; }
interface DocumentData {
    number: string; date: string; valid_until?: string; due_date?: string; status: string;
    total_ht: number; tva_rate: number; total_ttc: number; notes?: string;
    client_name?: string; client_email?: string; client_company?: string; client_address?: string; client_phone?: string;
    items: LineItem[];
    emitter_name?: string; emitter_company?: string; emitter_siret?: string; emitter_address?: string;
    emitter_phone?: string; emitter_email?: string; emitter_logo_url?: string; emitter_iban?: string; emitter_bic?: string;
    signature_data?: string; signed_at?: string;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const words = sanitize(text).split(" ");
    const lines: string[] = [];
    let currentLine = "";
    for (const word of words) {
        const test = currentLine ? `${currentLine} ${word}` : word;
        if (font.widthOfTextAtSize(test, size) > maxWidth) { if (currentLine) lines.push(currentLine); currentLine = word; }
        else { currentLine = test; }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
}

function safeText(page: PDFPage, text: string, opts: { x: number; y: number; size: number; font: PDFFont; color: ReturnType<typeof rgb> }) {
    page.drawText(sanitize(text), opts);
}

function drawHLine(page: PDFPage, x1: number, x2: number, y: number, color = rgb(0.85, 0.85, 0.85), thickness = 0.5) {
    page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color });
}

// ── Exact copy of generatePdfBytes from generate-pdf/index.ts ───────────────
async function generatePdfBytes(type: "devis" | "facture", data: DocumentData): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    let page = doc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique);

    const dark = rgb(0.1, 0.1, 0.1);
    const textDark = rgb(0.2, 0.2, 0.2);
    const gray = rgb(0.45, 0.45, 0.45);
    const lightGray = rgb(0.6, 0.6, 0.6);
    const borderGray = rgb(0.85, 0.85, 0.85);
    const tableHeaderBg = rgb(0.96, 0.96, 0.96);

    const margin = 45;
    const contentWidth = width - 2 * margin;
    const rightCol = width - margin;
    let y = height - margin;
    let pageNum = 1;

    const ensureSpace = (needed: number) => {
        if (y < margin + needed) {
            drawPageFooter(page, pageNum); pageNum++;
            page = doc.addPage([595.28, 841.89]); y = height - margin;
        }
    };

    const drawPageFooter = (p: PDFPage, num: number) => {
        const footerY = 25;
        const companyLine = sanitize([data.emitter_company, data.emitter_siret ? `SIRET : ${data.emitter_siret}` : ""].filter(Boolean).join(" | "));
        if (companyLine) p.drawText(companyLine, { x: margin, y: footerY, size: 7, font: fontRegular, color: lightGray });
        const pageText = `${num}`;
        p.drawText(pageText, { x: rightCol - fontRegular.widthOfTextAtSize(pageText, 7), y: footerY, size: 7, font: fontRegular, color: lightGray });
    };

    let logoBottomY = y;
    if (data.emitter_logo_url) {
        try {
            const logoResponse = await fetch(data.emitter_logo_url);
            if (logoResponse.ok) {
                const logoBytes = new Uint8Array(await logoResponse.arrayBuffer());
                const contentType = logoResponse.headers.get("content-type") || "";
                let logoImage;
                if (contentType.includes("png")) { logoImage = await doc.embedPng(logoBytes); }
                else { logoImage = await doc.embedJpg(logoBytes); }
                const logoDims = logoImage.scaleToFit(120, 60);
                page.drawImage(logoImage, { x: margin, y: y - logoDims.height, width: logoDims.width, height: logoDims.height });
                logoBottomY = y - logoDims.height - 15;
            }
        } catch { /* skip logo */ }
    } else {
        if (data.emitter_company) {
            safeText(page, data.emitter_company, { x: margin, y: y - 20, size: 24, font: fontBold, color: dark });
            logoBottomY = y - 35;
        }
    }

    const rightPanelX = width / 2 + 30;
    let rightY = y - 10;

    safeText(page, "Emetteur ou Emettrice", { x: rightPanelX, y: rightY, size: 8, font: fontRegular, color: gray });
    rightY -= 12;
    const emitterLines = [data.emitter_company || data.emitter_name || "", data.emitter_address || "", data.emitter_email || "", data.emitter_phone || ""].filter(Boolean);
    for (let i = 0; i < emitterLines.length; i++) {
        safeText(page, emitterLines[i], { x: rightPanelX, y: rightY, size: 9, font: i === 0 ? fontBold : fontRegular, color: textDark });
        rightY -= 12;
    }

    rightY -= 15;
    safeText(page, "Client ou Cliente", { x: rightPanelX, y: rightY, size: 8, font: fontRegular, color: gray });
    rightY -= 12;
    const clientLines = [data.client_company || data.client_name || "", data.client_address || "", data.client_email || "", data.client_phone || ""].filter(Boolean);
    for (let i = 0; i < clientLines.length; i++) {
        safeText(page, clientLines[i], { x: rightPanelX, y: rightY, size: 9, font: i === 0 ? fontBold : fontRegular, color: textDark });
        rightY -= 12;
    }

    let leftY = logoBottomY;
    const typeLabel = type === "devis" ? "Devis" : "Facture";
    safeText(page, typeLabel, { x: margin, y: leftY, size: 18, font: fontRegular, color: textDark });
    leftY -= 20;

    const infoItems: [string, string][] = [["Numero", sanitize(data.number)], ["Date d'emission", fmtDate(data.date)]];
    if (type === "devis" && data.valid_until) infoItems.push(["Date d'expiration", fmtDate(data.valid_until)]);
    if (type === "facture" && data.due_date) infoItems.push(["Date d'echeance", fmtDate(data.due_date)]);
    for (const [label, value] of infoItems) {
        safeText(page, label, { x: margin, y: leftY, size: 9, font: fontBold, color: textDark });
        safeText(page, value, { x: margin + 90, y: leftY, size: 9, font: fontRegular, color: textDark });
        leftY -= 14;
    }

    y = Math.min(leftY, rightY) - 30;

    const mainTitle = type === "devis" ? "DEVIS" : "FACTURE";
    safeText(page, mainTitle, { x: margin, y, size: 14, font: fontBold, color: dark });
    y -= 25;

    ensureSpace(80);
    const cols = { desc: margin, qty: margin + 220, pu: margin + 280, tva: margin + 350, totalHt: margin + 410, totalTtc: margin + 475 };
    const tblRight = rightCol;

    page.drawRectangle({ x: margin, y: y - 6, width: contentWidth, height: 24, color: tableHeaderBg });
    const headerColor = textDark;
    safeText(page, "Produits", { x: cols.desc + 4, y, size: 9, font: fontBold, color: headerColor });
    safeText(page, "Qte", { x: cols.qty, y, size: 9, font: fontBold, color: headerColor });
    safeText(page, "Prix u. HT", { x: cols.pu, y, size: 9, font: fontBold, color: headerColor });
    safeText(page, "TVA (%)", { x: cols.tva, y, size: 9, font: fontBold, color: headerColor });
    safeText(page, "Total HT", { x: cols.totalHt, y, size: 9, font: fontBold, color: headerColor });
    safeText(page, "Total TTC", { x: cols.totalTtc, y, size: 9, font: fontBold, color: headerColor });
    y -= 24;

    const tvaPercent = `${Math.round(data.tva_rate * 100)}%`;
    const sortedItems = [...data.items].sort((a, b) => a.sort_order - b.sort_order);

    for (const item of sortedItems) {
        ensureSpace(30);
        const lineHt = item.quantity * item.unit_price;
        const lineTtc = lineHt * (1 + data.tva_rate);
        const descLines = wrapText(item.description, fontRegular, 9, 200);
        safeText(page, descLines[0] || "", { x: cols.desc + 4, y, size: 9, font: fontRegular, color: textDark });
        safeText(page, `${item.quantity}`, { x: cols.qty, y, size: 9, font: fontRegular, color: textDark });
        safeText(page, `${fmt(item.unit_price)} EUR`, { x: cols.pu, y, size: 9, font: fontRegular, color: textDark });
        safeText(page, tvaPercent, { x: cols.tva, y, size: 9, font: fontRegular, color: textDark });
        safeText(page, `${fmt(lineHt)} EUR`, { x: cols.totalHt, y, size: 9, font: fontRegular, color: textDark });
        safeText(page, `${fmt(lineTtc)} EUR`, { x: cols.totalTtc, y, size: 9, font: fontBold, color: textDark });
        y -= 14;
        for (let i = 1; i < descLines.length; i++) {
            safeText(page, descLines[i], { x: cols.desc + 4, y, size: 8, font: fontRegular, color: gray });
            y -= 12;
        }
        y -= 8;
        drawHLine(page, margin, tblRight, y + 4, borderGray);
    }

    ensureSpace(80);
    y -= 10;
    const tvaAmount = data.total_ht * data.tva_rate;
    const totalsX = cols.totalHt - 60;
    const totalsValX = rightCol;
    let ty = y;

    const drawRecapLine = (label: string, value: string, bold = false) => {
        const font = bold ? fontBold : fontRegular;
        const sz = bold ? 10 : 9;
        safeText(page, label, { x: totalsX, y: ty, size: 9, font, color: textDark });
        const valW = font.widthOfTextAtSize(sanitize(value), sz);
        safeText(page, value, { x: totalsValX - valW, y: ty, size: sz, font, color: textDark });
        ty -= 18;
    };

    drawRecapLine("Total HT", `${fmt(data.total_ht)} EUR`);
    drawRecapLine(`TVA (${tvaPercent})`, `${fmt(tvaAmount)} EUR`);
    ty -= 4;
    drawHLine(page, totalsX, totalsValX, ty + 12, borderGray);
    drawRecapLine("Total TTC", `${fmt(data.total_ttc)} EUR`, true);
    y = Math.min(y - 20, ty - 10);

    if (data.notes) {
        ensureSpace(50); y -= 10;
        safeText(page, "Notes", { x: margin, y, size: 9, font: fontBold, color: textDark }); y -= 14;
        const noteLines = wrapText(data.notes, fontRegular, 8, contentWidth);
        for (const line of noteLines) { ensureSpace(15); safeText(page, line, { x: margin, y, size: 8, font: fontRegular, color: gray }); y -= 12; }
    }

    if (data.emitter_iban || data.emitter_bic) {
        ensureSpace(60); y -= 15;
        safeText(page, "Coordonnees bancaires", { x: margin, y, size: 9, font: fontBold, color: textDark }); y -= 16;
        let bankInfoY = y;
        if (data.emitter_company) { safeText(page, "Titulaire du compte:", { x: margin, y: bankInfoY, size: 8, font: fontBold, color: gray }); safeText(page, data.emitter_company, { x: margin + 110, y: bankInfoY, size: 8, font: fontRegular, color: textDark }); bankInfoY -= 14; }
        if (data.emitter_iban) { safeText(page, "IBAN:", { x: margin, y: bankInfoY, size: 8, font: fontBold, color: gray }); safeText(page, data.emitter_iban, { x: margin + 110, y: bankInfoY, size: 8, font: fontRegular, color: textDark }); bankInfoY -= 14; }
        if (data.emitter_bic) { safeText(page, "BIC / SWIFT:", { x: margin, y: bankInfoY, size: 8, font: fontBold, color: gray }); safeText(page, data.emitter_bic, { x: margin + 110, y: bankInfoY, size: 8, font: fontRegular, color: textDark }); bankInfoY -= 14; }
        y = bankInfoY;
    }

    ensureSpace(60); y -= 15;
    const legalLines = [
        "Penalites de retard : trois fois le taux annuel d'interet legal en vigueur calcule depuis la date d'echeance jusqu'au complet paiement du prix.",
        "Indemnite forfaitaire pour frais de recouvrement en cas de retard de paiement : 40 EUR",
    ];
    for (const line of legalLines) {
        const wrapped = wrapText(line, fontRegular, 7, contentWidth);
        for (const wl of wrapped) { ensureSpace(12); safeText(page, wl, { x: margin, y, size: 7, font: fontItalic, color: gray }); y -= 10; }
    }

    if (type === "devis") {
        ensureSpace(100); y -= 25;
        safeText(page, "Date et signature precedees de la mention", { x: margin, y, size: 8, font: fontRegular, color: gray }); y -= 12;
        safeText(page, "Bon pour accord", { x: margin, y, size: 9, font: fontBold, color: textDark }); y -= 20;
        if (data.signature_data && data.signature_data.startsWith("data:image")) {
            try {
                const base64Data = data.signature_data.split(",")[1];
                const sigBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
                const sigImage = await doc.embedPng(sigBytes);
                const sigDims = sigImage.scaleToFit(180, 70);
                page.drawImage(sigImage, { x: margin, y: y - sigDims.height, width: sigDims.width, height: sigDims.height });
                y -= sigDims.height + 8;
                if (data.signed_at) { safeText(page, `Signe le ${fmtDate(data.signed_at)}`, { x: margin, y, size: 8, font: fontItalic, color: gray }); y -= 12; }
            } catch { /* signature embed failed */ }
        } else {
            page.drawRectangle({ x: margin, y: y - 60, width: 220, height: 60, borderColor: borderGray, borderWidth: 1, color: rgb(0.98, 0.98, 0.98) });
            y -= 65;
        }
    }

    drawPageFooter(page, pageNum);
    return await doc.save();
}

// ── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const { token, factureId, devisId, type: reqType } = await req.json();
        // type defaults: factureId → "facture", devisId → "devis"
        const docType: "devis" | "facture" = reqType ?? (devisId ? "devis" : "facture");
        const docId = devisId ?? factureId;

        if (!token || !docId) return new Response(JSON.stringify({ error: "token + factureId or devisId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        const secret = Deno.env.get("CLIENT_PORTAL_JWT_SECRET");
        if (!secret) throw new Error("CLIENT_PORTAL_JWT_SECRET missing");

        const payload = await verifyHs256(token, secret);
        if (!payload) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (payload.exp && Number(payload.exp) < Math.floor(Date.now() / 1000)) return new Response(JSON.stringify({ error: "Token expired" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const { data: session } = await admin.from("client_portal_sessions").select("client_id, team_id").eq("id", payload.sid).maybeSingle();
        if (!session) return new Response(JSON.stringify({ error: "Session invalide" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        // Fetch emitter info via team admin
        const { data: teamMember } = await admin.from("team_members").select("user_id, profiles(*)").eq("team_id", session.team_id).eq("role", "admin").limit(1).maybeSingle();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const profile = (teamMember as any)?.profiles as any;

        let docData: DocumentData;

        if (docType === "devis") {
            const { data: devis, error: dErr } = await admin.from("devis").select("*, clients(name, email, company, address, phone)").eq("id", docId).eq("client_id", session.client_id).maybeSingle();
            if (dErr || !devis) return new Response(JSON.stringify({ error: "Devis introuvable" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            const { data: items } = await admin.from("devis_items").select("*").eq("devis_id", docId).order("sort_order");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const client = devis.clients as any;
            docData = {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                number: devis.number, date: devis.date, valid_until: (devis as any).valid_until, status: devis.status,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                total_ht: Number(devis.total_ht), tva_rate: Number((devis as any).tva_rate), total_ttc: Number(devis.total_ttc),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                notes: (devis as any).notes,
                client_name: client?.name, client_email: client?.email, client_company: client?.company, client_address: client?.address, client_phone: client?.phone,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                items: (items || []).map((i: any) => ({ description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price), sort_order: i.sort_order })),
                emitter_name: profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : undefined,
                emitter_company: profile?.company_name, emitter_siret: profile?.siret, emitter_address: profile?.address,
                emitter_phone: profile?.phone, emitter_logo_url: profile?.company_logo_url, emitter_iban: profile?.iban, emitter_bic: profile?.bic,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                signature_data: (devis as any).signature_data, signed_at: (devis as any).signed_at,
            };
        } else {
            const { data: facture, error: fErr } = await admin.from("factures").select("*, clients(name, email, company, address, phone)").eq("id", docId).eq("client_id", session.client_id).maybeSingle();
            if (fErr || !facture) return new Response(JSON.stringify({ error: "Facture introuvable" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            const { data: items } = await admin.from("facture_items").select("*").eq("facture_id", docId).order("sort_order");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const client = facture.clients as any;
            docData = {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                number: facture.number, date: facture.date, due_date: (facture as any).due_date, status: facture.status,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                total_ht: Number(facture.total_ht), tva_rate: Number((facture as any).tva_rate), total_ttc: Number(facture.total_ttc),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                notes: (facture as any).notes,
                client_name: client?.name, client_email: client?.email, client_company: client?.company, client_address: client?.address, client_phone: client?.phone,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                items: (items || []).map((i: any) => ({ description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price), sort_order: i.sort_order })),
                emitter_name: profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : undefined,
                emitter_company: profile?.company_name, emitter_siret: profile?.siret, emitter_address: profile?.address,
                emitter_phone: profile?.phone, emitter_logo_url: profile?.company_logo_url, emitter_iban: profile?.iban, emitter_bic: profile?.bic,
            };
        }

        const pdfBytes = await generatePdfBytes(docType, docData);
        return new Response(new Uint8Array(pdfBytes), {
            headers: { ...corsHeaders, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${sanitize(docData.number)}.pdf"` },
        });
    } catch (err: unknown) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
});
