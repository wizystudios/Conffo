import { supabase } from '@/integrations/supabase/client';
import { createNotification } from '@/utils/notificationUtils';

const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

interface NotificationPreferences {
  mentions?: boolean;
  messages?: boolean;
  replies?: boolean;
  reactions?: boolean;
  likes?: boolean;
  comments?: boolean;
  follows?: boolean;
  communities?: boolean;
}

async function isNotificationEnabled(userId: string, type: keyof NotificationPreferences): Promise<boolean> {
  try {
    const stored = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (!stored) return true;
    const settings = JSON.parse(stored) as NotificationPreferences;
    return settings[type] !== false;
  } catch {
    return true;
  }
}

/**
 * Creates notifications for all @mentions in content.
 * For confessions: sends a DM with a rich post preview card (View Confession • Save).
 */
export async function createMentionNotifications(
  content: string,
  authorId: string,
  relatedId: string,
  type: 'confession' | 'message' = 'confession'
) {
  const mentionsEnabled = await isNotificationEnabled(authorId, 'mentions');
  if (!mentionsEnabled) return;
  
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  
  if (mentions.length === 0) return;
  
  const { data: authorProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', authorId)
    .maybeSingle();
  
  const authorName = authorProfile?.username || 'Someone';
  
  for (const mention of mentions) {
    const { data: mentionedUser } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', mention)
      .maybeSingle();
    
    if (mentionedUser && mentionedUser.id !== authorId) {
      // DMs for confessions are handled by distributeConfessionMentions in supabaseDataService.ts
      // Only send notification here, not a duplicate DM
      
      const notificationContent = `@${authorName} mentioned you in a confession`;
      
      await createNotification(
        mentionedUser.id,
        'mention',
        notificationContent,
        relatedId
      );
    }
    
    const { data: community } = await supabase
      .from('communities')
      .select('id, name, creator_id')
      .ilike('name', mention.replace(/_/g, ' '))
      .maybeSingle();
    
    if (community && community.creator_id !== authorId) {
      const notificationContent = `@${authorName} shared a confession to ${community.name}`;
      
      await createNotification(
        community.creator_id,
        'community_mention',
        notificationContent,
        relatedId
      );
    }
  }
}

export async function createReplyNotification(
  replyToMessage: { sender_id: string; senderId?: string; content: string },
  replySenderId: string,
  messageId: string
) {
  const originalSenderId = replyToMessage.sender_id || replyToMessage.senderId;
  
  if (originalSenderId === replySenderId) return;
  
  const repliesEnabled = await isNotificationEnabled(replySenderId, 'replies');
  if (!repliesEnabled) return;
  
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', replySenderId)
    .maybeSingle();
  
  const senderName = senderProfile?.username || 'Someone';
  const truncatedContent = replyToMessage.content.substring(0, 30) + (replyToMessage.content.length > 30 ? '...' : '');
  
  await createNotification(
    originalSenderId,
    'message_reply',
    `${senderName} replied to your message: "${truncatedContent}"`,
    messageId
  );
}

export async function createMessageNotification(
  receiverId: string,
  senderId: string,
  messageId: string,
  preview: string
) {
  const messagesEnabled = await isNotificationEnabled(senderId, 'messages');
  if (!messagesEnabled) return;
  
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', senderId)
    .maybeSingle();
  
  const senderName = senderProfile?.username || 'Someone';
  const truncatedPreview = preview.substring(0, 30) + (preview.length > 30 ? '...' : '');
  
  await createNotification(
    receiverId,
    'new_message',
    `${senderName}: ${truncatedPreview}`,
    messageId
  );

  await createMentionNotifications(preview, senderId, messageId, 'message');
}

export { isNotificationEnabled };
