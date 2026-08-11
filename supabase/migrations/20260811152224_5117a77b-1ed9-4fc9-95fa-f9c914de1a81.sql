-- 1. Admin acknowledge/mute on scan snapshots
ALTER TABLE public.security_scan_snapshots
  ADD COLUMN IF NOT EXISTS acknowledged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS muted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledged_by uuid;

GRANT SELECT, UPDATE ON public.security_scan_snapshots TO authenticated;
GRANT ALL ON public.security_scan_snapshots TO service_role;

DROP POLICY IF EXISTS "admins ack scan snapshots" ON public.security_scan_snapshots;
CREATE POLICY "admins ack scan snapshots"
  ON public.security_scan_snapshots FOR UPDATE
  TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- 2. Device link codes (backend-only)
CREATE TABLE IF NOT EXISTS public.device_link_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  user_id uuid,
  status text NOT NULL DEFAULT 'pending',
  device_label text,
  token_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  claimed_at timestamptz
);

GRANT ALL ON public.device_link_codes TO service_role;
ALTER TABLE public.device_link_codes ENABLE ROW LEVEL SECURITY;
-- No policies: clients must go through the device-link edge function.

CREATE TRIGGER device_link_codes_updated_at
  BEFORE UPDATE ON public.device_link_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS device_link_codes_code_idx ON public.device_link_codes (code);

-- 3. Account recovery codes (backend-only, hashed)
CREATE TABLE IF NOT EXISTS public.account_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_hash text NOT NULL,
  label text,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.account_recovery_codes TO service_role;
ALTER TABLE public.account_recovery_codes ENABLE ROW LEVEL SECURITY;
-- No policies: only the recovery edge function (service_role) may touch these.

CREATE TRIGGER account_recovery_codes_updated_at
  BEFORE UPDATE ON public.account_recovery_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS account_recovery_codes_hash_idx ON public.account_recovery_codes (code_hash);