# SmartLine AssetHealth Web App

React + Vite single-page application used by SmartLine for the AssetHealth experience.  
This package lives inside the monorepo at `smartline-viz/apps/web`.

## Getting Started

```sh
pnpm install
pnpm dev            # starts Vite dev server on http://localhost:5173
```

Environment variables for the web client live in `.env` in this directory.  
The dev server uses port `5173` (see `vite.config.ts`). Set `VITE_API_BASE_URL` to your API URL (default `http://localhost:8080`).

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
