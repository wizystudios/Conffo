import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Message } from '@/services/chatService';

interface ModernMessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  senderAvatar?: string;
  senderName?: string;
}

export function ModernMessageBubble({ 
  message, 
  isOwn, 
  showAvatar,
  senderAvatar,
  senderName 
}: ModernMessageBubbleProps) {
  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-[75%]`}>
        {showAvatar && !isOwn ? (
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={senderAvatar} />
            <AvatarFallback className="text-xs">
              {senderName?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        ) : (
          !isOwn && <div className="h-8 w-8 flex-shrink-0" />
        )}

        <div className="flex flex-col">
          {message.message_type === 'text' ? (
            <div
              className={`px-4 py-2 rounded-2xl ${
                isOwn
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted text-foreground rounded-bl-sm'
              }`}
            >
              <p className="text-sm leading-relaxed break-words">{message.content}</p>
            </div>
          ) : message.message_type === 'image' ? (
            <div className="rounded-2xl overflow-hidden">
              <img
                src={message.media_url}
                alt="Shared"
                className="max-w-full h-auto max-h-80 object-cover"
              />
            </div>
          ) : message.message_type === 'video' ? (
            <div className="rounded-2xl overflow-hidden">
              <video
                src={message.media_url}
                controls
                playsInline
                className="max-w-full h-auto max-h-80"
              />
            </div>
          ) : message.message_type === 'audio' ? (
            <div className={`px-4 py-2 rounded-2xl ${
              isOwn ? 'bg-primary' : 'bg-muted'
            }`}>
              <audio src={message.media_url} controls className="max-w-full" />
            </div>
          ) : null}
          
          <span className={`text-[10px] text-muted-foreground mt-1 ${isOwn ? 'text-right' : 'text-left'} px-1`}>
            {formatTime(message.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
