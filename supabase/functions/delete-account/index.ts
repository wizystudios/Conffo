// Permanently deletes the calling user's account.
// Caller must be authenticated; we verify the JWT in-code, then use the
// service-role client to cascade-delete profile data and the auth user.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Best-effort cascade — ignore individual failures so we always reach
    // the auth.users delete at the end.
    const tables = [
      'reactions', 'comments', 'comment_likes', 'saved_confessions',
      'confessions', 'stories', 'messages', 'message_requests',
      'conversations', 'user_follows', 'user_blocks', 'notifications',
      'community_members', 'communities', 'user_activity_log', 'profiles',
    ];
    for (const t of tables) {
      try {
        if (t === 'user_follows') {
          await admin.from(t).delete().or(`follower_id.eq.${userId},following_id.eq.${userId}`);
        } else if (t === 'user_blocks') {
          await admin.from(t).delete().or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
        } else if (t === 'messages' || t === 'message_requests') {
          await admin.from(t).delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
        } else if (t === 'conversations') {
          await admin.from(t).delete().or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`);
        } else if (t === 'communities') {
          await admin.from(t).delete().eq('creator_id', userId);
        } else if (t === 'profiles') {
          await admin.from(t).delete().eq('id', userId);
        } else {
          await admin.from(t).delete().eq('user_id', userId);
        }
      } catch (_) { /* ignore */ }
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) throw delErr;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('delete-account error', e);
    return new Response(JSON.stringify({ error: e?.message || 'failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
