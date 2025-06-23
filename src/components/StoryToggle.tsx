
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function StoryToggle() {
  const [showStoryCreator, setShowStoryCreator] = useState(false);

  const handleCreateStory = () => {
    toast({
      description: "Story creation coming soon",
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCreateStory}
      className="h-8 w-8 p-0 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
    >
      <Plus className="h-4 w-4" />
    </Button>
  );
}
