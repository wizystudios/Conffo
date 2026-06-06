
-- 1. Avatar bucket: remove loose policy allowing any auth user to upload anywhere
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;

-- 2. Comment likes: restrict reads to authenticated users
DROP POLICY IF EXISTS "Anyone can view comment likes" ON public.comment_likes;
CREATE POLICY "Authenticated users can view comment likes"
  ON public.comment_likes FOR SELECT
  TO authenticated
  USING (true);

-- 3. Prevent privilege escalation on profiles via trigger guarding is_admin/is_moderator
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin boolean;
BEGIN
  -- Service role / SECURITY DEFINER callers without auth.uid() are allowed
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.is_admin, false) INTO caller_is_admin
  FROM public.profiles p WHERE p.id = auth.uid();

  IF NOT COALESCE(caller_is_admin, false) THEN
    IF COALESCE(NEW.is_admin, false) IS DISTINCT FROM COALESCE(OLD.is_admin, false) THEN
      RAISE EXCEPTION 'Not allowed to modify is_admin';
    END IF;
    IF COALESCE(NEW.is_moderator, false) IS DISTINCT FROM COALESCE(OLD.is_moderator, false) THEN
      RAISE EXCEPTION 'Not allowed to modify is_moderator';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 4. Sensitive profile columns: revoke from anon (unauthenticated)
REVOKE SELECT (contact_email, contact_phone, date_of_birth, birthdate, gender)
  ON public.profiles FROM anon;

-- 5. stories.viewed_by exposure: revoke column from anon
REVOKE SELECT (viewed_by) ON public.stories FROM anon;

-- 6. user_activity_log: explicit restrictive policy blocking direct client writes
DROP POLICY IF EXISTS "Block direct client inserts on activity log" ON public.user_activity_log;
CREATE POLICY "Block direct client inserts on activity log"
  ON public.user_activity_log AS RESTRICTIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Block direct client updates on activity log" ON public.user_activity_log;
CREATE POLICY "Block direct client updates on activity log"
  ON public.user_activity_log AS RESTRICTIVE
  FOR UPDATE
  TO anon, authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Block direct client deletes on activity log" ON public.user_activity_log;
CREATE POLICY "Block direct client deletes on activity log"
  ON public.user_activity_log AS RESTRICTIVE
  FOR DELETE
  TO anon, authenticated
  USING (false);
