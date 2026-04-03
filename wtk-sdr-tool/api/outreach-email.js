// Where to know — Hospitality outreach email generator (Anthropic Claude, JSON out)
// Keeps the full Unified Prompt below as the single source of generation rules.

function extractJSONObject(content) {
  const blocks = (content || []).filter((b) => b.type === "text").map((b) => b.text || "");
  const fullText = blocks.join("\n");
  const fence = fullText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try {
      const o = JSON.parse(fence[1].trim());
      if (o && typeof o === "object" && !Array.isArray(o)) return o;
    } catch { /* continue */ }
  }
  let depth = 0;
  let start = -1;
  for (let i = 0; i < fullText.length; i++) {
    if (fullText[i] === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (fullText[i] === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        try {
          return JSON.parse(fullText.slice(start, i + 1));
        } catch { /* continue */ }
        start = -1;
      }
    }
  }
  return null;
}

async function fetchWithRetry(url, opts, retries = 2, delay = 5000) {
  for (let i = 0; i <= retries; i++) {
    const r = await fetch(url, opts);
    if (r.status === 529 && i < retries) {
      await new Promise((ok) => setTimeout(ok, delay));
      continue;
    }
    return r;
  }
}

/** Unified Prompt — Cold Email + Follow-up (Hospitality Outreach). Do not shorten. */
const OUTREACH_GENERATION_RULES = `✅ Unified Prompt：Cold Email + Follow-up（Hospitality Outreach）

GLOBAL INSTRUCTION

Generate high-quality outreach emails for senior hospitality professionals.

There are two modes:
 Mode 1: First email (cold outreach)

 Mode 2: Follow-up email

The same core tension must be consistent across both emails.

INPUT VARIABLES (shared)

 Contact first name

 Job title

 Hotel name

 City / market

 Hotel group / brand

 Known system (if applicable)

 Core tension (must be defined once and reused)

 Referral context (optional)

=========================

MODE 1 — FIRST EMAIL

=========================

Requirements:

1. Opening (1–2 sentences)

 Personalised using hotel / city / positioning / scale

 Adapt to seniority:

 GM → operational

 Corporate → strategic

 Avoid generic compliments

2. Context awareness (system handling)

 If system is known:

 Explicitly mention (e.g. Qualtrics, Medallia, TrustYou)

 Acknowledge it structures feedback well

 Position as complementary

 Do NOT say "similar tools"

 If system is unknown:

 Do NOT guess

 Use provider-agnostic phrasing:

 "while feedback is widely available"

 "while tools are already in place"

3. Core tension (2–3 sentences)

Define a clear decision-level problem, tailored to context:

Examples:
 Multi-property → consistency vs comparability

 GM → what actually moves ratings

 New opening → early signals & timing

 Independent → signal vs noise

 Established → diminishing returns

 Concept-driven → intent vs perception

Constraints:
 Must be concrete (decision/action oriented)

 Avoid vague "insight/data/noise" language unless tied to action

4. Positioning (1–2 sentences)

 Where to know:

 Turns feedback into operational drivers

 Complements existing systems

 Mention clients:

 Marriott, IHG (Kimpton, InterContinental), Radisson

 Include ONE concrete value point:

 e.g. what drives ratings

 or reviews needed to shift score

5. CTA (1 sentence)

 "Would you be open to a brief 15-minute exchange next week?"

 Optionally include location

Style constraints:

 Max 150 words

 No feature list

 No repetition

 Clear, concise, senior tone

Output:

 Subject line

 Email body

=========================

MODE 2 — FOLLOW-UP

=========================

Requirements:

1. Opening (1 sentence)

 Default:

 "Just following up on my previous note."

 If referral exists:

 Replace opening with referrer mention

 Do NOT say "following up"

2. Tension deepening (2–3 sentences)

 Do NOT restate or paraphrase the original problem

 Must go one level deeper into the SAME tension

MANDATORY: Dimension shift

Introduce a new dimension of the same issue:

Examples:
 visibility → decision

 comparison → action

 data → prioritisation

 patterns → consistency

 feedback → measurable impact

Tailor to role:

 GM → hard to isolate what actually drives ratings

 Multi-property → hard to act consistently

 New opening → timing sensitivity

 Independent → small signals = large impact

 Established → incremental improvement difficulty

 Concept-driven → perception gap

Closing line (mandatory):

"That's typically where we focus."

3. CTA (1 sentence)

 "Would you be open to a brief 15-minute exchange next week?"

 Optionally include location

Style constraints:

 Max 80 words

 No product explanation

 No client mentions

 No feature descriptions

 No repetition

 One tension only

 Natural, peer-level tone

Output:

 Email body only

✅ SYSTEM RULE (CRITICAL)

The core tension must remain identical across Mode 1 and Mode 2,
but Mode 2 must advance it, not repeat it.

---
API OUTPUT CONTRACT (append to rules — always obey this):

You will be told which mode to run in the user message: "first_email" or "follow_up".

- For first_email: respond with ONLY a JSON object: {"subject":"...","body":"..."}  (body is plain text, use \\n for newlines inside JSON strings)
- For follow_up: respond with ONLY a JSON object: {"body":"..."}

No markdown fences, no commentary outside JSON.`;

