import {
  getConversationHistory,
  storeIncomingMessage,
  storeAgentReply,
} from '../services/supabase.js';
import {
  getDefaultLanguage,
  getSystemPrompt,
  detectLanguageFromMessage,
} from './languageDetector.js';
import { callOpenRouter, buildMessages, selectModel } from '../services/openrouter.js';
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
 * 2. Detect guest language
 * 3. Build system prompt from hotel config
 * 4. Select appropriate model (TOOL or FAST)
 * 5. Call LLM with tools available
 * 6. Store reply
 */
export async function runAgent(
  context: ConversationContext,
  options: RunnerOptions = {}
): Promise<{ reply: string; language: string }> {
  const { hotel_id, conversation_id, guest_message, current_language } = context;
  const { isDev = false } = options;

  try {
    // 1. Load conversation history for context
    const history = await getConversationHistory(conversation_id);

    logger.debug(
      { hotel_id, conversation_id, historyLength: history.length },
      'Conversation history loaded'
    );

    // 2. Detect guest language (from their message input)
    // Falls back to conversation language if already set
    const detectedLanguage = current_language || detectLanguageFromMessage(guest_message) || getDefaultLanguage();
    const language = (detectedLanguage === 'en' ? 'en' : 'es') as 'es' | 'en';

    logger.debug(
      { hotel_id, conversation_id, detectedLanguage: language },
      'Language detected'
    );

    // 3. Build system prompt from hotel config
    // This includes: hotel persona, instructions, booking rules, etc.
    const systemPrompt = getSystemPrompt(language);

    // 4. Select model based on context (TOOL_MODEL for booking, FAST_MODEL for simple)
    const selectedModel = selectModel({
      messages: buildMessages(history, guest_message),
      conversationContext: { message_count: history.length },
    });

    logger.debug(
      { hotel_id, conversation_id, selectedModel },
      'Model selected'
    );

    // 5. Call OpenRouter LLM
    const { reply, model, tokens } = await callOpenRouter({
      system: systemPrompt,
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

    // 6. Store reply
    await storeAgentReply(conversation_id, reply, {
      language,
      model,
      tokens,
    });

    logger.info(
      { hotel_id, conversation_id, language, model, tokens },
      'Agent response generated successfully'
    );

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
