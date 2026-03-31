# Casamadi — Development Tasks

**Version:** 1.0.0
**Last Updated:** March 2026

**How to use:** Tasks are grouped by Epic. Complete all tasks in an Epic before moving to the next. Check off tasks as you complete them. Add new tasks when discovered during development.

---

## Epic 0 — Infrastructure (In Progress)

### Code Tasks (Copilot)

- [x] Create monorepo root with pnpm workspaces + Turborepo
- [x] Create `apps/agent` with Fastify + `/health` endpoint
- [x] Create `apps/dashboard` with Next.js 14 + Tailwind
- [x] Install all shadcn/ui components
- [x] Install shadcn/ui blocks: login-01, dashboard-01, sidebar-07
- [x] Create `packages/shared` with all core types
- [x] Create `packages/db` with Supabase client factory
- [x] Create `config/hotels/hotel-bernal.ts` with full config
- [x] Create `.env.example` with all variables
- [x] Create `supabase/migrations/001_initial_schema.sql`
- [x] Create GitHub Actions workflows
- [x] Create `railway.toml` in `apps/agent`
- [x] Create `README.md`
- [x] Create `.env.local` files for both apps
- [ ] Add `TooltipProvider` + `Toaster` to root layout
- [ ] Verify TypeScript compiles with zero errors in all packages
- [ ] Fix Vercel build configuration for monorepo

### Manual Tasks (You)

- [x] Create GitHub repo `casamadi` (private)
- [x] Create `main` and `develop` branches
- [x] Protect both branches (require PR + status checks)
- [ ] Generate VAPID keys: `npx web-push generate-vapid-keys`
- [ ] Generate sandbox secret: `openssl rand -hex 32`
- [ ] Create Supabase project `casamadi-prod` (enable pgvector)
- [x] Create Supabase project `casamadi-test` (enable pgvector)
- [ ] Create Upstash Redis DB `casamadi-prod`
- [x] Create Upstash Redis DB `casamadi-test`
- [ ] Create Railway project + `agent-production` service (branch: main)
- [ ] Create Railway project + `agent-test` service (branch: develop)
- [ ] Import repo to Vercel, set root: `apps/dashboard`
- [ ] Fix Vercel build commands (see below)
- [x] Create OpenRouter account + API key + add $20-50 credit
- [ ] Create Resend account + verify domain
- [ ] Fill `.env.local` files with real test values
- [ ] Add secrets to GitHub Actions (see instructions below)
- [ ] Add secrets to Railway (see instructions below)
- [ ] Add secrets to Vercel (see instructions below)
- [x] Create first admin user in `casamadi-test` Supabase project

### Vercel Fix (Blocker)

Current issue: Vercel runs wrong build command. Try this in Vercel settings:
- Root Directory: `apps/dashboard`
- Install Command: `pnpm install --no-frozen-lockfile`
- Build Command: `pnpm --filter @casamadi/dashboard build`
- Output Directory: `.next`

If Vercel keeps ignoring settings, add to repo root:
```json
// vercel.json
{
  "buildCommand": "pnpm --filter @casamadi/dashboard build",
  "installCommand": "pnpm install --no-frozen-lockfile",
  "outputDirectory": "apps/dashboard/.next",
  "framework": "nextjs"
}
```

---

### GitHub Actions Secrets (Detailed Instructions)

**Purpose:** GitHub Actions runs workflows to deploy to Railway (agent) and Vercel (dashboard).

**How to add:**
1. Go to repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret below (name MUST match exactly):

**Agent Secrets (Railway deploys):**
```
SUPABASE_URL=https://your-test-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
OPENROUTER_API_KEY=sk-or-...
CLOUDBEDS_CLIENT_ID=...
CLOUDBEDS_CLIENT_SECRET=...
META_VERIFY_TOKEN=your-token
META_PHONE_NUMBER_ID=...
META_ACCESS_TOKEN=...
RESEND_API_KEY=re_...
VAPID_PUBLIC_KEY=BF...
VAPID_PRIVATE_KEY=p8...
SANDBOX_SECRET=...
RAILWAY_API_TOKEN=... (from railway.app → Account → API Tokens)
```

