import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Use service role key for server-side operations (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price_mxn: number;
  price_usd?: number;
  prep_time_minutes: number;
  image_url?: string;
  section: 'desayuno' | 'comida_cena' | '24_7';
}

interface SectionGroup {
  section: string;
  label: string;
  items: MenuItem[];
}

const SECTION_LABELS: Record<string, string> = {
  desayuno: '🌅 Desayuno',
  comida_cena: '🍽️ Comida & Cena',
  '24_7': '⏰ Disponible 24/7',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  try {
    const { hotelId } = await params;
    console.log('Menu API called with hotelId:', hotelId);
    
    // Try to get hotel: first by exact id, then by name pattern
    let { data: hotelsData } = await supabase
      .from('hotels')
      .select('id');
    
    console.log('All hotels:', hotelsData);
    
    // Find matching hotel
    let resolvedHotelId: string | null = null;
    
    // Try exact UUID match
    const hotelByUUID = hotelsData?.find(h => h.id === hotelId);
    if (hotelByUUID) {
      resolvedHotelId = hotelByUUID.id;
      console.log('Found hotel by UUID:', resolvedHotelId);
    }
    
    // Try name pattern match (hotel-bernal → Hotel Bernal)
    if (!resolvedHotelId && hotelId.includes('-')) {
      const searchName = hotelId
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      console.log('Searching for hotel by name pattern:', searchName);
      
      const { data: hotelsByName } = await supabase
        .from('hotels')
        .select('id, name');
      
      const matchedHotel = hotelsByName?.find(h => 
        h.name?.toLowerCase().includes(searchName.toLowerCase())
      );
      
      if (matchedHotel) {
        resolvedHotelId = matchedHotel.id;
        console.log('Found hotel by name:', resolvedHotelId, matchedHotel.name);
      }
    }
    
    if (!resolvedHotelId) {
      console.log('Hotel not found for hotelId:', hotelId);
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    // Fetch active menu items
    const { data: items, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('hotel_id', resolvedHotelId)
      .eq('is_active', true)
      .order('section', { ascending: true })
      .order('name', { ascending: true });

    console.log('Menu items fetch:', { itemsCount: items?.length, error });

    if (error) {
      console.error('Menu items error:', error);
      return NextResponse.json({ error: 'Failed to fetch menu', details: error }, { status: 500 });
    }

    // Group by section
    const grouped: Record<string, any[]> = {};
    (items || []).forEach((item: any) => {
      const section = item.section || '24_7';
      if (!grouped[section]) {
        grouped[section] = [];
      }
      grouped[section].push(item);
    });

    // Format response with labels
    const sections: SectionGroup[] = Object.entries(grouped).map(([section, sectionItems]) => ({
      section,
      label: SECTION_LABELS[section] || section,
      items: sectionItems,
    }));

    return NextResponse.json(sections);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Menu fetch error:', err, errorMsg);
    return NextResponse.json({ error: 'Internal server error', details: errorMsg }, { status: 500 });
  }
}
