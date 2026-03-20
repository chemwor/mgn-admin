import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { signInWithMagicLink, signInWithGoogle, isAuthenticated, hasRole } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in as admin, redirect to panel
  useEffect(() => {
    if (isAuthenticated && (hasRole("super_admin") || hasRole("moderator"))) {
      navigate("/panel", { replace: true });
    }
  }, [isAuthenticated, hasRole, navigate]);

  const handleMagicLink = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    const { error: err } = await signInWithMagicLink(email.trim());
    setLoading(false);
    if (err) {
      setError(err.message || "Failed to send link");
    } else {
      setSent(true);
    }
  };

  const handleGoogle = async () => {
    setError("");
    const { error: err } = await signInWithGoogle();
    if (err) setError(err.message || "Google sign-in failed");
  };

  return (
    <div style={st.page}>
      <div style={st.card}>
        <div style={st.brandRow}>
          <span style={st.brandIcon}>MGN</span>
          <span style={st.brandText}>Admin</span>
        </div>

        <h1 style={st.title}>Admin Sign In</h1>
        <p style={st.sub}>Sign in with your admin account to access the dashboard.</p>

        {sent ? (
          <div style={st.sentBox}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📧</div>
            <h3 style={{ fontSize: 18, color: "#0B1D35", marginBottom: 8 }}>Check your email</h3>
            <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
              We sent a magic link to <strong>{email}</strong>. Click the link to sign in.
            </p>
            <button onClick={() => setSent(false)} style={st.secondaryBtn}>
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleMagicLink}>
              <label style={st.label}>Email</label>
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={st.input}
                required
              />
              <button type="submit" disabled={loading} style={{ ...st.primaryBtn, opacity: loading ? 0.6 : 1 }}>
                {loading ? "Sending..." : "Send Magic Link"}
              </button>
            </form>

            <div style={st.divider}>
              <span style={st.dividerText}>or</span>
            </div>

            <button onClick={handleGoogle} style={st.googleBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Sign in with Google
            </button>
          </>
        )}

        {error && <div style={st.error}>{error}</div>}

        <a href="/" style={st.backLink}>← Back to public dashboard</a>
      </div>
    </div>
  );
}

const st = {
  page: {
    minHeight: "100vh", background: "#0B1D35",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "40px 20px",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  card: {
    background: "white", borderRadius: 16, padding: "clamp(24px, 5vw, 40px)",
    maxWidth: 420, width: "100%",
    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
  },
  brandRow: {
    display: "flex", alignItems: "center", gap: 8, marginBottom: 28,
  },
  brandIcon: {
    fontSize: 11, fontWeight: 800, color: "#0B1D35", background: "#E8A020",
    padding: "3px 7px", borderRadius: 5, letterSpacing: "0.04em",
  },
  brandText: { fontSize: 15, fontWeight: 700, color: "#0B1D35" },
  title: {
    fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600,
    color: "#0B1D35", marginBottom: 8,
  },
  sub: { fontSize: 14, color: "#6b7280", marginBottom: 28, lineHeight: 1.5 },
  label: {
    display: "block", fontSize: 12, fontWeight: 600, color: "#374151",
    marginBottom: 6,
  },
  input: {
    display: "block", width: "100%", padding: "12px 14px",
    border: "1.5px solid #d0d5dd", borderRadius: 8, fontSize: 14,
    outline: "none", marginBottom: 16, boxSizing: "border-box",
  },
  primaryBtn: {
    display: "block", width: "100%", padding: "14px",
    background: "#0B1D35", color: "white", border: "none",
    borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer",
  },
  divider: {
    textAlign: "center", margin: "20px 0", position: "relative",
    borderTop: "1px solid #e5e7eb",
  },
  dividerText: {
    background: "white", padding: "0 12px", fontSize: 12, color: "#9ca3af",
    position: "relative", top: -8,
  },
  googleBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    width: "100%", padding: "12px", background: "white",
    border: "1.5px solid #d0d5dd", borderRadius: 10,
    fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer",
  },
  secondaryBtn: {
    background: "none", border: "1.5px solid #d0d5dd", borderRadius: 8,
    padding: "10px 20px", fontSize: 13, fontWeight: 600,
    color: "#374151", cursor: "pointer", marginTop: 16,
  },
  sentBox: { textAlign: "center", padding: "16px 0" },
  error: {
    color: "#D96B4A", fontSize: 13, background: "rgba(217,107,74,0.08)",
    border: "1px solid rgba(217,107,74,0.15)", borderRadius: 8,
    padding: "10px 14px", marginTop: 16,
  },
  backLink: {
    display: "block", textAlign: "center", marginTop: 24,
    fontSize: 13, color: "#6b7280", textDecoration: "none",
  },
};