**Dashboard Secrets (Vercel deploys):**
```
VERCEL_TOKEN=... (from vercel.com → Account → Tokens)
VERCEL_ORG_ID=... (from Vercel project settings)
VERCEL_PROJECT_ID=... (from Vercel project settings)
NEXT_PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BF...
```

---

### Railway Secrets (Detailed Instructions)

**Purpose:** Railway runs the Fastify agent and needs credentials to connect to services.

**How to add:**
1. Go to railway.app → Your project → agent-test service
2. Click "Variables" tab
3. Add each secret below:

**Required Environment Variables:**
```
SUPABASE_URL=https://your-test-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
OPENROUTER_API_KEY=sk-or-...
CLOUDBEDS_CLIENT_ID=...
CLOUDBEDS_CLIENT_SECRET=...
META_VERIFY_TOKEN=your-token
META_PHONE_NUMBER_ID=...
META_ACCESS_TOKEN=...
RESEND_API_KEY=re_...
VAPID_PUBLIC_KEY=BF...
VAPID_PRIVATE_KEY=p8...
SANDBOX_SECRET=...
NODE_ENV=production
PORT=3000
```

**How to deploy:**
1. Connect your GitHub repo to Railway
2. Set branch to `develop` for agent-test
3. On every push to `develop` → Railway auto-deploys agent

---

### Vercel Secrets (Detailed Instructions)

**Purpose:** Vercel runs the Next.js dashboard and needs Supabase credentials.

**How to add:**
1. Go to vercel.com → Your project → Settings → Environment Variables
2. Add each secret below (must mark as Production + Preview):

