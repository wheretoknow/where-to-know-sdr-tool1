export function ResearchNotes({ text }) {
  if (!text) return null;
  const clean = text.replace(/<!--contacts:.*?-->\n?/s, "").trim();
  if (!clean) return null;
  const lines = clean
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const bullets = [];
  let current = "";
  for (const line of lines) {
    if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*")) {
      if (current) bullets.push(current);
      current = line.replace(/^[•\-*]+\s*/, "").replace(/^[•\-*]+\s*/, "");
    } else if (bullets.length === 0 && !current) {
      current = line;
    } else {
      current += " " + line;
    }
  }
  if (current) bullets.push(current);

  if (bullets.length <= 1) {
    const para = clean.trim();
    const parts = para
      .split(/\.\s+/)
      .filter(Boolean)
      .map((s) => (s.endsWith(".") ? s : s + "."));
    return (
      <div className="research-notes">
        {parts.map((p, i) => (
          <div key={i} className="bullet">
            <span className="bullet-dot">•</span>
            <span className="bullet-text">{p}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="research-notes">
      {bullets.map((b, i) => (
        <div key={i} className="bullet">
          <span className="bullet-dot">•</span>
          <span className="bullet-text">{b}</span>
        </div>
      ))}
    </div>
  );
}
