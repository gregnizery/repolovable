import type { CSSProperties } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { CookieBanner } from "@/components/public/CookieBanner";

type LegalBlock = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  note?: string;
};

type LegalDocument = {
  title: string;
  eyebrow: string;
  intro: string;
  blocks: LegalBlock[];
};

const legalPalette = {
  accent: "#B65A34",
  dark: "#2F241D",
  paper: "#F4EFE7",
  ink: "#EDE6DB",
  muted: "#BFB2A2",
  panel: "#171311",
  panelBorder: "rgba(255,255,255,0.1)",
};

const documents: Record<string, LegalDocument> = {
  "mentions-legales": {
    title: "Mentions légales",
    eyebrow: "Informations d'édition",
    intro:
      "Cette page regroupe les informations générales de publication du site Planify. Les identifiants exacts de l'exploitant doivent être complétés avant toute diffusion commerciale ouverte.",
    blocks: [
      {
        title: "Éditeur du site",
        paragraphs: [
          "Le site Planify présente une plateforme de gestion de missions logistiques dans l'événementiel.",
          "L'exploitant du service doit renseigner ici sa dénomination sociale, sa forme juridique, le montant de son capital social, l'adresse de son siège social, son numéro RCS, son numéro SIRET, son numéro de TVA intracommunautaire ainsi que l'identité du directeur de la publication.",
          "À défaut de ces informations exhaustives, la page ne remplace pas une validation juridique finale.",
        ],
      },
      {
        title: "Contact",
        paragraphs: [
          "Adresse de contact public actuellement affichée dans l'application : contact@planify.fr.",
          "Cette adresse doit être confirmée ou remplacée par l'adresse de contact officielle de l'exploitant avant mise en production commerciale ouverte.",
        ],
      },
      {
        title: "Hébergement",
        paragraphs: [
          "Le front public est diffusé via une infrastructure cloud opérée pour le compte de Planify, pouvant évoluer entre plusieurs fournisseurs d'hébergement selon les besoins du service.",
          "Les services applicatifs et fonctions serveur s'appuient notamment sur Supabase pour l'authentification, la base de données et certaines Edge Functions.",
        ],
      },
      {
        title: "Propriété intellectuelle",
        paragraphs: [
          "L'ensemble des contenus, marques, interfaces, textes, graphismes, animations et composants logiciels du site demeure protégé par le droit de la propriété intellectuelle.",
          "Toute reproduction, représentation, adaptation, extraction ou réutilisation non autorisée, totale ou partielle, est interdite sauf accord écrit préalable de l'exploitant ou du titulaire concerné.",
        ],
      },
      {
        title: "Point d'attention avant publication large",
        bullets: [
          "Compléter les mentions d'identification de l'éditeur : société, capital, siège, RCS, SIRET, TVA.",
          "Compléter le nom du directeur de la publication.",
          "Vérifier la cohérence entre ces informations publiques et les documents émis par l'application.",
          "Faire relire l'ensemble par un conseil juridique si le service est exploité à grande échelle.",
        ],
        note:
          "Cette page constitue une base opérationnelle, pas une validation juridique définitive.",
      },
    ],
  },
  cgu: {
    title: "Conditions générales d'utilisation",
    eyebrow: "Usage du site et de la plateforme",
    intro:
      "Les présentes conditions encadrent l'accès au site public Planify et, plus largement, l'usage de la plateforme par ses utilisateurs autorisés.",
    blocks: [
      {
        title: "Objet",
        paragraphs: [
          "Planify permet de piloter des missions logistiques événementielles, de gérer des clients, des équipes, du matériel et des flux financiers liés à l'exécution des opérations.",
          "Les présentes CGU définissent les règles d'accès, d'utilisation et de responsabilité applicables au site public et aux espaces connectés.",
        ],
      },
      {
        title: "Accès au service",
        bullets: [
          "L'accès à certaines fonctions suppose la création d'un compte ou une invitation préalable.",
          "L'utilisateur s'engage à fournir des informations exactes, à protéger ses identifiants et à signaler sans délai tout usage non autorisé.",
          "L'exploitant peut suspendre ou restreindre l'accès en cas de risque de sécurité, de fraude, d'abus manifeste ou de violation des présentes CGU.",
        ],
      },
      {
        title: "Règles d'usage",
        bullets: [
          "Ne pas détourner le service de son objet professionnel.",
          "Ne pas tenter d'accéder à des données, comptes ou ressources sans autorisation.",
          "Ne pas injecter de contenu illicite, malveillant, diffamatoire ou portant atteinte aux droits de tiers.",
          "Respecter les règles légales, contractuelles et internes applicables aux missions gérées via la plateforme.",
        ],
      },
      {
        title: "Disponibilité et évolution",
        paragraphs: [
          "Le service est fourni en l'état, avec des opérations de maintenance, de correction ou d'évolution susceptibles d'affecter temporairement l'accès.",
          "L'exploitant peut modifier les fonctionnalités, l'interface, les conditions d'accès ou les présentes CGU afin de tenir compte d'évolutions légales, techniques ou produit.",
        ],
      },
      {
        title: "Responsabilité",
        paragraphs: [
          "L'utilisateur reste responsable de la qualité, de la licéité et de l'exactitude des données qu'il saisit ou importe dans la plateforme.",
          "L'exploitant ne saurait être tenu responsable des pertes indirectes, pertes de chance, pertes d'exploitation ou conséquences liées à un usage non conforme, à des données erronées ou à une indisponibilité externe indépendante de sa volonté.",
        ],
      },
      {
        title: "Droit applicable",
        paragraphs: [
          "Les présentes CGU sont soumises au droit français, sous réserve des règles impératives éventuellement applicables.",
          "En cas de litige, les parties rechercheront d'abord une solution amiable avant toute action contentieuse.",
        ],
      },
    ],
  },
  confidentialite: {
    title: "Politique de confidentialité",
    eyebrow: "Données personnelles",
    intro:
      "Cette politique décrit les principales catégories de données traitées via Planify, les finalités poursuivies et les droits des personnes concernées.",
    blocks: [
      {
        title: "Responsable du traitement",
        paragraphs: [
          "Le responsable du traitement est l'entité qui exploite effectivement la plateforme Planify pour son compte et, selon les cas, pour le compte de ses clients professionnels.",
          "Ses coordonnées complètes doivent être publiées ici avant toute diffusion large du service.",
        ],
      },
      {
        title: "Catégories de données traitées",
        bullets: [
          "Données d'identification et de contact : nom, prénom, email, téléphone, société, rôle.",
          "Données opérationnelles : missions, affectations, planning, matériel, documents, échanges liés aux opérations.",
          "Données financières et administratives : devis, factures, paiements, informations légales utiles à l'édition documentaire.",
          "Données techniques : journaux de connexion, informations de sécurité, préférences d'interface et événements techniques nécessaires au fonctionnement du service.",
        ],
      },
      {
        title: "Finalités et bases juridiques",
        bullets: [
          "Exécuter le service et administrer les comptes utilisateurs.",
          "Gérer les missions, documents, relations clients, fournisseurs et prestataires.",
          "Assurer la sécurité, la maintenance, la traçabilité et la prévention des abus.",
          "Respecter les obligations légales, comptables et réglementaires applicables.",
        ],
      },
      {
        title: "Destinataires et sous-traitants",
        paragraphs: [
          "Les données sont accessibles aux équipes autorisées de l'exploitant ainsi qu'aux personnes habilitées par les organisations clientes dans la limite de leurs droits d'accès.",
          "Des sous-traitants techniques peuvent intervenir pour l'hébergement, la base de données, l'authentification, l'envoi d'emails transactionnels, le stockage de fichiers et la diffusion applicative.",
        ],
      },
      {
        title: "Durées de conservation",
        bullets: [
          "Les données de compte et d'exploitation sont conservées pendant la durée de la relation contractuelle ou d'usage actif.",
          "Certaines pièces, journaux ou documents financiers peuvent être conservés plus longtemps afin de respecter les obligations légales ou de preuve.",
          "Les durées exactes doivent être adaptées à la politique interne de l'exploitant et aux obligations sectorielles applicables.",
        ],
      },
      {
        title: "Vos droits",
        paragraphs: [
          "Sous réserve des limites prévues par la réglementation, vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et, lorsque c'est applicable, d'un droit à la portabilité.",
          "Vous pouvez exercer ces droits en contactant l'exploitant à l'adresse publiée sur cette page. Vous disposez également du droit d'introduire une réclamation auprès de la CNIL.",
        ],
      },
      {
        title: "Références utiles",
        bullets: [
          "CNIL - Comprendre vos droits : https://www.cnil.fr/fr/comprendre-mes-droits",
          "CNIL - Obligation d'information des personnes : https://www.cnil.fr/fr/informer-les-personnes-et-assurer-la-transparence",
        ],
      },
    ],
  },
  cookies: {
    title: "Politique de cookies",
    eyebrow: "Traceurs et préférences",
    intro:
      "Cette politique décrit les traceurs strictement nécessaires actuellement utilisés sur le site et rappelle les principes de consentement applicables en France.",
    blocks: [
      {
        title: "Principe général",
        paragraphs: [
          "Les traceurs strictement nécessaires au fonctionnement, à la sécurité ou à la conservation des préférences essentielles peuvent être déposés sans consentement préalable.",
          "Les traceurs de mesure d'audience non exemptés, de personnalisation non essentielle, de publicité ou de partage social ne doivent pas être activés avant le recueil d'un consentement valable.",
        ],
      },
      {
        title: "Traceurs actuellement identifiés dans l'application",
        bullets: [
          "“planify-cookie-consent” : conservation locale du choix exprimé dans le bandeau cookies.",
          "“sidebar:state” : cookie de préférence d'interface utilisé dans l'espace connecté pour mémoriser l'état d'ouverture de la barre latérale, durée actuelle de 7 jours.",
          "Cookies ou mécanismes de session d'authentification nécessaires à la connexion sécurisée et à la protection des espaces utilisateurs.",
        ],
      },
      {
        title: "Ce que le bandeau permet aujourd'hui",
        paragraphs: [
          "Le bandeau permet de choisir entre l'acceptation des seuls traceurs essentiels et l'acceptation de tous les traceurs.",
          "À la date de dernière mise à jour de cette page, aucun traceur publicitaire ou de mesure d'audience non essentiel n'est activé par défaut sur le site public.",
        ],
      },
      {
        title: "Retrait du consentement et paramétrage",
        bullets: [
          "Vous pouvez supprimer les cookies et le stockage local depuis votre navigateur.",
          "Vous pouvez également revenir sur vos choix lorsque le site proposera un centre de préférences plus détaillé.",
          "Le refus des traceurs non essentiels ne doit pas empêcher l'accès aux fonctions strictement nécessaires du site.",
        ],
      },
      {
        title: "Références utiles",
        bullets: [
          "CNIL - Cookies et autres traceurs : https://www.cnil.fr/fr/cookies-et-autres-traceurs",
          "CNIL - FAQ cookies et consentement : https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/FAQ",
        ],
        note:
          "Cette politique doit être mise à jour si de nouveaux outils de mesure d'audience, de marketing ou d'A/B testing sont ajoutés.",
      },
    ],
  },
};

