import {
  Alert,
  Button,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  acceptInvitation,
  establishInvitationSession,
} from "../services/invitationService";

export default function Invite() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [linkState, setLinkState] = useState<
    "checking" | "ready" | "error" | "complete"
  >("checking");
  const [message, setMessage] = useState("Verifying your invitation link...");

  useEffect(() => {
    let active = true;

    void establishInvitationSession()
      .then(() => {
        if (!active) return;
        setLinkState("ready");
        setMessage("Invitation verified. Complete your details below.");
      })
      .catch((error) => {
        if (!active) return;
        setLinkState("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "The invitation link could not be verified.",
        );
      });

    return () => {
      active = false;
    };
  }, []);

  async function complete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (linkState !== "ready") return;
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First and last name are required.");
      return;
    }
    if (password.length < 8) {
      toast.error("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirmation) {
      toast.error("Passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      await acceptInvitation(firstName, lastName, password);
      setLinkState("complete");
      setMessage(
        "Your account is ready. Opening UNIBA Connect...",
      );
      toast.success("Your account has been created.");
      window.setTimeout(() => window.location.replace("/dashboard"), 900);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Invitation could not be completed.";
      setMessage(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  const alertColor =
    linkState === "error"
      ? "red"
      : linkState === "complete"
        ? "green"
        : "cacoBlue";

  return (
    <Paper maw={480} mx="auto" mt={80} withBorder p="xl">
      <form onSubmit={complete}>
        <Stack>
          <div>
            <Title order={1}>Complete your invitation</Title>
            <Text c="dimmed">
              Create your password and complete your profile to enter UNIBA
              Connect.
            </Text>
          </div>
          <Alert color={alertColor}>{message}</Alert>
          <TextInput
            label="First name"
            value={firstName}
            onChange={(event) => setFirstName(event.currentTarget.value)}
            required
            disabled={linkState !== "ready"}
          />
          <TextInput
            label="Last name"
            value={lastName}
            onChange={(event) => setLastName(event.currentTarget.value)}
            required
            disabled={linkState !== "ready"}
          />
          <PasswordInput
            label="Password"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            required
            disabled={linkState !== "ready"}
          />
          <PasswordInput
            label="Confirm password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.currentTarget.value)}
            required
            disabled={linkState !== "ready"}
          />
          <Button
            type="submit"
            loading={saving}
            disabled={linkState !== "ready"}
          >
            Complete account
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}
