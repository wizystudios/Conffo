
-- Function to check if a confession is saved by a user
CREATE OR REPLACE FUNCTION public.check_saved_confession(
  confession_uuid UUID,
  user_uuid UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.saved_confessions
    WHERE confession_id = confession_uuid AND user_id = user_uuid
  );
$$;

-- Function to add a saved confession
CREATE OR REPLACE FUNCTION public.add_saved_confession(
  confession_uuid UUID,
  user_uuid UUID
)
RETURNS VOID
LANGUAGE PLPGSQL
AS $$
BEGIN
  INSERT INTO public.saved_confessions (confession_id, user_id)
  VALUES (confession_uuid, user_uuid)
  ON CONFLICT (user_id, confession_id) DO NOTHING;
END;
$$;

-- Function to remove a saved confession
CREATE OR REPLACE FUNCTION public.remove_saved_confession(
  confession_uuid UUID,
  user_uuid UUID
)
RETURNS VOID
LANGUAGE PLPGSQL
AS $$
BEGIN
  DELETE FROM public.saved_confessions
  WHERE confession_id = confession_uuid AND user_id = user_uuid;
END;
$$;

-- Function to get a user's saved confessions
CREATE OR REPLACE FUNCTION public.get_user_saved_confessions(
  user_uuid UUID
)
RETURNS TABLE (confession_id UUID)
LANGUAGE SQL
STABLE
AS $$
  SELECT confession_id FROM public.saved_confessions
  WHERE user_id = user_uuid;
$$;
