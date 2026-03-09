-- supabase/migrations/003b_question_stats_trigger.sql
-- Run AFTER Phase 4 (submissions table exists)
-- Updates question_stats whenever a submission is judged

CREATE OR REPLACE FUNCTION refresh_question_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_total_attempts   INT;
  v_total_solved     INT;
  v_acceptance_rate  NUMERIC(5,2);
  v_avg_time_ms      INT;
BEGIN
  SELECT
    COUNT(DISTINCT user_id)                                          INTO v_total_attempts
  FROM submissions
  WHERE question_id = NEW.question_id;

  SELECT
    COUNT(DISTINCT user_id)                                          INTO v_total_solved
  FROM submissions
  WHERE question_id = NEW.question_id AND verdict = 'accepted';

  v_acceptance_rate := CASE
    WHEN v_total_attempts = 0 THEN 0
    ELSE ROUND((v_total_solved::NUMERIC / v_total_attempts) * 100, 2)
  END;

  SELECT COALESCE(AVG(execution_time_ms), 0)::INT                   INTO v_avg_time_ms
  FROM submissions
  WHERE question_id = NEW.question_id AND verdict = 'accepted';

  INSERT INTO question_stats (
    question_id, total_attempts, total_solved, acceptance_rate, avg_time_ms, updated_at
  ) VALUES (
    NEW.question_id, v_total_attempts, v_total_solved, v_acceptance_rate, v_avg_time_ms, NOW()
  )
  ON CONFLICT (question_id) DO UPDATE SET
    total_attempts  = EXCLUDED.total_attempts,
    total_solved    = EXCLUDED.total_solved,
    acceptance_rate = EXCLUDED.acceptance_rate,
    avg_time_ms     = EXCLUDED.avg_time_ms,
    updated_at      = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER submission_updates_stats
  AFTER INSERT OR UPDATE OF verdict ON submissions
  FOR EACH ROW
  WHEN (NEW.verdict IS NOT NULL)
  EXECUTE FUNCTION refresh_question_stats();