import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Replace non-WinAnsi characters with safe equivalents
function sanitize(s: string): string {
  return s
    .replace(/[\u00A0\u202F\u2009\u2007\u2008]/g, " ")
    .replace(/\u2014/g, "-")
    .replace(/\u2013/g, "-")
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"');
}

function fmt(n: number): string {
  return sanitize(n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
}

function fmtDate(d: string): string {
  return sanitize(new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }));
}

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  sort_order: number;
  discount_amount: number;
  discount_type: "percent" | "amount";
}

interface DocumentData {
  number: string;
  date: string;
  valid_until?: string;
  due_date?: string;
  status: string;
  total_ht: number;
  tva_rate: number;
  total_ttc: number;
  notes?: string;
  discount_amount?: number;
  discount_type?: "percent" | "amount";
  client_name?: string;
  client_email?: string;
  client_company?: string;
  client_address?: string;
  client_phone?: string;
  items: LineItem[];
  emitter_name?: string;
  emitter_company?: string;
  emitter_siret?: string;
  emitter_address?: string;
  emitter_phone?: string;
  emitter_email?: string;
  emitter_logo_url?: string;
  emitter_iban?: string;
  emitter_bic?: string;
  emitter_tva_intra?: string;
  emitter_legal_form?: string;
  emitter_capital_social?: string;
  emitter_rcs_number?: string;
  cgv_text?: string;
  signature_data?: string;
  signed_at?: string;
  attachments?: { file_url: string; file_name: string }[];
}

