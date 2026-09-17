#!/usr/bin/env bash
# MyEduPort — one-shot hardening for the items that need root.
# Review before running. Run:  sudo bash /home/dev/MyEduPort/deploy/harden-sudo.sh
# Safe to re-run (idempotent). It will NOT touch app code or data.
set -u
say() { printf "\n\033[1;36m== %s ==\033[0m\n" "$*"; }

# 1) Close MySQL X-protocol :33060 (mysqlx_bind_address=127.0.0.1 was set PERSIST_ONLY).
#    A restart applies it. Verify AFTER that both 3306 and 33060 are localhost-only.
say "1/3  Restart MySQL to apply mysqlx_bind_address=127.0.0.1"
systemctl restart mysql && echo "mysql restarted" || echo "!! mysql restart failed — check: systemctl status mysql"
sleep 2
echo "-- listeners on 3306/33060 (want 127.0.0.1 only, no 0.0.0.0/:::):"
ss -ltnp 2>/dev/null | grep -E ':3306|:33060' || echo "   (none listening publicly — good)"

# 2) OS firewall (ufw): allow SSH + web only. SSH IS ALLOWED FIRST so you can't lock out.
say "2/3  Firewall (ufw): allow 22/80/443, deny the rest"
if command -v ufw >/dev/null 2>&1; then
  ufw allow 22/tcp    >/dev/null 2>&1 && echo "allowed 22 (SSH)"
  ufw allow 80/tcp    >/dev/null 2>&1 && echo "allowed 80 (HTTP)"
  ufw allow 443/tcp   >/dev/null 2>&1 && echo "allowed 443 (HTTPS)"
  ufw default deny incoming  >/dev/null 2>&1
  ufw default allow outgoing >/dev/null 2>&1
  yes | ufw enable    >/dev/null 2>&1 && echo "ufw enabled"
  ufw status verbose
else
  echo "!! ufw not installed. Install with: apt-get install -y ufw   then re-run this script."
  echo "   (Also set the same rules in your cloud provider's security group / firewall panel.)"
fi

# 3) pm2 auto-start on boot (so the API/frontend come back after a reboot).
say "3/3  pm2 startup on boot (as user 'dev')"
env PATH="$PATH:/usr/bin" pm2 startup systemd -u dev --hp /home/dev \
  && sudo -u dev bash -lc 'pm2 save' \
  && echo "pm2 boot-start configured" \
  || echo "!! pm2 startup failed — run the command pm2 printed above, then: sudo -u dev pm2 save"

say "Done. Not automated here (by design):"
echo " - TLS cert is DigiCert/Thawte (manual) — renew before 2027-02-07, no auto-renew."
echo " - MySQL at-rest encryption for personality/interest data — larger change."
echo " - Off-site copy of backups/data/*.json.gz."
