#!/bin/bash

echo "================================================"
echo "  Emergency Evacuation System - Setup Script"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm --version)${NC}"

echo ""
echo "Setting up modules..."
echo ""

# Setup Backend Server
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Backend Server (server/)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd server
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠ Please edit server/.env with your configuration${NC}"
fi
echo "Installing dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend server setup complete${NC}"
else
    echo -e "${RED}✗ Backend server setup failed${NC}"
fi
cd ..
echo ""

# Setup Admin Dashboard
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Admin Dashboard (admin/)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd admin
echo "Installing dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Admin dashboard setup complete${NC}"
else
    echo -e "${RED}✗ Admin dashboard setup failed${NC}"
fi
cd ..
echo ""

# Setup Floor Screens
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. Floor Screens (screens/)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd screens
echo "Installing dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Floor screens setup complete${NC}"
else
    echo -e "${RED}✗ Floor screens setup failed${NC}"
fi
cd ..
echo ""

# Setup Mock Services
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Mock Services (mock-services/)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd mock-services
echo "Installing dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Mock services setup complete${NC}"
    echo "Generating test images..."
    npm run generate-images 2>/dev/null || true
else
    echo -e "${RED}✗ Mock services setup failed${NC}"
fi
cd ..
echo ""

echo "================================================"
echo -e "${GREEN}Setup Complete!${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Configure server/.env with your settings"
echo "2. Ensure MongoDB is running"
echo "3. Start the modules:"
echo ""
echo "   Terminal 1: ./start-server.sh    # Backend API"
echo "   Terminal 2: ./start-admin.sh     # Admin Dashboard"
echo "   Terminal 3: ./start-screens.sh   # Floor Screens"
echo "   Terminal 4: ./start-mock.sh      # Mock Services (dev)"
echo ""
echo "Default URLs:"
echo "  • Backend Server:    http://localhost:3000"
echo "  • Admin Dashboard:   http://localhost:3030"
echo "  • Floor Screens:     http://localhost:3060"
echo "  • Floor USRP-Bridge: http://localhost:3062"
echo "  • Mock Services:     http://localhost:3090"
echo ""
