/**
 * 登录页占位：无表单提交与鉴权逻辑，仅预留路由与布局。
 */
export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg, #f1f5f9)",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          padding: "2rem 2.25rem",
          background: "var(--bg-elevated, #fff)",
          borderRadius: 12,
          border: "1px solid var(--border, #e2e8f0)",
          boxShadow: "0 4px 24px rgba(15, 23, 42, 0.08)",
          textAlign: "center",
          maxWidth: 400,
        }}
      >
        <h1 style={{ margin: "0 0 0.75rem", fontSize: "1.35rem", fontWeight: 700, color: "var(--text, #0f172a)" }}>
          登录
        </h1>
        <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.5, color: "var(--text3, #64748b)" }}>
          预留页面。账号密码、第三方登录与鉴权接口可在此后续接入。
        </p>
      </div>
    </div>
  );
}
