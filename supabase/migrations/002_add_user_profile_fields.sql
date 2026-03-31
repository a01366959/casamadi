-- Add new user profile fields
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update RLS policy if needed (should already cover these columns)
COMMENT ON COLUMN public.users.first_name IS 'Staff member first name(s)';
COMMENT ON COLUMN public.users.last_name IS 'Staff member last name(s)';
COMMENT ON COLUMN public.users.phone IS 'Staff member phone number';
COMMENT ON COLUMN public.users.position IS 'Job position/title';
COMMENT ON COLUMN public.users.avatar_url IS 'Profile picture URL';
