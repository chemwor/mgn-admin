import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../lib/api";
import PageMeta from "../components/PageMeta";

function fmtDate(iso) {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

const REVIEW_COLORS = {
  pending:  { bg: "rgba(232,160,32,0.12)", color: "#C8851A" },
  approved: { bg: "rgba(74,124,111,0.12)", color: "#4A7C6F" },
  rejected: { bg: "rgba(217,107,74,0.12)", color: "#D96B4A" },
};

const URGENCY_COLORS = {
  low:    { bg: "rgba(74,124,111,0.12)", color: "#4A7C6F" },
  medium: { bg: "rgba(232,160,32,0.12)", color: "#C8851A" },
  high:   { bg: "rgba(217,107,74,0.12)", color: "#D96B4A" },
};

/* ═══════════════════════════════════════════════════════════════════ */
export default function AdminReview() {
  const { id } = useParams();

  const [need, setNeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectErr, setRejectErr] = useState("");

  /* ── Load need ────────────────────────────────────────────── */
  useEffect(() => {
    setLoading(true);
    api.get(`/api/needs/${id}`)
      .then(r => setNeed(r.data?.data || r.data))
      .catch(() => setError("Failed to load need details."))
      .finally(() => setLoading(false));
  }, [id]);

  /* ── Actions ──────────────────────────────────────────────── */
  const handleApprove = async () => {
    if (!window.confirm("Approve and broadcast this need?")) return;
    setActionLoading(true);
    setActionMsg("");
    try {
      await api.post(`/api/get-help/admin/needs/${id}/approve`, {});
      setActionMsg("Need approved and broadcast successfully.");
      setNeed(prev => ({ ...prev, review_status: "approved" }));
    } catch (e) {
      setActionMsg(e.response?.data?.error || "Failed to approve.");
    }
    setActionLoading(false);
  };

  const handleReject = async () => {
    setRejectErr("");
    if (!rejectReason.trim()) { setRejectErr("Reason is required."); return; }
    setActionLoading(true);
    setActionMsg("");
    try {
      await api.post(`/api/get-help/admin/needs/${id}/reject`, { reason: rejectReason.trim() });
      setActionMsg("Need has been rejected.");
      setNeed(prev => ({ ...prev, review_status: "rejected" }));
      setShowReject(false);
      setRejectReason("");
    } catch (e) {
      setRejectErr(e.response?.data?.error || "Failed to reject.");
    }
    setActionLoading(false);
  };

  /* ── Parse AI scores ──────────────────────────────────────── */
  const aiScore = need?.ai_score || {};
  const scores = aiScore.scores || aiScore.category_scores || {};
  const flags = aiScore.flags || [];
  const reviewReason = aiScore.review_reason || aiScore.reason || "";
  const overallScore = aiScore.overall_score ?? aiScore.score ?? null;

  /* ── Review status badge ──────────────────────────────────── */
  const reviewStatus = need?.review_status || "pending";
  const rc = REVIEW_COLORS[reviewStatus] || REVIEW_COLORS.pending;

  return (
    <div style={st.page}>
      <PageMeta title={`Review Need #${id}`} />

      <div style={st.card}>
        {/* Back link */}
        <Link to="/panel" style={st.backLink}>&larr; Back to Admin</Link>

        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-light)" }}>Loading...</div>
        ) : error ? (
          <div style={st.errSmall}>{error}</div>
        ) : !need ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-light)" }}>Need not found.</div>
        ) : (
          <>
            {/* Header with status */}
            <div style={st.header}>
              <div>
                <h1 className="serif" style={st.title}>Review Need</h1>
                <p style={{ fontSize: 14, color: "var(--text-light)", marginTop: 4 }}>ID: {need.id}</p>
              </div>
              <span style={{ ...st.statusBadge, background: rc.bg, color: rc.color, fontSize: 13, padding: "6px 16px" }}>
                {reviewStatus.toUpperCase()}
              </span>
            </div>

            {/* Success / error message */}
            {actionMsg && (
              <div style={{
                ...st.actionMsgBox,
                background: reviewStatus === "rejected" ? "rgba(217,107,74,0.08)" : "rgba(74,124,111,0.08)",
                borderColor: reviewStatus === "rejected" ? "rgba(217,107,74,0.2)" : "rgba(74,124,111,0.2)",
                color: reviewStatus === "rejected" ? "#D96B4A" : "#4A7C6F",
              }}>
                {actionMsg}
              </div>
            )}

            {/* Need details */}
            <div style={st.section}>
              <h3 style={st.sectionTitle}>Need Details</h3>
              <div style={st.detailGrid}>
                <DetailItem label="Requester Name" value={need.requester_name} />
                <DetailItem label="Email" value={need.contact_email} />
                <DetailItem label="Phone" value={need.contact_phone} />
                <DetailItem label="Item Needed" value={need.item_needed} highlight />
                <DetailItem label="Category" value={need.category} />
                <DetailItem label="Zip Code" value={need.zip_code} />
                <DetailItem label="Urgency" value={
                  need.urgency ? (
                    <span style={{
                      ...st.statusBadge,
                      background: (URGENCY_COLORS[need.urgency?.toLowerCase()] || URGENCY_COLORS.medium).bg,
                      color: (URGENCY_COLORS[need.urgency?.toLowerCase()] || URGENCY_COLORS.medium).color,
                    }}>
                      {need.urgency}
                    </span>
                  ) : "\u2014"
                } />
                <DetailItem label="Submitted" value={fmtDate(need.created_at)} />
              </div>
              {need.description && (
                <div style={{ marginTop: 16 }}>
                  <div style={st.detailLabel}>Description</div>
                  <div style={st.descriptionBox}>{need.description}</div>
                </div>
              )}
            </div>

            {/* AI Scores */}
            <div style={st.section}>
              <h3 style={st.sectionTitle}>AI Analysis</h3>

              {overallScore !== null && (
                <div style={{ marginBottom: 16 }}>
                  <div style={st.detailLabel}>Overall Score</div>
                  <div style={st.scoreBarWrap}>
                    <div style={{ ...st.scoreBarFill, width: `${Math.min(100, Math.max(0, overallScore))}%` }} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", marginTop: 4 }}>{overallScore}/100</div>
                </div>
              )}

              {Object.keys(scores).length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                  {Object.entries(scores).map(([key, val]) => (
                    <div key={key}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={st.detailLabel}>{key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)" }}>{typeof val === "number" ? val : val}</span>
                      </div>
                      {typeof val === "number" && (
                        <div style={st.scoreBarWrap}>
                          <div style={{ ...st.scoreBarFill, width: `${Math.min(100, Math.max(0, val))}%` }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {flags.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={st.detailLabel}>Flags</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                    {flags.map((flag, i) => (
                      <span key={i} style={st.flagBadge}>{typeof flag === "string" ? flag : flag.label || flag.type || JSON.stringify(flag)}</span>
                    ))}
                  </div>
                </div>
              )}

              {reviewReason && (
                <div>
                  <div style={st.detailLabel}>Review Reason</div>
                  <div style={st.descriptionBox}>{reviewReason}</div>
                </div>
              )}

              {Object.keys(scores).length === 0 && flags.length === 0 && !reviewReason && overallScore === null && (
                <div style={{ fontSize: 14, color: "var(--text-light)", padding: "16px 0" }}>No AI analysis data available.</div>
              )}
            </div>

            {/* Action buttons */}
            {reviewStatus === "pending" && (
              <div style={st.section}>
                <h3 style={st.sectionTitle}>Actions</h3>

                {!showReject ? (
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <button
                      className="btn-primary"
                      style={st.approveBtn}
                      disabled={actionLoading}
                      onClick={handleApprove}
                    >
                      {actionLoading ? "Processing..." : "Approve & Broadcast"}
                    </button>
                    <button
                      style={st.rejectBtn}
                      disabled={actionLoading}
                      onClick={() => setShowReject(true)}
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <div style={st.rejectForm}>
                    <label style={st.detailLabel}>Rejection Reason (required)</label>
                    <textarea
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="Explain why this need is being rejected..."
                      rows={3}
                      style={st.textarea}
                    />
                    {rejectErr && <div style={st.errSmall}>{rejectErr}</div>}
                    <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                      <button
                        style={{ ...st.rejectBtn, background: "#D96B4A", color: "white", border: "none" }}
                        disabled={actionLoading}
                        onClick={handleReject}
                      >
                        {actionLoading ? "Processing..." : "Confirm Rejection"}
                      </button>
                      <button
                        className="btn-outline"
                        style={{ padding: "10px 24px", fontSize: 14 }}
                        onClick={() => { setShowReject(false); setRejectReason(""); setRejectErr(""); }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Shared components ──────────────────────────────────────────── */
function DetailItem({ label, value, highlight }) {
  return (
    <div>
      <div style={st.detailLabel}>{label}</div>
      <div style={{ fontSize: 14, color: highlight ? "var(--navy)" : "var(--text-mid)", fontWeight: highlight ? 700 : 400 }}>
        {value || "\u2014"}
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────── */
const st = {
  /* Page layout */
  page: {},
  card: {
    maxWidth: 720,
    background: "white", borderRadius: 16,
    padding: "32px 36px",
    border: "1px solid rgba(11,29,53,0.08)",
    boxShadow: "0 1px 4px rgba(11,29,53,0.04)",
  },

  /* Back link */
  backLink: {
    display: "inline-flex", alignItems: "center", gap: 6,
    fontSize: 14, fontWeight: 600, color: "var(--sage)",
    textDecoration: "none", marginBottom: 24,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },

  /* Header */
  header: {
    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
    marginBottom: 28, paddingBottom: 20,
    borderBottom: "1px solid rgba(11,29,53,0.08)",
  },
  title: {
    fontFamily: "'Fraunces', serif", fontSize: 28,
    fontWeight: 600, color: "var(--navy)", margin: 0,
  },
  statusBadge: {
    fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
    textTransform: "uppercase",
    padding: "4px 10px", borderRadius: 100,
    display: "inline-block",
  },

  /* Sections */
  section: {
    marginBottom: 28, paddingBottom: 24,
    borderBottom: "1px solid rgba(11,29,53,0.06)",
  },
  sectionTitle: {
    fontSize: 16, fontWeight: 700, color: "var(--navy)",
    marginBottom: 16, marginTop: 0,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    textTransform: "uppercase", letterSpacing: "0.04em",
  },

  /* Detail grid */
  detailGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 16,
  },
  detailLabel: {
    fontSize: 11, fontWeight: 600, color: "var(--text-light)",
    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4,
  },
  descriptionBox: {
    fontSize: 14, color: "var(--text-mid)", lineHeight: 1.7,
    background: "var(--cream)", borderRadius: 10,
    padding: "14px 18px", marginTop: 6,
    border: "1px solid rgba(11,29,53,0.06)",
  },

  /* Score bars */
  scoreBarWrap: {
    width: "100%", height: 8, borderRadius: 100,
    background: "rgba(11,29,53,0.06)", overflow: "hidden",
  },
  scoreBarFill: {
    height: "100%", borderRadius: 100,
    background: "linear-gradient(90deg, var(--sage), var(--amber))",
    transition: "width 0.4s ease",
  },

  /* Flags */
  flagBadge: {
    fontSize: 12, fontWeight: 600,
    color: "#C8851A",
    background: "rgba(232,160,32,0.12)",
    border: "1px solid rgba(232,160,32,0.25)",
    borderRadius: 100, padding: "4px 14px",
    display: "inline-block",
  },

  /* Action buttons */
  approveBtn: {
    padding: "12px 28px", fontSize: 14, fontWeight: 600,
    background: "var(--sage)", color: "white",
    border: "none", borderRadius: 10,
    cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: "opacity 0.2s",
  },
  rejectBtn: {
    padding: "12px 28px", fontSize: 14, fontWeight: 600,
    background: "transparent", color: "#D96B4A",
    border: "1.5px solid #D96B4A", borderRadius: 10,
    cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: "all 0.2s",
  },
  rejectForm: {
    background: "rgba(217,107,74,0.04)",
    border: "1px solid rgba(217,107,74,0.15)",
    borderRadius: 12, padding: "20px 24px",
  },
  textarea: {
    width: "100%", background: "white",
    border: "1.5px solid rgba(11,29,53,0.12)",
    borderRadius: 10, padding: "12px 16px",
    fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif",
    outline: "none", color: "var(--navy)",
    resize: "vertical", marginTop: 6,
  },

  /* Action message */
  actionMsgBox: {
    fontSize: 14, fontWeight: 600,
    borderRadius: 10, padding: "12px 18px",
    marginBottom: 24, border: "1px solid",
  },

  /* Error */
  errSmall: {
    color: "#D96B4A", fontSize: 13,
    background: "rgba(217,107,74,0.08)",
    border: "1px solid rgba(217,107,74,0.15)",
    borderRadius: 8, padding: "8px 12px", marginTop: 10,
  },
};
