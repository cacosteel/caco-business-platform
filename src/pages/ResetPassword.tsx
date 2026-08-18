import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) setError(updateError.message);
    else navigate("/dashboard", { replace: true });
  }

  return (
    <div className="uniba-auth-page">
      <div className="uniba-auth-card">
        <img className="uniba-login-logo" src="/uniba-logo.webp" alt="UNIBA" />
        <h1>Choose a new password</h1>
        <p>Create the password for your UNIBA Connect account.</p>
        <form onSubmit={submit}>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            required
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.currentTarget.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save password"}
          </button>
        </form>
        {error && <div className="uniba-auth-error">{error}</div>}
      </div>
    </div>
  );
}
