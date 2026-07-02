
-- 1. Fix mutable search_path on block_audit_mutations
CREATE OR REPLACE FUNCTION public.block_audit_mutations()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'audit log rows are immutable';
END;
$$;

-- 2. admin_action_rate_limits: only service_role uses it. Add explicit deny policies
-- so the RLS-enabled-no-policy linter is satisfied and intent is documented.
CREATE POLICY "Deny all authenticated access" ON public.admin_action_rate_limits
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny all anon access" ON public.admin_action_rate_limits
  FOR ALL TO anon USING (false) WITH CHECK (false);

-- 3. REVOKE column-level SELECT on sensitive profile columns
REVOKE SELECT (is_admin, is_moderator) ON public.profiles FROM anon, authenticated;
REVOKE SELECT (contact_email, contact_phone, date_of_birth, birthdate, gender, location)
  ON public.profiles FROM anon, authenticated;

-- 4. REVOKE viewed_by from clients (use get_active_stories RPC instead)
REVOKE SELECT (viewed_by) ON public.stories FROM anon, authenticated;

-- 5. Self-service RPC: owner reads own PII
CREATE OR REPLACE FUNCTION public.get_my_profile_private()
RETURNS TABLE (
  contact_email text,
  contact_phone text,
  date_of_birth date,
  birthdate date,
  gender text,
  location text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.contact_email, p.contact_phone, p.date_of_birth, p.birthdate, p.gender, p.location
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_profile_private() TO authenticated;

-- 6. Privacy-respecting RPC for viewing another user's contact info
CREATE OR REPLACE FUNCTION public.get_profile_contact(target_id uuid)
RETURNS TABLE (
  contact_email text,
  contact_phone text,
  date_of_birth date,
  location text,
  gender text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE WHEN public.can_view_user_info(auth.uid(), target_id, 'email_visibility') THEN p.contact_email END,
    CASE WHEN public.can_view_user_info(auth.uid(), target_id, 'phone_visibility') THEN p.contact_phone END,
    CASE WHEN public.can_view_user_info(auth.uid(), target_id, 'birth_date_visibility') THEN p.date_of_birth END,
    CASE WHEN public.can_view_user_info(auth.uid(), target_id, 'location_visibility') THEN p.location END,
    CASE WHEN public.can_view_user_info(auth.uid(), target_id, 'gender_visibility') THEN p.gender END
  FROM public.profiles p
  WHERE p.id = target_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_profile_contact(uuid) TO authenticated, anon;

-- 7. Login lookup by phone/email (needed since contact_phone/contact_email are revoked)
CREATE OR REPLACE FUNCTION public.find_login_identity(identifier text)
RETURNS TABLE (user_id uuid, contact_email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, contact_email FROM public.profiles
  WHERE contact_phone = identifier
     OR contact_email = identifier
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.find_login_identity(text) TO anon, authenticated;
