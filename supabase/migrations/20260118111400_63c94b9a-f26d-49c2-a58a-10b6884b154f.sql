-- Create community_message_reads table for tracking who has seen community messages
CREATE TABLE IF NOT EXISTS public.community_message_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.community_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE public.community_message_reads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view read receipts for messages in their communities
CREATE POLICY "Users can view read receipts in their communities"
ON public.community_message_reads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.community_messages cm
    JOIN public.community_members mem ON cm.community_id = mem.community_id
    WHERE cm.id = community_message_reads.message_id
    AND mem.user_id = auth.uid()
  )
);

-- Policy: Users can mark messages as read
CREATE POLICY "Users can mark messages as read"
ON public.community_message_reads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_community_message_reads_message_id ON public.community_message_reads(message_id);
CREATE INDEX idx_community_message_reads_user_id ON public.community_message_reads(user_id);