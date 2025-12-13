#!/bin/bash

# WhatsApp Group Analytics - Startup Script
# ==========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "=============================================="
echo "  WhatsApp Group Analytics Automation"
echo "=============================================="
echo -e "${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js v18 or higher"
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js v18 or higher required (found v$NODE_VERSION)${NC}"
    exit 1
fi

echo -e "${GREEN}Node.js version: $(node -v)${NC}"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please copy .env.example to .env and configure it"
    echo "  cp .env.example .env"
    exit 1
fi

# Check if credentials file exists
CREDS_PATH=$(grep GOOGLE_CREDENTIALS_PATH .env | cut -d'=' -f2)
if [ ! -f "$CREDS_PATH" ]; then
    echo -e "${YELLOW}Warning: Google credentials file not found at $CREDS_PATH${NC}"
    echo "The application will fail to connect to Google Sheets"
fi

# Parse command line arguments
case "${1:-}" in
    "list-groups"|"list"|"groups")
        echo -e "${BLUE}Listing all WhatsApp groups...${NC}"
        npm run list-groups
        ;;
    "dev"|"development")
        echo -e "${BLUE}Starting in development mode...${NC}"
        npm run dev
        ;;
    "build")
        echo -e "${BLUE}Building project...${NC}"
        npm run build
        ;;
    "capture")
        echo -e "${BLUE}Starting with immediate capture...${NC}"
        npm run build
        node dist/index.js --run-capture
        ;;
    "report")
        echo -e "${BLUE}Starting with immediate report...${NC}"
        npm run build
        node dist/index.js --run-report
        ;;
    "help"|"-h"|"--help")
        echo "Usage: ./start.sh [command]"
        echo ""
        echo "Commands:"
        echo "  (none)       Start the application in production mode"
        echo "  dev          Start in development mode (with ts-node)"
        echo "  list-groups  List all WhatsApp groups with IDs"
        echo "  capture      Start and run capture job immediately"
        echo "  report       Start and run report job immediately"
        echo "  build        Build the TypeScript project"
        echo "  help         Show this help message"
        echo ""
        exit 0
        ;;
    *)
        echo -e "${BLUE}Building and starting in production mode...${NC}"
        npm run build
        echo ""
        echo -e "${GREEN}Starting application...${NC}"
        echo -e "${YELLOW}If this is your first run, scan the QR code with WhatsApp${NC}"
        echo ""
        node dist/index.js
        ;;
esac
