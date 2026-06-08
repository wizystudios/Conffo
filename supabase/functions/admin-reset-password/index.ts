// One-shot password set for the super admin. Will be deleted immediately after use.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPER_ADMIN_ID = "877d042f-82b8-48a6-befd-88982103c22c";
const NEW_PASSWORD = "5112Kharif@1";

Deno.serve(async () => {
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error } = await admin.auth.admin.updateUserById(SUPER_ADMIN_ID, {
      password: NEW_PASSWORD, email_confirm: true,
    });
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
