import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface Reply {
  id: string;
  content: string;
  created_at: string;
  confession_id: string;
  confession_content: string;
  replier_id: string;
  replier_username: string;
  replier_avatar: string | null;
}

// My Replies page - shows replies to the user's confessions (NOT chat)
export default function RecentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [replies, setReplies] = useState<Reply[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReplies = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        // Get user's confessions
        const { data: userConfessions } = await supabase
          .from('confessions')
          .select('id, content')
          .eq('user_id', user.id);

        if (!userConfessions || userConfessions.length === 0) {
          setReplies([]);
          setIsLoading(false);
          return;
        }

        const confessionIds = userConfessions.map(c => c.id);
        const confessionMap = new Map(userConfessions.map(c => [c.id, c.content]));

        // Get comments on user's confessions (excluding user's own comments)
        const { data: comments } = await supabase
          .from('comments')
          .select('id, content, created_at, confession_id, user_id')
          .in('confession_id', confessionIds)
          .neq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!comments || comments.length === 0) {
          setReplies([]);
          setIsLoading(false);
          return;
        }

        // Get replier profiles
        const replierIds = [...new Set(comments.map(c => c.user_id).filter(Boolean))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', replierIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const formattedReplies: Reply[] = comments.map(comment => {
          const profile = profileMap.get(comment.user_id);
          return {
            id: comment.id,
            content: comment.content,
            created_at: comment.created_at,
            confession_id: comment.confession_id,
            confession_content: confessionMap.get(comment.confession_id) || '',
            replier_id: comment.user_id || '',
            replier_username: profile?.username || 'Anonymous',
            replier_avatar: profile?.avatar_url || null
          };
        });

        setReplies(formattedReplies);
      } catch (error) {
        console.error('Error fetching replies:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReplies();
  }, [user?.id]);

  return (
    <Layout>
      <div className="min-h-screen pb-24">
        {/* Header - Free design, no form container */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 -ml-2">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="font-bold text-lg">My Replies</h1>
        </div>

        {/* Content - Free from containers */}
        <div className="px-4">
          {isLoading ? (
            <div className="space-y-4 py-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="flex gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-24 bg-muted rounded" />
                      <div className="h-16 bg-muted rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : replies.length === 0 ? (
            <div className="py-16 text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h2 className="text-lg font-semibold mb-2">No Replies Yet</h2>
              <p className="text-muted-foreground text-sm">
                When someone replies to your confessions, you'll see them here.
              </p>
            </div>
          ) : (
            <div className="py-4 space-y-4">
              {replies.map(reply => (
                <button
                  key={reply.id}
                  onClick={() => navigate(`/confession/${reply.confession_id}`)}
                  className="w-full text-left"
                >
                  <div className="flex gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={reply.replier_avatar || undefined} />
                      <AvatarFallback className="text-sm bg-primary/10">
                        {reply.replier_username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{reply.replier_username}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      
                      {/* Original confession preview */}
                      <div className="text-xs text-muted-foreground mb-2 line-clamp-1">
                        On: "{reply.confession_content}"
                      </div>
                      
                      {/* Reply content - minimal styling */}
                      <div className="bg-muted/30 rounded-xl p-3">
                        <p className="text-sm">{reply.content}</p>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
