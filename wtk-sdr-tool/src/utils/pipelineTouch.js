import { TOUCH_CONFIG } from "../data/pipelineConstants.js";
import { addDays, fmtDate, TODAY } from "./dateUtils.js";

function isOverdue(d) {
  return d && new Date(d) < TODAY;
}

export function parseDone(done) {
  if (!done) return [];
  if (Array.isArray(done)) return done;
  try {
    return JSON.parse(done);
  } catch {
    return [];
  }
}

export function getTouchState(t, tc) {
  const done = parseDone(t.done);
  const stage = t.pipeline_stage || "active";
  if (stage === "dead" || stage === "won") return "t-skipped";
  if (done.includes(tc.n)) return "t-done";
  const prevDone = tc.n === 1 || done.includes(tc.n - 1);
  if (!prevDone) return "t-locked";
  if (!t.d1) return tc.n === 1 ? "t-upcoming" : "t-locked";
  const dueDate = addDays(new Date(t.d1), tc.day + 1);
  return isOverdue(dueDate) ? "t-overdue" : "t-upcoming";
}

export function getTouchDueStr(t, tc) {
  if (!t.d1) return null;
  const done = parseDone(t.done);
  if (done.includes(tc.n)) return { str: fmtDate(t[`d${tc.n}`]), cls: "ok" };
  const due = addDays(new Date(t.d1), tc.day + 1);
  return isOverdue(due) ? { str: `Due ${fmtDate(due)}`, cls: "od" } : { str: `Due ${fmtDate(due)}`, cls: "up" };
}

export function getPipelineStatus(t) {
  const stage = t.pipeline_stage || "active";
  const done = parseDone(t.done);
  if (stage === "won") return { label: "🏆 Won", cls: "ps-won" };
  if (stage === "dead")
    return {
      label: `✕ Closed${t.rejection_reason ? ` · ${t.rejection_reason.split("(")[0].trim()}` : ""}`,
      cls: "ps-dead",
    };
  if (stage === "reopen") return { label: "⟳ Re-engage in 3 months", cls: "ps-reopen" };
  if (stage === "demo") return { label: "📅 Demo scheduled", cls: "ps-demo" };
  if (done.length === 0) return { label: "Not started", cls: "ps-active" };
  if (done.length === 4) return { label: "Sequence complete", cls: "ps-active" };
  if (t.d1) {
    const nextTc = TOUCH_CONFIG.find((tc) => !done.includes(tc.n));
    if (nextTc) {
      const due = addDays(new Date(t.d1), nextTc.day + 1);
      if (isOverdue(due)) return { label: `⚠ Touch ${nextTc.n} overdue`, cls: "ps-overdue" };
      return { label: `Touch ${nextTc.n} due ${fmtDate(due)}`, cls: "ps-active" };
    }
  }
  return { label: `${done.length}/4 sent`, cls: "ps-active" };
}
