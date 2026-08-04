import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://app.cacosteel.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) throw new Error("Missing authorization token");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const token = authorization.slice("Bearer ".length);
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("You must be signed in");

    const { data: administrator } = await admin.from("profiles").select("id, role, approval_status").eq("id", user.id).single();
    if (!administrator || administrator.role !== "admin" || administrator.approval_status !== "approved") throw new Error("Only administrators can invite users");

    const { email, companyId, role = "member" } = await request.json();
    if (typeof email !== "string" || !email.trim() || typeof companyId !== "string" || !companyId) throw new Error("Email and company are required");
    if (role !== "member" && role !== "admin") throw new Error("Invalid role");
    const normalizedEmail = email.trim().toLowerCase();

    const { data: company } = await admin.from("companies").select("id").eq("id", companyId).is("deleted_at", null).maybeSingle();
    if (!company) throw new Error("Company not found");

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
      redirectTo: Deno.env.get("INVITE_REDIRECT_URL") ?? "https://app.cacosteel.com/invite",
      data: {
        company_id: companyId,
        invited_by_admin: true,
        invited_by: user.id,
        invited_role: role,
      },
    });
    if (inviteError || !invited.user) throw inviteError ?? new Error("Invitation could not be created");

    const { error: profileError } = await admin.from("profiles").upsert({
      id: invited.user.id,
      email: normalizedEmail,
      company_id: companyId,
      role,
      approval_status: "pending",
    }, { onConflict: "id" });
    if (profileError) throw profileError;

    const { error: recordError } = await admin.from("platform_invitations").upsert({
      email: normalizedEmail,
      company_id: companyId,
      role,
      auth_user_id: invited.user.id,
      invited_by: user.id,
      status: "invited",
      accepted_at: null,
    }, { onConflict: "auth_user_id" });
    if (recordError) throw recordError;

    return Response.json({ ok: true }, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invitation failed" }, { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
