import { sbFetch } from "../../../api/supabase.js";
import { uid } from "../../../utils/uid.js";
import { fmtDateShort } from "../../../utils/dateUtils.js";
import { inferProvider } from "../../../utils/hotelNormalize.js";

export function exportProspectsCsv(filteredP) {
  const h = [
    "Hotel",
    "Brand",
    "Tier",
    "City",
    "Country",
    "Rooms",
    "F&B",
    "ADR USD",
    "Rating",
    "Reviews",
    "Contact",
    "Title",
    "Email",
    "LinkedIn",
    "Confidence",
    "Strategy",
    "Provider",
    "SDR",
    "Batch",
    "Added",
  ];
  const rows = filteredP.map((p) => [
    p.hotel_name,
    p.brand,
    p.tier,
    p.city,
    p.country,
    p.rooms || "",
    p.restaurants || "",
    p.adr_usd || "",
    p.rating || "",
    p.review_count || "",
    p.gm_name || "",
    p.gm_title || "",
    p.email || "",
    p.linkedin || "",
    p.contact_confidence || "",
    p.engagement_strategy || "",
    p.current_provider || "",
    p.sdr || "",
    p.batch || "",
    fmtDateShort(p.created_at),
  ]);
  const csv = [h, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `WTK_SDR_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

/**
 * Parse CSV/Excel file and append prospects via Supabase. Mutates event target value.
 */
export async function importProspectsFromFile(file, { setProspects, sdrName }) {
  let lines;
  const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

  if (isExcel) {
    try {
      const ab = await file.arrayBuffer();
      const mod = await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");
      const wb = mod.read(ab, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const csv = mod.utils.sheet_to_csv(ws);
      lines = csv.split(/\r?\n/).filter(Boolean);
    } catch (err) {
      alert("Failed to parse Excel file: " + err.message);
      return;
    }
  } else {
    let text = await file.text();
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    lines = text.split(/\r?\n/).filter(Boolean);
  }
  if (lines.length < 2) {
    alert("CSV appears empty.");
    return;
  }

  function parseRow(line) {
    const cols = [];
    let cur = "",
      inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = !inQ;
      } else if (c === "," && !inQ) {
        cols.push(cur);
        cur = "";
      } else cur += c;
    }
    cols.push(cur);
    return cols.map((s) => s.trim());
  }

  const DB_FIELDS = [
    "id",
    "hotel_name",
    "brand",
    "hotel_group",
    "tier",
    "city",
    "country",
    "address",
    "website",
    "rooms",
    "restaurants",
    "adr_usd",
    "rating",
    "review_count",
    "current_provider",
    "gm_name",
    "gm_first_name",
    "gm_title",
    "email",
    "linkedin",
    "phone",
    "email_source",
    "contact_confidence",
    "outreach_email_subject",
    "outreach_email_body",
    "linkedin_dm",
    "engagement_strategy",
    "strategy_reason",
    "research_notes",
    "sdr",
    "batch",
    "created_at",
    "lead_status",
    "management_company",
    "operating_model",
    "operating_model_note",
    "verified",
  ];
  const headers = parseRow(lines[0]).map((h) => h.toLowerCase().trim());
  const isDirectMode = DB_FIELDS.filter((f) => headers.includes(f)).length >= 5;

  function col(row, ...names) {
    for (const n of names) {
      const idx = headers.findIndex((h) => h.includes(n));
      if (idx >= 0 && row[idx] && row[idx].trim()) return row[idx].trim();
    }
    return null;
  }
  function direct(row, field) {
    const idx = headers.indexOf(field);
    if (idx >= 0 && row[idx] && row[idx].trim() && row[idx].trim() !== "None") return row[idx].trim();
    return null;
  }
  function num(v) {
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }
  function inte(v) {
    const n = parseInt(v);
    return isNaN(n) ? null : n;
  }

  const imported = [];
  for (const line of lines.slice(1)) {
    const row = parseRow(line);
    if (!row.some(Boolean)) continue;

    let p;
    if (isDirectMode) {
      const hotelName = direct(row, "hotel_name") || direct(row, "hotel");
      if (!hotelName) continue;
      p = { id: direct(row, "id") || uid(), created_at: direct(row, "created_at") || new Date().toISOString() };
      for (const f of DB_FIELDS) {
        if (f === "id" || f === "created_at") continue;
        p[f] = direct(row, f);
      }
      if (!p.hotel_name) p.hotel_name = hotelName;
      if (!p.hotel_group) p.hotel_group = direct(row, "group") || direct(row, "chain");
      if (!p.current_provider) p.current_provider = direct(row, "provider");
      if (!p.gm_name) p.gm_name = direct(row, "contact") || direct(row, "gm");
      if (!p.gm_title) p.gm_title = direct(row, "position") || direct(row, "title");
      if (!p.management_company) p.management_company = direct(row, "mgmt company") || direct(row, "management");
      if (!p.operating_model) p.operating_model = direct(row, "ownership");
      if (!p.adr_usd && !p.adr_usd) {
        const adr = num(direct(row, "adr"));
        if (adr) p.adr_usd = adr;
      }
      p.rooms = inte(p.rooms);
      p.restaurants = inte(p.restaurants);
      p.adr_usd = num(p.adr_usd);
      p.rating = num(p.rating);
      p.review_count = inte(p.review_count);
      if (!p.current_provider && p.brand) p.current_provider = inferProvider(p.brand, p.hotel_name);
      if (!p.gm_first_name && p.gm_name) p.gm_first_name = p.gm_name.split(" ")[0];
    } else {
      const hotelName = col(row, "hotel", "property", "name");
      if (!hotelName) continue;
      const brand = col(row, "brand");
      p = {
        id: uid(),
        created_at: new Date().toISOString(),
        batch: "import",
        hotel_name: hotelName,
        brand: brand || null,
        hotel_group: col(row, "group", "chain", "company") || brand || null,
        tier: col(row, "tier", "segment", "category") || "Luxury",
        city: col(row, "city", "location"),
        country: col(row, "country"),
        address: col(row, "address"),
        website: col(row, "website", "url", "web"),
        rooms: inte(col(row, "room", "rooms")),
        restaurants: inte(col(row, "f&b", "restaurant")),
        adr_usd: num(col(row, "adr", "rate", "price")),
        rating: num(col(row, "rating", "score")),
        review_count: inte(col(row, "review")),
        gm_name: col(row, "gm", "general manager", "contact"),
        gm_first_name: null,
        gm_title: col(row, "title", "position") || "General Manager",
        email: col(row, "email", "mail"),
        linkedin: col(row, "linkedin"),
        current_provider: col(row, "provider", "platform", "tech") || inferProvider(brand, hotelName),
        engagement_strategy: col(row, "strategy", "engagement") || "DIRECT-TO-GM",
        sdr: col(row, "sdr", "owner", "assigned") || sdrName || "Unknown",
        outreach_email_subject: null,
        outreach_email_body: null,
        linkedin_dm: null,
        research_notes: null,
        contact_confidence: "L",
      };
      if (p.gm_name) p.gm_first_name = p.gm_name.split(" ")[0];
    }

    function firstVal(v) {
      if (!v) return v;
      const s = String(v);
      const parts = s
        .split(/[,;\n]|(?:\s\/\s)/)
        .map((x) => x.trim())
        .filter(Boolean);
      return parts[0] || v;
    }
    function firstEmail(v) {
      if (!v) return v;
      const s = String(v);
      const emails = s.match(/[^\s,;]+@[^\s,;]+/g);
      return emails ? emails[0] : null;
    }
    if (p.gm_name && /[,;\n]/.test(p.gm_name)) p.gm_name = firstVal(p.gm_name);
    if (p.email) p.email = firstEmail(p.email);
    if (p.phone && /[,;\n]/.test(String(p.phone))) p.phone = firstVal(String(p.phone));
    if (p.gm_name) p.gm_first_name = p.gm_name.split(" ")[0];

    imported.push(p);
  }

  if (!imported.length) {
    const debugHeaders = headers.join(" | ");
    const debugRow1 = lines[1] ? parseRow(lines[1]).join(" | ") : "(no data)";
    const debugMatched = headers.findIndex((h) => h.includes("hotel"));
    console.error("[Import Debug]", { headers, debugRow1, isDirectMode, hotelColIndex: debugMatched, lineCount: lines.length });
    alert(
      `No valid rows found.\n\nDebug info:\n- Lines: ${lines.length}\n- Mode: ${isDirectMode ? "Direct" : "Flexible"}\n- Headers: ${debugHeaders.slice(0, 200)}\n- "hotel" col index: ${debugMatched}\n- Row 1 sample: ${debugRow1.slice(0, 150)}`
    );
    return;
  }
  if (!confirm(`Import ${imported.length} hotels? (Mode: ${isDirectMode ? "Direct field match" : "Flexible mapping"})`)) return;

  try {
    const CHUNK = 500;
    const toSave = imported.map((p) => ({ ...p, verified: p.verified ?? false }));
    for (let i = 0; i < toSave.length; i += CHUNK) {
      await sbFetch("/prospects", { method: "POST", prefer: "return=minimal", body: JSON.stringify(toSave.slice(i, i + CHUNK)) });
    }
    setProspects((prev) => [...prev, ...toSave]);
    alert(`✓ ${toSave.length} hotels imported to Hotel list. Verify each hotel to add to Pipeline.`);
  } catch (err) {
    alert("Import failed: " + err.message);
  }
}
