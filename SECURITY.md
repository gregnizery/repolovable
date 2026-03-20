# Security Policy

## Secret Handling

- `.env`, `.env.local` and any private environment override must stay local and are ignored by Git.
- Only variables prefixed with `VITE_` may be consumed by the frontend bundle.
- `VITE_*` values are public at runtime. Do not place server secrets in them.
- Private credentials such as `SUPABASE_SERVICE_ROLE_KEY`, personal Supabase access tokens, SMTP passwords and private keys must remain outside the repo and outside the browser build.
- Browser-side keys such as Google Maps must be restricted by allowed domains/referrers in the provider console.

## Public Repository Rule

Before pushing to a public repository:

1. Remove any hardcoded token from scripts.
2. Verify `.env` is untracked.
3. Use `.env.example` placeholders only.
4. Exclude local dumps, exports and diagnostic files from Git.

## Reporting a Vulnerability

Open a private security report to the project maintainer and include:

- affected file or route,
- reproduction steps,
- impact,
- recommended remediation if available.
