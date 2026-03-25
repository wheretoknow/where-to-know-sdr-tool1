import { addBusinessDays } from "../../../utils/dateUtils.js";
import { STAGE_LABELS } from "../../../data/pipelineConstants.js";

export function DashboardTab({ prospects, validTracking }) {
  const totalProspects = prospects.length;
  const withEmail = prospects.filter((p) => p.email).length;
  const withGM = prospects.filter((p) => p.gm_name).length;
  const verifiedCount = prospects.filter((p) => p.verified).length;
  const inPipeline = validTracking.length;
  const contacted1 = validTracking.filter((t) => t.d1).length;

  const SM2 = (s) => {
    if (s === "active") return "new";
    if (s === "emailed") return "1st";
    if (s === "followup") return "2nd";
    if (s === "dead") return "lost";
    return s || "new";
  };
  const stCounts = {};
  const ST_ALL = ["new", "1st", "2nd", "3rd", "4th", "replied", "bounced", "demo", "trial", "won", "lost"];
  ST_ALL.forEach((s) => {
    stCounts[s] = 0;
  });
  validTracking.forEach((t) => {
    const s = SM2(t.pipeline_stage);
    stCounts[s] = (stCounts[s] || 0) + 1;
  });
  const stColors = {
    new: "#059669",
    "1st": "#2563eb",
    "2nd": "#0891b2",
    "3rd": "#7c3aed",
    "4th": "#6d28d9",
    replied: "#0d9488",
    bounced: "#b45309",
    demo: "#c026d3",
    trial: "#ea580c",
    won: "#059669",
    lost: "#dc2626",
  };

  const repliedCount = stCounts["replied"] + stCounts["demo"] + stCounts["trial"] + stCounts["won"];
  const replyRate = contacted1 > 0 ? Math.round((repliedCount / contacted1) * 100) : 0;

  const CAD2 = [0, 0, 3, 7, 7];
  let overdueCount = 0;
  let dueTodayCount = 0;
  validTracking
    .filter((t) => t.d1)
    .forEach((t) => {
      const actual = [null, t.d1, t.d2, t.d3, t.d4];
      const due = [null, null, null, null, null];
      for (let n = 2; n <= 4; n++) {
        const a = actual[n - 1] || due[n - 1];
        if (a) due[n] = addBusinessDays(a, CAD2[n]);
      }
      const stage = SM2(t.pipeline_stage);
      const isClosed = ["won", "lost", "demo", "trial"].includes(stage);
      if (isClosed) return;
      let nextDue = null;
      for (let n = 2; n <= 4; n++) {
        if (!actual[n] && due[n]) {
          nextDue = due[n];
          break;
        }
      }
      if (!nextDue) return;
      const target = new Date(nextDue);
      target.setHours(0, 0, 0, 0);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const diff = Math.round((target - now) / 86400000);
      if (diff < 0) overdueCount++;
      else if (diff === 0) dueTodayCount++;
    });

  const sdrMap = {};
  validTracking.forEach((t) => {
    const s = t.sdr || "Unassigned";
    sdrMap[s] = (sdrMap[s] || 0) + 1;
  });
  const sdrEntries = Object.entries(sdrMap).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ padding: "8px 0" }}>
      <div className="dash-grid">
        <div className="dash-card">
          <div className="dash-card-label">Total Hotels</div>
          <div className="dash-card-val">{totalProspects}</div>
          <div className="dash-card-sub">
            {withGM} with contact · {withEmail} with email · {verifiedCount} verified
          </div>
        </div>
        <div className="dash-card">
          <div className="dash-card-label">In Pipeline</div>
          <div className="dash-card-val">{inPipeline}</div>
          <div className="dash-card-sub">
            {contacted1} contacted · {inPipeline - contacted1} pending
          </div>
        </div>
        <div className="dash-card">
          <div className="dash-card-label">Reply Rate</div>
          <div className="dash-card-val">{replyRate}%</div>
          <div className="dash-card-sub">
            {repliedCount} replies from {contacted1} contacted
          </div>
        </div>
        <div className="dash-card">
          <div className="dash-card-label">Today&apos;s Actions</div>
          <div
            className="dash-card-val"
            style={{
              color: overdueCount > 0 ? "var(--red)" : dueTodayCount > 0 ? "var(--orange)" : "var(--green)",
            }}
          >
            {overdueCount + dueTodayCount}
          </div>
          <div className="dash-card-sub">
            {overdueCount > 0 ? overdueCount + " overdue · " : ""}
            {dueTodayCount} due today
          </div>
        </div>
      </div>

      <div className="dash-card" style={{ marginBottom: 16 }}>
        <div className="dash-card-label" style={{ marginBottom: 10 }}>
          Pipeline Distribution
        </div>
        <div className="dash-stage-bar">
          {ST_ALL.filter((s) => stCounts[s] > 0).map((s) => (
            <div
              key={s}
              className="dash-stage-seg"
              style={{
                width: (stCounts[s] / Math.max(inPipeline, 1)) * 100 + "%",
                background: stColors[s],
              }}
              title={STAGE_LABELS[s] + ": " + stCounts[s]}
            />
          ))}
        </div>
        <div className="dash-stage-legend">
          {ST_ALL.filter((s) => stCounts[s] > 0).map((s) => (
            <span key={s} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span className="dash-stage-dot" style={{ background: stColors[s] }} />
              {STAGE_LABELS[s]} <b>{stCounts[s]}</b>
            </span>
          ))}
        </div>
      </div>

      {sdrEntries.length > 0 && (
        <div className="dash-card">
          <div className="dash-card-label" style={{ marginBottom: 10 }}>
            By SDR
          </div>
          {sdrEntries.map(([sdr, cnt]) => {
            const sdrTracking = validTracking.filter((t) => (t.sdr || "Unassigned") === sdr);
            const sdrContacted = sdrTracking.filter((t) => t.d1).length;
            const sdrReplied = sdrTracking.filter((t) =>
              ["replied", "demo", "trial", "won"].includes(SM2(t.pipeline_stage))
            ).length;
            return (
              <div
                key={sdr}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, minWidth: 100, color: "var(--text)" }}>{sdr}</span>
                <div style={{ flex: 1, height: 6, background: "var(--bg)", borderRadius: 3, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: (cnt / Math.max(...sdrEntries.map((e) => e[1]), 1)) * 100 + "%",
                      background: "var(--accent)",
                      borderRadius: 3,
                      transition: "width 0.3s",
                    }}
                  />
                </div>
                <span style={{ fontSize: 12, color: "var(--text3)", minWidth: 140, textAlign: "right" }}>
                  {cnt} assigned · {sdrContacted} sent · {sdrReplied} replied
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
