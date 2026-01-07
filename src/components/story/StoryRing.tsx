
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
      <button
        type="button"
        className="cursor-pointer"
        onClick={handleClick}
        aria-label={hasStories ? `View ${username || 'user'} moment` : `${username || 'user'} has no moments`}
      >
        <div className="flex flex-col items-center gap-1">
          <div className={cn('rounded-full', hasUnwatchedStories && hasStories && 'story-avatar-glow')}>
            <Avatar className={sizeClass[size]}>
              <AvatarImage src={avatarUrl || ''} alt={username || 'User'} loading="lazy" />
              <AvatarFallback>{getInitials(username)}</AvatarFallback>
            </Avatar>
          </div>

          {hasStories && (
            <div
              className={cn(
                'story-indicator-bar',
                hasUnwatchedStories ? 'animate-pulse-slow' : 'opacity-30',
                size === 'sm' && 'w-6',
                size === 'md' && 'w-8',
                size === 'lg' && 'w-10',
                size === 'xl' && 'w-14'
              )}
            />
          )}
        </div>
      </button>

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
