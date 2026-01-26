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

## Notes
- AI endpoints currently return deterministic mock data (no external LLM API).
- Uploads are stored in `backend/uploads`.
- Configure `VITE_API_URL` in the frontend if your API runs elsewhere.
- Admin access: Set `ADMIN_EMAIL` in backend `.env` to enable admin routes.
# MyEduPort
