# Démarrer l'application sur Mac

## Prérequis
- Node.js LTS (npm inclus)
- Git

## 1) Cloner et entrer dans le projet
```bash
git clone <URL_DU_REPO>
cd planify-elevate
```

## 2) Configurer Supabase (frontend)
Créer `.env.local` à la racine :
```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<...>
```

## 3) Démarrer (script recommandé)
```bash
./scripts/start-mac.sh
```

## 4) Alternative manuelle
```bash
npm install
npm run dev
```

L'application sera accessible sur `http://localhost:8080`.
