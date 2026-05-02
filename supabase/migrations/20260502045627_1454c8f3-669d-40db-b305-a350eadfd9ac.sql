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
      WHERE status IN ('pending', 'ignored', 'reported')
        AND ((sender_id = sender_uuid AND receiver_id = receiver_uuid)
          OR (sender_id = receiver_uuid AND receiver_id = sender_uuid))
    );
$$;