# Casamadi — System Modules

**Version:** 1.0.0
**Last Updated:** March 2026

---

## Module Map

```
casamadi/
├── apps/agents/         → AI Agent Backend
├── apps/web/            → Staff Dashboard PWA
├── packages/shared/     → Shared Types
├── packages/db/         → Database Client
└── config/hotels/       → Hotel Configuration
```

---

## Module 1: AI Agent Backend (`apps/agents`)

**Responsibility:** Receive guest messages, process through AI, reply. Handle Cloudbeds booking and payment flows. Send push notifications to staff.

### Sub-modules

#### 1.1 Webhook Receiver (`routes/webhook.ts`)
- GET `/webhook/:hotelId` — Meta webhook verification (hub challenge)
- POST `/webhook/:hotelId` — Receive guest messages from WhatsApp/Instagram/Messenger
- Verifies Meta HMAC-SHA256 signature
- Returns HTTP 200 immediately
- Enqueues job to Redis for async processing

#### 1.2 Cloudbeds Webhook Receiver (`routes/webhookCloudbeds.ts`)
- POST `/webhooks/cloudbeds` — Receive payment and reservation events
- Verifies Cloudbeds signature
- Handles: `payment.completed`, `reservation.cancelled`, `reservation.modified`
- Triggers payment confirmation flow

#### 1.3 Sandbox Routes (`routes/sandbox.ts`)
- POST `/api/sandbox/chat` — Test chat endpoint (requires `x-sandbox-key` header)
- POST `/api/sandbox/simulate-payment` — Fires real payment webhook handler for testing
- Only accessible with valid sandbox secret

#### 1.4 Agent Runner (`agent/runner.ts`)
- Main agent loop: history → system prompt → OpenRouter → tools → reply
- Accepts optional `DebugCollector` (sandbox only — null in production)
- Handles conversation state machine transitions
- Selects model (FAST or TOOL) based on conversation state

#### 1.5 Booking Session Manager (`agent/bookingSession.ts`)
- Tracks booking flow state per conversation
- States: `pending_info` → `availability_shown` → `payment_pending` → `confirmed`
- Persists state to `reservations` table

#### 1.6 Language Detector (`agent/languageDetector.ts`)
- Per-turn detection of guest language
- Stores in `conversations.language`
- Once switched to English, stays English for session

#### 1.7 Debug Collector (`agent/debugCollector.ts`)
- Captures tool calls, Cloudbeds calls, state changes, DB writes
- Only instantiated for sandbox requests
- Null for all production traffic — zero overhead

#### 1.8 Tools (`agent/tools/`)
- 11 tools: see ARCHITECTURE.md Section 3.5
- Each tool: `definition` (OpenRouter schema) + `execute(input, ctx)` function
- All Cloudbeds tools accept optional DebugCollector

#### 1.9 Cloudbeds Client (`services/cloudbeds.ts`)
- OAuth 2.0 token management
- Auto-refresh on 401, persist to Supabase
- Methods: getAvailableRoomTypes, createReservation, generatePaymentLink, getReservation, confirmReservation
- Error handling: 401 → refresh, 422 → unavailable, 429 → retry, timeout → escalate

#### 1.10 Meta Client (`services/meta.ts`)
- Send messages via Meta Cloud API
- Supports: text, image, template messages
- Handles WhatsApp 24h window enforcement

#### 1.11 OpenRouter Client (`services/openrouter.ts`)
- Model routing: FAST (gemini-flash) vs TOOL (claude-haiku)
- Booking flow always uses TOOL model
- Handles tool call parsing and execution loop

#### 1.12 Redis Client (`services/redis.ts`)
- Upstash Redis via REST API
- Message deduplication (SET NX with 24h TTL)
- Job queue for async processing
- Delayed jobs for payment follow-up (35 min)

#### 1.13 Push Sender (`services/push.ts`)
- Web Push API with VAPID keys
- Role-based routing: finds users with matching role + push enabled
- Fallback to all managers if no matching role found

#### 1.14 Resend Client (`services/resend.ts`)
- Sends booking confirmation emails to guests
- Sends magic link auth emails (via Supabase SMTP config)

---

## Module 2: Staff Dashboard (`apps/web`)

**Responsibility:** Staff UI for managing all hotel operations. Mobile-first PWA.

### Sub-modules

#### 2.1 Authentication
- Magic link via Supabase Auth + Resend SMTP
- Session management via Supabase SSR
- Role stored in `users.role`, available throughout app
- `middleware.ts` protects all routes based on role

#### 2.2 Layout Shell
- `AppSidebar` (sidebar-07 block) — role-filtered navigation
- `BottomNav` — mobile tab bar, role-filtered
- `SiteHeader` — breadcrumb + user menu

#### 2.3 Conversations Module
- List: DataTable with channel/status/language filters, real-time
- Thread: ScrollArea with message bubbles, auto-scroll, real-time
- `BookingPanel`: shows active reservation context in conversation sidebar
- `TakeoverBar`: take over / return to AI controls
- `ReplyBox`: staff reply input, only visible when `human_active`

#### 2.4 Reservations Module
- DataTable with status badges, real-time payment updates
- Status colors: `payment_pending` amber, `confirmed` green, `cancelled` red
- Row actions: view conversation, send new payment link, manual confirm, cancel, open in Cloudbeds
- `BarChart`: reservations per day, last 14 days

#### 2.5 Orders Module
- Kanban columns: Pending → Confirmed → In Preparation → Delivered / Cancelled
- shadcn `Card` per order, `Sheet` (bottom) for status update on mobile
- Overdue badge if pending > 10 minutes
- Real-time via Supabase Realtime

