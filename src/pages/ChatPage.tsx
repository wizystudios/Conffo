import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ChatInterface } from '@/components/ChatInterface';
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
    <>
      <Layout>
        <div className="h-full">
          <ChatInterface
            targetUserId={userId}
            onBack={handleBack}
            onCall={handleCall}
          />
        </div>
      </Layout>

      <CallInterface
        isOpen={showCall}
        onClose={() => setShowCall(false)}
        callType={callType}
        targetUserId={userId}
      />
    </>
  );
}