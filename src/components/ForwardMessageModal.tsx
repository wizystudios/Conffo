import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { sendMessage } from '@/services/chatService';
import { toast } from '@/hooks/use-toast';

interface ForwardMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageContent: string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'file';
  mediaUrl?: string;
}

export function ForwardMessageModal({ 
  open, 
  onOpenChange, 
  messageContent,
  messageType,
  mediaUrl
}: ForwardMessageModalProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isForwarding, setIsForwarding] = useState(false);

  const { data: followedUsers = [] } = useQuery({
    queryKey: ['followed-users', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: follows } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (!follows || follows.length === 0) return [];
      
      const followingIds = follows.map(f => f.following_id);
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', followingIds);

      return profiles || [];
    },
    enabled: !!user && open,
  });

  const filteredUsers = followedUsers.filter(u =>
    u?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleForward = async () => {
    if (selectedUsers.length === 0) return;
    
    setIsForwarding(true);
    try {
      await Promise.all(
        selectedUsers.map(userId => 
          sendMessage(userId, messageContent, messageType, mediaUrl)
        )
      );
      
      toast({
        title: "Message forwarded",
        description: `Sent to ${selectedUsers.length} ${selectedUsers.length === 1 ? 'person' : 'people'}`
      });
      
      setSelectedUsers([]);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Failed to forward",
        variant: "destructive"
      });
    } finally {
      setIsForwarding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Forward message</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-10"
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => toggleUser(user.id)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${user.id}`} />
                  <AvatarFallback>{user.username?.charAt(0)?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="flex-1 font-medium">{user.username}</span>
                {selectedUsers.includes(user.id) && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleForward}
              disabled={selectedUsers.length === 0 || isForwarding}
              className="flex-1"
            >
              {isForwarding ? 'Forwarding...' : `Forward${selectedUsers.length > 0 ? ` (${selectedUsers.length})` : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
