
import { useState } from 'react';
import { Room } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { addConfession, rooms } from '@/services/dataService';
import { useAuth } from '@/context/AuthContext';

interface ConfessionFormProps {
  onSuccess?: () => void;
  initialRoom?: Room;
}

export function ConfessionForm({ onSuccess, initialRoom }: ConfessionFormProps) {
  const [content, setContent] = useState('');
  const [room, setRoom] = useState<Room>(initialRoom || 'random');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You need to log in to post a confession.",
        variant: "destructive"
      });
      return;
    }
    
    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Confession content cannot be empty.",
        variant: "destructive"
      });
      return;
    }
    
    if (content.length > 300) {
      toast({
        title: "Error",
        description: "Confession must be 300 characters or less.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      addConfession(content.trim(), room, user.id);
      
      setContent('');
      toast({
        title: "Success",
        description: "Your confession has been posted!",
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error posting confession:', error);
      toast({
        title: "Error",
        description: "Failed to post confession. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="content">Your Confession</Label>
        <Textarea
          id="content"
          placeholder="Share your secret... (300 characters max)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[100px]"
          maxLength={300}
          required
        />
        <div className="text-xs text-right text-muted-foreground">
          {content.length}/300 characters
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="room">Select Room</Label>
        <Select value={room} onValueChange={(value) => setRoom(value as Room)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a room" />
          </SelectTrigger>
          <SelectContent>
            {rooms.map((roomOption) => (
              <SelectItem key={roomOption.id} value={roomOption.id}>
                {roomOption.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <Button type="submit" disabled={isSubmitting || !content.trim() || content.length > 300}>
        {isSubmitting ? "Posting..." : "Post Confession"}
      </Button>
    </form>
  );
}
