import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

const store = path.resolve(process.env.CCM_TASK_STORE_DIR || path.join(os.homedir(), ".cc-connect"));
const sourceRoot = path.resolve(process.cwd());
const keepFiles = new Set([
  "config.toml",
  "agent-provider-settings.json",
  "feishu-config.json",
  "project-configs.json",
  "groups.json",
  "cron-jobs.json",
  "music-config.json",
  "pets.json",
  "projects.txt",
  "global-agent-tool-authorization.json",
  "provider-native-tool-capabilities.json",
  "conversation-permission-policies.json",
  "navigation-config-v3.json",
  "group-orchestrator-config.json",
]);

// Only these runtime directories are eligible. The project source directory is never a target.
const runtimeDirs = [
  "auth-backups", "database-backups",
  "agent-collab-lab", "agent-execution-events", "agent-quality", "agent-runner",
  "channel-runtime", "context-engine-observability", "context-engine-recovery",
  "conversation-rewind-snapshots", "execution-kernel", "execution-recovery",
  "exports", "feishu-channel-locks", "final-dispatch-context-collapse",
  "git-operation-leases", "global-agent-memory", "global-agent-runs", "global-agent-runtime",
  "group-api-microcompact-native-apply-proof", "group-api-microcompact-native-apply-request-telemetry",
  "group-compact-heads", "group-compaction-activity", "group-global-memory-arbitration",
  "group-memory", "group-memory-auto-compact-circuit-breakers", "group-memory-compact-boundaries",
  "group-memory-compaction-hooks", "group-memory-file-references", "group-memory-md",
  "group-memory-post-compact-candidate-usage", "group-memory-post-compact-dispatch",
  "group-memory-reload", "group-memory-replay-repair", "group-memory-replay-repair-dispatch-bindings",
  "group-memory-replay-repair-dispatch-plans", "group-memory-replay-repair-timeline-bindings",
  "group-memory-replay-repair-work-items", "group-memory-sessions", "group-memory-worker-context-compact-hooks",
  "group-memory-worker-context-compact-outcomes", "group-memory-worker-context-compact-strategies",
  "group-memory-worker-context-ptl-emergencies", "group-messages", "group-post-turn-summaries",
  "group-prompt-cache-break-detection", "group-reactive-compact-retry-ownership",
  "group-session-execution", "group-session-lifecycle-commits", "group-session-lifecycle-heads",
  "group-session-memory", "group-tool-continuity", "group-typed-memory-dispatch-wal",
  "knowledge-index-v3", "legacy-json-backups", "logs", "main-agent-context-continuity",
  "main-agent-context-source-continuity", "memory-context-consumption-receipts",
  "memory-context-consumption-recoveries", "memory-control", "memory-control-selftests",
  "model-token-preflight", "project-clone-receipts", "project-lifecycle", "project-memory",
  "project-runtime", "promoted-memory", "provider-cache-capability", "provider-context-cache",
  "provider-native-compact-execution-receipts", "provider-native-compact-session-capacity",
  "provider-native-microcompact-capability", "reliability", "run", "scheduler", "scratch",
  "semantic-decisions", "session-memory-extractor-sandbox", "sessions", "task-agent-continuation-soak",
  "task-agent-memory-context-snapshots", "temp", "test-agent-artifacts", "test-agent-handoffs",
  "test-agent-runs", "third-party-memory-snapshots", "timers", "tool-results", "typed-memory-conflicts",
  "typed-memory-model-judgments", "uploads", "web-sessions",
  "tmp-global-claude-memory-import-selftest", "tmp-project-memory-context-selftest", "tmp-project-memory-import-selftest",
];

