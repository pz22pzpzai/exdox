# Exdox Website

This is the standalone Exdox website repo scaffold.

## Why this stack

- TypeScript keeps the website aligned with the existing app and backend codebase.
- Vite produces a plain static `dist/` build, which is ideal for Spaceship FTP deployments.
- GitHub Actions can build the site and upload the generated files whenever the repository changes.

## Local development

1. Install dependencies with `npm install`
2. Start the dev server with `npm run dev`
3. Create a production build with `npm run build`

## GitHub secrets for deployment

Add these repository secrets before enabling the workflow:

- `FTP_SERVER`
- `FTP_USERNAME`
- `FTP_PASSWORD`
- `FTP_SERVER_DIR`

`FTP_SERVER_DIR` should point at the public web root for `exdox.co.uk`, for example `/public_html/` or the domain-specific document root Spaceship shows in hosting.
