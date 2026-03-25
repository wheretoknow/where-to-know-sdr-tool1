export function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: toast.type === "error" ? "#dc2626" : "#059669",
        color: "white",
        padding: "10px 24px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        zIndex: 9999,
        animation: "fadeInUp 0.2s ease",
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}
    >
      {toast.msg}
    </div>
  );
}
