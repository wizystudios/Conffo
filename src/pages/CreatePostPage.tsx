import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, Video as VideoIcon, Music, Send, X, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/context/AuthContext';
import { getRooms, distributeConfessionMentions } from '@/services/supabaseDataService';
import { Room } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { ConnectionsPickerModal } from '@/components/ConnectionsPickerModal';

interface MediaFile {
  file: File;
  type: 'image' | 'video' | 'audio';
  preview: string;
}

interface MentionedUser {
  id: string;
  username: string;
  avatarUrl?: string;
}

export default function CreatePostPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [room, setRoom] = useState<Room>('random');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mentionedUsers, setMentionedUsers] = useState<MentionedUser[]>([]);
  const [showConnectionsPicker, setShowConnectionsPicker] = useState(false);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: getRooms,
  });

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio') => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.size > 50 * 1024 * 1024) {
        toast({ title: "File too large", description: "Max 50MB.", variant: "destructive" });
        return;
      }
      const preview = URL.createObjectURL(file);
      setMediaFiles(prev => [...prev, { file, type, preview }]);
    });
    if (e.target) e.target.value = '';
  };

  const removeMediaFile = (index: number) => {
    setMediaFiles(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeMention = (userId: string) => {
    setMentionedUsers(prev => prev.filter(u => u.id !== userId));
  };

  const uploadMedia = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const mediaType = file.type.split('/')[0];
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `confessions/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, file);
    
    if (uploadError) throw uploadError;
    
    const { data } = supabase.storage.from('media').getPublicUrl(filePath);
    return { mediaUrl: data.publicUrl, mediaType: mediaType as 'image' | 'video' | 'audio' };
  };

  const handleSubmit = async () => {
    if (!user || content.trim() === '' || isSubmitting) return;
    
    setIsSubmitting(true);
    setUploadProgress(0);
    
    try {
      const uploaded: Array<{ url: string; type: 'image' | 'video' | 'audio' }> = [];

      for (let i = 0; i < mediaFiles.length; i++) {
        const media = await uploadMedia(mediaFiles[i].file);
        uploaded.push({ url: media.mediaUrl, type: media.mediaType });
        setUploadProgress(Math.round(((i + 1) / Math.max(mediaFiles.length, 1)) * 80));
      }

      const primary = uploaded[0];
      
      // Build content with mentions
      let finalContent = content;
      if (mentionedUsers.length > 0) {
        const mentionStr = mentionedUsers.map(u => `@${u.username}`).join(' ');
        finalContent = `${content}\n\n${mentionStr}`;
      }

      const { data: confession, error: confessionError } = await supabase
        .from('confessions')
        .insert([{
          content: finalContent,
          room_id: room,
          user_id: user.id,
          media_url: primary?.url ?? null,
          media_type: primary?.type ?? null,
        }])
        .select('id')
        .single();

      if (confessionError || !confession) throw confessionError || new Error('Failed to create confession');

      if (uploaded.length > 0) {
        const rows = uploaded.map((m, index) => ({
          confession_id: confession.id,
          user_id: user.id,
          media_url: m.url,
          media_type: m.type,
          order_index: index,
        }));
        const { error: mediaError } = await supabase.from('confession_media').insert(rows);
        if (mediaError) {
          await supabase.from('confessions').delete().eq('id', confession.id).eq('user_id', user.id);
          throw mediaError;
        }
      }

      distributeConfessionMentions({ confessionId: confession.id, content: finalContent, senderId: user.id }).catch(() => {});
      setUploadProgress(100);

      toast({ title: "Confession shared!", description: "Your confession has been shared." });
      navigate('/browse', { replace: true });
    } catch (error) {
      console.error('Error submitting confession:', error);
      toast({ title: "Failed", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectConnection = (userId: string) => {
    // Fetch the user's profile to add as mention
    supabase.from('profiles').select('id, username, avatar_url').eq('id', userId).maybeSingle()
      .then(({ data }) => {
        if (data && !mentionedUsers.find(u => u.id === data.id)) {
          setMentionedUsers(prev => [...prev, {
            id: data.id,
            username: data.username || 'Anonymous',
            avatarUrl: data.avatar_url || undefined,
          }]);
        }
      });
    setShowConnectionsPicker(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <button onClick={() => navigate(-1)} disabled={isSubmitting}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bold text-base">New Confession</h1>
        <Button 
          onClick={handleSubmit}
          disabled={content.trim() === '' || isSubmitting}
          size="sm"
          className="rounded-full px-4 h-8"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Share'}
        </Button>
      </div>

      {/* Room Selection */}
      <div className="px-4 py-3 border-b border-border/20">
        <Select value={room} onValueChange={(value) => setRoom(value as Room)}>
          <SelectTrigger className="w-full border-0 bg-muted/30 rounded-full h-9 text-sm">
            <SelectValue placeholder="Select Room" />
          </SelectTrigger>
          <SelectContent>
            {rooms.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Recipient / Mentions */}
      <div className="px-4 py-2 border-b border-border/20 flex items-center gap-2">
        <span className="text-xs text-muted-foreground shrink-0">Mention:</span>
        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          {mentionedUsers.map(u => (
            <Badge key={u.id} variant="secondary" className="gap-1 text-xs shrink-0 pr-1">
              @{u.username}
              <button onClick={() => removeMention(u.id)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <button 
          onClick={() => setShowConnectionsPicker(true)}
          className="h-7 w-7 rounded-full border border-border/50 flex items-center justify-center shrink-0"
        >
          <Plus className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind..."
          className="w-full h-full min-h-[200px] p-4 bg-transparent border-0 outline-none resize-none text-sm placeholder:text-muted-foreground"
          autoFocus
          disabled={isSubmitting}
        />

        {/* Media Previews */}
        {mediaFiles.length > 0 && (
          <div className="px-4 pb-4 flex gap-2 overflow-x-auto scrollbar-hide">
            {mediaFiles.map((media, index) => (
              <div key={index} className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-border/30">
                {media.type === 'image' ? (
                  <img src={media.preview} alt="" className="w-full h-full object-cover" />
                ) : media.type === 'video' ? (
                  <video src={media.preview} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Music className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <button
                  onClick={() => removeMediaFile(index)}
                  className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-background/80 flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload Progress */}
        {isSubmitting && uploadProgress > 0 && (
          <div className="px-4 pb-4 space-y-1">
            <Progress value={uploadProgress} className="h-1" />
            <p className="text-xs text-muted-foreground text-center">{uploadProgress}%</p>
          </div>
        )}
      </div>

      {/* Bottom Toolbar - Media buttons + text input area */}
      <div className="border-t border-border/30 bg-background px-4 py-2 pb-safe flex items-center gap-2">
        <input type="file" ref={imageInputRef} onChange={(e) => handleFileSelect(e, 'image')} accept="image/*" multiple className="hidden" />
        <input type="file" ref={videoInputRef} onChange={(e) => handleFileSelect(e, 'video')} accept="video/*" multiple className="hidden" />
        <input type="file" ref={audioInputRef} onChange={(e) => handleFileSelect(e, 'audio')} accept="audio/*" className="hidden" />
        
        <button onClick={() => imageInputRef.current?.click()} disabled={isSubmitting} className="p-2 text-muted-foreground hover:text-foreground">
          <ImageIcon className="h-5 w-5" />
        </button>
        <button onClick={() => videoInputRef.current?.click()} disabled={isSubmitting} className="p-2 text-muted-foreground hover:text-foreground">
          <VideoIcon className="h-5 w-5" />
        </button>
        <button onClick={() => audioInputRef.current?.click()} disabled={isSubmitting} className="p-2 text-muted-foreground hover:text-foreground">
          <Music className="h-5 w-5" />
        </button>
        
        <div className="flex-1" />
        
        <button 
          onClick={handleSubmit}
          disabled={content.trim() === '' || isSubmitting}
          className="h-9 w-9 rounded-full bg-primary flex items-center justify-center disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
          ) : (
            <Send className="h-4 w-4 text-primary-foreground" />
          )}
        </button>
      </div>

      {/* Connections Picker */}
      <ConnectionsPickerModal
        isOpen={showConnectionsPicker}
        onClose={() => setShowConnectionsPicker(false)}
        onSelectUser={handleSelectConnection}
      />
    </div>
  );
}
