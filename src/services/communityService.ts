import { supabase } from '@/integrations/supabase/client';

export interface Community {
  id: string;
  roomId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  creatorId: string;
  createdAt: string;
  memberCount?: number;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

export interface CommunityMember {
  id: string;
  communityId: string;
  userId: string;
  role: 'creator' | 'admin' | 'member';
  joinedAt: string;
  username?: string;
  avatarUrl?: string;
}

export interface CommunityMessage {
  id: string;
  communityId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'file';
  mediaUrl?: string;
  mediaDuration?: number;
  replyToMessageId?: string;
  replyToMessage?: CommunityMessage;
  createdAt: string;
  senderName?: string;
  senderAvatar?: string;
}

export interface JoinRequest {
  id: string;
  communityId: string;
  userId: string;
  status: 'pending' | 'approved' | 'declined';
  createdAt: string;
  username?: string;
  avatarUrl?: string;
}

// Create a new community
export async function createCommunity(
  roomId: string, 
  name: string, 
  description?: string, 
  imageUrl?: string
): Promise<Community | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('communities')
    .insert({
      room_id: roomId,
      name,
      description,
      image_url: imageUrl,
      creator_id: user.id
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating community:', error);
    return null;
  }

  // Creator membership is enforced by a database trigger.
  // (This guarantees the creator is always the first member, even if the client disconnects.)

  return {
    id: data.id,
    roomId: data.room_id,
    name: data.name,
    description: data.description,
    imageUrl: data.image_url,
    creatorId: data.creator_id,
    createdAt: data.created_at,
    memberCount: 1
  };
}

// Get communities for a room
export async function getCommunitiesByRoom(roomId: string): Promise<Community[]> {
  const { data, error } = await supabase
    .from('communities')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching communities:', error);
    return [];
  }

  // Get member counts
  const communities = await Promise.all(
    data.map(async (c) => {
      const { count } = await supabase
        .from('community_members')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', c.id);

      return {
        id: c.id,
        roomId: c.room_id,
        name: c.name,
        description: c.description,
        imageUrl: c.image_url,
        creatorId: c.creator_id,
        createdAt: c.created_at,
        memberCount: count || 0
      };
    })
  );

  return communities;
}

// Get user's communities with last message info
export async function getUserCommunities(): Promise<Community[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: memberData, error: memberError } = await supabase
    .from('community_members')
    .select('community_id')
    .eq('user_id', user.id);

  if (memberError || !memberData?.length) return [];

  const communityIds = memberData.map(m => m.community_id);

  const { data, error } = await supabase
    .from('communities')
    .select('*')
    .in('id', communityIds)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching user communities:', error);
    return [];
  }

  // Get last message and member count for each community
  const communities = await Promise.all(
    data.map(async (c) => {
      const [{ count }, { data: lastMsg }] = await Promise.all([
        supabase
          .from('community_members')
          .select('*', { count: 'exact', head: true })
          .eq('community_id', c.id),
        supabase
          .from('community_messages')
          .select('content, message_type, created_at')
          .eq('community_id', c.id)
          .order('created_at', { ascending: false })
          .limit(1)
      ]);

      let lastMessage = '';
      if (lastMsg?.[0]) {
        const msg = lastMsg[0];
        if (msg.message_type === 'text') lastMessage = msg.content;
        else if (msg.message_type === 'image') lastMessage = '📷 Photo';
        else if (msg.message_type === 'video') lastMessage = '🎬 Video';
        else if (msg.message_type === 'audio') lastMessage = '🎤 Voice message';
      }

      return {
        id: c.id,
        roomId: c.room_id,
        name: c.name,
        description: c.description,
        imageUrl: c.image_url,
        creatorId: c.creator_id,
        createdAt: c.created_at,
        memberCount: count || 0,
        lastMessage,
        lastMessageTime: lastMsg?.[0]?.created_at
      };
    })
  );

  // Sort by last message time
  return communities.sort((a, b) => {
    if (!a.lastMessageTime && !b.lastMessageTime) return 0;
    if (!a.lastMessageTime) return 1;
    if (!b.lastMessageTime) return -1;
    return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
  });
}

