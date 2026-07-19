/**
 * Behavior-freeze composable split: keep bindings on a shared `state` object,
 * move large handlers into install* modules that read/write state.NAME.
 */
const fs = require("fs");
const path = require("path");

function splitComposable(file, opts = {}) {
  const abs = path.resolve(file);
  const maxHandlerChunk = opts.maxHandlerChunk || 900;
  const minHandlerSize = opts.minHandlerSize || 20;
  const lines = fs.readFileSync(abs, "utf8").split(/\r?\n/);
  const useStart = lines.findIndex((l) => /^export function use\w+/.test(l));
  if (useStart < 0) throw new Error("no use*");
  const useName = lines[useStart].match(/export function (use\w+)/)[1];
  const params = (lines[useStart].match(/export function use\w+\(([^)]*)\)/) || [])[1] || "";

  let depth = 0;
  let useEnd = lines.length - 1;
  for (let i = useStart; i < lines.length; i++) {
    depth += (lines[i].match(/\{/g) || []).length - (lines[i].match(/\}/g) || []).length;
    if (i > useStart && depth === 0) {
      useEnd = i;
      break;
    }
  }

  let returnLine = -1;
  for (let i = useEnd; i > useStart; i--) {
    if (/^\s+return \{/.test(lines[i])) {
      returnLine = i;
      break;
    }
  }
  if (returnLine < 0) throw new Error("no return");

  let importEnd = 0;
  for (let i = 0; i < useStart; i++) {
    const t = lines[i].trim();
    if (t.startsWith("import ")) importEnd = i + 1;
    else if (importEnd && (t === "" || t.startsWith("//") || t.startsWith("}") || t.includes(" from ") || t.endsWith(","))) importEnd = i + 1;
    else if (importEnd && t) break;
  }
  const importHeader = lines.slice(0, importEnd).join("\n");

  // Parse top-level bindings inside use* (indent exactly 2 spaces)
  const bindings = [];
  for (let i = useStart + 1; i < returnLine; i++) {
    const fn = lines[i].match(/^(  )(async )?function ([A-Za-z_$][\w$]*)\s*\(/);
    const c = lines[i].match(/^(  )(const|let) ([A-Za-z_$][\w$]*) =/);
    if (!fn && !c) continue;
    const name = fn ? fn[3] : c[3];
    let d = 0;
    let started = false;
    let end = i + 1;
    for (let j = i; j < returnLine; j++) {
      const open = (lines[j].match(/\{/g) || []).length;
      const close = (lines[j].match(/\}/g) || []).length;
      d += open - close;
      if (open) started = true;
      if (started && d <= 0 && j > i) {
        end = j + 1;
        break;
      }
      if (!started && /=>/.test(lines[j]) && !lines[j].includes("{")) {
        // maybe multi-line params then => on later line with block
        continue;
      }
    }
    if (!started) {
      // call expression / ref() spanning lines
      let pd = 0;
      for (let j = i; j < Math.min(returnLine, i + 60); j++) {
        pd += (lines[j].match(/\(/g) || []).length - (lines[j].match(/\)/g) || []).length;
        if (j > i && pd <= 0) {
          end = j + 1;
          break;
        }
      }
    }
    const kind = fn ? "fn" : /ref\s*\(|computed\s*\(|shallowRef\s*\(|reactive\s*\(/.test(lines.slice(i, end).join("\n")) ? "state" : "const";
    bindings.push({ name, start: i, end, size: end - i, kind, isFn: !!fn });
  }

  const handlers = bindings.filter((b) => b.size >= minHandlerSize && (b.isFn || b.kind === "const" || b.kind === "fn"));
  // Prefer moving only function-like large blocks; keep tiny state in main
  const move = handlers.filter((b) => {
    const body = lines.slice(b.start, b.end).join("\n");
    return b.isFn || /=>\s*\{/.test(body) || /=\s*async\s*\(/.test(body) || /=\s*\([^)]*\)\s*=>/.test(body);
  });
  console.log(useName, "bindings", bindings.length, "move", move.length, "lines", lines.length);
  if (move.length < 5) {
    console.log("SKIP");
    return null;
  }

  const allNames = bindings.map((b) => b.name);
  // Also include params as state fields
  const paramNames = params
    .split(",")
    .map((s) => s.trim().split("=")[0].trim())
    .filter((s) => /^[A-Za-z_$]/.test(s))
    .map((s) => s.replace(/\?$/, "").trim());

  const chunks = [];
  let cur = [];
  let curSize = 0;
  for (const h of move) {
    if (cur.length && curSize + h.size > maxHandlerChunk) {
      chunks.push(cur);
      cur = [];
      curSize = 0;
    }
    cur.push(h);
    curSize += h.size;
  }
  if (cur.length) chunks.push(cur);

  function rewriteToState(code, selfNames) {
    let out = code;
    const names = [...allNames, ...paramNames].sort((a, b) => b.length - a.length);
    for (const n of names) {
      // Skip replacing the binding's own declaration name on the lhs carefully later
      const re = new RegExp(`(?<![.\\w$])${n.replace(/[$]/g, "\\$&")}(?![\\w$])`, "g");
      out = out.replace(re, `state.${n}`);
    }
    out = out.replace(/state\.state\./g, "state.");
    return out;
  }

  const base = abs.replace(/\.js$/, "");
  const partPaths = [];
  for (let i = 0; i < chunks.length; i++) {
    const pp = `${base}-handlers-${String(i + 1).padStart(2, "0")}.js`;
    const pieces = chunks[i].map((h) => {
      let body = lines
        .slice(h.start, h.end)
        .map((l) => (l.startsWith("  ") ? l.slice(2) : l))
        .join("\n");
      // Convert declaration to state assignment BEFORE global rewrite of own name
      if (/^(async )?function /.test(body)) {
        body = body.replace(/^(async )?function ([A-Za-z_$][\w$]*)/, "state.$2 = $1function $2");
      } else {
        body = body.replace(/^(const|let) ([A-Za-z_$][\w$]*) =/, "state.$2 =");
      }
      body = rewriteToState(body, chunks[i].map((x) => x.name));
      // Fix state.state.foo on lhs double
      body = body.replace(/state\.state\./g, "state.");
      return body;
    });
    const content = `${importHeader}\n\n/** @param {any} state */\nexport function install${useName}Handlers${i + 1}(state) {\n${pieces
      .join("\n\n")
      .split("\n")
      .map((l) => "  " + l)
      .join("\n")}\n}\n`;
    fs.writeFileSync(pp, content, "utf8");
    partPaths.push(pp);
    console.log("  wrote", path.relative(process.cwd(), pp), "lines", content.split(/\n/).length);
  }

  // Build new main: imports, function, state init with params, remaining bindings as state.X =, installs, return from state
  const moveStarts = new Set(move.map((m) => m.start));
  const keepBindings = bindings.filter((b) => !moveStarts.has(b.start));

  const importHandlers = partPaths
    .map((p, idx) => `import { install${useName}Handlers${idx + 1} } from './${path.basename(p)}'`)
    .join("\n");

  const stateInit = [];
  stateInit.push(`  const state = {`);
  for (const p of paramNames) stateInit.push(`    ${p},`);
  stateInit.push(`  }`);

  const keepCode = keepBindings.map((b) => {
    let body = lines
      .slice(b.start, b.end)
      .map((l) => (l.startsWith("  ") ? l.slice(2) : l))
      .join("\n");
    if (/^(async )?function /.test(body)) {
      body = body.replace(/^(async )?function ([A-Za-z_$][\w$]*)/, "state.$2 = $1function $2");
    } else {
      body = body.replace(/^(const|let) ([A-Za-z_$][\w$]*) =/, "state.$2 =");
    }
    body = rewriteToState(body, []);
    body = body.replace(/state\.state\./g, "state.");
    return body
      .split("\n")
      .map((l) => "  " + l)
      .join("\n");
  });

  // Also keep non-binding lines (watch calls, etc.) that were between bindings
  // Collect orphan lines not in any binding
  const covered = new Set();
  for (const b of bindings) for (let i = b.start; i < b.end; i++) covered.add(i);
  const orphans = [];
  for (let i = useStart + 1; i < returnLine; i++) {
    if (covered.has(i)) continue;
    const t = lines[i].trim();
    if (!t) continue;
    orphans.push({ line: i, text: lines[i] });
  }
  // Orphans that are watch/onMounted etc. - rewrite and keep in main after state init
  const orphanCode = orphans.map((o) => {
    let l = o.text.startsWith("  ") ? o.text.slice(2) : o.text;
    l = rewriteToState(l, []);
    l = l.replace(/state\.state\./g, "state.");
    return "  " + l;
  });

  const installs = partPaths.map((_, idx) => `  install${useName}Handlers${idx + 1}(state)`).join("\n");

  // Return block: replace identifiers with state.X
  let retBlock = lines.slice(returnLine, useEnd).join("\n");
  // dedent
  retBlock = retBlock
    .split("\n")
    .map((l) => (l.startsWith("  ") ? l.slice(2) : l))
    .join("\n");
  retBlock = rewriteToState(retBlock, []);
  retBlock = retBlock.replace(/state\.state\./g, "state.");
  // return { foo, bar } -> return { foo: state.foo, bar: state.bar } roughly if shorthand
  retBlock = retBlock.replace(/^return \{/, "return {");
  // Fix shorthand properties: lines like `    foo,` inside return — already rewritten to state.foo, which is wrong for shorthand
  // state.foo, as property shorthand is invalid — need foo: state.foo
  retBlock = retBlock.replace(/(^|\n)(\s*)state\.([A-Za-z_$][\w$]*),/g, "$1$2$3: state.$3,");
  retBlock = retBlock.replace(/(^|\n)(\s*)state\.([A-Za-z_$][\w$]*)\n/g, "$1$2$3: state.$3\n");

  const main = [
    importHeader,
    "",
    importHandlers,
    "",
    `export function ${useName}(${params}) {`,
    ...stateInit,
    "",
    ...keepCode,
    "",
    ...orphanCode,
    "",
    installs,
    "",
    retBlock
      .split("\n")
      .map((l) => "  " + l)
      .join("\n"),
    "}",
    "",
  ].join("\n");

  fs.writeFileSync(abs, main.replace(/\n{3,}/g, "\n\n"), "utf8");
  console.log("MAIN", path.relative(process.cwd(), abs), "now", main.split(/\n/).length, "parts", partPaths.length);
  return partPaths;
}

if (require.main === module) {
  for (const f of process.argv.slice(2)) {
    splitComposable(f);
  }
}
