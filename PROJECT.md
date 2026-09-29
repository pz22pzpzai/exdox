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

## Country and currency support (2026-09-29)

- `src/region.ts` lists GB, US, AU, CA, and 27 EUR-using countries and territories. The public selector persists locally and signup sends the chosen country to the API. Public pricing and signup show a dated reference conversion from GBP where available; Stripe billing remains GBP and the issuer sets the final conversion.
- A workspace's Settings country and reporting currency move together and replace the tax review choices and guidance. Non-UK tax rates are review aids, not automatic tax determination or filing; US state/local, Canadian provincial, and EUR territory rules still require a local review. The UK defaults and existing UK VAT choices remain unchanged.
- Non-UK mileage uses manual miles and a local rate. UK postcode route suggestions remain available only for UK workspaces. Existing historical documents are not revalued when a workspace changes country or currency; check reports spanning a country change before relying on totals.
- The server must be deployed before this website version because registration and settings now send `country`. The Android and iPhone app code was not changed and may still display UK-oriented labels. Never delete or move a mobile app keystore or signing details.

## Company disclosure (2026-09-29)

- The public footer shows EXDOX LTD, company number 17488771 linked to its Companies House listing, England and Wales as the registration jurisdiction, and the registered office address from that listing. Do not publish the incorporation certificate PDF; update the footer if the Companies House registered office changes.

## Performance and release notes

- Desktop homepage image and first-load follow-up (2026-09-29): `.public-hero > img` now uses `height: auto` at desktop widths as well as mobile widths. The prior 620 × 916 px rendered size stretched the 720 × 384 px source; the local production preview now renders about 620 × 331 px at the default desktop viewport. For visitors who already accepted analytics cookies, `src/googleAnalytics.tsx` queues page views immediately but waits until page load and browser idle before downloading Google's analytics script, so it does not compete with the initial hero and app resources. A pre-change live PageSpeed run reported 100 desktop (0.5 s LCP) and 95 mobile (2.5 s LCP); these are baseline results, not post-deployment measurements. The production build and local homepage visual check passed. Keep the CSP unchanged and do not delete or move mobile keystores or signing details.

- Internet.nl security work (2026-09-29): The initial website test scored 75%. Cloudflare Edge Certificates initially raised Minimum TLS Version to 1.2 (TLS 1.3 remained enabled); see the later TLS 1.3 decision below. Cloudflare DNSSEC signing was enabled and its DS record was added to Spaceship Advanced DNS for `exdox.co.uk`; Cloudflare subsequently displayed "Success! exdox.co.uk is protected with DNSSEC." `public/.well-known/security.txt` now provides the existing public contact address, a six-month expiry, and canonical URL; `.htaccess` forces `text/plain` for that file. The CSP image and frame sources now allow AWS hosts used by signed receipt/document URLs instead of every HTTPS host. See the later CSP change below for inline-style handling. Website source/build/push is separate from the owner's live-site check.

- CSP inline-style hardening (2026-09-29): Removed `'unsafe-inline'` from `style-src` in `public/.htaccess` to address Internet.nl's recommended CSP finding. Existing React chart, allowance-bar and tutorial styles are set via JavaScript CSSOM and remain allowed; a local browser probe with the built CSP header confirmed HTML `style` attributes are blocked while JavaScript-applied styles render. The production TypeScript/Vite build passed and local homepage, pricing and login pages loaded. Authenticated dashboard styling could not be exercised in the local preview without a signed-in session; the owner checks live behavior after deployment. Keep this distinction if revisiting the policy. Do not delete or move mobile keystores or signing details.

- TLS 1.3 minimum (2026-09-29): After the owner chose to exclude TLS 1.2-only clients, Cloudflare SSL/TLS Overview showed 9 TLS 1.2 and 907 TLS 1.3 encrypted requests over the previous 24 hours; some TLS 1.2 requests may have been our security scans. Edge Certificates initially rejected a TLS 1.3 minimum because the PCI DSS TLS 1.2 cipher selection conflicted with it. After the owner's refresh restored Advanced Certificate Manager controls, the cipher setting was changed to Legacy (default), then Minimum TLS Version to 1.3. Both values persisted after a dashboard reload, and TLS 1.3 remains enabled. The default TLS 1.2 ciphers cannot be negotiated while the 1.3 minimum is enforced. The owner will rerun Internet.nl; its 100% result and live handshake behavior were not verified here. Do not delete or move mobile keystores or signing details.

- Authenticator QR setup (2026-09-29): The Security panel renders the server-provided `otpauth://` setup URI as a browser-local SVG QR code using `qrcode.react`, with the same setup key retained beside it for manual entry. The QR component loads only when setup is opened. Both owner/admin Settings and employee Login security use the shared panel. Keep setup codes private; do not send them to an external QR service. Website build/push is separate from the owner's live-site test.

- Security chatbot guidance (2026-09-29): `src/chatbotKnowledge.ts` now answers where owners/admins and employees find their 2FA controls, how to enable email or authenticator codes, and how to use or disable them safely. The help chat also offers a visible 2FA question. All 103 canonical Q&As and representative 2FA paraphrases were checked locally; this does not verify the live site.

- Two-factor login (2026-09-29): Dashboard Profile/Settings > Security lets admins enable email codes, a Google Authenticator compatible app, or both; employees use Login security. When both are enabled, either method can complete login after the password. The client calls `/two-factor` for setup and `/login` for the challenge; it does not receive a session token before successful verification. Deploy the server update before this website version. Authenticator setup uses a manual key and shows eight one-time recovery codes once. The owner checks live deployment and email delivery; never delete or move mobile signing keystores or signing details.

- Pricing headline (2026-09-29): the public pricing page now gives “Free trial no card details needed” a larger highlighted line beneath the allowance headline, with “Cancel anytime” immediately below. The same content appears in the signed-in pricing view. Website TypeScript/Vite build passed; the live site and deployment workflow are for the owner to check.
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

## Mileage routing (2026-09-26)

- `src/MileageRoutePicker.tsx` calculates driving routes from complete UK postcodes on the new mileage claim form, offers Mapbox alternatives, and keeps Total miles editable for the actual journey. Pending admin mileage review forms also allow recalculation on demand.
- `src/api.ts` calls the authenticated server `POST /mileage/route` endpoint. The Mapbox token belongs only in the server's protected environment secret; never add it to Vite variables, browser code, or this repository.
- The initial postcode routing change was website-only; the Android mileage form gained the shared route preview on 2026-09-27.

## Mileage map preview (2026-09-27)

- The existing mileage picker also displays the selected Mapbox route image, using `includeMap: true` on the shared authenticated API. The same route result is used by the Android mileage sheet. Mapbox credentials remain server-side, and Total miles stays editable.
