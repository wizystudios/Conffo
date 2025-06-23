
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, Heart, MessageCircle, Users, Sparkles } from 'lucide-react';

interface WelcomeScreenProps {
  onComplete: () => void;
}

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to ConfessZone",
      description: "Share your thoughts anonymously with the world",
      icon: Heart,
      color: "text-pink-500"
    },
    {
      title: "Connect & Discover", 
      description: "Follow users and discover amazing content",
      icon: Users,
      color: "text-blue-500"
    },
    {
      title: "Express Yourself",
      description: "Comment, react, and engage with the community",
      icon: MessageCircle,
      color: "text-green-500"
    }
  ];

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-purple-600 via-blue-600 to-teal-600 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8 animate-fade-in">
        {/* Icon Animation */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse"></div>
          <div className="relative bg-white rounded-full p-8 mx-auto w-24 h-24 flex items-center justify-center animate-scale-in">
            <Icon className={`h-12 w-12 ${currentStepData.color}`} />
          </div>
          <div className="absolute -top-2 -right-2">
            <Sparkles className="h-6 w-6 text-yellow-300 animate-pulse" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 text-white">
          <h1 className="text-3xl font-bold animate-fade-in">
            {currentStepData.title}
          </h1>
          <p className="text-lg opacity-90 animate-fade-in">
            {currentStepData.description}
          </p>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center space-x-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentStep 
                  ? 'bg-white scale-125' 
                  : index < currentStep 
                    ? 'bg-white/80' 
                    : 'bg-white/40'
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex justify-between items-center pt-4">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            Skip
          </Button>
          
          <Button
            onClick={handleNext}
            className="bg-white text-purple-600 hover:bg-white/90 font-semibold px-6"
          >
            {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
