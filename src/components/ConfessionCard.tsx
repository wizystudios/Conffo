
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ThumbsUp, MessageSquare, MessageCircle, Heart, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RoomBadge } from './RoomBadge';
import { UsernameDisplay } from './UsernameDisplay';
import { useAuth } from '@/context/AuthContext';
import { toggleReaction } from '@/services/supabaseDataService';
import { Confession, Reaction } from '@/types';

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
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  
  const handleReaction = async (reaction: Reaction) => {
    if (!user || isUpdating) return;
    
    setIsUpdating(true);
    
    await toggleReaction(confession.id, user.id, reaction);
    
    if (onUpdate) {
      onUpdate();
    }
    
    setIsUpdating(false);
  };
  
  const userReactions = confession.userReactions || [];
  
  return (
    <Card>
      <CardContent className={detailed ? "pt-6" : "pt-4"}>
        {!detailed && (
          <div className="flex justify-between items-center mb-2">
            <RoomBadge room={confession.room} />
            <span className="text-sm text-muted-foreground">
              {formatDistanceToNow(confession.timestamp, { addSuffix: true })}
            </span>
          </div>
        )}
        
        <div className={`${detailed ? 'text-lg' : ''}`}>
          {confession.content}
        </div>
        
        {detailed && (
          <div className="flex justify-between items-center mt-4">
            <RoomBadge room={confession.room} />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(confession.timestamp, { addSuffix: true })}
              </span>
              <UsernameDisplay userId={confession.userId} />
            </div>
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
        
        {!detailed && (
          <Link to={`/confession/${confession.id}`}>
            <Button variant="ghost" size="sm" className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              <span>{confession.commentCount}</span>
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
