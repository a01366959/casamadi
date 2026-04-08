# Casamadi — Development Tasks

**Version:** 1.0.0
**Last Updated:** March 2026

**How to use:** Tasks are grouped by Epic. Complete all tasks in an Epic before moving to the next. Check off tasks as you complete them. Add new tasks when discovered during development.

---

## Epic 0 — Infrastructure (In Progress)

### Code Tasks (Copilot)

- [x] Create monorepo root with pnpm workspaces + Turborepo
- [x] Create `apps/agents` with Fastify + `/health` endpoint
- [x] Create `apps/web` with Next.js 14 + Tailwind
- [x] Install all shadcn/ui components
- [x] Install shadcn/ui blocks: login-01, dashboard-01, sidebar-07
- [x] Create `packages/shared` with all core types
- [x] Create `packages/db` with Supabase client factory
- [x] Create `config/hotels/hotel-bernal.ts` with full config
- [x] Create `.env.example` with all variables
- [x] Create `supabase/migrations/001_initial_schema.sql`
- [x] Create GitHub Actions workflows
- [x] Create `railway.toml` in `apps/agents`
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
- [ ] Import repo to Vercel, set root: `apps/web`
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
- Root Directory: `apps/web`
- Install Command: `pnpm install --no-frozen-lockfile`
- Build Command: `pnpm --filter @casamadi/dashboard build`
- Output Directory: `.next`

If Vercel keeps ignoring settings, add to repo root:
```json
// vercel.json
{
  "buildCommand": "pnpm --filter @casamadi/dashboard build",
  "installCommand": "pnpm install --no-frozen-lockfile",
  "outputDirectory": "apps/web/.next",
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
2. Set root directory to `apps/web`
3. On every push to `develop` → Vercel auto-deploys preview
4. Preview URL appears in PR comments

---

**Production Setup (later):** Add main branch deployment separately with prod environment variables.

---

## Epic 0.5 — Agent Sandbox Bootstrap (Completed ✅)

### Code Tasks (Copilot)

**Purpose:** Create a working agent that can be tested via dashboard sandbox before Meta webhook integration.

- [x] Create `apps/agents/src/index.ts` (Fastify bootstrap with health endpoints)
- [x] Create `apps/agents/src/services/logger.ts` (Pino structured JSON logging)
- [x] Create `apps/agents/src/services/supabase.ts` (DB queries for conversations, messages)
- [x] Create `apps/agents/src/services/redis.ts` (Upstash dedup + queue stubs)
- [x] Create `apps/agents/src/agent/languageDetector.ts` (ES/EN detection + system prompts)
- [x] Create `apps/agents/src/agent/runner.ts` (conversation orchestration)
- [x] Create `apps/agents/src/routes/sandbox.ts` (POST /api/sandbox/chat + simulate-payment)
- [x] Create `.env` template in `apps/agents/`
- [x] Update `apps/agents/package.json` with dependencies (@upstash/redis, fastify, dotenv, pino)
- [x] Verify TypeScript builds with zero errors
- [x] Create `apps/agents/README.md` with architecture docs

### API Endpoints (Ready)

**Health:**
```
GET /health → { status, timestamp, uptime }
GET /health/detailed → { status, services: { redis, supabase } }
```

**Sandbox (Testing):**
```
POST /api/sandbox/chat
{
  "hotel_id": "hotel-bernal",
  "phone": "525551234567",
  "message": "¿Hay disponibilidad?",
  "message_id": "msg_123" (optional, auto-generated)
}
→ Response: { success: true, message_id, reply, language }

