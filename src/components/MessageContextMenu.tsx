import { Copy, Trash2, Edit, Forward, Flag } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Message } from '@/services/chatService';
import { toast } from '@/hooks/use-toast';

interface MessageContextMenuProps {
  message: Message;
  isOwn: boolean;
  children: React.ReactNode;
  onDelete?: () => void;
  onEdit?: () => void;
  onForward?: () => void;
  onReport?: () => void;
}

export function MessageContextMenu({
  message,
  isOwn,
  children,
  onDelete,
  onEdit,
  onForward,
  onReport
}: MessageContextMenuProps) {
  const handleCopy = () => {
    if (message.message_type === 'text') {
      navigator.clipboard.writeText(message.content);
      toast({ title: "Copied", description: "Message copied to clipboard" });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isOwn ? "end" : "start"}>
        {message.message_type === 'text' && (
          <DropdownMenuItem onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </DropdownMenuItem>
        )}
        
        {isOwn && message.message_type === 'text' && (
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem onClick={onForward}>
          <Forward className="h-4 w-4 mr-2" />
          Forward
        </DropdownMenuItem>
        
        {isOwn && (
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        )}
        
        {!isOwn && (
          <DropdownMenuItem onClick={onReport} className="text-destructive">
            <Flag className="h-4 w-4 mr-2" />
            Report
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
