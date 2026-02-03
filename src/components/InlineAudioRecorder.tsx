import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { haptic } from '@/utils/hapticFeedback';

interface InlineAudioRecorderProps {
  confessionId: string;
  onCommentPosted: () => void;
  userId: string;
}

export function InlineAudioRecorder({ confessionId, onCommentPosted, userId }: InlineAudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      haptic.light();

      // Timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: 'Microphone access denied',
        description: 'Please allow microphone access to record audio comments',
        variant: 'destructive'
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      haptic.medium();
    }
  };

  const cancelRecording = () => {
    setAudioBlob(null);
    setRecordingTime(0);
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const sendAudioComment = async () => {
    if (!audioBlob || !userId) return;

    setIsUploading(true);
    try {
      // Upload audio to storage - use the correct bucket name: comment_audio
      const fileName = `${userId}/${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('comment_audio')
        .upload(fileName, audioBlob, { 
          contentType: 'audio/webm',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload audio file');
      }

      const { data: { publicUrl } } = supabase.storage
        .from('comment_audio')
        .getPublicUrl(fileName);

      // Create comment with audio
      const { error: commentError } = await supabase
        .from('comments')
        .insert({
          confession_id: confessionId,
          user_id: userId,
          content: '🎤 Voice comment',
          audio_url: publicUrl,
          audio_duration_seconds: recordingTime
        });

      if (commentError) {
        console.error('Comment error:', commentError);
        throw commentError;
      }

      toast({ title: 'Audio comment posted!' });
      haptic.success();
      onCommentPosted();
      cancelRecording();
    } catch (error: any) {
      console.error('Error posting audio comment:', error);
      toast({
        title: 'Failed to post audio comment',
        description: error?.message || 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Not recording, no audio - show mic button
  if (!isRecording && !audioBlob) {
    return (
      <button
        onClick={startRecording}
        className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
        title="Record audio comment"
      >
        <Mic className="h-4 w-4 text-primary" />
      </button>
    );
  }

  // Recording in progress
  if (isRecording) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 rounded-full">
        <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
        <span className="text-xs text-destructive font-medium">{formatTime(recordingTime)}</span>
        <button
          onClick={stopRecording}
          className="p-1.5 rounded-full bg-destructive hover:bg-destructive/80 transition-colors"
        >
          <Square className="h-3 w-3 text-white fill-white" />
        </button>
      </div>
    );
  }

  // Has recorded audio, ready to send
  if (audioBlob) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
        <span className="text-xs text-primary font-medium">{formatTime(recordingTime)}</span>
        <button
          onClick={cancelRecording}
          className="p-1.5 rounded-full hover:bg-destructive/10 transition-colors"
        >
          <X className="h-3 w-3 text-destructive" />
        </button>
        <button
          onClick={sendAudioComment}
          disabled={isUploading}
          className="p-1.5 rounded-full bg-primary hover:bg-primary/80 transition-colors"
        >
          {isUploading ? (
            <Loader2 className="h-3 w-3 text-white animate-spin" />
          ) : (
            <Send className="h-3 w-3 text-white" />
          )}
        </button>
      </div>
    );
  }

  return null;
}
