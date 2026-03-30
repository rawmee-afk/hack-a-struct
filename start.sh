#!/usr/bin/env bash
set -e

# ── Load .env if present ──────────────────────────────────────────────────────
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo "✓ Loaded .env"
fi

# ── Validation ────────────────────────────────────────────────────────────────
if [ -z "$AI_INTEGRATIONS_OPENAI_API_KEY" ]; then
  echo "⚠  AI_INTEGRATIONS_OPENAI_API_KEY not set — GPT assessment will use fallback"
fi

# ── Install deps (skip if already done) ──────────────────────────────────────
echo ""
echo "▸ Installing Node.js dependencies..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

echo "▸ Installing Python dependencies..."
pip install -q -r artifacts/structural-ai-backend/requirements.txt

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Starting hack-a-struct"
echo "  Python backend  →  http://localhost:8000"
echo "  API proxy       →  http://localhost:8080"
echo "  Frontend        →  http://localhost:3000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Cleanup on exit ───────────────────────────────────────────────────────────
cleanup() {
  echo ""
  echo "Shutting down all services..."
  kill 0 2>/dev/null
}
trap cleanup EXIT INT TERM

# ── Start Python AI backend ───────────────────────────────────────────────────
(
  cd artifacts/structural-ai-backend
  PYTHONUNBUFFERED=1 python3 main.py 2>&1 | sed 's/^/[python] /'
) &

# Wait for Python to be ready (max 30s)
echo "⏳ Waiting for Python backend..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8000/api/healthz > /dev/null 2>&1; then
    echo "✓ Python backend ready"
    break
  fi
  sleep 1
done

# ── Start Node.js API proxy ───────────────────────────────────────────────────
(
  export PORT=8080
  export NODE_ENV=development
  pnpm --filter @workspace/api-server run dev 2>&1 | sed 's/^/[api]    /'
) &

# ── Start React frontend ──────────────────────────────────────────────────────
(
  export PORT=3000
  pnpm --filter @workspace/structural-ai run dev 2>&1 | sed 's/^/[web]    /'
) &

echo ""
echo "✅ All services started. Open http://localhost:3000"
echo "   Press Ctrl+C to stop everything."
echo ""

# Keep script alive
wait
