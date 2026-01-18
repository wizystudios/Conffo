import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Message } from '@/services/chatService';
import { FileText, Copy, Forward, Trash2, Reply, SmilePlus } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { haptic } from '@/utils/hapticFeedback';
import { MessageReadReceipt } from '@/components/MessageReadReceipt';
import { InlineReplyQuote } from '@/components/ReplyPreview';
import { MessageReactionPicker, MessageReactionDisplay } from '@/components/MessageReactionPicker';

interface ModernMessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  senderAvatar?: string;
  senderName?: string;
  showSenderName?: boolean;
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
  showSenderName = false,
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
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactionRefreshKey, setReactionRefreshKey] = useState(0);
  
  // Swipe to reply state
  const [swipeX, setSwipeX] = useState(0);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isSwipingRef = useRef(false);
  const hasTriggeredReplyRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(Date.now());
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isSwipingRef.current = false;
    hasTriggeredReplyRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - startXRef.current;
    const deltaY = e.touches[0].clientY - startYRef.current;
    
    // Only allow swipe right, and only if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 10) {
      isSwipingRef.current = true;
      // Cap the swipe at 80px and only allow positive (right) swipe
      const cappedSwipe = Math.min(Math.max(0, deltaX), 80);
      setSwipeX(cappedSwipe);
      
      // Trigger reply at threshold
      if (cappedSwipe >= 60 && !hasTriggeredReplyRef.current) {
        hasTriggeredReplyRef.current = true;
        haptic.medium();
      }
    }
  };

  const handleTouchEnd = () => {
    const touchDuration = Date.now() - touchStart;
    
    // If swiped enough, trigger reply
    if (swipeX >= 60 && hasTriggeredReplyRef.current) {
      onReply?.();
    } else if (!isSwipingRef.current && touchDuration > 500) {
      // Long press for context menu (only if not swiping)
      haptic.medium();
      setShowContext(true);
    }
    
    // Reset swipe state with animation
    setSwipeX(0);
    setTouchStart(0);
    isSwipingRef.current = false;
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 group relative`}>
      {/* Reply indicator on swipe */}
      {swipeX > 0 && (
        <div 
          className={`absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center transition-opacity ${swipeX >= 60 ? 'opacity-100' : 'opacity-50'}`}
          style={{ width: `${swipeX}px` }}
        >
          <Reply className={`h-5 w-5 text-primary transition-transform ${swipeX >= 60 ? 'scale-125' : 'scale-100'}`} />
        </div>
      )}
      
      <div 
        className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-[75%] transition-transform duration-100`}
        style={{ transform: `translateX(${swipeX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
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

        <div className="flex flex-col gap-1 relative">
          {/* Sender name for community messages */}
          {showSenderName && senderName && (
            <p className="text-xs text-muted-foreground mb-0.5 ml-1">{senderName}</p>
          )}
          
          {/* Reaction picker */}
          <MessageReactionPicker
            messageId={message.id}
            isOpen={showReactionPicker}
            onClose={() => setShowReactionPicker(false)}
            onReactionChange={() => setReactionRefreshKey(k => k + 1)}
          />
          
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
              className={`px-3 py-2 ${
                isOwn
                  ? 'bg-[#007AFF] text-white rounded-[20px] rounded-br-[4px]'
                  : 'bg-[#E5E5EA] text-gray-900 rounded-[20px] rounded-bl-[4px]'
              }`}
            >
              <p className="text-xs leading-relaxed break-words">{message.content}</p>
            </div>
          ) : message.message_type === 'image' ? (
            <div 
              className={`rounded-2xl overflow-hidden max-w-[280px] ${
                isOwn ? 'bg-[#007AFF]' : 'bg-[#E5E5EA]'
              }`}
            >
              <a 
                href={message.media_url} 
                target="_blank" 
                rel="noopener noreferrer"
                download
                className="block"
              >
                <img
                  src={message.media_url}
                  alt="Shared"
                  className="w-full max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                />
              </a>
              {/* Caption below image - like WhatsApp */}
              {message.content && message.content !== message.media_url && !message.content.match(/^(image|video|Voice message)/i) && (
                <p className={`px-3 py-2 text-xs leading-relaxed break-words ${
                  isOwn ? 'text-white' : 'text-gray-900'
                }`}>{message.content}</p>
              )}
            </div>
          ) : message.message_type === 'video' ? (
            <div 
              className={`rounded-2xl overflow-hidden max-w-[280px] ${
                isOwn ? 'bg-[#007AFF]' : 'bg-[#E5E5EA]'
              }`}
            >
              <video
                src={message.media_url}
                controls
                playsInline
                controlsList="download"
                className="w-full max-h-[300px] object-contain"
              />
              {/* Caption below video - like WhatsApp */}
              {message.content && message.content !== message.media_url && !message.content.match(/^(image|video|Voice message)/i) && (
                <p className={`px-3 py-2 text-xs leading-relaxed break-words ${
                  isOwn ? 'text-white' : 'text-gray-900'
                }`}>{message.content}</p>
              )}
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
          
          {/* Reaction display */}
          <MessageReactionDisplay 
            messageId={message.id} 
            isOwn={isOwn}
            refreshKey={reactionRefreshKey}
          />
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
                setShowReactionPicker(true);
                setShowContext(false);
              }}
            >
              <SmilePlus className="h-4 w-4" />
              React
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
