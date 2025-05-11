
import { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { addConfessionWithMedia, getRooms } from '@/services/supabaseDataService';
import { Room } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { X, Image, Video, Tag } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';

interface EnhancedConfessionFormProps {
  onSuccess?: () => void;
  initialRoom?: Room;
}

export function EnhancedConfessionForm({ onSuccess, initialRoom }: EnhancedConfessionFormProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [room, setRoom] = useState<Room>(initialRoom || 'random');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: getRooms,
  });
  
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type
    const fileType = file.type.split('/')[0];
    if (fileType !== 'image' && fileType !== 'video') {
      toast({
        title: "Unsupported file",
        description: "Please upload an image or video file.",
        variant: "destructive"
      });
      return;
    }
    
    // Check file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };
  
  const clearSelectedFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const addTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 5) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    } else if (tags.length >= 5) {
      toast({
        title: "Tag limit reached",
        description: "You can only add up to 5 tags per confession.",
        variant: "destructive"
      });
    }
  };
  
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  const uploadMedia = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const mediaType = file.type.split('/')[0]; // 'image' or 'video'
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `confessions/${fileName}`;
      
      setUploadProgress(10);
      
      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);
      
      if (uploadError) {
        throw uploadError;
      }
      
      setUploadProgress(70);
      
      // Get public URL
      const { data } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);
      
      setUploadProgress(100);
      
      return {
        mediaUrl: data.publicUrl,
        mediaType: mediaType as 'image' | 'video'
      };
    } catch (error) {
      console.error('Error uploading media:', error);
      throw error;
    }
  };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!user || content.trim() === '' || isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
    setUploadProgress(0);
    
    try {
      let mediaUrl = null;
      let mediaType = undefined;
      
      // Upload media if selected
      if (selectedFile) {
        const media = await uploadMedia(selectedFile);
        mediaUrl = media.mediaUrl;
        mediaType = media.mediaType;
      }
      
      await addConfessionWithMedia(
        content, 
        room, 
        user.id, 
        selectedFile, 
        tags,
        mediaUrl,
        mediaType
      );
      
      setContent('');
      setSelectedFile(null);
      setPreviewUrl(null);
      setTags([]);
      setUploadProgress(0);
      
      toast({
        title: "Confession posted",
        description: "Your confession has been posted successfully.",
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error submitting confession:', error);
      toast({
        title: "Post failed",
        description: error instanceof Error ? error.message : "An error occurred while posting your confession.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const mediaType = selectedFile?.type.split('/')[0];
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        placeholder="Share your confession anonymously..."
        className="min-h-[100px] text-base"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
      />
      
      {/* Media preview */}
      {previewUrl && (
        <div className="relative rounded-md overflow-hidden border border-border">
          {mediaType === 'image' ? (
            <img src={previewUrl} alt="Preview" className="max-h-[200px] w-auto mx-auto" />
          ) : (
            <video src={previewUrl} controls className="max-h-[200px] w-auto mx-auto" />
          )}
          <Button 
            type="button" 
            size="icon" 
            variant="destructive"
            className="absolute top-2 right-2"
            onClick={clearSelectedFile}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {isSubmitting && uploadProgress > 0 && uploadProgress < 100 && (
        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
          <div 
            className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-in-out" 
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
      )}
      
      {/* Tags display */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <Badge key={tag} variant="secondary" className="gap-1 px-2 py-1">
              #{tag}
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Select value={room} onValueChange={(value) => setRoom(value as Room)} disabled={!!initialRoom}>
          <SelectTrigger className="w-full sm:w-[180px]">
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
        
        <div className="flex flex-wrap gap-2">
          {/* Add tag input */}
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add tag"
              className="w-[120px] h-9"
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
              className="h-9 px-2"
            >
              <Tag className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          
          {/* File upload button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,video/*"
            className="hidden"
          />
          <Button 
            type="button" 
            size="sm" 
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={!!selectedFile}
            className="h-9"
          >
            {selectedFile ? (
              <Video className="h-4 w-4 mr-1" />
            ) : (
              <Image className="h-4 w-4 mr-1" />
            )}
            {selectedFile ? 'File Selected' : 'Add Media'}
          </Button>
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={content.trim() === '' || isSubmitting}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? 'Posting...' : 'Post Confession'}
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground">
        By posting, you agree to our community guidelines. Your identity is not publicly visible.
      </p>
    </form>
  );
}
