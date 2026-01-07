-- Add community topics table for 24-hour rotating topics
CREATE TABLE public.community_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_start TIMESTAMP WITH TIME ZONE,
  scheduled_end TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_topics ENABLE ROW LEVEL SECURITY;

-- Topics visible to community members
CREATE POLICY "community_topics_select" ON public.community_topics
FOR SELECT USING (public.is_community_member(community_id, auth.uid()));

-- Only admins/creators can manage topics
CREATE POLICY "community_topics_insert" ON public.community_topics
FOR INSERT WITH CHECK (public.is_community_admin(community_id, auth.uid()));

CREATE POLICY "community_topics_update" ON public.community_topics
FOR UPDATE USING (public.is_community_admin(community_id, auth.uid()));

CREATE POLICY "community_topics_delete" ON public.community_topics
FOR DELETE USING (public.is_community_admin(community_id, auth.uid()));

-- Add onboarding_completed flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Add system message support to community_messages
-- message_type already exists, we'll use 'system' as a new type value

-- Create index for active topics
CREATE INDEX IF NOT EXISTS idx_community_topics_active ON public.community_topics(community_id, is_active) WHERE is_active = true;

-- Function to auto-deactivate expired topics
CREATE OR REPLACE FUNCTION public.check_expired_topics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.community_topics 
  SET is_active = false 
  WHERE is_active = true 
    AND scheduled_end IS NOT NULL 
    AND scheduled_end < now();
    
  -- Activate scheduled topics
  UPDATE public.community_topics
  SET is_active = true
  WHERE is_active = false
    AND scheduled_start IS NOT NULL
    AND scheduled_start <= now()
    AND (scheduled_end IS NULL OR scheduled_end > now());
END;
$$;