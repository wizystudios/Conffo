import { supabase } from '@/integrations/supabase/client';
import { 
  Confession, Comment, Room, Reaction, Report, 
  ReportReason, Notification, RoomInfo, User 
} from '@/types';
import { toast } from '@/hooks/use-toast';

// Utility functions
const formatTimestamp = (timestamp: string): number => {
  return new Date(timestamp).getTime();
};

const mapReactionCounts = (reactionData: any): { like: number; laugh: number; shock: number; heart: number } => {
  if (!reactionData) return { like: 0, laugh: 0, shock: 0, heart: 0 };
  
  return {
    like: reactionData.like || 0,
    laugh: reactionData.laugh || 0,
    shock: reactionData.shock || 0,
    heart: reactionData.heart || 0,
  };
};

// User functions
export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  
  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
  
  return {
    id: data.id,
    username: data.username,
    isAdmin: data.is_admin,
    isModerator: data.is_moderator
  };
};

export const updateUsername = async (userId: string, username: string): Promise<boolean> => {
  const { error } = await supabase
    .from('profiles')
    .update({ 
      username, 
      updated_at: new Date().toISOString() // Fix Date to string conversion
    })
    .eq('id', userId);
  
  if (error) {
    console.error('Error updating username:', error);
    toast({ 
      title: "Error Updating Username", 
      description: error.message,
      variant: "destructive"
    });
    return false;
  }
  
  return true;
};

