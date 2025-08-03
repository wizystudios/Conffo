
import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ThumbsUp, MessageCircle, Heart, Bookmark, BookmarkCheck, Share, Download } from 'lucide-react';
import { ImprovedCommentModal } from './ImprovedCommentModal';
import { LikesList } from './LikesList';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RoomBadge } from './RoomBadge';
import { UsernameDisplay } from './UsernameDisplay';
import { useAuth } from '@/context/AuthContext';
import { toggleReaction, saveConfession } from '@/services/supabaseDataService';
import { Confession, Reaction } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface ReactionButtonProps {
  icon: React.ReactNode;
  count: number;
  isActive?: boolean;
  onClick: () => void;
}

const ReactionButton = ({ icon, count, isActive, onClick }: ReactionButtonProps) => (
  <Button 
    variant="ghost" 
    size="sm" 
    className={`flex items-center gap-1 ${isActive ? 'bg-secondary' : ''}`}
    onClick={onClick}
  >
    {icon}
    <span>{count}</span>
  </Button>
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
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showLikesList, setShowLikesList] = useState(false);
  const [commentCount, setCommentCount] = useState(confession.commentCount);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Check if this confession is saved by the current user
  useEffect(() => {
    const checkIfSaved = async () => {
      if (!user) return;
      
      try {
        const { data } = await supabase
          .from('saved_confessions')
          .select('id')
          .eq('confession_id', confession.id)
          .eq('user_id', user.id)
          .maybeSingle();
        
        setIsSaved(!!data);
      } catch (error) {
        console.error('Error checking saved status:', error);
      }
    };
    
    checkIfSaved();
  }, [confession.id, user]);
  
  const handleReaction = async (reaction: Reaction) => {
    if (!user || isUpdating || !isAuthenticated) return;
    
    setIsUpdating(true);
    
    try {
      await toggleReaction(confession.id, user.id, reaction);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Reaction failed:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleSaveConfession = async () => {
    if (!user || isUpdating || !isAuthenticated) return;
    
    setIsUpdating(true);
    
    try {
      const result = await saveConfession(confession.id, user.id);
      if (result) {
        setIsSaved(!isSaved);
      }
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleShareConfession = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'ConfessZone',
          text: `${confession.content.substring(0, 50)}...`,
          url: `${window.location.origin}/confession/${confession.id}`
        });
      } else {
        navigator.clipboard.writeText(`${window.location.origin}/confession/${confession.id}`);
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };
  
  const downloadConfession = () => {
    const text = `
      ${confession.content}
      
      Room: ${confession.room}
      ${new Date(confession.timestamp).toLocaleString()}
      
      Downloaded from ConfessZone
    `.trim();
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `confession-${confession.id.substring(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const userReactions = confession.userReactions || [];
  const totalLikes = confession.reactions.like + confession.reactions.heart + confession.reactions.laugh + confession.reactions.shock;
  
  return (
    <>
      <Card ref={cardRef} className="mx-1">
        <CardContent className={detailed ? "pt-6 px-2" : "pt-4 px-2"}>
          <div className="flex justify-between items-center mb-4">
            <UsernameDisplay userId={confession.userId} size="md" />
            <span className="text-sm text-muted-foreground">
              {formatDistanceToNow(confession.timestamp, { addSuffix: true })}
            </span>
          </div>
          
          <div className={`${detailed ? 'text-lg' : ''} mt-2 mb-3`}>
            {confession.content}
          </div>
          
          {confession.mediaUrl && (
            <div className="rounded-md overflow-hidden mb-3 border">
              {confession.mediaType === 'image' ? (
                <img 
                  src={confession.mediaUrl} 
                  alt="Confession media" 
                  className="w-full h-auto max-h-[400px] object-contain"
                  loading="lazy"
                />
              ) : confession.mediaType === 'video' ? (
                <video 
                  src={confession.mediaUrl} 
                  controls 
                  preload="metadata"
                  playsInline
                  className="w-full h-auto max-h-[400px]"
                />
              ) : null}
            </div>
          )}
          
          <div className="flex mt-4">
            <RoomBadge room={confession.room} />
          </div>

          {/* Likes and Comments Count */}
          {(totalLikes > 0 || commentCount > 0) && (
            <div className="flex items-center justify-between pt-2 text-sm text-muted-foreground">
              {totalLikes > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-auto text-muted-foreground hover:text-foreground"
                  onClick={() => setShowLikesList(true)}
                >
                  <div className="flex items-center gap-1">
                    <div className="flex">
                      {confession.reactions.like > 0 && <ThumbsUp className="h-3 w-3 text-blue-500" />}
                      {confession.reactions.heart > 0 && <Heart className="h-3 w-3 text-red-500 -ml-1" />}
                    </div>
                    <span>{totalLikes} {totalLikes === 1 ? 'like' : 'likes'}</span>
                  </div>
                </Button>
              )}
              {commentCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-auto text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCommentModal(true)}
                >
                  {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
                </Button>
              )}
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between border-t pt-3 pb-2 px-2">
          <div className="flex gap-1">
            <ReactionButton 
              icon={<ThumbsUp className="h-4 w-4" />} 
              count={confession.reactions.like} 
              isActive={userReactions.includes('like')}
              onClick={() => handleReaction('like')}
            />
            <ReactionButton 
              icon={<Heart className="h-4 w-4" />} 
              count={confession.reactions.heart} 
              isActive={userReactions.includes('heart')}
              onClick={() => handleReaction('heart')}
            />
          </div>
          
          <div className="flex items-center gap-1">
            {isAuthenticated && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex items-center gap-1" 
                  onClick={handleSaveConfession}
                  disabled={isUpdating}
                >
                  {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleShareConfession}
                >
                  <Share className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={downloadConfession}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </>
            )}
            {!detailed ? (
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={() => setShowCommentModal(true)}
              >
                <MessageCircle className="h-4 w-4" />
                <span>{commentCount}</span>
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={() => setShowCommentModal(true)}
              >
                <MessageCircle className="h-4 w-4" />
                <span>Comment</span>
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Modals */}
      <ImprovedCommentModal
        isOpen={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        confessionId={confession.id}
        confessionContent={confession.content}
        confessionAuthor="Anonymous"
        onCommentCountChange={setCommentCount}
      />

      <LikesList
        confessionId={confession.id}
        totalLikes={totalLikes}
        isOpen={showLikesList}
        onClose={() => setShowLikesList(false)}
      />
    </>
  );
}
