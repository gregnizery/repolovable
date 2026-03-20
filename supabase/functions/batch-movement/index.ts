import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse } from "../_shared/error-handler.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface MovementItem {
  materiel_id: string;
  quantity: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Missing authorization", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify user and get their team
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    // Get user's team membership
    const { data: memberData, error: memberError } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (memberError || !memberData) {
      return errorResponse("Utilisateur sans équipe", 403);
    }
    const userTeamId = memberData.team_id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON", 400);
    }

    const { mission_id, type, items } = body;

    // Validate top-level
    if (
      typeof mission_id !== "string" || !UUID_RE.test(mission_id) ||
      typeof type !== "string" || !["sortie", "retour"].includes(type) ||
      !Array.isArray(items) || items.length === 0 || items.length > 100
    ) {
      return errorResponse("Invalid input: mission_id (UUID), type (sortie|retour), items (array 1-100) required", 400);
    }

    // Validate each item
    for (const item of items as MovementItem[]) {
      if (
        !item.materiel_id || typeof item.materiel_id !== "string" || !UUID_RE.test(item.materiel_id) ||
        typeof item.quantity !== "number" || item.quantity <= 0 || !Number.isInteger(item.quantity)
      ) {
        return errorResponse(`Invalid item: ${JSON.stringify(item)}`, 400);
      }
    }

    const typedItems = items as MovementItem[];

    // Check for duplicates in batch
    const ids = typedItems.map(i => i.materiel_id);
    if (new Set(ids).size !== ids.length) {
      return errorResponse("Duplicate materiel_id in batch", 400);
    }

    // Verify mission
    const { data: mission, error: misErr } = await supabase
      .from("missions")
      .select("id, title, status, start_date, end_date, user_id, team_id")
      .eq("id", mission_id)
      .single();

    if (misErr || !mission) {
      return errorResponse("Mission introuvable", 404);
    }
    if (mission.team_id !== userTeamId && mission.user_id !== user.id) {
      return errorResponse("Accès refusé à la mission", 403);
    }
    if (!["planifiée", "confirmée", "en_cours"].includes(mission.status)) {
      return errorResponse(`Mission en statut "${mission.status}" — mouvements interdits`, 400);
    }

    // Temporal check for sortie
    const BUFFER_HOURS = 12;
    if (type === "sortie" && mission.start_date) {
      const earliest = new Date(new Date(mission.start_date).getTime() - BUFFER_HOURS * 3600000);
      if (new Date() < earliest) {
        return errorResponse(`Sortie trop tôt — autorisée à partir de ${earliest.toISOString()}`, 400);
      }
    }

    // Fetch details
    const { data: materiels } = await supabase
      .from("materiel")
      .select("id, name, quantity, status, user_id, team_id")
      .in("id", ids);

    const matMap = new Map((materiels || []).map(m => [m.id, m]));

    const { data: assignments } = await supabase
      .from("mission_materiel")
      .select("materiel_id, quantity")
      .eq("mission_id", mission_id)
      .in("materiel_id", ids);

    const assignMap = new Map((assignments || []).map(a => [a.materiel_id, a]));

    const { data: existingMovements } = await supabase
      .from("stock_movements")
      .select("materiel_id, type, quantity")
      .in("materiel_id", ids)
      .like("notes", `%${mission_id}%`);

    const movementAgg = new Map<string, { sortie: number; retour: number }>();
    for (const mv of existingMovements || []) {
      const agg = movementAgg.get(mv.materiel_id) || { sortie: 0, retour: 0 };
      if (mv.type === "sortie") agg.sortie += mv.quantity;
      if (mv.type === "entrée") agg.retour += mv.quantity;
      movementAgg.set(mv.materiel_id, agg);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errors: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validMovements: any[] = [];

    for (const item of typedItems) {
      const mat = matMap.get(item.materiel_id);
      if (!mat) { errors.push({ materiel_id: item.materiel_id, error: "Matériel introuvable" }); continue; }
      if (mat.team_id !== userTeamId && mat.user_id !== user.id) { errors.push({ materiel_id: item.materiel_id, error: "Accès refusé" }); continue; }
      if (mat.status === "hors_service") { errors.push({ materiel_id: item.materiel_id, error: "Hors service" }); continue; }

      const assign = assignMap.get(item.materiel_id);
      if (!assign) { errors.push({ materiel_id: item.materiel_id, error: "Non assigné à cette mission" }); continue; }

      const agg = movementAgg.get(item.materiel_id) || { sortie: 0, retour: 0 };

      if (type === "sortie") {
        const maxSortie = assign.quantity - agg.sortie;
        if (item.quantity > maxSortie) {
          errors.push({ materiel_id: item.materiel_id, error: `Sur-sortie: max ${maxSortie}` }); continue;
        }
        if (item.quantity > mat.quantity) {
          errors.push({ materiel_id: item.materiel_id, error: `Stock insuffisant: ${mat.quantity} dispo` }); continue;
        }
      } else {
        const enDehors = agg.sortie - agg.retour;
        if (item.quantity > enDehors) {
          errors.push({ materiel_id: item.materiel_id, error: `Sur-retour: max ${enDehors} en dehors` }); continue;
        }
      }
      validMovements.push({ materiel_id: item.materiel_id, quantity: item.quantity, mat_name: mat.name });
    }

    if (errors.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "Validation failed for some items",
        details: errors,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const movementType = type === "sortie" ? "sortie" : "entrée";
    const reason = type === "sortie" ? "sortie_mission" : "retour_mission";

    const insertRows = validMovements.map(vm => ({
      materiel_id: vm.materiel_id,
      type: movementType,
      quantity: vm.quantity,
      reason,
      notes: `Mission: ${mission_id}`,
      user_id: user.id,
      team_id: userTeamId,
    }));

    const { error: insertError } = await supabase
      .from("stock_movements")
      .insert(insertRows);

    if (insertError) {
      return errorResponse(insertError);
    }

    return new Response(JSON.stringify({
      success: true,
      type,
      mission_title: mission.title,
      count: validMovements.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return errorResponse(err);
  }
});
