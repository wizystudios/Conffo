import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Message } from '@/services/chatService';
import { MessageContextMenu } from '@/components/MessageContextMenu';

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
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1 group`}>
      <MessageContextMenu message={message} isOwn={isOwn}>
        <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end gap-1 max-w-[70%] cursor-pointer`}>
        {showAvatar && !isOwn ? (
          <Avatar className="h-7 w-7 flex-shrink-0">
            <AvatarImage src={senderAvatar} />
            <AvatarFallback className="text-xs">
              {senderName?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        ) : (
          !isOwn && <div className="h-7 w-7 flex-shrink-0" />
        )}

        <div className="flex flex-col gap-0.5">
          {message.message_type === 'text' ? (
            <div
              className={`px-4 py-2.5 ${
                isOwn
                  ? 'bg-[#007AFF] text-white rounded-[20px] rounded-br-[4px]'
                  : 'bg-[#E5E5EA] text-gray-900 rounded-[20px] rounded-bl-[4px]'
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
              isOwn ? 'bg-[#007AFF]' : 'bg-[#E5E5EA]'
            }`}>
              <audio src={message.media_url} controls className="max-w-full" />
            </div>
          ) : null}
          
          <span className={`text-[10px] text-muted-foreground ${isOwn ? 'text-right pr-1' : 'text-left pl-1'}`}>
            {formatTime(message.created_at)}
          </span>
        </div>
        </div>
      </MessageContextMenu>
    </div>
  );
}
