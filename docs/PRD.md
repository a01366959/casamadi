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

### 4.4 Staff Dashboard (PWA)

**Two Sections:** Platform (all staff, role-gated) + Admin (admins only)

**Platform Pages (All Staff):**
- `/dashboard` — Home with live KPIs: open requests, top items, completion rates, avg times
- `/conversaciones` — All guest conversations with takeover/manual control
  - Status: active, escalated, takeover (with duration), closed
  - Tags: Lead, Huésped, Evento (mutually exclusive, auto-assigned by agent)
  - Staff can take over for 1h / 1d / 1w / 1m / Always
  - View booking context + guest profile + full message history
- `/pedidos` — Room service orders
  - Status: pending, assigned, preparing, delivered, rejected
  - Assign to staff, reject (if kitchen closed or item unavailable), mark delivered
  - Auto-message guest when rejected with alternatives
  - Track avg delivery time
- `/tareas` — Housekeeping & concierge tasks
  - Status: pending, assigned, completed, rejected
  - Assign to staff, reject (if can't fulfill), mark done
  - Auto-inventory deduction when delivered, restoration when returned
  - Track completion rate & average time
- `/menu` — View active menu items grouped by time window (Desayuno, Comida/Cena, 24/7)
  - Staff can toggle items on/off (Recepción/Admin) — all items auto-reset Monday 00:00
  - Real-time availability based on current time
  - Admin can add new items
- `/inventario` — Track physical items (towels, blankets, etc.)
  - Show total, available, busy qty per item and room
  - Staff can mark busy (delivered) or returned
  - Auto-deduction when tarea created, restoration on checkout task completion
  - Reorder alerts when below threshold
  - Admin can add new items
- `/cuartos` — Per-room view from Cloudbeds sync
  - Guest info, reservation dates, status, payment status
  - Open pedidos and tareas linked to room
  - Borrowed items (inventory currently in room)
  - Outstanding room service charges (deudas) — can collect individually or at checkout
  - Timeline of all room events

**Admin Pages:**
- `/admin/usuarios` — CRUD users: create, edit role, delete (soft), reset password
- `/admin/menu` — Full menu management: add items, edit, delete, set kitchen hours
- `/admin/inventario` — Full inventory management: add items, edit, delete, adjust stock

**Public (No Auth):**
- `GET /menu/:hotelId` — Public menu view (real-time availability, no ordering)

**PWA Requirements:**
- Installable on iPhone (iOS 16.4+) and Android
- Push notifications for new pedidos, tareas, escalations, inventory alerts
- Works offline for viewing cached data
- Lighthouse PWA score ≥ 90

**Role-Based Access:**
| Feature | Admin | Recepción | General |
|---------|-------|-----------|---------|
| View all pages | ✅ | ✅ | ✅ |
| Create/modify pedidos, tareas, menu, inventario | ✅ | ✅ | ❌ |
| Mark tasks/orders done | ✅ | ✅ | ✅ |
| Manage users | ✅ | ❌ | ❌ |
| Manage menu/inventory items | ✅ | ❌ | ❌ |
| Access `/sandbox` | ✅ | ❌ | ❌ |

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

| Role | Pages | Permissions |
|---|---|---|
| `admin` | All platform + all admin + `/sandbox` | Full CRUD on all |
| `recepción` | All platform except admin | Create/modify/reject pedidos & tareas, manage inventory busy/returned, toggle menu/inventory items |
| `general` | All platform except admin | View only + mark tasks/orders done + inventory busy/returned |

### Auto-Escalation Routing (Agent Decision)

When agent detects high sentiment, out-of-scope request, or repeated issues:
- Escalate conversation
- Notify: All Recepción + Admin staff
- Push notification: "Escalation: Guest [name] in room [X]"
- Staff can view reason + take over manually

---

## 6. Menu & Inventory Mechanics

**Menu:**
- Three time windows: Desayuno (e.g., 6am-11am), Comida/Cena (e.g., 11am-10pm), 24/7
- Agent checks current time, only offers items in active window
- Guest requests breakfast at 11:30am → "Breakfast ended at 11am, try lunch or 24/7 options"
- Item can be toggled off by Recepción/Admin — agent rejects, suggests alternatives
- **Every Monday 00:00:** All items auto-reactivate
- Items can be marked unavailable (e.g., "out of pizza dough") — restoration is manual or on Monday reset
- **Public menu link** (`/menu/:hotelId`) shows real-time availability, no ordering

**Inventory:**
- Items: extra towels, blankets, pillows, etc. (staff-managed consumables)
- When agent detects guest request: create tarea → auto-subtract from available qty, mark as busy
- When staff delivers: mark qty as busy + room # + timestamp
- When checkout detected: auto-create tarea "Return borrowed items from room 301"
- When return task marked done: qty restored to available
- **Reorder threshold:** If available < threshold → Admin gets alert

---

## 7. Financial Tracking (Deudas)

- Pedidos create charges that appear in room's outstanding balance
- Collected individually (per order) or at checkout (per stay)
- Staff can mark as "collected" in cuartos view
- Cloudbeds tracks final settlement at checkout

---

## 8. Bilingual Rules

1. First reply always in Spanish regardless of guest's language
2. First reply naturally mentions English is available
3. Guest writes in English at any point → permanent switch to English for that conversation
4. Language stored in `conversations.language`
5. Prices always shown as `$2,400 MXN` (+ `~$120 USD` for English guests if configured)

---

## 9. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Webhook acknowledgment (Meta + Cloudbeds) | < 200ms |
| Cloudbeds availability check | < 3s |
| Full booking flow end-to-end | < 12s |
| Payment webhook → guest confirmation | < 5s |
| Dashboard load on mobile 4G | < 2.5s |
| Agent uptime | 99.5% monthly |
| Lighthouse PWA score | ≥ 90 |
| Lighthouse Performance | ≥ 80 (mobile) |
| TypeScript errors | Zero (strict mode) |

---

## 10. Out of Scope (v1)

- Dark mode
- Native iOS / Android apps
- Payment processing beyond Cloudbeds Payments
- SMS channel
- Reservation modification or cancellation by agent
- Guest-facing web portal (other than public menu + chat)
- Analytics / reporting beyond dashboard home KPIs
- Multi-language dashboard UI (Spanish only)
- Any PMS other than Cloudbeds
- Conversation deletion (keep 7+ years for audit trail)