const SYSTEM_WRAPPER = `You are an expert B2B hospitality outreach writer. Follow OUTREACH_GENERATION_RULES exactly.

${OUTREACH_GENERATION_RULES}`;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured" });
  }

  try {
    const {
      mode,
      contact_first_name,
      job_title,
      hotel_name,
      city_market,
      hotel_group_brand,
      known_system,
      referral_context,
      previous_outreach_in_notes,
    } = req.body || {};

    const m = mode === "follow_up" ? "follow_up" : "first_email";
    if (!hotel_name || !String(hotel_name).trim()) {
      return res.status(400).json({ error: "hotel_name is required" });
    }

    let userPayload =
      `RUN MODE: ${m}\n\n` +
      `INPUT VARIABLES:\n` +
      `- contact_first_name: ${contact_first_name || "(unknown — use a neutral greeting)"}\n` +
      `- job_title: ${job_title || "General Manager"}\n` +
      `- hotel_name: ${hotel_name}\n` +
      `- city_market: ${city_market || "unknown"}\n` +
      `- hotel_group_brand: ${hotel_group_brand || "unknown"}\n` +
      `- known_system: ${known_system != null && String(known_system).trim() ? known_system : "UNKNOWN — do not invent a vendor"}\n` +
      `- referral_context: ${referral_context != null && String(referral_context).trim() ? referral_context : "none"}\n`;

    if (m === "follow_up") {
      const prev = typeof previous_outreach_in_notes === "string" ? previous_outreach_in_notes.trim() : "";
      if (!prev) {
        return res.status(400).json({ error: "previous_outreach_in_notes is required for follow_up mode" });
      }
      userPayload +=
        `\nThe FIRST outreach (Mode 1) is already written below. The core tension was established there.\n` +
        `For Mode 2: advance the SAME tension (dimension shift). Do not repeat or paraphrase the first email's problem setup.\n` +
        `Obey Mode 2 style limits exactly.\n\n` +
        `PREVIOUS_OUTREACH_IN_NOTES:\n"""\n${prev.slice(0, 12000)}\n"""\n`;
    } else {
      userPayload +=
        `\nFor Mode 1: define the core tension inside the email body. Output JSON keys subject and body only.\n`;
    }

    const r = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        system: SYSTEM_WRAPPER,
        messages: [{ role: "user", content: userPayload }],
      }),
    });

    if (!r.ok) {
      const errData = await r.json().catch(() => ({}));
      const errMsg = errData.error?.message || r.statusText || "API error";
      if (r.status === 429 || String(errMsg).toLowerCase().includes("rate limit")) {
        return res.status(200).json({ error: "Rate limit — try again shortly", rateLimited: true });
      }
      if (r.status === 529 || String(errMsg).toLowerCase().includes("overloaded")) {
        return res.status(200).json({ error: "API overloaded — retry shortly", overloaded: true });
      }
      return res.status(500).json({ error: errMsg });
    }

    const data = await r.json();
    const obj = extractJSONObject(data.content);
    if (!obj) {
      return res.status(200).json({ error: "No valid JSON from model", raw: JSON.stringify(data.content || []) });
    }

    if (m === "first_email") {
      if (!obj.subject || !obj.body) {
        return res.status(200).json({ error: "Model JSON missing subject or body", partial: obj });
      }
      return res.status(200).json({ subject: obj.subject, body: obj.body });
    }

    if (!obj.body) {
      return res.status(200).json({ error: "Model JSON missing body", partial: obj });
    }
    return res.status(200).json({ body: obj.body });
  } catch (err) {
    console.error("outreach-email error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
