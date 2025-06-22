
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
  Flag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
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
          .single();
        
        if (commentData) {
          setLastComment(commentData);
        }
      } catch (error) {
        console.error('Error checking relationships:', error);
      }
    };
    
    checkRelationships();
  }, [confession.id, confession.userId, user]);
  
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
    if (!user || confession.userId === user.id) return;
    
    try {
      if (isFollowing) {
        await supabase.rpc('unfollow_user', {
          follower_uuid: user.id,
          following_uuid: confession.userId
        });
        setIsFollowing(false);
      } else {
        await supabase.rpc('follow_user', {
          follower_uuid: user.id,
          following_uuid: confession.userId
        });
        setIsFollowing(true);
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
    if (!user) return;
    
    try {
      const result = await saveConfession(confession.id, user.id);
      if (result) {
        setIsSaved(!isSaved);
      }
    } catch (error) {
      console.error('Error saving confession:', error);
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
  
  const userReactions = confession.userReactions || [];
  const isLiked = userReactions.includes('heart');
  
  return (
    <div className="w-full bg-white mb-6">
      {/* Header with user info and follow button */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center space-x-3">
          <Link to={`/user/${confession.userId}`}>
            <Avatar className="h-8 w-8">
              <AvatarImage src={`https://api.dicebear.com/7.x/micah/svg?seed=${confession.userId}`} />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex items-center space-x-2">
            <Link to={`/user/${confession.userId}`} className="font-semibold text-sm">
              <UsernameDisplay userId={confession.userId} showAvatar={false} linkToProfile={false} />
            </Link>
            <span className="text-gray-500 text-sm">•</span>
            <span className="text-gray-500 text-sm">
              {formatDistanceToNow(confession.timestamp, { addSuffix: true })}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isAuthenticated && confession.userId !== user?.id && (
            <Button
              variant={isFollowing ? "secondary" : "default"}
              size="sm"
              onClick={handleFollow}
              className="h-8 px-3 text-xs font-semibold"
            >
              {isFollowing ? "Following" : (
                <>
                  <UserPlus className="h-3 w-3 mr-1" />
                  Follow
                </>
              )}
            </Button>
          )}
          
          <ContextMenu>
            <ContextMenuTrigger>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={handleSave}>
                <Bookmark className="h-4 w-4 mr-2" />
                {isSaved ? 'Unsave' : 'Save'}
              </ContextMenuItem>
              <ContextMenuItem onClick={() => toast({ description: "Remix feature coming soon!" })}>
                <Copy className="h-4 w-4 mr-2" />
                Remix
              </ContextMenuItem>
              <ContextMenuItem onClick={() => toast({ description: "QR code feature coming soon!" })}>
                <QrCode className="h-4 w-4 mr-2" />
                QR Code
              </ContextMenuItem>
              <ContextMenuItem onClick={() => toast({ description: "Marked as not interesting" })}>
                <EyeOff className="h-4 w-4 mr-2" />
                Not Interested
              </ContextMenuItem>
              <ContextMenuItem onClick={() => toast({ description: "Account info feature coming soon!" })}>
                <Info className="h-4 w-4 mr-2" />
                About This Account
              </ContextMenuItem>
              <ContextMenuItem onClick={() => toast({ description: "Report feature coming soon!" })}>
                <Flag className="h-4 w-4 mr-2" />
                Report Account
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>
      </div>
      
      {/* Media content - full width */}
      <div className="relative">
        {confession.mediaUrl && (
          <div className="w-full">
            {confession.mediaType === 'image' ? (
              <img 
                src={confession.mediaUrl} 
                alt="Confession media" 
                className="w-full h-auto object-cover"
                loading="lazy"
              />
            ) : confession.mediaType === 'video' ? (
              <div className="relative">
                <video 
                  ref={videoRef}
                  src={confession.mediaUrl} 
                  muted={isMuted}
                  loop
                  playsInline
                  className="w-full h-auto object-cover"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleVolumeToggle}
                  className="absolute top-4 right-4 h-8 w-8 p-0 bg-black/50 hover:bg-black/70"
                >
                  {isMuted ? <VolumeX className="h-4 w-4 text-white" /> : <Volume2 className="h-4 w-4 text-white" />}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-3 pt-2">
        {/* Action buttons */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReaction('heart')}
              className="h-8 w-8 p-0 hover:bg-transparent"
            >
              <Heart 
                className={`h-6 w-6 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-700'}`} 
              />
            </Button>
            <Link to={`/confession/${confession.id}`}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-transparent">
                <MessageCircle className="h-6 w-6 text-gray-700" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="h-8 w-8 p-0 hover:bg-transparent"
            >
              <Share className="h-6 w-6 text-gray-700" />
            </Button>
          </div>
        </div>
        
        {/* Likes count */}
        {confession.reactions.heart > 0 && (
          <div className="mb-2">
            <span className="font-semibold text-sm">
              {confession.reactions.heart} {confession.reactions.heart === 1 ? 'like' : 'likes'}
            </span>
          </div>
        )}
        
        {/* Caption */}
        <div className="mb-2">
          <span className="font-semibold text-sm mr-2">
            <UsernameDisplay userId={confession.userId} showAvatar={false} linkToProfile={false} />
          </span>
          <span className="text-sm">{confession.content}</span>
        </div>
        
        {/* Comments */}
        {confession.commentCount > 0 && (
          <div className="mb-2">
            <Link to={`/confession/${confession.id}`}>
              <span className="text-gray-500 text-sm">
                View all {confession.commentCount} comments
              </span>
            </Link>
          </div>
        )}
        
        {/* Last comment */}
        {lastComment && (
          <div className="mb-2">
            <span className="font-semibold text-sm mr-2">
              {lastComment.profiles?.username || 'Anonymous'}
            </span>
            <span className="text-sm">{lastComment.content}</span>
          </div>
        )}
      </div>
    </div>
  );
}
