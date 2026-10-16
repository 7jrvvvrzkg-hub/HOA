-- Security hardening: two-step login, forced password change, sign-in
-- lockout tracking, and belt-and-braces lockdown of the database's public API.
-- Safe to run more than once.

ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_pending_secret text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_last_step integer;
ALTER TABLE users ADD COLUMN IF NOT EXISTS step_up_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_codes text[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS login_attempts (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  ip text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_attempts_identifier_idx ON login_attempts (identifier, created_at);
CREATE INDEX IF NOT EXISTS login_attempts_ip_idx ON login_attempts (ip, created_at);

-- Row-level security on EVERY table (including the new one), with no policies:
-- nobody reaching the database through Supabase's public web API can read or
-- write anything. The website itself connects directly and is unaffected.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

-- Second lock on the same door: take away the public API roles' permissions
-- altogether, so even if row-level security were ever switched off by
-- mistake, the public API still couldn't see these tables.
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', r);
    END IF;
  END LOOP;
END $$;
