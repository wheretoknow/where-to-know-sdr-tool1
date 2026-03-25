export function calcLeadScore(p) {
  let score = 0;
  const breakdown = [];

  const rooms = p.rooms || 0;
  let roomPts = 0;
  if (rooms >= 500) roomPts = 40;
  else if (rooms >= 300) roomPts = 30;
  else if (rooms >= 200) roomPts = 20;
  else if (rooms >= 100) roomPts = 10;
  score += roomPts;
  breakdown.push(`Rooms: +${roomPts}`);

  const adr = p.adr_usd || 0;
  let adrPts = 0;
  if (adr >= 600) adrPts = 35;
  else if (adr >= 400) adrPts = 25;
  else if (adr >= 250) adrPts = 15;
  else if (adr >= 150) adrPts = 5;
  score += adrPts;
  breakdown.push(`ADR: +${adrPts}`);

  const provider = (p.current_provider || "").trim().toLowerCase();
  const tierProviders = ["medallia", "reviewpro", "trustyou", "qualtrics"];
  let provPts = 0;
  if (tierProviders.some((t) => provider.includes(t))) provPts = 10;
  else if (provider) provPts = 5;
  else provPts = 2;
  score += provPts;
  breakdown.push(`Provider: +${provPts}`);

  const email = p.email || "";
  const hasEmail = email && !email.includes("[email") && !email.includes("email protected");
  const emailPts = hasEmail ? 10 : 0;
  score += emailPts;
  breakdown.push(`Email: +${emailPts}`);

  const gmPts = p.gm_name ? 5 : 0;
  score += gmPts;
  breakdown.push(`GM: +${gmPts}`);

  const total = Math.max(0, Math.min(100, score));
  const grade = total >= 80 ? "A" : total >= 50 ? "B" : "C";
  return { total, grade, breakdown };
}
