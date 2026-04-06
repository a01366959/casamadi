import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { logger } from './logger.js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Get hotel UUID by slug (called hotel_id in API)
 * hotel_id parameter is actually the slug (e.g. "hotel-bernal")
 */
export async function getHotelUuid(hotel_slug: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('hotels')
      .select('id')
      .eq('slug', hotel_slug)
      .single();

    if (error) {
      logger.error({ hotel_slug, error }, 'Failed to resolve hotel slug to UUID');
      throw error;
    }

    return data.id;
  } catch (err) {
    logger.error({ hotel_slug, err }, 'Hotel slug resolution error');
    throw err;
  }
}

/**
 * Get hotel configuration from database
 */
export async function getHotelConfig(hotel_id: string) {
  try {
    // hotel_id is actually the slug, resolve to UUID first
    const hotelUuid = await getHotelUuid(hotel_id);

    const { data, error } = await supabase
      .from('hotels')
      .select('*')
      .eq('id', hotelUuid)
      .single();

    if (error) {
      logger.error({ hotel_id, error }, 'Failed to get hotel config');
      throw error;
    }

    return data;
  } catch (err) {
    logger.error({ hotel_id, err }, 'Hotel config fetch error');
    throw err;
  }
}

/**
 * Get or create guest by phone
 * Returns guest object with id
 */
export async function getOrCreateGuest(
  hotel_slug: string,
  guest_phone: string,
  channel: string = 'sandbox'
) {
  try {
    // 1. Resolve hotel slug to UUID
    const hotelUuid = await getHotelUuid(hotel_slug);

    // 2. Try to find existing guest
    let { data: guest, error: findError } = await supabase
      .from('guests')
      .select('id')
      .eq('hotel_id', hotelUuid)
      .eq('phone', guest_phone)
      .single();

    // If not found, create new guest
    if (findError?.code === 'PGRST116' || !guest) {
      logger.info({ hotel_slug, hotelUuid, guest_phone }, 'Creating new guest');

      const { data: newGuest, error: createError } = await supabase
        .from('guests')
        .insert({
          id: randomUUID(),
          hotel_id: hotelUuid,
          phone: guest_phone,
          channel,
          channel_user_id: guest_phone, // Use phone as channel ID for sandbox
        })
        .select('id')
        .single();

      if (createError) {
        logger.error({ hotel_slug, guest_phone, createError }, 'Failed to create guest');
        throw createError;
      }

      guest = newGuest;
    }

    return guest;
  } catch (err) {
    logger.error({ hotel_slug, guest_phone, err }, 'Guest fetch/create error');
    throw err;
  }
}

/**
 * Get or create conversation
 * hotel_id parameter is actually the hotel slug (e.g. "hotel-bernal")
 */
export async function getOrCreateConversation(
  hotel_slug: string,
  guest_phone: string,
  channel: string
) {
  try {
    // 1. Resolve hotel slug to UUID
    const hotelUuid = await getHotelUuid(hotel_slug);

    // 2. Get or create guest
    const guest = await getOrCreateGuest(hotel_slug, guest_phone, channel);

    if (!guest || !guest.id) {
      throw new Error('Failed to get/create guest');
    }

    // 3. Try to find existing active conversation
    let { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('hotel_id', hotelUuid)
      .eq('guest_id', guest.id)
      .eq('channel', channel)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // If no active conversation, create one
    if (convError?.code === 'PGRST116' || !conversation) {
      logger.info(
        { hotel_slug, hotelUuid, guest_id: guest.id, channel },
        'Creating new conversation'
      );

      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          hotel_id: hotelUuid,
          guest_id: guest.id,
          channel,
          status: 'active',
          language: 'es',
          tags: [],
        })
        .select()
        .single();

      if (createError) {
        logger.error({ hotel_slug, guest_id: guest.id, createError }, 'Failed to create conversation');
        throw createError;
      }

      conversation = newConv;
    }

    return conversation;
  } catch (err) {
    logger.error({ hotel_slug, guest_phone, channel, err }, 'Conversation fetch/create error');
    throw err;
  }
}

/**
 * Legacy function for backward compatibility - use getOrCreateGuest instead
 */
export async function getOrCreateGuestUser(
  hotel_id: string,
  guest_phone: string
) {
  return getOrCreateGuest(hotel_id, guest_phone, 'sandbox');
}

/**
 * Get conversation history (last 20 messages)
 */
export async function getConversationHistory(conversation_id: string) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true })
      .limit(20);

    if (error) {
      logger.error({ conversation_id, error }, 'Failed to get history');
      throw error;
    }

    return data || [];
  } catch (err) {
    logger.error({ conversation_id, err }, 'History fetch error');
    throw err;
  }
}

/**
 * Store incoming guest message
 */
export async function storeIncomingMessage(
  conversation_id: string,
  content: string,
  channel_message_id?: string
) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        role: 'user',
        content,
        channel_message_id,
      })
      .select()
      .single();

    if (error) {
      logger.error({ conversation_id, error }, 'Failed to store incoming message');
      throw error;
    }

    return data;
  } catch (err) {
    logger.error({ conversation_id, err }, 'Store message error');
    throw err;
  }
}

/**
 * Store agent reply
 */
export async function storeAgentReply(
  conversation_id: string,
  content: string,
  metadata?: Record<string, any>
) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        role: 'assistant',
        content,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      logger.error({ conversation_id, error }, 'Failed to store reply message');
      throw error;
    }

    return data;
  } catch (err) {
    logger.error({ conversation_id, err }, 'Store reply error');
    throw err;
  }
}

/**
 * Update conversation metadata
 */
export async function updateConversation(
  conversation_id: string,
  updates: Record<string, any>
) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation_id)
      .select()
      .single();

    if (error) {
      logger.error({ conversation_id, error }, 'Failed to update conversation');
      throw error;
    }

    return data;
  } catch (err) {
    logger.error({ conversation_id, err }, 'Update conversation error');
    throw err;
  }
}
