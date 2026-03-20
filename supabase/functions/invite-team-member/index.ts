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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const body = await req.json();
    const { email, role, team_id } = body as { email: string; role: string; team_id: string };
    const normalizedEmail = (email || "").trim().toLowerCase();

    if (!normalizedEmail || !role || !team_id) {
      return new Response(JSON.stringify({ error: "email, role and team_id are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return new Response(JSON.stringify({ error: "Format d'email invalide" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate UUID format for team_id
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(team_id)) {
      return new Response(JSON.stringify({ error: "Invalid team_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate role
    if (!["admin", "manager", "technicien", "prestataire"].includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid role" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check the inviter is admin/owner of this team
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: team } = await adminClient
      .from("teams").select("id, name, owner_id").eq("id", team_id).single();


    if (!team) {
      return new Response(JSON.stringify({ error: "Team not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is owner or admin
    const isOwner = team.owner_id === userId;
    const { data: membership } = await adminClient
      .from("team_members").select("role")
      .eq("team_id", team_id).eq("user_id", userId).single();


    if (!isOwner && membership?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Seuls les admins peuvent inviter des membres" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already a member
    const { data: existingMember } = await adminClient
      .from("team_members").select("id")
      .eq("team_id", team_id)
      .in("user_id", (
        await adminClient.rpc("get_user_ids_by_email", { p_email: normalizedEmail })
      ).data || [])
      .limit(1)
      .maybeSingle();

    if (existingMember?.id) {
      return new Response(JSON.stringify({ error: "Cet utilisateur est déjà membre de l'équipe" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if invitation already exists
    const { data: existingInvite } = await adminClient
      .from("team_invitations").select("id, status")
      .eq("team_id", team_id).eq("email", normalizedEmail).single();

    if (existingInvite && existingInvite.status === "pending") {
      return new Response(JSON.stringify({ error: "Une invitation est déjà en attente pour cet email" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create or update invitation
    const { data: invitation, error: inviteError } = await adminClient
      .from("team_invitations")
      .upsert({
        team_id,
        email: normalizedEmail,
        role,
        invited_by: userId,
        status: "pending",
        token: crypto.randomUUID(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: "team_id,email" })
      .select()
      .single();

    if (inviteError) {
      console.error("Invite error:", inviteError);
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get inviter profile
    const { data: profile } = await adminClient
      .from("profiles").select("first_name, last_name, company_name")
      .eq("user_id", userId).single();

    const inviterName = profile
      ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.company_name || "Un utilisateur"
      : "Un utilisateur";
    const companyName = profile?.company_name || "Planify";
    const senderName = profile?.company_name ? `${profile.company_name} via Planify` : "Planify";

    // Build accept URL
    // Forcer l'URL de production pour la fiabilité des liens dans les emails
    const appUrl = "https://planify-5a976.web.app";
    const acceptUrl = `${appUrl}/invitation?token=${encodeURIComponent(invitation.token)}`;

    const roleLabels: Record<string, string> = {
      admin: "Administrateur",
      manager: "Manager",
      technicien: "Technicien",
      prestataire: "Prestataire",
    };

    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation Planify</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fcfcfd; margin: 0; padding: 40px 20px; color: #1a1a1e;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #f0f0f3; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.03);">
    <div style="padding: 40px 40px 20px 40px;">
      <div style="width: 48px; height: 48px; background: #4f46e5; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
        <span style="color: white; font-weight: bold; font-size: 24px; line-height: 48px; width: 100%; text-align: center;">P</span>
      </div>
      <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 16px 0; color: #0f172a; letter-spacing: -0.02em;">Rejoignez l'équipe</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
        Bonjour,<br><br>
        <strong>${inviterName}</strong> vous invite à collaborer sur <strong>${team.name}</strong> en tant que <span style="color: #4f46e5; font-weight: 600;">${roleLabels[role] || role}</span>.
      </p>
      
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 32px; border: 1px solid #f1f5f9;">
         <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Équipe :</span>
            <span style="font-size: 14px; color: #1e293b; font-weight: 500; margin-left: 4px;">${team.name}</span>
         </div>
      </div>

      <a href="${acceptUrl}" style="display: block; width: 100%; background-color: #0f172a; color: #ffffff; text-align: center; padding: 16px 0; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px; transition: background-color 0.2s;">
        Accepter l'invitation
      </a>
      
      <p style="text-align: center; margin-top: 24px;">
        <a href="${acceptUrl}" style="font-size: 12px; color: #94a3b8; text-decoration: none; word-break: break-all;">${acceptUrl}</a>
      </p>
    </div>
    
    <div style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #f0f0f3; text-align: center;">
      <p style="font-size: 12px; color: #94a3b8; margin: 0;">
        Cette invitation a été envoyée par <strong>${companyName}</strong> via Planify.<br>
        Elle expirera dans 7 jours.
      </p>
    </div>
  </div>
</body>
</html>`;

    let emailSent = false;
    let warning: string | null = null;

    if (GMAIL_USER && GMAIL_APP_PASSWORD) {
      try {
        const transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
        });

        await transporter.sendMail({
          from: `${senderName} <${GMAIL_USER}>`,
          to: normalizedEmail,
          subject: `${inviterName} vous invite à rejoindre ${team.name} sur Planify`,
          html: htmlContent,
        });

        emailSent = true;
        console.log(`SUCCESS: Redesigned invitation email sent to ${normalizedEmail} using Gmail/Nodemailer`);
      } catch (mailError) {
        console.error("Invitation email failed:", mailError);
        warning = "Invitation créée, mais l'email n'a pas pu être envoyé.";
      }
    } else {
      warning = "Invitation créée, mais l'envoi d'email n'est pas configuré.";
    }

    return new Response(JSON.stringify({ success: true, invitation_id: invitation.id, email_sent: emailSent, warning }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Invite error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
