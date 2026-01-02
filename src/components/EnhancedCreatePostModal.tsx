import { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { createConfessionWithMediaItems, getRooms } from '@/services/supabaseDataService';
import { Room } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { X, Image, Video, Music, FileText, Tag } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { BottomSlideModal } from './BottomSlideModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EnhancedCreatePostModalProps {
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

export function EnhancedCreatePostModal({ isOpen, onClose, onSuccess, initialRoom }: EnhancedCreatePostModalProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [room, setRoom] = useState<Room>(initialRoom || 'random');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'video' | 'audio'>('text');
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: getRooms,
  });
  
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio') => {
    const files = Array.from(e.target.files || []);
    
    files.forEach(file => {
      // Check file size (50MB max)
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
      // Upload ALL media files
      const uploaded: Array<{ url: string; type: 'image' | 'video' | 'audio' }> = [];

      if (mediaFiles.length > 0) {
        for (let i = 0; i < mediaFiles.length; i++) {
          const media = await uploadMedia(mediaFiles[i].file);
          uploaded.push({ url: media.mediaUrl, type: media.mediaType });
          setUploadProgress(Math.round(((i + 1) / mediaFiles.length) * 80));
        }
      }

      await createConfessionWithMediaItems(
        content,
        room,
        user.id,
        tags,
        uploaded
      );

      setUploadProgress(100);
      
      // Reset form
      setContent('');
      setMediaFiles([]);
      setTags([]);
      setUploadProgress(0);
      
      toast({
        title: "Post created!",
        description: "Your confession has been posted successfully.",
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
  
  return (
    <BottomSlideModal isOpen={isOpen} onClose={onClose} title="Create New Post">
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <Textarea
          placeholder="Share your confession anonymously..."
          className="min-h-[120px] text-base resize-none"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
        
        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map(tag => (
              <Badge key={tag} variant="secondary" className="gap-1 text-xs px-2 py-0.5">
                #{tag}
                <button type="button" onClick={() => removeTag(tag)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        
        {/* Media Type Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-12">
            <TabsTrigger value="text" className="flex-col gap-1 h-full text-xs">
              <FileText className="h-5 w-5" />
              <span>Text</span>
            </TabsTrigger>
            <TabsTrigger value="image" className="flex-col gap-1 h-full text-xs">
              <Image className="h-5 w-5" />
              <span>Photo</span>
            </TabsTrigger>
            <TabsTrigger value="video" className="flex-col gap-1 h-full text-xs">
              <Video className="h-5 w-5" />
              <span>Video</span>
            </TabsTrigger>
            <TabsTrigger value="audio" className="flex-col gap-1 h-full text-xs">
              <Music className="h-5 w-5" />
              <span>Audio</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="image" className="mt-4">
            <input
              type="file"
              ref={imageInputRef}
              onChange={(e) => handleFileSelect(e, 'image')}
              accept="image/*"
              multiple
              className="hidden"
            />
            <Button 
              type="button" 
              variant="outline" 
              className="w-full"
              onClick={() => imageInputRef.current?.click()}
            >
              <Image className="h-4 w-4 mr-2" />
              Add Photos
            </Button>
          </TabsContent>
          
          <TabsContent value="video" className="mt-4">
            <input
              type="file"
              ref={videoInputRef}
              onChange={(e) => handleFileSelect(e, 'video')}
              accept="video/*"
              multiple
              className="hidden"
            />
            <Button 
              type="button" 
              variant="outline" 
              className="w-full"
              onClick={() => videoInputRef.current?.click()}
            >
              <Video className="h-4 w-4 mr-2" />
              Add Videos
            </Button>
          </TabsContent>
          
          <TabsContent value="audio" className="mt-4">
            <input
              type="file"
              ref={audioInputRef}
              onChange={(e) => handleFileSelect(e, 'audio')}
              accept="audio/*"
              className="hidden"
            />
            <Button 
              type="button" 
              variant="outline" 
              className="w-full"
              onClick={() => audioInputRef.current?.click()}
            >
              <Music className="h-4 w-4 mr-2" />
              Add Audio
            </Button>
          </TabsContent>
        </Tabs>
        
        {/* Media Preview Grid */}
        {mediaFiles.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {mediaFiles.map((media, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                {media.type === 'image' ? (
                  <img src={media.preview} alt="" className="w-full h-full object-cover" />
                ) : media.type === 'video' ? (
                  <video src={media.preview} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Music className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => removeMediaFile(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
        
        {/* Upload Progress */}
        {isSubmitting && uploadProgress > 0 && uploadProgress < 100 && (
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all" 
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
        
        {/* Bottom Controls */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add tag"
              className="flex-1"
              maxLength={15}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <Button 
              type="button" 
              size="sm" 
              variant="outline"
              onClick={addTag}
              disabled={!tagInput.trim() || tags.length >= 5}
            >
              <Tag className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          
          <Select value={room} onValueChange={(value) => setRoom(value as Room)} disabled={!!initialRoom}>
            <SelectTrigger>
              <SelectValue placeholder="Select room" />
            </SelectTrigger>
            <SelectContent>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex gap-2">
            <Button 
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={content.trim() === '' || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </div>
      </form>
    </BottomSlideModal>
  );
}