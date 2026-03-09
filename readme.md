# 🏟️ CodeArena

A private DSA battle room platform where users create rooms, invite friends, and compete in timed coding sessions.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Database + Auth | Supabase (PostgreSQL) |
| Backend | Node.js + Express (ES Modules) |
| Code Execution | Judge0 (Phase 4) |
| Real-time | Socket.io (Phase 5) |
| Frontend | Next.js (Phase 7) |

---

## 📦 Project Structure

```
CodeArena/
└── backend/
    ├── src/
    │   ├── controllers/
    │   │   ├── roomController.js
    │   │   └── questionController.js        ← Phase 3
    │   ├── routes/
    │   │   ├── auth.routes.js
    │   │   ├── rooms.js
    │   │   └── questions.js                 ← Phase 3
    │   ├── validators/
    │   │   └── questionValidators.js        ← Phase 3
    │   ├── services/
    │   │   └── auth.service.js              ← Phase 1
    │   ├── middleware/
    │   │   ├── auth.middleware.js           ← Phase 1
    │   │   └── validate.js
    │   └── lib/
    │       ├── supabase.js
    │       └── errors.js
    ├── scripts/
    │   └── seedQuestions.js                 ← Phase 3
    ├── supabase/
    │   └── migrations/
    │       ├── 001_initial_schema.sql          ← Phase 1
    │       ├── 002_rls_indexes_triggers.sql    ← Phase 1
    │       ├── step1_alter_questions.sql       ← Phase 3
    │       ├── step2_tables_triggers_rls.sql   ← Phase 3
    │       └── 003b_question_stats_trigger.sql ← Run at Phase 4
    ├── .env
    ├── package.json
    └── app.js
```

---

## ✅ Build Progress

### Phase 1 — Supabase Setup + Auth ✅

**Files:**

| Layer | File | Description |
|-------|------|-------------|
| DB Schema | `migrations/001_initial_schema.sql` | All 7 tables with enums |
| DB Config | `migrations/002_rls_indexes_triggers.sql` | RLS, indexes, triggers |
| Supabase lib | `src/lib/supabase.js` | Admin + anon clients |
| Auth service | `src/services/auth.service.js` | signUp / signIn / verify / profile |
| Auth middleware | `src/middleware/auth.middleware.js` | `requireAuth` / `optionalAuth` |
| Auth routes | `src/routes/auth.routes.js` | REST endpoints |
| App | `src/app.js` + `src/server.js` | Express setup |

**What was built:**
- Supabase project initialized with email/password auth
- `users` table mirrors `auth.users` — auto-created via trigger on sign-up
- JWT-based authentication via Supabase Auth
- `requireAuth` / `optionalAuth` middleware for protected routes
- RLS enforces: room members see each other's data; only host mutates room settings; only service-role updates submissions

---

### Phase 2 — Room System ✅

**What was built:**
- `rooms` table with full session configuration
- `room_members` table for tracking participants
- Room code generation — 5-char uppercase alphanumeric, collision-safe
- Host is auto-added as `room_member` (role: `host`) on room insert
- Room status machine: `waiting → active → completed`
- Full room CRUD API (create, join, leave, start, end)

---

### Phase 3 — Question Bank ✅

**What was built:**
- `questions` table — full DSA problem schema with markdown description, examples, hints, constraints, difficulty, topics, time/memory limits
- `test_cases` table — sample (shown to user) + hidden (used for judging) test cases with score weights
- `room_questions` table — links questions to rooms with points and ordering
- `question_stats` table — auto-maintained acceptance rate, attempts, avg solve time
- Auto slug generation from title (DB trigger)
- Auto stats row creation on new question (DB trigger)
- GIN index on `topics[]` for fast filtering
- Full RLS policies
- `submissions.judge0_token` column reserved for Phase 4 async polling

**Seeded 6 questions:**

| Problem | Difficulty | Topics |
|---------|-----------|--------|
| Two Sum | Easy | arrays, hash-map |
| Valid Parentheses | Easy | stack, strings |
| Longest Substring Without Repeating Characters | Medium | strings, sliding-window, hash-map |
| Product of Array Except Self | Medium | arrays, prefix-sum |
| Trapping Rain Water | Hard | arrays, two-pointers, dynamic-programming |
| Merge K Sorted Lists | Hard | linked-list, heap, divide-and-conquer |

---

## 🗄️ Database Schema

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Mirrors `auth.users.id` |
| email | TEXT | |
| username | TEXT | Unique |
| display_name | TEXT | |
| avatar_url | TEXT | |
| bio | TEXT | |
| created_at | TIMESTAMPTZ | |

### `rooms`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| code | TEXT | 5-char invite code, unique |
| name | TEXT | |
| host_id | UUID FK→users | Room owner |
| status | TEXT | waiting / active / completed |
| is_private | BOOLEAN | |
| max_members | INT | |
| duration_mins | INT | |
| starts_at | TIMESTAMPTZ | |
| ends_at | TIMESTAMPTZ | |
| difficulty | TEXT | |
| topics | TEXT[] | |
| allow_language | TEXT[] | |
| show_leaderboard | BOOLEAN | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `room_members`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| room_id | UUID FK→rooms | |
| user_id | UUID FK→users | |
| role | TEXT | host / member |
| joined_at | TIMESTAMPTZ | |

