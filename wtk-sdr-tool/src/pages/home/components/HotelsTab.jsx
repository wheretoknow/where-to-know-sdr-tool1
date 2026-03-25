import { LeadScoreBadge } from "./LeadScoreBadge.jsx";
import { calcLeadScore } from "../../../utils/leadScore.js";
import {
  getProvider,
  normalizeGroup,
  normalizeBrand,
  inferBrandFromName,
} from "../../../utils/hotelNormalize.js";

const HOTELS_PER_PAGE = 20;

export function HotelsTab({
  loading,
  filteredP,
  sortedP,
  pagedP,
  totalHotelPages,
  hotelsPage,
  setHotelsPage,
  allCountries,
  allCities,
  allGroups,
  allBrands,
  allProviders,
  filterSearch,
  setFilterSearch,
  filterCountry,
  setFilterCountry,
  filterCity,
  setFilterCity,
  filterGroup,
  setFilterGroup,
  filterBrand,
  setFilterBrand,
  filterProvider,
  setFilterProvider,
  filterHasEmail,
  setFilterHasEmail,
  filterHasGM,
  setFilterHasGM,
  filterVerified,
  setFilterVerified,
  selectedIds,
  setSelectedIds,
  selected,
  setSelected,
  sortCol,
  sortDir,
  setSortCol,
  toggleSort,
  updateProspect,
  updatePipeline,
  verifyAndAddToPipeline,
  deleteProspect,
  setDeleteConfirm,
  tracking,
}) {
  const hasFilters =
    filterCountry ||
    filterCity ||
    filterGroup ||
    filterBrand ||
    filterSearch ||
    filterProvider ||
    filterHasEmail ||
    filterHasGM ||
    filterVerified;

  function clearAllFilters() {
    setFilterCountry("");
    setFilterCity("");
    setFilterGroup("");
    setFilterBrand("");
    setFilterSearch("");
    setFilterProvider("");
    setHotelsPage(1);
  }

  return (
    <div className="table-card">
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          padding: "12px 0 8px",
          flexWrap: "wrap",
          overflowX: "auto",
        }}
      >
        <input
          className="cmd-input"
          style={{ minWidth: 150, flexShrink: 0 }}
          placeholder="🔍 Hotel or person..."
          value={filterSearch}
          onChange={(e) => {
            setFilterSearch(e.target.value);
            setHotelsPage(1);
          }}
        />
        <select
          className="cmd-input"
          style={{ minWidth: 110, flexShrink: 0 }}
          value={filterCountry}
          onChange={(e) => {
            setFilterCountry(e.target.value);
            setFilterCity("");
            setHotelsPage(1);
          }}
        >
          <option value="">All Countries</option>
          <option value="__blank__">(Blank)</option>
          {allCountries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="cmd-input"
          style={{ minWidth: 110, flexShrink: 0 }}
          value={filterCity}
          onChange={(e) => {
            setFilterCity(e.target.value);
            setHotelsPage(1);
          }}
        >
          <option value="">All Cities</option>
          <option value="__blank__">(Blank)</option>
          {allCities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="cmd-input"
          style={{ width: 160, flexShrink: 0, maxWidth: 160 }}
          value={filterGroup}
          onChange={(e) => {
            setFilterGroup(e.target.value);
            setHotelsPage(1);
          }}
        >
          <option value="">All Groups</option>
          <option value="__blank__">(Blank)</option>
          {allGroups.map((g) => (
            <option key={g} value={g}>
              {g.length > 28 ? g.slice(0, 26) + "…" : g}
            </option>
          ))}
        </select>
        <select
          className="cmd-input"
          style={{ minWidth: 100, flexShrink: 0 }}
          value={filterBrand}
          onChange={(e) => {
            setFilterBrand(e.target.value);
            setHotelsPage(1);
          }}
        >
          <option value="">All Brands</option>
          <option value="__blank__">(Blank)</option>
          {allBrands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          className="cmd-input"
          style={{ minWidth: 100, flexShrink: 0 }}
          value={filterProvider}
          onChange={(e) => {
            setFilterProvider(e.target.value);
            setHotelsPage(1);
          }}
        >
          <option value="">All Providers</option>
          {allProviders.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button
          className="act-btn"
          style={{
            fontSize: 11,
            flexShrink: 0,
            background: filterHasGM ? "var(--accent)" : "transparent",
            color: filterHasGM ? "white" : "var(--text2)",
            border: filterHasGM ? "1px solid var(--accent)" : "1px solid var(--border)",
            borderRadius: 4,
            padding: "4px 8px",
          }}
          onClick={() => {
            setFilterHasGM((v) => !v);
            setHotelsPage(1);
          }}
        >
          Has GM
        </button>
        <button
          className="act-btn"
          style={{
            fontSize: 11,
            flexShrink: 0,
            background: filterHasEmail ? "var(--accent)" : "transparent",
            color: filterHasEmail ? "white" : "var(--text2)",
            border: filterHasEmail ? "1px solid var(--accent)" : "1px solid var(--border)",
            borderRadius: 4,
            padding: "4px 8px",
          }}
          onClick={() => {
            setFilterHasEmail((v) => !v);
            setHotelsPage(1);
          }}
        >
          Has Email
        </button>
        <select
          className="cmd-input"
          style={{ minWidth: 80, flexShrink: 0, fontSize: 11 }}
          value={filterVerified}
          onChange={(e) => {
            setFilterVerified(e.target.value);
            setHotelsPage(1);
          }}
        >
          <option value="">All Status</option>
          <option value="yes">✓ Verified</option>
          <option value="no">? Unverified</option>
        </select>
        {hasFilters && (
          <button
            className="act-btn"
            style={{ fontSize: 11, flexShrink: 0 }}
            onClick={() => {
              setFilterCountry("");
              setFilterCity("");
              setFilterGroup("");
              setFilterBrand("");
              setFilterSearch("");
              setFilterProvider("");
              setFilterHasEmail(false);
              setFilterHasGM(false);
              setFilterVerified("");
              setHotelsPage(1);
              setSortCol(null);
            }}
          >
            ✕ Clear
          </button>
        )}
        <span
          style={{
            marginLeft: "auto",
            fontSize: 12,
            color: "var(--text2)",
            whiteSpace: "nowrap",
            flexShrink: 0,
            fontWeight: 600,
            background: "var(--bg)",
            padding: "4px 10px",
            borderRadius: 5,
            border: "1px solid var(--border)",
          }}
        >
          {sortedP.length} hotels{hasFilters ? " (filtered)" : ""}
        </span>
      </div>
      {filteredP.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">{loading ? "⏳" : "🔍"}</div>
          <div className="empty-title">{loading ? "Loading database..." : "No hotels match your filters"}</div>
          <div className="empty-sub" style={{ marginBottom: 12 }}>
            {loading ? "" : "Try adjusting your search or filters."}
          </div>
          {!loading && <button className="act-btn" onClick={clearAllFilters}>← Clear all filters</button>}
        </div>
      ) : (
        <>
          {selectedIds.size > 0 && (
            <div className="batch-bar">
              <span className="batch-bar-count">{selectedIds.size} selected</span>
              <select
                className="cmd-input"
                style={{ minWidth: 100 }}
                defaultValue=""
                onChange={async (e) => {
                  const val = e.target.value;
                  if (!val) return;
                  e.target.value = "";
                  const ids = [...selectedIds];
                  for (const pid of ids) {
                    await updateProspect(pid, { lead_status: val });
                  }
                  setSelectedIds(new Set());
                }}
              >
                <option value="">Set Lead Status</option>
                <option value="Active">Active</option>
                <option value="Dormant">Dormant</option>
                <option value="Closed">Closed</option>
              </select>
              <select
                className="cmd-input"
                style={{ minWidth: 100 }}
                defaultValue=""
                onChange={async (e) => {
                  const val = e.target.value;
                  if (!val) return;
                  e.target.value = "";
                  const ids = [...selectedIds];
                  for (const pid of ids) {
                    const t = tracking.find((x) => x.prospect_id === pid);
                    if (t) await updatePipeline(t.id, { pipeline_stage: val });
                  }
                  setSelectedIds(new Set());
                }}
              >
                <option value="">Set Stage</option>
                {["new", "1st", "2nd", "3rd", "4th", "replied", "bounced", "demo", "trial", "won", "lost"].map(
                  (s) => (
                    <option key={s} value={s}>
                      {s === "1st"
                        ? "Email #1"
                        : s === "2nd"
                          ? "Follow-up #1"
                          : s === "3rd"
                            ? "Follow-up #2"
                            : s === "4th"
                              ? "Follow-up #3"
                              : s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  )
                )}
              </select>
              <select
                className="cmd-input"
                style={{ minWidth: 100 }}
                defaultValue=""
                onChange={async (e) => {
                  const val = e.target.value;
                  if (!val) return;
                  e.target.value = "";
                  const ids = [...selectedIds];
                  for (const pid of ids) {
                    const t = tracking.find((x) => x.prospect_id === pid);
                    if (t) await updatePipeline(t.id, { sdr: val });
                  }
                  setSelectedIds(new Set());
                }}
              >
                <option value="">Assign SDR</option>
                {[...new Set(tracking.map((t) => t.sdr).filter(Boolean))]
                  .sort()
                  .map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
              </select>
              <button
                className="act-btn"
                style={{
                  fontSize: 11,
                  color: "var(--green)",
                  border: "1px solid var(--green-border)",
                  background: "var(--green-bg)",
                }}
                onClick={async () => {
                  const ids = [...selectedIds];
                  for (const pid of ids) {
                    await verifyAndAddToPipeline(pid);
                  }
                  setSelectedIds(new Set());
                }}
              >
                ✓ Verify & Add to Pipeline ({selectedIds.size})
              </button>
              <button
                className="act-btn"
                style={{ fontSize: 11, color: "var(--text3)", border: "1px solid var(--border)" }}
                onClick={async () => {
                  const ids = [...selectedIds];
                  for (const pid of ids) {
                    await updateProspect(pid, { verified: false });
                  }
                  setSelectedIds(new Set());
                }}
              >
                ✕ Unverified
              </button>
              <button
                className="act-btn"
                style={{
                  fontSize: 11,
                  color: "var(--red)",
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                }}
                onClick={async () => {
                  if (!confirm(`Delete ${selectedIds.size} selected hotels permanently?`)) return;
                  for (const pid of [...selectedIds]) {
                    await deleteProspect(pid);
                  }
                  setSelectedIds(new Set());
                }}
              >
                Delete {selectedIds.size}
              </button>
              <button className="act-btn" style={{ fontSize: 11, marginLeft: "auto" }} onClick={() => setSelectedIds(new Set())}>
                ✕ Deselect
              </button>
            </div>
          )}
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th className="cb-cell" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={pagedP.length > 0 && pagedP.every((p) => selectedIds.has(p.id))}
                      onChange={(e) => {
                        const next = new Set(selectedIds);
                        if (e.target.checked) pagedP.forEach((p) => next.add(p.id));
                        else pagedP.forEach((p) => next.delete(p.id));
                        setSelectedIds(next);
                      }}
                    />
                  </th>
                  <th style={{ width: "22%" }}>Hotel</th>
                  <th style={{ width: "6%" }}>City</th>
                  <th style={{ width: "6%" }}>Country</th>
                  <th style={{ width: "5%" }}>Group</th>
                  <th style={{ width: "4%" }}>Brand</th>
                  <th style={{ width: "13%" }}>Contact</th>
                  <th style={{ width: "12%" }}>Email</th>
                  <th className="sortable" style={{ width: "5%" }} onClick={() => toggleSort("rooms")}>
                    Rooms{" "}
                    <span className={`sort-arrow ${sortCol === "rooms" ? "active" : ""}`}>
                      {sortCol === "rooms" ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                    </span>
                  </th>
                  <th className="sortable" style={{ width: "5%" }} onClick={() => toggleSort("adr")}>
                    ADR{" "}
                    <span className={`sort-arrow ${sortCol === "adr" ? "active" : ""}`}>
                      {sortCol === "adr" ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                    </span>
                  </th>
                  <th className="sortable" style={{ width: "5%" }} onClick={() => toggleSort("score")}>
                    Score{" "}
                    <span className={`sort-arrow ${sortCol === "score" ? "active" : ""}`}>
                      {sortCol === "score" ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                    </span>
                  </th>
                  <th style={{ width: "7%" }}>Provider</th>
                  <th style={{ width: "6%" }}>Lead</th>
                  <th style={{ width: "3%" }}></th>
                </tr>
              </thead>
              <tbody>
                {pagedP.map((p) => {
                  const isIndependent = !p.hotel_group && !p.brand;
                  const isChecked = selectedIds.has(p.id);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelected(p.id)}
                      style={{
                        background: isChecked ? "var(--accent-light)" : selected === p.id ? "#f0f7ff" : undefined,
                        outline: selected === p.id ? "2px solid #bfdbfe" : "none",
                        outlineOffset: "-2px",
                      }}
                    >
                      <td className="cb-cell" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const next = new Set(selectedIds);
                            e.target.checked ? next.add(p.id) : next.delete(p.id);
                            setSelectedIds(next);
                          }}
                        />
                      </td>
                      <td>
                        <div className="hotel-name" style={{ display: "flex", alignItems: "center" }}>
                          {p.hotel_name}
                          {p.verified ? (
                            <span className="verified-badge" title="Verified — appears in Pipeline">
                              ✓
                            </span>
                          ) : (
                            <span
                              className="verified-badge unverified"
                              title="Click to verify & add to Pipeline"
                              onClick={(e) => {
                                e.stopPropagation();
                                verifyAndAddToPipeline(p.id);
                              }}
                            >
                              ?
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="cell-muted" style={{ fontSize: 12 }}>
                          {p.city || "—"}
                        </span>
                      </td>
                      <td>
                        <span className="cell-muted" style={{ fontSize: 12 }}>
                          {p.country || "—"}
                        </span>
                      </td>
                      <td>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text2)",
                            maxWidth: 110,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={normalizeGroup(p.hotel_group || p.brand) || "Independent"}
                        >
                          {isIndependent ? "Independent" : normalizeGroup(p.hotel_group || p.brand) || "—"}
                        </div>
                      </td>
                      <td>
                        <span className="cell-muted" style={{ fontSize: 12 }}>
                          {normalizeBrand(p.brand) || inferBrandFromName(p.hotel_name) || "—"}
                        </span>
                      </td>
                      <td>
                        <div className="gm-name" style={{ fontSize: 12 }} title={p.gm_name || ""}>
                          {p.gm_name || <span className="cell-muted">—</span>}
                        </div>
                        {p.gm_name && p.gm_title && p.gm_title !== "General Manager" ? (
                          <div className="gm-title-sm">{p.gm_title}</div>
                        ) : null}
                      </td>
                      <td>
                        {(() => {
                          const em = p.email;
                          if (!em || em.includes("[email") || em.includes("email protected"))
                            return <span className="cell-muted">—</span>;
                          return (
                            <a
                              className="email-link"
                              href={`mailto:${em}`}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                maxWidth: 150,
                                display: "inline-block",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={em}
                            >
                              {em}
                            </a>
                          );
                        })()}
                      </td>
                      <td>
                        <span className="cell-muted" style={{ fontSize: 12 }}>
                          {p.rooms || "—"}
                        </span>
                      </td>
                      <td>
                        <span className="cell-muted" style={{ fontSize: 12 }}>
                          {p.adr_usd ? `~$${p.adr_usd}` : "—"}
                        </span>
                      </td>
                      <td>
                        <LeadScoreBadge score={calcLeadScore(p)} />
                      </td>
                      <td>
                        <span className="cell-muted" style={{ fontSize: 11 }}>
                          {getProvider(p) || "—"}
                        </span>
                      </td>
                      <td style={{ overflow: "visible" }} onClick={(e) => e.stopPropagation()}>
                        <select
                          style={{
                            fontSize: 10,
                            border: "1px solid var(--border2)",
                            borderRadius: 3,
                            padding: "2px 4px",
                            background: "transparent",
                            cursor: "pointer",
                            color: { Active: "var(--green)", Dormant: "#d97706", Closed: "var(--text3)" }[
                              p.lead_status || "Active"
                            ],
                          }}
                          value={p.lead_status || "Active"}
                          onChange={(e) => updateProspect(p.id, { lead_status: e.target.value })}
                        >
                          <option value="Active">Active</option>
                          <option value="Dormant">Dormant</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </td>
                      <td style={{ overflow: "visible", textOverflow: "clip" }} onClick={(e) => e.stopPropagation()}>
                        <button className="del-btn" onClick={() => setDeleteConfirm(p.id)} title="Delete">
                          🗑
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalHotelPages > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "12px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <button className="act-btn" disabled={hotelsPage === 1} onClick={() => setHotelsPage((p) => p - 1)}>
                ← Prev
              </button>
              {Array.from({ length: Math.min(totalHotelPages, 7) }, (_, i) => {
                let page;
                if (totalHotelPages <= 7) page = i + 1;
                else if (hotelsPage <= 4) page = i + 1;
                else if (hotelsPage >= totalHotelPages - 3) page = totalHotelPages - 6 + i;
                else page = hotelsPage - 3 + i;
                return (
                  <button
                    key={page}
                    className={`act-btn ${hotelsPage === page ? "success" : ""}`}
                    style={{ minWidth: 32 }}
                    onClick={() => setHotelsPage(page)}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                className="act-btn"
                disabled={hotelsPage === totalHotelPages}
                onClick={() => setHotelsPage((p) => p + 1)}
              >
                Next →
              </button>
              <span style={{ fontSize: 11, color: "var(--text3)", marginLeft: 4 }}>
                {(hotelsPage - 1) * HOTELS_PER_PAGE + 1}–{Math.min(hotelsPage * HOTELS_PER_PAGE, sortedP.length)} of{" "}
                {sortedP.length}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
