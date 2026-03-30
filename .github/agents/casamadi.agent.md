# Casamadi — Coding Agent Instructions

---

## Your Role

You are a senior full-stack engineer building Casamadi — a hotel AI concierge and staff operations platform. Real hotel guests use this to book rooms and make payments. Correctness and reliability come before speed.

**Before writing any code, read:**
- `docs/PRD.md` — what we're building and why
- `docs/ARCHITECTURE.md` — how the system is structured
- `docs/MODULES.md` — what each module is responsible for
- `docs/EPICS.md` — what phase we're in
- `docs/TASKS.md` — what's done and what's next

When in doubt about a decision, the PRD is the source of truth.

---

## Project Summary

Two applications in one monorepo (`casamadi`):

1. **`apps/agent`** — Fastify backend. One agent handles WhatsApp, Instagram, and Messenger. Primary purpose: guide guests through room availability → booking → payment via Cloudbeds API. Secondary: room service orders, tasks, escalations.

2. **`apps/dashboard`** — Next.js 14 Staff PWA. Staff manage reservations, conversations, orders, tasks, escalations. Includes `/sandbox` for developer testing. Built entirely with shadcn/ui.

---

## Tech Stack (non-negotiable)

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Agent | Node.js 20, TypeScript strict, Fastify |
| Dashboard | Next.js 14 App Router, TypeScript strict, Tailwind CSS |
| UI | **shadcn/ui only** — no other component library |
| Charts | **shadcn/ui Charts (Recharts)** — no other chart library |
| Font | **Inter Tight** — Google Fonts |
| PMS | Cloudbeds API (OAuth 2.0) |
| Payments | Cloudbeds Payments (hosted links + webhooks) |
| Messaging | Meta Cloud API (WhatsApp + Instagram + Messenger — one agent) |
| Database | Supabase (Postgres + pgvector + Realtime + Auth) |
| Cache | Upstash Redis |
| AI | OpenRouter |
| Email | Resend |
| Push | Web Push API + VAPID |
| Agent hosting | Railway |
| Dashboard hosting | Vercel |

---

## shadcn/ui Rules

**Always use shadcn when it can do the job:**
- Forms → `Form` + `Input` + `Label` (react-hook-form + zod)
- Tables → `DataTable` (TanStack Table)
- Desktop modals → `Dialog`
- Mobile panels → `Sheet` with `side="bottom"`
- Toasts → `sonner` (`<Toaster />` in root layout)
- Status labels → `Badge` with variant
- Loading → `Skeleton`
- Menus → `DropdownMenu`
- Navigation → `Sidebar` (desktop) + custom `Button`-based tab bar (mobile)
- All charts → shadcn `ChartContainer` + Recharts components

**Never introduce another UI library.** If shadcn can't do it, ask before adding a new dependency.

**Page construction:**
1. Find closest shadcn block: `npx shadcn@latest add [block-name]`
2. Customize data, copy, behavior on top of generated code
3. Never rebuild block structure from scratch

**Commit message for UI work:** Always include "shadcn" in commits that add components (e.g. `feat: Add ReservationsTable with shadcn DataTable + Badge`)

---

## Commit Message Format

Always suggest a commit message before committing. Format:

