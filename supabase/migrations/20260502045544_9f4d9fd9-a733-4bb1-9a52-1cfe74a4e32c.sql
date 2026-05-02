-- Add message request state for DMs between users who are not connected yet
CREATE TABLE IF NOT EXISTS public.message_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  first_message_id UUID,
  report_details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT message_requests_not_self CHECK (sender_id <> receiver_id),
  CONSTRAINT message_requests_status_check CHECK (status IN ('pending', 'accepted', 'ignored', 'reported')),
  CONSTRAINT message_requests_unique_pair UNIQUE (sender_id, receiver_id)
);

ALTER TABLE public.message_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_message_requests_receiver_status
  ON public.message_requests(receiver_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_requests_sender_status
  ON public.message_requests(sender_id, status, updated_at DESC);

CREATE POLICY "Users can view their own message requests"
ON public.message_requests
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create outgoing message requests"
ON public.message_requests
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receivers can update incoming message requests"
ON public.message_requests
FOR UPDATE
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

CREATE TRIGGER update_message_requests_updated_at
BEFORE UPDATE ON public.message_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Track whether a user has satisfied the current password policy.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS password_policy_version INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS password_policy_updated_at TIMESTAMP WITH TIME ZONE;

-- Connection helpers: users are connected if either follows the other or a message request was accepted.
CREATE OR REPLACE FUNCTION public.are_users_connected(user1_uuid uuid, user2_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_follows
    WHERE (follower_id = user1_uuid AND following_id = user2_uuid)
       OR (follower_id = user2_uuid AND following_id = user1_uuid)
  ) OR EXISTS (
    SELECT 1 FROM public.message_requests
    WHERE status = 'accepted'
      AND ((sender_id = user1_uuid AND receiver_id = user2_uuid)
        OR (sender_id = user2_uuid AND receiver_id = user1_uuid))
  );
$$;

CREATE OR REPLACE FUNCTION public.can_send_direct_message(sender_uuid uuid, receiver_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.are_users_connected(sender_uuid, receiver_uuid)
    OR NOT EXISTS (
      SELECT 1 FROM public.message_requests
      WHERE sender_id = sender_uuid
        AND receiver_id = receiver_uuid
        AND status IN ('pending', 'ignored', 'reported')
    );
$$;

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send direct messages with request protection"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND public.can_send_direct_message(sender_id, receiver_id)
  AND NOT public.are_users_blocked(sender_id, receiver_id)
);

-- Keep conversations live immediately on every new direct message.
DROP TRIGGER IF EXISTS update_conversation_activity_trigger ON public.messages;
CREATE TRIGGER update_conversation_activity_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_activity();