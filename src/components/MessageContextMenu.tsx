import { 
  Copy, 
  Trash2, 
  Edit, 
  Forward, 
  Eye, 
  Flag 
} from 'lucide-react';
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
}

export function MessageContextMenu({
  message,
  isOwn,
  children,
  onDelete,
  onEdit
}: MessageContextMenuProps) {
  const handleCopy = () => {
    if (message.message_type === 'text') {
      navigator.clipboard.writeText(message.content);
      toast({ title: "Copied", description: "Message copied to clipboard" });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this message?')) return;
    // TODO: Implement actual delete from database
    onDelete?.();
    toast({ title: "Message deleted" });
  };

  const handleEdit = () => {
    if (message.message_type === 'text') {
      onEdit?.();
    }
  };

  const handleForward = () => {
    // TODO: Implement forward functionality
    toast({ title: "Forward", description: "Select a chat to forward to" });
  };

  const handleReport = () => {
    // TODO: Implement report functionality
    toast({ title: "Report submitted", description: "Thank you for helping keep our community safe" });
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
          <DropdownMenuItem onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem onClick={handleForward}>
          <Forward className="h-4 w-4 mr-2" />
          Forward
        </DropdownMenuItem>
        
        {isOwn && (
          <DropdownMenuItem onClick={handleDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete for everyone
          </DropdownMenuItem>
        )}
        
        {!isOwn && (
          <DropdownMenuItem onClick={handleReport} className="text-destructive">
            <Flag className="h-4 w-4 mr-2" />
            Report
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
