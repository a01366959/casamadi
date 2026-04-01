# Agent Architecture: LLM as Orchestrator

## Overview

The Casamadi hotel concierge agent is built on a simple principle: **The LLM is the orchestrator**.

Instead of building complex routing logic, language detection, and state management helpers, we let the LLM handle all decision-making. The agent provides:
- A clear system prompt explaining its role
- Available tools for business operations
- Conversation history for context
- The LLM decides what to do next

## Architecture

```
Guest Message
     │
     ▼
Store in Database
     │
     ▼
Load Conversation History
     │
     ▼
Call OpenRouter LLM
├─ System Prompt (bilingual, with tools)
├─ Conversation History
└─ Current Guest Message
     │
     ▼
LLM Decision (Orchestrator)
├─ Answer question? → Return reply
├─ Ask for info?    → Return reply
└─ Use tool?        → Return tool call
     │
     ▼
Store Reply in Database
```

## Key Components

### 1. System Prompt (`languageDetector.ts`)

The LLM receives a bilingual system prompt:

**Spanish (es):**
```
Eres un asistente de hotel amable y profesional. Ayuda a los huéspedes 
a reservar habitaciones, responde preguntas sobre el hotel.
Responde siempre en español a menos que el huésped hable inglés.
```

**English (en):**
```
You are a friendly and professional hotel assistant. Help guests 
book rooms, answer questions about the hotel.
```

The LLM automatically detects guest language from their message and responds accordingly.

### 2. Available Tools (`tools.ts`)

The LLM can invoke these tools:

1. **`check_availability`** - Query available rooms for dates and guests
   ```json
   {
     "check_in": "2024-02-15",
     "check_out": "2024-02-17",
     "num_guests": 2,
     "room_type_id": "optional-room-id"
   }
   ```

2. **`get_room_details`** - Get room features, pricing, capacity
   ```json
   {
     "room_type_id": "room-123"
   }
   ```

3. **`create_reservation`** - Create booking in Cloudbeds
   ```json
   {
     "room_type_id": "room-123",
     "check_in": "2024-02-15",
     "check_out": "2024-02-17",
     "guest_name": "John Doe",
     "guest_email": "john@example.com",
     "guest_phone": "+1234567890",
     "num_guests": 2
   }
   ```

4. **`verify_payment`** - Check payment status
   ```json
   {
     "reservation_id": "RES-12345"
   }
   ```

### 3. Message Flow

**File:** `apps/agents/src/agent/runner.ts`

```typescript
export async function runAgent(
  context: ConversationContext,
  options: RunnerOptions = {}
): Promise<{ reply: string; language: string }>
```

**Process:**
1. Store incoming message
2. Load conversation history
3. Generate system prompt with available tools
4. Call OpenRouter LLM
5. Store reply
6. Return reply to guest

**Model Selection:**
- **FAST:** Gemini Flash 1.5 ($0.075/$0.30 per 1M tokens)
  - Simple FAQ, greeting, questions
  - ~99% cheaper than TOOL model
  
- **TOOL:** Claude Haiku 4.5 ($0.80/$4.00 per 1M tokens)
  - Booking state, complex reasoning
  - Required when tools might be used

## Getting Started

### Test the Architecture

```bash
cd apps/agents
# Run architecture test
npx tsx src/test-architecture.ts

# Or start dev server
npm run dev

# Then test endpoint
curl -X POST http://localhost:3001/api/sandbox/chat \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+34666333222",
    "message": "¿hay disponibilidad?"
  }'
```

Expected Response:
```json
{
  "success": true,
  "message_id": "msg-abc123"
}
```

## Integration Points

### Supabase Database
- Messages stored in `conversations.messages` (JSONB)
- Guest created in `users` table (role='guest')
- Language preference stored in `conversations.language`

### OpenRouter API
- Environment: `OPENROUTER_API_KEY`
- Endpoint: `https://openrouter.ai/api/v1/chat/completions`
- Models used: `google/gemini-flash-1.5`, `anthropic/claude-haiku-4-5`

### Cloudbeds API
- OAuth token stored in `hotels.cloudbeds_oauth_token`
- Tools call Cloudbeds for: availability, pricing, reservations, payments
- Implementation: `apps/agents/src/services/cloudbeds.ts` (TODO)

## Cost Optimization

**Monthly Costs (50K Conversations):**
- FAST model (FAQ): 40K × $0.00015 = $6.00
- TOOL model (booking): 10K × $0.003 = $30.00
- **Total: ~$36/month**

**Key Optimizations:**
1. Use FAST model for ~80% of traffic (cheap conversations)
2. Use TOOL model only when booking is likely
3. Implement prompt caching (Cloudbeds queries)
4. Rate limit per conversation (prevent abuse)

## Next Steps

1. ✅ LLM orchestration implemented
2. ✅ Tool system created
3. ⏳ Connect tools to Cloudbeds API
4. ⏳ Implement tool result parsing from LLM
5. ⏳ Add booking state machine
6. ⏳ Meta webhook integration

## Key Design Principles

1. **One Agent, One Endpoint**: Handles WhatsApp, Instagram, Messenger same way
2. **LLM Decides Everything**: No manual routing, language detection, or state management
3. **Tools Over Logic**: Business operations as callable tools
4. **Cost First**: Use cheapest model that works
5. **Always Verify**: Payment verification required before reservation confirmed
6. **Sandbox First**: Test in dashboard before connecting Meta

## Files Modified

- `apps/agents/src/agent/runner.ts` - Simplified orchestration
- `apps/agents/src/agent/tools.ts` - Tool system (NEW)
- `apps/agents/src/agent/languageDetector.ts` - Minimal language helpers
- `apps/agents/src/routes/sandbox.ts` - Fixed options passing

---

**Architecture Test:** ✅ PASSED
**TypeScript Build:** ✅ PASSED  
**Ready for:** Tool integration & Cloudbeds API connection
