
-- Admin metrics: aggregated counts + 14-day signup timeseries + top rooms.
CREATE OR REPLACE FUNCTION public.get_admin_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_result jsonb;
  v_signups jsonb;
  v_top_rooms jsonb;
BEGIN
  SELECT COALESCE(is_admin, false) INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.day), '[]'::jsonb) INTO v_signups
  FROM (
    SELECT to_char(d::date, 'YYYY-MM-DD') AS day,
           COUNT(p.id) AS count
    FROM generate_series((now() - interval '13 days')::date, now()::date, '1 day') d
    LEFT JOIN public.profiles p ON p.created_at::date = d::date
    GROUP BY d
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb) INTO v_top_rooms
  FROM (
    SELECT c.room AS room, COUNT(*)::int AS confessions
    FROM public.confessions c
    WHERE c.room IS NOT NULL
    GROUP BY c.room
    ORDER BY confessions DESC
    LIMIT 8
  ) r;

  v_result := jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM public.profiles),
    'new_users_7d', (SELECT COUNT(*) FROM public.profiles WHERE created_at > now() - interval '7 days'),
    'new_users_24h', (SELECT COUNT(*) FROM public.profiles WHERE created_at > now() - interval '24 hours'),
    'banned_users', (SELECT COUNT(*) FROM public.profiles WHERE banned_until IS NOT NULL AND banned_until > now()),
    'verified_users', (SELECT COUNT(*) FROM public.profiles WHERE is_verified = true),
    'admins', (SELECT COUNT(*) FROM public.profiles WHERE is_admin = true),
    'moderators', (SELECT COUNT(*) FROM public.profiles WHERE is_moderator = true),
    'total_confessions', (SELECT COUNT(*) FROM public.confessions),
    'confessions_24h', (SELECT COUNT(*) FROM public.confessions WHERE created_at > now() - interval '24 hours'),
    'total_comments', (SELECT COUNT(*) FROM public.comments),
    'comments_24h', (SELECT COUNT(*) FROM public.comments WHERE created_at > now() - interval '24 hours'),
    'total_reactions', (SELECT COUNT(*) FROM public.reactions),
    'total_messages', (SELECT COUNT(*) FROM public.messages),
    'messages_24h', (SELECT COUNT(*) FROM public.messages WHERE created_at > now() - interval '24 hours'),
    'total_communities', (SELECT COUNT(*) FROM public.communities),
    'active_stories', (SELECT COUNT(*) FROM public.stories WHERE expires_at > now()),
    'pending_reports', (SELECT COUNT(*) FROM public.reports WHERE resolved = false),
    'pending_verifications', (SELECT COUNT(*) FROM public.image_verification WHERE status = 'pending'),
    'signups_14d', v_signups,
    'top_rooms', v_top_rooms
  );
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_metrics() TO authenticated;

-- Admin user listing with search + pagination.
CREATE OR REPLACE FUNCTION public.list_users_admin(
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  username text,
  avatar_url text,
  contact_email text,
  contact_phone text,
  is_admin boolean,
  is_moderator boolean,
  is_verified boolean,
  banned_until timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT COALESCE(p.is_admin, false) INTO v_is_admin FROM public.profiles p WHERE p.id = auth.uid();
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT p.id, p.username, p.avatar_url, p.contact_email, p.contact_phone,
         p.is_admin, p.is_moderator, p.is_verified, p.banned_until, p.created_at
  FROM public.profiles p
  WHERE p_search IS NULL
     OR p_search = ''
     OR p.username ILIKE '%' || p_search || '%'
     OR p.contact_email ILIKE '%' || p_search || '%'
     OR p.contact_phone ILIKE '%' || p_search || '%'
  ORDER BY p.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 200))
  OFFSET GREATEST(0, p_offset);
END;
$$;

REVOKE ALL ON FUNCTION public.list_users_admin(text, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_users_admin(text, int, int) TO authenticated;
