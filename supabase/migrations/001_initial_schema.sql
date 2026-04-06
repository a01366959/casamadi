-- Casamadi Initial Schema
-- Created: April 2026
-- Purpose: Core tables for agent (hotels, guests, conversations, messages)

-- ============================================================================
-- 1. HOTELS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.hotels (
  id TEXT PRIMARY KEY,
  name VARCHAR NOT NULL,
  cloudbeds_property_id VARCHAR UNIQUE,
  cloudbeds_oauth_token TEXT,
  cloudbeds_oauth_refresh_token TEXT,
  cloudbeds_token_expires_at TIMESTAMP,
  timezone VARCHAR DEFAULT 'America/Mexico_City',
  language VARCHAR DEFAULT 'es',
  config JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotels are readable by authenticated users in hotel" ON public.hotels
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Hotels can be updated by admin" ON public.hotels
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================================
-- 2. GUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id TEXT NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  language VARCHAR DEFAULT 'es' CHECK (language IN ('es', 'en')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(hotel_id, phone)
);

ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guests are readable by authenticated users in hotel" ON public.guests
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Guests can be created by service role" ON public.guests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Guests can be updated" ON public.guests
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_guests_hotel_id ON public.guests(hotel_id);
CREATE INDEX IF NOT EXISTS idx_guests_phone ON public.guests(phone);

-- ============================================================================
-- 3. CONVERSATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id TEXT NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  channel VARCHAR NOT NULL CHECK (channel IN ('whatsapp', 'instagram', 'messenger', 'sandbox')),
  language VARCHAR DEFAULT 'es' CHECK (language IN ('es', 'en')),
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'escalated', 'takeover', 'closed')),
  tags TEXT[] DEFAULT '{}',
  booking_state JSONB DEFAULT NULL,
  current_takeover JSONB DEFAULT NULL,
  closed_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conversations are readable by authenticated users in hotel" ON public.conversations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Conversations can be created by service role" ON public.conversations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Conversations can be updated" ON public.conversations
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_conversations_hotel_id ON public.conversations(hotel_id);
CREATE INDEX IF NOT EXISTS idx_conversations_guest_id ON public.conversations(guest_id);
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON public.conversations(channel);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);

-- ============================================================================
-- 4. MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  message_id TEXT, -- External message ID from Meta/Cloudbeds for dedup
  metadata JSONB DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Messages are readable by authenticated users" ON public.messages
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Messages can be created by service role" ON public.messages
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_message_id ON public.messages(message_id);

-- ============================================================================
-- 5. SEED DATA - Hotel Bernal for testing
-- ============================================================================

INSERT INTO public.hotels (id, name, cloudbeds_property_id, timezone, language)
VALUES (
  'hotel-bernal',
  'Hotel Bernal',
  'bernal-test', 
  'America/Mexico_City',
  'es'
)
ON CONFLICT (id) DO NOTHING;
