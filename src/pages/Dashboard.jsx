import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/api/needs/stats`);
      const data = await res.json();
      setStats(data.data || data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const impactCards = stats
    ? [
        { label: "Needs Fulfilled", value: stats.total_fulfilled?.toLocaleString() || "0", icon: "✅" },
        { label: "Families Helped", value: stats.families_helped?.toLocaleString() || "0", icon: "👨‍👩‍👧" },
        { label: "Active Volunteers", value: stats.active_helpers?.toLocaleString() || stats.total_subscribers?.toLocaleString() || "0", icon: "🤝" },
        { label: "Fulfillment Rate", value: stats.fulfillment_rate ? `${stats.fulfillment_rate}%` : "—", icon: "📊" },
        { label: "Open Requests", value: stats.open_needs?.toLocaleString() || "0", icon: "🔔", highlight: true },
        { label: "Fulfilled This Week", value: stats.fulfilled_this_week?.toLocaleString() || "0", icon: "📈" },
      ]
    : [];

  const serviceCards = stats
    ? [
        { label: "Avg Time to Fulfill", value: stats.avg_fulfillment_hours ? `${stats.avg_fulfillment_hours}h` : "—", icon: "⏱️" },
        { label: "Active Resources", value: stats.active_resources?.toLocaleString() || "0", icon: "📋" },
        { label: "Career Quizzes", value: stats.quiz_sessions?.toLocaleString() || "0", icon: "🧭" },
        { label: "Resume Reviews", value: stats.resume_reviews?.toLocaleString() || "0", icon: "📄" },
      ]
    : [];

  const categoryData = stats?.needs_by_category || {};

  return (
    <div style={st.page}>
      {/* Header */}
      <header style={st.header}>
        <div style={st.headerInner}>
          <div style={st.brandRow}>
            <span style={st.brandIcon}>MGN</span>
            <span style={st.brandText}>Platform Transparency</span>
          </div>
          <Link to="/login" style={st.loginLink}>Admin Sign In →</Link>
        </div>
      </header>

      {/* Hero */}
      <div style={st.hero}>
        <h1 style={st.heroTitle}>My Guardian Neighbor</h1>
        <p style={st.heroSub}>
          Real-time platform metrics — every number represents a real family helped in Metro Atlanta.
        </p>
      </div>

      {/* Stats Grid */}
      <div style={st.section}>
        {loading ? (
          <div style={st.loadingWrap}>
            <div style={st.spinner} />
            <p style={{ color: "#6b7280", fontSize: 14, marginTop: 16 }}>Loading stats...</p>
          </div>
        ) : (
          <>
            {/* Impact metrics */}
            <div style={st.sectionLabel}>Community Impact</div>
            <div style={st.grid}>
              {impactCards.map((c, i) => (
                <div key={i} style={{ ...st.card, ...(c.highlight ? st.cardHighlight : {}) }}>
                  <div style={st.cardIcon}>{c.icon}</div>
                  <div style={st.cardValue}>{c.value}</div>
                  <div style={st.cardLabel}>{c.label}</div>
                </div>
              ))}
            </div>

            {/* Services */}
            <div style={{ ...st.sectionLabel, marginTop: 32 }}>Platform Services</div>
            <div style={st.grid}>
              {serviceCards.map((c, i) => (
                <div key={i} style={st.card}>
                  <div style={st.cardIcon}>{c.icon}</div>
                  <div style={st.cardValue}>{c.value}</div>
                  <div style={st.cardLabel}>{c.label}</div>
                </div>
              ))}
            </div>

            {/* Needs by category */}
            {Object.keys(categoryData).length > 0 && (
              <>
                <div style={{ ...st.sectionLabel, marginTop: 32 }}>Fulfilled by Category</div>
                <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  {Object.entries(categoryData).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
                    const max = Math.max(...Object.values(categoryData));
                    return (
                      <div key={cat} style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{cat}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#0B1D35" }}>{count}</span>
                        </div>
                        <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(count / max) * 100}%`, background: "#E8A020", borderRadius: 4, transition: "width 0.4s" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        <p style={st.refreshNote}>Stats refresh automatically every 60 seconds</p>
      </div>

      {/* Footer */}
      <footer style={st.footer}>
        <p style={st.footerText}>
          © {new Date().getFullYear()} My Guardian Neighbor · Metro Atlanta, GA
        </p>
        <a href="https://myguardianneighbor.com" style={st.footerLink}>
          Visit myguardianneighbor.com →
        </a>
      </footer>
    </div>
  );
}

const st = {
  page: { minHeight: "100vh", background: "#F1F5F9", fontFamily: "'Plus Jakarta Sans', sans-serif" },
  header: {
    background: "#0B1D35", padding: "0 clamp(16px, 4vw, 48px)",
  },
  headerInner: {
    maxWidth: 960, margin: "0 auto", height: 56,
    display: "flex", alignItems: "center", justifyContent: "space-between",
  },
  brandRow: { display: "flex", alignItems: "center", gap: 10 },
  brandIcon: {
    fontSize: 11, fontWeight: 800, color: "#0B1D35", background: "#E8A020",
    padding: "3px 7px", borderRadius: 5, letterSpacing: "0.04em",
  },
  brandText: { fontSize: 15, fontWeight: 700, color: "white" },
  loginLink: {
    fontSize: 13, fontWeight: 600, color: "#E8A020", textDecoration: "none",
  },
  hero: {
    background: "#0B1D35", textAlign: "center",
    padding: "clamp(40px, 6vw, 80px) 24px clamp(48px, 8vw, 100px)",
  },
  heroTitle: {
    fontFamily: "'Fraunces', serif", fontSize: "clamp(28px, 5vw, 42px)",
    fontWeight: 300, color: "white", marginBottom: 12,
  },
  heroSub: {
    fontSize: "clamp(14px, 2vw, 17px)", color: "rgba(255,255,255,0.55)",
    lineHeight: 1.7, maxWidth: 520, margin: "0 auto",
  },
  section: {
    maxWidth: 960, margin: "0 auto",
    padding: "clamp(24px, 4vw, 48px) clamp(16px, 4vw, 48px)",
  },
  loadingWrap: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "60px 0",
  },
  spinner: {
    width: 36, height: 36, border: "4px solid #e5e7eb",
    borderTopColor: "#0B1D35", borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))",
    gap: 20,
  },
  card: {
    background: "white", borderRadius: 16,
    border: "1px solid #e2e8f0", padding: "28px 24px",
    textAlign: "center",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  cardHighlight: {
    background: "#FEF9EE", borderColor: "#E8A020",
  },
  cardIcon: { fontSize: 28, marginBottom: 12 },
  cardValue: {
    fontFamily: "'Fraunces', serif", fontSize: "clamp(28px, 4vw, 36px)",
    fontWeight: 600, color: "#0B1D35", marginBottom: 4,
  },
  cardLabel: { fontSize: 13, color: "#6b7280", fontWeight: 500 },
  sectionLabel: {
    fontSize: 13, fontWeight: 700, color: "#0B1D35",
    textTransform: "uppercase", letterSpacing: "0.06em",
    marginBottom: 16,
  },
  refreshNote: {
    textAlign: "center", fontSize: 12, color: "#9ca3af",
    marginTop: 20,
  },
  footer: {
    textAlign: "center", padding: "32px 24px",
    borderTop: "1px solid #e2e8f0", marginTop: 40,
  },
  footerText: { fontSize: 13, color: "#9ca3af", marginBottom: 8 },
  footerLink: { fontSize: 13, color: "#0B1D35", fontWeight: 600, textDecoration: "none" },
};
