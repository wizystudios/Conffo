import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserConfessions, deleteConfession } from '@/services/supabaseDataService';
import { Confession } from '@/types';
import { InstagramConfessionCard } from './InstagramConfessionCard';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, Bookmark } from 'lucide-react';
import { ConfessionEditDialog } from './ConfessionEditDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';

interface UserConfessionsProps {
  userId?: string;
  onUpdate?: () => void;
}

export function UserConfessions({ userId, onUpdate }: UserConfessionsProps) {
  const { user, isAdmin } = useAuth();
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [savedConfessions, setSavedConfessions] = useState<Confession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedConfession, setSelectedConfession] = useState<Confession | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');

  const viewingUserId = userId || user?.id;
  const isOwnProfile = userId ? userId === user?.id : true;

  useEffect(() => {
    const fetchConfessions = async () => {
      if (!viewingUserId) return;
      
      setIsLoading(true);
      try {
        const userConfessions = await getUserConfessions(viewingUserId);
        setConfessions(userConfessions);

        // Only fetch saved confessions for own profile
        if (isOwnProfile && user?.id) {
          const { data: savedData } = await supabase
            .from('saved_confessions')
            .select(`
              confession_id,
              confessions (
                id, 
                content, 
                room_id, 
                user_id, 
                created_at,
                media_url,
                media_type,
                tags
              )
            `)
            .eq('user_id', user.id);

          if (savedData) {
            const saved = await Promise.all(
              savedData
                .filter(item => item.confessions)
                .map(async (item: any) => {
                  const confession = item.confessions;
                  
                  // Get reaction counts with proper type checking
                  const { data: reactionData } = await supabase.rpc(
                    'get_reaction_counts',
                    { confession_uuid: confession.id }
                  );
                  
                  // Get comment count
                  const { count } = await supabase
                    .from('comments')
                    .select('id', { count: 'exact', head: true })
                    .eq('confession_id', confession.id);
                  
                  // Get user's reactions
                  const { data: userReactionData } = await supabase
                    .from('reactions')
                    .select('type')
                    .eq('confession_id', confession.id)
                    .eq('user_id', user.id);
                    
                  const userReactions = userReactionData ? userReactionData.map(r => r.type) : [];
                  
                  // Safely parse reaction data with proper type checking
                  const reactions = {
                    like: 0,
                    laugh: 0,
                    shock: 0,
                    heart: 0
                  };

                  if (reactionData && typeof reactionData === 'object' && reactionData !== null) {
                    if ('like' in reactionData) reactions.like = Number(reactionData.like) || 0;
                    if ('laugh' in reactionData) reactions.laugh = Number(reactionData.laugh) || 0;
                    if ('shock' in reactionData) reactions.shock = Number(reactionData.shock) || 0;
                    if ('heart' in reactionData) reactions.heart = Number(reactionData.heart) || 0;
                  }
                  
                  return {
                    id: confession.id,
                    content: confession.content,
                    room: confession.room_id,
                    userId: confession.user_id || '',
                    timestamp: new Date(confession.created_at).getTime(),
                    reactions,
                    commentCount: count || 0,
                    userReactions,
                    mediaUrl: confession.media_url || null,
                    mediaType: confession.media_type,
                    tags: confession.tags || []
                  };
                })
            );
            setSavedConfessions(saved);
          }
        }
      } catch (error) {
        console.error('Error fetching confessions:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchConfessions();
  }, [viewingUserId, isOwnProfile, user?.id]);

  const handleDelete = async (confessionId: string) => {
    if (!user?.id || isDeleting) return;
    
    setIsDeleting(true);
    try {
      const success = await deleteConfession(confessionId, user.id, isAdmin);
      
      if (success) {
        setConfessions(prev => prev.filter(c => c.id !== confessionId));
        setSavedConfessions(prev => prev.filter(c => c.id !== confessionId));
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (confession: Confession) => {
    setSelectedConfession(confession);
    setIsEditDialogOpen(true);
  };

  const handleConfessionUpdated = (updatedConfession: Confession) => {
    setConfessions(prev => prev.map(c => c.id === updatedConfession.id ? updatedConfession : c));
    setSavedConfessions(prev => prev.map(c => c.id === updatedConfession.id ? updatedConfession : c));
    if (onUpdate) onUpdate();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const renderConfessions = (confessionsList: Confession[]) => {
    if (confessionsList.length === 0) {
      return (
        <div className="text-center py-12 mx-4">
          <p className="text-muted-foreground">No confessions found.</p>
        </div>
      );
    }

    return (
      <div className="space-y-0">
        {confessionsList.map(confession => (
          <div key={confession.id} className="relative">
            <InstagramConfessionCard 
              confession={confession} 
              onUpdate={onUpdate}
            />
            {isOwnProfile && (
              <div className="absolute top-6 right-6 flex gap-2 bg-background/90 backdrop-blur-sm rounded-full p-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full"
                  onClick={() => handleEdit(confession)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 w-8 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Confession?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your confession.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(confession.id)}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // For own profile, show tabs for posts and saved
  if (isOwnProfile) {
    return (
      <>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-background border-b border-border rounded-none">
            <TabsTrigger value="posts">My Posts</TabsTrigger>
            <TabsTrigger value="saved">
              <Bookmark className="h-4 w-4 mr-1" />
              Saved
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="posts">
            {renderConfessions(confessions)}
          </TabsContent>
          
          <TabsContent value="saved">
            {renderConfessions(savedConfessions)}
          </TabsContent>
        </Tabs>

        {selectedConfession && (
          <ConfessionEditDialog 
            confession={selectedConfession}
            isOpen={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onUpdate={handleConfessionUpdated}
          />
        )}
      </>
    );
  }

  // For other users' profiles, just show their posts
  return renderConfessions(confessions);
}
