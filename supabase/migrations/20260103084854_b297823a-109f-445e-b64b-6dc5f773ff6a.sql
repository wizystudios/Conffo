-- Add reply_to_message_id column to messages table for reply functionality
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS reply_to_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;

-- Create index for faster reply lookups
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages(reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;