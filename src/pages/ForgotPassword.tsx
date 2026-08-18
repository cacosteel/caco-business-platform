import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/reset-password` },
    );

    if (resetError) setError(resetError.message);
    else setMessage("Check your inbox for the password reset link.");
    setLoading(false);
  }

  return (
    <div className="uniba-auth-page">
      <div className="uniba-auth-card">
        <img className="uniba-login-logo" src="/uniba-logo.webp" alt="UNIBA" />
        <h1>Reset your password</h1>
        <p>Enter your UNIBA Connect administrator email.</p>
        <form onSubmit={submit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
        {message && <div className="uniba-auth-success">{message}</div>}
        {error && <div className="uniba-auth-error">{error}</div>}
        <Link to="/login">Back to login</Link>
      </div>
    </div>
  );
}
