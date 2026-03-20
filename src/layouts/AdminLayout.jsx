import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function AdminLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const displayName =
    profile?.display_name || profile?.full_name?.split(" ")[0] || "Admin";

  return (
    <div style={styles.shell}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.headerLeft}>
            <a href="https://myguardianneighbor.com" style={styles.backLink}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 12L6 8l4-4" />
              </svg>
              Main site
            </a>
            <div style={styles.divider} />
            <a href="/panel" style={styles.brand}>
              <span style={styles.brandIcon}>MGN</span>
              <span style={styles.brandText}>Admin</span>
            </a>
          </div>
          <div style={styles.headerRight}>
            <span style={styles.userName}>{displayName}</span>
            <button onClick={handleSignOut} style={styles.signOutBtn}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles = {
  shell: { minHeight: "100vh", background: "#F1F5F9" },
  header: {
    background: "#0B1D35",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    position: "sticky", top: 0, zIndex: 100,
  },
  headerInner: {
    maxWidth: 1200, margin: "0 auto",
    padding: "0 clamp(12px, 3vw, 32px)", height: 56,
    display: "flex", alignItems: "center", justifyContent: "space-between",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 16 },
  backLink: {
    display: "inline-flex", alignItems: "center", gap: 6,
    fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.5)",
    textDecoration: "none", fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  divider: { width: 1, height: 20, background: "rgba(255,255,255,0.12)" },
  brand: { display: "flex", alignItems: "center", gap: 8, textDecoration: "none" },
  brandIcon: {
    fontSize: 11, fontWeight: 800, color: "#0B1D35", background: "#E8A020",
    padding: "3px 7px", borderRadius: 5, letterSpacing: "0.04em",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  brandText: {
    fontSize: 15, fontWeight: 700, color: "white",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  headerRight: { display: "flex", alignItems: "center", gap: 16 },
  userName: {
    fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.6)",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  signOutBtn: {
    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 600,
    color: "rgba(255,255,255,0.5)", cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  main: {
    maxWidth: 1200, margin: "0 auto",
    padding: "clamp(16px, 3vw, 32px) clamp(12px, 3vw, 32px) 80px",
  },
};
