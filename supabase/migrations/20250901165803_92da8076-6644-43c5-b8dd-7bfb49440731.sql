-- Create messages table for real-time chat
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file')),
  media_url TEXT,
  media_duration INTEGER, -- for audio/video in seconds
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversations table for chat threads
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_1_id UUID NOT NULL,
  participant_2_id UUID NOT NULL,
  last_message_id UUID,
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(participant_1_id, participant_2_id)
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Create policies for messages
CREATE POLICY "Users can view their own messages" 
ON public.messages 
FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages" 
ON public.messages 
FOR UPDATE 
USING (auth.uid() = receiver_id);

-- Create policies for conversations
CREATE POLICY "Users can view their conversations" 
ON public.conversations 
FOR SELECT 
USING (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);

CREATE POLICY "Users can create conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);

CREATE POLICY "Users can update their conversations" 
ON public.conversations 
FOR UPDATE 
USING (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);

-- Create function to update conversation last_activity
CREATE OR REPLACE FUNCTION public.update_conversation_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations 
  SET 
    last_message_id = NEW.id,
    last_activity = NEW.created_at
  WHERE 
    (participant_1_id = NEW.sender_id AND participant_2_id = NEW.receiver_id) OR
    (participant_1_id = NEW.receiver_id AND participant_2_id = NEW.sender_id);
  
  -- If no conversation exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.conversations (participant_1_id, participant_2_id, last_message_id, last_activity)
    VALUES (
      LEAST(NEW.sender_id, NEW.receiver_id),
      GREATEST(NEW.sender_id, NEW.receiver_id),
      NEW.id,
      NEW.created_at
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic conversation updates
CREATE TRIGGER update_conversations_on_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_activity();

-- Enable realtime for messages
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.messages;

-- Enable realtime for conversations
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.conversations;