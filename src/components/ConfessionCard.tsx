
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Heart, ThumbsUp, MessagesSquare } from 'lucide-react';
import { Confession } from '@/types';
import { RoomBadge } from './RoomBadge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { toggleReaction } from '@/services/dataService';
import { Card } from '@/components/ui/card';

interface ConfessionCardProps {
  confession: Confession;
  detailed?: boolean;
  onUpdate?: () => void;
}

export function ConfessionCard({ confession, detailed = false, onUpdate }: ConfessionCardProps) {
  const { user } = useAuth();
  const [isReacting, setIsReacting] = useState(false);
  
  const handleReaction = async (reaction: 'like' | 'heart') => {
    if (!user || isReacting) return;
    
    setIsReacting(true);
    toggleReaction(confession.id, user.id, reaction);
    if (onUpdate) onUpdate();
    setIsReacting(false);
  };
  
  const hasLiked = confession.userReactions?.includes('like');
  const hasHearted = confession.userReactions?.includes('heart');
  
  return (
    <Card className={`confession-card animate-fade-in ${detailed ? 'mb-6' : 'mb-4'}`}>
      <div className="flex justify-between items-start mb-2">
        <RoomBadge room={confession.room} />
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(confession.timestamp, { addSuffix: true })}
        </span>
      </div>
      
      <div className={`confession-content ${detailed ? 'text-lg mb-6' : 'mb-4'}`}>
        {detailed ? confession.content : (
          <Link to={`/confession/${confession.id}`} className="hover:underline">
            {confession.content.length > 200 
              ? `${confession.content.substring(0, 200)}...` 
              : confession.content}
          </Link>
        )}
      </div>
      
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`p-1 h-8 ${hasLiked ? 'text-primary' : ''}`}
            onClick={() => handleReaction('like')}
            disabled={!user}
          >
            <ThumbsUp className="h-4 w-4 mr-1" />
            <span>{confession.reactions.like}</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className={`p-1 h-8 ${hasHearted ? 'text-destructive' : ''}`}
            onClick={() => handleReaction('heart')}
            disabled={!user}
          >
            <Heart className="h-4 w-4 mr-1" />
            <span>{confession.reactions.heart}</span>
          </Button>
        </div>
        
        {!detailed && (
          <Link to={`/confession/${confession.id}`} className="flex items-center text-muted-foreground text-sm">
            <MessagesSquare className="h-4 w-4 mr-1" />
            <span>{confession.commentCount}</span>
          </Link>
        )}
      </div>
    </Card>
  );
}
