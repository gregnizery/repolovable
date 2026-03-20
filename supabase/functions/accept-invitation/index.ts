import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized", code: "ERR_ACC_UNAUTH" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized", code: "ERR_ACC_UNAUTH_USER" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;
    const userEmail = user.email || "";

    const body = await req.json();
    const { invitation_token } = body as { invitation_token: string };

    if (!invitation_token || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invitation_token)) {
      return new Response(JSON.stringify({ error: "Token d'invitation invalide", code: "ERR_ACC_TOKEN_INVALID" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find invitation
    const { data: invitation, error: invErr } = await adminClient
      .from("team_invitations")
      .select("*")
      .eq("token", invitation_token)
      .eq("status", "pending")
      .single();

    if (invErr || !invitation) {
      return new Response(JSON.stringify({ error: "Invitation introuvable ou déjà utilisée", code: "ERR_ACC_TOKEN_NOT_FOUND" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (new Date(invitation.expires_at) < new Date()) {
      await adminClient.from("team_invitations").update({ status: "expired" }).eq("id", invitation.id);
      return new Response(JSON.stringify({ error: "Cette invitation a expiré", code: "ERR_ACC_EXPIRED" }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check email matches
    if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      return new Response(JSON.stringify({ error: "Cette invitation est destinée à un autre email", code: "ERR_ACC_EMAIL_MISMATCH" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already a member
    const { data: existing } = await adminClient
      .from("team_members")
      .select("id")
      .eq("team_id", invitation.team_id)
      .eq("user_id", userId)
      .single();

    if (existing) {
      await adminClient.from("team_invitations").update({ status: "accepted" }).eq("id", invitation.id);
      return new Response(JSON.stringify({ success: true, message: "Vous êtes déjà membre de cette équipe" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add as team member
    const { error: memberError } = await adminClient
      .from("team_members")
      .insert({
        team_id: invitation.team_id,
        user_id: userId,
        role: invitation.role,
      });

    if (memberError) {
      console.error("[ERR_ACC_MEMBER_ERROR] Add member error:", memberError);
      return new Response(JSON.stringify({ error: "Erreur lors de l'ajout à l'équipe", code: "ERR_ACC_MEMBER_ERROR" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark invitation as accepted
    await adminClient.from("team_invitations").update({ status: "accepted" }).eq("id", invitation.id);

    console.log(`User ${userId} accepted invitation to team ${invitation.team_id} as ${invitation.role}`);

    return new Response(JSON.stringify({ success: true, team_id: invitation.team_id, role: invitation.role }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const error = err as Error;
    const errorCode = "ERR_ACC_INTERNAL";
    console.error(`[${errorCode}] Accept invitation error:`, error);
    return new Response(JSON.stringify({
      error: error.message || "Internal server error",
      code: errorCode
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
