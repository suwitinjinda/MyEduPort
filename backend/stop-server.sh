#!/bin/bash

# Stop Node.js server on port 4000
# Usage: ./stop-server.sh

PORT=4000

echo "Checking for processes on port $PORT..."

# Find and kill process on port 4000
PID=$(lsof -ti :$PORT 2>/dev/null)

if [ -z "$PID" ]; then
    # Try alternative method
    PID=$(pgrep -f "node src/index.js" | head -1)
fi

if [ ! -z "$PID" ]; then
    echo "Found process $PID, stopping..."
    kill $PID 2>/dev/null
    sleep 1
    if kill -0 $PID 2>/dev/null; then
        echo "Force killing process $PID..."
        kill -9 $PID 2>/dev/null
    fi
    echo "✓ Server stopped"
else
    echo "No server process found on port $PORT"
fi
