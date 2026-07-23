#!/usr/bin/env bash
set -euo pipefail

# NodeByte Connect - Standalone Start Script
# Usage: ./start.sh [port]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PORT="${1:-${PORT:-3000}}"
export PORT

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          NodeByte Connect - SSO System                       ║"
echo "║          统一身份认证 (Discourse Connect + OIDC + OAuth2)     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 1. Check .env
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}[!] .env file not found. Copying from .env.example${NC}"
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo -e "${RED}[!] Please edit .env with your real configuration before running again.${NC}"
    exit 1
  else
    echo -e "${RED}[ERROR] No .env or .env.example found. Please create .env first.${NC}"
    exit 1
  fi
fi

# 2. Load .env
set -a
source .env
set +a

# 3. Check critical env vars
MISSING=()
[ -z "${DISCOURSE_CONNECT_SECRET:-}" ] && MISSING+=("DISCOURSE_CONNECT_SECRET")
[ -z "${DISCOURSE_BASE_URL:-}" ] && MISSING+=("DISCOURSE_BASE_URL")
[ -z "${JWT_SECRET:-}" ] && MISSING+=("JWT_SECRET")
[ -z "${SESSION_SECRET:-}" ] && MISSING+=("SESSION_SECRET")

if [ ${#MISSING[@]} -gt 0 ]; then
  echo -e "${YELLOW}[!] Warning: Missing environment variables: ${MISSING[*]}${NC}"
  echo -e "${YELLOW}[!] The system will run in DEV mode (with dev login bypass).${NC}"
fi

# 4. Check if standalone build exists
STANDALONE_DIR=".next/standalone"
if [ ! -d "$STANDALONE_DIR" ]; then
  echo -e "${YELLOW}[!] Standalone build not found. Building...${NC}"
  if command -v bun &>/dev/null; then
    bun run build
  elif command -v npm &>/dev/null; then
    npm run build
  else
    echo -e "${RED}[ERROR] Neither bun nor npm found.${NC}"
    exit 1
  fi
fi

# 5. Copy static assets (if not already)
if [ ! -d "$STANDALONE_DIR/public" ] && [ -d "public" ]; then
  cp -r public "$STANDALONE_DIR/"
fi
if [ ! -d "$STANDALONE_DIR/.next/static" ] && [ -d ".next/static" ]; then
  cp -r .next/static "$STANDALONE_DIR/.next/"
fi

# 6. Ensure database directory exists
mkdir -p db

# 7. Push schema if prisma available
if [ -f "prisma/schema.prisma" ] && command -v bun &>/dev/null; then
  echo -e "${CYAN}[>] Syncing database schema...${NC}"
  bun run db:push 2>/dev/null || true
elif [ -f "prisma/schema.prisma" ] && command -v npx &>/dev/null; then
  echo -e "${CYAN}[>] Syncing database schema...${NC}"
  npx prisma db push --accept-data-loss 2>/dev/null || true
fi

# 8. Start server
echo -e "${GREEN}[>] Starting NodeByte Connect on port ${PORT}...${NC}"
echo -e "${CYAN}[>] Base URL: ${BASE_URL:-http://localhost:${PORT}}${NC}"
echo -e "${CYAN}[>] Discourse: ${DISCOURSE_BASE_URL:-not configured}${NC}"
echo ""

cd "$STANDALONE_DIR"
export NODE_ENV=production
export PORT

if [ -f "server.js" ]; then
  exec node server.js
else
  echo -e "${RED}[ERROR] server.js not found in standalone build.${NC}"
  exit 1
fi
