// ─── DUPLICATE FINDER UTILITIES ─────────────────────────────────────────────

const CORPORATE_DOMAINS = new Set([
  "marriott.com","hilton.com","hyatt.com","ihg.com","accor.com","all.accor.com",
  "radissonhotels.com","wyndhamhotels.com","fourseasons.com","mandarinoriental.com",
  "rosewoodhotels.com","aman.com","kempinski.com","shangri-la.com","jumeirah.com",
  "peninsula.com","langhamhotels.com","dorchestercollection.com","belmond.com",
  "minorhotels.com","anantara.com","centarahotelsresorts.com","dusit.com",
  "bfrands.com","booking.com","expedia.com","tripadvisor.com","hotels.com",
]);

function canonicalizeUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : "https://" + url);
    return (u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/+$/, "")).toLowerCase();
  } catch { return null; }
}

function getUrlDomain(url) {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : "https://" + url);
    const h = u.hostname.replace(/^www\./, "").toLowerCase();
    // Extract registrable domain (last two parts)
    const parts = h.split(".");
    return parts.length >= 2 ? parts.slice(-2).join(".") : h;
  } catch { return null; }
}

function isHotelLevelUrl(url) {
  if (!url) return false;
  const domain = getUrlDomain(url);
  if (!domain) return false;
  if (!CORPORATE_DOMAINS.has(domain)) return true; // independent domain = hotel level
  // Corporate domain: check if path is specific enough
  try {
    const u = new URL(url.startsWith("http") ? url : "https://" + url);
    const path = u.pathname.replace(/\/+$/, "");
    // Needs at least 2 path segments to be property-specific
    const segments = path.split("/").filter(Boolean);
    return segments.length >= 2;
  } catch { return false; }
}

function normalizeAddr(addr) {
  if (!addr) return "";
  return addr.toLowerCase()
    .replace(/\bstreet\b/g, "st").replace(/\broad\b/g, "rd").replace(/\bavenue\b/g, "ave")
    .replace(/\bboulevard\b/g, "blvd").replace(/\bdrive\b/g, "dr").replace(/\blane\b/g, "ln")
    .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function dedupNormName(s) {
  return (s || "").toLowerCase()
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(hotel|resort|spa|the|a|an|at|by|and|of|in|suites?)\b/g, " ")
    .replace(/\s+/g, " ").trim();
}

