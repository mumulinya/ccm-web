const fs = require("fs");

function extractImportHeader(lines) {
  let end = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^export (type|interface|enum) /.test(line)) { end = i; break; }
    if (/^export const /.test(line)) { end = i; break; }
    if (/^const [A-Z_]/.test(line) && !line.includes("import")) { end = i; break; }
  }
  if (!end) end = lines.findIndex(l => /^const [A-Z_]+ =/.test(l));
  return lines.slice(0, end).join("\n");
}

function analyzeUsedSymbols(runtimeText, bodyText) {
  const funcs = [...runtimeText.matchAll(/^(export )?(?:async )?function (\w+)/gm)].map(m => ({ name: m[2], exported: !!m[1] }));
  const consts = [...runtimeText.matchAll(/^(export )?const (\w+) =/gm)].map(m => ({ name: m[2], exported: !!m[1] }));
  const need = [];
  for (const { name, exported } of [...funcs, ...consts]) {
    if (name.endsWith("SelfTest")) continue;
    if (new RegExp("\\b" + name + "\\b").test(bodyText) && !exported) need.push(name);
  }
  return [...new Set(need)].sort();
}

function findSelfTestNames(text) {
  return [...text.matchAll(/^export function (run\w*SelfTest)\(\)/gm)].map(m => m[1]);
}

function splitAtLine(file, outSelfTest, splitLine1Based, extraRanges = []) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  const splitIdx = splitLine1Based - 1;
  const chunks = [];
  if (extraRanges.length) {
    for (const [a, b] of extraRanges) chunks.push(lines.slice(a - 1, b).join("\n"));
  }
  chunks.push(lines.slice(splitIdx).join("\n"));
  const body = chunks.filter(Boolean).join("\n\n");
  const remove = new Set();
  if (extraRanges.length) {
    for (const [a, b] of extraRanges) for (let i = a - 1; i < b; i++) remove.add(i);
  }
  for (let i = splitIdx; i < lines.length; i++) remove.add(i);
  const runtimeLines = lines.filter((_, i) => !remove.has(i));
  const runtime = runtimeLines.join("\n");
  const importHeader = extractImportHeader(lines);
  const importNames = analyzeUsedSymbols(runtime, body);
  const importBlock = importNames.length
    ? `import {\n  ${importNames.join(",\n  ")},\n} from "./${file.split("/").pop().replace(".ts", "")}";\n\n`
    : "";
  const selfTestFile = [
    `// Extracted self-tests. Runtime remains in ${file.split("/").pop()}.`,
    "",
    importHeader,
    "",
    importBlock,
    body.replace(/\n$/, ""),
    "",
  ].join("\n");
  const names = findSelfTestNames(body);
  const reexportLines = names.map(name =>
    `export function ${name}() {\n  return require("./${outSelfTest.replace(".ts", "")}").${name}();\n}`
  );
  const exportBlock = importNames.length
    ? `\nexport {\n  ${importNames.join(",\n  ")},\n};\n`
    : "";
  const runtimeOut = runtime.replace(/\n?$/, "\n") + exportBlock + "\n" + reexportLines.join("\n\n") + "\n";
  fs.writeFileSync(`backend/modules/collaboration/${outSelfTest}`, selfTestFile, "utf8");
  fs.writeFileSync(file, runtimeOut, "utf8");
  console.log(file, "runtime lines", runtimeLines.length, "self-test lines", body.split(/\r?\n/).length, "tests", names.length, "exports", importNames.length);
}

splitAtLine(
  "backend/modules/collaboration/memory.ts",
  "memory-self-tests.ts",
  11691,
  [[791, 809]]
);

splitAtLine(
  "backend/modules/collaboration/group-memory-compaction.ts",
  "group-memory-compaction-self-tests.ts",
  7033
);
