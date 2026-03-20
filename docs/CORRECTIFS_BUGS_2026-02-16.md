# Correctifs de bugs potentiels — 2026-02-16

Ce document liste les bugs potentiels identifiés dans l'application, leur impact, et les correctifs appliqués.

## 1) Navigation déclenchée pendant le rendu (Login/Register)

## Analyse précise

- Dans `Login.tsx` et `Register.tsx`, la redirection vers `/dashboard` était exécutée directement dans le corps du composant (`if (user) navigate(...)`).
- En React, déclencher une navigation (side-effect) durant le render peut provoquer des comportements instables : avertissements React, double-renders non désirés en mode Strict, et risques de boucles de rendu selon le timing d’état.

## Correctif appliqué

- Remplacement de la redirection en render par un `useEffect` dépendant de `user` et `navigate`.
- Le rendu reste maintenant pur, et la navigation est exécutée au bon moment du cycle React.

## 2) Gestion d'erreurs OAuth Apple incomplète

## Analyse précise

- Le flux `handleAppleSignIn` ne gérait pas les exceptions runtime (erreur réseau, SDK indisponible, exception interne).
- En cas d’exception non capturée, `appleLoading` pouvait rester bloqué à `true`, laissant le bouton désactivé et l’UI incohérente.

## Correctif appliqué

- Encapsulation du flux OAuth dans `try/catch/finally` sur `Login` et `Register`.
- `finally` garantit la remise à `false` de `appleLoading` dans tous les cas.
- Ajout d’un message d’erreur utilisateur robuste (message d’exception quand disponible).

## 3) Navigation interne via `<a href>` (Register)

## Analyse précise

- Le lien « Se connecter » utilisait un `<a href="/login">`.
- Dans une SPA React Router, cela force un rechargement complet de page, peut casser l’expérience utilisateur, et invalider temporairement le cache/state côté client.

## Correctif appliqué

- Remplacement par `<Link to="/login">` pour préserver la navigation côté client et éviter les reloads inutiles.

## 4) Mutation involontaire des props dans `useDisponibiliteMultiple`

## Analyse précise

- `materielIds.sort()` était utilisé directement dans `queryKey`.
- `Array.prototype.sort()` mute le tableau d’origine : cela peut modifier les props du parent par effet de bord, générer des comportements difficiles à diagnostiquer et des invalidations de cache inattendues.

## Correctif appliqué

- Utilisation d’une copie avant tri : `[...materielIds].sort()`.
- Le calcul de clé de cache devient déterministe sans mutation externe.

## 5) Erreur silencieuse de configuration Supabase (variables env manquantes)

## Analyse précise

- Le client Supabase était créé même si `VITE_SUPABASE_URL` ou `VITE_SUPABASE_PUBLISHABLE_KEY` manquaient.
- Dans ce cas, les erreurs apparaissent plus tard (à l’exécution de requêtes) avec des symptômes indirects, rendant le diagnostic lent.

## Correctif appliqué

- Ajout d’un guard explicite au démarrage dans `src/integrations/supabase/client.ts`.
- L’application échoue rapidement avec un message clair si la configuration est incomplète.

---

## Fichiers modifiés

- `src/pages/Login.tsx`
- `src/pages/Register.tsx`
- `src/hooks/use-disponibilite.ts`
- `src/integrations/supabase/client.ts`

---

## Vérifications

- Revue statique des zones corrigées effectuée.
- Exécution complète des tests/lint non finalisable dans cet environnement (accès npm restreint) ; les correctifs sont ciblés sur des bugs logiques/React avérés et sûrs.
