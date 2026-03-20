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
        const body = await req.json().catch(() => ({}));
        const { token } = body as { token: string };

        if (!token) {
            return new Response(JSON.stringify({ error: "Token d'invitation manquant" }), {
                status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const adminClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // 1. Try Team Invitations
        const { data: invitation, error: invErr } = await adminClient
            .from("team_invitations")
            .select(`
                id,
                email,
                role,
                status,
                expires_at,
                invited_by,
                team:teams (
                  id,
                  name
                )
            `)
            .eq("token", token)
            .maybeSingle();

        if (invErr) {
            console.error("DB Error fetching team invitation:", invErr);
        }

        if (invitation) {
            // Check status
            if (invitation.status !== "pending") {
                return new Response(JSON.stringify({ error: `Cette invitation a déjà été ${invitation.status === "accepted" ? "acceptée" : "annulée"}` }), {
                    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            // Check expiry
            if (new Date(invitation.expires_at) < new Date()) {
                return new Response(JSON.stringify({ error: "Cette invitation a expiré" }), {
                    status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            // Fetch inviter profile
            let inviterName = "Un administrateur";
            if (invitation.invited_by) {
                const { data: profile } = await adminClient
                    .from("profiles")
                    .select("first_name, last_name, company_name")
                    .eq("user_id", invitation.invited_by)
                    .maybeSingle();

                if (profile) {
                    inviterName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.company_name || "Un administrateur";
                }
            }

            return new Response(JSON.stringify({
                success: true,
                type: "team",
                email: invitation.email,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                team_name: (invitation.team as any)?.name || "L'équipe",
                inviter_name: inviterName,
                role: invitation.role,
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 2. Try B2B Invitations (optional fall-through)
        const cleanB2BToken = token.trim().toUpperCase();
        const { data: b2bInv } = await adminClient
            .from("b2b_invitations")
            .select("*, inviting_team:teams(name)")
            .eq("token", cleanB2BToken)
            .maybeSingle();

        if (b2bInv) {
            if (b2bInv.status !== "pending") {
                return new Response(JSON.stringify({ error: `Cette invitation B2B a déjà été ${b2bInv.status}` }), {
                    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
            if (new Date(b2bInv.expires_at) < new Date()) {
                return new Response(JSON.stringify({ error: "Cette invitation B2B a expiré" }), {
                    status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
            return new Response(JSON.stringify({
                success: true,
                type: "b2b",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                team_name: (b2bInv.inviting_team as any)?.name || "Équipe Partenaire",
                inviter_name: "Un collaborateur",
                role: "partenaire",
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ error: "Invitation introuvable ou lien expiré" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error("View invitation global error:", err);
        return new Response(JSON.stringify({ error: "Erreur serveur lors de la vérification du lien" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
