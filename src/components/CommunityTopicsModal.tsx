import { useState } from 'react';
import { X, Plus, Clock, Trash2, Loader2, MessageSquare, Heart, MessageCircle, ChevronRight, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface CommunityTopicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
  isAdmin?: boolean;
}

interface Topic {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  scheduled_start: string | null;
  scheduled_end: string | null;
  created_at: string;
}

interface TopicStats {
  messageCount: number;
  reactionCount: number;
}

export function CommunityTopicsModal({ isOpen, onClose, communityId, isAdmin = false }: CommunityTopicsModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { data: topics = [], isLoading } = useQuery({
    queryKey: ['community-topics', communityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_topics')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Topic[];
    },
    enabled: isOpen,
  });

  const { data: topicStats = {} } = useQuery({
    queryKey: ['community-topic-stats', communityId, topics.map(t => t.id).join(',')],
    queryFn: async () => {
      const stats: Record<string, TopicStats> = {};
      
      for (const topic of topics) {
        const start = topic.scheduled_start || topic.created_at;
        const end = topic.scheduled_end || new Date().toISOString();
        
        const [{ count: msgCount }] = await Promise.all([
          supabase
            .from('community_messages')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', communityId)
            .gte('created_at', start)
            .lte('created_at', end)
            .neq('message_type', 'system'),
        ]);
        
        stats[topic.id] = {
          messageCount: msgCount || 0,
          reactionCount: 0,
        };
      }
      
      return stats;
    },
    enabled: isOpen && topics.length > 0,
    staleTime: 30000,
  });

  const activeTopic = topics.find(t => t.is_active);

  const handleCreateTopic = async () => {
    if (!newTitle.trim() || !user) return;

    setIsCreating(true);
    try {
      if (activeTopic) {
        await supabase
          .from('community_topics')
          .update({ is_active: false })
          .eq('id', activeTopic.id);
      }

      const now = new Date();
      const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const { error } = await supabase
        .from('community_topics')
        .insert({
          community_id: communityId,
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          is_active: true,
          scheduled_start: now.toISOString(),
          scheduled_end: endTime.toISOString(),
          created_by: user.id,
        });

      if (error) throw error;

      await supabase
        .from('community_messages')
        .insert({
          community_id: communityId,
          sender_id: user.id,
          content: `📌 New topic: ${newTitle.trim()}`,
          message_type: 'system',
        });

      toast({ description: '✅ Topic created!' });
      setNewTitle('');
      setNewDescription('');
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['community-topics', communityId] });
    } catch (error) {
      console.error('Error creating topic:', error);
      toast({ variant: 'destructive', description: 'Failed to create topic' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    try {
      await supabase.from('community_topics').delete().eq('id', topicId);
      toast({ description: 'Topic deleted' });
      queryClient.invalidateQueries({ queryKey: ['community-topics', communityId] });
    } catch (error) {
      toast({ variant: 'destructive', description: 'Failed to delete topic' });
    }
  };

  const handleActivateTopic = async (topicId: string) => {
    try {
      await supabase
        .from('community_topics')
        .update({ is_active: false })
        .eq('community_id', communityId);

      const now = new Date();
      const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await supabase
        .from('community_topics')
        .update({ 
          is_active: true,
          scheduled_start: now.toISOString(),
          scheduled_end: endTime.toISOString(),
        })
        .eq('id', topicId);

      queryClient.invalidateQueries({ queryKey: ['community-topics', communityId] });
      toast({ description: 'Topic activated for 24 hours' });
    } catch (error) {
      toast({ variant: 'destructive', description: 'Failed to activate topic' });
    }
  };

  const handleContribute = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div 
        className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-background z-10 px-4 pt-4 pb-2">
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>

          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold">Discussion Topics</h2>
              <p className="text-xs text-muted-foreground">Contribute to the active topic or browse history</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="px-4 pb-6">
          {/* Create Topic - Admin only */}
          {isAdmin && (
            showCreate ? (
              <div className="mb-4 p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3">
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Topic title..."
                  className="rounded-xl"
                  maxLength={100}
                />
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional description..."
                  className="rounded-xl resize-none"
                  rows={2}
                  maxLength={200}
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTopic} disabled={!newTitle.trim() || isCreating} className="flex-1">
                    {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create & Activate'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">Topic will be active for 24 hours</p>
              </div>
            ) : (
              <Button onClick={() => setShowCreate(true)} variant="outline" className="w-full mb-4 h-11 rounded-xl border-dashed">
                <Plus className="h-4 w-4 mr-2" />
                Create New Topic
              </Button>
            )
          )}

          {/* Topics List - visible to ALL members */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : topics.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No topics yet</p>
              <p className="text-xs">The admin will create topics for discussion</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Active topic first */}
              {activeTopic && (
                <div className="border-2 border-primary rounded-xl overflow-hidden">
                  <div className="h-1 bg-primary" />
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-wider">
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        Live Now
                      </span>
                      {activeTopic.scheduled_end && (
                        <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(activeTopic.scheduled_end), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    
                    <h3 className="font-bold text-base text-primary cursor-pointer hover:underline" onClick={handleContribute}>
                      {activeTopic.title}
                    </h3>
                    {activeTopic.description && (
                      <p className="text-xs text-muted-foreground mt-1">{activeTopic.description}</p>
                    )}

                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span>{topicStats[activeTopic.id]?.messageCount || 0} replies</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5" />
                        <span>{topicStats[activeTopic.id]?.reactionCount || 0} reactions</span>
                      </div>
                    </div>

                    <button 
                      onClick={handleContribute}
                      className="w-full mt-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Start Contribute
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
              
              {/* Past topics */}
              {topics.filter(t => !t.is_active).length > 0 && (
                <>
                  <div className="flex items-center gap-2 pt-2">
                    <div className="h-px flex-1 bg-border/50" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1">
                      <History className="h-3 w-3" />
                      Past Topics
                    </span>
                    <div className="h-px flex-1 bg-border/50" />
                  </div>
                  {topics.filter(t => !t.is_active).map((topic) => (
                    <div key={topic.id} className="border border-border/50 rounded-xl p-4 opacity-70">
                      <h3 className="font-bold text-sm text-foreground">{topic.title}</h3>
                      {topic.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{topic.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          <span>{topicStats[topic.id]?.messageCount || 0} replies</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          <span>{topicStats[topic.id]?.reactionCount || 0} reactions</span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={handleContribute}
                          className="flex-1 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted/50 transition-colors flex items-center justify-center gap-1"
                        >
                          <History className="h-3.5 w-3.5" />
                          View Chat History
                        </button>
                        {isAdmin && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleActivateTopic(topic.id)}
                              className="py-2 px-3 rounded-lg border border-primary/30 text-primary text-xs font-medium hover:bg-primary/10 transition-colors"
                            >
                              Reactivate
                            </button>
                            <button
                              onClick={() => handleDeleteTopic(topic.id)}
                              className="py-2 px-2 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
