import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Zap } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface QuickRepliesProps {
  onSelect: (reply: string) => void;
}

const DEFAULT_REPLIES = [
  "👋 Hi!",
  "Thanks!",
  "On my way!",
  "Be there soon",
  "😂",
  "❤️",
  "Got it!",
  "OK"
];

export function QuickReplies({ onSelect }: QuickRepliesProps) {
  const [replies, setReplies] = useState<string[]>([]);
  const [newReply, setNewReply] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isManaging, setIsManaging] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('quick_replies');
    if (saved) {
      setReplies(JSON.parse(saved));
    } else {
      setReplies(DEFAULT_REPLIES);
      localStorage.setItem('quick_replies', JSON.stringify(DEFAULT_REPLIES));
    }
  }, []);

  const saveReplies = (newReplies: string[]) => {
    setReplies(newReplies);
    localStorage.setItem('quick_replies', JSON.stringify(newReplies));
  };

  const addReply = () => {
    if (!newReply.trim() || replies.includes(newReply.trim())) return;
    const updated = [...replies, newReply.trim()];
    saveReplies(updated);
    setNewReply('');
  };

  const removeReply = (index: number) => {
    const updated = replies.filter((_, i) => i !== index);
    saveReplies(updated);
  };

  const handleSelect = (reply: string) => {
    onSelect(reply);
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
          <Zap className="h-4 w-4 text-muted-foreground" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            Quick Replies
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsManaging(!isManaging)}
            >
              {isManaging ? 'Done' : 'Edit'}
            </Button>
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-4 space-y-3">
          {/* Quick reply buttons */}
          <div className="flex flex-wrap gap-2">
            {replies.map((reply, index) => (
              <div key={index} className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => !isManaging && handleSelect(reply)}
                >
                  {reply}
                </Button>
                {isManaging && (
                  <button
                    onClick={() => removeReply(index)}
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          
          {/* Add new reply */}
          {isManaging && (
            <div className="flex gap-2">
              <Input
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                placeholder="Add quick reply..."
                className="flex-1 h-9 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && addReply()}
              />
              <Button size="sm" onClick={addReply} disabled={!newReply.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
