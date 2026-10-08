-- Adds one test director login: director1@hoa.test / Admin123!
-- Run this AFTER the director/folders/forms file has finished (the new
-- "DIRECTOR" role has to exist first).
WITH new_user AS (
  INSERT INTO users (id, email, password_hash, roles)
  VALUES (gen_random_uuid()::text, 'director1@hoa.test', '$2b$10$.4dUYHVgI3ed5y8ByArssuixztlfwfxeX4pdrMSQ9Pps1Nk4xS5Wm', ARRAY['DIRECTOR']::role_tag[])
  ON CONFLICT (email) DO NOTHING
  RETURNING id
)
INSERT INTO admin_accounts (id, user_id, full_name)
SELECT gen_random_uuid()::text, id, 'place holder (director 1 name)' FROM new_user;
