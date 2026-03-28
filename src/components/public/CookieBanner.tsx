import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const COOKIE_CONSENT_KEY = "planify-cookie-consent";

type CookieConsentChoice = "essential" | "all";

function persistConsent(choice: CookieConsentChoice) {
  window.localStorage.setItem(
    COOKIE_CONSENT_KEY,
    JSON.stringify({
      choice,
      savedAt: new Date().toISOString(),
    }),
  );
}

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const storedChoice = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    setIsVisible(!storedChoice);
  }, []);

  const handleChoice = (choice: CookieConsentChoice) => {
    persistConsent(choice);
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-[70] md:inset-x-6">
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/12 bg-[rgba(18,18,18,0.94)] px-5 py-5 text-white shadow-[0_28px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl md:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="font-landing-mono text-[11px] uppercase tracking-[0.26em] text-white/58">Cookies & traceurs</p>
            <p className="mt-2 text-sm leading-7 text-white/82 md:text-[15px]">
              Nous utilisons des traceurs strictement nécessaires au fonctionnement du site et de l&apos;espace connecté.
              Aucun traceur non essentiel ne doit être activé sans votre accord. Vous pouvez consulter le détail de ces usages dans la{" "}
              <Link className="underline decoration-white/30 underline-offset-4 transition hover:text-white" to="/legal/cookies">
                politique de cookies
              </Link>.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="rounded-full border border-white/12 bg-white/8 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:-translate-y-px hover:bg-white/14"
              onClick={() => handleChoice("essential")}
              type="button"
            >
              Essentiels uniquement
            </button>
            <button
              className="rounded-full border border-[color:#B65A34] bg-[color:#B65A34] px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:-translate-y-px hover:bg-[#cf6a40]"
              onClick={() => handleChoice("all")}
              type="button"
            >
              Tout accepter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
