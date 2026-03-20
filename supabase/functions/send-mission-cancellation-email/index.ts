import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GMAIL_USER = Deno.env.get("GMAIL_USER");
    const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      return new Response(JSON.stringify({ error: "Gmail credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null) as { mission_id?: string; reason?: string } | null;
    const missionId = body?.mission_id;

    if (!missionId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(missionId)) {
      return new Response(JSON.stringify({ error: "mission_id (UUID) requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: mission, error: missionError } = await supabase
      .from("missions")
      .select("id, title, start_date, location, notes, clients(name, email)")
      .eq("id", missionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (missionError || !mission) {
      return new Response(JSON.stringify({ error: "Mission introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = mission.clients as { name?: string; email?: string } | null;
    if (!client?.email) {
      return new Response(JSON.stringify({ error: "Le client n'a pas d'adresse email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reason = body?.reason?.trim();
    const now = new Date().toLocaleString("fr-FR");
    const cancellationNote = `Annulation le ${now}${reason ? ` : ${reason}` : ""}`;
    const updatedNotes = [mission.notes?.trim(), cancellationNote].filter(Boolean).join("\n\n");

    const { error: updateError } = await supabase
      .from("missions")
      .update({ status: "annulée", notes: updatedNotes })
      .eq("id", missionId)
      .eq("user_id", user.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name,last_name,company_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const senderDisplay = profile?.company_name || `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "Planify";
    const missionDate = mission.start_date
      ? new Date(mission.start_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
      : "date non renseignée";

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });

    await transporter.sendMail({
      from: `${senderDisplay} via Planify <${GMAIL_USER}>`,
      to: client.email,
      subject: `Annulation de la mission ${mission.title}`,
      html: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mission Annulée</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fcfcfd; margin: 0; padding: 40px 20px; color: #1a1a1e;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #f0f0f3; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.03);">
    <div style="padding: 40px 40px 20px 40px;">
      <div style="width: 48px; height: 48px; background: #ef4444; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
        <span style="color: white; font-weight: bold; font-size: 24px; line-height: 48px; width: 100%; text-align: center;">!</span>
      </div>
      <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 16px 0; color: #0f172a; letter-spacing: -0.02em;">Mission Annulée</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
        Bonjour ${client.name || ""},<br><br>
        Nous vous informons que la mission <strong>${mission.title}</strong> prévue le <strong>${missionDate}</strong> a été annulée.
      </p>
      
      ${reason ? `
      <div style="background-color: #fef2f2; border-radius: 12px; padding: 20px; margin-bottom: 32px; border: 1px solid #fee2e2;">
        <p style="font-size: 13px; font-weight: 600; color: #991b1b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Motif de l'annulation :</p>
        <p style="font-size: 14px; color: #b91c1c; margin: 0; line-height: 1.5;">${reason}</p>
      </div>
      ` : ""}

      <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
        Nous restons à votre entière disposition pour reprogrammer cette intervention ou pour tout complément d'information.
      </p>

      <p style="margin-top: 32px; font-size: 15px; font-weight: 600; color: #0f172a;">
        Cordialement,<br>
        ${senderDisplay}
      </p>
    </div>
    
    <div style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #f0f0f3; text-align: center;">
      <p style="font-size: 12px; color: #94a3b8; margin: 0;">
        E-mail envoyé via Planify.
      </p>
    </div>
  </div>
</body>
</html>`,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
