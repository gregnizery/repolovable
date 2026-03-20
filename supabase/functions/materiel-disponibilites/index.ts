import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Missing authorization" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // Get user's team membership
    const { data: memberData, error: memberError } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (memberError || !memberData) {
      return json({ error: "Utilisateur sans équipe" }, 403);
    }
    const userTeamId = memberData.team_id;

    // Get all team's materiel
    const { data: materiels, error: matErr } = await supabase
      .from("materiel")
      .select("id, name, category, quantity, status, location, serial_number, rental_price, team_id, user_id")
      .or(`team_id.eq.${userTeamId},user_id.eq.${user.id}`)
      .order("name");

    if (matErr) throw matErr;
    if (!materiels || materiels.length === 0) {
      return json({ items: [], summary: { total: 0, disponible: 0, en_mission: 0, maintenance: 0, hors_service: 0, conflicts: 0 } });
    }

    const matIds = materiels.map(m => m.id);
    const now = new Date().toISOString();

    // Get all active mission assignments
    const { data: assignments } = await supabase
      .from("mission_materiel")
      .select("materiel_id, quantity, mission_id, missions(id, title, status, start_date, end_date)")
      .in("materiel_id", matIds);

    // Get all stock movements
    const { data: movements } = await supabase
      .from("stock_movements")
      .select("materiel_id, type, quantity, reason, notes")
      .in("materiel_id", matIds);

    // Build availability per materiel
    const BUFFER_HOURS = 12;
    const MISSING_RETURN_DAYS = 7;
    const bufferMs = BUFFER_HOURS * 3600000;
    const missingReturnMs = MISSING_RETURN_DAYS * 86400000;
    const nowMs = Date.now();

    let totalConflicts = 0;

    const items = materiels.map(mat => {
      const matAssignments = (assignments || []).filter(a => a.materiel_id === mat.id);
      const matMovements = (movements || []).filter(m => m.materiel_id === mat.id);

      let assignedQty = 0;
      let blockedQty = 0;
      const conflicts: Array<{ type: string; mission_title: string; quantity: number; detail: string }> = [];

      for (const assign of matAssignments) {
        const mission = assign.missions as unknown as {
          id: string; title: string; status: string; start_date: string | null; end_date: string | null;
        };
        if (!mission) continue;

        // Active missions with overlap to now
        if (["planifiée", "confirmée", "en_cours"].includes(mission.status)) {
          if (mission.start_date && mission.end_date) {
            const start = new Date(mission.start_date).getTime() - bufferMs;
            const end = new Date(mission.end_date).getTime() + bufferMs;
            if (start <= nowMs && end >= nowMs) {
              assignedQty += assign.quantity;
              conflicts.push({
                type: "mission_active",
                mission_title: mission.title,
                quantity: assign.quantity,
                detail: `${mission.status}`,
              });
            }
          }
        }

        // Missing returns
        if (["terminée", "annulée"].includes(mission.status) && mission.end_date) {
          const endMs = new Date(mission.end_date).getTime();
          if (endMs + missingReturnMs > nowMs) {
            const returned = matMovements
              .filter(m => m.type === "entrée" && m.reason === "retour_mission" && m.notes?.includes(mission.id))
              .reduce((sum, m) => sum + m.quantity, 0);
            const missing = assign.quantity - returned;
            if (missing > 0) {
              blockedQty += missing;
              conflicts.push({
                type: "retour_manquant",
                mission_title: mission.title,
                quantity: missing,
                detail: `Retour manquant: ${missing} unité(s)`,
              });
            }
          }
        }
      }

      const disponible = Math.max(0, mat.quantity - assignedQty - blockedQty);
      if (conflicts.length > 0) totalConflicts++;

      return {
        id: mat.id,
        name: mat.name,
        category: mat.category,
        location: mat.location,
        serial_number: mat.serial_number,
        rental_price: mat.rental_price,
        status: mat.status,
        stock_total: mat.quantity,
        assigned: assignedQty,
        blocked: blockedQty,
        disponible,
        conflicts,
      };
    });

    const summary = {
      total: materiels.length,
      disponible: items.filter(i => i.disponible > 0 && i.status !== "hors_service").length,
      en_mission: items.filter(i => i.assigned > 0).length,
      maintenance: items.filter(i => i.status === "maintenance").length,
      hors_service: items.filter(i => i.status === "hors_service").length,
      conflicts: totalConflicts,
      total_stock: items.reduce((s, i) => s + i.stock_total, 0),
      total_available: items.reduce((s, i) => s + i.disponible, 0),
      total_assigned: items.reduce((s, i) => s + i.assigned, 0),
      total_blocked: items.reduce((s, i) => s + i.blocked, 0),
    };

    return json({ items, summary, timestamp: now });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
