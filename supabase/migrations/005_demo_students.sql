-- TradeNova Demo Students Migration
-- Run this in your Supabase SQL Editor

-- 1. Create entries in auth.users first (required for user_profiles foreign key)
-- We provide minimal info. Password is empty as we use impersonation logic.
-- NOTE: In some Supabase versions, you may need 'service_role' or 'dashboard' context to write to auth.users.
-- If this fails, try checking the "Enable RLS" or "Bypass RLS" options in the SQL Editor.
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'alex@demo.com', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Alex (Pro Student)"}', now(), now(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000002', 'sarah@demo.com', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sarah (Newbie Student)"}', now(), now(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- 2. Create Demo Student Profiles in user_profiles
INSERT INTO public.user_profiles (id, full_name, avatar_url)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Alex (Pro Student)', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'),
  ('00000000-0000-0000-0000-000000000002', 'Sarah (Newbie Student)', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah')
ON CONFLICT (id) DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  avatar_url = EXCLUDED.avatar_url;

-- 3. Note for User:
-- To see these students in a specific course, they must be enrolled.
-- You can enroll them via the "Manage Access" dialog in the Modules page,
-- or run the following SQL (REPLACE 'YOUR_COURSE_ID' with your real course UUID):

/*
INSERT INTO public.course_enrollments (user_id, course_id, role)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'YOUR_COURSE_ID', 'student'),
  ('00000000-0000-0000-0000-000000000002', 'YOUR_COURSE_ID', 'student')
ON CONFLICT (user_id, course_id) DO NOTHING;
*/
