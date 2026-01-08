import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UnifiedChatInterface } from '@/components/UnifiedChatInterface';
import { useAuth } from '@/context/AuthContext';
import { areUsersBlocked } from '@/services/blockService';
import { toast } from '@/hooks/use-toast';

export default function ChatPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id || !userId) return;

    (async () => {
      const blocked = await areUsersBlocked(user.id, userId);
      if (blocked) {
        toast({
          title: 'Blocked',
          description: "You can't start a conversation with this user.",
          variant: 'destructive',
        });
        navigate(-1);
      }
    })();
  }, [user?.id, userId, navigate]);

  if (!userId) {
    return <div>Invalid chat</div>;
  }

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <UnifiedChatInterface targetUserId={userId} onBack={handleBack} />
    </div>
  );
}