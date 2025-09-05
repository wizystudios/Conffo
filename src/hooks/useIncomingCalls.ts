import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { CallSignal } from '@/services/webRTCService';

export function useIncomingCalls() {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<CallSignal | null>(null);

  useEffect(() => {
    if (!user) return;

    // Subscribe to incoming calls
    const channel = supabase
      .channel(`user_${user.id}_calls`)
      .on('broadcast', { event: 'call_signal' }, (payload) => {
        const signal = payload.payload as CallSignal;
        if (signal.to === user.id && signal.type === 'offer') {
          setIncomingCall(signal);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const clearIncomingCall = () => {
    setIncomingCall(null);
  };

  return { incomingCall, clearIncomingCall };
}