-- Ensure community creator is always a member

-- 1) Add a helper trigger function
CREATE OR REPLACE FUNCTION public.add_creator_as_community_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert creator as first member if not already present
  IF NOT EXISTS (
    SELECT 1
    FROM public.community_members cm
    WHERE cm.community_id = NEW.id
      AND cm.user_id = NEW.creator_id
  ) THEN
    INSERT INTO public.community_members (community_id, user_id, role)
    VALUES (NEW.id, NEW.creator_id, 'creator');
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Create trigger on communities
DROP TRIGGER IF EXISTS trg_add_creator_as_community_member ON public.communities;
CREATE TRIGGER trg_add_creator_as_community_member
AFTER INSERT ON public.communities
FOR EACH ROW
EXECUTE FUNCTION public.add_creator_as_community_member();
