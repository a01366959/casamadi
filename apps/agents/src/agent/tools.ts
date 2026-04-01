/**
 * Tool system for LLM agent
 * 
 * The LLM can invoke these tools by returning tool calls in its response.
 * Tools are executed in order and results are passed back to LLM.
 */

import { logger } from '../services/logger.js';

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
 * All available tools for the LLM
 */
export const ALL_TOOLS = [
  CHECK_AVAILABILITY_TOOL,
  GET_ROOM_DETAILS_TOOL,
  CREATE_RESERVATION_TOOL,
  VERIFY_PAYMENT_TOOL,
];
