import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Search, X, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface ConnectionsPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Connection {
  id: string;
  username: string;
  avatar_url: string | null;
}

export function ConnectionsPickerModal({ isOpen, onClose }: ConnectionsPickerModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      fetchConnections();
    }
  }, [isOpen, user]);

  const fetchConnections = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Get users the current user follows
      const { data: followingData } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);
      
      if (!followingData || followingData.length === 0) {
        setConnections([]);
        setIsLoading(false);
        return;
      }

      const followingIds = followingData.map(f => f.following_id);

      // Get profiles of followed users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', followingIds);

      setConnections(profiles || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectUser = (userId: string) => {
    onClose();
    navigate(`/chat/${userId}`);
  };

  const filteredConnections = connections.filter(c =>
    c.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div 
        className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl flex flex-col max-h-[80vh] animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="py-3 flex justify-center">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
          <h2 className="text-lg font-semibold">New Message</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search connections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-0 rounded-xl h-10"
            />
          </div>
        </div>

        {/* Connections List */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredConnections.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {searchQuery ? 'No connections found' : 'Follow people to start chatting'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConnections.map((connection) => (
                <button
                  key={connection.id}
                  onClick={() => handleSelectUser(connection.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 rounded-xl transition-colors"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={connection.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {connection.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm">{connection.username || 'User'}</p>
                    <p className="text-xs text-muted-foreground">Tap to message</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}