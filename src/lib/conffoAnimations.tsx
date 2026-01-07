import React, { useEffect, useState } from 'react';

// Conffo Ripple Effect Component
export function ConffoRipple({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  const handleRipple = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ripple = document.createElement('span');
    ripple.className = 'conffo-ripple-effect';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    target.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  };

  return (
    <div 
      className={`conffo-ripple-container ${className}`}
      onClick={handleRipple}
    >
      {children}
    </div>
  );
}

// Conffo Spinner Component
export function ConffoSpinner({ 
  size = 'md',
  className = ''
}: { 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`conffo-spinner ${sizeClasses[size]} ${className}`}>
      <div className="conffo-spinner-ring" />
      <div className="conffo-spinner-ring" />
      <div className="conffo-spinner-ring" />
    </div>
  );
}

// Conffo Page Transition Wrapper
export function ConffoPageTransition({ 
  children,
  className = ''
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={`conffo-page-transition ${isVisible ? 'conffo-page-visible' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

// Conffo Fade In Component
export function ConffoFadeIn({ 
  children,
  delay = 0,
  className = ''
}: { 
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div 
      className={`conffo-fade-in ${isVisible ? 'conffo-fade-visible' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

// Conffo Scale In Component
export function ConffoScaleIn({ 
  children,
  delay = 0,
  className = ''
}: { 
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div 
      className={`conffo-scale-in ${isVisible ? 'conffo-scale-visible' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

// Conffo Slide Up Component
export function ConffoSlideUp({ 
  children,
  delay = 0,
  className = ''
}: { 
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div 
      className={`conffo-slide-up ${isVisible ? 'conffo-slide-visible' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

// Conffo Pulse Component
export function ConffoPulse({ 
  children,
  className = ''
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`conffo-pulse ${className}`}>
      {children}
    </div>
  );
}
