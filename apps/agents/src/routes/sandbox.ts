import { FastifyInstance } from 'fastify';
import { logger } from '../services/logger.js';
import {
  getOrCreateConversation,
  storeIncomingMessage,
} from '../services/supabase.js';
import { isDuplicateMessage } from '../services/redis.js';
import { runAgent } from '../agent/runner.js';

interface SandboxMessage {
  hotel_id: string;
  phone: string;
  message: string;
  message_id?: string; // For dedup
  channel?: string; // Default to 'sandbox'
}

interface SandboxResponse {
  success: boolean;
  message_id?: string;
  reply?: string;
  language?: string;
  error?: string;
}

export default async function sandboxRoutes(app: FastifyInstance) {
  /**
   * POST /api/sandbox/chat
   * Simulate a WhatsApp message without Meta integration
   * Used for dashboard testing before Meta webhook setup
   */
  app.post<{ Body: SandboxMessage }>('/chat', async (request, reply) => {
    const isDev = process.env.NODE_ENV === 'development';

    try {
      const { hotel_id, phone, message, message_id, channel = 'sandbox' } = request.body;

      // Validate input
      if (!hotel_id || !phone || !message) {
        reply.code(400);
        return {
          success: false,
          error: 'Missing required fields: hotel_id, phone, message',
        } as SandboxResponse;
      }

      // Generate message ID if not provided
      const finalMessageId = message_id || `sandbox_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      logger.debug(
        { hotel_id, phone, channel, messageId: finalMessageId },
        'Sandbox message received'
      );

      // Fast response - Process async
      // Per hard rule: return HTTP 200 within 200ms for all webhooks
      reply.code(202); // Accepted

      // Send immediate response
      const acknowledgeResponse = {
        success: true,
        message_id: finalMessageId,
      };

      reply.send(acknowledgeResponse);

      // Process async (no await)
      processMessageAsync(
        hotel_id,
        phone,
        message,
        finalMessageId,
        channel,
        isDev
      ).catch((err) => {
        logger.error(
          { hotel_id, phone, messageId: finalMessageId, err },
          'Async sandbox message processing failed'
        );
      });
    } catch (err) {
      logger.error({ err, body: request.body }, 'Sandbox endpoint error');
      reply.code(500);
      return {
        success: false,
        error: 'Internal server error',
      } as SandboxResponse;
    }
  });

  /**
   * POST /api/sandbox/simulate-payment
   * Simulate a Cloudbeds payment webhook for testing
   */
  app.post<{ Body: {
    hotel_id: string;
    reservation_id: string;
    status: 'completed' | 'failed';
    amount: number;
  } }>('/simulate-payment', async (request, reply) => {
    try {
      const { hotel_id, reservation_id, status, amount } = request.body;

      if (!hotel_id || !reservation_id) {
        reply.code(400);
        return {
          success: false,
          error: 'Missing required fields: hotel_id, reservation_id',
        };
      }

      logger.info(
        { hotel_id, reservation_id, status, amount },
        'Sandbox payment simulated'
      );

      // TODO: Update conversation with payment status
      // For now, just acknowledge

      return {
        success: true,
        reservation_id,
        status,
      };
    } catch (err) {
      logger.error({ err, body: request.body }, 'Sandbox payment endpoint error');
      reply.code(500);
      return {
        success: false,
        error: 'Internal server error',
      };
    }
  });
}

/**
 * Process message asynchronously (no reply delay)
 */
async function processMessageAsync(
  hotel_id: string,
  phone: string,
  message: string,
  message_id: string,
  channel: string,
  isDev: boolean
): Promise<void> {
  try {
    // 1. Check for duplicates (dedup)
    const isDuplicate = await isDuplicateMessage(hotel_id, channel, message_id);
    if (isDuplicate) {
      logger.info({ hotel_id, phone, message_id }, 'Duplicate message skipped');
      return;
    }

    // 2. Get or create conversation
    const conversation = await getOrCreateConversation(
      hotel_id,
      phone,
      channel
    );

    logger.debug(
      { hotel_id, conversationId: conversation.id, phone },
      'Conversation ready'
    );

    // 3. Store incoming message
    await storeIncomingMessage(conversation.id, message, message_id);

    logger.debug(
      { hotel_id, conversationId: conversation.id, messageId: message_id },
      'Incoming message stored'
    );

    // 4. Run agent
    const result = await runAgent(
      {
        hotel_id,
        conversation_id: conversation.id,
        guest_message: message,
        current_language: conversation.language,
      },
      { isDev }
    );

    logger.info(
      {
        hotel_id,
        conversationId: conversation.id,
        phone,
        messageId: message_id,
        language: result.language,
      },
      'Sandbox message processed successfully'
    );

    // 5. TODO: Send reply to guest via Meta/WhatsApp
    // For sandbox, replies are stored in database but not sent out
    // Dashboard will poll for new messages

  } catch (err) {
    logger.error(
      { hotel_id, phone, message_id, err },
      'Failed to process sandbox message'
    );
    // Don't throw - already sent 202 response
  }
}
