-- Create message_reactions table for emoji reactions on messages
CREATE TABLE public.message_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL CHECK (reaction_type IN ('like', 'heart', 'laugh')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, reaction_type)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Users can view reactions on messages they can see
CREATE POLICY "Users can view message reactions"
ON public.message_reactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_id
    AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
  )
);

-- Users can add reactions to messages they can see
CREATE POLICY "Users can add reactions"
ON public.message_reactions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_id
    AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
  )
);

-- Users can remove their own reactions
CREATE POLICY "Users can remove own reactions"
ON public.message_reactions
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_message_reactions_message_id ON public.message_reactions(message_id);