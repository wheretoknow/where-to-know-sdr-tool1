export function TierBadge({ tier }) {
  const t = (tier || "").toLowerCase();
  const cls = t.includes("lux")
    ? "badge-luxury"
    : t.includes("prem")
      ? "badge-premium"
      : t.includes("life")
        ? "badge-lifestyle"
        : "badge-economy";
  return <span className={`badge ${cls}`}>{tier || "—"}</span>;
}
