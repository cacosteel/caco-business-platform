import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { IconBrandGoogle } from "@tabler/icons-react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleLogin(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      navigate("/dashboard", { replace: true });
    }

    setLoading(false);
  }

  async function handleGoogleWorkspaceLogin() {
    setGoogleLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });

    if (error) {
      setError(error.message);
      setGoogleLoading(false);
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
      <div style={{ width: "100%", maxWidth: 400, padding: 28, background: "var(--caco-surface)", border: "1px solid var(--caco-border)", borderRadius: 10, boxShadow: "0 8px 30px rgba(62,82,95,0.08)" }}>
      <h2 style={{ margin: 0, color: "var(--caco-text-strong)" }}>CACO Business Platform</h2>
      <p style={{ margin: "5px 0 22px", color: "var(--caco-muted)" }}>Sign in to your account</p>

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: 16 }}>
          <input
            autoComplete="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", padding: 11, border: "1px solid #d9e4e9", borderRadius: 6, color: "var(--caco-text-strong)", outlineColor: "var(--caco-primary)" }}
            required
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <input
            autoComplete="current-password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", padding: 11, border: "1px solid #d9e4e9", borderRadius: 6, color: "var(--caco-text-strong)", outlineColor: "var(--caco-primary)" }}
            required
          />
        </div>

        <div style={{ margin: "-6px 0 16px", textAlign: "right" }}>
          <Link
            to="/forgot-password"
            style={{ color: "var(--caco-primary-hover)", fontWeight: 600, textDecoration: "none" }}
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading || googleLoading}
          style={{
            width: "100%",
            padding: 11,
            border: 0,
            borderRadius: 6,
            background: "var(--caco-primary)",
            color: "#fff",
            fontWeight: 600,
            cursor: loading || googleLoading ? "default" : "pointer",
            opacity: loading || googleLoading ? 0.7 : 1,
          }}
        >
          {loading ? "Signing in..." : "Login"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0 16px", color: "var(--caco-muted)", fontSize: 13 }}>
          <span style={{ height: 1, flex: 1, background: "var(--caco-border)" }} />
          <span>or</span>
          <span style={{ height: 1, flex: 1, background: "var(--caco-border)" }} />
        </div>

        <button
          type="button"
          onClick={() => void handleGoogleWorkspaceLogin()}
          disabled={loading || googleLoading}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: 11, border: "1px solid #d9e4e9", borderRadius: 6, background: "#fff", color: "var(--caco-text-strong)", fontWeight: 600, cursor: loading || googleLoading ? "default" : "pointer", opacity: loading || googleLoading ? 0.7 : 1 }}
        >
          <IconBrandGoogle size={20} aria-hidden="true" />
          {googleLoading ? "Redirecting to Google..." : "Continue with Google Workspace"}
        </button>

        <p style={{ margin: "12px 0 0", color: "var(--caco-muted)", fontSize: 13 }}>
          Use the Google Workspace email address that received your CACO invitation.
        </p>

        {error && (
          <p style={{ color: "#d95f5f", marginTop: 16 }}>
            {error}
          </p>
        )}
      </form>
      </div>
    </div>
  );
}