function dedupJaccard(a, b) {
  const A = new Set(dedupNormName(a).split(" ").filter(Boolean));
  const B = new Set(dedupNormName(b).split(" ").filter(Boolean));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

// pair key: stable regardless of grouping changes
function buildPairKey(idA, idB) {
  const a = String(idA), b = String(idB);
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

// extract all pairs from a group
export function groupToPairs(hotels) {
  const pairs = [];
  for (let i = 0; i < hotels.length; i++)
    for (let j = i + 1; j < hotels.length; j++)
      pairs.push(buildPairKey(hotels[i].id, hotels[j].id));
  return pairs;
}

// group is dismissed only when ALL pairs have been individually ignored
// (prevents one A-B dismiss from hiding A-B-C where B-C may still be real)
export function groupIsDismissed(hotels, dismissedPairs) {
  const pairs = groupToPairs(hotels);
  return pairs.length > 0 && pairs.every(p => dismissedPairs.has(p));
}

function buildDupGroupKey(hotels) {
  return hotels.map(h => String(h.id)).sort().join("|");
}

// confidence numeric score for conflict resolution
const CONF_SCORE = { Identical: 4, High: 3, Medium: 2, Low: 1 };

export function findDuplicates(prospects) {
  // ── Build city buckets (unknown city = isolated, never cross-compared) ──
  const byCity = {};
  const noCityGroup = []; // reserved for future cross-cityless pass — intentionally not used in current logic
  for (const p of prospects) {
    const city = (p.city || "").trim().toLowerCase();
    if (!city) { noCityGroup.push(p); continue; }
    if (!byCity[city]) byCity[city] = [];
    byCity[city].push(p);
  }

  const candidates = []; // all candidate groups before conflict resolution

  function addCandidate(confidence, reason, hotels) {
    const uniq = hotels.filter(
      (h, i, arr) => arr.findIndex(x => String(x.id) === String(h.id)) === i
    );
    if (uniq.length < 2) return;
    candidates.push({
      confidence,
      reason,
      hotels: uniq,
      key: buildDupGroupKey(uniq),
      score: CONF_SCORE[confidence] || 0,
    });
  }

  // ── Pass 1: exact normalized name, same city ──
  Object.values(byCity).forEach(cityHotels => {
    const buckets = {};
    cityHotels.forEach(h => {
      const norm = dedupNormName(h.hotel_name || "");
      if (!norm) return;
      if (!buckets[norm]) buckets[norm] = [];
      buckets[norm].push(h);
    });
    Object.values(buckets).forEach(bucket => {
      if (bucket.length >= 2)
        addCandidate("Identical", "Exact same normalized hotel name in same city", bucket);
    });
  });

  // ── Pass 2: same hotel-level website ──
  const websiteBuckets = {};
  prospects.forEach(h => {
    const url = canonicalizeUrl(h.website || "");
    if (!url || !isHotelLevelUrl(url)) return;
    if (!websiteBuckets[url]) websiteBuckets[url] = [];
    websiteBuckets[url].push(h);
  });
  Object.values(websiteBuckets).forEach(bucket => {
    if (bucket.length >= 2)
      addCandidate("Identical", "Same hotel-level website", bucket);
  });

  // ── Pass 3: same normalized address, same city ──
  Object.values(byCity).forEach(cityHotels => {
    const addrBuckets = {};
    cityHotels.forEach(h => {
      const addr = normalizeAddr(h.address || "");
      if (!addr || addr.length < 8) return;
      if (!addrBuckets[addr]) addrBuckets[addr] = [];
      addrBuckets[addr].push(h);
    });
    Object.values(addrBuckets).forEach(bucket => {
      if (bucket.length >= 2)
        addCandidate("High", "Same normalized address in same city", bucket);
    });
  });

  // ── Pass 4: fuzzy name, same city — all-pairs clustering (no hub effect) ──
  Object.values(byCity).forEach(cityHotels => {
    const n = cityHotels.length;
    // Build similarity matrix
    const sim = Array.from({length: n}, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const jac = dedupJaccard(cityHotels[i].hotel_name || "", cityHotels[j].hotel_name || "");
        sim[i][j] = sim[j][i] = jac;
      }
    // Union-find for clusters where ALL pairs meet threshold
    const parent = Array.from({length: n}, (_, i) => i);
    function find(x) { return parent[x] === x ? x : (parent[x] = find(parent[x])); }
    function union(x, y) { parent[find(x)] = find(y); }
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        if (sim[i][j] >= 0.7) union(i, j);
    // Group by cluster root
    const clusterMap = {};
    for (let i = 0; i < n; i++) {
      const root = find(i);
      if (!clusterMap[root]) clusterMap[root] = [];
      clusterMap[root].push(i);
    }
    Object.values(clusterMap).forEach(idxs => {
      if (idxs.length < 2) return;
      // Validate: every pair must meet threshold (reject hub-only clusters)
      // If a pair is below 0.65, it must have a secondary signal (rooms/address/website)
      const cluster = idxs.map(i => cityHotels[i]);
      let clusterValid = true;
      for (let a = 0; a < cluster.length && clusterValid; a++) {
        for (let b = a + 1; b < cluster.length && clusterValid; b++) {
          const pairJac = dedupJaccard(cluster[a].hotel_name || "", cluster[b].hotel_name || "");
          if (pairJac < 0.65) {
            // Allow if secondary signal exists: rooms close OR same address OR same website domain
            const rA = Number(cluster[a].rooms), rB = Number(cluster[b].rooms);
            const roomsClose = rA && rB && Math.abs(rA - rB) <= 5;
            const addrMatch = cluster[a].address && cluster[b].address &&
              normalizeAddr(cluster[a].address) === normalizeAddr(cluster[b].address);
            const domA = getUrlDomain(cluster[a].website || ""), domB = getUrlDomain(cluster[b].website || "");
            const domainMatch = domA && domB && domA === domB && !CORPORATE_DOMAINS.has(domA);
            if (!roomsClose && !addrMatch && !domainMatch) { clusterValid = false; }
          }
        }
      }
      if (!clusterValid) return;
      // Confidence: High if any pair has rooms within 5 and jac >= 0.8
      let isHigh = false;
      for (let a = 0; a < cluster.length; a++)
        for (let b = a + 1; b < cluster.length; b++) {
          const rA = Number(cluster[a].rooms), rB = Number(cluster[b].rooms);
          if (sim[idxs[a]][idxs[b]] >= 0.8 && rA && rB && Math.abs(rA - rB) <= 5) isHigh = true;
        }
      addCandidate(
        isHigh ? "High" : "Medium",
        isHigh ? "Very similar name + matching room count" : "Similar hotel name in same city",
        cluster
      );
    });
  });

  // ── Pass 5: cross-city — require strong secondary signal ──
  const allProspects = prospects.filter(p => (p.city || "").trim());
  for (let i = 0; i < allProspects.length; i++) {
    const a = allProspects[i];
    for (let j = i + 1; j < allProspects.length; j++) {
      const b = allProspects[j];
      if ((a.city || "").trim().toLowerCase() === (b.city || "").trim().toLowerCase()) continue;
      const jac = dedupJaccard(a.hotel_name || "", b.hotel_name || "");
      if (jac < 0.85) continue;
      // Must have at least one strong secondary signal
      const rA = Number(a.rooms), rB = Number(b.rooms);
      const roomsClose = rA && rB && Math.abs(rA - rB) <= 5;
      const domA = getUrlDomain(a.website || ""), domB = getUrlDomain(b.website || "");
      const sameIndepDomain = domA && domB && domA === domB && !CORPORATE_DOMAINS.has(domA);
      // bothHaveNoGroup: weak signal only (missing data, not evidence of duplication)
      // intentionally excluded from allow condition — data absence ≠ duplicate evidence
      const bothHaveNoGroup = !a.hotel_group && !b.hotel_group; // kept for future scoring use
      if (!roomsClose && !sameIndepDomain) continue;
      addCandidate("Low", "Very similar name across cities" + (sameIndepDomain ? " + same website domain" : roomsClose ? " + matching room count" : ""), [a, b]);
    }
  }

  // ── Conflict resolution: greedy select strongest non-overlapping groups ──
  // Sort by score desc, then size desc
  candidates.sort((a, b) =>
    b.score !== a.score ? b.score - a.score : b.hotels.length - a.hotels.length
  );

  const usedIds = new Set();
  const selected = [];
  for (const g of candidates) {
    if (g.hotels.some(h => usedIds.has(String(h.id)))) continue;
    selected.push(g);
    g.hotels.forEach(h => usedIds.add(String(h.id)));
  }

  const order = { Identical: 0, High: 1, Medium: 2, Low: 3 };
  return selected.sort((a, b) => order[a.confidence] - order[b.confidence]);
}
