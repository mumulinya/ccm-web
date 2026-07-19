const fs = require("fs");
const ts = require("typescript");

function extractImports(text) {
  const sf = ts.createSourceFile("x.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return sf.statements
    .filter((s) => ts.isImportDeclaration(s))
    .map((s) => text.slice(s.getFullStart(), s.end).trim());
}
function mod(b) {
  const m = b.match(/from\s+["']([^"']+)["']/);
  return m ? m[1] : "";
}

const p01 = "backend/modules/collaboration/collaboration-task-card-part-01.ts";
const external = extractImports(fs.readFileSync(p01, "utf8")).filter(
  (b) => !mod(b).includes("collaboration-task-card-part-")
);

for (const f of [
  "backend/modules/collaboration/collaboration-task-card-part-02-part-01.ts",
  "backend/modules/collaboration/collaboration-task-card-part-02-part-02.ts",
]) {
  let t = fs.readFileSync(f, "utf8");
  const existing = new Set(extractImports(t).map(mod));
  const missing = external.filter((b) => !existing.has(mod(b)));
  if (!missing.length) {
    console.log("ok", f);
    continue;
  }
  const lines = t.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && (lines[i].startsWith("//") || !lines[i].trim())) i++;
  lines.splice(i, 0, missing.join("\n\n") + "\n");
  fs.writeFileSync(f, lines.join("\n"));
  console.log("patched", f, missing.length);
}

fs.writeFileSync(
  "backend/modules/collaboration/collaboration-task-card-part-02.ts",
  [
    "// Behavior-freeze facade — implementation split into focused modules.",
    'export * from "./collaboration-task-card-part-02-part-01";',
    'export * from "./collaboration-task-card-part-02-part-02";',
    "",
  ].join("\n")
);
console.log("facade cleaned");
