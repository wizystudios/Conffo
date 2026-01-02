-- Support multiple media items per confession (Instagram-style carousel)

CREATE TABLE IF NOT EXISTS public.confession_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  confession_id uuid NOT NULL REFERENCES public.confessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (confession_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_confession_media_confession_id
  ON public.confession_media (confession_id);

ALTER TABLE public.confession_media ENABLE ROW LEVEL SECURITY;

-- Public feed needs to read media
CREATE POLICY "Anyone can view confession media"
ON public.confession_media
FOR SELECT
USING (true);

-- Only authenticated owners can add media rows
CREATE POLICY "Users can add media to their own confessions"
ON public.confession_media
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Allow users to remove their own media rows
CREATE POLICY "Users can delete their own confession media"
ON public.confession_media
FOR DELETE
USING (auth.uid() = user_id);