// Search communities (for join requests)
export async function searchCommunities(query: string): Promise<Community[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('communities')
    .select('*')
    .ilike('name', `%${query}%`)
    .limit(20);

  if (error) {
    console.error('Error searching communities:', error);
    return [];
  }

  // Get membership status
  const { data: memberData } = await supabase
    .from('community_members')
    .select('community_id')
    .eq('user_id', user.id);

  const memberCommunityIds = new Set(memberData?.map(m => m.community_id) || []);

  // Filter out communities user is already in
  return data
    .filter(c => !memberCommunityIds.has(c.id))
    .map(c => ({
      id: c.id,
      roomId: c.room_id,
      name: c.name,
      description: c.description,
      imageUrl: c.image_url,
      creatorId: c.creator_id,
      createdAt: c.created_at
    }));
}

// Request to join a community
export async function requestToJoinCommunity(communityId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('community_join_requests')
    .insert({
      community_id: communityId,
      user_id: user.id
    });

  if (error) {
    console.error('Error requesting to join:', error);
    return false;
  }

  return true;
}

// Get pending join requests for creator
export async function getJoinRequests(communityId: string): Promise<JoinRequest[]> {
  const { data, error } = await supabase
    .from('community_join_requests')
    .select('*')
    .eq('community_id', communityId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching join requests:', error);
    return [];
  }

  // Get profile info
  const requests = await Promise.all(
    data.map(async (r) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', r.user_id)
        .maybeSingle();

      return {
        id: r.id,
        communityId: r.community_id,
        userId: r.user_id,
        status: r.status as 'pending' | 'approved' | 'declined',
        createdAt: r.created_at,
        username: profile?.username || 'Anonymous',
        avatarUrl: profile?.avatar_url
      };
    })
  );

  return requests;
}

// Approve or decline join request
export async function respondToJoinRequest(
  requestId: string, 
  approve: boolean
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: request, error: fetchError } = await supabase
    .from('community_join_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError || !request) return false;

  // Update request status
  await supabase
    .from('community_join_requests')
    .update({ status: approve ? 'approved' : 'declined', updated_at: new Date().toISOString() })
    .eq('id', requestId);

  // If approved, add as member and post system message
  if (approve) {
    await supabase
      .from('community_members')
      .insert({
        community_id: request.community_id,
        user_id: request.user_id,
        role: 'member'
      });

    // Get usernames for system message
    const [{ data: adminProfile }, { data: memberProfile }] = await Promise.all([
      supabase.from('profiles').select('username').eq('id', user.id).maybeSingle(),
      supabase.from('profiles').select('username').eq('id', request.user_id).maybeSingle()
    ]);

    const adminName = adminProfile?.username || 'An admin';
    const memberName = memberProfile?.username || 'A user';

    // Post system message
    await supabase.from('community_messages').insert({
      community_id: request.community_id,
      sender_id: user.id,
      content: `${adminName} accepted ${memberName}'s request to join`,
      message_type: 'text'
    });
  }

  return true;
}

// Get community members
export async function getCommunityMembers(communityId: string): Promise<CommunityMember[]> {
  const { data, error } = await supabase
    .from('community_members')
    .select('*')
    .eq('community_id', communityId)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('Error fetching community members:', error);
    return [];
  }

  // Get profile info for each member
  const members = await Promise.all(
    data.map(async (m) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', m.user_id)
        .maybeSingle();

      return {
        id: m.id,
        communityId: m.community_id,
        userId: m.user_id,
        role: m.role as 'creator' | 'admin' | 'member',
        joinedAt: m.joined_at,
        username: profile?.username || 'Anonymous',
        avatarUrl: profile?.avatar_url
      };
    })
  );

  return members;
}

// Add member to community (only from connections - fans/crew)
export async function addCommunityMember(communityId: string, userId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Check if already a member
  const { data: existing } = await supabase
    .from('community_members')
    .select('id')
    .eq('community_id', communityId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    console.log('User is already a member');
    return false;
  }

  const { error } = await supabase
    .from('community_members')
    .insert({
      community_id: communityId,
      user_id: userId,
      role: 'member'
    });

  if (error) {
    console.error('Error adding community member:', error);
    return false;
  }

  // Get usernames for system message
  const [{ data: adminProfile }, { data: memberProfile }] = await Promise.all([
    supabase.from('profiles').select('username').eq('id', user.id).maybeSingle(),
    supabase.from('profiles').select('username').eq('id', userId).maybeSingle()
  ]);

  const adminName = adminProfile?.username || 'An admin';
  const memberName = memberProfile?.username || 'A user';

  // Post system message
  await supabase.from('community_messages').insert({
    community_id: communityId,
    sender_id: user.id,
    content: `${adminName} added ${memberName} to the community`,
    message_type: 'text'
  });

  return true;
}

