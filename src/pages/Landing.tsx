import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Menu, MoveRight, Radio } from "lucide-react";
import { CookieBanner } from "@/components/public/CookieBanner";
import { buildRelativeAppPath } from "@/lib/public-app-url";

type LandingWindow = Window & {
  gsap?: GsapLike;
  ScrollTrigger?: unknown;
};

type GsapContext = {
  revert: () => void;
};

type GsapTimeline = {
  to: (target: unknown, vars: Record<string, unknown>, position?: number | string) => GsapTimeline;
};

type GsapLike = {
  registerPlugin: (...plugins: unknown[]) => void;
  context: (callback: () => void, scope?: Element | null) => GsapContext;
  from: (target: unknown, vars: Record<string, unknown>) => unknown;
  set: (target: unknown, vars: Record<string, unknown>) => unknown;
  timeline: (vars: Record<string, unknown>) => GsapTimeline;
  utils: {
    toArray: <T = HTMLElement>(selector: string) => T[];
  };
};

const preset = {
  id: "C",
  name: "Poste de pilotage",
  identity: "Pilotage opérationnel événementiel",
  palette: {
    primary: "#E3DDD4",
    accent: "#B65A34",
    background: "#F4EFE7",
    dark: "#2F241D",
    inkSoft: "#5C4F43",
    inkMuted: "#7A6A5D",
    panel: "#EAE3D7",
    grid: "#CFC5B8",
  },
  hero: {
    lead: "Pilotez vos",
    emphasis: "missions.",
  },
  images: {
    hero:
      "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1800&q=80",
    texture:
      "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1600&q=80",
  },
};

const navLinks = [
  { label: "Modules", href: "#features" },
  { label: "Méthode", href: "#philosophy" },
  { label: "Pilotage", href: "#protocol" },
  { label: "Accès", href: "#pricing" },
];

const shuffleCardsBase = [
  { id: "quotes", label: "Devis", value: "4 validations à envoyer", descriptor: "Flux devis" },
  { id: "invoices", label: "Factures", value: "7 relances à traiter", descriptor: "Flux facture" },
  { id: "cash", label: "Encaissements", value: "2 paiements à rapprocher", descriptor: "Trésorerie" },
];

const typewriterMessages = [
  "Créneau camion recalculé après décalage de montage sur site.",
  "Conflit matériel détecté puis absorbé avant départ régie.",
  "Disponibilité parc synchronisée avec transport et timing client.",
];

const schedulerLabels = [
  "Chefs de projet",
  "Techniciens",
  "Chauffeurs",
];

const protocolCards = [
  {
    step: "01",
    title: "Lire le terrain",
    description:
      "Planify capte chaque mission comme un signal opérationnel, puis remet les contraintes logistiques à plat avant qu’elles ne deviennent des urgences.",
  },
  {
    step: "02",
    title: "Synchroniser les flux",
    description:
      "Le planning, le matériel, la facturation et les équipes restent corrélés dans le même continuum d’exécution, sans doubles saisies.",
  },
  {
    step: "03",
    title: "Verrouiller la délivrance",
    description:
      "Chaque livraison part avec un état financier, humain et terrain déjà aligné pour accélérer le départ et réduire les angles morts.",
  },
];

const pricingTiers = [
  {
    name: "Essentiel",
    price: "0€",
    cadence: "/14 jours",
    description: "Pour cadrer les premières missions et signer rapidement.",
    features: ["Missions et planning", "Devis & factures", "Portail client"],
    highlighted: false,
  },
  {
    name: "Pilotage",
    price: "79€",
    cadence: "/mois",
    description: "Le poste de travail central pour une équipe logistique active.",
    features: ["Logistique avancée", "QR & matériel", "Gestion d'équipes"],
    highlighted: true,
  },
  {
    name: "Réseau",
    price: "Sur mesure",
    cadence: "",
    description: "Pour les structures multi-sites et les opérations à fort volume.",
    features: ["Workflow sur mesure", "Gouvernance multi-sites", "Onboarding dédié"],
    highlighted: false,
  },
];

