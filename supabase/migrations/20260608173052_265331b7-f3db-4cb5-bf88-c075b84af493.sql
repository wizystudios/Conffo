
-- 1) Prevent privilege escalation via community_members INSERT: self-joins must use role='member'.
DROP POLICY IF EXISTS "community_members_insert_self_or_admin_safe" ON public.community_members;
CREATE POLICY "community_members_insert_self_or_admin_safe"
ON public.community_members
FOR INSERT
WITH CHECK (
  (user_id = auth.uid() AND role = 'member')
  OR public.is_community_admin(community_id, auth.uid())
);

-- 2) Restrict community_members UPDATE so admins cannot create new creators.
CREATE OR REPLACE FUNCTION public.guard_community_member_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator uuid;
BEGIN
  SELECT creator_id INTO v_creator FROM public.communities WHERE id = NEW.community_id;
  -- Only the community creator may grant/keep the 'creator' role.
  IF NEW.role = 'creator' AND auth.uid() IS DISTINCT FROM v_creator THEN
    RAISE EXCEPTION 'Only the community creator can assign creator role';
  END IF;
  -- Only allow roles in a known set.
  IF NEW.role NOT IN ('member','admin','creator') THEN
    RAISE EXCEPTION 'Invalid community member role: %', NEW.role;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_community_member_role_trg ON public.community_members;
CREATE TRIGGER guard_community_member_role_trg
BEFORE INSERT OR UPDATE ON public.community_members
FOR EACH ROW EXECUTE FUNCTION public.guard_community_member_role();

-- 3) Restrict stories SELECT to authenticated users only (still subject to RLS).
DROP POLICY IF EXISTS "Anyone can view active stories" ON public.stories;
CREATE POLICY "Authenticated can view active stories"
ON public.stories
FOR SELECT
TO authenticated
USING (expires_at > now());
