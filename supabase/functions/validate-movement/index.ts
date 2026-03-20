import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse } from "../_shared/error-handler.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    // Verify user and get their team
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's team membership
    const { data: memberData, error: memberError } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (memberError || !memberData) {
      return new Response(JSON.stringify({ error: "Utilisateur sans équipe" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userTeamId = memberData.team_id;

    // Parse body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { materiel_id, mission_id, type, quantity } = body as {
      materiel_id: unknown; mission_id: unknown; type: unknown; quantity: unknown;
    };

    // Validate inputs
    if (
      typeof materiel_id !== "string" || !UUID_RE.test(materiel_id) ||
      typeof mission_id !== "string" || !UUID_RE.test(mission_id) ||
      typeof type !== "string" || !["sortie", "retour"].includes(type) ||
      typeof quantity !== "number" || quantity <= 0 || !Number.isInteger(quantity)
    ) {
      return new Response(JSON.stringify({
        error: "Invalid input: materiel_id (UUID), mission_id (UUID), type (sortie|retour), quantity (int > 0) required",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1. Verify materiel ownership
    const { data: mat, error: matErr } = await supabase
      .from("materiel")
      .select("id, name, quantity, status, user_id, team_id")
      .eq("id", materiel_id)
      .single();

    if (matErr || !mat) {
      return json({ valid: false, error: "Matériel introuvable" });
    }
    if (mat.team_id !== userTeamId && mat.user_id !== user.id) {
      return json({ valid: false, error: "Accès refusé" });
    }
    if (mat.status === "hors_service") {
      return json({ valid: false, error: "Matériel hors service" });
    }

    // 2. Verify mission ownership and status
    const { data: mission, error: misErr } = await supabase
      .from("missions")
      .select("id, title, status, start_date, end_date, user_id, team_id")
      .eq("id", mission_id)
      .single();

    if (misErr || !mission) {
      return json({ valid: false, error: "Mission introuvable" });
    }
    if (mission.team_id !== userTeamId && mission.user_id !== user.id) {
      return json({ valid: false, error: "Accès refusé à la mission" });
    }

    // Check mission status allows movements
    const allowedStatuses = ["planifiée", "confirmée", "en_cours"];
    if (!allowedStatuses.includes(mission.status)) {
      return json({ valid: false, error: `Mission en statut "${mission.status}" — mouvements interdits` });
    }

    // 3. Check temporal window (12h buffer)
    const BUFFER_HOURS = 12;
    const now = new Date();
    if (mission.start_date) {
      const earliest = new Date(new Date(mission.start_date).getTime() - BUFFER_HOURS * 3600000);
      if (type === "sortie" && now < earliest) {
        return json({ valid: false, error: `Sortie trop tôt — autorisée à partir de ${earliest.toISOString()}` });
      }
    }

    // 4. Check assignment exists
    const { data: assignment } = await supabase
      .from("mission_materiel")
      .select("id, quantity")
      .eq("mission_id", mission_id)
      .eq("materiel_id", materiel_id)
      .single();

    if (!assignment) {
      return json({ valid: false, error: "Ce matériel n'est pas assigné à cette mission" });
    }

    // 5. Get existing movements for this materiel+mission
    const { data: movements } = await supabase
      .from("stock_movements")
      .select("type, quantity")
      .eq("materiel_id", materiel_id)
      .like("notes", `%${mission_id}%`);

    const totalSortie = (movements || [])
      .filter((m: { type: string }) => m.type === "sortie")
      .reduce((sum: number, m: { quantity: number }) => sum + m.quantity, 0);
    const totalRetour = (movements || [])
      .filter((m: { type: string }) => m.type === "entrée")
      .reduce((sum: number, m: { quantity: number }) => sum + m.quantity, 0);

    if (type === "sortie") {
      const maxSortie = assignment.quantity - totalSortie;
      if (quantity > maxSortie) {
        return json({
          valid: false,
          error: `Sur-sortie : ${quantity} demandé, max ${maxSortie} (assigné=${assignment.quantity}, déjà sorti=${totalSortie})`,
        });
      }
      // Also check physical stock
      if (quantity > mat.quantity) {
        return json({
          valid: false,
          error: `Stock physique insuffisant : ${quantity} demandé, ${mat.quantity} en stock`,
        });
      }
    }

    if (type === "retour") {
      const enDehors = totalSortie - totalRetour;
      if (quantity > enDehors) {
        return json({
          valid: false,
          error: `Sur-retour : ${quantity} demandé, max ${enDehors} en dehors`,
        });
      }
    }

    return json({
      valid: true,
      materiel: { id: mat.id, name: mat.name, stock: mat.quantity },
      mission: { id: mission.id, title: mission.title },
      assigned: assignment.quantity,
      already_out: totalSortie,
      already_returned: totalRetour,
      max_quantity: type === "sortie"
        ? Math.min(assignment.quantity - totalSortie, mat.quantity)
        : totalSortie - totalRetour,
    });
  } catch (err) {
    return errorResponse(err);
  }
});

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
