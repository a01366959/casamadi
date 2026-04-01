#!/usr/bin/env bash
# Quick test of agent endpoint

echo "🚀 Starting agent server..."
cd "$(dirname "$0")" && npm run dev &
SERVER_PID=$!
sleep 5

echo "📤 Sending test message..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/sandbox/chat \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+34666333222",
    "message": "¿hay disponibilidad para el próximo fin de semana con 2 personas?"
  }')

echo "✅ Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

echo ""
echo "🛑 Stopping server..."
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true
