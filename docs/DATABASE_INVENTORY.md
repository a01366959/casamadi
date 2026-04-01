# Casamadi — Complete Database Inventory

**Version:** 1.0.0  
**Last Updated:** April 2026  
**Status:** Finalized (No Cloudbeds Duplication)

---

## Overview

**Databases Used:**
1. **Supabase (Postgres)** — All operational data + Supabase Auth
2. **Upstash Redis** — Message deduplication, job queue, delayed jobs
3. **Cloudbeds API** — Room availability, reservations, payment status (NEVER duplicated)

**Golden Rule:** Cloudbeds is the single source of truth. We fetch live, never cache/duplicate.

---

## 1. Supabase (Postgres) Tables

### 1.1 Authentication & Users

**Table: `auth.users` (Supabase managed)**
- Supabase automatically creates this
- Do NOT modify directly
- One auth user per staff member

**Table: `public.users` (Extended Profile)**
```sql
users
├── id (uuid, pk, fk → auth.users.id)
├── email (varchar, unique, from auth.users)
├── full_name (varchar)
├── first_name (text, nullable)
├── last_name (text, nullable)
├── phone (text, nullable)
├── position (text, nullable)
├── avatar_url (text, nullable)
├── hotel_id (uuid, fk → hotels)
├── role (enum: admin, recepcion, general)
├── status (enum: active, inactive)
├── push_enabled (boolean, default: false)
├── created_at (timestamp)
├── updated_at (timestamp)
└── last_login (timestamp, nullable)
```

---

### 1.2 Hotel Configuration

**Table: `public.hotels`**
```sql
hotels
├── id (uuid, pk)
├── name (varchar)
├── cloudbeds_property_id (varchar, unique)
├── cloudbeds_oauth_token (text, encrypted)
├── cloudbeds_oauth_refresh_token (text, encrypted)
├── cloudbeds_token_expires_at (timestamp)
├── timezone (varchar)
├── language (enum: es, en)
├── created_at (timestamp)
└── updated_at (timestamp)
```

---

### 1.3 Guest Conversations

**Table: `public.conversations`**
```sql
conversations
├── id (uuid, pk)
├── hotel_id (uuid, fk → hotels)
├── guest_phone (varchar)
├── guest_name (varchar, nullable)
├── guest_email (varchar, nullable)
├── channel (enum: whatsapp, instagram, messenger, sandbox)
├── channel_user_id (varchar, from Meta platform)
├── language (enum: es, en)
├── status (enum: active, escalated, takeover, closed)
├── tags (text[], array: ["Lead", "Huésped", "Evento"])
├── booking_session_id (uuid, fk → reservations, nullable)
├── last_message_at (timestamp)
├── created_at (timestamp)
├── updated_at (timestamp)
├── closed_at (timestamp, nullable)
└── current_takeover (jsonb, nullable)
    {
      "taken_by_user_id": "uuid",
      "duration_minutes": 60,  // null = always
      "started_at": "timestamp",
      "expires_at": "timestamp"  // null if always
    }
```

**Table: `public.messages`**
```sql
messages
├── id (uuid, pk)
├── conversation_id (uuid, fk → conversations)
├── role (enum: user, assistant, system)
├── channel_message_id (varchar, nullable)
├── content (text)
├── metadata (jsonb, nullable)
│   {
│     "tool_calls": [...],
│     "debug_output": "...",
│     "api_latency_ms": 1234
│   }
└── created_at (timestamp)
```

---

### 1.4 Booking Flow State (No Reservations Table)

**IMPORTANT:** Booking state is stored in `conversations.booking_state` (jsonb), NOT in a separate `reservations` table.

