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
            return new Response(JSON.stringify({ error: "Unauthorized", code: "SYNC_001" }), {
                status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const token = authHeader.replace("Bearer ", "");
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            { global: { headers: { Authorization: authHeader } } }
        );

        // Get user from token
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
        if (userError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized", code: "SYNC_002" }), {
                status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const adminClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        console.log(`Manually resyncing profile for user: ${user.id} (${user.email})`);

        // 1. Ensure Profile exists
        const { data: profile, error: profileError } = await adminClient
            .from("profiles")
            .upsert({
                user_id: user.id,
                first_name: user.raw_user_meta_data?.first_name || null,
                last_name: user.raw_user_meta_data?.last_name || null,
                company_name: user.raw_user_meta_data?.company_name || null,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })
            .select()
            .single();

        if (profileError) {
            throw profileError;
        }

        // 2. Check if user is in any team
        const { data: membership } = await adminClient
            .from("team_members")
            .select("id, team_id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (!membership) {
            console.log("No membership found, checking for pending invitations...");

            // Try to find if user has an invitation token in metadata
            const invitationToken = user.raw_user_meta_data?.invitation_token;
            if (invitationToken) {
                const { data: invite } = await adminClient
                    .from("team_invitations")
                    .select("*")
                    .eq("token", invitationToken)
                    .eq("status", "pending")
                    .maybeSingle();

                if (invite) {
                    console.log(`Found pending invitation for team ${invite.team_id}. Joining...`);
                    await adminClient.from("team_members").insert({
                        team_id: invite.team_id,
                        user_id: user.id,
                        role: invite.role
                    });
                    await adminClient.from("team_invitations").update({ status: "accepted" }).eq("id", invite.id);
                }
            }

            // Final check: if still no team and not an invited user, create a default team
            const finalMembership = await adminClient.from("team_members").select("id").eq("user_id", user.id).maybeSingle();
            if (!finalMembership.data) {
                console.log("Creating default personal team...");
                const teamName = user.raw_user_meta_data?.company_name || user.email?.split('@')[0] || "Mon équipe";
                const { data: newTeam, error: teamErr } = await adminClient
                    .from("teams")
                    .insert({ name: teamName, owner_id: user.id })
                    .select()
                    .single();

                if (!teamErr && newTeam) {
                    await adminClient.from("team_members").insert({
                        team_id: newTeam.id,
                        user_id: user.id,
                        role: "admin"
                    });
                }
            }
        }

        return new Response(JSON.stringify({ success: true, profile }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error("Resync error:", err);
        return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Sync failed", code: "SYNC_INTERNAL" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
