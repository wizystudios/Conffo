
import { supabase } from '@/integrations/supabase/client';
import { Confession, Room, Comment, RoomInfo, ReportReason } from '@/types';
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
        tags
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
    
    const confessions = await Promise.all(data.map(async (row) => {
      // Get reaction counts
      const { data: reactionData, error: reactionError } = await supabase.rpc(
        'get_reaction_counts',
        { confession_uuid: row.id }
      );
      
      // Get comment count
      const { data: commentData, error: commentError } = await supabase.rpc(
        'get_comment_count',
        { confession_uuid: row.id }
      );
      
      // Get user's reactions if logged in
      let userReactions = [];
      if (userId) {
        const { data: userReactionData } = await supabase.rpc(
          'get_user_reactions',
          { confession_uuid: row.id, user_uuid: userId }
        );
        userReactions = userReactionData || [];
      }
      
      const commentCount = commentError ? 0 : commentData || 0;
      
      return {
        id: row.id,
        content: row.content,
        room: row.room_id as Room,
        userId: row.user_id,
        timestamp: new Date(row.created_at).getTime(),
        reactions: reactionData || { like: 0, laugh: 0, shock: 0, heart: 0 },
        commentCount: typeof commentCount === 'number' ? commentCount : 0,
        userReactions,
        mediaUrl: row.media_url,
        mediaType: row.media_type,
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
        tags
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
    const { data: commentData, error: commentError } = await supabase.rpc(
      'get_comment_count',
      { confession_uuid: data.id }
    );
    
    // Get user's reactions if logged in
    let userReactions = [];
    if (userId) {
      const { data: userReactionData } = await supabase.rpc(
        'get_user_reactions',
        { confession_uuid: data.id, user_uuid: userId }
      );
      userReactions = userReactionData || [];
    }
    
    const commentCount = commentError ? 0 : commentData || 0;
    
    return {
      id: data.id,
      content: data.content,
      room: data.room_id as Room,
      userId: data.user_id,
      timestamp: new Date(data.created_at).getTime(),
      reactions: reactionData || { like: 0, laugh: 0, shock: 0, heart: 0 },
      commentCount: typeof commentCount === 'number' ? commentCount : 0,
      userReactions,
      mediaUrl: data.media_url,
      mediaType: data.media_type,
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

export const addConfession = async (
  content: string, 
  room: Room,
  userId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('confessions')
      .insert([
        { 
          content,
          room_id: room,
          user_id: userId
        }
      ]);
    
    if (error) throw error;
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
  tags?: string[]
): Promise<void> => {
  try {
    let mediaUrl: string | undefined = undefined;
    let mediaType: 'image' | 'video' | undefined = undefined;
    
    // Handle media upload if provided
    if (mediaFile) {
      const fileType = mediaFile.type.split('/')[0];
      if (fileType !== 'image' && fileType !== 'video') {
        throw new Error('Unsupported file type');
      }
      
      mediaType = fileType as 'image' | 'video';
      
      // Create unique filename
      const fileExt = mediaFile.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `confessions/${fileName}`;
      
      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, mediaFile);
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
      mediaUrl = urlData.publicUrl;
    }
    
    // Insert confession with media info if available
    const { error } = await supabase
      .from('confessions')
      .insert([
        { 
          content,
          room_id: room,
          user_id: userId,
          media_url: mediaUrl,
          media_type: mediaType,
          tags: tags && tags.length > 0 ? tags : null
        }
      ]);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error adding confession with media:', error);
    throw error;
  }
};

export const addReaction = async (
  confessionId: string,
  userId: string,
  reaction: string
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
      .insert([
        {
          confession_id: confessionId,
          user_id: userId,
          type: reaction
        }
      ]);
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error adding reaction:', error);
    throw error;
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

export const submitReport = async (
  type: 'confession' | 'comment',
  itemId: string,
  reason: ReportReason,
  details: string,
  userId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('reports')
      .insert([
        {
          item_type: type,
          item_id: itemId,
          reason,
          details,
          user_id: userId
        }
      ]);
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error submitting report:', error);
    throw error;
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
