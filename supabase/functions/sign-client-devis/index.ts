import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlToBytes(str: string) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function verifyHs256(token: string, secret: string) {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) return null;

  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    b64urlToBytes(signature),
    enc.encode(`${header}.${payload}`),
  );

  if (!ok) return null;
  const payloadJson = dec.decode(b64urlToBytes(payload));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return JSON.parse(payloadJson) as any;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token, devisId, signatureBase64 } = await req.json();
    if (!token || !devisId || signatureBase64 === undefined) {
      return new Response(JSON.stringify({ error: "Token, ID de devis et signature requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const secret = Deno.env.get("CLIENT_PORTAL_JWT_SECRET");
    if (!secret) throw new Error("CLIENT_PORTAL_JWT_SECRET manquant");

    const payload = await verifyHs256(token, secret);
    if (!payload) {
      return new Response(JSON.stringify({ error: "Token invalide" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (payload.exp && Number(payload.exp) < Math.floor(Date.now() / 1000)) {
      return new Response(JSON.stringify({ error: "Token expiré" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Vérifier la session
    const { data: session } = await admin
      .from("client_portal_sessions")
      .select("id, revoked_at, expires_at, client_id, team_id")
      .eq("id", payload.sid)
      .maybeSingle();

    if (!session || session.revoked_at || new Date(session.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Session portail invalide" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Vérifier l'autorisation d'accès au devis (direct client_id ou via mission)
    const { data: missionRows } = await admin.from("missions").select("id").eq("client_id", session.client_id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const missionIds = (missionRows ?? []).map((m: any) => m.id);

    let devisQ = admin.from("devis").select("id, status").eq("id", devisId);
    if (missionIds.length > 0) {
      devisQ = devisQ.or(`client_id.eq.${session.client_id},mission_id.in.(${missionIds.join(",")})`);
    } else {
      devisQ = devisQ.eq("client_id", session.client_id);
    }
    const { data: devis, error: devisError } = await devisQ.single();

    if (devisError || !devis) {
      return new Response(JSON.stringify({ error: "Devis introuvable ou vous n'avez pas l'autorisation" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (devis.status !== "envoyé") {
      return new Response(JSON.stringify({ error: "Ce devis ne peut plus être signé car il n'est pas au statut 'Envoyé'." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mettre à jour le devis avec les bonnes colonnes !
    const { error: updateError } = await admin
      .from("devis")
      .update({
        status: "signé",
        signature_data: signatureBase64,
        signed_at: new Date().toISOString()
      })
      .eq("id", devisId);

    if (updateError) throw updateError;

    // Mettre à jour la date d'accès
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await admin.from("client_portal_sessions").update({ last_access_at: new Date().toISOString() } as any).eq("id", session.id);

    return new Response(JSON.stringify({ success: true, message: "Devis signé avec succès" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Erreur serveur:", error);
    return new Response(JSON.stringify({ error: "Erreur interne: " + error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
