/**
 * Tool system for LLM agent
 * 
 * The LLM can invoke these tools by returning tool calls in its response.
 * Tools are executed in order and results are passed back to LLM.
 */

import { logger } from '../services/logger.js';
import { supabase } from '../services/supabase.js';

// ==================== Tool Definitions ====================

export const CHECK_AVAILABILITY_TOOL = {
  name: 'check_availability',
  description: 'Check available rooms in the hotel for specific dates and number of guests',
  inputSchema: {
    type: 'object',
    properties: {
      check_in: {
        type: 'string',
        format: 'date',
        description: 'Check-in date (YYYY-MM-DD)',
      },
      check_out: {
        type: 'string',
        format: 'date',
        description: 'Check-out date (YYYY-MM-DD)',
      },
      num_guests: {
        type: 'integer',
        minimum: 1,
        maximum: 10,
        description: 'Number of guests',
      },
      room_type_id: {
        type: 'string',
        description: 'Optional: specific room type ID to check (from Cloudbeds)',
      },
    },
    required: ['check_in', 'check_out', 'num_guests'],
  },
};

export const GET_ROOM_DETAILS_TOOL = {
  name: 'get_room_details',
  description: 'Get detailed information about a specific room type (price, amenities, capacity)',
  inputSchema: {
    type: 'object',
    properties: {
      room_type_id: {
        type: 'string',
        description: 'The Cloudbeds room type identifier',
      },
    },
    required: ['room_type_id'],
  },
};

export const CREATE_RESERVATION_TOOL = {
  name: 'create_reservation',
  description: 'Create a new reservation in Cloudbeds',
  inputSchema: {
    type: 'object',
    properties: {
      room_type_id: {
        type: 'string',
        description: 'The room type being booked',
      },
      check_in: {
        type: 'string',
        format: 'date',
        description: 'Check-in date (YYYY-MM-DD)',
      },
      check_out: {
        type: 'string',
        format: 'date',
        description: 'Check-out date (YYYY-MM-DD)',
      },
      guest_name: {
        type: 'string',
        description: 'Full name',
      },
      guest_email: {
        type: 'string',
        format: 'email',
        description: 'Email address',
      },
      guest_phone: {
        type: 'string',
        description: 'Phone number (with country code when applicable)',
      },
      num_guests: {
        type: 'integer',
        description: 'Number of guests',
      },
      special_requests: {
        type: 'string',
        description: 'Optional: special requests or notes',
      },
    },
    required: ['room_type_id', 'check_in', 'check_out', 'guest_name', 'guest_email', 'guest_phone', 'num_guests'],
  },
};

export const VERIFY_PAYMENT_TOOL = {
  name: 'verify_payment',
  description: 'Verify payment status for a reservation',
  inputSchema: {
    type: 'object',
    properties: {
      reservation_id: {
        type: 'string',
        description: 'The reservation ID from Cloudbeds',
      },
    },
    required: ['reservation_id'],
  },
};

export const GET_MENU_TOOL = {
  name: 'get_menu',
  description: 'Get the hotel menu items for room service orders',
  inputSchema: {
    type: 'object',
    properties: {
      section: {
        type: 'string',
        enum: ['desayuno', 'comida_cena', '24_7', 'all'],
        description: 'Menu section to retrieve: desayuno (breakfast), comida_cena (lunch/dinner), 24_7 (always available), or all',
      },
    },
    required: [],
  },
};

export const COLLECT_ROOM_TOOL = {
  name: 'collect_room',
  description: 'Store the guest room number in the session - CALL THIS FIRST when guest provides their room number',
  inputSchema: {
    type: 'object',
    properties: {
      room_number: {
        type: 'string',
        description: 'The guest room number (e.g., "101", "205A")',
      },
    },
    required: ['room_number'],
  },
};

export const TRACK_ORDER_TOOL = {
  name: 'track_order',
  description: 'Save a food/beverage order from the guest to the session order summary',
  inputSchema: {
    type: 'object',
    properties: {
      item_name: {
        type: 'string',
        description: 'Name of the item ordered (e.g., "Café Americano")',
      },
      quantity: {
        type: 'integer',
        minimum: 1,
        description: 'Number of items',
      },
      special_instructions: {
        type: 'string',
        description: 'Optional special instructions (e.g., "sin azúcar", "extra limón")',
      },
    },
    required: ['item_name', 'quantity'],
  },
};

