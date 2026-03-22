import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const THRESHOLDS = {
  show_rate_note: 20,
  show_avg_time_note: 10,
  show_weekly_trend: 50,
  show_top_categories: 5,
};

function formatTime(hours) {
  if (!hours && hours !== 0) return "—";
  if (hours < 1) return "< 1h";
  if (hours < 24) return `${Math.round(hours)}h`;
  const d = Math.floor(hours / 24);
  const h = Math.round(hours % 24);
  return `${d}d ${h}h`;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/api/needs/stats`);
      const data = await res.json();
      setStats(data.data || data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const fulfilled = stats?.total_fulfilled || 0;
  const openNeeds = stats?.open_needs || 0;
  const activeVolunteers = stats?.active_helpers || stats?.total_subscribers || 0;
  const activeResources = stats?.active_resources || 0;
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

      <div style={st.section}>
        {loading ? (
          <div style={st.loadingWrap}>
            <div style={st.spinner} />
            <p style={{ color: "#6b7280", fontSize: 14, marginTop: 16 }}>Loading stats...</p>
          </div>
        ) : (
          <>
            {/* ── EARLY LAUNCH BANNER ── */}
            {fulfilled < 50 && (
              <div style={st.launchBanner}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E", flexShrink: 0 }} />
                <span>
                  MGN launched recently and is growing week by week. These numbers reflect real families helped in Metro Atlanta — follow along as we build.
                </span>
              </div>
            )}

            {/* ── COMMUNITY IMPACT ── */}
            <div style={st.sectionLabel}>Community Impact</div>
            <div style={st.grid}>
              {/* Needs Fulfilled */}
              <div style={st.card}>
                <div style={st.cardIcon}>✅</div>
                <div style={st.cardValue}>{fulfilled.toLocaleString()}</div>
                <div style={st.cardLabel}>Needs Fulfilled</div>
              </div>

              {/* Families Helped */}
              <div style={st.card}>
                <div style={st.cardIcon}>👨‍👩‍👧</div>
                <div style={st.cardValue}>{(stats?.families_helped || 0).toLocaleString()}</div>
                <div style={st.cardLabel}>Families Helped</div>
              </div>

              {/* Active Volunteers */}
              <div style={st.card}>
                <div style={st.cardIcon}>🤝</div>
                <div style={st.cardValue}>{activeVolunteers.toLocaleString()}</div>
                <div style={st.cardLabel}>Active Volunteers</div>
              </div>

              {/* Fulfillment Rate */}
              <div style={st.card}>
                <div style={st.cardIcon}>📊</div>
                <div style={st.cardValue}>{stats?.fulfillment_rate ? `${stats.fulfillment_rate}%` : "—"}</div>
                <div style={st.cardLabel} title="Percentage of submitted needs that were matched and fulfilled by a volunteer helper.">
                  Fulfillment Rate
                </div>
                {fulfilled < THRESHOLDS.show_rate_note && fulfilled > 0 && (
                  <div style={st.contextNote}>Based on {fulfilled} need{fulfilled !== 1 ? "s" : ""} to date — growing every week</div>
                )}
              </div>

              {/* Needs Waiting for Help */}
              <div style={{ ...st.card, ...(openNeeds > 0 ? st.cardHighlight : {}) }}>
                <div style={st.cardIcon}>🔔</div>
                <div style={st.cardValue}>{openNeeds.toLocaleString()}</div>
                <div style={st.cardLabel}>Needs Waiting for Help</div>
                {openNeeds > 0 && (
                  <a href="https://myguardianneighbor.com/volunteer" style={st.cardCta}>Can you help? →</a>
                )}
              </div>

              {/* Fulfilled This Week */}
              <div style={st.card}>
                <div style={st.cardIcon}>📈</div>
                <div style={st.cardValue}>{(stats?.fulfilled_this_week || 0).toLocaleString()}</div>
                <div style={st.cardLabel}>Fulfilled This Week</div>
              </div>
            </div>

            {/* ── OPEN REQUESTS ACTION ── */}
            {openNeeds > 0 && (
              <div style={st.openRequestsCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600, color: "#0B1D35" }}>
                    Needs waiting for a helper right now
                  </div>
                  <span style={st.countPill}>{openNeeds}</span>
                </div>
                <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, marginBottom: 16 }}>
                  These families have submitted a request and are waiting for someone in the community to respond. You could be the one who helps.
                </p>
                <a href="https://myguardianneighbor.com/volunteer" style={st.navyBtn}>See how to help →</a>
                <div style={{ fontSize: 11, color: "#9ca3af", fontStyle: "italic", marginTop: 10 }}>
                  Request details are kept private to protect families.
                </div>
              </div>
            )}

            {/* ── PLATFORM SERVICES ── */}
            <div style={{ ...st.sectionLabel, marginTop: 32 }}>Platform Services</div>
            <div style={st.grid}>
              {/* Avg Time to Fulfill */}
              <div style={st.card}>
                <div style={st.cardIcon}>⏱️</div>
                <div style={st.cardValue}>{formatTime(stats?.avg_fulfillment_hours)}</div>
                <div style={st.cardLabel} title="Average time from when a need is submitted to when a volunteer fulfills it.">
                  Avg Time to Fulfill
                </div>
                {fulfilled < THRESHOLDS.show_avg_time_note && fulfilled > 0 && (
                  <div style={st.contextNote}>Early average — improves as more needs are fulfilled</div>
                )}
              </div>

              {/* Active Resources */}
              <div style={st.card}>
                <div style={st.cardIcon}>📋</div>
                <div style={st.cardValue}>{activeResources.toLocaleString()}</div>
                <div style={st.cardLabel}>Active Resources</div>
              </div>

              {/* Career Quizzes */}
              <div style={st.card}>
                <div style={st.cardIcon}>🧭</div>
                <div style={st.cardValue}>{(stats?.quiz_sessions || 0).toLocaleString()}</div>
                <div style={st.cardLabel}>Career Quizzes</div>
                <span style={st.badgeActive}>Active</span>
              </div>

              {/* Resume Reviews */}
              <div style={st.card}>
                <div style={st.cardIcon}>📄</div>
                <div style={st.cardValue}>{stats?.resume_reviews > 0 ? stats.resume_reviews.toLocaleString() : "—"}</div>
                <div style={st.cardLabel}>Resume Reviews</div>
                {stats?.resume_reviews > 0 ? (
                  <span style={st.badgeActive}>Active</span>
                ) : (
                  <span style={st.badgeLaunching}>Launching soon</span>
                )}
              </div>
            </div>

            {/* ── COMING SOON SERVICES ── */}
            <div style={{ ...st.sectionLabel, marginTop: 32 }}>More Tools</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))", gap: 12 }}>
              {[
                { label: "Interview Prep", icon: "🎤", badge: "Active" },
                { label: "Cover Letters", icon: "✉️", badge: "Active" },
                { label: "Benefits Screener", icon: "📝", badge: "Active" },
                { label: "Events Calendar", icon: "📅", badge: "Active" },
              ].map((s, i) => (
                <div key={i} style={{ ...st.card, padding: "16px 14px" }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0B1D35", marginBottom: 6 }}>{s.label}</div>
                  <span style={s.badge === "Active" ? st.badgeActive : s.badge === "Launching soon" ? st.badgeLaunching : st.badgeComingSoon}>
                    {s.badge}
                  </span>
                </div>
              ))}
            </div>

            {/* ── CATEGORY BREAKDOWN ── */}
            <div style={{ ...st.sectionLabel, marginTop: 32 }}>What Families Need Most</div>
            <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              {Object.keys(categoryData).length > 0 ? (
                <>
                  {Object.entries(categoryData).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
                    const max = Math.max(...Object.values(categoryData));
                    return (
                      <div key={cat} style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{cat}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#0B1D35" }}>{count}</span>
                        </div>
                        <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(count / max) * 100}%`, background: "#0B1D35", borderRadius: 4, transition: "width 0.4s" }} />
                        </div>
                      </div>
                    );
                  })}
                  {fulfilled < THRESHOLDS.show_top_categories && (
                    <div style={st.contextNote}>More categories will appear as needs are fulfilled.</div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "20px 0", color: "#9ca3af", fontSize: 14 }}>
                  Category data will appear once needs are fulfilled.
                </div>
              )}
            </div>

            {/* ── VOLUNTEER + RESOURCES STRIP ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: 20, marginTop: 32 }}>
              {/* Volunteer CTA */}
              <div style={st.volunteerCard}>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, color: "white", marginBottom: 8 }}>
                  Become a volunteer helper
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, marginBottom: 12 }}>
                  {activeVolunteers} volunteers are already helping families across Metro Atlanta. Join them.
                </p>
                <a href="https://myguardianneighbor.com/volunteer" style={st.amberBtn}>Sign up to help →</a>
              </div>

              {/* Resources CTA */}
              <div style={st.resourceCard}>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, color: "#0B1D35", marginBottom: 8 }}>
                  Free resources directory
                </div>
                <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, marginBottom: 12 }}>
                  {activeResources.toLocaleString()} free resources across Metro Atlanta — food, healthcare, legal aid, and more.
                </p>
                <a href="https://myguardianneighbor.com/resources" style={st.outlineBtn}>Browse resources →</a>
              </div>
            </div>

            {/* ── TRANSPARENCY NOTE ── */}
            <div style={st.transparencyBox}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>About these numbers</div>
              <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.7, margin: 0 }}>
                All stats on this page come directly from MGN's database in real time. Fulfillment rate is the percentage of submitted needs that were matched and completed by a volunteer. Average time to fulfill is measured from submission to completion. We show these numbers at every stage — including early on — because transparency is part of how we build trust with the communities we serve.
              </p>
            </div>
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
  header: { background: "#0B1D35", padding: "0 clamp(16px, 4vw, 48px)" },
  headerInner: { maxWidth: 960, margin: "0 auto", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" },
  brandRow: { display: "flex", alignItems: "center", gap: 10 },
  brandIcon: { fontSize: 11, fontWeight: 800, color: "#0B1D35", background: "#E8A020", padding: "3px 7px", borderRadius: 5, letterSpacing: "0.04em" },
  brandText: { fontSize: 15, fontWeight: 700, color: "white" },
  loginLink: { fontSize: 13, fontWeight: 600, color: "#E8A020", textDecoration: "none" },
  hero: { background: "#0B1D35", textAlign: "center", padding: "clamp(40px, 6vw, 80px) 24px clamp(48px, 8vw, 100px)" },
  heroTitle: { fontFamily: "'Fraunces', serif", fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 300, color: "white", marginBottom: 12 },
  heroSub: { fontSize: "clamp(14px, 2vw, 17px)", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, maxWidth: 520, margin: "0 auto" },
  section: { maxWidth: 960, margin: "0 auto", padding: "clamp(24px, 4vw, 48px) clamp(16px, 4vw, 48px)" },
  loadingWrap: { display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0" },
  spinner: { width: 36, height: 36, border: "4px solid #e5e7eb", borderTopColor: "#0B1D35", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))", gap: 20 },
  card: { background: "white", borderRadius: 16, border: "1px solid #e2e8f0", padding: "28px 24px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  cardHighlight: { background: "#FEF9EE", borderColor: "#E8A020" },
  cardIcon: { fontSize: 28, marginBottom: 12 },
  cardValue: { fontFamily: "'Fraunces', serif", fontSize: "clamp(28px, 4vw, 36px)", fontWeight: 600, color: "#0B1D35", marginBottom: 4 },
  cardLabel: { fontSize: 13, color: "#6b7280", fontWeight: 500 },
  cardCta: { display: "inline-block", marginTop: 8, fontSize: 12, color: "#E8A020", fontWeight: 600, textDecoration: "none" },
  contextNote: { fontSize: 11, fontStyle: "italic", color: "#9ca3af", marginTop: 6 },
  sectionLabel: { fontSize: 13, fontWeight: 700, color: "#0B1D35", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 },

  // Badges
  badgeActive: { display: "inline-block", fontSize: 11, fontWeight: 700, color: "#22C55E", background: "rgba(34,197,94,0.1)", padding: "2px 10px", borderRadius: 100, marginTop: 8 },
  badgeLaunching: { display: "inline-block", fontSize: 11, fontWeight: 700, color: "#E8A020", background: "rgba(232,160,32,0.1)", padding: "2px 10px", borderRadius: 100, marginTop: 8 },
  badgeComingSoon: { display: "inline-block", fontSize: 11, fontWeight: 700, color: "#9ca3af", background: "#f1f5f9", padding: "2px 10px", borderRadius: 100, marginTop: 8 },

  // Early launch banner
  launchBanner: { display: "flex", alignItems: "center", gap: 10, background: "#FEF3DC", border: "0.5px solid #E8A020", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#92400E", lineHeight: 1.6 },

  // Open requests CTA
  openRequestsCard: { background: "white", borderRadius: 16, borderLeft: "4px solid #E8A020", padding: "20px 24px", marginTop: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  countPill: { background: "#E8A020", color: "#0B1D35", fontSize: 14, fontWeight: 700, padding: "4px 14px", borderRadius: 100 },
  navyBtn: { display: "inline-block", background: "#0B1D35", color: "white", padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: "none" },

  // Volunteer + Resources strip
  volunteerCard: { background: "#0B1D35", borderRadius: 16, padding: "24px" },
  amberBtn: { display: "inline-block", background: "#E8A020", color: "#0B1D35", padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: "none" },
  resourceCard: { background: "white", borderRadius: 16, border: "1px solid #e2e8f0", padding: "24px" },
  outlineBtn: { display: "inline-block", background: "white", color: "#0B1D35", border: "1.5px solid #0B1D35", padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: "none" },

  // Transparency note
  transparencyBox: { border: "0.5px solid #e2e8f0", borderRadius: 12, padding: "12px 16px", marginTop: 32 },

  refreshNote: { textAlign: "center", fontSize: 12, color: "#9ca3af", marginTop: 20 },
  footer: { textAlign: "center", padding: "32px 24px", borderTop: "1px solid #e2e8f0", marginTop: 40 },
  footerText: { fontSize: 13, color: "#9ca3af", marginBottom: 8 },
  footerLink: { fontSize: 13, color: "#0B1D35", fontWeight: 600, textDecoration: "none" },
};
