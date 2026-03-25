import { CLIENT_PROVIDER_MAP, BRAND_KEYWORDS } from "../data/hotelMaps.js";

export function inferProvider(brand, hotelName) {
  const s = ((brand || "") + " " + (hotelName || "")).toLowerCase();
  for (const [k, v] of Object.entries(CLIENT_PROVIDER_MAP)) {
    if (s.includes(k)) return v;
  }
  return null;
}

export function normalizeProvider(raw) {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s.includes("medallia")) return "Medallia";
  if (s.includes("qualtrics")) return "Qualtrics";
  if (s.includes("reviewpro") || s.includes("review pro")) return "ReviewPro";
  if (s.includes("trustyou") || s.includes("trust you")) return "TrustYou";
  if (s.includes("revinate")) return "Revinate";
  if (s.includes("guestfeedback") || s.includes("guest feedback")) return "Guestfeedback";
  if (s.includes("reputation.com") || s.includes("reputation com")) return "Reputation.com";
  if (s.includes("olery")) return "Olery";
  return raw.split(/[-–—·,]/)[0].trim();
}

export function getProvider(p) {
  return inferProvider(p.brand, p.hotel_name) || normalizeProvider(p.current_provider) || null;
}

export function normalizeGroup(g) {
  if (!g) return null;
  const s = g.toLowerCase();
  if (s.includes("marriott")) return "Marriott";
  if (s.includes("ihg") || s.includes("intercontinental hotels group") || s.includes("intercontinental hotel group")) return "IHG";
  if (s.includes("hilton")) return "Hilton";
  if (s.includes("hyatt")) return "Hyatt";
  if (s.includes("accor") || s.includes("ennismore") || s.includes("mgallery")) return "Accor";
  if (s.includes("radisson")) return "Radisson";
  if (s.includes("rosewood")) return "Rosewood";
  if (s.includes("wyndham")) return "Wyndham";
  if (s.includes("shangri")) return "Shangri-La";
  if (s.includes("peninsula")) return "Peninsula";
  if (s.includes("mandarin oriental")) return "Mandarin Oriental";
  if (s.includes("four seasons")) return "Four Seasons";
  if (s.includes("banyan tree")) return "Banyan Tree";
  if (s.includes("minor")) return "Minor";
  if (s.includes("onyx")) return "Onyx";
  if (s.includes("kempinski")) return "Kempinski";
  if (s.includes("lore group")) return "Lore Group";
  if (s.includes("dorchester")) return "Dorchester";
  if (s.includes("langham")) return "Langham";
  if (s.includes("aman")) return "Aman";
  if (s.includes("como")) return "COMO";
  if (s.includes("belmond")) return "Belmond";
  if (s.includes("oetker")) return "Oetker";
  if (s.includes("jumeirah")) return "Jumeirah";
  if (s.includes("melia") || s.includes("meliá")) return "Meliá";
  if (s.includes("barcelo") || s.includes("barceló")) return "Barceló";
  if (s.includes("pestana")) return "Pestana";
  if (s.includes("iberostar")) return "Iberostar";
  return (
    g
      .replace(/\s*\b(Hotels?( & Resorts?)?|International|Worldwide|Ltd\.?|Inc\.?|plc|GmbH)\b\s*/gi, " ")
      .replace(/\s*\bS\.A\.?\b\s*/g, " ")
      .replace(/\s*\bGroup\b\s*/gi, " ")
      .trim() || g
  );
}

export function inferBrandFromName(name) {
  if (!name) return null;
  const n = name.toLowerCase();
  for (const b of BRAND_KEYWORDS) {
    if (n.includes(b.toLowerCase())) return b;
  }
  return null;
}

export function normalizeBrand(b) {
  if (!b) return null;
  const s = b.toLowerCase().replace(/\(.*?\)/g, "").trim();
  const BRAND_CANON = {
    "kimpton hotels": "Kimpton",
    "kimpton hotels and restaurants": "Kimpton",
    "kimpton hotels & restaurants": "Kimpton",
    "intercontinental hotels & resorts": "InterContinental",
    "intercontinental hotels": "InterContinental",
    "intercontinental hotels and resorts": "InterContinental",
    "the luxury collection": "Luxury Collection",
    "luxury collection": "Luxury Collection",
    "holiday inn hotels": "Holiday Inn",
    "holiday inn hotels & resorts": "Holiday Inn",
    "holiday inn express hotels": "Holiday Inn Express",
    "crowne plaza hotels": "Crowne Plaza",
    "crowne plaza hotels & resorts": "Crowne Plaza",
    "hotel indigo hotels": "Hotel Indigo",
    "waldorf astoria hotels": "Waldorf Astoria",
    "waldorf astoria hotels & resorts": "Waldorf Astoria",
    "conrad hotels": "Conrad",
    "conrad hotels & resorts": "Conrad",
    "doubletree by hilton": "DoubleTree",
    "double tree": "DoubleTree",
    "embassy suites by hilton": "Embassy Suites",
    "hampton by hilton": "Hampton",
    "hampton inn": "Hampton",
    "hampton inn & suites": "Hampton",
    "homewood suites": "Homewood",
    "homewood suites by hilton": "Homewood",
    "tru by hilton": "Tru",
    "park hyatt hotels": "Park Hyatt",
    "grand hyatt hotels": "Grand Hyatt",
    "hyatt regency hotels": "Hyatt Regency",
    "fairmont hotels": "Fairmont",
    "fairmont hotels & resorts": "Fairmont",
    "raffles hotels": "Raffles",
    "raffles hotels & resorts": "Raffles",
    "sofitel hotels": "Sofitel",
    "sofitel hotels & resorts": "Sofitel",
    "pullman hotels": "Pullman",
    "pullman hotels & resorts": "Pullman",
    "mgallery hotel collection": "MGallery",
    mgallery: "MGallery",
    swissotel: "Swissôtel",
    "swissotel hotels": "Swissôtel",
    movenpick: "Mövenpick",
    "movenpick hotels": "Mövenpick",
    "mövenpick hotels": "Mövenpick",
    "mandarin oriental hotel group": "Mandarin Oriental",
    "shangri-la hotels": "Shangri-La",
    "shangri-la hotels & resorts": "Shangri-La",
    "shangri la": "Shangri-La",
    "four seasons hotels": "Four Seasons",
    "four seasons hotels and resorts": "Four Seasons",
    "aman resorts": "Aman",
    "design hotels": "Design Hotels",
    "sacher hotels": "Sacher",
    sacher: "Sacher",
    "corinthia hotels": "Corinthia",
    corinthia: "Corinthia",
    "ax hotels": "AX Hotels",
    independ: "Independent",
    independent: "Independent",
    jdv: "JdV by Hyatt",
    "jdv by hyatt": "JdV by Hyatt",
  };
  const key = s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (BRAND_CANON[key]) return BRAND_CANON[key];
  return (
    b
      .replace(/\(.*?\)/g, "")
      .replace(/\s*(Hotels?( & Resorts?)?|International|Worldwide)\s*$/gi, "")
      .trim() || b
  );
}
