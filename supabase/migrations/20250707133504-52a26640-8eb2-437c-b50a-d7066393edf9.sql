-- Create comment_likes table for tracking comment likes
CREATE TABLE public.comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for comment likes
CREATE POLICY "Anyone can view comment likes" 
ON public.comment_likes 
FOR SELECT 
USING (true);

CREATE POLICY "Users can like comments" 
ON public.comment_likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike comments" 
ON public.comment_likes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create comment_replies table for tracking replies to comments
CREATE TABLE public.comment_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  reply_comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(parent_comment_id, reply_comment_id)
);

-- Enable RLS
ALTER TABLE public.comment_replies ENABLE ROW LEVEL SECURITY;

-- Create policies for comment replies
CREATE POLICY "Anyone can view comment replies" 
ON public.comment_replies 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create replies" 
ON public.comment_replies 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Add parent_comment_id to comments table for nested replies
ALTER TABLE public.comments 
ADD COLUMN parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

-- Create function to get comment like count
CREATE OR REPLACE FUNCTION public.get_comment_like_count(comment_uuid uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::integer FROM public.comment_likes 
  WHERE comment_id = comment_uuid
$$;

-- Create function to check if user liked comment
CREATE OR REPLACE FUNCTION public.user_liked_comment(comment_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.comment_likes
    WHERE comment_id = comment_uuid AND user_id = user_uuid
  )
$$;