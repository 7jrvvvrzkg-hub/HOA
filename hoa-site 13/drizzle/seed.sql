-- place holder (hoa name) — test data seed
-- Paste this into Supabase's SQL Editor (after running the schema migration
-- from 0000_equal_strong_guy.sql) and click Run. Safe to run once; running
-- it twice will fail on the unique email constraint rather than duplicate
-- anything.

-- 1. admin1 — admin only
INSERT INTO users (id, email, password_hash, roles) VALUES
  ('79f8c009-08f5-4945-8861-b09ee6d92a55', 'admin1@hoa.test', '$2b$10$.4dUYHVgI3ed5y8ByArssuixztlfwfxeX4pdrMSQ9Pps1Nk4xS5Wm', ARRAY['ADMIN']::role_tag[]);
INSERT INTO admin_accounts (id, user_id, full_name) VALUES
  (gen_random_uuid()::text, '79f8c009-08f5-4945-8861-b09ee6d92a55', 'place holder (admin 1 name)');

-- 2. admin2 — admin AND renter at once (demonstrates two role tags on one profile)
INSERT INTO users (id, email, password_hash, roles) VALUES
  ('69e30a2e-82dc-4ce9-ae1b-644ddf859520', 'admin2@hoa.test', '$2b$10$.4dUYHVgI3ed5y8ByArssuixztlfwfxeX4pdrMSQ9Pps1Nk4xS5Wm', ARRAY['ADMIN','RENTER']::role_tag[]);
INSERT INTO admin_accounts (id, user_id, full_name) VALUES
  (gen_random_uuid()::text, '69e30a2e-82dc-4ce9-ae1b-644ddf859520', 'place holder (admin 2 name)');
INSERT INTO resident_profiles (id, user_id, full_name, unit, phone, share_unit, portal_access_level) VALUES
  (gen_random_uuid()::text, '69e30a2e-82dc-4ce9-ae1b-644ddf859520', 'place holder (admin 2 name)', 'unit place holder (e.g. 4B)', 'place holder (phone)', true, 'FULL');

-- 3-6. owners
INSERT INTO users (id, email, password_hash, roles) VALUES
  ('a6a6be82-ecb9-406f-9ece-fce052daef41', 'owner1@hoa.test', '$2b$10$WqxgDb.hM0bYcwqQxDDD/.JbkjypIRv4DEnG581mgF0WhS2Mx8ACi', ARRAY['OWNER']::role_tag[]),
  ('fdbf3b1a-bb51-44db-b35a-340383e4a37f', 'owner2@hoa.test', '$2b$10$WqxgDb.hM0bYcwqQxDDD/.JbkjypIRv4DEnG581mgF0WhS2Mx8ACi', ARRAY['OWNER']::role_tag[]),
  ('072c5417-24d6-4b2b-a395-8bdd57cf2c29', 'owner3@hoa.test', '$2b$10$WqxgDb.hM0bYcwqQxDDD/.JbkjypIRv4DEnG581mgF0WhS2Mx8ACi', ARRAY['OWNER']::role_tag[]),
  ('ec90e8e4-b110-4ee6-b068-6e15f667be13', 'owner4@hoa.test', '$2b$10$WqxgDb.hM0bYcwqQxDDD/.JbkjypIRv4DEnG581mgF0WhS2Mx8ACi', ARRAY['OWNER']::role_tag[]);

INSERT INTO resident_profiles (id, user_id, full_name, unit, phone, share_unit, share_phone, portal_access_level) VALUES
  (gen_random_uuid()::text, 'a6a6be82-ecb9-406f-9ece-fce052daef41', 'place holder (owner 1 name)', 'unit place holder (e.g. 101)', 'place holder (phone)', true, false, 'STANDARD'),
  (gen_random_uuid()::text, 'fdbf3b1a-bb51-44db-b35a-340383e4a37f', 'place holder (owner 2 name)', 'unit place holder (e.g. 102)', 'place holder (phone)', false, false, 'STANDARD'),
  (gen_random_uuid()::text, '072c5417-24d6-4b2b-a395-8bdd57cf2c29', 'place holder (owner 3 name)', 'unit place holder (e.g. 205)', 'place holder (phone)', true, false, 'STANDARD'),
  (gen_random_uuid()::text, 'ec90e8e4-b110-4ee6-b068-6e15f667be13', 'place holder (owner 4 name)', 'unit place holder (e.g. 310)', 'place holder (phone)', false, false, 'STANDARD');

-- 7-10. renters
INSERT INTO users (id, email, password_hash, roles) VALUES
  ('f0542a33-d6a0-4d62-b871-ab85f64d5637', 'renter1@hoa.test', '$2b$10$v00jUL4svWJM3T3JPl0tmOPgdMHDVGyRS9VPyYE.aVSL7sIMhTfDe', ARRAY['RENTER']::role_tag[]),
  ('8bd8625f-0695-4735-996c-b89cb297b1d1', 'renter2@hoa.test', '$2b$10$v00jUL4svWJM3T3JPl0tmOPgdMHDVGyRS9VPyYE.aVSL7sIMhTfDe', ARRAY['RENTER']::role_tag[]),
  ('b088e704-0084-4b2d-8212-8e6dfd600671', 'renter3@hoa.test', '$2b$10$v00jUL4svWJM3T3JPl0tmOPgdMHDVGyRS9VPyYE.aVSL7sIMhTfDe', ARRAY['RENTER']::role_tag[]),
  ('10183b8a-3d1f-40cf-9e1a-10035e975dd1', 'renter4@hoa.test', '$2b$10$v00jUL4svWJM3T3JPl0tmOPgdMHDVGyRS9VPyYE.aVSL7sIMhTfDe', ARRAY['RENTER']::role_tag[]);

INSERT INTO resident_profiles (id, user_id, full_name, unit, share_unit, portal_access_level) VALUES
  (gen_random_uuid()::text, 'f0542a33-d6a0-4d62-b871-ab85f64d5637', 'place holder (renter 1 name)', 'unit place holder (e.g. 103)', false, 'LIMITED'),
  (gen_random_uuid()::text, '8bd8625f-0695-4735-996c-b89cb297b1d1', 'place holder (renter 2 name)', 'unit place holder (e.g. 104)', true, 'LIMITED'),
  (gen_random_uuid()::text, 'b088e704-0084-4b2d-8212-8e6dfd600671', 'place holder (renter 3 name)', 'unit place holder (e.g. 206)', false, 'LIMITED'),
  (gen_random_uuid()::text, '10183b8a-3d1f-40cf-9e1a-10035e975dd1', 'place holder (renter 4 name)', 'unit place holder (e.g. 311)', true, 'LIMITED');

-- sample announcements for the bulletin board (authored by admin1)
INSERT INTO announcements (id, title, body, priority, pinned, sort_order, audience, author_id) VALUES
  (gen_random_uuid()::text, 'place holder (sample urgent announcement title)', 'place holder (sample urgent announcement body)', 'URGENT', true, 0, 'ALL_RESIDENTS', '79f8c009-08f5-4945-8861-b09ee6d92a55'),
  (gen_random_uuid()::text, 'place holder (sample normal announcement title)', 'place holder (sample normal announcement body)', 'NORMAL', false, 1, 'ALL_RESIDENTS', '79f8c009-08f5-4945-8861-b09ee6d92a55'),
  (gen_random_uuid()::text, 'place holder (sample owners-only announcement title)', 'place holder (sample owners-only announcement body)', 'IMPORTANT', false, 2, 'OWNERS_ONLY', '79f8c009-08f5-4945-8861-b09ee6d92a55');
