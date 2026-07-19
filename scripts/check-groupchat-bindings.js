#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const file = path.join("frontend", "src", "components", "collaboration", "useGroupChat.js");
const code = fs.readFileSync(file, "utf8");
const start = code.lastIndexOf("  return {");
const end = code.lastIndexOf("\n  }\n}");
if (start < 0 || end < 0) {
  console.error("return block not found");
  process.exit(1);
}
const body = code.slice(start + "  return {".length, end);
const ids = [];
for (const raw of body.split(",")) {
  const id = raw.trim().split(/\s*\/\//)[0].trim();
  if (!id) continue;
  if (/^[A-Za-z_$][\w$]*$/.test(id)) ids.push(id);
}

const declared = new Set();
for (const mm of code.matchAll(/\b(?:const|let|function|var)\s+([A-Za-z_$][\w$]*)/g)) {
  declared.add(mm[1]);
}
for (const mm of code.matchAll(/const\s*\{([^}]+)\}/g)) {
  for (const part of mm[1].split(",")) {
    let name = part.trim();
    if (!name) continue;
    if (name.includes("=")) name = name.split("=")[0].trim();
    if (name.includes(":")) name = name.split(":").pop().trim();
    name = name.split(/\s+as\s+/).pop().trim();
    if (/^[A-Za-z_$][\w$]*$/.test(name)) declared.add(name);
  }
}
for (const mm of code.matchAll(/import\s*\{([^}]+)\}/g)) {
  for (const part of mm[1].split(",")) {
    const name = part.trim().split(/\s+as\s+/).pop().trim();
    if (/^[A-Za-z_$][\w$]*$/.test(name)) declared.add(name);
  }
}

const missing = ids.filter((id) => !declared.has(id));
if (missing.length) {
  console.error("useGroupChat return bindings missing definitions:", missing.join(", "));
  process.exit(1);
}
console.log(`ok: ${ids.length} return bindings resolved`);
