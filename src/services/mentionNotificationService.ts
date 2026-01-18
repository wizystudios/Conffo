import { supabase } from '@/integrations/supabase/client';
import { createNotification } from '@/utils/notificationUtils';

/**
 * Creates notifications for all @mentions in content
 * @param content The content to scan for mentions
 * @param authorId The ID of the user who created the content
 * @param relatedId The ID of the related content (confession/message)
 * @param type The type of content ('confession' or 'message')
 */
export async function createMentionNotifications(
  content: string,
  authorId: string,
  relatedId: string,
  type: 'confession' | 'message' = 'confession'
) {
  // Extract @mentions from content
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  
  if (mentions.length === 0) return;
  
  // Get author's profile for the notification message
  const { data: authorProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', authorId)
    .maybeSingle();
  
  const authorName = authorProfile?.username || 'Someone';
  
  // Process each mention
  for (const mention of mentions) {
    // Check if it's a user mention
    const { data: mentionedUser } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', mention)
      .maybeSingle();
    
    if (mentionedUser && mentionedUser.id !== authorId) {
      // Create notification for mentioned user
      const notificationContent = type === 'confession'
        ? `@${authorName} mentioned you in a confession`
        : `@${authorName} mentioned you in a message`;
      
      await createNotification(
        mentionedUser.id,
        'mention',
        notificationContent,
        relatedId
      );
    }
    
    // Check if it's a community mention (for confessions shared to communities)
    const { data: community } = await supabase
      .from('communities')
      .select('id, name, creator_id')
      .ilike('name', mention.replace(/_/g, ' '))
      .maybeSingle();
    
    if (community && community.creator_id !== authorId) {
      // Notify community creator
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

/**
 * Creates a notification for a reply in chat
 * @param replyToMessage The original message being replied to
 * @param replySenderId The ID of the user sending the reply
 * @param messageId The ID of the reply message
 */
export async function createReplyNotification(
  replyToMessage: { sender_id: string; senderId?: string; content: string },
  replySenderId: string,
  messageId: string
) {
  const originalSenderId = replyToMessage.sender_id || replyToMessage.senderId;
  
  // Don't notify if replying to yourself
  if (originalSenderId === replySenderId) return;
  
  // Get reply sender's profile
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

/**
 * Creates a notification for a new direct message
 * @param receiverId The ID of the message receiver
 * @param senderId The ID of the message sender
 * @param messageId The ID of the message
 * @param preview Short preview of the message content
 */
export async function createMessageNotification(
  receiverId: string,
  senderId: string,
  messageId: string,
  preview: string
) {
  // Get sender's profile
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
}
