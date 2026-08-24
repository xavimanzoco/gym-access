const { cpSync, existsSync, rmSync, readdirSync, statSync } = require("fs");
const { join } = require("path");

const projectRoot = join(__dirname, "..");
const standaloneRoot = join(projectRoot, ".next", "standalone");
const flatDir = join(projectRoot, ".next", "standalone-flat");

function findServerJs(dir, depth) {
  if (depth > 10) return null;
  const entries = readdirSync(dir);
  if (entries.includes("server.js")) return dir;
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory() && entry !== "node_modules" && entry !== ".next") {
      const found = findServerJs(full, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

const appDir = findServerJs(standaloneRoot, 0);
if (!appDir) {
  console.error("server.js not found anywhere under", standaloneRoot);
  process.exit(1);
}

if (existsSync(flatDir)) rmSync(flatDir, { recursive: true });

console.log("Flattening standalone output...");
console.log("  from:", appDir);
console.log("  to:  ", flatDir);

cpSync(appDir, flatDir, { recursive: true });

const staticSrc = join(projectRoot, ".next", "static");
const staticDst = join(flatDir, ".next", "static");
if (existsSync(staticSrc)) {
  cpSync(staticSrc, staticDst, { recursive: true });
  console.log("  copied .next/static");
}

const publicSrc = join(projectRoot, "public");
const publicDst = join(flatDir, "public");
if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDst, { recursive: true });
  console.log("  copied public/");
}

// Rename node_modules and .next so electron-builder doesn't strip them
const renames = [
  ["node_modules", "_modules"],
  [".next", "_next"],
];
for (const [from, to] of renames) {
  const src = join(flatDir, from);
  const dst = join(flatDir, to);
  if (existsSync(src)) {
    if (existsSync(dst)) rmSync(dst, { recursive: true });
    cpSync(src, dst, { recursive: true });
    rmSync(src, { recursive: true });
    console.log(`  renamed ${from} -> ${to}`);
  }
}

console.log("Done.");
