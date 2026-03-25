export function EmailBody({ text }) {
  if (!text) return null;
  const paras = text.split(/\n\n+/).filter(Boolean);
  return (
    <div className="email-body">
      {paras.map((p, i) => (
        <div key={i} className="email-para">
          {p}
        </div>
      ))}
    </div>
  );
}