**Required Environment Variables:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BF...
```

**How to deploy:**
1. Connect your GitHub repo to Vercel
2. Set root directory to `apps/dashboard`
3. On every push to `develop` → Vercel auto-deploys preview
4. Preview URL appears in PR comments

---

**Production Setup (later):** Add main branch deployment separately with prod environment variables.
## Epic 1 — Agent Core + Cloudbeds Auth

### Code Tasks (Copilot)

- [ ] Implement Meta webhook GET verification (hub challenge response)
- [ ] Implement Meta webhook POST handler with HMAC-SHA256 verification
- [ ] Implement Redis deduplication (SET NX 24h TTL)
- [ ] Implement Redis job queue for async processing
- [ ] Implement guest upsert logic
- [ ] Implement conversation upsert logic
- [ ] Implement message storage (role: user)
- [ ] Implement basic OpenRouter call (no tools, bilingual reply)
- [ ] Implement language detection + storage
- [ ] Implement bilingual first message (Spanish + subtle English offer)
- [ ] Implement `CloudbedsClient` class with OAuth token management
- [ ] Implement token refresh on 401
- [ ] Implement token persistence to Supabase `hotels.config`
- [ ] Create test route `GET /test/cloudbeds-auth`
- [ ] Send reply via Meta Cloud API

### Manual Tasks (You)

- [ ] Create Meta Developer App
- [ ] Add WhatsApp product → configure test webhook URL
- [ ] Verify webhook connects successfully (agent must be running)
- [ ] Complete Cloudbeds OAuth initial authorization (test environment)

---

## Epic 2 — Booking Flow

### Code Tasks (Copilot)

- [ ] Implement `check_availability` tool
- [ ] Implement `get_room_details` tool
- [ ] Implement booking conversation state machine
- [ ] Implement guest info collection flow
- [ ] Implement booking summary generation
- [ ] Implement `create_reservation` tool
- [ ] Implement `generate_payment_link` tool
- [ ] Implement Cloudbeds payment webhook handler
- [ ] Implement `verify_payment` tool (double-check payment)
- [ ] Implement `confirm_reservation` tool
- [ ] Implement payment follow-up Redis delayed job (35 min)
- [ ] Implement payment link expiry handling
- [ ] Implement Resend booking confirmation email
- [ ] Add `reservations` table queries to `packages/db`

### Manual Tasks (You)

- [ ] Set up Cloudbeds Payments for the property
- [ ] Configure Cloudbeds payment webhook URL (test)
- [ ] Get Cloudbeds webhook signing secret → Railway env var

---

## Epic 3 — Secondary Agent Tools

### Code Tasks (Copilot)

- [ ] Implement `get_menu` tool
- [ ] Implement `place_order` tool
- [ ] Implement `create_task` tool
- [ ] Implement `get_hotel_info` tool with pgvector RAG
- [ ] Implement `escalate_to_human` tool
- [ ] Implement push notification sender with role routing
- [ ] Seed Hotel Bernal knowledge base (RAG content)
- [ ] Test all push notification events

---

## Epic 4 — Dashboard Core

### Code Tasks (Copilot)

- [x] Implement login page with password authentication
- [x] Implement role-based sidebar (sidebar-07 block)
- [x] Implement route protection in `middleware.ts`
- [x] Implement dashboard home page with KPIs and real-time updates
  - [x] Sidebar collapse behavior (proper shadcn pattern with `group-data-[state=collapsed]/sidebar:hidden`)
  - [x] Loading skeletons (Skeleton component library)
  - [x] Spanish translations (centralized in `@/lib/spanish` constant)
  - [x] i18n documentation (`docs/I18N.md`)
- [x] Implement conversation list with real-time updates
  - [x] DataTable with columns: channel, guest name, room, last message, status
  - [x] Search/filter by name, phone, or room number
  - [x] Real-time Supabase subscription
  - [x] Unread badge + status indicators
  - [x] Mobile responsive table
  - [x] Loading skeletons and empty states
  - [x] Component patterns & guidelines documentation (`docs/COMPONENT_PATTERNS.md`)
- [ ] Implement conversation thread with message bubbles
- [ ] Implement `BookingPanel` component
- [ ] Implement `TakeoverBar` (take over / return to AI)
- [ ] Implement `ReplyBox` (staff reply via Meta API)
- [ ] Implement reservations board with real-time payment updates
- [ ] Implement push notification subscription flow
- [ ] Implement bottom tab bar for mobile
- [ ] Implement dashboard home (dashboard-01 block + charts)
- [ ] Implement magic link login (later iteration)

### Manual Tasks (You)

- [ ] Configure Supabase Auth SMTP → use Resend
- [ ] Create staff users in `casamadi-test`
- [ ] Test password login on real phone

---

## Epic 5 — Dashboard Full Features

### Code Tasks (Copilot)

- [ ] Implement orders Kanban board
- [ ] Implement tasks list
- [ ] Implement escalation queue with SLA timers
- [ ] Implement claim system for escalations
- [ ] Implement `/sandbox` page
- [ ] Implement `SandboxChat` with multi-tab support
- [ ] Implement `SandboxDebugPanel`
- [ ] Implement `SandboxToolbar` with simulate payment
- [ ] Implement `SandboxHistory`
- [ ] Implement sandbox API proxy routes in dashboard
- [ ] Add sandbox route to `AppSidebar` (admin only)
- [ ] Test push notifications on iPhone and Android

---

## Epic 6 — PWA & Launch

### Code Tasks (Copilot)

- [ ] Create `public/manifest.json`
- [ ] Configure next-pwa service worker
- [ ] Add iOS meta tags to root layout
- [ ] Create hotel icons (192x192, 512x512, apple-touch-icon)
- [ ] Achieve Lighthouse PWA score ≥ 90
- [ ] Achieve Lighthouse Performance score ≥ 80 (mobile)

### Manual Tasks (You)

- [ ] Test install on real iPhone (iOS 16.4+)
- [ ] Test install on real Android
- [ ] Test push notifications after install on both
- [ ] Configure production Cloudbeds OAuth
- [ ] Configure production Meta webhooks
- [ ] Set up System User token in Meta (permanent, no expiry)
- [ ] Upgrade Railway `agent-production` to paid plan
- [ ] Upgrade `casamadi-prod` Supabase to paid plan
- [ ] QA full booking flow end-to-end with real guest phone
- [ ] Hotel Bernal go-live

---

## Discovered During Development

*Add tasks here as they surface:*

- [ ] Fix Vercel build — keeps using wrong pnpm command