**Booking State Structure (stored in conversations table):**
```json
{
  "flow_state": "payment_pending",
  "cloudbeds_reservation_id": "abc123",
  "room_selected": {
    "room_type": "Deluxe",
    "rate": 2400,
    "currency": "MXN"
  },
  "guest_info": {
    "name": "John Doe",
    "email": "john@example.com",
    "number_of_guests": 2
  },
  "dates": {
    "check_in": "2026-04-05",
    "check_out": "2026-04-10"
  },
  "payment_details": {
    "total_rate": 2400,
    "deposit_rate": null,
    "payment_link": "https://...",
    "link_sent_at": "timestamp",
    "link_expires_at": "timestamp",
    "payment_verified_at": null,
    "confirmed_at": null
  }
}
```

**Why not a separate table?**
- Booking is part of the conversation flow
- Cloudbeds is authoritative for all reservation data
- We only track: what was selected, payment link, verification status
- No normalization needed — all state fits in one JSON field

**When rendering Reservations board in dashboard:**
- Query conversations with `status = 'closed'` and `booking_state != null`
- Fetch live guest/reservation details from Cloudbeds API (never cache)

---

### 1.5 Room Service Orders (Pedidos)

**Table: `public.pedidos`**
```sql
pedidos
├── id (uuid, pk)
├── hotel_id (uuid, fk → hotels)
├── conversation_id (uuid, fk → conversations)
├── cloudbeds_room_id (varchar, NOT fk, external ID)
├── items (jsonb array)
│   [
│     {
│       "menu_item_id": "uuid",
│       "name": "Orange juice",
│       "qty": 2,
│       "price": 45,
│       "notes": "extra ice"
│     }
│   ]
├── total_amount (decimal)
├── requested_delivery_time (timestamp)
├── status (enum: pending, assigned, preparing, delivered, rejected)
├── assigned_to_user_id (uuid, fk → users, nullable)
├── rejection_reason (text, nullable)
├── delivered_at (timestamp, nullable)
├── created_at (timestamp)
├── updated_at (timestamp)
└── notes (text, nullable)
```

---

### 1.6 Housekeeping & Concierge Tasks (Tareas)

**Table: `public.tareas`**
```sql
tareas
├── id (uuid, pk)
├── hotel_id (uuid, fk → hotels)
├── cloudbeds_room_id (varchar, NOT fk, external ID)
├── conversation_id (uuid, fk → conversations, nullable)
├── task_type (varchar: "extra_towel", "iron", "maintenance", "return_items")
├── description (text)
├── status (enum: pending, assigned, completed, rejected)
├── assigned_to_user_id (uuid, fk → users, nullable)
├── rejection_reason (text, nullable)
├── completed_at (timestamp, nullable)
├── created_by (enum: agent, staff)
├── created_at (timestamp)
├── updated_at (timestamp)
├── notes (text, nullable)
└── inventory_items (jsonb array, if applicable)
    [
      {
        "inventory_item_id": "uuid",
        "name": "Extra towel",
        "qty": 2,
        "status": "busy"  // busy | returned
      }
    ]
```

---

### 1.7 Menu Management

**Table: `public.menu_items`**
```sql
menu_items
├── id (uuid, pk)
├── hotel_id (uuid, fk → hotels)
├── name (varchar)
├── description (text)
├── image_url (varchar, nullable)
├── price_mxn (decimal)
├── price_usd (decimal, nullable)
├── section (enum: desayuno, comida_cena, 24_7)
├── prep_time_minutes (integer)
├── is_active (boolean)
├── created_at (timestamp)
├── updated_at (timestamp)
└── deactivated_until (timestamp, nullable)
    // null = active; or timestamp = inactive until this date
    // Every Monday 00:00 UTC: all items set to active
```

---

### 1.8 Inventory Management

