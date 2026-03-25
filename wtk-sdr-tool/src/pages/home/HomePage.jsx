import { useState, useEffect, useRef, useCallback } from "react";
import "../../assets/styles/app.css";
import { sbFetch } from "../../api/supabase.js";
import { uid } from "../../utils/uid.js";
import { normalizeSearch } from "../../utils/strings.js";
import { getProvider, normalizeGroup, normalizeBrand } from "../../utils/hotelNormalize.js";
import { findDuplicates, groupIsDismissed, groupToPairs } from "../../utils/duplicateFinder.js";
import { parseDone } from "../../utils/pipelineTouch.js";
import { calcLeadScore } from "../../utils/leadScore.js";
import { DashboardTab } from "./components/DashboardTab.jsx";
import { HotelsTab } from "./components/HotelsTab.jsx";
import { PipelineTab } from "./components/PipelineTab.jsx";
import { ContactTrackerTab } from "./components/ContactTrackerTab.jsx";
import { DeleteHotelConfirm } from "./components/DeleteHotelConfirm.jsx";
import { DuplicateFinderModal } from "./components/DuplicateFinderModal.jsx";
import { RejectLostModal } from "./components/RejectLostModal.jsx";
import { HotelDetailDrawer } from "./components/HotelDetailDrawer.jsx";
import { Toast } from "./components/Toast.jsx";
import { ResearchCommandPanel } from "./components/ResearchCommandPanel.jsx";
import { AddHotelToolbarControl } from "./components/AddHotelToolbarControl.jsx";
import { exportProspectsCsv, importProspectsFromFile } from "./utils/prospectCsv.js";
import { useRejectLost } from "./hooks/useRejectLost.js";

