import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        },
      );

      if (resetError) throw resetError;
      setSent(true);
    } catch {
      setError(
        "The reset email could not be sent. Please try again in a few minutes.",
      );
    } finally {
      setLoading(false);
    }
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
          Reset your password
        </h2>

        {sent ? (
          <div role="status">
            <p style={{ margin: "8px 0 20px", color: "var(--caco-text)" }}>
              If an account exists for that email, a password-reset link has
              been sent. Check your inbox and spam folder.
            </p>
            <Link
              to="/login"
              style={{ color: "var(--caco-primary-hover)", fontWeight: 600 }}
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <p style={{ margin: "5px 0 22px", color: "var(--caco-muted)" }}>
              Enter your sign-in email and we will send you a secure reset link.
            </p>

            <form onSubmit={handleSubmit}>
              <input
                aria-label="Email"
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
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
                type="email"
                value={email}
              />

              <button
                disabled={loading}
                style={{
                  width: "100%",
                  marginTop: 16,
                  padding: 11,
                  border: 0,
                  borderRadius: 6,
                  background: "var(--caco-primary)",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: loading ? "default" : "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
                type="submit"
              >
                {loading ? "Sending reset link..." : "Send reset link"}
              </button>

              {error && (
                <p role="alert" style={{ color: "#d95f5f", marginTop: 16 }}>
                  {error}
                </p>
              )}
            </form>

            <p style={{ margin: "20px 0 0" }}>
              <Link
                to="/login"
                style={{ color: "var(--caco-primary-hover)", fontWeight: 600 }}
              >
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
