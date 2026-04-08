import {
  getConversationHistory,
  getConversationMetadata,
  storeIncomingMessage,
  storeAgentReply,
} from '../services/supabase.js';
import {
  getDefaultLanguage,
  getSystemPrompt,
  detectLanguageFromMessage,
} from './languageDetector.js';
import { callOpenRouter, buildMessages, selectModel } from '../services/openrouter.js';
import { ALL_TOOLS, executeTool } from './tools.js';
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

    // 1b. Load conversation metadata (room number, orders)
    const metadata = await getConversationMetadata(conversation_id);

    logger.debug(
      {
        hotel_id,
        conversation_id,
        historyLength: history.length,
        roomNumber: metadata.room_number,
        orderCount: metadata.orders_summary?.length || 0,
      },
      'Conversation context loaded'
    );

    // 2. Detect guest language (from their message input)
    // Rule: If English is detected, switch to English permanently
    // If already English, never go back to Spanish
    const messageLanguage = detectLanguageFromMessage(guest_message);
    const language = (messageLanguage === 'en' || current_language === 'en') ? 'en' : (messageLanguage || current_language || getDefaultLanguage()) as 'es' | 'en';

    logger.debug(
      { hotel_id, conversation_id, messageLanguage, storedLanguage: current_language, finalLanguage: language },
      'Language detected'
    );

    // 3. Build system prompt from hotel config
    // This includes: hotel persona, instructions, booking rules, etc.
    let systemPrompt = getSystemPrompt(language);

    // 3b. Append session context to system prompt
    if (metadata.room_number || (metadata.orders_summary && metadata.orders_summary.length > 0)) {
      const sessionContext = buildSessionContext(metadata, language);
      systemPrompt = systemPrompt + '\n\n' + sessionContext;
    }

    // 4. Select model based on context (TOOL_MODEL for booking, FAST_MODEL for simple)
    const selectedModel = selectModel({
      messages: buildMessages(history, guest_message, systemPrompt),
      conversationContext: { message_count: history.length },
    });

    logger.debug(
      { hotel_id, conversation_id, selectedModel },
      'Model selected'
    );

    // 5. Call OpenRouter LLM with tools
    const { reply, model, tokens, toolCalls } = await callOpenRouter({
      system: systemPrompt,
      messages: buildMessages(history, guest_message, systemPrompt),
      temperature: 0.7,
      max_tokens: 800,
      tools: ALL_TOOLS,
      conversationContext: {
        message_count: history.length,
      },
    });

    logger.debug(
      { hotel_id, conversation_id, model, tokens, hasToolCalls: !!toolCalls },
      'LLM response generated'
    );

    // 5b. Handle tool calls if the LLM returned any
    let finalReply = reply;
    if (toolCalls && toolCalls.length > 0) {
      logger.debug(
        { hotel_id, conversation_id, toolCallCount: toolCalls.length },
        'Processing tool calls'
      );

      const toolResults = [];
      for (const toolCall of toolCalls) {
        try {
          const args = typeof toolCall.function.arguments === 'string' 
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function.arguments;
          
          const result = await executeTool(
            { name: toolCall.function.name, arguments: args },
            { hotel_id, conversation_id }
          );
          
          toolResults.push(result);
          logger.debug(
            { toolName: toolCall.function.name, success: !result.error },
            'Tool executed'
          );
        } catch (err) {
          logger.error(
            { toolName: toolCall.function.name, err },
            'Tool execution failed'
          );
          toolResults.push({
            name: toolCall.function.name,
            result: 'Error executing tool',
            error: 'EXECUTION_ERROR',
          });
        }
      }

      // If we have tool results, include them in a follow-up message
      if (toolResults.length > 0) {
        // Format tool results for context
        const toolResultsText = toolResults
          .map((r) => {
            if (typeof r.result === 'string') {
              return `${r.name}: ${r.result}`;
            }
            return `${r.name}: ${JSON.stringify(r.result)}`;
          })
          .join('\n');

        logger.debug(
          { hotel_id, conversation_id, toolResultsText },
          'Tool results ready for LLM'
        );

        // For now, include tool results in the stored message
        // In production, might want to call LLM again with results and regenerate reply
        finalReply = reply + (reply ? '\n\n' : '') + toolResultsText;
      }
    }

    // 6. Store reply
    await storeAgentReply(conversation_id, finalReply, {
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

/**
 * Build session context string for system prompt
 * Include stored room number and current orders
 */
function buildSessionContext(metadata: any, language: 'es' | 'en'): string {
  if (language === 'en') {
    let context = '## Current Session Context\n';

    if (metadata.room_number) {
      context += `- Guest Room: ${metadata.room_number}\n`;
    } else {
      context += '- Guest Room: Not yet provided - ASK in your first response\n';
    }

    if (metadata.orders_summary && metadata.orders_summary.length > 0) {
      context += `- Current Orders (${metadata.orders_summary.length} items):\n`;
      (metadata.orders_summary as any[]).forEach((order, index) => {
        if (typeof order === 'object' && order.item_name) {
          context += `  ${index + 1}. ${order.quantity}x ${order.item_name}`;
          if (order.special_instructions) {
            context += ` (${order.special_instructions})`;
          }
          context += '\n';
        }
      });
    }

    return context;
  }

  // Spanish version
  let context = '## Contexto de Sesión Actual\n';

  if (metadata.room_number) {
    context += `- Habitación del Huésped: ${metadata.room_number}\n`;
  } else {
    context += '- Habitación del Huésped: No proporcionada aún - PIDE LO en tu primer mensaje\n';
  }

  if (metadata.orders_summary && metadata.orders_summary.length > 0) {
    context += `- Pedidos Actuales (${metadata.orders_summary.length} artículos):\n`;
    (metadata.orders_summary as any[]).forEach((order, index) => {
      if (typeof order === 'object' && order.item_name) {
        context += `  ${index + 1}. ${order.quantity}x ${order.item_name}`;
        if (order.special_instructions) {
          context += ` (${order.special_instructions})`;
        }
        context += '\n';
      }
    });
  }

  return context;
}
