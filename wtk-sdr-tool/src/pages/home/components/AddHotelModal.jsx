export function AddHotelModal({ open, form, setForm, onClose, onSave }) {
  if (!open) return null;
  const canSave = !!(form.hotel_name && form.hotel_name.trim());
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Add Hotel</div>
        <div className="add-hotel-grid">
          <label className="full-width">
            Hotel Name *
            <input
              value={form.hotel_name || ""}
              onChange={(e) => setForm((p) => ({ ...p, hotel_name: e.target.value }))}
              placeholder="e.g. Kimpton Hotel Monaco DC"
            />
          </label>
          <label>
            City
            <input
              value={form.city || ""}
              onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
              placeholder="Washington"
            />
          </label>
          <label>
            Country
            <input
              value={form.country || ""}
              onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
              placeholder="United States"
            />
          </label>
          <label>
            Group
            <input
              value={form.hotel_group || ""}
              onChange={(e) => setForm((p) => ({ ...p, hotel_group: e.target.value }))}
              placeholder="IHG"
            />
          </label>
          <label>
            Brand
            <input
              value={form.brand || ""}
              onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
              placeholder="Kimpton"
            />
          </label>
          <label>
            Address
            <input
              value={form.address || ""}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              placeholder="1726 M St NW"
            />
          </label>
          <label>
            Website
            <input
              value={form.website || ""}
              onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
              placeholder="https://..."
            />
          </label>
          <label>
            ADR (USD)
            <input
              type="number"
              value={form.adr_usd || ""}
              onChange={(e) => setForm((p) => ({ ...p, adr_usd: e.target.value }))}
              placeholder="250"
            />
          </label>
          <label>
            Rooms
            <input
              type="number"
              value={form.rooms || ""}
              onChange={(e) => setForm((p) => ({ ...p, rooms: e.target.value }))}
              placeholder="335"
            />
          </label>
          <label>
            Provider
            <select
              value={form.current_provider || ""}
              onChange={(e) => setForm((p) => ({ ...p, current_provider: e.target.value }))}
            >
              <option value="">Select...</option>
              {["Medallia", "Qualtrics", "ReviewPro", "TrustYou", "Revinate", "Reputation.com", "Unknown", "Other"].map(
                (p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                )
              )}
            </select>
          </label>
          <div style={{ gridColumn: "1/-1", borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 8 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--text3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 8,
              }}
            >
              Decision Maker
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <label>
                Contact Name
                <input
                  value={form.gm_name || ""}
                  onChange={(e) => setForm((p) => ({ ...p, gm_name: e.target.value }))}
                  placeholder="e.g. John Smith"
                />
              </label>
              <label>
                Title
                <input
                  value={form.gm_title || ""}
                  onChange={(e) => setForm((p) => ({ ...p, gm_title: e.target.value }))}
                  placeholder="General Manager"
                />
              </label>
              <label>
                Email
                <input
                  value={form.email || ""}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="gm@hotel.com"
                  type="email"
                />
              </label>
              <label>
                LinkedIn
                <input
                  value={form.linkedin || ""}
                  onChange={(e) => setForm((p) => ({ ...p, linkedin: e.target.value }))}
                  placeholder="linkedin.com/in/..."
                />
              </label>
            </div>
          </div>
          <div style={{ gridColumn: "1/-1", borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 8 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--text3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 8,
              }}
            >
              Operations
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <label>
                Mgmt Company
                <input
                  value={form.management_company || ""}
                  onChange={(e) => setForm((p) => ({ ...p, management_company: e.target.value }))}
                  placeholder="e.g. IHG Hotels & Resorts"
                />
              </label>
              <label>
                Operating Model
                <select
                  value={form.operating_model || ""}
                  onChange={(e) => setForm((p) => ({ ...p, operating_model: e.target.value }))}
                >
                  <option value="">Select...</option>
                  {["Owned", "Managed", "Franchised", "Leased", "Other"].map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <label className="full-width">
            Notes
            <input
              value={form.notes || ""}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Any context..."
            />
          </label>
        </div>
        <div className="modal-footer">
          <button className="modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="modal-confirm"
            disabled={!canSave}
            style={{ opacity: canSave ? 1 : 0.5 }}
            onClick={onSave}
          >
            Save Hotel
          </button>
        </div>
      </div>
    </div>
  );
}
