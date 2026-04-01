import { logger } from './logger.js';

const FAST_MODEL = 'google/gemini-flash-1.5';
const TOOL_MODEL = 'anthropic/claude-haiku-4-5';

interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

interface CompletionOptions {
  system?: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  conversationContext?: {
    booking_state?: any;
    message_count?: number;
  };
  requiresTools?: boolean;
}

interface ModelCostInfo {
  name: string;
  costPer1MInputTokens: number;
  costPer1MOutputTokens: number;
  estimatedMonthly: number;
}

/**
 * Model costs (as of April 2026) - UPDATE PERIODICALLY
 * These are approximate costs per 1 million tokens
 */
export const MODEL_COSTS: Record<string, ModelCostInfo> = {
  [FAST_MODEL]: {
    name: 'Google Gemini Flash 1.5',
    costPer1MInputTokens: 0.075,
    costPer1MOutputTokens: 0.30,
    estimatedMonthly: 0, // Calculated per usage
  },
  [TOOL_MODEL]: {
    name: 'Anthropic Claude Haiku 4.5',
    costPer1MInputTokens: 0.80,
    costPer1MOutputTokens: 4.0,
    estimatedMonthly: 0, // Calculated per usage
  },
};

/**
 * Detect conversation phase from booking state
 */
export function detectBookingPhase(bookingState: any): string {
  if (!bookingState) return 'initial';
  
  const phase = bookingState.flow_state;
  
  // Phases that MUST use TOOL_MODEL
  const toolPhases = ['payment_pending', 'payment_verified', 'confirmed', 'creating_reservation'];
  if (toolPhases.includes(phase)) return phase;
  
  return phase || 'initial';
}

/**
 * Check if message contains booking-related keywords
 */
export function containsBookingKeywords(text: string): boolean {
  const keywords = [
    'reserv', 'booking', 'book', 'checkin', 'checkout', 'room', 'habitacion',
    'availability', 'disponib', 'dates', 'fecha', 'price', 'precio', 'payment', 'pago',
    'confirm', 'confirm', 'verify', 'verif', 'available', 'disponible'
  ];
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

/**
 * Get the appropriate model based on context
 * 
 * Strategy:
 * - TOOL_MODEL if: booking flow, needs tools, or critical operations
 * - FAST_MODEL if: simple FAQ, greetings, routing, info requests
 */
export function selectModel(options: CompletionOptions): string {
  const { conversationContext, requiresTools, messages } = options;

  // 1. If tools are required, always use TOOL_MODEL
  if (requiresTools) {
    logger.debug('Using TOOL_MODEL: tools required');
    return TOOL_MODEL;
  }

  // 2. Check booking state - if in booking flow, use TOOL_MODEL
  if (conversationContext?.booking_state) {
    const phase = detectBookingPhase(conversationContext.booking_state);
    const toolPhases = ['payment_pending', 'payment_verified', 'confirmed', 'creating_reservation'];
    
    if (toolPhases.includes(phase)) {
      logger.debug({ phase }, 'Using TOOL_MODEL: booking phase');
      return TOOL_MODEL;
    }

    // In other booking phases, check message content
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]?.content || '';
      if (containsBookingKeywords(lastMessage)) {
        logger.debug('Using TOOL_MODEL: booking keywords detected');
        return TOOL_MODEL;
      }
    }
  }

  // 3. Check conversation length - after many messages, use TOOL_MODEL for consistency
  if (conversationContext && conversationContext.message_count && conversationContext.message_count > 8) {
    logger.debug({ count: conversationContext.message_count }, 'Using TOOL_MODEL: long conversation');
    return TOOL_MODEL;
  }

  // 4. For all other cases, use FAST_MODEL (cheaper)
  logger.debug('Using FAST_MODEL: simple inquiry');
  return FAST_MODEL;
}

/**
 * Call OpenRouter API for text completion
 */
export async function callOpenRouter(
  options: CompletionOptions
): Promise<{ reply: string; model: string; tokens: number }> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  // Select best model for this request based on context
  const model = selectModel(options);

  try {
    const payload = {
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 500,
      top_p: 1.0,
      frequency_penalty: 0,
      presence_penalty: 0,
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://casamadi.app',
        'X-Title': 'Casamadi Hotel AI',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error(
        { status: response.status, error, model },
        'OpenRouter API error'
      );
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = (await response.json()) as OpenRouterResponse;

    const reply = data.choices[0]?.message?.content || '';
    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;
    const totalTokens = inputTokens + outputTokens;

    // Calculate cost for this request
    const modelCost = MODEL_COSTS[model];
    const costUSD = modelCost
      ? (inputTokens / 1_000_000) * modelCost.costPer1MInputTokens +
        (outputTokens / 1_000_000) * modelCost.costPer1MOutputTokens
      : 0;

    logger.debug(
      {
        model,
        tokens: totalTokens,
        inputTokens,
        outputTokens,
        costUSD: costUSD.toFixed(6),
        finishReason: data.choices[0]?.finish_reason,
      },
      'OpenRouter completion generated'
    );

    return {
      reply,
      model,
      tokens: totalTokens,
    };
  } catch (err) {
    logger.error({ err, model }, 'OpenRouter API call failed');
    throw err;
  }
}

/**
 * Build conversation messages for API call
 */
export function buildMessages(
  history: Array<{ role: string; content: string }>,
  userMessage: string
): OpenRouterMessage[] {
  const messages: OpenRouterMessage[] = [];

  // Convert stored history to API format
  history.forEach((msg) => {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    }
  });

  // Add current user message
  messages.push({
    role: 'user',
    content: userMessage,
  });

  return messages;
}

/**
 * Health check for OpenRouter (can be called to validate API key)
 */
export async function checkOpenRouterHealth(): Promise<boolean> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    logger.warn('OpenRouter not configured (API key missing)');
    return false;
  }

  try {
    // Make a minimal request to check the API key
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const ok = response.ok;
    if (!ok) {
      logger.error({ status: response.status }, 'OpenRouter health check failed');
    }
    return ok;
  } catch (err) {
    logger.error({ err }, 'OpenRouter connection failed');
    return false;
  }
}
