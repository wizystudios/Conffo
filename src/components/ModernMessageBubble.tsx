import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Message } from '@/services/chatService';
import { FileText, Copy, Forward, Trash2, Reply } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { haptic } from '@/utils/hapticFeedback';
import { MessageReadReceipt } from '@/components/MessageReadReceipt';
import { InlineReplyQuote } from '@/components/ReplyPreview';

interface ModernMessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  senderAvatar?: string;
  senderName?: string;
  onDelete?: () => void;
  onEdit?: () => void;
  onForward?: () => void;
  onReport?: () => void;
  onReply?: () => void;
  replyToMessage?: Message;
  replyToSenderName?: string;
}

export function ModernMessageBubble({ 
  message, 
  isOwn, 
  showAvatar,
  senderAvatar,
  senderName,
  onDelete,
  onEdit,
  onForward,
  onReport,
  onReply,
  replyToMessage,
  replyToSenderName
}: ModernMessageBubbleProps) {
  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const [touchStart, setTouchStart] = useState(0);
  const [showContext, setShowContext] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(Date.now());
  };

  const handleTouchEnd = () => {
    const touchDuration = Date.now() - touchStart;
    if (touchDuration > 500) {
      haptic.medium();
      setShowContext(true);
    }
    setTouchStart(0);
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 group`}>
      <div 
        className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-[75%]`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowContext(true);
        }}
      >
        {showAvatar && !isOwn ? (
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarImage src={senderAvatar} />
            <AvatarFallback className="text-sm">
              {senderName?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        ) : (
          !isOwn && <div className="h-9 w-9 flex-shrink-0" />
        )}

        <div className="flex flex-col gap-1">
          {/* Reply quote if replying to a message */}
          {replyToMessage && (
            <InlineReplyQuote
              replyMessage={replyToMessage}
              senderName={replyToSenderName}
              isOwn={replyToMessage.sender_id === message.sender_id}
            />
          )}
          
          {message.message_type === 'text' ? (
            <div
              className={`px-4 py-3 ${
                isOwn
                  ? 'bg-[#007AFF] text-white rounded-[20px] rounded-br-[4px]'
                  : 'bg-[#E5E5EA] text-gray-900 rounded-[20px] rounded-bl-[4px]'
              }`}
            >
              <p className="text-base leading-relaxed break-words">{message.content}</p>
            </div>
          ) : message.message_type === 'image' ? (
            <a 
              href={message.media_url} 
              target="_blank" 
              rel="noopener noreferrer"
              download
              className="rounded-2xl overflow-hidden aspect-square max-w-[280px] block"
            >
              <img
                src={message.media_url}
                alt="Shared"
                className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
              />
            </a>
          ) : message.message_type === 'video' ? (
            <div className="rounded-2xl overflow-hidden aspect-square max-w-[280px]">
              <video
                src={message.media_url}
                controls
                playsInline
                controlsList="download"
                className="w-full h-full object-contain"
              />
            </div>
          ) : message.message_type === 'audio' ? (
            <div className="rounded-2xl">
              <audio src={message.media_url} controls controlsList="download" className="max-w-full" />
            </div>
          ) : message.message_type === 'file' ? (
            <a 
              href={message.media_url} 
              target="_blank" 
              rel="noopener noreferrer"
              download
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl hover:opacity-90 transition-opacity ${
                isOwn ? 'bg-[#007AFF] text-white' : 'bg-[#E5E5EA] text-gray-900'
              }`}
            >
              <FileText className="h-5 w-5" />
              <span className="text-sm">{message.content || 'Download file'}</span>
            </a>
          ) : null}
          
          <div className={`flex items-center gap-1 text-xs text-muted-foreground ${isOwn ? 'justify-end pr-1' : 'justify-start pl-1'}`}>
            <span>{formatTime(message.created_at)}</span>
            {message.updated_at !== message.created_at && <span>(edited)</span>}
            {isOwn && (
              <MessageReadReceipt 
                isSent={true}
                isDelivered={true}
                isRead={message.is_read || !!message.read_at}
              />
            )}
          </div>
        </div>
      </div>

      {/* Long-press context menu */}
      <Sheet open={showContext} onOpenChange={setShowContext}>
        <SheetContent side="bottom" className="h-auto rounded-t-xl">
          <SheetHeader>
            <SheetTitle className="text-sm">Message Actions</SheetTitle>
          </SheetHeader>
          <div className="grid gap-2 py-3">
            {message.message_type === 'text' && (
              <Button
                variant="ghost"
                className="justify-start gap-2 h-11"
                onClick={() => {
                  haptic.light();
                  navigator.clipboard.writeText(message.content);
                  setShowContext(false);
                }}
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            )}
            <Button
              variant="ghost"
              className="justify-start gap-2 h-11"
              onClick={() => {
                haptic.light();
                onReply?.();
                setShowContext(false);
              }}
            >
              <Reply className="h-4 w-4" />
              Reply
            </Button>
            <Button
              variant="ghost"
              className="justify-start gap-2 h-11"
              onClick={() => {
                haptic.light();
                onForward?.();
                setShowContext(false);
              }}
            >
              <Forward className="h-4 w-4" />
              Forward
            </Button>
            <Button
              variant="ghost"
              className="justify-start gap-2 h-11 text-destructive"
              onClick={() => {
                haptic.heavy();
                onDelete?.();
                setShowContext(false);
              }}
            >
              <Trash2 className="h-4 w-4" />
              {isOwn ? 'Delete' : 'Hide for me'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