export const CREATE_TASK_TOOL = {
  name: 'create_task',
  description: 'Create a housekeeping or maintenance task for staff (towels, maintenance, etc.)',
  inputSchema: {
    type: 'object',
    properties: {
      task_type: {
        type: 'string',
        enum: ['extra_towel', 'extra_linens', 'maintenance', 'cleaning', 'urgent'],
        description: 'Type of task: extra_towel, extra_linens, maintenance, cleaning, or urgent',
      },
      description: {
        type: 'string',
        description: 'Detailed description of what is needed (e.g., "2 extra bath towels", "shower not working")',
      },
      urgency: {
        type: 'string',
        enum: ['normal', 'high'],
        description: 'Urgency level: normal or high (for "urgent" tasks)',
      },
    },
    required: ['task_type', 'description'],
  },
};

// ==================== Tool Registry ====================

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  name: string;
  result: string | Record<string, any>;
  error?: string;
}

/**
 * Execute a tool call
 */
export async function executeTool(
  toolCall: ToolCall,
  context: {
    hotel_id: string;
    conversation_id: string;
  }
): Promise<ToolResult> {
  const { name, arguments: args } = toolCall;
  const { hotel_id, conversation_id } = context;

  logger.debug(
    { hotel_id, conversation_id, toolName: name, args },
    'Executing tool'
  );

  try {
    switch (name) {
      case 'check_availability':
        return await handleCheckAvailability(args, context);

      case 'get_room_details':
        return await handleGetRoomDetails(args, context);

      case 'create_reservation':
        return await handleCreateReservation(args, context);

      case 'verify_payment':
        return await handleVerifyPayment(args, context);

      case 'get_menu':
        return await handleGetMenu(args, context);

      case 'collect_room':
        return await handleCollectRoom(args, context);

      case 'track_order':
        return await handleTrackOrder(args, context);

      case 'create_task':
        return await handleCreateTask(args, context);

      default:
        return {
          name,
          result: `Unknown tool: ${name}`,
          error: 'UNKNOWN_TOOL',
        };
    }
  } catch (err) {
    logger.error({ hotel_id, conversation_id, toolName: name, err }, 'Tool execution failed');
    return {
      name,
      result: `Tool execution failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      error: 'TOOL_ERROR',
    };
  }
}

// ==================== Tool Handlers ====================

/**
 * Check room availability for dates
 * TODO: Connect to Cloudbeds API
 */
async function handleCheckAvailability(
  args: Record<string, any>,
  context: { hotel_id: string; conversation_id: string }
): Promise<ToolResult> {
  const { check_in, check_out, num_guests, room_type_id } = args;

  logger.debug(
    {
      hotel_id: context.hotel_id,
      check_in,
      check_out,
      num_guests,
      room_type_id,
    },
    'Checking availability'
  );

  // TODO: Implement Cloudbeds API call
  // For now, return mock data
  return {
    name: 'check_availability',
    result: {
      check_in,
      check_out,
      num_guests,
      available_rooms: [
        {
          id: 'room-type-1',
          name: 'Standard Room',
          price: 150,
          currency: 'MXN',
          qty_available: 3,
        },
        {
          id: 'room-type-2',
          name: 'Deluxe Room',
          price: 220,
          currency: 'MXN',
          qty_available: 1,
        },
      ],
    },
  };
}

/**
 * Get details about a room type
 * TODO: Connect to Cloudbeds API
 */
async function handleGetRoomDetails(
  args: Record<string, any>,
  context: { hotel_id: string; conversation_id: string }
): Promise<ToolResult> {
  const { room_type_id } = args;

  logger.debug(
    { hotel_id: context.hotel_id, room_type_id },
    'Getting room details'
  );

  // TODO: Implement Cloudbeds API call
  // For now, return mock data
  return {
    name: 'get_room_details',
    result: {
      id: room_type_id,
      name: 'Standard Room',
      description: 'Comfortable room with queen bed, private bathroom, WiFi',
      capacity: 2,
      amenities: ['WiFi', 'AC', 'Private Bathroom', 'TV', 'Mini Bar'],
      price: 150,
      currency: 'MXN',
    },
  };
}

/**
 * Create a reservation in Cloudbeds
 * TODO: Connect to Cloudbeds API
 */
async function handleCreateReservation(
  args: Record<string, any>,
  context: { hotel_id: string; conversation_id: string }
): Promise<ToolResult> {
  const {
    room_type_id,
    check_in,
    check_out,
    guest_name,
    guest_email,
    guest_phone,
    num_guests,
    special_requests,
  } = args;

  logger.debug(
    {
      hotel_id: context.hotel_id,
      room_type_id,
      check_in,
      check_out,
      guest_name,
    },
    'Creating reservation'
  );

  // TODO: Implement Cloudbeds API call
  // For now, return mock data
  return {
    name: 'create_reservation',
    result: {
      reservation_id: 'RES-12345',
      status: 'pending_payment',
      payment_link: 'https://payments.example.com/pay/RES-12345',
      total_price: 450,
      currency: 'MXN',
      message: 'Reservation created. Please complete payment to confirm.',
    },
  };
}

/**
 * Verify payment for a reservation
 * TODO: Connect to Cloudbeds Payments API
 */
async function handleVerifyPayment(
  args: Record<string, any>,
  context: { hotel_id: string; conversation_id: string }
): Promise<ToolResult> {
  const { reservation_id } = args;

  logger.debug(
    { hotel_id: context.hotel_id, reservation_id },
    'Verifying payment'
  );

  // TODO: Implement Cloudbeds Payments API call
  // For now, return mock data
  return {
    name: 'verify_payment',
    result: {
      reservation_id,
      status: 'confirmed',
      payment_status: 'paid',
      confirmation_date: new Date().toISOString(),
    },
  };
}

/**
 * Get hotel menu items for room service
 */
async function handleGetMenu(
  args: Record<string, any>,
  context: { hotel_id: string; conversation_id: string }
): Promise<ToolResult> {
  const { section } = args;

  logger.debug(
    { hotel_id: context.hotel_id, section },
    'Fetching menu'
  );

  try {
    // Fetch menu items from database
    let query = supabase
      .from('menu_items')
      .select('id, name, description, price_mxn, price_usd, prep_time_minutes, section, image_url')
      .eq('hotel_id', context.hotel_id)
      .eq('is_active', true)
      .order('section', { ascending: true })
      .order('name', { ascending: true });

    // Filter by section if specified and not 'all'
    if (section && section !== 'all') {
      query = query.eq('section', section);
    }

    const { data: items, error } = await query;

    if (error) {
      logger.error(
        { hotel_id: context.hotel_id, error },
        'Failed to fetch menu items'
      );
      return {
        name: 'get_menu',
        result: 'Unable to retrieve menu at this time',
        error: 'MENU_FETCH_ERROR',
      };
    }

    if (!items || items.length === 0) {
      return {
        name: 'get_menu',
        result: 'No menu items available',
      };
    }

    // Format menu for display
    const menuText = formatMenuForDisplay(
      items as Array<{
        id: string;
        name: string;
        description: string;
        price_mxn: number;
        price_usd?: number;
        prep_time_minutes: number;
        section: string;
        image_url?: string;
      }>
    );

    return {
      name: 'get_menu',
      result: {
        items_count: items.length,
        menu_text: menuText,
        menu_link: buildMenuLink(context.hotel_id),
        message: `Aquí está nuestro menú con ${items.length} opciones disponibles.`,
      },
    };
  } catch (err) {
    logger.error(
      { hotel_id: context.hotel_id, err },
      'Menu fetch error'
    );
    return {
      name: 'get_menu',
      result: 'Error retrieving menu',
      error: 'MENU_ERROR',
    };
  }
}

/**
 * Format menu items as readable text
 */
function formatMenuForDisplay(
  items: Array<{
    id: string;
    name: string;
    description: string;
    price_mxn: number;
    prep_time_minutes: number;
    section: string;
  }>
): string {
  const sections: Record<string, any[]> = {};
  const sectionLabels: Record<string, string> = {
    desayuno: '🌅 Desayuno',
    comida_cena: '🍽️ Comida & Cena',
    '24_7': '⏰ Disponible 24/7',
  };

  // Group by section
  items.forEach((item) => {
    if (!sections[item.section]) {
      sections[item.section] = [];
    }
    sections[item.section].push(item);
  });

  // Format as text
  let text = 'MENÚ DEL HOTEL\n\n';

  Object.entries(sections).forEach(([sectionKey, sectionItems]) => {
    text += `${sectionLabels[sectionKey] || sectionKey}\n`;
    text += '─'.repeat(40) + '\n';

    (sectionItems as any[]).forEach((item) => {
      text += `${item.name} - $${item.price_mxn.toFixed(0)} MXN\n`;
      if (item.description) {
        text += `  ${item.description}\n`;
      }
      text += `  ⏱️ Prep: ${item.prep_time_minutes} min\n`;
      text += '\n';
    });
  });

  return text;
}

/**
 * Build public menu link for guest
 */
function buildMenuLink(hotel_id: string): string {
  const baseUrl = process.env.PUBLIC_WEB_URL || 'https://casamadi.mx';
  return `${baseUrl}/guests/menu/${hotel_id}`;
}

/**
 * Collect and store guest room number
 */
async function handleCollectRoom(
  args: Record<string, any>,
  context: { hotel_id: string; conversation_id: string }
): Promise<ToolResult> {
  const { room_number } = args;

  logger.debug(
    { hotel_id: context.hotel_id, conversation_id: context.conversation_id, room_number },
    'Collecting room number'
  );

  try {
    // Update conversation with room number
    const { data, error } = await supabase
      .from('conversations')
      .update({ room_number: String(room_number) })
      .eq('id', context.conversation_id)
      .select('id, room_number')
      .single();

    if (error) {
      logger.error(
        { hotel_id: context.hotel_id, conversation_id: context.conversation_id, error },
        'Failed to store room number'
      );
      return {
        name: 'collect_room',
        result: 'Unable to store room number',
        error: 'ROOM_STORAGE_ERROR',
      };
    }

    logger.debug(
      { hotel_id: context.hotel_id, conversation_id: context.conversation_id, room_number },
      'Room number stored successfully'
    );

    return {
      name: 'collect_room',
      result: {
        status: 'success',
        room_number,
        message: `Perfecto, tenemos registrada la habitación ${room_number}. ¿Cómo puedo ayudarte?`,
      },
    };
  } catch (err) {
    logger.error(
      { hotel_id: context.hotel_id, conversation_id: context.conversation_id, err },
      'Room collection error'
    );
    return {
      name: 'collect_room',
      result: 'Error recording room number',
      error: 'ROOM_ERROR',
    };
  }
}

/**
 * Track order items in session
 */
async function handleTrackOrder(
  args: Record<string, any>,
  context: { hotel_id: string; conversation_id: string }
): Promise<ToolResult> {
  const { item_name, quantity, special_instructions } = args;

  logger.debug(
    { hotel_id: context.hotel_id, conversation_id: context.conversation_id, item_name, quantity },
    'Tracking order'
  );

  try {
    // Fetch current conversation
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('orders_summary')
      .eq('id', context.conversation_id)
      .single();

    if (fetchError) {
      logger.error(
        { hotel_id: context.hotel_id, conversation_id: context.conversation_id, error: fetchError },
        'Failed to fetch conversation'
      );
      return {
        name: 'track_order',
        result: 'Unable to track order',
        error: 'FETCH_ERROR',
      };
    }

    // Get current orders
    const currentOrders = (conversation?.orders_summary || []) as Array<{
      item_name: string;
      quantity: number;
      special_instructions?: string;
      added_at: string;
    }>;

    // Add new order
    const newOrder = {
      item_name,
      quantity,
      special_instructions: special_instructions || undefined,
      added_at: new Date().toISOString(),
    };

    currentOrders.push(newOrder);

    // Update conversation with new orders
    const { data, error: updateError } = await supabase
      .from('conversations')
      .update({ orders_summary: currentOrders })
      .eq('id', context.conversation_id)
      .select('orders_summary')
      .single();

    if (updateError) {
      logger.error(
        { hotel_id: context.hotel_id, conversation_id: context.conversation_id, error: updateError },
        'Failed to save order'
      );
      return {
        name: 'track_order',
        result: 'Unable to save order',
        error: 'SAVE_ERROR',
      };
    }

    logger.debug(
      { hotel_id: context.hotel_id, conversation_id: context.conversation_id, item_name, quantity },
      'Order tracked successfully'
    );

    // Format order summary
    const ordersSummary = formatOrderSummary(currentOrders);

    return {
      name: 'track_order',
      result: {
        status: 'success',
        item_name,
        quantity,
        total_items_ordered: currentOrders.length,
        orders_summary: ordersSummary,
        message: `Recorded ${quantity} ${item_name}${quantity > 1 ? 's' : ''} for your room.`,
      },
    };
  } catch (err) {
    logger.error(
      { hotel_id: context.hotel_id, conversation_id: context.conversation_id, err },
      'Order tracking error'
    );
    return {
      name: 'track_order',
      result: 'Error tracking order',
      error: 'TRACK_ERROR',
    };
  }
}

/**
 * Format order summary as readable text
 */
function formatOrderSummary(orders: Array<{ item_name: string; quantity: number; special_instructions?: string }>): string {
  let summary = 'Your order:\n';
  orders.forEach((order, index) => {
    summary += `${index + 1}. ${order.quantity}x ${order.item_name}`;
    if (order.special_instructions) {
      summary += ` (${order.special_instructions})`;
    }
    summary += '\n';
  });
  return summary;
}

/**
 * Create a housekeeping/maintenance task
 */
async function handleCreateTask(
  args: Record<string, any>,
  context: { hotel_id: string; conversation_id: string }
): Promise<ToolResult> {
  const { task_type, description, urgency } = args;

  logger.debug(
    { hotel_id: context.hotel_id, conversation_id: context.conversation_id, task_type, description },
    'Creating task'
  );

  try {
    // Fetch conversation to get room number and guest info
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('room_number')
      .eq('id', context.conversation_id)
      .single();

    if (fetchError) {
      logger.error(
        { hotel_id: context.hotel_id, conversation_id: context.conversation_id, error: fetchError },
        'Failed to fetch conversation'
      );
      return {
        name: 'create_task',
        result: 'Unable to create task: could not fetch room information',
        error: 'FETCH_ERROR',
      };
    }

    if (!conversation?.room_number) {
      return {
        name: 'create_task',
        result: 'Cannot create task without room number. Please provide your room number first.',
        error: 'NO_ROOM',
      };
    }

    // Create task in database
    const { data: task, error: createError } = await supabase
      .from('tareas')
      .insert({
        hotel_id: context.hotel_id,
        cloudbeds_room_id: conversation.room_number,
        conversation_id: context.conversation_id,
        task_type,
        description,
        status: 'pending',
        created_by: 'agent',
      })
      .select('id')
      .single();

    if (createError) {
      logger.error(
        { hotel_id: context.hotel_id, conversation_id: context.conversation_id, error: createError },
        'Failed to create task'
      );
      return {
        name: 'create_task',
        result: 'Error creating task',
        error: 'CREATE_ERROR',
      };
    }

    logger.debug(
      { hotel_id: context.hotel_id, conversation_id: context.conversation_id, task_id: task.id },
      'Task created successfully'
    );

    return {
      name: 'create_task',
      result: {
        status: 'success',
        task_id: task.id,
        room_number: conversation.room_number,
        task_type,
        description,
        message: `Task created for room ${conversation.room_number}. Staff has been notified.`,
      },
    };
  } catch (err) {
    logger.error(
      { hotel_id: context.hotel_id, conversation_id: context.conversation_id, err },
      'Task creation error'
    );
    return {
      name: 'create_task',
      result: 'Error creating task',
      error: 'TASK_ERROR',
    };
  }
}

/**
 * All available tools for the LLM
 */
export const ALL_TOOLS = [
  CHECK_AVAILABILITY_TOOL,
  GET_ROOM_DETAILS_TOOL,
  CREATE_RESERVATION_TOOL,
  VERIFY_PAYMENT_TOOL,
  GET_MENU_TOOL,
  COLLECT_ROOM_TOOL,
  TRACK_ORDER_TOOL,
  CREATE_TASK_TOOL,
];
