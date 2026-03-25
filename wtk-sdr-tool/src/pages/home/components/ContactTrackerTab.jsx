import { Fragment } from "react";
import { addBusinessDays, fmtDateShort, pluralDays } from "../../../utils/dateUtils.js";
import { stageLabel } from "../../../data/pipelineConstants.js";

const CT_PER_PAGE = 20;

export function ContactTrackerTab({
  prospects,
  validTracking,
  tracking,
  updatePipeline,
  setSelected,
  ctExpanded,
  setCtExpanded,
  ctStageFilter,
  setCtStageFilter,
  ctPriFilter,
  setCtPriFilter,
  ctOwnerFilter,
  setCtOwnerFilter,
  ctDueFilter,
  setCtDueFilter,
  ctSortCol,
  setCtSortCol,
  ctSortDir,
  setCtSortDir,
  ctPage,
  setCtPage,
  ctFocusMode,
  setCtFocusMode,
  focusDoneIds,
  setFocusDoneIds,
}) {
  const CAD = [0, 0, 3, 7, 7]; // cadence: 1st->2nd=+3bd, 2nd->3rd=+7bd, 3rd->4th=+7bd
  const SM = { active:"new", emailed:"1st", followup:"2nd", dead:"lost" };
  const ms = s => SM[s] || s || "new";
  const EM = String.fromCodePoint(0x2014);
  const SC = {new:"#059669","1st":"#2563eb","2nd":"#0891b2","3rd":"#7c3aed","4th":"#6d28d9",replied:"#0d9488",bounced:"#b45309",demo:"#c026d3",trial:"#ea580c",won:"#059669",lost:"#dc2626"};
  function toInput(d) { if (!d) return ""; const dt=new Date(d),y=dt.getFullYear(),m=String(dt.getMonth()+1).padStart(2,"0"),dd=String(dt.getDate()).padStart(2,"0"); return y+"-"+m+"-"+dd; }
  function fmtD(d) { if (!d) return null; const dt = new Date(d); const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]; return fmtDateShort(d)+" ("+days[dt.getDay()]+")"; }

  // Compute schedule for a tracking record
  function computeSchedule(t) {
    const actual = [null, t.d1, t.d2, t.d3, t.d4];
    const due = [null, null, null, null, null];
    // Due dates: anchor from previous ACTUAL (or previous due as fallback)
    for (let n = 2; n <= 4; n++) {
      const anchor = actual[n-1] || due[n-1];
      if (anchor) due[n] = addBusinessDays(anchor, CAD[n]);
    }
    const stage = ms(t.pipeline_stage);
    const isClosed = ["won","lost","demo","trial"].includes(stage);
    // Next step: first step without actual date
    let nextStep = null, nextDue = null;
    if (!isClosed && stage !== "new") {
      for (let n = 2; n <= 4; n++) {
        if (!actual[n]) { nextStep = n; nextDue = due[n]; break; }
      }
    }
    // If stage is NEW and no d1: no nextDue
    if (stage === "new" && !actual[1]) { nextStep = null; nextDue = null; }
    // If stage is NEW but has d1: next is 2nd
    if (stage === "new" && actual[1] && !actual[2]) { nextStep = 2; nextDue = due[2]; }
    // Last actual contact
    let lastN = 0;
    for (let n = 4; n >= 1; n--) { if (actual[n]) { lastN = n; break; } }
    const lastDate = lastN > 0 ? actual[lastN] : null;
    const daysSince = lastDate ? Math.floor((Date.now() - new Date(lastDate)) / 86400000) : null;
    // Countdown: daysToDue = targetDate - today (positive = future, negative = overdue)
    let daysUntilDue = null;
    if (nextDue) {
      const target = new Date(nextDue); target.setHours(0,0,0,0);
      const now = new Date(); now.setHours(0,0,0,0);
      daysUntilDue = Math.round((target - now) / 86400000);
    }
    // Status
    let status = "ok";
    if (isClosed || (lastN >= 4 && !nextStep)) status = "done";
    else if (daysUntilDue !== null && daysUntilDue < 0) status = "overdue";
    else if (daysUntilDue !== null && daysUntilDue <= 2) status = "due-soon";
    return { actual, due, nextStep, nextDue, lastN, lastDate, daysSince, daysUntilDue, status, isClosed };
  }

  function updateDate(tid, touchNum, dateVal) {
    // Guard: no future dates
    if (dateVal) {
      const sel = new Date(dateVal + "T12:00:00");
      const today = new Date(); today.setHours(23,59,59,999);
      if (sel > today) { alert("Cannot set a future date as actual contact date."); return; }
    }
    const t = tracking.find(x => x.id === tid);
    if (!t) return;
    // Guard: no step skipping (must have previous step)
    if (dateVal && touchNum > 1 && !t["d" + (touchNum - 1)]) {
      const ord = ["","1st","2nd","3rd","4th"];
      alert("Set " + ord[touchNum-1] + " contact date first."); return;
    }
    const key = "d" + touchNum;
    const isoVal = dateVal ? new Date(dateVal + "T12:00:00").toISOString() : null;
    const done = [...((t.done) || [])];
    if (dateVal && !done.includes(touchNum)) { done.push(touchNum); done.sort((a,b)=>a-b); }
    if (!dateVal) { const idx=done.indexOf(touchNum); if(idx>=0) done.splice(idx,1); }
    const updates = { [key]: isoVal, done };
    // Auto-derive stage from highest done touch (only if not in demo/trial/won/lost)
    const maxD = done.length > 0 ? Math.max(...done) : 0;
    const stMap = {0:"new",1:"1st",2:"2nd",3:"3rd",4:"4th"};
    const cur = ms(t.pipeline_stage);
    if (stMap[maxD] && !["demo","trial","won","lost"].includes(cur)) {
      updates.pipeline_stage = stMap[maxD];
    }
    updatePipeline(tid, updates);
  }

  function ctToggleSort(col) {
    if (ctSortCol === col) setCtSortDir(d => d === "asc" ? "desc" : "asc");
    else { setCtSortCol(col); setCtSortDir("asc"); }
  }

  const OUTREACH_STAGES = new Set(["1st","2nd","3rd","4th","replied","bounced","emailed","followup"]);
  const rows = validTracking.filter(t => {
    // Show if: has any actual contact date, OR has done entries, OR is in an outreach stage
    // (catches hotels moved to Email#1+ from Pipeline/drawer without manually setting d1)
    return t.d1 || (t.done && t.done.length > 0) || OUTREACH_STAGES.has(ms(t.pipeline_stage));
  }).map(t => {
    const p = prospects.find(x => x.id === t.prospect_id);
    const sched = computeSchedule(t);
    const stage = ms(t.pipeline_stage);
    return { t, p, stage, ...sched };
  }).sort((a, b) => {
    const pri = { overdue: 0, "due-soon": 1, ok: 2, done: 3 };
    return (pri[a.status]||2) - (pri[b.status]||2);
  });

  const overdueN = rows.filter(r => r.status === "overdue").length;
  const dueTodayN = rows.filter(r => r.daysUntilDue === 0).length;
  const dueSoonN = rows.filter(r => r.status === "due-soon" && r.daysUntilDue !== 0).length;
  const doneN = rows.filter(r => r.status === "done").length;
  const upcomingN = rows.filter(r => r.status === "ok").length;

  // Apply CT filters
  const ctSdrs = [...new Set(rows.map(r => r.t.sdr).filter(Boolean))].sort();
  const filteredRows = rows.filter(r => {
    if (ctOwnerFilter && (r.t.sdr || "Unknown") !== ctOwnerFilter) return false;
    if (ctDueFilter) {
      const d = r.daysUntilDue;
      if (ctDueFilter === "overdue" && !(d !== null && d < 0)) return false;
      if (ctDueFilter === "today" && d !== 0) return false;
      if (ctDueFilter === "3days" && !(d !== null && d >= 0 && d <= 3)) return false;
      if (ctDueFilter === "7days" && !(d !== null && d >= 0 && d <= 7)) return false;
      if (ctDueFilter === "none" && d !== null) return false;
    }
    if (ctPriFilter) {
      const pri = r.status === "done" ? "done" : r.status === "overdue" ? "high" : (r.daysUntilDue !== null && r.daysUntilDue <= 2) ? "high" : (r.daysUntilDue !== null && r.daysUntilDue <= 5) ? "medium" : "low";
      if (pri !== ctPriFilter) return false;
    }
    if (ctStageFilter) {
      if (ctStageFilter === "done" && r.status !== "done") return false;
      else if (ctStageFilter !== "done" && r.stage !== ctStageFilter) return false;
    }
    return true;
  });
  const ctHasFilters = ctOwnerFilter || ctDueFilter || ctPriFilter || ctStageFilter;

  // Apply user sort on top of priority sort
  const sortedRows = ctSortCol ? [...filteredRows].sort((a, b) => {
    let va, vb, aN, bN;
    if (ctSortCol === "lastDate") { va = a.lastDate ? new Date(a.lastDate).getTime() : null; vb = b.lastDate ? new Date(b.lastDate).getTime() : null; }
    if (ctSortCol === "nextDue") { va = a.nextDue ? new Date(a.nextDue).getTime() : null; vb = b.nextDue ? new Date(b.nextDue).getTime() : null; }
    if (ctSortCol === "countdown") { va = a.daysUntilDue ?? null; vb = b.daysUntilDue ?? null; }
    aN = va === null; bN = vb === null;
    if (aN && bN) return 0;
    if (aN) return 1;
    if (bN) return -1;
    return ctSortDir === "asc" ? va - vb : vb - va;
  }) : filteredRows;

  function SortTh({ col, label, width }) {
    const active = ctSortCol === col;
    return <th style={{width, cursor:"pointer", userSelect:"none", whiteSpace:"nowrap"}} onClick={() => ctToggleSort(col)}>
      {label} <span style={{fontSize:10, opacity: active ? 1 : 0.35, color: active ? "var(--accent)" : "inherit"}}>{active ? (ctSortDir === "asc" ? "▲" : "▼") : "⇅"}</span>
    </th>;
  }

  return (<>
    <div style={{display:"flex",gap:8,alignItems:"center",padding:"12px 0 8px",flexWrap:"wrap"}}>
      <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>Today: {fmtDateShort(new Date())}</div>
      <span style={{fontSize:12,color:"var(--text3)",padding:"4px 10px",background:"var(--bg)",borderRadius:5,border:"1px solid var(--border)"}}>{rows.length} tracked</span>
      {overdueN > 0 && <button onClick={()=>{ setCtFocusMode(false); setCtDueFilter(f=>f==="overdue"?"":"overdue"); }} style={{fontSize:12,fontWeight:600,padding:"4px 10px",background:ctDueFilter==="overdue"?"#dc2626":"#fef2f2",color:ctDueFilter==="overdue"?"white":"#dc2626",borderRadius:5,border:"1px solid #fecaca",cursor:"pointer",fontFamily:"inherit"}}>{overdueN} Overdue</button>}
      {dueTodayN > 0 && <button onClick={()=>{ setCtFocusMode(false); setCtDueFilter(f=>f==="today"?"":"today"); }} style={{fontSize:12,fontWeight:600,padding:"4px 10px",background:ctDueFilter==="today"?"#ea580c":"#fff7ed",color:ctDueFilter==="today"?"white":"#ea580c",borderRadius:5,border:"1px solid #fed7aa",cursor:"pointer",fontFamily:"inherit"}}>{dueTodayN} Due today</button>}
      {dueSoonN > 0 && <button onClick={()=>{ setCtFocusMode(false); setCtDueFilter(f=>f==="3days"?"":"3days"); }} style={{fontSize:12,fontWeight:600,padding:"4px 10px",background:ctDueFilter==="3days"?"#d97706":"#fffbeb",color:ctDueFilter==="3days"?"white":"#d97706",borderRadius:5,border:"1px solid #fde68a",cursor:"pointer",fontFamily:"inherit"}}>{dueSoonN} Due soon</button>}
      {upcomingN > 0 && <button onClick={()=>{ setCtFocusMode(false); setCtDueFilter(f=>f==="7days"?"":"7days"); }} style={{fontSize:12,fontWeight:600,padding:"4px 10px",background:ctDueFilter==="7days"?"#059669":"#f0fdf4",color:ctDueFilter==="7days"?"white":"#059669",borderRadius:5,border:"1px solid #bbf7d0",cursor:"pointer",fontFamily:"inherit"}}>{upcomingN} Upcoming</button>}
      {doneN > 0 && <button onClick={()=>{ setCtFocusMode(false); setCtDueFilter(f=>f==="none"?"":"none"); }} style={{fontSize:12,fontWeight:600,padding:"4px 10px",background:ctDueFilter==="none"?"#6b7280":"#f9fafb",color:ctDueFilter==="none"?"white":"var(--text3)",borderRadius:5,border:"1px solid var(--border)",cursor:"pointer",fontFamily:"inherit"}}>{doneN} Completed</button>}
      <div style={{marginLeft:"auto",display:"flex",gap:4,background:"var(--bg)",borderRadius:6,border:"1px solid var(--border)",padding:2}}>
        <button style={{fontSize:11,fontWeight:600,padding:"4px 10px",borderRadius:4,border:"none",cursor:"pointer",background:ctFocusMode?"var(--accent)":"transparent",color:ctFocusMode?"white":"var(--text3)"}} onClick={()=>{setCtFocusMode(true);setFocusDoneIds(new Set());}}>Focus</button>
        <button style={{fontSize:11,fontWeight:600,padding:"4px 10px",borderRadius:4,border:"none",cursor:"pointer",background:!ctFocusMode?"var(--accent)":"transparent",color:!ctFocusMode?"white":"var(--text3)"}} onClick={()=>setCtFocusMode(false)}>Full List</button>
      </div>
    </div>

    {ctFocusMode ? (() => {
      // Focus mode: only show overdue + due today + due within 2 days, excluding dismissed
      const focusRows = rows.filter(r => {
        if (r.status === "done") return false;
        if (focusDoneIds.has(r.t.id)) return false;
        return r.status === "overdue" || (r.daysUntilDue !== null && r.daysUntilDue <= 2);
      });
      const ordLabel = ["","1st","2nd","3rd","4th"];
      if (focusRows.length === 0) return (
        <div style={{textAlign:"center",padding:"40px 0"}}>
          <div style={{fontSize:32,marginBottom:8}}>✓</div>
          <div style={{fontSize:16,fontWeight:600,color:"var(--green)"}}>All caught up!</div>
          <div style={{fontSize:13,color:"var(--text3)",marginTop:4}}>No overdue or imminent follow-ups. Next due items will appear here.</div>
          <button className="act-btn" style={{marginTop:12}} onClick={()=>setCtFocusMode(false)}>View full list →</button>
        </div>
      );
      return (<div style={{padding:"4px 0"}}>
        <div style={{fontSize:11,color:"var(--text3)",marginBottom:8,fontWeight:600}}>{focusRows.length} action{focusRows.length!==1?"s":""} to do</div>
        {focusRows.map(({t, p, stage, actual, due, nextStep, nextDue, daysUntilDue, status, lastN}) => {
          const emailAddr = t.email || p?.email;
          const gmFirst = (t.gm || p?.gm_name || "").split(" ")[0] || "there";
          const isOverdue = status === "overdue";
          const isDueToday = daysUntilDue === 0;
          const nextAction = !actual[1] ? "Send Email #1" : nextStep ? `Send Follow-up #${nextStep-1}` : "Waiting reply";
          return (
            <div key={t.id} className={`focus-card ${isOverdue?"overdue":isDueToday?"due-today":"due-soon"}`}>
              <button className={`focus-done-btn ${focusDoneIds.has(t.id)?"checked":""}`} onClick={() => {
                setFocusDoneIds(prev => { const n = new Set(prev); n.add(t.id); return n; });
              }} title="Mark done for today">✓</button>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"baseline",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontWeight:600,color:"var(--text)",cursor:"pointer",fontSize:13}} onClick={()=>setSelected(t.prospect_id)}>{t.hotel}</span>
                  <span style={{fontSize:11,color:"var(--text3)"}}>{p?.city||""}{t.gm?" · "+t.gm:""}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginTop:4,fontSize:12}}>
                  <span style={{fontWeight:600,color:isOverdue?"var(--red)":isDueToday?"var(--orange)":"var(--amber)"}}>
                    {isOverdue ? pluralDays(daysUntilDue)+" overdue" : isDueToday ? "Due today" : "Due in "+pluralDays(daysUntilDue)}
                  </span>
                  <span style={{color:"var(--text3)"}}>→ {nextAction}</span>
                  {nextDue && <span style={{color:"var(--text3)",fontSize:11}}>{fmtDateShort(nextDue)} ({ordLabel[nextStep]})</span>}
                </div>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                {emailAddr && <button className="act-btn" style={{fontSize:10,padding:"4px 10px",background:"var(--accent)",color:"white",border:"none",borderRadius:4,cursor:"pointer"}} onClick={e=>{e.stopPropagation();const subj=encodeURIComponent("Guest feedback insights for "+t.hotel);const body=encodeURIComponent(`Hi ${gmFirst},\n\nI recently reviewed guest feedback trends for ${t.hotel}...\n\nBest,\nZishuo Wang | Where to know`);window.open(`https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(emailAddr)}&subject=${subj}&body=${body}`);}}>✉ Email</button>}
                <button className="act-btn" style={{fontSize:10,padding:"4px 10px"}} onClick={()=>{setCtFocusMode(false);setCtExpanded(t.id);}}>Details</button>
              </div>
            </div>
          );
        })}
      </div>);
    })() : (<>
    <div style={{display:"flex",gap:8,alignItems:"center",padding:"8px 0",flexWrap:"wrap"}}>
      <select className="cmd-input" style={{minWidth:90,flexShrink:0}} value={ctOwnerFilter} onChange={e=>{setCtOwnerFilter(e.target.value);setCtPage(1);}}>
        <option value="">All Owners</option>{ctSdrs.map(s=><option key={s} value={s}>{s}</option>)}
      </select>
      <select className="cmd-input" style={{minWidth:100,flexShrink:0,fontWeight:ctDueFilter?"600":"400",borderColor:ctDueFilter?"var(--accent)":"var(--border2)",color:ctDueFilter?"var(--accent)":"var(--text)",background:ctDueFilter?"var(--accent-light)":"var(--bg)"}} value={ctDueFilter} onChange={e=>{setCtDueFilter(e.target.value);setCtPage(1);}}>
        <option value="">All Due Dates</option>
        <option value="overdue">Overdue</option>
        <option value="today">Due today</option>
        <option value="3days">Next 3 days</option>
        <option value="7days">Next 7 days</option>
        <option value="none">No due date</option>
      </select>
      <select className="cmd-input" style={{minWidth:80,flexShrink:0}} value={ctPriFilter} onChange={e=>{setCtPriFilter(e.target.value);setCtPage(1);}}>
        <option value="">All Priority</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
        <option value="done">Done</option>
      </select>
      <select className="cmd-input" style={{minWidth:90,flexShrink:0}} value={ctStageFilter} onChange={e=>{setCtStageFilter(e.target.value);setCtPage(1);}}>
        <option value="">All Stages</option>
        <option value="new">New</option>
        <option value="1st">Email #1</option>
        <option value="2nd">Follow-up #1</option>
        <option value="3rd">Follow-up #2</option>
        <option value="4th">Follow-up #3</option>
        <option value="replied">Replied</option>
        <option value="bounced">Bounced</option>
        <option value="done">Completed</option>
      </select>
      {ctHasFilters && <button className="act-btn" style={{fontSize:11}} onClick={()=>{setCtOwnerFilter("");setCtDueFilter("");setCtPriFilter("");setCtStageFilter("");setCtPage(1);}}>✕ Clear</button>}
      <span style={{marginLeft:"auto",fontSize:12,color:"var(--text3)",fontWeight:600}}>{filteredRows.length} / {rows.length}</span>
    </div>
    {(() => {
      const totalCtPages = Math.ceil(sortedRows.length / CT_PER_PAGE);
      const pagedCtRows = sortedRows.slice((ctPage - 1) * CT_PER_PAGE, ctPage * CT_PER_PAGE);
      return (<>
    <div className="table-card" style={{overflowX:"auto"}}><table className="contact-tracker"><thead><tr>
      <th style={{width:"20%"}}>Hotel</th><th style={{width:"12%"}}>Stage</th>
      <SortTh col="lastDate" label="Last Contact" width="14%" />
      <SortTh col="nextDue" label="Next Due" width="16%" />
      <SortTh col="countdown" label="Countdown" width="9%" />
      <th style={{width:"7%"}}>Priority</th><th style={{width:"17%"}}>Next Action</th><th style={{width:"8%"}}>Owner</th>
    </tr></thead><tbody>
      {pagedCtRows.map(({t, p, stage, actual, due, nextStep, nextDue, lastN, lastDate, daysSince, daysUntilDue, status}) => {
        const isExp = ctExpanded === t.id;
        const ordLabel = ["","1st","2nd","3rd","4th"];
        // Priority logic
        const priority = status === "done" ? "done" : status === "overdue" ? "high" : (daysUntilDue !== null && daysUntilDue <= 2) ? "high" : (daysUntilDue !== null && daysUntilDue <= 5) ? "medium" : "low";
        const priStyle = { high: {bg:"#fef2f2",color:"#dc2626",label:"High"}, medium: {bg:"#fffbeb",color:"#d97706",label:"Medium"}, low: {bg:"#f3f4f6",color:"#6b7280",label:"Low"}, done: {bg:"#ecfdf5",color:"#059669",label:"Done"} }[priority];
        // Next Action logic
        const nextAction = status === "done" ? null : !actual[1] ? "\u2709 Send Email #1" : nextStep ? `\u21BA Send Follow-up #${nextStep-1}` : "\u23F3 Waiting reply";
        const emailAddr = t.email || p?.email;
        const gmFirst = (t.gm || p?.gm_name || "").split(" ")[0] || "there";
        return (<Fragment key={t.id}>
          <tr style={{cursor:"pointer",borderLeft:priority==="high"?"3px solid #dc2626":priority==="medium"?"3px solid #d97706":"3px solid transparent",opacity:priority==="done"?0.45:1,background:priority==="done"?"#fafafa":undefined}} onClick={()=>setCtExpanded(isExp?null:t.id)}>
            <td>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{fontSize:10,color:"var(--text3)",flexShrink:0,transition:"transform 0.15s",transform:isExp?"rotate(90deg)":"rotate(0deg)"}}>▸</span>
                <div style={{minWidth:0}}>
                  <div style={{fontWeight:600,color:"var(--text)",cursor:"pointer"}} onClick={e=>{e.stopPropagation();setSelected(t.prospect_id);}}>{t.hotel}</div>
                  <div style={{fontSize:10,color:"var(--text3)"}}>{p?.city||""}{p?.country?", "+p.country:""}{t.gm?" · "+t.gm:""}</div>
                </div>
              </div>
            </td>
            <td style={{overflow:"visible"}}><select style={{fontSize:11,fontWeight:600,color:SC[stage]||"#6b7280",background:"transparent",border:"1px solid var(--border2)",borderRadius:4,padding:"2px 4px",cursor:"pointer",textTransform:"uppercase",minWidth:90}} value={stage} onClick={e=>e.stopPropagation()} onChange={e=>{e.stopPropagation();const newStage=e.target.value;const updates={pipeline_stage:newStage};if(newStage==="new"){updates.d1=null;updates.d2=null;updates.d3=null;updates.d4=null;updates.done=[];}if(newStage!=="lost"&&(t.rejection_reason)){updates.rejection_reason=null;}updatePipeline(t.id,updates);}}>{["new","1st","2nd","3rd","4th","replied","bounced","demo","trial","won","lost"].map(s=><option key={s} value={s} style={{color:SC[s]||"#6b7280"}}>{stageLabel(s)}</option>)}</select></td>
            <td style={{fontSize:11,whiteSpace:"nowrap"}}>{lastDate ? <span>{fmtD(lastDate)}<span style={{fontSize:9,color:"var(--text3)",marginLeft:3}}>({ordLabel[lastN]})</span></span> : EM}</td>
            <td style={{fontSize:11,whiteSpace:"nowrap"}}>{nextDue ? <span title={ordLabel[nextStep]+" follow-up"}>{fmtD(nextDue)}<span style={{fontSize:9,color:"var(--text3)",marginLeft:3}}>({ordLabel[nextStep]})</span></span> : <span style={{color:"var(--text3)"}}>{status==="done"?EM:EM}</span>}</td>
            <td style={{fontSize:12,fontWeight:600,whiteSpace:"nowrap",color:daysUntilDue!==null&&daysUntilDue<0?"var(--red)":daysUntilDue!==null&&daysUntilDue<=2?"#d97706":"var(--text)"}}>{daysUntilDue!==null?(daysUntilDue<0?pluralDays(daysUntilDue)+" overdue":daysUntilDue===0?"due today":"in "+pluralDays(daysUntilDue)):EM}</td>
            <td>{status==="done"?<span style={{fontSize:10,color:"var(--text3)"}}>—</span>:<span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:10,background:priStyle.bg,color:priStyle.color}}>{priStyle.label}</span>}</td>
            <td>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:11,color:status==="done"?"var(--text3)":"var(--text)"}}>{nextAction||EM}</span>
                {emailAddr ? <button className="act-btn" style={{fontSize:9,padding:"2px 6px",background:"var(--accent)",color:"white",border:"none",borderRadius:4,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}} onClick={e=>{e.stopPropagation();const subj=encodeURIComponent("Guest feedback insights for "+t.hotel);const body=encodeURIComponent(`Hi ${gmFirst},\n\nI recently reviewed guest feedback trends for ${t.hotel}...\n\nBest,\nZishuo Wang | Where to know`);const webUrl=`https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(emailAddr)}&subject=${subj}&body=${body}`;const t0=Date.now();window.location.href=`ms-outlook://compose?to=${encodeURIComponent(emailAddr)}&subject=${subj}&body=${body}`;setTimeout(()=>{if(Date.now()-t0<1500)window.open(webUrl);},1200);}}>✉ Email</button>
                : <button className="act-btn" style={{fontSize:9,padding:"2px 6px",background:"transparent",color:"var(--text3)",border:"1px solid var(--border)",borderRadius:4,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}} onClick={e=>{e.stopPropagation();setSelected(t.prospect_id);}}>+ Add email</button>}
              </div>
            </td>
            <td><span style={{fontSize:11,color:"var(--text3)"}}>{t.sdr||EM}</span></td>
          </tr>
          {isExp && <tr><td colSpan={8} style={{background:"#f9fafb",padding:"10px 16px"}}>
            <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
              {[1,2,3,4].map(n => {
                const hasActual = !!actual[n];
                const isDue = nextStep === n;
                const dueDate = due[n];
                const dotColor = hasActual ? "#059669" : isDue ? "#d97706" : "#d1d5db";
                const label = n === 1 ? "Email #1" : `Follow-up #${n-1}`;
                return (<div key={n} style={{flex:1,minWidth:0,textAlign:"center"}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:dotColor,margin:"0 auto 4px"}}/>
                  <div style={{fontSize:10,fontWeight:600,color:hasActual?"#059669":isDue?"#d97706":"var(--text3)"}}>{label}</div>
                  <input type="date" value={toInput(actual[n])} onChange={e=>updateDate(t.id,n,e.target.value)} onClick={e=>e.stopPropagation()}
                    style={{fontSize:11,border:"1px solid var(--border2)",borderRadius:4,padding:"2px 4px",width:"100%",fontFamily:"inherit",cursor:"pointer",marginTop:2}} />
                  {n >= 2 && !hasActual && <div style={{fontSize:8,color:"var(--text3)",marginTop:1}}>Due: {dueDate ? fmtD(dueDate) : "—"}</div>}
                  {hasActual && <div style={{fontSize:8,color:"#059669",marginTop:1}}>{"\u2713"} {fmtD(actual[n])}</div>}
                </div>);
              })}
            </div>
          </td></tr>}
        </Fragment>);
      })}
    </tbody></table></div>
    {totalCtPages > 1 && (
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"12px",borderTop:"1px solid var(--border)"}}>
        <button className="act-btn" disabled={ctPage===1} onClick={()=>setCtPage(p=>p-1)}>← Prev</button>
        {Array.from({length:Math.min(totalCtPages,7)}, (_,i) => {
          let page;
          if (totalCtPages <= 7) page = i+1;
          else if (ctPage <= 4) page = i+1;
          else if (ctPage >= totalCtPages-3) page = totalCtPages-6+i;
          else page = ctPage-3+i;
          return <button key={page} className={`act-btn ${ctPage===page?"success":""}`} style={{minWidth:32}} onClick={()=>setCtPage(page)}>{page}</button>;
        })}
        <button className="act-btn" disabled={ctPage===totalCtPages} onClick={()=>setCtPage(p=>p+1)}>Next →</button>
        <span style={{fontSize:11,color:"var(--text3)",marginLeft:4}}>{(ctPage-1)*CT_PER_PAGE+1}–{Math.min(ctPage*CT_PER_PAGE,sortedRows.length)} of {sortedRows.length}</span>
      </div>
    )}
    </>); })()}
  </>)}
  </>);
}
