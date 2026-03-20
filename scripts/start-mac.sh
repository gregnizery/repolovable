#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js non trouvé. Installez Node.js LTS (https://nodejs.org)."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "❌ npm non trouvé. Vérifiez votre installation Node.js."
  exit 1
fi

if [ ! -f ".env.local" ]; then
  cat <<'EOT'
⚠️  Fichier .env.local absent.
Créez-le avec :
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<...>
EOT
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "📦 Installation des dépendances..."
  npm install
fi

echo "🚀 Démarrage de l'application sur http://localhost:8080"
exec npm run dev
