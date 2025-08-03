import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { StoryCreator } from '@/components/story/StoryCreator';
import { StoryRing } from '@/components/story/StoryRing';
import { StoryViewer } from '@/components/story/StoryViewer';
import { getActiveStories } from '@/services/storyService';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Story } from '@/types';
import { Plus, Search, TrendingUp, Clock } from 'lucide-react';

export default function StoriesPage() {
  const { user, isAuthenticated } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedUserIndex, setSelectedUserIndex] = useState<number | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get all active stories with optimized query
  const { data: stories = [], refetch: refetchStories } = useQuery({
    queryKey: ['active-stories', user?.id],
    queryFn: () => getActiveStories(user?.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
  
  // Group stories by user
  const storiesByUser = stories.reduce<{ [userId: string]: Story[] }>((acc, story) => {
    if (!acc[story.userId]) {
      acc[story.userId] = [];
    }
    acc[story.userId].push(story);
    return acc;
  }, {});
  
  // Convert to array of user stories
  const userStories = Object.keys(storiesByUser).map(userId => ({
    userId,
    stories: storiesByUser[userId]
  }));
  
  // Listen for create-story event from navbar
  useEffect(() => {
    const handleCreateStory = () => setIsCreating(true);
    window.addEventListener('create-story', handleCreateStory);
    return () => window.removeEventListener('create-story', handleCreateStory);
  }, []);
  
  const handleCreateSuccess = () => {
    setIsCreating(false);
    refetchStories();
  };
  
  const handleUserStoryClick = (index: number) => {
    setSelectedUserIndex(index);
    setViewerOpen(true);
  };
  
  const handleNextUser = () => {
    if (selectedUserIndex !== null && selectedUserIndex < userStories.length - 1) {
      setSelectedUserIndex(selectedUserIndex + 1);
    } else {
      setViewerOpen(false);
    }
  };
  
  const handlePrevUser = () => {
    if (selectedUserIndex !== null && selectedUserIndex > 0) {
      setSelectedUserIndex(selectedUserIndex - 1);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 pt-14">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-4">
              Stories
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <Clock className="h-4 w-4 mr-1" />
                  Recent
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Trending
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowSearch(!showSearch)}
                  className="text-muted-foreground"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
            {isAuthenticated && (
              <Button onClick={() => setIsCreating(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Story
              </Button>
            )}
          </CardHeader>
          {showSearch && (
            <div className="px-6 pb-4">
              <Input
                placeholder="Search by hashtag, username, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
          )}
          <CardContent>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
              {/* My Story first (if authenticated) */}
              {isAuthenticated && user && (
                <div className="flex flex-col items-center gap-2 min-w-20">
                  <StoryRing
                    userId={user.id}
                    username={user.username || 'You'}
                    avatarUrl={user.avatarUrl}
                    size="lg"
                  />
                  <span className="text-xs">Your Story</span>
                </div>
              )}
              
              {/* Other users with stories */}
              {userStories.map((userStory, index) => {
                // Skip current user as we already show them first
                if (isAuthenticated && user && userStory.userId === user.id) {
                  return null;
                }
                
                return (
                  <div 
                    key={userStory.userId} 
                    className="flex flex-col items-center gap-2 min-w-20 cursor-pointer"
                    onClick={() => handleUserStoryClick(index)}
                  >
                    <StoryRing
                      userId={userStory.userId}
                      size="lg"
                    />
                    <span className="text-xs truncate w-full text-center"></span>
                  </div>
                );
              })}
              
              {userStories.length === 0 && (
                <div className="py-12 text-center w-full">
                  <p className="text-muted-foreground text-sm">No stories available</p>
                  {isAuthenticated && (
                    <p className="text-sm mt-1">Be the first to share a story!</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Story creation dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="sm:max-w-md">
          <StoryCreator
            onSuccess={handleCreateSuccess}
            onCancel={() => setIsCreating(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Story viewer */}
      {selectedUserIndex !== null && viewerOpen && (
        <StoryViewer
          stories={userStories[selectedUserIndex].stories}
          onClose={() => setViewerOpen(false)}
          onNextUser={handleNextUser}
          onPrevUser={handlePrevUser}
          refetch={refetchStories}
        />
      )}
    </Layout>
  );
}
