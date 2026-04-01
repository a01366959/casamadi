# Casamadi — Staff Dashboard Architecture

**Version:** 1.0.0
**Last Updated:** April 2026
**Status:** Requirements Locked

---

## 1. Overview

The Staff Dashboard is a mobile-first PWA for hotel staff to monitor agent conversations, manage reservations, orders, tasks, inventory, and menu.

**Two Sections:**
1. **Platform** — All staff can access (role-limited features)
2. **Admin** — Admins only

---

## 2. Role-Based Access Matrix

| Feature | Admin | Recepción | General |
|---------|-------|-----------|---------|
| **PLATFORM SECTION** |
| Dashboard (view) | ✅ Full | ✅ Full | ✅ Full |
| Conversaciones (view) | ✅ Full | ✅ Full | ✅ Full |
| Conversaciones (takeover) | ✅ | ✅ | ✅ |
| Conversaciones (view history) | ✅ Full | ✅ Full | ✅ Full |
| Pedidos (view) | ✅ Full | ✅ Full | ✅ Full |
| Pedidos (reject/reassign) | ✅ | ✅ | ❌ |
| Tareas (view) | ✅ Full | ✅ Full | ✅ Full |
| Tareas (reject/reassign) | ✅ | ✅ | ❌ |
| Tareas (mark as done) | ✅ | ✅ | ✅ |
| Menu (view) | ✅ | ✅ | ✅ |
| Menu (toggle items on/off) | ✅ | ✅ | ❌ |
| Menu (add new items) | ✅ Only | ❌ | ❌ |
| Inventario (view) | ✅ | ✅ | ✅ |
| Inventario (toggle items on/off) | ✅ | ✅ | ❌ |
| Inventario (add new items) | ✅ Only | ❌ | ❌ |
| Inventario (mark as busy/returned) | ✅ | ✅ | ✅ |
| Cuartos (view) | ✅ | ✅ | ✅ |
| **ADMIN SECTION** |
| Usuarios (CRUD) | ✅ Only | ❌ | ❌ |
| Menu (add items) | ✅ Only | ❌ | ❌ |
| Inventario (add items) | ✅ Only | ❌ | ❌ |

---

## 3. Platform Pages (All Staff)

### 3.1 Dashboard

**Purpose:** Real-time overview of hotel operations.

**Widgets (show different data by role):**

1. **Solicitudes Abiertas**
   - Total open requests (global: Pedidos + Tareas + Escalations)
   - Breakdown by status: en progreso, por tiempo específico
   - Time-in-queue view (how long each has been waiting)

2. **Pedidos (Room Service)**
   - Total pedidos today
   - Top 5 most-ordered items (all time or this week)
   - Top 5 least-ordered items
   - Average delivery time (completed pedidos)
   - Status breakdown: pending, assigned, delivered, rejected

3. **Tareas (Housekeeping/Concierge)**
   - Total tareas today
   - Request types: e.g., extra towel, iron/ironing board, WiFi help, etc.
   - Completion rate (% of tareas marked done on same day)
   - External task requests (e.g., restaurant reservation, spa booking)
   - Average completion time (from creation to done)

4. **Key Metrics**
   - Conversations handled by agent (today)
   - Conversations escalated to human
   - Booking success rate (% of availability checks → confirmed reservations)
   - Average response time (agent first reply)

**Role Filtering:**
- **Admin:** All metrics + financial summaries
- **Recepción:** Everything except financial
- **General:** Only Tareas + Pedidos related to them, no escalation data

---

### 3.2 Conversaciones

**Purpose:** Monitor and manage guest conversations in real time.

**List View:**
- Conversation ID / Guest name
- Channel: WhatsApp, Instagram, Messenger
- Last message preview
- Status: active, escalated, takeover, closed
- Tags: Lead, Huésped, Evento (mutually exclusive, auto-assigned by agent)
- Last activity timestamp

**Conversation Detail:**

1. **Full Conversation History**
   - All messages (guest + agent)
   - Timestamps
   - Read/unread state for staff

2. **Conversation Metadata**
   - Guest name, phone, email
   - Channel
   - Start time / duration
   - Current state (collecting info, showing options, payment pending, confirmed, etc.)

