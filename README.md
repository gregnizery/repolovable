# Planify Elevate

Planify Elevate est une application web de pilotage opérationnel pour des équipes de prestation (événementiel, interventions terrain, logistique légère), avec un périmètre qui couvre la relation client, la planification des missions, la gestion de matériel et le suivi financier.

Ce dépôt contient le **frontend complet** (React + TypeScript) connecté à Supabase (authentification, données, permissions, temps réel).

---

## 1) Objectif du logiciel

Le logiciel centralise les opérations quotidiennes d’une équipe :

- gérer les clients,
- créer, modifier et suivre les missions,
- administrer le parc matériel et ses mouvements,
- produire les devis et factures,
- suivre les notifications,
- exposer des pages publiques (portail client et signature de devis),
- appliquer des droits d’accès selon le rôle utilisateur.

L’objectif est d’avoir une seule application pour toute la chaîne opérationnelle, de la prospection jusqu’au suivi des documents financiers.

---

## 2) Stack technique

### Frontend
- React 18
- TypeScript
- Vite
- React Router DOM
- TanStack Query (cache / requêtes / invalidations)
- Tailwind CSS
- Composants Radix UI (via shadcn/ui)
- Sonner + toaster pour notifications UI
- Recharts pour visualisations

### Backend / Plateforme
- Supabase JS v2 (`@supabase/supabase-js`)
  - Authentification (session persistée dans `localStorage`)
  - Base de données PostgreSQL
  - RLS + modèle de rôles applicatifs (via tables applicatives)

### Qualité
- ESLint
- Vitest + Testing Library

---

## 3) Architecture fonctionnelle

## 3.1 Modules métier

L’application est organisée autour des domaines suivants :

- **Authentification** : connexion, inscription, confirmation e-mail, acceptation d’invitation.
- **Dashboard** : vue synthétique de l’activité.
- **Clients** : liste, fiche, création, édition.
- **Missions** : liste, détail, création, édition.
- **Finance** : devis, factures, suivi paiements (navigation).
- **Matériel** : inventaire, détail article, création, scan, mouvements batch, disponibilités.
- **Notifications** : centre de notifications interne.
- **Paramètres** : configuration utilisateur/équipe (selon droits).
- **Public** :
  - portail client public,
  - signature publique de devis.

## 3.2 Routage applicatif (principales routes)

Routes publiques :

- `/` (landing)
- `/login`
- `/register`
- `/public/devis/sign`
- `/public/client-portal`
- `/invitation`
- `/email-confirmed`

Routes protégées (auth requise, et parfois contrôle de section) :

- `/dashboard`
- `/clients`, `/clients/nouveau`, `/clients/:id`, `/clients/:id/modifier`
- `/missions`, `/missions/nouveau`, `/missions/:id`, `/missions/:id/modifier`
- `/finance/devis`, `/finance/devis/nouveau`, `/finance/devis/:id`, `/finance/devis/:id/modifier`
- `/finance/factures`, `/finance/factures/nouveau`, `/finance/factures/:id`, `/finance/factures/:id/modifier`
- `/finance/paiements`
- `/materiel`, `/materiel/nouveau`, `/materiel/:id`, `/materiel/:id/modifier`
- `/materiel/scan`, `/materiel/mouvements`, `/materiel/disponibilites`
- `/parametres`
- `/notifications`

Route de fallback : `*` → page `NotFound`.

---

## 4) Gestion des droits et sécurité d’accès

L’accès aux pages privées passe par `ProtectedRoute` :

1. vérification de la session utilisateur,
2. chargement du rôle applicatif (`useUserRole`),
3. contrôle d’accès à une section (`canAccess`).

### Rôles applicatifs supportés

- `admin`
- `manager`
- `technicien`
- `prestataire`

### Sections contrôlées

- `dashboard`
- `clients`
- `missions`
- `finance`
- `materiel`
- `parametres`

Exemple : la section `finance` est accessible à `admin` et `manager` uniquement.

> Important : ce contrôle frontend améliore l’UX et la navigation, mais la sécurité finale doit être garantie côté Supabase (RLS/policies).

---

## 5) Structure du dépôt

