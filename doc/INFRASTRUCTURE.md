# MyEduPort — Infrastructure & Stack

_Snapshot as of 2026-09-13. Single-server deployment. Update this file when infra changes._

## 1. At a glance

| Layer | Technology | Where |
|---|---|---|
| Host OS | Ubuntu 24.04.3 LTS (kernel 6.8) | server `MyEduPort01` |
| Reverse proxy / TLS | nginx 1.24.0 | `:80` → 301 → `:443` |
| Frontend | React 18 + React Router 6 (Vite build) | static `dist/` via nginx |
| Backend API | Node.js v24 + Express 4 | `:4000` (pm2) |
| Database | MySQL 8.0.40 | `:3306` (localhost) |
| AI | Anthropic Claude (`@anthropic-ai/sdk`) | model `claude-sonnet-4-6` |
| Process mgr | pm2 | 2 apps |
| Domain / DNS | `myeduport.ai` (+ www) → `5.223.72.232` | DigiCert TLS |
| Source | github.com/suwitinjinda/MyEduPort | manual deploy |

**Everything runs on one VPS** — no load balancer, no container orchestration, no managed DB.

## 2. Server / host

- **OS:** Ubuntu 24.04.3 LTS · kernel `6.8.0-90-generic`
- **IPv4:** `5.223.72.232` · **IPv6:** `2a01:4ff:2f0:2a5b::1`
- **App user:** `dev` — **no sudo / root access** (firewall & nginx changes must be done by an admin or via the cloud console)
- **Project root:** `/home/dev/MyEduPort`

## 3. Domain, DNS & TLS

