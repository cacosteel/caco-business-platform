import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async (request) => {
  const appUrl = "https://app.cacosteel.com/dashboard/gmail";
  try {
    const url = new URL(request.url); const code = url.searchParams.get("code"); const state = url.searchParams.get("state"); if (!code || !state) throw new Error("Missing Google authorization details");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: oauthState } = await admin.from("gmail_oauth_states").select("*").eq("id", state).is("used_at", null).maybeSingle();
    if (!oauthState || new Date(oauthState.expires_at) < new Date()) throw new Error("This connection link has expired. Please try again.");
    const redirectUri = "https://agowppatvzjqnhsfdcdr.supabase.co/functions/v1/gmail-oauth-callback";
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: Deno.env.get("GMAIL_CLIENT_ID")!, client_secret: Deno.env.get("GMAIL_CLIENT_SECRET")!, redirect_uri: redirectUri, grant_type: "authorization_code" }) });
    const tokens = await tokenResponse.json(); if (!tokenResponse.ok || !tokens.refresh_token) throw new Error("Google did not provide a refresh token. Please reconnect and approve access.");
    const identityResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` } }); const identity = await identityResponse.json(); if (!identity.email) throw new Error("Google account email could not be identified");
    const { error: connectionError } = await admin.from("gmail_connections").upsert({ id: true, sender_email: identity.email, refresh_token: tokens.refresh_token, connected_by: oauthState.requested_by, connected_at: new Date().toISOString() }); if (connectionError) throw connectionError;
    await admin.from("gmail_oauth_states").update({ used_at: new Date().toISOString() }).eq("id", state);
    return Response.redirect(`${appUrl}?connected=1`, 302);
  } catch (error) { return Response.redirect(`${appUrl}?error=${encodeURIComponent(error instanceof Error ? error.message : "Gmail connection failed")}`, 302); }
});
