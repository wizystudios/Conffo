import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, ThumbsUp, Laugh, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Separator } from '@/components/ui/separator';

interface LikeUser {
  id: string;
  username: string;
  avatar_url: string | null;
  reaction_type: string;
  created_at: string;
}

interface LikesListProps {
  confessionId: string;
  totalLikes: number;
  isOpen: boolean;
  onClose: () => void;
}

const getReactionIcon = (type: string) => {
  switch (type) {
    case 'like':
      return <ThumbsUp className="h-4 w-4 text-blue-500" />;
    case 'heart':
      return <Heart className="h-4 w-4 text-red-500" />;
    case 'laugh':
      return <Laugh className="h-4 w-4 text-yellow-500" />;
    case 'shock':
      return <Zap className="h-4 w-4 text-purple-500" />;
    default:
      return <ThumbsUp className="h-4 w-4 text-blue-500" />;
  }
};

export function LikesList({ confessionId, totalLikes, isOpen, onClose }: LikesListProps) {
  const [likeUsers, setLikeUsers] = useState<LikeUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLikeUsers();
    }
  }, [isOpen, confessionId]);

  const fetchLikeUsers = async () => {
    setIsLoading(true);
    try {
      // Get reactions with user profiles
      const { data: reactions, error } = await supabase
        .from('reactions')
        .select('user_id, type, created_at')
        .eq('confession_id', confessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user profiles for each reaction
      const usersWithReactions = await Promise.all(
        (reactions || []).map(async (reaction) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', reaction.user_id)
            .maybeSingle();

          return {
            id: reaction.user_id,
            username: profile?.username || 'Anonymous User',
            avatar_url: profile?.avatar_url,
            reaction_type: reaction.type,
            created_at: reaction.created_at
          };
        })
      );

      setLikeUsers(usersWithReactions);
    } catch (error) {
      console.error('Error fetching likes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            {totalLikes} {totalLikes === 1 ? 'Like' : 'Likes'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : likeUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No likes yet
            </div>
          ) : (
            <div className="space-y-1">
              {likeUsers.map((user, index) => (
                <div key={`${user.id}-${user.reaction_type}-${index}`}>
                  <div className="flex items-center justify-between py-2 px-1 hover:bg-muted/50 rounded-md">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage 
                          src={user.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${user.id}`} 
                          alt={user.username} 
                        />
                        <AvatarFallback>
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.username}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getReactionIcon(user.reaction_type)}
                    </div>
                  </div>
                  {index < likeUsers.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}