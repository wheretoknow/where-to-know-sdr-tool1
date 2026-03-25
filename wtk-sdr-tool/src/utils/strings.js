export function normalizeSearch(s) {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ø/g, "o")
    .replace(/ß/g, "ss")
    .replace(/æ/g, "ae")
    .replace(/þ/g, "th");
}
