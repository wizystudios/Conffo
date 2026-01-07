-- Fix infinite recursion in RLS policies by replacing self-referential policies
-- with SECURITY DEFINER helpers (row_security off)

-- Helper: is a user a member of a community?
CREATE OR REPLACE FUNCTION public.is_community_member(p_community_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.community_members cm
    WHERE cm.community_id = p_community_id
      AND cm.user_id = p_user_id
  );
$$;

-- Helper: is a user an admin/creator of a community?
CREATE OR REPLACE FUNCTION public.is_community_admin(p_community_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT (
    EXISTS (
      SELECT 1
      FROM public.communities c
      WHERE c.id = p_community_id
        AND c.creator_id = p_user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.community_members cm
      WHERE cm.community_id = p_community_id
        AND cm.user_id = p_user_id
        AND cm.role = ANY (ARRAY['creator'::text, 'admin'::text])
    )
  );
$$;

-- COMMUNITY MEMBERS: drop problematic/duplicate policies
DROP POLICY IF EXISTS "Members can view community members" ON public.community_members;
DROP POLICY IF EXISTS "community_members_select_visible_to_members" ON public.community_members;
DROP POLICY IF EXISTS "Creators can add first members" ON public.community_members;
DROP POLICY IF EXISTS "community_members_insert_self_or_admin" ON public.community_members;
DROP POLICY IF EXISTS "community_members_update_admin_only" ON public.community_members;
DROP POLICY IF EXISTS "Creators can remove members" ON public.community_members;
DROP POLICY IF EXISTS "Members can leave community" ON public.community_members;
DROP POLICY IF EXISTS "community_members_delete_self_or_admin" ON public.community_members;

-- Recreate safe policies
CREATE POLICY community_members_select_member_visible
ON public.community_members
FOR SELECT
TO public
USING (public.is_community_member(community_id, auth.uid()) OR public.is_community_admin(community_id, auth.uid()));

CREATE POLICY community_members_insert_self_or_admin_safe
ON public.community_members
FOR INSERT
TO public
WITH CHECK ((user_id = auth.uid()) OR public.is_community_admin(community_id, auth.uid()));

CREATE POLICY community_members_update_admin_only_safe
ON public.community_members
FOR UPDATE
TO public
USING (public.is_community_admin(community_id, auth.uid()))
WITH CHECK (public.is_community_admin(community_id, auth.uid()));

CREATE POLICY community_members_delete_self_or_admin_safe
ON public.community_members
FOR DELETE
TO public
USING ((user_id = auth.uid()) OR public.is_community_admin(community_id, auth.uid()));

-- COMMUNITY JOIN REQUESTS: drop problematic/duplicate policies
DROP POLICY IF EXISTS "Creators can view requests for their communities" ON public.community_join_requests;
DROP POLICY IF EXISTS "Creators can update requests for their communities" ON public.community_join_requests;
DROP POLICY IF EXISTS "Users can create join requests" ON public.community_join_requests;
DROP POLICY IF EXISTS "Users can view their own requests" ON public.community_join_requests;
DROP POLICY IF EXISTS "Users can delete their own requests" ON public.community_join_requests;
DROP POLICY IF EXISTS "join_requests_insert_self" ON public.community_join_requests;
DROP POLICY IF EXISTS "join_requests_select_self_or_admin" ON public.community_join_requests;
DROP POLICY IF EXISTS "join_requests_update_admin_only" ON public.community_join_requests;

-- Recreate safe policies
CREATE POLICY join_requests_select_self_or_admin_safe
ON public.community_join_requests
FOR SELECT
TO public
USING ((user_id = auth.uid()) OR public.is_community_admin(community_id, auth.uid()));

CREATE POLICY join_requests_insert_self_safe
ON public.community_join_requests
FOR INSERT
TO public
WITH CHECK (user_id = auth.uid());

CREATE POLICY join_requests_update_admin_only_safe
ON public.community_join_requests
FOR UPDATE
TO public
USING (public.is_community_admin(community_id, auth.uid()))
WITH CHECK (public.is_community_admin(community_id, auth.uid()));

CREATE POLICY join_requests_delete_self_safe
ON public.community_join_requests
FOR DELETE
TO public
USING (user_id = auth.uid());

-- COMMUNITY MESSAGES: drop problematic policies
DROP POLICY IF EXISTS "Members can send messages" ON public.community_messages;
DROP POLICY IF EXISTS "Members can view community messages" ON public.community_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.community_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.community_messages;

-- Recreate safe policies
CREATE POLICY community_messages_select_member_only
ON public.community_messages
FOR SELECT
TO public
USING (public.is_community_member(community_id, auth.uid()));

CREATE POLICY community_messages_insert_member_only
ON public.community_messages
FOR INSERT
TO public
WITH CHECK ((sender_id = auth.uid()) AND public.is_community_member(community_id, auth.uid()));

CREATE POLICY community_messages_update_own
ON public.community_messages
FOR UPDATE
TO public
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

CREATE POLICY community_messages_delete_own
ON public.community_messages
FOR DELETE
TO public
USING (sender_id = auth.uid());
