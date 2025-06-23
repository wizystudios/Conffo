
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
  BookmarkCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UsernameDisplay } from './UsernameDisplay';
import { useAuth } from '@/context/AuthContext';
import { toggleReaction, saveConfession } from '@/services/supabaseDataService';
import { Confession, Reaction } from '@/types';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Check if this confession is saved and if user is following the author
  useEffect(() => {
    const checkRelationships = async () => {
      if (!user) return;
      
      try {
        // Check if saved
        const { data: savedData } = await supabase
          .from('saved_confessions')
          .select('id')
          .eq('confession_id', confession.id)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (savedData) {
          setIsSaved(true);
        }
        
        // Check if following
        const { data: followData } = await supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', confession.userId)
          .maybeSingle();
        
        if (followData) {
          setIsFollowing(true);
        }
        
        // Get last comment
        const { data: commentData } = await supabase
          .from('comments')
          .select(`
            id,
            content,
            created_at,
            user_id,
            profiles:user_id (username)
          `)
          .eq('confession_id', confession.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (commentData) {
          setLastComment(commentData);
        }
      } catch (error) {
        console.error('Error checking relationships:', error);
      }
    };
    
    checkRelationships();
  }, [confession.id, confession.userId, user]);

  // Auto-play video when it comes into view
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
      toast({
        variant: "destructive",
        description: "Please sign in to react to confessions",
      });
      return;
    }
    
    setIsUpdating(true);
    
    try {
      await toggleReaction(confession.id, user.id, reaction);
      if (onUpdate) onUpdate();
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
  
  const handleFollow = async () => {
    if (!isAuthenticated || !user || confession.userId === user.id) {
      if (!isAuthenticated) {
        toast({
          variant: "destructive",
          description: "Please sign in to follow users",
        });
      }
      return;
    }
    
    try {
      if (isFollowing) {
        await supabase.rpc('unfollow_user', {
          follower_uuid: user.id,
          following_uuid: confession.userId
        });
        setIsFollowing(false);
        toast({
          description: "Unfollowed user",
        });
      } else {
        await supabase.rpc('follow_user', {
          follower_uuid: user.id,
          following_uuid: confession.userId
        });
        setIsFollowing(true);
        toast({
          description: "Now following user",
        });
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
      toast({
        variant: "destructive",
        description: "Failed to update follow status",
      });
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
      toast({
        variant: "destructive",
        description: "Please sign in to save confessions",
      });
      return;
    }
    
    try {
      const result = await saveConfession(confession.id, user.id);
      if (result) {
        setIsSaved(!isSaved);
        toast({
          description: isSaved ? "Confession removed from saved" : "Confession saved",
        });
      }
    } catch (error) {
      console.error('Error saving confession:', error);
      toast({
        variant: "destructive",
        description: "Failed to save confession",
      });
    }
  };
  
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'ConfessZone Confession',
          text: `${confession.content.substring(0, 50)}...`,
          url: `${window.location.origin}/confession/${confession.id}`
        });
      } else {
        navigator.clipboard.writeText(`${window.location.origin}/confession/${confession.id}`);
        toast({
          description: "Link copied to clipboard",
        });
      }
    } catch (error) {
      console.error('Error sharing confession:', error);
    }
  };

  const handleCommentClick = () => {
    if (!isAuthenticated) {
      toast({
        variant: "destructive",
        description: "Please sign in to comment on confessions",
      });
      return;
    }
  };
  
  const userReactions = confession.userReactions || [];
  const isLiked = userReactions.includes('heart');
  
  // Truncate content if too long
  const shouldTruncate = confession.content.length > 150;
  const displayContent = shouldTruncate && !showFullContent 
    ? confession.content.substring(0, 150) + '...'
    : confession.content;
  
  return (
    <div className="w-full bg-background mb-6">
      {/* Header with user info and follow button */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <Link to={`/user/${confession.userId}`}>
            <Avatar className="h-8 w-8">
              <AvatarImage src={`https://api.dicebear.com/7.x/micah/svg?seed=${confession.userId}`} />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex items-center space-x-2">
            <Link to={`/user/${confession.userId}`} className="font-semibold text-sm hover:opacity-80">
              <UsernameDisplay userId={confession.userId} showAvatar={false} linkToProfile={false} />
            </Link>
            {/* Follow button right after username */}
            {isAuthenticated && confession.userId !== user?.id && !isFollowing && (
              <span className="text-muted-foreground">•</span>
            )}
            {isAuthenticated && confession.userId !== user?.id && !isFollowing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFollow}
                className="h-auto p-0 text-blue-500 font-semibold text-sm hover:bg-transparent"
              >
                Follow
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-muted/50">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleSave}>
                {isSaved ? <BookmarkCheck className="h-4 w-4 mr-2" /> : <Bookmark className="h-4 w-4 mr-2" />}
                {isSaved ? 'Unsave' : 'Save'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast({ description: "Remix feature coming soon!" })}>
                <Copy className="h-4 w-4 mr-2" />
                Remix
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast({ description: "QR code feature coming soon!" })}>
                <QrCode className="h-4 w-4 mr-2" />
                QR Code
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast({ description: "Marked as not interesting" })}>
                <EyeOff className="h-4 w-4 mr-2" />
                Not Interested
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast({ description: "Account info feature coming soon!" })}>
                <Info className="h-4 w-4 mr-2" />
                About This Account
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast({ description: "Report feature coming soon!" })}>
                <Flag className="h-4 w-4 mr-2" />
                Report Account
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Media content */}
      {confession.mediaUrl && (
        <div className="w-full">
          {confession.mediaType === 'image' ? (
            <img 
              src={confession.mediaUrl} 
              alt="Confession media" 
              className="w-full max-h-[500px] object-contain bg-black"
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
                className="w-full max-h-[500px] object-contain bg-black"
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
      
      {/* Action buttons - positioned right after media */}
      <div className="px-4 pt-3">
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
              {isAuthenticated ? (
                <Link to={`/confession/${confession.id}`}>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-transparent hover:scale-110 transition-all">
                    <MessageCircle className="h-6 w-6 text-foreground hover:text-muted-foreground" />
                  </Button>
                </Link>
              ) : (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 hover:bg-transparent hover:scale-110 transition-all"
                  onClick={handleCommentClick}
                >
                  <MessageCircle className="h-6 w-6 text-foreground hover:text-muted-foreground" />
                </Button>
              )}
              {confession.commentCount > 0 && (
                <span className="text-sm font-medium">{confession.commentCount}</span>
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
        
        {/* Caption */}
        <div className="mb-2">
          <span className="font-semibold text-sm mr-2">
            <UsernameDisplay userId={confession.userId} showAvatar={false} linkToProfile={false} />
          </span>
          <span className="text-sm leading-relaxed">{displayContent}</span>
          {shouldTruncate && !showFullContent && (
            <button 
              onClick={() => setShowFullContent(true)}
              className="text-muted-foreground text-sm ml-1 hover:text-foreground"
            >
              more
            </button>
          )}
        </div>
        
        {/* Comments */}
        {confession.commentCount > 0 && (
          <div className="mb-2">
            {isAuthenticated ? (
              <Link to={`/confession/${confession.id}`}>
                <span className="text-muted-foreground text-sm hover:text-foreground cursor-pointer">
                  View all {confession.commentCount} comments
                </span>
              </Link>
            ) : (
              <span 
                className="text-muted-foreground text-sm cursor-pointer hover:text-foreground"
                onClick={() => toast({
                  variant: "destructive",
                  description: "Please sign in to view comments",
                })}
              >
                View all {confession.commentCount} comments
              </span>
            )}
          </div>
        )}
        
        {/* Last comment */}
        {lastComment && (
          <div className="mb-1">
            <span className="font-semibold text-sm mr-2">
              {lastComment.profiles?.username || 'Anonymous'}
            </span>
            <span className="text-sm text-muted-foreground">{lastComment.content}</span>
          </div>
        )}
        
        {/* Time */}
        <div className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(confession.timestamp, { addSuffix: true })}
        </div>
      </div>
    </div>
  );
}
