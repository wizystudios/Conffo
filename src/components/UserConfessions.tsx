import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getUserConfessions, deleteConfession } from '@/services/supabaseDataService';
import { Confession } from '@/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, Bookmark, Heart, Grid3X3, Play } from 'lucide-react';
import { ConfessionEditDialog } from './ConfessionEditDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { UserLikedPosts as UserLikedPostsSimple } from './UserLikedPosts';

interface UserConfessionsProps {
  userId?: string;
  onUpdate?: () => void;
}

export function UserConfessions({ userId, onUpdate }: UserConfessionsProps) {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
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
                  
                  const { data: reactionData } = await supabase.rpc(
                    'get_reaction_counts',
                    { confession_uuid: confession.id }
                  );
                  
                  const { count } = await supabase
                    .from('comments')
                    .select('id', { count: 'exact', head: true })
                    .eq('confession_id', confession.id);
                  
                  const { data: userReactionData } = await supabase
                    .from('reactions')
                    .select('type')
                    .eq('confession_id', confession.id)
                    .eq('user_id', user.id);
                    
                  const userReactions = userReactionData ? userReactionData.map(r => r.type) : [];
                  
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

  // Instagram-style 3-column grid for confessions
  const renderGrid = (confessionsList: Confession[], showActions = false) => {
    if (confessionsList.length === 0) {
      return (
        <div className="text-center py-12 mx-4">
          <p className="text-muted-foreground">No confessions found.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-3 gap-0.5">
        {confessionsList.map(confession => {
          const hasMedia = confession.mediaUrl || (confession.mediaUrls && confession.mediaUrls.length > 0);
          const isVideo = confession.mediaType === 'video' || confession.mediaTypes?.[0] === 'video';
          const thumbnailUrl = confession.mediaUrls?.[0] || confession.mediaUrl;
          
          return (
            <div 
              key={confession.id} 
              className="relative aspect-square bg-muted cursor-pointer group overflow-hidden"
              onClick={() => navigate(`/confession/${confession.id}`)}
            >
              {hasMedia && thumbnailUrl ? (
                <>
                  {isVideo ? (
                    <video 
                      src={thumbnailUrl} 
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <img 
                      src={thumbnailUrl} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  )}
                  {isVideo && (
                    <div className="absolute top-2 right-2">
                      <Play className="h-4 w-4 text-white drop-shadow-lg" fill="white" />
                    </div>
                  )}
                  {confession.mediaUrls && confession.mediaUrls.length > 1 && (
                    <div className="absolute top-2 right-2">
                      <Grid3X3 className="h-4 w-4 text-white drop-shadow-lg" />
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center p-2 bg-gradient-to-br from-primary/20 to-primary/5">
                  <p className="text-xs text-center line-clamp-4 text-foreground/80">
                    {confession.content}
                  </p>
                </div>
              )}
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                <div className="flex items-center gap-1">
                  <Heart className="h-4 w-4" fill="white" />
                  <span className="text-sm font-semibold">
                    {Object.values(confession.reactions || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0)}
                  </span>
                </div>
              </div>

              {/* Edit/Delete actions for own profile */}
              {showActions && isOwnProfile && (
                <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="secondary" 
                    size="icon"
                    className="h-7 w-7 rounded-full bg-background/80"
                    onClick={(e) => { e.stopPropagation(); handleEdit(confession); }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="secondary" 
                        size="icon"
                        className="h-7 w-7 rounded-full bg-background/80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Confession?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(confession.id)}
                          disabled={isDeleting}
                          className="bg-destructive text-destructive-foreground"
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // For own profile, show tabs for posts and saved
  if (isOwnProfile) {
    return (
      <>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-background border-b border-border rounded-none h-auto p-0">
            <TabsTrigger 
              value="posts" 
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-3"
            >
              <Grid3X3 className="h-5 w-5" />
            </TabsTrigger>
            <TabsTrigger 
              value="saved"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-3"
            >
              <Bookmark className="h-5 w-5" />
            </TabsTrigger>
            <TabsTrigger 
              value="liked"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-3"
            >
              <Heart className="h-5 w-5" />
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="posts" className="mt-0">
            {renderGrid(confessions, true)}
          </TabsContent>
          
          <TabsContent value="saved" className="mt-0">
            {renderGrid(savedConfessions, false)}
          </TabsContent>

          <TabsContent value="liked" className="mt-0">
            <UserLikedPostsSimple userId={user?.id} />
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

  // For other users' profiles, just show their posts grid
  return renderGrid(confessions);
}