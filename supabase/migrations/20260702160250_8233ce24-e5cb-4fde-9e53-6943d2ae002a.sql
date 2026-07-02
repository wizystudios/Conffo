
CREATE OR REPLACE FUNCTION public.get_story_viewers(story_uuid uuid)
RETURNS TABLE(user_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only the story's owner can enumerate viewers
  IF NOT EXISTS (
    SELECT 1 FROM public.stories s
    WHERE s.id = story_uuid AND s.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
    SELECT UNNEST(s.viewed_by) FROM public.stories s WHERE s.id = story_uuid;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_story_viewers(uuid) TO authenticated;
