#!/bin/bash

# Fireworks Inventory - Dreamhost Deployment Script
# Run this ON YOUR DREAMHOST SERVER after uploading the files

set -e  # Exit on error

echo "=========================================="
echo "Fireworks Inventory - Dreamhost Setup"
echo "=========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Installing..."
    echo "Please install Node.js first:"
    echo "  Option 1: Ask Dreamhost support to enable Node.js"
    echo "  Option 2: Use NVM (Node Version Manager):"
    echo "    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "    source ~/.bashrc"
    echo "    nvm install 20"
    exit 1
fi

echo "✓ Node.js version: $(node --version)"
echo "✓ npm version: $(npm --version)"
echo ""

# Install dependencies
echo "Installing dependencies..."
cd ~/fireworks-inventory
npm install
cd server
npm install
cd ..

echo ""
echo "✓ Dependencies installed"
echo ""

# Build frontend for production
echo "Building frontend..."
npm run build

echo ""
echo "✓ Frontend built"
echo ""

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2 process manager..."
    npm install -g pm2
fi

echo "✓ PM2 installed"
echo ""

# Create .env file for production
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
FRONTEND_PORT=5173
EOF

echo "✓ Environment configured"
echo ""

# Start with PM2
echo "Starting servers with PM2..."
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Servers running:"
pm2 list
echo ""
echo "Next steps:"
echo "1. Set up subdomain in Dreamhost panel"
echo "2. Configure Apache reverse proxy (see apache-config.txt)"
echo "3. Access at: http://inventory.kcap.club"
echo ""
echo "Useful commands:"
echo "  pm2 list          - View running processes"
echo "  pm2 logs          - View logs"
echo "  pm2 restart all   - Restart servers"
echo "  pm2 stop all      - Stop servers"
echo ""
