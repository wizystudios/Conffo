import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MessageCircle, Phone, Video } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { getConversations } from '@/services/chatService';

export default function ChatListPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Real-time chat data
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const filteredChats = conversations.filter(conversation =>
    conversation.other_participant?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6" />
            Messages
          </h1>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 bg-muted rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredChats.length > 0 ? (
            filteredChats.map((conversation) => {
              const otherParticipant = conversation.other_participant;
              const lastMessage = conversation.last_message;
              const timestamp = lastMessage ? new Date(lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
              
              return (
                <Link key={conversation.id} to={`/chat/${otherParticipant?.id}`}>
                  <Card className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={otherParticipant?.avatar_url || ""} />
                          <AvatarFallback>
                            {otherParticipant?.username?.charAt(0)?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-background"></div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold truncate">{otherParticipant?.username || 'Unknown User'}</h3>
                          <span className="text-xs text-muted-foreground">{timestamp}</span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {lastMessage?.content || 'No messages yet'}
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Video className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })
          ) : (
            <Card className="p-8">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No conversations yet</p>
                <p className="text-sm mt-1">Start a conversation by visiting someone's profile</p>
                <Link to="/browse" className="text-primary text-sm hover:underline mt-2 block">
                  Browse confessions to find people to chat with
                </Link>
              </div>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}