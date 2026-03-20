import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse } from "../_shared/error-handler.ts";

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
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"],
  );
  const ok = await crypto.subtle.verify(
    "HMAC", key, b64urlToBytes(signature), enc.encode(`${header}.${payload}`),
  );
  if (!ok) return null;
  const payloadJson = dec.decode(b64urlToBytes(payload));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return JSON.parse(payloadJson) as any;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "Token requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    const { data: session } = await admin
      .from("client_portal_sessions")
      .select("id, revoked_at, expires_at, client_id, team_id")
      .eq("id", payload.sid)
      .maybeSingle();

    if (!session || session.revoked_at || new Date(session.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Session portail invalide" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await admin.from("client_portal_sessions").update({ last_access_at: new Date().toISOString() } as any).eq("id", session.id);

    // Get mission IDs for this client (for devis linked via mission)
    const { data: missionRows } = await admin.from("missions").select("id").eq("client_id", session.client_id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const missionIds = (missionRows ?? []).map((m: any) => m.id);

    // Build devis OR filter (client_id direct OR via mission)
    // NOTE: Do NOT chain .neq() before .or() — filter in JS instead to avoid silent Supabase JS issue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let devisQ = (admin as any).from("devis").select(`
      id, number, status, date, valid_until, total_ttc, total_ht, tva_rate, signature_data, signed_at,
      devis_items ( id, description, quantity, unit_price, sort_order )
    `).order("date", { ascending: false });

    if (missionIds.length > 0) {
      devisQ = devisQ.or(`client_id.eq.${session.client_id},mission_id.in.(${missionIds.join(",")})`);
    } else {
      devisQ = devisQ.eq("client_id", session.client_id);
    }

    const { data: allDevisRaw, error: devisErr } = await devisQ;
    if (devisErr) throw new Error("Devis query error: " + JSON.stringify(devisErr));
    // Filter out brouillon in JS (safe, avoids .neq chain conflict with .or)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const devis = (allDevisRaw ?? []).filter((d: any) => d.status !== "brouillon");

    // Pre-fetch factures for paiements
    const { data: fRows, error: fErr } = await admin.from("factures").select("id").eq("client_id", session.client_id);
    if (fErr) throw new Error("Factures basic query error: " + JSON.stringify(fErr));

    const [rClient, rFactures, rMissions, rPaiements, rProofs, rWhiteLabel] = await Promise.all([
      admin.from("clients").select("id, name, email, phone, company").eq("id", session.client_id).maybeSingle(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin as any).from("factures").select(`
        id, number, status, date, due_date, total_ttc, total_ht, tva_rate,
        facture_items ( id, description, quantity, unit_price, sort_order )
      `).eq("client_id", session.client_id).order("date", { ascending: false }),
      admin.from("missions").select("id, title, status, location, start_date, end_date").eq("client_id", session.client_id).order("start_date", { ascending: false }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      admin.from("paiements").select("id, amount, method, payment_date, facture_id, reference, validation_status").in("facture_id", (fRows ?? []).map((f: any) => f.id)),
      admin.from("payment_proofs").select("id, facture_id, file_name, file_url, created_at, amount_declared").eq("uploaded_by_client_id", session.client_id).order("created_at", { ascending: false }),
      admin.from("white_label_settings").select("logo_url, primary_color, secondary_color, legal_mentions, support_email, support_phone").eq("team_id", session.team_id).maybeSingle(),
    ]);

    if (rClient.error) throw new Error("Client query error: " + JSON.stringify(rClient.error));
    if (rFactures.error) throw new Error("Factures join query error: " + JSON.stringify(rFactures.error));
    if (rMissions.error) throw new Error("Missions query error: " + JSON.stringify(rMissions.error));
    if (rPaiements.error) throw new Error("Paiements query error: " + JSON.stringify(rPaiements.error));
    if (rProofs.error) throw new Error("Proofs query error: " + JSON.stringify(rProofs.error));
    if (rWhiteLabel.error) throw new Error("White label query error: " + JSON.stringify(rWhiteLabel.error));

    const client = rClient.data;
    const factures = rFactures.data;
    const missions = rMissions.data;
    const paiements = rPaiements.data;
    const proofs = rProofs.data;
    const whiteLabel = rWhiteLabel.data;

    return new Response(
      JSON.stringify({ client, devis, factures: factures ?? [], missions: missions ?? [], paiements: paiements ?? [], proofs: proofs ?? [], whiteLabel }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    return errorResponse(error);
  }
});
