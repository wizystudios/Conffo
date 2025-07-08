
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { addConfession, getRooms } from '@/services/supabaseDataService';
import { Room } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { MultimediaPostCreator } from '@/components/MultimediaPostCreator';
import { MessageSquare, Camera } from 'lucide-react';

interface ConfessionFormProps {
  onSuccess?: () => void;
  initialRoom?: Room;
}

export function ConfessionForm({ onSuccess, initialRoom }: ConfessionFormProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [room, setRoom] = useState<Room>(initialRoom || 'random');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: getRooms,
  });
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!user || content.trim() === '' || isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await addConfession(content, room, user.id);
      setContent('');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error submitting confession:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Tabs defaultValue="text" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="text" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Text Post
        </TabsTrigger>
        <TabsTrigger value="media" className="flex items-center gap-2">
          <Camera className="h-4 w-4" />
          Media Post
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="text" className="mt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="Share your confession anonymously..."
            className="min-h-[100px]"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Select value={room} onValueChange={(value) => setRoom(value as Room)} disabled={!!initialRoom}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select room" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              type="submit" 
              disabled={content.trim() === '' || isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? 'Posting...' : 'Post Confession'}
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            By posting, you agree to our community guidelines. Your identity is not publicly visible.
          </p>
        </form>
      </TabsContent>
      
      <TabsContent value="media" className="mt-4">
        <MultimediaPostCreator onSuccess={onSuccess} />
      </TabsContent>
    </Tabs>
  );
}
