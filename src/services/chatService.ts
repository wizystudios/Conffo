import { supabase } from '@/integrations/supabase/client';

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'file';
  media_url?: string;
  media_duration?: number;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
  reply_to_message_id?: string;
  reply_to_message?: Message;
}

export interface Conversation {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  last_message_id?: string;
  last_activity: string;
  created_at: string;
  last_message?: Message;
  other_participant?: {
    id: string;
    username: string;
    avatar_url: string;
  };
}

export interface MessageRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'ignored' | 'reported';
  first_message_id?: string | null;
  report_details?: string | null;
  created_at: string;
  updated_at: string;
}

export const getMessageRequestBetweenUsers = async (otherUserId: string): Promise<MessageRequest | null> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;

  const { data, error } = await (supabase as any)
    .from('message_requests')
    .select('*')
    .or(`and(sender_id.eq.${user.user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.user.id})`)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as MessageRequest | null;
};

export const areUsersConnectedForChat = async (otherUserId: string): Promise<boolean> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return false;
  const { data, error } = await (supabase as any).rpc('are_users_connected', {
    user1_uuid: user.user.id,
    user2_uuid: otherUserId,
  });
  if (error) throw error;
  return !!data;
};

export const sendMessage = async (
  receiverId: string,
  content: string,
  messageType: 'text' | 'image' | 'video' | 'audio' | 'file' = 'text',
  mediaUrl?: string,
  mediaDuration?: number,
  replyToMessageId?: string
): Promise<Message> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  const [isConnected, existingRequest] = await Promise.all([
    areUsersConnectedForChat(receiverId),
    getMessageRequestBetweenUsers(receiverId),
  ]);

  if (!isConnected && existingRequest?.status === 'pending') {
    throw new Error(existingRequest.sender_id === user.user.id ? 'Your message request is still pending.' : 'Accept this message request before replying.');
  }

  if (!isConnected && (existingRequest?.status === 'ignored' || existingRequest?.status === 'reported')) {
    throw new Error('You are not connected with this user. Add them to your Fans or Crew first.');
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: user.user.id,
      receiver_id: receiverId,
      content,
      message_type: messageType,
      media_url: mediaUrl,
      media_duration: mediaDuration,
      reply_to_message_id: replyToMessageId,
    })
    .select()
    .single();

  if (error) throw error;

  if (!isConnected && !existingRequest) {
    await (supabase as any)
      .from('message_requests')
      .insert({
        sender_id: user.user.id,
        receiver_id: receiverId,
        first_message_id: data.id,
        status: 'pending',
      });
  }

  return data as Message;
};

export const updateMessageRequestStatus = async (
  requestId: string,
  status: 'accepted' | 'ignored' | 'reported',
  reportDetails?: string
): Promise<void> => {
  const payload: Record<string, unknown> = { status };
  if (reportDetails) payload.report_details = reportDetails;

  const { error } = await (supabase as any)
    .from('message_requests')
    .update(payload)
    .eq('id', requestId);

  if (error) throw error;
};

export const reportMessageRequest = async (request: MessageRequest, details: string): Promise<void> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  await updateMessageRequestStatus(request.id, 'reported', details);
  await supabase.from('reports').insert({
    item_type: 'message',
    item_id: request.first_message_id || request.id,
    reason: 'spam',
    details: details || 'Unwanted message request',
    user_id: user.user.id,
  });
};

export const getMessages = async (userId: string, limit = 50): Promise<Message[]> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${user.user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.user.id})`)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data || []) as Message[];
};

export const getConversations = async (): Promise<Conversation[]> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`participant_1_id.eq.${user.user.id},participant_2_id.eq.${user.user.id}`)
    .order('last_activity', { ascending: false });

  if (error) throw error;

  // Get participant profiles
  const conversations = data || [];
  const participantIds = conversations.map(conv => 
    conv.participant_1_id === user.user.id ? conv.participant_2_id : conv.participant_1_id
  );
  const messageIds = conversations.map(conv => conv.last_message_id).filter(Boolean);

  const { data: lastMessages } = messageIds.length > 0
    ? await supabase
        .from('messages')
        .select('*')
        .in('id', messageIds)
    : { data: [] };

  if (participantIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', participantIds);

    return conversations.map(conv => ({
      ...conv,
      last_message: (lastMessages || []).find(message => message.id === conv.last_message_id),
      other_participant: profiles?.find(profile => 
        profile.id === (conv.participant_1_id === user.user.id ? conv.participant_2_id : conv.participant_1_id)
      )
    }));
  }

  return conversations.map(conv => ({
    ...conv,
    last_message: (lastMessages || []).find(message => message.id === conv.last_message_id),
  }));
};

export const markMessageAsRead = async (messageId: string): Promise<void> => {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', messageId);

  if (error) throw error;
};

// Mark all messages in a conversation as read
export const markConversationAsRead = async (senderId: string): Promise<void> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('sender_id', senderId)
    .eq('receiver_id', user.user.id)
    .eq('is_read', false);

  if (error) throw error;
};

export const uploadChatMedia = async (file: File, type: 'image' | 'video' | 'audio'): Promise<string> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  const fileExt = file.name.split('.').pop();
  const fileName = `${user.user.id}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('media')
    .upload(fileName, file);

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('media')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
};

export const deleteMessage = async (messageId: string, deleteForEveryone: boolean): Promise<void> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  if (deleteForEveryone) {
    // Actually delete the message from the database
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', user.user.id);
    
    if (error) throw error;
  }
  // For "delete for me" - handled via local storage in component
};

export const editMessage = async (messageId: string, newContent: string): Promise<void> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('messages')
    .update({ content: newContent, updated_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('sender_id', user.user.id);

  if (error) throw error;
};

export const clearConversation = async (targetUserId: string): Promise<void> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  // Delete all messages in this conversation
  const { error } = await supabase
    .from('messages')
    .delete()
    .or(`and(sender_id.eq.${user.user.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${user.user.id})`);

  if (error) throw error;

  // Also delete the conversation record
  const { error: convError } = await supabase
    .from('conversations')
    .delete()
    .or(
      `and(participant_1_id.eq.${user.user.id},participant_2_id.eq.${targetUserId}),` +
      `and(participant_1_id.eq.${targetUserId},participant_2_id.eq.${user.user.id})`
    );

  if (convError) console.error('Error deleting conversation:', convError);
};