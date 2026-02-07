import { useState } from 'react';
import { X, MessageCircle, Users, Shield, Crown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CommunityOnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  communityName: string;
}

const TOUR_STEPS = [
  {
    icon: MessageCircle,
    title: 'Group Chat',
    description: 'This is your group chat space. Send text, images, audio, and videos to all members.',
  },
  {
    icon: Users,
    title: 'Members',
    description: 'View all community members. The creator and admins manage the group.',
  },
  {
    icon: Crown,
    title: 'Roles',
    description: 'Creator (👑) manages everything. Admins help moderate. Members can chat freely.',
  },
  {
    icon: Shield,
    title: 'Guidelines',
    description: 'Be respectful, no spam or harassment. Admins can remove anyone who violates the rules.',
  },
];

export function CommunityOnboardingTour({ isOpen, onClose, communityName }: CommunityOnboardingTourProps) {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const current = TOUR_STEPS[step];
  const Icon = current.icon;
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-6" onClick={onClose}>
      <div 
        className="bg-background rounded-2xl w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground font-medium">
              Welcome to {communityName}
            </span>
          </div>
          <button onClick={onClose} className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step content */}
        <div className="text-center py-4 space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-lg font-bold">{current.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="flex-1 rounded-xl"
            >
              Back
            </Button>
          )}
          <Button
            onClick={() => {
              if (isLast) {
                onClose();
              } else {
                setStep(step + 1);
              }
            }}
            className="flex-1 rounded-xl"
          >
            {isLast ? 'Got it!' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
