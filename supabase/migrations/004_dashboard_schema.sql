-- Casamadi Dashboard Schema
-- Created: April 2026
-- Purpose: Add all dashboard tables (10 tables, no Cloudbeds duplication)

-- ============================================================================
-- 1. HOTELS TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  cloudbeds_property_id VARCHAR UNIQUE NOT NULL,
  cloudbeds_oauth_token TEXT, -- encrypted in application
  cloudbeds_oauth_refresh_token TEXT, -- encrypted in application
  cloudbeds_token_expires_at TIMESTAMP,
  timezone VARCHAR DEFAULT 'America/Mexico_City',
  language VARCHAR DEFAULT 'es',
  config JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 2. USERS TABLE EXTENSION
-- ============================================================================

ALTER TABLE IF EXISTS public.users 
ADD COLUMN IF NOT EXISTS hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.users 
ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'general' CHECK (role IN ('admin', 'recepcion', 'general'));

ALTER TABLE IF EXISTS public.users 
ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

ALTER TABLE IF EXISTS public.users 
ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE IF EXISTS public.users 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- Create index for hotel_id
CREATE INDEX IF NOT EXISTS idx_users_hotel_id ON public.users(hotel_id);

-- ============================================================================
-- 3. CONVERSATIONS TABLE EXTENSION
-- ============================================================================

ALTER TABLE IF EXISTS public.conversations 
ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'escalated', 'takeover', 'closed'));

ALTER TABLE IF EXISTS public.conversations 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

ALTER TABLE IF EXISTS public.conversations 
ADD COLUMN IF NOT EXISTS booking_state JSONB DEFAULT NULL;

ALTER TABLE IF EXISTS public.conversations 
ADD COLUMN IF NOT EXISTS current_takeover JSONB DEFAULT NULL;

ALTER TABLE IF EXISTS public.conversations 
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP DEFAULT NULL;

-- booking_state structure:
-- {
--   "flow_state": "payment_pending",
--   "cloudbeds_reservation_id": "abc123",
--   "room_selected": {...},
--   "payment_link_sent_at": "timestamp",
--   "payment_verified_at": "timestamp",
--   "confirmed_at": "timestamp"
-- }

-- current_takeover structure:
-- {
--   "taken_by_user_id": "uuid",
--   "duration_minutes": 60,
--   "started_at": "timestamp",
--   "expires_at": "timestamp"
-- }

-- ============================================================================
-- 4. PEDIDOS TABLE (Room Service Orders)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  cloudbeds_room_id VARCHAR NOT NULL, -- external ID, NOT foreign key
  items JSONB NOT NULL DEFAULT '[]'::JSONB,
  total_amount DECIMAL(10, 2),
  requested_delivery_time TIMESTAMP,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'preparing', 'delivered', 'rejected')),
  assigned_to_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

-- items structure:
-- [
--   {
--     "menu_item_id": "uuid",
--     "name": "Orange juice",
--     "qty": 2,
--     "price": 45,
--     "notes": "extra ice"
--   }
-- ]

