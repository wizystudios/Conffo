-- Create storage bucket for chat wallpapers
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-wallpapers', 'chat-wallpapers', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for chat wallpapers
CREATE POLICY IF NOT EXISTS "Users can upload their own wallpapers" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'chat-wallpapers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users can view their own wallpapers" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'chat-wallpapers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users can update their own wallpapers" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'chat-wallpapers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users can delete their own wallpapers" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'chat-wallpapers' AND auth.uid()::text = (storage.foldername(name))[1]);