-- Fix community member visibility + join-request management

-- COMMUNITY MEMBERS
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_members_select_visible_to_members" ON public.community_members;
CREATE POLICY "community_members_select_visible_to_members"
ON public.community_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.community_members cm
    WHERE cm.community_id = community_members.community_id
      AND cm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "community_members_insert_self_or_admin" ON public.community_members;
CREATE POLICY "community_members_insert_self_or_admin"
ON public.community_members
FOR INSERT
TO authenticated
WITH CHECK (
  community_members.user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.community_members cm
    WHERE cm.community_id = community_members.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('creator','admin')
  )
);

DROP POLICY IF EXISTS "community_members_update_admin_only" ON public.community_members;
CREATE POLICY "community_members_update_admin_only"
ON public.community_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.community_members cm
    WHERE cm.community_id = community_members.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('creator','admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.community_members cm
    WHERE cm.community_id = community_members.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('creator','admin')
  )
);

DROP POLICY IF EXISTS "community_members_delete_self_or_admin" ON public.community_members;
CREATE POLICY "community_members_delete_self_or_admin"
ON public.community_members
FOR DELETE
TO authenticated
USING (
  community_members.user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.community_members cm
    WHERE cm.community_id = community_members.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('creator','admin')
  )
);


-- COMMUNITY JOIN REQUESTS
ALTER TABLE public.community_join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "join_requests_insert_self" ON public.community_join_requests;
CREATE POLICY "join_requests_insert_self"
ON public.community_join_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "join_requests_select_self_or_admin" ON public.community_join_requests;
CREATE POLICY "join_requests_select_self_or_admin"
ON public.community_join_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.community_members cm
    WHERE cm.community_id = community_join_requests.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('creator','admin')
  )
);

DROP POLICY IF EXISTS "join_requests_update_admin_only" ON public.community_join_requests;
CREATE POLICY "join_requests_update_admin_only"
ON public.community_join_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.community_members cm
    WHERE cm.community_id = community_join_requests.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('creator','admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.community_members cm
    WHERE cm.community_id = community_join_requests.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('creator','admin')
  )
);
