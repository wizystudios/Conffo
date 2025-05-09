
import { useEffect, useState } from 'react';
import { User } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface UsernameDisplayProps {
  userId: string;
}

export function UsernameDisplay({ userId }: UsernameDisplayProps) {
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchUsername = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', userId)
          .single();
        
        if (error) {
          console.error('Error fetching username:', error);
          return;
        }
        
        setUsername(data.username);
      } catch (error) {
        console.error('Error in fetchUsername:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (userId) {
      fetchUsername();
    }
  }, [userId]);
  
  if (isLoading) {
    return (
      <span className="text-xs text-muted-foreground">Loading...</span>
    );
  }
  
  return (
    <span className="text-xs font-medium">
      {username || 'Anonymous User'}
    </span>
  );
}
