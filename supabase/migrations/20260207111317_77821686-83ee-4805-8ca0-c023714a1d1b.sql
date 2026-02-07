-- Create the trigger that was missing: auto-add creator as first community member
CREATE TRIGGER add_creator_as_community_member_trigger
  AFTER INSERT ON public.communities
  FOR EACH ROW
  EXECUTE FUNCTION public.add_creator_as_community_member();