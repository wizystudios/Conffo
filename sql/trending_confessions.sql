
-- Function to get reaction counts for all confessions
CREATE OR REPLACE FUNCTION get_reaction_counts_for_all_confessions()
RETURNS TABLE (confession_id UUID, total_reactions BIGINT)
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    confession_id,
    COUNT(*) AS total_reactions
  FROM
    public.reactions
  WHERE
    confession_id IS NOT NULL
  GROUP BY 
    confession_id
  ORDER BY 
    total_reactions DESC
$$;
