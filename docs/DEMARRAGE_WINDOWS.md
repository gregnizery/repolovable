# Démarrer l'application sur Windows

## Prérequis
- Node.js LTS (npm inclus)
- Git
- PowerShell

## 1) Cloner et entrer dans le projet
```powershell
git clone <URL_DU_REPO>
cd planify-elevate
```

## 2) Configurer Supabase (frontend)
Créer `.env.local` à la racine :
```dotenv
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<...>
```

## 3) Démarrer (script recommandé)
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-windows.ps1
```

## 4) Alternative manuelle
```powershell
npm install
npm run dev
```

L'application sera accessible sur `http://localhost:8080`.
