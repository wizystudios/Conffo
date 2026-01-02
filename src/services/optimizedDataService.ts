import { supabase } from '@/integrations/supabase/client';
import { Confession, Room, Reaction } from '@/types';

// Optimized confession fetching with single query
export const getOptimizedConfessions = async (roomId?: string, userId?: string, limit: number = 20): Promise<Confession[]> => {
  try {
    // Single optimized query using JOINs and aggregations
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
        ),
        profiles:user_id (username, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (roomId) {
      query = query.eq('room_id', roomId);
    }
    
    const { data: confessions, error } = await query;
    
    if (error) {
      console.error('Error fetching confessions:', error);
      return [];
    }
    
    if (!confessions) return [];

    // Get all confession IDs for batch processing
    const confessionIds = confessions.map(c => c.id);
    
    // Batch fetch all reaction counts using existing function
    const reactionPromises = confessionIds.map(async (id) => {
      const { data } = await supabase.rpc('get_reaction_counts', { confession_uuid: id });
      return { confession_id: id, reactions: data };
    });
    const allReactions = await Promise.all(reactionPromises);
    
    // Batch fetch all comment counts
    const { data: commentCounts } = await supabase
      .from('comments')
      .select('confession_id, id')
      .in('confession_id', confessionIds);
    
    // Batch fetch user reactions if logged in
    let userReactionsMap: Record<string, string[]> = {};
    if (userId) {
      const { data: userReactions } = await supabase
        .from('reactions')
        .select('confession_id, type')
        .in('confession_id', confessionIds)
        .eq('user_id', userId);
      
      if (userReactions) {
        userReactionsMap = userReactions.reduce((acc, reaction) => {
          if (!acc[reaction.confession_id]) acc[reaction.confession_id] = [];
          acc[reaction.confession_id].push(reaction.type);
          return acc;
        }, {} as Record<string, string[]>);
      }
    }
    
    // Process comment counts
    const commentCountMap = commentCounts?.reduce((acc, comment) => {
      acc[comment.confession_id] = (acc[comment.confession_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};
    
    // Map to final confession format
    return confessions.map((row: any) => {
      const mediaRows = (row as any).confession_media as
        | Array<{ media_url: string; media_type: string; order_index: number }>
        | undefined;

      const sorted = mediaRows && mediaRows.length > 0
        ? [...mediaRows].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        : [];

      const mediaUrls = sorted.map((m) => m.media_url);
      const mediaTypes = sorted.map((m) => (m.media_type as any) || 'image');

      return {
        id: row.id,
        content: row.content,
        room: row.room_id as Room,
        userId: row.user_id || '',
        timestamp: new Date(row.created_at).getTime(),
        reactions: getReactionCounts(allReactions, row.id),
        commentCount: commentCountMap[row.id] || 0,
        userReactions: (userReactionsMap[row.id] || []) as Reaction[],
        mediaUrl: mediaUrls[0] ?? row.media_url,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        mediaType: (mediaTypes[0] ?? (row.media_type as any)) as any,
        mediaTypes: mediaTypes.length > 0 ? (mediaTypes as any) : undefined,
        tags: row.tags || []
      };
    });
    
  } catch (error) {
    console.error('Error in getOptimizedConfessions:', error);
    return [];
  }
};

function getReactionCounts(allReactions: Array<{confession_id: string, reactions: any}>, confessionId: string) {
  const reactionItem = allReactions?.find(r => r.confession_id === confessionId);
  const reactionData = reactionItem?.reactions;
  
  if (!reactionData || typeof reactionData !== 'object') {
    return { like: 0, laugh: 0, shock: 0, heart: 0 };
  }
  
  return {
    like: Number(reactionData.like) || 0,
    laugh: Number(reactionData.laugh) || 0,
    shock: Number(reactionData.shock) || 0,
    heart: Number(reactionData.heart) || 0
  };
}

// Cache for frequently accessed data
const dataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

export function getCachedData<T>(key: string): T | null {
  const cached = dataCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

export function setCachedData<T>(key: string, data: T): void {
  dataCache.set(key, { data, timestamp: Date.now() });
}

// Optimized user data fetching with caching
export const getOptimizedUserData = async (userId: string) => {
  const cacheKey = `user-${userId}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;
  
  const { data } = await supabase
    .from('profiles')
    .select('username, avatar_url, bio')
    .eq('id', userId)
    .maybeSingle();
  
  setCachedData(cacheKey, data);
  return data;
};