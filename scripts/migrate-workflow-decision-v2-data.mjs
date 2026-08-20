import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || path.join(process.env.USERPROFILE || process.cwd(), ".cc-connect"));
const dryRun = process.argv.includes("--dry-run");
const skippedDirectories = new Set([".git", "node_modules", "ccm"]);
const supportedExtensions = new Set([".json", ".jsonl", ".ndjson"]);
const legacyKeys = ["mode", "workflowMode", "workflow_mode", "needsPlanning", "needs_planning"];
const decisionKeys = new Set([
  "workflowDecision",
  "workflow_decision",
  "semanticDecisionReceipt",
  "semantic_decision_receipt",
]);

function parseJson(text) {
  return JSON.parse(String(text).replace(/^\uFEFF/, ""));
}

function isWorkflowDecision(value, parentKey) {
  return value
    && typeof value === "object"
    && !Array.isArray(value)
    && (value.schema === "ccm-model-workflow-decision-v1"
      || value.schema === "ccm-model-workflow-decision-v2"
      || decisionKeys.has(parentKey));
}

function migrateValue(value, parentKey = "", stats) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(item => migrateValue(item, parentKey, stats));
    return;
  }

  if (isWorkflowDecision(value, parentKey)) {
    for (const key of legacyKeys) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
      delete value[key];
      stats.removedFields += 1;
    }
    if (value.schema === "ccm-model-workflow-decision-v1") {
      value.schema = "ccm-model-workflow-decision-v2";
      stats.upgradedSchemas += 1;
    }
  }

  if (value.risk && typeof value.risk === "object" && !Array.isArray(value.risk)
    && Object.prototype.hasOwnProperty.call(value.risk, "workflow_mode")) {
    delete value.risk.workflow_mode;
    stats.removedRiskProjections += 1;
  }

  for (const [key, child] of Object.entries(value)) migrateValue(child, key, stats);
}

function atomicWrite(file, content) {
  const temporary = `${file}.workflow-v2-${process.pid}.tmp`;
  fs.writeFileSync(temporary, content, "utf8");
  if (path.extname(file) === ".json") parseJson(content);
  else content.split(/\r?\n/).filter(Boolean).forEach(line => parseJson(line));
  fs.renameSync(temporary, file);
}

function migrateFile(file, stats) {
  const original = fs.readFileSync(file, "utf8");
  const extension = path.extname(file).toLowerCase();
  const hasBom = original.startsWith("\uFEFF");
  const mutationsBefore = stats.upgradedSchemas + stats.removedFields + stats.removedRiskProjections;
  let output;
  if (extension === ".json") {
    const parsed = parseJson(original);
    migrateValue(parsed, "", stats);
    output = `${hasBom ? "\uFEFF" : ""}${JSON.stringify(parsed, null, 2)}\n`;
  } else {
    const trailingNewline = /\r?\n$/.test(original);
    output = original.split(/\r?\n/).map((line, index) => {
      if (!line.trim()) return line;
      const parsed = parseJson(line);
      migrateValue(parsed, "", stats);
      return `${hasBom && index === 0 ? "\uFEFF" : ""}${JSON.stringify(parsed)}`;
    }).join("\n");
    if (trailingNewline && !output.endsWith("\n")) output += "\n";
  }
  const mutationsAfter = stats.upgradedSchemas + stats.removedFields + stats.removedRiskProjections;
  if (mutationsAfter === mutationsBefore) return false;
  if (!dryRun) atomicWrite(file, output);
  return true;
}

function visit(directory, stats) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      visit(target, stats);
      continue;
    }
    if (!entry.isFile() || !supportedExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    stats.scannedFiles += 1;
    try {
      if (migrateFile(target, stats)) {
        stats.changedFiles += 1;
        stats.files.push(path.relative(root, target));
      }
    } catch (error) {
      stats.errors.push({ file: path.relative(root, target), error: String(error?.message || error) });
    }
  }
}

if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  throw new Error(`Runtime data directory does not exist: ${root}`);
}

const stats = {
  schema: "ccm-workflow-decision-v2-data-migration-v1",
  root,
  dryRun,
  scannedFiles: 0,
  changedFiles: 0,
  upgradedSchemas: 0,
  removedFields: 0,
  removedRiskProjections: 0,
  files: [],
  errors: [],
};
visit(root, stats);
console.log(JSON.stringify(stats, null, 2));
if (stats.errors.length) process.exitCode = 1;
