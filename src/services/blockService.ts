import { supabase } from '@/integrations/supabase/client';

export interface BlockInfo {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

// Block a user
export const blockUser = async (blockedId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('user_blocks')
    .insert({
      blocker_id: user.id,
      blocked_id: blockedId
    });

  return !error;
};

// Unblock a user
export const unblockUser = async (blockedId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', blockedId);

  return !error;
};

// Check if a user is blocked
export const isUserBlocked = async (blockedId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('user_blocks')
    .select('id')
    .eq('blocker_id', user.id)
    .eq('blocked_id', blockedId)
    .maybeSingle();

  return !error && !!data;
};

// Check if either user has blocked the other
export const areUsersBlocked = async (userId1: string, userId2: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('id')
    .or(`and(blocker_id.eq.${userId1},blocked_id.eq.${userId2}),and(blocker_id.eq.${userId2},blocked_id.eq.${userId1})`)
    .maybeSingle();

  return !error && !!data;
};

// Get list of users you've blocked
export const getBlockedUsers = async (): Promise<BlockInfo[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_blocks')
    .select('*')
    .eq('blocker_id', user.id)
    .order('created_at', { ascending: false });

  return error ? [] : (data || []);
};

// Get list of users who blocked you
export const getBlockedByUsers = async (): Promise<BlockInfo[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_blocks')
    .select('*')
    .eq('blocked_id', user.id)
    .order('created_at', { ascending: false });

  return error ? [] : (data || []);
};