3. **Actions Available to Staff:**

   **View Mode:**
   - Read conversation history
   - View guest profile + booking details
   - View any offers/options the agent sent

   **Takeover Button:**
   - Opens dialog: "How long should takeover last?"
     - Options: 1 hour, 1 day, 1 week, 1 month, Always
   - Agent immediately stops responding to this conversation
   - Staff can send/receive messages directly
   - At end of duration: agent resumes (or manual re-enable if "Always")
   - If takeover is "Always": button changes to "Release to Agent"

   **Auto-Escalation (Agent Decision):**
   - If guest anger level detected, agent escalates automatically
   - System sends push notification: "⚠️ Escalation: Guest [name] in conversation [ID]"
   - Conversation tagged with reason: "High sentiment", "Request out of scope", etc.
   - Staff can dismiss escalation or take over

4. **Conversation Tagging:**
   - Tags auto-assigned by agent analysis:
     - **Lead:** Prospect (not yet booked, initial inquiry)
     - **Huésped:** Current or past guest (confirmed reservation)
     - **Evento:** Special event inquiry (wedding, corporate, etc.)
   - Staff can manually override tags

5. **Archive:**
   - Closed conversations remain fully searchable/viewable
   - No deletion; full history preserved

---

### 3.3 Pedidos (Room Service Orders)

**Purpose:** Manage food & beverage orders detected by agent.

**List View:**
- Order ID / Room #
- Item(s) ordered
- Requested time / Delivery deadline
- Status: pending, assigned, preparing, delivered, rejected
- Assigned to (staff member name)

**Order Detail:**

1. **Order Info**
   - Guest name / Room #
   - Items + quantities
   - Special requests/notes
   - Requested delivery time
   - Order timestamp

2. **Kitchen Info**
   - Est. prep time (from menu item config)
   - Est. delivery time
   - Kitchen status: open, lunch break, dinner only, closed

3. **Actions Available to Staff:**

   **Assign:**
   - Manually assign to another staff member (Recepción/Admin only)
   - Reassign if first person can't complete

   **Reject:**
   - Only if: kitchen is closed OR item not available
   - When rejected, agent auto-sends message to guest:
     - Reason: "sorry, kitchen is closed" or "item unavailable, try [alternative]"
     - Alternative suggestions from agent (based on menu)
   - If kitchen closed: offer 24/7 menu or reschedule

   **Mark as Delivered:**
   - Timestamp recorded
   - Calculate delivery time
   - Update "average delivery time" metric

   **Note:**
   - Can add notes (e.g., "guest is in room 201 not 301")

---

### 3.4 Tareas (Tasks)

**Purpose:** Manage housekeeping and concierge tasks.

**List View:**
- Task ID / Room #
- Task type: extra towel, iron/ironing board, WiFi help, door lock issue, etc.
- Requested by: Agent or Staff
- Status: pending, assigned, completed, rejected
- Assigned to (staff member)

**Task Detail:**

1. **Task Info**
   - Room #
   - Guest name
   - Task description
   - Requested timestamp
   - Deadline (if any)

2. **Inventory Impact (if applicable):**
   - If task is "deliver extra towel":
     - Inventory qty auto-subtracted
     - Item marked "busy" in inventory
     - When task marked done: need to update inventory status

3. **Actions Available to Staff:**

   **Assign:**
   - Manually assign to another staff member (Recepción/Admin only)
   - Reassign if first person can't complete

   **Reject:**
   - Only if: task can't be fulfilled (e.g., room doesn't exist, guest already checked out)
   - When rejected, task is deleted AND:
     - If inventory was subtracted, restore it
     - Notify Recepción (push or flag)

   **Mark as Done:**
   - Timestamp recorded
   - Inventory status updated (if applicable)
   - Calculate completion time
   - Update "completion rate" metric

   **Note:**
   - Can add notes (e.g., "guest wasn't in room, left at door")

---

### 3.5 Menu

**Purpose:** Manage food & beverage menu available to agent and guests.

**View for Staff:**

1. **Menu Structure:**
   - Section 1: **Desayuno** (Breakfast — time-based, e.g., 6am-11am)
   - Section 2: **Comida/Cena** (Lunch/Dinner — time-based, e.g., 11am-10pm)
   - Section 3: **24/7** (Always available)

