import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse } from "../_shared/error-handler.ts";

const enc = new TextEncoder();
const b64url = (input: string) => btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
const ADMIN_ROLES = new Set(["admin", "manager", "superadmin"]);

type TeamMembership = {
  team_id: string;
  role: string;
  created_at: string;
};

async function signHs256(payload: Record<string, unknown>, secret: string) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = b64url(JSON.stringify(header));
  const encodedPayload = b64url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const sigBytes = new Uint8Array(sigBuffer);
  let binary = "";
  for (const b of sigBytes) binary += String.fromCharCode(b);
  const signature = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `${data}.${signature}`;
}

function resolvePortalTeamId(clientTeamId: string | null, memberships: TeamMembership[]) {
  const elevatedMemberships = memberships.filter((membership) => ADMIN_ROLES.has(membership.role));

  if (elevatedMemberships.length === 0) {
    return { teamId: null, authorized: false };
  }

  if (clientTeamId) {
    return {
      teamId: clientTeamId,
      authorized: elevatedMemberships.some((membership) => membership.team_id === clientTeamId),
    };
  }

  return {
    teamId: elevatedMemberships[0].team_id,
    authorized: true,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Unauthorized", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const secret = Deno.env.get("CLIENT_PORTAL_JWT_SECRET");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Supabase environment variables are missing");
    }

    if (!secret) {
      throw new Error("CLIENT_PORTAL_JWT_SECRET manquant");
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { clientId, expiresInHours = 72 } = await req.json();
    if (!clientId) {
      return new Response(JSON.stringify({ error: "clientId requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const [{ data: clientData, error: clientError }, { data: memberships, error: membershipError }] = await Promise.all([
      supabase
        .from("clients")
        .select("id, team_id")
        .eq("id", clientId)
        .maybeSingle(),
      supabase
        .from("team_members")
        .select("team_id, role, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
    ]);

    if (membershipError) {
      throw new Error("Membership query error: " + JSON.stringify(membershipError));
    }

    if (clientError || !clientData) {
      return new Response(JSON.stringify({ error: "Client introuvable" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { teamId, authorized } = resolvePortalTeamId(
      clientData.team_id,
      (memberships ?? []) as TeamMembership[],
    );

    if (!authorized || !teamId) {
      return new Response(JSON.stringify({ error: "Vous n'avez pas les droits pour generer ce lien portail" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!clientData.team_id) {
      console.warn("Client without team_id for portal session, falling back to membership team", {
        clientId,
        teamId,
        userId: user.id,
      });
    }

    const expiresAt = new Date(Date.now() + Number(expiresInHours) * 3600000).toISOString();

    const { data: session, error: sessionError } = await admin
      .from("client_portal_sessions")
      .insert({
        client_id: clientId,
        team_id: teamId,
        created_by: user.id,
        expires_at: expiresAt,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .select("id, expires_at")
      .single();

    if (sessionError) {
      throw new Error("Portal session creation error: " + JSON.stringify(sessionError));
    }

    const payload = {
      sid: session.id,
      client_id: clientId,
      team_id: teamId,
      exp: Math.floor(new Date(session.expires_at).getTime() / 1000),
      iat: Math.floor(Date.now() / 1000),
    };

    const token = await signHs256(payload, secret);

    return new Response(JSON.stringify({ token, expiresAt: session.expires_at }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    return errorResponse(error);
  }
});
