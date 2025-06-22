
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
 * @returns Object with username and userId if available
 */
export async function getNotificationSender(notification: { type: string; related_id?: string; content: string }): Promise<{ userId: string; username: string } | null> {
  try {
    // For reactions and comments, extract sender from the notification itself
    if (notification.type === 'new_reaction' || notification.type === 'new_comment') {
      // Simplified query with explicit typing
      const activityResult = await supabase
        .from('user_activity_log')
        .select('user_id')
        .eq('activity_type', notification.type)
        .eq('related_id', notification.related_id)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (activityResult.error || !activityResult.data || activityResult.data.length === 0) {
        return null;
      }
      
      const senderId: string = activityResult.data[0].user_id;
      
      // Get username from profile with explicit typing
      const profileResult = await supabase
        .from('profiles')
        .select('username')
        .eq('id', senderId)
        .single();
        
      if (profileResult.data && profileResult.data.username) {
        return {
          userId: senderId,
          username: profileResult.data.username
        };
      }
    }
    
    // For follows, get the follower ID directly
    if (notification.type === 'follow') {
      const parts = notification.content.split(' ');
      if (parts.length > 0) {
        // Extract follower username if available in notification content
        const username = parts[0] !== 'Someone' ? parts[0] : null;
        
        if (username) {
          // Try to get user ID by username with explicit typing
          const userResult = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username)
            .single();
            
          if (userResult.data) {
            return {
              userId: userResult.data.id,
              username
            };
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting notification sender:', error);
    return null;
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
