
-- Fix the infinite recursion in profiles policies by creating a security definer function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  -- Use auth.uid() directly without referencing profiles table
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- For now, return 'user' as default role
  -- This can be extended later if you need admin/moderator roles
  RETURN 'user';
END;
$$;

-- Create a function to check profile access without recursion
CREATE OR REPLACE FUNCTION public.can_access_profile(profile_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  -- Allow access if it's the user's own profile or if auth.uid() exists (authenticated user)
  RETURN auth.uid() IS NOT NULL AND (auth.uid() = profile_user_id OR TRUE);
END;
$$;

-- Drop existing policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create new RLS policies for profiles table using the security definer functions
CREATE POLICY "Allow profile access" ON public.profiles
FOR ALL USING (public.can_access_profile(id));

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
