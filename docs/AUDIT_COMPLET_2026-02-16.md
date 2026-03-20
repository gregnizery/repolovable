# Audit complet du projet `planify-elevate`

Date : 2026-02-16  
Périmètre : front-end React/Vite + config Supabase + Edge Functions + migrations SQL.

## 1) Résumé exécutif

- **État global** : base saine côté architecture (Vite + React + Supabase), mais **maturité qualité/sécurité incomplète**.
- **Risque principal court terme** : dette de qualité (tests quasi inexistants, TypeScript non strict, pipeline de vérification difficile à exécuter dans un environnement CI verrouillé).
- **Risque principal sécurité** : exposition large CORS (`*`) et plusieurs fonctions en `verify_jwt = false` (compensées partiellement par contrôles applicatifs manuels).

### Score rapide (sur 10)

- Architecture : **7/10**
- Qualité de code / robustesse : **5/10**
- Sécurité : **6/10**
- Testabilité : **2/10**
- Exploitabilité / ops : **5/10**
- **Score global pondéré : 5.2/10**

---

## 2) Constat technique

### 2.1 Stack et structure

- Projet web moderne : React 18 + Vite + TypeScript + shadcn/ui + Tailwind, avec routing protégé et contexte d’auth.
- Backend principal externalisé vers Supabase (RLS + Edge Functions + migrations SQL).
- Design applicatif cohérent pour un MVP en production légère.

### 2.2 Points positifs

1. **RLS activé sur le modèle métier principal** dans les migrations SQL, avec politiques `auth.uid() = user_id` sur plusieurs tables.
2. **Contrôles d’accès applicatifs présents** dans plusieurs Edge Functions (vérification du bearer token, validation métier).
3. **Structure front lisible** (pages / components / hooks) et routes protégées centralisées.

---

## 3) Risques et faiblesses identifiés

## 3.1 Critique / Élevé

### A. Couverture de test quasi nulle

- Une seule spec triviale (`expect(true).toBe(true)`) est présente.
- Risque : régressions fonctionnelles non détectées (facturation, stock, missions, auth).

**Impact** : élevé sur la fiabilité produit.

### B. Niveau de garde TypeScript faible

- `strict: false`, `noImplicitAny: false`, `noUnusedLocals: false`, `noUnusedParameters: false`.
- Risque : erreurs runtime non capturées à la compilation, dette croissante.

**Impact** : élevé sur la maintenabilité.

## 3.2 Moyen

### C. Fonctions Supabase en `verify_jwt = false`

- `generate-pdf`, `send-document-email`, `materiel-disponibilites` sont configurées en vérification JWT désactivée.
- Certaines fonctions compensent via vérification manuelle de l’Authorization header, mais la surface d’attaque reste plus large (mauvaise implémentation future, endpoints oubliés, bruteforce applicatif).

**Impact** : moyen à élevé selon exposition publique.

### D. CORS permissif (`Access-Control-Allow-Origin: *`) dans Edge Functions

- Observé sur plusieurs fonctions.
- Risque : appels cross-origin non restreints (à combiner avec éventuelles faiblesses auth / rate-limit).

**Impact** : moyen.

### E. Dépendance front au `localStorage` pour la session Supabase

- Choix standard mais exposé à l’impact XSS (vol de session si injection).
- Non bloquant seul, mais augmente la criticité de toute faille XSS.

**Impact** : moyen.

## 3.3 Faible / amélioration

### F. Documentation projet encore générique

- Le README est un template Lovable (URLs placeholders, peu de runbook réel).
- Impact onboarding/devops.

### G. Configuration qualité permissive

- ESLint désactive `@typescript-eslint/no-unused-vars`.
- Encourage accumulation de code mort / ambigu.

---

## 4) Vérifications exécutées

> Contrainte de l’environnement : accès registre npm restreint (403), empêchant une validation complète.

- `npm ci` → échec (désynchronisation lockfile / dépendances).
- `npm install` → non finalisé proprement dans cet environnement.
- `bun install` → échec 403 sur le registry npm.
- `npm audit --package-lock-only --omit=dev` → échec 403 (endpoint advisories inaccessible).
- `npm run lint` → échec car dépendances non installées localement.

Conclusion : l’audit s’appuie principalement sur revue statique du code + configuration.

---

## 5) Plan d’actions priorisé

## Sprint 0 (immédiat - sécurité/qualité)

1. **Réactiver `verify_jwt = true`** sur les fonctions non publiques.
2. **Restreindre CORS** aux domaines front autorisés (prod/staging).
3. **Ajouter rate limiting** côté gateway / function (au minimum pour PDF/email).
4. **Valider explicitement les variables d’environnement critiques** au démarrage.

## Sprint 1 (fiabilité)

1. Mettre en place une vraie base de tests :
   - tests unitaires hooks métier,
   - tests d’intégration des flux critiques (auth, devis/facture, mouvements stock),
   - tests Edge Functions (auth + validation d’entrées).
2. Rendre TypeScript plus strict par paliers :
   - `noImplicitAny: true` puis `strict: true`.
3. Réactiver `no-unused-vars` avec exceptions ciblées.

## Sprint 2 (industrialisation)

1. CI robuste : `lint + test + build + checks SQL`.
2. Scan sécurité automatisé (SCA + secrets + lint sécurité).
3. README opérationnel (setup, architecture, variables d’environnement, runbook incident).

---

## 6) Checklist “Done” recommandée (DoD)

- [ ] `npm ci` vert en CI sur environnement standard.
- [ ] `npm run lint` vert.
- [ ] `npm test` avec seuil minimal de couverture (ex: 60% puis montée progressive).
- [ ] Audit dépendances automatisé en CI.
- [ ] Toutes Edge Functions sensibles en `verify_jwt = true`.
- [ ] CORS restreint et documenté.

---

## 7) Conclusion

Le projet est **prometteur et bien structuré pour un MVP**, mais l’industrialisation est incomplète. Les priorités sont claires : **sécuriser l’exposition des Edge Functions**, puis **muscler fortement la qualité logicielle (tests + TypeScript strict + CI)** pour réduire le risque de régression en production.
