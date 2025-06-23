
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
  const [authorProfile, setAuthorProfile] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Fetch author profile and check relationships
  useEffect(() => {
    const fetchAuthorAndRelationships = async () => {
      try {
        // Get author profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', confession.userId)
          .single();
        
        if (profile) {
          setAuthorProfile(profile);
        } else {
          // Create a profile if it doesn't exist
          const emailUsername = confession.userId.split('@')[0] || 'user';
          await supabase
            .from('profiles')
            .upsert({
              id: confession.userId,
              username: emailUsername,
              updated_at: new Date().toISOString()
            });
          setAuthorProfile({ username: emailUsername, avatar_url: null });
        }

        if (!user) return;
        
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
        console.error('Error fetching author and relationships:', error);
      }
    };
    
    fetchAuthorAndRelationships();
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
        description: "Please sign in to react",
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
        description: "Failed to record reaction",
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
          description: "Unfollowed",
        });
      } else {
        await supabase.rpc('follow_user', {
          follower_uuid: user.id,
          following_uuid: confession.userId
        });
        setIsFollowing(true);
        toast({
          description: "Following",
        });
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
      toast({
        variant: "destructive",
        description: "Action failed",
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
        description: "Please sign in to save posts",
      });
      return;
    }
    
    try {
      const result = await saveConfession(confession.id, user.id);
      if (result) {
        setIsSaved(!isSaved);
        toast({
          description: isSaved ? "Removed from saved" : "Saved",
        });
      }
    } catch (error) {
      console.error('Error saving confession:', error);
      toast({
        variant: "destructive",
        description: "Save failed",
      });
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
        toast({
          description: "Link copied",
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCommentClick = () => {
    if (!isAuthenticated) {
      toast({
        variant: "destructive",
        description: "Please sign in to comment",
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

  const displayUsername = authorProfile?.username || user?.email?.split('@')[0] || 'User';
  
  return (
    <div className="w-full bg-background mb-6">
      {/* Header with user info and follow button */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <Link to={`/user/${confession.userId}`}>
            <Avatar className="h-8 w-8">
              <AvatarImage src={authorProfile?.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${confession.userId}`} />
              <AvatarFallback>{displayUsername.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex items-center space-x-2">
            <Link to={`/user/${confession.userId}`} className="font-semibold text-sm hover:opacity-80">
              {displayUsername}
            </Link>
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
            <span className="text-muted-foreground text-xs">
              {formatDistanceToNow(confession.timestamp, { addSuffix: true })}
            </span>
          </div>
        </div>
        
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
            <DropdownMenuItem onClick={() => toast({ description: "Feature coming soon" })}>
              <Copy className="h-4 w-4 mr-2" />
              Remix
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast({ description: "Feature coming soon" })}>
              <Flag className="h-4 w-4 mr-2" />
              Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Media content */}
      {confession.mediaUrl && (
        <div className="w-full">
          {confession.mediaType === 'image' ? (
            <img 
              src={confession.mediaUrl} 
              alt="Post media" 
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
      
      {/* Action buttons */}
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
          <span className="font-semibold text-sm mr-2">{displayUsername}</span>
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
              {lastComment.profiles?.username || 'User'}
            </span>
            <span className="text-sm text-muted-foreground">{lastComment.content}</span>
          </div>
        )}
      </div>
    </div>
  );
}
