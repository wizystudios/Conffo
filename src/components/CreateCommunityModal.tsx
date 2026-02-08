import { useState, useRef } from 'react';
import { X, Users, Camera, Loader2, Plus, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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

const DEFAULT_CONDITIONS = [
  'Be respectful to all members',
  'No hate speech, harassment, or bullying',
  'No spam, ads, or self-promotion',
  'Keep content appropriate and relevant',
  'Admins can remove members who violate rules',
];

export function CreateCommunityModal({ isOpen, onClose, roomId, onCreated }: CreateCommunityModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [conditions, setConditions] = useState<string[]>([...DEFAULT_CONDITIONS]);
  const [newCondition, setNewCondition] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
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
    } catch { setImageFile(file); }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    setIsUploading(true);
    try {
      const fileName = `community_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      const filePath = `community-images/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, imageFile, { cacheControl: '3600', upsert: false });
      if (uploadError) { console.error('Upload error:', uploadError); return null; }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return urlData?.publicUrl || null;
    } catch (error) { console.error('Error uploading image:', error); return null; }
    finally { setIsUploading(false); }
  };

  const addCondition = () => {
    const trimmed = newCondition.trim();
    if (trimmed && conditions.length < 10) {
      setConditions([...conditions, trimmed]);
      setNewCondition('');
    }
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(conditions[index]);
  };

  const saveEdit = () => {
    if (editingIndex !== null && editValue.trim()) {
      const updated = [...conditions];
      updated[editingIndex] = editValue.trim();
      setConditions(updated);
    }
    setEditingIndex(null);
    setEditValue('');
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ variant: 'destructive', description: 'Community name is required' });
      return;
    }
    if (!acceptedTerms) {
      toast({ variant: 'destructive', description: 'You must accept the community guidelines' });
      return;
    }
    if (conditions.length === 0) {
      toast({ variant: 'destructive', description: 'Add at least one community condition' });
      return;
    }

    setIsCreating(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) imageUrl = uploadedUrl;
      }

      const community = await createCommunity(roomId, name.trim(), description.trim() || undefined, imageUrl);
      
      if (community) {
        // Save conditions to community
        await supabase
          .from('communities')
          .update({ conditions })
          .eq('id', community.id);

        haptic.success();
        toast({ description: '✅ Community created!' });
        setName('');
        setDescription('');
        setImageFile(null);
        setImagePreview(null);
        setConditions([...DEFAULT_CONDITIONS]);
        setAcceptedTerms(false);
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
        className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl p-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Create Community</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Community Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              {imagePreview ? (
                <img src={imagePreview} alt="Community" className="w-full h-full object-cover" />
              ) : (
                <Users className="h-10 w-10 text-primary" />
              )}
            </div>
            <button className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" /> : <Camera className="h-4 w-4 text-primary-foreground" />}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Community Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter community name" className="rounded-xl" maxLength={50} />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Description (optional)</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this community about?" className="rounded-xl resize-none" rows={2} maxLength={200} />
          </div>

          {/* Admin-Managed Conditions */}
          <div className="rounded-xl bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-semibold">Community Conditions</p>
            <p className="text-[10px] text-muted-foreground">These conditions will be shown to new members. You can add, edit, or remove them.</p>
            
            <div className="space-y-1.5 mt-2">
              {conditions.map((condition, index) => (
                <div key={index} className="flex items-start gap-2 group">
                  {editingIndex === index ? (
                    <div className="flex-1 flex gap-1">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-7 text-xs"
                        maxLength={100}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                        autoFocus
                      />
                      <Button size="sm" onClick={saveEdit} className="h-7 text-xs px-2">Save</Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-[10px] text-muted-foreground mt-0.5">•</span>
                      <p className="flex-1 text-[11px]">{condition}</p>
                      <button onClick={() => startEdit(index)} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5">
                        <Edit2 className="h-3 w-3 text-muted-foreground" />
                      </button>
                      <button onClick={() => removeCondition(index)} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5">
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Add new condition */}
            {conditions.length < 10 && (
              <div className="flex gap-1.5 mt-2">
                <Input
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  placeholder="Add a condition..."
                  className="h-7 text-xs flex-1"
                  maxLength={100}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCondition())}
                />
                <Button size="sm" variant="outline" onClick={addCondition} disabled={!newCondition.trim()} className="h-7 text-xs px-2">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}

            <div className="flex items-start gap-2 pt-2 border-t border-border/30 mt-2">
              <Checkbox 
                id="terms" 
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                className="mt-0.5"
              />
              <label htmlFor="terms" className="text-[10px] text-muted-foreground cursor-pointer leading-tight">
                I agree to enforce these conditions in my community
              </label>
            </div>
          </div>

          <div className="pt-2">
            <Button onClick={handleCreate} disabled={!name.trim() || isCreating || isUploading || !acceptedTerms} className="w-full h-12 rounded-xl font-semibold">
              {isCreating ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>) : 'Create Community'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            You can add members from your connections after creating.
          </p>
        </div>
      </div>
    </div>
  );
}
