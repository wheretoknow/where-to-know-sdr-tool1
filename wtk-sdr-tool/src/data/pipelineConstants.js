export const TOUCH_CONFIG = [
  { n: 1, label: "Touch 1", day: 0, desc: "Initial outreach" },
  { n: 2, label: "Touch 2", day: 4, desc: "Day 4 reply in thread" },
  { n: 3, label: "Touch 3", day: 9, desc: "Day 9 new angle" },
  { n: 4, label: "Touch 4", day: 16, desc: "Day 16 close out" },
];
export const REJECTION_REASONS = [
  "Budget",
  "Already using competitor",
  "Not priority",
  "No response",
  "Timing issue",
  "Corporate decision",
  "Other",
];
export const STAGE_LABELS = {new:"Verified","1st":"Email #1","2nd":"Follow-up #1","3rd":"Follow-up #2","4th":"Follow-up #3",replied:"Replied",bounced:"Bounced",demo:"Demo",trial:"Trial",won:"Won",lost:"Lost"};
export function stageLabel(s) { return STAGE_LABELS[s] || s?.charAt(0).toUpperCase() + s?.slice(1) || "New"; }
