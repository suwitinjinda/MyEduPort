# MyEduPort (React + Node + MySQL)

Phase 1 MVP implementation for the MyEduPort portfolio platform with a React frontend and an Express + MySQL backend.

## Project structure
- `frontend/` React app (Vite)
- `backend/` Express API + MySQL

## Backend setup
1. Install dependencies:
   - `cd backend`
   - `npm install`
2. Create database and tables:
   - Import `backend/database/schema.sql`
   - Import `backend/database/seed.sql` (optional sample universities)
   - If database already exists, run `backend/database/alter_add_invite_code.sql` to add invite_code column
3. Create `.env` from `backend/env.example` and update DB credentials:
   - Set `DB_USER`, `DB_PASSWORD`, `DB_NAME`
   - Set `JWT_SECRET` to a random string
   - Optionally set `ADMIN_EMAIL` for admin access
4. Start server:
   - `npm run dev`

## Frontend setup
1. Install dependencies:
   - `cd frontend`
   - `npm install`
2. Start dev server:
   - `npm run dev`

## Phase 1 Features Implemented

### Authentication & Roles
- ✅ Email/password login + registration
- ✅ Role selection (Student/Parent)
- ✅ JWT-based authentication
- ✅ Protected routes

### Student Profile & Portfolio
- ✅ Personal info (grade, school, target countries, intended major)
- ✅ Academic records (yearly grades, courses, levels)
- ✅ Test scores (SAT, ACT, IELTS, TOEFL, etc.)
- ✅ Extracurricular activities (with leadership flags)
- ✅ Awards & achievements
- ✅ Document upload & management (PDF/JPG/PNG)
- ✅ Portfolio completion tracking

### Parent Features
- ✅ Parent-student linking via invite codes
- ✅ Parent dashboard with linked students
- ✅ Portfolio completion monitoring

### AI Features (Mock Implementation)
- ✅ Profile strength score (0-100 with category breakdowns)
- ✅ Gap analysis (prioritized next steps)
- ✅ University recommendations (Reach/Target/Safety)
- ✅ EduBot chatbot interface

### University Database
- ✅ University search by country
- ✅ Sample data for US, UK, China universities

### Admin Panel
- ✅ User list and stats
- ✅ Student overview
- ✅ Account disable functionality

## Login with Google

1. Create OAuth credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Create a "Web application" OAuth 2.0 Client ID
   - Add your frontend origin(s) to "Authorized JavaScript origins" (e.g. `http://localhost:5173`, `https://yourdomain.com`)
   - Add redirect URI if required

2. Run the database migration:
   ```bash
   mysql -u your_user -p myeduport < backend/database/alter_add_google_auth.sql
   ```

3. Add to backend `.env`:
   ```
   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   ```

4. Add to frontend `.env` (or `.env.local`):
   ```
   VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   ```

5. Restart both backend and frontend servers.

## AI with Claude Sonnet

EduBot, essay feedback, and gap analysis use **Claude Sonnet** (Anthropic) when configured:

1. Get an API key at [console.anthropic.com](https://console.anthropic.com/)
2. Add to `backend/.env`:
   ```
   ANTHROPIC_API_KEY=your_api_key
   ```
3. Restart the backend

Without the key, fallback heuristic responses are used. Optional: `CLAUDE_MODEL=claude-sonnet-4-6` (default — latest stable Sonnet 4.6).

The EduBot chat system prompt is grounded in the Excellent Portfolio Guide, so answers stay on-brand with admissions strategy. See `backend/src/services/aiClient.js` for the embedded `PORTFOLIO_GUIDE_CONTEXT`.

## Notes
- Uploads are stored in `backend/uploads`.
- Configure `VITE_API_URL` in the frontend if your API runs elsewhere.
- Admin access: Set `ADMIN_EMAIL` in backend `.env` to enable admin routes.

## v2 Schema Expansion (May 2026)

After upgrading, run the new migration once:

```bash
mysql -u your_user -p myeduport < backend/database/alter_full_expansion.sql
```

This adds:
- `activities.category` — Common App activity category
- `students.class_rank`, `students.share_token`, `students.share_expires_at`
- `tasks` table — application checklist with deadlines
- `saved_universities` table — your college list with Reach/Target/Safety buckets

## New Features (v2)

- **`/guide`** — The complete Excellent Portfolio Guide (11 sections, sticky TOC)
- **`/tasks`** — Application checklist with due-date tracker and seed template
- **`/compare`** — Side-by-side college list with Reach/Target/Safety, application rounds, deadlines, countdown
- **`/share/:token`** — Public read-only portfolio link (generated in Settings)
- **Acceptance Probability** — AI-driven estimate on Dashboard, computed across saved universities
- **EduBot grounded** — Chat system prompt now embeds the Portfolio Guide for on-brand answers
- **Language switcher** — English / ภาษาไทย / 中文 in the top nav
- **AP subject test types** — 30+ AP subjects in the standardized test dropdown
- **Class rank field** — Optional input in Portfolio Editor
# MyEduPort
