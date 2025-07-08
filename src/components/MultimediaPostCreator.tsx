import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square, 
  Upload, 
  Image, 
  Video, 
  Music,
  Trash2,
  Send
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

interface MediaFile {
  file: File;
  type: 'image' | 'video' | 'audio';
  url: string;
  duration?: number;
}

interface MultimediaPostCreatorProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MultimediaPostCreator({ onSuccess, onCancel }: MultimediaPostCreatorProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        variant: "destructive",
        description: "Failed to start recording. Please check microphone permissions."
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const playRecording = () => {
    if (audioBlob && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        const audioUrl = URL.createObjectURL(audioBlob);
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setIsPlaying(true);
        
        audioRef.current.onended = () => {
          setIsPlaying(false);
        };
      }
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setRecordingTime(0);
    setIsPlaying(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach(file => {
      let type: 'image' | 'video' | 'audio';
      
      if (file.type.startsWith('image/')) {
        type = 'image';
      } else if (file.type.startsWith('video/')) {
        type = 'video';
      } else if (file.type.startsWith('audio/')) {
        type = 'audio';
      } else {
        toast({
          variant: "destructive",
          description: `Unsupported file type: ${file.type}`
        });
        return;
      }

      const mediaFile: MediaFile = {
        file,
        type,
        url: URL.createObjectURL(file)
      };

      // Get duration for video/audio files
      if (type === 'video' || type === 'audio') {
        const element = document.createElement(type);
        element.src = mediaFile.url;
        element.onloadedmetadata = () => {
          mediaFile.duration = element.duration;
          setMediaFiles(prev => [...prev, mediaFile]);
        };
      } else {
        setMediaFiles(prev => [...prev, mediaFile]);
      }
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeMediaFile = (index: number) => {
    setMediaFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].url);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const uploadMediaFile = async (file: File, type: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
    
    const bucket = type === 'audio' ? 'media' : 'media';
    
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!user || (!content.trim() && mediaFiles.length === 0 && !audioBlob)) {
      toast({
        variant: "destructive",
        description: "Please add some content or media before posting."
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload media files
      const uploadedMedia: { type: string; url: string }[] = [];
      
      for (const mediaFile of mediaFiles) {
        const url = await uploadMediaFile(mediaFile.file, mediaFile.type);
        uploadedMedia.push({ type: mediaFile.type, url });
      }

      // Upload audio recording if exists
      if (audioBlob) {
        const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
        const audioUrl = await uploadMediaFile(audioFile, 'audio');
        uploadedMedia.push({ type: 'audio', url: audioUrl });
      }

      // Create confession
      const { data: confession, error: confessionError } = await supabase
        .from('confessions')
        .insert({
          content: content.trim() || 'Multimedia post',
          user_id: user.id,
          room_id: 'general', // Default room
          media_url: uploadedMedia.length > 0 ? uploadedMedia[0].url : null,
          media_type: uploadedMedia.length > 0 ? uploadedMedia[0].type : null
        })
        .select()
        .single();

      if (confessionError) throw confessionError;

      // Save audio data if exists
      if (audioBlob && confession) {
        const audioUrl = uploadedMedia.find(m => m.type === 'audio')?.url;
        if (audioUrl) {
          await supabase
            .from('audio_posts')
            .insert({
              confession_id: confession.id,
              audio_url: audioUrl,
              duration_seconds: recordingTime
            });
        }
      }

      toast({
        description: "Post created successfully!"
      });

      // Reset form
      setContent('');
      setMediaFiles([]);
      setAudioBlob(null);
      setRecordingTime(0);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        variant: "destructive",
        description: "Failed to create post. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create Multimedia Post</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Text Content */}
        <div>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Audio Recording */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Music className="h-4 w-4" />
            Voice Recording
          </h3>
          
          <div className="flex items-center gap-3">
            {!isRecording ? (
              <Button
                onClick={startRecording}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Mic className="h-4 w-4" />
                Start Recording
              </Button>
            ) : (
              <Button
                onClick={stopRecording}
                variant="destructive"
                size="sm"
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Stop ({formatTime(recordingTime)})
              </Button>
            )}

            {audioBlob && (
              <>
                <Button
                  onClick={playRecording}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button
                  onClick={deleteRecording}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
                <Badge variant="secondary">
                  {formatTime(recordingTime)}
                </Badge>
              </>
            )}
          </div>

          <audio ref={audioRef} style={{ display: 'none' }} />
        </div>

        {/* File Upload */}
        <div className="space-y-3">
          <h3 className="font-semibold">Media Files</h3>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <div className="flex gap-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Image className="h-4 w-4" />
              Images
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Video className="h-4 w-4" />
              Videos
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Audio Files
            </Button>
          </div>
        </div>

        {/* Media Preview */}
        {mediaFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Uploaded Media</h4>
            <div className="grid grid-cols-2 gap-3">
              {mediaFiles.map((mediaFile, index) => (
                <div key={index} className="relative border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {mediaFile.type === 'image' && <Image className="h-4 w-4" />}
                      {mediaFile.type === 'video' && <Video className="h-4 w-4" />}
                      {mediaFile.type === 'audio' && <Music className="h-4 w-4" />}
                      <span className="text-sm truncate">{mediaFile.file.name}</span>
                    </div>
                    <Button
                      onClick={() => removeMediaFile(index)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {mediaFile.type === 'image' && (
                    <img 
                      src={mediaFile.url} 
                      alt="Preview" 
                      className="mt-2 w-full h-20 object-cover rounded"
                    />
                  )}
                  
                  {mediaFile.duration && (
                    <Badge variant="secondary" className="text-xs mt-2">
                      {formatTime(Math.floor(mediaFile.duration))}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Posting...' : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Post
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}