**Table: `public.inventario_items`**
```sql
inventario_items
├── id (uuid, pk)
├── hotel_id (uuid, fk → hotels)
├── name (varchar: "Extra towel", "Extra blanket", "Pillow")
├── description (text)
├── locations (text array: ["Linen closet 1st floor", "Main storage"])
├── total_qty (integer)
├── available_qty (integer)
├── busy_qty (integer)
├── reorder_threshold (integer)
├── is_active (boolean)
├── created_at (timestamp)
├── updated_at (timestamp)
└── busy_items (jsonb array, audit trail)
    [
      {
        "cloudbeds_room_id": "301",
        "qty": 2,
        "taken_at": "timestamp",
        "task_id": "uuid",
        "tarea_id": "uuid"
      }
    ]
```

---

### 1.9 Room Assignment Tracking (Minimal)

**Table: `public.room_assignments`**
```sql
room_assignments
├── id (uuid, pk)
├── hotel_id (uuid, fk → hotels)
├── cloudbeds_room_id (varchar, external ID, NOT fk)
├── room_number (varchar, cached for UI, NOT authoritative)
├── borrowed_items (jsonb array, current borrowing state)
│   [
│     {
│       "inventory_item_id": "uuid",
│       "name": "Extra towel",
│       "qty": 2,
│       "since": "timestamp",
│       "tarea_id": "uuid"
│     }
│   ]
├── created_at (timestamp)
└── updated_at (timestamp)
```

**Purpose:**  
- ONLY for tracking what we've lent to each room
- NOT a cache of Cloudbeds room data
- When displaying Cuartos page: merge this + live Cloudbeds API fetch

---

### 1.10 Knowledge Base (RAG)

**Table: `public.hotel_knowledge_base`**
```sql
hotel_knowledge_base
├── id (uuid, pk)
├── hotel_id (uuid, fk → hotels)
├── content (text)
├── embedding (vector(1536), using pgvector)  // OpenAI embeddings
├── metadata (jsonb)
│   {
│     "source": "...",
│     "category": "...",
│     "created_by": "..."
│   }
├── created_at (timestamp)
└── updated_at (timestamp)
```

---

### 1.11 Push Subscriptions

**Table: `public.push_subscriptions`**
```sql
push_subscriptions
├── id (uuid, pk)
├── user_id (uuid, fk → users)
├── endpoint (varchar)
├── auth (varchar)
├── p256dh (varchar)
├── created_at (timestamp)
└── updated_at (timestamp)
```

---

## 2. Upstash Redis (Cache & Queue)

**Purpose:** Serverless Redis via REST API for:
- Message deduplication
- Job queue
- Delayed jobs
- Real-time state (NOT persistent)

### 2.1 Message Deduplication

```
Key: message:{channel}:{channel_message_id}
Value: 1
TTL: 86400 seconds (24 hours)
Operation: SET NX (set if not exists)
```

### 2.2 Webhook Processing Queue

```
Stream: webhook:meta:queue
Entries: 
{
  "hotel_id": "uuid",
  "channel": "whatsapp",
  "channel_user_id": "...",
  "message_id": "...",
  "timestamp": "..."
}

Stream: webhook:cloudbeds:queue
Entries:
{
  "event_type": "payment.completed",
  "reservation_id": "...",
  "timestamp": "..."
}
```

### 2.3 Delayed Jobs

```
Function: ZADD (sorted set by timestamp)
Key: delayed:jobs
Members: 
{
  "type": "payment_follow_up",
  "conversation_id": "uuid",
  "scheduled_for": "timestamp + 2100 seconds"  // 35 minutes
}
```

---

## 3. Cloudbeds API (Never Duplicated)

**DO NOT store these in Supabase:**

### 3.1 Room Information (Always Fetch Live)

```
GET /properties/{propertyId}/rooms
Response: {
  "rooms": [
    {
      "id": "123",
      "name": "301",
      "capacity": 2,
      "type": "Deluxe",
      "status": "occupied"  // dirty, clean, inspecting, out_of_service
    }
  ]
}
```

### 3.2 Reservations (Always Fetch Live)

