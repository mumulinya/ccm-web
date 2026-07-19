#!/usr/bin/env node
/**
 * Split a Vue SFC into shell + Panel + useX.js + template.html + css
 * Usage: node scripts/split-vue-shell-panel.mjs <Component.vue> <ComposableName>
 * Example: node scripts/split-vue-shell-panel.mjs frontend/src/components/tools/CronJobs.vue useCronJobs
 */
import fs from "fs";
import path from "path";

const vuePath = process.argv[2];
const composableName = process.argv[3];
if (!vuePath || !composableName) {
  console.error("Usage: node scripts/split-vue-shell-panel.mjs <Component.vue> <useName>");
  process.exit(1);
}

const abs = path.resolve(vuePath);
const dir = path.dirname(abs);
const base = path.basename(abs, ".vue");
const raw = fs.readFileSync(abs, "utf8");

const scriptMatch = raw.match(/^<script setup>\r?\n([\s\S]*?)\r?\n<\/script>/);
const templateMatch = raw.match(/<template>\r?\n([\s\S]*?)\r?\n<\/template>/);
const styleMatch = raw.match(/<style scoped>\r?\n([\s\S]*?)\r?\n<\/style>/);
if (!scriptMatch || !templateMatch || !styleMatch) {
  console.error("Failed to parse SFC sections", {
    script: !!scriptMatch,
    template: !!templateMatch,
    style: !!styleMatch,
  });
  process.exit(1);
}

const script = scriptMatch[1];
const importLines = [];
const bodyLines = [];
for (const line of script.split(/\r?\n/)) {
  if (/^import\s/.test(line)) importLines.push(line);
  else bodyLines.push(line);
}

let body = bodyLines.join("\n");
body = body.replace(/const emit = defineEmits\(\['navigate'\]\)\s*\r?\n*/, "");
body = body.replace(/const emit = defineEmits\(\["navigate"\]\)\s*\r?\n*/, "");

const ids = [];
const seen = new Set();
for (const line of bodyLines) {
  const patterns = [
    /^const (\w+)/,
    /^let (\w+)/,
    /^function (\w+)/,
    /^async function (\w+)/,
  ];
  for (const re of patterns) {
    const m = line.match(re);
    if (m && !seen.has(m[1]) && m[1] !== "emit") {
      seen.add(m[1]);
      ids.push(m[1]);
    }
  }
}

const composable = [
  ...importLines,
  "",
  `export function ${composableName}(emit) {`,
  body,
  "",
  "  return {",
  ids.map((n) => `    ${n}`).join(",\n"),
  "  }",
  "}",
  "",
].join("\n");

const panel = [
  "<script setup>",
  `import { ${composableName} } from './${composableName}.js'`,
  "",
  "const emit = defineEmits(['navigate'])",
  "",
  "const {",
  ids.map((n, i) => `  ${n}${i < ids.length - 1 ? "," : ""}`).join("\n"),
  `} = ${composableName}(emit)`,
  "</script>",
  "",
  `<template src="./${base}.template.html"></template>`,
  "",
  `<style scoped src="./${base}.css"></style>`,
  "",
].join("\n");

const shell = [
  "<script setup>",
  `import ${base}Panel from './${base}Panel.vue'`,
  "",
  "const emit = defineEmits(['navigate'])",
  "</script>",
  "",
  "<template>",
  `  <${base}Panel @navigate="emit('navigate', $event)" />`,
  "</template>",
  "",
].join("\n");

fs.writeFileSync(path.join(dir, `${composableName}.js`), composable);
fs.writeFileSync(path.join(dir, `${base}.template.html`), templateMatch[1] + "\n");
fs.writeFileSync(path.join(dir, `${base}.css`), styleMatch[1] + "\n");
fs.writeFileSync(path.join(dir, `${base}Panel.vue`), panel);
fs.writeFileSync(abs, shell);

console.log(JSON.stringify({
  composable: `${composableName}.js`,
  composableLines: composable.split(/\n/).length,
  templateLines: templateMatch[1].split(/\n/).length,
  cssLines: styleMatch[1].split(/\n/).length,
  panelLines: panel.split(/\n/).length,
  shellLines: shell.split(/\n/).length,
  returnCount: ids.length,
}, null, 2));
