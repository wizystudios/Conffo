
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Image, Video, Type, Smile, Sparkles, X, Plus, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { createStory } from '@/services/storyService';
import { StoryEffects, StoryText, StorySticker } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface StoryCreatorProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function StoryCreator({ onSuccess, onCancel }: StoryCreatorProps) {
  const { user } = useAuth();
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [activeTab, setActiveTab] = useState<string>('camera');
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  // Effects state
  const [effects, setEffects] = useState<StoryEffects>({
    filters: {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0
    },
    text: [],
    stickers: [],
    beautyMode: false
  });
  
  const [textInput, setTextInput] = useState('');
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setMediaFile(file);
      
      // Determine media type
      if (file.type.startsWith('image/')) {
        setMediaType('image');
      } else if (file.type.startsWith('video/')) {
        setMediaType('video');
      }
      
      // Create a preview URL
      const previewUrl = URL.createObjectURL(file);
      setMediaPreview(previewUrl);
      setActiveTab('edit');
    }
  };

  const startCamera = async () => {
    try {
      // Stop any existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      const constraints = {
        video: {
          facingMode: 'user', // Use front camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access your camera. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const takePicture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the video frame to the canvas
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert the canvas to a Blob
        canvas.toBlob((blob) => {
          if (blob) {
            // Create a File object from the Blob
            const file = new File([blob], "camera-photo.jpg", { type: "image/jpeg" });
            setMediaFile(file);
            setMediaType('image');
            setMediaPreview(URL.createObjectURL(blob));
            setActiveTab('edit');
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  const startRecording = () => {
    if (stream && !isRecording) {
      recordedChunksRef.current = [];
      try {
        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType: 'video/webm'
        });
        
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };
        
        mediaRecorderRef.current.onstop = () => {
          const recordedBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const file = new File([recordedBlob], "camera-video.webm", { type: "video/webm" });
          setMediaFile(file);
          setMediaType('video');
          setMediaPreview(URL.createObjectURL(recordedBlob));
          setActiveTab('edit');
        };
        
        mediaRecorderRef.current.start();
        setIsRecording(true);
        
        // Auto-stop after 15 seconds
        setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            stopRecording();
          }
        }, 15000); // 15 seconds max
        
      } catch (error) {
        console.error('Error starting recording:', error);
        toast({
          title: "Recording Error",
          description: "Unable to record video. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFilterChange = (type: keyof Required<StoryEffects>['filters'], value: number) => {
    setEffects(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [type]: value
      }
    }));
  };

  const toggleBeautyMode = () => {
    setEffects(prev => ({
      ...prev,
      beautyMode: !prev.beautyMode
    }));
  };

  const addText = () => {
    if (textInput.trim()) {
      const newText: StoryText = {
        id: uuidv4(),
        content: textInput,
        position: { x: 50, y: 50 }, // Center of the canvas
        style: {
          fontSize: 24,
          color: '#ffffff',
          fontFamily: 'Arial',
          isBold: false,
          isItalic: false
        }
      };
      
      setEffects(prev => ({
        ...prev,
        text: [...(prev.text || []), newText]
      }));
      
      setTextInput('');
      setActiveTextId(newText.id);
    }
  };

  const addSticker = (type: string) => {
    const newSticker: StorySticker = {
      id: uuidv4(),
      type,
      position: { x: 50, y: 50 }, // Center of the canvas
      scale: 1,
      rotation: 0
    };
    
    setEffects(prev => ({
      ...prev,
      stickers: [...(prev.stickers || []), newSticker]
    }));
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    if (value === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  };

  const handleSubmit = async () => {
    if (!user || !mediaFile) {
      toast({
        title: "Error",
        description: "You must be logged in and have media selected to create a story",
        variant: "destructive"
      });
      return;
    }
    
    setIsCreating(true);
    
    try {
      const result = await createStory(
        user.id,
        mediaFile,
        caption,
        effects
      );
      
      if (result) {
        toast({
          title: "Success",
          description: "Your story has been created!",
          variant: "default"
        });
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error("Failed to create story");
      }
    } catch (error) {
      console.error('Error creating story:', error);
      toast({
        title: "Error",
        description: "Failed to create your story. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
      stopCamera();
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (mediaPreview) {
        URL.revokeObjectURL(mediaPreview);
      }
    };
  }, [mediaPreview]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Create Story
          {onCancel && (
            <Button variant="outline" size="icon" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="camera">Camera</TabsTrigger>
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
            <TabsTrigger value="edit" disabled={!mediaPreview}>Edit</TabsTrigger>
          </TabsList>
          
          <TabsContent value="camera" className="space-y-4">
            <div className="relative aspect-video bg-black rounded-md overflow-hidden">
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover" 
                playsInline 
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
                {!isRecording ? (
                  <>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="rounded-full bg-white/20 backdrop-blur"
                      onClick={takePicture}
                    >
                      <Camera className="h-5 w-5" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="rounded-full bg-white/20 backdrop-blur"
                      onClick={startRecording}
                    >
                      <Video className="h-5 w-5" />
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="rounded-full animate-pulse"
                    onClick={stopRecording}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="gallery" className="space-y-4">
            <div className="grid place-items-center h-48 border-2 border-dashed rounded-md">
              <div className="text-center">
                <Button onClick={triggerFileInput} variant="outline" className="mb-2">
                  <Plus className="mr-2 h-4 w-4" />
                  Select Media
                </Button>
                <p className="text-sm text-muted-foreground">
                  Upload an image or video
                </p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  className="hidden" 
                  accept="image/*,video/*" 
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="edit" className="space-y-4">
            {mediaPreview && (
              <div className="relative aspect-video bg-black rounded-md overflow-hidden">
                {mediaType === 'image' ? (
                  <img 
                    src={mediaPreview} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                    style={{
                      filter: `
                        brightness(${effects.filters?.brightness || 100}%) 
                        contrast(${effects.filters?.contrast || 100}%) 
                        saturate(${effects.filters?.saturation || 100}%) 
                        blur(${effects.filters?.blur || 0}px)
                      `
                    }}
                  />
                ) : (
                  <video 
                    src={mediaPreview} 
                    className="w-full h-full object-cover" 
                    controls
                    style={{
                      filter: `
                        brightness(${effects.filters?.brightness || 100}%) 
                        contrast(${effects.filters?.contrast || 100}%) 
                        saturate(${effects.filters?.saturation || 100}%) 
                        blur(${effects.filters?.blur || 0}px)
                      `
                    }}
                  />
                )}
                
                {/* Render text overlays */}
                {effects.text?.map((text) => (
                  <div
                    key={text.id}
                    className="absolute"
                    style={{
                      left: `${text.position.x}%`,
                      top: `${text.position.y}%`,
                      transform: 'translate(-50%, -50%)',
                      cursor: 'move',
                      padding: '8px',
                      backgroundColor: activeTextId === text.id ? 'rgba(0,0,0,0.2)' : 'transparent',
                      borderRadius: '4px'
                    }}
                    onClick={() => setActiveTextId(text.id)}
                  >
                    <p
                      style={{
                        fontSize: `${text.style?.fontSize || 24}px`,
                        fontFamily: text.style?.fontFamily || 'Arial',
                        color: text.style?.color || '#ffffff',
                        fontWeight: text.style?.isBold ? 'bold' : 'normal',
                        fontStyle: text.style?.isItalic ? 'italic' : 'normal',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                        margin: 0
                      }}
                    >
                      {text.content}
                    </p>
                  </div>
                ))}
                
                {/* Render stickers */}
                {effects.stickers?.map((sticker) => (
                  <div
                    key={sticker.id}
                    className="absolute"
                    style={{
                      left: `${sticker.position.x}%`,
                      top: `${sticker.position.y}%`,
                      transform: `translate(-50%, -50%) scale(${sticker.scale || 1}) rotate(${sticker.rotation || 0}deg)`,
                      cursor: 'move'
                    }}
                  >
                    {/* Render different stickers based on type */}
                    {sticker.type === 'heart' && (
                      <div className="text-4xl">❤️</div>
                    )}
                    {sticker.type === 'star' && (
                      <div className="text-4xl">⭐</div>
                    )}
                    {sticker.type === 'fire' && (
                      <div className="text-4xl">🔥</div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <Input 
              placeholder="Add a caption..." 
              value={caption} 
              onChange={(e) => setCaption(e.target.value)} 
            />
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Brightness</label>
                <Slider 
                  defaultValue={[100]} 
                  min={0} 
                  max={200} 
                  step={1}
                  value={[effects.filters?.brightness || 100]}
                  onValueChange={(value) => handleFilterChange('brightness', value[0])}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-1">Contrast</label>
                <Slider 
                  defaultValue={[100]} 
                  min={0} 
                  max={200} 
                  step={1}
                  value={[effects.filters?.contrast || 100]}
                  onValueChange={(value) => handleFilterChange('contrast', value[0])}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-1">Saturation</label>
                <Slider 
                  defaultValue={[100]} 
                  min={0} 
                  max={200} 
                  step={1}
                  value={[effects.filters?.saturation || 100]}
                  onValueChange={(value) => handleFilterChange('saturation', value[0])}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-1">Blur</label>
                <Slider 
                  defaultValue={[0]} 
                  min={0} 
                  max={10} 
                  step={0.1}
                  value={[effects.filters?.blur || 0]}
                  onValueChange={(value) => handleFilterChange('blur', value[0])}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium block">Add Text</label>
              <div className="flex space-x-2">
                <Input 
                  placeholder="Enter text..." 
                  value={textInput} 
                  onChange={(e) => setTextInput(e.target.value)} 
                />
                <Button variant="secondary" onClick={addText}>
                  <Type className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium block">Add Stickers</label>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => addSticker('heart')}>❤️</Button>
                <Button variant="outline" onClick={() => addSticker('star')}>⭐</Button>
                <Button variant="outline" onClick={() => addSticker('fire')}>🔥</Button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant={effects.beautyMode ? "default" : "outline"}
                onClick={toggleBeautyMode}
                className="w-full"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Beauty Mode {effects.beautyMode ? 'On' : 'Off'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={!mediaFile || isCreating}
        >
          {isCreating ? 'Creating...' : 'Share Story'}
        </Button>
      </CardFooter>
    </Card>
  );
}
