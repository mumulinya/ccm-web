const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const LEGACY_CCM_DIR = path.join(os.homedir(), ".cc-connect");
const DEFAULT_CCM_DIR = path.join(os.homedir(), ".ccm");
const MIGRATION_SCHEMA = "ccm-runtime-home-migration-v1";
const MIGRATION_FILE = "migration-v1.json";

function resolveCcmRuntimeHome() {
  return path.resolve(process.env.CCM_TASK_STORE_DIR || DEFAULT_CCM_DIR);
}

function copyLegacyRuntimeHome(source, target) {
  const nonRuntime = new Set(["ccm", ".git", ".idea", ".claude", ".agents", ".playwright-mcp"]);
  const excluded = (name) => nonRuntime.has(String(name).toLowerCase()) || name.startsWith("ccm-e2e-") || name.startsWith(".ccm.migration-");
  const entries = fs.readdirSync(source, { withFileTypes: true });
  const copied = [];
  for (const entry of entries) {
    if (excluded(entry.name)) continue;
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    fs.cpSync(from, to, { recursive: true, force: false, errorOnExist: false, dereference: false });
    copied.push(entry.name);
  }
  return copied;
}

function ensureCcmRuntimeHomeMigration() {
  if (process.env.CCM_TASK_STORE_DIR) return { status: "overridden", source: LEGACY_CCM_DIR, target: resolveCcmRuntimeHome() };
  const source = path.resolve(LEGACY_CCM_DIR);
  const target = path.resolve(DEFAULT_CCM_DIR);
  const marker = path.join(target, MIGRATION_FILE);
  if (fs.existsSync(marker)) return { status: "already_migrated", source, target };
  if (!fs.existsSync(source)) return { status: "legacy_missing", source, target };
  if (fs.existsSync(target)) {
    const existing = fs.readdirSync(target).filter((name) => name !== MIGRATION_FILE);
    if (existing.length) return { status: "target_requires_review", source, target, existing };
  }
  const staging = `${target}.migration-${process.pid}-${Date.now()}`;
  try {
    fs.mkdirSync(staging, { recursive: true });
    let copied;
    if (process.platform === "win32") {
      const result = spawnSync("robocopy", [source, staging, "/E", "/COPY:DAT", "/DCOPY:DAT", "/R:1", "/W:1", "/NFL", "/NDL", "/NP", "/XF", "*.sock", "/XD", "ccm", "ccm-e2e-*", ".git", ".idea", ".claude", ".agents", ".playwright-mcp", ".ccm.migration-*"], { windowsHide: true, stdio: "ignore" });
      if (result.error || (result.status ?? 16) > 7) throw result.error || new Error(`robocopy failed with exit code ${result.status}`);
      copied = fs.readdirSync(staging);
    } else {
      copied = copyLegacyRuntimeHome(source, staging);
    }
    const receipt = {
      schema: MIGRATION_SCHEMA,
      version: 1,
      migratedAt: new Date().toISOString(),
      source,
      target,
      copiedEntries: copied,
      copiedEntryCount: copied.length,
      legacyPreserved: true,
      contentStored: false,
    };
    fs.writeFileSync(path.join(staging, MIGRATION_FILE), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    fs.renameSync(staging, target);
    return { status: "migrated", source, target, copied };
  } catch (error) {
    try { fs.rmSync(staging, { recursive: true, force: true }); } catch {}
    return { status: "failed", source, target, error: error?.message || String(error) };
  }
}

module.exports = {
  DEFAULT_CCM_DIR,
  LEGACY_CCM_DIR,
  resolveCcmRuntimeHome,
  ensureCcmRuntimeHomeMigration,
};
