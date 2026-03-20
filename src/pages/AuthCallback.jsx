import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function AuthCallback() {
  const { profile, loading, hasRole } = useAuth();
  const navigate = useNavigate();
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => setWaiting(false), 2000);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (waiting || loading) return;

    if (profile && (hasRole("super_admin") || hasRole("moderator"))) {
      navigate("/panel", { replace: true });
    } else {
      // Not an admin — redirect to public dashboard
      navigate("/", { replace: true });
    }
  }, [profile, waiting, loading, navigate, hasRole]);

  return (
    <div style={{
      minHeight: "100vh", background: "#0B1D35",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", color: "white", marginBottom: 12 }}>
          Signing you in...
        </h2>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
          Please wait while we verify your access.
        </p>
      </div>
    </div>
  );
}
