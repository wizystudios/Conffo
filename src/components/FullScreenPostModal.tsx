import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { getRooms } from '@/services/supabaseDataService';
import { Room } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { X, Image as ImageIcon, Video as VideoIcon, Music, Hash, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';

interface FullScreenPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialRoom?: Room;
}

interface MediaFile {
  file: File;
  type: 'image' | 'video' | 'audio';
  preview: string;
}

export function FullScreenPostModal({ isOpen, onClose, onSuccess, initialRoom }: FullScreenPostModalProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [room, setRoom] = useState<Room>(initialRoom || 'random');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: getRooms,
  });
  
  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setContent('');
      setMediaFiles([]);
      setTags([]);
      setUploadProgress(0);
    }
  }, [isOpen]);
  
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio') => {
    const files = Array.from(e.target.files || []);
    
    files.forEach(file => {
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Files must be smaller than 50MB.",
          variant: "destructive"
        });
        return;
      }
      
      const preview = URL.createObjectURL(file);
      setMediaFiles(prev => [...prev, { file, type, preview }]);
    });
    
    // Reset input
    if (e.target) e.target.value = '';
  };
  
  const removeMediaFile = (index: number) => {
    setMediaFiles(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };
  
  const addTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 5) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };
  
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  const uploadMedia = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const mediaType = file.type.split('/')[0];
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `confessions/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);
      
      return {
        mediaUrl: data.publicUrl,
        mediaType: mediaType as 'image' | 'video' | 'audio'
      };
    } catch (error) {
      console.error('Error uploading media:', error);
      throw error;
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || content.trim() === '' || isSubmitting) return;
    
    setIsSubmitting(true);
    setUploadProgress(0);
    
    try {
      const uploadedUrls: string[] = [];
      const uploadedTypes: string[] = [];
      
      console.log('Starting upload with', mediaFiles.length, 'files');
      
      // Upload all media files
      for (let i = 0; i < mediaFiles.length; i++) {
        console.log('Uploading file', i + 1, 'of', mediaFiles.length);
        const media = await uploadMedia(mediaFiles[i].file);
        uploadedUrls.push(media.mediaUrl);
        uploadedTypes.push(media.mediaType);
        setUploadProgress(Math.round(((i + 1) / (mediaFiles.length + 1)) * 80));
      }
      
      console.log('All files uploaded. URLs:', uploadedUrls);
      console.log('Types:', uploadedTypes);
      
      // Store multiple URLs as JSON array when more than one
      const mediaUrlValue = uploadedUrls.length > 1 
        ? JSON.stringify(uploadedUrls) 
        : (uploadedUrls[0] || null);
      
      const mediaTypeValue = uploadedTypes.length > 1 
        ? 'multiple' 
        : (uploadedTypes[0] || null);
      
      console.log('Final media_url:', mediaUrlValue);
      console.log('Final media_type:', mediaTypeValue);
      
      const { error, data } = await supabase
        .from('confessions')
        .insert([{
          content,
          room_id: room,
          user_id: user.id,
          media_url: mediaUrlValue,
          media_type: mediaTypeValue,
          tags
        }])
        .select();
      
      console.log('Insert result:', data, error);
      
      if (error) throw error;
      
      setUploadProgress(100);
      
      toast({
        title: "Posted!",
        description: "Your confession has been shared successfully.",
      });
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting confession:', error);
      toast({
        title: "Failed to post",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b flex items-center justify-between px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold text-lg">New Confession</h1>
        <Button 
          onClick={handleSubmit}
          disabled={content.trim() === '' || isSubmitting}
          size="sm"
          className="rounded-full px-4"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Posting
            </>
          ) : (
            'Post'
          )}
        </Button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto h-[calc(100vh-64px)] pb-6">
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Text Area */}
          <Textarea
            placeholder="Share your confession..."
            className="min-h-[120px] text-base resize-none border-0 focus-visible:ring-0 p-0 text-lg"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoFocus
            disabled={isSubmitting}
          />
          
          {/* Media Preview - Vertical Layout */}
          {mediaFiles.length > 0 && (
            <div className="space-y-2">
              {mediaFiles.map((media, index) => (
                <div key={index} className="relative rounded-xl overflow-hidden border">
                  {media.type === 'image' ? (
                    <img src={media.preview} alt="" className="w-full h-auto max-h-96 object-cover" />
                  ) : media.type === 'video' ? (
                    <video src={media.preview} className="w-full h-auto max-h-96 object-cover" controls />
                  ) : (
                    <div className="w-full bg-muted p-6 flex items-center justify-center">
                      <Music className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full"
                    onClick={() => removeMediaFile(index)}
                    disabled={isSubmitting}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          {/* Upload Progress */}
          {isSubmitting && uploadProgress > 0 && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="h-1" />
              <p className="text-xs text-muted-foreground text-center">Uploading... {uploadProgress}%</p>
            </div>
          )}
          
          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1 text-sm px-3 py-1">
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} disabled={isSubmitting}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          
          {/* Room Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Room</label>
            <Select value={room} onValueChange={(value) => setRoom(value as Room)} disabled={!!initialRoom || isSubmitting}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a room" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Add Tag Input */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 border rounded-lg px-3 py-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add tag (press Enter)"
                className="flex-1 border-0 p-0 h-auto focus-visible:ring-0"
                maxLength={15}
                disabled={isSubmitting || tags.length >= 5}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
            </div>
            <Button 
              type="button" 
              size="icon"
              variant="outline"
              onClick={addTag}
              disabled={!tagInput.trim() || tags.length >= 5 || isSubmitting}
            >
              <Hash className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Media Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <input
              type="file"
              ref={imageInputRef}
              onChange={(e) => handleFileSelect(e, 'image')}
              accept="image/*"
              multiple
              className="hidden"
              disabled={isSubmitting}
            />
            <Button 
              type="button" 
              variant="outline" 
              className="flex-col h-20 gap-2"
              onClick={() => imageInputRef.current?.click()}
              disabled={isSubmitting}
            >
              <ImageIcon className="h-6 w-6" />
              <span className="text-xs">Photos</span>
            </Button>
            
            <input
              type="file"
              ref={videoInputRef}
              onChange={(e) => handleFileSelect(e, 'video')}
              accept="video/*"
              multiple
              className="hidden"
              disabled={isSubmitting}
            />
            <Button 
              type="button" 
              variant="outline" 
              className="flex-col h-20 gap-2"
              onClick={() => videoInputRef.current?.click()}
              disabled={isSubmitting}
            >
              <VideoIcon className="h-6 w-6" />
              <span className="text-xs">Videos</span>
            </Button>
            
            <input
              type="file"
              ref={audioInputRef}
              onChange={(e) => handleFileSelect(e, 'audio')}
              accept="audio/*"
              className="hidden"
              disabled={isSubmitting}
            />
            <Button 
              type="button" 
              variant="outline" 
              className="flex-col h-20 gap-2"
              onClick={() => audioInputRef.current?.click()}
              disabled={isSubmitting}
            >
              <Music className="h-6 w-6" />
              <span className="text-xs">Audio</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
