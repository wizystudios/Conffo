import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ThumbsUp, MessageSquare, MessageCircle, Heart, AlertCircle, Bookmark, BookmarkCheck } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RoomBadge } from './RoomBadge';
import { UsernameDisplay } from './UsernameDisplay';
import { useAuth } from '@/context/AuthContext';
import { toggleReaction, saveConfession } from '@/services/supabaseDataService';
import { Confession, Reaction } from '@/types';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ReactionButtonProps {
  icon: React.ReactNode;
  count: number;
  isActive?: boolean;
  onClick: () => void;
  label: string;
}

const ReactionButton = ({ icon, count, isActive, onClick, label }: ReactionButtonProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`flex items-center gap-1 ${isActive ? 'bg-secondary' : ''}`}
          onClick={onClick}
        >
          {icon}
          <span>{count}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

interface ConfessionCardProps {
  confession: Confession;
  detailed?: boolean;
  onUpdate?: () => void;
}

export function ConfessionCard({ confession, detailed = false, onUpdate }: ConfessionCardProps) {
  const { user, isAuthenticated } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  // Check if this confession is saved by the current user
  useEffect(() => {
    const checkIfSaved = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('saved_confessions')
          .select('id')
          .eq('confession_id', confession.id)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (!error && data) {
          setIsSaved(true);
        }
      } catch (error) {
        console.error('Error checking saved status:', error);
      }
    };
    
    checkIfSaved();
  }, [confession.id, user]);
  
  const handleReaction = async (reaction: Reaction) => {
    if (!user || isUpdating) return;
    
    if (!isAuthenticated) {
      toast({
        variant: "destructive",
        description: "Please sign in to react to confessions",
      });
      return;
    }
    
    setIsUpdating(true);
    
    try {
      await toggleReaction(confession.id, user.id, reaction);
      
      if (onUpdate) {
        onUpdate();
      }
      
      toast({
        description: "Your reaction has been recorded",
      });
    } catch (error) {
      console.error('Error toggling reaction:', error);
      toast({
        variant: "destructive",
        description: "Failed to record your reaction",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleSaveConfession = async () => {
    if (!user || isUpdating) return;
    
    if (!isAuthenticated) {
      toast({
        variant: "destructive",
        description: "Please sign in to save confessions",
      });
      return;
    }
    
    setIsUpdating(true);
    
    try {
      const result = await saveConfession(confession.id, user.id);
      
      if (result) {
        setIsSaved(!isSaved);
        toast({
          description: isSaved ? "Confession removed from saved" : "Confession saved successfully",
        });
      }
    } catch (error) {
      console.error('Error saving confession:', error);
      toast({
        variant: "destructive",
        description: "Failed to save confession",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const userReactions = confession.userReactions || [];
  
  return (
    <Card>
      <CardContent className={detailed ? "pt-6" : "pt-4"}>
        <div className="flex justify-between items-center mb-4">
          <UsernameDisplay userId={confession.userId} size="md" />
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(confession.timestamp, { addSuffix: true })}
          </span>
        </div>
        
        <div className={`${detailed ? 'text-lg' : ''} mt-2`}>
          {confession.content}
        </div>
        
        {!detailed && (
          <div className="flex mt-4">
            <RoomBadge room={confession.room} />
          </div>
        )}
        
        {detailed && (
          <div className="flex justify-between items-center mt-4">
            <RoomBadge room={confession.room} />
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between border-t pt-3 pb-2">
        <div className="flex gap-1">
          <ReactionButton 
            icon={<ThumbsUp className="h-4 w-4" />} 
            count={confession.reactions.like} 
            isActive={userReactions.includes('like')}
            onClick={() => handleReaction('like')}
            label="Like"
          />
          <ReactionButton 
            icon={<MessageSquare className="h-4 w-4" />} 
            count={confession.reactions.laugh} 
            isActive={userReactions.includes('laugh')}
            onClick={() => handleReaction('laugh')}
            label="Laugh"
          />
          <ReactionButton 
            icon={<AlertCircle className="h-4 w-4" />} 
            count={confession.reactions.shock} 
            isActive={userReactions.includes('shock')}
            onClick={() => handleReaction('shock')}
            label="Shock"
          />
          <ReactionButton 
            icon={<Heart className="h-4 w-4" />} 
            count={confession.reactions.heart} 
            isActive={userReactions.includes('heart')}
            onClick={() => handleReaction('heart')}
            label="Love"
          />
        </div>
        
        <div className="flex items-center gap-1">
          {isAuthenticated && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-1" 
              onClick={handleSaveConfession}
            >
              {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              <span>Save</span>
            </Button>
          )}
          {!detailed && (
            <Link to={`/confession/${confession.id}`}>
              <Button variant="ghost" size="sm" className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                <span>{confession.commentCount}</span>
              </Button>
            </Link>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
