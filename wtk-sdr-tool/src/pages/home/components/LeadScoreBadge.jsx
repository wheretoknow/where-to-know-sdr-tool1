export function LeadScoreBadge({ score: scoreObj }) {
  const { total, grade, breakdown } = scoreObj;
  const styles = {
    A: { color: "#1d4ed8", bg: "#dbeafe" },
    B: { color: "#475569", bg: "#e2e8f0" },
    C: { color: "#94a3b8", bg: "#f1f5f9" },
  };
  const { color, bg } = styles[grade];
  const tooltip = breakdown.join("\n");
  return (
    <span
      title={tooltip}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: "2px 7px",
        borderRadius: 5,
        background: bg,
        color,
        fontWeight: 700,
        fontSize: 12,
        lineHeight: "18px",
        cursor: "help",
      }}
    >
      {grade}{" "}
      <span style={{ fontWeight: 400, opacity: 0.8 }}>{total}</span>
    </span>
  );
}
