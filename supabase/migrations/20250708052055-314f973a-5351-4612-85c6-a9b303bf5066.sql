-- Create audio_posts table for audio confessions
CREATE TABLE public.audio_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  confession_id UUID NOT NULL REFERENCES public.confessions(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  waveform_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audio_posts ENABLE ROW LEVEL SECURITY;

-- Create policies for audio posts
CREATE POLICY "Anyone can view audio posts" 
ON public.audio_posts 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create audio posts" 
ON public.audio_posts 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create image_verification table for real image verification
CREATE TABLE public.image_verification (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  verification_type TEXT NOT NULL, -- 'face_match', 'liveness_check', 'id_document'
  verification_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.image_verification ENABLE ROW LEVEL SECURITY;

-- Create policies for image verification
CREATE POLICY "Users can view their own verifications" 
ON public.image_verification 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create verification requests" 
ON public.image_verification 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all verifications" 
ON public.image_verification 
FOR SELECT 
USING ((
  SELECT profiles.is_admin OR profiles.is_moderator
  FROM profiles
  WHERE profiles.id = auth.uid()
));

CREATE POLICY "Admins can update verifications" 
ON public.image_verification 
FOR UPDATE 
USING ((
  SELECT profiles.is_admin OR profiles.is_moderator
  FROM profiles
  WHERE profiles.id = auth.uid()
));