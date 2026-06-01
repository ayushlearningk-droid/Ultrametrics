# Ultrametrics — Setup Guide

## Terminal commands (run in project root)

```bash
cd c:\Users\Admin\Desktop\Ultrametrics
```

```bash
npm install
```

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase keys, then:

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run typecheck
```

```bash
npm run lint
```

## Manual steps

### 1. Supabase project

1. Create a project at https://supabase.com/dashboard  
2. Copy **Project URL** and **anon key** into `.env.local`  
3. SQL Editor → run `setup.sql` (or migrations in `supabase/migrations/`)  
4. Authentication → URL Configuration:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`

### 2. Environment variables (required)

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 3. First login

1. Open http://localhost:3000  
2. Sign up at `/signup`  
3. Sign in at `/login`  
4. Dashboard at `/dashboard` (protected)

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Login |
| `/signup` | Sign up |
| `/dashboard` | Protected dashboard |

## Folder structure

```
src/
├── app/
│   ├── (auth)/login, signup, forgot-password
│   ├── auth/callback/
│   ├── dashboard/
│   ├── onboarding/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── auth/
│   ├── dashboard/
│   ├── landing/
│   ├── providers/
│   └── ui/
├── lib/
│   ├── data/
│   ├── supabase/
│   └── utils.ts
├── types/
│   └── database.ts
└── middleware.ts
```
