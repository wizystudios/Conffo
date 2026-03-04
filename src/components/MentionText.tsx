import { useState, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, User, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MentionTextProps {
  content: string;
  className?: string;
}

export function MentionText({ content, className = '' }: MentionTextProps) {
  const navigate = useNavigate();

  const { data: mentionData } = useQuery({
    queryKey: ['mention-lookup', content],
    queryFn: async () => {
      const mentionRegex = /@([\w\s]+?)(?=\s|$|@)/g;
      const matches = [...content.matchAll(mentionRegex)];
      if (matches.length === 0) return {};
      
      const lookups: Record<string, { type: 'user' | 'community'; id: string; name: string }> = {};
      
      for (const match of matches) {
        const name = match[1].trim();
        const { data: user } = await supabase
          .from('profiles')
          .select('id, username')
          .ilike('username', name)
          .maybeSingle();
        
        if (user) {
          lookups[name.toLowerCase()] = { type: 'user', id: user.id, name: user.username || name };
          continue;
        }
        
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

  const handleMentionTap = (mentionInfo: { type: 'user' | 'community'; id: string; name: string }) => {
    if (mentionInfo.type === 'user') {
      navigate(`/user/${mentionInfo.id}`);
    } else {
      navigate(`/communities`);
    }
  };

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
      
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`}>{content.slice(lastIndex, match.index)}</span>);
      }
      
      if (mentionInfo) {
        parts.push(
          <button
            key={`mention-${match.index}`}
            onClick={(e) => { e.stopPropagation(); handleMentionTap(mentionInfo); }}
            className="inline-flex items-center gap-0.5 font-bold text-primary hover:underline"
          >
            @{mentionInfo.name}
          </button>
        );
      } else {
        parts.push(<span key={`plain-${match.index}`}>@{name}</span>);
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < content.length) {
      parts.push(<span key="text-end">{content.slice(lastIndex)}</span>);
    }
    
    return <>{parts}</>;
  };

  return <span className={className}>{renderContent()}</span>;
}
