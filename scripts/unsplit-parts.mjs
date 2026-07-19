#!/usr/bin/env node
/**
 * Recombine part-01 + part-02 back into the facade file (behavior-freeze undo of a bad split).
 * Usage: node scripts/unsplit-parts.mjs <facade.ts>
 * Expects <base>-part-01.ts and <base>-part-02.ts beside the facade.
 */
import fs from "fs";
import path from "path";

const facade = path.resolve(process.argv[2]);
const base = facade.replace(/\.ts$/, "");
const baseName = path.basename(base);
const dir = path.dirname(facade);
const p1 = path.join(dir, `${baseName}-part-01.ts`);
const p2 = path.join(dir, `${baseName}-part-02.ts`);
if (!fs.existsSync(p1) || !fs.existsSync(p2)) {
  console.error("missing parts", p1, p2);
  process.exit(1);
}

let s1 = fs.readFileSync(p1, "utf8");
let s2 = fs.readFileSync(p2, "utf8");

// Strip banners
s1 = s1.replace(/^\/\/ Behavior-freeze[^\n]*\n+/gm, "");
s2 = s2.replace(/^\/\/ Behavior-freeze[^\n]*\n+/gm, "");

// Remove imports from s2 that pull from part-01 / continuation
s2 = s2.replace(
  new RegExp(
    `import\\s*(?:type\\s*)?\\{[\\s\\S]*?\\}\\s*from\\s*["']\\.\\/${baseName}-part-01["'];\\n*`,
    "g"
  ),
  ""
);
s2 = s2.replace(
  new RegExp(`import\\s*\\{[\\s\\S]*?\\}\\s*from\\s*["']\\.\\/${baseName}-part-02["'];\\n*`, "g"),
  ""
);

// Drop duplicate import/header from s2: keep only export declarations and after first export
const exportIdx = s2.search(/^export\s+/m);
if (exportIdx < 0) {
  console.error("no export in part-02");
  process.exit(1);
}
const body2 = s2.slice(exportIdx);

// Also strip from s1 any import of part-02
s1 = s1.replace(
  new RegExp(
    `import\\s*\\{[\\s\\S]*?\\}\\s*from\\s*["']\\.\\/${baseName}-part-02["'];\\n*`,
    "g"
  ),
  ""
);

const combined =
  `// Behavior-freeze module (recombined after unsafe nested split).\n\n` +
  s1.replace(/\s*$/, "") +
  "\n\n" +
  body2.replace(/^\s*/, "").replace(/\s*$/, "") +
  "\n";

fs.writeFileSync(facade, combined);
fs.unlinkSync(p1);
fs.unlinkSync(p2);
console.log("recombined", facade, "lines", combined.split(/\n/).length);
