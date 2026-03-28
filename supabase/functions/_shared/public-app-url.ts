const WORKSPACE_QUERY_PARAM = "workspace";

function normalizeWorkspaceIdentifier(value: string | null | undefined) {
  if (!value) return null;

  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || null;
}

function parseBooleanEnv(value: string | undefined, defaultValue = false) {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
}

function extractOrigin(urlLike: string | null) {
  if (!urlLike) return null;

  try {
    return new URL(urlLike).origin;
  } catch {
    return null;
  }
}

export function resolvePublicAppOrigin(req: Request) {
  const configuredOrigin =
    extractOrigin(Deno.env.get("APP_PUBLIC_URL")) ??
    extractOrigin(Deno.env.get("PUBLIC_APP_URL"));

  if (configuredOrigin) {
    return configuredOrigin;
  }

  const headerOrigin =
    extractOrigin(req.headers.get("origin")) ??
    extractOrigin(req.headers.get("referer"));

  return headerOrigin ?? "http://localhost:4173";
}

export function buildPublicAppUrl(
  req: Request,
  path: string,
  options?: {
    searchParams?: Record<string, string | number | boolean | null | undefined>;
    workspaceIdentifier?: string | null;
  },
) {
  const url = new URL(path, resolvePublicAppOrigin(req));

  if (options?.searchParams) {
    for (const [key, value] of Object.entries(options.searchParams)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }

  if (parseBooleanEnv(Deno.env.get("APP_POC_WORKSPACE_PARAM_ENABLED"), true)) {
    const workspaceIdentifier = normalizeWorkspaceIdentifier(options?.workspaceIdentifier);
    if (workspaceIdentifier) {
      url.searchParams.set(WORKSPACE_QUERY_PARAM, workspaceIdentifier);
    }
  }

  return url.toString();
}
