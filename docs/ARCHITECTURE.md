# Casamadi — System Architecture

**Version:** 1.0.0
**Last Updated:** March 2026

---

## 1. Repository Structure

```
casamadi/                          # Monorepo root
├── apps/
│   ├── agent/                     # Fastify — AI agent + webhook server
│   └── dashboard/                 # Next.js 14 — Staff PWA
├── packages/
│   ├── shared/                    # TypeScript types shared by all apps
│   └── db/                        # Supabase client + typed query helpers
├── config/
│   └── hotels/
│       └── hotel-bernal.ts        # Hotel config: persona, booking, menu, routing
├── docs/                          # All documentation lives here
├── supabase/
│   └── migrations/                # Numbered SQL files — all schema changes
├── .github/
│   ├── copilot-instructions.md    # VS Code agent instructions
│   └── workflows/
│       ├── deploy-test.yml        # Auto-deploy on push to develop
│       └── deploy-prod.yml        # Auto-deploy on push to main
├── package.json                   # pnpm workspaces root
├── pnpm-workspace.yaml            # packages: [apps/*, packages/*]
└── turbo.json                     # Turborepo pipeline
```

---

## 2. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | Fast installs, shared packages, parallel builds |
| Agent Backend | Node.js 20 + TypeScript (strict) + Fastify | Fast, typed, great webhook handling |
| Dashboard | Next.js 14 App Router + TypeScript (strict) | SSR, file-based routing, Vercel-native |
| UI Components | shadcn/ui | Consistent, accessible, copy-owned components |
| Charts | shadcn/ui Charts (Recharts) | Consistent with shadcn design system |
| Font | Inter Tight — Google Fonts | Clean, professional |
| Database | Supabase (Postgres + pgvector + Realtime + Auth) | All-in-one: DB, auth, vectors, real-time |
| Cache / Queue | Upstash Redis | Serverless Redis, webhook dedup, job queue |
| AI Models | OpenRouter | Access to multiple models, cost control |
| PMS | Cloudbeds API (OAuth 2.0) | Hotel's PMS — availability, reservations |
| Payments | Cloudbeds Payments | Hosted payment links, webhooks |
| Messaging | Meta Cloud API | WhatsApp + Instagram + Messenger |
| Email | Resend | Magic link auth emails + guest booking confirmations |
| Push | Web Push API + VAPID | Browser push, works on iOS 16.4+ and Android |
| Agent Hosting | Railway | Simple deploys, always-on, env management |
| Dashboard Hosting | Vercel | Next.js-native, preview per branch |
| Error Tracking | Railway logs (v1) | Upgrade to Sentry in v2 |
| Version Control | GitHub | Source of truth |

---

## 3. Agent Architecture

### 3.1 One Agent, Three Channels

```
WhatsApp ──┐
Instagram ──┼──→ POST /webhook/:hotelId ──→ Agent Runner ──→ Reply via same channel
Messenger ──┘
```

The agent is a single Fastify service. Meta Cloud API sends all three channels to the same webhook endpoint. The `channel` field on the `conversations` record tracks the source. The agent logic is identical — it doesn't care which channel the guest used.

### 3.2 Message Processing Flow

```
POST /webhook/:hotelId
  ↓
1. Verify Meta HMAC-SHA256 signature → 403 if invalid
2. Return HTTP 200 immediately (Meta requires < 5s)
3. Enqueue job to Upstash Redis stream (async)
  ↓
Redis Worker:
4. Dedup: Redis SET message:{channel_message_id} NX EX 86400
   → If exists: skip silently (duplicate webhook)
5. Load hotel config from config/hotels/
6. Upsert guest record (hotel_id + channel + channel_user_id)
7. Upsert or find active conversation
8. Store incoming message (role: user)
9. If conversation.status === 'human_active':
   → Send push to assigned staff member only
   → Stop (do not invoke AI)
10. Load last 20 messages from DB (conversation history)
11. Build system prompt from hotel config + detected language
12. Select model (TOOL_MODEL for booking turns, FAST_MODEL otherwise)
13. Call OpenRouter API with tools
14. Execute tool calls
15. Store AI reply (role: assistant)
16. Send reply via Meta Cloud API
17. Update conversation: last_message_at, language, booking_session_id
```

### 3.3 Cloudbeds Webhook Flow

```
POST /webhooks/cloudbeds
  ↓
1. Verify Cloudbeds webhook signature
2. Return HTTP 200 immediately
3. Parse event type
4. If payment.completed:
   a. Find reservation by cloudbeds_reservation_id in local DB
   b. Call Cloudbeds API to verify payment (never trust payload alone)
   c. Update reservation: status=confirmed, confirmed_at=now()
   d. Call Cloudbeds API to confirm reservation
   e. Send WhatsApp/chat confirmation message to guest
   f. Push notification to Front Desk + Manager
5. If reservation.cancelled:
   a. Update local reservation status
   b. Notify Front Desk + Manager
```

### 3.4 Agent Directory Structure

