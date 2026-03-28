export const WORKSPACE_QUERY_PARAM = "workspace";
export const WORKSPACE_STORAGE_KEY = "planify-active-workspace";

function normalizeSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeHostname(value: string | undefined) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(/^\.+|\.+$/g, "");
  return normalized || null;
}

export function normalizeWorkspaceIdentifier(value: string | null | undefined) {
  if (!value) return null;
  const normalized = normalizeSegment(value);
  return normalized || null;
}

export function parseBooleanEnv(value: string | undefined, defaultValue = false) {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
}

export function isWorkspaceQueryParamEnabled() {
  return parseBooleanEnv(import.meta.env.VITE_POC_WORKSPACE_PARAM_ENABLED, true);
}

export function getWorkspaceParamFromSearch(search: string | URLSearchParams) {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  return normalizeWorkspaceIdentifier(params.get(WORKSPACE_QUERY_PARAM));
}

export function getWorkspaceParamFromPath(pathname: string) {
  const match = pathname.match(/^\/w\/([^/?#]+)/i);
  return normalizeWorkspaceIdentifier(match?.[1] ?? null);
}

export function getWorkspaceParamFromHostname(hostname: string) {
  const baseDomain = normalizeHostname(import.meta.env.VITE_APP_BASE_DOMAIN);
  if (!baseDomain) return null;

  const normalizedHostname = hostname.trim().toLowerCase();
  if (normalizedHostname === baseDomain || !normalizedHostname.endsWith(`.${baseDomain}`)) {
    return null;
  }

  const prefix = normalizedHostname.slice(0, -(baseDomain.length + 1));
  const lastLabel = prefix.split(".").pop();
  if (!lastLabel || ["www", "app"].includes(lastLabel)) {
    return null;
  }

  return normalizeWorkspaceIdentifier(lastLabel);
}

export function getRequestedWorkspaceIdentifier(locationLike?: {
  hostname?: string;
  pathname?: string;
  search?: string;
}) {
  const hostname =
    locationLike?.hostname ??
    (typeof window !== "undefined" ? window.location.hostname : "");
  const pathname =
    locationLike?.pathname ??
    (typeof window !== "undefined" ? window.location.pathname : "/");
  const search =
    locationLike?.search ??
    (typeof window !== "undefined" ? window.location.search : "");

  return (
    getWorkspaceParamFromHostname(hostname) ??
    getWorkspaceParamFromSearch(search) ??
    getWorkspaceParamFromPath(pathname)
  );
}

export function getStoredWorkspaceIdentifier() {
  if (typeof window === "undefined") return null;
  return normalizeWorkspaceIdentifier(window.localStorage.getItem(WORKSPACE_STORAGE_KEY));
}

export function persistWorkspaceIdentifier(identifier: string | null) {
  if (typeof window === "undefined") return;

  if (!identifier) {
    window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(WORKSPACE_STORAGE_KEY, identifier);
}

export function appendWorkspaceToSearchParams(
  searchParams: URLSearchParams,
  workspaceIdentifier?: string | null,
) {
  if (!isWorkspaceQueryParamEnabled()) {
    searchParams.delete(WORKSPACE_QUERY_PARAM);
    return searchParams;
  }

  const normalized = normalizeWorkspaceIdentifier(workspaceIdentifier);
  if (!normalized) {
    searchParams.delete(WORKSPACE_QUERY_PARAM);
    return searchParams;
  }

  searchParams.set(WORKSPACE_QUERY_PARAM, normalized);
  return searchParams;
}
