import { getProvider } from "./hotelNormalize.js";

export function touch2Body(sel) {
  const provider = getProvider(sel);
  const providerLine = provider
    ? `\n\nOne thing worth mentioning: we're not here to replace ${provider}. Where to know works alongside it — specifically on the gaps ${provider} doesn't cover, like real-time competitor benchmarking and turning review patterns into actionable next steps for your team. Most of our hotel partners run both.`
    : "";
  return `Hi ${sel.gm_first_name || sel.gm_name?.split(" ")[0] || "[Name]"},\n\nJust following up on my note from earlier.\n\nAt ${sel.rating || "your current score"} across ${sel.review_count ? sel.review_count.toLocaleString() : "your"} reviews, do you have visibility into which specific issue is appearing most frequently in written guest feedback — before it shows up in the score?${providerLine}\n\nHappy to show you one example from a comparable property. 15 minutes next week?\n\nBest,\nZishuo Wang | Where to know`;
}

export function touch3Body(sel) {
  return `Hi ${sel.gm_first_name || sel.gm_name?.split(" ")[0] || "[Name]"},\n\nI've reached out a couple of times — I'll keep this brief.\n\nIn competitive markets like ${sel.city}, perception shifts often appear in competitor guest commentary before rankings adjust. We're seeing this pattern across comparable properties in the area.\n\nWhere to know surfaces those competitor signals automatically, so you see where the gap is forming before it affects your standing.\n\nWould early next week or later work better for a 15-minute look? No prep needed.\n\nBest,\nZishuo Wang | Where to know`;
}

export function touch4Body(sel) {
  return `Hi ${sel.gm_first_name || sel.gm_name?.split(" ")[0] || "[Name]"},\n\nI'll pause outreach after this — I don't want to keep landing in your inbox without purpose.\n\nIf the timing isn't right, I completely understand.\n\nOne thought to leave with you: the GMs who find this most useful tend to be the ones who engage before a score change, not after. If anything shifts — a competitive concern, a score movement, or a change in review volume — I'm easy to reach.\n\nWishing you and the team a strong season ahead.\n\nZishuo Wang | Where to know`;
}
