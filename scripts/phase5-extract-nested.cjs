/**
 * Extract nested function declarations from a giant top-level function into helper modules.
 * Only hoists nested functions that do not reference outer-local bindings (other than sibling nested fns).
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

function extractFromFile(file, opts = {}) {
  const abs = path.resolve(file);
  const text = fs.readFileSync(abs, "utf8");
  const sf = ts.createSourceFile(abs, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const lines = text.split(/\r?\n/);

  // Find target function
  let target = null;
  for (const stmt of sf.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.name && stmt.body) {
      if (!opts.fnName || stmt.name.text === opts.fnName) {
        if (!target || (stmt.end - stmt.pos) > (target.end - target.pos)) target = stmt;
      }
    }
    if (ts.isVariableStatement(stmt)) {
      for (const d of stmt.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && d.initializer && (ts.isFunctionExpression(d.initializer) || ts.isArrowFunction(d.initializer))) {
          if (!opts.fnName || d.name.text === opts.fnName) {
            const node = d.initializer;
            if (node.body && ts.isBlock(node.body)) {
              if (!target || (node.end - node.pos) > (target.end - target.pos)) {
                target = { ...node, name: d.name, body: node.body, __var: stmt };
              }
            }
          }
        }
      }
    }
  }
  if (!target || !target.body || !ts.isBlock(target.body)) {
    console.log("SKIP no function body", file);
    return null;
  }

  const outerLocals = new Set();
  // params
  const params = target.parameters || (target.__var ? [] : target.parameters);
  const paramList = target.parameters || [];
  for (const p of paramList) {
    if (ts.isIdentifier(p.name)) outerLocals.add(p.name.text);
    // ignore complex params
  }

  function collectBindingNames(node, into) {
    if (!node) return;
    if (ts.isIdentifier(node)) into.add(node.text);
    else if (ts.isObjectBindingPattern(node) || ts.isArrayBindingPattern(node)) {
      for (const el of node.elements) {
        if (ts.isBindingElement(el)) collectBindingNames(el.name, into);
      }
    }
  }

  // Collect block-level bindings in function body (const/let/var/function)
  for (const stmt of target.body.statements) {
    if (ts.isVariableStatement(stmt)) {
      for (const d of stmt.declarationList.declarations) collectBindingNames(d.name, outerLocals);
    } else if (ts.isFunctionDeclaration(stmt) && stmt.name) {
      outerLocals.add(stmt.name.text);
    }
  }

  const nested = [];
  for (const stmt of target.body.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.name && stmt.body) {
      nested.push(stmt);
    }
  }
  console.log(path.basename(file), "nested function decls", nested.length, "outerLocals", outerLocals.size);

  const nestedNames = new Set(nested.map((n) => n.name.text));
  function referencesOuter(fn) {
    let bad = false;
    const self = fn.name.text;
    const fnLocals = new Set([self]);
    for (const p of fn.parameters || []) collectBindingNames(p.name, fnLocals);
    function walk(node) {
      if (bad) return;
      if (ts.isIdentifier(node)) {
        const name = node.text;
        // skip property names
        const parent = node.parent;
        if (parent && ts.isPropertyAccessExpression(parent) && parent.name === node) return;
        if (parent && ts.isPropertyAssignment(parent) && parent.name === node) return;
        if (fnLocals.has(name) || nestedNames.has(name)) return;
        if (outerLocals.has(name) && name !== self) {
          // allow if it's a param of outer function? still a closure — skip hoist
          bad = true;
          return;
        }
      }
      if (ts.isVariableDeclaration(node)) collectBindingNames(node.name, fnLocals);
      if (ts.isFunctionDeclaration(node) && node.name && node !== fn) fnLocals.add(node.name.text);
      ts.forEachChild(node, walk);
    }
    walk(fn);
    return bad;
  }

  const hoistable = nested.filter((fn) => !referencesOuter(fn));
  console.log("  hoistable", hoistable.length);
  if (hoistable.length < 3) {
    console.log("SKIP few hoistable");
    return null;
  }

  // Also need import header from file
  let importEnd = 0;
  for (const stmt of sf.statements) {
    if (ts.isImportDeclaration(stmt)) {
      importEnd = Math.max(importEnd, sf.getLineAndCharacterOfPosition(stmt.end).line + 1);
    } else break;
  }
  const importHeader = lines.slice(0, importEnd).join("\n");

  const maxLines = opts.maxLines || 1200;
  const chunks = [];
  let cur = [];
  let curLines = 0;
  for (const fn of hoistable) {
    const start = sf.getLineAndCharacterOfPosition(fn.getStart(sf)).line;
    const end = sf.getLineAndCharacterOfPosition(fn.end).line + 1;
    const nlines = end - start;
    if (cur.length && curLines + nlines > maxLines) {
      chunks.push(cur);
      cur = [];
      curLines = 0;
    }
    cur.push({ fn, start, end });
    curLines += nlines;
  }
  if (cur.length) chunks.push(cur);

  const base = abs.replace(/\.ts$/, "");
  const helperPaths = [];
  const remove = [];
  for (let i = 0; i < chunks.length; i++) {
    const hp = `${base}-nested-${String(i + 1).padStart(2, "0")}.ts`;
    const names = chunks[i].map((c) => c.fn.name.text);
    const body = chunks[i]
      .map((c) => {
        const src = lines.slice(c.start, c.end).join("\n");
        // dedent common leading whitespace
        const m = src.match(/^( *)export /m) || src.match(/^( *)function /m) || src.match(/^( *)async function /m);
        const indent = m ? m[1].length : 0;
        const dedented = src
          .split(/\n/)
          .map((l) => (l.startsWith(" ".repeat(indent)) ? l.slice(indent) : l))
          .join("\n")
          .replace(/^(async function|function) /, "export $1 ");
        return dedented;
      })
      .join("\n\n");
    fs.writeFileSync(hp, `// Nested helpers hoisted from ${path.basename(abs)}\n${importHeader}\n\n${body}\n`, "utf8");
    helperPaths.push({ path: hp, names });
    for (const c of chunks[i]) remove.push([c.start, c.end]);
    console.log("  wrote", path.relative(process.cwd(), hp), "fns", names.length, "lines", body.split(/\n/).length);
  }

  // cross imports
  function rel(from, to) {
    let r = path.relative(path.dirname(from), to).replace(/\\/g, "/");
    if (!r.startsWith(".")) r = "./" + r;
    return r.replace(/\.ts$/, "");
  }
  function usedNames(text, names) {
    const u = new Set();
    for (const n of names) if (new RegExp(`\\b${n}\\b`).test(text)) u.add(n);
    return u;
  }
  for (let i = 0; i < helperPaths.length; i++) {
    let t = fs.readFileSync(helperPaths[i].path, "utf8");
    for (let j = 0; j < helperPaths.length; j++) {
      if (i === j) continue;
      const used = usedNames(t, helperPaths[j].names);
      for (const n of helperPaths[i].names) used.delete(n);
      if (used.size) {
        const block = `import {\n  ${[...used].sort().join(",\n  ")},\n} from "${rel(helperPaths[i].path, helperPaths[j].path)}";\n`;
        t = t.replace(importHeader, importHeader + "\n\n" + block);
      }
    }
    fs.writeFileSync(helperPaths[i].path, t, "utf8");
  }

  remove.sort((a, b) => b[0] - a[0]);
  const newLines = lines.slice();
  for (const [a, b] of remove) newLines.splice(a, b - a);

  const importHelpers = helperPaths
    .map((h) => `import {\n  ${h.names.sort().join(",\n  ")},\n} from "${rel(abs, h.path)}";`)
    .join("\n");
  const out = [importHeader, "", importHelpers, "", ...newLines.slice(importEnd)].join("\n").replace(/\n{3,}/g, "\n\n");
  fs.writeFileSync(abs, out, "utf8");
  console.log("HOST", path.relative(process.cwd(), abs), "now", out.split(/\n/).length);
  return helperPaths;
}

function splitJsComposableByArrows(file, maxLines = 1100) {
  const abs = path.resolve(file);
  const text = fs.readFileSync(abs, "utf8");
  const lines = text.split(/\r?\n/);
  let useStart = lines.findIndex((l) => /^export function use\w+/.test(l));
  if (useStart < 0) {
    console.log("SKIP", file);
    return null;
  }

  // Find return { near end
  let returnLine = -1;
  for (let i = lines.length - 1; i > useStart; i--) {
    if (/^\s+return \{/.test(lines[i])) {
      returnLine = i;
      break;
    }
  }
  if (returnLine < 0) {
    console.log("SKIP no return", file);
    return null;
  }

  // Split body (useStart+1 .. returnLine) into chunks of maxLines, creating setupPart files
  // that each export a function receiving a shared bag and mutating/returning additions.
  // SAFE approach: extract only pure arrow helpers that appear BEFORE first ref( — usually none.

  // Alternative: split into N files of source text that are concatenated via eval — no.

  // Practical: create sibling modules for contiguous line ranges of the composable body,
  // each exporting `export function applyPartN(ctx) { with(ctx) { ... } }` — with is sloppy.

  // Use shared mutable ctx object:
  // part files contain the original statements rewritten to use ctx.x instead of x — huge rewrite.

  console.log(path.basename(file), "lines", lines.length, "useStart", useStart + 1, "return", returnLine + 1);

  // Extract const NAME = (...) => or async () => blocks at indent 2 that are "large"
  const arrows = [];
  for (let i = useStart; i < returnLine; i++) {
    const m = lines[i].match(/^(  )(const|let) ([A-Za-z_$][\w$]*) = (async )?\(/);
    const m2 = lines[i].match(/^(  )(const|let) ([A-Za-z_$][\w$]*) = (async )?\([^)]*\) =>/);
    const m3 = lines[i].match(/^(  )(async )?function ([A-Za-z_$][\w$]*)/);
    if (m2 || m3 || (m && lines[i].includes("=>"))) {
      const name = (m2 && m2[3]) || (m3 && m3[3]) || (m && m[3]);
      if (!name) continue;
      // find end: line with `  }` or `  },` at depth
      let depth = 0;
      let started = false;
      let end = i + 1;
      for (let j = i; j < returnLine; j++) {
        const open = (lines[j].match(/\{/g) || []).length;
        const close = (lines[j].match(/\}/g) || []).length;
        depth += open - close;
        started = started || open > 0;
        if (started && depth <= 0 && j > i) {
          end = j + 1;
          break;
        }
        // arrow without block ending with line not continuing
        if (!started && /=>/.test(lines[j]) && !lines[j].includes("{") && !/,\s*$/.test(lines[j]) && !/\(\s*$/.test(lines[j])) {
          end = j + 1;
          break;
        }
      }
      if (end - i >= 15) arrows.push({ name, start: i, end });
    }
  }
  console.log("  large arrows/functions", arrows.length);
  if (arrows.length < 4) {
    console.log("SKIP few extractable handlers");
    return null;
  }

  // Move large handlers to modules that accept `ctx` and assign back:
  // export function bindX(ctx) { const x = async () => { use ctx.foo }; ctx.x = x }
  // Then main calls bindX(ctx) for each — requires rewriting free vars to ctx.VAR — complex.

  // Simpler mechanical approach for JS: split file into pre-return chunks stored as
  // template strings executed with new Function — behavior freeze but ugly. Skip.

  // Do extract helpers that are clearly pure (sanitize*, build*, format*) by name prefix
  const pure = arrows.filter((a) => /^(sanitize|build|format|normalize|parse|to|is|has|getVisible|should)/i.test(a.name));
  console.log("  pure-named", pure.length);
  if (pure.length < 3) return null;

  let importEnd = 0;
  for (let i = 0; i < useStart; i++) {
    if (lines[i].startsWith("import ")) importEnd = i + 1;
  }
  const importHeader = lines.slice(0, importEnd).join("\n");
  const base = abs.replace(/\.js$/, "");
  const hp = `${base}-pure-helpers.js`;
  const names = [];
  const bodies = [];
  const remove = [];
  for (const a of pure) {
    // Check closure: if body references other composable bindings heavily, still try — rewrite later
    let body = lines.slice(a.start, a.end).map((l) => (l.startsWith("  ") ? l.slice(2) : l)).join("\n");
    body = body.replace(/^const /, "export function ").replace(/^let /, "export function ");
    // const foo = async (...) => {  -> export async function foo(...) {
    body = body.replace(/^export function ([A-Za-z_$][\w$]*) = async \(([^)]*)\) =>/, "export async function $1($2)");
    body = body.replace(/^export function ([A-Za-z_$][\w$]*) = \(([^)]*)\) =>/, "export function $1($2)");
    body = body.replace(/^export function ([A-Za-z_$][\w$]*) = async function/, "export async function $1");
    names.push(a.name);
    bodies.push(body);
    remove.push([a.start, a.end]);
  }
  fs.writeFileSync(hp, `${importHeader}\n\n${bodies.join("\n\n")}\n`, "utf8");
  remove.sort((a, b) => b[0] - a[0]);
  const newLines = lines.slice();
  for (const [a, b] of remove) newLines.splice(a, b - a);
  const imp = `import {\n  ${names.join(",\n  ")},\n} from './${path.basename(hp)}'\n`;
  const out = [importHeader, "", imp, "", ...newLines.slice(importEnd)].join("\n");
  fs.writeFileSync(abs, out, "utf8");
  console.log("COMPOSABLE", path.relative(process.cwd(), abs), "now", out.split(/\n/).length, "helpers", names.length);
  return { path: hp, names };
}

module.exports = { extractFromFile, splitJsComposableByArrows };

if (require.main === module) {
  const mode = process.argv[2];
  const file = process.argv[3];
  if (mode === "nested") extractFromFile(file, { fnName: process.argv[4], maxLines: Number(process.argv[5]) || 1200 });
  else if (mode === "composable") splitJsComposableByArrows(file);
  else {
    console.error("Usage: nested <file> [fnName] | composable <file>");
    process.exit(1);
  }
}
