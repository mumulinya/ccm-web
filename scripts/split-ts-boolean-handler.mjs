#!/usr/bin/env node
/**
 * Split a single exported boolean pathname handler into two parts + thin facade wrapper.
 * Usage: node scripts/split-ts-boolean-handler.mjs <file.ts> <exportName> <splitAtLine>
 */
import fs from "fs";
import path from "path";

const [filePath, exportName, splitAtArg] = process.argv.slice(2);
if (!filePath || !exportName || !splitAtArg) {
  console.error("Usage: node scripts/split-ts-boolean-handler.mjs <file.ts> <exportName> <splitAtLine>");
  process.exit(1);
}

const abs = path.resolve(filePath);
const lines = fs.readFileSync(abs, "utf8").split(/\r?\n/);
const splitAt = Number(splitAtArg) - 1;

let start = -1;
const startRe = new RegExp(`^export\\s+function\\s+${exportName}\\b`);
for (let i = 0; i < lines.length; i++) {
  if (startRe.test(lines[i])) { start = i; break; }
}
if (start < 0) {
  console.error("export not found");
  process.exit(1);
}

let depth = 0, seen = false, end = -1;
for (let i = start; i < lines.length; i++) {
  for (const ch of lines[i]) {
    if (ch === "{") { depth++; seen = true; }
    if (ch === "}") depth--;
  }
  if (seen && depth === 0) { end = i; break; }
}
if (end < 0 || splitAt <= start || splitAt >= end) {
  console.error("bad split bounds", { start: start + 1, end: end + 1, splitAt: splitAt + 1 });
  process.exit(1);
}

const sigLine = lines[start];
const sigMatch = sigLine.match(/^export\s+function\s+\w+(\([^;{]*\))\s*(?::\s*([^{]+))?/);
if (!sigMatch) {
  // multi-line signature — collect until `{`
  let sig = sigLine;
  let j = start;
  while (!/\{/.test(sig) && j < end) {
    j++;
    sig += "\n" + lines[j];
  }
  const m = sig.match(/^export\s+function\s+(\w+)(\([\s\S]*?\))\s*(?::\s*([^{]+))?\s*\{/);
  if (!m) {
    console.error("cannot parse signature");
    process.exit(1);
  }
  var params = m[2];
  var retAnno = m[3] ? `: ${m[3].trim()}` : ": boolean";
  var bodyStartLine = j + 1;
  // first line may have `{  if` on same line
  var firstBodyFrag = "";
  const braceIdx = lines[j].indexOf("{");
  if (braceIdx >= 0) {
    firstBodyFrag = lines[j].slice(braceIdx + 1);
  }
} else {
  var params = sigMatch[1];
  var retAnno = sigMatch[2] ? `: ${sigMatch[2].trim()}` : ": boolean";
  var bodyStartLine = start + 1;
  var firstBodyFrag = "";
  if (sigLine.includes("{")) {
    firstBodyFrag = sigLine.slice(sigLine.indexOf("{") + 1);
    bodyStartLine = start + 1;
  }
}

const header = lines.slice(0, start).join("\n").replace(/\n+$/, "");
const bodyLines = [];
if (firstBodyFrag && firstBodyFrag.trim()) bodyLines.push(firstBodyFrag);
for (let i = bodyStartLine; i < end; i++) bodyLines.push(lines[i]);

// Map bodyLines indices to absolute lines for split
// Absolute splitAt corresponds to body offset:
const absBodyStart = firstBodyFrag && firstBodyFrag.trim()
  ? (sigLine.includes("{") ? start : bodyStartLine - 1)
  : bodyStartLine;

// Rebuild: body content as lines[start] may contain `{  if...`
// Simpler approach: take lines[start..end] and surgically rewrite

const fullFnLines = lines.slice(start, end + 1);
// Find first `{` in fullFnLines
let openLine = 0, openCol = -1;
outer: for (let i = 0; i < fullFnLines.length; i++) {
  const idx = fullFnLines[i].indexOf("{");
  if (idx >= 0) { openLine = i; openCol = idx; break outer; }
}
const prefix = fullFnLines.slice(0, openLine);
const openLineRest = fullFnLines[openLine].slice(openCol + 1);
const inner = [];
if (openLineRest.trim()) inner.push(openLineRest);
for (let i = openLine + 1; i < fullFnLines.length - 1; i++) inner.push(fullFnLines[i]);
// last line is closing `}`

// splitAt is absolute line in file; convert to inner index
const firstInnerAbsLine = (openLineRest.trim() ? start + openLine : start + openLine + 1);
let innerSplit;
if (openLineRest.trim()) {
  // first inner line is on absolute start+openLine
  innerSplit = splitAt - (start + openLine);
} else {
  innerSplit = splitAt - (start + openLine + 1);
}
if (innerSplit <= 0 || innerSplit >= inner.length) {
  console.error("inner split out of range", { innerSplit, innerLen: inner.length, firstInnerAbsLine });
  process.exit(1);
}

const partAInner = inner.slice(0, innerSplit);
const partBInner = inner.slice(innerSplit);

const base = path.basename(abs, ".ts");
const dir = path.dirname(abs);
const nameA = `${exportName}PartA`;
const nameB = `${exportName}PartB`;
const out1 = path.join(dir, `${base}-part-01.ts`);
const out2 = path.join(dir, `${base}-part-02.ts`);
if (fs.existsSync(out1) || fs.existsSync(out2)) {
  console.error("outputs exist");
  process.exit(1);
}

const argNames = params
  .replace(/^\(/, "")
  .replace(/\)$/, "")
  .split(",")
  .map((p) => p.trim().split(":")[0].trim().split("=")[0].trim())
  .filter(Boolean);
const callArgs = argNames.join(", ");

const part1 = [
  `// Behavior-freeze split from ${path.basename(abs)} (part 1/2).`,
  "",
  header,
  "",
  `export function ${nameA}${params}${retAnno} {`,
  ...partAInner,
  "  return false;",
  "}",
  "",
].join("\n");

const part2 = [
  `// Behavior-freeze split from ${path.basename(abs)} (part 2/2).`,
  "",
  header,
  "",
  `export function ${nameB}${params}${retAnno} {`,
  ...partBInner,
  "}",
  "",
].join("\n");

const facade = [
  "// Behavior-freeze facade — implementation split into focused modules.",
  `import { ${nameA} } from "./${base}-part-01";`,
  `import { ${nameB} } from "./${base}-part-02";`,
  "",
  `export { ${nameA}, ${nameB} };`,
  "",
  `export function ${exportName}${params}${retAnno} {`,
  `  if (${nameA}(${callArgs})) return true;`,
  `  return ${nameB}(${callArgs});`,
  "}",
  "",
].join("\n");

fs.writeFileSync(out1, part1);
fs.writeFileSync(out2, part2);
fs.writeFileSync(abs, facade);

console.log(JSON.stringify({
  file: filePath,
  part1: path.relative(process.cwd(), out1),
  part1Lines: part1.split(/\r?\n/).length,
  part2: path.relative(process.cwd(), out2),
  part2Lines: part2.split(/\r?\n/).length,
  facadeLines: facade.split(/\r?\n/).length,
}, null, 2));
