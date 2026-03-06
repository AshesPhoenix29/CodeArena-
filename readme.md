# CodeArena — Phase 1: Supabase Setup + Auth

## What's in this phase

| Layer | Files | Description |
|---|---|---|
| **DB Schema** | `migrations/001_initial_schema.sql` | All 7 tables with enums |
| **DB Config** | `migrations/002_rls_indexes_triggers.sql` | RLS, indexes, triggers |
| **Supabase lib** | `src/lib/supabase.js` | Admin + anon clients |
| **Auth service** | `src/services/auth.service.js` | signUp/signIn/verify/profile |
| **Auth middleware** | `src/middleware/auth.middleware.js` | `requireAuth` / `optionalAuth` |
| **Auth routes** | `src/routes/auth.routes.js` | REST endpoints |
| **App** | `src/app.js` + `src/server.js` | Express setup |

---

## Setup

### 1. Supabase project
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migrations in order:
   - `001_initial_schema.sql`
   - `002_rls_indexes_triggers.sql`
3. Under **Auth → Settings**, configure:
   - Enable email/password sign-in ✓
   - Set your Site URL to your frontend URL
   - (Optional) Set up OAuth providers (Google, GitHub)

### 2. Backend
```bash
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

npm install
npm run dev
```

---

## Auth API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | — | Register new user |
| POST | `/api/auth/signin` | — | Login → returns tokens |
| POST | `/api/auth/signout` | ✓ | Revoke token |
| POST | `/api/auth/refresh` | — | Refresh access token |
| GET  | `/api/auth/me` | ✓ | Get own profile |
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

### Authenticated requests
```
Authorization: Bearer <access_token>
```

---

## DB design notes

- **`users`** mirrors `auth.users` — auto-created via trigger on sign-up
- **Room codes** are 5-char uppercase alphanumeric, auto-generated, collision-safe
- **Host** is automatically added as a `room_member` (role: `host`) on room insert
- **RLS** enforces: room members see each other's data; only host can mutate room settings; only service-role can update submissions (Judge0 callbacks)
- **`submissions.judge0_token`** stores the async token for polling Judge0 in Phase 4

---

## What's next → Phase 2: Room System
- `POST /rooms` — create room (auto-generates code)
- `POST /rooms/join` — join by code
- `GET /rooms/:id` — room details + members
- Room status machine: `waiting → active → completed`