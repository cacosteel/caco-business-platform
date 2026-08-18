import { Button, FileInput, Group, Paper, Stack, Switch, Table, Text, TextInput, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getPublicResourceUrl, getPublicResources, setPublicResourcePublished, uploadPublicResource, type PublicResource } from "../../services/publicResourceService";

export default function PublicResources() {
  const [resources, setResources] = useState<PublicResource[]>([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try { setResources(await getPublicResources()); }
    catch { toast.error("Public resources could not be loaded."); }
  }

  useEffect(() => { void load(); }, []);

  async function upload() {
    if (!title.trim() || !file) { toast.error("Enter a title and choose a file."); return; }
    setSaving(true);
    try { await uploadPublicResource(title, file); setTitle(""); setFile(null); await load(); toast.success("Resource published."); }
    catch { toast.error("The resource could not be uploaded."); }
    finally { setSaving(false); }
  }

  async function changePublishing(resource: PublicResource) {
    try { await setPublicResourcePublished(resource.id, !resource.is_published); await load(); }
    catch { toast.error("The publishing status could not be changed."); }
  }

  return <Stack gap="md">
    <div><Title order={1}>Resource Publishing</Title><Text c="dimmed">Upload catalogues and product documents for public download on the UNIBA website.</Text></div>
    <Paper withBorder p="md"><Stack><TextInput label="Title" placeholder="Example: UNIBA Product Catalogue" value={title} onChange={(event) => setTitle(event.currentTarget.value)} required /><FileInput label="Document file" placeholder="Choose a file" value={file} onChange={setFile} required clearable /><Group justify="flex-end"><Button onClick={() => void upload()} loading={saving}>Upload and publish</Button></Group></Stack></Paper>
    <Paper withBorder p="md"><Table striped><Table.Thead><Table.Tr><Table.Th>Title</Table.Th><Table.Th>File</Table.Th><Table.Th>Public</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{resources.map((resource) => <Table.Tr key={resource.id}><Table.Td>{resource.title}</Table.Td><Table.Td><Button component="a" href={getPublicResourceUrl(resource.file_path)} target="_blank" rel="noreferrer" variant="subtle" size="xs">{resource.file_name}</Button></Table.Td><Table.Td><Switch checked={resource.is_published} onChange={() => void changePublishing(resource)} label={resource.is_published ? "Published" : "Hidden"} /></Table.Td></Table.Tr>)}{resources.length === 0 && <Table.Tr><Table.Td colSpan={3}>No public resources have been uploaded.</Table.Td></Table.Tr>}</Table.Tbody></Table></Paper>
  </Stack>;
}
