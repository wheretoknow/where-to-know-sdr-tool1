export function parseJSON(raw) {
  try {
    const c = raw.replace(/```json|```/g, "").trim();
    const s = c.indexOf("["),
      e = c.lastIndexOf("]");
    if (s < 0 || e < 0) return [];
    return JSON.parse(c.slice(s, e + 1));
  } catch {
    return [];
  }
}
