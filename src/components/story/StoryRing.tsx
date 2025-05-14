
import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { StoryViewer } from '@/components/story/StoryViewer';
import { useQuery } from '@tanstack/react-query';
import { getUserStories } from '@/services/storyService';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface StoryRingProps {
  userId: string;
  username?: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function StoryRing({ userId, username, avatarUrl, size = 'md' }: StoryRingProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  
  const { data: stories = [], isLoading, refetch } = useQuery({
    queryKey: ['stories', userId, user?.id],
    queryFn: () => getUserStories(userId, user?.id),
    enabled: !!userId,
  });
  
  // Check if there are any unwatched stories
  const hasUnwatchedStories = stories.some(story => !story.isViewed);
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

  // Refetch after closing to update viewed status
  const handleClose = () => {
    setOpen(false);
    refetch();
  };

  return (
    <>
      <div 
        className={`cursor-pointer relative`}
        onClick={handleClick}
      >
        <div 
          className={cn(
            `rounded-full transition-all`, 
            hasStories && (
              hasUnwatchedStories 
                ? 'bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500' 
                : 'bg-gray-400/30'
            ),
            ringSize[size]
          )}
        >
          <Avatar className={sizeClass[size]}>
            <AvatarImage src={avatarUrl || ''} alt={username || 'User'} />
            <AvatarFallback>{getInitials(username)}</AvatarFallback>
          </Avatar>
        </div>
      </div>
      
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-none w-full h-full max-h-none">
          {stories.length > 0 && (
            <StoryViewer
              stories={stories}
              onClose={handleClose}
              refetch={refetch}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
