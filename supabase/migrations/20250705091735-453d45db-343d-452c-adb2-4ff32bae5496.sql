-- Enable real-time for all critical tables
ALTER TABLE public.confessions REPLICA IDENTITY FULL;
ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER TABLE public.reactions REPLICA IDENTITY FULL;
ALTER TABLE public.user_follows REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.confessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;  
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_follows;