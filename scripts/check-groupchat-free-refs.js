#!/usr/bin/env node
/**
 * Detect free `.value` / bare identifier usages in GroupChat split composables
 * that are neither parameters, locals, nor imports.
 */
const fs = require("fs");
const path = require("path");

const dir = path.join("frontend", "src", "components", "collaboration");
const files = [
  "useGroupChatMessaging.js",
  "useGroupChatTasks.js",
  "useGroupChatAdmin.js",
  "useGroupChatStream.js",
];

const builtins = new Set([
  "console", "window", "document", "Math", "Number", "String", "Date", "JSON",
  "Object", "Array", "Boolean", "Error", "Promise", "fetch", "localStorage",
  "sessionStorage", "setTimeout", "clearTimeout", "setInterval", "clearInterval",
  "AbortController", "URL", "Map", "Set", "Intl", "undefined", "NaN", "Infinity",
  "true", "false", "null", "this", "arguments", "globalThis", "process",
]);

function collectDeclared(code) {
  const declared = new Set();
  for (const mm of code.matchAll(/\b(?:const|let|function|var|class)\s+([A-Za-z_$][\w$]*)/g)) {
    declared.add(mm[1]);
  }
  for (const mm of code.matchAll(/import\s+([A-Za-z_$][\w$]*)\s+from/g)) {
    declared.add(mm[1]);
  }
  for (const mm of code.matchAll(/import\s*\*\s*as\s+([A-Za-z_$][\w$]*)/g)) {
    declared.add(mm[1]);
  }
  for (const mm of code.matchAll(/import\s*\{([^}]+)\}/g)) {
    for (const part of mm[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop().trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) declared.add(name);
    }
  }
  // factory destructured params: export function foo({ a, b })
  const factory = code.match(/export function \w+\(\s*\{([\s\S]*?)\}\s*\)/);
  if (factory) {
    for (const part of factory[1].split(",")) {
      let name = part.trim();
      if (!name) continue;
      if (name.includes("=")) name = name.split("=")[0].trim();
      if (name.includes(":")) name = name.split(":").pop().trim();
      name = name.split(/\s+as\s+/).pop().trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) declared.add(name);
    }
  }
  return declared;
}

let failed = false;
for (const name of files) {
  const file = path.join(dir, name);
  const code = fs.readFileSync(file, "utf8");
  const declared = collectDeclared(code);
  const used = new Set();
  for (const mm of code.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\.value\b/g)) {
    used.add(mm[1]);
  }
  const free = [...used].filter((id) => !declared.has(id) && !builtins.has(id)).sort();
  if (free.length) {
    failed = true;
    console.error(`${name}: free .value refs -> ${free.join(", ")}`);
  } else {
    console.log(`${name}: ok`);
  }
}

// Also flag early TDZ risk in useGroupChat: identifier used before const declaration line
const main = fs.readFileSync(path.join(dir, "useGroupChat.js"), "utf8");
const declLine = new Map();
main.split(/\n/).forEach((line, i) => {
  const m = line.match(/^\s*const\s+([A-Za-z_$][\w$]*)\s*=/);
  if (m && !declLine.has(m[1])) declLine.set(m[1], i + 1);
});
const early = [];
main.split(/\n/).forEach((line, i) => {
  const lineNo = i + 1;
  for (const mm of line.matchAll(/\b([A-Za-z_$][\w$]*)\.value\b/g)) {
    const id = mm[1];
    const d = declLine.get(id);
    if (d && lineNo < d) early.push(`${id} used@${lineNo} declared@${d}`);
  }
});
if (early.length) {
  console.warn("useGroupChat.js early .value uses (closure OK if not called before init):");
  for (const item of early.slice(0, 30)) console.warn(" ", item);
}

if (failed) process.exit(1);
console.log("free-ref check passed");
