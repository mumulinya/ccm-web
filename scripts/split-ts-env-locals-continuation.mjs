#!/usr/bin/env node
/**
 * Split executeMentionJobTryA-style functions that restore from env._locals.
 * At split point, snapshot all `let` bindings into env._locals and call continuation.
 *
 * Usage: node scripts/split-ts-env-locals-continuation.mjs <file.ts> <exportName> <splitAtLine> <continuedName>
 */
import fs from "fs";
import path from "path";

const [filePath, exportName, splitAtArg, continuedName] = process.argv.slice(2);
const abs = path.resolve(filePath);
const lines = fs.readFileSync(abs, "utf8").split(/\r?\n/);
const splitAt = Number(splitAtArg) - 1;

let start = -1;
const startRe = new RegExp(`^export\\s+async\\s+function\\s+${exportName}\\b`);
for (let i = 0; i < lines.length; i++) {
  if (startRe.test(lines[i])) { start = i; break; }
}
if (start < 0) { console.error("not found"); process.exit(1); }

let depth = 0, seen = false, end = -1;
for (let i = start; i < lines.length; i++) {
  for (const ch of lines[i]) {
    if (ch === "{") { depth++; seen = true; }
    if (ch === "}") depth--;
  }
  if (seen && depth === 0) { end = i; break; }
}
if (end < 0 || splitAt <= start + 5 || splitAt >= end - 5) {
  console.error("bad bounds", { start: start + 1, end: end + 1, splitAt: splitAt + 1 });
  process.exit(1);
}

const sigLine = lines[start];
const paramsMatch = sigLine.match(/function\s+\w+(\([^)]*\))\s*(?::\s*([^{]+))?/);
const params = paramsMatch[1];
const retAnno = paramsMatch[2] ? `: ${paramsMatch[2].trim()}` : `: Promise<string[]>`;

const header = lines.slice(0, start).join("\n").replace(/\n+$/, "");
const bodyBefore = lines.slice(start + 1, splitAt);
const bodyAfter = lines.slice(splitAt, end);
const afterFn = lines.slice(end + 1).join("\n");

// Collect let bindings declared in bodyBefore (top-level-ish in function)
const letNames = new Set();
for (const line of bodyBefore) {
  const m = line.match(/^\s*let\s+([A-Za-z_$][\w$]*)/);
  if (m) letNames.add(m[1]);
  // also `let a = ..., b = ...` single-line
  const multi = line.match(/^\s*let\s+(.+);?\s*$/);
  if (multi && !m) {
    for (const part of multi[1].split(",")) {
      const n = part.trim().match(/^([A-Za-z_$][\w$]*)/);
      if (n) letNames.add(n[1]);
    }
  }
}
// Always include outputs if referenced
const names = [...letNames];
const handoffObj = names.map((n) => n).join(", ");

const base = path.basename(abs, ".ts");
const dir = path.dirname(abs);
const out1 = path.join(dir, `${base}-part-01.ts`);
const out2 = path.join(dir, `${base}-part-02.ts`);
if (fs.existsSync(out1) || fs.existsSync(out2)) {
  console.error("exists");
  process.exit(1);
}

const part1 = [
  `// Behavior-freeze continuation split from ${path.basename(abs)} (part 1/2).`,
  "",
  header,
  "",
  `import { ${continuedName} } from "./${base}-part-02";`,
  "",
  `export async function ${exportName}${params}${retAnno} {`,
  ...bodyBefore,
  `  env._locals = { ...(env._locals || {}), ${handoffObj} };`,
  `  return ${continuedName}(mention, env);`,
  "}",
  afterFn ? "\n" + afterFn.replace(/^\n+/, "") : "",
  "",
].join("\n");

// Continuation restores lets from L like the original start does — inject after deps destructure if present
const restore = [
  "  const L = env._locals || {};",
  ...names.map((n) => `  let ${n} = L.${n};`),
].join("\n");

// If bodyAfter already starts with const L = env._locals, don't double
let afterBody = bodyAfter;
if (/^\s*const L = env\._locals/.test(afterBody[0] || "")) {
  // keep as-is
} else {
  afterBody = [restore, "", ...bodyAfter];
}

const part2 = [
  `// Behavior-freeze continuation split from ${path.basename(abs)} (part 2/2).`,
  "",
  header,
  "",
  `export async function ${continuedName}${params}${retAnno} {`,
  // Need deps destructure from original start of function — copy from bodyBefore until after deps block
  ...(() => {
    // Reuse the same preamble from bodyBefore: everything until first real logic after `const L = env._locals`
    const preamble = [];
    let i = 0;
    for (; i < bodyBefore.length; i++) {
      preamble.push(bodyBefore[i]);
      if (/const L = env\._locals/.test(bodyBefore[i])) {
        // skip original let restorations from L in preamble — continuation uses our restore
        // Actually original TryA has: const L = ...; then many let x = L.x || ...
        // Copy deps destructure only (before const L)
        break;
      }
    }
    // Find deps destructure end — preamble should be lines before const L
    const depsOnly = [];
    for (let j = 0; j < bodyBefore.length; j++) {
      if (/const L = env\._locals/.test(bodyBefore[j])) break;
      depsOnly.push(bodyBefore[j]);
    }
    return depsOnly;
  })(),
  restore,
  "",
  ...bodyAfter,
  "}",
  "",
].join("\n");

const facade = [
  "// Behavior-freeze facade — implementation split into focused modules.",
  `export * from "./${base}-part-01";`,
  `export * from "./${base}-part-02";`,
  "",
].join("\n");

fs.writeFileSync(out1, part1);
fs.writeFileSync(out2, part2);
fs.writeFileSync(abs, facade);

console.log(JSON.stringify({
  file: filePath,
  letBindings: names.length,
  names: names.slice(0, 40),
  part1Lines: part1.split(/\r?\n/).length,
  part2Lines: part2.split(/\r?\n/).length,
}, null, 2));
