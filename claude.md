# Contexte du Projet : Planify Elevate

Bonjour Claude,

Voici le contexte complet du projet sur lequel nous travaillons : **Planify Elevate**. 
C'est une application web destinée au pilotage opérationnel pour des équipes de prestation (événementiel, interventions terrain, logistique légère).

## 1. Objectif du Projet
Le logiciel permet de centraliser les opérations quotidiennes de l'équipe :
- Gestion de la relation client (CRM basique).
- Planification, création et suivi des missions.
- Administration du parc matériel (inventaire, mouvements, scan de code-barres/QR codes, disponibilités).
- Suivi financier (création de devis, factures, suivi des paiements).
- Portail client public et système de signature de devis en ligne.
- Gestion des rôles et permissions (Admin, Manager, Technicien, Prestataire) avec gestion des équipes et invitations.

## 2. Stack Technique
Le projet est une application **Frontend (Single Page Application)** connectée à un backend **Supabase**.

**Frontend :**
- React 18 avec TypeScript
- Vite (bundler)
- React Router DOM (pour le routage)
- TanStack Query (React Query) pour la gestion de l'état asynchrone, le cache et les requêtes.
- Tailwind CSS pour le style.
- UI Components : architecture basée sur Radix UI via **shadcn/ui**, avec Lucide React pour les icônes.
- Formulaires & Validations : React Hook Form couplé à Zod.
- Utilitaires : Recharts (graphiques), Sonner (notifications/toasts), html5-qrcode (scan de matériel).

**Backend (via Supabase) :**
- Base de données PostgreSQL.
- Authentification avec persistance de session (localStorage).
- Sécurité garantie par Row Level Security (RLS) sur PostgreSQL.
- Fonctions Serverless (Edge Functions) ponctuelles (ex: acceptation d'invitations d'équipe).

## 3. Architecture du Code
L'architecture principale dans `src/` :
- `components/` : Composants UI (`ui/`), structure de la page (`layout/`), graphiques (`charts/`).
- `hooks/` : Logique métier et accès aux données (interactions Supabase englobées par React Query).
- `pages/` : Les différentes routes de l'application (Dashboard, Clients, Missions, Matériel, Finance, Authentification).
- `integrations/supabase/` : Initialisation du client Supabase et typage de la DB (`types.ts`).
- `lib/` : Fonctions utilitaires diverses.

## 4. Règles et Bonnes Pratiques à Suivre
- **Gestion des données :** Les appels à Supabase sont généralement abstraits dans des Custom Hooks utilisant `useQuery` et `useMutation` (TanStack Query) pour gérer automatiquement le cache, les états de chargement (isLoading) et les invalidations au succès.
- **Sécurité et Permissions :** L'interface utilisateur vérifie le rôle de l'utilisateur naviguant (`canAccess`) pour cacher/montrer des sections, mais la sécurité des données est toujours appliquée côté serveur par les politiques RLS dans PostgreSQL.
- **UI/UX :** Maintien d'une interface très propre, moderne et responsive, en utilisant systématiquement Tailwind et les composants existants du projet pour éviter le code redondant ou les styles incohérents.
- **Types :** TypeScript de rigueur. S'appuyer sur les types générés par Supabase pour les entités en base de données pour assurer la sécurité du typage de bout en bout.

Je compte sur toi pour t'appuyer sur ces informations à chaque décision technique et proposition de code pour que la solution reste toujours cohérente avec l'architecture en place.