```txt
src/
  components/
    layout/              # Layout principal (sidebar/topbar/bottom nav)
    ui/                  # Composants UI réutilisables
    charts/              # Graphiques métier
  hooks/                 # Hooks métier (auth, data, rôle, mouvements, etc.)
  integrations/
    supabase/            # client Supabase + types DB
  lib/                   # utilitaires (ex: export CSV, marge)
  pages/                 # pages routées de l’application
  test/                  # setup et tests unitaires
public/                  # assets statiques
docs/                    # documentation opérationnelle/projet
supabase/                # configuration Supabase locale
scripts/                 # scripts de démarrage OS
```

---

## 6) Configuration requise

- Node.js 20+ recommandé
- npm 10+ recommandé

### Variables d’environnement obligatoires

Créer un fichier `.env.local` (ou utiliser `.env`) à partir de [.env.example](/Users/gregoirenizery/Downloads/planify2-main-3/.env.example) avec :

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
VITE_GOOGLE_MAPS_API_KEY=google_maps_browser_key
```

Si l’une de ces variables est absente, l’application lève une erreur au démarrage.

### Important pour un dépôt GitHub public

- Les variables `VITE_*` sont embarquées dans le bundle frontend. Elles ne doivent jamais contenir de secret serveur.
- `VITE_SUPABASE_PUBLISHABLE_KEY` est une clé publique côté client. C’est normal qu’elle soit visible.
- Une clé Google Maps utilisée côté navigateur n’est pas secrète non plus : elle doit être restreinte par domaine/referrer dans Google Cloud.
- Ne committez jamais de `SUPABASE_SERVICE_ROLE_KEY`, token personnel Supabase, mot de passe SMTP, ou autre secret non préfixé `VITE_`.
- Les scripts locaux qui nécessitent des accès privés utilisent des variables non `VITE_*` et ne doivent pas être exposés à Lovable ni au navigateur.

---

## 7) Installation et exécution

```bash
npm install
npm run dev
```

Application locale par défaut : `http://localhost:5173`.

### Build production

```bash
npm run build
```

### Prévisualiser le build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

### Tests

```bash
npm run test
```

Mode watch :

```bash
npm run test:watch
```

---

## 8) Fonctionnement des données (résumé technique)

- Les opérations CRUD passent par des hooks (`src/hooks/use-data.ts`, `use-movements.ts`, etc.) qui encapsulent les appels Supabase.
- TanStack Query gère :
  - le cache client,
  - les invalidations après mutation,
  - les états de chargement/erreur.
- Le client Supabase est typé via `src/integrations/supabase/types.ts`.
- L’auth est persistée côté navigateur (`localStorage`) avec rafraîchissement automatique du token.

---

## 9) UX / Interface

- Design system basé sur Tailwind + primitives Radix.
- Layout applicatif adaptatif : sidebar / topbar / navigation mobile.
- Composants de feedback utilisateur : toasts, skeletons, empty states.
- Composants métier dédiés : aperçu PDF, signature, scanner code-barres/QR.

---

## 10) Déploiement et documentation complémentaire

Documentation utile disponible dans `docs/` :

- `docs/DEPLOYMENT_CHECKLIST.md` : checklist avant mise en production
- `docs/DEMARRAGE_MAC.md` : guide de démarrage macOS
- `docs/DEMARRAGE_WINDOWS.md` : guide de démarrage Windows
- `docs/AUDIT_COMPLET_2026-02-16.md` : audit technique
- `docs/CORRECTIFS_BUGS_2026-02-16.md` : historique de corrections

---

## 11) Limites connues / vigilance

- La cohérence du schéma Supabase entre environnements est critique.
- Les permissions UI ne remplacent pas des policies RLS strictes.
- Le bon fonctionnement dépend fortement de la configuration des variables d’environnement Supabase.

---

## 12) Résumé rapide pour un nouvel arrivant

1. Configurer `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`.
2. Lancer `npm install` puis `npm run dev`.
3. Tester les routes critiques : login, clients, missions, finance, matériel.
4. Vérifier les droits selon rôle (`admin`, `manager`, `technicien`, `prestataire`).
5. Avant livraison : `npm run lint` + `npm run test` + `npm run build`.
