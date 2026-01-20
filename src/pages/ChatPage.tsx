import { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { UnifiedChatInterface } from '@/components/UnifiedChatInterface';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { areUsersBlocked } from '@/services/blockService';
import { toast } from '@/hooks/use-toast';

export default function ChatPage() {
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const highlightMessageId = searchParams.get('messageId');
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
    <Layout hideBottomNav>
      <div className="h-[calc(100vh-60px)] lg:h-screen flex flex-col">
        <UnifiedChatInterface 
          targetUserId={userId} 
          onBack={handleBack} 
          highlightMessageId={highlightMessageId || undefined}
        />
      </div>
    </Layout>
  );
}