CREATE INDEX IF NOT EXISTS idx_pedidos_hotel_id ON public.pedidos(hotel_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_conversation_id ON public.pedidos(conversation_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_cloudbeds_room_id ON public.pedidos(cloudbeds_room_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON public.pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_assigned_to_user_id ON public.pedidos(assigned_to_user_id);

-- ============================================================================
-- 5. TAREAS TABLE (Housekeeping & Concierge Tasks)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tareas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  cloudbeds_room_id VARCHAR NOT NULL, -- external ID, NOT foreign key
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  task_type VARCHAR NOT NULL, -- "extra_towel", "iron", "maintenance", "return_items"
  description TEXT NOT NULL,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'completed', 'rejected')),
  assigned_to_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  completed_at TIMESTAMP,
  created_by VARCHAR DEFAULT 'agent' CHECK (created_by IN ('agent', 'staff')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  inventory_items JSONB DEFAULT '[]'::JSONB
);

-- inventory_items structure:
-- [
--   {
--     "inventory_item_id": "uuid",
--     "name": "Extra towel",
--     "qty": 2,
--     "status": "busy"
--   }
-- ]

CREATE INDEX IF NOT EXISTS idx_tareas_hotel_id ON public.tareas(hotel_id);
CREATE INDEX IF NOT EXISTS idx_tareas_cloudbeds_room_id ON public.tareas(cloudbeds_room_id);
CREATE INDEX IF NOT EXISTS idx_tareas_conversation_id ON public.tareas(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tareas_status ON public.tareas(status);
CREATE INDEX IF NOT EXISTS idx_tareas_assigned_to_user_id ON public.tareas(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_tareas_task_type ON public.tareas(task_type);

-- ============================================================================
-- 6. MENU_ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  image_url VARCHAR,
  price_mxn DECIMAL(10, 2) NOT NULL,
  price_usd DECIMAL(10, 2),
  section VARCHAR NOT NULL CHECK (section IN ('desayuno', 'comida_cena', '24_7')),
  prep_time_minutes INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deactivated_until TIMESTAMP
);

-- Every Monday 00:00 UTC: update menu_items SET is_active = TRUE WHERE hotel_id = X

CREATE INDEX IF NOT EXISTS idx_menu_items_hotel_id ON public.menu_items(hotel_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_section ON public.menu_items(section);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_active ON public.menu_items(is_active);

-- ============================================================================
-- 7. INVENTARIO_ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inventario_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  locations TEXT[] DEFAULT '{}',
  total_qty INTEGER NOT NULL DEFAULT 0,
  available_qty INTEGER NOT NULL DEFAULT 0,
  busy_qty INTEGER NOT NULL DEFAULT 0,
  reorder_threshold INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  busy_items JSONB DEFAULT '[]'::JSONB
);

-- busy_items structure:
-- [
--   {
--     "cloudbeds_room_id": "301",
--     "qty": 2,
--     "taken_at": "timestamp",
--     "task_id": "uuid"
--   }
-- ]

CREATE INDEX IF NOT EXISTS idx_inventario_items_hotel_id ON public.inventario_items(hotel_id);
CREATE INDEX IF NOT EXISTS idx_inventario_items_is_active ON public.inventario_items(is_active);

-- ============================================================================
-- 8. ROOM_ASSIGNMENTS TABLE (Minimal, No Duplication)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.room_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  cloudbeds_room_id VARCHAR NOT NULL,
  room_number VARCHAR, -- cached for UI, NOT authoritative
  borrowed_items JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(hotel_id, cloudbeds_room_id)
);

-- borrowed_items structure:
-- [
--   {
--     "inventory_item_id": "uuid",
--     "name": "Extra towel",
--     "qty": 2,
--     "since": "timestamp",
--     "tarea_id": "uuid"
--   }
-- ]

CREATE INDEX IF NOT EXISTS idx_room_assignments_hotel_id ON public.room_assignments(hotel_id);
CREATE INDEX IF NOT EXISTS idx_room_assignments_cloudbeds_room_id ON public.room_assignments(cloudbeds_room_id);

-- ============================================================================
-- 9. HOTEL_KNOWLEDGE_BASE TABLE (pgvector RAG)
-- ============================================================================

-- Enable pgvector extension if not exists
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.hotel_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_hotel_id ON public.hotel_knowledge_base(hotel_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding ON public.hotel_knowledge_base USING ivfflat (embedding vector_cosine_ops);

-- ============================================================================
-- 10. PUSH_SUBSCRIPTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint VARCHAR NOT NULL,
  auth VARCHAR NOT NULL,
  p256dh VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Pedidos: Staff in hotel_id can see
CREATE POLICY pedidos_select_hotel ON public.pedidos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.hotel_id = pedidos.hotel_id
    )
  );

CREATE POLICY pedidos_insert_hotel ON public.pedidos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.hotel_id = pedidos.hotel_id
    )
  );

