import { X, Image, Video, Mic, FileText } from 'lucide-react';
import { Message } from '@/services/chatService';

interface ReplyPreviewProps {
  message: Message;
  onCancel: () => void;
  senderName?: string;
  isOwn?: boolean;
}

export function ReplyPreview({ message, onCancel, senderName, isOwn }: ReplyPreviewProps) {
  const getPreviewContent = () => {
    switch (message.message_type) {
      case 'image':
        return (
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            <span>Photo</span>
          </div>
        );
      case 'video':
        return (
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            <span>Video</span>
          </div>
        );
      case 'audio':
        return (
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            <span>Voice message</span>
          </div>
        );
      case 'file':
        return (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>{message.content || 'File'}</span>
          </div>
        );
      default:
        return <span className="line-clamp-1">{message.content}</span>;
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-l-4 border-primary rounded-r-lg">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-primary">
          {isOwn ? 'You' : senderName || 'User'}
        </p>
        <div className="text-sm text-muted-foreground truncate">
          {getPreviewContent()}
        </div>
      </div>
      {message.message_type === 'image' && message.media_url && (
        <img
          src={message.media_url}
          alt="Reply preview"
          className="h-10 w-10 rounded object-cover flex-shrink-0"
        />
      )}
      <button
        onClick={onCancel}
        className="p-1 hover:bg-muted rounded-full transition-colors flex-shrink-0"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}

// Inline reply quote shown in message bubble
interface InlineReplyQuoteProps {
  replyMessage: Message;
  senderName?: string;
  isOwn?: boolean;
  onClick?: () => void;
}

export function InlineReplyQuote({ replyMessage, senderName, isOwn, onClick }: InlineReplyQuoteProps) {
  const getPreviewContent = () => {
    switch (replyMessage.message_type) {
      case 'image':
        return 'Photo';
      case 'video':
        return 'Video';
      case 'audio':
        return 'Voice message';
      case 'file':
        return replyMessage.content || 'File';
      default:
        return replyMessage.content;
    }
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 bg-black/10 dark:bg-white/10 rounded-lg mb-1 border-l-2 border-primary"
    >
      <p className="text-xs font-semibold opacity-80">
        {isOwn ? 'You' : senderName || 'User'}
      </p>
      <p className="text-xs opacity-70 line-clamp-1">
        {getPreviewContent()}
      </p>
    </button>
  );
}
