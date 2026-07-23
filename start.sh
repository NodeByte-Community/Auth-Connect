#!/usr/bin/env bash
set -euo pipefail

# NodeByte Connect - Standalone Start Script
# Usage: ./start.sh [port]
#
# This script starts the pre-built standalone server directly.
# No compilation needed - .next/standalone/server.js is ready to run.
# For first-time setup or rebuild, run: bun run build (or npm run build)

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
echo "║          统一身份认证 (NodeByte SSO + OIDC + OAuth2)          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 1. Check .env
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}[!] .env file not found.${NC}"
  if [ -f ".env.example" ]; then
    echo -e "${YELLOW}[!] Copying from .env.example${NC}"
    cp .env.example .env
    echo -e "${RED}[!] Please edit .env with your real configuration before running again.${NC}"
    echo -e "${CYAN}    Required: DISCOURSE_CONNECT_SECRET, DISCOURSE_API_KEY, JWT_SECRET, SESSION_SECRET${NC}"
    exit 1
  else
    echo -e "${RED}[ERROR] No .env or .env.example found.${NC}"
    echo -e "${YELLOW}    Please create .env manually. See README for required variables.${NC}"
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
  echo -e "${YELLOW}[!] Warning: Missing or placeholder environment variables:${NC}"
  for v in "${MISSING[@]}"; do
    echo -e "${YELLOW}    - ${v}${NC}"
  done
  echo -e "${YELLOW}[!] System will start but SSO/API features may not work.${NC}"
  echo -e "${YELLOW}    Please edit .env with real values.${NC}"
  echo ""
fi

# 4. Locate standalone build
# Priority: 1) .next/standalone (dev build), 2) standalone/ (from release tarball)
STANDALONE_DIR=""
if [ -f ".next/standalone/server.js" ]; then
  STANDALONE_DIR=".next/standalone"
  echo -e "${GREEN}[>] Using standalone build: .next/standalone${NC}"
elif [ -f "standalone/server.js" ]; then
  STANDALONE_DIR="standalone"
  echo -e "${GREEN}[>] Using standalone build: standalone/ (from release)${NC}"
elif [ -f "server.js" ]; then
  # Already inside standalone dir
  STANDALONE_DIR="."
  echo -e "${GREEN}[>] Using current directory as standalone build${NC}"
else
  echo -e "${RED}[ERROR] Standalone build not found!${NC}"
  echo -e "${YELLOW}[!] No server.js found in .next/standalone, standalone/, or current dir.${NC}"
  echo ""
  echo -e "${CYAN}[>] To fix:${NC}"
  echo -e "${CYAN}    Option A: Download standalone release from GitHub${NC}"
  echo -e "${CYAN}      tar xzf nbconnect-standalone-*.tar.gz${NC}"
  echo -e "${CYAN}      cd standalone && cp ../.env.example .env && ../start.sh${NC}"
  echo ""
  echo -e "${CYAN}    Option B: Build from source${NC}"
  echo -e "${CYAN}      bun install && bun run build${NC}"
  echo -e "${CYAN}      # Then run ./start.sh again${NC}"
  exit 1
fi

# 5. Copy static assets if missing (for dev builds)
if [ "$STANDALONE_DIR" = ".next/standalone" ]; then
  if [ ! -d "$STANDALONE_DIR/public" ] && [ -d "public" ]; then
    echo -e "${CYAN}[>] Copying public assets...${NC}"
    cp -r public "$STANDALONE_DIR/"
  fi
  if [ ! -d "$STANDALONE_DIR/.next/static" ] && [ -d ".next/static" ]; then
    echo -e "${CYAN}[>] Copying static assets...${NC}"
    cp -r .next/static "$STANDALONE_DIR/.next/"
  fi
fi

# 6. Ensure database directory exists
mkdir -p db

# 7. Push schema if prisma available (for dev/source builds)
if [ -f "prisma/schema.prisma" ]; then
  if command -v bun &>/dev/null; then
    echo -e "${CYAN}[>] Syncing database schema...${NC}"
    bun run db:push 2>/dev/null || true
  elif command -v npx &>/dev/null; then
    echo -e "${CYAN}[>] Syncing database schema...${NC}"
    npx prisma db push --accept-data-loss 2>/dev/null || true
  fi
fi

# 8. Start server (directly, no build)
echo ""
echo -e "${GREEN}[>] Starting NodeByte Connect on port ${PORT}...${NC}"
echo -e "${CYAN}[>] Base URL:        ${BASE_URL:-http://localhost:${PORT}}${NC}"
echo -e "${CYAN}[>] NodeByte SSO:    ${DISCOURSE_BASE_URL:-not configured}${NC}"
echo -e "${CYAN}[>] Standalone dir:  ${STANDALONE_DIR}${NC}"
echo -e "${CYAN}[>] Mode:            production (no compilation)${NC}"
echo ""

cd "$STANDALONE_DIR"
export NODE_ENV=production
export PORT

exec node server.js