2. **Per Item Display:**
   - Item name
   - Description
   - Price (MXN)
   - Est. prep time (minutes)
   - Status: active (green), inactive (gray)
   - Toggle button: on/off

3. **Actions (Admin only):**

   **Add New Item:**
   - Form: name, description, price, section, prep time
   - Save to database, immediately available to agent

   **Toggle Item On/Off:**
   - Green = available to agent
   - Gray = agent won't offer; if ordered by guest, auto-rejected with alternative suggestion
   - **Weekly Auto-Reset:** Every Monday at 00:00, ALL items re-enabled automatically

   **Edit Item:**
   - Admin can edit price, description, prep time, section (Admin only)

4. **Agent Behavior:**
   - Checks current time, only offers items in active sections
   - If guest tries to order outside time window: "Sorry, breakfast ends at 11am. Try our lunch menu or 24/7 options."
   - If item is off: "That's not available right now, but we have [alternative]."
   - When constructing pedido: respects item availability and time windows

5. **Public Menu (No Auth Required):**
   - URL: `/menu/:hotelId` (or `/menu` if only one hotel)
   - Displays: All active items, sections, prices, prep times
   - Real-time availability (based on current time and item status)
   - No ordering from public page — guest must continue with agent
   - Agent can share link with guest: "Check our menu: [link]"

---

### 3.6 Inventario

**Purpose:** Track physical items (towels, bedding, etc.) available for guest delivery.

**List View:**
- Item name (e.g., "Extra towel", "Extra blanket", "Pillow")
- Total qty in stock
- Qty currently busy (lent to rooms, in use)
- Qty available
- Locations (e.g., "Linen closet 1st floor", "Main storage")
- Status: active, inactive

**Inventory Detail:**

1. **Item Info**
   - Name
   - Description
   - Locations where stored
   - Reorder threshold (when to notify admin)
   - Status: active (available for agent to request), inactive

2. **Current State:**
   - Total qty
   - Available qty
   - Busy qty (by room, with assignment date)
   - Example:
     ```
     Toalla Extra (Extra Towel)
     Total: 50
     Available: 42
     Busy: 8
       - Room 101: 2 (since 2PM)
       - Room 203: 1 (since 11AM)
       - ...
     ```

3. **Actions (Staff):**

   **Add New Item (Admin only):**
   - Form: name, description, locations, qty
   - Save to database, available for agent requests

   **Toggle On/Off:**
   - Green = agent can request task to deliver item
   - Gray = agent won't request (even if guest asks)

   **Mark as Busy/Returned:**
   - When staff delivers item to room: mark qty as busy, room #, timestamp
   - When checkout task is created: auto-subtract from inventory
   - When checkout task marked done: mark as returned, restore qty

   **Edit Item:**
   - Admin can update locations, description, reorder threshold (Admin only)

4. **Auto-Inventory Mechanics:**

   **When Pedido/Tarea Created:**
   - If item involves inventory (e.g., extra towel tarea):
     - Auto-subtract qty from "available"
     - Mark qty as "busy" for that room
     - Create linked housekeeping task: "Deliver towel to room 101"

   **When Room Checkout:**
   - Cloudbeds API shows reservation ended
   - System auto-creates task: "Return borrowed items from room 101: 2 towels, 1 blanket"
   - Task assigned to housekeeping staff
   - When task marked done: restore qty to available

5. **Reorder Alerts:**
   - If available qty < reorder threshold: notify Admin with push notification
   - Flag item in inventory list (red)

---

### 3.7 Cuartos (Rooms)

**Purpose:** Per-room view of reservations, orders, tasks, and financial info from Cloudbeds.

**List View:**
- Room # / Room type
- Guest name (if occupied)
- Check-in / Check-out dates
- Status: empty, occupied, cleaning, maintenance
- Open tasks + pending orders count
- Outstanding deuda (balance due)

**Room Detail:**

1. **Reservation Info (from Cloudbeds):**
   - Guest name, email, phone
   - Arrival / Departure
   - Room type
   - Rate (if accessible)
   - Payment status: paid, pending, overdue

2. **Active Orders & Tasks:**
   - Table: Pedidos (room service orders) — status, items, delivery time
   - Table: Tareas (housekeeping/concierge tasks) — status, type, assigned to
   - Can take action from this view: reassign, mark done, reject

