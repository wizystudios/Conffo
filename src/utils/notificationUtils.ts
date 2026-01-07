
import { supabase } from "@/integrations/supabase/client";

/**
 * Creates a new notification for a user
 * @param userId The ID of the user to notify
 * @param type The notification type (e.g., 'new_comment', 'new_reaction', 'follow')
 * @param content The notification content text
 * @param relatedId Optional ID of related content (confession, comment, etc.)
 */
export async function createNotification(
  userId: string,
  type: string,
  content: string,
  relatedId?: string
) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        content,
        related_id: relatedId,
        is_read: false
      });

    if (error) {
      console.error('Error creating notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in createNotification:', error);
    return false;
  }
}

/**
 * Marks all notifications for a user as read
 * @param userId The ID of the user
 */
export async function markAllNotificationsAsRead(userId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking notifications as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markAllNotificationsAsRead:', error);
    return false;
  }
}

/**
 * Marks a single notification as read
 * @param notificationId The ID of the notification
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error);
    return false;
  }
}

/**
 * Deletes a notification by ID
 * @param notificationId The ID of the notification to delete
 */
export async function deleteNotification(notificationId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteNotification:', error);
    return false;
  }
}

/**
 * Gets sender information from notification content
 * @param notification The notification object
 * @returns Sender info with username and userId
 */
export async function getNotificationSender(notification: { type: string; related_id?: string; content: string }) {
  try {
    // For reactions and comments, we need to find the user who triggered it
    if ((notification.type === 'new_reaction' || notification.type === 'new_comment') && notification.related_id) {
      // Get the confession to find who made the reaction/comment
      const { data: confession } = await supabase
        .from('confessions')
        .select('id')
        .eq('id', notification.related_id)
        .maybeSingle();
      
      if (confession) {
        // Get the most recent reaction/comment on this confession
        if (notification.type === 'new_reaction') {
          const { data: reaction } = await supabase
            .from('reactions')
            .select('user_id')
            .eq('confession_id', notification.related_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (reaction?.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', reaction.user_id)
              .maybeSingle();
            
            return {
              userId: reaction.user_id,
              username: profile?.username || 'Someone',
              avatarUrl: profile?.avatar_url
            };
          }
        } else if (notification.type === 'new_comment') {
          const { data: comment } = await supabase
            .from('comments')
            .select('user_id')
            .eq('confession_id', notification.related_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (comment?.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', comment.user_id)
              .maybeSingle();
            
            return {
              userId: comment.user_id,
              username: profile?.username || 'Someone',
              avatarUrl: profile?.avatar_url
            };
          }
        }
      }
    }
    
    return {
      userId: 'anonymous',
      username: 'Someone'
    };
  } catch (error) {
    console.error('Error getting notification sender:', error);
    return {
      userId: 'anonymous',
      username: 'Someone'
    };
  }
}

/**
 * Gets all notifications for a user
 * @param userId The ID of the user
 * @param unreadOnly Whether to only fetch unread notifications
 */
export async function getUserNotifications(userId: string, unreadOnly = false) {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserNotifications:', error);
    return [];
  }
}
