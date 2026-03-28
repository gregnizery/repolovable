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

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

type PortalLineItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  sort_order: number | null;
};

type PortalDevis = {
  id: string;
  number: string;
  status: string;
  date: string;
  valid_until: string | null;
  total_ttc: number;
  total_ht: number;
  tva_rate: number;
  signature_data: string | null;
  signed_at: string | null;
  devis_items: PortalLineItem[];
};

type PortalFacture = {
  id: string;
  number: string;
  status: string;
  date: string;
  due_date: string | null;
  total_ttc: number;
  total_ht: number;
  tva_rate: number;
  facture_items: PortalLineItem[];
};

function applyClientScope(query: unknown, clientId: string, missionIds: string[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scopedQuery = query as any;
  if (missionIds.length > 0) {
    return scopedQuery.or(`client_id.eq.${clientId},mission_id.in.(${missionIds.join(",")})`);
  }

  return scopedQuery.eq("client_id", clientId);
}

function getGroupedItems(
  rows: Array<PortalLineItem & { parent_id: string }>,
) {
  const itemsByParentId = new Map<string, PortalLineItem[]>();

  for (const row of rows) {
    const parentItems = itemsByParentId.get(row.parent_id) ?? [];
    parentItems.push({
      id: row.id,
      description: row.description,
      quantity: row.quantity,
      unit_price: row.unit_price,
      sort_order: row.sort_order,
    });
    itemsByParentId.set(row.parent_id, parentItems);
  }

  return itemsByParentId;
}

function fileNameFromUrl(fileUrl: string | null | undefined) {
  if (!fileUrl) {
    return "justificatif";
  }

  const cleanUrl = fileUrl.split("?")[0];
  const segments = cleanUrl.split("/");
  return segments[segments.length - 1] || "justificatif";
}

async function fetchMissionIds(admin: ReturnType<typeof createClient>, clientId: string) {
  const { data, error } = await admin
    .from("missions")
    .select("id")
    .eq("client_id", clientId);

  if (error) {
    console.error("Mission lookup error:", error);
    return [];
  }

  return (data ?? []).map((row) => row.id);
}

async function fetchDevis(
  admin: ReturnType<typeof createClient>,
  clientId: string,
  missionIds: string[],
) {
  let devisQuery = admin
    .from("devis")
    .select("id, number, status, date, valid_until, total_ttc, total_ht, tva_rate, signature_data, signed_at")
    .order("date", { ascending: false });

  devisQuery = applyClientScope(devisQuery, clientId, missionIds);

  const { data: devisRows, error: devisError } = await devisQuery;
  if (devisError) {
    throw new Error("Devis query error: " + JSON.stringify(devisError));
  }

  const scopedDevis = (devisRows ?? []).filter((row) => row.status !== "brouillon");
  const devisIds = scopedDevis.map((row) => row.id);

  let itemsByDevisId = new Map<string, PortalLineItem[]>();
  if (devisIds.length > 0) {
    const { data: itemRows, error: itemsError } = await admin
      .from("devis_items")
      .select("id, devis_id, description, quantity, unit_price, sort_order")
      .in("devis_id", devisIds)
      .order("sort_order", { ascending: true });

    if (itemsError) {
      console.error("Devis items query error:", itemsError);
    } else {
      itemsByDevisId = getGroupedItems(
        (itemRows ?? []).map((row) => ({
          id: row.id,
          parent_id: row.devis_id,
          description: row.description,
          quantity: row.quantity,
          unit_price: row.unit_price,
          sort_order: row.sort_order,
        })),
      );
    }
  }

  return scopedDevis.map((row) => ({
    ...row,
    devis_items: itemsByDevisId.get(row.id) ?? [],
  })) as PortalDevis[];
}

async function fetchFactures(admin: ReturnType<typeof createClient>, clientId: string) {
  const { data: factureRows, error: facturesError } = await admin
    .from("factures")
    .select("id, number, status, date, due_date, total_ttc, total_ht, tva_rate")
    .eq("client_id", clientId)
    .order("date", { ascending: false });

  if (facturesError) {
    throw new Error("Factures query error: " + JSON.stringify(facturesError));
  }

  const factureIds = (factureRows ?? []).map((row) => row.id);
  let itemsByFactureId = new Map<string, PortalLineItem[]>();

  if (factureIds.length > 0) {
    const { data: itemRows, error: itemsError } = await admin
      .from("facture_items")
      .select("id, facture_id, description, quantity, unit_price, sort_order")
      .in("facture_id", factureIds)
      .order("sort_order", { ascending: true });

    if (itemsError) {
      console.error("Facture items query error:", itemsError);
    } else {
      itemsByFactureId = getGroupedItems(
        (itemRows ?? []).map((row) => ({
          id: row.id,
          parent_id: row.facture_id,
          description: row.description,
          quantity: row.quantity,
          unit_price: row.unit_price,
          sort_order: row.sort_order,
        })),
      );
    }
  }

  return {
    factures: (factureRows ?? []).map((row) => ({
      ...row,
      facture_items: itemsByFactureId.get(row.id) ?? [],
    })) as PortalFacture[],
    factureIds,
  };
}

async function fetchPaiements(admin: ReturnType<typeof createClient>, factureIds: string[]) {
  if (factureIds.length === 0) {
    return [];
  }

  const { data, error } = await admin
    .from("paiements")
    .select("id, amount, method, payment_date, facture_id, reference")
    .in("facture_id", factureIds);

  if (error) {
    console.error("Paiements query error:", error);
    return [];
  }

  return data ?? [];
}

async function fetchProofs(admin: ReturnType<typeof createClient>, factureIds: string[]) {
  if (factureIds.length === 0) {
    return [];
  }

  const proofSelects = [
    "id, facture_id, file_name, file_url, created_at",
    "id, facture_id, file_url, created_at",
  ];

  for (const selectClause of proofSelects) {
    const { data, error } = await admin
      .from("payment_proofs")
      .select(selectClause)
      .in("facture_id", factureIds)
      .order("created_at", { ascending: false });

    if (!error) {
      return (data ?? []).map((row) => ({
        id: row.id,
        facture_id: row.facture_id,
        file_url: row.file_url,
        created_at: row.created_at,
        file_name: "file_name" in row ? row.file_name ?? fileNameFromUrl(row.file_url) : fileNameFromUrl(row.file_url),
      }));
    }

    console.error("Payment proofs query error:", error);
  }

  return [];
}

async function fetchWhiteLabel(admin: ReturnType<typeof createClient>, teamId: string | null) {
  if (!teamId) {
    return null;
  }

  const selectClauses = [
    "logo_url, primary_color, secondary_color, legal_mentions, support_email, support_phone",
    "logo_url, primary_color, secondary_color, legal_mentions",
  ];

  for (const selectClause of selectClauses) {
    const { data, error } = await admin
      .from("white_label_settings")
      .select(selectClause)
      .eq("team_id", teamId)
      .maybeSingle();

    if (!error) {
      return data;
    }

    console.error("White label query error:", error);
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token } = await req.json();
    if (!token) {
      return jsonResponse({ error: "Token requis" }, 400);
    }

    const secret = Deno.env.get("CLIENT_PORTAL_JWT_SECRET");
    if (!secret) throw new Error("CLIENT_PORTAL_JWT_SECRET manquant");

    const payload = await verifyHs256(token, secret);
    if (!payload) {
      return jsonResponse({ error: "Token invalide" }, 401);
    }

    if (payload.exp && Number(payload.exp) < Math.floor(Date.now() / 1000)) {
      return jsonResponse({ error: "Token expiré" }, 401);
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: session, error: sessionError } = await admin
      .from("client_portal_sessions")
      .select("id, revoked_at, expires_at, client_id, team_id")
      .eq("id", payload.sid)
      .maybeSingle();

    if (sessionError) throw new Error("Session query error: " + JSON.stringify(sessionError));

    if (!session || session.revoked_at || new Date(session.expires_at).getTime() < Date.now()) {
      return jsonResponse({ error: "Session portail invalide" }, 401);
    }

    {
      const { error: sessionUpdateError } = await admin
        .from("client_portal_sessions")
        .update({ last_access_at: new Date().toISOString() } as { last_access_at: string })
        .eq("id", session.id);

      if (sessionUpdateError) {
        console.error("Session update error:", sessionUpdateError);
      }
    }

    const missionIds = await fetchMissionIds(admin, session.client_id);

    const [clientResult, devis, facturesResult, missionsResult, whiteLabel] = await Promise.all([
      admin.from("clients").select("id, name, email, phone, company").eq("id", session.client_id).maybeSingle(),
      fetchDevis(admin, session.client_id, missionIds),
      fetchFactures(admin, session.client_id),
      admin
        .from("missions")
        .select("id, title, status, location, start_date, end_date")
        .eq("client_id", session.client_id)
        .order("start_date", { ascending: false }),
      fetchWhiteLabel(admin, session.team_id),
    ]);

    if (clientResult.error) {
      throw new Error("Client query error: " + JSON.stringify(clientResult.error));
    }

    if (!clientResult.data) {
      return jsonResponse({ error: "Client introuvable pour ce portail" }, 404);
    }

    if (missionsResult.error) {
      console.error("Missions query error:", missionsResult.error);
    }

    const paiements = await fetchPaiements(admin, facturesResult.factureIds);
    const proofs = await fetchProofs(admin, facturesResult.factureIds);

    return jsonResponse(
      {
        client: clientResult.data,
        devis,
        factures: facturesResult.factures,
        missions: missionsResult.data ?? [],
        paiements,
        proofs,
        whiteLabel,
      },
    );
  } catch (error: unknown) {
    return errorResponse(error);
  }
});
