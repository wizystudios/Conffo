import { useState, useCallback } from 'react';

export function useSuccessAnimation() {
  const [showAnimation, setShowAnimation] = useState(false);
  const [message, setMessage] = useState('Success!');

  const triggerSuccess = useCallback((customMessage?: string) => {
    setMessage(customMessage || 'Success!');
    setShowAnimation(true);
  }, []);

  const hideAnimation = useCallback(() => {
    setShowAnimation(false);
  }, []);

  return {
    showAnimation,
    message,
    triggerSuccess,
    hideAnimation,
  };
}