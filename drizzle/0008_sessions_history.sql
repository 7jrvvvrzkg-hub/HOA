-- Sessions list, change history (for "Undo" and "Roll back"), announcement
-- pictures. Safe to run more than once.

-- ---------------------------------------------------------------------------
-- 1. Announcement pictures (stored in the database like documents are)
-- ---------------------------------------------------------------------------
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS image_data bytea;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS image_mime_type text;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS image_size integer;

-- ---------------------------------------------------------------------------
-- 2. Sign-in sessions: one row per sign-in, so an admin can see where an
--    account is signed in and end any of them.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_sessions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamp NOT NULL DEFAULT now(),
  last_seen_at timestamp NOT NULL DEFAULT now(),
  expires_at timestamp NOT NULL,
  ip text,
  city text,
  region text,
  country text,
  device text NOT NULL DEFAULT 'Unknown device',
  browser text,
  os text,
  user_agent text,
  revoked_at timestamp,
  revoked_by_id text REFERENCES users(id) ON DELETE SET NULL,
  revoked_reason text
);
CREATE INDEX IF NOT EXISTS user_sessions_user_idx ON user_sessions (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. Change history. Every add / change / delete on the tables that hold the
--    community's records is written down automatically by the database
--    itself (a "trigger"), so nothing the website does can forget to.
--    Entries are kept for 30 days. Used by:
--      - the 10-second "Undo" after deleting an account, and
--      - "Roll back" in the Activity log.
--    Only the OLD values are kept (nothing new is copied), and for a change
--    only the columns that changed.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS change_journal (
  id bigserial PRIMARY KEY,
  txid bigint NOT NULL DEFAULT txid_current(),
  at timestamptz NOT NULL DEFAULT clock_timestamp(),
  actor_id text,
  tbl text NOT NULL,
  op char(1) NOT NULL CHECK (op IN ('I', 'U', 'D')),
  pk text NOT NULL,
  old_row jsonb
);
CREATE INDEX IF NOT EXISTS change_journal_at_idx ON change_journal (at);
CREATE INDEX IF NOT EXISTS change_journal_tx_idx ON change_journal (txid);

-- The earliest moment history is complete from (so "roll back" can refuse a
-- time we have no record of).
CREATE TABLE IF NOT EXISTS journal_state (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  since timestamptz NOT NULL DEFAULT now()
);
INSERT INTO journal_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION journal_change() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  actor text := nullif(current_setting('app.actor', true), '');
  n jsonb;
  d jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO change_journal (actor_id, tbl, op, pk) VALUES (actor, TG_TABLE_NAME, 'I', NEW.id);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO change_journal (actor_id, tbl, op, pk, old_row) VALUES (actor, TG_TABLE_NAME, 'D', OLD.id, to_jsonb(OLD));
  ELSE
    n := to_jsonb(NEW);
    SELECT jsonb_object_agg(o.key, o.value) INTO d
      FROM jsonb_each(to_jsonb(OLD)) o
      WHERE n -> o.key IS DISTINCT FROM o.value;
    IF TG_TABLE_NAME = 'users' AND d IS NOT NULL THEN
      -- bookkeeping that changes on every sign-in; not worth recording
      d := d - 'step_up_at' - 'totp_last_step';
      IF d = '{}'::jsonb THEN d := NULL; END IF;
    END IF;
    IF d IS NOT NULL THEN
      INSERT INTO change_journal (actor_id, tbl, op, pk, old_row) VALUES (actor, TG_TABLE_NAME, 'U', OLD.id, d);
    END IF;
  END IF;
  RETURN NULL;
END $$;

-- Tables whose changes are recorded, parents before children. The activity
-- log, sessions, sign-in attempts and reset links are deliberately NOT in
-- this list: the log is the permanent record and is never rolled back.
CREATE OR REPLACE FUNCTION journal_tables() RETURNS text[]
LANGUAGE sql IMMUTABLE AS $$
  SELECT ARRAY['users', 'resident_profiles', 'admin_accounts', 'document_folders', 'documents',
               'announcements', 'leads', 'admin_notes', 'communication_logs',
               'document_folder_notes', 'forms', 'form_submissions']
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY journal_tables() LOOP
    -- "zz_" so it runs after the database's own cascading deletes: children
    -- are written down before the parent, which is what makes undo work.
    EXECUTE format('DROP TRIGGER IF EXISTS zz_journal ON public.%I', t);
    EXECUTE format('CREATE TRIGGER zz_journal AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION journal_change()', t);
  END LOOP;
END $$;

-- Put one saved row back (adds it, or overwrites it if it exists).
CREATE OR REPLACE FUNCTION journal_put(p_tbl text, p_row jsonb) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE sets text;
BEGIN
  SELECT string_agg(format('%1$I = EXCLUDED.%1$I', column_name), ', ' ORDER BY ordinal_position) INTO sets
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = p_tbl AND column_name <> 'id';
  EXECUTE format(
    'INSERT INTO public.%1$I SELECT * FROM jsonb_populate_record(null::public.%1$I, $1) ON CONFLICT (id) DO UPDATE SET %2$s',
    p_tbl, sets
  ) USING p_row;
END $$;

-- Put back only some columns of an existing row.
CREATE OR REPLACE FUNCTION journal_patch(p_tbl text, p_pk text, p_patch jsonb) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE sets text;
BEGIN
  SELECT string_agg(format('%1$I = r.%1$I', k), ', ') INTO sets FROM jsonb_object_keys(p_patch) k;
  IF sets IS NULL THEN RETURN; END IF;
  EXECUTE format(
    'UPDATE public.%1$I t SET %2$s FROM jsonb_populate_record(null::public.%1$I, $2) r WHERE t.id = $1',
    p_tbl, sets
  ) USING p_pk, p_patch;
END $$;

CREATE OR REPLACE FUNCTION journal_current(p_tbl text, p_pk text) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE r jsonb;
BEGIN
  EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE t.id = $1', p_tbl) INTO r USING p_pk;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION journal_differs(p_cur jsonb, p_patch jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT EXISTS (SELECT 1 FROM jsonb_each(p_patch) k WHERE p_cur -> k.key IS DISTINCT FROM k.value)
$$;

-- Work out what each record looked like before the changes in question, then
-- put it back. Either everything after a moment in time (p_since) or one
-- transaction (p_tx). With p_dry it only counts. Works backwards from the
-- newest change to the oldest, so a record that was changed, then deleted,
-- then changed again still ends up exactly as it was.
--
-- When rolling back to a time (p_strip_creds), accounts that still exist keep
-- their CURRENT password / two-step settings: a rollback restores roles and
-- details but never reverts someone's password or turns their two-step login
-- off. Accounts that were deleted come back complete, so they can sign in.
CREATE OR REPLACE FUNCTION journal_run(p_since timestamptz, p_tx bigint, p_dry boolean, p_strip_creds boolean)
RETURNS TABLE (tbl text, removed integer, restored integer, changed integer)
LANGUAGE plpgsql AS $$
#variable_conflict use_column
DECLARE
  e record;
  s record;
  tbls text[] := journal_tables();
  i integer;
  t text;
  cur jsonb;
  tgt jsonb;
  creds text[] := ARRAY['password_hash', 'password_changed_at', 'must_change_password', 'totp_secret',
                        'totp_pending_secret', 'totp_enabled_at', 'totp_last_step', 'step_up_at', 'recovery_codes'];
  c text;
  fix_users text[] := '{}';
  fx text;
BEGIN
  IF NOT p_dry THEN
    SET LOCAL lock_timeout = '15s';
    FOREACH t IN ARRAY tbls LOOP
      EXECUTE format('LOCK TABLE public.%I IN EXCLUSIVE MODE', t);
    END LOOP;
  END IF;

  IF to_regclass('pg_temp.jr_state') IS NOT NULL THEN DROP TABLE jr_state; END IF;
  CREATE TEMP TABLE jr_state (
    tbl text NOT NULL, pk text NOT NULL,
    gone boolean NOT NULL DEFAULT false,
    full_row jsonb,
    patch jsonb NOT NULL DEFAULT '{}'::jsonb,
    PRIMARY KEY (tbl, pk)
  ) ON COMMIT DROP;
  IF to_regclass('pg_temp.jr_out') IS NOT NULL THEN DROP TABLE jr_out; END IF;
  CREATE TEMP TABLE jr_out (tbl text PRIMARY KEY, removed integer NOT NULL DEFAULT 0, restored integer NOT NULL DEFAULT 0, changed integer NOT NULL DEFAULT 0) ON COMMIT DROP;
  FOREACH t IN ARRAY tbls LOOP INSERT INTO jr_out (tbl) VALUES (t); END LOOP;

  FOR e IN
    SELECT j.* FROM change_journal j
    WHERE (p_tx IS NOT NULL AND j.txid = p_tx) OR (p_tx IS NULL AND j.at > p_since)
    ORDER BY j.id DESC
  LOOP
    CONTINUE WHEN NOT (e.tbl = ANY (tbls));
    INSERT INTO jr_state (tbl, pk) VALUES (e.tbl, e.pk) ON CONFLICT DO NOTHING;
    IF e.op = 'I' THEN
      UPDATE jr_state SET gone = true, full_row = NULL, patch = '{}'::jsonb WHERE jr_state.tbl = e.tbl AND pk = e.pk;
    ELSIF e.op = 'D' THEN
      UPDATE jr_state SET gone = false, full_row = e.old_row, patch = '{}'::jsonb WHERE jr_state.tbl = e.tbl AND pk = e.pk;
    ELSE
      UPDATE jr_state
        SET full_row = CASE WHEN full_row IS NULL THEN NULL ELSE full_row || e.old_row END,
            patch = patch || e.old_row
        WHERE jr_state.tbl = e.tbl AND pk = e.pk AND NOT gone;
    END IF;
  END LOOP;

  -- 1. Remove what shouldn't exist (children before parents).
  FOR i IN REVERSE array_length(tbls, 1)..1 LOOP
    t := tbls[i];
    FOR s IN SELECT * FROM jr_state WHERE jr_state.tbl = t AND gone LOOP
      IF journal_current(t, s.pk) IS NOT NULL THEN
        UPDATE jr_out SET removed = removed + 1 WHERE jr_out.tbl = t;
        IF NOT p_dry THEN
          EXECUTE format('DELETE FROM public.%I WHERE id = $1', t) USING s.pk;
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  -- 2. Bring back / correct whole records (parents before children).
  FOR i IN 1..array_length(tbls, 1) LOOP
    t := tbls[i];
    FOR s IN SELECT * FROM jr_state WHERE jr_state.tbl = t AND NOT gone AND full_row IS NOT NULL LOOP
      cur := journal_current(t, s.pk);
      IF cur IS NULL THEN
        UPDATE jr_out SET restored = restored + 1 WHERE jr_out.tbl = t;
        IF NOT p_dry THEN
          IF t = 'users' THEN
            fix_users := fix_users || s.pk;
            PERFORM journal_put(t, s.full_row || jsonb_build_object('created_by_id', NULL));
          ELSE
            PERFORM journal_put(t, s.full_row);
          END IF;
        END IF;
      ELSE
        tgt := s.full_row - 'id';
        IF t = 'users' AND p_strip_creds THEN
          FOREACH c IN ARRAY creds LOOP tgt := tgt - c; END LOOP;
        END IF;
        IF journal_differs(cur, tgt) THEN
          UPDATE jr_out SET changed = changed + 1 WHERE jr_out.tbl = t;
          IF NOT p_dry THEN PERFORM journal_patch(t, s.pk, tgt); END IF;
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  -- accounts restored above: now that they all exist, link them to whoever made them
  IF NOT p_dry THEN
    FOREACH fx IN ARRAY fix_users LOOP
      UPDATE users u SET created_by_id = (st.full_row ->> 'created_by_id')
        FROM jr_state st
        WHERE st.tbl = 'users' AND st.pk = fx AND u.id = fx
          AND (st.full_row ->> 'created_by_id') IS NOT NULL
          AND EXISTS (SELECT 1 FROM users p WHERE p.id = (st.full_row ->> 'created_by_id'));
    END LOOP;
  END IF;

  -- 3. Records that exist and only had some columns changed.
  FOR i IN 1..array_length(tbls, 1) LOOP
    t := tbls[i];
    FOR s IN SELECT * FROM jr_state WHERE jr_state.tbl = t AND NOT gone AND full_row IS NULL AND patch <> '{}'::jsonb LOOP
      cur := journal_current(t, s.pk);
      CONTINUE WHEN cur IS NULL;
      tgt := s.patch - 'id';
      IF t = 'users' AND p_strip_creds THEN
        FOREACH c IN ARRAY creds LOOP tgt := tgt - c; END LOOP;
      END IF;
      IF journal_differs(cur, tgt) THEN
        UPDATE jr_out SET changed = changed + 1 WHERE jr_out.tbl = t;
        IF NOT p_dry THEN PERFORM journal_patch(t, s.pk, tgt); END IF;
      END IF;
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT o.tbl, o.removed, o.restored, o.changed FROM jr_out o
    WHERE o.removed + o.restored + o.changed > 0 ORDER BY array_position(tbls, o.tbl);
END $$;

-- Forget history older than p_days days.
CREATE OR REPLACE FUNCTION journal_purge(p_days integer) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE cutoff timestamptz := now() - make_interval(days => p_days);
BEGIN
  DELETE FROM change_journal WHERE at < cutoff;
  UPDATE journal_state SET since = greatest(since, cutoff);
END $$;

-- ---------------------------------------------------------------------------
-- 4. Lock the new tables and functions down like everything else.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

DO $$
DECLARE r text; f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'journal_change()', 'journal_tables()', 'journal_put(text, jsonb)', 'journal_patch(text, text, jsonb)',
    'journal_current(text, text)', 'journal_differs(jsonb, jsonb)',
    'journal_run(timestamptz, bigint, boolean, boolean)', 'journal_purge(integer)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC', f);
    FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
        EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM %I', f, r);
      END IF;
    END LOOP;
  END LOOP;
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
    END IF;
  END LOOP;
END $$;
