import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const lines = fs.readFileSync(path.join(root, "src", "pages", "home", "HomePage.jsx"), "utf8").split("\n");
// Lines 1214-1425 (1-based) -> indices 1213-1424
const body = lines.slice(1213, 1425).join("\n");
const out = `import { useState } from "react";\n\n${body.replace(/^function OutreachTab/, "export function OutreachTab")}\n`;
fs.writeFileSync(path.join(root, "src", "components", "OutreachTab.jsx"), out);
console.log("OutreachTab ok");
