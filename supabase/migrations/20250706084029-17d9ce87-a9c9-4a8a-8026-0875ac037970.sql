-- Fix infinite recursion in profiles RLS policies
-- Drop the problematic policy that references itself
DROP POLICY IF EXISTS "Allow profile access" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create simpler, non-recursive policies
CREATE POLICY "Public profiles are viewable by all" 
ON public.profiles 
FOR SELECT 
USING (is_public = true OR auth.uid() = id);

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Authenticated users can view basic profile info" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);