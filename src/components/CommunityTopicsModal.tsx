import { useState } from 'react';
import { X, Plus, Clock, Trash2, Loader2, MessageSquare, Heart, MessageCircle, ChevronRight } from 'lucide-react';
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

function TopicCard({ 
  topic, 
  isActive, 
  stats,
  onActivate, 
  onDelete,
  onContribute 
}: { 
  topic: Topic; 
  isActive: boolean;
  stats?: TopicStats;
  onActivate: () => void; 
  onDelete: () => void;
  onContribute: () => void;
}) {
  return (
    <div 
      className={`relative overflow-hidden rounded-xl border transition-all ${
        isActive 
          ? 'border-primary bg-primary/5 shadow-[0_0_20px_hsl(var(--primary)/0.1)]' 
          : 'border-border/50 bg-card hover:border-border'
      }`}
    >
      {/* Active indicator bar */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary" />
      )}
      
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            {isActive && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Live Now
              </span>
            )}
            <h3 className="font-bold text-sm leading-tight">{topic.title}</h3>
            {topic.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{topic.description}</p>
            )}
          </div>
          
          {!isActive && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            <span>{stats?.messageCount || 0} replies</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" />
            <span>{stats?.reactionCount || 0} reactions</span>
          </div>
          {topic.scheduled_end && (
            <div className="flex items-center gap-1 ml-auto">
              <Clock className="h-3 w-3" />
              <span>{formatDistanceToNow(new Date(topic.scheduled_end), { addSuffix: true })}</span>
            </div>
          )}
        </div>

        {/* Action button */}
        <div className="mt-3">
          {isActive ? (
            <button 
              onClick={onContribute}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              Start Contribute
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={onActivate}
                className="flex-1 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted/50 transition-colors"
              >
                Activate Topic
              </button>
              <button
                onClick={onContribute}
                className="py-2 px-3 rounded-lg text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                View History
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CommunityTopicsModal({ isOpen, onClose, communityId }: CommunityTopicsModalProps) {
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

  // Fetch stats for each topic (message count per topic period)
  const { data: topicStats = {} } = useQuery({
    queryKey: ['community-topic-stats', communityId, topics.map(t => t.id).join(',')],
    queryFn: async () => {
      const stats: Record<string, TopicStats> = {};
      
      for (const topic of topics) {
        const start = topic.scheduled_start || topic.created_at;
        const end = topic.scheduled_end || new Date().toISOString();
        
        const [{ count: msgCount }, { count: reactCount }] = await Promise.all([
          supabase
            .from('community_messages')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', communityId)
            .gte('created_at', start)
            .lte('created_at', end)
            .neq('message_type', 'system'),
          supabase
            .from('community_messages')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', communityId)
            .gte('created_at', start)
            .lte('created_at', end)
            .eq('message_type', 'system'),
        ]);
        
        stats[topic.id] = {
          messageCount: msgCount || 0,
          reactionCount: reactCount || 0,
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
          {/* Create Topic Form */}
          {showCreate ? (
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
          )}

          {/* Topics List */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : topics.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No topics yet</p>
              <p className="text-xs">Create a topic to guide discussions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Active topic first */}
              {activeTopic && (
                <TopicCard
                  topic={activeTopic}
                  isActive={true}
                  stats={topicStats[activeTopic.id]}
                  onActivate={() => {}}
                  onDelete={() => {}}
                  onContribute={onClose}
                />
              )}
              
              {/* Past topics */}
              {topics.filter(t => !t.is_active).length > 0 && (
                <>
                  <div className="flex items-center gap-2 pt-2">
                    <div className="h-px flex-1 bg-border/50" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Past Topics</span>
                    <div className="h-px flex-1 bg-border/50" />
                  </div>
                  {topics.filter(t => !t.is_active).map((topic) => (
                    <TopicCard
                      key={topic.id}
                      topic={topic}
                      isActive={false}
                      stats={topicStats[topic.id]}
                      onActivate={() => handleActivateTopic(topic.id)}
                      onDelete={() => handleDeleteTopic(topic.id)}
                      onContribute={onClose}
                    />
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
