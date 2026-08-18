import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      navigate("/dashboard", { replace: true });
    }

    setLoading(false);
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
      <img className="uniba-login-logo" src="/uniba-logo.webp" alt="UNIBA" />
      <h2 style={{ margin: 0, color: "var(--caco-text-strong)" }}>UNIBA Connect</h2>
      <p style={{ margin: "5px 0 22px", color: "var(--caco-muted)" }}>Contacts, email outreach and product catalogues</p>

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: 16 }}>
          <input
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
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", padding: 11, border: "1px solid #d9e4e9", borderRadius: 6, color: "var(--caco-text-strong)", outlineColor: "var(--caco-primary)" }}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: 11,
            border: 0,
            borderRadius: 6,
            background: "var(--caco-primary)",
            color: "#fff",
            fontWeight: 600,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Signing in..." : "Login"}
        </button>

        <div style={{ marginTop: 14, textAlign: "center" }}>
          <Link to="/forgot-password">Forgot your password?</Link>
        </div>

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
