import fs from "node:fs";
import path from "node:path";

const root = process.env.CCM_DATA_DIR || path.resolve(process.env.USERPROFILE || process.env.HOME || ".", ".cc-connect");
const dirs = [
  "global-agent-memory", "web-sessions", "group-memory", "group-memory-sessions",
  "group-messages", "project-memory", "sessions", "task-agent-memory-context-snapshots",
];
const removedKeys = new Set([
  "compaction", "compactionState", "compaction_state", "compactBoundary", "compact_boundary",
  "messageCompression", "message_compression", "sessionMemoryState", "session_memory_state",
  "unifiedCompaction", "unified_compaction", "unifiedCompactionState", "unified_compaction_state",
  "postCompactGate", "post_compact_gate", "timeBasedToolResultProjection", "time_based_tool_result_projection",
  "microCompactReceipt", "micro_compact_receipt", "modelVisiblePayload", "model_visible_payload",
]);

function filesUnder(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(file));
    else if (/\.json(?:\.bak)?$/i.test(entry.name)) out.push(file);
  }
  return out;
}

function strip(value, stats) {
  if (Array.isArray(value)) return value.map(item => strip(item, stats));
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === "unifiedSessionCompaction" || key === "unified_session_compaction" || key === "unifiedSessionSummary" || key === "unified_session_summary") {
      out[key] = child;
      continue;
    }
    if (key === "compaction" && child && typeof child === "object" && !Array.isArray(child)) {
      const keys = Object.keys(child);
      const freshLedger = keys.length > 0 && keys.every(item => ["boundaryVersion", "totalCompactions", "consecutiveFailures", "health", "boundaries", "updatedAt"].includes(item));
      if (freshLedger) { out[key] = child; continue; }
    }
    if (removedKeys.has(key)) { stats.removedKeys += 1; continue; }
    out[key] = strip(child, stats);
  }
  return out;
}

const files = dirs.flatMap(name => filesUnder(path.join(root, name)));
const changes = [];
for (const file of files) {
  let parsed;
  try { parsed = JSON.parse(fs.readFileSync(file, "utf8")); } catch { continue; }
  const stats = { removedKeys: 0 };
  const next = strip(parsed, stats);
  if (stats.removedKeys) changes.push({ file, removedKeys: stats.removedKeys, next });
}

const apply = process.argv.includes("--apply");
if (apply) {
  for (const change of changes) {
    const temp = `${change.file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(change.next, null, 2), "utf8");
    fs.renameSync(temp, change.file);
  }
}
console.log(JSON.stringify({ root, apply, filesScanned: files.length, filesChanged: changes.length, removedKeys: changes.reduce((sum, item) => sum + item.removedKeys, 0), changedFiles: changes.map(item => item.file) }, null, 2));
