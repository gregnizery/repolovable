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

        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: "Unauthorized", code: "ERR_INV_UNAUTH" }), {
                status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            { global: { headers: { Authorization: authHeader } } }
        );

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized", code: "ERR_INV_UNAUTH_USER" }), {
                status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
        const userId = user.id;

        const body = await req.json();
        const { email, team_id } = body as { email: string; team_id: string };
        const normalizedEmail = (email || "").trim().toLowerCase();

        if (!normalizedEmail || !team_id) {
            return new Response(JSON.stringify({ error: "email and team_id are required", code: "ERR_INV_PARAMS" }), {
                status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const adminClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // Verify inviter is admin/owner
        const { data: team } = await adminClient
            .from("teams").select("id, name, owner_id").eq("id", team_id).single();

        if (!team) {
            return new Response(JSON.stringify({ error: "Team not found", code: "ERR_INV_TEAM_NOT_FOUND" }), {
                status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const isOwner = team.owner_id === userId;
        const { data: membership } = await adminClient
            .from("team_members").select("role")
            .eq("team_id", team_id).eq("user_id", userId).single();

        if (!isOwner && membership?.role !== "admin") {
            return new Response(JSON.stringify({ error: "Seuls les admins peuvent inviter des prestataires", code: "ERR_INV_FORBIDDEN" }), {
                status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Create or update invitation with role 'prestataire'
        const { data: invitation, error: inviteError } = await adminClient
            .from("team_invitations")
            .upsert({
                team_id,
                email: normalizedEmail,
                role: "prestataire",
                invited_by: userId,
                status: "pending",
                token: crypto.randomUUID(),
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            }, { onConflict: "team_id,email" })
            .select()
            .single();

        if (inviteError) {
            return new Response(JSON.stringify({ error: inviteError.message, code: "ERR_INV_UPSERT" }), {
                status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Email content
        // Forcer l'URL de production pour la fiabilité des liens
        const appUrl = "https://planify-5a976.web.app";
        const acceptUrl = `${appUrl}/invitation?token=${encodeURIComponent(invitation.token)}`;

        const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation Prestataire Planify</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fcfcfd; margin: 0; padding: 40px 20px; color: #1a1a1e;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #f0f0f3; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.03);">
    <div style="padding: 40px 40px 20px 40px;">
      <div style="width: 48px; height: 48px; background: #4f46e5; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
        <span style="color: white; font-weight: bold; font-size: 24px; line-height: 48px; width: 100%; text-align: center;">P</span>
      </div>
      <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 16px 0; color: #0f172a; letter-spacing: -0.02em;">Invitation Prestataire</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
        Bonjour,<br><br>
        L'équipe <strong>${team.name}</strong> souhaite vous référencer comme prestataire sur leur plateforme Planify.
      </p>
      
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 32px; border: 1px solid #f1f5f9;">
        <p style="font-size: 14px; color: #1e293b; margin: 0; line-height: 1.5;">
          En acceptant cette invitation, vous pourrez renseigner vos tarifs, vos informations légales (SIRET, RIB) et être assigné à des missions.
        </p>
      </div>

      <a href="${acceptUrl}" style="display: block; width: 100%; background-color: #0f172a; color: #ffffff; text-align: center; padding: 16px 0; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px; transition: background-color 0.2s;">
        Rejoindre l'équipe & Compléter mon profil
      </a>
      
      <p style="text-align: center; margin-top: 24px;">
        <a href="${acceptUrl}" style="font-size: 12px; color: #94a3b8; text-decoration: none; word-break: break-all;">${acceptUrl}</a>
      </p>
    </div>
    
    <div style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #f0f0f3; text-align: center;">
      <p style="font-size: 12px; color: #94a3b8; margin: 0;">
        Cette invitation a été envoyée via Planify.<br>
        Elle expirera dans 7 jours.
      </p>
    </div>
  </div>
</body>
</html>`;

        if (GMAIL_USER && GMAIL_APP_PASSWORD) {
            const transporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 465,
                secure: true,
                auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
            });

            await transporter.sendMail({
                from: `Planify <${GMAIL_USER}>`,
                to: normalizedEmail,
                subject: `Invitation Prestataire : Rejoignez ${team.name} sur Planify`,
                html: htmlContent,
            });
        }

        return new Response(JSON.stringify({ success: true, invitation_id: invitation.id }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (err) {
        const error = err as Error;
        const errorCode = "ERR_INV_INTERNAL";
        console.error(`[${errorCode}] Invitation error:`, error);
        return new Response(JSON.stringify({
            error: error.message || "Internal error",
            code: errorCode
        }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