```
apps/agent/src/
├── index.ts                      # Fastify server bootstrap
├── routes/
│   ├── health.ts                 # GET /health
│   ├── webhook.ts                # GET + POST /webhook/:hotelId (Meta)
│   ├── webhookCloudbeds.ts       # POST /webhooks/cloudbeds
│   └── sandbox.ts                # POST /api/sandbox/chat + simulate-payment
├── agent/
│   ├── runner.ts                 # Main agent loop (accepts optional DebugCollector)
│   ├── stateMachine.ts           # Conversation state transitions
│   ├── bookingSession.ts         # Booking conversation state management
│   ├── languageDetector.ts       # Per-turn language detection + storage
│   ├── debugCollector.ts         # Sandbox debug logging (null in production)
│   └── tools/
│       ├── index.ts              # Tool registry
│       ├── checkAvailability.ts  # Cloudbeds: getAvailableRoomTypes
│       ├── getRoomDetails.ts     # Cloudbeds: room info
│       ├── createReservation.ts  # Cloudbeds: postReservation
│       ├── generatePaymentLink.ts # Cloudbeds Payments: payment link
│       ├── verifyPayment.ts      # Cloudbeds: verify payment status
│       ├── confirmReservation.ts # Cloudbeds: confirm after payment
│       ├── getMenu.ts            # Local DB: hotel menu
│       ├── placeOrder.ts         # Local DB: room service order
│       ├── createTask.ts         # Local DB: housekeeping/maintenance task
│       ├── getHotelInfo.ts       # pgvector: RAG search
│       └── escalateToHuman.ts    # Set human_active + create escalation
├── services/
│   ├── cloudbeds.ts              # CloudbedsClient (OAuth + token refresh)
│   ├── meta.ts                   # Meta Cloud API client
│   ├── openrouter.ts             # OpenRouter client + model routing
│   ├── redis.ts                  # Upstash Redis client + dedup + queue
│   ├── push.ts                   # Web Push sender with role routing
│   └── resend.ts                 # Resend email client
├── db/
│   └── client.ts                 # Supabase service-role client
└── types/
    └── index.ts                  # Agent-internal types
```

### 3.5 AI Tools

| Tool | External Call | Push Notification |
|---|---|---|
| `check_availability` | Cloudbeds API | None |
| `get_room_details` | Cloudbeds API | None |
| `create_reservation` | Cloudbeds API | None |
| `generate_payment_link` | Cloudbeds Payments | None |
| `verify_payment` | Cloudbeds API | None |
| `confirm_reservation` | Cloudbeds API | Front Desk + Manager |
| `get_menu` | Local DB | None |
| `place_order` | Local DB | Room Service role |
| `create_task` | Local DB | Housekeeping + Manager |
| `get_hotel_info` | pgvector (Supabase) | None |
| `escalate_to_human` | Local DB | Per escalation routing |

### 3.6 Model Routing

```typescript
const FAST_MODEL = 'google/gemini-flash-1.5';     // FAQ, general questions
const TOOL_MODEL = 'anthropic/claude-haiku-4-5';  // Any turn with tool calls

// Booking flow turns ALWAYS use TOOL_MODEL
const BOOKING_STATES = [
  'collecting_dates', 'checking_availability', 'showing_options',
  'collecting_guest_info', 'confirming_summary',
  'creating_reservation', 'payment_link_sent'
];
```

### 3.7 Cloudbeds OAuth Token Management

- Initial tokens seeded via OAuth flow (manual, once per environment)
- Tokens stored in Supabase `hotels.config` — survive Railway restarts
- On 401 response: auto-refresh + persist new tokens to Supabase
- On refresh failure: alert Manager via push, log to Railway

---

## 4. Dashboard Architecture

### 4.1 Directory Structure

```
apps/dashboard/src/
├── app/
│   ├── layout.tsx                # Root: Inter Tight + TooltipProvider + Toaster
│   ├── (auth)/
│   │   └── login/page.tsx        # login-01 block
│   └── (dashboard)/
│       ├── layout.tsx            # AppSidebar + SiteHeader shell
│       ├── page.tsx              # dashboard-01 block (stats + charts)
│       ├── conversations/
│       │   ├── page.tsx          # DataTable + filters
│       │   └── [id]/page.tsx     # Thread + BookingPanel
│       ├── reservations/
│       │   ├── page.tsx          # DataTable + real-time
│       │   └── [id]/page.tsx     # Reservation detail
│       ├── orders/page.tsx       # Kanban board
│       ├── tasks/page.tsx        # DataTable
│       ├── escalations/page.tsx  # DataTable + SLA timers
│       ├── sandbox/page.tsx      # Admin only — agent testing
│       └── settings/page.tsx     # Admin only
├── components/
│   ├── layout/
│   │   ├── AppSidebar.tsx        # sidebar-07, role-filtered
│   │   ├── SiteHeader.tsx
│   │   └── BottomNav.tsx         # Mobile tab bar
│   ├── conversations/
│   │   ├── ConversationList.tsx
│   │   ├── ConversationThread.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── ReplyBox.tsx
│   │   ├── TakeoverBar.tsx
│   │   └── BookingPanel.tsx      # Shows booking context in thread
│   ├── reservations/
│   │   ├── ReservationsTable.tsx
│   │   ├── ReservationStatusBadge.tsx
│   │   └── SendPaymentLinkButton.tsx
│   ├── sandbox/
│   │   ├── SandboxLayout.tsx     # Multi-tab conversation support
│   │   ├── SandboxChat.tsx
│   │   ├── SandboxDebugPanel.tsx
│   │   ├── SandboxToolbar.tsx
│   │   └── SandboxHistory.tsx
│   ├── charts/
│   │   ├── RevenueAreaChart.tsx
│   │   ├── MessageVolumeChart.tsx
│   │   ├── ConversionRadialChart.tsx
│   │   └── RevenueByRoomChart.tsx
│   └── ui/
│       ├── ChannelBadge.tsx      # WhatsApp/Instagram/Messenger/Sandbox
│       ├── LanguageBadge.tsx     # ES/EN
│       └── PushPrompt.tsx
├── app/api/
│   └── sandbox/
│       ├── chat/route.ts         # Proxies to agent + adds x-sandbox-key
│       └── simulate-payment/route.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   └── server.ts             # Server Components client
│   ├── auth.ts
│   └── push.ts
├── public/
│   ├── manifest.json             # PWA manifest
│   └── icons/                    # 192x192, 512x512, apple-touch-icon
└── middleware.ts                 # Route protection by role
```

