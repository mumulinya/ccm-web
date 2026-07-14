import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
import { CCM_DIR } from "../../core/utils";

export const GROUP_SESSION_MEMORY_EXTRACTION_LEASE_TTL_MS = 60_000;
export const GROUP_SESSION_MEMORY_EXTRACTION_WAIT_TIMEOUT_MS = 15_000;
export const GROUP_SESSION_MEMORY_EXTRACTION_RETRY_BASE_MS = 30_000;
export const GROUP_SESSION_MEMORY_EXTRACTION_RETRY_MAX_MS = 30 * 60_000;

function cleanScope(value: string) {
  return String(value || "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 240) || "unknown";
}

function extractionDir(scopeId: string) {
  return path.join(CCM_DIR, "group-session-memory", cleanScope(scopeId));
}

export function getGroupSessionMemoryExtractionLeaseFile(scopeId: string) {
  return path.join(extractionDir(scopeId), ".extraction-lease.json");
}

export function getGroupSessionMemoryExtractionStateFile(scopeId: string) {
  return path.join(extractionDir(scopeId), "extraction-state.json");
}

function checksum(value: any) {
  const copy = { ...(value || {}) };
  delete copy.leaseChecksum;
  return crypto.createHash("sha256").update(JSON.stringify(copy)).digest("hex").slice(0, 32);
}

function processAlive(pid: number) {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function writeJsonAtomic(file: string, value: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.${crypto.randomBytes(3).toString("hex")}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
  fs.renameSync(temp, file);
}

export function readGroupSessionMemoryExtractionState(scopeId: string) {
  const file = getGroupSessionMemoryExtractionStateFile(scopeId);
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    return { ...parsed, file };
  } catch {
    return {
      schema: "ccm-group-session-memory-extraction-state-v1",
      version: 1,
      scopeId,
      file,
      status: "idle",
      attempts: 0,
      completed: 0,
      failed: 0,
      recovered: 0,
      lastFencingToken: 0,
      updatedAt: "",
    };
  }
}

export function inspectGroupSessionMemoryExtractionLease(scopeId: string, options: any = {}) {
  const file = String(options.file || getGroupSessionMemoryExtractionLeaseFile(scopeId));
  let lease: any = null;
  try { lease = JSON.parse(fs.readFileSync(file, "utf-8")); } catch {}
  if (!lease) return { file, present: false, valid: true, active: false, stale: false, lease: null };
  const atMs = Date.parse(String(options.at || "")) || Date.now();
  const checksumValid = lease.leaseChecksum === checksum(lease);
  const ownerLocal = String(lease.ownerHostname || "") === os.hostname();
  const ownerAlive = !ownerLocal || processAlive(Number(lease.ownerPid || 0));
  const unexpired = atMs < (Date.parse(String(lease.expiresAt || "")) || 0);
  const valid = lease.schema === "ccm-group-session-memory-extraction-lease-v1" && checksumValid && Number(lease.fencingToken || 0) > 0;
  const active = valid && lease.status === "active" && ownerAlive && unexpired;
  return { file, present: true, valid, checksumValid, ownerAlive, unexpired, active, stale: valid && lease.status === "active" && !active, lease };
}

function writeLeaseHandle(handle: any, value: any) {
  const lease = { ...value };
  lease.leaseChecksum = checksum(lease);
  const body = JSON.stringify(lease, null, 2);
  fs.ftruncateSync(handle.fd, 0);
  fs.writeSync(handle.fd, body, 0, "utf-8");
  fs.fsyncSync(handle.fd);
  handle.lease = lease;
  return lease;
}

export function acquireGroupSessionMemoryExtractionLease(scopeId: string, options: any = {}) {
  const file = String(options.file || getGroupSessionMemoryExtractionLeaseFile(scopeId));
  const at = String(options.at || new Date().toISOString());
  const atMs = Date.parse(at) || Date.now();
  const ttlMs = Math.max(5_000, Math.min(5 * 60_000, Number(options.ttlMs || options.ttl_ms || GROUP_SESSION_MEMORY_EXTRACTION_LEASE_TTL_MS)));
  const state = readGroupSessionMemoryExtractionState(scopeId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let previous: any = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const status = inspectGroupSessionMemoryExtractionLease(scopeId, { file, at });
    if (status.present) {
      if (!status.valid) return { acquired: false, reason: "invalid_lease", status };
      if (status.active) return { acquired: false, reason: "lease_busy", status };
      previous = status.lease;
      try { fs.renameSync(file, `${file}.abandoned.${Date.now()}.${crypto.randomBytes(3).toString("hex")}`); }
      catch { if (fs.existsSync(file)) continue; }
    }
    let fd = -1;
    try {
      fd = fs.openSync(file, "wx+");
      const recovered = previous?.status === "active";
      const lease = {
        schema: "ccm-group-session-memory-extraction-lease-v1",
        version: 1,
        scopeId,
        leaseId: `gsmx_${crypto.randomBytes(12).toString("hex")}`,
        ownerPid: Number(options.ownerPid || process.pid),
        ownerHostname: String(options.ownerHostname || os.hostname()),
        ownerInstanceId: String(options.ownerInstanceId || `${os.hostname()}:${process.pid}`),
        fencingToken: Math.max(Number(state.lastFencingToken || 0), Number(previous?.fencingToken || 0)) + 1,
        recoveryCount: Number(state.recovered || 0) + (recovered ? 1 : 0),
        status: "active",
        acquiredAt: at,
        expiresAt: new Date(atMs + ttlMs).toISOString(),
      };
      const handle: any = { fd, file, ttlMs, lease, released: false };
      writeLeaseHandle(handle, lease);
      return { acquired: true, recovered, handle, lease: handle.lease };
    } catch (error: any) {
      if (fd >= 0) try { fs.closeSync(fd); } catch {}
      if (error?.code === "EEXIST") continue;
      return { acquired: false, reason: "lease_acquire_failed", error: String(error?.message || error) };
    }
  }
  return { acquired: false, reason: "lease_contended" };
}

function releaseLease(handle: any, finalStatus: string) {
  if (!handle || handle.released || handle.fd < 0) return false;
  try {
    const now = new Date().toISOString();
    writeLeaseHandle(handle, { ...handle.lease, status: "released", finalStatus, releasedAt: now, expiresAt: now });
    fs.closeSync(handle.fd);
    handle.released = true;
    const current = inspectGroupSessionMemoryExtractionLease(handle.lease.scopeId, { file: handle.file });
    if (current.lease?.leaseId === handle.lease.leaseId && current.lease?.fencingToken === handle.lease.fencingToken) fs.unlinkSync(handle.file);
    return true;
  } catch {
    try { fs.closeSync(handle.fd); } catch {}
    handle.released = true;
    return false;
  }
}

export function releaseGroupSessionMemoryExtractionLease(handle: any, finalStatus = "completed") {
  return releaseLease(handle, finalStatus);
}

export function verifyGroupSessionMemoryExtractionLease(handle: any, options: any = {}) {
  if (!handle?.lease?.scopeId || !handle?.file || handle.released === true) {
    return { valid: false, active: false, owned: false, reason: "lease_handle_unavailable", status: null };
  }
  const status = inspectGroupSessionMemoryExtractionLease(handle.lease.scopeId, {
    file: handle.file,
    at: options.at,
  });
  const owned = status.active === true
    && status.lease?.leaseId === handle.lease.leaseId
    && Number(status.lease?.fencingToken || 0) === Number(handle.lease.fencingToken || 0);
  return {
    valid: status.valid === true,
    active: status.active === true,
    owned,
    reason: owned ? "owned" : status.present ? status.stale ? "lease_stale" : "lease_replaced" : "lease_missing",
    status,
  };
}

export function renewGroupSessionMemoryExtractionLease(handle: any, options: any = {}) {
  const before = verifyGroupSessionMemoryExtractionLease(handle, options);
  if (!before.owned) return { renewed: false, reason: before.reason, verification: before };
  const at = String(options.at || new Date().toISOString());
  const atMs = Date.parse(at) || Date.now();
  const ttlMs = Math.max(5_000, Math.min(5 * 60_000, Number(options.ttlMs || options.ttl_ms || handle.ttlMs || GROUP_SESSION_MEMORY_EXTRACTION_LEASE_TTL_MS)));
  try {
    const lease = writeLeaseHandle(handle, {
      ...handle.lease,
      status: "active",
      renewedAt: at,
      renewalCount: Number(handle.lease.renewalCount || 0) + 1,
      expiresAt: new Date(atMs + ttlMs).toISOString(),
    });
    const after = verifyGroupSessionMemoryExtractionLease(handle, { at });
    if (!after.owned) return { renewed: false, reason: "lease_lost_during_renewal", verification: after, lease };
    return { renewed: true, reason: "renewed", verification: after, lease };
  } catch (error: any) {
    return { renewed: false, reason: "lease_renewal_failed", error: String(error?.message || error), verification: before };
  }
}

export async function waitForGroupSessionMemoryExtraction(scopeId: string, options: any = {}) {
  const startedAt = Date.now();
  const timeoutMs = Math.max(0, Number(options.timeoutMs || options.timeout_ms || GROUP_SESSION_MEMORY_EXTRACTION_WAIT_TIMEOUT_MS));
  const pollMs = Math.max(25, Number(options.pollMs || options.poll_ms || 250));
  while (true) {
    const status = inspectGroupSessionMemoryExtractionLease(scopeId);
    if (!status.active) return { completed: !status.present || !status.stale, timedOut: false, stale: status.stale, status };
    if (Date.now() - startedAt >= timeoutMs) return { completed: false, timedOut: true, stale: false, status };
    await new Promise(resolve => setTimeout(resolve, pollMs));
  }
}

export function runGroupSessionMemoryExtractionTransaction(scopeId: string, operation: (transaction: any) => any, options: any = {}) {
  const acquired: any = acquireGroupSessionMemoryExtractionLease(scopeId, options);
  if (!acquired.acquired) return { committed: false, status: acquired.reason || "lease_unavailable", acquired };
  const stateFile = getGroupSessionMemoryExtractionStateFile(scopeId);
  const prior = readGroupSessionMemoryExtractionState(scopeId);
  const startedAt = String(options.at || new Date().toISOString());
  const base = {
    ...prior,
    schema: "ccm-group-session-memory-extraction-state-v1",
    version: 1,
    scopeId,
    file: stateFile,
    status: "in_progress",
    attempts: Number(prior.attempts || 0) + 1,
    recovered: Number(prior.recovered || 0) + (acquired.recovered ? 1 : 0),
    leaseId: acquired.lease.leaseId,
    fencingToken: acquired.lease.fencingToken,
    startedAt,
    updatedAt: startedAt,
  };
  writeJsonAtomic(stateFile, base);
  try {
    if (options.failBeforeCommit === true || options.fail_before_commit === true) throw new Error("injected_session_memory_extraction_failure_before_commit");
    const operationResult = operation({
      scopeId,
      lease: acquired.lease,
      recovered: acquired.recovered,
      state: base,
      verifyLease: (verifyOptions: any = {}) => verifyGroupSessionMemoryExtractionLease(acquired.handle, verifyOptions),
      renewLease: (renewOptions: any = {}) => renewGroupSessionMemoryExtractionLease(acquired.handle, renewOptions),
    });
    const staged = operationResult?.schema === "ccm-group-session-memory-extraction-staged-commit-v1"
      && typeof operationResult.commit === "function";
    const renewal = renewGroupSessionMemoryExtractionLease(acquired.handle, {
      at: options.commitAt || options.commit_at,
      ttlMs: options.ttlMs || options.ttl_ms,
    });
    if (!renewal.renewed) throw new Error(`session_memory_extraction_lease_lost_before_commit:${renewal.reason}`);
    const value = staged
      ? operationResult.commit({
        scopeId,
        lease: acquired.handle.lease,
        recovered: acquired.recovered,
        state: base,
        renewal,
      })
      : operationResult;
    const ownership = verifyGroupSessionMemoryExtractionLease(acquired.handle, { at: options.commitAt || options.commit_at });
    if (!ownership.owned) throw new Error(`session_memory_extraction_lease_lost_after_commit:${ownership.reason}`);
    const completedAt = new Date().toISOString();
    const completed = {
      ...base,
      status: "completed",
      completed: Number(prior.completed || 0) + 1,
      failed: Number(prior.failed || 0),
      lastFencingToken: Number(acquired.lease.fencingToken || 0),
      lastCompletedAt: completedAt,
      lastError: "",
      updatedAt: completedAt,
    };
    writeJsonAtomic(stateFile, completed);
    releaseLease(acquired.handle, "completed");
    return { committed: true, status: "completed", value, lease: acquired.lease, recovered: acquired.recovered, state: completed };
  } catch (error: any) {
    const failedAt = new Date().toISOString();
    const latest = readGroupSessionMemoryExtractionState(scopeId);
    const failed = {
      ...base,
      status: "failed",
      completed: Number(prior.completed || 0),
      failed: Number(prior.failed || 0) + 1,
      lastFencingToken: Number(acquired.lease.fencingToken || 0),
      lastFailedAt: failedAt,
      lastError: String(error?.message || error),
      updatedAt: failedAt,
    };
    const superseded = Number(latest.fencingToken || latest.lastFencingToken || 0) > Number(acquired.lease.fencingToken || 0)
      || (latest.status === "in_progress" && latest.leaseId && latest.leaseId !== acquired.lease.leaseId);
    if (!superseded) {
      try { writeJsonAtomic(stateFile, failed); } catch {}
    }
    releaseLease(acquired.handle, "failed");
    return {
      committed: false,
      status: superseded ? "lease_lost" : "failed",
      error: failed.lastError,
      lease: acquired.lease,
      recovered: acquired.recovered,
      superseded,
      state: superseded ? latest : failed,
    };
  }
}

function extractionRetryBackoffMs(consecutiveFailures: number, options: any = {}) {
  const baseMs = Math.max(1_000, Number(options.retryBaseMs || options.retry_base_ms || GROUP_SESSION_MEMORY_EXTRACTION_RETRY_BASE_MS));
  const maxMs = Math.max(baseMs, Number(options.retryMaxMs || options.retry_max_ms || GROUP_SESSION_MEMORY_EXTRACTION_RETRY_MAX_MS));
  return Math.min(maxMs, baseMs * Math.pow(2, Math.max(0, Math.min(10, consecutiveFailures - 1))));
}

export async function runGroupSessionMemoryExtractionTransactionAsync(
  scopeId: string,
  operation: (transaction: any) => Promise<any> | any,
  options: any = {}
) {
  const observedAt = String(options.at || new Date().toISOString());
  const observedAtMs = Date.parse(observedAt) || Date.now();
  const prior = readGroupSessionMemoryExtractionState(scopeId);
  const nextRetryAtMs = Date.parse(String(prior.nextRetryAt || "")) || 0;
  if (options.respectBackoff !== false && nextRetryAtMs > observedAtMs) {
    return {
      committed: false,
      status: "retry_backoff",
      retryAt: prior.nextRetryAt,
      retryInMs: nextRetryAtMs - observedAtMs,
      state: prior,
    };
  }

  const acquired: any = acquireGroupSessionMemoryExtractionLease(scopeId, options);
  if (!acquired.acquired) return { committed: false, status: acquired.reason || "lease_unavailable", acquired };
  const stateFile = getGroupSessionMemoryExtractionStateFile(scopeId);
  const startedAt = observedAt;
  const base = {
    ...prior,
    schema: "ccm-group-session-memory-extraction-state-v1",
    version: 1,
    scopeId,
    file: stateFile,
    status: "in_progress",
    mode: String(options.mode || "async_model_extraction"),
    attempts: Number(prior.attempts || 0) + 1,
    recovered: Number(prior.recovered || 0) + (acquired.recovered ? 1 : 0),
    leaseId: acquired.lease.leaseId,
    fencingToken: acquired.lease.fencingToken,
    startedAt,
    updatedAt: startedAt,
  };
  writeJsonAtomic(stateFile, base);

  const heartbeatMs = Math.max(1_000, Math.min(
    20_000,
    Number(options.heartbeatMs || options.heartbeat_ms || Math.floor(Number(acquired.handle.ttlMs || GROUP_SESSION_MEMORY_EXTRACTION_LEASE_TTL_MS) / 3))
  ));
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let heartbeatFailure = "";
  if (options.autoRenew !== false && options.auto_renew !== false) {
    heartbeat = setInterval(() => {
      const renewed = renewGroupSessionMemoryExtractionLease(acquired.handle, {
        ttlMs: options.ttlMs || options.ttl_ms,
      });
      if (!renewed.renewed) heartbeatFailure = renewed.reason || "lease_heartbeat_failed";
    }, heartbeatMs);
    heartbeat.unref?.();
  }

  try {
    if (options.failBeforeCommit === true || options.fail_before_commit === true) {
      throw new Error("injected_session_memory_extraction_failure_before_commit");
    }
    const operationResult = await operation({
      scopeId,
      lease: acquired.lease,
      recovered: acquired.recovered,
      state: base,
      verifyLease: (verifyOptions: any = {}) => verifyGroupSessionMemoryExtractionLease(acquired.handle, verifyOptions),
      renewLease: (renewOptions: any = {}) => renewGroupSessionMemoryExtractionLease(acquired.handle, renewOptions),
    });
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
    if (heartbeatFailure) throw new Error(`session_memory_extraction_lease_heartbeat_lost:${heartbeatFailure}`);

    const staged = operationResult?.schema === "ccm-group-session-memory-extraction-staged-commit-v1"
      && typeof operationResult.commit === "function";
    const renewal = renewGroupSessionMemoryExtractionLease(acquired.handle, {
      at: options.commitAt || options.commit_at,
      ttlMs: options.ttlMs || options.ttl_ms,
    });
    if (!renewal.renewed) throw new Error(`session_memory_extraction_lease_lost_before_commit:${renewal.reason}`);
    const value = staged
      ? await operationResult.commit({
        scopeId,
        lease: acquired.handle.lease,
        recovered: acquired.recovered,
        state: base,
        renewal,
      })
      : operationResult;
    const ownership = verifyGroupSessionMemoryExtractionLease(acquired.handle, { at: options.commitAt || options.commit_at });
    if (!ownership.owned) throw new Error(`session_memory_extraction_lease_lost_after_commit:${ownership.reason}`);
    const completedAt = String(options.completedAt || options.completed_at || new Date().toISOString());
    const completed = {
      ...base,
      status: "completed",
      completed: Number(prior.completed || 0) + 1,
      failed: Number(prior.failed || 0),
      consecutiveFailures: 0,
      retryBackoffMs: 0,
      nextRetryAt: "",
      lastFencingToken: Number(acquired.lease.fencingToken || 0),
      lastCompletedAt: completedAt,
      lastError: "",
      lastFailureClass: "",
      updatedAt: completedAt,
    };
    writeJsonAtomic(stateFile, completed);
    releaseLease(acquired.handle, "completed");
    return { committed: true, status: "completed", value, lease: acquired.lease, recovered: acquired.recovered, state: completed };
  } catch (error: any) {
    if (heartbeat) clearInterval(heartbeat);
    const failedAt = String(options.failedAt || options.failed_at || new Date().toISOString());
    const failedAtMs = Date.parse(failedAt) || Date.now();
    const latest = readGroupSessionMemoryExtractionState(scopeId);
    const consecutiveFailures = Number(prior.consecutiveFailures || 0) + 1;
    const retryBackoffMs = extractionRetryBackoffMs(consecutiveFailures, options);
    const errorText = String(error?.message || error);
    const failureClass = String(error?.code || options.failureClass || options.failure_class || (
      /timeout|abort/i.test(errorText) ? "timeout"
        : /parse|template|markdown|section|budget|validation/i.test(errorText) ? "invalid_model_output"
          : /lease|fenc/i.test(errorText) ? "lease_lost"
            : "model_execution_failed"
    ));
    const failed = {
      ...base,
      status: "failed",
      completed: Number(prior.completed || 0),
      failed: Number(prior.failed || 0) + 1,
      consecutiveFailures,
      retryBackoffMs,
      nextRetryAt: new Date(failedAtMs + retryBackoffMs).toISOString(),
      lastFencingToken: Number(acquired.lease.fencingToken || 0),
      lastFailedAt: failedAt,
      lastError: errorText,
      lastFailureClass: failureClass,
      updatedAt: failedAt,
    };
    const superseded = Number(latest.fencingToken || latest.lastFencingToken || 0) > Number(acquired.lease.fencingToken || 0)
      || (latest.status === "in_progress" && latest.leaseId && latest.leaseId !== acquired.lease.leaseId);
    if (!superseded) {
      try { writeJsonAtomic(stateFile, failed); } catch {}
    }
    releaseLease(acquired.handle, "failed");
    return {
      committed: false,
      status: superseded ? "lease_lost" : "failed",
      error: errorText,
      failureClass,
      retryAt: failed.nextRetryAt,
      retryInMs: retryBackoffMs,
      lease: acquired.lease,
      recovered: acquired.recovered,
      superseded,
      state: superseded ? latest : failed,
    };
  }
}
