import { describe, expect, it } from "vitest";
import { getClientPortalErrorMessage, mapClientPortalErrorMessage } from "@/lib/client-portal-errors";

describe("client portal error mapping", () => {
  it("maps expired portal sessions to an actionable message", async () => {
    const error = {
      message: "Edge Function returned a non-2xx status code",
      context: new Response(JSON.stringify({ error: "Session portail invalide" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };

    await expect(getClientPortalErrorMessage(error)).resolves.toBe(
      "Ce lien portail a expire. Demandez un nouveau lien au studio.",
    );
  });

  it("maps the generic edge function failure to a retry message", () => {
    expect(mapClientPortalErrorMessage("Edge Function returned a non-2xx status code")).toBe(
      "Le portail client est momentanement indisponible. Reessayez dans quelques instants.",
    );
  });
});