```
GET /properties/{propertyId}/reservations
Query: ?dates=[YYYY-MM-DD],[YYYY-MM-DD]
Response: {
  "reservations": [
    {
      "id": "456",
      "roomId": "123",
      "guestName": "John Doe",
      "checkIn": "2026-04-05",
      "checkOut": "2026-04-10",
      "status": "confirmed",
      "rate": 2400,
      "paymentStatus": "paid"
    }
  ]
}
```

### 3.3 Payment Status (Always Fetch Live)

```
GET /properties/{propertyId}/reservations/{reservationId}
Response includes: paymentStatus, amountPaid, outstandingBalance
```

---

## 4. Summary Table

| Database | Technology | Purpose | Ownership |
|----------|-----------|---------|-----------|
| Core DB | Supabase Postgres | All operational data + auth | Us (Supabase) |
| Cache/Queue | Upstash Redis | Dedup, job queue, delays | Us (Upstash) |
| PMS | Cloudbeds API | Room, guest, reservation, payment data | Hotel (Cloudbeds) |

---

## 5. What We Store vs. What We Fetch

### Store in Supabase ✅

- All user/staff records
- All conversations + messages
- All reservations (reference only: `cloudbeds_reservation_id`)
- All orders (pedidos)
- All tasks (tareas)
- Menu items (hotel's menu)
- Inventory items (hotel's consumables)
- Room borrowing history (room_assignments)
- Knowledge base for RAG

### NEVER Store (Always Fetch) ❌

- Room numbers (fetch live)
- Room types (fetch live)
- Guest names/emails/phones (fetch live)
- Reservation dates (fetch live)
- Rates/pricing (fetch live)
- Payment status/balance (fetch live)
- Room occupancy status (fetch live)
- Availability (fetch live)

---

## 6. Supabase Table Summary (Quick Reference)

```
Total Tables: 10 (in public schema)
├── Users & Auth
│   ├── users (extended: hotel_id, role, status, push_enabled)
│   ├── push_subscriptions
│   └── hotels
├── Conversations (booking state stored in conversations.booking_state)
│   ├── conversations (extended: status, tags, booking_state, current_takeover)
│   └── messages
├── Operations
│   ├── pedidos (room service)
│   └── tareas (housekeeping/concierge)
├── Configuration
│   ├── menu_items
│   └── inventario_items
├── Tracking
│   ├── room_assignments
│   └── hotel_knowledge_base
```

---

## 7. Row-Level Security (RLS) Strategy

**All tables have RLS enabled:**

- `users`: Users can only see their own profile + all other staff in same hotel
- `conversations`: Staff in hotel_id can see all; anon cannot (booking_state stored here)
- `messages`: Same hotel RLS as conversations
- `pedidos` / `tareas`: Same hotel RLS
- `menu_items` / `inventario_items`: Same hotel RLS
- `room_assignments`: Same hotel RLS

**Service role key** (agent only): Bypasses RLS for backend operations  
**Anon key** (dashboard): Always filtered by hotel_id + role

---

## 8. Migration Files

All schema changes tracked in `supabase/migrations/`:

```
001_initial_schema.sql           (Not found — need to create)
002_add_user_profile_fields.sql  (Exists: first_name, last_name, phone, position, avatar_url)
003_auto_create_user_trigger.sql (Exists: auto-create user on signup)
004_dashboard_schema.sql         (Next: pedidos, tareas, menu, inventario, room_assignments)
```

---

## 9. Development Checklist

- [ ] Verify all 11 tables exist in Supabase
- [ ] Verify RLS policies on all tables
- [ ] Test that anon key cannot bypass RLS
- [ ] Test that service role key bypasses RLS
- [ ] Create `@casamadi/db` typed query helpers for each table
- [ ] Create Supabase Realtime subscriptions for: conversations, pedidos, tareas
- [ ] Test message dedup in Redis
- [ ] Test webhook queue processing
- [ ] Test delayed job scheduling (35-min payment follow-up)
