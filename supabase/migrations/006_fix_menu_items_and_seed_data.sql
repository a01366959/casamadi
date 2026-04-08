-- Casamadi Migration 006: Fix menu_items schema and add seed data
-- Created: April 2026
-- Purpose: Fix hotel_id column type in menu_items and add sample menu for Hotel Bernal

-- ============================================================================
-- 1. DROP AND RECREATE menu_items WITH CORRECT SCHEMA
-- ============================================================================

-- Drop dependent objects first
DROP TABLE IF EXISTS public.menu_items CASCADE;

-- Recreate with TEXT hotel_id to match hotels.id type
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id TEXT NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_hotel_id ON public.menu_items(hotel_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_section ON public.menu_items(section);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_active ON public.menu_items(is_active);

-- Enable RLS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. RLS POLICIES FOR menu_items
-- ============================================================================

CREATE POLICY menu_items_select_anon ON public.menu_items FOR SELECT
  USING (is_active = true);

CREATE POLICY menu_items_select_hotel ON public.menu_items FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.hotel_id = menu_items.hotel_id
    )
  );

CREATE POLICY menu_items_insert_hotel ON public.menu_items FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.hotel_id = menu_items.hotel_id AND u.role = 'admin'
    )
  );

CREATE POLICY menu_items_update_hotel ON public.menu_items FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.hotel_id = menu_items.hotel_id AND u.role = 'admin'
    )
  );

-- ============================================================================
-- 3. SEED DATA: Menu items for Hotel Bernal
-- ============================================================================

-- Insert menu items for Hotel Bernal (hotel-bernal)
INSERT INTO public.menu_items (hotel_id, name, description, price_mxn, price_usd, section, prep_time_minutes, is_active) VALUES
-- Breakfast items
('hotel-bernal', 'Café Americano', 'Taza de café americano recién hecho', 45, 2.50, 'desayuno', 5, true),
('hotel-bernal', 'Café Capuccino', 'Capuccino con leche espumada y canela', 65, 3.50, 'desayuno', 8, true),
('hotel-bernal', 'Desayuno Completo', 'Huevos revueltos, pan tostado, jugo y café', 180, 10, 'desayuno', 15, true),
('hotel-bernal', 'Omelette de Queso', 'Omelette rellena de queso oaxaca', 150, 8, 'desayuno', 12, true),
('hotel-bernal', 'Jugo de Naranja Fresco', 'Jugo recién exprimido de naranjas frescas', 50, 3, 'desayuno', 5, true),
('hotel-bernal', 'Tostadas Francesas', 'Tostadas francesas con miel y frutas frescas', 120, 6.50, 'desayuno', 10, true),

-- Lunch & Dinner items
('hotel-bernal', 'Ceviche de Camarón', 'Camarones frescos marinados en limón', 280, 15, 'comida_cena', 20, true),
('hotel-bernal', 'Tacos al Pastor', 'Tres tacos con carne de cerdo marinada (porción)', 150, 8, 'comida_cena', 12, true),
('hotel-bernal', 'Enchiladas Verdes', 'Enchiladas rellenas de pollo con salsa verde', 200, 11, 'comida_cena', 15, true),
('hotel-bernal', 'Chile Relleno de Queso', 'Poblano relleno de queso Oaxaca con salsa roja', 180, 10, 'comida_cena', 12, true),
('hotel-bernal', 'Milanesa de Pollo', 'Pechuga de pollo empanizada con papas y ensalada', 220, 12, 'comida_cena', 15, true),
('hotel-bernal', 'Salmón a la Mantequilla', 'Filete de salmón con salsa de mantequilla y hierbas', 320, 17, 'comida_cena', 18, true),
('hotel-bernal', 'Quesadillas Surtidas', 'Quesadillas con queso, pollo o champiñones (3 piezas)', 140, 7.50, 'comida_cena', 10, true),
('hotel-bernal', 'Arrachera', 'Carne asada con cebolla y pimientos', 350, 19, 'comida_cena', 20, true),
('hotel-bernal', 'Ensalada Caprese', 'Tomate, mozzarella fresca y albahaca', 160, 8.50, 'comida_cena', 8, true),
('hotel-bernal', 'Flan de Cajeta', 'Postre tradicional mexicano de cajeta', 80, 4.50, 'comida_cena', 5, true),

-- 24/7 items
('hotel-bernal', 'Agua Embotellada', 'Botella de agua purificada (500ml)', 30, 1.50, '24_7', 2, true),
('hotel-bernal', 'Refresco (Coca, Sprite, Fanta)', 'Lata o botella de refresco', 40, 2.50, '24_7', 2, true),
('hotel-bernal', 'Botana Mixta', 'Papas, cacahuates y chiles piquantes', 60, 3, '24_7', 5, true),
('hotel-bernal', 'Sándwich de Jamón y Queso', 'Pan de molde con jamón de pavo y queso',  100, 5, '24_7', 8, true),
('hotel-bernal', 'Chocolate Caliente', 'Chocolate mexicano con leche caliente y pan tostado', 70, 4, '24_7', 8, true),
('hotel-bernal', 'Frutas Frescas', 'Selección de frutas de temporada', 90, 5, '24_7', 5, true),
('hotel-bernal', 'Yogurt Griego', 'Yogurt griego con granola y miel', 85, 4.50, '24_7', 3, true),
('hotel-bernal', 'Nueces de la Casa', 'Mix de nueces y deshidratados', 75, 4, '24_7', 2, true);

-- ============================================================================
-- 3. COMMENT
-- ============================================================================

COMMENT ON TABLE public.menu_items IS 'Hotel menu items (time-based: desayuno, comida_cena, 24_7)';
