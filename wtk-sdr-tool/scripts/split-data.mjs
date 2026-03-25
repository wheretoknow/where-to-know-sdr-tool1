import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const lines = fs.readFileSync(path.join(root, "src", "pages", "home", "HomePage.jsx"), "utf8").split("\n");

function sliceBlock(startLine0, endLine0Inclusive) {
  return lines.slice(startLine0, endLine0Inclusive + 1).join("\n");
}

// Line numbers are 1-based in editor; array is 0-based
// GEO: lines 16-93 in original -> index 15-92
const geoBlock = sliceBlock(15, 92).replace(/^const GEO/, "export const GEO");
fs.mkdirSync(path.join(root, "src", "data"), { recursive: true });
fs.writeFileSync(path.join(root, "src", "data", "geo.js"), geoBlock + "\n");

// hotel maps: 95-291
const mapsBlock = sliceBlock(94, 290)
  .replace(/^const CLIENT_PROVIDER_MAP/, "export const CLIENT_PROVIDER_MAP")
  .replace(/^const BRAND_KEYWORDS/, "export const BRAND_KEYWORDS")
  .replace(/^const CHAIN_BRANDS/, "export const CHAIN_BRANDS");
fs.writeFileSync(path.join(root, "src", "data", "hotelMaps.js"), mapsBlock + "\n");

const touch = sliceBlock(925, 930).replace(/^const TOUCH_CONFIG/, "export const TOUCH_CONFIG");
const reject = sliceBlock(932, 940).replace(/^const REJECTION_REASONS/, "export const REJECTION_REASONS");
const plines = [
  touch,
  reject,
  lines[946].replace(/^const STAGE_LABELS/, "export const STAGE_LABELS"),
  lines[947].replace(/^function stageLabel/, "export function stageLabel"),
].join("\n");
fs.writeFileSync(path.join(root, "src", "data", "pipelineConstants.js"), plines + "\n");

console.log("data split ok");
