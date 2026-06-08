
-- Password reset audit log
CREATE TABLE IF NOT EXISTS public.password_reset_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requestor_id uuid,
  requestor_email text,
  target_user_id uuid,
  target_email text NOT NULL,
  method text NOT NULL CHECK (method IN ('email_link','admin_set_password')),
  delivery_status text NOT NULL CHECK (delivery_status IN ('sent','failed','rate_limited','forbidden')),
  error text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.password_reset_audit TO authenticated;
GRANT ALL ON public.password_reset_audit TO service_role;
ALTER TABLE public.password_reset_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins can view password reset audit"
  ON public.password_reset_audit FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

-- Per-IP / per-requestor rate limiter for admin-reset-password
CREATE TABLE IF NOT EXISTS public.admin_action_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  bucket_key text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aarl_action_bucket_time
  ON public.admin_action_rate_limits (action, bucket_key, attempted_at DESC);
GRANT ALL ON public.admin_action_rate_limits TO service_role;
ALTER TABLE public.admin_action_rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (edge function) touches this table.

CREATE INDEX IF NOT EXISTS idx_password_reset_audit_created_at
  ON public.password_reset_audit (created_at DESC);
