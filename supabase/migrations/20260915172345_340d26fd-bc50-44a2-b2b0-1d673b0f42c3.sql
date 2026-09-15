CREATE TABLE public.rls_test_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_label text NOT NULL,
  status text NOT NULL DEFAULT 'passed',
  total_checks integer NOT NULL DEFAULT 0,
  passed_checks integer NOT NULL DEFAULT 0,
  failed_checks integer NOT NULL DEFAULT 0,
  failures jsonb NOT NULL DEFAULT '[]'::jsonb,
  details_url text,
  commit_sha text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.rls_test_runs TO authenticated;
GRANT ALL ON public.rls_test_runs TO service_role;

ALTER TABLE public.rls_test_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view RLS test runs"
ON public.rls_test_runs FOR SELECT TO authenticated
USING (public.is_current_user_admin());