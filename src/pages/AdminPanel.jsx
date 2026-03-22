import { useState, useEffect, useCallback, Fragment } from "react";
import api from "../lib/api";
import PageMeta from "../components/PageMeta";

/* ── helpers ────────────────────────────────────────────────────────── */

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_COLORS = {
  open:      { bg: "rgba(74,124,111,0.12)",  color: "#4A7C6F" },
  matched:   { bg: "rgba(232,160,32,0.12)",   color: "#C8851A" },
  fulfilled: { bg: "rgba(11,29,53,0.08)",      color: "var(--text-light)" },
};

const NAV_GROUPS = [
  { label: null, items: [
    { key: "metrics", label: "Dashboard", icon: "📊" },
  ]},
  { label: "Operations", items: [
    { key: "needs", label: "Needs", icon: "🙏" },
    { key: "review", label: "Review Queue", icon: "🔍" },
    { key: "abuse", label: "Abuse Reports", icon: "🚩" },
  ]},
  { label: "Community", items: [
    { key: "subscribers", label: "Subscribers", icon: "👥" },
    { key: "partners", label: "Partners", icon: "🏢" },
    { key: "pros", label: "Professionals", icon: "👨‍⚕️" },
  ]},
  { label: "Programs", items: [
    { key: "careers", label: "Careers", icon: "🧭" },
    { key: "tutoring", label: "Tutoring", icon: "📚" },
    { key: "resumes", label: "Resumes", icon: "📄" },
    { key: "events", label: "Events", icon: "📅" },
  ]},
  { label: "Content", items: [
    { key: "resources", label: "Resources", icon: "📋" },
  ]},
];

const RESOURCE_INIT = { name: "", category: "", description: "", address: "", city: "", state: "GA", zip_code: "", phone: "", website: "", hours: "" };

