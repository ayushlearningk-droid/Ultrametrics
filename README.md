# Ultrametrics

Production-ready marketing data SaaS — connect ad platforms, automate syncs, and manage workspaces with Supabase auth and Stripe billing.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)
![Stripe](https://img.shields.io/badge/Stripe-Billing-purple)

## Features

- **Landing page** — Hero, features, pricing, and CTA (Supermetrics-inspired UI)
- **Authentication** — Login, signup, forgot password via Supabase Auth
- **Dashboard** — Sidebar, top navbar, workspace switcher, user profile
- **Data model** — Users, workspaces, connectors, sync jobs, subscriptions
- **Stripe** — Checkout, customer portal, webhook handlers
- **Theming** — Light / dark / system mode
- **Vercel-ready** — Optimized for one-click deploy

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 App Router |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Auth & DB | Supabase (Auth + PostgreSQL) |
| Payments | Stripe |
| Deploy | Vercel |

## Quick start

```bash
npm install
cp .env.example .env.local
# Configure Supabase + Stripe (see docs/SETUP.md)
npm run dev
```

Open **http://localhost:3000**.

Detailed instructions: **[docs/SETUP.md](./docs/SETUP.md)**

## Environment variables

Copy `.env.example` to `.env.local`:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | App URL (local or production) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (webhooks only) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PRICE_*` | Stripe price IDs per plan |

## Database schema

| Table | Purpose |
|-------|---------|
| `users` | Profile linked to `auth.users` |
| `workspaces` | Team/client isolation |
| `workspace_members` | Roles per workspace |
| `connectors` | Data source connections |
| `sync_jobs` | Pipeline run history |
| `subscriptions` | Stripe billing state |

Migrations: `supabase/migrations/`

## Scripts

```bash
npm run dev        # Development server
npm run build      # Production build
npm run start      # Start production server
npm run lint       # ESLint
npm run typecheck  # TypeScript check
```

## API routes

| Route | Method | Description |
|-------|--------|-------------|
| `/auth/callback` | GET | Supabase OAuth / magic link callback |
| `/api/stripe/checkout` | POST | Create Checkout session |
| `/api/stripe/portal` | POST | Open Customer Portal |
| `/api/stripe/webhook` | POST | Stripe event handler |

## Folder structure

```
ultrametrics/
├── docs/
│   └── SETUP.md
├── public/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login, signup, forgot password
│   │   ├── api/stripe/      # Billing API
│   │   ├── auth/callback/   # Auth handler
│   │   ├── dashboard/       # Protected app
│   │   └── page.tsx         # Landing
│   ├── components/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── landing/
│   │   ├── providers/
│   │   └── ui/
│   ├── lib/
│   │   ├── data/
│   │   ├── stripe/
│   │   └── supabase/
│   ├── types/
│   └── middleware.ts
├── supabase/
│   ├── config.toml
│   └── migrations/
├── .env.example
├── components.json
├── package.json
└── vercel.json
```

## Deployment (Vercel)

1. Connect GitHub repository
2. Set environment variables from `.env.example`
3. Deploy — `vercel.json` is preconfigured
4. Update Supabase redirect URLs and Stripe webhook endpoint

## License

MIT
