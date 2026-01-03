import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/context/AuthContext';
import { X, Upload, Music, Video, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Room } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { compressImages } from '@/utils/imageCompression';
import { UploadDebugPanel, UploadStatus } from '@/components/UploadDebugPanel';

interface MediaFile {
  file: File;
  type: 'image' | 'video' | 'audio';
  preview?: string;
}

interface EnhancedMultimediaFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialRoom?: Room;
}

export function EnhancedMultimediaForm({ onSuccess, onCancel, initialRoom }: EnhancedMultimediaFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<Room>(
    initialRoom || 'random'
  );
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Define available rooms that match the Room type
  const availableRooms: Room[] = [
    'relationships', 'school', 'work', 'family', 'friends', 'random'
  ];

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Compress images before adding
    const processedFiles = await compressImages(files);
    
    processedFiles.forEach(file => {
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        toast({
          title: "File too large",
          description: "Please select files smaller than 100MB",
          variant: "destructive"
        });
        return;
      }

      let type: 'image' | 'video' | 'audio';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';
      else {
        toast({
          title: "Unsupported file type",
          description: "Please select image, video, or audio files only",
          variant: "destructive"
        });
        return;
      }

      const mediaFile: MediaFile = { file, type };
      
      if (type === 'image' || type === 'video') {
        mediaFile.preview = URL.createObjectURL(file);
      }

      setMediaFiles(prev => [...prev, mediaFile]);
    });

    // Reset input
    if (event.target) {
      event.target.value = '';
    }
  };

  const removeMediaFile = (index: number) => {
    setMediaFiles(prev => {
      const file = prev[index];
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim()) && tags.length < 5) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const uploadMediaFiles = async (): Promise<{urls: string[], types: string[]}> => {
    if (mediaFiles.length === 0) return { urls: [], types: [] };

    const urls: string[] = [];
    const types: string[] = [];
    
    // Initialize upload statuses
    const initialStatuses: UploadStatus[] = mediaFiles.map(mf => ({
      fileName: mf.file.name,
      fileSize: mf.file.size,
      status: 'pending'
    }));
    setUploadStatuses(initialStatuses);
    setShowDebugPanel(true);
    
    for (let i = 0; i < mediaFiles.length; i++) {
      const mediaFile = mediaFiles[i];
      const fileExt = mediaFile.file.name.split('.').pop();
      const fileName = `${Date.now()}_${i}.${fileExt}`;
      const filePath = `confessions/${user?.id}/${fileName}`;

      // Update status to uploading
      setUploadStatuses(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: 'uploading' as const } : s
      ));

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, mediaFile.file);

      if (uploadError) {
        setUploadStatuses(prev => prev.map((s, idx) => 
          idx === i ? { ...s, status: 'error' as const, error: uploadError.message } : s
        ));
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      urls.push(publicUrl);
      types.push(mediaFile.type);
      
      setUploadStatuses(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: 'uploaded' as const, storagePath: filePath, publicUrl } : s
      ));
      
      setUploadProgress(Math.round(((i + 1) / mediaFiles.length) * 80));
    }
    
    setUploadProgress(100);
    return { urls, types };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to post confessions",
        variant: "destructive"
      });
      return;
    }

    if (!content.trim() && mediaFiles.length === 0) {
      toast({
        title: "Content required",
        description: "Please add some content or media to your confession",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const { urls, types } = await uploadMediaFiles();

      const primaryUrl = urls[0] || null;
      const primaryType = (types[0] as any) || null;

      const { data: confession, error: confessionError } = await supabase
        .from('confessions')
        .insert([{
          content: content || 'Multimedia post',
          room_id: selectedRoom || 'random',
          user_id: user.id,
          // Back-compat single-media fields
          media_url: primaryUrl,
          media_type: primaryType,
          tags
        }])
        .select('id')
        .single();

      if (confessionError || !confession) {
        throw confessionError || new Error('Failed to create confession');
      }

      if (urls.length > 0) {
        // Update statuses to db_inserting
        setUploadStatuses(prev => prev.map(s => ({ ...s, status: 'db_inserting' as const })));
        
        const rows = urls.map((url, index) => ({
          confession_id: confession.id,
          user_id: user.id,
          media_url: url,
          media_type: types[index] || 'image',
          order_index: index,
        }));

        const { error: mediaError } = await supabase
          .from('confession_media')
          .insert(rows);

        if (mediaError) {
          setUploadStatuses(prev => prev.map(s => ({ 
            ...s, 
            status: 'error' as const, 
            error: mediaError.message,
            dbInserted: false 
          })));
          await supabase.from('confessions').delete().eq('id', confession.id).eq('user_id', user.id);
          throw mediaError;
        }
        
        // Mark all as complete
        setUploadStatuses(prev => prev.map(s => ({ 
          ...s, 
          status: 'complete' as const,
          dbInserted: true 
        })));
      }

      toast({
        title: "Confession posted!",
        description: "Your confession has been shared successfully.",
      });

      if (onSuccess) onSuccess();
      
      // Reset form
      setContent('');
      setMediaFiles([]);
      setTags([]);
      setSelectedRoom('random');
      setUploadStatuses([]);
      setShowDebugPanel(false);
    } catch (error) {
      console.error('Error submitting confession:', error);
      toast({
        title: "Error",
        description: "Failed to post confession. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        placeholder="What's on your mind? Share your confession..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        className="resize-none"
      />

      {/* Media Preview - Horizontal Scrollable Row */}
      {mediaFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {mediaFiles.map((mediaFile, index) => (
              <div key={index} className="relative group flex-shrink-0 w-32">
                {mediaFile.type === 'image' && (
                  <img
                    src={mediaFile.preview}
                    alt={`Upload ${index + 1}`}
                    className="w-32 h-32 object-cover rounded-lg"
                  />
                )}
                {mediaFile.type === 'video' && (
                  <video
                    src={mediaFile.preview}
                    className="w-32 h-32 object-cover rounded-lg"
                    controls
                  />
                )}
                {mediaFile.type === 'audio' && (
                  <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Music className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground truncate px-1">
                        {mediaFile.file.name}
                      </p>
                    </div>
                  </div>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeMediaFile(index)}
                  className="absolute top-1 right-1 h-5 w-5 p-0 rounded-full"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading media...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
        </div>
      )}

      {/* Upload Debug Panel */}
      <UploadDebugPanel 
        uploads={uploadStatuses} 
        isVisible={showDebugPanel}
        onToggle={() => setShowDebugPanel(!showDebugPanel)}
      />

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm flex items-center gap-1"
            >
              #{tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-primary hover:text-primary/70"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <Select value={selectedRoom} onValueChange={(value) => setSelectedRoom(value as Room)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a room" />
            </SelectTrigger>
            <SelectContent>
              {availableRooms.map((room) => (
                <SelectItem key={room} value={room}>
                  #{room}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="Add tag"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              className="flex-1 px-3 py-2 text-sm border border-input rounded-md"
              disabled={tags.length >= 5}
            />
            <Button
              type="button"
              onClick={addTag}
              size="sm"
              disabled={!newTag.trim() || tags.length >= 5}
            >
              Add
            </Button>
          </div>
        </div>
      </div>

      {/* Media Upload Button */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Add Media ({mediaFiles.length})
        </Button>
        
        <div className="flex gap-1 text-xs text-muted-foreground">
          <ImageIcon className="h-3 w-3" />
          <Video className="h-3 w-3" />
          <Music className="h-3 w-3" />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={(!content.trim() && mediaFiles.length === 0) || isSubmitting}
          className="min-w-24"
        >
          {isSubmitting ? 'Posting...' : 'Post Confession'}
        </Button>
      </div>
    </form>
  );
}