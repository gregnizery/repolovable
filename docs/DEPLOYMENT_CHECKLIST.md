# Deployment checklist (production)

## 1. Variables d'environnement frontend
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## 2. Supabase Edge Functions
- Vérifier que les fonctions non publiques imposent un JWT valide.
- Configurer les secrets côté Supabase (SMTP, etc.) sans les exposer au frontend.

## 3. Qualité CI/CD minimale
- `npm ci`
- `npm run lint`
- `npm run test`
- `npm run build`

## 4. Contrôles avant mise en prod
- Auth: login / logout
- CRUD principal: clients, missions, devis/factures
- Fonctions PDF et email
- Vérification des règles RLS

## 5. Post-déploiement
- Vérifier logs frontend + Edge Functions
- Monitorer erreurs auth et erreurs de requêtes Supabase
- Préparer plan de rollback
