import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserX } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getBlockedUsers, unblockUser } from '@/services/blockService';
import { toast } from '@/hooks/use-toast';

type ProfileLite = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

export default function BlockedUsersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  const { data: blocks = [], isLoading: isLoadingBlocks } = useQuery({
    queryKey: ['blocked-users', user?.id],
    queryFn: getBlockedUsers,
    enabled: !!user?.id,
  });

  const blockedIds = useMemo(() => blocks.map((b) => b.blocked_id), [blocks]);

  const { data: profiles = [], isLoading: isLoadingProfiles } = useQuery({
    queryKey: ['blocked-profiles', blockedIds.join(',')],
    enabled: blockedIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', blockedIds);

      if (error) throw error;
      return (data || []) as ProfileLite[];
    },
  });

  const isLoading = isLoadingBlocks || isLoadingProfiles;

  const handleUnblock = async (blockedId: string) => {
    const ok = await unblockUser(blockedId);
    if (!ok) {
      toast({
        title: 'Error',
        description: 'Failed to unblock user',
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Unblocked' });

    await queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
    await queryClient.invalidateQueries({ queryKey: ['blocked-profiles'] });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <UserX className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground mb-4">Please log in to manage blocked users.</p>
        <Button onClick={() => navigate('/auth')}>Login</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-semibold">Blocked Users</h1>
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : blockedIds.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            You havent blocked anyone.
          </div>
        ) : (
          <div className="space-y-2">
            {profiles.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={p.avatar_url || ''} />
                    <AvatarFallback>{(p.username || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">@{p.username || 'user'}</div>
                  </div>
                </div>

                <Button variant="outline" size="sm" onClick={() => handleUnblock(p.id)}>
                  Unblock
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
