import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const s = fs.readFileSync(path.join(root, "src", "pages", "home", "HomePage.jsx"), "utf8");
const idx = s.indexOf("export default function App()");
if (idx < 0) throw new Error("App() not found");
fs.writeFileSync(path.join(root, "src", "App.tail.fragment.jsx"), s.slice(idx));
console.log("wrote fragment", s.length - idx);
