import { useState } from 'react';
import { X, Plus, Clock, Trash2, Loader2, MessageSquare } from 'lucide-react';
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

  const activeTopic = topics.find(t => t.is_active);

  const handleCreateTopic = async () => {
    if (!newTitle.trim() || !user) return;

    setIsCreating(true);
    try {
      // Deactivate current active topic
      if (activeTopic) {
        await supabase
          .from('community_topics')
          .update({ is_active: false })
          .eq('id', activeTopic.id);
      }

      // Create new topic with 24-hour duration
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

      // Send system message
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
      // Deactivate all
      await supabase
        .from('community_topics')
        .update({ is_active: false })
        .eq('community_id', communityId);

      // Activate selected
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
        className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl p-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Discussion Topics</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Active Topic Banner */}
        {activeTopic && (
          <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/30">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary">ACTIVE TOPIC</span>
              {activeTopic.scheduled_end && (
                <span className="text-xs text-muted-foreground ml-auto">
                  <Clock className="h-3 w-3 inline mr-1" />
                  {formatDistanceToNow(new Date(activeTopic.scheduled_end), { addSuffix: true })}
                </span>
              )}
            </div>
            <p className="font-semibold">{activeTopic.title}</p>
            {activeTopic.description && (
              <p className="text-sm text-muted-foreground mt-1">{activeTopic.description}</p>
            )}
          </div>
        )}

        {/* Create Topic Form */}
        {showCreate ? (
          <div className="mb-4 p-4 rounded-xl bg-muted/50 space-y-3">
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
              <Button
                variant="outline"
                onClick={() => setShowCreate(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTopic}
                disabled={!newTitle.trim() || isCreating}
                className="flex-1"
              >
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create & Activate'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Topic will be active for 24 hours
            </p>
          </div>
        ) : (
          <Button
            onClick={() => setShowCreate(true)}
            variant="outline"
            className="w-full mb-4 h-12 rounded-xl"
          >
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
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No topics yet</p>
            <p className="text-xs">Create a topic to guide discussions</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topics.filter(t => !t.is_active).map((topic) => (
              <div 
                key={topic.id} 
                className="p-3 rounded-xl bg-card border border-border flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{topic.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Created {formatDistanceToNow(new Date(topic.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleActivateTopic(topic.id)}
                  className="text-xs"
                >
                  Activate
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteTopic(topic.id)}
                  className="h-8 w-8 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
