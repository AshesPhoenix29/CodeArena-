-- ============================================================
-- PHASE 3: Question Bank Migration
-- CodeArena — questions, test_cases, tags, room_questions
-- ============================================================

-- ─────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE question_status  AS ENUM ('draft', 'active', 'archived');

-- ─────────────────────────────────────────
-- QUESTIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
  id              UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT              NOT NULL,
  slug            TEXT              NOT NULL UNIQUE,
  description     TEXT              NOT NULL,         -- markdown supported
  difficulty      difficulty_level  NOT NULL DEFAULT 'medium',
  status          question_status   NOT NULL DEFAULT 'draft',
  topics          TEXT[]            NOT NULL DEFAULT '{}',  -- e.g. ['arrays','sliding-window']
  constraints     TEXT,                                    -- markdown: "1 ≤ n ≤ 10^5"
  examples        JSONB             NOT NULL DEFAULT '[]', -- [{input,output,explanation}]
  hints           TEXT[]            NOT NULL DEFAULT '{}',
  time_limit_ms   INT               NOT NULL DEFAULT 2000,
  memory_limit_mb INT               NOT NULL DEFAULT 256,
  created_by      UUID              REFERENCES users(id) ON DELETE SET NULL,
  is_public       BOOLEAN           NOT NULL DEFAULT false, -- false = only usable in private rooms
  created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TEST CASES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_cases (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID        NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  input       TEXT        NOT NULL,
  expected    TEXT        NOT NULL,
  is_sample   BOOLEAN     NOT NULL DEFAULT false,  -- shown to user in problem description
  is_hidden   BOOLEAN     NOT NULL DEFAULT true,   -- used for judging, not shown
  label       TEXT,                                 -- e.g. "Edge: empty array"
  score_weight NUMERIC(5,2) NOT NULL DEFAULT 1.0,  -- for partial scoring
  order_index INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- ROOM_QUESTIONS  (which questions are in a room session)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS room_questions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  question_id UUID        NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  order_index INT         NOT NULL DEFAULT 0,
  points      INT         NOT NULL DEFAULT 100,   -- max points for this question in this room
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (room_id, question_id)
);

-- ─────────────────────────────────────────
-- QUESTION STATS  (aggregated, updated via triggers)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS question_stats (
  question_id       UUID    PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  total_attempts    INT     NOT NULL DEFAULT 0,
  total_solved      INT     NOT NULL DEFAULT 0,
  acceptance_rate   NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  avg_time_ms       INT     NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
CREATE INDEX idx_questions_difficulty  ON questions(difficulty);
CREATE INDEX idx_questions_status      ON questions(status);
CREATE INDEX idx_questions_topics      ON questions USING GIN(topics);
CREATE INDEX idx_questions_created_by  ON questions(created_by);
CREATE INDEX idx_test_cases_question   ON test_cases(question_id);
CREATE INDEX idx_room_questions_room   ON room_questions(room_id);
CREATE INDEX idx_room_questions_q      ON room_questions(question_id);

-- ─────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────
-- AUTO-CREATE STATS ROW ON NEW QUESTION
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION init_question_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO question_stats(question_id) VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER question_stats_init
  AFTER INSERT ON questions
  FOR EACH ROW EXECUTE FUNCTION init_question_stats();

-- ─────────────────────────────────────────
-- SLUG GENERATOR (auto-slug from title)
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_question_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter   INT := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := regexp_replace(lower(trim(NEW.title)), '[^a-z0-9]+', '-', 'g');
    base_slug := trim(base_slug, '-');
    final_slug := base_slug;
    LOOP
      EXIT WHEN NOT EXISTS (SELECT 1 FROM questions WHERE slug = final_slug AND id != NEW.id);
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER questions_slug
  BEFORE INSERT OR UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION generate_question_slug();

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────
ALTER TABLE questions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_questions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_stats  ENABLE ROW LEVEL SECURITY;

-- Questions: anyone can read active+public; creator/admin can do all
CREATE POLICY "questions_read_public" ON questions
  FOR SELECT USING (status = 'active' AND is_public = true);

CREATE POLICY "questions_read_own" ON questions
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "questions_insert" ON questions
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "questions_update_own" ON questions
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "questions_delete_own" ON questions
  FOR DELETE USING (auth.uid() = created_by);

-- Test cases: visible to question owner and during active room session
CREATE POLICY "test_cases_owner" ON test_cases
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM questions q WHERE q.id = question_id AND q.created_by = auth.uid()
    )
  );

-- Sample test cases are readable by anyone (shown in problem statement)
CREATE POLICY "test_cases_sample_read" ON test_cases
  FOR SELECT USING (is_sample = true);

-- Room questions: readable by room members
CREATE POLICY "room_questions_member_read" ON room_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM room_members rm
      WHERE rm.room_id = room_questions.room_id
        AND rm.user_id = auth.uid()
    )
  );

-- Room questions: writable by room creator
CREATE POLICY "room_questions_host_write" ON room_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = room_questions.room_id
        AND r.created_by = auth.uid()
    )
  );

-- Question stats: public read
CREATE POLICY "question_stats_read" ON question_stats
  FOR SELECT USING (true);