#### 2.6 Tasks Module
- DataTable sorted oldest first
- Filter by type (maintenance/housekeeping/other) and status
- `DropdownMenu` row actions for status update
- "Show completed" toggle

#### 2.7 Escalations Module
- DataTable sorted oldest first (most urgent first)
- `Progress` SLA timer per row: green (0–5 min) → yellow (5–15) → red (> 15 min)
- Claim system: one staff member claims per escalation
- Links to conversation thread

#### 2.8 Sandbox Module (Admin Only)
- Multi-tab interface: multiple simultaneous test conversations
- Each tab: independent conversation_id, own message history, own debug log
- `SandboxChat`: plain chat window, typing indicator, timestamps
- `SandboxDebugPanel`: live log with collapsible JSON entries
- `SandboxToolbar`: new conversation, room number, language, simulate payment
- `SandboxHistory`: past sandbox sessions from Supabase

#### 2.9 Dashboard Home
- `dashboard-01` block as base
- Section cards: reservations today, pending payments, active conversations, revenue today
- `RevenueAreaChart`: 14-day revenue + reservations trend
- `MessageVolumeChart`: 7-day messages by channel
- `ConversionRadialChart`: booking conversion rate
- `RevenueByRoomChart`: revenue split by room type

#### 2.10 PWA Module
- `public/manifest.json`: standalone display, hotel icons
- Service worker via next-pwa
- iOS meta tags for home screen install
- Push subscription flow on first login

---

## Module 3: Shared Types (`packages/shared`)

**Responsibility:** Single source of truth for all TypeScript types used across agent and dashboard.

### Exported Types

```typescript
// Enums
StaffRole         // 'admin' | 'manager' | 'front_desk' | 'room_service' | 'housekeeping'
ConversationStatus // 'active' | 'human_active' | 'closed'
ReservationStatus  // 'pending_info' | 'availability_shown' | 'payment_pending' | 'confirmed' | 'cancelled' | 'payment_expired'
MessageSource     // 'whatsapp' | 'instagram' | 'messenger' | 'sandbox'
EscalationType    // 'complaint' | 'room_service_issue' | 'maintenance' | 'booking' | 'ai_low_confidence' | 'guest_request' | 'cloudbeds_failure'
OrderStatus       // 'pending' | 'confirmed' | 'in_preparation' | 'delivered' | 'cancelled'
TaskType          // 'maintenance' | 'housekeeping' | 'concierge' | 'other'
TaskStatus        // 'pending' | 'in_progress' | 'done'

// Database models
Hotel, User, Guest, Conversation, Message
Reservation, BookingSession
Order, Task, Escalation
KnowledgeBaseEntry

// Cloudbeds types
CloudbedsRoomType, CloudbedsReservation, CloudbedsPaymentLink

// Debug types (sandbox only)
DebugEntry, DebugEntryType

// Config types
HotelConfig, HotelPersona, HotelBookingConfig, EscalationRouting
```

---

## Module 4: Database Client (`packages/db`)

**Responsibility:** Supabase client factory and typed query helpers for all tables.

### Exports

```typescript
createSupabaseClient(url: string, key: string): SupabaseClient
createSupabaseServerClient(): SupabaseClient  // For Next.js server components

// Typed query helpers (all hotel-scoped)
getConversation(id: string): Promise<Conversation>
upsertGuest(data: UpsertGuestData): Promise<Guest>
createReservation(data: CreateReservationData): Promise<Reservation>
updateReservation(id: string, data: Partial<Reservation>): Promise<Reservation>
getActiveBookingSession(conversationId: string): Promise<Reservation | null>
createOrder(data: CreateOrderData): Promise<Order>
createTask(data: CreateTaskData): Promise<Task>
createEscalation(data: CreateEscalationData): Promise<Escalation>
getUsersWithPushByRole(hotelId: string, roles: StaffRole[]): Promise<User[]>
searchKnowledgeBase(hotelId: string, embedding: number[]): Promise<KnowledgeBaseEntry[]>
```

---

## Module 5: Hotel Configuration (`config/hotels/`)

**Responsibility:** Single file per hotel containing all AI behavior configuration. Version-controlled. Changed via PR, never via UI.

### `hotel-bernal.ts` Structure

```typescript
export const hotelConfig: HotelConfig = {
  id: string                          // Unique hotel identifier
  name: string                        // Display name
  cloudbedsPropertyId: string         // From env var

  persona: {
    name: string                      // Agent's name (e.g. "Sofía")
    language: { default, supported, switchPrompt }
    tone: string
    personality: string               // Full system prompt personality block
  }

  booking: {
    depositPercent: number            // e.g. 50 = 50% deposit option
    paymentLinkExpiryMinutes: number  // e.g. 30
    followUpDelayMinutes: number      // e.g. 35
    currency: string                  // 'MXN'
    showUsdReference: boolean
    requiredGuestFields: string[]
  }

  instructions: {
    canDo: string[]                   // What agent can help with
    cannotDo: string[]                // What agent redirects
    escalationKeywords: string[]      // Trigger words for human escalation
  }

  hours: {
    frontDesk: { open, close, timezone }
    roomService: { open, close, timezone }
  }

  menu: MenuItem[]                    // Room service menu
  
  escalationRouting: {
    complaint: StaffRole[]
    roomServiceIssue: StaffRole[]
    maintenanceRequest: StaffRole[]
    bookingQuestion: StaffRole[]
    aiLowConfidence: StaffRole[]
    guestRequest: StaffRole[]
    cloudbedsFailure: StaffRole[]
  }
}
```