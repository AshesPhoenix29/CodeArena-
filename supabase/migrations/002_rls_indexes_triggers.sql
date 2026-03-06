-- ============================================================
-- CodeArena · Phase 1 — Indexes, RLS, Triggers & Functions
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- ──────────────────────────────────────────────
-- INDEXES
-- ──────────────────────────────────────────────
create index idx_rooms_code          on public.rooms(code);
create index idx_rooms_host          on public.rooms(host_id);
create index idx_rooms_status        on public.rooms(status);
create index idx_room_members_room   on public.room_members(room_id);
create index idx_room_members_user   on public.room_members(user_id);
create index idx_submissions_room    on public.submissions(room_id);
create index idx_submissions_user    on public.submissions(user_id);
create index idx_submissions_status  on public.submissions(status);
create index idx_questions_difficulty on public.questions(difficulty);
create index idx_questions_topics    on public.questions using gin(topics);

-- ──────────────────────────────────────────────
-- HELPER: auto-update updated_at
-- ──────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.handle_updated_at();

create trigger trg_rooms_updated_at
  before update on public.rooms
  for each row execute function public.handle_updated_at();

create trigger trg_questions_updated_at
  before update on public.questions
  for each row execute function public.handle_updated_at();

-- ──────────────────────────────────────────────
-- HELPER: auto-create profile on sign-up
-- Fires when a new row appears in auth.users
-- ──────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_username text;
  final_username text;
  suffix        int := 0;
begin
  -- Derive username from email prefix; ensure uniqueness
  base_username := split_part(new.email, '@', 1);
  -- Sanitise: only alphanumeric + underscore
  base_username := regexp_replace(base_username, '[^a-zA-Z0-9_]', '_', 'g');
  final_username := base_username;

  loop
    begin
      insert into public.users (id, username, display_name, avatar_url)
      values (
        new.id,
        final_username,
        coalesce(new.raw_user_meta_data->>'full_name', final_username),
        new.raw_user_meta_data->>'avatar_url'
      );
      exit; -- success
    exception when unique_violation then
      suffix := suffix + 1;
      final_username := base_username || suffix::text;
    end;
  end loop;

  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ──────────────────────────────────────────────
-- HELPER: generate unique 5-char room code
-- ──────────────────────────────────────────────
create or replace function public.generate_room_code()
returns text language plpgsql as $$
declare
  chars  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no ambiguous chars
  code   text;
  exists boolean;
begin
  loop
    code := '';
    for i in 1..5 loop
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    select count(*) > 0 into exists from public.rooms where rooms.code = code;
    exit when not exists;
  end loop;
  return code;
end;
$$;

-- Auto-assign code on room insert if not provided
create or replace function public.handle_room_code()
returns trigger language plpgsql as $$
begin
  if new.code is null or new.code = '' then
    new.code := public.generate_room_code();
  end if;
  return new;
end;
$$;

create trigger trg_room_code
  before insert on public.rooms
  for each row execute function public.handle_room_code();

-- ──────────────────────────────────────────────
-- HELPER: auto-add host to room_members on room create
-- ──────────────────────────────────────────────
create or replace function public.handle_room_host_member()
returns trigger language plpgsql as $$
begin
  insert into public.room_members (room_id, user_id, role, is_ready)
  values (new.id, new.host_id, 'host', true);
  return new;
end;
$$;

create trigger trg_room_host_member
  after insert on public.rooms
  for each row execute function public.handle_room_host_member();

-- ──────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────────────────
alter table public.users         enable row level security;
alter table public.rooms         enable row level security;
alter table public.room_members  enable row level security;
alter table public.questions     enable row level security;
alter table public.test_cases    enable row level security;
alter table public.room_questions enable row level security;
alter table public.submissions   enable row level security;

-- ── users ──
create policy "Public profiles are viewable by everyone"
  on public.users for select using (true);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── rooms ──
create policy "Rooms: members can view"
  on public.rooms for select
  using (
    -- public rooms OR user is a member
    is_private = false
    or exists (
      select 1 from public.room_members rm
      where rm.room_id = id and rm.user_id = auth.uid()
    )
  );

create policy "Rooms: authenticated users can create"
  on public.rooms for insert
  with check (auth.uid() = host_id);

create policy "Rooms: only host can update"
  on public.rooms for update
  using (auth.uid() = host_id)
  with check (auth.uid() = host_id);

create policy "Rooms: only host can delete"
  on public.rooms for delete
  using (auth.uid() = host_id);

-- ── room_members ──
create policy "Room members: visible to room members"
  on public.room_members for select
  using (
    exists (
      select 1 from public.room_members rm
      where rm.room_id = room_id and rm.user_id = auth.uid()
    )
  );

create policy "Room members: users can join (insert own row)"
  on public.room_members for insert
  with check (auth.uid() = user_id);

create policy "Room members: users can update own row"
  on public.room_members for update
  using (auth.uid() = user_id);

create policy "Room members: host can remove members"
  on public.room_members for delete
  using (
    auth.uid() = user_id  -- leave yourself
    or exists (
      select 1 from public.rooms r
      where r.id = room_id and r.host_id = auth.uid()
    )
  );

-- ── questions ──
create policy "Questions: public ones viewable by all authenticated users"
  on public.questions for select
  using (auth.role() = 'authenticated' and (is_public = true or created_by = auth.uid()));

create policy "Questions: authenticated users can create"
  on public.questions for insert
  with check (auth.uid() = created_by);

create policy "Questions: creator can update"
  on public.questions for update
  using (auth.uid() = created_by);

-- ── test_cases ──
create policy "Test cases: visible when question is visible"
  on public.test_cases for select
  using (
    exists (
      select 1 from public.questions q
      where q.id = question_id
      and (q.is_public = true or q.created_by = auth.uid())
    )
  );

create policy "Test cases: creator of question can manage"
  on public.test_cases for all
  using (
    exists (
      select 1 from public.questions q
      where q.id = question_id and q.created_by = auth.uid()
    )
  );

-- ── room_questions ──
create policy "Room questions: visible to room members"
  on public.room_questions for select
  using (
    exists (
      select 1 from public.room_members rm
      where rm.room_id = room_id and rm.user_id = auth.uid()
    )
  );

create policy "Room questions: host can manage"
  on public.room_questions for all
  using (
    exists (
      select 1 from public.rooms r
      where r.id = room_id and r.host_id = auth.uid()
    )
  );

-- ── submissions ──
create policy "Submissions: room members can view all in room"
  on public.submissions for select
  using (
    exists (
      select 1 from public.room_members rm
      where rm.room_id = room_id and rm.user_id = auth.uid()
    )
  );

create policy "Submissions: users can insert own"
  on public.submissions for insert
  with check (auth.uid() = user_id);

-- Only backend (service role) can update submissions (Judge0 callback)
-- No client-side UPDATE policy for submissions intentionally.