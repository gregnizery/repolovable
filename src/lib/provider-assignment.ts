type ProviderAssignmentCandidate = {
  id: string;
  user_id: string | null;
  team_id?: string | null;
  name: string;
  daily_rate?: number | null;
  hourly_rate?: number | null;
};

type AssignableProvider = ProviderAssignmentCandidate & {
  user_id: string;
};

export function getAssignableProviders<T extends ProviderAssignmentCandidate>(providers: T[]): Array<T & AssignableProvider> {
  return providers.filter((provider): provider is T & AssignableProvider => Boolean(provider.user_id));
}

export function normalizeAssignedProviderId<T extends ProviderAssignmentCandidate>(
  assignedProviderId: string | null | undefined,
  providers: T[],
) {
  if (!assignedProviderId) {
    return null;
  }

  const assignableProviders = getAssignableProviders(providers);
  const matchedByUserId = assignableProviders.find((provider) => provider.user_id === assignedProviderId);
  if (matchedByUserId) {
    return matchedByUserId.user_id;
  }

  const matchedByProviderId = assignableProviders.find((provider) => provider.id === assignedProviderId);
  if (matchedByProviderId) {
    return matchedByProviderId.user_id;
  }

  return assignedProviderId;
}
