import { supabase } from '@/integrations/supabase/client';
import { Story, StoryEffects } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Helper function to convert effects to JSON string and back
const prepareEffectsForDB = (effects?: StoryEffects) => {
  return effects ? JSON.parse(JSON.stringify(effects)) : null;
};

/**
 * Creates a new story
 */
export async function createStory(
  userId: string,
  file: File,
  caption?: string,
  effects?: StoryEffects,
) {
  try {
    // Upload the media file first
    const uploadResult = await uploadStoryMedia(file, userId);
    
    if (!uploadResult) {
      throw new Error('Failed to upload story media');
    }
    
    const mediaType = file.type.startsWith('image/') ? 'image' : 'video';
    
    // Stories expire after 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { data, error } = await supabase
      .from('stories')
      .insert({
        user_id: userId,
        media_url: uploadResult.url,
        media_type: mediaType,
        caption,
        effects: prepareEffectsForDB(effects),
        expires_at: expiresAt.toISOString(),
        viewed_by: [],
      })
      .select();

    if (error) {
      console.error('Error creating story:', error);
      throw error;
    }

    return data[0];
  } catch (error) {
    console.error('Error in createStory:', error);
    throw error;
  }
}

/**
 * Uploads a media file for a story
 */
export async function uploadStoryMedia(file: File, userId: string) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${uuidv4()}.${fileExt}`;
    const filePath = `story-media/${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from('media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading story media:', uploadError);
      throw uploadError;
    }

    const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath,
    };
  } catch (error) {
    console.error('Error in uploadStoryMedia:', error);
    throw error;
  }
}

/**
 * Gets stories for a specific user
 */
export async function getUserStories(userId: string, viewerId?: string): Promise<Story[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_active_stories', { user_uuid: viewerId || null })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user stories:', error);
      return [];
    }

    return data.map((story: any) => ({
      id: story.id,
      userId: story.user_id,
      mediaUrl: story.media_url,
      mediaType: story.media_type,
      caption: story.caption,
      effects: story.effects,
      createdAt: story.created_at,
      expiresAt: story.expires_at,
      isViewed: story.is_viewed,
    }));
  } catch (error) {
    console.error('Error in getUserStories:', error);
    return [];
  }
}

/**
 * Gets all active stories
 */
export async function getActiveStories(viewerId?: string): Promise<Story[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_active_stories', { user_uuid: viewerId || null })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching active stories:', error);
      return [];
    }

    return data.map((story: any) => ({
      id: story.id,
      userId: story.user_id,
      mediaUrl: story.media_url,
      mediaType: story.media_type,
      caption: story.caption,
      effects: story.effects,
      createdAt: story.created_at,
      expiresAt: story.expires_at,
      isViewed: story.is_viewed,
    }));
  } catch (error) {
    console.error('Error in getActiveStories:', error);
    return [];
  }
}

/**
 * Checks if a user has active stories
 */
export async function hasActiveStory(userId: string): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('stories')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error checking active stories:', error);
      return false;
    }

    return (count || 0) > 0;
  } catch (error) {
    console.error('Error in hasActiveStory:', error);
    return false;
  }
}

/**
 * Marks a story as viewed by a user
 */
export async function markStoryAsViewed(storyId: string, viewerId: string) {
  try {
    const { error } = await supabase.rpc('mark_story_viewed', {
      story_uuid: storyId,
      viewer_uuid: viewerId,
    });

    if (error) {
      console.error('Error marking story as viewed:', error);
    }
  } catch (error) {
    console.error('Error in markStoryAsViewed:', error);
  }
}

/**
 * Adds a reaction to a story
 * @param userId The ID of the user reacting
 * @param storyId The ID of the story being reacted to
 * @param reactionType The type of reaction (e.g., 'like', 'heart', 'laugh', etc.)
 */
export async function addStoryReaction(
  userId: string,
  storyId: string,
  reactionType: string
) {
  try {
    // Check if user already reacted with this type
    const { data: existingReaction } = await supabase
      .from('story_reactions')
      .select('*')
      .eq('user_id', userId)
      .eq('story_id', storyId)
      .eq('reaction_type', reactionType)
      .single();

    if (existingReaction) {
      // User already reacted with this type, so remove it (toggle behavior)
      const { error: deleteError } = await supabase
        .from('story_reactions')
        .delete()
        .eq('id', existingReaction.id);

      if (deleteError) throw deleteError;
      return { added: false, removed: true };
    }

    // Add the new reaction
    const { error } = await supabase
      .from('story_reactions')
      .insert({
        user_id: userId,
        story_id: storyId,
        reaction_type: reactionType
      });

    if (error) throw error;

    // Notify the story owner if it's not their own story
    const { data: story } = await supabase
      .from('stories')
      .select('user_id')
      .eq('id', storyId)
      .single();

    if (story && story.user_id !== userId) {
      try {
        // Get username if available
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', userId)
          .single();

        const username = profile?.username || 'Someone';

        await supabase
          .from('notifications')
          .insert({
            user_id: story.user_id,
            type: 'story_reaction',
            content: `${username} reacted to your story with ${reactionType}`,
            related_id: storyId,
            is_read: false
          });
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
      }
    }

    return { added: true, removed: false };
  } catch (error) {
    console.error('Error adding story reaction:', error);
    throw error;
  }
}

/**
 * Gets all reactions for a story
 * @param storyId The ID of the story
 */
export async function getStoryReactions(storyId: string) {
  try {
    const { data, error } = await supabase
      .from('story_reactions')
      .select(`
        id,
        reaction_type,
        user_id,
        created_at,
        profiles:user_id (username, avatar_url)
      `)
      .eq('story_id', storyId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting story reactions:', error);
    return [];
  }
}

/**
 * Gets reaction counts grouped by type for a story
 * @param storyId The ID of the story
 */
export async function getStoryReactionCounts(storyId: string) {
  try {
    const { data, error } = await supabase
      .from('story_reactions')
      .select('reaction_type')
      .eq('story_id', storyId);

    if (error) throw error;

    // Group and count reactions by type
    const counts = (data || []).reduce((acc: Record<string, number>, reaction) => {
      const type = reaction.reaction_type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return counts;
  } catch (error) {
    console.error('Error getting story reaction counts:', error);
    return {};
  }
}

/**
 * Get story viewers
 */
export async function getStoryViewers(storyId: string) {
  try {
    // Get the story to access the viewed_by array
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('viewed_by')
      .eq('id', storyId)
      .single();

    if (storyError) {
      console.error('Error fetching story viewers:', storyError);
      return { count: 0, viewers: [] };
    }

    const viewerIds = story.viewed_by || [];
    
    if (viewerIds.length === 0) {
      return { count: 0, viewers: [] };
    }

    // Get the profile info for each viewer
    const { data: viewers, error: viewersError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', viewerIds);

    if (viewersError) {
      console.error('Error fetching viewer profiles:', viewersError);
      return { count: viewerIds.length, viewers: [] };
    }

    return {
      count: viewerIds.length,
      viewers: viewers
    };
  } catch (error) {
    console.error('Error in getStoryViewers:', error);
    return { count: 0, viewers: [] };
  }
}
