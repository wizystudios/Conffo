import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Check, Users, User, Send } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { sendMessage } from '@/services/chatService';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ShareConfessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confessionId: string;
  confessionContent: string;
}

export function ShareConfessionModal({ open, onOpenChange, confessionId, confessionContent }: ShareConfessionModalProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  // Connections (people user follows or who follow user)
  const { data: connections = [] } = useQuery({
    queryKey: ['share-connections', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const [{ data: crew }, { data: fans }] = await Promise.all([
        supabase.from('user_follows').select('following_id').eq('follower_id', user.id),
        supabase.from('user_follows').select('follower_id').eq('following_id', user.id),
      ]);
      const ids = new Set<string>();
      crew?.forEach(c => ids.add(c.following_id));
      fans?.forEach(f => ids.add(f.follower_id));
      ids.delete(user.id);
      if (ids.size === 0) return [];
      const { data } = await supabase.from('profiles').select('id, username, avatar_url').in('id', Array.from(ids));
      return data || [];
    },
    enabled: open && !!user,
  });

  // Communities user is member of
  const { data: communities = [] } = useQuery({
    queryKey: ['share-communities', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: memberships } = await supabase.from('community_members').select('community_id').eq('user_id', user.id);
      if (!memberships || memberships.length === 0) return [];
      const communityIds = memberships.map(m => m.community_id);
      const { data } = await supabase.from('communities').select('id, name, image_url').in('id', communityIds);
      return data || [];
    },
    enabled: open && !!user,
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSend = async () => {
    if (!user || selectedIds.length === 0) return;
    setSending(true);
    const confessionLink = `${window.location.origin}/confession/${confessionId}`;
    const shareText = `Check out this confession:\n\n"${confessionContent.substring(0, 100)}${confessionContent.length > 100 ? '...' : ''}"\n\n${confessionLink}`;

    try {
      for (const id of selectedIds) {
        // Check if it's a community
        const isCommunity = communities.some(c => c.id === id);
        if (isCommunity) {
          await supabase.from('community_messages').insert({
            community_id: id,
            sender_id: user.id,
            content: shareText,
            message_type: 'text',
          });
        } else {
          await sendMessage(user.id, id, shareText);
        }
      }
      toast({ title: 'Shared!', description: `Sent to ${selectedIds.length} ${selectedIds.length === 1 ? 'recipient' : 'recipients'}` });
      onOpenChange(false);
      setSelectedIds([]);
    } catch (err) {
      toast({ title: 'Failed to share', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const filteredConnections = connections.filter((c: any) =>
    !searchQuery || c.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCommunities = communities.filter((c: any) =>
    !searchQuery || c.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-base">Share Confession</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-9 h-9 rounded-full bg-muted/50 border-0 text-sm"
            />
          </div>
        </div>

        <Tabs defaultValue="connections" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 grid grid-cols-2">
            <TabsTrigger value="connections" className="text-xs gap-1">
              <User className="h-3 w-3" /> Connections
            </TabsTrigger>
            <TabsTrigger value="communities" className="text-xs gap-1">
              <Users className="h-3 w-3" /> Communities
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="flex-1 overflow-y-auto px-4 mt-2">
            {filteredConnections.map((c: any) => (
              <button key={c.id} onClick={() => toggleSelect(c.id)} className="flex items-center gap-3 w-full py-2 px-2 rounded-lg hover:bg-muted/30">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={c.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${c.id}`} />
                  <AvatarFallback>{c.username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm font-medium text-left">{c.username || 'User'}</span>
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${selectedIds.includes(c.id) ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                  {selectedIds.includes(c.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
              </button>
            ))}
            {filteredConnections.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No connections found</p>
            )}
          </TabsContent>

          <TabsContent value="communities" className="flex-1 overflow-y-auto px-4 mt-2">
            {filteredCommunities.map((c: any) => (
              <button key={c.id} onClick={() => toggleSelect(c.id)} className="flex items-center gap-3 w-full py-2 px-2 rounded-lg hover:bg-muted/30">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={c.image_url} />
                  <AvatarFallback><Users className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm font-medium text-left">{c.name}</span>
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${selectedIds.includes(c.id) ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                  {selectedIds.includes(c.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
              </button>
            ))}
            {filteredCommunities.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No communities found</p>
            )}
          </TabsContent>
        </Tabs>

        {selectedIds.length > 0 && (
          <div className="p-4 border-t border-border/30">
            <Button onClick={handleSend} disabled={sending} className="w-full gap-2 rounded-full">
              <Send className="h-4 w-4" />
              {sending ? 'Sending...' : `Share to ${selectedIds.length}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
