import { supabase } from '@/integrations/supabase/client';
import { Confession, Room, Comment, RoomInfo, ReportReason, Reaction } from '@/types';
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
      
      // Fix the type issue by ensuring mediaType is correctly typed
      const mediaType = row.media_type as 'image' | 'video' | undefined;
      
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
    
    // Fix: Cast media_type to the correct union type
    const mediaType = data.media_type as 'image' | 'video' | undefined;
    
    return {
      id: data.id,
      content: data.content,
      room: data.room_id as Room,
      userId: data.user_id || '',
      timestamp: new Date(data.created_at).getTime(),
      reactions,
      commentCount: typeof commentCount === 'number' ? commentCount : 0,
      userReactions,
      mediaUrl: data.media_url || null,
      mediaType,
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
  tags?: string[],
  mediaUrl?: string | null,
  mediaType?: 'image' | 'video'
): Promise<void> => {
  try {
    const { error } = await supabase
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
      ]);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error adding confession with media:', error);
    throw error;
  }
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
      const mediaType = row.media_type as 'image' | 'video' | undefined;
      
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
