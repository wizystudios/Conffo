import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ModernChatInterface } from '@/components/ModernChatInterface';

export default function ChatPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  if (!userId) {
    return <div>Invalid chat</div>;
  }

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <ModernChatInterface
        targetUserId={userId}
        onBack={handleBack}
      />
    </div>
  );
}