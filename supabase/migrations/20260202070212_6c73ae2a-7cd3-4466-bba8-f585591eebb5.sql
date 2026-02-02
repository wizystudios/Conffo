-- Harden notification trigger functions by setting a fixed search_path

CREATE OR REPLACE FUNCTION public.notify_on_new_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  confession_author_id UUID;
  confession_content TEXT;
BEGIN
  -- Get confession author
  SELECT user_id, SUBSTRING(content, 1, 50) INTO confession_author_id, confession_content
  FROM public.confessions
  WHERE id = NEW.confession_id;
  
  -- Create notification for confession author if not self-commenting
  IF confession_author_id IS NOT NULL AND confession_author_id <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, content, related_id)
    VALUES (
      confession_author_id, 
      'new_comment', 
      'Someone commented on your confession: "' || SUBSTRING(confession_content, 1, 50) || '..."', 
      NEW.confession_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_new_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  confession_author_id UUID;
  confession_content TEXT;
  reaction_text TEXT;
BEGIN
  -- Get confession author
  SELECT user_id, SUBSTRING(content, 1, 50) INTO confession_author_id, confession_content
  FROM public.confessions
  WHERE id = NEW.confession_id;
  
  -- Set reaction text based on type
  CASE NEW.type
    WHEN 'like' THEN reaction_text := 'liked';
    WHEN 'laugh' THEN reaction_text := 'laughed at';
    WHEN 'shock' THEN reaction_text := 'was shocked by';
    WHEN 'heart' THEN reaction_text := 'loved';
    ELSE reaction_text := 'reacted to';
  END CASE;
  
  -- Create notification for confession author if not self-reacting
  IF confession_author_id IS NOT NULL AND confession_author_id <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, content, related_id)
    VALUES (
      confession_author_id, 
      'new_reaction', 
      'Someone ' || reaction_text || ' your confession: "' || SUBSTRING(confession_content, 1, 50) || '..."', 
      NEW.confession_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;