- **Domain:** `myeduport.ai`, `www.myeduport.ai` → A record `5.223.72.232`
- **TLS cert:** DigiCert / **Thawte TLS RSA CA G1** (a real, browser-trusted cert — not Let's Encrypt), valid until **2027-02-07**
- **Cert files:** `/etc/ssl/myeduport.ai/fullchain.pem` + `privkey.pem` (root-owned) — **manual renewal** before Feb 2027 (no auto-renew configured)

## 4. Web / reverse proxy (nginx)

`/etc/nginx/sites-enabled/myeduport.ai`

- `:80` (v4+v6) → **301 redirect** to `https://`
- `:443 ssl http2` — serves the SPA and proxies the API:
  - `root /home/dev/MyEduPort/frontend/dist` — static frontend
  - `location /api/` → `proxy_pass http://127.0.0.1:4000`
  - `location /uploads/` → `http://127.0.0.1:4000`
  - `location = /health` → `http://127.0.0.1:4000/health`
  - `location /` → SPA fallback
- `client_max_body_size 50M` (upload cap)

## 5. Backend API

- **Runtime:** Node.js **v24.13.0**, Express **4.21.2**
- **Entry:** `backend/src/index.js` · **Port:** `4000`
- **Process:** pm2 `myeduport-backend` (fork, autorestart, `max_memory_restart 500M`, restarts logged to `logs/backend-*.log`)
- **Routes:** `/api/auth`, `/students`, `/parents`, `/counselors`, `/ai`, `/universities`, `/uploads`, `/admin`, `/personality`, `/career`
- **Key dependencies:**
  - `express`, `cors`, `dotenv`
  - `mysql2` (pool)
  - `@anthropic-ai/sdk` `0.72.1` (Claude)
  - `jsonwebtoken` (JWT), `bcryptjs` (password hashing)
  - `google-auth-library` (Google Sign-In `verifyIdToken`)
  - `multer` (file uploads → `backend/uploads/`, ~2.6 MB)
- **Safety net:** `process.on("unhandledRejection"/"uncaughtException")` logs instead of crashing.

## 6. Frontend

- **Stack:** React **18.3.1**, `react-router-dom` 6, **Vite** build; `jspdf` for client-side PDF export
- **Production:** `npm run build` → `frontend/dist/`, served by nginx (no Node process needed in prod)
- **Dev server (HMR):** Vite on **`127.0.0.1:5173` (localhost-only)** — pm2 `myeduport-frontend` (`npm run dev`). Not public; reach it via SSH tunnel `ssh -L 5173:localhost:5173 dev@5.223.72.232`.

## 7. Database

- **Engine:** MySQL **8.0.40** · **DB:** `myeduport` · **23 tables**
- **Bind:** classic protocol `127.0.0.1:3306` (localhost-only ✅)
- **Schema & migrations:** `backend/database/` — `schema.sql` + `alter_*.sql` (12 incremental migrations, `alter_phase2…phase6`). Run **manually** via a small `mysql2` node runner (no migration framework).
- **Seeds:** `seed*.sql`, `createAdminUser.js`, `seedDatabase.js`
- Key tables: `users`, `students`, `parents`, `counselors`, academics/tests/activities/awards/documents, `essays` (+ `essay_drafts`), `tasks`, `saved_universities`, `universities`, `ai_reports`, `ai_chat_*`, `app_settings`, `usage_counters`, `personality_assessments`, `interest_assessments`.

## 8. AI

- **Provider:** Anthropic Claude via `@anthropic-ai/sdk`, model default **`claude-sonnet-4-6`** (override with `CLAUDE_MODEL`). Key: `ANTHROPIC_API_KEY`.
- All AI calls have **deterministic heuristic fallbacks** when the key is missing/errors, so the app never hard-fails on AI.
- `OPENAI_API_KEY` exists in `.env` but is **not used** by the code (Anthropic only).
- Uses: EduBot chat, gap analysis, acceptance prediction, portfolio/essay/section AdviAI, personality & career narratives.

## 9. Auth & access control

- **JWT** (`jsonwebtoken`, **7-day** expiry, `JWT_SECRET`); passwords via **bcryptjs**.
- **Google Sign-In:** `verifyIdToken` (ID-token only — **no client secret needed**), `GOOGLE_CLIENT_ID`. Google Console needs `https://myeduport.ai` as an Authorized JS origin.
- **Roles:** student / parent / counselor (+ admin by `ADMIN_EMAIL`). Route guards on both frontend (`ProtectedRoute role=`) and backend.
- **Plans:** `free` / `essential` / `professional` (`users.plan`), feature gating + monthly/lifetime **quotas** (`usage_counters`), admin-editable limits (`app_settings`).

## 10. Process management & deploy

- **pm2** (`ecosystem.config.cjs`) runs 2 apps; logs in `logs/`.
- **Deploy (manual):** `git pull` → `npm install` (if deps changed) → `cd frontend && npm run build` → `pm2 restart myeduport-backend myeduport-frontend --update-env` → run any new `alter_*.sql` migrations by hand.
- **No CI/CD.** No automated backups configured (recommend `mysqldump` cron + off-site).

## 11. Environment variables (`backend/.env`)

`PORT`, `JWT_SECRET`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `UPLOAD_DIR`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` (unused), `ADMIN_EMAIL`, `GOOGLE_CLIENT_ID`
Frontend build reads `VITE_GOOGLE_CLIENT_ID` from `frontend/.env`.

## 12. ⚠️ Hardening / open items

| Status | Item |
|---|---|
| ✅ **Fixed** | Backend now binds `127.0.0.1:4000` (`src/index.js`, `HOST` env override) — public `:4000` closed; nginx still reaches it. |
| 🟡 **Configured** | MySQL X-protocol `:33060`: `mysqlx_bind_address=127.0.0.1` set `PERSIST_ONLY` — **applies on next `systemctl restart mysql` (needs sudo)**; until then still open. `mysqlx` is a built-in plugin so it can't be uninstalled at runtime. |
| ✅ **Done** | DB backups: node dump `backend/scripts/db-backup.mjs` (gzipped JSON, keeps 14) + **daily cron 03:00** (dev crontab). Off-site copy still TODO. |
| ✅ **Done** | `pm2 save` run (process list persisted for `pm2 resurrect`). |
| ⚠️ **Needs sudo** | **No OS firewall** — restrict `:33060` (and `:4000` as defence-in-depth) at the **cloud security group**. |
| ⚠️ **Needs sudo** | **TLS cert manual renewal** before 2027-02-07; `pm2 startup` for real boot auto-start. |
| ⚠️ **Needs sudo** | MySQL at-rest encryption for sensitive personality/interest data. |
| Low | Rotate/remove unused `OPENAI_API_KEY`; secrets are plaintext in `.env`. |
| Legal | **O\*NET license** for the Career Test (RIASEC) — confirm CC BY-ND (Option A) vs Developer License before public launch (see `doc/careerTest` §7). |

---
_Frontend dev server was already restricted to localhost; nginx + TLS + backend/DB are healthy and serving `https://myeduport.ai`._
