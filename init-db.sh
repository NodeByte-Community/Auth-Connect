#!/usr/bin/env bash
set -euo pipefail

# NodeByte Connect - MySQL Database Initialization Script
# Usage: ./init-db.sh [port]
#
# This script:
#   1. Reads MySQL connection params from .env
#   2. Creates database if not exists (utf8mb4 charset)
#   3. Imports db/schema.sql via mysql command (NOT prisma db push)
#   4. Starts the server via ./start.sh
#
# Prerequisites: MySQL server running on target host, mysql client installed locally.
# MySQL server software is NOT bundled - it must already exist on your server.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PORT="${1:-${PORT:-3000}}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  NodeByte Connect - MySQL Database Initialization            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ---------- Step 1: Check .env ----------
echo -e "${CYAN}[1/6] Checking .env file...${NC}"
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    echo -e "${YELLOW}[!] .env not found, copying from .env.example${NC}"
    cp .env.example .env
    echo -e "${RED}[ERROR] Please edit .env with your real MySQL credentials, then run ./init-db.sh again.${NC}"
    echo -e "${YELLOW}    Required: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD${NC}"
    exit 1
  else
    echo -e "${RED}[ERROR] No .env or .env.example found.${NC}"
    exit 1
  fi
fi

# Load .env
set -a
source .env
set +a

# Parse MySQL connection params
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-nbconnect}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"

# If DB_PASSWORD is empty, try to parse from DATABASE_URL
if [ -z "$DB_PASSWORD" ] && [ -n "${DATABASE_URL:-}" ]; then
  DB_PASSWORD=$(echo "$DATABASE_URL" | sed -n 's/^mysql:\/\/[^:]*:\([^@]*\)@.*/\1/p')
  [ -z "$DB_HOST" ] && DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/^mysql:\/\/[^@]*@\([^:]*\):.*/\1/p')
  [ -z "$DB_PORT" ] && DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/^mysql:\/\/[^@]*@[^:]*:\([0-9]*\)\/.*/\1/p')
fi

# Ensure DATABASE_URL is consistent with DB_* vars
export DATABASE_URL="mysql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo -e "${GREEN}[OK] MySQL configuration:${NC}"
echo -e "     Host:     ${DB_HOST}"
echo -e "     Port:     ${DB_PORT}"
echo -e "     Database: ${DB_NAME}"
echo -e "     User:     ${DB_USER}"
echo ""

# ---------- Step 2: Check mysql client ----------
echo -e "${CYAN}[2/6] Checking mysql client...${NC}"
if ! command -v mysql &>/dev/null; then
  echo -e "${RED}[ERROR] mysql client not found.${NC}"
  echo -e "${YELLOW}[!] Please install MySQL client (NOT the server, just the client):${NC}"
  echo -e "${YELLOW}    Ubuntu/Debian: sudo apt install mysql-client${NC}"
  echo -e "${YELLOW}    CentOS/RHEL:   sudo yum install mysql${NC}"
  echo -e "${YELLOW}    macOS:         brew install mysql-client${NC}"
  echo -e "${YELLOW}    The MySQL SERVER should already be running on ${DB_HOST}:${DB_PORT}${NC}"
  exit 1
fi
echo -e "${GREEN}[OK] mysql client: $(mysql --version)${NC}"

# ---------- Step 3: Test connection ----------
echo -e "${CYAN}[3/6] Testing MySQL connection to ${DB_HOST}:${DB_PORT}...${NC}"
MYSQL_BASE_CMD="mysql -h${DB_HOST} -P${DB_PORT} -u${DB_USER}"
if [ -n "$DB_PASSWORD" ]; then
  MYSQL_BASE_CMD="${MYSQL_BASE_CMD} -p${DB_PASSWORD}"
fi

