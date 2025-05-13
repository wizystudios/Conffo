
import { supabase } from '@/integrations/supabase/client';
import { Story, StoryEffects } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const getActiveStories = async (userId?: string): Promise<Story[]> => {
  try {
    // Call the SQL function we created to get active stories
    const { data, error } = await supabase.rpc('get_active_stories', {
      user_uuid: userId || ''
    });
    
    if (error) {
      console.error('Error fetching active stories:', error);
      return [];
    }
    
    if (!data) {
      return [];
    }

    // Transform database response to our Story type
    return data.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      mediaUrl: row.media_url,
      mediaType: row.media_type as 'image' | 'video',
      caption: row.caption || undefined,
      effects: row.effects as StoryEffects || undefined,
      createdAt: new Date(row.created_at).getTime(),
      expiresAt: new Date(row.expires_at).getTime(),
      isViewed: row.is_viewed || false
    }));
  } catch (error) {
    console.error('Error in getActiveStories:', error);
    return [];
  }
};

export const getUserStories = async (userId: string, viewerId?: string): Promise<Story[]> => {
  try {
    // Get stories only for specific user
    const { data, error } = await supabase.rpc('get_active_stories', {
      user_uuid: viewerId || ''
    });
    
    if (error) {
      console.error('Error fetching user stories:', error);
      return [];
    }
    
    if (!data) {
      return [];
    }

    // Filter to only include stories from the specified user
    const userStories = data.filter((row: any) => row.user_id === userId);
    
    // Transform database response to our Story type
    return userStories.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      mediaUrl: row.media_url,
      mediaType: row.media_type as 'image' | 'video',
      caption: row.caption || undefined,
      effects: row.effects as StoryEffects || undefined,
      createdAt: new Date(row.created_at).getTime(),
      expiresAt: new Date(row.expires_at).getTime(),
      isViewed: row.is_viewed || false
    }));
  } catch (error) {
    console.error('Error in getUserStories:', error);
    return [];
  }
};

export const hasActiveStory = async (userId: string): Promise<boolean> => {
  try {
    // Check if the user has any active stories
    const { count, error } = await supabase
      .from('stories')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString());
      
    if (error) {
      console.error('Error checking for active stories:', error);
      return false;
    }
    
    return !!count && count > 0;
  } catch (error) {
    console.error('Error in hasActiveStory:', error);
    return false;
  }
};

export const createStory = async (
  userId: string,
  mediaFile: File,
  caption?: string,
  effects?: StoryEffects
): Promise<Story | null> => {
  try {
    // First upload the media file to Supabase storage
    const mediaType = mediaFile.type.startsWith('image/') ? 'image' : 'video';
    const fileExt = mediaFile.name.split('.').pop();
    const fileName = `${userId}/${uuidv4()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('story_media')
      .upload(filePath, mediaFile, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (uploadError) {
      throw uploadError;
    }
    
    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase
      .storage
      .from('story_media')
      .getPublicUrl(filePath);
    
    // Create the story record in the database
    const { data, error } = await supabase
      .from('stories')
      .insert({
        user_id: userId,
        media_url: publicUrl,
        media_type: mediaType,
        caption,
        effects: effects || {},
        // expires_at is set by default to now() + 1 day in the table definition
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    // Return the created story
    return {
      id: data.id,
      userId: data.user_id,
      mediaUrl: data.media_url,
      mediaType: data.media_type as 'image' | 'video',
      caption: data.caption || undefined,
      effects: data.effects as StoryEffects || undefined,
      createdAt: new Date(data.created_at).getTime(),
      expiresAt: new Date(data.expires_at).getTime()
    };
  } catch (error) {
    console.error('Error creating story:', error);
    return null;
  }
};

export const markStoryAsViewed = async (storyId: string, viewerId: string): Promise<boolean> => {
  try {
    // Call the SQL function to mark the story as viewed
    const { error } = await supabase.rpc('mark_story_viewed', {
      story_uuid: storyId,
      viewer_uuid: viewerId
    });
    
    if (error) {
      console.error('Error marking story as viewed:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in markStoryAsViewed:', error);
    return false;
  }
};

export const deleteStory = async (storyId: string, userId: string): Promise<boolean> => {
  try {
    // Get the story details to find the media URL
    const { data: storyData, error: fetchError } = await supabase
      .from('stories')
      .select('media_url')
      .eq('id', storyId)
      .eq('user_id', userId)
      .single();
      
    if (fetchError) {
      console.error('Error fetching story for deletion:', fetchError);
      return false;
    }
    
    // Extract the file path from the full URL
    const url = new URL(storyData.media_url);
    const filePath = url.pathname.split('/').slice(3).join('/'); // Remove /storage/v1/object/public/
    
    // Delete the story record
    const { error: deleteError } = await supabase
      .from('stories')
      .delete()
      .eq('id', storyId)
      .eq('user_id', userId);
      
    if (deleteError) {
      console.error('Error deleting story record:', deleteError);
      return false;
    }
    
    // Try to delete the media file
    try {
      const { error: storageError } = await supabase
        .storage
        .from('story_media')
        .remove([filePath]);
        
      if (storageError) {
        console.error('Error deleting story media:', storageError);
        // Continue anyway since the story record is deleted
      }
    } catch (storageError) {
      console.error('Error accessing storage for deletion:', storageError);
      // Continue anyway since the story record is deleted
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteStory:', error);
    return false;
  }
};
