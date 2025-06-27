
-- Create security definer functions to avoid infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  -- Use auth.uid() directly without referencing profiles table
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- For now, return 'user' as default role
  -- This can be extended later if you need admin/moderator roles
  RETURN 'user';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create function to check if user can access profile
CREATE OR REPLACE FUNCTION public.can_access_profile(profile_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Allow access if it's the user's own profile or if auth.uid() exists (authenticated user)
  RETURN auth.uid() IS NOT NULL AND (auth.uid() = profile_user_id OR TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create new RLS policies using security definer functions
CREATE POLICY "Users can view profiles" ON public.profiles
  FOR SELECT USING (public.can_access_profile(id));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
