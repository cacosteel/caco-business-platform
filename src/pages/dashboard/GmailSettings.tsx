import { Button, Paper, Stack, Text, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { getGmailStatus, startGmailConnection, type GmailStatus } from "../../services/gmailService";
export default function GmailSettings() {
  const [status, setStatus] = useState<GmailStatus | null>(null); const [saving, setSaving] = useState(false); const [params] = useSearchParams();
  useEffect(() => { void getGmailStatus().then(setStatus).catch(() => toast.error("Gmail connection status could not be loaded.")); if (params.get("connected")) toast.success("Google Workspace connected."); if (params.get("error")) toast.error(params.get("error")!); }, [params]);
  async function connect() { setSaving(true); try { window.location.assign(await startGmailConnection()); } catch (error) { toast.error(error instanceof Error ? error.message : "Gmail connection could not be started."); setSaving(false); } }
  return <Paper maw={680} withBorder p="md"><Stack><div><Title order={1}>Google Workspace</Title><Text c="dimmed">Connect the UNIBA sending mailbox securely through Google OAuth.</Text></div>{status ? <Text>Connected sender: <strong>{status.sender_email}</strong></Text> : <Text c="dimmed">No Gmail mailbox is connected yet.</Text>}<Button onClick={() => void connect()} loading={saving}>{status ? "Reconnect Google Workspace" : "Connect Google Workspace"}</Button></Stack></Paper>;
}
