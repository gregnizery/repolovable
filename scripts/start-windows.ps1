$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Resolve-Path (Join-Path $ScriptDir "..")
Set-Location $RootDir

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "❌ Node.js non trouvé. Installez Node.js LTS (https://nodejs.org)."
  exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "❌ npm non trouvé. Vérifiez votre installation Node.js."
  exit 1
}

if (-not (Test-Path ".env.local")) {
  Write-Host "⚠️  Fichier .env.local absent."
  Write-Host "Créez-le avec :"
  Write-Host "VITE_SUPABASE_URL=https://<project-ref>.supabase.co"
  Write-Host "VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<...>"
  exit 1
}

if (-not (Test-Path "node_modules")) {
  Write-Host "📦 Installation des dépendances..."
  npm install
}

Write-Host "🚀 Démarrage de l'application sur http://localhost:8080"
npm run dev
