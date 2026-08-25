import { Button, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router-dom";

type AdminTool = { title: string; description: string; path: string; action: string };

const accessTools: AdminTool[] = [
  { title: "Users", description: "Review access, Workspace accounts, companies, and roles.", path: "/dashboard/users", action: "Manage users" },
  { title: "Invitations", description: "Invite users and assign their company access before they join.", path: "/dashboard/invitations", action: "Manage invitations" },
  { title: "Deletion requests", description: "Review member requests before records are soft-deleted.", path: "/dashboard/deletion-requests", action: "Review requests" },
];

const platformTools: AdminTool[] = [
  { title: "Company types", description: "Maintain the company categories available across the platform.", path: "/dashboard/company-types", action: "Manage types" },
  { title: "Activity types", description: "Maintain options used in company activity records.", path: "/dashboard/activity-types", action: "Manage types" },
  { title: "Platform profile", description: "Maintain shared CACO organisation details for documents and pages.", path: "/dashboard/platform-settings", action: "Edit profile" },
  { title: "Resource publishing", description: "Publish catalogues and product documents to the public website.", path: "/dashboard/public-resources", action: "Manage resources" },
];

function ToolGroup({ title, description, tools }: { title: string; description: string; tools: AdminTool[] }) {
  return <Paper withBorder p="md"><Stack gap="sm"><div><Title order={2}>{title}</Title><Text size="sm" c="dimmed">{description}</Text></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>{tools.map((tool) => <Paper key={tool.title} withBorder p="sm"><Stack gap="xs"><div><Text fw={600}>{tool.title}</Text><Text size="xs" c="dimmed">{tool.description}</Text></div><Group justify="flex-end"><Button component={Link} to={tool.path} size="xs" variant="light">{tool.action}</Button></Group></Stack></Paper>)}</div></Stack></Paper>;
}

export default function Administration() {
  return <Stack gap="md">
    <div><Title order={1}>Administration</Title><Text c="dimmed">Platform-wide settings and approval processes.</Text></div>
    <ToolGroup title="Access management" description="Manage the people and approval controls that govern access to CACO." tools={accessTools} />
    <ToolGroup title="Platform setup" description="Keep shared platform configuration in one compact place." tools={platformTools} />
  </Stack>;
}
