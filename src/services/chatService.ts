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
  created_at: string;
  updated_at: string;
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

export const sendMessage = async (
  receiverId: string,
  content: string,
  messageType: 'text' | 'image' | 'video' | 'audio' | 'file' = 'text',
  mediaUrl?: string,
  mediaDuration?: number
): Promise<Message> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: user.user.id,
      receiver_id: receiverId,
      content,
      message_type: messageType,
      media_url: mediaUrl,
      media_duration: mediaDuration,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Message;
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

  if (participantIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', participantIds);

    return conversations.map(conv => ({
      ...conv,
      other_participant: profiles?.find(profile => 
        profile.id === (conv.participant_1_id === user.user.id ? conv.participant_2_id : conv.participant_1_id)
      )
    }));
  }

  return conversations;
};

export const markMessageAsRead = async (messageId: string): Promise<void> => {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('id', messageId);

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
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', user.user.id);
    
    if (error) throw error;
  } else {
    // For "delete for me", delete the message entirely
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);
    
    if (error) throw error;
  }
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