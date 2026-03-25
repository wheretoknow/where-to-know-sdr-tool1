import { useState } from "react";

export function OutreachTab({ filteredT, stageFilter, setStageFilter, setSelected, touchToggle, updatePipeline, openRejectModal, reopenSequence, outreachView, setOutreachView, setDeleteConfirm, editingNote, setEditingNote, noteText, setNoteText, saveNote, prospects,
  outreachSearch, setOutreachSearch, outreachCountry, setOutreachCountry, outreachCity, setOutreachCity, outreachGroup, setOutreachGroup, outreachTier, setOutreachTier, outreachProvider, setOutreachProvider,
  allCountries, allCities, allGroups, allProviders, updateIntention,
  pipeStageFilter, setPipeStageFilter, pipeHasGM, setPipeHasGM, pipeHasEmail, setPipeHasEmail }) {

  const [dragOver, setDragOver] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const hasActiveFilters = outreachSearch || outreachCountry || outreachCity || outreachGroup || outreachTier || outreachProvider || pipeStageFilter || pipeHasGM || pipeHasEmail;
  function clearFilters() { setOutreachSearch(""); setOutreachCountry(""); setOutreachCity(""); setOutreachGroup(""); setOutreachTier(""); setOutreachProvider(""); setPipeStageFilter(""); setPipeHasGM(false); setPipeHasEmail(false); }
  if (filteredT.length === 0 && !hasActiveFilters) return <div className="empty"><div className="empty-icon">{"\u{1F4EC}"}</div><div className="empty-title">No outreach tracked</div><div className="empty-sub">Run research to start the tracker.</div></div>;

  const STAGES = [
    { key: "new", label: "Verified", color: "#059669", bg: "#ecfdf5" },
    { key: "1st", label: "Email #1", color: "#2563eb", bg: "#eff6ff" },
    { key: "2nd", label: "Follow-up #1", color: "#0891b2", bg: "#ecfeff" },
    { key: "3rd", label: "Follow-up #2", color: "#7c3aed", bg: "#f5f3ff" },
    { key: "4th", label: "Follow-up #3", color: "#6d28d9", bg: "#ede9fe" },
    { key: "replied", label: "Replied", color: "#0d9488", bg: "#f0fdfa" },
    { key: "bounced", label: "Bounced", color: "#b45309", bg: "#fef3c7" },
    { key: "demo", label: "Demo", color: "#c026d3", bg: "#fdf4ff" },
    { key: "trial", label: "Trial", color: "#ea580c", bg: "#fff7ed" },
    { key: "won", label: "Won", color: "#059669", bg: "#ecfdf5" },
    { key: "lost", label: "Lost", color: "#dc2626", bg: "#fef2f2" },
  ];
  const SK = STAGES.map(s => s.key);

  function effectiveStage(t) {
    const s = t.pipeline_stage || "new";
    // Legacy migration only — never use done to derive stage
    if (s === "active") return "new";
    if (s === "emailed") return "1st";
    if (s === "followup") return "2nd";
    if (s === "dead") return "lost";
    return SK.includes(s) ? s : "new";
  }

  // Summary counts should exclude stage filter (so you see total breakdown while filtering)
  const stageMap = {};
  STAGES.forEach(s => { stageMap[s.key] = []; });
  filteredT.forEach(t => { const s = effectiveStage(t); (stageMap[s] || stageMap["new"]).push(t); });

  // Apply stage filter for display only
  const displayT = pipeStageFilter ? filteredT.filter(t => effectiveStage(t) === pipeStageFilter) : filteredT;

  const IL = { 1: "Cold", 2: "Low", 3: "Medium", 4: "Warm", 5: "Hot" };
  const IC = { 1: "#9ca3af", 2: "#6b7280", 3: "#eab308", 4: "#f59e0b", 5: "#ef4444" };
  function intLabel(v) { return (!v || v < 1) ? null : { text: IL[v], cls: v >= 4 ? "int-hot" : v >= 3 ? "int-warm" : "int-cold" }; }

  function lastAct(t) {
    const d = t.done || [];
    if (!d.length) return "No contact";
    const last = d[d.length - 1], dt = t["d" + last];
    if (!dt) return "Touch " + last;
    const days = Math.floor((Date.now() - new Date(dt)) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 0) return "in " + Math.abs(days) + "d";
    return days + "d ago";
  }

  function changeStage(tid, stageKey, e) {
    if (e) e.stopPropagation();
    setMenuOpen(null);
    if (stageKey === "lost") { openRejectModal(tid, "lost", e); return; }
    const stageToTouch = { "1st": 1, "2nd": 2, "3rd": 3, "4th": 4 };
    const touchN = stageToTouch[stageKey];
    const t = filteredT.find(x => x.id === tid);
    if (!t) { updatePipeline(tid, { pipeline_stage: stageKey }); return; }
    const now = new Date().toISOString();
    const updates = { pipeline_stage: stageKey };
    // Clear rejection reason when moving out of lost
    const currentStage = effectiveStage(t);
    if (currentStage === "lost" && stageKey !== "lost") {
      updates.rejection_reason = null;
    }
    // Moving forward to 1st-4th: auto-create missing preceding actual dates
    if (touchN) {
      const done = [...(t.done || [])];
      for (let i = 1; i <= touchN; i++) {
        if (!t["d" + i]) updates["d" + i] = now;
        if (!done.includes(i)) done.push(i);
      }
      done.sort((a,b) => a - b);
      updates.done = done;
    }
    // Moving backward: if going back to "new", clear contact history
    if (stageKey === "new") {
      updates.d1 = null; updates.d2 = null; updates.d3 = null; updates.d4 = null;
      updates.done = [];
    }
    updatePipeline(tid, updates);
  }

  function onDragStart(e, tid) { e.dataTransfer.setData("text/plain", tid); e.dataTransfer.effectAllowed = "move"; }
  function onDragOver(e, sk) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOver(sk); }
  function onDragLeave() { setDragOver(null); }
  function onDrop(e, sk) { e.preventDefault(); setDragOver(null); const tid = e.dataTransfer.getData("text/plain"); if (tid) changeStage(tid, sk); }

  function KCard({ t }) {
    const p = prospects ? prospects.find(x => x.id === t.prospect_id) : null;
    const int = intLabel(t.intention), last = lastAct(t), stage = effectiveStage(t), isOpen = menuOpen === t.id;
    return (
      <div className="kb-card" draggable onDragStart={e => onDragStart(e, t.id)} onClick={() => setSelected(t.prospect_id)}>
        <div className="kb-card-top">
          <div className="kb-hotel">{t.hotel}</div>
          <div style={{position:"relative",flexShrink:0,display:"flex",alignItems:"center",gap:3}}>
            {int && <span className={"int-tag " + int.cls}>{int.text}</span>}
            <button className="kb-menu-btn" onClick={e => { e.stopPropagation(); setMenuOpen(isOpen ? null : t.id); }}>{"\u22EE"}</button>
            {isOpen && <div className="kb-menu" onClick={e => e.stopPropagation()}>
              <div className="kb-menu-title">Move to</div>
              {STAGES.filter(s => s.key !== stage).map(s => <button key={s.key} className="kb-menu-item" onClick={() => changeStage(t.id, s.key)}><span className="kb-menu-dot" style={{background: s.color}}/>{s.label}</button>)}
            </div>}
          </div>
        </div>
        <div className="kb-city">{p?.city || "\u2014"}{p?.country && p.country !== "\u2014" ? ", " + p.country : ""}</div>
        <div className="kb-bottom"><span className="kb-last">{last}</span>{t.sdr && <span className="kb-sdr">{t.sdr}</span>}</div>
      </div>
    );
  }

  const tActive = filteredT.filter(t => !["won","lost","dead"].includes(effectiveStage(t))).length;
  const tDemo = (stageMap.demo||[]).length, tTrial = (stageMap.trial||[]).length;
  const tWon = (stageMap.won||[]).length, tLost = (stageMap.lost||[]).length;
  const conv = (tWon+tLost) > 0 ? Math.round(tWon/(tWon+tLost)*100) : 0;

  return (<>
    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10,flexWrap:"wrap",padding:"12px 0 8px"}}>
      <input className="cmd-input" style={{minWidth:130,flexShrink:0}} placeholder={"\uD83D\uDD0D Search..."} value={outreachSearch} onChange={e=>setOutreachSearch(e.target.value)}/>
      <select className="cmd-input" style={{minWidth:90,flexShrink:0}} value={outreachCountry} onChange={e=>{setOutreachCountry(e.target.value);setOutreachCity("");}}>
        <option value="">All Countries</option>{allCountries.map(c=><option key={c} value={c}>{c}</option>)}
      </select>
      <select className="cmd-input" style={{width:130,flexShrink:0}} value={outreachGroup} onChange={e=>setOutreachGroup(e.target.value)}>
        <option value="">All Groups</option>{allGroups.map(g=><option key={g} value={g}>{g.length>20?g.slice(0,18)+"\u2026":g}</option>)}
      </select>
      <select className="cmd-input" style={{minWidth:100,flexShrink:0}} value={pipeStageFilter} onChange={e=>setPipeStageFilter(e.target.value)}>
        <option value="">All Stages</option>
        {STAGES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
      </select>
      <button className="act-btn" style={{fontSize:11,flexShrink:0,background:pipeHasGM?"var(--accent)":"transparent",color:pipeHasGM?"white":"var(--text2)",border:pipeHasGM?"1px solid var(--accent)":"1px solid var(--border)",borderRadius:4,padding:"4px 8px"}} onClick={()=>setPipeHasGM(v=>!v)}>Has GM</button>
      <button className="act-btn" style={{fontSize:11,flexShrink:0,background:pipeHasEmail?"var(--accent)":"transparent",color:pipeHasEmail?"white":"var(--text2)",border:pipeHasEmail?"1px solid var(--accent)":"1px solid var(--border)",borderRadius:4,padding:"4px 8px"}} onClick={()=>setPipeHasEmail(v=>!v)}>Has Email</button>
      {hasActiveFilters && <button className="act-btn" style={{fontSize:11,flexShrink:0}} onClick={clearFilters}>{"\u2715"} Clear</button>}
      <div style={{marginLeft:"auto"}} className="view-toggle">
        <button className={"view-btn " + (outreachView==="card"?"active":"")} onClick={()=>setOutreachView("card")}>{"\u25A4"} Kanban</button>
        <button className={"view-btn " + (outreachView==="list"?"active":"")} onClick={()=>setOutreachView("list")}>{"\u2630"} List</button>
      </div>
    </div>
    <div className="pipeline-summary">
      <span>Active <strong>{tActive}</strong></span><span className="ps-sep">{"\u00B7"}</span>
      <span>Demo <strong>{tDemo}</strong></span><span className="ps-sep">{"\u00B7"}</span>
      <span>Trial <strong>{tTrial}</strong></span><span className="ps-sep">{"\u00B7"}</span>
      <span style={{color:"var(--green)"}}>Won <strong>{tWon}</strong></span><span className="ps-sep">{"\u00B7"}</span>
      <span style={{color:"var(--red)"}}>Lost <strong>{tLost}</strong></span><span className="ps-sep">{"\u00B7"}</span>
      <span>Conv <strong>{conv}%</strong></span>
    </div>
    {displayT.length === 0 ? (
      <div className="empty"><div className="empty-icon">{"\uD83D\uDD0D"}</div><div className="empty-title">No matches</div><button className="act-btn" style={{marginTop:8}} onClick={clearFilters}>{"\u2190"} Clear</button></div>
    ) : outreachView === "list" ? (
      <div className="table-card" style={{overflowX:"auto"}}><table className="outreach-list"><thead><tr>
        <th style={{width:"22%"}}>Hotel</th><th style={{width:"5%"}}>City</th><th style={{width:"5%"}}>Group</th><th style={{width:"12%"}}>Contact</th><th style={{width:"9%"}}>Stage</th><th style={{width:"9%"}}>Intent</th><th style={{width:"10%"}}>Last</th><th style={{width:"17%"}}>Notes</th><th style={{width:"8%"}}>Owner</th><th style={{width:"4%"}}></th>
      </tr></thead><tbody>
        {displayT.map(t => {
          const stage = effectiveStage(t), stg = STAGES.find(s=>s.key===stage)||STAGES[0];
          const p = prospects?prospects.find(x=>x.id===t.prospect_id):null, last = lastAct(t);
          return (<tr key={t.id}>
            <td style={{fontWeight:600,cursor:"pointer",color:"var(--text)",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} onClick={()=>setSelected(t.prospect_id)}>{t.hotel}</td>
            <td style={{color:"var(--text3)",fontSize:11}}>{p?.city||"\u2014"}</td>
            <td style={{color:"var(--text3)",fontSize:11,maxWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p?.hotel_group||"\u2014"}</td>
            <td style={{color:"var(--text2)",fontSize:12}}>{t.gm||"\u2014"}</td>
            <td onClick={e=>e.stopPropagation()}>
              <select className="stage-select" value={stage} style={{color:stg.color,background:stg.bg}} onChange={e=>changeStage(t.id,e.target.value)}>
                {STAGES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </td>
            <td onClick={e=>e.stopPropagation()}>
              <select className="intent-select" value={t.intention||0} style={{color:IC[t.intention]||"var(--text3)"}} onChange={e=>updateIntention(t.id,parseInt(e.target.value))}>
                <option value={0}>{"\u2014"}</option>{[1,2,3,4,5].map(v=><option key={v} value={v}>{"\u25CF"} {v} {IL[v]}</option>)}
              </select>
            </td>
            <td style={{fontSize:11,color:"var(--text3)",whiteSpace:"nowrap"}}>{last}</td>
            <td onClick={e=>e.stopPropagation()}>
              {editingNote===t.id ? (<div style={{display:"flex",gap:3}}>
                <textarea className="note-input" value={noteText} onChange={e=>setNoteText(e.target.value)} autoFocus/>
                <div style={{display:"flex",flexDirection:"column",gap:2}}>
                  <button className="act-btn success" style={{fontSize:9,padding:"2px 4px"}} onClick={()=>saveNote(t.id)}>{"\u2713"}</button>
                  <button className="act-btn" style={{fontSize:9,padding:"2px 4px"}} onClick={()=>setEditingNote(null)}>{"\u2715"}</button>
                </div></div>
              ) : (<div className="notes-cell" onClick={()=>{setEditingNote(t.id);setNoteText(t.sales_notes||"");}}>{t.sales_notes||<span style={{color:"var(--border2)"}}>+</span>}</div>)}
            </td>
            <td><span className="kb-sdr">{t.sdr||"\u2014"}</span></td>
            <td onClick={e=>e.stopPropagation()}><button className="del-btn" onClick={()=>setDeleteConfirm(t.prospect_id)}>{"\uD83D\uDDD1"}</button></td>
          </tr>);
        })}
      </tbody></table></div>
    ) : (
      <div className="kanban-board">
        {STAGES.map(stg => {
          const cards = stageMap[stg.key]||[], isDrag = dragOver === stg.key;
          return (<div key={stg.key} className={"kanban-col"+(isDrag?" drag-over":"")} onDragOver={e=>onDragOver(e,stg.key)} onDragLeave={onDragLeave} onDrop={e=>onDrop(e,stg.key)}>
            <div className="kanban-col-header" style={{borderTopColor:stg.color}}>
              <span className="kanban-col-title">{stg.label}</span>
              <span className="kanban-col-count" style={{background:stg.bg,color:stg.color}}>{cards.length}</span>
            </div>
            <div className="kanban-col-body">
              {cards.length===0&&<div style={{padding:"16px 4px",textAlign:"center",color:"var(--text3)",fontSize:10,fontStyle:"italic"}}>Empty</div>}
              {cards.map(t=><KCard key={t.id} t={t}/>)}
            </div>
          </div>);
        })}
      </div>
    )}
  </>);
}
