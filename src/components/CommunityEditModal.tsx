import { useState, useRef } from 'react';
import { X, Camera, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { compressImage } from '@/utils/imageCompression';
import { Community } from '@/services/communityService';

interface CommunityEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  community: Community;
  onUpdated: () => void;
}

export function CommunityEditModal({ isOpen, onClose, community, onUpdated }: CommunityEditModalProps) {
  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description || '');
  const [imagePreview, setImagePreview] = useState<string | null>(community.imageUrl || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const compressed = await compressImage(file, 0.5);
      setImageFile(compressed);
    } catch {
      setImageFile(file);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ variant: 'destructive', description: 'Community name is required' });
      return;
    }

    setIsSaving(true);

    try {
      let imageUrl = community.imageUrl;

      // Upload new image if selected
      if (imageFile) {
        const fileName = `community-images/${community.id}_${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, imageFile, { cacheControl: '3600', upsert: true });

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
          imageUrl = urlData?.publicUrl;
        }
      }

      // Update community
      const { error } = await supabase
        .from('communities')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          image_url: imageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', community.id);

      if (error) throw error;

      toast({ description: '✅ Community updated!' });
      onUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating community:', error);
      toast({ variant: 'destructive', description: 'Failed to update community' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div 
        className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl p-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Edit Community</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Community Image */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <Avatar 
              className="h-24 w-24 cursor-pointer border-2 border-primary/30"
              onClick={() => fileInputRef.current?.click()}
            >
              <AvatarImage src={imagePreview || undefined} />
              <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                {name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button 
              className="absolute bottom-0 right-0 h-8 w-8 bg-primary rounded-full flex items-center justify-center"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-4 w-4 text-primary-foreground" />
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
            <label className="text-sm font-medium mb-1.5 block">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this community about?"
              className="rounded-xl resize-none"
              rows={3}
              maxLength={200}
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="w-full h-12 rounded-xl font-semibold"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
