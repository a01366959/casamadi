# Casamadi — Product Requirements Document

**Version:** 1.0.0
**Last Updated:** March 2026
**Status:** Approved for Development

---

## 1. Product Summary

Casamadi is a hotel AI concierge and staff operations platform for boutique hotels. It has two parts:

1. **AI Concierge Agent** — A single intelligent agent that handles guest conversations 24/7 across WhatsApp, Instagram DMs, and Facebook Messenger. Its primary commercial purpose is converting guest inquiries into confirmed, paid reservations via Cloudbeds. Secondarily: room service orders, housekeeping requests, and general hotel information. Fully bilingual (Spanish default, English on demand).

2. **Staff Dashboard (PWA)** — A mobile-first web app installable on iPhone and Android. Staff monitor conversations, manage reservations, handle escalations, manage orders and tasks, and test the agent — all in real time.

---

## 2. Primary Goal

> Convert a guest WhatsApp message into a confirmed, paid Cloudbeds reservation — fully automatically, 24/7, without any staff involvement.

Everything else is secondary to this.

---

## 3. Users

| User Type | Description | Primary Device |
|---|---|---|
| Hotel Guest | Sends messages via WhatsApp, Instagram, Messenger | Their phone |
| Front Desk Staff | Monitors conversations, handles escalations | Desktop + phone |
| Room Service Staff | Manages food orders | Phone |
| Housekeeping Staff | Manages tasks and maintenance | Phone |
| Manager | Oversees all operations | Both |
| Admin / Developer | Full access + sandbox testing | Both |

---

## 4. Core Features

### 4.1 AI Agent (One Agent, Three Channels)

One Fastify backend agent receives messages from all three Meta channels. The channel source is tracked but the agent logic is identical regardless of channel.

**Channels:**
- WhatsApp Business API
- Instagram Direct Messages
- Facebook Messenger

**Agent Capabilities:**
- Check room availability (Cloudbeds API)
- Show room types, rates, descriptions
- Collect guest info (name, email, number of guests, dates)
- Create reservation in Cloudbeds
- Generate and send payment link (Cloudbeds Payments)
- Confirm reservation after payment webhook
- Take room service orders
- Create housekeeping / maintenance tasks
- Answer hotel questions (RAG over knowledge base)
- Escalate to correct staff role when needed
- Operate 24/7 in Spanish and English

**Agent Cannot Do (v1):**
- Modify or cancel reservations
- Process refunds
- Initiate conversations (WhatsApp 24h rule)
- Handle multiple bookings in one conversation simultaneously
- Integrate with any PMS other than Cloudbeds

### 4.2 Booking Flow (Critical Path)

```
Guest asks about availability
  → Agent collects: check-in, check-out, number of guests
  → Agent calls Cloudbeds API: getAvailableRoomTypes
  → Agent presents options with prices
  → Guest selects room
  → Agent collects: full name, email
  → Agent shows booking summary
  → Guest confirms
  → Agent creates reservation in Cloudbeds (pending)
  → Agent generates payment link (full or deposit)
  → Guest pays on Cloudbeds hosted page
  → Cloudbeds webhook fires → agent verifies → confirms reservation
  → Agent sends confirmation message to guest
  → Push notification to Front Desk + Manager
```

### 4.3 Payment Options

- **Full payment** — guest pays total amount upfront
- **Deposit** — guest pays configurable % (e.g. 50%), rest on arrival
- Currency: MXN primary, optional USD reference for international guests
- Provider: Cloudbeds Payments (hosted links)
- Payment link valid: 30 minutes
- Follow-up if not paid: 35 minutes after link sent

### 4.4 Staff Dashboard

**Pages:**
- `/` — Home with live stats and charts
- `/conversations` — All guest conversations across channels
- `/conversations/[id]` — Thread view with booking context panel
- `/reservations` — Reservations board with payment status
- `/orders` — Room service orders Kanban
- `/tasks` — Housekeeping and maintenance tasks
- `/escalations` — Escalation queue with claim system
- `/sandbox` — Agent testing interface (admin only)
- `/settings` — Hotel config and user management (admin only)

**PWA Requirements:**
- Installable on iPhone (iOS 16.4+) and Android
- Push notifications for escalations, orders, payments
- Works offline for viewing cached data
- Lighthouse PWA score ≥ 90

### 4.5 Sandbox Testing Interface

Admin-only page at `/sandbox`. Allows developers to test the full agent without needing a real WhatsApp number or Meta approval.

**Features:**
- Multiple simultaneous test conversations (tabs or panels)
- Plain chat window — no channel styling
- Real agent: hits actual Fastify server, Cloudbeds sandbox, real Redis, real Supabase
- Debug panel (toggleable): shows tool calls, Cloudbeds API calls, conversation state, DB messages
- Controls: new conversation, set room number, force language (ES/EN)
- "Simulate Payment" button — fires real Cloudbeds webhook handler
- Conversation history — all past sandbox sessions saved and viewable
- Only accessible to `admin` role in all environments

---

## 5. Roles & Permissions

| Role | Access |
|---|---|
| `admin` | Everything including `/sandbox` and `/settings` |
| `manager` | Conversations, Reservations, Orders, Tasks, Escalations |
| `front_desk` | Conversations, Reservations, Escalations |
| `room_service` | Orders only |
| `housekeeping` | Tasks only |

### Escalation Routing

| Type | Notified Roles | Fallback |
|---|---|---|
| Complaint / upset guest | manager | All managers |
| Room service issue | room_service + manager | All managers |
| Maintenance request | housekeeping + manager | All managers |
| Booking / modification | front_desk + manager | All managers |
| AI low confidence | front_desk + manager | All managers |
| Guest requests human | front_desk + manager | All managers |
| Cloudbeds API failure | front_desk + manager | All managers |

---

## 6. Bilingual Rules

1. First reply always in Spanish regardless of guest's language
2. First reply naturally mentions English is available
3. Guest writes in English at any point → permanent switch to English for that conversation
4. Language stored in `conversations.language`
5. Prices always shown as `$2,400 MXN` (+ `~$120 USD` for English guests if configured)

---

## 7. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Webhook acknowledgment (Meta + Cloudbeds) | < 200ms |
| Cloudbeds availability check | < 3s |
| Full booking flow end-to-end | < 12s |
| Payment webhook → guest confirmation | < 5s |
| Dashboard load on mobile 4G | < 2.5s |
| Agent uptime | 99.5% monthly |
| Lighthouse PWA score | ≥ 90 |
| TypeScript errors | Zero (strict mode) |

---

## 8. Out of Scope (v1)

- Dark mode
- Native iOS / Android apps
- Payment processing beyond Cloudbeds Payments
- SMS channel
- Reservation modification or cancellation by agent
- Guest-facing web portal
- Analytics / reporting beyond dashboard home charts
- Multi-language dashboard UI (Spanish only)
- Any PMS other than Cloudbeds