import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const appPath = path.join(root, "src", "pages", "home", "HomePage.jsx");
const s = fs.readFileSync(appPath, "utf8");
const m = s.match(/const css = `([\s\S]*?)`;/);
if (!m) {
  console.error("no css match");
  process.exit(1);
}
const outDir = path.join(root, "src", "assets", "styles");
fs.mkdirSync(outDir, { recursive: true });
const css = m[1].replace(/^\n/, "");
fs.writeFileSync(path.join(outDir, "app.css"), css);
console.log("Wrote app.css", css.length);
