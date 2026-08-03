import { Button, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router-dom";

const adminTools = [
  { title: "Users", description: "Review user access and manage platform accounts.", path: "/dashboard/users", action: "Manage users", available: true },
  { title: "Invitations", description: "Invite new users and assign their company access before they join.", path: "/dashboard/invitations", action: "Invite user", available: true },
  { title: "Deletion requests", description: "Review member requests before records are soft-deleted.", path: "/dashboard/deletion-requests", action: "Review requests", available: true },
  { title: "Company types", description: "Manage the available company categories.", path: "/dashboard/company-types", action: "Manage types", available: true },
  { title: "Activity types", description: "Manage the communication options used in company activity records.", path: "/dashboard/activity-types", action: "Manage types", available: true },
  { title: "Platform profile", description: "Maintain shared CACO organisation details for future documents and public pages.", path: "/dashboard/platform-settings", action: "Edit profile", available: true },
  { title: "Resource publishing", description: "Publish catalogues and product documents to the public website.", path: "/dashboard/public-resources", action: "Manage resources", available: true },
];

export default function Administration() {
  return <Stack gap="md">
    <div><Title order={1}>Administration</Title><Text c="dimmed">Platform-wide settings and approval processes.</Text></div>
    {adminTools.map((tool) => <Paper key={tool.title} withBorder p="md"><Group justify="space-between"><div><Title order={3}>{tool.title}</Title><Text size="sm" c="dimmed">{tool.description}</Text></div>{tool.available ? <Button component={Link} to={tool.path}>{tool.action}</Button> : <Button disabled variant="default">{tool.action}</Button>}</Group></Paper>)}
  </Stack>;
}
