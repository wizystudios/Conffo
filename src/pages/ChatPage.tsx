import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ModernChatInterface } from '@/components/ModernChatInterface';
import { CallInterface } from '@/components/CallInterface';

export default function ChatPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [showCall, setShowCall] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');

  if (!userId) {
    return <div>Invalid chat</div>;
  }

  const handleCall = (type: 'audio' | 'video') => {
    setCallType(type);
    setShowCall(true);
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="h-screen flex flex-col">
      <ModernChatInterface
        targetUserId={userId}
        onBack={handleBack}
        onCall={handleCall}
      />

      <CallInterface
        isOpen={showCall}
        onClose={() => setShowCall(false)}
        callType={callType}
        targetUserId={userId}
      />
    </div>
  );
}