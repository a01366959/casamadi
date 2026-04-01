import {
  getConversationHistory,
  storeIncomingMessage,
  storeAgentReply,
} from '../services/supabase.js';
import { getDefaultLanguage, getSystemPrompt } from './languageDetector.js';
import { callOpenRouter, buildMessages } from '../services/openrouter.js';
import { ALL_TOOLS, executeTool, ToolCall } from './tools.js';
import { logger } from '../services/logger.js';

interface ConversationContext {
  hotel_id: string;
  conversation_id: string;
  guest_message: string;
  current_language?: string;
}

interface RunnerOptions {
  isDev?: boolean;
}

/**
 * Main agent runner - LLM is the orchestrator
 *
 * Architecture:
 * 1. Load conversation history
 * 2. Pass to LLM with available tools
 * 3. LLM decides: answer, collect info, or invoke tool
 * 4. Process tool results if needed
 * 5. Store final reply
 */
export async function runAgent(
  context: ConversationContext,
  options: RunnerOptions = {}
): Promise<{ reply: string; language: string }> {
  const { hotel_id, conversation_id, guest_message, current_language } = context;
  const { isDev = false } = options;

  try {
    // 1. Store incoming message
    await storeIncomingMessage(conversation_id, guest_message);

    // 2. Load conversation history for context
    const history = await getConversationHistory(conversation_id);

    logger.debug(
      { hotel_id, conversation_id, historyLength: history.length },
      'Conversation history loaded'
    );

    // 3. Determine guest language based on first message (or use preference)
    const language = current_language || getDefaultLanguage();

    // 4. Call LLM with available tools
    // LLM is the orchestrator - it decides what to do
    const systemPrompt = getSystemPrompt(language as 'es' | 'en');
    const systemWithTools = `${systemPrompt}

You have access to the following tools to help guests:
${JSON.stringify(ALL_TOOLS, null, 2)}

If a guest asks about availability, room details, or wants to book, use the appropriate tools.
When you use a tool, format your response as JSON with tool calls.`;

    const { reply, model, tokens } = await callOpenRouter({
      system: systemWithTools,
      messages: buildMessages(history, guest_message),
      temperature: 0.7,
      max_tokens: 800,
      conversationContext: {
        message_count: history.length,
      },
    });

    logger.debug(
      { hotel_id, conversation_id, model, tokens },
      'LLM response generated'
    );

    // 5. Store reply
    await storeAgentReply(conversation_id, reply, {
      language,
      model,
      tokens,
    });

    return {
      reply,
      language,
    };
  } catch (err) {
    logger.error(
      { hotel_id, conversation_id, err },
      'Agent runner failed'
    );
    throw err;
  }
}
