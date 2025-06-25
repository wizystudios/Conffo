
-- Drop all existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view their saved confessions" ON public.saved_confessions;
DROP POLICY IF EXISTS "Users can save confessions" ON public.saved_confessions;
DROP POLICY IF EXISTS "Users can unsave confessions" ON public.saved_confessions;

-- Now create the RLS policies for saved_confessions table
ALTER TABLE public.saved_confessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their saved confessions" ON public.saved_confessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save confessions" ON public.saved_confessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave confessions" ON public.saved_confessions
  FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on profiles table if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add comprehensive RLS policies for profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Enable RLS on confessions table if not already enabled
ALTER TABLE public.confessions ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for confessions
DROP POLICY IF EXISTS "Anyone can view confessions" ON public.confessions;
DROP POLICY IF EXISTS "Users can create confessions" ON public.confessions;
DROP POLICY IF EXISTS "Users can update their own confessions" ON public.confessions;
DROP POLICY IF EXISTS "Users can delete their own confessions" ON public.confessions;

CREATE POLICY "Anyone can view confessions" ON public.confessions
  FOR SELECT USING (true);

CREATE POLICY "Users can create confessions" ON public.confessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own confessions" ON public.confessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own confessions" ON public.confessions
  FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on user_follows table if not already enabled
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for user_follows
DROP POLICY IF EXISTS "Users can view follows" ON public.user_follows;
DROP POLICY IF EXISTS "Users can create follows" ON public.user_follows;
DROP POLICY IF EXISTS "Users can delete follows" ON public.user_follows;

CREATE POLICY "Users can view follows" ON public.user_follows
  FOR SELECT USING (true);

CREATE POLICY "Users can create follows" ON public.user_follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete follows" ON public.user_follows
  FOR DELETE USING (auth.uid() = follower_id);

-- Create storage bucket for avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Add storage policies for avatars
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatar images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar images" ON storage.objects;

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload avatar images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar images" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
