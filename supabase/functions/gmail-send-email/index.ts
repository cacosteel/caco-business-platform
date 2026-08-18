import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const appOrigin = Deno.env.get("APP_ORIGIN") ?? "http://localhost:5173";
const headers = { "Access-Control-Allow-Origin": appOrigin, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };
function base64Url(text: string) { const bytes = new TextEncoder().encode(text); let value = ""; for (const byte of bytes) value += String.fromCharCode(byte); return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  try {
    const authorization = request.headers.get("Authorization"); if (!authorization?.startsWith("Bearer ")) throw new Error("Missing authorization token");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await admin.auth.getUser(authorization.slice(7)); if (!user) throw new Error("You must be signed in");
    const { data: profile } = await admin.from("profiles").select("company_id, role, approval_status").eq("id", user.id).single(); if (!profile || profile.approval_status !== "approved") throw new Error("Your account is not approved");
    const { contactId, templateId, subject, body } = await request.json(); if (!contactId || !subject?.trim() || !body?.trim()) throw new Error("Contact, subject and message are required");
    const { data: contact } = await admin.from("company_contacts").select("id, company_id, first_name, last_name, email").eq("id", contactId).is("deleted_at", null).maybeSingle(); if (!contact?.email) throw new Error("Contact email address was not found");
    if (profile.role !== "admin" && profile.company_id !== contact.company_id) throw new Error("You cannot email this contact");
    const { data: connection } = await admin.from("gmail_connections").select("sender_email, refresh_token").eq("id", true).maybeSingle(); if (!connection) throw new Error("Google Workspace is not connected");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: Deno.env.get("GMAIL_CLIENT_ID")!, client_secret: Deno.env.get("GMAIL_CLIENT_SECRET")!, refresh_token: connection.refresh_token, grant_type: "refresh_token" }) }); const token = await tokenResponse.json(); if (!tokenResponse.ok) throw new Error("Google Workspace authorization expired. Please reconnect it.");
    const recipient = `${contact.first_name}${contact.last_name ? ` ${contact.last_name}` : ""} <${contact.email}>`; const raw = base64Url(`From: ${connection.sender_email}\r\nTo: ${recipient}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body}`);
    const sendResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ raw }) }); const sent = await sendResponse.json(); if (!sendResponse.ok) throw new Error(sent.error?.message ?? "Gmail could not send the message");
    await admin.from("email_messages").insert({ company_id: contact.company_id, contact_id: contact.id, template_id: templateId || null, recipient_email: contact.email, subject: subject.trim(), body: body.trim(), gmail_message_id: sent.id, sent_by: user.id });
    await admin.from("activities").insert({ company_id: contact.company_id, contact_id: contact.id, activity_type: "email", context: `Email sent: ${subject.trim()}`, created_by: user.id });
    return Response.json({ ok: true }, { headers });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Email could not be sent" }, { status: 400, headers }); }
});
