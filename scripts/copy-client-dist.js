// Copies the built React app (client/dist) into server/public, so the Express
// server can serve the whole frontend as static files from a single process.
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "client", "dist");
const dest = path.join(__dirname, "..", "server", "public");

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, entry.name);
    const d = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

if (!fs.existsSync(src)) {
  console.error("client/dist not found — did the client build step run first?");
  process.exit(1);
}
fs.rmSync(dest, { recursive: true, force: true });
copyDir(src, dest);
console.log(`Copied ${src} -> ${dest}`);
