import { fmtDate, fmtDateShort } from "../../../utils/dateUtils.js";
import { getProvider } from "../../../utils/hotelNormalize.js";
import { calcLeadScore } from "../../../utils/leadScore.js";
import { touch2Body, touch3Body, touch4Body } from "../../../utils/emailTemplates.js";
import { uid } from "../../../utils/uid.js";
import { LeadScoreBadge } from "./LeadScoreBadge.jsx";
import { EditableField } from "./EditableField.jsx";
import { EmailBody } from "./EmailBody.jsx";

export function HotelDetailDrawer({
  prospect,
  rejectModalOpen,
  onClose,
  tracking,
  updateProspectField,
  parseContacts,
  saveContacts,
  addContactForm,
  setAddContactForm,
  addContactDraft,
  setAddContactDraft,
  openRejectModal,
  updatePipeline,
  updateProspect,
  editingNote,
  setEditingNote,
  noteText,
  setNoteText,
  saveNote,
  copied,
  copy,
}) {
  if (!prospect) return null;
  const sel = prospect;
  return (
    <>
          <div className="overlay" onClick={()=>{ if (!rejectModalOpen) onClose(); }}/>
          <div className="drawer" onClick={e => e.stopPropagation()}>
            <button className="drawer-close" onClick={()=>onClose()}>✕</button>
            <div className="drawer-hotel">{sel.hotel_name}</div>
            <div className="drawer-meta">{sel.brand}{sel.hotel_group && sel.hotel_group !== sel.brand ? ` · ${sel.hotel_group}` : ""} · {sel.city}, {sel.country} · Added by {sel.sdr} · {fmtDateShort(sel.created_at)}</div>
            <div className="d-sec">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span className="d-sec-title" style={{margin:0}}>Property</span>
              </div>
              <div className="d-row"><span className="d-key">Address</span><span className="d-val"><EditableField value={sel.address} placeholder="Add address" onSave={v => updateProspectField(sel.id, 'address', v)} /></span></div>
              <div className="d-row"><span className="d-key">Rooms</span><span className="d-val"><EditableField value={sel.rooms ? String(sel.rooms) : ""} placeholder="Add rooms" type="number" onSave={v => updateProspectField(sel.id, 'rooms', v)} /></span></div>
              <div className="d-row"><span className="d-key">Restaurants</span><span className="d-val"><EditableField value={sel.restaurants ? String(sel.restaurants) : ""} placeholder="Add count" type="number" onSave={v => updateProspectField(sel.id, 'restaurants', v)} /></span></div>
              <div className="d-row"><span className="d-key">Est. ADR</span><span className="d-val"><EditableField value={sel.adr_usd ? String(sel.adr_usd) : ""} placeholder="Add ADR (USD)" type="number" onSave={v => updateProspectField(sel.id, 'adr_usd', v)} /></span></div>
              <div className="d-row"><span className="d-key">Lead Score</span><span className="d-val">{(()=>{const s=calcLeadScore(sel);return<span style={{display:"inline-flex",alignItems:"center",gap:6}}><LeadScoreBadge score={s}/><span style={{fontSize:11,color:"var(--text3)"}}>{s.breakdown.join(" · ")}</span></span>;})()}</span></div>
              <div className="d-row"><span className="d-key">Rating</span><span className="d-val">
                {(() => {
                  if (!sel.rating) return <EditableField value="" placeholder="Add rating" type="number" onSave={v => updateProspectField(sel.id, 'rating', v)} />;
                  const notes = (sel.research_notes || "").toLowerCase();
                  const hasGoogle = notes.includes("google");
                  const hasBooking = notes.includes("booking");
                  const hasTripAdvisor = notes.includes("tripadvisor");
                  const hasAgoda = notes.includes("agoda");
                  const hasTripCom = notes.includes("trip.com");
                  let src = null, scale = null;
                  if (hasBooking && !hasGoogle) { src = "Booking.com"; scale = 10; }
                  else if (hasGoogle && !hasBooking) { src = "Google"; scale = 5; }
                  else if (hasTripAdvisor) { src = "TripAdvisor"; scale = 5; }
                  else if (hasAgoda) { src = "Agoda"; scale = 10; }
                  else if (hasTripCom) { src = "Trip.com"; scale = 10; }
                  else { return <span><EditableField value={String(sel.rating)} onSave={v => updateProspectField(sel.id, 'rating', v)} type="number" /> <span style={{fontSize:11,color:"var(--text3)"}}>({sel.review_count ? `${Number(sel.review_count).toLocaleString()} reviews` : ""} · source unknown)</span></span>; }
                  return <span><EditableField value={String(sel.rating)} onSave={v => updateProspectField(sel.id, 'rating', v)} type="number" /> / {scale} <span style={{fontSize:11,color:"var(--text3)"}}>({sel.review_count ? `${Number(sel.review_count).toLocaleString()} reviews, ` : ""}{src})</span></span>;
                })()}
              </span></div>
              <div className="d-row"><span className="d-key">Brand</span><span className="d-val"><EditableField value={sel.brand || ""} placeholder="Add brand" onSave={v => updateProspectField(sel.id, 'brand', v)} /></span></div>
              <div className="d-row"><span className="d-key">Group</span><span className="d-val"><EditableField value={sel.hotel_group || ""} placeholder="Add group" onSave={v => updateProspectField(sel.id, 'hotel_group', v)} /></span></div>
              <div className="d-row"><span className="d-key">Tech Provider</span><span className="d-val"><EditableField value={getProvider(sel) || ""} placeholder="Add provider" onSave={v => updateProspectField(sel.id, 'current_provider', v)} options={["Medallia","Qualtrics","ReviewPro","TrustYou","Revinate","Reputation.com","Olery","Guestfeedback"]} /></span></div>
              <div className="d-row"><span className="d-key">Website</span><span className="d-val">{sel.website?<a className="email-link" href={sel.website.startsWith("http")?sel.website:`https://${sel.website}`} target="_blank" rel="noreferrer" title={sel.website}>↗ {sel.website.replace(/^https?:\/\/(www\.)?/,"").slice(0,40)}</a>:<EditableField value="" placeholder="Add URL" onSave={v => updateProspectField(sel.id, 'website', v)} />}</span></div>
            </div>
            <div className="d-sec">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span className="d-sec-title" style={{margin:0}}>Contacts</span>
                <button className="act-btn" style={{fontSize:11,padding:"3px 10px"}} onClick={()=>setAddContactForm(sel.id)}>+ Add</button>
              </div>
              {(() => {
                const ctList = parseContacts(sel.id);
                if (ctList.length === 0) return (
                  <div style={{fontSize:12,color:"var(--text3)",fontStyle:"italic",padding:"8px 0"}}>
                    No contacts yet. <span style={{cursor:"pointer",color:"var(--accent)"}} onClick={()=>setAddContactForm(sel.id)}>Add one →</span>
                  </div>
                );
                return ctList.map((c, ci) => (
                  <div key={c.id||ci} style={{border:"1px solid var(--border)",borderRadius:6,padding:"10px 12px",marginBottom:8,background:c.is_primary?"var(--accent-light)":"var(--bg)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                      <div style={{flex:1,marginRight:8}}>
                        <EditableField value={c.name} placeholder="(No name)" onSave={v=>{const u=[...ctList];u[ci]={...u[ci],name:v};saveContacts(sel.id,u);}} />
                        {c.is_primary && <span style={{fontSize:9,fontWeight:700,background:"var(--accent)",color:"white",padding:"1px 6px",borderRadius:10,marginLeft:6}}>PRIMARY</span>}
                      </div>
                      <div style={{display:"flex",gap:4}}>
                        {!c.is_primary && <button className="act-btn" style={{fontSize:9,padding:"2px 6px"}} onClick={()=>{const updated=ctList.map((x,xi)=>({...x,is_primary:xi===ci}));saveContacts(sel.id,updated);}}>Set Primary</button>}
                        <button className="del-btn" style={{fontSize:11}} onClick={()=>{if(ctList.length===1&&c.is_primary){alert("Cannot remove the only primary contact.");return;}const updated=ctList.filter((_,xi)=>xi!==ci);if(c.is_primary&&updated.length>0)updated[0].is_primary=true;saveContacts(sel.id,updated);}}>🗑</button>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"80px 1fr",gap:"4px 8px",fontSize:12}}>
                      <span style={{color:"var(--text3)"}}>Title</span><EditableField value={c.title} placeholder="General Manager" onSave={v=>{const u=[...ctList];u[ci]={...u[ci],title:v};saveContacts(sel.id,u);}} />
                      <span style={{color:"var(--text3)"}}>Email</span><EditableField value={c.email} placeholder="Add email" onSave={v=>{const u=[...ctList];u[ci]={...u[ci],email:v};saveContacts(sel.id,u);}} />
                      <span style={{color:"var(--text3)"}}>LinkedIn</span><EditableField value={c.linkedin} placeholder="Add LinkedIn" onSave={v=>{const u=[...ctList];u[ci]={...u[ci],linkedin:v};saveContacts(sel.id,u);}} />
                      <span style={{color:"var(--text3)"}}>Phone</span><EditableField value={c.phone} placeholder="Add phone" onSave={v=>{const u=[...ctList];u[ci]={...u[ci],phone:v};saveContacts(sel.id,u);}} />
                    </div>
                  </div>
                ));
              })()}
              {addContactForm === sel.id && (
                  <div style={{border:"1px dashed var(--accent)",borderRadius:6,padding:"10px 12px",background:"#f8faff"}}>
                    <div style={{fontSize:12,fontWeight:600,color:"var(--accent)",marginBottom:8}}>New Contact</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,fontSize:12}}>
                      <label style={{display:"flex",flexDirection:"column",gap:2}}>Name<input style={{fontSize:12,border:"1px solid var(--border2)",borderRadius:4,padding:"4px 6px"}} value={addContactDraft.name} onChange={e=>setAddContactDraft(d=>({...d,name:e.target.value}))} placeholder="Full name"/></label>
                      <label style={{display:"flex",flexDirection:"column",gap:2}}>Title<input style={{fontSize:12,border:"1px solid var(--border2)",borderRadius:4,padding:"4px 6px"}} value={addContactDraft.title} onChange={e=>setAddContactDraft(d=>({...d,title:e.target.value}))} placeholder="General Manager"/></label>
                      <label style={{display:"flex",flexDirection:"column",gap:2}}>Email<input style={{fontSize:12,border:"1px solid var(--border2)",borderRadius:4,padding:"4px 6px"}} value={addContactDraft.email} onChange={e=>setAddContactDraft(d=>({...d,email:e.target.value}))} placeholder="email@hotel.com"/></label>
                      <label style={{display:"flex",flexDirection:"column",gap:2}}>LinkedIn<input style={{fontSize:12,border:"1px solid var(--border2)",borderRadius:4,padding:"4px 6px"}} value={addContactDraft.linkedin} onChange={e=>setAddContactDraft(d=>({...d,linkedin:e.target.value}))} placeholder="linkedin.com/in/..."/></label>
                      <label style={{display:"flex",flexDirection:"column",gap:2}}>Phone<input style={{fontSize:12,border:"1px solid var(--border2)",borderRadius:4,padding:"4px 6px"}} value={addContactDraft.phone} onChange={e=>setAddContactDraft(d=>({...d,phone:e.target.value}))} placeholder="+1 ..."/></label>
                    </div>
                    <div style={{display:"flex",gap:6,marginTop:8,alignItems:"center"}}>
                      <label style={{fontSize:11,display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}><input type="checkbox" checked={addContactDraft.is_primary} onChange={e=>setAddContactDraft(d=>({...d,is_primary:e.target.checked}))}/> Set as primary</label>
                      <div style={{marginLeft:"auto",display:"flex",gap:6}}>
                        <button className="modal-cancel" style={{padding:"4px 10px",fontSize:12}} onClick={()=>{setAddContactForm(null);setAddContactDraft({name:"",title:"",email:"",linkedin:"",phone:"",is_primary:false});}}>Cancel</button>
                        <button className="modal-confirm" style={{padding:"4px 10px",fontSize:12}} onClick={()=>{
                          if (!addContactDraft.name.trim()) { alert("Name required"); return; }
                          const existing = parseContacts(sel.id);
                          const newC = {...addContactDraft, id: uid()};
                          let updated;
                          if (newC.is_primary || existing.length===0) {
                            updated = [...existing.map(c=>({...c,is_primary:false})), {...newC,is_primary:true}];
                          } else {
                            updated = [...existing, newC];
                          }
                          saveContacts(sel.id, updated);
                          setAddContactForm(null);
                          setAddContactDraft({name:"",title:"",email:"",linkedin:"",phone:"",is_primary:false});
                        }}>Save</button>
                      </div>
                    </div>
                  </div>
              )}
            </div>
            {(() => {
              const trk = tracking.find(x => x.prospect_id === sel.id);
              if (!trk) return null;
              const DS = [
                {key:"new",label:"Verified",color:"#059669"},{key:"1st",label:"Email #1",color:"#2563eb"},
                {key:"2nd",label:"Follow-up #1",color:"#0891b2"},{key:"3rd",label:"Follow-up #2",color:"#7c3aed"},
                {key:"4th",label:"Follow-up #3",color:"#6d28d9"},{key:"replied",label:"Replied",color:"#0d9488"},
                {key:"bounced",label:"Bounced",color:"#b45309"},{key:"demo",label:"Demo",color:"#c026d3"},
                {key:"trial",label:"Trial",color:"#ea580c"},{key:"won",label:"Won",color:"#059669"},
                {key:"lost",label:"Lost",color:"#dc2626"}
              ];
              const ms = s => { if (s==="active") return "new"; if (s==="emailed") return "1st"; if (s==="followup") return "2nd"; if (s==="dead") return "lost"; return s; };
              const stage = ms(trk.pipeline_stage || "new");
              const so = DS.find(s=>s.key===stage) || DS[0];
              return (
                <div className="d-sec">
                  <div className="d-sec-title">Pipeline Status</div>
                  <div className="d-row">
                    <span className="d-key">Stage</span>
                    <span className="d-val">
                      <select
                        value={stage}
                        onChange={async e => {
                          const newStage = e.target.value;
                          if (newStage === "lost") { openRejectModal(trk.id, "lost"); return; }
                          const now = new Date().toISOString();
                          const stageToTouch = { "1st": 1, "2nd": 2, "3rd": 3, "4th": 4 };
                          const touchN = stageToTouch[newStage];
                          const updates = { pipeline_stage: newStage };
                          if (newStage !== "lost" && trk.rejection_reason) updates.rejection_reason = null;
                          if (newStage === "new") { updates.d1=null; updates.d2=null; updates.d3=null; updates.d4=null; updates.done=[]; }
                          // Auto-set missing dN dates so Contact Tracker picks this up immediately
                          if (touchN) {
                            const done = [...(trk.done || [])];
                            for (let i = 1; i <= touchN; i++) {
                              if (!trk["d" + i]) updates["d" + i] = now;
                              if (!done.includes(i)) done.push(i);
                            }
                            done.sort((a,b) => a - b);
                            updates.done = done;
                          }
                          await updatePipeline(trk.id, updates);
                        }}
                        style={{fontSize:13,fontWeight:700,color:so.color,background:"transparent",border:"1px solid var(--border2)",borderRadius:5,padding:"3px 8px",cursor:"pointer",fontFamily:"'Inter',sans-serif"}}
                      >
                        {DS.map(s => <option key={s.key} value={s.key} style={{color:s.color}}>{s.label}</option>)}
                      </select>
                    </span>
                  </div>
                  {trk.intention > 0 && <div className="d-row"><span className="d-key">Intent</span><span className="d-val">{trk.intention}/5 {String.fromCodePoint(0x2014)} {({1:"Cold",2:"Low",3:"Medium",4:"Warm",5:"Hot"})[trk.intention]||""}</span></div>}
                  {trk.rejection_reason && <div className="d-row"><span className="d-key">Lost Reason</span><span className="d-val" style={{color:"var(--red)"}}><EditableField value={trk.rejection_reason} placeholder="Add reason" onSave={async v=>{await updatePipeline(trk.id,{rejection_reason:v||null});}} /></span></div>}
                  <div style={{marginTop:10}}>
                    <div style={{fontSize:10,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:6}}>Activity Timeline</div>
                    {(trk.done||[]).map(n => {
                      const d = trk["d"+n];
                      const lbl = {1:"Email #1 sent",2:"Follow-up #1 sent",3:"Follow-up #2 sent",4:"Follow-up #3 sent"};
                      return <div key={n} style={{fontSize:11,color:"var(--text2)",padding:"2px 0",display:"flex",gap:8}}>
                        <span style={{color:"var(--text3)",minWidth:70}}>{d?fmtDate(d):"\u2014"}</span>
                        <span>{lbl[n]||("Touch "+n)}</span>
                      </div>;
                    })}
                    {(trk.done||[]).length===0 && <div style={{fontSize:11,color:"var(--text3)",fontStyle:"italic"}}>No contacts yet</div>}
                  </div>
                </div>
              );
            })()}
            <div className="d-sec">
              <div className="d-sec-title">Hotel Profile</div>
              <div className="d-row"><span className="d-key">SDR Verified</span><span className="d-val">
                <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:12}}>
                  <input type="checkbox" checked={!!sel.verified} onChange={e=>updateProspect(sel.id,{verified:e.target.checked})} style={{accentColor:"var(--green)",width:14,height:14}} />
                  <span style={{color:sel.verified?"var(--green)":"var(--text3)",fontWeight:sel.verified?600:400}}>{sel.verified ? "✓ Verified by SDR — active in Pipeline" : "Not yet verified (won't appear in Pipeline)"}</span>
                </label>
              </span></div>
              <div className="d-row"><span className="d-key">Lead Status</span><span className="d-val"><select style={{fontSize:12,border:"1px solid var(--border2)",borderRadius:4,padding:"2px 4px"}} value={sel.lead_status||"Active"} onChange={e=>updateProspect(sel.id,{lead_status:e.target.value})}><option value="Active">Active</option><option value="Dormant">Dormant</option><option value="Closed">Closed</option></select></span></div>
              <div className="d-row"><span className="d-key">Management</span><span className="d-val"><input type="text" style={{fontSize:12,border:"1px solid var(--border2)",borderRadius:4,padding:"2px 4px",width:"100%"}} defaultValue={sel.management_company||""} placeholder="e.g. IHG Hotels & Resorts" onBlur={e=>{const v=e.target.value.trim();if(v!==(sel.management_company||""))updateProspect(sel.id,{management_company:v||null});}}/></span></div>
              <div className="d-row"><span className="d-key">Op. Model</span><span className="d-val"><select style={{fontSize:12,border:"1px solid var(--border2)",borderRadius:4,padding:"2px 4px"}} value={sel.operating_model||""} onChange={e=>updateProspect(sel.id,{operating_model:e.target.value||null})}><option value="">Select...</option><option value="Owned">Owned</option><option value="Managed">Managed</option><option value="Franchised">Franchised</option><option value="Leased">Leased</option><option value="Other">Other</option></select></span></div>
              {sel.operating_model==="Other"&&<div className="d-row"><span className="d-key">Model Note</span><span className="d-val"><input type="text" style={{fontSize:12,border:"1px solid var(--border2)",borderRadius:4,padding:"2px 4px",width:"100%"}} defaultValue={sel.operating_model_note||""} placeholder="Required for Other" onBlur={e=>{const v=e.target.value.trim();if(v.length<3){alert("Note required (min 3 chars)");return;}updateProspect(sel.id,{operating_model_note:v});}}/></span></div>}
            </div>
            {(() => {
              const trk = tracking.find(x => x.prospect_id === sel.id);
              if (!trk) return null;
              return (
                <div className="d-sec">
                  <div className="d-sec-title">Sales Notes</div>
                  <textarea className="note-input" style={{width:"100%",minHeight:60,fontSize:12,padding:6,border:"1px solid var(--border2)",borderRadius:5,fontFamily:"inherit",resize:"vertical"}}
                    value={editingNote === trk.id ? noteText : (trk.sales_notes || "")}
                    onFocus={() => { if (editingNote !== trk.id) { setEditingNote(trk.id); setNoteText(trk.sales_notes || ""); } }}
                    onChange={e => setNoteText(e.target.value)}
                    onBlur={() => { if (editingNote === trk.id) saveNote(trk.id); }}
                    placeholder="Add sales notes..." />
                </div>
              );
            })()}
            {(sel.outreach_email_subject || sel.outreach_email_body) && (
              <div className="d-sec">
                <div className="d-sec-title">4-Touch Email Sequence</div>
                <div className="email-touch">
                  <div className="touch-hdr">Touch 1 <span className="tag">Day 1 · Initial</span></div>
                  <div className="subject-line">Subject: {sel.outreach_email_subject||"—"}</div>
                  <EmailBody text={sel.outreach_email_body} />
                  <button className={`copy-btn ${copied==="e1"?"copied":""}`} onClick={()=>copy(`Subject: ${sel.outreach_email_subject}\n\n${sel.outreach_email_body}`,"e1")}>{copied==="e1"?"✓ Copied":"Copy"}</button>
                </div>
                <div className="email-touch">
                  <div className="touch-hdr">Touch 2 <span className="tag">Day 4 · Reply in thread</span></div>
                  <div className="subject-line">Subject: Re: {sel.outreach_email_subject}</div>
                  <EmailBody text={touch2Body(sel)} />
                  <button className={`copy-btn ${copied==="e2"?"copied":""}`} onClick={()=>copy(touch2Body(sel),"e2")}>{copied==="e2"?"✓ Copied":"Copy"}</button>
                </div>
                <div className="email-touch">
                  <div className="touch-hdr">Touch 3 <span className="tag">Day 9 · New angle</span></div>
                  <EmailBody text={touch3Body(sel)} />
                  <button className={`copy-btn ${copied==="e3"?"copied":""}`} onClick={()=>copy(touch3Body(sel),"e3")}>{copied==="e3"?"✓ Copied":"Copy"}</button>
                </div>
                <div className="email-touch">
                  <div className="touch-hdr">Touch 4 <span className="tag">Day 16 · Close out</span></div>
                  <div className="subject-line">Subject: {sel.hotel_name} — closing the loop</div>
                  <EmailBody text={touch4Body(sel)} />
                  <button className={`copy-btn ${copied==="e4"?"copied":""}`} onClick={()=>copy(touch4Body(sel),"e4")}>{copied==="e4"?"✓ Copied":"Copy"}</button>
                </div>
              </div>
            )}
            {sel.linkedin_dm && (
              <div className="d-sec">
                <div className="d-sec-title">LinkedIn DM</div>
                <div className="email-body">{sel.linkedin_dm}</div>
                <button className={`copy-btn ${copied==="dm"?"copied":""}`} onClick={()=>copy(sel.linkedin_dm,"dm")}>{copied==="dm"?"✓ Copied":"Copy DM"}</button>
              </div>
            )}
            <div className="d-sec">
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
    <span className="d-sec-title" style={{margin:0}}>Research Notes</span>
  </div>
  <textarea
    style={{width:"100%",minHeight:80,fontSize:12,lineHeight:1.7,padding:8,border:"1px solid var(--border2)",borderRadius:5,fontFamily:"'Inter',sans-serif",resize:"vertical",color:"var(--text2)",background:"#f9fafb"}}
    value={(sel.research_notes||"").replace(/<!--contacts:.*?-->\n?/s,"")}
    onChange={e => {
      const match = (sel.research_notes||"").match(/<!--contacts:.*?-->/s);
      const contactsBlock = match ? match[0] + "\n" : "";
      updateProspectField(sel.id, 'research_notes', contactsBlock + e.target.value);
    }}
    placeholder="Add research notes..."
  />
</div>
          </div>
    </>
  );
}
