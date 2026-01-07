import { useState, useRef } from 'react';
import { Camera, User, Sparkles, MessageSquare, ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { compressImage } from '@/utils/imageCompression';

interface ConffoOnboardingProps {
  onComplete: () => void;
}

const INTEREST_OPTIONS = [
  '🎵 Music', '🎬 Movies', '📚 Books', '🎮 Gaming', '⚽ Sports',
  '🎨 Art', '📷 Photography', '✈️ Travel', '🍳 Cooking', '💪 Fitness',
  '🧘 Wellness', '💻 Tech', '🎭 Theater', '🌱 Nature', '🐾 Pets'
];

export function ConffoOnboarding({ onComplete }: ConffoOnboardingProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = [
    { icon: User, title: 'Choose Username', subtitle: 'How should we call you?' },
    { icon: Camera, title: 'Add Your Photo', subtitle: 'Let others recognize you' },
    { icon: Sparkles, title: 'Your Interests', subtitle: 'Connect with like-minded people' },
    { icon: MessageSquare, title: 'Ready to Share', subtitle: 'Your first confession awaits' },
  ];

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const compressed = await compressImage(file, 0.5);
      setAvatarFile(compressed);
    } catch {
      setAvatarFile(file);
    }
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleNext = () => {
    if (currentStep === 0 && !username.trim()) {
      toast({ variant: 'destructive', description: 'Please enter a username' });
      return;
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      let uploadedAvatarUrl = avatarUrl;
      
      // Upload avatar if selected
      if (avatarFile) {
        const fileName = `${user.id}/avatar_${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { cacheControl: '3600', upsert: true });
        
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
          uploadedAvatarUrl = urlData?.publicUrl || avatarUrl;
        }
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim() || undefined,
          avatar_url: uploadedAvatarUrl || undefined,
          interests: selectedInterests.length > 0 ? selectedInterests : undefined,
          onboarding_completed: true,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({ description: '🎉 Welcome to Conffo!' });
      onComplete();
    } catch (error) {
      console.error('Onboarding error:', error);
      toast({ variant: 'destructive', description: 'Failed to save profile' });
    } finally {
      setIsLoading(false);
    }
  };

  const skipOnboarding = async () => {
    if (!user) return;
    
    await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.id);
    
    onComplete();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="h-20 w-20 mx-auto mb-4 rounded-2xl bg-primary/20 flex items-center justify-center">
                <User className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{steps[0].title}</h2>
              <p className="text-muted-foreground">{steps[0].subtitle}</p>
            </div>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username..."
              className="h-14 text-lg text-center rounded-2xl"
              maxLength={20}
            />
          </div>
        );
      
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">{steps[1].title}</h2>
              <p className="text-muted-foreground">{steps[1].subtitle}</p>
            </div>
            <div className="flex justify-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="relative group"
              >
                <Avatar className="h-32 w-32 border-4 border-primary/30 group-hover:border-primary transition-colors">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="text-4xl bg-muted">
                    {username.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 h-10 w-10 bg-primary rounded-full flex items-center justify-center shadow-lg">
                  <Camera className="h-5 w-5 text-primary-foreground" />
                </div>
              </button>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Tap to upload a photo
            </p>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">{steps[2].title}</h2>
              <p className="text-muted-foreground">{steps[2].subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {INTEREST_OPTIONS.map((interest) => (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedInterests.includes(interest)
                      ? 'bg-primary text-primary-foreground scale-105'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Select at least 3 interests
            </p>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-6 text-center">
            <div className="h-24 w-24 mx-auto rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
              <Check className="h-12 w-12 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">You're All Set!</h2>
              <p className="text-muted-foreground">
                Welcome to Conffo, {username || 'friend'}! Start sharing your confessions and connect with others.
              </p>
            </div>
            <div className="flex items-center justify-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback>{username.charAt(0).toUpperCase() || '?'}</AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="font-semibold">{username || 'Anonymous'}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedInterests.slice(0, 3).join(' • ')}
                </p>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Progress Indicator - Unique Conffo style */}
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </span>
          <button
            onClick={skipOnboarding}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Skip
          </button>
        </div>
        <div className="flex gap-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                index <= currentStep 
                  ? 'bg-primary' 
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center p-6">
        <div className="conffo-fade-in conffo-fade-visible">
          {renderStep()}
        </div>
      </div>

      {/* Navigation */}
      <div className="p-6 pt-0 flex gap-3">
        {currentStep > 0 && (
          <Button
            variant="outline"
            onClick={handleBack}
            className="h-14 px-6 rounded-2xl"
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            Back
          </Button>
        )}
        
        {currentStep < steps.length - 1 ? (
          <Button
            onClick={handleNext}
            className="flex-1 h-14 rounded-2xl text-lg font-semibold"
          >
            Continue
            <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleComplete}
            disabled={isLoading}
            className="flex-1 h-14 rounded-2xl text-lg font-semibold"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Start Exploring
                <Sparkles className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