CREATE POLICY pedidos_update_hotel ON public.pedidos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.hotel_id = pedidos.hotel_id
    )
  );

-- Tareas: Staff in hotel_id can see
CREATE POLICY tareas_select_hotel ON public.tareas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.hotel_id = tareas.hotel_id
    )
  );

CREATE POLICY tareas_insert_hotel ON public.tareas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.hotel_id = tareas.hotel_id
    )
  );

CREATE POLICY tareas_update_hotel ON public.tareas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.hotel_id = tareas.hotel_id
    )
  );

-- Menu Items: Staff in hotel_id can see
CREATE POLICY menu_items_select_hotel ON public.menu_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.hotel_id = menu_items.hotel_id
    )
  );

CREATE POLICY menu_items_insert_hotel ON public.menu_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.hotel_id = menu_items.hotel_id
        AND users.role IN ('admin', 'recepcion')
    )
  );

CREATE POLICY menu_items_update_hotel ON public.menu_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.hotel_id = menu_items.hotel_id
        AND users.role IN ('admin', 'recepcion')
    )
  );

-- Inventario Items: Staff in hotel_id can see
CREATE POLICY inventario_items_select_hotel ON public.inventario_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.hotel_id = inventario_items.hotel_id
    )
  );

CREATE POLICY inventario_items_insert_hotel ON public.inventario_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.hotel_id = inventario_items.hotel_id
        AND users.role = 'admin'
    )
  );

CREATE POLICY inventario_items_update_hotel ON public.inventario_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.hotel_id = inventario_items.hotel_id
        AND users.role IN ('admin', 'recepcion')
    )
  );

-- Room Assignments: Staff in hotel_id can see
CREATE POLICY room_assignments_select_hotel ON public.room_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.hotel_id = room_assignments.hotel_id
    )
  );

CREATE POLICY room_assignments_update_hotel ON public.room_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.hotel_id = room_assignments.hotel_id
    )
  );

-- Hotel Knowledge Base: Staff in hotel_id can see
CREATE POLICY knowledge_base_select_hotel ON public.hotel_knowledge_base FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.hotel_id = hotel_knowledge_base.hotel_id
    )
  );

-- Push Subscriptions: Users can only see their own
CREATE POLICY push_subscriptions_select ON public.push_subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY push_subscriptions_insert ON public.push_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY push_subscriptions_delete ON public.push_subscriptions FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- COMMENTS & DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.pedidos IS 'Room service orders detected by agent or staff';
COMMENT ON TABLE public.tareas IS 'Housekeeping and concierge tasks';
COMMENT ON TABLE public.menu_items IS 'Hotel menu items (time-based: desayuno, comida_cena, 24_7)';
COMMENT ON TABLE public.inventario_items IS 'Physical consumables available for guest delivery (towels, blankets, etc.)';
COMMENT ON TABLE public.room_assignments IS 'Minimal tracking of items borrowed per room (NOT a Cloudbeds room cache)';
COMMENT ON TABLE public.hotel_knowledge_base IS 'Hotel Q&A content for RAG with pgvector embeddings';
COMMENT ON TABLE public.push_subscriptions IS 'Web Push API subscriptions for staff notifications';

COMMENT ON COLUMN public.conversations.booking_state IS 'State of booking flow stored as JSON (no separate reservations table)';
COMMENT ON COLUMN public.conversations.current_takeover IS 'Staff takeover state with duration and expiry';
COMMENT ON COLUMN public.pedidos.cloudbeds_room_id IS 'External ID from Cloudbeds, NOT a foreign key';
COMMENT ON COLUMN public.tareas.cloudbeds_room_id IS 'External ID from Cloudbeds, NOT a foreign key';
COMMENT ON COLUMN public.room_assignments.cloudbeds_room_id IS 'External ID from Cloudbeds, NOT a foreign key';
COMMENT ON COLUMN public.room_assignments.room_number IS 'Cached for UI display only, NOT authoritative (Cloudbeds is authority)';
