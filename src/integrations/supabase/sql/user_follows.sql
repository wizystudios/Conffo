
-- Create a table for user follows
CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(follower_id, following_id)
);

-- Add RLS policies
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Users can see who they follow and who follows them
CREATE POLICY "Users can view their follows"
  ON public.user_follows
  FOR SELECT
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Users can follow other users
CREATE POLICY "Users can follow others"
  ON public.user_follows
  FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow others
CREATE POLICY "Users can unfollow others"
  ON public.user_follows
  FOR DELETE
  USING (auth.uid() = follower_id);
