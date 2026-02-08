-- Fix the trigger function to ensure it works properly
CREATE OR REPLACE FUNCTION public.add_creator_as_community_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.community_members (community_id, user_id, role)
  VALUES (NEW.id, NEW.creator_id, 'creator')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Add community_conditions column for admin-managed conditions
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS conditions text[] DEFAULT ARRAY[
  'Be respectful to all members',
  'No hate speech, harassment, or bullying',
  'No spam, ads, or self-promotion',
  'Keep content appropriate and relevant',
  'Admins can remove members who violate rules'
];