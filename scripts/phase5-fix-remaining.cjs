const fs = require("fs");
const path = require("path");

// 1) Undo server-agent-runner nested extraction: merge nested back into host
const nestedPath = "backend/server-agent-runner-nested-01.ts";
const hostPath = "backend/server-agent-runner.ts";
if (fs.existsSync(nestedPath) && fs.existsSync(hostPath)) {
  let nested = fs.readFileSync(nestedPath, "utf8");
  let host = fs.readFileSync(hostPath, "utf8");
  // Strip nested header/imports; keep exported functions, un-export and indent into host... 
  // Simpler: remove import of nested from host and paste nested function bodies (as nested decls) back.
  // Even simpler given broken state: delete nested file and remove its import from host;
  // paste the function source (without export) at the start of createAgentRunnerRuntime body.

  // Extract function bodies from nested (from first export function)
  const nLines = nested.split(/\r?\n/);
  let bodyStart = nLines.findIndex((l) => /^export (async )?function /.test(l));
  if (bodyStart < 0) throw new Error("no nested body");
  let funcs = nLines
    .slice(bodyStart)
    .join("\n")
    .replace(/^export /gm, "")
    .trim();
  // indent by 2 for inside createAgentRunnerRuntime
  funcs = funcs
    .split("\n")
    .map((l) => (l.length ? "  " + l : l))
    .join("\n");

  // Remove import of nested from host
  host = host.replace(/import\s*\{[^}]*\}\s*from\s*["']\.\/server-agent-runner-nested-01["'];?\n*/g, "");
  // Also remove multi-line import
  host = host.replace(/import\s*\{[\s\S]*?\}\s*from\s*["']\.\/server-agent-runner-nested-01["'];?\n*/g, "");

  // Insert after opening of createAgentRunnerRuntime
  const marker = /export function createAgentRunnerRuntime\([^)]*\)\s*\{\n/;
  if (!marker.test(host)) {
    // try without export
    const m2 = /function createAgentRunnerRuntime\([^)]*\)\s*\{\n/;
    if (!m2.test(host)) throw new Error("cannot find createAgentRunnerRuntime");
    host = host.replace(m2, (mm) => mm + funcs + "\n\n");
  } else {
    host = host.replace(marker, (mm) => mm + funcs + "\n\n");
  }
  fs.writeFileSync(hostPath, host, "utf8");
  fs.unlinkSync(nestedPath);
  console.log("merged nested back into", hostPath, "lines", host.split(/\n/).length);
}

// 2) Fix export-let reassignment across parts: add setters + rewrite assignments
function addSetterAndRewrite(declFile, name, assignFiles) {
  let decl = fs.readFileSync(declFile, "utf8");
  const setter = `set_${name}`;
  const setterName = `set${name[0].toUpperCase()}${name.slice(1)}`;
  if (!decl.includes(`export function ${setterName}`)) {
    // insert after the let declaration line
    const re = new RegExp(`(export let ${name}[^\n]*\n)`);
    if (!re.test(decl)) {
      console.log("missing decl", name, declFile);
      return;
    }
    decl = decl.replace(
      re,
      `$1\nexport function ${setterName}(value: typeof ${name}) {\n  ${name} = value;\n  return ${name};\n}\n`
    );
    fs.writeFileSync(declFile, decl, "utf8");
    console.log("added setter", setterName, "in", declFile);
  }
  for (const f of assignFiles) {
    let t = fs.readFileSync(f, "utf8");
    // ensure setter imported
    const from = "./" + path.basename(declFile, ".ts");
    // relative
    let rel = path.relative(path.dirname(f), declFile).replace(/\\/g, "/").replace(/\.ts$/, "");
    if (!rel.startsWith(".")) rel = "./" + rel;
    if (!t.includes(setterName)) {
      // add to an existing import from that module or new import
      const importRe = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*["']${rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'];`);
      if (importRe.test(t)) {
        t = t.replace(importRe, (m, inner) => {
          if (inner.includes(setterName)) return m;
          return `import {${inner.trim().replace(/\s+$/, "")},\n  ${setterName},\n} from "${rel}";`;
        });
      } else {
        // insert after header comments
        const lines = t.split(/\r?\n/);
        let i = 0;
        while (i < lines.length && (lines[i].startsWith("//") || !lines[i].trim())) i++;
        lines.splice(i, 0, `import { ${setterName} } from "${rel}";\n`);
        t = lines.join("\n");
      }
    }
    // rewrite assignments: name = -> setterName(
    // careful: only assignment statements
    t = t.replace(new RegExp(`^(\\s*)${name}\\s*=\\s*`, "gm"), `$1${setterName}(`);
    // fix trailing to close paren before statement end — naive: only simple assigns ending with ;
    // configuredX = expr; -> setX(expr);  already became setX(expr;  need closing )
    // Better approach: replace `name = ` with `void (${name} = ` no that doesn't work for imports.

    // Re-do more carefully: match full assignment lines
    fs.writeFileSync(f, t, "utf8");
    console.log("rewrote assigns in", f);
  }
}

// More careful assignment rewrite
function rewriteAssignments(file, name, setterName) {
  let t = fs.readFileSync(file, "utf8");
  const lines = t.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(new RegExp(`^(\\s*)${name}\\s*=\\s*(.*)$`));
    if (m) {
      let expr = m[2];
      // may be multi-line — if no semicolon and unbalanced, keep collecting
      let buf = expr;
      let j = i;
      const open = () => (buf.match(/\(/g) || []).length - (buf.match(/\)/g) || []).length;
      const braces = () => (buf.match(/\{/g) || []).length - (buf.match(/\}/g) || []).length;
      while ((!/;\s*$/.test(buf) || open() > 0 || braces() > 0) && j + 1 < lines.length) {
        // if already complete with ;
        if (/;\s*$/.test(buf) && open() <= 0 && braces() <= 0) break;
        if (/;\s*$/.test(buf) && open() <= 0 && braces() <= 0) break;
        if (/;\s*$/.test(lines[j]) && j === i && open() <= 0) break;
        if (j > i) buf += "\n" + lines[j];
        if (/;\s*$/.test(buf) && open() <= 0 && braces() <= 0) break;
        j++;
        if (j > i) {
          /* continue */
        }
        if (j === i) {
          /* first */
        }
        if (j > i && j < lines.length) {
          // handled
        }
        break; // simplify: single-line only
      }
      if (/;\s*$/.test(expr)) {
        expr = expr.replace(/;\s*$/, "");
        out.push(`${m[1]}${setterName}(${expr});`);
      } else {
        // single-line ternary etc without collecting
        out.push(`${m[1]}${setterName}(${expr.replace(/;\s*$/, "")});`);
      }
    } else {
      out.push(lines[i]);
    }
  }
  // Fix botched earlier rewrite setX(expr; 
  let text = out.join("\n");
  text = text.replace(new RegExp(`${setterName}\\(([^;\\n]+);`, "g"), `${setterName}($1);`);
  // Fix double call setX(setX(
  text = text.replace(new RegExp(`${setterName}\\(\\s*${setterName}\\(`, "g"), `${setterName}(`);
  fs.writeFileSync(file, text, "utf8");
}

// Reset assign files from git? They may have been half-rewritten. Read current and fix properly.

function ensureSetter(declFile, name) {
  const setterName = `set${name[0].toUpperCase()}${name.slice(1)}`;
  let decl = fs.readFileSync(declFile, "utf8");
  if (!decl.includes(`function ${setterName}`)) {
    const re = new RegExp(`(export let ${name}[^\n]*\n)`);
    if (!re.test(decl)) {
      console.log("NO DECL", name);
      return null;
    }
    decl = decl.replace(
      re,
      `$1\nexport function ${setterName}(value: any) {\n  ${name} = value;\n  return ${name};\n}\n`
    );
    fs.writeFileSync(declFile, decl, "utf8");
    console.log("setter", setterName);
  }
  return setterName;
}

function fixMutable(declFile, name, assignFile) {
  const setterName = ensureSetter(declFile, name);
  if (!setterName) return;
  let t = fs.readFileSync(assignFile, "utf8");
  let rel = path.relative(path.dirname(assignFile), declFile).replace(/\\/g, "/").replace(/\.ts$/, "");
  if (!rel.startsWith(".")) rel = "./" + rel;
  if (!new RegExp(`\\b${setterName}\\b`).test(t.slice(0, 4000))) {
    const lines = t.split(/\r?\n/);
    let i = 0;
    while (i < lines.length && (lines[i].startsWith("//") || !lines[i].trim())) i++;
    lines.splice(i, 0, `import { ${setterName} } from "${rel}";\n`);
    t = lines.join("\n");
  }
  // Also add to existing import from rel if present
  const importRe = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*["']${rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'];`, "m");
  if (importRe.test(t) && !t.match(importRe)[0].includes(setterName)) {
    t = t.replace(importRe, (m, inner) => `import {\n  ${inner.trim()},\n  ${setterName},\n} from "${rel}";`);
  }
  // Replace assignment statements
  t = t.replace(new RegExp(`^(\\s*)${name}\\s*=\\s*([^;]+);\\s*$`, "gm"), `$1${setterName}($2);`);
  fs.writeFileSync(assignFile, t, "utf8");
  console.log("fixed mutable", name, "in", assignFile);
}

fixMutable(
  "backend/modules/collaboration/group-memory-loading-part-01.ts",
  "configuredGroupTypedMemoryManifestSelectorExecutor",
  "backend/modules/collaboration/group-memory-loading-part-02.ts"
);
fixMutable(
  "backend/modules/collaboration/group-session-memory-model-extraction-part-01.ts",
  "configuredExecutor",
  "backend/modules/collaboration/group-session-memory-model-extraction-part-02.ts"
);
fixMutable(
  "backend/modules/collaboration/group-session-memory-model-extraction-part-01.ts",
  "appendHookRegistered",
  "backend/modules/collaboration/group-session-memory-model-extraction-part-03.ts"
);

console.log("done");
