import { supabase } from "@/integrations/supabase/client";
import { getStoredWorkspaceIdentifier, normalizeWorkspaceIdentifier } from "@/lib/workspace-routing";

export interface TeamMembership {
  team_id: string;
  role: string;
  created_at: string;
  teams: {
    id: string;
    name: string;
    owner_id: string;
    plan?: string | null;
    auto_reminder_enabled?: boolean | null;
    workspace_slug?: string | null;
  } | null;
}

const TEAM_MEMBERS_SELECT =
  "team_id, role, created_at, teams(id, name, owner_id, plan, auto_reminder_enabled, workspace_slug)";
const TEAM_MEMBERS_SELECT_FALLBACK =
  "team_id, role, created_at, teams(id, name, owner_id, plan, auto_reminder_enabled)";

function matchesWorkspace(membership: TeamMembership, workspaceIdentifier: string | null) {
  if (!workspaceIdentifier) return false;
  return (
    normalizeWorkspaceIdentifier(membership.teams?.workspace_slug) === workspaceIdentifier ||
    normalizeWorkspaceIdentifier(membership.team_id) === workspaceIdentifier
  );
}

export async function fetchUserTeamMemberships(userId: string): Promise<TeamMembership[]> {
  const query = async (select: string) =>
    supabase
      .from("team_members")
      .select(select)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

  let result = await query(TEAM_MEMBERS_SELECT);
  if (result.error && result.error.message.includes("workspace_slug")) {
    result = await query(TEAM_MEMBERS_SELECT_FALLBACK);
  }

  if (result.error) {
    throw result.error;
  }

  return (result.data ?? []) as TeamMembership[];
}

export async function fetchCurrentTeamMembership(
  userId: string,
  workspaceIdentifier?: string | null,
) {
  const memberships = await fetchUserTeamMemberships(userId);
  if (!memberships.length) return null;

  const requestedWorkspace =
    normalizeWorkspaceIdentifier(workspaceIdentifier) ?? getStoredWorkspaceIdentifier();

  if (requestedWorkspace) {
    const matchingMembership = memberships.find((membership) =>
      matchesWorkspace(membership, requestedWorkspace),
    );
    if (matchingMembership) {
      return matchingMembership;
    }
  }

  return memberships[0] ?? null;
}

export async function fetchCurrentTeamId(userId: string, workspaceIdentifier?: string | null) {
  const membership = await fetchCurrentTeamMembership(userId, workspaceIdentifier);
  return membership?.team_id ?? null;
}
