// Local chat storage - messages are stored only on device
// Server stores messages temporarily for delivery but user can delete from local

const CHAT_STORAGE_KEY = 'local_chat_messages';
const HIDDEN_MESSAGES_KEY = 'hidden_messages';

export interface LocalMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'file';
  media_url?: string;
  media_duration?: number;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
}

// Get all locally stored messages
export function getLocalMessages(): Record<string, LocalMessage[]> {
  try {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Get messages for a specific conversation
export function getConversationMessages(
  currentUserId: string,
  targetUserId: string
): LocalMessage[] {
  const allMessages = getLocalMessages();
  const conversationKey = getConversationKey(currentUserId, targetUserId);
  return allMessages[conversationKey] || [];
}

// Save a message locally
export function saveMessageLocally(
  currentUserId: string,
  targetUserId: string,
  message: LocalMessage
): void {
  const allMessages = getLocalMessages();
  const conversationKey = getConversationKey(currentUserId, targetUserId);
  
  if (!allMessages[conversationKey]) {
    allMessages[conversationKey] = [];
  }
  
  // Check if message already exists
  const existingIndex = allMessages[conversationKey].findIndex(m => m.id === message.id);
  if (existingIndex >= 0) {
    allMessages[conversationKey][existingIndex] = message;
  } else {
    allMessages[conversationKey].push(message);
  }
  
  // Sort by created_at
  allMessages[conversationKey].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(allMessages));
}

// Save multiple messages
export function saveMessagesLocally(
  currentUserId: string,
  targetUserId: string,
  messages: LocalMessage[]
): void {
  const allMessages = getLocalMessages();
  const conversationKey = getConversationKey(currentUserId, targetUserId);
  
  if (!allMessages[conversationKey]) {
    allMessages[conversationKey] = [];
  }
  
  messages.forEach(message => {
    const existingIndex = allMessages[conversationKey].findIndex(m => m.id === message.id);
    if (existingIndex >= 0) {
      allMessages[conversationKey][existingIndex] = message;
    } else {
      allMessages[conversationKey].push(message);
    }
  });
  
  // Sort by created_at
  allMessages[conversationKey].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(allMessages));
}

// Hide a message locally (delete for me)
export function hideMessageLocally(messageId: string): void {
  const hidden = getHiddenMessages();
  if (!hidden.includes(messageId)) {
    hidden.push(messageId);
    localStorage.setItem(HIDDEN_MESSAGES_KEY, JSON.stringify(hidden));
  }
}

// Get hidden message IDs
export function getHiddenMessages(): string[] {
  try {
    const stored = localStorage.getItem(HIDDEN_MESSAGES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Check if a message is hidden
export function isMessageHidden(messageId: string): boolean {
  return getHiddenMessages().includes(messageId);
}

// Delete a message locally (for delete for everyone - mark as deleted)
export function deleteMessageLocally(
  currentUserId: string,
  targetUserId: string,
  messageId: string
): void {
  const allMessages = getLocalMessages();
  const conversationKey = getConversationKey(currentUserId, targetUserId);
  
  if (allMessages[conversationKey]) {
    const messageIndex = allMessages[conversationKey].findIndex(m => m.id === messageId);
    if (messageIndex >= 0) {
      allMessages[conversationKey][messageIndex] = {
        ...allMessages[conversationKey][messageIndex],
        content: 'This message was deleted',
        is_deleted: true,
        media_url: undefined
      };
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(allMessages));
    }
  }
}

// Clear entire conversation locally
export function clearConversationLocally(
  currentUserId: string,
  targetUserId: string
): void {
  const allMessages = getLocalMessages();
  const conversationKey = getConversationKey(currentUserId, targetUserId);
  delete allMessages[conversationKey];
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(allMessages));
}

// Helper to create consistent conversation key
function getConversationKey(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('_');
}