const legalNav = [
  { slug: "mentions-legales", label: "Mentions légales" },
  { slug: "cgu", label: "CGU" },
  { slug: "confidentialite", label: "Confidentialité" },
  { slug: "cookies", label: "Cookies" },
];

export default function PublicLegalPage() {
  const { slug = "mentions-legales" } = useParams();
  const document = documents[slug];

  if (!document) {
    return <Navigate to="/legal/mentions-legales" replace />;
  }

  return (
    <div
      className="min-h-screen bg-[#100d0c] text-[color:var(--legal-ink)]"
      style={
        {
          "--legal-accent": legalPalette.accent,
          "--legal-dark": legalPalette.dark,
          "--legal-paper": legalPalette.paper,
          "--legal-ink": legalPalette.ink,
          "--legal-muted": legalPalette.muted,
          "--legal-panel": legalPalette.panel,
          "--legal-border": legalPalette.panelBorder,
        } as CSSProperties
      }
    >
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[rgba(15,12,11,0.82)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-center gap-3">
            <Link
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-white/10"
              to="/"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au site
            </Link>
            <div>
              <p className="font-landing-mono text-[11px] uppercase tracking-[0.26em] text-white/54">Légal</p>
              <p className="text-sm font-semibold text-white">Planify</p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2">
            {legalNav.map((item) => (
              <Link
                key={item.slug}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  slug === item.slug
                    ? "border-[color:var(--legal-accent)] bg-[color:var(--legal-accent)] text-white"
                    : "border-white/10 bg-white/6 text-white/78 hover:-translate-y-px hover:bg-white/10 hover:text-white"
                }`}
                to={`/legal/${item.slug}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="px-4 py-12 md:px-8 md:py-16">
        <div className="mx-auto max-w-6xl">
          <section className="rounded-[3rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_100%)] px-6 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:px-10 md:py-10">
            <p className="font-landing-mono text-[11px] uppercase tracking-[0.28em] text-white/52">{document.eyebrow}</p>
            <h1 className="mt-4 max-w-4xl font-landing-sans text-4xl font-semibold tracking-[-0.06em] text-white md:text-6xl">
              {document.title}
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-white/78 md:text-lg">{document.intro}</p>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 font-landing-mono text-[11px] uppercase tracking-[0.24em] text-white/60">
              Dernière mise à jour
              <span className="text-white/86">27 mars 2026</span>
            </div>
          </section>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_0.8fr]">
            <div className="space-y-6">
              {document.blocks.map((block) => (
                <section
                  key={block.title}
                  className="rounded-[2rem] border border-white/10 bg-[#171311] px-6 py-6 shadow-[0_14px_50px_rgba(0,0,0,0.2)] md:px-7"
                >
                  <h2 className="font-landing-sans text-2xl font-semibold tracking-[-0.04em] text-white">{block.title}</h2>

                  {block.paragraphs?.map((paragraph) => (
                    <p key={paragraph} className="mt-4 text-[15px] leading-8 text-white/76">
                      {paragraph}
                    </p>
                  ))}

                  {block.bullets ? (
                    <ul className="mt-4 space-y-3">
                      {block.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-3 text-[15px] leading-7 text-white/76">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--legal-accent)]" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {block.note ? (
                    <div className="mt-5 rounded-[1.5rem] border border-[color:var(--legal-accent)]/35 bg-[color:var(--legal-accent)]/10 px-4 py-4 text-sm leading-7 text-white/84">
                      {block.note}
                    </div>
                  ) : null}
                </section>
              ))}
            </div>

            <aside className="space-y-6">
              <section className="rounded-[2rem] border border-white/10 bg-[#171311] px-6 py-6">
                <p className="font-landing-mono text-[11px] uppercase tracking-[0.26em] text-white/52">Contact</p>
                <p className="mt-4 text-sm leading-7 text-white/76">
                  Pour toute demande liée aux données personnelles, à l'usage du site ou à un signalement juridique,
                  le point de contact public actuellement disponible est <span className="text-white">contact@planify.fr</span>.
                </p>
              </section>

              <section className="rounded-[2rem] border border-white/10 bg-[#171311] px-6 py-6">
                <p className="font-landing-mono text-[11px] uppercase tracking-[0.26em] text-white/52">Ressources officielles</p>
                <div className="mt-4 space-y-3">
                  {[
                    { href: "https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/FAQ", label: "CNIL - FAQ cookies" },
                    { href: "https://www.cnil.fr/fr/informer-les-personnes-et-assurer-la-transparence", label: "CNIL - information des personnes" },
                    { href: "https://www.cnil.fr/fr/comprendre-mes-droits", label: "CNIL - droits des personnes" },
                  ].map((resource) => (
                    <a
                      key={resource.href}
                      className="flex items-center justify-between rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/82 transition hover:-translate-y-px hover:bg-white/8 hover:text-white"
                      href={resource.href}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span>{resource.label}</span>
                      <ExternalLink className="h-4 w-4 shrink-0" />
                    </a>
                  ))}
                </div>
              </section>

              <section className="rounded-[2rem] border border-white/10 bg-[#171311] px-6 py-6">
                <p className="font-landing-mono text-[11px] uppercase tracking-[0.26em] text-white/52">Note pratique</p>
                <p className="mt-4 text-sm leading-7 text-white/76">
                  Cette base légale a été structurée pour la mise en ligne du site. Les informations d'identité de
                  l'exploitant et les éventuelles clauses contractuelles spécifiques doivent être ajustées avant
                  diffusion large.
                </p>
              </section>
            </aside>
          </div>
        </div>
      </main>

      <CookieBanner />
    </div>
  );
}