POST /api/sandbox/simulate-payment
{
  "hotel_id": "hotel-bernal",
  "reservation_id": "res_123",
  "status": "completed" | "failed",
  "amount": 2500
}
→ Response: { success: true }
```

### Features Implemented

✅ **Supabase Integration:**
- Get/create conversations
- Store incoming messages (role: 'user')
- Store agent replies (role: 'assistant')
- Retrieve conversation history (last 20 messages)
- Update conversation metadata (language, status, tags)

✅ **Language Detection:**
- Detects Spanish or English from incoming messages
- Uses stop-word heuristics + character detection (¿ ¡ ñ á é í ó ú)
- Switches from Spanish → English permanently (never back)
- Generates bilingual system prompts

✅ **Agent Runner:**
- Loads conversation context
- Detects language per message
- Generates stub replies (echo bot for now)
- Stores replies to database
- Returns reply + detected language

✅ **Redis (Optional):**
- Message deduplication (no double-processing)
- Graceful fallback if Redis unavailable
- 5-minute TTL on dedup keys

✅ **HTTP Contract:**
- All endpoints return 202 Accepted within 200ms per hard rule
- Async message processing (fire and forget)
- Proper error handling + logging

### Next Steps (Epic 1 — Agent Core)

- [ ] Implement OpenRouter integration (replace stub replies)
- [ ] Implement Meta webhook GET verification (hub challenge)
- [ ] Implement Meta webhook POST handler (HMAC-SHA256 verification)
- [ ] Implement Cloudbeds OAuth token management
- [ ] Implement booking state machine
- [ ] Connect to real Meta Cloud API

---

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

## Epic 7 — Dashboard Platform Pages (All Staff, Role-Gated)

### Prerequisite
- [ ] Create database tables: `pedidos`, `tareas`, `menu_items`, `inventario_items`, `rooms`
- [ ] Add RLS policies to all new tables (anon key test access)
- [ ] Update `packages/db` with new table clients and queries

### 3.2 Conversaciones Page
- [ ] Implement conversation list with real-time updates (Supabase subscription)
- [ ] Add channel badge (WhatsApp, Instagram, Messenger)
- [ ] Add status indicator (active, escalated, takeover, closed)
- [ ] Add tag display (Lead, Huésped, Evento)
- [ ] Implement conversation search/filter by name, phone, room
- [ ] Implement "Take Over" button with duration dialog (1h, 1d, 1w, 1m, Always)
- [ ] When takeover active: show "Release to Agent" button instead
- [ ] Implement escalation badge + reason
- [ ] Auto-dismiss escalation flag after staff takes over
- [ ] Add real-time message subscription to conversation detail
- [ ] Show conversation timeline (all messages)
- [ ] Display guest profile panel (name, phone, email, booking status)
- [ ] Implement Message bubbles (staff messages vs guest messages)
- [ ] Add staff reply box (sends via Meta API)

### 3.3 Pedidos Page
- [ ] Create pedidos list/Kanban board view
- [ ] Show: room #, items, status, assigned staff, delivery deadline
- [ ] Implement filters: by status, by room, by staff
- [ ] "Assign" button (dropdown to select staff) — Recepción/Admin only
- [ ] "Reject" button (only if kitchen closed or item unavailable) — Recepción/Admin only
- [ ] When rejected: auto-message guest via agent + suggest alternative
- [ ] "Mark as Delivered" button (staff on kitchen)
- [ ] Add notes field (staff can add context)
- [ ] Real-time update when status changes
- [ ] Show average delivery time metric

### 3.4 Tareas Page
- [ ] Create tareas list view (table or Kanban)
- [ ] Show: room #, task type, status, assigned staff, completion time
- [ ] Implement filters: by status, by room, by type, by staff
- [ ] "Assign" button (dropdown) — Recepción/Admin only
- [ ] "Reject" button (only if can't fulfill) — Recepción/Admin only
- [ ] When rejected: restore inventory if applicable, notify Recepción
- [ ] "Mark as Done" button (any staff)
- [ ] When marked done: auto-update inventory status if applicable (busy → returned)
- [ ] Add notes field
- [ ] Real-time inventory sync on task completion
- [ ] Show completion rate metric
- [ ] Show average completion time

### 3.5 Menu Page
- [ ] Create menu list view (grouped by section: Desayuno, Comida/Cena, 24/7)
- [ ] Display per item: name, description, price, prep time, status (active/inactive)
- [ ] Toggle on/off button for each item (Recepción/Admin can toggle, General read-only)
- [ ] Show weekly reset schedule (Monday 00:00)
- [ ] Add notes: "All items auto-reactivate every Monday"
- [ ] Display kitchen hours (if applicable)
- [ ] Show real-time availability (based on current time and item status)
- [ ] "Add New Item" button (Admin only) — opens form
- [ ] Form: name, description, price, section, prep time
- [ ] Save → persist to database → immediately available to agent
- [ ] Edit/Delete item buttons (Admin only)

### 3.6 Inventario (Staff View) Page
- [ ] Create inventory list view
- [ ] Display per item: name, total qty, available qty, busy qty, status
- [ ] Show "Busy" details: room #, qty, since when
- [ ] Toggle on/off button (Recepción/Admin can toggle, General can only mark busy/returned)
- [ ] "Mark as Busy" button (when staff delivers to room)
- [ ] "Mark as Returned" button (when staff picks up from room)
- [ ] Show reorder threshold alerts (red flag if available < threshold)
- [ ] "Add New Item" button (Admin only) — opens form
- [ ] Form: name, locations, qty, reorder threshold
- [ ] Save → persist to database
- [ ] Real-time sync when checkout tasks completed

### 3.7 Cuartos (Rooms) Page
- [ ] Create rooms list view (pulls from Cloudbeds via API or synced `rooms` table)
- [ ] Display per room: number, type, guest name, check-in/out, status, open tasks/orders, deuda
- [ ] Implement filters: by status (empty, occupied, cleaning), by floor
- [ ] Room detail panel:
  - [ ] Show reservation info from Cloudbeds (dates, rate, payment status)
  - [ ] Show active pedidos (linked to room) — can reassign/reject from here
  - [ ] Show active tareas (linked to room) — can reassign/mark done from here
  - [ ] Show borrowed items (inventory currently in room with qty + date)
  - [ ] Show financial summary (room service deudas)
  - [ ] Display deuda per order: amount, date, status (pending, collected)
  - [ ] "Collect Payment" button (mark order as paid) — Recepción only
  - [ ] "Mark Room Ready for Checkout" button (Recepción only)
  - [ ] Timeline of all events (reservation created, orders, tasks, checkout)
- [ ] Real-time update from Cloudbeds sync
- [ ] When checkout task marked done: auto-update inventory (restore borrowed items)

### 3.1 Dashboard Page
- [ ] Show all KPIs (update DASHBOARD.md Section 3.1 implementation details as you build)
- [ ] Solicitudes Abiertas: total + breakdown by status + time-in-queue
- [ ] Pedidos: total today, top 5 most/least ordered, avg delivery time, status breakdown
- [ ] Tareas: total today, request types, completion rate %, avg completion time
- [ ] Key metrics: agent conversations (today), escalations, booking success %, avg response time
- [ ] Charts: Recharts via shadcn/ui Charts component (do NOT use direct Recharts imports)
- [ ] Real-time updates via Supabase subscriptions
- [ ] Role-based widget filtering:
  - [ ] General staff: only see Tareas + Pedidos they're assigned to
  - [ ] Recepción: all staff data + escalations
  - [ ] Admin: all metrics + financial summaries

---

## Epic 8 — Dashboard Admin Pages

### 4.1 Usuarios (Users)
- [ ] Create users list view
- [ ] Display: name, email, role, status, last login
- [ ] "Create User" button → form: name, email, role (radio: Admin, Recepción, General)
- [ ] "Edit User" button → pre-fill form, change name/email/role or disable account
- [ ] "Delete User" button → soft delete (maintain audit trail)
- [ ] "Reset Password" link → send password reset email via Resend
- [ ] Verify RLS allows only admins to view/modify users

### 4.2 Menu Management (Admin)
- [ ] (Reuse 3.5 Menu Page, Admin-only access)
- [ ] Add "Edit Item" form: change price, description, prep time, section
- [ ] Add "Delete Item" button
- [ ] Add "Set Kitchen Hours" (optional) — e.g., "Comida 12pm-3pm, 6pm-10pm"
- [ ] Add seasonal availability dates (e.g., "Easter special: Mar 20 - Apr 15")

### 4.3 Inventario Management (Admin)
- [ ] (Reuse 3.6 Inventario Page, Admin-only access)
- [ ] Add "Edit Item" form: change locations, reorder threshold
- [ ] Add "Delete Item" button
- [ ] Add "Adjust Stock" form (admin received shipment or broke item):
  - [ ] Current qty
  - [ ] Adjustment qty (+ or -)
  - [ ] Reason
  - [ ] Persist adjustment to inventory

---

## Epic 9 — Public Menu & Real-Time Features

### Public Menu (No Auth)
- [ ] Create `GET /api/menu/:hotelId` endpoint (or `GET /api/menu` if single hotel)
- [ ] Fetch active menu items from database
- [ ] Group by section (Desayuno, Comida/Cena, 24/7)
- [ ] Show real-time availability (based on current time + item status)
- [ ] Render: item name, description, price, prep time
- [ ] Show "Available at 12:00" for sections not yet active
- [ ] Dim unavailable sections (gray text)
- [ ] NO ordering button on public page
- [ ] Publish public page at `/guests/menu/:hotelId`
- [ ] Footer: "Continue with our Agent" → link back to chat
- [ ] Ensure CORS allows any origin (guest can share via QR)

### Real-Time Features
- [ ] Implement Supabase Realtime subscriptions for:
  - [ ] New pedidos (kitchen staff to see orders in real time)
  - [ ] New tareas (housekeeping to see tasks in real time)
  - [ ] Status changes (staff to see updates without refresh)
  - [ ] Conversation messages (staff to see guest replies live)
  - [ ] Inventory changes (deduction when delivered, restoration on return)
- [ ] Add auto-refresh on page focus (user switches tabs → re-sync on return)

### Agent Takeover State Sync
- [ ] When staff clicks "Take Over": agent reads `conversations.current_takeover` and stops responding
- [ ] At end of duration OR "Release" click: agent resumes responding
- [ ] If takeover duration = null ("Always"): agent waits for manual release
- [ ] Push notification to staff when takeover status changes

---

## Epic 10 — Integration & Testing

### Code Tasks (Copilot)
- [ ] Test all agent tools with pedidos and tareas creation
- [ ] Verify agent respects menu availability (time-based rejection)
- [ ] Verify agent suggests alternatives when item unavailable
- [ ] Verify inventory auto-deduction when tarea created
- [ ] Verify inventory auto-restoration when item returned
- [ ] Verify checkout auto-creates return task with all borrowed items
- [ ] Verify takeover duration enforcement
- [ ] Verify role-based access (use Supabase RLS test client)
- [ ] Verify staff can't access admin pages (RLS + frontend validation)
- [ ] Test push notifications for all event types
- [ ] Test public menu endpoint (no auth, real-time data)
- [ ] Test mobile responsive UI on iPhone + Android
- [ ] Test PWA installation after all features added

### Manual Testing (You)
- [ ] End-to-end booking flow: guest orders room→payment→confirmed→staff sees in dashboard
- [ ] End-to-end room service: guest orders food→staff delivers→marked done→tracked metric
- [ ] End-to-end housekeeping: guest requests towel→inventory deducted→staff delivers→inventory restored
- [ ] Takeover & release flow: staff takes over→guest messages direct to staff→duration expires→agent resumes
- [ ] Menu availability: test ordering outside time window (should be rejected)
- [ ] Checkout flow: reservation ends→auto-task created→staff marks done→inventory restored

---

## Discovered During Development

*Add tasks here as they surface:*

- [ ] Fix Vercel build — keeps using wrong pnpm command