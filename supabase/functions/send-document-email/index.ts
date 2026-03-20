import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function sanitize(s: string): string {
  return s.replace(/[\u00A0\u202F\u2009\u2007\u2008\u2014]/g, (c) => c === "\u2014" ? "-" : " ");
}

function fmt(n: number): string {
  return sanitize(n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
}

function buildEmailHtml(type: "devis" | "facture", data: { number: string; total_ht: number; tva_rate: number; total_ttc: number; client_name?: string }, emitterName: string): string {
  const typeLabelUpper = type === "devis" ? "Devis" : "Facture";
  const typeLabel = type === "devis" ? "devis" : "facture";
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${typeLabelUpper} ${sanitize(data.number)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fcfcfd; margin: 0; padding: 40px 20px; color: #1a1a1e;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #f0f0f3; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.03);">
    <div style="padding: 40px 40px 20px 40px;">
      <div style="width: 48px; height: 48px; background: #4f46e5; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
        <span style="color: white; font-weight: bold; font-size: 24px; line-height: 48px; width: 100%; text-align: center;">P</span>
      </div>
      <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 16px 0; color: #0f172a; letter-spacing: -0.02em;">${typeLabelUpper} ${sanitize(data.number)}</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
        Bonjour${data.client_name ? ` ${sanitize(data.client_name)}` : ""},<br><br>
        Veuillez trouver ci-joint votre ${typeLabel} <strong>${sanitize(data.number)}</strong> d'un montant de <strong>${fmt(data.total_ttc)} EUR TTC</strong>.
      </p>
      
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #f1f5f9;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding-bottom: 12px; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Total HT</td>
            <td style="padding-bottom: 12px; text-align: right; font-size: 14px; color: #1e293b; font-weight: 500;">${fmt(data.total_ht)} EUR</td>
          </tr>
          <tr>
            <td style="padding-bottom: 12px; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">TVA (${Math.round(data.tva_rate * 100)}%)</td>
            <td style="padding-bottom: 12px; text-align: right; font-size: 14px; color: #1e293b; font-weight: 500;">${fmt(data.total_ht * data.tva_rate)} EUR</td>
          </tr>
          <tr style="border-top: 1px solid #e2e8f0;">
            <td style="padding-top: 16px; font-size: 14px; color: #0f172a; font-weight: 700;">Total TTC</td>
            <td style="padding-top: 16px; text-align: right; font-size: 18px; color: #4f46e5; font-weight: 800;">${fmt(data.total_ttc)} EUR</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 14px; color: #64748b; text-align: center; margin-top: 8px;">
        Le document PDF est disponible en pièce jointe de cet e-mail.
      </p>
    </div>
    
    <div style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #f0f0f3; text-align: center;">
      <p style="font-size: 12px; color: #94a3b8; margin: 0;">
        Envoyé par <strong>${sanitize(emitterName)}</strong> via Planify.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ── Main handler ──

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GMAIL_USER = Deno.env.get("GMAIL_USER");
    const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      return new Response(JSON.stringify({ error: "Gmail credentials not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const typedType = type as "devis" | "facture";

    // ── Fetch document data for email content ──
    const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", authUser.id).single();

    let clientEmail: string | null = null;
    let clientName: string | undefined;
    let docNumber = "";
    let totalHt = 0;
    let tvaRate = 0;
    let totalTtc = 0;

    if (typedType === "devis") {
      const { data: devis, error: devisErr } = await supabase
        .from("devis").select("*, clients(name, email)")
        .eq("id", id).maybeSingle();
      if (devisErr || !devis) {
        return new Response(JSON.stringify({ error: "Devis not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = devis.clients as any;
      clientEmail = client?.email;
      clientName = client?.name;
      docNumber = devis.number;
      totalHt = Number(devis.total_ht);
      tvaRate = Number(devis.tva_rate);
      totalTtc = Number(devis.total_ttc);

      // Update status to "envoyé"
      await supabase.from("devis").update({ status: "envoyé" }).eq("id", id);
    } else {
      const { data: facture, error: factErr } = await supabase
        .from("factures").select("*, clients(name, email)")
        .eq("id", id).maybeSingle();
      if (factErr || !facture) {
        return new Response(JSON.stringify({ error: "Facture not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = facture.clients as any;
      clientEmail = client?.email;
      clientName = client?.name;
      docNumber = facture.number;
      totalHt = Number(facture.total_ht);
      tvaRate = Number(facture.tva_rate);
      totalTtc = Number(facture.total_ttc);

      if (facture.status === "brouillon") {
        await supabase.from("factures").update({ status: "envoyée" }).eq("id", id);
      }
    }

    const emitterCompany = profile?.company_name || undefined;
    const emitterName = profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : undefined;

    if (!clientEmail) {
      return new Response(JSON.stringify({ error: "Le client n'a pas d'adresse email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Call generate-pdf to get the exact same PDF ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const pdfResponse = await fetch(`${supabaseUrl}/functions/v1/generate-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
        "apikey": Deno.env.get("SUPABASE_ANON_KEY")!,
      },
      body: JSON.stringify({ type: typedType, id }),
    });

    if (!pdfResponse.ok) {
      const errText = await pdfResponse.text();
      console.error("generate-pdf error:", errText);
      return new Response(JSON.stringify({ error: "Erreur generation PDF", details: errText }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());

    // ── Build & send email ──
    const displayName = emitterCompany || emitterName || "Planify";
    const senderName = emitterCompany ? `${emitterCompany} via Planify` : "Planify";
    const typeEmailLabel = typedType === "devis" ? "Devis" : "Facture";
    const subject = `${typeEmailLabel} ${docNumber} - ${displayName}`;
    const htmlContent = buildEmailHtml(typedType, { number: docNumber, total_ht: totalHt, tva_rate: tvaRate, total_ttc: totalTtc, client_name: clientName }, displayName);

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });

    await transporter.sendMail({
      from: `${senderName} <${GMAIL_USER}>`,
      to: clientEmail,
      subject,
      html: htmlContent,
      attachments: [{
        filename: `${docNumber}.pdf`,
        content: pdfBytes,
        contentType: "application/pdf",
      }],
    });

    console.log("Email sent successfully to:", clientEmail);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Send email error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
