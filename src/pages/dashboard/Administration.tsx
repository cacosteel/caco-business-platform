import { Button, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router-dom";

const adminTools = [
  { title: "Users", description: "Review user access and manage platform accounts.", path: "/dashboard/users", action: "Manage users", available: true },
  { title: "Deletion requests", description: "Review member requests before records are soft-deleted.", path: "", action: "Coming next", available: false },
  { title: "Company types", description: "Manage the available company categories.", path: "", action: "Coming next", available: false },
  { title: "Resource publishing", description: "Publish catalogues and product documents to the public website.", path: "", action: "Coming next", available: false },
];

export default function Administration() {
  return <Stack gap="md">
    <div><Title order={1}>Administration</Title><Text c="dimmed">Platform-wide settings and approval processes.</Text></div>
    {adminTools.map((tool) => <Paper key={tool.title} withBorder p="md"><Group justify="space-between"><div><Title order={3}>{tool.title}</Title><Text size="sm" c="dimmed">{tool.description}</Text></div>{tool.available ? <Button component={Link} to={tool.path}>{tool.action}</Button> : <Button disabled variant="default">{tool.action}</Button>}</Group></Paper>)}
  </Stack>;
}
