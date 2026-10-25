#!/usr/bin/env bash
#
# Turn test-result share links from
#     https://myeduport.ai/api/share/t/<token>
# into
#     https://myeduport.ai/t/<token>
#
# Run once as root. On this server `dev` is not in sudoers, so become root with `su -`
# (it asks for the ROOT password, not yours) and then run the script:
#
#     su -
#     bash /home/dev/MyEduPort/deploy/enable-share-links.sh
#
# If you are on a box where sudo works, this is equivalent:
#
#     sudo bash /home/dev/MyEduPort/deploy/enable-share-links.sh
#
# What it does
#   1. backs up the nginx site config next to the original
#   2. adds a `location ^~ /t/` block that proxies to the backend
#   3. tests the config, and only reloads nginx if the test passes
#   4. sets SHARE_PATH=/t/ in backend/.env so new links use the short form
#   5. restarts the API and checks a real request end to end
#
# Safe to run twice — it detects work it has already done and skips it.
# Links already shared keep working either way: the backend serves both paths.

set -euo pipefail

SITE=/etc/nginx/sites-available/myeduport.ai
ENV_FILE=/home/dev/MyEduPort/backend/.env
APP_USER=dev

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
fail() { printf '\n\033[31m✗ %s\033[0m\n\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || fail "This needs root. Run:  su -   then:  bash $0"
[[ -f $SITE ]]    || fail "nginx site config not found at $SITE"
[[ -f $ENV_FILE ]]|| fail "backend .env not found at $ENV_FILE"

# ---------------------------------------------------------------- 1. nginx
if grep -q 'location \^~ /t/' "$SITE"; then
  say "nginx already has the /t/ block — leaving it alone."
else
  BACKUP="${SITE}.bak.$(date +%Y%m%d-%H%M%S)"
  cp -p "$SITE" "$BACKUP"
  say "Backed up nginx config to $BACKUP"

  # Insert immediately before the SPA fallback, so /t/ wins over try_files.
  # ^~ stops nginx from testing regex locations once this prefix matches.
  python3 - "$SITE" <<'PY'
import io, sys, re
path = sys.argv[1]
s = io.open(path, encoding="utf-8").read()

block = """    # Public test-result share pages. Rendered as real HTML by the backend because
    # the Facebook and X crawlers do not run JavaScript, so a link into the React app
    # would always preview with the generic site title instead of the student's result.
    location ^~ /t/ {
        proxy_pass http://127.0.0.1:4000/api/share/t/;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

"""

anchor = "    # SPA fallback"
if anchor not in s:
    sys.exit("Could not find the SPA fallback block to insert before — insert the /t/ block by hand.")
if s.count(anchor) != 1:
    sys.exit("Found more than one SPA fallback block — insert the /t/ block by hand.")

io.open(path, "w", encoding="utf-8").write(s.replace(anchor, block + anchor, 1))
print("  inserted the /t/ location block")
PY

  say "Testing the nginx config"
  if ! nginx -t; then
    cp -p "$BACKUP" "$SITE"
    fail "nginx rejected the new config — restored $BACKUP, nothing changed."
  fi

  systemctl reload nginx
  say "nginx reloaded"
fi

# ---------------------------------------------------------------- 2. backend
if grep -qE '^\s*SHARE_PATH=' "$ENV_FILE"; then
  sed -i -E 's|^\s*SHARE_PATH=.*|SHARE_PATH=/t/|' "$ENV_FILE"
  say "Updated SHARE_PATH in backend/.env"
else
  printf '\n# Short share links for test results (see deploy/enable-share-links.sh)\nSHARE_PATH=/t/\n' >> "$ENV_FILE"
  say "Added SHARE_PATH=/t/ to backend/.env"
fi

say "Restarting the API"
AS_APP='export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"; pm2 restart myeduport-backend --update-env'
if command -v runuser >/dev/null 2>&1; then
  runuser -l "$APP_USER" -c "$AS_APP" >/dev/null
else
  su - "$APP_USER" -c "$AS_APP" >/dev/null
fi
sleep 3

# ---------------------------------------------------------------- 3. prove it
say "Checking it end to end"
CODE=$(curl -s -o /dev/null -w '%{http_code}' https://myeduport.ai/t/definitely-not-a-real-token || true)
TYPE=$(curl -s -o /dev/null -w '%{content_type}' https://myeduport.ai/t/definitely-not-a-real-token || true)

if [[ "$CODE" == "404" && "$TYPE" == text/html* ]]; then
  printf '\n\033[32m✓ Done.\033[0m An unknown token returns 404 as HTML, so the route is live.\n'
  printf '  New links will look like: https://myeduport.ai/t/<token>\n'
  printf '  Links already shared keep working — the old /api/share/t/ path still serves.\n\n'
else
  printf '\n\033[31m✗ Unexpected response: HTTP %s, content-type %s\033[0m\n' "$CODE" "$TYPE" >&2
  printf '  Expected 404 text/html. Check: sudo nginx -t && pm2 logs myeduport-backend\n\n' >&2
  exit 1
fi