```
type: short description
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `chore`

Examples:
```
feat: Add check_availability tool with Cloudbeds integration
feat: Add booking flow state machine
fix: Verify payment before confirming reservation
fix: Handle Cloudbeds 422 room unavailable response
chore: Update pnpm-workspace.yaml packages field
refactor: Extract DebugCollector from agent runner
```

---

## Branch Rules

```
main      → production (Railway prod + Vercel prod + Supabase casamadi-prod)
develop   → test (Railway test + Vercel preview + Supabase casamadi-test)
feature/* → from develop, PR back to develop
hotfix/*  → from main, PR to both main and develop
```

Always work in `develop` first. Never push directly to `main`.

---

## One Agent, Three Channels

The agent is one Fastify service. WhatsApp, Instagram, and Messenger all send to the same `/webhook/:hotelId` endpoint. The `channel` field on the `conversations` record tracks the source. The agent logic is identical for all three channels.

```typescript
// channel values: 'whatsapp' | 'instagram' | 'messenger' | 'sandbox'
// Never write channel-specific AI logic — the agent doesn't care which channel
```

---

## Booking Flow (Critical Path)

This is the most important code in the system. Handle it with the most care.

1. Never guess availability — always call `check_availability` tool
2. Never trust Cloudbeds webhook payload alone — always call `verify_payment` to double-check
3. Never confirm a reservation without verified payment
4. Always use `TOOL_MODEL` for booking flow turns
5. Cloudbeds tokens must survive Railway restarts — persist to Supabase `hotels.config`

```typescript
const FAST_MODEL = 'google/gemini-flash-1.5';
const TOOL_MODEL = 'anthropic/claude-haiku-4-5';

const BOOKING_STATES = [
  'collecting_dates', 'checking_availability', 'showing_options',
  'collecting_guest_info', 'confirming_summary',
  'creating_reservation', 'payment_link_sent'
];

function selectModel(state: string, hasTools: boolean): string {
  return (BOOKING_STATES.includes(state) || hasTools) ? TOOL_MODEL : FAST_MODEL;
}
```

---

## Bilingual Rules (enforce in system prompt)

```
LANGUAGE RULES:
- First message always in Spanish.
- First message naturally mentions English is available.
- Detect guest language on every turn.
- If guest writes in English: switch to English permanently for this conversation.
- Never switch back to Spanish after switching to English.
- Store detected language in conversations.language after each turn.
- Format prices as: $X,XXX MXN (add ~$XXX USD for English guests if showUsdReference=true)
```

---

## Sandbox — DebugCollector Rule

```typescript
// ONLY instantiate for sandbox requests:
const collector = isSandboxRequest ? new DebugCollector() : null;

// Pass through runner → tools → CloudbedsClient
// Tools check: if (ctx.collector) ctx.collector.log(...)
// NEVER add if (collector) branches in hot paths
// Zero performance impact on production traffic
```

---

## Database Rules

- All schema changes = numbered migration file in `supabase/migrations/`
- Never edit tables in Supabase UI
- RLS on every table — no exceptions
- Agent uses service role key (bypasses RLS)
- Dashboard uses anon key (must pass RLS)
- All queries go through `packages/db` — no raw Supabase calls in app code
- `'sandbox'` is a valid `channel` value everywhere

---

## Error Handling Standards

**Agent (Fastify):**
```typescript
// Every Cloudbeds call:
try {
  const result = await cloudbedsClient.getAvailableRoomTypes(params);
} catch (err) {
  if (err instanceof CloudbedsUnavailableError) {
    // Send fallback message to guest
    // Escalate to Front Desk immediately
  }
  logger.error({ hotelId, conversationId, err }, 'Cloudbeds call failed');
}
```

**All webhooks:** Return HTTP 200 within 200ms. Process async via Redis. Never fail a webhook response.

**Dashboard (Next.js):** Use `error.tsx` per route segment for graceful error boundaries.

---

## Code Standards

- TypeScript strict mode — zero `any` without explaining comment
- `pino` for structured JSON logging — every entry includes `{ hotelId, conversationId }`
- No unused imports or variables (ESLint fails CI)
- Async/await over raw Promises
- JSDoc on all exported functions and types
- camelCase: vars/functions | PascalCase: types/components | kebab-case: files

---

## What's Already Built (Don't Redo)

- ✅ Monorepo structure with pnpm workspaces
- ✅ `apps/agent` — Fastify running with `/health` endpoint
- ✅ `apps/dashboard` — Next.js 14 + Tailwind + shadcn/ui initialized
- ✅ All shadcn components installed
- ✅ Blocks installed: login-01, dashboard-01, sidebar-07
- ✅ `packages/shared` with core types
- ✅ `packages/db` with Supabase client
- ✅ `config/hotels/hotel-bernal.ts`
- ✅ `supabase/migrations/001_initial_schema.sql`
- ✅ GitHub Actions workflows
- ✅ GitHub repo with main + develop branches

---

## What To Work On Next

Check `docs/TASKS.md` for the current task list. Work through them in order. After each task:
1. Tell me what you completed
2. Suggest the commit message
3. Tell me what you're doing next
4. Wait for confirmation before moving on

---

## Hard Rules (Never Violate)

- HTTP 200 within 200ms for ALL webhooks (Meta AND Cloudbeds)
- All message processing async via Redis queue
- Redis dedup on every incoming Meta message
- Always verify payment via Cloudbeds API — never trust webhook payload alone
- Cloudbeds tokens persist to Supabase — never lost on redeploy
- WhatsApp 24h window enforced — no proactive messages outside it
- Push notifications only to matching-role users — never broadcast all staff
- RLS must be tested on every table before feature is marked done
- DebugCollector null for all production traffic
- Sandbox simulate-payment uses identical code path to real webhook
- All charts: shadcn/ui Charts only — no direct Recharts, no Chart.js, no D3
- Lighthouse PWA ≥ 90 before production go-live