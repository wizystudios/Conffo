import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Send, X, Loader2, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptic } from '@/utils/hapticFeedback';

interface AudioCommentRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number, waveform: number[]) => void;
  onCancel: () => void;
  isUploading?: boolean;
}

export function AudioCommentRecorder({ onRecordingComplete, onCancel, isUploading }: AudioCommentRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [capturedWaveform, setCapturedWaveform] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const waveformHistoryRef = useRef<number[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const captureWaveform = useCallback(() => {
    if (!analyserRef.current) return;
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const updateWaveform = () => {
      if (!isRecording) return;
      
      analyser.getByteFrequencyData(dataArray);
      
      // Sample 20 values for live visualization
      const samples = 20;
      const step = Math.floor(bufferLength / samples);
      const values: number[] = [];
      
      for (let i = 0; i < samples; i++) {
        const value = dataArray[i * step];
        values.push(value / 255);
      }
      
      setWaveformData(values);
      
      // Capture average for final waveform (30 samples)
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      waveformHistoryRef.current.push(Math.max(0.1, avg));
      
      animationFrameRef.current = requestAnimationFrame(updateWaveform);
    };
    
    updateWaveform();
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio context for real waveform visualization
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      audioContextRef.current = audioContext;
      waveformHistoryRef.current = [];
      
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
        setAudioUrl(URL.createObjectURL(blob));
        
        // Create final waveform from history - sample to 30 points
        const history = waveformHistoryRef.current;
        const finalWaveform: number[] = [];
        const step = Math.max(1, Math.floor(history.length / 30));
        
        for (let i = 0; i < 30; i++) {
          const idx = Math.min(i * step, history.length - 1);
          finalWaveform.push(history[idx] || 0.2);
        }
        
        setCapturedWaveform(finalWaveform);
        
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      haptic.light();

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Start capturing real waveform
      setTimeout(() => captureWaveform(), 100);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      haptic.medium();
    }
  };

  const handleSend = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob, recordingTime, capturedWaveform);
    }
  };

  const handleCancel = () => {
    if (isRecording) {
      stopRecording();
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setWaveformData([]);
    setCapturedWaveform([]);
    setRecordingTime(0);
    onCancel();
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
      {!audioBlob ? (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={handleCancel}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 flex items-center gap-2">
            {/* Live waveform visualization */}
            <div className="flex-1 flex items-center justify-center gap-0.5 h-8">
              {isRecording && waveformData.length > 0 ? (
                waveformData.map((value, index) => (
                  <div
                    key={index}
                    className="w-1 bg-primary rounded-full transition-all duration-75"
                    style={{ height: `${Math.max(4, value * 28)}px` }}
                  />
                ))
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Tap to record</span>
                </div>
              )}
            </div>
            
            {isRecording && (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-medium font-mono">{formatTime(recordingTime)}</span>
              </div>
            )}
          </div>
          
          {isRecording ? (
            <Button
              variant="destructive"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={stopRecording}
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="default"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={startRecording}
            >
              <Mic className="h-5 w-5" />
            </Button>
          )}
        </>
      ) : (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={handleCancel}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlayback}
              className="h-8 w-8"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            
            {/* Captured real waveform */}
            <div className="flex-1 flex items-center justify-center gap-0.5 h-8">
              {capturedWaveform.map((value, index) => (
                <div
                  key={index}
                  className="w-1 bg-primary rounded-full"
                  style={{ height: `${Math.max(4, value * 28)}px` }}
                />
              ))}
            </div>
            
            <span className="text-sm font-mono text-muted-foreground">{formatTime(recordingTime)}</span>
          </div>
          
          <Button
            variant="default"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={handleSend}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
          
          <audio
            ref={audioRef}
            src={audioUrl || undefined}
            onEnded={() => setIsPlaying(false)}
            hidden
          />
        </>
      )}
    </div>
  );
}
