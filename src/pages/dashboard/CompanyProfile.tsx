import { Button, Divider, Grid, Group, Paper, Select, Stack, Text, Textarea, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import type { Activity, ActivityType } from "../../types/activity";
import type { company } from "../../types/company";
import type { contact } from "../../types/contact";
import { getCompany } from "../../services/companyService";
import { getCompanyContacts } from "../../services/contactService";
import { createActivity, getCompanyActivities } from "../../services/activityService";
import { getActivityTypes, type ActivityTypeOption } from "../../services/activityTypeService";

export default function CompanyProfile() {
  const { id = "" } = useParams();
  const [company, setCompany] = useState<company | null>(null);
  const [contacts, setContacts] = useState<contact[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityTypeOption[]>([]);
  const [activityType, setActivityType] = useState<ActivityType>("phone_call");
  const [contactId, setContactId] = useState<string | null>(null);
  const [context, setContext] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [companyData, contactData, activityData, typeData] = await Promise.all([getCompany(id), getCompanyContacts(id), getCompanyActivities(id), getActivityTypes()]);
      setCompany(companyData); setContacts(contactData); setActivities(activityData); setActivityTypes(typeData);
      if (typeData.length && !typeData.some((type) => type.code === activityType)) setActivityType(typeData[0].code);
    } catch { toast.error("Company information could not be loaded."); }
  }

  useEffect(() => { void load(); }, [id]);

  async function addActivity() {
    if (!context.trim()) { toast.error("General context is required."); return; }
    setSaving(true);
    try {
      await createActivity({ company_id: id, contact_id: contactId, activity_type: activityType, occurred_at: new Date().toISOString(), context: context.trim() });
      setContext(""); setContactId(null); await load(); toast.success("Activity recorded.");
    } catch { toast.error("The activity could not be recorded."); }
    finally { setSaving(false); }
  }

  if (!company) return <Text>Loading company...</Text>;

  return <Stack gap="lg">
    <Group justify="space-between"><div><Title order={1}>{company.name}</Title><Text c="dimmed">{company.company_type ?? "Company"} · {company.country}</Text></div><Button component={Link} to="/dashboard/companies" variant="default">Back to companies</Button></Group>
    <Paper withBorder p="md"><Title order={3}>Company details</Title><Grid mt="sm">{[
      ["Company short name", company.short_name], ["Formal company name", company.name], ["Company type", company.company_type], ["Tax number", company.tax_number || company.registration_number], ["Country", company.country], ["City", company.city], ["Address", company.formal_address || company.address], ["Company telephone", company.phone], ["Company email", company.email], ["Web page", company.website],
    ].map(([label, value]) => <Grid.Col key={label} span={{ base: 12, sm: 6 }}><Text size="xs" c="dimmed">{label}</Text><Text size="sm">{value || "—"}</Text></Grid.Col>)}</Grid><Divider my="md" /><Text size="xs" c="dimmed">NOTES</Text><Text size="sm">{company.notes || "No shared company notes recorded."}</Text></Paper>
    <Paper withBorder p="md"><Group justify="space-between"><div><Title order={3}>Contacts</Title><Text size="sm" c="dimmed">{contacts.length} contact{contacts.length === 1 ? "" : "s"} registered for this company.</Text></div><Button component={Link} to={`/dashboard/contacts?companyId=${id}`} variant="light">View contacts</Button></Group>{contacts.length === 0 ? <Text c="dimmed" mt="sm">No contacts recorded.</Text> : contacts.map((contact) => <div key={contact.id}><Text fw={600} mt="sm">{contact.first_name} {contact.last_name}</Text><Text size="sm">{contact.position || "—"} · {contact.email} · {contact.phone} · {contact.country}</Text></div>)}</Paper>
    <Paper withBorder p="md"><Title order={3}>Activities</Title><Stack mt="md"><Select label="Activity type" value={activityType} onChange={(value) => setActivityType((value as ActivityType) || "")} data={activityTypes.map((type) => ({ value: type.code, label: type.name }))} /><Select label="Contact (optional)" clearable value={contactId} onChange={(value) => setContactId(typeof value === "string" ? value : null)} data={contacts.map((contact) => ({ value: contact.id, label: `${contact.first_name} ${contact.last_name}` }))} /><Textarea label="General context" required value={context} onChange={(event) => setContext(event.currentTarget.value)} /><Button onClick={() => void addActivity()} loading={saving} disabled={!activityType}>Record activity</Button></Stack><Divider my="lg" />{activities.length === 0 ? <Text c="dimmed">No activities recorded.</Text> : activities.map((activity) => <div key={activity.id}><Text fw={600}>{activityTypes.find((type) => type.code === activity.activity_type)?.name ?? activity.activity_type}</Text><Text size="sm" c="dimmed">{new Date(activity.occurred_at).toLocaleString()}</Text><Text>{activity.context}</Text><Divider my="sm" /></div>)}</Paper>
  </Stack>;
}
