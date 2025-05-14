
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
  mediaUrl: string,
  mediaType: 'image' | 'video',
  caption?: string,
  effects?: StoryEffects,
) {
  try {
    // Stories expire after 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { data, error } = await supabase
      .from('stories')
      .insert({
        user_id: userId,
        media_url: mediaUrl,
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
 * Add a reaction to a story
 */
export async function addStoryReaction(storyId: string, userId: string, reaction: string) {
  try {
    const { error } = await supabase
      .from('story_reactions')
      .insert({
        story_id: storyId,
        user_id: userId,
        reaction_type: reaction
      });

    if (error) {
      console.error('Error adding story reaction:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in addStoryReaction:', error);
    throw error;
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
