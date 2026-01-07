-- Add community join requests table
CREATE TABLE public.community_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id)
);

-- Enable RLS
ALTER TABLE public.community_join_requests ENABLE ROW LEVEL SECURITY;

-- Policies for join requests
CREATE POLICY "Users can view their own requests"
ON public.community_join_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Creators can view requests for their communities"
ON public.community_join_requests FOR SELECT
USING (EXISTS (
  SELECT 1 FROM communities c 
  WHERE c.id = community_join_requests.community_id 
  AND c.creator_id = auth.uid()
));

CREATE POLICY "Users can create join requests"
ON public.community_join_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Creators can update requests for their communities"
ON public.community_join_requests FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM communities c 
  WHERE c.id = community_join_requests.community_id 
  AND c.creator_id = auth.uid()
));

CREATE POLICY "Users can delete their own requests"
ON public.community_join_requests FOR DELETE
USING (auth.uid() = user_id);

-- Function to promote/demote members
CREATE OR REPLACE FUNCTION public.update_community_member_role(
  p_community_id UUID,
  p_user_id UUID,
  p_new_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_id UUID;
  v_community_creator_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  v_requester_id := auth.uid();
  
  -- Get community creator
  SELECT creator_id INTO v_community_creator_id
  FROM communities WHERE id = p_community_id;
  
  -- Check if requester is creator or admin
  SELECT EXISTS(
    SELECT 1 FROM community_members 
    WHERE community_id = p_community_id 
    AND user_id = v_requester_id 
    AND role IN ('creator', 'admin')
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN FALSE;
  END IF;
  
  -- Can't change creator's role
  IF p_user_id = v_community_creator_id THEN
    RETURN FALSE;
  END IF;
  
  -- Only creator can promote to admin
  IF p_new_role = 'admin' AND v_requester_id != v_community_creator_id THEN
    RETURN FALSE;
  END IF;
  
  UPDATE community_members 
  SET role = p_new_role 
  WHERE community_id = p_community_id AND user_id = p_user_id;
  
  RETURN FOUND;
END;
$$;