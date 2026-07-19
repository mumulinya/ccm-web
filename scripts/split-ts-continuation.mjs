#!/usr/bin/env node
/**
 * Split a single giant exported function into fn + fnContinued with env._locals handoff,
 * OR for non-env handlers, into two sequential exported helpers called from a thin wrapper.
 *
 * Usage:
 *   node scripts/split-ts-continuation.mjs <file.ts> <exportName> <splitAtLine> <continuedName>
 */
import fs from "fs";
import path from "path";

const [filePath, exportName, splitAtArg, continuedName] = process.argv.slice(2);
if (!filePath || !exportName || !splitAtArg || !continuedName) {
  console.error("Usage: node scripts/split-ts-continuation.mjs <file.ts> <exportName> <splitAtLine> <continuedName>");
  process.exit(1);
}

const abs = path.resolve(filePath);
const src = fs.readFileSync(abs, "utf8");
const lines = src.split(/\r?\n/);
const splitAt = Number(splitAtArg) - 1; // 0-based

// Find export function start
let start = -1;
const startRe = new RegExp(`^export\\s+(async\\s+)?function\\s+${exportName}\\b`);
for (let i = 0; i < lines.length; i++) {
  if (startRe.test(lines[i])) { start = i; break; }
}
if (start < 0) {
  console.error(`Export ${exportName} not found`);
  process.exit(1);
}

const isAsync = /export\s+async\s+function/.test(lines[start]);

// Find matching closing brace for the function (naive brace count from start line)
let depth = 0;
let end = -1;
let seen = false;
for (let i = start; i < lines.length; i++) {
  const line = lines[i];
  for (const ch of line) {
    if (ch === "{") { depth++; seen = true; }
    if (ch === "}") depth--;
  }
  if (seen && depth === 0) { end = i; break; }
}
if (end < 0) {
  console.error("Could not find function end");
  process.exit(1);
}

if (splitAt <= start || splitAt >= end) {
  console.error(`splitAtLine must be inside function body (${start + 1}..${end + 1})`);
  process.exit(1);
}

const header = lines.slice(0, start);
const sigLine = lines[start];
// Extract params from signature — keep full signature for both
const sigMatch = sigLine.match(/^export\s+(async\s+)?function\s+\w+(\([^;{]*\))\s*(?::\s*([^{]+))?\s*\{/);
if (!sigMatch) {
  console.error("Could not parse signature:", sigLine.slice(0, 120));
  process.exit(1);
}
const params = sigMatch[2];
const retType = (sigMatch[3] || "").trim();
const retAnno = retType ? `: ${retType}` : "";

const bodyBefore = lines.slice(start + 1, splitAt);
const bodyAfter = lines.slice(splitAt, end);
const afterFn = lines.slice(end + 1);

const base = path.basename(abs).replace(/\.ts$/, "");
const dir = path.dirname(abs);
const alreadyNested = /^(.*)-part-\d+(?:-part-\d+)?$/.test(base);
// Create sibling parts from current file
const part1Path = path.join(dir, `${base}-cont-01.ts`);
const part2Path = path.join(dir, `${base}-cont-02.ts`);
// Prefer nested naming consistent with repo
const p1 = path.join(dir, abs.includes("-part-") ? abs.replace(/\.ts$/, "-part-01.ts").replace(/.*[\\/]/, "") : `${base}-part-01.ts`);
// Simpler: if file is X.ts already a part file with one fn, create X-part-01 and X-part-02
const out1 = path.join(dir, `${base}-part-01.ts`);
const out2 = path.join(dir, `${base}-part-02.ts`);

// If outs exist, use deeper nest
function uniqueOut(preferred) {
  if (!fs.existsSync(preferred)) return preferred;
  const alt = preferred.replace(/\.ts$/, `-split.ts`);
  return alt;
}

// For files already named *-part-02-part-02.ts, nest further as *-part-02-part-02-part-01/02
const nestBase = base;
const fileOut1 = path.join(dir, `${nestBase}-part-01.ts`);
const fileOut2 = path.join(dir, `${nestBase}-part-02.ts`);
if (fs.existsSync(fileOut1) || fs.existsSync(fileOut2)) {
  console.error("Outputs already exist", fileOut1, fileOut2);
  process.exit(1);
}

const banner1 = `// Behavior-freeze continuation split from ${path.basename(abs)} (part 1/2).\n`;
const banner2 = `// Behavior-freeze continuation split from ${path.basename(abs)} (part 2/2).\n`;

const headerText = header.join("\n").replace(/\n+$/, "");

// Detect if env param exists for _locals handoff
const hasEnv = /\benv\b/.test(params);

const continuedSig = `export ${isAsync ? "async " : ""}function ${continuedName}${params}${retAnno}`;
const originalSig = `export ${isAsync ? "async " : ""}function ${exportName}${params}${retAnno}`;

let handoff;
if (hasEnv) {
  handoff = [
    "  // Behavior-freeze: hand off locals to continuation",
    "  env._locals = { ...(env._locals || {}) };",
    `  return ${isAsync ? "await " : ""}${continuedName}${params};`,
  ].join("\n");
} else {
  // For handlers without env, just call continued with same args — bodyAfter must be self-contained via shared mutable ctx
  // Instead wrap: part1 ends by returning continued(...args)
  const argNames = params
    .replace(/^\(/, "")
    .replace(/\)$/, "")
    .split(",")
    .map((p) => p.trim().split(":")[0].trim().split("=")[0].trim())
    .filter(Boolean);
  handoff = `  return ${isAsync ? "await " : ""}${continuedName}(${argNames.join(", ")});`;
}

const part1Body = [
  originalSig + " {",
  ...bodyBefore,
  handoff,
  "}",
].join("\n");

const part2Body = [
  continuedSig + " {",
  ...bodyAfter,
  "}",
].join("\n");

// part2 needs to import nothing from part1 if continued is separate; part1 imports continued from part2
const part1Import = `\nimport { ${continuedName} } from "./${nestBase}-part-02";\n`;

const part1Content = banner1 + "\n" + headerText + part1Import + "\n" + part1Body + "\n" + afterFn.join("\n").replace(/^\n+/, "");
const part2Content = banner2 + "\n" + headerText + "\n\n" + part2Body + "\n";

const facade = [
  "// Behavior-freeze facade — implementation split into focused modules.",
  `export * from "./${nestBase}-part-01";`,
  `export * from "./${nestBase}-part-02";`,
  "",
].join("\n");

fs.writeFileSync(fileOut1, part1Content.endsWith("\n") ? part1Content : part1Content + "\n");
fs.writeFileSync(fileOut2, part2Content.endsWith("\n") ? part2Content : part2Content + "\n");
fs.writeFileSync(abs, facade);

console.log(JSON.stringify({
  file: filePath,
  exportName,
  continuedName,
  splitAtLine: splitAt + 1,
  part1: path.relative(process.cwd(), fileOut1),
  part1Lines: part1Content.split(/\r?\n/).length,
  part2: path.relative(process.cwd(), fileOut2),
  part2Lines: part2Content.split(/\r?\n/).length,
}, null, 2));
