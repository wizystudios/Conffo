
-- 1) user_follows: drop the open SELECT policy
DROP POLICY IF EXISTS "Users can view follows" ON public.user_follows;

-- 2) stories realtime: exclude viewed_by from publication payloads
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.stories;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.stories
        (id, user_id, media_url, media_type, caption, effects, created_at, expires_at);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END$$;

-- 3) realtime.messages basic authorization (private channels scoped to caller)
DO $$
BEGIN
  IF to_regclass('realtime.messages') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    BEGIN
      EXECUTE $p$
        CREATE POLICY "Authenticated can read own private topics"
          ON realtime.messages FOR SELECT TO authenticated
          USING (
            topic LIKE 'private:' || auth.uid()::text || ':%'
            OR topic NOT LIKE 'private:%'
          );
      $p$;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END$$;

-- 4) notification_preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  replies_enabled boolean NOT NULL DEFAULT true,
  comments_enabled boolean NOT NULL DEFAULT true,
  trending_enabled boolean NOT NULL DEFAULT true,
  -- { "<room_id>": false, ... } per-room overrides (omit = enabled)
  room_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- { "<topic_id>": false, ... }
  topic_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own notification prefs"
    ON public.notification_preferences FOR ALL TO authenticated
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) push_deliveries with idempotency
CREATE TABLE IF NOT EXISTS public.push_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  recipient_id uuid NOT NULL,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','delivered','failed','dead','suppressed')),
  attempts int NOT NULL DEFAULT 0,
  next_attempt_at timestamptz,
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_deliveries_recipient_idx ON public.push_deliveries(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS push_deliveries_status_idx ON public.push_deliveries(status, next_attempt_at);

GRANT SELECT ON public.push_deliveries TO authenticated;
GRANT ALL ON public.push_deliveries TO service_role;
ALTER TABLE public.push_deliveries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Recipients can read their deliveries"
    ON public.push_deliveries FOR SELECT TO authenticated
    USING (auth.uid() = recipient_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TRIGGER push_deliveries_updated_at
  BEFORE UPDATE ON public.push_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
