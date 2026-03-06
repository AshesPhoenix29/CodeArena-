-- ============================================================
-- CodeArena · Phase 1 — Initial Schema + Auth Setup
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ──────────────────────────────────────────────
-- EXTENSIONS
-- ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ──────────────────────────────────────────────
-- ENUMS
-- ──────────────────────────────────────────────
create type difficulty_level as enum ('easy', 'medium', 'hard');
create type room_status      as enum ('waiting', 'active', 'completed', 'cancelled');
create type member_role      as enum ('host', 'participant');
create type submission_status as enum ('pending', 'accepted', 'wrong_answer', 'time_limit_exceeded', 'memory_limit_exceeded', 'runtime_error', 'compile_error');

-- ──────────────────────────────────────────────
-- TABLE: users
-- Mirrors auth.users; stores public profile data
-- ──────────────────────────────────────────────
create table public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null,
  display_name  text,
  avatar_url    text,
  bio           text,

  -- Stats (denormalised for leaderboard speed)
  total_solved  integer not null default 0,
  total_rooms   integer not null default 0,
  total_wins    integer not null default 0,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.users is 'Public user profiles linked to Supabase Auth.';

-- ──────────────────────────────────────────────
-- TABLE: rooms
-- ──────────────────────────────────────────────
create table public.rooms (
  id              uuid primary key default uuid_generate_v4(),
  code            text unique not null,           -- short invite code e.g. "XK9P2"
  name            text not null,
  host_id         uuid not null references public.users(id) on delete cascade,

  status          room_status not null default 'waiting',
  is_private      boolean not null default true,
  max_members     integer not null default 10 check (max_members between 2 and 50),

  -- Timing
  duration_mins   integer not null default 60 check (duration_mins between 5 and 360),
  starts_at       timestamptz,
  ends_at         timestamptz,

  -- Filters (stored as arrays for multi-select)
  difficulty      difficulty_level[],
  topics          text[],

  -- Config
  allow_language  text[] not null default array['javascript','python','cpp','java'],
  show_leaderboard boolean not null default true,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.rooms is 'Battle rooms — each has a unique invite code.';
comment on column public.rooms.code is 'Short alphanumeric code shared with invitees.';

-- ──────────────────────────────────────────────
-- TABLE: room_members
-- ──────────────────────────────────────────────
create table public.room_members (
  id         uuid primary key default uuid_generate_v4(),
  room_id    uuid not null references public.rooms(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  role       member_role not null default 'participant',
  joined_at  timestamptz not null default now(),
  left_at    timestamptz,
  is_ready   boolean not null default false,

  unique (room_id, user_id)
);

comment on table public.room_members is 'Participants in each room, including the host.';

-- ──────────────────────────────────────────────
-- TABLE: questions
-- ──────────────────────────────────────────────
create table public.questions (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  slug            text unique not null,
  description     text not null,           -- markdown supported
  difficulty      difficulty_level not null,
  topics          text[] not null default '{}',

  -- Scoring
  base_score      integer not null default 100,
  time_bonus_per_min integer not null default 2,  -- bonus pts per min remaining

  -- Metadata
  created_by      uuid references public.users(id) on delete set null,
  is_public       boolean not null default false,  -- false = only usable in private rooms

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.questions is 'CodeArena question bank.';

-- ──────────────────────────────────────────────
-- TABLE: test_cases
-- ──────────────────────────────────────────────
create table public.test_cases (
  id           uuid primary key default uuid_generate_v4(),
  question_id  uuid not null references public.questions(id) on delete cascade,
  input        text not null,
  expected     text not null,
  is_sample    boolean not null default false,   -- sample = shown to user
  order_index  integer not null default 0,

  created_at   timestamptz not null default now()
);

comment on table public.test_cases is 'Input/output pairs for each question.';

-- ──────────────────────────────────────────────
-- TABLE: room_questions
-- Questions selected for a specific room session
-- ──────────────────────────────────────────────
create table public.room_questions (
  id           uuid primary key default uuid_generate_v4(),
  room_id      uuid not null references public.rooms(id) on delete cascade,
  question_id  uuid not null references public.questions(id) on delete cascade,
  order_index  integer not null default 0,

  unique (room_id, question_id)
);

comment on table public.room_questions is 'Questions assigned to a room, in order.';

-- ──────────────────────────────────────────────
-- TABLE: submissions
-- ──────────────────────────────────────────────
create table public.submissions (
  id              uuid primary key default uuid_generate_v4(),
  room_id         uuid not null references public.rooms(id) on delete cascade,
  question_id     uuid not null references public.questions(id) on delete cascade,
  user_id         uuid not null references public.users(id) on delete cascade,

  language        text not null,
  code            text not null,
  status          submission_status not null default 'pending',

  -- Judge0 response fields
  judge0_token    text,                      -- Judge0 submission token
  stdout          text,
  stderr          text,
  compile_output  text,
  time_ms         numeric,
  memory_kb       numeric,

  -- Scoring
  score           integer not null default 0,
  passed_cases    integer not null default 0,
  total_cases     integer not null default 0,

  submitted_at    timestamptz not null default now()
);

comment on table public.submissions is 'All code submissions with Judge0 results.';