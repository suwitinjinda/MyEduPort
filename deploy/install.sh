#!/bin/bash
# MyEduPort — One-shot production install
# Run with: sudo bash /home/dev/MyEduPort/deploy/install.sh
#
# This script:
#   1. Installs nginx
#   2. Copies SSL cert files to /etc/ssl/myeduport.ai/ with correct permissions
#   3. Drops in the nginx config
#   4. Opens firewall ports 80 + 443
#   5. Reloads nginx
#   6. Verifies the site is serving HTTPS

set -e

# Colors
G='\033[32m'; R='\033[31m'; Y='\033[33m'; B='\033[36m'; N='\033[0m'

if [ "$EUID" -ne 0 ]; then
  echo -e "${R}This script needs sudo. Run: sudo bash $0${N}"
  exit 1
fi

PROJECT_DIR="/home/dev/MyEduPort"
SSL_SRC="$PROJECT_DIR/deploy/ssl"
SSL_DST="/etc/ssl/myeduport.ai"
NGINX_CONF="$PROJECT_DIR/deploy/nginx-myeduport.conf"
DOMAIN="myeduport.ai"

echo -e "${B}━━━ MyEduPort production install ━━━${N}"

# ─── Step 1: Install nginx ──────────────────────────────────────────
echo ""
echo -e "${B}[1/6] Installing nginx…${N}"
if command -v nginx > /dev/null; then
  echo "  nginx already installed: $(nginx -v 2>&1)"
else
  apt-get update -qq
  apt-get install -y nginx
fi
systemctl enable nginx

# ─── Step 2: Install SSL cert files ────────────────────────────────
echo ""
echo -e "${B}[2/6] Installing SSL cert to $SSL_DST…${N}"
mkdir -p "$SSL_DST"
cp "$SSL_SRC/myeduport.ai.fullchain.pem" "$SSL_DST/fullchain.pem"
cp "$SSL_SRC/myeduport.ai.key.pem"        "$SSL_DST/privkey.pem"
cp "$SSL_SRC/myeduport.ai.ca.pem"         "$SSL_DST/chain.pem"
cp "$SSL_SRC/myeduport.ai.crt.pem"        "$SSL_DST/cert.pem"

chown -R root:root "$SSL_DST"
chmod 700 "$SSL_DST"
chmod 600 "$SSL_DST"/*.pem
ls -la "$SSL_DST/" | sed 's/^/    /'

# ─── Step 3: Drop in nginx config ──────────────────────────────────
echo ""
echo -e "${B}[3/6] Installing nginx config…${N}"
cp "$NGINX_CONF" /etc/nginx/sites-available/$DOMAIN
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN
rm -f /etc/nginx/sites-enabled/default

# Verify config
if nginx -t 2>&1 | grep -q "test is successful"; then
  echo -e "  ${G}✓ nginx config valid${N}"
else
  echo -e "  ${R}✗ nginx config invalid${N}"
  nginx -t
  exit 1
fi

# ─── Step 4: Firewall ──────────────────────────────────────────────
echo ""
echo -e "${B}[4/6] Opening firewall (80, 443)…${N}"
if command -v ufw > /dev/null && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw allow OpenSSH 2>/dev/null || ufw allow 22/tcp
  ufw reload
  echo -e "  ${G}✓ ufw rules applied${N}"
else
  echo -e "  ${Y}⚠ ufw not active — skipping firewall config. Make sure your VPS provider allows 80/443 in their dashboard.${N}"
fi

# ─── Step 5: Reload nginx ──────────────────────────────────────────
echo ""
echo -e "${B}[5/6] Reloading nginx…${N}"
systemctl reload nginx
sleep 1
systemctl is-active --quiet nginx && echo -e "  ${G}✓ nginx is running${N}" || (echo -e "  ${R}✗ nginx failed${N}"; exit 1)

# ─── Step 6: Smoke test ────────────────────────────────────────────
echo ""
echo -e "${B}[6/6] Smoke test…${N}"
# HTTP redirect
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --resolve "$DOMAIN:80:127.0.0.1" "http://$DOMAIN/" || echo "fail")
[ "$HTTP_CODE" = "301" ] && echo -e "  ${G}✓ HTTP redirects (301)${N}" || echo -e "  ${Y}⚠ HTTP returned $HTTP_CODE${N}"

# HTTPS health
HTTPS_HEALTH=$(curl -sk --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/api/health" || echo "fail")
echo "$HTTPS_HEALTH" | grep -q '"db":"ok"' \
  && echo -e "  ${G}✓ HTTPS /api/health: $HTTPS_HEALTH${N}" \
  || echo -e "  ${R}✗ /api/health failed: $HTTPS_HEALTH${N}"

# HTTPS root
HTTPS_ROOT=$(curl -sk -o /dev/null -w "%{http_code}" --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/")
[ "$HTTPS_ROOT" = "200" ] && echo -e "  ${G}✓ HTTPS root returns 200${N}" || echo -e "  ${R}✗ HTTPS root returned $HTTPS_ROOT${N}"

# Cert expiry
EXPIRY=$(echo | openssl s_client -connect 127.0.0.1:443 -servername $DOMAIN 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
echo -e "  ${G}✓ Cert expires: $EXPIRY${N}"

echo ""
echo -e "${G}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}"
echo -e "${G}  DONE — visit https://$DOMAIN${N}"
echo -e "${G}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}"
