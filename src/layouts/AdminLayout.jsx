import { useState, useEffect, createContext, useContext } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// Shared sidebar state so AdminPanel can read it
export const SidebarContext = createContext({ open: true, setOpen: () => {}, toggle: () => {} });
export const useSidebar = () => useContext(SidebarContext);

export default function AdminLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const displayName =
    profile?.display_name || profile?.full_name?.split(" ")[0] || "Admin";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  // Auto-close on mobile
  useEffect(() => {
    const check = () => setSidebarOpen(window.innerWidth > 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <SidebarContext.Provider value={{ open: sidebarOpen, setOpen: setSidebarOpen, toggle: () => setSidebarOpen(p => !p), displayName, handleSignOut }}>
      <div style={st.shell}>
        <header style={st.header}>
          <div style={st.headerInner}>
            {/* Left: hamburger + brand */}
            <div style={st.headerLeft}>
              <button data-sidebar-toggle onClick={() => setSidebarOpen(p => !p)} style={st.hamburger}>
                {sidebarOpen ? "✕" : "☰"}
              </button>
              <a href="/panel" style={st.brand}>
                <span style={st.brandIcon}>MGN</span>
                <span style={st.brandText}>Admin</span>
              </a>
            </div>

            {/* Right: user + sign out (hidden on mobile — moved to sidebar) */}
            <div data-header-right style={st.headerRight}>
              <a href="https://myguardianneighbor.com" style={st.siteLink}>Main site →</a>
              <span style={st.userName}>{displayName}</span>
              <button onClick={handleSignOut} style={st.signOutBtn}>Sign out</button>
            </div>
          </div>
        </header>

        <main style={st.main}>
          <Outlet />
        </main>
      </div>
    </SidebarContext.Provider>
  );
}

const st = {
  shell: { minHeight: "100vh", background: "#F1F5F9" },
  header: {
    background: "#0B1D35",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    position: "sticky", top: 0, zIndex: 100,
  },
  headerInner: {
    margin: "0 auto",
    padding: "0 16px", height: 56,
    display: "flex", alignItems: "center", justifyContent: "space-between",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 12 },
  hamburger: {
    background: "none", border: "none", color: "rgba(255,255,255,0.7)",
    fontSize: 20, cursor: "pointer", padding: "4px 8px",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
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
  siteLink: {
    fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.5)",
    textDecoration: "none", fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
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
  main: { padding: 0 },
};
