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

- Mobile homepage hero aspect ratio (2026-09-25): the `width="1717" height="916"` HTML image attributes were making the 350 px wide homepage image render 916 px tall on narrow screens. The `max-width: 650px` hero image rule now sets `height: auto`, preserving the image's natural ratio. A local phone-width check measured 350 × 187 px after the fix; desktop CSS was left unchanged.
- The 2026-09-25 mobile PageSpeed report for the homepage showed performance 78, FCP 3.0 s, LCP 4.1 s, and a 3.6 MB demo video transfer during the initial load.
- The homepage video uses a small poster and `preload="none"`. Keep it user-controlled; do not cause the MP4 to download on initial page load.
- The homepage uses responsive WebP hero images, smaller badge/logo images, and self-hosted fonts. The hero image preload in `index.html` must match its `srcSet` and `sizes` in `src/App.tsx` to avoid duplicate downloads.
- The site caches hashed JS/CSS and font files for one year, and images/video for 30 days through `.htaccess`. Change filenames when replacing a cached static asset.
- The site also uses a production API hosted separately at `https://hz2zkm6jkf.execute-api.eu-west-2.amazonaws.com/prod`; no backend source lives here.
- Follow-up PageSpeed reports on 2026-09-25, before the second speed change, showed mobile performance 95 on `/pricing`, 95 on `/platform`, and 93 on `/login`. The login hero was the only large page-specific image finding (about 91 KiB estimated savings).
- The login and other authentication illustrations now use responsive WebP assets. Page tutorial code loads only on authenticated pages, and chatbot answers load when a visitor sends a message. After successful login or registration, an already hydrated session is reused for workspace loading to avoid a duplicate `/session` request; fallback sessions still trigger a fresh request. Workspace cache writes are delayed by 500 ms and coalesced across quick updates.
- A signed-in browser spot check before push opened Overview, Workflows, Analytics, Costs, Settings, and Sales Workspace. These pages rendered, but the warmed browser check cannot quantify cold-start or individual API latency. Do not attribute remaining delay to a particular endpoint without a request timing trace.
- Never delete or move a mobile app keystore or signing details. Those belong to the separate app project.