export default function HomePage() {
  const [tab, setTab] = useState("dashboard");
  const [addHotelModalOpen, setAddHotelModalOpen] = useState(false);
  const addHotelRef = useRef(null);
  const [ctExpanded, setCtExpanded] = useState(null);
  const [ctStageFilter, setCtStageFilter] = useState("");
  const [ctPriorityFilter, setCtPriorityFilter] = useState("");
  const [leadStatusFilter, setLeadStatusFilter] = useState(["Active"]);
  const [filterGrade, setFilterGrade] = useState([]);
  const [sdrName, setSdrName] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState(null);
  const [filterSdr, setFilterSdr] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [hotelsPage, setHotelsPage] = useState(1);
  const HOTELS_PER_PAGE = 20;
  const [prospects, setProspects] = useState([]);
  const [tracking, setTracking] = useState([]);
  const [outreachView, setOutreachView] = useState("card");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [dupGroups, setDupGroups] = useState(null);
  const [dupExpanded, setDupExpanded] = useState(new Set());
  // pair-level ignore: each entry is "minId|maxId"
  const [dismissedDupPairs, setDismissedDupPairs] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("wtk_dismissed_dup_pairs") || "[]"));
    } catch {
      return new Set();
    }
  });
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [filterProvider, setFilterProvider] = useState("");
  const [filterHasEmail, setFilterHasEmail] = useState(false);
  const [filterHasGM, setFilterHasGM] = useState(false);
  const [filterVerified, setFilterVerified] = useState(""); // "" | "yes" | "no"
  // Outreach tracker filters
  const [outreachSearch, setOutreachSearch] = useState("");
  const [outreachCountry, setOutreachCountry] = useState("");
  const [outreachCity, setOutreachCity] = useState("");
  const [outreachGroup, setOutreachGroup] = useState("");
  const [outreachTier, setOutreachTier] = useState("");
  const [outreachProvider, setOutreachProvider] = useState("");
  const [pipeStageFilter, setPipeStageFilter] = useState("");
  const [pipeHasGM, setPipeHasGM] = useState(false);
  const [pipeHasEmail, setPipeHasEmail] = useState(false);
  const [ctOwnerFilter, setCtOwnerFilter] = useState("");
  const [ctDueFilter, setCtDueFilter] = useState("");
  const [ctPriFilter, setCtPriFilter] = useState("");
  const [ctSortCol, setCtSortCol] = useState(null);
  const [ctSortDir, setCtSortDir] = useState("asc");
  const [ctPage, setCtPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set()); // batch select
  const [ctFocusMode, setCtFocusMode] = useState(true); // focus mode default on
  const [focusDoneIds, setFocusDoneIds] = useState(new Set()); // temporarily dismissed in focus
  const [sortCol, setSortCol] = useState("score"); // "adr" | "rooms" | "score" | null
  const [sortDir, setSortDir] = useState("desc"); // "asc" | "desc"
  const [addContactDraft, setAddContactDraft] = useState({name:"",title:"",email:"",linkedin:"",phone:"",is_primary:false});
  // Multi-contact state: { [prospect_id]: [{id, name, title, email, linkedin, phone, is_primary}] }
  const [contacts, setContacts] = useState({});
  const [addContactForm, setAddContactForm] = useState(null); // prospect_id or null
  const [toast, setToast] = useState(null);

  const updatePipeline = useCallback(async (tid, updates, e) => {
    if (e) e.stopPropagation();
    setTracking((prev) => prev.map((x) => (x.id === tid ? { ...x, ...updates } : x)));
    try {
      await sbFetch(`/tracking?id=eq.${tid}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify(updates) });
    } catch (e) {
      console.error(e);
    }
  }, []);

  const {
    rejectModal,
    rejectReason,
    setRejectReason,
    rejectOtherText,
    setRejectOtherText,
    openRejectModal,
    confirmReject,
    closeRejectModal,
  } = useRejectLost(updatePipeline);

  function toggleSort(col) {
    if (sortCol === col) { setSortDir(d => d === "asc" ? "desc" : "asc"); }
    else { setSortCol(col); setSortDir("desc"); }
    setHotelsPage(1);
  }

  async function deleteProspect(pid) {
    try {
      await sbFetch(`/tracking?prospect_id=eq.${pid}`, { method: "DELETE", prefer: "return=minimal" });
      await sbFetch(`/prospects?id=eq.${pid}`, { method: "DELETE", prefer: "return=minimal" });
      setProspects(prev => prev.filter(p => p.id !== pid));
      setTracking(prev => prev.filter(t => t.prospect_id !== pid));
      if (selected === pid) setSelected(null);
    } catch(e) { alert("Delete failed: " + e.message); }
    setDeleteConfirm(null);
  }

  async function saveNote(tid) {
    try {
      await sbFetch(`/tracking?id=eq.${tid}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ sales_notes: noteText }) });
      setTracking(prev => prev.map(t => t.id === tid ? { ...t, sales_notes: noteText } : t));
    } catch(e) { console.error(e); }
    setEditingNote(null);
  }

  // ── Inline editing for prospect fields ──────────────────────────────
  async function updateProspectField(pid, field, value) {
    // Sanitize email values
    if (field === 'email' && value) {
      if (value.includes('[email') || value.includes('email protected') || value.includes('email\u00a0protected')) {
        value = null;
      }
    }
    // Coerce numeric fields
    if (['rooms', 'restaurants', 'review_count'].includes(field)) {
      value = value ? parseInt(value) || null : null;
    }
    if (['adr_usd', 'rating'].includes(field)) {
      value = value ? parseFloat(value) || null : null;
    }
    const patch = { [field]: value || null };
    // If updating gm_name, auto-update gm_first_name
    if (field === 'gm_name' && value) {
      patch.gm_first_name = value.split(' ')[0];
    }
    // Also sync tracking table if updating gm or email
    if (field === 'gm_name' || field === 'email') {
      const t = tracking.find(x => x.prospect_id === pid);
      if (t) {
        const tPatch = field === 'gm_name' ? { gm: value } : { email: value };
        setTracking(prev => prev.map(x => x.prospect_id === pid ? { ...x, ...tPatch } : x));
        try { await sbFetch(`/tracking?prospect_id=eq.${pid}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify(tPatch) }); } catch(e) { console.error(e); }
      }
    }
    setProspects(prev => prev.map(p => p.id === pid ? { ...p, ...patch } : p));
    try { await sbFetch(`/prospects?id=eq.${pid}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify(patch) }); } catch(e) { console.error(e); }
  }

  // ── Multi-contact helpers ────────────────────────────────────────────────────
  // Contacts stored in prospects.research_notes as JSON block at top, prefixed with <!--contacts:
  function parseContacts(pid) {
    if (contacts[pid]) return contacts[pid];
    const p = prospects.find(x => x.id === pid);
    if (!p) return [];
    const match = (p.research_notes || "").match(/<!--contacts:(.*?)-->/s);
    if (match) { try { return JSON.parse(match[1]); } catch { return []; } }
    // Bootstrap from existing primary contact fields
    if (p.gm_name || p.email) {
      return [{ id: uid(), name: p.gm_name || "", title: p.gm_title || "General Manager", email: p.email || "", linkedin: p.linkedin || "", phone: "", is_primary: true }];
    }
    return [];
  }

  function serializeContacts(list) {
    return `<!--contacts:${JSON.stringify(list)}-->`;
  }

  async function saveContacts(pid, list) {
    setContacts(prev => ({ ...prev, [pid]: list }));
    const p = prospects.find(x => x.id === pid);
    const existingNotes = (p?.research_notes || "").replace(/<!--contacts:.*?-->/s, "").trim();
    const newNotes = serializeContacts(list) + (existingNotes ? "\n" + existingNotes : "");
    // Sync primary contact back to main fields
    const primary = list.find(c => c.is_primary) || list[0];
    const patch = { research_notes: newNotes };
    if (primary) {
      patch.gm_name = primary.name || null;
      patch.gm_first_name = primary.name ? primary.name.split(" ")[0] : null;
      patch.gm_title = primary.title || null;
      patch.email = primary.email || null;
      patch.linkedin = primary.linkedin || null;
    }
    setProspects(prev => prev.map(x => x.id === pid ? { ...x, ...patch } : x));
    try { await sbFetch(`/prospects?id=eq.${pid}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify(patch) }); } catch(e) { console.error(e); }
    // Sync tracking primary
    if (primary) {
      const tPatch = { gm: primary.name || null, email: primary.email || null };
      setTracking(prev => prev.map(x => x.prospect_id === pid ? { ...x, ...tPatch } : x));
      try { await sbFetch(`/tracking?prospect_id=eq.${pid}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify(tPatch) }); } catch(e) { console.error(e); }
    }
  }

  useEffect(() => {
    const n = localStorage.getItem("wtk_sdr_name"); if (n) setSdrName(n);
    loadData();
  }, []);
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key !== "Escape") return;
      if (addHotelModalOpen) {
        addHotelRef.current?.requestClose();
        return;
      }
      if (selected && !rejectModal) {
        setSelected(null);
        return;
      }
      if (dupGroups !== null) {
        setDupGroups(null);
        return;
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [addHotelModalOpen, selected, rejectModal, dupGroups]);

  async function loadData() {
    setLoading(true);
    try {
      // Load all records in parallel pages (Supabase max 1000/request)
      async function loadAll(path) {
        const all = [];
        let offset = 0;
        const PAGE = 1000;
        while (true) {
          const page = await sbFetch(`${path}&limit=${PAGE}&offset=${offset}`);
          if (!page || !page.length) break;
          all.push(...page);
          if (page.length < PAGE) break;
          offset += PAGE;
        }
        return all;
      }
      const [p, t] = await Promise.all([
        loadAll("/prospects?order=created_at.desc"),
        loadAll("/tracking?order=created_at.desc")
      ]);
      const prospects = p || [], trackingData = t || [];
      setProspects(prospects); setTracking(trackingData);

      // ── Auto-verify migration ──────────────────────────────────────────────
      // Prospects that already have real outreach (stage beyond "new") are
      // implicitly verified — someone already contacted them. Mark them verified
      // so they remain visible in Pipeline. Runs once on load, skips already-verified.
      const CONTACTED_STAGES = new Set(["1st","2nd","3rd","4th","replied","bounced","demo","trial","won","lost","emailed","followup"]);
      const contactedPids = new Set(
        trackingData
          .filter(t => CONTACTED_STAGES.has(t.pipeline_stage))
          .map(t => t.prospect_id)
      );
      const toAutoVerify = prospects.filter(p => !p.verified && contactedPids.has(p.id));
      if (toAutoVerify.length > 0) {
        const ids = toAutoVerify.map(p => p.id);
        // Patch in DB (fire-and-forget, non-blocking)
        sbFetch(`/prospects?id=in.(${ids.join(",")})`, {
          method: "PATCH", prefer: "return=minimal",
          body: JSON.stringify({ verified: true })
        }).catch(e => console.error("Auto-verify migration failed:", e));
        // Update local state immediately so UI reflects it right away
        setProspects(prev => prev.map(p => ids.includes(p.id) ? { ...p, verified: true } : p));
        console.log(`[WTK] Auto-verified ${toAutoVerify.length} prospects with existing outreach.`);
      }
      // ─────────────────────────────────────────────────────────────────────
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function saveSdrName(v) {
    setSdrName(v);
    localStorage.setItem("wtk_sdr_name", v);
  }

  async function touchToggle(tid, n, e) {
    if (e) e.stopPropagation();
    const t = tracking.find(x => x.id === tid); if (!t) return;
    const stage = t.pipeline_stage || "active";
    if (stage === "dead" || stage === "won") return;
    // Lock: can't click n if n-1 not done
    const done = [...parseDone(t.done)];
    if (n > 1 && !done.includes(n - 1)) return;
    const i = done.indexOf(n);
    if (i < 0) done.push(n); else done.splice(i, 1);
    done.sort((a, b) => a - b);
    const upd = { done };
    if (n === 1 && i < 0 && !t.d1) upd.d1 = new Date().toISOString();
    if (n === 2 && i < 0) upd.d2 = new Date().toISOString();
    if (n === 3 && i < 0) upd.d3 = new Date().toISOString();
    if (n === 4 && i < 0) upd.d4 = new Date().toISOString();
    setTracking(prev => prev.map(x => x.id === tid ? { ...x, ...upd } : x));
    try { await sbFetch(`/tracking?id=eq.${tid}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify(upd) }); } catch (e) { console.error(e); }
  }

  async function updateProspect(pid, updates) {
    setProspects(prev => prev.map(p => p.id === pid ? { ...p, ...updates } : p));
    try { await sbFetch(`/prospects?id=eq.${pid}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify(updates) }); } catch (e) { console.error("updateProspect:", e); }
  }

  // Verify a prospect and ensure it has a tracking row so it appears in Pipeline.
  async function verifyAndAddToPipeline(pid) {
    const p = prospects.find(x => x.id === pid);
    if (!p) return;

    // Optimistic update
    setProspects(prev => prev.map(x => x.id === pid ? { ...x, verified: true } : x));

    try {
      await sbFetch(`/prospects?id=eq.${pid}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ verified: true }) });
    } catch (e) {
      // Rollback on failure
      setProspects(prev => prev.map(x => x.id === pid ? { ...x, verified: false } : x));
      console.error("verifyAndAddToPipeline: prospect patch failed", e);
      alert(`Failed to verify "${p.hotel_name}". Please try again.`);
      return;
    }

    // If no tracking row exists yet, create one so the hotel enters the Pipeline "Verified" column
    const hasTracking = tracking.some(t => t.prospect_id === pid);
    if (!hasTracking) {
      const newRow = { id: uid(), prospect_id: pid, hotel: p.hotel_name, gm: p.gm_name || null, sdr: sdrName || "Unknown", pipeline_stage: "new", done: [], intention: 0, created_at: new Date().toISOString() };
      // Optimistic update
      setTracking(prev => [...prev, newRow]);
      try {
        await sbFetch("/tracking", { method: "POST", prefer: "return=minimal", body: JSON.stringify(newRow) });
      } catch (e) {
        // Rollback tracking row on failure (verified stays true — prospect was patched successfully)
        setTracking(prev => prev.filter(t => t.id !== newRow.id));
        console.error("verifyAndAddToPipeline: tracking insert failed", e);
        alert(`"${p.hotel_name}" was verified but couldn't be added to Pipeline. Please refresh and try again.`);
      }
    }
  }

  async function reopenSequence(tid, e) {
    if (e) e.stopPropagation();
    const upd = { pipeline_stage: "new", rejection_reason: null };
    setTracking(prev => prev.map(x => x.id === tid ? { ...x, ...upd } : x));
    try { await sbFetch(`/tracking?id=eq.${tid}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify(upd) }); } catch (e) { console.error(e); }
  }

  async function updateIntention(tid, val) {
    const t = tracking.find(x => x.id === tid);
    // Toggle off if clicking same value
    const newVal = (t?.intention || 0) === val ? 0 : val;
    setTracking(prev => prev.map(x => x.id === tid ? { ...x, intention: newVal } : x));
    try { await sbFetch(`/tracking?id=eq.${tid}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ intention: newVal }) }); } catch (e) { console.error(e); }
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function copy(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const sel = selected ? prospects.find(p => p.id === selected) : null;
  const sdrs = ["all", ...new Set(prospects.map(p => p.sdr).filter(Boolean))];
  const filteredP = prospects.filter(p => {
    if (leadStatusFilter.length > 0 && !leadStatusFilter.includes(p.lead_status || "Active")) return false;
    if (filterSdr !== "all" && p.sdr !== filterSdr) return false;
    if (filterCountry === "__blank__" ? !!(p.country||"").trim() : filterCountry && (p.country||"") !== filterCountry) return false;
    if (filterCity === "__blank__" ? !!(p.city||"").trim() : filterCity && (p.city||"") !== filterCity) return false;
    if (filterGroup === "__blank__" ? !!(normalizeGroup(p.hotel_group||p.brand||"")) : filterGroup && normalizeGroup(p.hotel_group||p.brand||"") !== filterGroup) return false;
    if (filterBrand === "__blank__" ? !!(normalizeBrand(p.brand)) : filterBrand && normalizeBrand(p.brand) !== filterBrand) return false;
    if (filterProvider) {
      const prov = getProvider(p) || "Unknown";
      if (prov !== filterProvider) return false;
    }
    if (filterGrade.length > 0 && !filterGrade.includes(calcLeadScore(p).grade)) return false;
    if (filterHasEmail && !p.email) return false;
    if (filterHasGM && !p.gm_name) return false;
    if (filterVerified === "yes" && !p.verified) return false;
    if (filterVerified === "no" && p.verified) return false;
    if (filterSearch) {
      const q = normalizeSearch(filterSearch);
      if (!normalizeSearch(p.hotel_name).includes(q) && !normalizeSearch(p.gm_name).includes(q) && !normalizeSearch(p.city).includes(q)) return false;
    }
    return true;
  });
  // Sort if active — nulls always at bottom
  const sortedP = sortCol ? [...filteredP].sort((a, b) => {
    const va = sortCol === "adr" ? (a.adr_usd||null) : sortCol === "rooms" ? (a.rooms||null) : sortCol === "score" ? calcLeadScore(a).total : null;
    const vb = sortCol === "adr" ? (b.adr_usd||null) : sortCol === "rooms" ? (b.rooms||null) : sortCol === "score" ? calcLeadScore(b).total : null;
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    return sortDir === "asc" ? va - vb : vb - va;
  }) : filteredP;
  // validTracking: only tracking rows whose prospect still exists in the prospects array.
  // This is the single source of truth for all counts (Pipeline, Contact Tracker, Dashboard).
  // When a prospect is deleted, its tracking row may linger in Supabase until next full reload;
  // filtering here keeps all three views consistent without requiring an immediate DB cleanup.
  const validProspectIds = new Set(prospects.map(p => p.id));
  const validTracking = tracking.filter(t => validProspectIds.has(t.prospect_id));

  const filteredT = validTracking.filter(t => {
    if (filterSdr !== "all" && t.sdr !== filterSdr) return false;
    const p = prospects.find(x => x.id === t.prospect_id);
    // Pipeline gate: only verified prospects are shown. Prospects that have been
    // contacted (stage >= "1st") are auto-verified on load; unverified prospects
    // with pipeline_stage="new" sit in the Hotel list only until manually verified.
    if (!p?.verified) return false;
    if (leadStatusFilter.length > 0 && !leadStatusFilter.includes(p?.lead_status || "Active")) return false;
    if (outreachSearch) {
      const q = normalizeSearch(outreachSearch);
      if (!normalizeSearch(t.hotel).includes(q) && !normalizeSearch(t.gm).includes(q)) return false;
    }
    if (outreachCountry && (p?.country||"") !== outreachCountry) return false;
    if (outreachCity && (p?.city||"") !== outreachCity) return false;
    if (outreachGroup && normalizeGroup(p?.hotel_group||p?.brand||"") !== outreachGroup) return false;
    if (outreachTier && p?.brand !== outreachTier) return false;
    if (outreachProvider) {
      const prov = p ? (getProvider(p) || "Unknown") : "Unknown";
      if (prov !== outreachProvider) return false;
    }
    if (pipeHasGM && !t.gm) return false;
    if (pipeHasEmail && !t.email) return false;
    if (filterGrade.length > 0 && p && !filterGrade.includes(calcLeadScore(p).grade)) return false;
    return true;
  });
  const totalHotelPages = Math.ceil(sortedP.length / HOTELS_PER_PAGE);
  const pagedP = sortedP.slice((hotelsPage-1)*HOTELS_PER_PAGE, hotelsPage*HOTELS_PER_PAGE);
  const allCountries = [...new Set(prospects.map(p=>p.country).filter(Boolean))].sort();
  const allCities = filterCountry ? [...new Set(prospects.filter(p=>p.country===filterCountry).map(p=>p.city).filter(Boolean))].sort() : [...new Set(prospects.map(p=>p.city).filter(Boolean))].sort();
  const allGroups = [...new Set(prospects.map(p=>normalizeGroup(p.hotel_group||p.brand)).filter(Boolean))].sort();
  const allBrands = [...new Set(prospects.map(p=>normalizeBrand(p.brand)).filter(Boolean))].sort();
  const allProviders = [...new Set(prospects.map(p=>getProvider(p)||"Unknown"))].sort();

  return (
    <>
      <div className="app">
        <nav className="topnav">
          <div className="nav-left">
            <div className="wtk-icon">W</div>
            <span className="nav-brand">Where to know</span>
            <div className="nav-sep"/>
            <span className="nav-page">SDR Intelligence</span>
          </div>
          <div className="nav-stats">
            <div className="nav-stat"><span className="nav-stat-n">{filteredP.length}</span><span className="nav-stat-l">{filterSdr !== "all" ? filterSdr : "Prospects"}</span></div>
            <div className="nav-stat"><span className="nav-stat-n">{filteredP.filter(p=>p.email).length}</span><span className="nav-stat-l">Emails</span></div>
            <div className="nav-stat"><span className="nav-stat-n">{validTracking.filter(t=>(t.done||[]).length>0 && (filterSdr==="all"||t.sdr===filterSdr)).length}</span><span className="nav-stat-l">Contacted</span></div>
          </div>
        </nav>

        <div className="main">
          <ResearchCommandPanel
            prospects={prospects}
            setProspects={setProspects}
            setTab={setTab}
            sdrName={sdrName}
            saveSdrName={saveSdrName}
          />

          <div className="toolbar">
            {sdrs.length > 1 && sdrs.map(s=><button key={s} className={`filter-pill ${filterSdr===s?"active":""}`} onClick={()=>{setFilterSdr(s);setHotelsPage(1);}}>{s==="all"?"All SDRs":s}</button>)}
            <span style={{width:1,height:24,background:"var(--border)",margin:"0 4px",flexShrink:0}}/>
            {["Active","Dormant","Closed"].map(ls=><button key={ls} className={`filter-pill ${leadStatusFilter.includes(ls)?"active":""}`} onClick={()=>setLeadStatusFilter(prev=>prev.includes(ls)?prev.filter(x=>x!==ls):[...prev,ls])} style={{borderColor:({Active:"var(--green)",Dormant:"#d97706",Closed:"var(--text3)"})[ls]}}>{ls}</button>)}
            <span style={{width:1,height:24,background:"var(--border)",margin:"0 4px",flexShrink:0}}/>
            {["A","B","C"].map(g=><button key={g} className={`filter-pill ${filterGrade.includes(g)?"active":""}`} onClick={()=>{setFilterGrade(prev=>prev.includes(g)?prev.filter(x=>x!==g):[...prev,g]);setHotelsPage(1);}} style={{borderColor:{A:"#1d4ed8",B:"#475569",C:"#94a3b8"}[g],color:filterGrade.includes(g)?undefined:{A:"#1d4ed8",B:"#475569",C:"#94a3b8"}[g]}}>{g}</button>)}
            <span style={{width:1,height:24,background:"var(--border)",margin:"0 4px",flexShrink:0}}/>
            <AddHotelToolbarControl
              ref={addHotelRef}
              sdrName={sdrName}
              setProspects={setProspects}
              setTracking={setTracking}
              onToast={showToast}
              onOpenChange={setAddHotelModalOpen}
            />
            {filteredP.length > 0 && (
              <button type="button" className="export-btn" onClick={() => exportProspectsCsv(filteredP)}>
                ↓ Export CSV
              </button>
            )}
            <label className="export-btn" style={{ cursor: "pointer" }} title="Import hotels from CSV/Excel (exported from this tool or mapped manually)">
              ↑ Import CSV
              <input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importProspectsFromFile(file, { setProspects, sdrName });
                  e.target.value = "";
                }}
              />
            </label>
            <span style={{width:1,height:24,background:"var(--border)",margin:"0 4px",flexShrink:0}}/>
            {filteredP.length > 1 && <button className="export-btn" onClick={()=>{const g=findDuplicates(filteredP).filter(g=>!groupIsDismissed(g.hotels,dismissedDupPairs));setDupGroups(g);setDupExpanded(new Set());}}>Find Duplicates</button>}
            <span className="record-count">{loading?"Loading...":`${filteredP.length} prospects in shared database`}</span>
          </div>

          <div className="tabs">
            <button className={`tab ${tab==="dashboard"?"active":""}`} onClick={()=>setTab("dashboard")}>Dashboard</button>
            <button className={`tab ${tab==="hotels"?"active":""}`} onClick={()=>setTab("hotels")}>Hotels<span className="tab-badge">{sortedP.length}</span></button>
              <button className={`tab ${tab==="outreach"?"active":""}`} onClick={()=>setTab("outreach")}>Pipeline<span className="tab-badge">{filteredT.length}</span></button>
              <button className={`tab ${tab==="contacts"?"active":""}`} onClick={()=>setTab("contacts")}>Contact Tracker<span className="tab-badge">{validTracking.filter(t=>t.d1).length}</span></button>
          </div>

          {tab==="dashboard" && <DashboardTab prospects={prospects} validTracking={validTracking} />}

          {tab==="hotels" && (
            <HotelsTab
              loading={loading}
              filteredP={filteredP}
              sortedP={sortedP}
              pagedP={pagedP}
              totalHotelPages={totalHotelPages}
              hotelsPage={hotelsPage}
              setHotelsPage={setHotelsPage}
              allCountries={allCountries}
              allCities={allCities}
              allGroups={allGroups}
              allBrands={allBrands}
              allProviders={allProviders}
              filterSearch={filterSearch}
              setFilterSearch={setFilterSearch}
              filterCountry={filterCountry}
              setFilterCountry={setFilterCountry}
              filterCity={filterCity}
              setFilterCity={setFilterCity}
              filterGroup={filterGroup}
              setFilterGroup={setFilterGroup}
              filterBrand={filterBrand}
              setFilterBrand={setFilterBrand}
              filterProvider={filterProvider}
              setFilterProvider={setFilterProvider}
              filterHasEmail={filterHasEmail}
              setFilterHasEmail={setFilterHasEmail}
              filterHasGM={filterHasGM}
              setFilterHasGM={setFilterHasGM}
              filterVerified={filterVerified}
              setFilterVerified={setFilterVerified}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              selected={selected}
              setSelected={setSelected}
              sortCol={sortCol}
              sortDir={sortDir}
              setSortCol={setSortCol}
              toggleSort={toggleSort}
              updateProspect={updateProspect}
              updatePipeline={updatePipeline}
              verifyAndAddToPipeline={verifyAndAddToPipeline}
              deleteProspect={deleteProspect}
              setDeleteConfirm={setDeleteConfirm}
              tracking={tracking}
            />
          )}

          {tab==="outreach" && (
            <PipelineTab
              filteredT={filteredT}
              stageFilter={stageFilter}
              setStageFilter={setStageFilter}
              setSelected={setSelected}
              touchToggle={touchToggle}
              updatePipeline={updatePipeline}
              openRejectModal={openRejectModal}
              reopenSequence={reopenSequence}
              outreachView={outreachView}
              setOutreachView={setOutreachView}
              setDeleteConfirm={setDeleteConfirm}
              editingNote={editingNote}
              setEditingNote={setEditingNote}
              noteText={noteText}
              setNoteText={setNoteText}
              saveNote={saveNote}
              prospects={prospects}
              outreachSearch={outreachSearch}
              setOutreachSearch={setOutreachSearch}
              outreachCountry={outreachCountry}
              setOutreachCountry={setOutreachCountry}
              outreachCity={outreachCity}
              setOutreachCity={setOutreachCity}
              outreachGroup={outreachGroup}
              setOutreachGroup={setOutreachGroup}
              outreachTier={outreachTier}
              setOutreachTier={setOutreachTier}
              outreachProvider={outreachProvider}
              setOutreachProvider={setOutreachProvider}
              allCountries={allCountries}
              allCities={allCities}
              allGroups={allGroups}
              allProviders={allProviders}
              updateIntention={updateIntention}
              pipeStageFilter={pipeStageFilter}
              setPipeStageFilter={setPipeStageFilter}
              pipeHasGM={pipeHasGM}
              setPipeHasGM={setPipeHasGM}
              pipeHasEmail={pipeHasEmail}
              setPipeHasEmail={setPipeHasEmail}
            />
          )}

          {tab === "contacts" && (
            <ContactTrackerTab
              prospects={prospects}
              validTracking={validTracking}
              tracking={tracking}
              updatePipeline={updatePipeline}
              setSelected={setSelected}
              ctExpanded={ctExpanded}
              setCtExpanded={setCtExpanded}
              ctStageFilter={ctStageFilter}
              setCtStageFilter={setCtStageFilter}
              ctPriFilter={ctPriFilter}
              setCtPriFilter={setCtPriFilter}
              ctOwnerFilter={ctOwnerFilter}
              setCtOwnerFilter={setCtOwnerFilter}
              ctDueFilter={ctDueFilter}
              setCtDueFilter={setCtDueFilter}
              ctSortCol={ctSortCol}
              setCtSortCol={setCtSortCol}
              ctSortDir={ctSortDir}
              setCtSortDir={setCtSortDir}
              ctPage={ctPage}
              setCtPage={setCtPage}
              ctFocusMode={ctFocusMode}
              setCtFocusMode={setCtFocusMode}
              focusDoneIds={focusDoneIds}
              setFocusDoneIds={setFocusDoneIds}
            />
          )}
        </div>
      </div>

      <DeleteHotelConfirm
        deleteId={deleteConfirm}
        hotelName={prospects.find((x) => x.id === deleteConfirm)?.hotel_name}
        onCancel={() => setDeleteConfirm(null)}
        onConfirmDelete={deleteProspect}
      />

      <DuplicateFinderModal
        dupGroups={dupGroups}
        onClose={() => setDupGroups(null)}
        dupExpanded={dupExpanded}
        setDupExpanded={setDupExpanded}
        dismissedDupPairs={dismissedDupPairs}
        setDismissedDupPairs={setDismissedDupPairs}
        setSelected={setSelected}
        setProspects={setProspects}
        setTracking={setTracking}
        setDupGroups={setDupGroups}
      />

      <RejectLostModal
        open={!!rejectModal}
        onClose={closeRejectModal}
        rejectReason={rejectReason}
        setRejectReason={setRejectReason}
        rejectOtherText={rejectOtherText}
        setRejectOtherText={setRejectOtherText}
        onConfirm={confirmReject}
      />

      <HotelDetailDrawer
        prospect={sel}
        rejectModalOpen={!!rejectModal}
        onClose={() => setSelected(null)}
        tracking={tracking}
        updateProspectField={updateProspectField}
        parseContacts={parseContacts}
        saveContacts={saveContacts}
        addContactForm={addContactForm}
        setAddContactForm={setAddContactForm}
        addContactDraft={addContactDraft}
        setAddContactDraft={setAddContactDraft}
        openRejectModal={openRejectModal}
        updatePipeline={updatePipeline}
        updateProspect={updateProspect}
        editingNote={editingNote}
        setEditingNote={setEditingNote}
        noteText={noteText}
        setNoteText={setNoteText}
        saveNote={saveNote}
        copied={copied}
        copy={copy}
      />

      <Toast toast={toast} />

    </>
  );

}
