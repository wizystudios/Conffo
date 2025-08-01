import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
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
  Phone,
  Video
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
import { CallInterface } from '@/components/CallInterface';
import { EnhancedCommentModal } from '@/components/EnhancedCommentModal';

interface InstagramConfessionCardProps {
  confession: Confession;
  onUpdate?: () => void;
}

export function InstagramConfessionCard({ confession, onUpdate }: InstagramConfessionCardProps) {
  const { user, isAuthenticated } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [lastComment, setLastComment] = useState<any>(null);
  const [showFullContent, setShowFullContent] = useState(false);
  const [showCallInterface, setShowCallInterface] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [confessionAuthor, setConfessionAuthor] = useState<any>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [currentCommentCount, setCurrentCommentCount] = useState(confession.commentCount || 0);
  const videoRef = useRef<HTMLVideoElement>(null);
  
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
        // Get confession author info
        const { data: authorData } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', confession.userId)
          .maybeSingle();
        
        if (authorData) {
          setConfessionAuthor(authorData);
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
    
    fetchUserData();
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
  
  const handleReaction = async (reaction: Reaction) => {
    if (!isAuthenticated || !user || isUpdating) {
      return;
    }
    
    setIsUpdating(true);
    
    try {
      await toggleReaction(confession.id, user.id, reaction);
      
      // Trigger success animation for likes
      const event = new CustomEvent('conffo-success', {
        detail: { message: 'Liked! 🐟' }
      });
      window.dispatchEvent(event);
      
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error toggling reaction:', error);
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
    
    try {
      const result = await saveConfession(confession.id, user.id);
      if (result) {
        setIsSaved(!isSaved);
        
        // Trigger success animation for saves
        const event = new CustomEvent('conffo-success', {
          detail: { message: 'Saved! 🐟' }
        });
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.error('Error saving confession:', error);
    }
  };
  
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'ConfessZone Post',
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

  const handleCall = (type: 'audio' | 'video') => {
    setCallType(type);
    setShowCallInterface(true);
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
    // Trigger success animation when comment is posted
    const event = new CustomEvent('conffo-success', {
      detail: { message: 'Comment posted! 🐟' }
    });
    window.dispatchEvent(event);
  };
  
  const userReactions = confession.userReactions || [];
  const isLiked = userReactions.includes('heart');
  
  const shouldTruncate = confession.content.length > 150;
  const displayContent = shouldTruncate && !showFullContent 
    ? confession.content.substring(0, 150) + '...'
    : confession.content;
  
  return (
    <div className="w-full bg-background mb-0 border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
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
                className="h-auto p-0 text-blue-500 font-semibold text-sm hover:bg-transparent"
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
              <>
                <DropdownMenuItem onClick={() => handleCall('audio')}>
                  <Phone className="h-4 w-4 mr-2" />
                  Audio Call
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCall('video')}>
                  <Video className="h-4 w-4 mr-2" />
                  Video Call
                </DropdownMenuItem>
              </>
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
      
      <div className="px-4 pb-2">
        <span className="text-blue-500 font-semibold text-sm">#{confession.room}</span>
      </div>
      
      {confession.mediaUrl && (
        <div className="w-full bg-black">
          {confession.mediaType === 'image' ? (
            <img 
              src={confession.mediaUrl} 
              alt="Post media" 
              className="w-full max-h-[600px] object-cover"
              loading="lazy"
            />
          ) : confession.mediaType === 'video' ? (
            <div className="relative w-full">
              <video 
                ref={videoRef}
                src={confession.mediaUrl} 
                muted={isMuted}
                loop
                playsInline
                className="w-full max-h-[600px] object-cover"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleVolumeToggle}
                className="absolute top-4 right-4 h-8 w-8 p-0 bg-black/60 hover:bg-black/80 rounded-full"
              >
                {isMuted ? <VolumeX className="h-4 w-4 text-white" /> : <Volume2 className="h-4 w-4 text-white" />}
              </Button>
            </div>
          ) : null}
        </div>
      )}
      
      <div className="px-4 pt-3">
        <div className="mb-2 flex flex-wrap items-baseline">
          <UsernameDisplay 
            userId={confession.userId}
            showAvatar={false}
            size="sm"
            linkToProfile={true}
            showStoryIndicator={false}
          />
          <span className="text-sm leading-relaxed ml-2">{displayContent}</span>
          {shouldTruncate && !showFullContent && (
            <button 
              onClick={() => setShowFullContent(true)}
              className="text-muted-foreground text-sm ml-1 hover:text-foreground"
            >
              more
            </button>
          )}
        </div>
      </div>
      
      <div className="px-4 pt-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleReaction('heart')}
                className="h-6 w-6 p-0 hover:bg-transparent hover:scale-110 transition-all"
                disabled={isUpdating}
              >
                <Heart 
                  className={`h-6 w-6 ${isLiked ? 'fill-red-500 text-red-500' : 'text-foreground hover:text-muted-foreground'}`} 
                />
              </Button>
              {confession.reactions.heart > 0 && (
                <span className="text-sm font-medium">{confession.reactions.heart}</span>
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 hover:bg-transparent hover:scale-110 transition-all"
                onClick={handleCommentClick}
              >
                <MessageCircle className="h-6 w-6 text-foreground hover:text-muted-foreground" />
              </Button>
              {currentCommentCount > 0 && (
                <span className="text-sm font-medium">{currentCommentCount}</span>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="h-6 w-6 p-0 hover:bg-transparent hover:scale-110 transition-all"
            >
              <Share className="h-6 w-6 text-foreground hover:text-muted-foreground" />
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            className="h-6 w-6 p-0 hover:bg-transparent hover:scale-110 transition-all"
          >
            {isSaved ? (
              <BookmarkCheck className="h-6 w-6 text-green-500" />
            ) : (
              <Bookmark className="h-6 w-6 text-foreground hover:text-muted-foreground" />
            )}
          </Button>
        </div>
        
        <div className="pb-2">
          <span className="text-xs text-muted-foreground">
            {formatTimeShort(new Date(confession.timestamp))}
          </span>
        </div>
      </div>
      
      <EnhancedCommentModal
        isOpen={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        confessionId={confession.id}
        confessionContent={confession.content}
        confessionAuthor={confessionAuthor?.username || 'Anonymous User'}
        onCommentCountChange={setCurrentCommentCount}
        onCommentSuccess={handleCommentSuccess}
      />
      
      <CallInterface
        isOpen={showCallInterface}
        onClose={() => setShowCallInterface(false)}
        callType={callType}
        targetUserId={confession.userId}
        targetUsername={confessionAuthor?.username}
        targetAvatarUrl={confessionAuthor?.avatar_url}
      />
    </div>
  );
}
