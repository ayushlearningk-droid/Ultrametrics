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

### 3. Meta Ads OAuth (connectors)

1. Create an app at https://developers.facebook.com/apps/ (type **Business**).
2. Add **Facebook Login** → Settings → **Valid OAuth Redirect URIs**:
   - `http://localhost:3000/api/connectors/meta/oauth/callback` (or your `META_OAUTH_REDIRECT_URI`)
3. App → **Basic** → copy **App ID** and **App Secret** into `.env.local`:
   ```env
   META_APP_ID=your_app_id
   META_APP_SECRET=your_app_secret
   META_OAUTH_REDIRECT_URI=http://localhost:3000/api/connectors/meta/oauth/callback
   ```
4. **App Review** → request `ads_read` (required for ad accounts in a later step). In Development mode, add Facebook users as **Testers** under Roles.
5. Ensure migration `20250602000000_meta_ads_connectors.sql` is applied (`oauth_pending_sessions` table).

### 4. First login

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
| `/dashboard/connectors/meta` | Meta Ads OAuth connect |
| `/api/connectors/meta/oauth/start` | Begin Facebook OAuth |
| `/api/connectors/meta/oauth/callback` | OAuth callback |

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
