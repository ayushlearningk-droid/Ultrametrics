# Ultrametrics Setup Guide

Complete step-by-step instructions to run Ultrametrics locally and deploy to production.

## Prerequisites

- Node.js 20+
- npm 10+
- [Supabase](https://supabase.com) account
- [Stripe](https://stripe.com) account (for billing)
- [Vercel](https://vercel.com) account (for deployment)

---

## 1. Clone and install

```bash
cd Ultrametrics
npm install
cp .env.example .env.local
```

Fill in all values in `.env.local` before continuing.

---

## 2. Supabase project

### Create project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Copy **Project URL** and **anon key** to `.env.local`
4. Copy **service_role key** to `.env.local` (keep secret — server only)

### Run migrations

**Option A — SQL Editor (quickest)**

1. Open **SQL Editor** in Supabase
2. Run `supabase/migrations/20250601000000_initial_schema.sql`
3. Run `supabase/migrations/20250601000001_rls_policies.sql`

**Option B — Supabase CLI**

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### Auth redirect URLs

In Supabase → **Authentication** → **URL Configuration**:

| Setting | Value (local) |
|---------|----------------|
| Site URL | `http://localhost:3000` |
| Redirect URLs | `http://localhost:3000/auth/callback` |

For production, add your Vercel URL:

- `https://your-app.vercel.app/auth/callback`

---

## 3. Stripe setup

### Products and prices

1. Stripe Dashboard → **Products**
2. Create **Starter** and **Growth** products with monthly/yearly prices
3. Copy each **Price ID** (`price_...`) into `.env.local`

### Webhook (local development)

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`.

### Webhook (production)

1. Stripe Dashboard → **Developers** → **Webhooks**
2. Add endpoint: `https://your-app.vercel.app/api/stripe/webhook`
3. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy signing secret to Vercel env vars

---

## 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

1. Sign up at `/signup`
2. Confirm email if enabled in Supabase
3. Access dashboard at `/dashboard`

---

## 5. Deploy to Vercel

1. Push code to GitHub
2. Import repo in [vercel.com/new](https://vercel.com/new)
3. Add all environment variables from `.env.example`
4. Set `NEXT_PUBLIC_APP_URL` to your production URL
5. Deploy

Post-deploy:

- Update Supabase auth redirect URLs
- Update Stripe webhook URL
- Enable Stripe Customer Portal in Dashboard settings

---

## 6. Verify installation

| Check | Expected |
|-------|----------|
| Landing page | Hero, features, pricing render |
| Sign up | User row in `public.users` |
| Dashboard | Default workspace created |
| Theme toggle | Light/dark switches |
| Billing | Checkout redirects to Stripe (test mode) |

---

## Troubleshooting

### "Invalid API key" (Supabase)

Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` match your project.

### Auth callback fails

Ensure `/auth/callback` is in Supabase redirect URLs.

### Stripe checkout 400

Price IDs in `.env.local` must match live/test mode of your `STRIPE_SECRET_KEY`.

### RLS blocks queries

Confirm migrations ran and user is in `workspace_members` for the workspace.

---

## Project structure

```
src/
├── app/                 # Next.js App Router pages & API
├── components/          # UI, landing, auth, dashboard
├── lib/                 # Supabase, Stripe, utils, data
├── types/               # Database TypeScript types
supabase/
└── migrations/          # PostgreSQL schema + RLS
```