### 4.2 shadcn/ui Block Usage

| Page | Block | Install |
|---|---|---|
| Login | `login-01` | `npx shadcn@latest add login-01` |
| Dashboard Home | `dashboard-01` | `npx shadcn@latest add dashboard-01` |
| Sidebar | `sidebar-07` | `npx shadcn@latest add sidebar-07` |

All other pages built from individual shadcn components. No custom UI library — shadcn only.

### 4.3 Real-time Updates

Supabase Realtime websocket subscriptions on:
- `messages` — conversation thread updates live
- `reservations` — payment confirmation updates live
- `orders` — order status updates live
- `escalations` — new escalations appear live

### 4.4 Sandbox — Multiple Test Conversations

The `/sandbox` page supports multiple simultaneous test conversations via tabs:
- Each tab is an independent `conversation_id` with its own channel history
- All conversations use `channel = 'sandbox'`
- Debug panel is per-tab
- Useful for testing: one tab for Spanish booking flow, another for English, another for room service

---

## 5. Database Schema

All schema changes via `supabase/migrations/` numbered files. Never edit via Supabase UI.

### Key Tables

```sql
hotels          -- hotel_id, slug, name, config (includes Cloudbeds tokens)
users           -- extends auth.users, role, push_subscription
guests          -- channel (whatsapp|instagram|messenger|sandbox), channel_user_id
conversations   -- status, language, booking_session_id, assigned_to
messages        -- role (user|assistant|system), channel_message_id
reservations    -- full booking data, Cloudbeds IDs, payment status, amounts
orders          -- room service: items (jsonb), status
tasks           -- type, description, status, assigned_to
escalations     -- type, claimed_by, claimed_at, resolved_at
knowledge_base  -- content, embedding (vector 1536), category
```

RLS on every table. Pattern:
```sql
alter table [table] enable row level security;
create policy "hotel_isolation" on [table]
  for all using (hotel_id = (select hotel_id from users where id = auth.uid()));
```

Agent uses Supabase service role key (bypasses RLS).
Dashboard uses Supabase anon key (must pass RLS).

---

## 6. Environment Strategy

| Resource | Production | Test/Staging |
|---|---|---|
| GitHub Branch | `main` | `develop` |
| Railway Service | `agent-production` | `agent-test` |
| Supabase Project | `casamadi-prod` | `casamadi-test` |
| Vercel | Production URL | Preview URL |
| Upstash Redis | Prod DB | Test DB |
| Meta Webhooks | Prod callback URL | Test callback URL |
| Cloudbeds | Live property | Sandbox property |
| Resend | Production domain | Test/sandbox mode |

**Zero shared resources between environments.**

---

## 7. Email Architecture (Resend)

Resend handles two types of emails:

1. **Magic link auth emails** — Supabase Auth configured to use Resend SMTP for delivering magic links to staff
2. **Guest booking confirmation emails** — Agent sends via Resend after payment confirmed, as backup to WhatsApp confirmation

All email templates live in `apps/agent/src/services/resend.ts`.

---

## 8. Push Notification Architecture

| Event | Notified Roles |
|---|---|
| New reservation payment_pending | front_desk + manager |
| Reservation confirmed (payment received) | front_desk + manager |
| New escalation: complaint | manager |
| New escalation: room service issue | room_service + manager |
| New escalation: maintenance | housekeeping + manager |
| New escalation: booking question | front_desk + manager |
| New order placed | room_service |
| Order overdue (> 10 min pending) | room_service + manager |
| Guest message while human_active | assigned staff only |

Fallback: if no matching-role user has push enabled → notify all managers.

Push subscriptions stored in `users.push_subscription`. Sent server-side from agent using `web-push` npm package with VAPID keys.