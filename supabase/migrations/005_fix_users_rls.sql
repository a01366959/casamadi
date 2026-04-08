-- Fix infinite recursion in RLS policies for users table
-- Issue: Policies that check user membership were causing infinite recursion
-- Solution: Enable RLS on users table with proper policies

-- Enable RLS on users table (if not already enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Remove any existing problematic policies
DROP POLICY IF EXISTS "Users can read their own record" ON public.users;
DROP POLICY IF EXISTS "Users can update their own record" ON public.users;

-- Create proper policies for users table
-- Policy 1: Users can read their own record
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Users can update their own record
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy 3: Service role (backend) can read all users
-- This is implicit via SECURITY DEFINER functions but we can make it explicit
CREATE POLICY "users_select_service_role" ON public.users
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Policy 4: Service role can insert users (for auth trigger)
CREATE POLICY "users_insert_service_role" ON public.users
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Policy 5: Service role can update users
CREATE POLICY "users_update_service_role" ON public.users
  FOR UPDATE
  USING (auth.role() = 'service_role');

COMMENT ON TABLE public.users IS 'Staff users (auto-created on auth signup via trigger)';
