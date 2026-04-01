# OpenRouter Cost Optimization Strategy

**Status:** Implemented in `apps/agents/src/services/openrouter.ts`

---

## Cost Model Overview

### Model Selection Strategy

We use **two models** chosen for optimal cost vs accuracy:

| Model | Input Cost | Output Cost | Use Case | Monthly Estimate |
|-------|-----------|-----------|----------|------------------|
| **Google Gemini Flash 1.5** (FAST_MODEL) | $0.075/1M | $0.30/1M | Simple FAQs, greetings, routing | ~$5-15 |
| **Anthropic Claude Haiku 4.5** (TOOL_MODEL) | $0.80/1M | $4.00/1M | Booking flow, tools, complex logic | ~$20-40 |

**Total Estimated Monthly:** $25-55 (at ~50,000 conversations/month)

---

## When to Use Each Model

### ✅ Use Gemini Flash (Cheapest)

- **Greeting messages** — "Hola, ¿cómo estás?"
- **Simple FAQ answers** — "¿Cuál es tu número de teléfono?"
- **Information requests** — "¿Tienes WiFi?" "¿Cuál es el horario de checkout?"
- **Routing decisions** — "Is this a booking question or room service?"
- **Language detection** — First message analysis
- **First few turns** in conversation (before booking decisions)

**Cost per request:** ~$0.00001 - $0.0002

### 🔧 Use Claude Haiku (Smart, Still Cheap)

- **Booking flow decisions** — Guest has selected room, dates, guests → needs tool calls
- **Payment verification** — "Was payment actually received?"
- **Complex reasoning** — "Should I escalate or handle this?"
- **Tool invocation** — Any call to `check_availability`, `create_reservation`, `verify_payment`
- **Long conversations** — After 8+ messages (consistency matters more)
- **Critical operations** — Anything that affects revenue (booking, payment, escalation)

**Cost per request:** ~$0.0015 - $0.005

---

## Implementation Details

### How Model Selection Works

```typescript
export function selectModel(options: CompletionOptions): string {
  // 1. If tools are required → TOOL_MODEL
  if (requiresTools) return TOOL_MODEL;

  // 2. If in booking flow critical phases → TOOL_MODEL
  //    (payment_pending, payment_verified, confirmed, creating_reservation)
  
  // 3. If message contains booking keywords → TOOL_MODEL
  
  // 4. If conversation long (8+ messages) → TOOL_MODEL
  
  // 5. Otherwise → FAST_MODEL (default)
}
```

### Cost Tracking in Logs

Every OpenRouter call logs cost information:

```json
{
  "model": "google/gemini-flash-1.5",
  "tokens": 145,
  "inputTokens": 89,
  "outputTokens": 56,
  "costUSD": "0.000042"
}
```

---

## Monthly Budget Projection

### Scenario 1: Low Volume (1,000 conversations/month)
- ~80% use Gemini Flash @ avg $0.00015/call = $0.12
- ~20% use Claude Haiku @ avg $0.003/call = $0.60
- **Monthly: ~$0.72**

### Scenario 2: Medium Volume (10,000 conversations/month)
- ~80% use Gemini @ $0.00015/call = $1.20
- ~20% use Claude @ $0.003/call = $6.00
- **Monthly: ~$7.20**

### Scenario 3: High Volume (100,000 conversations/month)
- ~80% use Gemini @ $0.00015/call = $12.00
- ~20% use Claude @ $0.003/call = $60.00
- **Monthly: ~$72.00**

---

## Cost Optimization Tactics

### ✅ Already Implemented

1. **Model routing** — Use FAST_MODEL for 80% of requests
2. **Token counting** — Log actual tokens used (OpenRouter charges by token)
3. **Cost tracking per request** — Identify expensive patterns
4. **Lower output limits** — max_tokens = 500 (was 1000)

### 🔄 Can Add Later

1. **Response caching** — Cache FAQ answers to avoid repeated LLM calls
2. **Prompt compression** — Summarize old messages to reduce input tokens
3. **Batch processing** — Process multiple messages in single API call
4. **Rate limiting** — Throttle LLM calls during high traffic
5. **Cascade fallback** — Use free tier if available, paid tier as backup
6. **Cost alerts** — Monitor daily spend, alert if > threshold

---

## Monitoring Dashboard Ideas

### Daily Logs to Track

```typescript
{
  date: "2026-04-01",
  totalRequests: 1203,
  geminiRequests: 950,
  claudeRequests: 253,
  totalCost: 1.05,
  avgCostPerRequest: 0.00087,
  topCostlyOperations: [
    { operation: "booking_flow", costUSD: 0.45, count: 89 },
    { operation: "payment_verify", costUSD: 0.38, count: 76 },
    { operation: "faq", costUSD: 0.12, count: 502 }
  ]
}
```

### Alerts to Set Up

- ⚠️ If daily cost > $5, investigate why
- ⚠️ If Claude use > 30%, might be routing wrong
- ⚠️ If avg cost/request > $0.005, check for token bloat
- ⚠️ If Gemini succeeds < 95%, might need to upgrade it

---

## Cost When Booking Tool Integration Happens

Once tools (`check_availability`, `verify_payment`, etc.) are implemented:

- **Tool calls themselves** = no cost (they hit Cloudbeds API + database)
- **LLM to decide when/how to call tools** = Claude Haiku cost (~$0.003/call)
- **Verification calls** = Claude Haiku cost for accuracy
- **Expected per booking:** $0.01 - $0.05 in LLM costs alone

With 50 completed bookings/day = $0.50-$2.50/day in LLM costs for booking flow.

---

## File References

- **Model selection:** [apps/agents/src/services/openrouter.ts](apps/agents/src/services/openrouter.ts#L30-L140)
- **Cost info:** MODEL_COSTS constant (updated monthly)
- **Agent integration:** [apps/agents/src/agent/runner.ts](apps/agents/src/agent/runner.ts#L40-L60)

---

## Next Steps

1. **Monitor real usage** — Run for 1 week, check actual costs vs projections
2. **Add cost tracking endpoint** — GET `/api/analytics/costs` for dashboard
3. **Implement response caching** — Cache FAQ answers to Redis
4. **Set up billing alerts** — OpenRouter email notifications
5. **Monthly review** — Update MODEL_COSTS if prices change

---

## Important Notes

- **Costs updated:** April 2026
- **Check OpenRouter pricing** periodically (models + pricing can change)
- **Budget tip:** Start with test volume, monitor for 1 week before going live
- **Fallback plan:** If costs exceed budget, can disable TOOL_MODEL and use only Gemini (saves 80%, but less reliable for bookings)

