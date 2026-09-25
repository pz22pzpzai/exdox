# Exdox website

This repository contains the public Exdox website and the signed-in React/TypeScript workspace. The live site is `https://exdox.co.uk`; source is `https://github.com/pz22pzpzai/exdox`.

## Main files

- `src/App.tsx`: public pages and authenticated workspace UI.
- `src/styles.css`: site styling and self-hosted font declarations.
- `src/googleAnalytics.tsx`: consent-dependent public analytics.
- `public/branding/`, `public/videos/`, `public/fonts/`: static media and fonts.
- `public/.htaccess`: Apache security, cache, and SPA rewrite rules.
- `.github/workflows/deploy.yml`: GitHub Actions Vite build and FTP deployment.

## Build and deployment

- `npm install`, `npm run dev`, and `npm run build` are the local commands. The build runs TypeScript and Vite and writes `dist/`.
- Pushing `main` triggers the GitHub Actions build and FTP upload using repository secrets. Never record secret values here.
- Do not inspect the live website or deployment workflow after a push; the project owner does those checks.
- Preserve unrelated working-tree edits. Do not commit build output, local machine settings, or temporary packages.

## Performance and release notes

- The 2026-09-25 mobile PageSpeed report for the homepage showed performance 78, FCP 3.0 s, LCP 4.1 s, and a 3.6 MB demo video transfer during the initial load.
- The homepage video uses a small poster and `preload="none"`. Keep it user-controlled; do not cause the MP4 to download on initial page load.
- The homepage uses responsive WebP hero images, smaller badge/logo images, and self-hosted fonts. The hero image preload in `index.html` must match its `srcSet` and `sizes` in `src/App.tsx` to avoid duplicate downloads.
- The site caches hashed JS/CSS and font files for one year, and images/video for 30 days through `.htaccess`. Change filenames when replacing a cached static asset.
- The site also uses a production API hosted separately at `https://hz2zkm6jkf.execute-api.eu-west-2.amazonaws.com/prod`; no backend source lives here.
- Never delete or move a mobile app keystore or signing details. Those belong to the separate app project.
