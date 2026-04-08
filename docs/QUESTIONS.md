# Casamadi — Open Questions & Decisions

**Version:** 1.0.0
**Last Updated:** March 2026
**Status:** Active

---

## How to Use

- Each question blocks something specific
- Status: `open` | `decided` | `implemented`
- When decided: move to Decided section, update relevant doc, note where implemented

---

## Section 1: Open Questions

### Q1: Cloudbeds Sandbox Availability

**Question:** Does Hotel Bernal have access to a Cloudbeds sandbox/test environment, or must all testing use the live property?

**Blocks:** Epic 1 + Epic 2 — cannot test booking flow without Cloudbeds access

**Options:**
- A) Cloudbeds provides a sandbox — use it for test environment
- B) No sandbox — use live property with test reservations (cancel immediately after)
- C) Mock Cloudbeds responses in test environment

**Owner:** Pablo (Cloudbeds account)
**Status:** `open`

---

### Q2: Deposit Amount — Fixed or Per Room Type?

**Question:** Is the deposit percentage (currently configured as 50%) the same for all room types, or does it vary?

**Blocks:** `generate_payment_link` tool, booking summary message

**Options:**
- A) Fixed 50% for all rooms
- B) Varies per room type (e.g. suite = 30%, standard = 50%)
- C) Varies by season or date range

**Owner:** Hotel Bernal management
**Status:** `open`

---

### Q3: Payment Link Expiry — What Happens After?

**Question:** If a guest doesn't pay within 30 minutes, does the reservation get automatically released in Cloudbeds, or does it stay as pending indefinitely?

**Blocks:** Payment expiry handling, reservation cleanup job

**Options:**
- A) Cloudbeds auto-releases after configured time — reservation deleted
- B) Reservation stays pending in Cloudbeds — agent marks local status as `payment_expired`
- C) Staff manually release via dashboard

**Owner:** Cloudbeds account settings + hotel management
**Status:** `open`

---

### Q4: Room Service Hours Enforcement

**Question:** If a guest orders room service outside service hours (currently 07:00–22:00), what should the agent do?

**Blocks:** `place_order` tool behavior, system prompt rules

**Options:**
- A) Decline politely, tell guest service hours
- B) Accept the order, flag it to staff as out-of-hours
- C) Accept and schedule for when service opens

**Owner:** Hotel Bernal management
**Status:** `open`

---

### Q5: Agent Persona Name

**Question:** The current config uses "Sofía" as the agent's name. Is this confirmed, or should it be something else for Hotel Bernal?

**Blocks:** `config/hotels/hotel-bernal.ts` persona section, all guest-facing messages

**Owner:** Hotel Bernal / Pablo
**Status:** `open`

---

### Q6: Guest Email — Required or Optional for Booking?

**Question:** Is email required for all bookings? Some guests may not want to provide it.

**Blocks:** `create_reservation` tool, Cloudbeds reservation creation (Cloudbeds may require email)

**Options:**
- A) Email required — Cloudbeds requires it for reservation
- B) Email optional — use a placeholder if not provided
- C) Email required but agent can collect it post-payment

**Owner:** Cloudbeds API documentation + hotel management
**Status:** `open`

---

### Q7: Cancellation Policy — What Does the Agent Say?

**Question:** When a guest asks about cancellation or wants to cancel, the agent escalates to front desk. What should the agent say to the guest while escalating?

**Blocks:** `escalate_to_human` tool response for cancellation requests, system prompt `cannotDo` messaging

**Details needed:**
- Is there a standard cancellation policy (e.g. 48h free cancellation)?
- What refund policy should the agent communicate?

**Owner:** Hotel Bernal management
**Status:** `open`

---

### Q8: Multiple Rooms in One Booking

**Question:** Can a guest book multiple room types in a single conversation (e.g. 2 rooms for a group)?

**Blocks:** Booking flow state machine complexity, `create_reservation` tool

**Options:**
- A) One room per booking only — agent explains this limitation
- B) Multiple rooms supported — agent creates separate reservations per room
- C) Multiple rooms in one Cloudbeds reservation (if API supports)

**Owner:** Cloudbeds API capability + hotel management
**Status:** `open`

---

### Q9: Instagram and Messenger Go-Live Timeline

**Question:** Is Hotel Bernal active on Instagram DMs and Facebook Messenger for guest communication? Or is WhatsApp the only channel for go-live?

**Blocks:** Meta webhook configuration, channel testing scope

**Options:**
- A) All three channels at go-live (WhatsApp + Instagram + Messenger)
- B) WhatsApp only at go-live, others added later
- C) WhatsApp + Instagram at go-live, Messenger later

**Owner:** Hotel Bernal management
**Status:** `open`

---

### Q10: Resend Domain

**Question:** What domain should Resend send emails from? (e.g. `noreply@hotelbernal.com`)

**Blocks:** Resend setup, DNS configuration, email template from-address

**Details needed:**
- Hotel's domain name
- Access to DNS settings to add Resend verification records

**Owner:** Pablo (domain access)
**Status:** `open`

---

## Section 2: Technical Decisions Made

### TD1: Vector Database — pgvector (Supabase)
**Decision:** Use pgvector extension in Supabase instead of Pinecone.
**Reason:** Simpler stack, already in Supabase, sufficient for hotel knowledge base size.
**Implemented in:** `supabase/migrations/001_initial_schema.sql` (pgvector extension), `agent/tools/getHotelInfo.ts`

### TD2: Error Tracking — Railway Logs (v1)
**Decision:** Use Railway built-in logs for v1, upgrade to Sentry in v2.
**Reason:** Keeps stack simple for initial launch. Hotel Bernal is one property — Railway logs are sufficient.
**Implemented in:** `apps/agents/src/index.ts` (pino logger to stdout → Railway captures)

### TD3: Email Provider — Resend
**Decision:** Use Resend for both magic link auth emails and guest booking confirmations.
**Reason:** Simple API, great deliverability, developer-friendly.
**Implemented in:** `apps/agents/src/services/resend.ts`, Supabase Auth SMTP configuration

### TD4: One Agent, Three Channels
**Decision:** Single Fastify agent handles all three Meta channels.
**Reason:** Channel is metadata — the AI logic is identical. Simpler to maintain one agent.
**Implemented in:** `apps/agents/src/routes/webhook.ts` (channel extracted from payload, stored in conversation)

### TD5: Sandbox in Dashboard (Not Separate App)
**Decision:** Sandbox testing interface lives at `/sandbox` inside the dashboard app, admin-only.
**Reason:** Staff and developers use the same app. No separate deploy needed.
**Implemented in:** `apps/web/src/app/(dashboard)/sandbox/`