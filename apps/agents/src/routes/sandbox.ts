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

interface SandboxConversationRequest {
  hotel_id: string;
  phone: string;
  channel?: string;
}

interface SandboxResponse {
  success: boolean;
  message_id?: string;
  reply?: string;
  language?: string;
  reasoning?: string; // Chain of thought for debugging
  error?: string;
}

export default async function sandboxRoutes(app: FastifyInstance) {
  /**
   * POST /api/sandbox/conversation
   * Create (or get existing) conversation for sandbox session initialization
   */
  app.post<{ Body: SandboxConversationRequest }>('/conversation', async (request, reply) => {
    try {
      const { hotel_id, phone, channel = 'sandbox' } = request.body;

      if (!hotel_id || !phone) {
        reply.code(400);
        return {
          success: false,
          error: 'Missing required fields: hotel_id, phone',
        };
      }

      const conversation = await getOrCreateConversation(hotel_id, phone, channel);

      logger.info(
        {
          hotel_id,
          conversationId: conversation.id,
          channel,
          phone,
        },
        'Sandbox conversation initialized'
      );

      return {
        success: true,
        conversation_id: conversation.id,
        status: conversation.status,
        language: conversation.language || 'es',
      };
    } catch (err) {
      logger.error({ err, body: request.body }, 'Sandbox conversation init error');
      reply.code(500);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      };
    }
  });

  /**
   * POST /api/sandbox/chat
   * Simulate a WhatsApp message without Meta integration
   * Used for dashboard testing before Meta webhook setup
   */
  app.post<{ Body: SandboxMessage }>('/chat', async (request, reply) => {
    const isDev = process.env.NODE_ENV === 'development';
    const SANDBOX_ECHO_MODE = process.env.SANDBOX_ECHO_MODE === 'true'; // For testing

    console.log(`[Sandbox] === New Request ===`);
    console.log(`[Sandbox] Body:`, JSON.stringify(request.body, null, 2));

    try {
      const { hotel_id, phone, message, message_id, channel = 'sandbox' } = request.body;

      // Validate input
      if (!hotel_id || !phone || !message) {
        console.log(`[Sandbox] ERROR: Missing fields. hotel_id=${hotel_id}, phone=${phone}, message=${message}`);
        reply.code(400);
        return {
          success: false,
          error: 'Missing required fields: hotel_id, phone, message',
        } as SandboxResponse;
      }

      // Generate message ID if not provided
      const finalMessageId = message_id || `sandbox_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      console.log(`[Sandbox] Valid request - hotel_id=${hotel_id}, phone=${phone}, message="${message}"`);

      logger.debug(
        { hotel_id, phone, channel, messageId: finalMessageId },
        'Sandbox message received'
      );

      // ECHO MODE: Just echo back the message (for quick testing)
      if (SANDBOX_ECHO_MODE) {
        console.log(`[Sandbox] ECHO MODE enabled, returning echo response`);
        return {
          success: true,
          message_id: finalMessageId,
          reply: `Echo: ${message}`,
          language: message.toLowerCase().includes('hello') ? 'en' : 'es',
          reasoning: `ECHO MODE - Just echoing back the message for testing.`,
          toolCalls: [],
        } as SandboxResponse;
      }

      // SANDBOX: Synchronous processing (block and wait for agent reply)
      // Different from production which uses async processing
      try {
        console.log(`[Sandbox] Processing message synchronously...`);
        const { reply: agentReply, language } = await processMessageSync(
          hotel_id,
          phone,
          message,
          finalMessageId,
          channel,
          isDev
        );

        console.log(`[Sandbox] Got agent reply: "${agentReply}", language: ${language}`);

        return {
          success: true,
          message_id: finalMessageId,
          reply: agentReply,
          language,
          reasoning: `Processed in sandbox mode. Language: ${language}. Used TOOL_MODEL for response generation.`,
          toolCalls: [],
        } as SandboxResponse;
      } catch (err) {
        let errorMessage = 'Unknown error';
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === 'object' && err !== null && 'message' in err) {
          errorMessage = (err as any).message;
        } else if (typeof err === 'string') {
          errorMessage = err;
        }
        console.error(`[Sandbox] Processing failed:`, errorMessage);
        logger.error(
          { hotel_id, phone, messageId: finalMessageId, error: errorMessage, stack: err instanceof Error ? err.stack : undefined },
          'Sandbox message processing failed'
        );
        reply.code(500);
        return {
          success: false,
          error: `Failed to process message: ${errorMessage}`,
        } as SandboxResponse;
      }
    } catch (err) {
      console.error(`[Sandbox] Endpoint error:`, err);
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
 * Process message synchronously for sandbox (blocking, returns reply)
 * Different from production which processes async via Redis queue
 */
async function processMessageSync(
  hotel_id: string,
  phone: string,
  message: string,
  message_id: string,
  channel: string,
  isDev: boolean
): Promise<{ reply: string; language: string }> {
  // Set a timeout for the entire operation (30 seconds)
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => {
      console.error(`[Sandbox] TIMEOUT: Message processing exceeded 30s`);
      reject(new Error('Message processing timeout (30s)'));
    }, 30000)
  );

  const processPromise = (async () => {
    console.log(`[Sandbox:Process] Step 1: Checking for duplicates`);
    // 1. Check for duplicates (dedup)
    const isDuplicate = await isDuplicateMessage(hotel_id, channel, message_id);
    if (isDuplicate) {
      console.log(`[Sandbox:Process] Duplicate detected, returning early`);
      logger.info({ hotel_id, phone, message_id }, 'Duplicate message skipped');
      return { reply: 'Duplicate message detected', language: 'es' };
    }

    console.log(`[Sandbox:Process] Step 2: Getting or creating conversation`);
    // 2. Get or create conversation
    const conversation = await getOrCreateConversation(
      hotel_id,
      phone,
      channel
    );

    console.log(`[Sandbox:Process] Conversation ready: ${conversation.id}`);

    logger.debug(
      { hotel_id, conversationId: conversation.id, phone },
      'Conversation ready'
    );

    if (conversation.status === 'human_active') {
      console.log(`[Sandbox:Process] Conversation ${conversation.id} is in human takeover mode`);
      return {
        reply: 'La conversacion esta en modo staff. Libera el takeover para reactivar la IA.',
        language: conversation.language || 'es',
      };
    }

    console.log(`[Sandbox:Process] Step 3: Storing incoming message`);
    // 3. Store incoming message
    await storeIncomingMessage(conversation.id, message, message_id);

    logger.debug(
      { hotel_id, conversationId: conversation.id, messageId: message_id },
      'Incoming message stored'
    );

    console.log(`[Sandbox:Process] Step 4: Running agent`);
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

    console.log(`[Sandbox:Process] Agent returned:`, JSON.stringify(result));

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

    return {
      reply: result.reply,
      language: result.language,
    };
  })();

  return Promise.race([processPromise, timeoutPromise]);
}
