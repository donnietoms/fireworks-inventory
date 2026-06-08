#!/bin/bash

# Quick Docker Setup for Mac
# This installs Docker Desktop and tests the fireworks app

echo "=========================================="
echo "Fireworks Inventory - Docker Setup"
echo "=========================================="
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

echo "Installing Docker Desktop..."
brew install --cask docker

echo ""
echo "=========================================="
echo "⚠️  IMPORTANT: Manual Step Required"
echo "=========================================="
echo ""
echo "1. Open Docker Desktop from Applications"
echo "2. Accept the terms"
echo "3. Wait for Docker to start (whale icon in menu bar)"
echo "4. Then run: cd ~/fireworks-inventory && docker-compose up --build"
echo ""
echo "Press ENTER after Docker Desktop is running..."
read

# Test Docker
echo "Testing Docker installation..."
docker --version

echo ""
echo "Building and starting Fireworks Inventory..."
cd ~/fireworks-inventory
docker-compose up --build -d

echo ""
echo "=========================================="
echo "✅ Docker Setup Complete!"
echo "=========================================="
echo ""
echo "Access your app at:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:3001"
echo ""
echo "Useful commands:"
echo "  docker-compose logs -f    # View logs"
echo "  docker-compose down       # Stop containers"
echo "  docker-compose restart    # Restart"
echo ""
