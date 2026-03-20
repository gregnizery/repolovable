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

  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("HMAC", key, b64urlToBytes(signature), enc.encode(`${header}.${payload}`));
  if (!ok) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return JSON.parse(dec.decode(b64urlToBytes(payload))) as any;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token, factureId, fileName, mimeType, base64Content, amountDeclared, paymentDate, note } = await req.json();
    if (!token || !factureId || !fileName || !base64Content) {
      return new Response(JSON.stringify({ error: "Paramètres manquants" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const secret = Deno.env.get("CLIENT_PORTAL_JWT_SECRET");
    if (!secret) throw new Error("CLIENT_PORTAL_JWT_SECRET manquant");

    const payload = await verifyHs256(token, secret);
    if (!payload || (payload.exp && Number(payload.exp) < Math.floor(Date.now() / 1000))) {
      return new Response(JSON.stringify({ error: "Token invalide" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: session } = await admin
      .from("client_portal_sessions")
      .select("id, client_id, team_id, revoked_at, expires_at")
      .eq("id", payload.sid)
      .maybeSingle();

    if (!session || session.revoked_at || new Date(session.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Session invalide" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const bytes = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${session.team_id}/${factureId}/${Date.now()}-${sanitizedName}`;

    const { error: uploadError } = await admin.storage.from("payment-proofs").upload(path, bytes, {
      contentType: mimeType || "application/octet-stream",
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { data: signed } = await admin.storage.from("payment-proofs").createSignedUrl(path, 60 * 60 * 24 * 30);

    const { error: dbError } = await admin.from("payment_proofs").insert({
      team_id: session.team_id,
      facture_id: factureId,
      uploaded_by_client_id: session.client_id,
      file_url: signed?.signedUrl ?? path,
      file_name: fileName,
      mime_type: mimeType || null,
      amount_declared: amountDeclared || null,
      payment_date: paymentDate || null,
      note: note || null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    if (dbError) throw dbError;

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: error.message || "Erreur interne" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
