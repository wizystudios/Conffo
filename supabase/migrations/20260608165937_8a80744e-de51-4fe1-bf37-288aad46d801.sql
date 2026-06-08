-- Hide admin/moderator flags from anon and authenticated; only service_role (edge functions) can read.
REVOKE SELECT (is_admin, is_moderator) ON public.profiles FROM anon;
REVOKE SELECT (is_admin, is_moderator) ON public.profiles FROM authenticated;
GRANT SELECT (is_admin, is_moderator) ON public.profiles TO service_role;

-- Hide viewed_by from anon/authenticated; clients learn "is_viewed" via the get_active_stories function.
REVOKE SELECT (viewed_by) ON public.stories FROM anon;
REVOKE SELECT (viewed_by) ON public.stories FROM authenticated;
GRANT SELECT (viewed_by) ON public.stories TO service_role;