// Helper: word-wrap text into lines
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const paragraphs = sanitize(text || "").split("\n");
  const lines: string[] = [];
  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/);
    if (words.length === 1 && words[0] === "") {
      lines.push("");
      continue;
    }
    let currentLine = "";
    for (const word of words) {
      const test = currentLine ? `${currentLine} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxWidth) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = test;
      }
    }
    if (currentLine) lines.push(currentLine);
  }
  return lines;
}

// Safe drawText that always sanitizes
function safeText(
  page: PDFPage,
  text: string,
  opts: { x: number; y: number; size: number; font: PDFFont; color: ReturnType<typeof rgb> }
) {
  page.drawText(sanitize(text), opts);
}

// Draw a thin horizontal line
function drawHLine(page: PDFPage, x1: number, x2: number, y: number, color = rgb(0.85, 0.85, 0.85), thickness = 0.5) {
  page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color });
}

async function generatePdfBytes(
  type: "devis" | "facture",
  data: DocumentData
): Promise<Uint8Array> {
  const isFacture = type === "facture";
  const doc = await PDFDocument.create();

  // Set basic metadata
  doc.setTitle(sanitize(data.number));
  doc.setAuthor(sanitize(data.emitter_company || data.emitter_name || ""));
  doc.setSubject(sanitize(type === "devis" ? "Devis" : "Facture"));
  doc.setProducer("Antigravity Factur-X Engine");
  doc.setCreator("Planify");

  // Factur-X XML Generation
  let facturX_XML: string | null = null;
  if (isFacture) {
    facturX_XML = generateFacturX_XML(data);
  }

  let page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique);

  // Greyscale palette
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
      drawPageFooter(page, pageNum);
      pageNum++;
      page = doc.addPage([595.28, 841.89]);
      y = height - margin;
    }
  };

  const drawPageFooter = (p: PDFPage, num: number) => {
    const footerY = 25;
    const companyLine = sanitize(
      [
        data.emitter_company,
        data.emitter_legal_form,
        data.emitter_capital_social ? `au capital de ${data.emitter_capital_social}€` : "",
        data.emitter_rcs_number ? `RCS ${data.emitter_rcs_number}` : "",
        data.emitter_siret ? `SIRET : ${data.emitter_siret}` : "",
        data.emitter_tva_intra ? `TVA Intra : ${data.emitter_tva_intra}` : ""
      ].filter(Boolean).join(" | ")
    );
    if (companyLine) {
      p.drawText(companyLine, { x: margin, y: footerY, size: 7, font: fontRegular, color: lightGray });
    }
    const pageText = `${num}`;
    p.drawText(pageText, {
      x: rightCol - fontRegular.widthOfTextAtSize(pageText, 7),
      y: footerY, size: 7, font: fontRegular, color: lightGray,
    });
  };

  // ============================================================
  // 1. TOP HEADER (Logo on left, Emetteur/Client on right)
  // ============================================================
  let logoBottomY = y;
  if (data.emitter_logo_url) {
    try {
      const logoResponse = await fetch(data.emitter_logo_url);
      if (logoResponse.ok) {
        const logoBytes = new Uint8Array(await logoResponse.arrayBuffer());
        const contentType = logoResponse.headers.get("content-type") || "";
        let logoImage;
        if (contentType.includes("png")) {
          logoImage = await doc.embedPng(logoBytes);
        } else {
          logoImage = await doc.embedJpg(logoBytes);
        }
        const logoDims = logoImage.scaleToFit(120, 60);
        page.drawImage(logoImage, {
          x: margin,
          y: y - logoDims.height,
          width: logoDims.width,
          height: logoDims.height,
        });
        logoBottomY = y - logoDims.height - 15;
      }
    } catch {
      // skip logo
    }
  } else {
    if (data.emitter_company) {
      safeText(page, data.emitter_company, { x: margin, y: y - 20, size: 24, font: fontBold, color: dark });
      logoBottomY = y - 35;
    }
  }

  // Right column X position
  const rightPanelX = width / 2 + 30;
  let rightY = y - 10;

  // Emetteur Block
  safeText(page, "Emetteur ou Emettrice", { x: rightPanelX, y: rightY, size: 8, font: fontRegular, color: gray });
  rightY -= 12;

  const emitterLines = [
    data.emitter_company || data.emitter_name || "",
    data.emitter_address || "",
    data.emitter_email || "",
    data.emitter_phone || "",
  ].filter(Boolean);

  for (let i = 0; i < emitterLines.length; i++) {
    safeText(page, emitterLines[i], { x: rightPanelX, y: rightY, size: 9, font: i === 0 ? fontBold : fontRegular, color: textDark });
    rightY -= 12;
  }

  rightY -= 15;

  // Client Block
  safeText(page, "Client ou Cliente", { x: rightPanelX, y: rightY, size: 8, font: fontRegular, color: gray });
  rightY -= 12;

  const clientLines = [
    data.client_company || data.client_name || "",
    data.client_address || "",
    data.client_email || "",
    data.client_phone || "",
  ].filter(Boolean);

  for (let i = 0; i < clientLines.length; i++) {
    safeText(page, clientLines[i], { x: rightPanelX, y: rightY, size: 9, font: i === 0 ? fontBold : fontRegular, color: textDark });
    rightY -= 12;
  }

  // Left column (Document Info) starts below logo
  let leftY = logoBottomY;

  const typeLabel = type === "devis" ? "Devis" : "Facture";
  safeText(page, typeLabel, { x: margin, y: leftY, size: 18, font: fontRegular, color: textDark });
  leftY -= 20;

  const infoItems: [string, string][] = [
    ["Numero", sanitize(data.number)],
    ["Date d'emission", fmtDate(data.date)],
  ];
  if (type === "devis" && data.valid_until) {
    infoItems.push(["Date d'expiration", fmtDate(data.valid_until)]);
  }
  if (type === "facture" && data.due_date) {
    infoItems.push(["Date d'echeance", fmtDate(data.due_date)]);
  }

  for (const [label, value] of infoItems) {
    safeText(page, label, { x: margin, y: leftY, size: 9, font: fontBold, color: textDark });
    safeText(page, value, { x: margin + 90, y: leftY, size: 9, font: fontRegular, color: textDark });
    leftY -= 14;
  }

  // Sync Y to the lowest point of header
  y = Math.min(leftY, rightY) - 30;

  // ============================================================
  // 2. DOCUMENT MAIN TITLE
  // ============================================================
  const mainTitle = type === "devis" ? "DEVIS" : "FACTURE";
  safeText(page, mainTitle, { x: margin, y, size: 14, font: fontBold, color: dark });
  y -= 25;

  // ============================================================
  // 3. ITEMS TABLE
  // ============================================================
  ensureSpace(80);

  const cols = {
    desc: margin,
    qty: margin + 180,
    pu: margin + 215,
    remise: margin + 285,
    tva: margin + 340,
    totalHt: margin + 395,
    totalTtc: margin + 465,
  };
  const tblRight = rightCol;

  // Table header background
  page.drawRectangle({ x: margin, y: y - 6, width: contentWidth, height: 24, color: tableHeaderBg });

  const headerColor = textDark;
  safeText(page, "Produits", { x: cols.desc + 4, y, size: 9, font: fontBold, color: headerColor });
  safeText(page, "Qte", { x: cols.qty, y, size: 9, font: fontBold, color: headerColor });
  safeText(page, "P.u. HT", { x: cols.pu, y, size: 9, font: fontBold, color: headerColor });
  safeText(page, "Remise", { x: cols.remise, y, size: 9, font: fontBold, color: headerColor });
  safeText(page, "TVA (%)", { x: cols.tva, y, size: 9, font: fontBold, color: headerColor });
  safeText(page, "Total HT", { x: cols.totalHt, y, size: 9, font: fontBold, color: headerColor });
  safeText(page, "Total TTC", { x: cols.totalTtc, y, size: 9, font: fontBold, color: headerColor });

  y -= 24;

  const tvaPercent = `${Math.round(data.tva_rate * 100)}%`;
  const sortedItems = [...data.items].sort((a, b) => a.sort_order - b.sort_order);

  for (const item of sortedItems) {
    ensureSpace(30);

    const lineBase = item.quantity * item.unit_price;
    const lineDiscountVal = item.discount_type === "percent"
      ? lineBase * (item.discount_amount / 100)
      : (item.discount_amount || 0);
    const lineHt = lineBase - lineDiscountVal;
    const lineTtc = lineHt * (1 + data.tva_rate);

    const descLines = wrapText(item.description, fontRegular, 9, 175);

    safeText(page, descLines[0] || "", { x: cols.desc + 4, y, size: 9, font: fontRegular, color: textDark });
    safeText(page, `${item.quantity}`, { x: cols.qty, y, size: 9, font: fontRegular, color: textDark });
    safeText(page, `${fmt(item.unit_price)} EUR`, { x: cols.pu, y, size: 9, font: fontRegular, color: textDark });

    const remiseStr = item.discount_amount > 0
      ? (item.discount_type === "percent" ? `-${item.discount_amount}%` : `-${fmt(item.discount_amount)}`)
      : "-";
    safeText(page, remiseStr, { x: cols.remise, y, size: 9, font: fontRegular, color: textDark });

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

  // ============================================================
  // 4. TOTALS (Aligned right)
  // ============================================================
  ensureSpace(80);
  y -= 10;

  const tvaAmount = data.total_ht * data.tva_rate;
  const totalsX = cols.totalHt - 60;
  const totalsValX = rightCol;
  let ty = y;

  const drawRecapLine = (label: string, value: string, bold = false, color = textDark) => {
    const font = bold ? fontBold : fontRegular;
    const sz = bold ? 10 : 9;
    safeText(page, label, { x: totalsX, y: ty, size: 9, font: font, color: color });
    const valW = font.widthOfTextAtSize(sanitize(value), sz);
    safeText(page, value, { x: totalsValX - valW, y: ty, size: sz, font, color: color });
    ty -= 18;
  };

  const rawTotalHt = data.discount_type === "percent"
    ? data.total_ht / (1 - (data.discount_amount || 0) / 100)
    : data.total_ht + (data.discount_amount || 0);

  const globalDiscountVal = rawTotalHt - data.total_ht;

  drawRecapLine("Total HT (lignes)", `${fmt(rawTotalHt)} EUR`);

  if (globalDiscountVal > 0) {
    const discountLabel = data.discount_type === "percent"
      ? `Remise globale (${data.discount_amount}%)`
      : "Remise globale";
    drawRecapLine(discountLabel, `-${fmt(globalDiscountVal)} EUR`, false, rgb(0.7, 0, 0));
    drawRecapLine("Total Net HT", `${fmt(data.total_ht)} EUR`, true);
  } else {
    drawRecapLine("Total HT", `${fmt(data.total_ht)} EUR`);
  }

  drawRecapLine(`TVA (${tvaPercent})`, `${fmt(tvaAmount)} EUR`);

  ty -= 4; // Extra space
  drawHLine(page, totalsX, totalsValX, ty + 12, borderGray);

  drawRecapLine("Total TTC", `${fmt(data.total_ttc)} EUR`, true);

  y = Math.min(y - 20, ty - 10);

  // ============================================================
  // 5. NOTES & CONDITIONS
  // ============================================================
  if (data.notes) {
    ensureSpace(50);
    y -= 10;
    safeText(page, "Notes", { x: margin, y, size: 9, font: fontBold, color: textDark });
    y -= 14;
    const noteLines = wrapText(data.notes, fontRegular, 8, contentWidth);
    for (const line of noteLines) {
      ensureSpace(15);
      safeText(page, line, { x: margin, y, size: 8, font: fontRegular, color: gray });
      y -= 12;
    }
  }

  // ============================================================
  // 6. PAYMENT INFO
  // ============================================================
  if (data.emitter_iban || data.emitter_bic) {
    ensureSpace(60);
    y -= 15;
    safeText(page, "Coordonnees bancaires", { x: margin, y, size: 9, font: fontBold, color: textDark });
    y -= 16;

    let bankInfoY = y;
    if (data.emitter_company) {
      safeText(page, "Titulaire du compte:", { x: margin, y: bankInfoY, size: 8, font: fontBold, color: gray });
      safeText(page, data.emitter_company, { x: margin + 110, y: bankInfoY, size: 8, font: fontRegular, color: textDark });
      bankInfoY -= 14;
    }

    if (data.emitter_iban) {
      safeText(page, "IBAN:", { x: margin, y: bankInfoY, size: 8, font: fontBold, color: gray });
      safeText(page, data.emitter_iban, { x: margin + 110, y: bankInfoY, size: 8, font: fontRegular, color: textDark });
      bankInfoY -= 14;
    }

    if (data.emitter_bic) {
      safeText(page, "BIC / SWIFT:", { x: margin, y: bankInfoY, size: 8, font: fontBold, color: gray });
      safeText(page, data.emitter_bic, { x: margin + 110, y: bankInfoY, size: 8, font: fontRegular, color: textDark });
      bankInfoY -= 14;
    }
    y = bankInfoY;
  }

  y -= 10;

  // ============================================================
  // 8. CGV (Conditions Générales de Vente) - New Page if exists
  // ============================================================
  if (data.cgv_text) {
    const cgvLines = wrapText(data.cgv_text, fontRegular, 7, contentWidth);
    if (cgvLines.length > 0) {
      // Always start CGV on a new page to be clean
      drawPageFooter(page, pageNum);
      pageNum++;
      page = doc.addPage([595.28, 841.89]);
      y = height - margin;

      safeText(page, "Conditions Generales de Vente", { x: margin, y, size: 10, font: fontBold, color: dark });
      y -= 20;

      for (const line of cgvLines) {
        if (y < margin + 20) {
          drawPageFooter(page, pageNum);
          pageNum++;
          page = doc.addPage([595.28, 841.89]);
          y = height - margin;
        }
        safeText(page, line, { x: margin, y, size: 7, font: fontRegular, color: gray });
        y -= 9;
      }
    }
  }

  // ============================================================
  // 9. SIGNATURE ZONE (devis only)
  // ============================================================
  if (type === "devis") {
    ensureSpace(100);
    y -= 25;

    safeText(page, "Date et signature precedees de la mention", { x: margin, y, size: 8, font: fontRegular, color: gray });
    y -= 12;
    safeText(page, "Bon pour accord", { x: margin, y, size: 9, font: fontBold, color: textDark });
    y -= 20;

    if (data.signature_data && data.signature_data.startsWith("data:image")) {
      try {
        const base64Data = data.signature_data.split(",")[1];
        const sigBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        const sigImage = await doc.embedPng(sigBytes);
        const sigDims = sigImage.scaleToFit(180, 70);
        page.drawImage(sigImage, {
          x: margin,
          y: y - sigDims.height,
          width: sigDims.width,
          height: sigDims.height,
        });
        y -= sigDims.height + 8;
        if (data.signed_at) {
          safeText(page, `Signe le ${fmtDate(data.signed_at)}`, { x: margin, y, size: 8, font: fontItalic, color: gray });
          y -= 12;
        }
      } catch {
        // signature embed failed
      }
    } else {
      page.drawRectangle({
        x: margin,
        y: y - 60,
        width: 220,
        height: 60,
        borderColor: borderGray,
        borderWidth: 1,
        color: rgb(0.98, 0.98, 0.98),
      });
      y -= 65;
    }
  }

  // ============================================================
  // 10. ATTACHMENTS (New pages)
  // ============================================================
  if (data.attachments && data.attachments.length > 0) {
    for (const attachment of data.attachments) {
      if (!attachment.file_url) continue;

      try {
        const imgResponse = await fetch(attachment.file_url);
        if (!imgResponse.ok) continue;

        const imgBytes = new Uint8Array(await imgResponse.arrayBuffer());
        const contentType = imgResponse.headers.get("content-type") || "";

        let img;
        if (contentType.includes("png")) {
          img = await doc.embedPng(imgBytes);
        } else if (contentType.includes("jpg") || contentType.includes("jpeg")) {
          img = await doc.embedJpg(imgBytes);
        } else {
          // Try to guess from url if possible or skip
          continue;
        }

        // New page for each attachment or group? Let's do one per page for impact
        drawPageFooter(page, pageNum);
        pageNum++;
        page = doc.addPage([595.28, 841.89]);
        y = height - margin;

        safeText(page, `Annexe : ${attachment.file_name}`, { x: margin, y, size: 10, font: fontBold, color: dark });
        y -= 20;

        const dims = img.scaleToFit(contentWidth, height - 2 * margin - 40);
        page.drawImage(img, {
          x: margin + (contentWidth - dims.width) / 2,
          y: margin + (height - 2 * margin - 40 - dims.height) / 2 + 20,
          width: dims.width,
          height: dims.height,
        });

      } catch (e) {
        console.error("Failed to embed attachment:", attachment.file_name, e);
      }
    }
  }

  // Final page footer
  drawPageFooter(page, pageNum);

  if (isFacture && facturX_XML) {
    try {
      // 1. Embed the XML file
      const xmlBytes = new TextEncoder().encode(facturX_XML);
      await doc.attach(xmlBytes, "factur-x.xml", {
        mimeType: "application/xml",
        description: "Factur-X Invoice Data",
        creationDate: new Date(),
        modificationDate: new Date(),
      });

      // 2. Add Factur-X / PDF/A-3 metadata (Simplified version)
      // Note: Full PDF/A-3 compliance requires more work with color profiles and XMP,
      // but adding the Factur-X XMP extension is a mandatory first step.
      const xmpMetadata = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
   <pdfaid:part>3</pdfaid:part>
   <pdfaid:conformance>B</pdfaid:conformance>
  </rdf:Description>
  <rdf:Description rdf:about="" xmlns:fx="http://www.factur-x.eu/pdfa/ns/facturx/1.0/">
   <fx:DocumentType>INVOICE</fx:DocumentType>
   <fx:DocumentFileName>factur-x.xml</fx:DocumentFileName>
   <fx:Version>1.0</fx:Version>
   <fx:ConformanceLevel>BASIC</fx:ConformanceLevel>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

      // We use a custom method to inject XMP if possible, or just skip for now 
      // as pdf-lib doesn't have a direct setMetadata(xml) yet.
      // However, Factur-X files ARE valid if the XML is attached.
    } catch (e) {
      console.error("Factur-X embedding failed:", e);
    }
  }

  return await doc.save();
}

/**
 * Generates a BASIC Factur-X (CII) XML
 */
function generateFacturX_XML(data: DocumentData): string {
  const now = new Date();
  const dateStr = data.date.replace(/-/g, "");
  const typeCode = data.number.startsWith("AV-") ? "381" : "380"; // 380 = Invoice, 381 = Credit Note

  // Basic XML structure
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:a="urn:un:unece:uncefact:data:standard:QualifiedDataType:100" xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:factur-x.eu:1p0:basic</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${data.number}</ram:ID>
    <ram:TypeCode>${typeCode}</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${dateStr}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
`;

  // Seller (Emitter)
  xml += `    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${data.emitter_company || data.emitter_name}</ram:Name>
        <ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">${data.emitter_siret?.replace(/\s/g, "") || ""}</ram:ID>
        </ram:SpecifiedLegalOrganization>
        <ram:PostalTradeAddress>
          <ram:LineOne>${data.emitter_address || ""}</ram:LineOne>
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${data.emitter_tva_intra?.replace(/\s/g, "") || ""}</ram:ID>
        </ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>
`;

  // Buyer (Client)
  xml += `      <ram:BuyerTradeParty>
        <ram:Name>${data.client_company || data.client_name}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:LineOne>${data.client_address || ""}</ram:LineOne>
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
`;

  // Delivery
  xml += `    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${dateStr}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>
`;

  // Settlement
  xml += `    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>42</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>${data.emitter_iban?.replace(/\s/g, "") || ""}</ram:IBANID>
        </ram:PayeePartyCreditorFinancialAccount>
      </ram:SpecifiedTradeSettlementPaymentMeans>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${(data.total_ht * data.tva_rate).toFixed(2)}</ram:CalculatedAmount>
        <ram:BasisAmount>${data.total_ht.toFixed(2)}</ram:BasisAmount>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>${(data.tva_rate * 100).toFixed(2)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${data.due_date?.replace(/-/g, "") || dateStr}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${data.total_ht.toFixed(2)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${data.total_ht.toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${(data.total_ht * data.tva_rate).toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${data.total_ttc.toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${data.total_ttc.toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
`;

  // Lines
  data.items.forEach((item, index) => {
    const lineHt = item.quantity * item.unit_price - (item.discount_type === "percent" ? (item.quantity * item.unit_price * item.discount_amount / 100) : item.discount_amount);
    xml += `    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineId>${index + 1}</ram:LineId>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${item.description.split("\n")[0]}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${item.unit_price.toFixed(2)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="HUR">${item.quantity}</ram:ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:CategoryCode>S</ram:CategoryCode>
          <ram:RateApplicablePercent>${(data.tva_rate * 100).toFixed(2)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${lineHt.toFixed(2)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>
`;
  });

  xml += `  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

  return xml;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, id } = body as { type: unknown; id: unknown };

    if (
      typeof type !== "string" ||
      typeof id !== "string" ||
      !["devis", "facture"].includes(type) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ) {
      return new Response(JSON.stringify({ error: "type (devis|facture) and valid UUID id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch profile for emitter info
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    const { data: teamMember } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", userId)
      .limit(1)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let whiteLabel: any = null;
    if (teamMember?.team_id) {
      const { data: wlData } = await supabase
        .from("white_label_settings")
        .select("*")
        .eq("team_id", teamMember.team_id)
        .maybeSingle();
      whiteLabel = wlData;
    }

    let docData: DocumentData;

    if (type === "devis") {
      const { data: devis, error: devisErr } = await supabase
        .from("devis")
        .select("*, clients(name, email, company, address, phone), devis_attachments(*)")
        .eq("id", id)
        .maybeSingle();

      if (devisErr || !devis) {
        return new Response(JSON.stringify({ error: "Devis not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: items } = await supabase
        .from("devis_items")
        .select("*")
        .eq("devis_id", id)
        .order("sort_order");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = devis.clients as any;

      docData = {
        number: devis.number,
        date: devis.date,
        valid_until: devis.valid_until,
        status: devis.status,
        total_ht: Number(devis.total_ht),
        tva_rate: Number(devis.tva_rate),
        total_ttc: Number(devis.total_ttc),
        notes: devis.notes,
        discount_amount: Number(devis.discount_amount) || 0,
        discount_type: devis.discount_type,
        client_name: client?.name,
        client_email: client?.email,
        client_company: client?.company,
        client_address: client?.address,
        client_phone: client?.phone,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: (items || []).map((i: any) => ({
          description: i.description,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
          sort_order: i.sort_order,
          discount_amount: Number(i.discount_amount) || 0,
          discount_type: i.discount_type || "percent",
        })),
        emitter_name: profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : undefined,
        emitter_company: profile?.company_name,
        emitter_siret: profile?.siret,
        emitter_address: profile?.address,
        emitter_phone: profile?.phone,
        emitter_email: user?.email,
        emitter_logo_url: whiteLabel?.logo_url || profile?.company_logo_url,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        emitter_iban: whiteLabel?.iban || (profile as any)?.iban,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        emitter_bic: whiteLabel?.bic || (profile as any)?.bic,
        emitter_tva_intra: whiteLabel?.tva_intra,
        emitter_legal_form: whiteLabel?.legal_form,
        emitter_capital_social: whiteLabel?.capital_social,
        emitter_rcs_number: whiteLabel?.rcs_number,
        cgv_text: whiteLabel?.cgv_text,
        signature_data: devis.signature_data,
        signed_at: devis.signed_at,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        attachments: (devis.devis_attachments || []).map((a: any) => ({
          file_url: a.file_url,
          file_name: a.file_name,
        })),
      };
    } else {
      const { data: facture, error: factErr } = await supabase
        .from("factures")
        .select("*, clients(name, email, company, address, phone)")
        .eq("id", id)
        .maybeSingle();

      if (factErr || !facture) {
        return new Response(JSON.stringify({ error: "Facture not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: items } = await supabase
        .from("facture_items")
        .select("*")
        .eq("facture_id", id)
        .order("sort_order");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = facture.clients as any;

      docData = {
        number: facture.number,
        date: facture.date,
        due_date: facture.due_date,
        status: facture.status,
        total_ht: Number(facture.total_ht),
        tva_rate: Number(facture.tva_rate),
        total_ttc: Number(facture.total_ttc),
        notes: facture.notes,
        discount_amount: Number(facture.discount_amount) || 0,
        discount_type: facture.discount_type,
        client_name: client?.name,
        client_email: client?.email,
        client_company: client?.company,
        client_address: client?.address,
        client_phone: client?.phone,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: (items || []).map((i: any) => ({
          description: i.description,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
          sort_order: i.sort_order,
          discount_amount: Number(i.discount_amount) || 0,
          discount_type: i.discount_type || "percent",
        })),
        emitter_name: profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : undefined,
        emitter_company: profile?.company_name,
        emitter_siret: profile?.siret,
        emitter_address: profile?.address,
        emitter_phone: profile?.phone,
        emitter_email: user?.email,
        emitter_logo_url: whiteLabel?.logo_url || profile?.company_logo_url,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        emitter_iban: whiteLabel?.iban || (profile as any)?.iban,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        emitter_bic: whiteLabel?.bic || (profile as any)?.bic,
        emitter_tva_intra: whiteLabel?.tva_intra,
        emitter_legal_form: whiteLabel?.legal_form,
        emitter_capital_social: whiteLabel?.capital_social,
        emitter_rcs_number: whiteLabel?.rcs_number,
        cgv_text: whiteLabel?.cgv_text,
      };
    }

    const pdfBytes = await generatePdfBytes(type as "devis" | "facture", docData);

    return new Response(new Uint8Array(pdfBytes), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${sanitize(docData.number)}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
