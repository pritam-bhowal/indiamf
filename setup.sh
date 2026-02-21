#!/bin/bash

# Indian Mutual Funds POC - Setup Script (SQLite version)
# No admin access required!

set -e

echo "=========================================="
echo "  Indian Mutual Funds POC - Setup"
echo "  (SQLite version - no admin needed)"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_step() {
    echo ""
    echo -e "${GREEN}==>${NC} $1"
    echo ""
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ============================================
# STEP 1: Check/Install Node.js
# ============================================
print_step "Step 1: Checking for Node.js..."

# Check if node is available
if command -v node &> /dev/null; then
    echo "Node.js found: $(node --version)"
else
    echo "Node.js not found. Installing via nvm (no admin required)..."

    # Install nvm
    export NVM_DIR="$HOME/.nvm"
    if [ ! -d "$NVM_DIR" ]; then
        echo "Installing nvm..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    fi

    # Load nvm
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

    # Install latest LTS Node.js
    echo "Installing Node.js LTS..."
    nvm install --lts
    nvm use --lts

    echo "Node.js installed: $(node --version)"
fi

# Make sure npm is available
if ! command -v npm &> /dev/null; then
    echo "npm not found. Please ensure Node.js is properly installed."
    exit 1
fi

# ============================================
# STEP 2: Install Backend Dependencies
# ============================================
print_step "Step 2: Installing backend dependencies..."

cd "$SCRIPT_DIR/backend"

# Clean up old node_modules if exists
if [ -d "node_modules" ]; then
    echo "Cleaning up old node_modules..."
    rm -rf node_modules package-lock.json
fi

npm install

# ============================================
# STEP 3: Seed Database
# ============================================
print_step "Step 3: Seeding SQLite database..."

npm run seed

# ============================================
# STEP 4: Install Frontend Dependencies
# ============================================
print_step "Step 4: Installing frontend dependencies..."

cd "$SCRIPT_DIR/frontend"

# Clean up old node_modules if exists
if [ -d "node_modules" ]; then
    echo "Cleaning up old node_modules..."
    rm -rf node_modules package-lock.json
fi

npm install

# ============================================
# DONE!
# ============================================
echo ""
echo "=========================================="
echo -e "${GREEN}  Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Database: SQLite (stored in backend/data/mfdb.sqlite)"
echo ""
echo "To start the application:"
echo ""
echo "  1. Start the backend (Terminal 1):"
echo "     cd ~/indian-mf-app/backend && npm run dev"
echo ""
echo "  2. Start the frontend (Terminal 2):"
echo "     cd ~/indian-mf-app/frontend && npm run dev"
echo ""
echo "  3. Open http://localhost:5173 in your browser"
echo ""
echo "=========================================="
