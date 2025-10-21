# SmartLine AssetHealth Web App

React + Vite single-page application used by SmartLine for the AssetHealth experience.  
This package lives inside the monorepo at `smartline-viz/apps/web`.

## Getting Started

```sh
pnpm install
pnpm dev            # starts Vite dev server on http://localhost:8080
```

Environment variables for the web client live in `.env` in this directory.  
The server uses port `8080`; adjust via `vite.config.ts` if needed.

## Available Scripts

- `pnpm dev` – development server with hot reload
- `pnpm build` – production build written to `dist/`
- `pnpm preview` – preview the production build locally

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase integrations for data and auth

## Deployment Notes

Static builds are generated with `pnpm build`.  
`vercel.json` contains the rewrite rules needed for Vercel so that client-side routing works (single-page app fallback to `index.html`).
