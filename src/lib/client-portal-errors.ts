export type EdgeFunctionErrorPayload = {
  error?: string;
  code?: string;
};

export type EdgeFunctionErrorLike = {
  message: string;
  context?: unknown;
};

function parseEdgeFunctionPayload(raw: string): EdgeFunctionErrorPayload | null {
  try {
    const payload = JSON.parse(raw) as EdgeFunctionErrorPayload;
    if (payload.error || payload.code) {
      return payload;
    }
  } catch {
    if (raw.trim()) {
      return { error: raw.trim() };
    }
  }

  return null;
}

async function readEdgeFunctionPayload(context: unknown): Promise<EdgeFunctionErrorPayload | null> {
  if (!context) {
    return null;
  }

  if (context instanceof Response) {
    try {
      const payload = await context.clone().json() as EdgeFunctionErrorPayload;
      if (payload.error || payload.code) {
        return payload;
      }
    } catch {
      try {
        const raw = await context.clone().text();
        return parseEdgeFunctionPayload(raw);
      } catch {
        return null;
      }
    }

    return null;
  }

  if (typeof context === "string") {
    return parseEdgeFunctionPayload(context);
  }

  if (typeof context === "object") {
    const payload = context as EdgeFunctionErrorPayload;
    if (payload.error || payload.code) {
      return payload;
    }
  }

  return null;
}

export function mapClientPortalErrorMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("session portail invalide") ||
    normalized.includes("token expir")
  ) {
    return "Ce lien portail a expire. Demandez un nouveau lien au studio.";
  }

  if (normalized.includes("token invalide")) {
    return "Ce lien portail n'est plus valide. Demandez un nouveau lien au studio.";
  }

  if (
    normalized.includes("token requis") ||
    normalized.includes("lien portail incomplet")
  ) {
    return "Le lien du portail est incomplet.";
  }

  if (
    normalized === "edge function returned a non-2xx status code" ||
    normalized.includes("failed to fetch")
  ) {
    return "Le portail client est momentanement indisponible. Reessayez dans quelques instants.";
  }

  return message;
}

export async function getClientPortalErrorMessage(error: EdgeFunctionErrorLike): Promise<string> {
  let message = error.message;
  const payload = await readEdgeFunctionPayload(error.context);

  if (payload?.error) {
    message = payload.error;
  } else if (payload?.code) {
    message = `Erreur serveur (${payload.code})`;
  }

  return mapClientPortalErrorMessage(message);
}
