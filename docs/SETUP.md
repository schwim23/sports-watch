# First-time setup

This project was scaffolded without running `pnpm install` (Node wasn't installed in the scaffolding environment). To get it running:

## 1. Install Node + pnpm

```bash
# Option A: via nvm (recommended for solo devs)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 20
nvm use 20
npm i -g pnpm@9

# Option B: system package
sudo apt update && sudo apt install -y nodejs npm
npm i -g pnpm@9
```

## 2. Install dependencies

```bash
cd ~/sports-watch
pnpm install
```

`postinstall` will run `prisma generate` automatically.

## 3. Provision a Postgres database

Easiest: [Neon](https://neon.tech) free tier. Create a project, copy the connection strings.

```bash
cp .env.example .env
# Edit .env with your DATABASE_URL + DIRECT_URL
```

## 4. Set up Google OAuth

1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 client (Web application)
3. Add redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Copy client ID + secret into `.env`:

```
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
AUTH_SECRET=$(openssl rand -base64 32)
```

## 5. Generate VAPID keys for push

```bash
pnpm vapid:generate >> .env
```

(append to `.env`, then add `VAPID_SUBJECT="mailto:you@example.com"` manually)

## 6. Run migrations + seed

```bash
pnpm db:migrate
pnpm db:seed
```

## 7. Start the dev server

```bash
pnpm dev
```

Open http://localhost:3000.

## 8. Trigger an initial schedule pull

Once running, populate the games table by hitting the cron endpoint:

```bash
curl http://localhost:3000/api/games/refresh
```

(In dev, `CRON_SECRET` is optional and the endpoint is open.)

## 9. Verify

```bash
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:smoke   # hits live MLB StatsAPI
```

## 10. Push to GitHub

```bash
gh repo create sports-watch --public --source=. --remote=origin --push
gh issue create --title "M1: ..." # or import from docs/qa-checklist.md
```

## Deploying to Vercel

```bash
pnpm i -g vercel
vercel link
vercel env pull .env.production
vercel --prod
```

Set production env vars in Vercel dashboard. Crons in `vercel.json` will activate automatically.
