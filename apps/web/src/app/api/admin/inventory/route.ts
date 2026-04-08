import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

interface UserContext {
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

  let userRow: { role: string | null; hotel_id: string | null } | null = null;

  const { data: byId } = await admin
    .from('users')
    .select('role, hotel_id')
    .eq('id', user.id)
    .maybeSingle();

  if (byId) {
    userRow = byId;
  } else if (user.email) {
    const { data: byEmail } = await admin
      .from('users')
      .select('role, hotel_id')
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

    const { data, error } = await admin
      .from('inventario_items')
      .select('id, hotel_id, name, description, total_qty, available_qty, busy_qty, reorder_threshold, is_active, busy_items')
      .eq('hotel_id', context.hotelId)
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ hotelId: context.hotelId, items: data || [] });
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
      total_qty?: number;
      reorder_threshold?: number;
    };

    if (!body.name || body.total_qty === undefined || body.reorder_threshold === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { error } = await admin.from('inventario_items').insert({
      hotel_id: context.hotelId,
      name: body.name,
      description: body.description || null,
      total_qty: body.total_qty,
      available_qty: body.total_qty,
      busy_qty: 0,
      reorder_threshold: body.reorder_threshold,
      is_active: true,
      busy_items: [],
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
      action?: 'toggle' | 'adjust' | 'edit' | 'delete';
      is_active?: boolean;
      delta?: number;
      name?: string;
      description?: string | null;
      reorder_threshold?: number;
    };

    if (!body.id || !body.action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
    }

    if (body.action === 'toggle') {
      if (typeof body.is_active !== 'boolean') {
        return NextResponse.json({ error: 'is_active required for toggle' }, { status: 400 });
      }

      const { error } = await admin
        .from('inventario_items')
        .update({ is_active: body.is_active })
        .eq('id', body.id);

      if (error) {
        throw error;
      }
    }

    if (body.action === 'adjust') {
      const delta = Number(body.delta || 0);
      if (!Number.isFinite(delta) || delta === 0) {
        return NextResponse.json({ error: 'Valid delta required' }, { status: 400 });
      }

      const { data: currentItem, error: currentItemError } = await admin
        .from('inventario_items')
        .select('total_qty, available_qty, busy_qty')
        .eq('id', body.id)
        .single();

      if (currentItemError || !currentItem) {
        return NextResponse.json(
          { error: currentItemError?.message || 'Item not found' },
          { status: 404 }
        );
      }

      const nextAvailable = Math.max(0, Number(currentItem.available_qty || 0) + delta);
      const nextTotal = Math.max(Number(currentItem.busy_qty || 0), Number(currentItem.total_qty || 0) + delta);

      const { error } = await admin
        .from('inventario_items')
        .update({
          available_qty: nextAvailable,
          total_qty: nextTotal,
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

      if (typeof body.reorder_threshold === 'number') {
        updates.reorder_threshold = body.reorder_threshold;
      }

      if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No update fields provided' }, { status: 400 });
      }

      const { error } = await admin.from('inventario_items').update(updates).eq('id', body.id);

      if (error) {
        throw error;
      }
    }

    if (body.action === 'delete') {
      const { error } = await admin.from('inventario_items').delete().eq('id', body.id);

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