if ! echo "SELECT 1" | $MYSQL_BASE_CMD 2>/dev/null | grep -q "1"; then
  echo -e "${RED}[ERROR] Cannot connect to MySQL server at ${DB_HOST}:${DB_PORT}${NC}"
  echo -e "${YELLOW}[!] Connection details:${NC}"
  echo -e "${YELLOW}    Host: ${DB_HOST}:${DB_PORT}${NC}"
  echo -e "${YELLOW}    User: ${DB_USER}${NC}"
  echo -e "${YELLOW}[!] Please check:${NC}"
  echo -e "${YELLOW}    1. MySQL server is running on ${DB_HOST}:${DB_PORT}${NC}"
  echo -e "${YELLOW}    2. Credentials in .env are correct (DB_USER, DB_PASSWORD)${NC}"
  echo -e "${YELLOW}    3. User '${DB_USER}' has permission to connect from this host${NC}"
  echo -e "${YELLOW}    4. Firewall allows connection to port ${DB_PORT}${NC}"
  exit 1
fi
echo -e "${GREEN}[OK] MySQL connection successful${NC}"

# ---------- Step 4: Create database if not exists ----------
echo -e "${CYAN}[4/6] Checking/creating database '${DB_NAME}'...${NC}"
DB_EXISTS=$(echo "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '${DB_NAME}';" | $MYSQL_BASE_CMD -N 2>/dev/null || echo "")

if [ -n "$DB_EXISTS" ]; then
  echo -e "${GREEN}[OK] Database '${DB_NAME}' already exists${NC}"
else
  echo -e "${YELLOW}[>] Creating database '${DB_NAME}' (utf8mb4_unicode_ci)...${NC}"
  if echo "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" | $MYSQL_BASE_CMD 2>/dev/null; then
    echo -e "${GREEN}[OK] Database '${DB_NAME}' created${NC}"
  else
    echo -e "${RED}[ERROR] Failed to create database '${DB_NAME}'.${NC}"
    echo -e "${YELLOW}[!] Please check if user '${DB_USER}' has CREATE permission.${NC}"
    exit 1
  fi
fi

# ---------- Step 5: Import schema SQL ----------
echo -e "${CYAN}[5/6] Importing database schema (db/schema.sql)...${NC}"
SQL_FILE="${SCRIPT_DIR}/db/schema.sql"
if [ ! -f "$SQL_FILE" ]; then
  echo -e "${RED}[ERROR] Schema file not found: ${SQL_FILE}${NC}"
  echo -e "${YELLOW}[!] This file should be included in the release package.${NC}"
  exit 1
fi

TABLES_COUNT=$(echo "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}';" | $MYSQL_BASE_CMD "${DB_NAME}" -N 2>/dev/null || echo "0")

if [ "$TABLES_COUNT" -gt "0" ] 2>/dev/null; then
  echo -e "${YELLOW}[!] Database already has ${TABLES_COUNT} tables. Skipping schema import.${NC}"
  echo -e "${YELLOW}[!] To recreate, drop the database first: DROP DATABASE ${DB_NAME};${NC}"
else
  echo -e "${CYAN}[>] Importing schema (${TABLES_COUNT} existing tables)...${NC}"
  if $MYSQL_BASE_CMD "${DB_NAME}" < "$SQL_FILE" 2>&1; then
    NEW_COUNT=$(echo "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}';" | $MYSQL_BASE_CMD "${DB_NAME}" -N 2>/dev/null || echo "0")
    echo -e "${GREEN}[OK] Schema imported: ${NEW_COUNT} tables created${NC}"
  else
    echo -e "${RED}[ERROR] Failed to import schema SQL.${NC}"
    echo -e "${YELLOW}[!] Please check:${NC}"
    echo -e "${YELLOW}    1. SQL file is valid: ${SQL_FILE}${NC}"
    echo -e "${YELLOW}    2. User '${DB_USER}' has CREATE TABLE permission on '${DB_NAME}'${NC}"
    exit 1
  fi
fi

# ---------- Step 6: Start server ----------
echo -e "${CYAN}[6/6] Database initialization complete. Starting server...${NC}"
echo ""
exec ./start.sh "$PORT"
