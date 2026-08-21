import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.env.CCM_DATA_DIR || path.join(process.env.USERPROFILE || process.env.HOME || ".", ".cc-connect"));
const telemetryRoot = path.resolve(root, "group-prompt-cache-break-detection");
if (!telemetryRoot.startsWith(`${root}${path.sep}`)) throw new Error("context accounting cleanup target escaped CCM data directory");

function filesUnder(directory) {
  if (!fs.existsSync(directory)) return [];
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...filesUnder(target));
    else if (/\.json(?:\.bak)?$/i.test(entry.name)) output.push(target);
  }
  return output;
}

const legacy = [];
for (const file of filesUnder(telemetryRoot)) {
  let parsed;
  try { parsed = JSON.parse(fs.readFileSync(file, "utf8")); } catch { continue; }
  const events = [parsed?.last_event, parsed?.last_group_main_context_usage_event, ...(Array.isArray(parsed?.recent_events) ? parsed.recent_events : [])].filter(Boolean);
  if (events.length && events.every(event => event?.context_measurement_schema !== "ccm-context-measurement-v2")) legacy.push(file);
}

const apply = process.argv.includes("--apply");
if (apply) {
  for (const file of legacy) fs.unlinkSync(file);
}

console.log(JSON.stringify({
  schema: "ccm-context-accounting-cleanup-v1",
  root,
  telemetryRoot,
  apply,
  filesScanned: filesUnder(telemetryRoot).length,
  legacyFiles: legacy.length,
  changedFiles: legacy,
}, null, 2));
