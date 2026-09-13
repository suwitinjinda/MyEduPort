#!/bin/bash

# Start Node.js server with proper nvm setup
# Usage: ./start-server.sh

cd "$(dirname "$0")"

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Check if port 4000 is in use
if lsof -ti :4000 > /dev/null 2>&1; then
    echo "⚠ Port 4000 is already in use!"
    echo "Run './stop-server.sh' first or kill the process manually"
    exit 1
fi

echo "Starting backend server..."
npm start
