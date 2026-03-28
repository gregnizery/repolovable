import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchUserTeamMemberships,
  type TeamMembership,
} from "@/lib/current-team";
import {
  getRequestedWorkspaceIdentifier,
  getStoredWorkspaceIdentifier,
  normalizeWorkspaceIdentifier,
  persistWorkspaceIdentifier,
} from "@/lib/workspace-routing";

type WorkspaceStatus =
  | "guest"
  | "loading"
  | "resolved"
  | "needs-selection"
  | "not-authorized"
  | "no-team";

interface WorkspaceContextValue {
  status: WorkspaceStatus;
  memberships: TeamMembership[];
  activeMembership: TeamMembership | null;
  activeTeamId: string | null;
  activeWorkspaceIdentifier: string | null;
  requestedWorkspaceIdentifier: string | null;
  refreshKey: string;
  selectWorkspace: (workspaceIdentifier: string | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

function getMembershipWorkspaceIdentifier(membership: TeamMembership) {
  return (
    normalizeWorkspaceIdentifier(membership.teams?.workspace_slug) ??
    normalizeWorkspaceIdentifier(membership.team_id)
  );
}

function findMembershipByIdentifier(
  memberships: TeamMembership[],
  workspaceIdentifier: string | null,
) {
  if (!workspaceIdentifier) return null;
  return (
    memberships.find((membership) => getMembershipWorkspaceIdentifier(membership) === workspaceIdentifier) ??
    null
  );
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const membershipsQuery = useQuery({
    queryKey: ["workspace-memberships", user?.id],
    queryFn: async () => {
      if (!user) return [];
      return fetchUserTeamMemberships(user.id);
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const value = useMemo<WorkspaceContextValue>(() => {
    const requestedWorkspaceIdentifier = getRequestedWorkspaceIdentifier({
      hostname: typeof window !== "undefined" ? window.location.hostname : "",
      pathname: location.pathname,
      search: location.search,
    });

    const memberships = membershipsQuery.data ?? [];
    const storedWorkspaceIdentifier = getStoredWorkspaceIdentifier();

    if (!user) {
      return {
        status: authLoading ? "loading" : "guest",
        memberships: [],
        activeMembership: null,
        activeTeamId: null,
        activeWorkspaceIdentifier: null,
        requestedWorkspaceIdentifier,
        refreshKey: "guest",
        selectWorkspace: persistWorkspaceIdentifier,
      };
    }

    if (authLoading || membershipsQuery.isLoading) {
      return {
        status: "loading",
        memberships,
        activeMembership: null,
        activeTeamId: null,
        activeWorkspaceIdentifier: null,
        requestedWorkspaceIdentifier,
        refreshKey: "loading",
        selectWorkspace: persistWorkspaceIdentifier,
      };
    }

    if (memberships.length === 0) {
      return {
        status: "no-team",
        memberships,
        activeMembership: null,
        activeTeamId: null,
        activeWorkspaceIdentifier: null,
        requestedWorkspaceIdentifier,
        refreshKey: "no-team",
        selectWorkspace: persistWorkspaceIdentifier,
      };
    }

    const explicitMembership = findMembershipByIdentifier(memberships, requestedWorkspaceIdentifier);
    if (requestedWorkspaceIdentifier && !explicitMembership) {
      return {
        status: "not-authorized",
        memberships,
        activeMembership: null,
        activeTeamId: null,
        activeWorkspaceIdentifier: requestedWorkspaceIdentifier,
        requestedWorkspaceIdentifier,
        refreshKey: `unauthorized:${requestedWorkspaceIdentifier}`,
        selectWorkspace: persistWorkspaceIdentifier,
      };
    }

    const storedMembership = findMembershipByIdentifier(memberships, storedWorkspaceIdentifier);
    const singleMembership = memberships.length === 1 ? memberships[0] : null;
    const activeMembership =
      explicitMembership ??
      storedMembership ??
      singleMembership ??
      null;

    if (!activeMembership) {
      return {
        status: "needs-selection",
        memberships,
        activeMembership: null,
        activeTeamId: null,
        activeWorkspaceIdentifier: null,
        requestedWorkspaceIdentifier,
        refreshKey: "selection-required",
        selectWorkspace: persistWorkspaceIdentifier,
      };
    }

    const activeWorkspaceIdentifier = getMembershipWorkspaceIdentifier(activeMembership);

    return {
      status: "resolved",
      memberships,
      activeMembership,
      activeTeamId: activeMembership.team_id,
      activeWorkspaceIdentifier,
      requestedWorkspaceIdentifier,
      refreshKey: `team:${activeMembership.team_id}`,
      selectWorkspace: persistWorkspaceIdentifier,
    };
  }, [
    authLoading,
    location.pathname,
    location.search,
    membershipsQuery.data,
    membershipsQuery.isLoading,
    user,
  ]);

  useEffect(() => {
    if (value.status !== "resolved") {
      if (!user) {
        persistWorkspaceIdentifier(null);
      }
      return;
    }

    persistWorkspaceIdentifier(value.activeWorkspaceIdentifier);
  }, [user, value.activeWorkspaceIdentifier, value.status]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
}

export function getWorkspaceIdentifierForMembership(membership: TeamMembership) {
  return getMembershipWorkspaceIdentifier(membership);
}

