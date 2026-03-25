import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const frag = fs.readFileSync(path.join(root, "src", "App.tail.fragment.jsx"), "utf8");

let patched = frag.replace(
  `    async function apiFetch(body, attempt = 0) {
      const r = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await r.json();`,
  `    async function apiFetch(body, attempt = 0) {
      const data = await postResearch(body);`
);
patched = patched.replace(
  /^\s*<style>\{css\}<\/style>\s*\n/m,
  ""
);

const imports = `import { useState, useEffect, useRef, Fragment } from "react";
import "./assets/styles/app.css";
import { GEO } from "./data/geo.js";
import { CHAIN_BRANDS } from "./data/hotelMaps.js";
import { REJECTION_REASONS, stageLabel } from "./data/pipelineConstants.js";
import { sbFetch } from "./api/supabase.js";
import { postResearch } from "./api/researchApi.js";
import { uid } from "./utils/uid.js";
import { normalizeSearch } from "./utils/strings.js";
import { parseJSON } from "./utils/jsonUtils.js";
import { addBusinessDays, addDays, fmtDate, fmtDateShort, pluralDays } from "./utils/dateUtils.js";
import {
  getProvider,
  normalizeGroup,
  normalizeBrand,
  inferBrandFromName,
  inferProvider,
} from "./utils/hotelNormalize.js";
import { findDuplicates, groupIsDismissed, groupToPairs } from "./utils/duplicateFinder.js";
import { parseDone } from "./utils/pipelineTouch.js";
import { calcLeadScore } from "./utils/leadScore.js";
import { touch2Body, touch3Body, touch4Body } from "./utils/emailTemplates.js";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { OutreachTab } from "./components/OutreachTab.jsx";
import { LeadScoreBadge } from "./components/LeadScoreBadge.jsx";
import { EditableField } from "./components/EditableField.jsx";
import { EmailBody } from "./components/EmailBody.jsx";

`;

fs.writeFileSync(path.join(root, "src", "pages", "home", "HomePage.jsx"), imports + patched);
console.log("HomePage.jsx assembled");