function MagneticButton({
  children,
  onClick,
  variant = "accent",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "accent" | "ghost" | "dark";
  className?: string;
}) {
  const baseClass =
    "landing-magnetic group relative inline-flex items-center gap-3 overflow-hidden rounded-full border px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] transition-all duration-300";

  const variantClass =
    variant === "accent"
      ? "border-[color:var(--landing-accent)] bg-[color:var(--landing-accent)] text-[color:var(--landing-paper)] hover:text-white"
      : variant === "dark"
        ? "border-white/12 bg-white/7 text-[color:var(--landing-paper)] hover:text-white"
        : "border-black/10 bg-black/[0.04] text-[color:var(--landing-dark)] hover:text-white";

  const fillClass =
    variant === "accent"
      ? "bg-black"
      : variant === "dark"
        ? "bg-[color:var(--landing-accent)]"
        : "bg-black";

  return (
    <button className={`${baseClass} ${variantClass} ${className}`} onClick={onClick} type="button">
      <span
        className={`absolute inset-0 translate-y-full transition-transform duration-500 group-hover:translate-y-0 ${fillClass}`}
        style={{ transitionTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}
      />
      <span className="relative z-10 flex items-center gap-3 text-current transition-colors duration-300">{children}</span>
    </button>
  );
}

function SectionEyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] ${
        dark ? "border-white/14 bg-white/6 text-white/82" : "border-black/10 bg-black/5 text-[color:var(--landing-ink-muted)]"
      }`}
    >
      <Radio className="h-3.5 w-3.5" />
      {children}
    </div>
  );
}

function ShuffleCard({ cards }: { cards: typeof shuffleCardsBase }) {
  return (
    <div className="relative h-[18rem]">
      {cards.map((card, index) => (
        <article
          key={card.id}
          className="absolute inset-x-0 rounded-[2rem] border border-white/10 bg-[#1A1513] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.2)] transition-all duration-700"
          style={{
            top: `${index * 1.2}rem`,
            transform: `scale(${1 - index * 0.05}) translateY(${index * 6}px)`,
            opacity: 1 - index * 0.16,
            zIndex: cards.length - index,
            transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-white/54">
            <span>{card.descriptor}</span>
            <span>Actif</span>
          </div>
          <div className="mt-8 space-y-2">
            <p className="font-landing-mono text-xs uppercase tracking-[0.18em] text-[color:var(--landing-accent)]">{card.label}</p>
            <h4 className="text-2xl font-semibold tracking-[-0.05em] text-white">{card.value}</h4>
            <p className="max-w-[18rem] text-sm leading-6 text-white/72">
              Une file active qui remonte les documents et actions terrain sans rupture entre la préparation et
              l’encaissement.
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

function TypewriterCard({ valueProp }: { valueProp: string }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [typedText, setTypedText] = useState("");

  useEffect(() => {
    const currentMessage = `${valueProp} :: ${typewriterMessages[messageIndex]}`;
    let charIndex = 0;
    const typeTimer = window.setInterval(() => {
      charIndex += 1;
      setTypedText(currentMessage.slice(0, charIndex));
      if (charIndex >= currentMessage.length) {
        window.clearInterval(typeTimer);
        window.setTimeout(() => {
          setMessageIndex((previous) => (previous + 1) % typewriterMessages.length);
        }, 1200);
      }
    }, 34);

    return () => window.clearInterval(typeTimer);
  }, [messageIndex, valueProp]);

  return (
    <div className="rounded-[2rem] border border-black/10 bg-[#181818] p-5 text-[#F6F1E8] shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-white/68">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--landing-accent)] shadow-[0_0_18px_rgba(182,90,52,0.45)] animate-pulse" />
          Flux terrain
        </div>
        <span>{valueProp}</span>
      </div>
      <div className="mt-8 min-h-[13rem] rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
        <p className="font-landing-mono text-sm leading-7 text-white/80">
          {typedText}
          <span className="ml-1 inline-block h-4 w-[0.45rem] translate-y-0.5 bg-[color:var(--landing-accent)] align-middle animate-pulse" />
        </p>
      </div>
    </div>
  );
}

function SchedulerCard({ labels }: { labels: string[] }) {
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const [phase, setPhase] = useState(0);
  const [selectedDay, setSelectedDay] = useState(2);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPhase((previous) => {
        const nextPhase = (previous + 1) % 8;
        if (nextPhase < 7) {
          setSelectedDay(nextPhase);
        }
        return nextPhase;
      });
    }, 900);

    return () => window.clearInterval(timer);
  }, []);

  const cursorStyle =
    phase < 7
      ? {
        left: `calc(${(phase * 100) / 6}% - 14px)`,
        top: "2.1rem",
        opacity: 1,
      }
      : {
        left: "calc(100% - 3.3rem)",
        top: "8.4rem",
        opacity: 1,
      };

  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#171311] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-white/54">
        <span>Équipes</span>
        <span>Assignation</span>
      </div>
      <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => (
            <div
              key={`${day}-${index}`}
              className={`flex h-12 items-center justify-center rounded-2xl border text-sm font-landing-mono transition-all duration-500 ${
                selectedDay === index
                  ? "border-[color:var(--landing-accent)] bg-[color:var(--landing-accent)] text-white shadow-[0_12px_24px_rgba(182,90,52,0.22)]"
                  : "border-white/10 bg-white/6 text-white/62"
              } ${selectedDay === index && phase < 7 ? "scale-[0.95]" : ""}`}
            >
              {day}
            </div>
          ))}
        </div>
        <div className="relative mt-5 h-[8rem]">
          <div
            className="absolute z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.25)] transition-all duration-500"
            style={cursorStyle}
          >
            <MoveRight className="h-4 w-4 rotate-[-45deg]" />
          </div>
          <div className="space-y-2">
            {labels.map((label, index) => (
              <div
                key={label}
                className={`rounded-2xl border px-3 py-2 text-sm transition-colors duration-300 ${
                  index === selectedDay % labels.length ? "border-black bg-black text-white" : "border-white/10 bg-white/6 text-white/76"
                }`}
              >
                {label}
              </div>
            ))}
          </div>
          <button
            className={`absolute bottom-0 right-0 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-all duration-500 ${
              phase === 7 ? "bg-[color:var(--landing-accent)] text-white shadow-[0_12px_24px_rgba(182,90,52,0.22)]" : "bg-black text-white/80"
            }`}
            type="button"
          >
            Affecter
          </button>
        </div>
      </div>
    </div>
  );
}

function RotatingMotif() {
  return (
    <svg className="h-40 w-40 text-[color:var(--landing-accent)]" viewBox="0 0 200 200" fill="none" aria-hidden="true">
      <g className="origin-center animate-[spin_18s_linear_infinite]">
        <circle cx="100" cy="100" r="68" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="46" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
        <path d="M40 100H160" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" />
        <path d="M100 40V160" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

function ScanningGrid() {
  const dots = Array.from({ length: 48 });

  return (
    <div className="relative h-40 w-48 overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/20 p-5">
      <div className="grid h-full grid-cols-8 gap-2">
        {dots.map((_, index) => (
          <span key={index} className="h-2.5 w-2.5 rounded-full bg-white/18" />
        ))}
      </div>
      <div className="absolute inset-x-4 top-0 h-10 animate-[scanline_3.6s_linear_infinite] bg-[linear-gradient(180deg,rgba(182,90,52,0)_0%,rgba(182,90,52,0.42)_50%,rgba(182,90,52,0)_100%)] blur-md" />
    </div>
  );
}

function WaveformPulse() {
  return (
    <svg className="h-40 w-56" viewBox="0 0 260 120" fill="none" aria-hidden="true">
      <path
        d="M0 68H40L56 32L74 92L92 44L112 70H138L154 18L174 108L194 58H220L236 36L260 70"
        stroke="#B65A34"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="landing-wave"
      />
      <path
        d="M0 68H40L56 32L74 92L92 44L112 70H138L154 18L174 108L194 58H220L236 36L260 70"
        stroke="rgba(182,90,52,0.15)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const protocolRef = useRef<HTMLElement | null>(null);
  const [isNavSolid, setIsNavSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shuffleCards, setShuffleCards] = useState(shuffleCardsBase);
  const loginPath = buildRelativeAppPath("/login");
  const registerPath = buildRelativeAppPath("/register");

  const manifestoText = useMemo(
    () => ({
      neutral: "La plupart des outils logistiques se contentent d'empiler des écrans et des listes sans hiérarchie.",
      bold: "Planify concentre le signal critique pour accélérer la décision, la facturation et la coordination terrain.",
    }),
    [],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setShuffleCards((current) => {
        const nextCards = [...current];
        const lastCard = nextCards.pop();
        if (lastCard) {
          nextCards.unshift(lastCard);
        }
        return nextCards;
      });
    }, 3000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!heroRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsNavSolid(!entry.isIntersecting);
      },
      { threshold: 0.25 },
    );

    observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!rootRef.current || !protocolRef.current) return;

    const landingWindow = window as LandingWindow;
    if (!landingWindow.gsap || !landingWindow.ScrollTrigger) return;

    const gsap = landingWindow.gsap;
    gsap.registerPlugin(landingWindow.ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.from("[data-hero-reveal]", {
        y: 40,
        opacity: 0,
        duration: 1.1,
        ease: "power3.out",
        stagger: 0.08,
      });

      gsap.utils.toArray<HTMLElement>("[data-section-reveal]").forEach((section) => {
        gsap.from(section.children, {
          y: 48,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.15,
          scrollTrigger: {
            trigger: section,
            start: "top 75%",
          },
        });
      });

      gsap.utils.toArray<HTMLElement>(".manifesto-word").forEach((word) => {
        gsap.from(word, {
          yPercent: 120,
          opacity: 0,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: {
            trigger: word.closest("[data-manifesto]"),
            start: "top 72%",
          },
        });
      });

      const protocolCardsNodes = gsap.utils.toArray<HTMLElement>(".protocol-card");
      gsap.set(protocolCardsNodes.slice(1), { yPercent: 112 });

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: protocolRef.current,
          start: "top top",
          end: () => `+=${window.innerHeight * 2.6}`,
          scrub: 1,
          pin: true,
        },
      });

      protocolCardsNodes.forEach((card, index) => {
        if (index === 0) return;
        timeline
          .to(
            protocolCardsNodes[index - 1],
            {
              scale: 0.9,
              opacity: 0.5,
              filter: "blur(20px)",
              ease: "power2.inOut",
              duration: 1,
            },
            index - 1,
          )
          .to(
            card,
            {
              yPercent: 0,
              ease: "power2.inOut",
              duration: 1,
            },
            index - 1,
          );
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className="landing-shell min-h-screen overflow-x-hidden bg-[color:var(--landing-paper)] text-[color:var(--landing-dark)]"
      style={
        {
          "--landing-primary": preset.palette.primary,
          "--landing-accent": preset.palette.accent,
          "--landing-dark": preset.palette.dark,
          "--landing-ink-soft": preset.palette.inkSoft,
          "--landing-ink-muted": preset.palette.inkMuted,
          "--landing-paper": preset.palette.background,
          "--landing-panel": preset.palette.panel,
          "--landing-grid": preset.palette.grid,
        } as CSSProperties
      }
    >
      <header className="fixed inset-x-0 top-4 z-50 px-4 md:px-6">
        <div
          className={`mx-auto flex max-w-6xl items-center justify-between rounded-full border px-4 py-3 transition-all duration-500 md:px-6 ${
            isNavSolid
              ? "border-black/10 bg-[rgba(243,239,231,0.78)] text-[color:var(--landing-dark)] shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl"
              : "border-white/10 bg-transparent text-white"
          }`}
        >
          <button className="flex items-center gap-3" onClick={() => navigate("/")} type="button">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-landing-mono ${
                isNavSolid
                  ? "border-black/10 bg-[color:var(--landing-dark)] text-[color:var(--landing-paper)]"
                  : "border-white/18 bg-white/10 text-white"
              }`}
            >
              PL
            </span>
            <div className="text-left">
              <p className="font-landing-mono text-[11px] uppercase tracking-[0.28em] opacity-70">{preset.name}</p>
              <p className="font-landing-sans text-sm font-semibold tracking-[-0.04em]">Planify</p>
            </div>
          </button>

          <nav className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="landing-link text-[11px] font-semibold uppercase tracking-[0.22em]"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <MagneticButton variant={isNavSolid ? "ghost" : "dark"} onClick={() => navigate(loginPath)}>
              Connexion
            </MagneticButton>
            <MagneticButton onClick={() => navigate(registerPath)}>
              S'inscrire
              <ArrowRight className="h-4 w-4" />
            </MagneticButton>
          </div>

          <button
            className={`flex h-11 w-11 items-center justify-center rounded-full border md:hidden ${
              isNavSolid ? "border-black/10 bg-black/5" : "border-white/16 bg-white/8"
            }`}
            onClick={() => setMenuOpen((previous) => !previous)}
            type="button"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {menuOpen ? (
          <div className="mx-auto mt-3 max-w-6xl rounded-[2rem] border border-black/10 bg-[rgba(243,239,231,0.9)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.1)] backdrop-blur-xl md:hidden">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="landing-link border-b border-black/8 pb-3 text-[11px] font-semibold uppercase tracking-[0.22em]"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-3 pt-2">
                <MagneticButton variant="ghost" onClick={() => navigate(loginPath)} className="justify-center">
                  Connexion
                </MagneticButton>
                <MagneticButton onClick={() => navigate(registerPath)} className="justify-center">
                  S'inscrire maintenant
                </MagneticButton>
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <main>
        <section
          id="hero"
          ref={heroRef}
          className="relative flex min-h-[100dvh] items-end overflow-hidden px-4 pb-12 pt-32 md:px-8 md:pb-16"
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${preset.images.hero})` }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,18,18,0.1)_0%,rgba(18,18,18,0.42)_32%,rgba(18,18,18,0.94)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(182,90,52,0.22)_0%,rgba(18,18,18,0)_45%,rgba(18,18,18,0.62)_100%)]" />

          <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col justify-end">
            <div className="max-w-4xl">
              <SectionEyebrow dark>Plateforme de gestion de missions logistiques dans l'événementiel</SectionEyebrow>
              <div className="mt-8 space-y-4">
                <p
                  data-hero-reveal
                  className="font-landing-sans text-[clamp(3.3rem,8vw,7.5rem)] font-semibold leading-[0.92] tracking-[-0.08em] text-white"
                >
                  {preset.hero.lead}
                </p>
                <p
                  data-hero-reveal
                  className="font-landing-serif text-[clamp(5rem,14vw,13rem)] italic leading-[0.84] tracking-[-0.07em] text-[#F6F1E8]"
                >
                  {preset.hero.emphasis}
                </p>
              </div>
              <p
                data-hero-reveal
                className="mt-8 max-w-2xl font-landing-sans text-base leading-8 text-white/86 md:text-lg"
              >
                Planify aligne le tableau de bord, les missions, le parc, la finance et les équipes dans un même poste
                de pilotage. Vous savez quoi envoyer, quoi préparer, quoi affecter et quoi facturer sans changer
                d'écran mental.
              </p>
              <div data-hero-reveal className="mt-10 flex flex-col gap-4 sm:flex-row">
                <MagneticButton onClick={() => navigate(registerPath)} className="justify-center sm:justify-start">
                  S'inscrire le plus vite possible
                  <ArrowRight className="h-4 w-4" />
                </MagneticButton>
                <MagneticButton
                  variant="dark"
                  onClick={() => navigate(loginPath)}
                  className="justify-center border-white/14 bg-white/6 sm:justify-start"
                >
                  Entrer dans l'interface
                </MagneticButton>
              </div>
            </div>

            <div data-hero-reveal className="mt-14 grid gap-4 md:grid-cols-3">
              {[
                "Tableau de bord orienté priorités, validations et prochaines actions.",
                "Parc, transports et matériel reliés aux missions réelles.",
                "Finance et équipes synchronisées avec l'exécution terrain.",
              ].map((signal) => (
                <div key={signal} className="rounded-[2rem] border border-white/10 bg-white/6 p-5 backdrop-blur-sm">
                  <p className="font-landing-mono text-[11px] uppercase tracking-[0.25em] text-white/68">Signal</p>
                  <p className="mt-3 text-sm leading-7 text-white/86">{signal}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="features"
          className="mx-auto mt-8 max-w-6xl rounded-[3rem] border border-[#211b18] bg-[#120f0e] px-4 py-20 text-white md:px-8 md:py-28"
          data-section-reveal
        >
          <SectionEyebrow dark>Modules clés</SectionEyebrow>
          <div className="mt-6 max-w-3xl">
            <h2 className="font-landing-sans text-4xl font-semibold tracking-[-0.07em] text-white md:text-6xl">
              Trois modules qui reprennent la logique réelle du logiciel.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/72">
              La page montre le même système que l'application: une vue claire sur la facturation, la logistique et
              les équipes pour garder les opérations lisibles du devis jusqu'au départ terrain.
            </p>
          </div>

          <div className="mt-14 grid gap-6 xl:grid-cols-3">
            <article className="rounded-[2.5rem] border border-white/10 bg-[#171311] p-6 shadow-[0_20px_55px_rgba(0,0,0,0.2)]">
              <p className="font-landing-mono text-[11px] uppercase tracking-[0.26em] text-white/54">Facturation</p>
              <h3 className="mt-3 font-landing-sans text-2xl font-semibold tracking-[-0.05em] text-white">Vue devis et factures</h3>
              <p className="mt-2 max-w-sm text-sm leading-7 text-white/72">
                Devis, factures et paiements remontent comme une pile active pour donner la prochaine action
                financière à traiter.
              </p>
              <div className="mt-8">
                <ShuffleCard cards={shuffleCards} />
              </div>
            </article>

            <article className="rounded-[2.5rem] border border-white/10 bg-[#171311] p-6 shadow-[0_20px_55px_rgba(0,0,0,0.2)]">
              <p className="font-landing-mono text-[11px] uppercase tracking-[0.26em] text-white/54">
                Logistique avancée
              </p>
              <h3 className="mt-3 font-landing-sans text-2xl font-semibold tracking-[-0.05em] text-white">Flux logistique</h3>
              <p className="mt-2 max-w-sm text-sm leading-7 text-white/72">
                Les arbitrages matériel, timing, transports et conflits restent visibles avant le départ et pendant la
                préparation.
              </p>
              <div className="mt-8">
                <TypewriterCard valueProp="Logistique avancée" />
              </div>
            </article>

            <article className="rounded-[2.5rem] border border-white/10 bg-[#171311] p-6 shadow-[0_20px_55px_rgba(0,0,0,0.2)]">
              <p className="font-landing-mono text-[11px] uppercase tracking-[0.26em] text-white/54">
                Gestion d'équipes
              </p>
              <h3 className="mt-3 font-landing-sans text-2xl font-semibold tracking-[-0.05em] text-white">Planning et affectations</h3>
              <p className="mt-2 max-w-sm text-sm leading-7 text-white/72">
                Les affectations suivent les jours critiques et les rôles terrain pour éviter les trous de couverture.
              </p>
              <div className="mt-8">
                <SchedulerCard labels={schedulerLabels} />
              </div>
            </article>
          </div>
        </section>

        <section id="philosophy" className="relative overflow-hidden bg-[#121212] px-4 py-24 text-white md:px-8 md:py-32">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-10"
            style={{ backgroundImage: `url(${preset.images.texture})` }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(182,90,52,0.18),transparent_36rem)]" />
          <div className="relative mx-auto max-w-6xl">
            <SectionEyebrow dark>Méthode</SectionEyebrow>
            <div className="mt-10 max-w-5xl" data-manifesto>
              <p className="max-w-3xl font-landing-sans text-xl leading-9 text-white/78 md:text-2xl">
                {manifestoText.neutral.split(" ").map((word, index) => (
                  <span key={`${word}-${index}`} className="manifesto-word mr-[0.35em] inline-block">
                    {word}
                  </span>
                ))}
              </p>
              <p className="mt-10 max-w-5xl font-landing-serif text-[clamp(3.5rem,9vw,7rem)] italic leading-[0.92] tracking-[-0.07em] text-[color:var(--landing-accent)]">
                {manifestoText.bold.split(" ").map((word, index) => (
                  <span key={`${word}-${index}`} className="manifesto-word mr-[0.25em] inline-block">
                    {word}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </section>

        <section id="protocol" ref={protocolRef} className="relative h-[100dvh] overflow-hidden bg-[#101010]">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0)_100%)]" />
          <div className="protocol-card absolute inset-0 px-4 py-28 md:px-8">
            <article className="mx-auto flex h-full max-w-6xl flex-col justify-between rounded-[3rem] border border-white/10 bg-[#171717] p-8 text-white shadow-[0_24px_90px_rgba(0,0,0,0.35)] md:p-12">
              <div className="flex items-center justify-between">
                <span className="font-landing-mono text-xs uppercase tracking-[0.32em] text-white/56">{protocolCards[0].step}</span>
                <RotatingMotif />
              </div>
              <div className="max-w-3xl">
                <h3 className="font-landing-sans text-4xl font-semibold tracking-[-0.06em] md:text-6xl">
                  {protocolCards[0].title}
                </h3>
                <p className="mt-5 text-lg leading-8 text-white/76">{protocolCards[0].description}</p>
              </div>
            </article>
          </div>

          <div className="protocol-card absolute inset-0 px-4 py-28 md:px-8">
            <article className="mx-auto flex h-full max-w-6xl flex-col justify-between rounded-[3rem] border border-white/10 bg-[#171717] p-8 text-white shadow-[0_24px_90px_rgba(0,0,0,0.35)] md:p-12">
              <div className="flex items-center justify-between">
                <span className="font-landing-mono text-xs uppercase tracking-[0.32em] text-white/56">{protocolCards[1].step}</span>
                <ScanningGrid />
              </div>
              <div className="max-w-3xl">
                <h3 className="font-landing-sans text-4xl font-semibold tracking-[-0.06em] md:text-6xl">
                  {protocolCards[1].title}
                </h3>
                <p className="mt-5 text-lg leading-8 text-white/76">{protocolCards[1].description}</p>
              </div>
            </article>
          </div>

          <div className="protocol-card absolute inset-0 px-4 py-28 md:px-8">
            <article className="mx-auto flex h-full max-w-6xl flex-col justify-between rounded-[3rem] border border-white/10 bg-[#171717] p-8 text-white shadow-[0_24px_90px_rgba(0,0,0,0.35)] md:p-12">
              <div className="flex items-center justify-between">
                <span className="font-landing-mono text-xs uppercase tracking-[0.32em] text-white/56">{protocolCards[2].step}</span>
                <WaveformPulse />
              </div>
              <div className="max-w-3xl">
                <h3 className="font-landing-sans text-4xl font-semibold tracking-[-0.06em] md:text-6xl">
                  {protocolCards[2].title}
                </h3>
                <p className="mt-5 text-lg leading-8 text-white/76">{protocolCards[2].description}</p>
              </div>
            </article>
          </div>
        </section>

        <section
          id="pricing"
          className="mx-auto mb-8 max-w-6xl rounded-[3rem] border border-[#211b18] bg-[#120f0e] px-4 py-20 text-white md:px-8 md:py-28"
          data-section-reveal
        >
          <SectionEyebrow dark>Accès</SectionEyebrow>
          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h2 className="font-landing-sans text-4xl font-semibold tracking-[-0.07em] text-white md:text-6xl">
                Entrez vite dans l'outil, puis montez en charge sans reconfigurer votre méthode.
              </h2>
              <p className="mt-5 text-base leading-8 text-white/72">
                Une entrée simple pour démarrer, un plan central pour les équipes qui opèrent au quotidien, et une
                extension pour les structures qui veulent standardiser leurs flux.
              </p>
            </div>
            <MagneticButton onClick={() => navigate(registerPath)} className="w-full justify-center lg:w-auto">
              S'inscrire maintenant
              <ArrowRight className="h-4 w-4" />
            </MagneticButton>
          </div>

          <div className="mt-14 grid gap-6 xl:grid-cols-3">
            {pricingTiers.map((tier) => (
              <article
                key={tier.name}
                className={`rounded-[2.5rem] border p-7 ${
                  tier.highlighted
                    ? "scale-[1.01] border-[color:var(--landing-accent)] bg-[#171717] text-white shadow-[0_28px_90px_rgba(182,90,52,0.16)]"
                    : "border-white/10 bg-[#171311] text-white shadow-[0_18px_50px_rgba(0,0,0,0.18)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className={`font-landing-mono text-[11px] uppercase tracking-[0.26em] ${
                        tier.highlighted ? "text-white/66" : "text-white/56"
                      }`}
                    >
                      {tier.name}
                    </p>
                    <h3 className="mt-4 font-landing-sans text-4xl font-semibold tracking-[-0.06em]">
                      {tier.price}
                      <span className={`ml-2 text-sm ${tier.highlighted ? "text-white/74" : "text-white/56"}`}>
                        {tier.cadence}
                      </span>
                    </h3>
                  </div>
                  {tier.highlighted ? (
                    <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]">
                      Recommandé
                    </span>
                  ) : null}
                </div>
                <p className={`mt-5 text-sm leading-7 ${tier.highlighted ? "text-white/78" : "text-white/72"}`}>
                  {tier.description}
                </p>
                <div className="mt-7 space-y-3">
                  {tier.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-[color:var(--landing-accent)]" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-8">
                  <MagneticButton
                    onClick={() => navigate(registerPath)}
                    variant={tier.highlighted ? "accent" : "dark"}
                    className="w-full justify-center"
                  >
                    S'inscrire
                  </MagneticButton>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-[#121212] px-4 pb-8 pt-20 text-white md:px-8">
        <div className="mx-auto max-w-6xl rounded-t-[4rem] border border-white/10 bg-[#161616] px-6 py-10 md:px-10 md:py-12">
          <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
            <div>
              <p className="font-landing-mono text-[11px] uppercase tracking-[0.28em] text-white/58">{preset.identity}</p>
              <h2 className="mt-4 font-landing-sans text-3xl font-semibold tracking-[-0.06em]">Planify</h2>
              <p className="mt-4 max-w-sm text-sm leading-7 text-white/78">
                Plateforme de gestion de missions logistiques dans l'événementiel. Tableau de bord, missions, parc,
                finance et équipes dans le même poste de pilotage.
              </p>
            </div>
            <div>
              <p className="font-landing-mono text-[11px] uppercase tracking-[0.28em] text-white/58">Navigation</p>
              <div className="mt-4 flex flex-col gap-3 text-sm text-white/82">
                {navLinks.map((link) => (
                  <a key={link.href} href={link.href} className="landing-link">
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <p className="font-landing-mono text-[11px] uppercase tracking-[0.28em] text-white/58">Accès</p>
              <div className="mt-4 flex flex-col gap-3 text-sm text-white/82">
                <button className="text-left transition hover:text-white" onClick={() => navigate(loginPath)} type="button">
                  Connexion
                </button>
                <button className="text-left transition hover:text-white" onClick={() => navigate(registerPath)} type="button">
                  Créer un compte
                </button>
                <a className="landing-link" href="#pricing">
                  Tarification
                </a>
              </div>
            </div>
            <div>
              <p className="font-landing-mono text-[11px] uppercase tracking-[0.28em] text-white/58">Légal</p>
              <div className="mt-4 flex flex-col gap-3 text-sm text-white/82">
                <Link className="landing-link transition hover:text-white" to="/legal/mentions-legales">
                  Mentions légales
                </Link>
                <Link className="landing-link transition hover:text-white" to="/legal/cgu">
                  Conditions d'utilisation
                </Link>
                <Link className="landing-link transition hover:text-white" to="/legal/confidentialite">
                  Confidentialité
                </Link>
                <Link className="landing-link transition hover:text-white" to="/legal/cookies">
                  Cookies
                </Link>
              </div>
              <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/6 px-4 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#72d572] shadow-[0_0_18px_rgba(114,213,114,0.6)] animate-pulse" />
                <span className="font-landing-mono text-[11px] uppercase tracking-[0.24em] text-white/84">
                  Système opérationnel
                </span>
              </div>
            </div>
          </div>
          <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-white/60 md:flex-row md:items-center md:justify-between">
            <span>© 2026 Planify. Pilotage logistique événementiel.</span>
            <span className="font-landing-mono uppercase tracking-[0.24em]">Dashboard / Missions / Finance</span>
          </div>
        </div>
      </footer>

      <CookieBanner />
    </div>
  );
}
