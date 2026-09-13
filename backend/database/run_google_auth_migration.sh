#!/bin/bash
# Run from project root: ./backend/database/run_google_auth_migration.sh
# Or: cd MyEduPort && bash backend/database/run_google_auth_migration.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

# Load .env from backend
if [ -f backend/.env ]; then
  export $(grep -E '^DB_' backend/.env | grep -v '^#' | xargs)
fi

DB_USER="${DB_USER:-admindb}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_HOST="${DB_HOST:-localhost}"
DB_NAME="${DB_NAME:-myeduport}"

echo "Running Google auth migration on $DB_NAME@$DB_HOST..."
if [ -n "$DB_PASSWORD" ]; then
  mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" < backend/database/alter_add_google_auth.sql
else
  mysql -u "$DB_USER" -h "$DB_HOST" "$DB_NAME" < backend/database/alter_add_google_auth.sql
fi
echo "Migration complete."
