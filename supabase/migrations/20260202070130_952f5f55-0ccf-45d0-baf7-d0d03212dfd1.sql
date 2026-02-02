-- Create triggers to generate notification rows on reactions and comments
-- (Functions already exist: public.notify_on_new_comment, public.notify_on_new_reaction)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_on_new_comment'
  ) THEN
    CREATE TRIGGER trg_notify_on_new_comment
    AFTER INSERT ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_on_new_comment();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_on_new_reaction'
  ) THEN
    CREATE TRIGGER trg_notify_on_new_reaction
    AFTER INSERT ON public.reactions
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_on_new_reaction();
  END IF;
END $$;