### `questions`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| title | TEXT | |
| slug | TEXT UNIQUE | Auto-generated from title |
| description | TEXT | Markdown |
| difficulty | ENUM | easy / medium / hard |
| status | ENUM | draft / active / archived |
| topics | TEXT[] | GIN indexed |
| constraints | TEXT | Markdown |
| examples | JSONB | [{input, output, explanation}] |
| hints | TEXT[] | |
| time_limit_ms | INT | Default 2000 |
| memory_limit_mb | INT | Default 256 |
| is_public | BOOLEAN | |
| created_by | UUID FK→users | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | Auto-updated via trigger |

### `test_cases`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| question_id | UUID FK→questions | |
| input | TEXT | |
| expected | TEXT | |
| is_sample | BOOLEAN | Shown in problem statement |
| is_hidden | BOOLEAN | Used for judging only |
| label | TEXT | e.g. "Edge: empty array" |
| score_weight | NUMERIC | Partial scoring support |
| order_index | INT | |
| created_at | TIMESTAMPTZ | |

### `room_questions`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| room_id | UUID FK→rooms | |
| question_id | UUID FK→questions | |
| order_index | INT | |
| points | INT | Max score for this question in this room |
| created_at | TIMESTAMPTZ | |

### `question_stats`
| Column | Type | Notes |
|--------|------|-------|
| question_id | UUID PK FK→questions | |
| total_attempts | INT | Auto-updated via trigger |
| total_solved | INT | Auto-updated via trigger |
| acceptance_rate | NUMERIC | Auto-updated via trigger |
| avg_time_ms | INT | Auto-updated via trigger |
| updated_at | TIMESTAMPTZ | |

---

## 🔌 API Reference

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup` | — | Register new user |
| POST | `/api/auth/signin` | — | Login → returns tokens |
| POST | `/api/auth/signout` | ✓ | Revoke token |
| POST | `/api/auth/refresh` | — | Refresh access token |
| GET | `/api/auth/me` | ✓ | Get own profile |
| PATCH | `/api/auth/me` | ✓ | Update display_name / avatar / bio |

### Sign Up
```json
POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "securepassword",
  "username": "dev_ninja",
  "displayName": "Dev Ninja"
}
```

### Sign In
```json
POST /api/auth/signin
{
  "email": "user@example.com",
  "password": "securepassword"
}
// Returns: { user, session: { access_token, refresh_token, expires_at } }
```

### Rooms
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/rooms` | ✓ | Create room |
| GET | `/api/rooms/:code` | ✓ | Get room by invite code |
| POST | `/api/rooms/join` | ✓ | Join room by code |
| POST | `/api/rooms/:id/start` | ✓ | Start session (host only) |
| POST | `/api/rooms/:id/end` | ✓ | End session (host only) |

### Questions
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/questions` | — | List (filter: difficulty, topics, search) |
| GET | `/api/questions/topics` | — | All unique topics |
| GET | `/api/questions/:slug` | — | Single question + sample test cases |
| POST | `/api/questions` | ✓ | Create question (status: draft) |
| PUT | `/api/questions/:id` | ✓ | Update question |
| PATCH | `/api/questions/:id/status` | ✓ | Publish / archive |
| DELETE | `/api/questions/:id` | ✓ | Delete question |
| GET | `/api/questions/:id/test-cases` | ✓ | All (owner) or sample only |
| POST | `/api/questions/:id/test-cases` | ✓ | Bulk insert test cases |
| PUT | `/api/questions/:id/test-cases/:caseId` | ✓ | Update test case |
| DELETE | `/api/questions/:id/test-cases/:caseId` | ✓ | Delete test case |
| GET | `/api/questions/:id/stats` | ✓ | Acceptance rate + stats |
| POST | `/api/questions/:id/rooms/:roomId` | ✓ | Add question to room |
| DELETE | `/api/questions/:id/rooms/:roomId` | ✓ | Remove from room |

---

## ⚙️ Environment Variables

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PORT=3000
```

---

## 🚀 Getting Started

### 1. Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run migrations in order:
   - `001_initial_schema.sql`
   - `002_rls_indexes_triggers.sql`
   - `step1_alter_questions.sql`
   - `step2_tables_triggers_rls.sql`
3. Under **Auth → Settings**:
   - Enable email/password sign-in ✓
   - Set your Site URL to your frontend URL

### 2. Backend
```bash
cd backend
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

npm install

# Seed question bank (run once)
SEED_USER_ID=<your-supabase-user-uuid> node scripts/seedQuestions.js

# Start server
npm run dev
```

### 3. Authenticated Requests
```
Authorization: Bearer <access_token>
```

---

## 🗺️ Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Supabase Setup + Auth | ✅ Done |
| 2 | Room System | ✅ Done |
| 3 | Question Bank | ✅ Done |
| 4 | Code Editor + Judge0 | 🔜 Next |
| 5 | Socket.io Real-time | ⏳ Pending |
| 6 | Leaderboard + Results | ⏳ Pending |
| 7 | Frontend (Next.js) | ⏳ Pending |

---

## 📝 Dev Notes

- All JS files use **ES Modules** (`import/export`) — `"type": "module"` in `package.json`
- `rooms` table uses `host_id` (not `created_by`) for the room owner
- Questions require at least **1 hidden test case** before they can be published
- Run `003b_question_stats_trigger.sql` at the **start of Phase 4** after `submissions` table is created
- `submissions.judge0_token` is reserved for Phase 4 async Judge0 polling