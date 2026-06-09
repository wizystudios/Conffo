
-- 1) RPC: let the client know if it's a super admin without exposing the column.
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false);
$$;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

-- 2) Moderation audit log
CREATE TABLE IF NOT EXISTS public.admin_moderation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  admin_email text,
  action text NOT NULL,
  target_user_id uuid,
  target_content_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_moderation_audit TO authenticated;
GRANT ALL ON public.admin_moderation_audit TO service_role;
ALTER TABLE public.admin_moderation_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read moderation audit"
ON public.admin_moderation_audit FOR SELECT
TO authenticated
USING (public.is_current_user_admin());

-- 3) Admin alerts (brute-force / rate-limit notifications)
CREATE TABLE IF NOT EXISTS public.admin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  message text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  acknowledged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.admin_alerts TO authenticated;
GRANT ALL ON public.admin_alerts TO service_role;
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read alerts"
ON public.admin_alerts FOR SELECT
TO authenticated
USING (public.is_current_user_admin());

CREATE POLICY "admins ack alerts"
ON public.admin_alerts FOR UPDATE
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

-- 4) Immutability trigger for audit logs (defence in depth — service_role is also blocked).
CREATE OR REPLACE FUNCTION public.block_audit_mutations()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit log rows are immutable';
END;
$$;

DROP TRIGGER IF EXISTS no_update_password_reset_audit ON public.password_reset_audit;
CREATE TRIGGER no_update_password_reset_audit
  BEFORE UPDATE OR DELETE ON public.password_reset_audit
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutations();

DROP TRIGGER IF EXISTS no_update_admin_moderation_audit ON public.admin_moderation_audit;
CREATE TRIGGER no_update_admin_moderation_audit
  BEFORE UPDATE OR DELETE ON public.admin_moderation_audit
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutations();

-- Defence in depth: explicitly remove UPDATE/DELETE on the audit tables for normal roles.
REVOKE UPDATE, DELETE ON public.password_reset_audit FROM authenticated, anon;
REVOKE UPDATE, DELETE ON public.admin_moderation_audit FROM authenticated, anon;
