import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const headers = { "Access-Control-Allow-Origin": "https://app.cacosteel.com", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  try {
    const authorization = request.headers.get("Authorization"); if (!authorization?.startsWith("Bearer ")) throw new Error("Missing authorization token");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await admin.auth.getUser(authorization.slice(7)); if (!user) throw new Error("You must be signed in");
    const { data: profile } = await admin.from("profiles").select("role, approval_status").eq("id", user.id).single();
    if (!profile || profile.role !== "admin" || profile.approval_status !== "approved") throw new Error("Only administrators can connect Gmail");
    const state = crypto.randomUUID();
    const { error: stateError } = await admin.from("gmail_oauth_states").insert({ id: state, requested_by: user.id, expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() }); if (stateError) throw stateError;
    const redirectUri = "https://agowppatvzjqnhsfdcdr.supabase.co/functions/v1/gmail-oauth-callback";
    const params = new URLSearchParams({ client_id: Deno.env.get("GMAIL_CLIENT_ID")!, redirect_uri: redirectUri, response_type: "code", scope: "https://www.googleapis.com/auth/gmail.send openid email", access_type: "offline", prompt: "consent", state });
    return Response.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` }, { headers: { ...headers, "Content-Type": "application/json" } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Gmail connection failed" }, { status: 400, headers: { ...headers, "Content-Type": "application/json" } }); }
});
