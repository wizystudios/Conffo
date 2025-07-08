-- Add additional profile fields for enhanced bio and privacy
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS interests TEXT[],
ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{
  "profile_visibility": "public",
  "contact_visibility": "friends",
  "activity_visibility": "public",
  "story_visibility": "public",
  "allow_messages": true,
  "allow_friend_requests": true
}'::jsonb;

-- Add verification status
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_type TEXT,
ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP WITH TIME ZONE;