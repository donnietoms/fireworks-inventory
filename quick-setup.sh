#!/bin/bash

# Quick deployment commands to run after upload completes
# SSH into your Dreamhost server and run these commands

echo "=========================================="
echo "Post-Upload Setup for Dreamhost"
echo "=========================================="
echo ""

# Check Node.js
echo "Checking Node.js installation..."
if command -v node &> /dev/null; then
    echo "✓ Node.js found: $(node --version)"
else
    echo "Installing Node.js via NVM..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 20
    nvm use 20
    nvm alias default 20
fi

echo ""
echo "Installing dependencies..."
cd ~/fireworks-inventory
npm install --production

echo ""
echo "Installing server dependencies..."
cd ~/fireworks-inventory/server
npm install --production

echo ""
echo "Building frontend..."
cd ~/fireworks-inventory
npm run build

echo ""
echo "Installing PM2..."
npm install -g pm2

echo ""
echo "Installing serve for static files..."
npm install -g serve

echo ""
echo "Starting application..."
cd ~/fireworks-inventory
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
pm2 list
echo ""
echo "Next: Set up subdomain at panel.dreamhost.com"
echo "Then visit: http://inventory.kcap.club"
