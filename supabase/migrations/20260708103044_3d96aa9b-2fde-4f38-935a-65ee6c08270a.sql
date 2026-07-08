
-- 1) messages: drop any stale policy referencing a non-existent `topic` column
DROP POLICY IF EXISTS "Authenticated can read own private topics" ON public.messages;

-- 2) profiles: revoke sensitive columns from anon + authenticated
REVOKE SELECT (is_admin, is_moderator, contact_email, contact_phone, date_of_birth, birthdate, gender, location, privacy_settings)
  ON public.profiles FROM anon, authenticated;

-- 3) stories: revoke viewed_by from anon + authenticated (owners use get_story_viewers RPC)
REVOKE SELECT (viewed_by) ON public.stories FROM anon, authenticated;

-- 4) user_activity_log: allow users to read their own rows; hide ip_address from client roles
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='user_activity_log' AND column_name='user_id') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their own activity" ON public.user_activity_log';
    EXECUTE 'CREATE POLICY "Users can view their own activity" ON public.user_activity_log
             FOR SELECT TO authenticated USING (auth.uid() = user_id)';
  END IF;
END $$;

REVOKE SELECT (ip_address) ON public.user_activity_log FROM anon, authenticated;
