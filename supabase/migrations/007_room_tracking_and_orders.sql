-- Casamadi Room Tracking & Orders Management
-- Created: April 2026
-- Purpose: Track room numbers and guest orders throughout session

-- ============================================================================
-- 1. ADD ROOM TRACKING TO CONVERSATIONS
-- ============================================================================

ALTER TABLE IF EXISTS public.conversations
ADD COLUMN IF NOT EXISTS room_number VARCHAR;

ALTER TABLE IF EXISTS public.conversations
ADD COLUMN IF NOT EXISTS orders_summary JSONB DEFAULT '[]'::JSONB;

CREATE INDEX IF NOT EXISTS idx_conversations_room_number ON public.conversations(room_number);

-- ============================================================================
-- 2. CREATE ORDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id TEXT NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  special_instructions TEXT,
  status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled')),
  ordered_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Orders are readable by authenticated users in hotel" ON public.orders
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Orders can be created by service role" ON public.orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Orders can be updated by staff" ON public.orders
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_orders_hotel_id ON public.orders(hotel_id);
CREATE INDEX IF NOT EXISTS idx_orders_conversation_id ON public.orders(conversation_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_menu_item_id ON public.orders(menu_item_id);

-- ============================================================================
-- 3. CREATE ORDER_ITEMS TABLE (for batch orders)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  special_instructions TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order items are readable by authenticated users" ON public.order_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Order items can be created by service role" ON public.order_items
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON public.order_items(menu_item_id);

-- ============================================================================
-- 4. CREATE ORDER_REQUESTS TABLE (for simple requests via chat)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.order_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id TEXT NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  item_name VARCHAR NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  special_instructions TEXT,
  status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'preparing', 'ready')),
  requested_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.order_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order requests are readable by authenticated users" ON public.order_requests
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Order requests can be created by service role" ON public.order_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Order requests can be updated by staff" ON public.order_requests
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_order_requests_hotel_id ON public.order_requests(hotel_id);
CREATE INDEX IF NOT EXISTS idx_order_requests_conversation_id ON public.order_requests(conversation_id);
CREATE INDEX IF NOT EXISTS idx_order_requests_status ON public.order_requests(status);
