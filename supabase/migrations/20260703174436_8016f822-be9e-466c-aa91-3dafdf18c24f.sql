
-- Admin session audit log: sign-in, sign-out, refresh
CREATE TABLE IF NOT EXISTS public.admin_session_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  admin_email text,
  event_type text NOT NULL CHECK (event_type IN ('sign_in','sign_out','token_refresh','session_restored')),
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_session_audit TO authenticated;
GRANT ALL ON public.admin_session_audit TO service_role;

ALTER TABLE public.admin_session_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can read
CREATE POLICY "Admins read session audit" ON public.admin_session_audit
  FOR SELECT TO authenticated
  USING (public.is_current_user_admin());

-- No client writes/updates/deletes
CREATE POLICY "No client writes session audit" ON public.admin_session_audit
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- Immutability
CREATE TRIGGER admin_session_audit_no_update
  BEFORE UPDATE OR DELETE ON public.admin_session_audit
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutations();

-- RPC used by the client to log admin session events (only inserts if caller is admin)
CREATE OR REPLACE FUNCTION public.log_admin_session_event(p_event text, p_user_agent text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  SELECT COALESCE(is_admin, false) INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
  IF NOT v_is_admin THEN RETURN; END IF;
  IF p_event NOT IN ('sign_in','sign_out','token_refresh','session_restored') THEN
    RAISE EXCEPTION 'invalid event';
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.admin_session_audit (admin_id, admin_email, event_type, user_agent)
  VALUES (auth.uid(), v_email, p_event, p_user_agent);
END;
$$;

-- Enable realtime for the dashboard-relevant tables
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.confessions REPLICA IDENTITY FULL;
ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER TABLE public.reactions REPLICA IDENTITY FULL;
ALTER TABLE public.reports REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.confessions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.comments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reports; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
