import {
  appendWorkspaceToSearchParams,
  getRequestedWorkspaceIdentifier,
  isWorkspaceQueryParamEnabled,
  normalizeWorkspaceIdentifier,
} from "@/lib/workspace-routing";

type QueryValue = string | number | boolean | null | undefined;

function getBrowserOrigin() {
  if (typeof window === "undefined") {
    return "http://localhost";
  }

  return window.location.origin;
}

function normalizeBaseUrl(value: string | undefined) {
  if (!value) return null;

  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function getPublicAppBaseUrl() {
  return normalizeBaseUrl(import.meta.env.VITE_PUBLIC_APP_URL) ?? getBrowserOrigin();
}

export function getMarketingBaseUrl() {
  return normalizeBaseUrl(import.meta.env.VITE_MARKETING_URL) ?? getPublicAppBaseUrl();
}

function resolveWorkspaceIdentifier(workspaceIdentifier?: string | null) {
  if (workspaceIdentifier !== undefined) {
    return normalizeWorkspaceIdentifier(workspaceIdentifier);
  }

  if (!isWorkspaceQueryParamEnabled()) {
    return null;
  }

  return getRequestedWorkspaceIdentifier();
}

function applyQueryValues(url: URL, searchParams?: Record<string, QueryValue>) {
  if (!searchParams) return;

  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined || value === null || value === "") {
      url.searchParams.delete(key);
      continue;
    }

    url.searchParams.set(key, String(value));
  }
}

function buildUrl(
  baseUrl: string,
  path: string,
  options?: {
    workspaceIdentifier?: string | null;
    searchParams?: Record<string, QueryValue>;
  },
) {
  const url = new URL(path, baseUrl);
  applyQueryValues(url, options?.searchParams);
  appendWorkspaceToSearchParams(url.searchParams, resolveWorkspaceIdentifier(options?.workspaceIdentifier));
  return url;
}

export function buildRelativeAppPath(
  path: string,
  options?: {
    workspaceIdentifier?: string | null;
    searchParams?: Record<string, QueryValue>;
  },
) {
  const url = buildUrl(getBrowserOrigin(), path, options);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function buildPublicAppUrl(
  path: string,
  options?: {
    workspaceIdentifier?: string | null;
    searchParams?: Record<string, QueryValue>;
  },
) {
  return buildUrl(getPublicAppBaseUrl(), path, options).toString();
}

export function buildMarketingUrl(
  path: string,
  options?: {
    searchParams?: Record<string, QueryValue>;
  },
) {
  return buildUrl(getMarketingBaseUrl(), path, {
    searchParams: options?.searchParams,
    workspaceIdentifier: null,
  }).toString();
}

