import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface SandboxConversationPayload {
  hotel_id?: string;
  phone?: string;
  channel?: 'sandbox' | 'whatsapp' | 'instagram' | 'messenger';
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SandboxConversationPayload;
    const { hotel_id, phone, channel = 'sandbox' } = body;

    if (!hotel_id || !phone) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: hotel_id, phone' },
        { status: 400 }
      );
    }

    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:5001';

    try {
      const response = await fetch(`${agentUrl}/api/sandbox/conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hotel_id,
          phone,
          channel,
        }),
      });

      const data = await response.json();

      if (response.ok && data?.conversation_id) {
        return NextResponse.json({
          success: true,
          conversation_id: data.conversation_id,
          status: data.status,
          language: data.language || 'es',
        });
      }
    } catch {
      // Fall through to direct Supabase creation for local/dev resilience.
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { success: false, error: 'Supabase credentials missing for fallback conversation creation' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: existingGuest, error: guestFindError } = await supabase
      .from('guests')
      .select('id')
      .eq('hotel_id', hotel_id)
      .eq('phone', phone)
      .maybeSingle();

    if (guestFindError) {
      return NextResponse.json(
        { success: false, error: guestFindError.message },
        { status: 500 }
      );
    }

    let guestId = existingGuest?.id;
    if (!guestId) {
      const { data: createdGuest, error: guestCreateError } = await supabase
        .from('guests')
        .insert({
          hotel_id,
          phone,
        })
        .select('id')
        .single();

      if (guestCreateError || !createdGuest?.id) {
        return NextResponse.json(
          { success: false, error: guestCreateError?.message || 'Failed to create guest' },
          { status: 500 }
        );
      }

      guestId = createdGuest.id;
    }

    const { data: existingConversation, error: convFindError } = await supabase
      .from('conversations')
      .select('id, status, language')
      .eq('hotel_id', hotel_id)
      .eq('guest_id', guestId)
      .eq('channel', channel)
      .in('status', ['active', 'human_active', 'takeover', 'escalated'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convFindError) {
      return NextResponse.json(
        { success: false, error: convFindError.message },
        { status: 500 }
      );
    }

    if (existingConversation?.id) {
      return NextResponse.json({
        success: true,
        conversation_id: existingConversation.id,
        status: existingConversation.status,
        language: existingConversation.language || 'es',
      });
    }

    const { data: createdConversation, error: convCreateError } = await supabase
      .from('conversations')
      .insert({
        hotel_id,
        guest_id: guestId,
        channel,
        status: 'active',
        language: 'es',
        tags: [],
      })
      .select('id, status, language')
      .single();

    if (convCreateError || !createdConversation?.id) {
      return NextResponse.json(
        { success: false, error: convCreateError?.message || 'Failed to create conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation_id: createdConversation.id,
      status: createdConversation.status,
      language: createdConversation.language || 'es',
    });
  } catch (error) {
    console.error('Sandbox conversation init error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
