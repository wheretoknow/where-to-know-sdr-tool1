import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const lines = fs.readFileSync(path.join(root, "src", "pages", "home", "HomePage.jsx"), "utf8").split("\n");
// Lines 293-560 (1-based) -> indices 292-559
const block = lines.slice(292, 560).join("\n");
let out = block
  .replace(/^function buildPairKey/m, "function buildPairKey")
  .replace(/^function groupToPairs/m, "export function groupToPairs")
  .replace(/^function groupIsDismissed/m, "export function groupIsDismissed")
  .replace(/^function findDuplicates/m, "export function findDuplicates");
fs.mkdirSync(path.join(root, "src", "utils"), { recursive: true });
fs.writeFileSync(path.join(root, "src", "utils", "duplicateFinder.js"), out + "\n");
console.log("duplicateFinder ok");
