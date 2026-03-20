import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, errorResponse } from "../_shared/error-handler.ts"

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!supabaseUrl || !supabaseServiceKey) {
            return errorResponse("Configuration serveur incomplète (URL/KEY manquantes)");
        }

        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return errorResponse("Authentification requise", 401);
        }

        const body = await req.json().catch(() => ({}));
        const { token } = body;

        if (!token) {
            return errorResponse("Le code d'invitation (token) est requis", 400);
        }

        const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

        const authToken = authHeader.replace("Bearer ", "");
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authToken);

        if (userError || !user) {
            return errorResponse("Session invalide ou expirée", 401);
        }

        // Get the user's team
        const { data: memberData, error: memberError } = await supabaseClient
            .from("team_members")
            .select("team_id, teams(name)")
            .eq("user_id", user.id)
            .maybeSingle();

        if (memberError) {
            return errorResponse(memberError);
        }

        if (!memberData) {
            return errorResponse("Vous n'avez pas d'équipe active.", 403);
        }

        const acceptingTeamId = memberData.team_id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const acceptingTeamName = (memberData.teams as any)?.name || "Mon équipe";

        // Verify token (trimmed and uppercase to be safe)
        const cleanToken = token.trim().toUpperCase();

        const { data: invitation, error: invitationError } = await supabaseClient
            .from("b2b_invitations")
            .select("id, inviting_team_id, status, expires_at")
            .eq("token", cleanToken)
            .maybeSingle();

        if (invitationError) {
            return errorResponse(invitationError);
        }

        if (!invitation) {
            return errorResponse("Code d'invitation invalide ou introuvable.", 404);
        }

        if (invitation.status !== "pending") {
            return errorResponse(`Cette invitation est déjà ${invitation.status}`, 400);
        }

        if (new Date(invitation.expires_at) < new Date()) {
            await supabaseClient.from("b2b_invitations").update({ status: "expired" }).eq("id", invitation.id);
            return errorResponse("Cette invitation a expiré.", 410);
        }

        if (invitation.inviting_team_id === acceptingTeamId) {
            return errorResponse("Connexion à votre propre équipe impossible.", 400);
        }

        // Fetch inviting team name
        const { data: invitingTeam } = await supabaseClient
            .from("teams")
            .select("name")
            .eq("id", invitation.inviting_team_id)
            .single();

        const invitingTeamName = invitingTeam?.name || "Équipe Partenaire";

        // Step-by-step creation
        await supabaseClient.from("b2b_invitations").update({ status: "accepted" }).eq("id", invitation.id);

        // Record in Inviting Team
        await supabaseClient.from("suppliers").insert({
            team_id: invitation.inviting_team_id,
            name: acceptingTeamName,
            connected_team_id: acceptingTeamId,
            notes: "Connecté via Planify B2B",
        });

        // Record in Accepting Team
        await supabaseClient.from("suppliers").insert({
            team_id: acceptingTeamId,
            name: invitingTeamName,
            connected_team_id: invitation.inviting_team_id,
            notes: "Connecté via Planify B2B",
        });

        return new Response(JSON.stringify({ success: true, partner_name: invitingTeamName }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: unknown) {
        return errorResponse(error);
    }
});
