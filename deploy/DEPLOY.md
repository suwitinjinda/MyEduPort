# MyEduPort — Deployment Guide

Production deploy on `myeduport.ai` → server `5.223.72.232`.

## Prerequisites
- Ubuntu / Debian server with sudo access
- Domain `myeduport.ai` A record pointing to this server (already done — one of the 3 IPs is 5.223.72.232)
- Backend running under PM2 (already done)
- Ports 80 + 443 open in firewall

---

## Step 1 — Install nginx + certbot
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
sudo systemctl enable nginx
```

## Step 2 — Build the frontend for production
```bash
cd /home/dev/MyEduPort/frontend
npm run build
# Output goes to /home/dev/MyEduPort/frontend/dist
```

## Step 3 — Drop in nginx config
```bash
sudo cp /home/dev/MyEduPort/deploy/nginx-myeduport.conf /etc/nginx/sites-available/myeduport.ai
sudo ln -sf /etc/nginx/sites-available/myeduport.ai /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
```

If `nginx -t` fails because cert files don't exist yet, that's expected — proceed to step 4.

## Step 4 — Get SSL certificate from Let's Encrypt
```bash
# Temporarily disable HTTPS block so certbot can run
sudo certbot --nginx -d myeduport.ai -d www.myeduport.ai \
  --non-interactive --agree-tos --email your-email@example.com \
  --redirect
```

This will:
- Verify domain ownership via HTTP-01 challenge
- Fetch + install Let's Encrypt cert
- Auto-configure nginx to use HTTPS
- Set up auto-renewal cron

## Step 5 — Verify
```bash
# Reload nginx with the real config
sudo nginx -t && sudo systemctl reload nginx

# Check
curl -I https://myeduport.ai
# expect: HTTP/2 200

curl https://myeduport.ai/api/health
# expect: {"api":"ok","db":"ok","ai":"configured",...}
```

## Step 6 — Open firewall (if ufw enabled)
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow OpenSSH
sudo ufw --force enable
```

## Step 7 — Update frontend env (if needed)
Frontend currently auto-discovers API URL via `window.location.hostname`, so once nginx is serving on the same domain, no change needed. If you want explicit:
```bash
echo 'VITE_API_URL=https://myeduport.ai' > /home/dev/MyEduPort/frontend/.env.production
cd /home/dev/MyEduPort/frontend && npm run build
```

## Step 8 — Stop dev Vite (no longer needed)
Once nginx is serving `/home/dev/MyEduPort/frontend/dist`, the Vite dev server on :5173 is redundant:
```bash
pm2 stop myeduport-frontend
pm2 save
```

(Or just leave it for local dev convenience — production traffic goes through nginx anyway.)

---

## Backend env vars (already set)
- `ANTHROPIC_API_KEY` — Claude API key ✓
- `DB_*` — MySQL connection ✓
- `JWT_SECRET` — auth signing ✓
- `GOOGLE_CLIENT_ID` — OAuth (optional)

In production, also set:
```bash
NODE_ENV=production
```

This activates HTTPS-only redirects in `backend/src/index.js`.

---

## SSL renewal (automatic)
certbot installs a systemd timer:
```bash
sudo systemctl status certbot.timer
```
Cert auto-renews when ≤ 30 days remain. No manual action needed.

---

## Health endpoints
- `GET https://myeduport.ai/health` → returns `{api, db, ai, time, uptime}`
- `GET https://myeduport.ai/api/health` → same content
- Use these for monitoring (UptimeRobot, Pingdom, etc.)

---

## DNS notes
`myeduport.ai` currently resolves to **3 IPs** (round-robin):
- 76.223.105.230 (AWS)
- 13.248.243.5 (AWS)
- 5.223.72.232 (this server)

For consistency:
- Option A — keep all 3 (if you have multi-region infra)
- Option B — remove the 2 AWS IPs, keep only 5.223.72.232 (simpler)
- Option C — put everything behind CloudFront, change DNS to a single CloudFront alias

Decide based on your traffic + DDoS requirements.
