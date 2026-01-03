import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  Heart, 
  MessageCircle, 
  Share, 
  Volume2, 
  VolumeX, 
  MoreHorizontal,
  UserPlus,
  Bookmark,
  Copy,
  QrCode,
  EyeOff,
  Info,
  Flag,
  BookmarkCheck,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { toggleReaction, saveConfession } from '@/services/supabaseDataService';
import { Confession, Reaction } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { UsernameDisplay } from '@/components/UsernameDisplay';
import { UnifiedCommentModal } from '@/components/UnifiedCommentModal';
import { MediaCarouselDisplay } from '@/components/MediaCarouselDisplay';
import { LikesList } from '@/components/LikesList';

interface InstagramConfessionCardProps {
  confession: Confession;
  onUpdate?: () => void;
}

export function InstagramConfessionCard({ confession, onUpdate }: InstagramConfessionCardProps) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [lastComment, setLastComment] = useState<any>(null);
  const [showFullContent, setShowFullContent] = useState(false);
  const [confessionAuthor, setConfessionAuthor] = useState<any>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [currentCommentCount, setCurrentCommentCount] = useState(confession.commentCount || 0);
  const [showLikesList, setShowLikesList] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Prepare media array for carousel
  const mediaArray = confession.mediaUrls && confession.mediaUrls.length > 0
    ? confession.mediaUrls.map((url, index) => ({
        url,
        type: (confession.mediaTypes?.[index] || 'image') as 'image' | 'video' | 'audio'
      }))
    : confession.mediaUrl 
      ? [{ url: confession.mediaUrl, type: (confession.mediaType || 'image') as 'image' | 'video' | 'audio' }]
      : [];
  
  const formatTimeShort = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo`;
    return `${Math.floor(diffInSeconds / 31536000)}y`;
  };
  
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        const { data: authorData } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', confession.userId)
          .maybeSingle();
        
        if (authorData) {
          setConfessionAuthor(authorData);
        }
        
        const { count: commentCount } = await supabase
          .from('comments')
          .select('id', { count: 'exact', head: true })
          .eq('confession_id', confession.id);
        
        if (commentCount !== null) {
          setCurrentCommentCount(commentCount);
        }
        
        const { data: savedData } = await supabase
          .from('saved_confessions')
          .select('id')
          .eq('confession_id', confession.id)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (savedData) {
          setIsSaved(true);
        }
        
        const { data: followData } = await supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', confession.userId)
          .maybeSingle();
        
        if (followData) {
          setIsFollowing(true);
        }
        
        const { data: commentData } = await supabase
          .from('comments')
          .select(`
            id,
            content,
            created_at,
            user_id
          `)
          .eq('confession_id', confession.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (commentData) {
          const { data: commenterProfile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', commentData.user_id)
            .maybeSingle();
          
          setLastComment({
            ...commentData,
            username: commenterProfile?.username || 'User'
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    const fetchPublicData = async () => {
      try {
        const { data: authorData } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', confession.userId)
          .maybeSingle();
        
        if (authorData) {
          setConfessionAuthor(authorData);
        }

        const { count: commentCount } = await supabase
          .from('comments')
          .select('id', { count: 'exact', head: true })
          .eq('confession_id', confession.id);
        
        if (commentCount !== null) {
          setCurrentCommentCount(commentCount);
        }
      } catch (error) {
        console.error('Error fetching public data:', error);
      }
    };
    
    if (user) {
      fetchUserData();
    } else {
      fetchPublicData();
    }
  }, [confession.id, confession.userId, user]);

  useEffect(() => {
    if (videoRef.current && confession.mediaType === 'video') {
      const video = videoRef.current;
      
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              video.play().catch(console.error);
            } else {
              video.pause();
            }
          });
        },
        { threshold: 0.5 }
      );
      
      observer.observe(video);
      
      return () => observer.disconnect();
    }
  }, [confession.mediaType]);
  
  // Local optimistic state for reactions
  const [localReactions, setLocalReactions] = useState(confession.reactions);
  const [localUserReactions, setLocalUserReactions] = useState(confession.userReactions || []);

  // Sync with props when confession changes
  useEffect(() => {
    setLocalReactions(confession.reactions);
    setLocalUserReactions(confession.userReactions || []);
  }, [confession.reactions, confession.userReactions]);

  const handleReaction = async (reaction: Reaction) => {
    if (!isAuthenticated || !user || isUpdating) {
      return;
    }
    
    // Optimistic update - immediately update UI
    const wasActive = localUserReactions.includes(reaction);
    const newUserReactions = wasActive 
      ? localUserReactions.filter(r => r !== reaction)
      : [...localUserReactions, reaction];
    const reactionDelta = wasActive ? -1 : 1;
    
    setLocalUserReactions(newUserReactions);
    setLocalReactions(prev => ({
      ...prev,
      [reaction]: Math.max(0, prev[reaction] + reactionDelta)
    }));
    
    setIsUpdating(true);
    
    try {
      await toggleReaction(confession.id, user.id, reaction);
      // Silently succeed - no toast needed
    } catch (error) {
      console.error('Error toggling reaction:', error);
      // Revert optimistic update on error
      setLocalUserReactions(confession.userReactions || []);
      setLocalReactions(confession.reactions);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleFollow = async () => {
    if (!isAuthenticated || !user || confession.userId === user.id) {
      return;
    }
    
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', confession.userId);
          
        if (!error) {
          setIsFollowing(false);
        }
      } else {
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: confession.userId
          });
          
        if (!error) {
          setIsFollowing(true);
        }
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    }
  };
  
  const handleVolumeToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };
  
  const handleSave = async () => {
    if (!isAuthenticated || !user) {
      return;
    }
    
    // Optimistic update
    setIsSaved(!isSaved);
    
    try {
      const result = await saveConfession(confession.id, user.id);
      if (!result) {
        // Revert on failure
        setIsSaved(isSaved);
      }
    } catch (error) {
      console.error('Error saving confession:', error);
      setIsSaved(isSaved); // Revert
    }
  };
  
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Conffo Post',
          text: `${confession.content.substring(0, 50)}...`,
          url: `${window.location.origin}/confession/${confession.id}`
        });
      } else {
        navigator.clipboard.writeText(`${window.location.origin}/confession/${confession.id}`);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleChat = () => {
    navigate(`/chat/${confession.userId}`);
  };

  const handleDelete = async () => {
    if (!user || confession.userId !== user.id) return;
    
    try {
      const { error } = await supabase
        .from('confessions')
        .delete()
        .eq('id', confession.id)
        .eq('user_id', user.id);
        
      if (!error && onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error deleting confession:', error);
    }
  };

  const handleCommentClick = () => {
    if (!isAuthenticated) {
      return;
    }
    setShowCommentModal(true);
  };

  const handleCommentSuccess = () => {
    // Optimistic update - increment comment count immediately
    setCurrentCommentCount(prev => prev + 1);
  };
  
  const isLiked = localUserReactions.includes('heart');
  
  const shouldTruncate = confession.content.length > 150;
  const displayContent = shouldTruncate && !showFullContent 
    ? confession.content.substring(0, 150) + '...'
    : confession.content;
  
  return (
    <div className="w-full bg-background mb-0 border-b border-border">
      {/* Header - no rounded corners */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <div className="bg-primary/10 text-primary px-2 py-1 text-xs font-medium">
            #{confession.room}
          </div>
          <UsernameDisplay 
            userId={confession.userId}
            showAvatar={true}
            size="md"
            linkToProfile={true}
            showStoryIndicator={true}
          />
          {isAuthenticated && confession.userId !== user?.id && !isFollowing && (
            <>
              <span className="text-muted-foreground">•</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFollow}
                className="h-auto p-0 text-primary font-semibold text-sm hover:bg-transparent"
              >
                Follow
              </Button>
            </>
          )}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-muted/50">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {isAuthenticated && confession.userId !== user?.id && (
              <DropdownMenuItem onClick={handleChat}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Message
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleSave}>
              {isSaved ? <BookmarkCheck className="h-4 w-4 mr-2" /> : <Bookmark className="h-4 w-4 mr-2" />}
              {isSaved ? 'Unsave' : 'Save'}
            </DropdownMenuItem>
            {user?.id === confession.userId && (
              <DropdownMenuItem onClick={handleDelete} className="text-red-500">
                <Flag className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Media Carousel - no rounded corners */}
      {mediaArray.length > 0 && (
        <MediaCarouselDisplay media={mediaArray} />
      )}
      
      {/* Content */}
      <div className="px-4 pt-3">
        <div className="mb-3">
          <div className="flex items-start gap-2">
            <span className="font-semibold text-sm flex-shrink-0">
              <UsernameDisplay 
                userId={confession.userId}
                showAvatar={false}
                size="sm"
                linkToProfile={true}
                showStoryIndicator={false}
              />
            </span>
            <p className="text-sm leading-relaxed flex-1 break-words whitespace-pre-wrap overflow-hidden">{displayContent}</p>
          </div>
          {shouldTruncate && !showFullContent && (
            <button 
              onClick={() => setShowFullContent(true)}
              className="text-muted-foreground text-sm mt-1 hover:text-foreground"
            >
              Show more
            </button>
          )}
        </div>
      </div>
      
      {/* Actions */}
      <div className="px-4 pt-1 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleReaction('heart')}
                className="h-8 w-8 p-0 hover:bg-transparent hover:scale-110 transition-all"
                disabled={isUpdating || !isAuthenticated}
              >
                <Heart 
                  className={`h-6 w-6 ${isLiked ? 'fill-red-500 text-red-500' : 'text-foreground hover:text-red-500'}`} 
                />
              </Button>
              {localReactions.heart > 0 && (
                <button 
                  onClick={() => setShowLikesList(true)}
                  className="text-sm font-medium hover:underline cursor-pointer"
                >
                  {localReactions.heart}
                </button>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 hover:bg-transparent hover:scale-110 transition-all"
                onClick={handleCommentClick}
                disabled={!isAuthenticated}
              >
                <MessageCircle className="h-6 w-6 text-foreground hover:text-primary" />
              </Button>
              {currentCommentCount > 0 && (
                <span className="text-sm font-medium">{currentCommentCount}</span>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="h-8 w-8 p-0 hover:bg-transparent hover:scale-110 transition-all"
            >
              <Share className="h-6 w-6 text-foreground hover:text-primary" />
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            className="h-8 w-8 p-0 hover:bg-transparent hover:scale-110 transition-all"
          >
            <Bookmark className={`h-6 w-6 ${isSaved ? 'fill-foreground' : ''}`} />
          </Button>
        </div>
        
        {lastComment && (
          <div className="text-sm">
            <span className="font-semibold">{lastComment.username}</span>
            <span className="ml-2 text-muted-foreground">{lastComment.content}</span>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground mt-1">
          {formatTimeShort(new Date(confession.timestamp))}
        </div>
      </div>
      
      <UnifiedCommentModal
        confessionId={confession.id}
        confessionContent={confession.content}
        confessionAuthor={confessionAuthor?.username || 'Anonymous'}
        confessionAuthorId={confession.userId}
        isOpen={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        onCommentSuccess={handleCommentSuccess}
        confessionMediaUrls={confession.mediaUrls}
        confessionMediaTypes={confession.mediaTypes}
      />
      
      <LikesList
        confessionId={confession.id}
        totalLikes={localReactions.heart + localReactions.like + localReactions.laugh + localReactions.shock}
        isOpen={showLikesList}
        onClose={() => setShowLikesList(false)}
      />
    </div>
  );
}