// Confession functions
export const getConfessions = async (room?: Room, userId?: string): Promise<Confession[]> => {
  try {
    let query = supabase
      .from('confessions')
      .select(`
        *,
        comments!comments_confession_id_fkey (count),
        reaction_data:get_reaction_counts(id)
      `)
      .order('created_at', { ascending: false });
    
    if (room) {
      query = query.eq('room_id', room);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    let confessions: Confession[] = (data || []).map(item => {
      // Extract comment count - handle both count as number and as array
      let commentCount = 0;
      if (Array.isArray(item.comments)) {
        commentCount = item.comments.length;
      } else if (typeof item.comments === 'number') {
        commentCount = item.comments;
      } else if (item.comments && typeof item.comments === 'object') {
        commentCount = parseInt(String(item.comments.count || 0));
      }
      
      return {
        id: item.id,
        content: item.content,
        room: item.room_id as Room,
        userId: item.user_id,
        timestamp: formatTimestamp(item.created_at),
        reactions: mapReactionCounts(item.reaction_data),
        commentCount: commentCount
      };
    });
    
    // If userId is provided, get user reactions
    if (userId && confessions.length > 0) {
      const confessionIds = confessions.map(c => c.id);
      const { data: userReactions, error: reactionsError } = await supabase
        .from('reactions')
        .select('*')
        .eq('user_id', userId)
        .in('confession_id', confessionIds);
      
      if (!reactionsError && userReactions) {
        const reactionMap = new Map();
        
        userReactions.forEach(reaction => {
          const confessionId = reaction.confession_id;
          if (!reactionMap.has(confessionId)) {
            reactionMap.set(confessionId, []);
          }
          reactionMap.get(confessionId).push(reaction.type);
        });
        
        confessions = confessions.map(confession => ({
          ...confession,
          userReactions: reactionMap.get(confession.id) || []
        }));
      }
    }
    
    return confessions;
  } catch (error) {
    console.error('Error fetching confessions:', error);
    return [];
  }
};

export const getTrendingConfessions = async (limit = 5, userId?: string): Promise<Confession[]> => {
  try {
    // Count reactions grouped by confession_id
    const { data: reactionCounts, error: countError } = await supabase
      .rpc('get_reaction_counts_for_all_confessions');
      
    if (countError) throw countError;
    
    if (!reactionCounts || reactionCounts.length === 0) return [];
    
    // Sort by total reactions and take top N
    const topConfessionIds = reactionCounts
      .sort((a: any, b: any) => b.total_reactions - a.total_reactions)
      .slice(0, limit)
      .map((item: any) => item.confession_id);
    
    if (topConfessionIds.length === 0) return [];
    
    // Fetch the actual confession data
    const { data: confessionsData, error } = await supabase
      .from('confessions')
      .select(`
        *,
        comments!comments_confession_id_fkey (count),
        reaction_data:get_reaction_counts(id)
      `)
      .in('id', topConfessionIds);
    
    if (error) throw error;
    
    let confessions: Confession[] = (confessionsData || []).map(item => {
      // Extract comment count - handle both count as number and as array
      let commentCount = 0;
      if (Array.isArray(item.comments)) {
        commentCount = item.comments.length;
      } else if (typeof item.comments === 'number') {
        commentCount = item.comments;
      } else if (item.comments && typeof item.comments === 'object') {
        commentCount = parseInt(String(item.comments.count || 0));
      }
      
      return {
        id: item.id,
        content: item.content,
        room: item.room_id as Room,
        userId: item.user_id,
        timestamp: formatTimestamp(item.created_at),
        reactions: mapReactionCounts(item.reaction_data),
        commentCount: commentCount
      };
    });
    
    // If userId is provided, get user reactions
    if (userId && confessions.length > 0) {
      const { data: userReactions, error: userReactionsError } = await supabase
        .from('reactions')
        .select('*')
        .eq('user_id', userId)
        .in('confession_id', topConfessionIds);
      
      if (!userReactionsError && userReactions) {
        const reactionMap = new Map();
        
        userReactions.forEach(reaction => {
          const confessionId = reaction.confession_id;
          if (!reactionMap.has(confessionId)) {
            reactionMap.set(confessionId, []);
          }
          reactionMap.get(confessionId).push(reaction.type);
        });
        
        confessions = confessions.map(confession => ({
          ...confession,
          userReactions: reactionMap.get(confession.id) || []
        }));
      }
    }
    
    // Sort by total reactions
    return confessions.sort((a, b) => {
      const totalA = a.reactions.like + a.reactions.laugh + a.reactions.shock + a.reactions.heart;
      const totalB = b.reactions.like + b.reactions.laugh + b.reactions.shock + b.reactions.heart;
      return totalB - totalA;
    });
  } catch (error) {
    console.error('Error fetching trending confessions:', error);
    return [];
  }
};

export const getConfessionById = async (id: string, userId?: string): Promise<Confession | null> => {
  try {
    const { data, error } = await supabase
      .from('confessions')
      .select(`
        *,
        comments!comments_confession_id_fkey (count),
        reaction_data:get_reaction_counts(id)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    if (!data) return null;
    
    let confession: Confession = {
      id: data.id,
      content: data.content,
      room: data.room_id as Room,
      userId: data.user_id,
      timestamp: formatTimestamp(data.created_at),
      reactions: mapReactionCounts(data.reaction_data),
      commentCount: parseInt(data.comments.count || 0)
    };
    
    // If userId is provided, get user reactions
    if (userId) {
      const { data: userReactions, error: reactionsError } = await supabase
        .from('reactions')
        .select('*')
        .eq('user_id', userId)
        .eq('confession_id', id);
      
      if (!reactionsError && userReactions) {
        const userReactionTypes = userReactions.map(r => r.type);
        confession.userReactions = userReactionTypes;
      }
    }
    
    return confession;
  } catch (error) {
    console.error('Error fetching confession by ID:', error);
    return null;
  }
};

export const addConfession = async (content: string, room: Room, userId: string): Promise<Confession | null> => {
  try {
    const { data, error } = await supabase
      .from('confessions')
      .insert([{
        content,
        room_id: room,
        user_id: userId
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Log user activity
    await supabase
      .from('user_activity_log')
      .insert([{
        user_id: userId,
        activity_type: 'confession_created',
        details: { confession_id: data.id, room }
      }]);
    
    return {
      id: data.id,
      content: data.content,
      room: data.room_id as Room,
      userId: data.user_id,
      timestamp: formatTimestamp(data.created_at),
      reactions: { like: 0, laugh: 0, shock: 0, heart: 0 },
      commentCount: 0
    };
  } catch (error) {
    console.error('Error adding confession:', error);
    toast({ 
      title: "Error", 
      description: "Failed to post confession. Please try again.",
      variant: "destructive"
    });
    return null;
  }
};

export const deleteConfession = async (id: string, userId: string, isAdmin: boolean): Promise<boolean> => {
  try {
    // Check if user is author or admin
    if (!isAdmin) {
      const { data, error } = await supabase
        .from('confessions')
        .select('user_id')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      if (data.user_id !== userId) {
        throw new Error('You are not authorized to delete this confession');
      }
    }
    
    const { error } = await supabase
      .from('confessions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    // Log activity
    await supabase
      .from('user_activity_log')
      .insert([{
        user_id: userId,
        activity_type: 'confession_deleted',
        details: { confession_id: id }
      }]);
    
    return true;
  } catch (error) {
    console.error('Error deleting confession:', error);
    toast({ 
      title: "Error", 
      description: error instanceof Error ? error.message : "Failed to delete confession",
      variant: "destructive"
    });
    return false;
  }
};

// Comments
export const getCommentsByConfessionId = async (confessionId: string): Promise<Comment[]> => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('confession_id', confessionId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(comment => ({
      id: comment.id,
      confessionId: comment.confession_id,
      userId: comment.user_id,
      content: comment.content,
      timestamp: formatTimestamp(comment.created_at)
    }));
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
};

export const addComment = async (content: string, confessionId: string, userId: string): Promise<Comment | null> => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .insert([{
        content,
        confession_id: confessionId,
        user_id: userId
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Log activity
    await supabase
      .from('user_activity_log')
      .insert([{
        user_id: userId,
        activity_type: 'comment_created',
        details: { comment_id: data.id, confession_id: confessionId }
      }]);
    
    return {
      id: data.id,
      confessionId: data.confession_id,
      userId: data.user_id,
      content: data.content,
      timestamp: formatTimestamp(data.created_at)
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    toast({ 
      title: "Error", 
      description: "Failed to post comment. Please try again.",
      variant: "destructive"
    });
    return null;
  }
};

export const deleteComment = async (id: string, userId: string, isAdmin: boolean): Promise<boolean> => {
  try {
    // Check if user is author or admin
    if (!isAdmin) {
      const { data, error } = await supabase
        .from('comments')
        .select('user_id')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      if (data.user_id !== userId) {
        throw new Error('You are not authorized to delete this comment');
      }
    }
    
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    // Log activity
    await supabase
      .from('user_activity_log')
      .insert([{
        user_id: userId,
        activity_type: 'comment_deleted',
        details: { comment_id: id }
      }]);
    
    return true;
  } catch (error) {
    console.error('Error deleting comment:', error);
    toast({ 
      title: "Error", 
      description: error instanceof Error ? error.message : "Failed to delete comment",
      variant: "destructive"
    });
    return false;
  }
};

// Reactions
export const toggleReaction = async (confessionId: string, userId: string, reaction: Reaction): Promise<boolean> => {
  try {
    // Check if reaction already exists
    const { data: existingReaction, error: fetchError } = await supabase
      .from('reactions')
      .select('*')
      .eq('confession_id', confessionId)
      .eq('user_id', userId)
      .eq('type', reaction)
      .maybeSingle();
    
    if (fetchError) throw fetchError;
    
    if (existingReaction) {
      // Delete existing reaction
      const { error: deleteError } = await supabase
        .from('reactions')
        .delete()
        .eq('id', existingReaction.id);
      
      if (deleteError) throw deleteError;
      
      await supabase
        .from('user_activity_log')
        .insert([{
          user_id: userId,
          activity_type: 'reaction_removed',
          details: { confession_id: confessionId, reaction }
        }]);
        
      return false; // Reaction was removed
    } else {
      // Add new reaction
      const { error: insertError } = await supabase
        .from('reactions')
        .insert([{
          confession_id: confessionId,
          user_id: userId,
          type: reaction
        }]);
      
      if (insertError) throw insertError;
      
      await supabase
        .from('user_activity_log')
        .insert([{
          user_id: userId,
          activity_type: 'reaction_added',
          details: { confession_id: confessionId, reaction }
        }]);
        
      return true; // Reaction was added
    }
  } catch (error) {
    console.error('Error toggling reaction:', error);
    return false;
  }
};

// Reports
export const getReports = async (resolved: boolean = false): Promise<Report[]> => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('resolved', resolved)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(report => ({
      id: report.id,
      type: report.item_type as 'confession' | 'comment',
      itemId: report.item_id,
      reason: report.reason as ReportReason,
      details: report.details,
      userId: report.user_id,
      timestamp: formatTimestamp(report.created_at),
      resolved: report.resolved,
      resolvedBy: report.resolved_by,
      resolvedAt: report.resolved_at ? formatTimestamp(report.resolved_at) : undefined
    }));
  } catch (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
};

export const addReport = async (
  type: 'confession' | 'comment',
  itemId: string,
  reason: ReportReason,
  details: string,
  userId: string
): Promise<Report | null> => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .insert([{
        item_type: type,
        item_id: itemId,
        reason,
        details,
        user_id: userId
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Log activity
    await supabase
      .from('user_activity_log')
      .insert([{
        user_id: userId,
        activity_type: 'report_created',
        details: { report_id: data.id, item_type: type, item_id: itemId, reason }
      }]);
    
    return {
      id: data.id,
      type: data.item_type as 'confession' | 'comment',
      itemId: data.item_id,
      reason: data.reason as ReportReason,
      details: data.details,
      userId: data.user_id,
      timestamp: formatTimestamp(data.created_at),
      resolved: data.resolved
    };
  } catch (error) {
    console.error('Error adding report:', error);
    toast({ 
      title: "Error", 
      description: "Failed to submit report. Please try again.",
      variant: "destructive"
    });
    return null;
  }
};

export const resolveReport = async (id: string, resolvedBy: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('reports')
      .update({ 
        resolved: true,
        resolved_by: resolvedBy,
        resolved_at: new Date().toISOString() // Fix Date to string conversion
      })
      .eq('id', id);
    
    if (error) throw error;
    
    // Log activity
    await supabase
      .from('user_activity_log')
      .insert([{
        user_id: resolvedBy,
        activity_type: 'report_resolved',
        details: { report_id: id }
      }]);
    
    return true;
  } catch (error) {
    console.error('Error resolving report:', error);
    toast({ 
      title: "Error", 
      description: "Failed to resolve report.",
      variant: "destructive"
    });
    return false;
  }
};

// Notifications
export const getNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(notification => ({
      id: notification.id,
      userId: notification.user_id,
      type: notification.type,
      content: notification.content,
      relatedId: notification.related_id,
      isRead: notification.is_read,
      timestamp: formatTimestamp(notification.created_at)
    }));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

export const markNotificationAsRead = async (id: string, userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

export const markAllNotificationsAsRead = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
};

export const deleteNotification = async (id: string, userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
};

// Room functions
export const getRooms = async (): Promise<RoomInfo[]> => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('name');
    
    if (error) throw error;
    
    return (data || []).map(room => ({
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

export const addRoom = async (id: string, name: string, description: string, userId: string): Promise<RoomInfo | null> => {
  try {
    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();
    
    if (profileError) throw profileError;
    
    if (!userProfile.is_admin) {
      throw new Error('Only admins can create rooms');
    }
    
    const { data, error } = await supabase
      .from('rooms')
      .insert([{
        id,
        name,
        description
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Log activity
    await supabase
      .from('user_activity_log')
      .insert([{
        user_id: userId,
        activity_type: 'room_created',
        details: { room_id: id, name }
      }]);
    
    return {
      id: data.id as Room,
      name: data.name,
      description: data.description,
      isPinned: data.is_pinned
    };
  } catch (error) {
    console.error('Error adding room:', error);
    toast({ 
      title: "Error", 
      description: error instanceof Error ? error.message : "Failed to create room",
      variant: "destructive"
    });
    return null;
  }
};

export const updateRoom = async (id: string, name: string, description: string, isPinned: boolean, userId: string): Promise<RoomInfo | null> => {
  try {
    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();
    
    if (profileError) throw profileError;
    
    if (!userProfile.is_admin) {
      throw new Error('Only admins can update rooms');
    }
    
    const { data, error } = await supabase
      .from('rooms')
      .update({
        name,
        description,
        is_pinned: isPinned,
        updated_at: new Date().toISOString() // Fix Date to string conversion
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Log activity
    await supabase
      .from('user_activity_log')
      .insert([{
        user_id: userId,
        activity_type: 'room_updated',
        details: { room_id: id, name }
      }]);
    
    return {
      id: data.id as Room,
      name: data.name,
      description: data.description,
      isPinned: data.is_pinned
    };
  } catch (error) {
    console.error('Error updating room:', error);
    toast({ 
      title: "Error", 
      description: error instanceof Error ? error.message : "Failed to update room",
      variant: "destructive"
    });
    return null;
  }
};

export const deleteRoom = async (id: string, userId: string): Promise<boolean> => {
  try {
    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();
    
    if (profileError) throw profileError;
    
    if (!userProfile.is_admin) {
      throw new Error('Only admins can delete rooms');
    }
    
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    // Log activity
    await supabase
      .from('user_activity_log')
      .insert([{
        user_id: userId,
        activity_type: 'room_deleted',
        details: { room_id: id }
      }]);
    
    return true;
  } catch (error) {
    console.error('Error deleting room:', error);
    toast({ 
      title: "Error", 
      description: error instanceof Error ? error.message : "Failed to delete room",
      variant: "destructive"
    });
    return false;
  }
};

// Room follows
export const toggleRoomFollow = async (roomId: Room, userId: string): Promise<boolean> => {
  try {
    // Check if follow already exists
    const { data: existingFollow, error: fetchError } = await supabase
      .from('room_follows')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (fetchError) throw fetchError;
    
    if (existingFollow) {
      // Delete existing follow
      const { error: deleteError } = await supabase
        .from('room_follows')
        .delete()
        .eq('id', existingFollow.id);
      
      if (deleteError) throw deleteError;
      
      await supabase
        .from('user_activity_log')
        .insert([{
          user_id: userId,
          activity_type: 'room_unfollowed',
          details: { room_id: roomId }
        }]);
        
      return false; // Follow was removed
    } else {
      // Add new follow
      const { error: insertError } = await supabase
        .from('room_follows')
        .insert([{
          room_id: roomId,
          user_id: userId
        }]);
      
      if (insertError) throw insertError;
      
      await supabase
        .from('user_activity_log')
        .insert([{
          user_id: userId,
          activity_type: 'room_followed',
          details: { room_id: roomId }
        }]);
        
      return true; // Follow was added
    }
  } catch (error) {
    console.error('Error toggling room follow:', error);
    return false;
  }
};

export const getUserFollowedRooms = async (userId: string): Promise<Room[]> => {
  try {
    const { data, error } = await supabase
      .from('room_follows')
      .select('room_id')
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return (data || []).map(item => item.room_id as Room);
  } catch (error) {
    console.error('Error fetching user followed rooms:', error);
    return [];
  }
};

// Export default values to match the current data service interface
export const rooms: { id: Room; name: string; description: string }[] = [
  {
    id: 'relationships',
    name: 'Relationships',
    description: 'Share your relationship secrets, crushes, and romantic dilemmas.'
  },
  {
    id: 'school',
    name: 'School',
    description: 'Confess about your academic life, grades, teachers, and classmates.'
  },
  {
    id: 'work',
    name: 'Work',
    description: 'Vent about your job, coworkers, boss, or workplace secrets.'
  },
  {
    id: 'family',
    name: 'Family',
    description: 'Share secrets about your family dynamics and home life.'
  },
  {
    id: 'friends',
    name: 'Friends',
    description: 'Confess about your friendships, social circles, and friend drama.'
  },
  {
    id: 'random',
    name: 'Random',
    description: 'For everything else that doesn\'t fit elsewhere.'
  }
];

// Add a function needed for trending confessions
export const getRoomByType = async (roomType: Room): Promise<RoomInfo | null> => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomType)
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id as Room,
      name: data.name,
      description: data.description,
      isPinned: data.is_pinned
    };
  } catch (error) {
    console.error(`Error fetching room by type ${roomType}:`, error);
    return null;
  }
};
