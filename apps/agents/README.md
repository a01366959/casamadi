# Casamadi Agent

Hotel AI concierge agent built with Fastify and TypeScript.

## Architecture

```
src/
├── index.ts              # Fastify bootstrap, health check, error handling
├── services/
│   ├── logger.ts         # Pino logging setup
│   ├── supabase.ts       # Database operations (conversations, messages)
│   ├── redis.ts          # Upstash Redis for dedup and queue
│   └── openrouter.ts     # (TODO) OpenRouter API integration
├── routes/
│   ├── sandbox.ts        # POST /api/sandbox/chat for testing without Meta
│   └── webhook.ts        # (TODO) POST /webhook/:hotelId from Meta Cloud API
├── agent/
│   ├── runner.ts         # Main conversation orchestration
│   ├── languageDetector.ts # ES/EN detection and system prompt generation
│   └── tools/
│       └── index.ts      # (TODO) Tool registry (check_availability, verify_payment, etc)
└── config/
    └── hotels/           # (TODO) Per-hotel configuration loader
```

## Features

### Phase 1: Sandbox (Current)
- ✅ POST /api/sandbox/chat endpoint for testing without Meta
- ✅ Language detection (Spanish/English)
- ✅ Conversation persistence to Supabase
- ✅ Message deduplication via Redis
- ✅ Bilingual system prompts
- 🔄 Stub agent replies (echo bot)

### Phase 2: OpenRouter Integration
- [ ] Model routing (FAST vs TOOL)
- [ ] Actual LLM calls
- [ ] Tool invocation
- [ ] Streaming responses

### Phase 3: Meta Webhook
- [ ] POST /webhook/:hotelId endpoint
- [ ] Meta message validation
- [ ] Reply routing via Meta Cloud API

### Phase 4: Full Booking Flow
- [ ] check_availability tool
- [ ] verify_payment tool
- [ ] create_reservation tool
- [ ] State machine for booking states

## Getting Started

```bash
# Install dependencies
pnpm install

# Environment setup
cp .env.example .env
# Edit .env with your Supabase and Redis credentials

# Development
pnpm dev

# Build
pnpm build

# Production
pnpm start
```

## API Endpoints

### Health Check
```bash
GET /health
GET /health/detailed
```

### Sandbox (Testing)
```bash
# Send message
POST /api/sandbox/chat
{
  "hotel_id": "hotel-bernal",
  "phone": "525551234567",
  "message": "¿Hay disponibilidad?",
  "message_id": "msg_123"  # optional, auto-generated if missing
}

# Simulate payment
POST /api/sandbox/simulate-payment
{
  "hotel_id": "hotel-bernal",
  "reservation_id": "res_123",
  "status": "completed",
  "amount": 2500
}
```

## Database Schema

All agent data stored in Supabase:

- **conversations**: Guest conversations by phone/channel
- **messages**: Individual messages (role: 'user' | 'assistant')
- **users**: Hotel staff (for future features)
- **pedidos**: Room service orders
- **tareas**: Housekeeping/concierge tasks
- **hotel_knowledge_base**: RAG embeddings for hotel-specific info

See `/docs/DATABASE_INVENTORY.md` for full schema.

## Hard Rules

1. **HTTP 200 within 200ms**: All webhooks must return 202/200 immediately, process async
2. **Redis Dedup**: Every incoming message checked via Redis before processing
3. **Language Detection**: Per-message detection, Spanish → English switch allowed, never back
4. **Supabase Authority**: All message history stored and queryable
5. **No Duplicate Processing**: Redis dedup prevents double-processing of Meta webhooks
6. **Stub First**: Start with echo bot, no Redis/LLM errors should block

## Testing

```bash
# Send sandbox message
curl -X POST http://localhost:3000/api/sandbox/chat \
  -H "Content-Type: application/json" \
  -d '{
    "hotel_id": "hotel-bernal",
    "phone": "525551234567",
    "message": "Hola, ¿cómo estás?",
    "channel": "sandbox"
  }'

# Check health
curl http://localhost:3000/health
```

## Next Steps

1. OpenRouter integration (model routing, LLM calls)
2. Tool system (stubs → real Cloudbeds API calls)
3. Meta webhook integration
4. Booking state machine

See `/docs/EPICS.md` for full roadmap.
