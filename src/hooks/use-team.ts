import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/use-workspace";

export interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  daily_rate?: number;
  hourly_rate?: number;
}

export function useTeam() {
  const { activeMembership, refreshKey, status } = useWorkspace();

  return useQuery({
    queryKey: ["team", refreshKey],
    queryFn: async () => activeMembership,
    enabled: status === "resolved",
    initialData: activeMembership,
    staleTime: 60 * 1000,
  });
}

export function useTeamMembers(teamId: string | undefined) {
  return useQuery<TeamMember[]>({
    queryKey: ["team-members", teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data, error } = await supabase.rpc("get_team_members_with_profiles", {
        _team_id: teamId,
      });
      if (error) throw error;
      return (data as unknown as TeamMember[]) || [];
    },
    enabled: !!teamId,
  });
}

export function useTeamInvitations(teamId: string | undefined) {
  return useQuery({
    queryKey: ["team-invitations", teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data, error } = await supabase
        .from("team_invitations")
        .select("*")
        .eq("team_id", teamId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });
}

export function useInviteTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, role, teamId }: { email: string; role: string; teamId: string }) => {
      const { data, error } = await supabase.functions.invoke("invite-team-member", {
        body: { email, role, team_id: teamId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-invitations"] });
      toast.success("Invitation envoyée par email !");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erreur lors de l'envoi de l'invitation");
    },
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationToken: string) => {
      const { data, error } = await supabase.functions.invoke("accept-invitation", {
        body: { invitation_token: invitationToken },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Vous avez rejoint l'équipe !");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erreur lors de l'acceptation");
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Membre retiré de l'équipe");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const { error } = await supabase
        .from("team_members")
        .update({ role } as Record<string, unknown>)
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Rôle mis à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour du rôle");
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from("team_invitations")
        .delete()
        .eq("id", invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-invitations"] });
      toast.success("Invitation annulée");
    },
    onError: () => {
      toast.error("Erreur lors de l'annulation");
    },
  });
}

export function useInviteProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, teamId }: { email: string; teamId: string }) => {
      const { data, error } = await supabase.functions.invoke("invite-provider", {
        body: { email, team_id: teamId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-invitations"] });
      toast.success("Invitation prestataire envoyée !");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erreur lors de l'envoi de l'invitation");
    },
  });
}
export function useUpdateTeamSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, settings }: { teamId: string; settings: { auto_reminder_enabled?: boolean; name?: string } }) => {
      const { error } = await supabase
        .from("teams")
        .update(settings)
        .eq("id", teamId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      toast.success("Paramètres de l'équipe mis à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour des paramètres");
    },
  });
}