// Remove member from community
export async function removeCommunityMember(communityId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error removing community member:', error);
    return false;
  }

  return true;
}

// Promote/demote member
export async function updateMemberRole(
  communityId: string, 
  userId: string, 
  newRole: 'admin' | 'member'
): Promise<boolean> {
  const { data, error } = await supabase.rpc('update_community_member_role', {
    p_community_id: communityId,
    p_user_id: userId,
    p_new_role: newRole
  });

  if (error) {
    console.error('Error updating member role:', error);
    return false;
  }

  return data;
}

// Get community messages
export async function getCommunityMessages(communityId: string, limit = 50): Promise<CommunityMessage[]> {
  const { data, error } = await supabase
    .from('community_messages')
    .select('*')
    .eq('community_id', communityId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching community messages:', error);
    return [];
  }

  // Get sender info and reply messages
  const messages = await Promise.all(
    data.map(async (m) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', m.sender_id)
        .maybeSingle();

      let replyToMessage: CommunityMessage | undefined;
      if (m.reply_to_message_id) {
        const { data: replyMsg } = await supabase
          .from('community_messages')
          .select('*')
          .eq('id', m.reply_to_message_id)
          .maybeSingle();
        
        if (replyMsg) {
          const { data: replyProfile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', replyMsg.sender_id)
            .maybeSingle();
          
          replyToMessage = {
            id: replyMsg.id,
            communityId: replyMsg.community_id,
            senderId: replyMsg.sender_id,
            content: replyMsg.content,
            messageType: replyMsg.message_type as any,
            mediaUrl: replyMsg.media_url,
            createdAt: replyMsg.created_at,
            senderName: replyProfile?.username || 'Anonymous'
          };
        }
      }

      return {
        id: m.id,
        communityId: m.community_id,
        senderId: m.sender_id,
        content: m.content,
        messageType: m.message_type as 'text' | 'image' | 'video' | 'audio' | 'file',
        mediaUrl: m.media_url,
        mediaDuration: m.media_duration,
        replyToMessageId: m.reply_to_message_id,
        replyToMessage,
        createdAt: m.created_at,
        senderName: profile?.username || 'Anonymous',
        senderAvatar: profile?.avatar_url
      };
    })
  );

  return messages;
}

// Send message to community
export async function sendCommunityMessage(
  communityId: string,
  content: string,
  messageType: 'text' | 'image' | 'video' | 'audio' | 'file' = 'text',
  mediaUrl?: string,
  mediaDuration?: number,
  replyToMessageId?: string
): Promise<CommunityMessage | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('community_messages')
    .insert({
      community_id: communityId,
      sender_id: user.id,
      content,
      message_type: messageType,
      media_url: mediaUrl,
      media_duration: mediaDuration,
      reply_to_message_id: replyToMessageId
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending community message:', error);
    return null;
  }

  // Update community's updated_at
  await supabase
    .from('communities')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', communityId);

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  return {
    id: data.id,
    communityId: data.community_id,
    senderId: data.sender_id,
    content: data.content,
    messageType: data.message_type as 'text' | 'image' | 'video' | 'audio' | 'file',
    mediaUrl: data.media_url,
    mediaDuration: data.media_duration,
    replyToMessageId: data.reply_to_message_id,
    createdAt: data.created_at,
    senderName: profile?.username || 'You',
    senderAvatar: profile?.avatar_url
  };
}

// Delete community
export async function deleteCommunity(communityId: string): Promise<boolean> {
  const { error } = await supabase
    .from('communities')
    .delete()
    .eq('id', communityId);

  if (error) {
    console.error('Error deleting community:', error);
    return false;
  }

  return true;
}

// Get user's connections (fans + crew) for adding to community
export async function getConnectionsForCommunity(): Promise<{ id: string; username: string; avatarUrl?: string }[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get fans (people who follow you)
  const { data: fans } = await supabase
    .from('user_follows')
    .select('follower_id')
    .eq('following_id', user.id);

  // Get crew (people you follow)
  const { data: crew } = await supabase
    .from('user_follows')
    .select('following_id')
    .eq('follower_id', user.id);

  const connectionIds = new Set<string>();
  fans?.forEach(f => connectionIds.add(f.follower_id));
  crew?.forEach(c => connectionIds.add(c.following_id));

  if (connectionIds.size === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', Array.from(connectionIds));

  return (profiles || []).map(p => ({
    id: p.id,
    username: p.username || 'Anonymous',
    avatarUrl: p.avatar_url
  }));
}
