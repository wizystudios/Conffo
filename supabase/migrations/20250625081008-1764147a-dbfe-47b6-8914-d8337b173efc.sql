
-- Drop all existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view their saved confessions" ON public.saved_confessions;
DROP POLICY IF EXISTS "Users can save confessions" ON public.saved_confessions;
DROP POLICY IF EXISTS "Users can unsave confessions" ON public.saved_confessions;

-- Now create the RLS policies for saved_confessions table
ALTER TABLE public.saved_confessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their saved confessions" ON public.saved_confessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save confessions" ON public.saved_confessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave confessions" ON public.saved_confessions
  FOR DELETE USING (auth.uid() = user_id);
