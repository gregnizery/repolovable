import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type AppRole = "admin" | "manager" | "technicien" | "prestataire" | "superadmin";

interface UserRoleData {
  role: AppRole;
  teamId: string | null;
  isOwner: boolean;
  isSuperAdmin: boolean;
  isOnboarded?: boolean;
}

export function useUserRole() {
  const { user } = useAuth();

  return useQuery<UserRoleData | null>({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user) return null;
      // 1. Fetch team membership
      const { data: memberData, error: memberError } = await supabase
        .from("team_members")
        .select("role, team_id, teams(owner_id)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberError) {
        console.error("Error fetching team_members:", memberError);
      }

      // 2. Fetch profile (for is_superadmin) separately to avoid join issues
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("is_superadmin")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      }

      // If no membership and no profile found at all
      if (!memberData && !profileData) return null;

      const isSuperAdmin = !!profileData?.is_superadmin;

      // Handle the case where they are NOT in a team (e.g. just registered)
      if (!memberData) {
        return {
          role: isSuperAdmin ? "superadmin" : "technicien",
          teamId: null,
          isOwner: false,
          isSuperAdmin
        };
      }

      let isOnboarded = true;
      if (memberData.role === "prestataire") {
        const { data: providerData } = await supabase
          .from("providers")
          .select("is_onboarded")
          .eq("user_id", user.id)
          .maybeSingle();
        isOnboarded = !!providerData?.is_onboarded;
      }

      return {
        role: isSuperAdmin ? "superadmin" : memberData.role as AppRole,
        teamId: memberData.team_id,
        isOwner: (memberData.teams as { owner_id?: string } | null)?.owner_id === user.id,
        isSuperAdmin,
        isOnboarded
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

// Permission checks
const permissions: Record<string, AppRole[]> = {
  dashboard: ["admin", "manager", "technicien", "prestataire", "superadmin"],
  clients: ["admin", "manager", "technicien", "superadmin"],
  missions: ["admin", "manager", "technicien", "prestataire", "superadmin"],
  finance: ["admin", "manager", "superadmin"],
  materiel: ["admin", "manager", "technicien", "superadmin"],
  parametres: ["admin", "manager", "technicien", "prestataire", "superadmin"],
  superadmin: ["superadmin"],
};

export function canAccess(role: AppRole | undefined, section: string): boolean {
  if (!role) return false;
  return (permissions[section] || []).includes(role);
}

export function canEdit(role: AppRole | undefined, section: string): boolean {
  if (!role) return false;
  if (role === "superadmin" || role === "admin") return true;
  if (role === "manager") return ["clients", "missions", "finance", "materiel", "parametres"].includes(section);
  if (role === "technicien") return ["materiel"].includes(section);
  return false; // prestataire = read-only everywhere
}
