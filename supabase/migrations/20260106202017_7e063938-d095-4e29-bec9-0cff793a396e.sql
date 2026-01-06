-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create communities table for WhatsApp-style group chats within rooms
CREATE TABLE public.communities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  creator_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create community_members table
CREATE TABLE public.community_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('creator', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id)
);

-- Create community_messages table
CREATE TABLE public.community_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file')),
  media_url TEXT,
  media_duration INTEGER,
  reply_to_message_id UUID REFERENCES public.community_messages(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all community tables
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for communities
CREATE POLICY "Anyone can view communities"
ON public.communities FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create communities"
ON public.communities FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their communities"
ON public.communities FOR UPDATE
USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their communities"
ON public.communities FOR DELETE
USING (auth.uid() = creator_id);

-- RLS policies for community_members
CREATE POLICY "Members can view community members"
ON public.community_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.community_members cm 
    WHERE cm.community_id = community_members.community_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Creators can add first members"
ON public.community_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.communities c 
    WHERE c.id = community_id AND c.creator_id = auth.uid()
  )
);

CREATE POLICY "Members can leave community"
ON public.community_members FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Creators can remove members"
ON public.community_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.communities c 
    WHERE c.id = community_id AND c.creator_id = auth.uid()
  )
);

-- RLS policies for community_messages
CREATE POLICY "Members can view community messages"
ON public.community_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.community_members cm 
    WHERE cm.community_id = community_messages.community_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Members can send messages"
ON public.community_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.community_members cm 
    WHERE cm.community_id = community_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own messages"
ON public.community_messages FOR UPDATE
USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages"
ON public.community_messages FOR DELETE
USING (auth.uid() = sender_id);

-- Create indexes for performance
CREATE INDEX idx_communities_room_id ON public.communities(room_id);
CREATE INDEX idx_communities_creator_id ON public.communities(creator_id);
CREATE INDEX idx_community_members_community_id ON public.community_members(community_id);
CREATE INDEX idx_community_members_user_id ON public.community_members(user_id);
CREATE INDEX idx_community_messages_community_id ON public.community_messages(community_id);
CREATE INDEX idx_community_messages_sender_id ON public.community_messages(sender_id);
CREATE INDEX idx_community_messages_created_at ON public.community_messages(created_at DESC);

-- Enable realtime for community messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;

-- Trigger for updated_at on communities
CREATE TRIGGER update_communities_updated_at
BEFORE UPDATE ON public.communities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on community_messages
CREATE TRIGGER update_community_messages_updated_at
BEFORE UPDATE ON public.community_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();