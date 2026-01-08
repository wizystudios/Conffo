import { useState, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, User, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MentionPreviewProps {
  type: 'user' | 'community';
  id: string;
  name: string;
  onClose: () => void;
}

function MentionPreview({ type, id, name, onClose }: MentionPreviewProps) {
  const navigate = useNavigate();

  const { data: userData } = useQuery({
    queryKey: ['mention-preview-user', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, bio')
        .eq('id', id)
        .maybeSingle();
      return data;
    },
    enabled: !!id && type === 'user'
  });

  const { data: communityData } = useQuery({
    queryKey: ['mention-preview-community', id],
    queryFn: async () => {
      const { data: community } = await supabase
        .from('communities')
        .select('id, name, description, image_url')
        .eq('id', id)
        .maybeSingle();
      
      if (community) {
        const { count } = await supabase
          .from('community_members')
          .select('*', { count: 'exact', head: true })
          .eq('community_id', id);
        
        return { ...community, memberCount: count || 0 };
      }
      return null;
    },
    enabled: !!id && type === 'community'
  });

  const handleNavigate = () => {
    if (type === 'user') {
      navigate(`/profile/${id}`);
    } else {
      navigate('/chat');
    }
    onClose();
  };

  const avatarUrl = type === 'user' ? userData?.avatar_url : communityData?.image_url;
  const displayName = type === 'user' ? (userData?.username || name) : (communityData?.name || name);
  const description = type === 'user' ? (userData?.bio || 'No bio available') : (communityData?.description || 'No description');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-card rounded-t-2xl p-4 pb-8 animate-in slide-in-from-bottom duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>
        
        <div className="flex items-center gap-4 mb-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="text-xl">
              {type === 'community' ? (
                <Users className="h-8 w-8" />
              ) : (
                name.charAt(0).toUpperCase()
              )}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">@{displayName}</h3>
              <Badge variant="secondary" className="text-[10px]">
                {type === 'community' ? 'Community' : 'User'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
            {type === 'community' && communityData?.memberCount && (
              <p className="text-xs text-muted-foreground mt-1">
                {communityData.memberCount} members
              </p>
            )}
          </div>
        </div>
        
        <button
          onClick={handleNavigate}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm"
        >
          {type === 'user' ? 'View Profile' : 'Open Community'}
        </button>
      </div>
    </div>
  );
}

interface MentionTextProps {
  content: string;
  className?: string;
}

export function MentionText({ content, className = '' }: MentionTextProps) {
  const [previewMention, setPreviewMention] = useState<{
    type: 'user' | 'community';
    id: string;
    name: string;
  } | null>(null);

  const { data: mentionData } = useQuery({
    queryKey: ['mention-lookup', content],
    queryFn: async () => {
      // Find all @mentions in the content
      const mentionRegex = /@([\w\s]+?)(?=\s|$|@)/g;
      const matches = [...content.matchAll(mentionRegex)];
      
      if (matches.length === 0) return {};
      
      const lookups: Record<string, { type: 'user' | 'community'; id: string; name: string }> = {};
      
      for (const match of matches) {
        const name = match[1].trim();
        
        // Check if it's a user
        const { data: user } = await supabase
          .from('profiles')
          .select('id, username')
          .ilike('username', name)
          .maybeSingle();
        
        if (user) {
          lookups[name.toLowerCase()] = { type: 'user', id: user.id, name: user.username || name };
          continue;
        }
        
        // Check if it's a community
        const { data: community } = await supabase
          .from('communities')
          .select('id, name')
          .ilike('name', name)
          .maybeSingle();
        
        if (community) {
          lookups[name.toLowerCase()] = { type: 'community', id: community.id, name: community.name };
        }
      }
      
      return lookups;
    },
    staleTime: 60000
  });

  // Parse content and render mentions as tappable chips
  const renderContent = () => {
    if (!mentionData || Object.keys(mentionData).length === 0) {
      return <span>{content}</span>;
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const mentionRegex = /@([\w\s]+?)(?=\s|$|@)/g;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      const name = match[1].trim();
      const mentionInfo = mentionData[name.toLowerCase()];
      
      // Add text before the mention
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {content.slice(lastIndex, match.index)}
          </span>
        );
      }
      
      if (mentionInfo) {
        // Render as tappable chip
        parts.push(
          <button
            key={`mention-${match.index}`}
            onClick={() => setPreviewMention(mentionInfo)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
              mentionInfo.type === 'community'
                ? 'bg-primary/20 text-primary hover:bg-primary/30'
                : 'bg-blue-500/20 text-blue-500 hover:bg-blue-500/30'
            }`}
          >
            {mentionInfo.type === 'community' ? (
              <Users className="h-3 w-3" />
            ) : (
              <User className="h-3 w-3" />
            )}
            @{mentionInfo.name}
          </button>
        );
      } else {
        // Render as plain text if not found
        parts.push(
          <span key={`plain-${match.index}`}>@{name}</span>
        );
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-end`}>{content.slice(lastIndex)}</span>
      );
    }
    
    return <>{parts}</>;
  };

  return (
    <>
      <span className={className}>
        {renderContent()}
      </span>
      
      {previewMention && (
        <MentionPreview
          type={previewMention.type}
          id={previewMention.id}
          name={previewMention.name}
          onClose={() => setPreviewMention(null)}
        />
      )}
    </>
  );
}
