# Casamadi — Development Epics

**Version:** 1.0.0
**Last Updated:** March 2026

---

## Overview

Development is organized into 6 epics. Complete each epic fully before starting the next. Every epic has user stories in `USER_STORIES.md` with explicit acceptance criteria.

---

## Epic 0 — Infrastructure Foundation
**Goal:** Both environments live, all foundations installed manually, agent running.

**Scope:**
- Monorepo with pnpm workspaces + Turborepo
- Next.js 14 dashboard with shadcn/ui installed (all components + blocks)
- Fastify agent with `/health` endpoint running
- GitHub repo with `main` + `develop` branches
- CI/CD pipelines (GitHub Actions → Railway + Vercel)
- Database schema via Supabase migrations
- All packages: `shared`, `db`
- Hotel config file: `config/hotels/hotel-bernal.ts`
- All environment variables documented in `.env.example`

**Done when:**
- `GET /health` returns 200 on both Railway URLs
- Both Vercel URLs load without errors
- TypeScript compiles with zero errors across all packages
- `pnpm install` runs cleanly

**Status:** In Progress

---

## Epic 1 — Agent Core + Cloudbeds Auth
**Goal:** Agent receives messages, replies bilingually, authenticates with Cloudbeds.

**Scope:**
- Meta webhook receiver (GET verify + POST receive)
- HMAC-SHA256 signature verification
- Redis message deduplication
- Supabase guest + conversation upsert
- Basic AI reply via OipenRouter (no tools yet)
- Bilingual logic: Spanish first, English on demand
- Cloudbeds OAuth token management
- Token refresh + persistence to Supabase
- Test endpoint to verify Cloudbeds connection

**Done when:**
- Guest can send WhatsApp message → receives bilingual AI reply within 8s
- `GET /test/cloudbeds-auth` returns hotel name from Cloudbeds
- Duplicate webhooks silently ignored

---

## Epic 2 — Booking Flow (Critical)
**Goal:** Full autonomous booking + payment flow end-to-end.

**Scope:**
- `check_availability` tool → Cloudbeds API
- `get_room_details` tool
- Booking conversation state machine
- Guest info collection (name, email, guests, dates)
- `create_reservation` tool → Cloudbeds
- `generate_payment_link` tool → Cloudbeds Payments
- Cloudbeds payment webhook handler
- `verify_payment` + `confirm_reservation` tools
- Resend email: booking confirmation to guest
- Payment follow-up job (Redis delayed queue, 35 min)
- Payment link expiry handling

**Done when:**
- Guest can go from "¿tienen disponibilidad?" to receiving WhatsApp booking confirmation — fully automated, end-to-end, in test environment

---

## Epic 3 — Secondary Agent Tools
**Goal:** Room service, tasks, escalations, RAG knowledge base.

**Scope:**
- `get_menu` tool
- `place_order` tool → room service orders
- `create_task` tool → housekeeping/maintenance
- `get_hotel_info` tool → pgvector RAG search
- `escalate_to_human` tool → role-based escalation
- Push notifications to staff for all events
- Knowledge base seeded for Hotel Bernal

**Done when:**
- Guest can order room service via chat → staff receives push
- Guest can report maintenance issue → housekeeping receives push
- Escalation creates record, sets conversation to human_active, notifies correct role

---

## Epic 4 — Dashboard Core
**Goal:** Staff can log in, see conversations, manage reservations in real time.

**Scope:**
- Login page (magic link via Resend)
- Role-based sidebar (sidebar-07 block)
- Role-based route protection (middleware.ts)
- Conversation list with real-time updates
- Conversation thread with message bubbles
- Booking panel in conversation (shows reservation context)
- Conversation takeover + return to AI
- Reservations board with real-time payment status
- Push notification subscription flow
- Bottom tab bar for mobile

**Done when:**
- Staff can log in, see all conversations, take over one, reply to guest, return to AI
- Payment confirmation updates reservation row in real time without refresh

---

## Epic 5 — Dashboard Full Features
**Goal:** Orders, tasks, escalations, sandbox all working.

**Scope:**
- Orders Kanban board with real-time updates
- Tasks list with status management
- Escalation queue with SLA timers and claim system
- Sandbox testing interface (multi-tab, debug panel, simulate payment)
- Push notifications working on iPhone and Android

**Done when:**
- Room service staff can manage orders on their phone with one-tap updates
- Admin can test full booking flow in sandbox without WhatsApp

---

## Epic 6 — PWA & Launch
**Goal:** Installable on iPhone and Android, production go-live.

**Scope:**
- `public/manifest.json` PWA manifest
- Service worker (next-pwa)
- iOS meta tags (apple-mobile-web-app-capable)
- Push notifications working on home screen installed app
- Lighthouse PWA score ≥ 90
- Performance score ≥ 80 (mobile)
- Accessibility score ≥ 90
- QA on real iPhone and real Android device
- Production environment fully configured
- Hotel Bernal go-live

**Done when:**
- Staff at Hotel Bernal can install app on their phones and use it for real guests
- Real guest books a room via WhatsApp → confirmed without staff involvement