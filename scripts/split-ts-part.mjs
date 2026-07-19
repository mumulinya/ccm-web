#!/usr/bin/env node
/**
 * Behavior-freeze mechanical split for a TypeScript module at an export boundary.
 * Usage: node scripts/split-ts-part.mjs <file.ts> [splitAtExportIndex]
 * Creates <base>-part-01.ts / <base>-part-02.ts (or nested *-part-N-part-01/02)
 * and replaces the original with a facade re-export.
 */
import fs from "fs";
import path from "path";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/split-ts-part.mjs <file.ts> [splitAtLine]");
  process.exit(1);
}

const abs = path.resolve(filePath);
const src = fs.readFileSync(abs, "utf8");
const lines = src.split(/\r?\n/);
const totalLines = lines.length;

// Find export starts (top-level export declarations)
const exportStarts = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (/^export\s+/.test(line) && !/^export\s+\{/.test(line) && !/^export\s+\*/.test(line) && !/^export\s+type\s+\{/.test(line)) {
    exportStarts.push(i);
  }
}

if (exportStarts.length < 2) {
  console.error(`Not enough top-level exports to split: ${exportStarts.length} in ${filePath}`);
  process.exit(1);
}

const requestedSplitLine = process.argv[3] ? Number(process.argv[3]) : null;
let splitExportIdx;
if (requestedSplitLine != null && Number.isFinite(requestedSplitLine)) {
  // Find first export at or after requested line (1-based)
  const target = requestedSplitLine - 1;
  splitExportIdx = exportStarts.findIndex((idx) => idx >= target);
  if (splitExportIdx <= 0) splitExportIdx = Math.floor(exportStarts.length / 2);
} else {
  // Aim for ~half by line count
  const mid = Math.floor(totalLines / 2);
  splitExportIdx = exportStarts.findIndex((idx) => idx >= mid);
  if (splitExportIdx <= 0) splitExportIdx = Math.max(1, Math.floor(exportStarts.length / 2));
}

const splitLine = exportStarts[splitExportIdx]; // 0-based

// Header: everything before first export
const firstExport = exportStarts[0];
const headerLines = lines.slice(0, firstExport);

// Strip trailing blank lines from header
while (headerLines.length && headerLines[headerLines.length - 1].trim() === "") {
  headerLines.pop();
}

const part1Body = lines.slice(firstExport, splitLine);
const part2Body = lines.slice(splitLine);

// Trim trailing empties from bodies
function trimTrailing(arr) {
  const out = [...arr];
  while (out.length && out[out.length - 1].trim() === "") out.pop();
  return out;
}

const base = abs.replace(/\.ts$/, "");
const baseName = path.basename(base);
const dir = path.dirname(abs);

// Naming: if file is already *-part-NN.ts, nest; else create -part-01/-part-02
const alreadyPart = /^(.*)-part-(\d+)$/.exec(baseName);
let part1Path, part2Path, facadeContent, label;
if (alreadyPart) {
  part1Path = path.join(dir, `${baseName}-part-01.ts`);
  part2Path = path.join(dir, `${baseName}-part-02.ts`);
  facadeContent = [
    "// Behavior-freeze facade — implementation split into focused modules.",
    `export * from "./${baseName}-part-01";`,
    `export * from "./${baseName}-part-02";`,
    "",
  ].join("\n");
  label = `${baseName}-part-01/02`;
} else {
  part1Path = path.join(dir, `${baseName}-part-01.ts`);
  part2Path = path.join(dir, `${baseName}-part-02.ts`);
  facadeContent = [
    "// Behavior-freeze facade — implementation split into focused modules.",
    `export * from "./${baseName}-part-01";`,
    `export * from "./${baseName}-part-02";`,
    "",
  ].join("\n");
  label = `${baseName}-part-01/02`;
}

if (fs.existsSync(part1Path) || fs.existsSync(part2Path)) {
  console.error(`Target part files already exist:\n  ${part1Path}\n  ${part2Path}`);
  process.exit(1);
}

const part1Rel = `./${path.basename(part1Path).replace(/\.ts$/, "")}`;

// Collect exported names from part1
const part1ExportNames = [];
const exportNameRe =
  /^export\s+(?:async\s+)?(?:function|class|const|let|var|type|interface|enum)\s+([A-Za-z_$][\w$]*)/;
const exportTypeAliasRe = /^export\s+type\s+([A-Za-z_$][\w$]*)/;
for (const line of part1Body) {
  let m = line.match(exportNameRe) || line.match(exportTypeAliasRe);
  if (m) part1ExportNames.push(m[1]);
}

// Detect which part1 names are referenced in part2 body
const part2Text = part2Body.join("\n");
const usedFromPart1 = part1ExportNames.filter((name) => {
  const re = new RegExp(`\\b${name}\\b`);
  return re.test(part2Text);
});

const headerBlock = headerLines.join("\n");
const banner1 = `// Behavior-freeze split from ${path.basename(abs)} (part 1/2).\n`;
const banner2 = `// Behavior-freeze split from ${path.basename(abs)} (part 2/2).\n`;

let part1Content = banner1 + "\n" + headerBlock + "\n\n" + trimTrailing(part1Body).join("\n") + "\n";
let part2Content = banner2 + "\n" + headerBlock;

if (usedFromPart1.length) {
  // Separate type-only vs value exports for cleaner imports (best-effort)
  const typeOnly = new Set();
  for (const line of part1Body) {
    const tm = line.match(/^export\s+type\s+([A-Za-z_$][\w$]*)/);
    const im = line.match(/^export\s+interface\s+([A-Za-z_$][\w$]*)/);
    if (tm) typeOnly.add(tm[1]);
    if (im) typeOnly.add(im[1]);
  }
  const valueImports = usedFromPart1.filter((n) => !typeOnly.has(n));
  const typeImports = usedFromPart1.filter((n) => typeOnly.has(n));
  part2Content += "\n\n";
  if (valueImports.length) {
    part2Content += `import {\n  ${valueImports.join(",\n  ")},\n} from "${part1Rel}";\n`;
  }
  if (typeImports.length) {
    part2Content += `import type {\n  ${typeImports.join(",\n  ")},\n} from "${part1Rel}";\n`;
  }
}

part2Content += "\n" + trimTrailing(part2Body).join("\n") + "\n";

fs.writeFileSync(part1Path, part1Content, "utf8");
fs.writeFileSync(part2Path, part2Content, "utf8");
fs.writeFileSync(abs, facadeContent, "utf8");

const c1 = part1Content.split(/\r?\n/).length;
const c2 = part2Content.split(/\r?\n/).length;
const cf = facadeContent.split(/\r?\n/).length;
console.log(JSON.stringify({
  file: filePath,
  totalBefore: totalLines,
  splitAtLine: splitLine + 1,
  splitExport: lines[splitLine].slice(0, 80),
  part1: path.relative(process.cwd(), part1Path),
  part1Lines: c1,
  part2: path.relative(process.cwd(), part2Path),
  part2Lines: c2,
  facadeLines: cf,
  importedFromPart1: usedFromPart1.length,
}, null, 2));