/* ═══════════════════════════════════════════════════════════════════ */
export default function Admin() {
  const [tab, setTab] = useState("metrics");
  const [reviewCount, setReviewCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    api.get("/api/get-help/admin/needs/review-queue")
      .then(r => setReviewCount((r.data?.data || []).length))
      .catch(() => {});
  }, [tab]);

  // Collapse sidebar on mobile
  useEffect(() => {
    const check = () => setSidebarOpen(window.innerWidth > 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div style={st.page}>
      <PageMeta title="Admin Panel" />

      <div style={st.layoutWrap}>
        {/* Sidebar */}
        <nav style={{ ...st.sidebar, ...(sidebarOpen ? {} : st.sidebarCollapsed) }}>
          {/* Mobile toggle */}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={st.sidebarToggle}>
            {sidebarOpen ? "✕" : "☰"}
          </button>

          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} style={{ marginBottom: 16 }}>
              {group.label && (
                <div style={st.navGroupLabel}>{sidebarOpen ? group.label : ""}</div>
              )}
              {group.items.map(item => (
                <button
                  key={item.key}
                  onClick={() => { setTab(item.key); if (window.innerWidth <= 768) setSidebarOpen(false); }}
                  style={{
                    ...st.navItem,
                    background: tab === item.key ? "rgba(232,160,32,0.12)" : "transparent",
                    color: tab === item.key ? "#0B1D35" : "rgba(255,255,255,0.6)",
                    fontWeight: tab === item.key ? 700 : 400,
                    borderLeft: tab === item.key ? "3px solid #E8A020" : "3px solid transparent",
                  }}
                  title={item.label}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                  {sidebarOpen && <span>{item.label}</span>}
                  {item.key === "review" && reviewCount > 0 && sidebarOpen && (
                    <span style={st.navBadge}>{reviewCount}</span>
                  )}
                  {item.key === "review" && reviewCount > 0 && !sidebarOpen && (
                    <div style={st.navDot} />
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Main content */}
        <div style={st.mainContent}>
          {tab === "metrics" && <MetricsTab />}
          {tab === "needs" && <NeedsTab />}
          {tab === "review" && <ReviewQueueTab />}
          {tab === "subscribers" && <SubscribersTab />}
          {tab === "resources" && <ResourcesTab />}
          {tab === "tutoring" && <TutoringTab />}
          {tab === "abuse" && <AbuseTab />}
          {tab === "partners" && <PartnersTab />}
          {tab === "pros" && <ProfessionalsTab />}
          {tab === "careers" && <CareersTab />}
          {tab === "resumes" && <ResumesTab />}
          {tab === "events" && <EventsTab />}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ *
 *  NEEDS TAB
 * ═══════════════════════════════════════════════════════════════════ */
function NeedsTab() {
  const [needs, setNeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [actionLoading, setActionLoading] = useState("");
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [rebroadcastCooldown, setRebroadcastCooldown] = useState({});   // { [needId]: message }
  const [rebroadcastSuccess, setRebroadcastSuccess] = useState({});     // { [needId]: true }

  const load = useCallback(() => {
    setLoading(true);
    api.get("/api/needs").then(r => setNeeds(r.data?.data || [])).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  // Fetch subscriber count once for confirmation dialogs
  useEffect(() => {
    api.get("/api/needs/stats")
      .then(r => setSubscriberCount(r.data?.data?.total_subscribers || 0))
      .catch(() => {});
  }, []);

  const updateStatus = async (id, status) => {
    setActionLoading(id + status);
    try {
      await api.patch(`/api/needs/${id}/status`, { status });
      load();
    } catch { /* silent */ }
    setActionLoading("");
  };

  const rebroadcast = async (id, status) => {
    const target = status === "ready_for_pickup" ? "delivery volunteers" : "donors & helpers";
    if (!window.confirm(`Rebroadcast this need to all ${target}?`)) return;
    setActionLoading(id + "rebroadcast");
    try {
      await api.post(`/api/needs/${id}/rebroadcast`, {});
      setRebroadcastSuccess(prev => ({ ...prev, [id]: true }));
      setRebroadcastCooldown(prev => { const next = { ...prev }; delete next[id]; return next; });
    } catch (e) {
      if (e.response?.status === 429) {
        const msg = e.response?.data?.error || "Recently broadcast. Please wait.";
        setRebroadcastCooldown(prev => ({ ...prev, [id]: msg }));
      }
    }
    setActionLoading("");
  };

  return (
    <div>
      <div style={st.tabHeader}>
        <h2 className="serif" style={st.tabTitle}>Needs</h2>
        <span style={st.badge}>{needs.length}</span>
      </div>

      {/* Flag note */}
      {!loading && needs.some(n => n.is_flagged) && (
        <div style={st.flagNote}>
          ⚠️ Flagged needs still broadcast normally. This is for visibility only.
        </div>
      )}

      {loading ? <Skeleton rows={5} /> : needs.length === 0 ? <Empty msg="No needs yet." /> : (
        <div style={st.tableWrap}>
          <table style={st.table}>
            <thead>
              <tr>
                {["Name", "Item Needed", "Category", "Zip", "Status", "Date"].map(h => (
                  <th key={h} style={st.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {needs.map(n => {
                const isOpen = expanded === n.id;
                const sc = STATUS_COLORS[n.status] || STATUS_COLORS.open;
                return (
                  <Fragment key={n.id}>
                    <tr onClick={() => setExpanded(isOpen ? null : n.id)} style={{ ...st.tr, background: isOpen ? "rgba(232,160,32,0.04)" : undefined, cursor: "pointer" }}>
                      <td style={st.td}>{n.requester_name}</td>
                      <td style={{ ...st.td, fontWeight: 600, color: "var(--navy)" }}>{n.item_needed}</td>
                      <td style={st.td}>{n.category || "—"}</td>
                      <td style={st.td}>{n.zip_code || "—"}</td>
                      <td style={st.td}>
                        <span style={{ ...st.statusBadge, background: sc.bg, color: sc.color }}>{n.status}</span>
                        {n.is_flagged && <span style={st.flagBadge} title={n.flag_reason || "Flagged"}>⚠️</span>}
                      </td>
                      <td style={st.td}>{fmtDate(n.created_at)}</td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={6} style={st.expandTd}>
                          <div style={st.expandInner}>
                            <div style={st.expandGrid}>
                              <Detail label="Description" value={n.description} />
                              <Detail label="Contact" value={n.contact_email} />
                              <Detail label="Urgency" value={n.urgency} />
                              {n.is_flagged && <Detail label="Flag" value={n.flag_reason || "Flagged"} />}
                              <Detail label="Matched At" value={fmtDate(n.matched_at)} />
                              <Detail label="Ready for Pickup" value={fmtDate(n.ready_for_pickup_at)} />
                              <Detail label="Picked Up" value={fmtDate(n.picked_up_at)} />
                              <Detail label="Delivered" value={fmtDate(n.delivered_at || n.fulfilled_at)} />
                              {n.delivery_volunteer_name && <Detail label="Delivery Vol." value={`${n.delivery_volunteer_name} (${n.delivery_volunteer_email || ""})`} />}
                            </div>

                            {/* Donor Photo + AI Analysis */}
                            {n.donor_photo_url && (
                              <div style={{ marginTop: 16, padding: 16, background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                                <div style={{ fontWeight: 700, fontSize: 13, color: "#0B1D35", marginBottom: 10 }}>Donor Photo</div>
                                <img src={n.donor_photo_url} alt="Donor item" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 12 }} />

                                {/* AI Photo Analysis Scores */}
                                {n.photo_analysis && n.photo_analysis.scores && (
                                  <div style={{ marginTop: 8 }}>
                                    <div style={{ fontWeight: 700, fontSize: 12, color: "#0B1D35", marginBottom: 8 }}>AI Photo Analysis</div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                      {Object.entries(n.photo_analysis.scores).map(([k, v]) => {
                                        const c = v >= 70 ? "#4A7C6F" : v >= 50 ? "#E8A020" : "#D96B4A";
                                        return (
                                          <div key={k}>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                                              <span style={{ fontSize: 12, color: "#6b7280", textTransform: "capitalize" }}>{k.replace(/_/g, " ")}</span>
                                              <span style={{ fontSize: 12, fontWeight: 700, color: c }}>{v}</span>
                                            </div>
                                            <div style={{ height: 5, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                                              <div style={{ height: "100%", width: `${Math.min(v, 100)}%`, background: c, borderRadius: 3 }} />
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    {n.photo_analysis.recommendation && (
                                      <div style={{
                                        marginTop: 8, display: "inline-flex", alignItems: "center", gap: 5,
                                        padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                                        background: n.photo_analysis.recommendation === "auto_approve" ? "rgba(74,124,111,0.1)" : n.photo_analysis.recommendation === "reject" ? "rgba(217,107,74,0.1)" : "rgba(232,160,32,0.1)",
                                        color: n.photo_analysis.recommendation === "auto_approve" ? "#4A7C6F" : n.photo_analysis.recommendation === "reject" ? "#D96B4A" : "#C8851A",
                                      }}>
                                        {n.photo_analysis.recommendation === "auto_approve" ? "✓ Auto-Approved" : n.photo_analysis.recommendation === "reject" ? "✗ Reject Recommended" : "⚠ Manual Review"}
                                      </div>
                                    )}
                                    {n.photo_analysis.summary && (
                                      <p style={{ fontSize: 12, color: "#6b7280", fontStyle: "italic", marginTop: 6, lineHeight: 1.5 }}>{n.photo_analysis.summary}</p>
                                    )}
                                    {n.photo_analysis.flags && n.photo_analysis.flags.length > 0 && (
                                      <div style={{ marginTop: 6, fontSize: 12, color: "#92400E" }}>
                                        Flags: {n.photo_analysis.flags.join(", ")}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Approve / Reject Photo buttons — only for matched status */}
                                {n.status === "matched" && (
                                  <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                                    <button
                                      className="btn-primary"
                                      style={{ ...st.actionBtn, background: "#4A7C6F" }}
                                      disabled={!!actionLoading}
                                      onClick={async () => {
                                        setActionLoading(n.id + "approve-photo");
                                        try {
                                          await api.post(`/api/needs/${n.id}/approve-photo`, {});
                                          load();
                                        } catch { /* silent */ }
                                        setActionLoading("");
                                      }}
                                    >
                                      {actionLoading === n.id + "approve-photo" ? "Approving..." : "Approve & Send to Delivery"}
                                    </button>
                                    <button
                                      style={{ ...st.actionBtn, background: "transparent", color: "#D96B4A", border: "1.5px solid #D96B4A", borderRadius: 8 }}
                                      disabled={!!actionLoading}
                                      onClick={async () => {
                                        const adminNote = window.prompt("Add a note for the donor (optional — AI analysis reason will be included automatically):");
                                        if (adminNote === null) return;
                                        setActionLoading(n.id + "reject-photo");
                                        try {
                                          await api.post(`/api/needs/${n.id}/reject-photo`, { reason: adminNote || "" });
                                          load();
                                        } catch { /* silent */ }
                                        setActionLoading("");
                                      }}
                                    >
                                      {actionLoading === n.id + "reject-photo" ? "Rejecting..." : "Reject & Reopen"}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            <div style={st.expandActions}>
                              {n.status === "open" && (
                                <button className="btn-amber" style={st.actionBtn} disabled={!!actionLoading} onClick={() => updateStatus(n.id, "matched")}>
                                  {actionLoading === n.id + "matched" ? "..." : "Mark Matched"}
                                </button>
                              )}
                              {n.status === "ready_for_pickup" && (
                                <button className="btn-amber" style={st.actionBtn} disabled={!!actionLoading} onClick={() => updateStatus(n.id, "picked_up")}>
                                  {actionLoading === n.id + "picked_up" ? "..." : "Mark Picked Up"}
                                </button>
                              )}
                              {n.status === "picked_up" && (
                                <button className="btn-primary" style={{ ...st.actionBtn, background: "var(--sage)" }} disabled={!!actionLoading} onClick={() => updateStatus(n.id, "delivered")}>
                                  {actionLoading === n.id + "delivered" ? "..." : "Mark Delivered"}
                                </button>
                              )}
                              {n.status !== "delivered" && n.status !== "fulfilled" && (
                                <button className="btn-primary" style={{ ...st.actionBtn, background: "var(--sage)" }} disabled={!!actionLoading} onClick={() => updateStatus(n.id, "delivered")}>
                                  {actionLoading === n.id + "delivered" ? "..." : "Mark Delivered"}
                                </button>
                              )}
                              {(n.status === "open" || n.status === "ready_for_pickup") && (
                                rebroadcastCooldown[n.id] ? (
                                  <button style={{ ...st.actionBtn, ...st.rebroadcastBtnDisabled }} disabled title={rebroadcastCooldown[n.id]}>
                                    Recently Broadcast
                                  </button>
                                ) : rebroadcastSuccess[n.id] ? (
                                  <span style={{ ...st.actionBtn, color: "var(--sage)", fontWeight: 600, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                    ✓ Rebroadcast sent successfully
                                  </span>
                                ) : (
                                  <button
                                    style={{ ...st.actionBtn, ...st.rebroadcastBtn }}
                                    disabled={!!actionLoading}
                                    onClick={() => rebroadcast(n.id, n.status)}
                                  >
                                    {actionLoading === n.id + "rebroadcast" ? "Sending..." :
                                      n.status === "ready_for_pickup" ? "Resend to Delivery Volunteers" : "Resend to Donors"}
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ *
 *  SUBSCRIBERS TAB
 * ═══════════════════════════════════════════════════════════════════ */
const ENGAGEMENT_LEVELS = {
  high:   { label: "High",   bg: "rgba(74,124,111,0.12)",  color: "#4A7C6F" },
  medium: { label: "Medium", bg: "rgba(232,160,32,0.12)",  color: "#C8851A" },
  low:    { label: "Low",    bg: "rgba(11,29,53,0.08)",     color: "var(--text-light)" },
};

function engagementLevel(score) {
  if (score > 60) return "high";
  if (score >= 20) return "medium";
  return "low";
}

function SubscribersTab() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [highOnly, setHighOnly] = useState(false);

  useEffect(() => {
    api.get("/api/admin/subscriber-engagement")
      .then(r => setSubs(r.data?.data || []))
      .finally(() => setLoading(false));
  }, []);

  const displayed = highOnly ? subs.filter(s => s.engagement_score > 60) : subs;

  const highCount = subs.filter(s => s.engagement_score > 60).length;

  return (
    <div>
      <div style={st.tabHeader}>
        <h2 className="serif" style={st.tabTitle}>Subscribers</h2>
        <span style={st.badge}>{subs.length} active</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          <button
            onClick={() => setHighOnly(false)}
            style={{
              ...st.filterToggleBtn,
              background: !highOnly ? "var(--navy)" : "white",
              color: !highOnly ? "white" : "var(--text-mid)",
              borderColor: !highOnly ? "var(--navy)" : "rgba(11,29,53,0.12)",
            }}
          >
            All Subscribers
          </button>
          <button
            onClick={() => setHighOnly(true)}
            style={{
              ...st.filterToggleBtn,
              background: highOnly ? "var(--navy)" : "white",
              color: highOnly ? "white" : "var(--text-mid)",
              borderColor: highOnly ? "var(--navy)" : "rgba(11,29,53,0.12)",
            }}
          >
            High Engagement ({highCount})
          </button>
        </div>
      </div>

      {/* Stats */}
      {!loading && subs.length > 0 && (
        <div style={st.statRow}>
          <div style={st.statCard}>
            <div className="serif" style={st.statNum}>{subs.length}</div>
            <div style={st.statLabel}>Active Subscribers</div>
          </div>
          <div style={st.statCard}>
            <div className="serif" style={{ ...st.statNum, color: "var(--sage)" }}>{highCount}</div>
            <div style={st.statLabel}>High Engagement</div>
          </div>
          <div style={st.statCard}>
            <div className="serif" style={st.statNum}>
              {subs.length > 0 ? Math.round(subs.reduce((a, s) => a + s.engagement_score, 0) / subs.length) : 0}
            </div>
            <div style={st.statLabel}>Avg Score</div>
          </div>
        </div>
      )}

      {loading ? <Skeleton rows={5} /> : displayed.length === 0 ? <Empty msg={highOnly ? "No high-engagement subscribers yet." : "No subscribers yet."} /> : (
        <div style={st.tableWrap}>
          <table style={st.table}>
            <thead>
              <tr>
                {["Name", "Email", "Joined", "Sent", "Open Rate", "Click Rate", "Engagement"].map(h => (
                  <th key={h} style={st.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map(s => {
                const level = engagementLevel(s.engagement_score);
                const eg = ENGAGEMENT_LEVELS[level];
                return (
                  <tr key={s.subscriber_id} style={st.tr}>
                    <td style={{ ...st.td, fontWeight: 600, color: "var(--navy)" }}>{s.name || "—"}</td>
                    <td style={st.td}>{s.email}</td>
                    <td style={st.td}>{fmtDate(s.joined)}</td>
                    <td style={{ ...st.td, textAlign: "center" }}>{s.emails_sent}</td>
                    <td style={{ ...st.td, textAlign: "center" }}>{s.open_rate}%</td>
                    <td style={{ ...st.td, textAlign: "center" }}>{s.click_rate}%</td>
                    <td style={st.td}>
                      <span style={{ ...st.statusBadge, background: eg.bg, color: eg.color }}>
                        {eg.label} ({s.engagement_score})
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ *
 *  RESOURCES TAB
 * ═══════════════════════════════════════════════════════════════════ */
const FLAG_REASON_LABELS = {
  inaccurate_info: "Inaccurate info",
  bad_service: "Bad service",
  doesnt_exist: "Doesn't exist",
  wrong_contact: "Wrong contact",
  other: "Other",
};

function flagSeverity(count) {
  if (count >= 5) return { label: "Hidden", bg: "rgba(217,107,74,0.12)", color: "#D96B4A" };
  if (count >= 2) return { label: "High", bg: "rgba(232,160,32,0.12)", color: "#C8851A" };
  return { label: "Low", bg: "rgba(11,29,53,0.06)", color: "var(--text-mid)" };
}

function ResourcesTab() {
  const [resources, setResources] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...RESOURCE_INIT });
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [subView, setSubView] = useState("all"); // "all" | "flagged"
  const [expandedFlags, setExpandedFlags] = useState(null); // resource id
  const [flagDetails, setFlagDetails] = useState([]); // flags for expanded resource
  const [flagsLoading, setFlagsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get("/api/resources").then(r => r.data?.data || []),
      api.get("/api/resources/flagged").then(r => r.data?.data || []).catch(() => []),
    ]).then(([all, fl]) => { setResources(all); setFlagged(fl); }).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const verify = async (id) => {
    await api.patch(`/api/resources/${id}/verify`, {}).catch(() => {});
    load();
  };

  const reverify = async (id) => {
    await api.post(`/api/resources/${id}/reverify`, {}).catch(() => {});
    load();
  };

  const loadFlags = async (resourceId) => {
    if (expandedFlags === resourceId) { setExpandedFlags(null); return; }
    setExpandedFlags(resourceId);
    setFlagsLoading(true);
    try {
      const r = await api.get(`/api/resources/${resourceId}/flags`);
      setFlagDetails(r.data?.data || []);
    } catch { setFlagDetails([]); }
    setFlagsLoading(false);
  };

  const dismissFlags = async (resourceId) => {
    if (!window.confirm("Dismiss all flags and restore this resource?")) return;
    setActionLoading(resourceId + "dismiss");
    try {
      await api.post(`/api/resources/${resourceId}/flags/dismiss`, {});
      setExpandedFlags(null);
      load();
    } catch { /* silent */ }
    setActionLoading("");
  };

  const confirmFlags = async (resourceId) => {
    if (!window.confirm("Confirm flags and deactivate this resource?")) return;
    setActionLoading(resourceId + "confirm");
    try {
      await api.post(`/api/resources/${resourceId}/flags/confirm`, {});
      setExpandedFlags(null);
      load();
    } catch { /* silent */ }
    setActionLoading("");
  };

  const saveResource = async () => {
    setSaveErr("");
    if (!form.name.trim()) { setSaveErr("Name is required."); return; }
    setSaving(true);
    try {
      await api.post("/api/resources", form);
      setShowModal(false);
      setForm({ ...RESOURCE_INIT });
      load();
    } catch (e) {
      setSaveErr(e.response?.data?.error || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const displayList = subView === "flagged" ? flagged : resources;

  return (
    <div>
      <div style={st.tabHeader}>
        <h2 style={st.tabTitle}>Resources</h2>
        <span style={st.badge}>{resources.length}</span>
        {flagged.length > 0 && (
          <span style={{ ...st.badge, background: "rgba(217,107,74,0.12)", color: "#D96B4A", marginLeft: 4 }}>
            {flagged.length} flagged
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          <button
            onClick={() => setSubView("all")}
            style={{
              ...st.filterToggleBtn,
              background: subView === "all" ? "#0B1D35" : "white",
              color: subView === "all" ? "white" : "#6B7280",
              borderColor: subView === "all" ? "#0B1D35" : "rgba(11,29,53,0.12)",
            }}
          >
            All
          </button>
          <button
            onClick={() => setSubView("flagged")}
            style={{
              ...st.filterToggleBtn,
              background: subView === "flagged" ? "#D96B4A" : "white",
              color: subView === "flagged" ? "white" : "#6B7280",
              borderColor: subView === "flagged" ? "#D96B4A" : "rgba(11,29,53,0.12)",
            }}
          >
            Flagged ({flagged.length})
          </button>
          <button className="btn-amber" style={{ padding: "8px 16px", fontSize: 12, borderRadius: 100, marginLeft: 8 }} onClick={() => setShowModal(true)}>
            + Add
          </button>
        </div>
      </div>

      {loading ? <Skeleton rows={4} /> : displayList.length === 0 ? (
        <Empty msg={subView === "flagged" ? "No flagged resources. All clear!" : "No resources yet."} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {displayList.map(r => {
            const fc = r.flag_count || 0;
            const sev = flagSeverity(fc);
            const isExpanded = expandedFlags === r.id;
            return (
              <div key={r.id} style={{
                ...st.resCard,
                borderLeft: fc >= 5 ? "4px solid #D96B4A" : fc >= 2 ? "4px solid #E8A020" : fc >= 1 ? "4px solid rgba(11,29,53,0.12)" : undefined,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  {r.category && <span style={{ ...st.statusBadge, background: "rgba(232,160,32,0.12)", color: "#C8851A" }}>{r.category}</span>}
                  {fc > 0 && (
                    <span style={{ ...st.statusBadge, background: sev.bg, color: sev.color }}>
                      {fc} flag{fc !== 1 ? "s" : ""} — {sev.label}
                    </span>
                  )}
                  {!r.is_active && (
                    <span style={{ ...st.statusBadge, background: "rgba(217,107,74,0.12)", color: "#D96B4A" }}>DEACTIVATED</span>
                  )}
                  {r.is_verified ? (
                    <>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sage)", marginLeft: "auto" }}>Verified</span>
                      <button onClick={() => reverify(r.id)} style={st.verifyBtn}>Re-verify</button>
                    </>
                  ) : (
                    <button onClick={() => verify(r.id)} style={{ ...st.verifyBtn, marginLeft: "auto" }}>Verify</button>
                  )}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#0B1D35", marginBottom: 4 }}>{r.name}</div>
                {r.address && <div style={{ fontSize: 13, color: "#6B7280" }}>📍 {r.address}{r.city ? `, ${r.city}` : ""}</div>}
                {r.phone && <div style={{ fontSize: 13, color: "#6B7280" }}>📞 {r.phone}</div>}

                {/* Flag actions */}
                {fc > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(11,29,53,0.06)" }}>
                    <button
                      onClick={() => loadFlags(r.id)}
                      style={{ fontSize: 12, fontWeight: 600, color: "#0B1D35", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {isExpanded ? "Hide flag details" : `View ${fc} flag${fc !== 1 ? "s" : ""}`}
                    </button>

                    {isExpanded && (
                      <div style={{ marginTop: 10 }}>
                        {flagsLoading ? (
                          <div style={{ fontSize: 13, color: "#6B7280" }}>Loading...</div>
                        ) : flagDetails.length === 0 ? (
                          <div style={{ fontSize: 13, color: "#6B7280" }}>No flag details found.</div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                            {flagDetails.map((f, i) => (
                              <div key={f.id || i} style={{ fontSize: 13, background: "rgba(11,29,53,0.02)", borderRadius: 8, padding: "8px 12px", border: "1px solid rgba(11,29,53,0.06)" }}>
                                <div style={{ fontWeight: 600, color: "#0B1D35", marginBottom: 2 }}>
                                  {FLAG_REASON_LABELS[f.reason] || f.reason}
                                </div>
                                {f.details && <div style={{ color: "#6B7280" }}>{f.details}</div>}
                                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
                                  {fmtDate(f.created_at)}
                                  {f.reporter_email && <> — {f.reporter_email}</>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="btn-primary"
                            style={{ padding: "8px 18px", fontSize: 12, background: "var(--sage)", border: "none", borderRadius: 8, color: "white", fontWeight: 600, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                            disabled={!!actionLoading}
                            onClick={() => dismissFlags(r.id)}
                          >
                            {actionLoading === r.id + "dismiss" ? "..." : "Dismiss Flags (Resource OK)"}
                          </button>
                          <button
                            style={{ padding: "8px 18px", fontSize: 12, background: "transparent", border: "1.5px solid #D96B4A", borderRadius: 8, color: "#D96B4A", fontWeight: 600, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                            disabled={!!actionLoading}
                            onClick={() => confirmFlags(r.id)}
                          >
                            {actionLoading === r.id + "confirm" ? "..." : "Confirm & Deactivate"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={st.overlay} onClick={() => setShowModal(false)}>
          <div style={st.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "#0B1D35" }}>Add Resource</h3>
              <button onClick={() => setShowModal(false)} style={st.closeBtn}>✕</button>
            </div>
            <div style={st.modalGrid}>
              <ModalField label="Name *" value={form.name} onChange={v => setF("name", v)} />
              <ModalField label="Category" value={form.category} onChange={v => setF("category", v)} placeholder="e.g. Food Bank" />
              <ModalField label="Address" value={form.address} onChange={v => setF("address", v)} full />
              <ModalField label="City" value={form.city} onChange={v => setF("city", v)} />
              <ModalField label="State" value={form.state} onChange={v => setF("state", v)} />
              <ModalField label="Zip Code" value={form.zip_code} onChange={v => setF("zip_code", v)} />
              <ModalField label="Phone" value={form.phone} onChange={v => setF("phone", v)} />
              <ModalField label="Website" value={form.website} onChange={v => setF("website", v)} full />
              <ModalField label="Hours" value={form.hours} onChange={v => setF("hours", v)} full />
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={st.mLabel}>Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setF("description", e.target.value)}
                  rows={3}
                  style={{ ...st.mInput, resize: "vertical" }}
                />
              </div>
            </div>
            {saveErr && <div style={st.errSmall}>{saveErr}</div>}
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
              <button className="btn-outline" onClick={() => setShowModal(false)} style={{ padding: "10px 24px", fontSize: 13 }}>Cancel</button>
              <button className="btn-amber" onClick={saveResource} disabled={saving} style={{ padding: "10px 24px", fontSize: 13, opacity: saving ? 0.6 : 1 }}>
                {saving ? "Saving..." : "Save Resource"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ *
 *  TUTORING TAB
 * ═══════════════════════════════════════════════════════════════════ */
function TutoringTab() {
  const [requests, setRequests] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchingId, setMatchingId] = useState(null);
  const [selectedTutor, setSelectedTutor] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get("/api/tutoring/requests").then(r => r.data?.data || []),
      api.get("/api/tutoring/tutors").then(r => r.data?.data || []),
    ]).then(([req, tut]) => { setRequests(req); setTutors(tut); }).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const doMatch = async (requestId) => {
    if (!selectedTutor) return;
    try {
      await api.post("/api/tutoring/match", { request_id: requestId, tutor_id: selectedTutor });
      setMatchingId(null);
      setSelectedTutor("");
      load();
    } catch { /* silent */ }
  };

  return (
    <div>
      <div style={st.tabHeader}>
        <h2 className="serif" style={st.tabTitle}>Tutoring</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Open Requests */}
        <div>
          <h3 style={st.subTitle}>Open Requests <span style={st.badge}>{requests.length}</span></h3>
          {loading ? <Skeleton rows={3} /> : requests.length === 0 ? <Empty msg="No open requests." /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {requests.map(r => (
                <div key={r.id} style={st.tutorCard}>
                  <div style={{ fontWeight: 600, color: "var(--navy)", fontSize: 14 }}>{r.student_name}</div>
                  <div style={{ fontSize: 13, color: "var(--text-mid)" }}>{r.subject} · {r.grade_level || "Any grade"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-light)", marginTop: 2 }}>Parent: {r.parent_name}</div>
                  {matchingId === r.id ? (
                    <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                      <select value={selectedTutor} onChange={e => setSelectedTutor(e.target.value)} style={{ ...st.mInput, flex: 1, padding: "8px 12px", fontSize: 12 }}>
                        <option value="">Select tutor...</option>
                        {tutors.map(t => <option key={t.id} value={t.id}>{t.name} — {t.subjects}</option>)}
                      </select>
                      <button className="btn-amber" style={{ padding: "8px 16px", fontSize: 12 }} onClick={() => doMatch(r.id)}>Match</button>
                      <button className="btn-outline" style={{ padding: "8px 12px", fontSize: 12 }} onClick={() => { setMatchingId(null); setSelectedTutor(""); }}>✕</button>
                    </div>
                  ) : (
                    <button className="btn-outline" style={{ marginTop: 8, padding: "6px 14px", fontSize: 12 }} onClick={() => setMatchingId(r.id)}>
                      Assign Tutor
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tutors */}
        <div>
          <h3 style={st.subTitle}>Verified Tutors <span style={st.badge}>{tutors.length}</span></h3>
          {loading ? <Skeleton rows={3} /> : tutors.length === 0 ? <Empty msg="No verified tutors." /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tutors.map(t => (
                <div key={t.id} style={st.tutorCard}>
                  <div style={{ fontWeight: 600, color: "var(--navy)", fontSize: 14 }}>{t.name}</div>
                  <div style={{ fontSize: 13, color: "var(--text-mid)" }}>{t.subjects}</div>
                  {t.grade_levels && <div style={{ fontSize: 12, color: "var(--text-light)" }}>Grades: {t.grade_levels}</div>}
                  <div style={{ fontSize: 12, color: "var(--text-light)" }}>{t.email}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ *
 *  REVIEW QUEUE TAB
 * ═══════════════════════════════════════════════════════════════════ */
function ReviewQueueTab() {
  const [queue, setQueue] = useState([]);
  const [photoQueue, setPhotoQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get("/api/get-help/admin/needs/review-queue").then(r => setQueue(r.data?.data || [])).catch(() => {}),
      api.get("/api/needs").then(r => {
        const all = r.data?.data || [];
        setPhotoQueue(all.filter(n => n.status === "matched" && n.donor_photo_url && !n.ready_for_pickup_at));
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const approveNeed = async (id) => {
    if (!window.confirm("Approve this request and broadcast to all subscribers?")) return;
    setActionLoading(id + "approve");
    try {
      await api.post(`/api/get-help/admin/needs/${id}/approve`, {});
    } catch { /* silent */ }
    setActionLoading("");
    load();
  };

  const rejectNeed = async (id) => {
    const reason = window.prompt("Rejection reason (will be sent to requester):");
    if (!reason) return;
    setActionLoading(id + "reject");
    try {
      await api.post(`/api/get-help/admin/needs/${id}/reject`, { reason });
    } catch { /* silent */ }
    setActionLoading("");
    load();
  };

  const approvePhoto = async (id) => {
    setActionLoading(id + "approve-photo");
    try {
      await api.post(`/api/needs/${id}/approve-photo`, {});
    } catch { /* silent */ }
    setActionLoading("");
    load();
  };

  const rejectPhoto = async (id) => {
    const adminNote = window.prompt("Add a note for the donor (optional — AI analysis reason will be included automatically):");
    if (adminNote === null) return;
    setActionLoading(id + "reject-photo");
    try {
      await api.post(`/api/needs/${id}/reject-photo`, { reason: adminNote || "" });
    } catch { /* silent */ }
    setActionLoading("");
    load();
  };

  const totalPending = queue.length + photoQueue.length;

  // Reusable AI score bars
  const ScoreBars = ({ scores, overall_pass, flags, review_reason }) => (
    <div style={{ marginTop: 12, padding: "14px 16px", background: "#F1F5F9", borderRadius: 10, fontSize: 12 }}>
      <div style={{ fontWeight: 700, color: "#0B1D35", marginBottom: 10 }}>AI Analysis</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Object.entries(scores).map(([k, v]) => {
          const c = v >= 70 ? "#4A7C6F" : v >= 50 ? "#E8A020" : "#D96B4A";
          return (
            <div key={k}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ color: "#6b7280", textTransform: "capitalize", fontWeight: 500 }}>{k.replace(/_/g, " ")}</span>
                <span style={{ fontWeight: 700, color: c }}>{v}</span>
              </div>
              <div style={{ height: 6, background: "rgba(11,29,53,0.06)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(v, 100)}%`, background: c, borderRadius: 3, transition: "width 0.4s ease" }} />
              </div>
            </div>
          );
        })}
      </div>
      {overall_pass !== undefined && (
        <div style={{ marginTop: 10, padding: "6px 10px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, background: overall_pass ? "rgba(74,124,111,0.1)" : "rgba(217,107,74,0.1)", color: overall_pass ? "#4A7C6F" : "#D96B4A" }}>
          {overall_pass ? "✓ Passed" : "✗ Flagged"}
        </div>
      )}
      {flags && flags.length > 0 && (
        <div style={{ marginTop: 8, color: "#C8851A", fontSize: 12 }}>Flags: {flags.join(", ")}</div>
      )}
      {review_reason && (
        <div style={{ marginTop: 4, color: "#6b7280", fontStyle: "italic", fontSize: 12 }}>{review_reason}</div>
      )}
    </div>
  );

  return (
    <div>
      <div style={st.tabHeader}>
        <h2 className="serif" style={st.tabTitle}>Review Queue</h2>
        {totalPending > 0 && <span style={{ ...st.badge, background: "rgba(217,107,74,0.12)", color: "#D96B4A" }}>{totalPending} pending</span>}
      </div>

      {loading ? <Skeleton rows={4} /> : totalPending === 0 ? (
        <Empty msg="No items pending review. All clear!" />
      ) : (
        <>
          {/* ── NEED APPROVALS ────────────────────────────── */}
          {queue.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0B1D35", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                🔍 Need Requests ({queue.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {queue.map(n => {
                  const ai = n.ai_score || {};
                  const scores = ai.scores || {};
                  return (
                    <div key={n.id} style={{ background: "white", borderRadius: 14, padding: "20px 24px", border: "1px solid rgba(11,29,53,0.06)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                        {n.category && <span style={{ ...st.statusBadge, background: "rgba(232,160,32,0.12)", color: "#C8851A" }}>{n.category}</span>}
                        <span style={{ ...st.statusBadge, background: "rgba(232,160,32,0.15)", color: "#C8851A" }}>PENDING</span>
                        <span style={{ fontSize: 12, color: "var(--text-light)", marginLeft: "auto" }}>{fmtDate(n.created_at)}</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: "var(--navy)", marginBottom: 6 }}>{n.item_needed}</div>
                      <div style={{ fontSize: 14, color: "var(--text-mid)", marginBottom: 4 }}>By: {n.requester_name} · {n.contact_email}</div>
                      {n.description && <div style={{ fontSize: 13, color: "var(--text-mid)", lineHeight: 1.5, marginBottom: 8 }}>{n.description}</div>}
                      {n.zip_code && <div style={{ fontSize: 13, color: "var(--text-light)" }}>📍 {n.zip_code}</div>}

                      {Object.keys(scores).length > 0 && (
                        <ScoreBars scores={scores} overall_pass={ai.overall_pass} flags={ai.flags} review_reason={ai.review_reason} />
                      )}

                      <div style={{ display: "flex", gap: 10, marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(11,29,53,0.06)" }}>
                        <button className="btn-primary" style={{ ...st.actionBtn, background: "var(--sage)" }} disabled={!!actionLoading} onClick={() => approveNeed(n.id)}>
                          {actionLoading === n.id + "approve" ? "Approving..." : "Approve & Broadcast"}
                        </button>
                        <button style={{ ...st.actionBtn, background: "transparent", border: "1.5px solid #D96B4A", color: "#D96B4A", borderRadius: 8, fontWeight: 600, cursor: "pointer" }} disabled={!!actionLoading} onClick={() => rejectNeed(n.id)}>
                          {actionLoading === n.id + "reject" ? "Rejecting..." : "Reject"}
                        </button>
                        <a href={`/panel/review/${n.id}`} style={{ ...st.actionBtn, color: "var(--text-light)", textDecoration: "underline", fontSize: 13, display: "inline-flex", alignItems: "center" }}>
                          Full Review →
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── PHOTO REVIEWS ─────────────────────────────── */}
          {photoQueue.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0B1D35", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                📸 Donor Photo Reviews ({photoQueue.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {photoQueue.map(n => {
                  const analysis = n.photo_analysis || {};
                  const scores = analysis.scores || {};
                  const rec = analysis.recommendation || "manual_review";
                  const recColor = rec === "reject" ? "#D96B4A" : rec === "auto_approve" ? "#4A7C6F" : "#C8851A";
                  const recLabel = rec === "reject" ? "✗ Reject Recommended" : rec === "auto_approve" ? "✓ Auto-Approve" : "⚠ Manual Review";
                  return (
                    <div key={n.id} style={{ background: "white", borderRadius: 14, padding: "20px 24px", border: "1px solid rgba(11,29,53,0.06)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                        {n.category && <span style={{ ...st.statusBadge, background: "rgba(232,160,32,0.12)", color: "#C8851A" }}>{n.category}</span>}
                        <span style={{ ...st.statusBadge, background: `${recColor}18`, color: recColor }}>{recLabel}</span>
                        <span style={{ fontSize: 12, color: "var(--text-light)", marginLeft: "auto" }}>{fmtDate(n.matched_at)}</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: "var(--navy)", marginBottom: 6 }}>{n.item_needed}</div>
                      <div style={{ fontSize: 14, color: "var(--text-mid)", marginBottom: 4 }}>By: {n.requester_name} · {n.zip_code}</div>
                      {n.description && <div style={{ fontSize: 13, color: "var(--text-mid)", lineHeight: 1.5, marginBottom: 8 }}>{n.description}</div>}

                      {/* Photo */}
                      {n.donor_photo_url && (
                        <div style={{ marginTop: 12, marginBottom: 12 }}>
                          <img src={n.donor_photo_url} alt={n.item_needed} style={{ maxWidth: "100%", maxHeight: 240, borderRadius: 10, border: "1px solid rgba(11,29,53,0.06)", objectFit: "cover" }} />
                        </div>
                      )}

                      {/* AI Scores */}
                      {Object.keys(scores).length > 0 && (
                        <ScoreBars scores={scores} overall_pass={analysis.overall_pass} flags={analysis.flags} review_reason={analysis.summary} />
                      )}

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 10, marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(11,29,53,0.06)" }}>
                        <button className="btn-primary" style={{ ...st.actionBtn, background: "#4A7C6F" }} disabled={!!actionLoading} onClick={() => approvePhoto(n.id)}>
                          {actionLoading === n.id + "approve-photo" ? "Approving..." : "Approve & Send to Delivery"}
                        </button>
                        <button style={{ ...st.actionBtn, background: "transparent", border: "1.5px solid #D96B4A", color: "#D96B4A", borderRadius: 8, fontWeight: 600, cursor: "pointer" }} disabled={!!actionLoading} onClick={() => rejectPhoto(n.id)}>
                          {actionLoading === n.id + "reject-photo" ? "Rejecting..." : "Reject & Reopen"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ *
 *  ABUSE TAB
 * ═══════════════════════════════════════════════════════════════════ */
function AbuseTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("submitters"); // submitters | needs | blocked
  const [actionLoading, setActionLoading] = useState("");
  const [expandedSubmitter, setExpandedSubmitter] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/api/get-help/admin/abuse")
      .then(r => setData(r.data?.data || {}))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const clearStrikes = async (email) => {
    if (!window.confirm(`Clear all strikes and unblock ${email}? This will also reset report counts on their needs.`)) return;
    setActionLoading(email + "clear");
    try {
      await api.post("/api/get-help/admin/submitters/clear", { email });
      load();
    } catch { /* silent */ }
    setActionLoading("");
  };

  const blockSubmitter = async (email) => {
    const reason = window.prompt(`Block ${email}? Enter reason:`);
    if (!reason) return;
    setActionLoading(email + "block");
    try {
      await api.post("/api/get-help/admin/submitters/block", { email, reason });
      load();
    } catch { /* silent */ }
    setActionLoading("");
  };

  const submitters = data?.flagged_submitters || [];
  const reportedNeeds = data?.reported_needs || [];
  const blocked = data?.blocked_submitters || [];

  const severityColor = (count) => {
    if (count >= 5) return { bg: "rgba(217,107,74,0.12)", color: "#D96B4A", label: "Auto-blocked" };
    if (count >= 3) return { bg: "rgba(217,107,74,0.12)", color: "#D96B4A", label: "High" };
    if (count >= 2) return { bg: "rgba(232,160,32,0.12)", color: "#C8851A", label: "Medium" };
    return { bg: "rgba(74,124,111,0.12)", color: "#4A7C6F", label: "Low" };
  };

  return (
    <div>
      <div style={st.tabHeader}>
        <h2 className="serif" style={st.tabTitle}>Abuse Reports</h2>
        {submitters.length > 0 && (
          <span style={{ ...st.badge, background: "rgba(217,107,74,0.12)", color: "#D96B4A" }}>
            {submitters.length} flagged
          </span>
        )}
      </div>

      {/* Sub-navigation */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { key: "submitters", label: `Flagged Submitters (${submitters.length})` },
          { key: "needs", label: `Reported Needs (${reportedNeeds.length})` },
          { key: "blocked", label: `Blocked (${blocked.length})` },
        ].map(v => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            style={{
              ...st.filterToggleBtn,
              background: view === v.key ? "#0B1D35" : "white",
              color: view === v.key ? "white" : "#6B7280",
              borderColor: view === v.key ? "#0B1D35" : "#e5e7eb",
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {loading ? <Skeleton rows={4} /> : (
        <>
          {/* Flagged Submitters */}
          {view === "submitters" && (
            submitters.length === 0 ? <Empty msg="No flagged submitters." /> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {submitters.map(s => {
                  const sev = severityColor(s.strike_count);
                  const isExpanded = expandedSubmitter === s.email;
                  return (
                    <div key={s.email} style={{ background: "white", borderRadius: 14, border: "1px solid rgba(11,29,53,0.06)", overflow: "hidden" }}>
                      <div
                        style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                        onClick={() => setExpandedSubmitter(isExpanded ? null : s.email)}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--navy)" }}>{s.email}</span>
                          <span style={{ ...st.statusBadge, background: sev.bg, color: sev.color }}>
                            {s.strike_count} strike{s.strike_count !== 1 ? "s" : ""} — {sev.label}
                          </span>
                        </div>
                        <span style={{ color: "var(--text-light)", fontSize: 18 }}>{isExpanded ? "▾" : "▸"}</span>
                      </div>

                      {isExpanded && (
                        <div style={{ padding: "0 20px 16px", borderTop: "1px solid rgba(11,29,53,0.06)" }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-light)", margin: "12px 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Strike History
                          </div>
                          {s.strikes.map((strike, i) => (
                            <div key={strike.id || i} style={{ fontSize: 13, color: "var(--text-mid)", padding: "6px 0", borderBottom: i < s.strikes.length - 1 ? "1px solid rgba(11,29,53,0.04)" : "none" }}>
                              <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{strike.reason}</span>
                              <span style={{ color: "var(--text-light)", marginLeft: 8 }}>({strike.source})</span>
                              <span style={{ color: "var(--text-light)", marginLeft: 8 }}>{fmtDate(strike.created_at)}</span>
                            </div>
                          ))}
                          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                            <button
                              onClick={() => clearStrikes(s.email)}
                              disabled={!!actionLoading}
                              style={{ ...st.actionBtn, background: "var(--sage)", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", opacity: actionLoading ? 0.6 : 1 }}
                            >
                              {actionLoading === s.email + "clear" ? "Clearing..." : "Clear All Strikes"}
                            </button>
                            <button
                              onClick={() => blockSubmitter(s.email)}
                              disabled={!!actionLoading}
                              style={{ ...st.actionBtn, background: "transparent", border: "1.5px solid #D96B4A", color: "#D96B4A", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", opacity: actionLoading ? 0.6 : 1 }}
                            >
                              {actionLoading === s.email + "block" ? "Blocking..." : "Block Submitter"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Reported Needs */}
          {view === "needs" && (
            reportedNeeds.length === 0 ? <Empty msg="No reported needs." /> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {reportedNeeds.map(n => {
                  const sev = severityColor(n.report_count);
                  return (
                    <div key={n.id} style={{ background: "white", borderRadius: 14, padding: "16px 20px", border: "1px solid rgba(11,29,53,0.06)", borderLeft: `4px solid ${sev.color}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontWeight: 700, fontSize: 15, color: "var(--navy)" }}>{n.item_needed}</span>
                          <span style={{ ...st.statusBadge, background: sev.bg, color: sev.color }}>
                            {n.report_count} report{n.report_count !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <span style={{ fontSize: 12, color: "var(--text-light)" }}>{fmtDate(n.created_at)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-mid)", marginBottom: 4 }}>
                        By: {n.requester_name || "—"} · {n.contact_email || "—"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-light)" }}>
                        Status: {n.status} · Review: {n.review_status}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Blocked Submitters */}
          {view === "blocked" && (
            blocked.length === 0 ? <Empty msg="No blocked submitters." /> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {blocked.map(b => (
                  <div key={b.id} style={{ background: "white", borderRadius: 14, padding: "16px 20px", border: "1px solid rgba(11,29,53,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "var(--navy)" }}>{b.email}</div>
                      <div style={{ fontSize: 12, color: "var(--text-light)", marginTop: 2 }}>
                        {b.reason || "No reason given"} · Blocked {fmtDate(b.blocked_at)}
                      </div>
                    </div>
                    <button
                      onClick={() => clearStrikes(b.email)}
                      disabled={!!actionLoading}
                      style={{ ...st.actionBtn, background: "var(--sage)", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, opacity: actionLoading ? 0.6 : 1 }}
                    >
                      {actionLoading === b.email + "clear" ? "Unblocking..." : "Unblock & Clear"}
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ *
 *  SHARED COMPONENTS
 * ═══════════════════════════════════════════════════════════════════ */
function Detail({ label, value }) {
  if (!value || value === "—") return null;
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-light)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: "var(--navy)" }}>{value}</div>
    </div>
  );
}

function ModalField({ label, value, onChange, full, placeholder }) {
  return (
    <div style={full ? { gridColumn: "1 / -1" } : undefined}>
      <label style={st.mLabel}>{label}</label>
      <input style={st.mInput} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ *
 *  PARTNERS TAB
 * ═══════════════════════════════════════════════════════════════════ */

const PARTNER_STATUS_COLORS = {
  pending:  { bg: "rgba(232,160,32,0.12)", color: "#C8851A" },
  approved: { bg: "rgba(74,124,111,0.12)", color: "#4A7C6F" },
  declined: { bg: "rgba(217,107,74,0.12)", color: "#D96B4A" },
};

function PartnersTab() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [actionLoading, setActionLoading] = useState("");
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/api/partners/admin/all")
      .then(r => setPartners(r.data?.data || []))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const filtered = filter === "all" ? partners : partners.filter(p => p.status === filter);
  const counts = { pending: 0, approved: 0, declined: 0 };
  partners.forEach(p => { if (counts[p.status] !== undefined) counts[p.status]++; });

  const handleReview = async (id, status) => {
    const label = status === "approved" ? "approve" : "decline";
    if (!window.confirm(`Are you sure you want to ${label} this partner application?`)) return;
    setActionLoading(id + status);
    try {
      await api.patch(`/api/partners/admin/${id}/review`, { status });
      load();
    } catch { /* silent */ }
    setActionLoading("");
  };

  const handleFeature = async (id, isFeatured) => {
    setActionLoading(id + "feature");
    try {
      await api.patch(`/api/partners/admin/${id}/feature`, { is_featured: !isFeatured });
      load();
    } catch { /* silent */ }
    setActionLoading("");
  };

  return (
    <>
      <div style={st.tabHeader}>
        <h2 style={st.tabTitle}>Business Partners</h2>
        <span style={st.badge}>{partners.length} total</span>
      </div>

      {/* Status stats */}
      <div style={st.statRow}>
        {[
          { label: "Pending", num: counts.pending, color: "#C8851A" },
          { label: "Approved", num: counts.approved, color: "#4A7C6F" },
          { label: "Declined", num: counts.declined, color: "#D96B4A" },
        ].map((s, i) => (
          <div key={i} style={st.statCard}>
            <div style={{ ...st.statNum, color: s.color }}>{s.num}</div>
            <div style={st.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter toggles */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["pending", "approved", "declined", "all"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              ...st.filterToggleBtn,
              background: filter === f ? "#0B1D35" : "white",
              color: filter === f ? "white" : "#6B7280",
              borderColor: filter === f ? "#0B1D35" : "rgba(11,29,53,0.12)",
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} {f !== "all" ? `(${counts[f] || 0})` : `(${partners.length})`}
          </button>
        ))}
      </div>

      {loading ? <Skeleton rows={4} /> : filtered.length === 0 ? <Empty msg={`No ${filter} partner applications.`} /> : (
        <div style={st.tableWrap}>
          <table style={st.table}>
            <thead>
              <tr>
                <th style={st.th}>Business</th>
                <th style={st.th}>Type</th>
                <th style={st.th}>Contact</th>
                <th style={st.th}>Resources</th>
                <th style={st.th}>Status</th>
                <th style={st.th}>Date</th>
                <th style={st.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const sc = PARTNER_STATUS_COLORS[p.status] || PARTNER_STATUS_COLORS.pending;
                const isExp = expanded === p.id;
                return (
                  <Fragment key={p.id}>
                    <tr style={st.tr} onClick={() => setExpanded(isExp ? null : p.id)}>
                      <td style={{ ...st.td, fontWeight: 600, color: "var(--navy)", cursor: "pointer" }}>
                        {p.is_featured && <span title="Featured" style={{ marginRight: 4 }}>⭐</span>}
                        {p.business_name}
                      </td>
                      <td style={st.td}>{p.business_type}</td>
                      <td style={st.td}>
                        <div style={{ fontSize: 13 }}>{p.contact_name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-light)" }}>{p.contact_email}</div>
                      </td>
                      <td style={st.td}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {(p.resource_categories || []).slice(0, 3).map(c => (
                            <span key={c} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 100, background: "rgba(11,29,53,0.05)", color: "var(--text-mid)" }}>
                              {c.replace(/_/g, " ")}
                            </span>
                          ))}
                          {(p.resource_categories || []).length > 3 && (
                            <span style={{ fontSize: 10, color: "var(--text-light)" }}>+{p.resource_categories.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td style={st.td}>
                        <span style={{ ...st.statusBadge, background: sc.bg, color: sc.color }}>
                          {p.status}
                        </span>
                      </td>
                      <td style={st.td}>{fmtDate(p.created_at)}</td>
                      <td style={st.td}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {p.status === "pending" && (
                            <>
                              <button
                                className="btn-primary"
                                style={{ ...st.actionBtn, background: "var(--sage)", fontSize: 11, padding: "6px 12px" }}
                                disabled={actionLoading === p.id + "approved"}
                                onClick={(e) => { e.stopPropagation(); handleReview(p.id, "approved"); }}
                              >
                                {actionLoading === p.id + "approved" ? "..." : "Approve"}
                              </button>
                              <button
                                style={{ ...st.actionBtn, background: "transparent", border: "1px solid #D96B4A", color: "#D96B4A", fontSize: 11, padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                disabled={actionLoading === p.id + "declined"}
                                onClick={(e) => { e.stopPropagation(); handleReview(p.id, "declined"); }}
                              >
                                {actionLoading === p.id + "declined" ? "..." : "Decline"}
                              </button>
                            </>
                          )}
                          {p.status === "approved" && (
                            <button
                              style={{ ...st.actionBtn, background: "transparent", border: "1px solid var(--amber)", color: "var(--amber)", fontSize: 11, padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                              disabled={actionLoading === p.id + "feature"}
                              onClick={(e) => { e.stopPropagation(); handleFeature(p.id, p.is_featured); }}
                            >
                              {p.is_featured ? "Unfeature" : "Feature"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExp && (
                      <tr>
                        <td colSpan={7} style={st.expandTd}>
                          <div style={st.expandInner}>
                            <div style={st.expandGrid}>
                              <div><div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 2 }}>Address</div><div style={{ fontSize: 13 }}>{p.address}, {p.city} {p.zip_code || ""}</div></div>
                              {p.phone && <div><div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 2 }}>Phone</div><div style={{ fontSize: 13 }}>{p.phone}</div></div>}
                              {p.website && <div><div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 2 }}>Website</div><div style={{ fontSize: 13 }}><a href={p.website.startsWith("http") ? p.website : `https://${p.website}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--amber)" }}>{p.website}</a></div></div>}
                              {p.contact_title && <div><div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 2 }}>Title</div><div style={{ fontSize: 13 }}>{p.contact_title}</div></div>}
                              {p.capacity && <div><div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 2 }}>Capacity</div><div style={{ fontSize: 13 }}>{p.capacity}</div></div>}
                              {p.availability && <div><div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 2 }}>Availability</div><div style={{ fontSize: 13 }}>{p.availability}</div></div>}
                            </div>
                            {p.description && (
                              <div style={{ fontSize: 13, color: "var(--text-mid)", lineHeight: 1.6, padding: "8px 0", borderTop: "1px solid rgba(11,29,53,0.06)" }}>
                                <strong>Description:</strong> {p.description}
                              </div>
                            )}
                            {p.admin_notes && (
                              <div style={{ fontSize: 12, color: "var(--text-light)", marginTop: 8, fontStyle: "italic" }}>
                                Admin notes: {p.admin_notes}
                              </div>
                            )}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                              {(p.resource_categories || []).map(c => (
                                <span key={c} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 100, background: "rgba(232,160,32,0.08)", color: "#C8851A", fontWeight: 600 }}>
                                  {c.replace(/_/g, " ")}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════ *
 *  PROFESSIONALS TAB
 * ═══════════════════════════════════════════════════════════════════ */

const PRO_STATUS_COLORS = {
  pending:  { bg: "rgba(232,160,32,0.12)", color: "#C8851A" },
  approved: { bg: "rgba(74,124,111,0.12)", color: "#4A7C6F" },
  declined: { bg: "rgba(217,107,74,0.12)", color: "#D96B4A" },
};

function ProfessionalsTab() {
  const [pros, setPros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [actionLoading, setActionLoading] = useState("");
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/api/professionals/admin/all")
      .then(r => setPros(r.data?.data || []))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const filtered = filter === "all" ? pros : pros.filter(p => p.status === filter);
  const counts = { pending: 0, approved: 0, declined: 0 };
  pros.forEach(p => { if (counts[p.status] !== undefined) counts[p.status]++; });

  const handleReview = async (id, status) => {
    const label = status === "approved" ? "approve" : "decline";
    if (!window.confirm(`Are you sure you want to ${label} this professional?`)) return;
    setActionLoading(id + status);
    try {
      await api.patch(`/api/professionals/admin/${id}/review`, { status });
      load();
    } catch { /* silent */ }
    setActionLoading("");
  };

  const handleFeature = async (id, isFeatured) => {
    setActionLoading(id + "feature");
    try {
      await api.patch(`/api/professionals/admin/${id}/feature`, { is_featured: !isFeatured });
      load();
    } catch { /* silent */ }
    setActionLoading("");
  };

  return (
    <>
      <div style={st.tabHeader}>
        <h2 style={st.tabTitle}>Professional Volunteers</h2>
        <span style={st.badge}>{pros.length} total</span>
      </div>

      <div style={st.statRow}>
        {[
          { label: "Pending", num: counts.pending, color: "#C8851A" },
          { label: "Approved", num: counts.approved, color: "#4A7C6F" },
          { label: "Declined", num: counts.declined, color: "#D96B4A" },
        ].map((s, i) => (
          <div key={i} style={st.statCard}>
            <div style={{ ...st.statNum, color: s.color }}>{s.num}</div>
            <div style={st.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["pending", "approved", "declined", "all"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              ...st.filterToggleBtn,
              background: filter === f ? "#0B1D35" : "white",
              color: filter === f ? "white" : "#6B7280",
              borderColor: filter === f ? "#0B1D35" : "rgba(11,29,53,0.12)",
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} {f !== "all" ? `(${counts[f] || 0})` : `(${pros.length})`}
          </button>
        ))}
      </div>

      {loading ? <Skeleton rows={4} /> : filtered.length === 0 ? <Empty msg={`No ${filter} professional applications.`} /> : (
        <div style={st.tableWrap}>
          <table style={st.table}>
            <thead>
              <tr>
                <th style={st.th}>Name</th>
                <th style={st.th}>Profession</th>
                <th style={st.th}>Contact</th>
                <th style={st.th}>Skills</th>
                <th style={st.th}>Status</th>
                <th style={st.th}>Date</th>
                <th style={st.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const sc = PRO_STATUS_COLORS[p.status] || PRO_STATUS_COLORS.pending;
                const isExp = expanded === p.id;
                return (
                  <Fragment key={p.id}>
                    <tr style={st.tr} onClick={() => setExpanded(isExp ? null : p.id)}>
                      <td style={{ ...st.td, fontWeight: 600, color: "var(--navy)", cursor: "pointer" }}>
                        {p.is_featured && <span title="Featured" style={{ marginRight: 4 }}>⭐</span>}
                        {p.full_name}
                      </td>
                      <td style={st.td}>{p.profession}</td>
                      <td style={st.td}>
                        <div style={{ fontSize: 13 }}>{p.email}</div>
                        {p.phone && <div style={{ fontSize: 11, color: "var(--text-light)" }}>{p.phone}</div>}
                      </td>
                      <td style={st.td}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {(p.skill_categories || []).slice(0, 3).map(c => (
                            <span key={c} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 100, background: "rgba(11,29,53,0.05)", color: "var(--text-mid)" }}>
                              {c.replace(/_/g, " ")}
                            </span>
                          ))}
                          {(p.skill_categories || []).length > 3 && (
                            <span style={{ fontSize: 10, color: "var(--text-light)" }}>+{p.skill_categories.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td style={st.td}>
                        <span style={{ ...st.statusBadge, background: sc.bg, color: sc.color }}>
                          {p.status}
                        </span>
                      </td>
                      <td style={st.td}>{fmtDate(p.created_at)}</td>
                      <td style={st.td}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {p.status === "pending" && (
                            <>
                              <button
                                className="btn-primary"
                                style={{ ...st.actionBtn, background: "var(--sage)", fontSize: 11, padding: "6px 12px" }}
                                disabled={actionLoading === p.id + "approved"}
                                onClick={(e) => { e.stopPropagation(); handleReview(p.id, "approved"); }}
                              >
                                {actionLoading === p.id + "approved" ? "..." : "Approve"}
                              </button>
                              <button
                                style={{ ...st.actionBtn, background: "transparent", border: "1px solid #D96B4A", color: "#D96B4A", fontSize: 11, padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                disabled={actionLoading === p.id + "declined"}
                                onClick={(e) => { e.stopPropagation(); handleReview(p.id, "declined"); }}
                              >
                                {actionLoading === p.id + "declined" ? "..." : "Decline"}
                              </button>
                            </>
                          )}
                          {p.status === "approved" && (
                            <button
                              style={{ ...st.actionBtn, background: "transparent", border: "1px solid var(--amber)", color: "var(--amber)", fontSize: 11, padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                              disabled={actionLoading === p.id + "feature"}
                              onClick={(e) => { e.stopPropagation(); handleFeature(p.id, p.is_featured); }}
                            >
                              {p.is_featured ? "Unfeature" : "Feature"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExp && (
                      <tr>
                        <td colSpan={7} style={st.expandTd}>
                          <div style={st.expandInner}>
                            <div style={st.expandGrid}>
                              <div><div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 2 }}>Location</div><div style={{ fontSize: 13 }}>{p.city} {p.zip_code || ""}</div></div>
                              {p.employer && <div><div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 2 }}>Employer</div><div style={{ fontSize: 13 }}>{p.employer}</div></div>}
                              {p.years_experience && <div><div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 2 }}>Experience</div><div style={{ fontSize: 13 }}>{p.years_experience}</div></div>}
                              {p.license_cert && <div><div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 2 }}>License/Cert</div><div style={{ fontSize: 13 }}>{p.license_cert}</div></div>}
                              {p.availability && <div><div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 2 }}>Availability</div><div style={{ fontSize: 13 }}>{p.availability}</div></div>}
                              {p.max_hours_per_month && <div><div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 2 }}>Hours/Month</div><div style={{ fontSize: 13 }}>{p.max_hours_per_month}</div></div>}
                              {p.preferred_format && <div><div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 2 }}>Format</div><div style={{ fontSize: 13 }}>{p.preferred_format}</div></div>}
                              {p.linkedin && <div><div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 2 }}>LinkedIn</div><div style={{ fontSize: 13 }}><a href={p.linkedin.startsWith("http") ? p.linkedin : `https://${p.linkedin}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--amber)" }}>{p.linkedin}</a></div></div>}
                              {(p.languages || []).length > 0 && <div><div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 2 }}>Languages</div><div style={{ fontSize: 13 }}>{p.languages.join(", ")}</div></div>}
                            </div>
                            {p.description && (
                              <div style={{ fontSize: 13, color: "var(--text-mid)", lineHeight: 1.6, padding: "8px 0", borderTop: "1px solid rgba(11,29,53,0.06)" }}>
                                <strong>How they want to help:</strong> {p.description}
                              </div>
                            )}
                            {p.admin_notes && (
                              <div style={{ fontSize: 12, color: "var(--text-light)", marginTop: 8, fontStyle: "italic" }}>
                                Admin notes: {p.admin_notes}
                              </div>
                            )}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                              {(p.skill_categories || []).map(c => (
                                <span key={c} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 100, background: "rgba(74,124,111,0.08)", color: "#4A7C6F", fontWeight: 600 }}>
                                  {c.replace(/_/g, " ")}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ── Shared helpers ────────────────────────────────────────────────── */

function Skeleton({ rows = 4 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ height: 48, borderRadius: 10, background: "rgba(11,29,53,0.04)", animation: "shimmer 1.5s ease-in-out infinite", backgroundSize: "200% 100%", backgroundImage: "linear-gradient(90deg, rgba(11,29,53,0.04) 25%, rgba(11,29,53,0.08) 50%, rgba(11,29,53,0.04) 75%)" }} />
      ))}
    </div>
  );
}

function Empty({ msg }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--text-light)", fontSize: 15 }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
      {msg}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ *
 *  CAREERS TAB
 * ═══════════════════════════════════════════════════════════════════ */

const INTEREST_TAG_OPTIONS = [
  "helping_people", "building_making", "problem_solving",
  "being_creative", "leading_organizing", "working_with_nature",
];

const CAREER_INIT = {
  title: "", field: "", slug: "", short_desc: "", long_desc: "",
  interest_tags: [], audience: "both", salary_entry: "", salary_mid: "",
  salary_senior: "", salary_note: "", education_min: "", education_ideal: "",
  certifications: "", timeline_years: "", day_in_life: "", growth_outlook: "",
  related_subjects: "", is_active: true, sort_order: 0,
};

function CareersTab() {
  const [careers, setCareers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState("list");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(CAREER_INIT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get("/api/careers/admin/all"),
      api.get("/api/careers/admin/match-requests"),
    ]).then(([cRes, rRes]) => {
      setCareers(cRes.data?.data || []);
      setRequests(rRes.data?.data || []);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setForm(CAREER_INIT);
    setEditing("new");
    setError(null);
  };

  const openEdit = (c) => {
    setForm({
      ...c,
      certifications: (c.certifications || []).join(", "),
      day_in_life: (c.day_in_life || []).join("\n"),
      related_subjects: (c.related_subjects || []).join(", "),
      salary_entry: c.salary_entry || "",
      salary_mid: c.salary_mid || "",
      salary_senior: c.salary_senior || "",
    });
    setEditing(c.id);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const payload = {
      ...form,
      interest_tags: form.interest_tags || [],
      certifications: form.certifications ? form.certifications.split(",").map(s => s.trim()).filter(Boolean) : [],
      day_in_life: form.day_in_life ? form.day_in_life.split("\n").map(s => s.trim()).filter(Boolean) : [],
      related_subjects: form.related_subjects ? form.related_subjects.split(",").map(s => s.trim()).filter(Boolean) : [],
      salary_entry: form.salary_entry ? Number(form.salary_entry) : null,
      salary_mid: form.salary_mid ? Number(form.salary_mid) : null,
      salary_senior: form.salary_senior ? Number(form.salary_senior) : null,
      sort_order: Number(form.sort_order) || 0,
    };
    try {
      if (editing === "new") {
        await api.post("/api/careers/admin/create", payload);
      } else {
        await api.patch(`/api/careers/admin/${editing}`, payload);
      }
      setEditing(null);
      load();
    } catch (e) {
      setError(e.response?.data?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c) => {
    await api.patch(`/api/careers/admin/${c.id}`, { is_active: !c.is_active });
    load();
  };

  const upd = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  if (loading) return <p style={{ color: "#999" }}>Loading...</p>;

  /* ── Mentor Requests sub-tab ───────────────────────────── */
  if (subTab === "requests") {
    return (
      <div>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button onClick={() => setSubTab("list")} style={{ ...st.tabBtn, background: "transparent", color: "#6B7280" }}>Careers</button>
          <button style={{ ...st.tabBtn, background: "#0B1D35", color: "white" }}>Mentor Requests ({requests.length})</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={st.table}>
            <thead>
              <tr>
                <th style={st.th}>Name</th>
                <th style={st.th}>Email</th>
                <th style={st.th}>Career</th>
                <th style={st.th}>Age</th>
                <th style={st.th}>Status</th>
                <th style={st.th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id}>
                  <td style={st.td}>{r.requester_name}</td>
                  <td style={st.td}>{r.requester_email}</td>
                  <td style={st.td}>{r.career_title}</td>
                  <td style={st.td}>{r.requester_age_group || "—"}</td>
                  <td style={st.td}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100,
                      background: r.status === "matched" ? "rgba(74,124,111,0.12)" : "rgba(232,160,32,0.12)",
                      color: r.status === "matched" ? "#4A7C6F" : "#C8851A",
                    }}>{r.status}</span>
                  </td>
                  <td style={st.td}>{fmtDate(r.created_at)}</td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr><td colSpan={6} style={{ ...st.td, textAlign: "center", color: "#999" }}>No requests yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ── Career list ───────────────────────────────────────── */
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <button style={{ ...st.tabBtn, background: "#0B1D35", color: "white" }}>Careers ({careers.length})</button>
        <button onClick={() => setSubTab("requests")} style={{ ...st.tabBtn, background: "transparent", color: "#6B7280" }}>Mentor Requests ({requests.length})</button>
        <button onClick={openAdd} style={{ ...st.actionBtn, marginLeft: "auto", background: "var(--amber)", color: "var(--navy)" }}>+ Add Career</button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={st.table}>
          <thead>
            <tr>
              <th style={st.th}>Title</th>
              <th style={st.th}>Field</th>
              <th style={st.th}>Slug</th>
              <th style={st.th}>Active</th>
              <th style={st.th}>Salary Mid</th>
              <th style={st.th}>Updated</th>
              <th style={st.th}></th>
            </tr>
          </thead>
          <tbody>
            {careers.map(c => (
              <tr key={c.id}>
                <td style={{ ...st.td, fontWeight: 600 }}>{c.title}</td>
                <td style={st.td}>{c.field}</td>
                <td style={{ ...st.td, fontSize: 12, color: "#999" }}>{c.slug}</td>
                <td style={st.td}>
                  <button onClick={() => toggleActive(c)} style={{
                    background: c.is_active ? "rgba(74,124,111,0.12)" : "rgba(11,29,53,0.06)",
                    color: c.is_active ? "#4A7C6F" : "#999",
                    border: "none", borderRadius: 100, padding: "2px 10px",
                    fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}>{c.is_active ? "Active" : "Inactive"}</button>
                </td>
                <td style={st.td}>${(c.salary_mid || 0).toLocaleString()}</td>
                <td style={st.td}>{fmtDate(c.updated_at)}</td>
                <td style={st.td}>
                  <button onClick={() => openEdit(c)} style={{ ...st.actionBtn, fontSize: 12, padding: "4px 12px" }}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Edit/Add Modal ─────────────────────────────────── */}
      {editing && (
        <div style={st.overlay} onClick={() => setEditing(null)}>
          <div style={st.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 className="serif" style={{ fontSize: 20, color: "var(--navy)" }}>
                {editing === "new" ? "Add Career" : "Edit Career"}
              </h3>
              <button onClick={() => setEditing(null)} style={st.closeBtn}>x</button>
            </div>

            <div style={st.careerFormGrid}>
              <div>
                <label style={st.mLabel}>Title *</label>
                <input style={st.mInput} value={form.title} onChange={e => upd("title", e.target.value)} />
              </div>
              <div>
                <label style={st.mLabel}>Field *</label>
                <input style={st.mInput} value={form.field} onChange={e => upd("field", e.target.value)} placeholder="e.g. Healthcare" />
              </div>
              <div>
                <label style={st.mLabel}>Slug *</label>
                <input style={st.mInput} value={form.slug} onChange={e => upd("slug", e.target.value)} placeholder="e.g. registered-nurse" />
              </div>
              <div>
                <label style={st.mLabel}>Audience</label>
                <select style={st.mInput} value={form.audience} onChange={e => upd("audience", e.target.value)}>
                  <option value="both">Both</option>
                  <option value="kids">Kids</option>
                  <option value="adults">Adults</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={st.mLabel}>Short Description *</label>
              <input style={st.mInput} value={form.short_desc} onChange={e => upd("short_desc", e.target.value)} />
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={st.mLabel}>Long Description *</label>
              <textarea style={{ ...st.mInput, minHeight: 80 }} value={form.long_desc} onChange={e => upd("long_desc", e.target.value)} />
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={st.mLabel}>Interest Tags * (select 1+)</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {INTEREST_TAG_OPTIONS.map(tag => (
                  <button key={tag} onClick={() => {
                    const tags = form.interest_tags || [];
                    upd("interest_tags", tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]);
                  }} style={{
                    padding: "4px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    border: "1.5px solid", fontFamily: "'Plus Jakarta Sans', sans-serif",
                    background: (form.interest_tags || []).includes(tag) ? "var(--amber)" : "white",
                    color: (form.interest_tags || []).includes(tag) ? "var(--navy)" : "#6B7280",
                    borderColor: (form.interest_tags || []).includes(tag) ? "var(--amber)" : "rgba(11,29,53,0.12)",
                  }}>{tag.replace(/_/g, " ")}</button>
                ))}
              </div>
            </div>

            <div style={{ ...st.careerFormGrid, marginTop: 14 }}>
              <div>
                <label style={st.mLabel}>Salary Entry</label>
                <input style={st.mInput} type="number" value={form.salary_entry} onChange={e => upd("salary_entry", e.target.value)} />
              </div>
              <div>
                <label style={st.mLabel}>Salary Mid *</label>
                <input style={st.mInput} type="number" value={form.salary_mid} onChange={e => upd("salary_mid", e.target.value)} />
              </div>
              <div>
                <label style={st.mLabel}>Salary Senior</label>
                <input style={st.mInput} type="number" value={form.salary_senior} onChange={e => upd("salary_senior", e.target.value)} />
              </div>
              <div>
                <label style={st.mLabel}>Salary Note</label>
                <input style={st.mInput} value={form.salary_note || ""} onChange={e => upd("salary_note", e.target.value)} />
              </div>
              <div>
                <label style={st.mLabel}>Education Min *</label>
                <input style={st.mInput} value={form.education_min} onChange={e => upd("education_min", e.target.value)} />
              </div>
              <div>
                <label style={st.mLabel}>Education Ideal</label>
                <input style={st.mInput} value={form.education_ideal || ""} onChange={e => upd("education_ideal", e.target.value)} />
              </div>
              <div>
                <label style={st.mLabel}>Timeline Years</label>
                <input style={st.mInput} value={form.timeline_years || ""} onChange={e => upd("timeline_years", e.target.value)} placeholder="e.g. 2-4 years" />
              </div>
              <div>
                <label style={st.mLabel}>Growth Outlook</label>
                <input style={st.mInput} value={form.growth_outlook || ""} onChange={e => upd("growth_outlook", e.target.value)} placeholder="e.g. Strong (+8%)" />
              </div>
              <div>
                <label style={st.mLabel}>Sort Order</label>
                <input style={st.mInput} type="number" value={form.sort_order} onChange={e => upd("sort_order", e.target.value)} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 20 }}>
                <input type="checkbox" checked={form.is_active} onChange={e => upd("is_active", e.target.checked)} />
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)" }}>Active</label>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={st.mLabel}>Certifications (comma-separated)</label>
              <input style={st.mInput} value={form.certifications} onChange={e => upd("certifications", e.target.value)} placeholder="e.g. RN License, BLS Certification" />
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={st.mLabel}>Day in Life (one per line)</label>
              <textarea style={{ ...st.mInput, minHeight: 80 }} value={form.day_in_life} onChange={e => upd("day_in_life", e.target.value)} placeholder="Assess patient health&#10;Administer medications&#10;Coordinate with doctors" />
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={st.mLabel}>Related Subjects (comma-separated)</label>
              <input style={st.mInput} value={form.related_subjects} onChange={e => upd("related_subjects", e.target.value)} placeholder="e.g. Biology, Chemistry, Math" />
            </div>

            {error && <div style={st.errSmall}>{error}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setEditing(null)} style={{ ...st.actionBtn, background: "var(--cream)", color: "var(--navy)", flex: 1 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ ...st.actionBtn, background: "var(--amber)", color: "var(--navy)", flex: 1, opacity: saving ? 0.6 : 1 }}>
                {saving ? "Saving..." : editing === "new" ? "Create Career" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════ *
 *  RESUMES TAB
 * ═══════════════════════════════════════════════════════════════════ */
function ResumesTab() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/resume/admin/all")
      .then(r => setReviews(r.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: "#999" }}>Loading...</p>;

  return (
    <div>
      <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>
        {reviews.length} resume review{reviews.length !== 1 ? "s" : ""} total
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={st.table}>
          <thead>
            <tr>
              <th style={st.th}>File</th>
              <th style={st.th}>Level</th>
              <th style={st.th}>Job Title</th>
              <th style={st.th}>Overall</th>
              <th style={st.th}>ATS</th>
              <th style={st.th}>Email</th>
              <th style={st.th}>Date</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map(r => (
              <tr key={r.id}>
                <td style={{ ...st.td, fontWeight: 600, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.file_name || "\u2014"}</td>
                <td style={st.td}>{r.career_level || "\u2014"}</td>
                <td style={st.td}>{r.job_title || "\u2014"}</td>
                <td style={st.td}>
                  <span style={{
                    fontWeight: 700,
                    color: (r.overall_score || 0) >= 75 ? "#10B981" : (r.overall_score || 0) >= 50 ? "#E8A020" : "#D96B4A",
                  }}>{r.overall_score || "\u2014"}</span>
                </td>
                <td style={st.td}>
                  <span style={{ fontWeight: 700, color: "#6366F1" }}>{r.ats_score || "\u2014"}</span>
                </td>
                <td style={{ ...st.td, fontSize: 12 }}>{r.email || "\u2014"}</td>
                <td style={st.td}>{fmtDate(r.created_at)}</td>
              </tr>
            ))}
            {reviews.length === 0 && (
              <tr><td colSpan={7} style={{ ...st.td, textAlign: "center", color: "#999" }}>No reviews yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════ *
 *  EVENTS TAB
 * ═══════════════════════════════════════════════════════════════════ */
function EventsTab() {
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState("pending");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get("/api/events/admin/pending"),
      api.get("/api/events/admin/all"),
    ]).then(([pRes, aRes]) => {
      setPending(pRes.data?.data || []);
      setApproved(aRes.data?.data || []);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id) => {
    await api.post(`/api/events/admin/${id}/approve`);
    load();
  };
  const reject = async (id) => {
    if (!confirm("Reject this event?")) return;
    await api.post(`/api/events/admin/${id}/reject`);
    load();
  };

  if (loading) return <p style={{ color: "#999" }}>Loading...</p>;

  const list = subTab === "pending" ? pending : approved;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button onClick={() => setSubTab("pending")} style={{ ...st.tabBtn, background: subTab === "pending" ? "#0B1D35" : "transparent", color: subTab === "pending" ? "white" : "#6B7280" }}>
          Pending ({pending.length})
        </button>
        <button onClick={() => setSubTab("approved")} style={{ ...st.tabBtn, background: subTab === "approved" ? "#0B1D35" : "transparent", color: subTab === "approved" ? "white" : "#6B7280" }}>
          Approved ({approved.length})
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={st.table}>
          <thead>
            <tr>
              <th style={st.th}>Title</th>
              <th style={st.th}>Date</th>
              <th style={st.th}>Category</th>
              <th style={st.th}>Organizer</th>
              <th style={st.th}>Location</th>
              <th style={st.th}></th>
            </tr>
          </thead>
          <tbody>
            {list.map(e => (
              <tr key={e.id}>
                <td style={{ ...st.td, fontWeight: 600 }}>{e.title}</td>
                <td style={st.td}>{fmtDate(e.event_date)}</td>
                <td style={st.td}>{e.category}</td>
                <td style={st.td}>{e.organizer}</td>
                <td style={{ ...st.td, fontSize: 12 }}>{e.location}, {e.city}</td>
                <td style={st.td}>
                  {subTab === "pending" ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => approve(e.id)} style={{ ...st.actionBtn, fontSize: 12, padding: "4px 12px", background: "var(--sage)", color: "white" }}>Approve</button>
                      <button onClick={() => reject(e.id)} style={{ ...st.actionBtn, fontSize: 12, padding: "4px 12px", background: "var(--coral)", color: "white" }}>Reject</button>
                    </div>
                  ) : (
                    <button onClick={() => reject(e.id)} style={{ ...st.actionBtn, fontSize: 12, padding: "4px 12px" }}>Archive</button>
                  )}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={6} style={{ ...st.td, textAlign: "center", color: "#999" }}>
                {subTab === "pending" ? "No pending events" : "No approved events"}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/* ── Styles ─────────────────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════ *
 *  METRICS TAB
 * ═══════════════════════════════════════════════════════════════════ */
const SHOW_PIPELINE_PCT = 20;
const AI_COSTS = { resumes: 0.02, cover_letters: 0.01, interviews: 0.08 };

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function MetricsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState([false, false, false, false, false]);

  useEffect(() => {
    api.get("/api/needs/stats/admin")
      .then(r => setData(r.data?.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton rows={6} />;
  if (!data) return <Empty msg="Could not load metrics." />;

  const stuckCount = data.stuck_needs_48h || 0;
  const stuckDetail = data.stuck_needs_detail || [];
  const pipeline = data.pipeline || {};
  const pipelineTotal = data.pipeline_total || Object.values(pipeline).reduce((a, b) => a + b, 0) || 1;
  const pipelineSteps = ["open", "matched", "ready_for_pickup", "picked_up", "delivered", "fulfilled"];
  const aiMonth = data.ai_usage_month || {};
  const activity = data.recent_activity || [];
  const checkedCount = checklist.filter(Boolean).length;

  const checklistItems = [
    { text: "Review and broadcast any new needs submitted", badge: data.needs_today > 0 ? data.needs_today : null },
    { text: "Check for stuck needs (48h+) and re-broadcast", badge: stuckCount > 0 ? stuckCount : null },
    { text: "Approve or reject pending community events", badge: data.events_pending > 0 ? data.events_pending : null },
    { text: "Match any open career mentor requests", badge: data.mentor_requests_open > 0 ? data.mentor_requests_open : null },
    { text: "Verify new volunteer signups and send welcome", badge: data.new_accounts_today > 0 ? data.new_accounts_today : null },
  ];

  const attentionItems = [
    { label: "Stuck 48h+", count: stuckCount, icon: "⚠️", action: "View needs →", tab: "needs" },
    { label: "Stale Resources", count: data.stale_resources, icon: "📋", action: "Review →", tab: "resources" },
    { label: "Events Pending", count: data.events_pending, icon: "📅", action: "Approve →", tab: "events" },
    { label: "Mentor Requests", count: data.mentor_requests_open, icon: "🤝", action: "Match →", tab: "careers" },
    { label: "Helpers to Re-engage", count: data.helpers_needing_reengagement, icon: "📞", action: "Review →", tab: "subscribers" },
  ].filter(item => item.count > 0 || item.label === "Stuck 48h+");

  const aiTotal = aiMonth.total || 0;
  const aiCostMonth = (aiMonth.resumes || 0) * AI_COSTS.resumes + (aiMonth.cover_letters || 0) * AI_COSTS.cover_letters + (aiMonth.interviews || 0) * AI_COSTS.interviews;
  const dayOfMonth = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const projectedCost = aiTotal > 0 ? (aiCostMonth / dayOfMonth) * daysInMonth : 0;

  const dotColor = { amber: "#E8A020", navy: "#0B1D35", green: "#22C55E", blue: "#3B82F6", grey: "#9ca3af" };

  return (
    <div>
      <div style={st.tabHeader}>
        <h2 className="serif" style={st.tabTitle}>Dashboard</h2>
      </div>

      {/* ── ALERT BANNER ── */}
      {stuckCount > 0 && (
        <div style={{ background: "#FEF3DC", border: "1px solid #E8A020", borderRadius: 12, padding: "14px 16px", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>⚠</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#92400E" }}>
              {stuckCount} need{stuckCount > 1 ? "s" : ""} stuck for 48+ hours without a helper response
            </div>
            <div style={{ fontSize: 13, color: "#92400E", marginTop: 4 }}>
              These families are still waiting. You can re-broadcast to volunteers or reach out directly.
            </div>
            {stuckDetail.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#92400E" }}>
                {stuckDetail.map((n, i) => (
                  <div key={i}>• {n.item} — submitted {timeAgo(n.created_at)}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DAILY CHECKLIST ── */}
      <div style={{ background: "white", border: "1px solid rgba(11,29,53,0.06)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--navy)" }}>Daily checklist</div>
          <div style={{ fontSize: 12, color: checkedCount === 5 ? "var(--sage)" : "var(--text-light)" }}>{checkedCount} of 5 done</div>
        </div>
        {checklistItems.map((item, i) => (
          <div key={i} onClick={() => setChecklist(prev => { const n = [...prev]; n[i] = !n[i]; return n; })}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer" }}>
            <div style={{ width: 20, height: 20, borderRadius: 4, border: checklist[i] ? "none" : "2px solid var(--navy)", background: checklist[i] ? "var(--navy)" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, color: "white" }}>
              {checklist[i] && "✓"}
            </div>
            <span style={{ fontSize: 13, color: checklist[i] ? "var(--text-light)" : "var(--navy)", textDecoration: checklist[i] ? "line-through" : "none", flex: 1 }}>{item.text}</span>
            {item.badge && !checklist[i] && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#92400E", background: "rgba(232,160,32,0.12)", padding: "2px 8px", borderRadius: 100 }}>{item.badge} pending</span>
            )}
          </div>
        ))}
        {checkedCount === 5 && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(74,124,111,0.06)", border: "0.5px solid rgba(74,124,111,0.15)", borderRadius: 8, fontSize: 13, color: "var(--sage)" }}>
            All done for today — great work.
          </div>
        )}
      </div>

      {/* ── TODAY ── */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>Today</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(140px, 100%), 1fr))", gap: 12, marginBottom: 28 }}>
        <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid rgba(11,29,53,0.06)", textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600, color: "var(--navy)" }}>{data.needs_today}</div>
          <div style={{ fontSize: 12, color: "var(--text-mid)", fontWeight: 500, marginTop: 4 }}>Needs Submitted</div>
          {data.needs_today === 0 && <div style={{ fontSize: 11, fontStyle: "italic", color: "var(--text-light)", marginTop: 4 }}>Check back after outreach goes live</div>}
        </div>
        <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid rgba(11,29,53,0.06)", textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>👤</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600, color: "var(--navy)" }}>{data.new_accounts_today}</div>
          <div style={{ fontSize: 12, color: "var(--text-mid)", fontWeight: 500, marginTop: 4 }}>New Accounts</div>
          {data.new_accounts_today === 0 && <div style={{ fontSize: 11, fontStyle: "italic", color: "var(--text-light)", marginTop: 4 }}>Will grow as users discover MGN</div>}
        </div>
        <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid rgba(11,29,53,0.06)", textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>🤖</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600, color: "var(--navy)" }}>{data.ai_usage_today?.total || 0}</div>
          <div style={{ fontSize: 12, color: "var(--text-mid)", fontWeight: 500, marginTop: 4 }}>AI Calls</div>
          {(data.ai_usage_today?.total || 0) === 0 && <div style={{ fontSize: 11, fontStyle: "italic", color: "var(--text-light)", marginTop: 4 }}>AI moderation runs on each submission</div>}
        </div>
        <div style={{ background: stuckCount > 0 ? "#FEF3DC" : "white", borderRadius: 12, padding: 20, border: stuckCount > 0 ? "1px solid #E8A020" : "1px solid rgba(11,29,53,0.06)", textAlign: "center", cursor: stuckCount > 0 ? "pointer" : "default" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600, color: stuckCount > 0 ? "#D96B4A" : "var(--sage)" }}>{stuckCount}</div>
          <div style={{ fontSize: 12, color: stuckCount > 0 ? "#92400E" : "var(--text-mid)", fontWeight: 500, marginTop: 4 }}>Stuck 48h+</div>
          {stuckCount > 0 && <div style={{ fontSize: 11, fontWeight: 500, color: "#92400E", marginTop: 4 }}>Action required →</div>}
        </div>
      </div>

      {/* ── PIPELINE FUNNEL ── */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>Pipeline Funnel</div>
      <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid rgba(11,29,53,0.06)", marginBottom: 28 }}>
        <div style={{ fontSize: 13, color: "var(--text-mid)", marginBottom: 16 }}>
          {pipelineTotal} total needs — {pipeline.delivered || 0 + (pipeline.fulfilled || 0)} fulfilled
        </div>
        {pipelineSteps.map(step => {
          const count = pipeline[step] || 0;
          const pct = pipelineTotal > 0 ? Math.round((count / pipelineTotal) * 100) : 0;
          const label = { open: "Open", matched: "Matched", ready_for_pickup: "Ready for Pickup", picked_up: "Picked Up", delivered: "Delivered", fulfilled: "Fulfilled" }[step] || step;
          const color = { open: "#E8A020", matched: "#C8851A", ready_for_pickup: "#4A7C6F", picked_up: "#3B82F6", delivered: "#22C55E", fulfilled: "#22C55E" }[step] || "#6b7280";
          const isStuckStage = step === "open" && stuckCount > 0;
          return (
            <div key={step} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{label}</span>
                  {isStuckStage && <span style={{ fontSize: 10, fontWeight: 700, color: "#92400E", background: "rgba(232,160,32,0.12)", padding: "1px 6px", borderRadius: 100 }}>{stuckCount} stuck 48h+</span>}
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color }}>
                  {pipelineTotal >= SHOW_PIPELINE_PCT ? `${count} (${pct}%)` : `${count} of ${pipelineTotal} total`}
                </span>
              </div>
              <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.4s" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── AI TOOLS — USAGE & COST ── */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>AI Tools — Usage & Cost</div>
      <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid rgba(11,29,53,0.06)", marginBottom: 28 }}>
        {[
          { label: "Resume Reviews", count: aiMonth.resumes || 0, rate: AI_COSTS.resumes, icon: "📄" },
          { label: "Cover Letters", count: aiMonth.cover_letters || 0, rate: AI_COSTS.cover_letters, icon: "✉️" },
          { label: "Interview Sessions", count: aiMonth.interviews || 0, rate: AI_COSTS.interviews, icon: "🎤" },
        ].map((tool, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 2 ? "1px solid rgba(11,29,53,0.04)" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>{tool.icon}</span>
              <span style={{ fontSize: 13, color: "var(--navy)", fontWeight: 500 }}>{tool.label}</span>
            </div>
            {tool.count > 0 ? (
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)" }}>{tool.count} · ${(tool.count * tool.rate).toFixed(2)}</span>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-light)", background: "#f1f5f9", padding: "2px 8px", borderRadius: 100 }}>Not yet live</span>
            )}
          </div>
        ))}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(11,29,53,0.06)" }}>
          {aiTotal > 0 ? (
            <>
              <div style={{ fontSize: 13, color: "var(--text-mid)" }}>Projected month-end: ~${projectedCost.toFixed(2)}</div>
              <div style={{ fontSize: 11, fontStyle: "italic", color: "var(--text-light)", marginTop: 2 }}>At current pace — updates daily</div>
            </>
          ) : (
            <div style={{ fontSize: 12, fontStyle: "italic", color: "var(--text-light)" }}>
              AI tools active — estimated $0.02 per resume review, $0.08 per interview session
            </div>
          )}
        </div>
      </div>

      {/* ── ATTENTION NEEDED ── */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>Attention Needed</div>
      {attentionItems.filter(i => i.count > 0).length === 0 ? (
        <div style={{ background: "rgba(74,124,111,0.04)", border: "0.5px solid rgba(74,124,111,0.15)", borderRadius: 12, padding: "12px 14px", marginBottom: 28, fontSize: 13, color: "var(--sage)" }}>
          No pending items — everything is up to date.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
          {attentionItems.filter(i => i.count > 0).map((item, i) => (
            <div key={i} style={{ background: "white", borderRadius: 10, padding: "12px 16px", border: "1px solid rgba(11,29,53,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>{item.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--navy)" }}>{item.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: item.count > 0 ? "#C8851A" : "var(--sage)" }}>{item.count}</span>
              </div>
              <button onClick={() => { const el = document.querySelector('[data-tab]'); }} style={{ background: "transparent", border: "1px solid rgba(11,29,53,0.15)", borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 600, color: "var(--navy)", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {item.action}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── RECENT ACTIVITY ── */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>Recent Activity</div>
      <div style={{ background: "white", borderRadius: 12, padding: 16, border: "1px solid rgba(11,29,53,0.06)" }}>
        {activity.length === 0 ? (
          <div style={{ textAlign: "center", padding: "16px 0", fontSize: 13, color: "var(--text-light)" }}>
            No recent activity — share MGN with your network to get things moving.
          </div>
        ) : (
          activity.map((event, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < activity.length - 1 ? "1px solid rgba(11,29,53,0.03)" : "none" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor[event.color] || "#9ca3af", flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "var(--navy)", flex: 1 }}>{event.text}</span>
              <span style={{ fontSize: 11, color: "var(--text-light)", flexShrink: 0 }}>{timeAgo(event.at)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


const st = {
  /* Layout */
  page: {},
  layoutWrap: {
    display: "flex", minHeight: "calc(100vh - 56px)",
  },
  sidebar: {
    width: 220, flexShrink: 0,
    background: "#0B1D35",
    padding: "16px 0",
    position: "sticky", top: 56, height: "calc(100vh - 56px)",
    overflowY: "auto",
    transition: "width 0.2s ease",
  },
  sidebarCollapsed: {
    width: 56,
  },
  sidebarToggle: {
    display: "none",
    background: "none", border: "none", color: "rgba(255,255,255,0.5)",
    fontSize: 18, cursor: "pointer", padding: "8px 16px", width: "100%", textAlign: "left",
  },
  navGroupLabel: {
    fontSize: 10, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)",
    padding: "8px 16px 4px", marginTop: 4,
  },
  navItem: {
    display: "flex", alignItems: "center", gap: 10,
    width: "100%", padding: "9px 16px",
    border: "none", background: "transparent",
    fontSize: 13, cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: "all 0.12s", textAlign: "left",
    whiteSpace: "nowrap",
  },
  navBadge: {
    background: "#D96B4A", color: "white",
    fontSize: 10, fontWeight: 700,
    padding: "1px 6px", borderRadius: 100,
    marginLeft: "auto",
  },
  navDot: {
    width: 6, height: 6, borderRadius: "50%",
    background: "#D96B4A", position: "absolute", right: 12,
  },
  mainContent: {
    flex: 1, minWidth: 0,
    padding: "0 clamp(12px, 2vw, 24px)",
  },

  /* Tab header */
  tabHeader: {
    display: "flex", alignItems: "center", gap: 12,
    marginBottom: 20,
  },
  tabTitle: {
    fontSize: 20, fontWeight: 700, color: "#0B1D35", margin: 0,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  badge: {
    fontSize: 12, fontWeight: 700, color: "var(--amber)",
    background: "rgba(232,160,32,0.12)",
    padding: "3px 10px", borderRadius: 100,
  },
  subTitle: {
    fontSize: 15, fontWeight: 700, color: "var(--navy)",
    marginBottom: 12, display: "flex", alignItems: "center", gap: 8,
  },

  /* Stats */
  statRow: { display: "flex", gap: 16, marginBottom: 24 },
  statCard: {
    background: "white", borderRadius: 14, padding: "20px 28px",
    border: "1px solid rgba(11,29,53,0.06)",
    boxShadow: "0 2px 8px rgba(11,29,53,0.04)",
  },
  statNum: {
    fontFamily: "'Fraunces', serif", fontSize: 36,
    fontWeight: 600, color: "var(--amber)", lineHeight: 1,
  },
  statLabel: { fontSize: 13, color: "var(--text-light)", marginTop: 4 },

  /* Table */
  tableWrap: {
    background: "white", borderRadius: 14,
    border: "1px solid rgba(11,29,53,0.06)",
    overflow: "hidden",
  },
  table: {
    width: "100%", borderCollapse: "collapse",
    fontSize: 14,
  },
  th: {
    textAlign: "left", padding: "12px 16px",
    fontSize: 11, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.06em", color: "var(--text-light)",
    background: "rgba(11,29,53,0.03)",
    borderBottom: "1px solid rgba(11,29,53,0.06)",
  },
  tr: {
    borderBottom: "1px solid rgba(11,29,53,0.04)",
    transition: "background 0.15s",
  },
  td: {
    padding: "14px 16px", color: "var(--text-mid)", fontSize: 14,
  },
  statusBadge: {
    fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
    textTransform: "uppercase",
    padding: "4px 10px", borderRadius: 100,
    display: "inline-block",
  },

  /* Expanded row */
  expandTd: {
    padding: 0,
    background: "rgba(232,160,32,0.02)",
    borderBottom: "1px solid rgba(11,29,53,0.06)",
  },
  expandInner: { padding: "20px 24px" },
  expandGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(180px, 100%), 1fr))",
    gap: 16, marginBottom: 16,
  },
  expandActions: {
    display: "flex", gap: 10, flexWrap: "wrap",
    paddingTop: 12, borderTop: "1px solid rgba(11,29,53,0.06)",
  },
  actionBtn: { padding: "8px 18px", fontSize: 13 },
  flagBadge: {
    display: "inline-flex", alignItems: "center",
    fontSize: 12, marginLeft: 6, cursor: "help",
  },
  flagNote: {
    fontSize: 13, color: "#C8851A",
    background: "rgba(232,160,32,0.08)",
    border: "1px solid rgba(232,160,32,0.2)",
    borderRadius: 10, padding: "10px 16px",
    marginBottom: 16, fontWeight: 500,
  },
  filterToggleBtn: {
    padding: "8px 16px", borderRadius: 100,
    fontSize: 12, fontWeight: 600,
    border: "1.5px solid",
    cursor: "pointer", transition: "all 0.2s",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  rebroadcastBtn: {
    background: "transparent",
    border: "1.5px solid var(--amber)",
    color: "var(--amber)",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: "all 0.2s",
  },
  rebroadcastBtnDisabled: {
    background: "transparent",
    border: "1.5px solid rgba(232,160,32,0.25)",
    color: "rgba(232,160,32,0.5)",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "not-allowed",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },

  /* Resources grid */
  resGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 14,
  },
  resCard: {
    background: "white", borderRadius: 12, padding: "16px 20px",
    border: "1px solid rgba(11,29,53,0.06)",
    transition: "box-shadow 0.2s",
  },
  verifyBtn: {
    fontSize: 11, fontWeight: 600, color: "var(--amber)",
    background: "rgba(232,160,32,0.08)",
    border: "1px solid rgba(232,160,32,0.2)",
    borderRadius: 100, padding: "2px 10px",
    cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif",
  },

  /* Tutoring cards */
  tutorCard: {
    background: "white", borderRadius: 12, padding: "14px 18px",
    border: "1px solid rgba(11,29,53,0.06)",
  },

  /* Modal */
  overlay: {
    position: "fixed", inset: 0, zIndex: 200,
    background: "rgba(11,29,53,0.5)", backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 24,
  },
  modal: {
    background: "white", borderRadius: 20, padding: "clamp(16px, 4vw, 36px)",
    maxWidth: 600, width: "calc(100% - 24px)", maxHeight: "90vh", overflowY: "auto",
    boxShadow: "0 24px 64px rgba(11,29,53,0.2)",
  },
  modalGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14,
  },
  mLabel: {
    display: "block", fontSize: 12, fontWeight: 600,
    color: "var(--navy)", marginBottom: 5,
  },
  mInput: {
    width: "100%", background: "var(--cream)",
    border: "1.5px solid rgba(11,29,53,0.1)",
    borderRadius: 8, padding: "10px 14px",
    fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif",
    outline: "none", color: "var(--navy)",
  },
  closeBtn: {
    background: "none", border: "none",
    fontSize: 18, cursor: "pointer", color: "var(--text-light)",
    padding: 4,
  },

  /* Careers admin */
  careerFormGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14,
  },

  /* Error */
  errSmall: {
    color: "#D96B4A", fontSize: 13,
    background: "rgba(217,107,74,0.08)",
    border: "1px solid rgba(217,107,74,0.15)",
    borderRadius: 8, padding: "8px 12px", marginTop: 10,
  },
};