const runtimeFiles = [
  "tasks.json", "tasks.json.bak", "task-logs.json", "task-logs.json.bak", "group-logs.json", "group-logs.json.bak",
  "metrics.json", "metrics.json.bak", "global-agent-history.json", "global-agent-history.json.bak",
  "global-agent-audit.jsonl", "global-agent-bridge.json", "attachment-references-v2.json", "attachment-references-v2.json.bak",
  "conversation-turn-control.json", "conversation-turn-control.json.bak", "evidence-registry.json", "evidence-registry.json.bak",
  "feishu-channel-state.json", "feishu-inbound-receipts-v2.json", "feishu-inbound-receipts-v2.json.bak",
  "planning-sessions.json", "planning-sessions.json.bak", "operation-registry.json", "operation-registry.json.bak",
  "task-agent-sessions.json", "task-agent-sessions.json.bak", "task-governance-audit.jsonl",
  "task-transition-events.json", "task-transition-events.json.bak", "work-journal.jsonl",
  "knowledge-index-cache-v2.json", "dev-reports.json", "dev-reports.json.bak", "dev-weekly-reports.json",
  "dev-weekly-reports.json.bak", "auto-dev-notify.json", "auto-dev-notify.json.bak",
  "cc-connect.log", "ccm-server.log", "ccm-server.err.log", "ccm-server.out.log",
  "ccm-server-3080.log", "ccm-server-3080.err.log", "ccm-server-3080.out.log",
  "ccm.db-shm", "ccm.db-wal", "music-agent-memory.json", "music-agent-memory.json.bak", "dir_history.json", "phase227-session-memory-fleet-desktop.png",
];

function assertSafeTarget(target) {
  const resolved = path.resolve(target);
  if (resolved === sourceRoot || resolved.startsWith(`${sourceRoot}${path.sep}`)) {
    throw new Error(`Refusing to delete source tree: ${resolved}`);
  }
  if (resolved === path.parse(resolved).root || resolved === store || !resolved.startsWith(`${store}${path.sep}`)) {
    throw new Error(`Refusing unsafe cleanup target: ${resolved}`);
  }
}

function removePath(target, report) {
  if (!fs.existsSync(target)) return;
  assertSafeTarget(target);
  const stat = fs.lstatSync(target);
  fs.rmSync(target, { recursive: stat.isDirectory(), force: true });
  report.removed.push(path.relative(store, target));
}

function clearDatabase(report) {
  const dbPath = path.join(store, "ccm.db");
  if (!fs.existsSync(dbPath)) return;
  const db = new Database(dbPath);
  try {
    db.pragma("foreign_keys = OFF");
    const tables = db.prepare("select name from sqlite_master where type='table' and name not like 'sqlite_%'").all().map((x) => x.name);
    const tx = db.transaction(() => {
      for (const table of tables) {
        // SQLite FTS shadow tables are maintained by the virtual table and cannot be deleted directly.
        if (/^conversation_search_fts_v3_(config|content|data|docsize|idx)$/.test(table)) continue;
        if (table === "app_meta") {
          db.prepare("delete from app_meta where key not in ('schema_version')").run();
        } else {
          db.prepare(`delete from "${String(table).replaceAll('"', '""')}"`).run();
        }
      }
      if (tables.includes("conversation_search_fts_v3")) {
        try { db.prepare("insert into conversation_search_fts_v3(conversation_search_fts_v3) values ('delete-all')").run(); } catch {}
      }
    });
    tx();
    db.pragma("wal_checkpoint(TRUNCATE)");
    db.exec("vacuum");
    report.dbTables = tables;
  } finally {
    db.close();
  }
}

const report = { store, protected: [sourceRoot, ...Array.from(keepFiles)], removed: [], dbTables: [] };

for (const name of runtimeDirs) removePath(path.join(store, name), report);
for (const name of runtimeFiles) {
  if (keepFiles.has(name)) continue;
  removePath(path.join(store, name), report);
}
clearDatabase(report);

// Remove only transient files left directly in the store; never touch protected configuration or source.
for (const entry of fs.readdirSync(store, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const name = entry.name;
  if (keepFiles.has(name) || name === "ccm.db") continue;
  if (/^(?:\.config\.toml\.lock|.*\.tmp|.*\.bak|.*\.log|.*\.jsonl)$/.test(name)) {
    removePath(path.join(store, name), report);
  }
}

console.log(JSON.stringify({
  schema: "ccm-runtime-history-cleanup-v1",
  store,
  removedCount: report.removed.length,
  removed: report.removed,
  databaseTablesCleared: report.dbTables.length,
  protectedSourceRoot: sourceRoot,
  protectedFiles: Array.from(keepFiles),
  contentStored: false,
}, null, 2));