3. **Inventory Borrowed:**
   - Items currently lent to this room with qty and date taken
   - Example:
     ```
     Extra towel: 2 (since 2PM)
     Extra blanket: 1 (since 6PM)
     ```

4. **Financial Summary (Deudas):**
   - Room service charges: total unpaid, grouped by date/order
   - Can mark individual orders as paid/collected
   - OR can mark entire room as "checkout ready" (collected all)
   - Shows: amount, date, item, status (pending, collected, dispute)

5. **Timeline:**
   - Chronological view of all events for this room:
     - Reservation created
     - Order placed (timestamp, items, delivered timestamp)
     - Task created/completed
     - Checkout

---

## 4. Admin Pages

### 4.1 Usuarios (Users)

**Purpose:** Manage staff accounts and permissions.

**List View:**
- Name
- Email
- Role: Admin, Recepción, General
- Status: active, inactive
- Last login

**User Detail / Edit:**

1. **Create New User:**
   - Form: name, email, password (or send magic link), role
   - Roles visible as checkboxes:
     - [ ] Admin
     - [ ] Recepción
     - [ ] General
   - Only one can be checked at a time (mutually exclusive)

2. **Edit User:**
   - Change name, email, role
   - Can disable/enable account
   - Can send password reset link

3. **Delete User:**
   - Soft delete (don't fully remove, maintain audit trail)
   - Reassign tasks/orders to another user

---

### 4.2 Menu Management (Administrative)

**Purpose:** Manage menu items (full CRUD).

**Same as Platform Menu page, but Admin can:**
- Add new items
- Edit items (name, price, prep time, section)
- Delete items
- Set kitchen hours (e.g., "Comida 12pm-3pm, 6pm-10pm")
- Mark items as seasonal / availability dates

---

### 4.3 Inventario Management (Administrative)

**Purpose:** Manage inventory items (full CRUD).

**Same as Platform Inventory page, but Admin can:**
- Add new items
- Edit items (name, locations, reorder threshold)
- Delete items
- Set initial stock quantity
- Adjust stock (e.g., received new shipment, broke item)

---

## 5. Agent Behavior & Integration

### 5.1 When Agent Creates a Pedido

```
Guest: "Can I get breakfast delivered to my room?"
Agent (checks menu + current time):
  - If 6am-11am: "Great! Our breakfast options are..."
  - If 11:30am: "Breakfast ended at 11am, but we have lunch options or our 24/7 menu"

Guest: "I'll have the orange juice"
Agent: (checks if "orange juice" is active)
  - If active: "Perfect! Your juice will arrive in ~10 minutes"
  - If inactive: "Sorry, juice isn't available today. Can I get you coffee instead?"

Agent creates Pedido:
  - Checks kitchen hours
  - If kitchen closed: auto-rejects, suggests 24/7 menu
  - If kitchen open: creates task, sets delivery deadline
```

### 5.2 When Agent Creates a Tarea

```
Guest: "I need an extra towel"
Agent: 
  - Checks if "extra towel" is active in inventory
  - If active: "I'll have that sent right away"
  - If inactive: "Unfortunately towels are unavailable right now"

Agent creates Tarea:
  - Auto-subtracts qty from inventory (marks as busy)
  - Creates delivery task assigned to housekeeping
  - Passes `inventory_item_id` and `qty` to task
```

### 5.3 When Checkout Detected

```
Cloudbeds API fires: Reservation.checkout or reservation.dates_updated
Agent or Dashboard detects: reservation end_date = today

System auto-creates Tarea:
  - Type: "Return borrowed items from room 301"
  - Items: [extra towel (qty 2), extra blanket (qty 1)]
  - Assigned to: housekeeping staff (round-robin or on-duty)
  - When staff marks done: inventory qty restored to available
```

### 5.4 When Staff Takeovers

```
Staff clicks "Takeover" on conversation with guest
Dialog opens: "How long?"
  - 1 hour
  - 1 day
  - 1 week
  - 1 month
  - Always

Staff selects: "1 hour"

Immediate:
  - Agent stops responding to this conversation_id
  - Staff can send/receive messages directly
  - Conversation status: "takeover (1h)"
  - Guest sees messages from staff (not agent)

After 1 hour:
  - Agent resumes responding automatically
  - Conversation status: "active"

If staff selects "Always":
  - Agent never resumes
  - Button changes to "Release to Agent"
  - Staff must click to re-enable agent
```

### 5.5 Agent Auto-Escalation

```
Agent detects:
  - Very negative sentiment (angry guest)
  - Request outside scope (e.g., "can you wire me money?")
  - Third escalation attempt by same guest in 24h
  - Technical error (Cloudbeds API down after 3 retries)

Agent:
  - Tags conversation: "High_Sentiment" or "Out_Of_Scope"
  - Sends message: "I'm connecting you with our team. Someone will be with you shortly."
  - Escalation flag + push notification sent to Recepción/Admin
  - Conversation status: "escalated"

Staff can:
  - View escalation reason
  - Take over manually
  - Send message to guest
```

---

## 6. Data Models (Database)

### Important Principle: No Duplication of Cloudbeds Data + No Separate Reservations Table

**Cloudbeds is the Single Source of Truth for:**
- Room information (room numbers, types)
- Guest information (name, email, phone)
- Reservation data (check-in, check-out, dates)
- Pricing & rates
- Payment status & financial balances

**Booking State Tracking:**
- Stored in `conversations.booking_state` (jsonb) — NOT in a separate `reservations` table
- Travel through conversation: check availability → select room → collect info → payment link → verify → confirm
- Minimal data: only what the agent needs during booking flow
- All authoritative reservation data fetched from Cloudbeds when needed

**When Dashboard Needs Reservation Data:**
- Fetch from Cloudbeds API in real-time via agent backend
- Never cache in Supabase
- Exception: Cache in browser session only (for performance, not persistence)

**Supabase Stores ONLY Our Operational Data:**
- Conversations (Meta messages) + booking flow state
- Staff users & roles
- Menu items (hotel's menu)
- Inventory items (hotel's consumables)
- Pedidos & Tareas (workflow state)
- Takeover state
- Conversation tags/metadata
- Borrowed items tracking (linked to Cloudbeds rooms)

### 6.1 Conversations Extension

```sql
conversations (from existing agent, extended with booking state)
├── id (uuid)
├── hotel_id (uuid, fk → hotels)
├── guest_phone (varchar)
├── channel (enum: whatsapp, instagram, messenger, sandbox)
├── language (varchar: es, en)
├── status (enum: active, escalated, takeover, closed)
├── tags (array: ["Lead", "Huésped", "Evento"])
├── created_at
├── updated_at
├── closed_at (null if active)
├── booking_state (jsonb, null if no booking)
│   {
│     "flow_state": "payment_pending",
│     "cloudbeds_reservation_id": "abc123",
│     "room_selected": {...},
│     "payment_link_sent_at": "timestamp",
│     "payment_verified_at": "timestamp",
│     "confirmed_at": "timestamp"
│   }
└── current_takeover (json, null if no takeover)
    {
      "taken_by_user_id": "uuid",
      "duration_minutes": 60, // null = always
      "started_at": "timestamp",
      "expires_at": "timestamp" // null if always
    }
```

**Important:** Booking state is stored here, NOT in a separate `reservations` table. Cloudbeds is the single source of truth for reservation data.

### 6.2 Pedidos

```sql
pedidos
├── id (uuid, pk)
├── hotel_id (uuid, fk)
├── conversation_id (uuid, fk → conversations)
├── cloudbeds_room_id (varchar, external ID from Cloudbeds, NOT fk)
├── items (json array of {menu_item_id, qty, notes})
├── requested_delivery_time (timestamp)
├── status (enum: pending, assigned, preparing, delivered, rejected)
├── assigned_to_user_id (uuid, fk → users, nullable)
├── rejection_reason (text, nullable)
├── delivered_at (timestamp, nullable)
├── created_at
├── updated_at
└── notes (text)
```

### 6.3 Tareas

```sql
tareas
├── id (uuid, pk)
├── hotel_id (uuid, fk)
├── cloudbeds_room_id (varchar, external ID from Cloudbeds, NOT fk)
├── conversation_id (uuid, fk → conversations, nullable)
├── task_type (varchar: e.g., "extra_towel", "iron", "maintenance")
├── description (text)
├── status (enum: pending, assigned, completed, rejected)
├── assigned_to_user_id (uuid, fk → users, nullable)
├── rejection_reason (text, nullable)
├── completed_at (timestamp, nullable)
├── created_by (enum: agent, staff)
├── created_at
├── updated_at
├── notes (text)
└── inventory_items (json array, if applicable)
    [
      {
        "inventory_item_id": "uuid",
        "qty": 2,
        "status": "busy" // busy | returned
      }
    ]
```

### 6.4 MenuItems

```sql
menu_items
├── id (uuid, pk)
├── hotel_id (uuid, fk)
├── name (varchar)
├── description (text)
├── price_mxn (decimal)
├── section (enum: desayuno, comida_cena, 24_7)
├── prep_time_minutes (integer)
├── is_active (boolean)
├── created_at
├── updated_at
└── deactivated_until (timestamp, nullable)
    // null = active, or timestamp = inactive until this date
```

### 6.5 InventarioItems

```sql
inventario_items
├── id (uuid, pk)
├── hotel_id (uuid, fk)
├── name (varchar: e.g., "Extra towel")
├── description (text)
├── locations (text array: ["Linen closet 1st floor"])
├── total_qty (integer)
├── available_qty (integer)
├── busy_qty (integer)
├── reorder_threshold (integer)
├── is_active (boolean)
├── created_at
├── updated_at
└── busy_items (json array, for audit trail)
    [
      {
        "cloudbeds_room_id": "301",
        "qty": 2,
        "taken_at": "timestamp",
        "task_id": "uuid"
      }
    ]
```

### 6.6 Users Extension

```sql
users (from existing Supabase auth)
├── id (uuid, pk)
├── email (varchar, unique)
├── full_name (varchar)
├── hotel_id (uuid, fk → hotels)
├── role (enum: admin, recepcion, general)
├── status (enum: active, inactive)
├── push_enabled (boolean, for push notifications)
├── created_at
├── updated_at
└── last_login (timestamp, nullable)
```

### 6.7 Room Links (Minimal, No Duplication)

**IMPORTANT:** Do NOT duplicate Cloudbeds data (rooms, guests, reservations, rates, payment status).
This table exists only to link our operational data to Cloudbeds rooms.

```sql
room_assignments (link operational data to Cloudbeds rooms)
├── id (uuid, pk)
├── hotel_id (uuid, fk → hotels)
├── cloudbeds_room_id (varchar, external ID from Cloudbeds)
├── room_number (varchar, cached for UI displays, NOT authoritative)
├── borrowed_items (json array, tracking what's currently lent)
│   [
│     { "inventory_item_id": "uuid", "qty": 2, "since": "timestamp", "tarea_id": "uuid" }
│   ]
├── created_at
└── updated_at
```

**Why so minimal:**
- Room info (occupancy, guest name, dates, rates, balance) → live from Cloudbeds API (`/properties/{id}/reservations`)
- Room status → live from Cloudbeds (empty, occupied, cleaning, maintenance)  
- Guest contact info → live from Cloudbeds
- Payment status, outstanding balance → live from Cloudbeds

**When Rendering Cuartos Page:**
1. Query `room_assignments` for borrowed items
2. Call Cloudbeds API: `GET /properties/{id}/reservations?dates=[today]`
3. Merge results: Cloudbeds room data + our borrowed items + open pedidos/tareas
4. Never show stale data from database — always fresh from Cloudbeds

---

## 7. State Machines

### 7.1 Conversation Lifecycle

```
active
├─► escalated (agent decision or staff override)
├─► takeover (staff manually takes over)
│   ├─► (duration expires) ─► active
│   └─► release (staff clicks Release) ─► active
│   └─► always (staff selected) ─► end staff must release
└─► closed (reservation complete or guest leaves)
```

### 7.2 Pedido Lifecycle

```
pending (just created by agent)
├─► assigned (staff assigns or auto-assign)
├─► preparing (kitchen starts)
├─► delivered (staff marks done)
└─► rejected (kitchen closed or item unavailable)
```

### 7.3 Tarea Lifecycle

```
pending (just created)
├─► assigned (staff or auto-assign)
├─► completed (staff marks done)
└─► rejected (can't fulfill)
```

### 7.4 Inventory Item Lifecycle (Per Lease)

```
available
├─► busy (assigned to room via tarea)
└─► returned (checkout task completed)
```

### 7.5 Menu Item Lifecycle (Weekly)

```
active
├─► inactive (staff toggles)
└─► (every Monday 00:00) ─► active (auto-reset)
```

---

## 8. Public Menu URL

```
Endpoint: GET /menu/:hotelId
         (or GET /menu if only one hotel)

Response (no auth required):
{
  "hotel": { "name": "Hotel Bernal" },
  "sections": [
    {
      "name": "Desayuno",
      "available_now": true,  // based on current time
      "active_until": "11:00",
      "items": [
        { "id": "...", "name": "Orange juice", "price": 45, "prep_time": 5 },
        ...
      ]
    },
    {
      "name": "Comida/Cena",
      "available_now": false,
      "available_at": "12:00",
      "items": [...]
    },
    {
      "name": "24/7",
      "available_now": true,
      "items": [...]
    }
  ]
}

Frontend Display:
- Show active sections prominently
- Dim unavailable sections with "Available at 12:00" label
- Show real-time availability (green dot = available)
- Show prep times for each item
- Show prices. Do NOT show ordering button.
- Footer: "Continue with our Agent" with link back to chat
```

---

## 9. Integration with Cloudbeds API

### 9.1 Room Data (Always Fresh, Never Cached)

- **When Cuartos page loads:** Fetch current room statuses from Cloudbeds API
- **What we fetch:** Guest name, occupancy, dates, rate, payment status, balance
- **How long we keep it:** Only in browser session (no database storage)
- **Why:** Cloudbeds is authoritative source; our DB only stores "borrowed items" state for that room
- **Per-room display:** Merge Cloudbeds data + our `room_assignments.borrowed_items` + open `pedidos`/`tareas`

**Dashboard should NOT store:**
- ❌ Room numbers (fetch from Cloudbeds)
- ❌ Guest names (fetch from Cloudbeds)  
- ❌ Check-in/out dates (fetch from Cloudbeds)
- ❌ Rates or payment status (fetch from Cloudbeds)
- ❌ Outstanding balance (fetch from Cloudbeds)

**Dashboard SHOULD store:**
- ✅ Borrowed items linked to `cloudbeds_room_id` (in `room_assignments`)
- ✅ Pedidos linked to `cloudbeds_room_id`
- ✅ Tareas linked to `cloudbeds_room_id`

### 9.2 Reservation Checkout Detection

- Cloudbeds webhook or polling: detect when reservation `end_date` = today
- System creates auto-task: "Return borrowed items from room [cloudbeds_room_id]"
- Assign to housekeeping
- When completed: update `room_assignments.borrowed_items`, restore inventory

### 9.3 Payment Status

- Always fetch from Cloudbeds API — never cache
- Show on Cuartos: "Payment pending" (red) vs "Paid" (green)
- Mark room ready for checkout only if payment confirmed in Cloudbeds

---

## 10. Push Notifications

### When Sent

- **Pedido created:** Staff involved in room service
- **Tarea created:** Staff assigned + all housekeeping staff
- **Escalation:** All Recepción + Admin
- **Order rejected:** Staff assigned + Recepción
- **Inventory low:** Admin (reorder threshold)
- **Takeover started:** Staff in that hotel
- **Guest message while takeover active:** Staff with takeover

### Format (via Web Push API + VAPID)

```json
{
  "title": "New Order - Room 301",
  "body": "Orange juice + coffee (est. 10 min)",
  "tag": "pedido-123",
  "icon": "/icon-192.png",
  "badge": "/badge-72.png",
  "data": {
    "url": "/dashboard/pedidos/123",
    "type": "pedido"
  }
}
```

---

## 11. Sequel: Not in MVP (Future)

- Reporting & analytics dashboard
- SMS notifications (currently push only)
- Multi-language staff interface (currently Spanish/English)
- Inventory transfer between rooms
- Delayed task scheduling ("remind me in 2 hours")
- Guest review/feedback after checkout
- Housekeeping room inspection checklist
- Staff availability calendar / time off requests
