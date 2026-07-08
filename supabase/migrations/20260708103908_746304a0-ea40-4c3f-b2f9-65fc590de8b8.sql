
CREATE TABLE IF NOT EXISTS public.security_scan_snapshots (
  finding_hash text PRIMARY KEY,
  level text NOT NULL,
  name text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.security_scan_snapshots TO service_role;

ALTER TABLE public.security_scan_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view scan snapshots"
  ON public.security_scan_snapshots FOR SELECT
  TO authenticated
  USING (public.is_current_user_admin());
