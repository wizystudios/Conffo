import { supabase } from '@/integrations/supabase/client';
import { Confession, Room, Comment, RoomInfo, ReportReason, Reaction } from '@/types';
import { sendMessage } from '@/services/chatService';
import { createMentionNotifications } from '@/services/mentionNotificationService';
import { v4 as uuidv4 } from 'uuid';

export const getConfessions = async (roomId?: string, userId?: string): Promise<Confession[]> => {
  try {
    let query = supabase
      .from('confessions')
      .select(`
        id, 
        content, 
        room_id, 
        user_id, 
        created_at,
        media_url,
        media_type,
        tags,
        confession_media (
          media_url,
          media_type,
          order_index
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (roomId) {
      query = query.eq('room_id', roomId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching confessions:', error);
      return [];
    }
    
    if (!data) {
      return [];
    }
    
    const confessions = await Promise.all(data.map(async (row) => {
      // Get reaction counts
      const { data: reactionData, error: reactionError } = await supabase.rpc(
        'get_reaction_counts',
        { confession_uuid: row.id }
      );
      
      // Get comment count
      const { count, error: commentError } = await supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('confession_id', row.id);
      
      // Get user's reactions if logged in
      let userReactions = [];
      if (userId) {
        const { data: userReactionData } = await supabase
          .from('reactions')
          .select('type')
          .eq('confession_id', row.id)
          .eq('user_id', userId);
          
        if (userReactionData) {
          userReactions = userReactionData.map(r => r.type);
        }
      }
      
      const commentCount = commentError ? 0 : count || 0;
      
      // Handle the reaction data with proper type checking
      const reactions = {
        like: typeof reactionData === 'object' && reactionData !== null ? 
              (typeof reactionData === 'object' && 'like' in reactionData ? Number(reactionData.like) || 0 : 0) : 0,
        laugh: typeof reactionData === 'object' && reactionData !== null ? 
              (typeof reactionData === 'object' && 'laugh' in reactionData ? Number(reactionData.laugh) || 0 : 0) : 0,
        shock: typeof reactionData === 'object' && reactionData !== null ? 
              (typeof reactionData === 'object' && 'shock' in reactionData ? Number(reactionData.shock) || 0 : 0) : 0,
        heart: typeof reactionData === 'object' && reactionData !== null ? 
              (typeof reactionData === 'object' && 'heart' in reactionData ? Number(reactionData.heart) || 0 : 0) : 0
      };
      
      // Parse media URLs
      let mediaUrls: string[] = [];
      let mediaTypes: ('image' | 'video' | 'audio')[] = [];
      let singleMediaUrl: string | null = null;
      let singleMediaType: 'image' | 'video' | 'audio' | undefined = undefined;

      const mediaRows = (row as any).confession_media as
        | Array<{ media_url: string; media_type: string; order_index: number }>
        | undefined;

      if (mediaRows && mediaRows.length > 0) {
        const sorted = [...mediaRows].sort(
          (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
        );
        mediaUrls = sorted.map((m) => m.media_url);
        mediaTypes = sorted.map((m) => (m.media_type as any) || 'image');
        singleMediaUrl = mediaUrls[0] || null;
        singleMediaType = mediaTypes[0];
      } else if (row.media_url) {
        // Back-compat: some older posts stored JSON in confessions.media_url
        try {
          if (row.media_url.startsWith('[')) {
            mediaUrls = JSON.parse(row.media_url);
            mediaTypes = mediaUrls.map((url) => {
              if (url.match(/\.(mp4|webm|mov)$/i)) return 'video';
              if (url.match(/\.(mp3|wav|ogg|webm)$/i)) return 'audio';
              return 'image';
            });
            singleMediaUrl = mediaUrls[0] || null;
            singleMediaType = mediaTypes[0];
          } else {
            singleMediaUrl = row.media_url;
            singleMediaType = row.media_type as 'image' | 'video' | 'audio' | undefined;
            mediaUrls = [row.media_url];
            mediaTypes = [singleMediaType || 'image'];
          }
        } catch {
          singleMediaUrl = row.media_url;
          singleMediaType = row.media_type as 'image' | 'video' | 'audio' | undefined;
          mediaUrls = [row.media_url];
          mediaTypes = [singleMediaType || 'image'];
        }
      }
      
      return {
        id: row.id,
        content: row.content,
        room: row.room_id as Room,
        userId: row.user_id || '',
        timestamp: new Date(row.created_at).getTime(),
        reactions,
        commentCount: typeof commentCount === 'number' ? commentCount : 0,
        userReactions,
        mediaUrl: singleMediaUrl || (mediaUrls.length > 0 ? mediaUrls[0] : null),
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        mediaType: singleMediaType,
        mediaTypes: mediaTypes.length > 0 ? mediaTypes : undefined,
        tags: row.tags || []
      };
    }));
    
    return confessions;
  } catch (error) {
    console.error('Error in getConfessions:', error);
    return [];
  }
};

export const getConfessionById = async (id: string, userId?: string): Promise<Confession | null> => {
  try {
    const { data, error } = await supabase
      .from('confessions')
      .select(`
        id, 
        content, 
        room_id, 
        user_id, 
        created_at,
        media_url,
        media_type,
        tags,
        confession_media (
          media_url,
          media_type,
          order_index
        )
      `)
      .eq('id', id)
      .single();
    
    if (error || !data) {
      console.error('Error fetching confession by ID:', error);
      return null;
    }
    
    // Get reaction counts
    const { data: reactionData, error: reactionError } = await supabase.rpc(
      'get_reaction_counts',
      { confession_uuid: data.id }
    );
    
    // Get comment count
    const { count, error: commentError } = await supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('confession_id', data.id);
    
    // Get user's reactions if logged in
    let userReactions = [];
    if (userId) {
      const { data: userReactionData } = await supabase
        .from('reactions')
        .select('type')
        .eq('confession_id', data.id)
        .eq('user_id', userId);
        
      if (userReactionData) {
        userReactions = userReactionData.map(r => r.type);
      }
    }
    
    const commentCount = commentError ? 0 : count || 0;
    
    // Handle the reaction data with proper type checking
    const reactions = {
      like: typeof reactionData === 'object' && reactionData !== null ? 
            (typeof reactionData === 'object' && 'like' in reactionData ? Number(reactionData.like) || 0 : 0) : 0,
      laugh: typeof reactionData === 'object' && reactionData !== null ? 
            (typeof reactionData === 'object' && 'laugh' in reactionData ? Number(reactionData.laugh) || 0 : 0) : 0,
      shock: typeof reactionData === 'object' && reactionData !== null ? 
            (typeof reactionData === 'object' && 'shock' in reactionData ? Number(reactionData.shock) || 0 : 0) : 0,
      heart: typeof reactionData === 'object' && reactionData !== null ? 
            (typeof reactionData === 'object' && 'heart' in reactionData ? Number(reactionData.heart) || 0 : 0) : 0
    };
    
    // Parse media URLs
    let mediaUrls: string[] = [];
    let mediaTypes: ('image' | 'video' | 'audio')[] = [];
    let singleMediaUrl: string | null = null;
    let singleMediaType: 'image' | 'video' | 'audio' | undefined = undefined;

    const mediaRows = (data as any).confession_media as
      | Array<{ media_url: string; media_type: string; order_index: number }>
      | undefined;

    if (mediaRows && mediaRows.length > 0) {
      const sorted = [...mediaRows].sort(
        (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
      );
      mediaUrls = sorted.map((m) => m.media_url);
      mediaTypes = sorted.map((m) => (m.media_type as any) || 'image');
      singleMediaUrl = mediaUrls[0] || null;
      singleMediaType = mediaTypes[0];
    } else if (data.media_url) {
      // Back-compat: some older posts stored JSON in confessions.media_url
      try {
        if (data.media_url.startsWith('[')) {
          mediaUrls = JSON.parse(data.media_url);
          mediaTypes = mediaUrls.map((url) => {
            if (url.match(/\.(mp4|webm|mov)$/i)) return 'video';
            if (url.match(/\.(mp3|wav|ogg|webm)$/i)) return 'audio';
            return 'image';
          });
          singleMediaUrl = mediaUrls[0] || null;
          singleMediaType = mediaTypes[0];
        } else {
          singleMediaUrl = data.media_url;
          singleMediaType = data.media_type as 'image' | 'video' | 'audio' | undefined;
          mediaUrls = [data.media_url];
          mediaTypes = [singleMediaType || 'image'];
        }
      } catch {
        singleMediaUrl = data.media_url;
        singleMediaType = data.media_type as 'image' | 'video' | 'audio' | undefined;
        mediaUrls = [data.media_url];
        mediaTypes = [singleMediaType || 'image'];
      }
    }
    
    return {
      id: data.id,
      content: data.content,
      room: data.room_id as Room,
      userId: data.user_id || '',
      timestamp: new Date(data.created_at).getTime(),
      reactions,
      commentCount: typeof commentCount === 'number' ? commentCount : 0,
      userReactions,
      mediaUrl: singleMediaUrl || (mediaUrls.length > 0 ? mediaUrls[0] : null),
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      mediaType: singleMediaType,
      mediaTypes: mediaTypes.length > 0 ? mediaTypes : undefined,
      tags: data.tags || []
    };
  } catch (error) {
    console.error('Error in getConfessionById:', error);
    return null;
  }
};

export const getTrendingConfessions = async (limit = 10, userId?: string): Promise<Confession[]> => {
  try {
    // Get top confessions by reaction count
    const { data: trendingData, error: trendingError } = await supabase.rpc(
      'get_reaction_counts_for_all_confessions'
    );
    
    if (trendingError || !trendingData || !trendingData.length) {
      console.error('Error fetching trending confession IDs:', trendingError);
      return [];
    }
    
    // Sort by reaction count and take top [limit]
    const sortedTopConfessions = trendingData
      .sort((a: any, b: any) => b.total_reactions - a.total_reactions)
      .slice(0, limit);
    
    // Get full confession details for each trending id
    const confessions: Confession[] = [];
    
    for (const item of sortedTopConfessions) {
      const confession = await getConfessionById(item.confession_id, userId);
      if (confession) {
        confessions.push(confession);
      }
    }
    
    return confessions;
  } catch (error) {
    console.error('Error in getTrendingConfessions:', error);
    return [];
  }
};

const extractAtMentions = (text: string): string[] => {
  const matches = text.match(/@([A-Za-z0-9_]{2,32})/g) || [];
  return Array.from(new Set(matches.map(m => m.slice(1))));
};

export const distributeConfessionMentions = async (params: {
  confessionId: string;
  content: string;
  senderId: string;
}) => {
  const mentions = extractAtMentions(params.content);
  if (mentions.length === 0) return;

  const excerpt = params.content.replace(/\s+/g, ' ').trim().slice(0, 80);
  const link = `/confession/${params.confessionId}`;

  for (const handle of mentions) {
    // 1) Try community by name
    const { data: community } = await supabase
      .from('communities')
      .select('id, name')
      .ilike('name', handle)
      .maybeSingle();

    if (community?.id) {
      await supabase.from('community_messages').insert({
        community_id: community.id,
        sender_id: params.senderId,
        message_type: 'text',
        content: `📝 Confession shared: ${excerpt}${excerpt.length === 80 ? '…' : ''}\n${link}`,
      });
      continue;
    }

    // 2) Try user by username
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', handle)
      .maybeSingle();

    if (profile?.id && profile.id !== params.senderId) {
      await sendMessage(
        profile.id,
        `📝 Check my confession: ${link}`,
        'text'
      );
    }
  }
};

export const addConfession = async (
  content: string, 
  room: Room,
  userId: string
): Promise<void> => {
  try {
    const { data: confession, error } = await supabase
      .from('confessions')
      .insert([{ 
        content,
        room_id: room,
        user_id: userId
      }])
      .select('id')
      .single();
    
    if (error) throw error;

    // Best-effort mention distribution and notifications
    if (confession?.id) {
      distributeConfessionMentions({ confessionId: confession.id, content, senderId: userId }).catch(() => {});
      createMentionNotifications(content, userId, confession.id, 'confession').catch(() => {});
    }
  } catch (error) {
    console.error('Error adding confession:', error);
    throw error;
  }
};

export const addConfessionWithMedia = async (
  content: string, 
  room: Room,
  userId: string,
  mediaFile?: File | null,
  tags?: string[],
  mediaUrl?: string | null,
  mediaType?: 'image' | 'video' | 'audio'
): Promise<void> => {
  try {
    const { data: confession, error } = await supabase
      .from('confessions')
      .insert([
        { 
          content,
          room_id: room,
          user_id: userId,
          media_url: mediaUrl,
          media_type: mediaType,
          tags
        }
      ])
      .select('id')
      .single();
    
    if (error) throw error;

    if (confession?.id) {
      distributeConfessionMentions({ confessionId: confession.id, content, senderId: userId }).catch(() => {});
      createMentionNotifications(content, userId, confession.id, 'confession').catch(() => {});
    }
  } catch (error) {
    console.error('Error adding confession with media:', error);
    throw error;
  }
};

export const createConfessionWithMediaItems = async (
  content: string,
  room: Room,
  userId: string,
  tags: string[] = [],
  media: Array<{ url: string; type: 'image' | 'video' | 'audio' }> = []
): Promise<void> => {
  // 1) Create ONE confession row
  const primary = media[0];

  const { data: confession, error: confessionError } = await supabase
    .from('confessions')
    .insert({
      content,
      room_id: room,
      user_id: userId,
      tags,
      // Back-compat fields (so older UI paths still show something)
      media_url: primary?.url ?? null,
      media_type: primary?.type ?? null,
    })
    .select('id')
    .single();

  if (confessionError || !confession) {
    console.error('Error creating confession:', confessionError);
    throw confessionError || new Error('Failed to create confession');
  }

  // 2) Add MANY media rows
  if (media.length > 0) {
    const rows = media.map((m, index) => ({
      confession_id: confession.id,
      user_id: userId,
      media_url: m.url,
      media_type: m.type,
      order_index: index,
    }));

    const { error: mediaError } = await supabase
      .from('confession_media')
      .insert(rows);

    if (mediaError) {
      // Best-effort cleanup to avoid "text-only" orphan posts
      await supabase
        .from('confessions')
        .delete()
        .eq('id', confession.id)
        .eq('user_id', userId);

      console.error('Error adding confession media:', mediaError);
      throw mediaError;
    }
  }

  // Best-effort mention distribution
  distributeConfessionMentions({ confessionId: confession.id, content, senderId: userId }).catch(() => {});
};

// Add the missing toggleReaction function
export const toggleReaction = async (
  confessionId: string,
  userId: string,
  reaction: Reaction
): Promise<void> => {
  try {
    // Check if user already has this reaction
    const { data, error: fetchError } = await supabase
      .from('reactions')
      .select('id, type')
      .eq('confession_id', confessionId)
      .eq('user_id', userId)
      .eq('type', reaction);
    
    if (fetchError) {
      throw fetchError;
    }
    
    // If user already has this reaction, remove it
    if (data && data.length > 0) {
      const { error: deleteError } = await supabase
        .from('reactions')
        .delete()
        .eq('id', data[0].id);
      
      if (deleteError) {
        throw deleteError;
      }
      
      return;
    }
    
    // Add new reaction
    const { error } = await supabase
      .from('reactions')
      .insert({
        confession_id: confessionId,
        user_id: userId,
        type: reaction
      });
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error toggling reaction:', error);
    throw error;
  }
};

export const saveConfession = async (
  confessionId: string,
  userId: string
): Promise<boolean> => {
  try {
    // Check if already saved
    const { data: existingData, error: checkError } = await supabase
      .from('saved_confessions')
      .select('id')
      .eq('confession_id', confessionId)
      .eq('user_id', userId)
      .maybeSingle();
    
    const isAlreadySaved = !!existingData;
    
    if (checkError) {
      console.error('Error checking saved confession:', checkError);
      return false;
    }
    
    // If already saved, remove it (toggle behavior)
    if (isAlreadySaved) {
      const { error: deleteError } = await supabase
        .from('saved_confessions')
        .delete()
        .eq('confession_id', confessionId)
        .eq('user_id', userId);
      
      if (deleteError) {
        console.error('Error removing saved confession:', deleteError);
        return false;
      }
      
      return true;
    }
    
    // Otherwise, save it
    const { error } = await supabase
      .from('saved_confessions')
      .insert({
        confession_id: confessionId,
        user_id: userId
      });
    
    if (error) {
      console.error('Error saving confession:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error saving confession:', error);
    return false;
  }
};

export const getComments = async (confessionId: string): Promise<Comment[]> => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('id, confession_id, user_id, content, created_at')
      .eq('confession_id', confessionId)
      .order('created_at', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    return data.map(comment => ({
      id: comment.id,
      confessionId: comment.confession_id,
      userId: comment.user_id || '',
      content: comment.content,
      timestamp: new Date(comment.created_at).getTime()
    }));
    
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
};

// Alias function for ConfessionPage.tsx
export const getCommentsByConfessionId = getComments;

export const addComment = async (
  confessionId: string,
  userId: string,
  content: string
): Promise<Comment | null> => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .insert([
        {
          confession_id: confessionId,
          user_id: userId,
          content
        }
      ])
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return {
      id: data.id,
      confessionId: data.confession_id,
      userId: data.user_id || '',
      content: data.content,
      timestamp: new Date(data.created_at).getTime()
    };
    
  } catch (error) {
    console.error('Error adding comment:', error);
    return null;
  }
};

// Add missing deleteComment function
export const deleteComment = async (
  commentId: string,
  userId: string,
  isAdmin: boolean
): Promise<boolean> => {
  try {
    let query = supabase
      .from('comments')
      .delete();
    
    // If not admin, only allow deletion of own comments
    if (!isAdmin) {
      query = query.eq('user_id', userId);
    }
    
    const { error } = await query.eq('id', commentId);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting comment:', error);
    return false;
  }
};

// Add missing addReport function
export const addReport = async (
  type: 'confession' | 'comment',
  itemId: string,
  reason: ReportReason,
  details: string,
  userId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('reports')
      .insert({
        item_type: type,
        item_id: itemId,
        reason,
        details,
        user_id: userId
      });
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error submitting report:', error);
    throw error;
  }
};

// Add missing deleteConfession function
export const deleteConfession = async (
  confessionId: string,
  userId: string,
  isAdmin: boolean
): Promise<boolean> => {
  try {
    let query = supabase
      .from('confessions')
      .delete();
    
    // If not admin, only allow deletion of own confessions
    if (!isAdmin) {
      query = query.eq('user_id', userId);
    }
    
    const { error } = await query.eq('id', confessionId);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting confession:', error);
    return false;
  }
};

// Add missing getReports function for admin page
export const getReports = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
};

// Add missing resolveReport function for admin page
export const resolveReport = async (
  reportId: string,
  adminId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('reports')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: adminId
      })
      .eq('id', reportId);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error resolving report:', error);
    return false;
  }
};

export const getRooms = async (): Promise<RoomInfo[]> => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('id, name, description, is_pinned')
      .order('is_pinned', { ascending: false })
      .order('name', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    return data.map(room => ({
      id: room.id as Room,
      name: room.name,
      description: room.description,
      isPinned: room.is_pinned
    }));
    
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return [];
  }
};

// Add new function to get user confessions
export const getUserConfessions = async (userId: string): Promise<Confession[]> => {
  try {
    const { data, error } = await supabase
      .from('confessions')
      .select(`
        id, 
        content, 
        room_id, 
        user_id, 
        created_at,
        media_url,
        media_type,
        tags
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user confessions:', error);
      return [];
    }
    
    if (!data) {
      return [];
    }
    
    const confessions = await Promise.all(data.map(async (row) => {
      // Get reaction counts
      const { data: reactionData, error: reactionError } = await supabase.rpc(
        'get_reaction_counts',
        { confession_uuid: row.id }
      );
      
      // Get comment count
      const { count, error: commentError } = await supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('confession_id', row.id);
      
      // Get user's reactions
      const { data: userReactionData } = await supabase
        .from('reactions')
        .select('type')
        .eq('confession_id', row.id)
        .eq('user_id', userId);
        
      const userReactions = userReactionData ? userReactionData.map(r => r.type) : [];
      
      const commentCount = commentError ? 0 : count || 0;
      
      // Handle the reaction data with proper type checking
      const reactions = {
        like: typeof reactionData === 'object' && reactionData !== null ? 
              (typeof reactionData === 'object' && 'like' in reactionData ? Number(reactionData.like) || 0 : 0) : 0,
        laugh: typeof reactionData === 'object' && reactionData !== null ? 
              (typeof reactionData === 'object' && 'laugh' in reactionData ? Number(reactionData.laugh) || 0 : 0) : 0,
        shock: typeof reactionData === 'object' && reactionData !== null ? 
              (typeof reactionData === 'object' && 'shock' in reactionData ? Number(reactionData.shock) || 0 : 0) : 0,
        heart: typeof reactionData === 'object' && reactionData !== null ? 
              (typeof reactionData === 'object' && 'heart' in reactionData ? Number(reactionData.heart) || 0 : 0) : 0
      };
      
      // Fix: Cast media_type to the correct union type
      const mediaType = row.media_type as 'image' | 'video' | 'audio' | undefined;
      
      return {
        id: row.id,
        content: row.content,
        room: row.room_id as Room,
        userId: row.user_id || '',
        timestamp: new Date(row.created_at).getTime(),
        reactions,
        commentCount: typeof commentCount === 'number' ? commentCount : 0,
        userReactions,
        mediaUrl: row.media_url || null,
        mediaType,
        tags: row.tags || []
      };
    }));
    
    return confessions;
  } catch (error) {
    console.error('Error in getUserConfessions:', error);
    return [];
  }
};

// Add function to update confession
export const updateConfession = async (
  confessionId: string,
  content: string,
  userId: string
): Promise<Confession | null> => {
  try {
    // Update the confession
    const { error: updateError } = await supabase
      .from('confessions')
      .update({
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', confessionId)
      .eq('user_id', userId);
    
    if (updateError) {
      throw updateError;
    }
    
    // Get the updated confession
    return await getConfessionById(confessionId, userId);
  } catch (error) {
    console.error('Error updating confession:', error);
    return null;
  }
};
