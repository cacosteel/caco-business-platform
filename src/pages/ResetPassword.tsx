import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

type RecoveryStatus = "checking" | "ready" | "invalid" | "complete";

function clearRecoveryParameters() {
  window.history.replaceState({}, document.title, window.location.pathname);
}

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<RecoveryStatus>("checking");

  useEffect(() => {
    let active = true;

    const queryParameters = new URLSearchParams(window.location.search);
    const hashParameters = new URLSearchParams(window.location.hash.slice(1));
    const linkError =
      queryParameters.get("error_description") ??
      hashParameters.get("error_description");
    const hasRecoveryParameters =
      queryParameters.get("type") === "recovery" ||
      hashParameters.get("type") === "recovery" ||
      queryParameters.has("code");

    if (linkError) {
      setError(linkError.replaceAll("+", " "));
      setStatus("invalid");
      clearRecoveryParameters();
      return;
    }

    let recoveryEventReceived = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active || event !== "PASSWORD_RECOVERY" || !session) return;

      recoveryEventReceived = true;
      setStatus("ready");
      clearRecoveryParameters();
    });

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;

      if (
        sessionError ||
        !data.session ||
        (!hasRecoveryParameters && !recoveryEventReceived)
      ) {
        setError("This password-reset link is invalid or has expired.");
        setStatus("invalid");
        return;
      }

      setStatus("ready");
      clearRecoveryParameters();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Use at least 8 characters for your new password.");
      return;
    }

    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setSaving(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(
        updateError.message ||
          "The password could not be updated. Request a new reset link and try again.",
      );
      setSaving(false);
      return;
    }

    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // The password is already updated; local session cleanup is best effort.
    }

    setPassword("");
    setConfirmation("");
    setStatus("complete");
    setSaving(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "var(--caco-page)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          padding: 28,
          background: "var(--caco-surface)",
          border: "1px solid var(--caco-border)",
          borderRadius: 10,
          boxShadow: "0 8px 30px rgba(62,82,95,0.08)",
        }}
      >
        <h2 style={{ margin: 0, color: "var(--caco-text-strong)" }}>
          Choose a new password
        </h2>

        {status === "checking" && (
          <p role="status" style={{ margin: "8px 0 0", color: "var(--caco-muted)" }}>
            Verifying your reset link...
          </p>
        )}

        {status === "invalid" && (
          <div>
            <p role="alert" style={{ margin: "8px 0 20px", color: "#d95f5f" }}>
              {error}
            </p>
            <Link
              to="/forgot-password"
              style={{ color: "var(--caco-primary-hover)", fontWeight: 600 }}
            >
              Request another reset link
            </Link>
          </div>
        )}

        {status === "complete" && (
          <div role="status">
            <p style={{ margin: "8px 0 20px", color: "var(--caco-text)" }}>
              Your password has been updated. Sign in again with your new password.
            </p>
            <Link
              to="/login"
              style={{ color: "var(--caco-primary-hover)", fontWeight: 600 }}
            >
              Continue to sign in
            </Link>
          </div>
        )}

        {status === "ready" && (
          <>
            <p style={{ margin: "5px 0 22px", color: "var(--caco-muted)" }}>
              Use at least 8 characters. You will sign in again after the update.
            </p>

            <form onSubmit={handleSubmit}>
              <input
                aria-label="New password"
                autoComplete="new-password"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="New password"
                required
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: 11,
                  border: "1px solid #d9e4e9",
                  borderRadius: 6,
                  color: "var(--caco-text-strong)",
                  outlineColor: "var(--caco-primary)",
                }}
                type="password"
                value={password}
              />

              <input
                aria-label="Confirm new password"
                autoComplete="new-password"
                minLength={8}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="Confirm new password"
                required
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  marginTop: 16,
                  padding: 11,
                  border: "1px solid #d9e4e9",
                  borderRadius: 6,
                  color: "var(--caco-text-strong)",
                  outlineColor: "var(--caco-primary)",
                }}
                type="password"
                value={confirmation}
              />

              <button
                disabled={saving}
                style={{
                  width: "100%",
                  marginTop: 16,
                  padding: 11,
                  border: 0,
                  borderRadius: 6,
                  background: "var(--caco-primary)",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: saving ? "default" : "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
                type="submit"
              >
                {saving ? "Updating password..." : "Update password"}
              </button>

              {error && (
                <p role="alert" style={{ color: "#d95f5f", marginTop: 16 }}>
                  {error}
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
