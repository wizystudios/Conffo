-- Structured audio comments
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS audio_duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS audio_waveform JSONB;

-- Moments persistence: enforce server-side active-story filtering via RLS
DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='stories' AND policyname='Anyone can view stories'
  ) THEN
    EXECUTE 'DROP POLICY "Anyone can view stories" ON public.stories';
  END IF;
END $do$;

-- Storage bucket for comment audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('comment_audio', 'comment_audio', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (comment_audio)
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can upload their own comment audio'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can upload their own comment audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = ''comment_audio'' AND auth.uid()::text = (storage.foldername(name))[1])';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can update their own comment audio'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update their own comment audio" ON storage.objects FOR UPDATE USING (bucket_id = ''comment_audio'' AND auth.uid()::text = (storage.foldername(name))[1])';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can delete their own comment audio'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can delete their own comment audio" ON storage.objects FOR DELETE USING (bucket_id = ''comment_audio'' AND auth.uid()::text = (storage.foldername(name))[1])';
  END IF;
END $do$;