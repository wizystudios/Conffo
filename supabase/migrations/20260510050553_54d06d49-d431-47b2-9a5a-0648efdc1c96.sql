
-- Replace handle_new_user so signup metadata populates the profile
-- (current version only inserts an empty profile row, which is why
--  username / birthdate / gender appeared blank in account settings
--  and why the onboarding kept asking "what should we call you?")

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb := COALESCE(new.raw_user_meta_data, '{}'::jsonb);
  v_username text := NULLIF(meta->>'username', '');
  v_birthdate text := NULLIF(meta->>'birthdate', '');
  v_gender text := NULLIF(meta->>'gender', '');
  v_location text := NULLIF(meta->>'location', '');
  v_phone text := NULLIF(meta->>'phone', '');
  v_email text := new.email;
BEGIN
  INSERT INTO public.profiles (
    id, username, date_of_birth, gender, location,
    contact_email, contact_phone, onboarding_completed
  )
  VALUES (
    new.id,
    v_username,
    CASE WHEN v_birthdate IS NOT NULL THEN v_birthdate::date ELSE NULL END,
    v_gender,
    v_location,
    v_email,
    v_phone,
    COALESCE(v_username IS NOT NULL, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(EXCLUDED.username, public.profiles.username),
    date_of_birth = COALESCE(EXCLUDED.date_of_birth, public.profiles.date_of_birth),
    gender = COALESCE(EXCLUDED.gender, public.profiles.gender),
    location = COALESCE(EXCLUDED.location, public.profiles.location),
    contact_email = COALESCE(EXCLUDED.contact_email, public.profiles.contact_email),
    contact_phone = COALESCE(EXCLUDED.contact_phone, public.profiles.contact_phone),
    onboarding_completed = public.profiles.onboarding_completed OR EXCLUDED.onboarding_completed;

  -- Best-effort signup activity log (no-op on failure)
  BEGIN
    INSERT INTO public.user_activity_log (user_id, activity_type, details)
    VALUES (new.id, 'signup', jsonb_build_object('method', new.email));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN new;
END;
$function$;

-- Make sure the trigger actually exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Allow a user to delete their own profile row (needed for account deletion)
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);
