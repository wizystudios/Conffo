
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { StoryViewer } from '@/components/story/StoryViewer';
import { useQuery } from '@tanstack/react-query';
import { getUserStories } from '@/services/storyService';
import { useAuth } from '@/context/AuthContext';

interface StoryRingProps {
  userId: string;
  username?: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function StoryRing({ userId, username, avatarUrl, size = 'md' }: StoryRingProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  
  const { data: stories = [], isLoading } = useQuery({
    queryKey: ['stories', userId, user?.id],
    queryFn: () => getUserStories(userId, user?.id),
    enabled: !!userId,
  });
  
  const hasStories = stories.length > 0;
  
  const getInitials = (name?: string | null) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };
  
  const sizeClass = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  };
  
  const ringSize = {
    sm: 'p-0.5',
    md: 'p-1',
    lg: 'p-1',
    xl: 'p-1.5',
  };
  
  const handleClick = () => {
    if (hasStories) {
      setOpen(true);
    }
  };

  return (
    <>
      <div 
        className={`cursor-pointer ${hasStories ? 'active-story-ring' : ''}`}
        onClick={handleClick}
      >
        <div 
          className={`
            rounded-full 
            ${hasStories ? 'bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500' : ''}
            ${ringSize[size]}
          `}
        >
          <Avatar className={sizeClass[size]}>
            <AvatarImage src={avatarUrl || ''} alt={username || 'User'} />
            <AvatarFallback>{getInitials(username)}</AvatarFallback>
          </Avatar>
        </div>
      </div>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-none w-full h-full max-h-none">
          {stories.length > 0 && (
            <StoryViewer
              stories={stories}
              onClose={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
