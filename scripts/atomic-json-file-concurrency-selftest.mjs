import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const storage = require("../ccm-package/dist/core/atomic-json-file.js");
const mode = process.argv[2] || "parent";

if (mode === "worker") {
  const file = process.argv[3];
  const id = process.argv[4];
  storage.withFileLock(file, () => {
    const current = storage.readJsonWithBackup(file, { schema: "atomic-json-selftest-v1", entries: {} });
    const workerNumber = Number(id);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5 + (Number.isFinite(workerNumber) ? workerNumber % 5 : 0));
    current.entries[id] = { pid: process.pid, id };
    storage.writeJsonAtomic(file, current);
  }, { timeoutMs: 30_000, staleMs: 2_000 });
  process.exit(0);
}

function runWorker(file, id) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [process.argv[1], "worker", file, String(id)], { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", reject);
    child.on("exit", code => code === 0 ? resolve() : reject(new Error(`worker ${id} exited ${code}: ${stderr}`)));
  });
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-atomic-json-"));
const file = path.join(root, "state.json");
try {
  storage.writeJsonAtomic(file, { schema: "atomic-json-selftest-v1", entries: {} });
  await Promise.all(Array.from({ length: 24 }, (_, index) => runWorker(file, index)));
  const afterContention = JSON.parse(fs.readFileSync(file, "utf-8"));
  assert.equal(Object.keys(afterContention.entries).length, 24, "cross-process updates must not be lost");

  fs.writeFileSync(`${file}.lock`, JSON.stringify({
    schema: "ccm-exclusive-file-lock-v1",
    token: "dead-owner",
    pid: 2147483000,
    hostname: os.hostname(),
    acquired_at: new Date().toISOString(),
  }), "utf-8");
  await runWorker(file, "takeover");
  const afterTakeover = JSON.parse(fs.readFileSync(file, "utf-8"));
  assert.equal(afterTakeover.entries.takeover.id, "takeover", "dead owner lock must be reclaimed");

  fs.writeFileSync(`${file}.lock`, JSON.stringify({
    schema: "ccm-exclusive-file-lock-v1",
    token: "released-owner",
    pid: process.pid,
    hostname: os.hostname(),
    acquired_at: new Date().toISOString(),
    released_at: new Date().toISOString(),
  }), "utf-8");
  await runWorker(file, "released");
  const afterReleasedLock = JSON.parse(fs.readFileSync(file, "utf-8"));
  assert.equal(afterReleasedLock.entries.released.id, "released", "explicitly released lock must be reclaimable even while its former PID is alive");

  const recoveryFile = path.join(root, "recovery.json");
  storage.writeJsonAtomic(recoveryFile, { generation: 1 });
  storage.writeJsonAtomic(recoveryFile, { generation: 2 });
  fs.writeFileSync(recoveryFile, "{corrupt", "utf-8");
  assert.equal(storage.readJsonWithBackup(recoveryFile, {}).generation, 1, "corrupt primary must recover from the last valid backup");
  storage.writeJsonAtomic(recoveryFile, { generation: 3 });
  assert.equal(JSON.parse(fs.readFileSync(`${recoveryFile}.bak`, "utf-8")).generation, 1, "corrupt primary must not replace a valid backup");

  const leftovers = fs.readdirSync(root).filter(name => name.endsWith(".lock") || name.endsWith(".tmp") || name.endsWith(".replace-backup"));
  assert.deepEqual(leftovers, [], "lock and replacement artifacts must be cleaned");
  console.log(JSON.stringify({ pass: true, workers: 24, entries: Object.keys(afterReleasedLock.entries).length, deadOwnerTakeover: true, releasedLockTakeover: true, corruptPrimaryRecovery: true, leftovers: 0 }, null, 2));
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
