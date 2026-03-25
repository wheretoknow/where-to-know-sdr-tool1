import { sbFetch } from "../../../api/supabase.js";
import { normalizeBrand } from "../../../utils/hotelNormalize.js";
import { groupToPairs } from "../../../utils/duplicateFinder.js";

export function DuplicateFinderModal({
  dupGroups,
  onClose,
  dupExpanded,
  setDupExpanded,
  dismissedDupPairs,
  setDismissedDupPairs,
  setSelected,
  setProspects,
  setTracking,
  setDupGroups,
}) {
  if (dupGroups === null) return null;

  return (
    <div className="confirm-overlay" style={{ zIndex: 65 }} onClick={onClose}>
      <div className="dup-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Duplicate Finder</div>
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
              {dupGroups.length === 0
                ? "No duplicates found."
                : `${dupGroups.length} suspected duplicate group${dupGroups.length > 1 ? "s" : ""} found`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {dismissedDupPairs.size > 0 && (
              <button
                className="act-btn"
                style={{ fontSize: 11 }}
                onClick={() => {
                  setDismissedDupPairs(new Set());
                  localStorage.removeItem("wtk_dismissed_dup_pairs");
                }}
              >
                Reset ignored decisions ({dismissedDupPairs.size})
              </button>
            )}
            {dupGroups.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  className="act-btn"
                  style={{
                    fontSize: 11,
                    background: "#991b1b",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    padding: "6px 12px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                  onClick={async () => {
                    const identicalGroups = dupGroups.filter((g) => g.confidence === "Identical");
                    if (!identicalGroups.length) return alert("No Identical groups found.");
                    if (
                      !confirm(
                        `Auto-merge ${identicalGroups.length} Identical groups?\n\nFor each duplicate pair, the record with the most data (GM, email, rooms, website, address) will be kept. Empty records will be deleted.`
                      )
                    )
                      return;
                    const allDeleteIds = [];
                    for (const g of identicalGroups) {
                      const scored = g.hotels.map((h) => ({
                        h,
                        s:
                          (h.website ? 2 : 0) +
                          (h.rooms ? 2 : 0) +
                          (h.gm_name ? 2 : 0) +
                          (h.email ? 2 : 0) +
                          (h.address ? 1 : 0) +
                          ((h.hotel_name || "").length > 25 ? 1 : 0),
                      }));
                      scored.sort((a, b) => b.s - a.s);
                      scored.slice(1).forEach((x) => allDeleteIds.push(x.h.id));
                    }
                    try {
                      const CHUNK = 100;
                      for (let i = 0; i < allDeleteIds.length; i += CHUNK) {
                        const batch = allDeleteIds.slice(i, i + CHUNK);
                        const ids = batch.map((id) => `"${id}"`).join(",");
                        await sbFetch(`/tracking?prospect_id=in.(${ids})`, { method: "DELETE", prefer: "return=minimal" }).catch(
                          () => {}
                        );
                        await sbFetch(`/prospects?id=in.(${ids})`, { method: "DELETE", prefer: "return=minimal" });
                      }
                      setProspects((prev) => prev.filter((p) => !allDeleteIds.includes(p.id)));
                      setTracking((prev) => prev.filter((t) => !allDeleteIds.includes(t.prospect_id)));
                      setDupGroups((prev) => prev.filter((g) => g.confidence !== "Identical"));
                      alert(`✓ Merged ${identicalGroups.length} groups, deleted ${allDeleteIds.length} duplicates.`);
                    } catch (e) {
                      alert("Error: " + e.message);
                    }
                  }}
                >
                  Merge All Identical ({dupGroups.filter((g) => g.confidence === "Identical").length})
                </button>
                <span style={{ fontSize: 10, color: "var(--text3)", maxWidth: 180 }}>Keeps the record with the most data</span>
              </div>
            )}
            <button className="act-btn" onClick={onClose} style={{ fontSize: 16, padding: "4px 10px" }}>
              ✕
            </button>
          </div>
        </div>
        {dupGroups.map((g, gi) => {
          const isExp = dupExpanded.has(gi);
          const badge =
            g.confidence === "Identical"
              ? "dup-badge-identical"
              : g.confidence === "High"
                ? "dup-badge-high"
                : g.confidence === "Medium"
                  ? "dup-badge-med"
                  : "dup-badge-low";
          return (
            <div key={gi} className="dup-group">
              <div
                className="dup-group-hdr"
                onClick={() =>
                  setDupExpanded((prev) => {
                    const n = new Set(prev);
                    n.has(gi) ? n.delete(gi) : n.add(gi);
                    return n;
                  })
                }
              >
                <span>{isExp ? "▾" : "▸"}</span>
                <span className={badge}>{g.confidence}</span>
                <span style={{ flex: 1 }}>{g.hotels.map((h) => h.hotel_name).join(" / ")}</span>
                <span style={{ fontSize: 10, color: "var(--text3)" }}>{g.hotels.length} hotels</span>
              </div>
              {isExp && (
                <>
                  <div style={{ padding: "4px 14px", fontSize: 10, color: "var(--text3)", background: "var(--bg2)" }}>
                    {g.reason}
                  </div>
                  <div className="dup-hotels">
                    <div className="dup-hotel-row" style={{ fontWeight: 600, fontSize: 10, color: "var(--text3)" }}>
                      <span>Hotel</span>
                      <span>City</span>
                      <span>Brand</span>
                      <span>Rooms</span>
                      <span>ADR</span>
                      <span>Contact / Email</span>
                      <span />
                    </div>
                    {g.hotels.map((h) => (
                      <div key={h.id} className="dup-hotel-row">
                        <div>
                          <div
                            style={{
                              fontWeight: 500,
                              cursor: "pointer",
                              color: "var(--accent)",
                              textDecoration: "underline",
                            }}
                            onClick={() => setSelected(h.id)}
                          >
                            {h.hotel_name}
                          </div>
                          <div style={{ fontSize: 9, color: "var(--text3)", marginTop: 1 }}>
                            {h.website
                              ? new URL(h.website.startsWith("http") ? h.website : "https://" + h.website).hostname.replace(
                                  "www.",
                                  ""
                                )
                              : "\u2014"}
                          </div>
                        </div>
                        <span>{h.city || "\u2014"}</span>
                        <span>{normalizeBrand(h.brand) || "\u2014"}</span>
                        <span>{h.rooms || "\u2014"}</span>
                        <span>{h.adr_usd ? "$" + h.adr_usd : "\u2014"}</span>
                        <div>
                          <div style={{ fontSize: 10 }}>{h.gm_name || "\u2014"}</div>
                          <div style={{ fontSize: 9, color: "var(--text3)" }}>{h.email || ""}</div>
                        </div>
                        <button
                          className="dup-keep-btn"
                          onClick={async () => {
                            const deleteIds = g.hotels.filter((x) => x.id !== h.id).map((x) => x.id);
                            if (!confirm(`Keep "${h.hotel_name}" and delete ${deleteIds.length} other(s)?`)) return;
                            try {
                              for (const id of deleteIds) {
                                await sbFetch(`/tracking?prospect_id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }).catch(
                                  () => {}
                                );
                                await sbFetch(`/prospects?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
                              }
                              setProspects((prev) => prev.filter((p) => !deleteIds.includes(p.id)));
                              setTracking((prev) => prev.filter((t) => !deleteIds.includes(t.prospect_id)));
                              setDupGroups((prev) => prev.filter((_, i) => i !== gi));
                            } catch (e) {
                              alert("Delete error: " + e.message);
                            }
                          }}
                        >
                          Keep
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="dup-actions">
                    <button
                      className="act-btn"
                      style={{ fontSize: 11 }}
                      onClick={() => {
                        const pairs = groupToPairs(g.hotels);
                        if (!pairs.length) return;
                        setDismissedDupPairs((prev) => {
                          const next = new Set(prev);
                          pairs.forEach((p) => next.add(p));
                          localStorage.setItem("wtk_dismissed_dup_pairs", JSON.stringify([...next]));
                          return next;
                        });
                        setDupGroups((prev) => prev.filter((_, i) => i !== gi));
                      }}
                    >
                      Not duplicate
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
