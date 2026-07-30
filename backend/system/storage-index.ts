import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import { CCM_DIR, GROUP_MESSAGES_DIR, UPLOAD_DIR } from "../core/utils";
import { getObservabilityDatabase, withImmediateObservabilityTransaction } from "./observability-database";

type StorageCount = { files: number; bytes: number; errors: number; skipped_links: number };

const categories: Record<string, string> = {
  executions: path.join(CCM_DIR, "execution-kernel", "executions"),
  checkpoints: path.join(CCM_DIR, "execution-kernel", "checkpoints"),
  outputs: path.join(CCM_DIR, "execution-kernel", "outputs"),
  projectSessions: path.join(CCM_DIR, "web-sessions"),
  groupMessages: GROUP_MESSAGES_DIR,
  testArtifacts: path.join(CCM_DIR, "test-agent-artifacts"),
  testRuns: path.join(CCM_DIR, "test-agent-runs"),
  replay: path.join(CCM_DIR, "reliability", "task-replay-journal"),
  uploads: UPLOAD_DIR,
};

let scheduler: NodeJS.Timeout | null = null;

function now() { return new Date().toISOString(); }
function parse(value: any, fallback: any) { try { return value ? JSON.parse(String(value)) : fallback; } catch { return fallback; } }

async function scanRoot(root: string): Promise<StorageCount> {
  const result: StorageCount = { files: 0, bytes: 0, errors: 0, skipped_links: 0 };
  const rootResolved = path.resolve(root);
  const queue = [rootResolved];
  while (queue.length) {
    const entry = queue.shift()!;
    try {
      const stat = await fs.lstat(entry);
      if (stat.isSymbolicLink()) { result.skipped_links += 1; continue; }
      const real = await fs.realpath(entry);
      const relative = path.relative(rootResolved, real);
      if (relative.startsWith("..") || path.isAbsolute(relative)) { result.skipped_links += 1; continue; }
      if (stat.isFile()) { result.files += 1; result.bytes += stat.size; continue; }
      if (!stat.isDirectory()) continue;
      const children = await fs.readdir(entry);
      for (const child of children) queue.push(path.join(entry, child));
    } catch (error: any) {
      if (error?.code !== "ENOENT") result.errors += 1;
    }
  }
  return result;
}

async function buildGeneration(generation: string) {
  const db = getObservabilityDatabase();
  const summary: Record<string, StorageCount> = {};
  const names = Object.keys(categories);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(3, names.length) }, async () => {
    while (cursor < names.length) {
      const index = cursor++;
      const name = names[index];
      summary[name] = await scanRoot(categories[name]);
      db.prepare("UPDATE storage_index_snapshots_v2 SET progress_json=?,updated_at=? WHERE generation=?")
        .run(JSON.stringify({ completed: Object.keys(summary).length, total: names.length, current: name }), now(), generation);
    }
  });
  try {
    await Promise.all(workers);
    const totalBytes = Object.values(summary).reduce((sum, item) => sum + item.bytes, 0);
    const completed = now();
    withImmediateObservabilityTransaction((tx) => {
      tx.prepare("UPDATE storage_index_snapshots_v2 SET active=0 WHERE active=1").run();
      tx.prepare("UPDATE storage_index_snapshots_v2 SET status='completed',active=1,summary_json=?,progress_json=?,completed_at=?,updated_at=? WHERE generation=?")
        .run(JSON.stringify({ ...summary, totalBytes }), JSON.stringify({ completed: names.length, total: names.length }), completed, completed, generation);
    });
  } catch (error: any) {
    db.prepare("UPDATE storage_index_snapshots_v2 SET status='failed',error_summary=?,updated_at=? WHERE generation=?")
      .run(String(error?.message || error).slice(0, 1000), now(), generation);
  }
}

export function startStorageIndexScan(options: { force?: boolean } = {}) {
  return withImmediateObservabilityTransaction((db) => {
    const building = db.prepare("SELECT generation FROM storage_index_snapshots_v2 WHERE status='building' LIMIT 1").get() as any;
    if (building) return { accepted: false, generation: building.generation, reason: "already_building" };
    const active = db.prepare("SELECT completed_at FROM storage_index_snapshots_v2 WHERE active=1 ORDER BY completed_at DESC LIMIT 1").get() as any;
    if (!options.force && active?.completed_at && Date.now() - Date.parse(active.completed_at) < 30 * 60_000) {
      return { accepted: false, reason: "fresh" };
    }
    const generation = `storage_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const created = now();
    db.prepare("INSERT INTO storage_index_snapshots_v2(generation,status,created_at,updated_at,progress_json,active) VALUES(?,'building',?,?,?,0)")
      .run(generation, created, created, JSON.stringify({ completed: 0, total: Object.keys(categories).length }));
    setImmediate(() => void buildGeneration(generation));
    return { accepted: true, generation };
  });
}

export function getStorageIndexStatus() {
  const db = getObservabilityDatabase();
  const active = db.prepare("SELECT * FROM storage_index_snapshots_v2 WHERE active=1 ORDER BY completed_at DESC LIMIT 1").get() as any;
  const building = db.prepare("SELECT * FROM storage_index_snapshots_v2 WHERE status='building' ORDER BY created_at DESC LIMIT 1").get() as any;
  const row = building || active;
  return {
    schema: "ccm-storage-index-snapshot-v2",
    status: building ? "index_building" : (active ? "ready" : "index_missing"),
    generation: row?.generation || "",
    active_generation: active?.generation || "",
    scanned_at: active?.completed_at || null,
    stale: !!active?.completed_at && Date.now() - Date.parse(active.completed_at) > 60 * 60_000,
    progress: parse(building?.progress_json, null),
    summary: parse(active?.summary_json, null),
    error: row?.error_summary || "",
  };
}

export function startStorageIndexScheduler() {
  startStorageIndexScan();
  if (scheduler) clearInterval(scheduler);
  scheduler = setInterval(() => startStorageIndexScan(), 30 * 60_000);
  scheduler.unref?.();
}

export function stopStorageIndexScheduler() {
  if (scheduler) clearInterval(scheduler);
  scheduler = null;
}

