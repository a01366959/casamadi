import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

interface UserContext {
  id: string;
  email: string | null;
  role: string | null;
  hotelId: string | null;
}

async function resolveUserContext(): Promise<UserContext | null> {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  let userRow: { email: string | null; role: string | null; hotel_id: string | null } | null = null;

  const { data: byId } = await admin
    .from('users')
    .select('email, role, hotel_id')
    .eq('id', user.id)
    .maybeSingle();

  if (byId) {
    userRow = byId;
  } else if (user.email) {
    const { data: byEmail } = await admin
      .from('users')
      .select('email, role, hotel_id')
      .eq('email', user.email)
      .maybeSingle();

    if (byEmail) {
      userRow = byEmail;
    }
  }

  let hotelId = userRow?.hotel_id || null;
  if (!hotelId) {
    const { data: firstHotel } = await admin
      .from('hotels')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    hotelId = firstHotel?.id || null;
  }

  return {
    id: user.id,
    email: user.email || userRow?.email || null,
    role: userRow?.role || null,
    hotelId,
  };
}

export async function GET() {
  try {
    const admin = createAdminClient();
    const context = await resolveUserContext();

    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (context.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!context.hotelId) {
      return NextResponse.json({ error: 'No hotel configured' }, { status: 400 });
    }

    let sourceHotelId = context.hotelId;

    const { data: initialItems, error } = await admin
      .from('menu_items')
      .select('id, hotel_id, name, description, image_url, price_mxn, section, prep_time_minutes, is_active, deactivated_until')
      .eq('hotel_id', sourceHotelId)
      .order('section', { ascending: true })
      .order('name', { ascending: true });

    let items = initialItems;

    if (error) {
      throw error;
    }

    if ((!items || items.length === 0) && sourceHotelId !== 'hotel-bernal') {
      const { data: fallbackItems, error: fallbackError } = await admin
        .from('menu_items')
        .select('id, hotel_id, name, description, image_url, price_mxn, section, prep_time_minutes, is_active, deactivated_until')
        .eq('hotel_id', 'hotel-bernal')
        .order('section', { ascending: true })
        .order('name', { ascending: true });

      if (!fallbackError && fallbackItems && fallbackItems.length > 0) {
        items = fallbackItems;
        sourceHotelId = 'hotel-bernal';
      }
    }

    return NextResponse.json({
      hotelId: sourceHotelId,
      items: items || [],
      contextHotelId: context.hotelId,
      fallbackUsed: sourceHotelId !== context.hotelId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const context = await resolveUserContext();

    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (context.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!context.hotelId) {
      return NextResponse.json({ error: 'No hotel configured' }, { status: 400 });
    }

    const body = (await request.json()) as {
      name?: string;
      description?: string;
      image_url?: string | null;
      price_mxn?: number;
      section?: 'desayuno' | 'comida_cena' | '24_7';
      prep_time_minutes?: number;
    };

    if (!body.name || !body.section || !body.price_mxn || !body.prep_time_minutes) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { error } = await admin.from('menu_items').insert({
      hotel_id: context.hotelId,
      name: body.name,
      description: body.description || null,
      image_url: body.image_url || null,
      price_mxn: body.price_mxn,
      section: body.section,
      prep_time_minutes: body.prep_time_minutes,
      is_active: true,
      deactivated_until: null,
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const context = await resolveUserContext();

    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (context.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as {
      id?: string;
      action?: 'toggle' | 'disable_week' | 'reactivate' | 'edit' | 'delete';
      is_active?: boolean;
      name?: string;
      description?: string | null;
      image_url?: string | null;
      price_mxn?: number;
      section?: 'desayuno' | 'comida_cena' | '24_7';
      prep_time_minutes?: number;
    };

    if (!body.id || !body.action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
    }

    if (body.action === 'toggle') {
      if (typeof body.is_active !== 'boolean') {
        return NextResponse.json({ error: 'is_active required for toggle' }, { status: 400 });
      }

      const { error } = await admin
        .from('menu_items')
        .update({
          is_active: body.is_active,
          deactivated_until: body.is_active ? null : undefined,
        })
        .eq('id', body.id);

      if (error) {
        throw error;
      }
    }

    if (body.action === 'disable_week') {
      const deactivatedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await admin
        .from('menu_items')
        .update({
          is_active: false,
          deactivated_until: deactivatedUntil,
        })
        .eq('id', body.id);

      if (error) {
        throw error;
      }
    }

    if (body.action === 'reactivate') {
      const { error } = await admin
        .from('menu_items')
        .update({
          is_active: true,
          deactivated_until: null,
        })
        .eq('id', body.id);

      if (error) {
        throw error;
      }
    }

    if (body.action === 'edit') {
      const updates: Record<string, unknown> = {};

      if (typeof body.name === 'string' && body.name.trim().length > 0) {
        updates.name = body.name.trim();
      }

      if (body.description !== undefined) {
        updates.description = body.description || null;
      }

      if (body.image_url !== undefined) {
        updates.image_url = body.image_url || null;
      }

      if (typeof body.price_mxn === 'number') {
        updates.price_mxn = body.price_mxn;
      }

      if (body.section) {
        updates.section = body.section;
      }

      if (typeof body.prep_time_minutes === 'number') {
        updates.prep_time_minutes = body.prep_time_minutes;
      }

      if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No update fields provided' }, { status: 400 });
      }

      const { error } = await admin.from('menu_items').update(updates).eq('id', body.id);

      if (error) {
        throw error;
      }
    }

    if (body.action === 'delete') {
      const { error } = await admin.from('menu_items').delete().eq('id', body.id);

      if (error) {
        throw error;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
