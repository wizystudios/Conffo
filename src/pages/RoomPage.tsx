
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InstagramConfessionCard } from '@/components/InstagramConfessionCard';
import { ConfessionForm } from '@/components/ConfessionForm';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { getConfessions, getRooms } from '@/services/supabaseDataService';
import { Confession, Room, RoomInfo } from '@/types';
import { useQuery } from '@tanstack/react-query';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: getRooms,
  });
  
  const roomInfo = rooms.find(r => r.id === roomId);
  
  const { data: confessions = [], isLoading, refetch } = useQuery({
    queryKey: ['confessions', roomId, user?.id],
    queryFn: () => getConfessions(roomId as Room, user?.id),
    enabled: !!roomId,
  });
  
  const handleConfessionSuccess = () => {
    refetch();
  };
  
  if (!roomInfo) {
    return (
      <Layout>
        <div className="text-center py-10">
          <h1 className="text-2xl font-bold mb-4">Room Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The room you're looking for doesn't exist.
          </p>
          <Link to="/rooms">
            <Button>View All Rooms</Button>
          </Link>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        <div className="flex items-center p-4">
          <Link to="/rooms" className="mr-4">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{roomInfo.name}</h1>
            <p className="text-muted-foreground">{roomInfo.description}</p>
          </div>
        </div>
        
        
        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">Loading confessions...</p>
        ) : confessions.length > 0 ? (
          <div className="space-y-0">
            {confessions.map((confession) => (
              <InstagramConfessionCard 
                key={confession.id} 
                confession={confession}
                onUpdate={handleConfessionSuccess} 
              />
            ))}
          </div>
        ) : (
          <p className="text-center py-8 text-muted-foreground">
            No confessions in this room yet. Be the first!
          </p>
        )}
      </div>
    </Layout>
  );
}
