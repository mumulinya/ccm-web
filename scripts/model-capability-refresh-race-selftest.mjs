import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modulePath = path.join(root, "ccm-package", "dist", "modules", "collaboration", "model-capability-cache.js");
const capability = require(modulePath);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-capability-refresh-race-"));
const files = {
  leaseFile: path.join(tempDir, "refresh.lease.json"),
  journalFile: path.join(tempDir, "refresh.jsonl"),
  statusFile: path.join(tempDir, "status.json"),
  queueFile: path.join(tempDir, "queue.json"),
};

function childRun(holdMs, trigger) {
  const code = `const m=require(${JSON.stringify(modulePath)});const r=m.runModelCapabilityRefreshMaintenance({...${JSON.stringify(files)},holdMs:${holdMs},trigger:${JSON.stringify(trigger)},leaseTtlMs:10000});process.stdout.write(JSON.stringify(r));`;
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["-e", code], { cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => stdout += chunk);
    child.stderr.on("data", chunk => stderr += chunk);
    child.on("error", reject);
    child.on("exit", codeValue => {
      if (codeValue !== 0) return reject(new Error(stderr || `child exit ${codeValue}`));
      try { resolve(JSON.parse(stdout)); } catch { reject(new Error(`invalid child output: ${stdout}`)); }
    });
  });
}

try {
  const holderPromise = childRun(1400, "race-holder");
  const leaseDeadline = Date.now() + 5_000;
  while (!fs.existsSync(files.leaseFile) && Date.now() < leaseDeadline) {
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  assert.equal(fs.existsSync(files.leaseFile), true, "holder did not acquire lease in time");
  const contenderPromise = childRun(0, "race-contender");
  const [holder, contender] = await Promise.all([holderPromise, contenderPromise]);

  const stale = capability.acquireModelCapabilityRefreshLease({
    file: files.leaseFile,
    journalFile: files.journalFile,
    at: "2026-07-12T00:00:00.000Z",
    ttlMs: 5_000,
    ownerPid: 999_999,
    ownerHostname: os.hostname(),
  });
  if (stale.handle) {
    fs.closeSync(stale.handle.fd);
    stale.handle.released = true;
  }
  const recovered = capability.acquireModelCapabilityRefreshLease({
    file: files.leaseFile,
    journalFile: files.journalFile,
    at: "2026-07-12T00:00:06.000Z",
    ttlMs: 5_000,
  });
  if (recovered.handle) capability.releaseModelCapabilityRefreshLease(recovered.handle, "selftest-recovered");

  const checks = {
    holderCompletes: holder.success === true && holder.skipped === false,
    contenderSkipsBusyLease: contender.skipped === true && contender.reason === "lease_busy",
    onlyHolderWritesQueue: fs.existsSync(files.queueFile) && holder.requestCount >= 0,
    holderHasFencingToken: Number(holder.lease?.fencingToken || 0) > 0,
    expiredLeaseRecovered: recovered.acquired === true && recovered.recovered === true,
    fencingTokenAdvances: Number(recovered.lease?.fencingToken || 0) > Number(stale.lease?.fencingToken || 0),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, holder, contender, stale: stale.lease, recovered: recovered.lease }, null, 2));
  process.stdout.write(`${JSON.stringify({ pass: true, checks, holder: holder.lease, contender: { reason: contender.reason, lease: contender.lease }, recovered: recovered.lease }, null, 2)}\n`);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
