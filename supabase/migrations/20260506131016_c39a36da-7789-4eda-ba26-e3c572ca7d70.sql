
-- 1. Notifications: restrict client-side inserts to self only
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Users can create own notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2. user_activity_log: remove permissive insert; rely on SECURITY DEFINER triggers
DROP POLICY IF EXISTS "System can insert user activity logs" ON public.user_activity_log;

-- 3. profiles: remove broad authenticated-view policy that exposed sensitive fields
DROP POLICY IF EXISTS "Authenticated users can view basic profile info" ON public.profiles;

-- 4. Storage: enforce path ownership for media and story_media uploads
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
CREATE POLICY "Authenticated users can upload media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'media'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Authenticated users can upload story media" ON storage.objects;
CREATE POLICY "Authenticated users can upload story media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'story_media'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 5. reports: allow users to view their own reports
CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 6. Set search_path on functions missing it
ALTER FUNCTION public.add_follow(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.can_access_profile(uuid) SET search_path = public;
ALTER FUNCTION public.can_view_user_info(uuid, uuid, text) SET search_path = public;
ALTER FUNCTION public.check_if_following(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.follow_user(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.get_active_stories(uuid) SET search_path = public;
ALTER FUNCTION public.get_comment_count(uuid) SET search_path = public;
ALTER FUNCTION public.get_comment_like_count(uuid) SET search_path = public;
ALTER FUNCTION public.get_current_user_role() SET search_path = public;
ALTER FUNCTION public.get_followers_count(uuid) SET search_path = public;
ALTER FUNCTION public.get_following_count(uuid) SET search_path = public;
ALTER FUNCTION public.get_reaction_counts(uuid) SET search_path = public;
ALTER FUNCTION public.get_reaction_counts_for_all_confessions() SET search_path = public;
ALTER FUNCTION public.get_user_reactions(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.mark_story_viewed(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.remove_follow(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.unfollow_user(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.user_liked_comment(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.validate_user_age() SET search_path = public;

-- 7. Revoke EXECUTE on SECURITY DEFINER helpers that should not be callable directly by clients
REVOKE EXECUTE ON FUNCTION public.add_follow(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.follow_user(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.unfollow_user(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.remove_follow(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_community_member_role(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_story_viewed(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_view_user_info(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_profile(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_user_blocked(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.are_users_blocked(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.are_users_connected(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_send_direct_message(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_community_admin(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_community_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_expired_topics() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_current_user_role() FROM anon;
