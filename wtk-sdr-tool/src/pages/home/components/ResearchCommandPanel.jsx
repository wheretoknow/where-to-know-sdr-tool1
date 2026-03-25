import { useState, useRef } from "react";
import { GEO } from "../../../data/geo.js";
import { CHAIN_BRANDS } from "../../../data/hotelMaps.js";
import { sbFetch } from "../../../api/supabase.js";
import { uid } from "../../../utils/uid.js";
import { parseJSON } from "../../../utils/jsonUtils.js";
import { fmtDateShort } from "../../../utils/dateUtils.js";

const COOLDOWN_SEC = 15;

/**
 * Geo + chain scope + Run research. Owns running/cooldown/progress UI state.
 */
export function ResearchCommandPanel({ prospects, setProspects, setTab, sdrName, saveSdrName }) {
  const [region, setRegion] = useState("Europe");
  const [country, setCountry] = useState("Austria");
  const [cityInput, setCityInput] = useState("Vienna");
  const [customMarket, setCustomMarket] = useState("");
  const [multiMode, setMultiMode] = useState(false);
  const [scope, setScope] = useState("chain");
  const [group, setGroup] = useState("");
  const [brand, setBrand] = useState("");
  const [minAdr, setMinAdr] = useState("100");
  const [minRooms, setMinRooms] = useState("40");
  const [count, setCount] = useState("5");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState("");
  const [error, setError] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const lastBatchTime = useRef(0);
  const cooldownTimer = useRef(null);

  function getMarket() {
    if (multiMode && customMarket.trim()) return customMarket.trim();
    if (cityInput.trim()) return `${cityInput.trim()}${country ? ", " + country : ""}${region ? ", " + region : ""}`;
    if (country) return `${country}${region ? ", " + region : ""}`;
    if (region) return region;
    return "Global";
  }

  function startCooldown() {
    lastBatchTime.current = Date.now();
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    setCooldown(COOLDOWN_SEC);
    cooldownTimer.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastBatchTime.current) / 1000);
      const remaining = Math.max(0, COOLDOWN_SEC - elapsed);
      setCooldown(remaining);
      if (remaining <= 0) {
        clearInterval(cooldownTimer.current);
        cooldownTimer.current = null;
      }
    }, 1000);
  }

  async function run() {
    const elapsed = Math.floor((Date.now() - lastBatchTime.current) / 1000);
    const remaining = Math.max(0, COOLDOWN_SEC - elapsed);
    if (remaining > 0 && lastBatchTime.current > 0) {
      setRunning(true);
      setError(null);
      for (let s = remaining; s > 0; s--) {
        setLog(`Cooling down — ${s}s remaining...`);
        setCooldown(s);
        await new Promise((r) => setTimeout(r, 1000));
      }
      setCooldown(0);
    }

    setRunning(true);
    setError(null);
    setProgress(5);
    const market = getMarket();
    const n = Math.min(Math.max(parseInt(count) || 5, 1), 5);

    const normKey = (name, city) =>
      `${(name || "").toLowerCase().replace(/[^a-z0-9]/g, "")}::${(city || "").toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    const existingKeys = new Set(prospects.map((p) => normKey(p.hotel_name, p.city)));

    const PROSPECT_FIELDS = [
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
      "verified",
    ];
    const sdr = sdrName || "Unknown";
    const batchLabel = `${market} · ${fmtDateShort(new Date())}`;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    async function rateLimitWait(seconds) {
      for (let s = seconds; s > 0; s--) {
        setLog(`Cooling down — ${s}s before next batch...`);
        setCooldown(s);
        await sleep(1000);
      }
      setCooldown(0);
    }

    async function apiFetch(body, attempt = 0) {
      const r = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      const isRateLimit = data?.rateLimited || (data?.error && data.error.toLowerCase().includes("rate limit"));
      const isOverloaded = data?.overloaded || (data?.error && data.error.toLowerCase().includes("overloaded"));
      if (isRateLimit) {
        if (attempt >= 1) return { ...data, rateLimited: true };
        startCooldown();
        await rateLimitWait(62);
        return apiFetch(body, attempt + 1);
      }
      if (isOverloaded) {
        if (attempt >= 1) return { ...data, overloaded: true, error: data.error || "API overloaded" };
        setLog("API overloaded — waiting 30s before retry...");
        await rateLimitWait(30);
        return apiFetch(body, attempt + 1);
      }
      return data;
    }

    try {
      setProgress(10);
      setLog("Step 1: Building hotel list from knowledge base...");

      const listData = await apiFetch({
        mode: "list",
        city: market,
        brand,
        group,
        scope,
        minAdr,
        minRooms,
        region: region || "",
        country: country || "",
      });

      if (listData?.error) {
        if (listData.rateLimited) {
          setError("Rate limit hit — wait and try again.");
          return;
        }
        if (listData.overloaded) {
          setError("API overloaded — wait 30s and try again.");
          return;
        }
        setError("List step failed: " + listData.error);
        return;
      }
      if (listData?.debug) setLog(`Backend: ${listData.debug}`);

      const allKnown = parseJSON(listData.result).filter((h) => h.hotel_name && h.hotel_name.trim());

      const regionCountries = region ? new Set(Object.keys(GEO[region] || {}).map((c) => c.toLowerCase())) : null;
      const selectedCountryLower = country ? country.toLowerCase() : null;
      const geoFiltered = allKnown.filter((h) => {
        if (!h.country) return false;
        const hCountry = (h.country || "").toLowerCase();
        if (selectedCountryLower && hCountry !== selectedCountryLower) return false;
        if (!selectedCountryLower && regionCountries && !regionCountries.has(hCountry)) return false;
        return true;
      });
      const geoDropped = allKnown.length - geoFiltered.length;
      if (geoDropped > 0) setLog(`Filtered out ${geoDropped} hotels outside ${country || region || "target region"}`);

      if (!geoFiltered.length) {
        setError("No hotels found in knowledge base. Try a different brand or market.");
        setProgress(100);
        return;
      }

      const newHotels = geoFiltered.filter((h) => !existingKeys.has(normKey(h.hotel_name, h.city)));
      const dupeCount = allKnown.length - newHotels.length;
      const toVerify = newHotels.slice(0, n);

      setLog(
        `Found ${geoFiltered.length} hotels in ${country || region || "target"} · ${dupeCount} already in DB · ${toVerify.length} to verify${geoDropped > 0 ? ` · ${geoDropped} outside region removed` : ""}`
      );
      setProgress(20);

      if (toVerify.length === 0) {
        setLog(
          `All ${geoFiltered.length} known hotels already in database. ${geoFiltered.length < 50 ? "This may not be the complete list — the model only knows hotels from its training data." : ""}`
        );
        setProgress(100);
        setTab("hotels");
        return;
      }

      const BATCH_SIZE = 5;
      const batches = [];
      for (let i = 0; i < toVerify.length; i += BATCH_SIZE) {
        batches.push(toVerify.slice(i, i + BATCH_SIZE));
      }

      let allFresh = [];
      let totalErrors = 0;
      let rateLimitHit = false;

      for (let i = 0; i < batches.length; i++) {
        const batchHotels = batches[i];
        const pct = Math.round(20 + (i / batches.length) * 70);
        setProgress(pct);
        setLog(
          `Step 2: Verifying batch ${i + 1}/${batches.length} (${batchHotels.length} hotels)${allFresh.length ? ` · ${allFresh.length} saved so far` : ""}...`
        );

        if (i > 0) {
          await rateLimitWait(15);
        }

        const data = await apiFetch({ mode: "verify", hotels: batchHotels, brand, group });

        if (data?.rateLimited || data?.overloaded) {
          rateLimitHit = true;
          startCooldown();
          setError(
            `${data.rateLimited ? "Rate limit" : "API overloaded"} after batch ${i + 1}. ${allFresh.length} hotels saved. Wait and run again.`
          );
          break;
        }

        if (data?.error) {
          totalErrors++;
          setError("Verify error: " + data.error);
          if (allFresh.length === 0 && i === 0) break;
          continue;
        }

        const raw = parseJSON(data.result);

        if (!raw.length) {
          const debugInfo = data.debug || (data.result || "").slice(0, 300);
          setLog(
            `⚠ Verify failed for batch ${i + 1} — skipping (won't save unverified data). ${debugInfo ? "Debug: " + debugInfo.slice(0, 100) : ""}`
          );
          totalErrors++;
          continue;
        }

        const hotelsToSave = raw;
        const batchFresh = [];
        for (const p of hotelsToSave) {
          if (!p.hotel_name || !p.hotel_name.trim()) continue;
          const key = normKey(p.hotel_name, p.city);
          if (existingKeys.has(key)) continue;
          batchFresh.push(p);
          existingKeys.add(key);
        }

        if (batchFresh.length > 0) {
          const enriched = batchFresh.map((p) => {
            const base = { ...p, id: uid(), created_at: new Date().toISOString(), batch: batchLabel, sdr, verified: false };
            const safe = {};
            PROSPECT_FIELDS.forEach((k) => {
              if (base[k] !== undefined) safe[k] = base[k];
            });
            return safe;
          });

          try {
            await sbFetch("/prospects", { method: "POST", prefer: "return=minimal", body: JSON.stringify(enriched) });
          } catch (e) {
            console.error("Batch save error:", e);
          }

          setProspects((prev) => [...enriched, ...prev]);
          allFresh.push(...enriched);
          startCooldown();

          setLog(
            `✓ ${allFresh.length} hotels saved to Hotel list${i < batches.length - 1 ? ` · batch ${i + 2} next...` : ""} — verify to add to Pipeline`
          );
        }
      }

      const dupeNote = dupeCount > 0 ? ` · ${dupeCount} already in DB` : "";
      const errNote = totalErrors > 0 ? ` · ${totalErrors} batch(es) failed` : "";
      const rlNote = rateLimitHit ? ` · rate limited, ${toVerify.length - allFresh.length} remaining` : "";
      if (allFresh.length > 0) {
        setLog(`Done — ${allFresh.length} new hotels saved${dupeNote}${errNote}${rlNote}`);
      } else if (!rateLimitHit) {
        setLog(`No new hotels verified${dupeNote}. Try a different market.`);
      }
      setProgress(100);
      setTab("hotels");
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
      setTimeout(() => setProgress(0), 3000);
    }
  }

  const countries = region ? Object.keys(GEO[region] || {}) : [];
  const cities = region && country ? (GEO[region] || {})[country] || [] : [];
  const chainGroups = Object.keys(CHAIN_BRANDS).sort();
  const brandOptions = group ? CHAIN_BRANDS[group] || [] : [];

  return (
    <div className="cmd-panel">
      <div className="cmd-inline">
        {!multiMode ? (
          <div className="cmd-geo">
            <select
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                setCountry("");
                setCityInput("");
              }}
              title="Region"
              className="cmd-input"
            >
              <option value="">Global</option>
              {Object.keys(GEO).map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setCityInput((GEO[region] || {})[e.target.value]?.[0] || "");
              }}
              title="Country"
              className="cmd-input"
              disabled={!region}
            >
              <option value="">All Countries</option>
              {countries.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select value={cityInput} onChange={(e) => setCityInput(e.target.value)} title="City" className="cmd-input">
              <option value="">All cities</option>
              {cities.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <button type="button" className="cmd-link" onClick={() => setMultiMode(true)}>
              custom ▾
            </button>
          </div>
        ) : (
          <div className="cmd-geo">
            <input
              value={customMarket}
              onChange={(e) => setCustomMarket(e.target.value)}
              placeholder="e.g. Europe, China + Japan"
              className="cmd-input"
              style={{ width: 200 }}
            />
            <button type="button" className="cmd-link" onClick={() => setMultiMode(false)}>
              ← picker
            </button>
          </div>
        )}
        <div className="cmd-divider" />
        <button
          type="button"
          className={`tier-btn ${scope === "chain" ? "active" : ""}`}
          onClick={() => {
            setScope("chain");
            setBrand("");
          }}
          title="Search by hotel chain/brand"
        >
          Chain
        </button>
        <button
          type="button"
          className={`tier-btn ${scope === "independent" ? "active" : ""}`}
          onClick={() => {
            setScope("independent");
            setGroup("");
            setBrand("");
          }}
          title="Independent/boutique hotels"
        >
          Independent
        </button>
        <button
          type="button"
          className={`tier-btn ${scope === "all" ? "active" : ""}`}
          onClick={() => {
            setScope("all");
            setGroup("");
            setBrand("");
          }}
          title="All hotels in market"
        >
          All
        </button>
        <div className="cmd-divider" />
        {scope === "chain" && (
          <>
            <select
              value={group}
              onChange={(e) => {
                setGroup(e.target.value);
                setBrand("");
              }}
              className="cmd-input"
              style={{ width: 120 }}
            >
              <option value="">Group</option>
              {chainGroups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            {group && brandOptions.length > 1 && (
              <select value={brand} onChange={(e) => setBrand(e.target.value)} className="cmd-input" style={{ width: 130 }}>
                <option value="">All {group} brands</option>
                {brandOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            )}
            {!group && (
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="or type brand..."
                className="cmd-input"
                style={{ width: 120 }}
              />
            )}
          </>
        )}
        {scope === "independent" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--text3)", whiteSpace: "nowrap" }}>Min ADR $</span>
            <input
              type="number"
              min="50"
              max="2000"
              step="50"
              value={minAdr}
              onChange={(e) => setMinAdr(e.target.value)}
              className="cmd-input"
              style={{ width: 60 }}
              title="Minimum ADR in USD"
            />
            <span style={{ fontSize: 11, color: "var(--text3)", whiteSpace: "nowrap" }}>Min Rooms</span>
            <input
              type="number"
              min="10"
              max="500"
              step="10"
              value={minRooms}
              onChange={(e) => setMinRooms(e.target.value)}
              className="cmd-input"
              style={{ width: 52 }}
              title="Minimum room count"
            />
          </div>
        )}
        <input
          type="number"
          min="1"
          max="5"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          className="cmd-input"
          style={{ width: 44 }}
          title="Count (max 5)"
        />
        <input
          value={sdrName}
          onChange={(e) => saveSdrName(e.target.value)}
          placeholder="Your name"
          className="cmd-input"
          style={{ width: 90 }}
        />
        <button type="button" className="run-btn" onClick={run} disabled={running}>
          {running ? (
            <>
              <div className="spinner" />
              Searching...
            </>
          ) : cooldown > 0 ? (
            `⏱ ${cooldown}s`
          ) : (
            "▶ Run"
          )}
        </button>
      </div>
      {running && (
        <div className="progress-wrap" style={{ marginTop: 8 }}>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-text">› {log}</div>
        </div>
      )}
      {!running && log && !error && <div className="success-msg" style={{ marginTop: 6 }}>✓ {log}</div>}
      {error && <div className="error-msg" style={{ marginTop: 6 }}>⚠ {error}</div>}
    </div>
  );
}
