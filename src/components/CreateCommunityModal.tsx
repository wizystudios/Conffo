import { useState, useRef } from 'react';
import { X, Users, Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createCommunity } from '@/services/communityService';
import { toast } from '@/hooks/use-toast';
import { haptic } from '@/utils/hapticFeedback';
import { supabase } from '@/integrations/supabase/client';
import { compressImage } from '@/utils/imageCompression';

interface CreateCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  onCreated: () => void;
}

export function CreateCommunityModal({ isOpen, onClose, roomId, onCreated }: CreateCommunityModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Compress the image
    try {
      const compressed = await compressImage(file, 0.5);
      setImageFile(compressed);
    } catch (error) {
      setImageFile(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    setIsUploading(true);
    try {
      const fileName = `community_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      const filePath = `community-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return urlData?.publicUrl || null;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ variant: 'destructive', description: 'Community name is required' });
      return;
    }

    setIsCreating(true);
    
    try {
      // Upload image first if selected
      let imageUrl: string | undefined;
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      const community = await createCommunity(roomId, name.trim(), description.trim() || undefined, imageUrl);
      
      if (community) {
        haptic.success();
        toast({ description: '✅ Community created!' });
        setName('');
        setDescription('');
        setImageFile(null);
        setImagePreview(null);
        onCreated();
        onClose();
      } else {
        toast({ variant: 'destructive', description: 'Failed to create community' });
      }
    } catch (error) {
      console.error('Error creating community:', error);
      toast({ variant: 'destructive', description: 'Failed to create community' });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div 
        className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl p-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Create Community</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Community Icon with Upload */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <div 
              className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Community" className="w-full h-full object-cover" />
              ) : (
                <Users className="h-10 w-10 text-primary" />
              )}
            </div>
            <button 
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
              ) : (
                <Camera className="h-4 w-4 text-primary-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Community Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter community name"
              className="rounded-xl"
              maxLength={50}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Description (optional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this community about?"
              className="rounded-xl resize-none"
              rows={3}
              maxLength={200}
            />
          </div>

          <div className="pt-2">
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || isCreating || isUploading}
              className="w-full h-12 rounded-xl font-semibold conffo-ripple"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : 'Create Community'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            You can add members from your connections (Fans & Crew) after creating the community.
          </p>
        </div>
      </div>
    </div>
  );
}
