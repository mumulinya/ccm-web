import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
import { CCM_DIR } from "../../core/utils";
import { deleteGroupSessionMemoryArtifacts } from "./memory";
import { loadOrchestratorConfig } from "./group-orchestrator";
import { loadGroups, pruneArchivedGroupChatSessions, purgeLegacyDefaultGroupChatSession } from "./storage";

const STATUS_FILE = path.join(CCM_DIR, "memory-control", "group-session-retention-maintenance.json");
const LEASE_FILE = path.join(CCM_DIR, "memory-control", "group-session-retention-maintenance.lease.json");
const JOURNAL_FILE = path.join(CCM_DIR, "memory-control", "group-session-retention-maintenance.jsonl");
let maintenanceTimer: NodeJS.Timeout | null = null;
let initialTimer: NodeJS.Timeout | null = null;

function maintenanceChecksum(value: any) {
  const copy = { ...(value || {}) };
  delete copy.leaseChecksum;
  return crypto.createHash("sha256").update(JSON.stringify(copy)).digest("hex").slice(0, 32);
}

function processAlive(pid: number) {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

export function inspectGroupSessionRetentionMaintenanceLease(options: any = {}) {
  const file = String(options.file || LEASE_FILE);
  let lease: any = null;
  try { lease = JSON.parse(fs.readFileSync(file, "utf-8")); } catch {}
  if (!lease) return { file, present: false, valid: true, active: false, abandoned: false, lease: null };
  const atMs = Date.parse(String(options.at || "")) || Date.now();
  const checksumValid = lease.leaseChecksum === maintenanceChecksum(lease);
  const ownerLocal = String(lease.ownerHostname || "") === os.hostname();
  const ownerAlive = !ownerLocal || processAlive(Number(lease.ownerPid || 0));
  const unexpired = atMs < (Date.parse(String(lease.expiresAt || "")) || 0);
  const valid = lease.schema === "ccm-group-session-retention-maintenance-lease-v1" && checksumValid && Number(lease.fencingToken || 0) > 0;
  const active = valid && lease.status === "active" && ownerAlive && unexpired;
  return { file, present: true, valid, checksumValid, ownerAlive, unexpired, active, abandoned: valid && lease.status === "active" && !active, lease };
}

function writeLeaseHandle(handle: any, input: any) {
  const lease = { ...input };
  lease.leaseChecksum = maintenanceChecksum(lease);
  const body = JSON.stringify(lease, null, 2);
  fs.ftruncateSync(handle.fd, 0);
  fs.writeSync(handle.fd, body, 0, "utf-8");
  fs.fsyncSync(handle.fd);
  handle.lease = lease;
  return lease;
}

export function acquireGroupSessionRetentionMaintenanceLease(options: any = {}) {
  const file = String(options.file || LEASE_FILE);
  const at = String(options.at || new Date().toISOString());
  const atMs = Date.parse(at) || Date.now();
  const ttlMs = Math.max(5_000, Math.min(30 * 60_000, Number(options.ttlMs || 5 * 60_000)));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let previous: any = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const status = inspectGroupSessionRetentionMaintenanceLease({ file, at });
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
        schema: "ccm-group-session-retention-maintenance-lease-v1",
        leaseId: `gsrm_${crypto.randomBytes(12).toString("hex")}`,
        ownerPid: Number(options.ownerPid || process.pid),
        ownerHostname: String(options.ownerHostname || os.hostname()),
        ownerInstanceId: String(options.ownerInstanceId || `${os.hostname()}:${process.pid}`),
        fencingToken: Math.max(1, Number(previous?.fencingToken || 0) + 1),
        recoveryCount: Number(previous?.recoveryCount || 0) + (recovered ? 1 : 0),
        status: "active",
        acquiredAt: at,
        renewedAt: at,
        expiresAt: new Date(atMs + ttlMs).toISOString(),
        releasedAt: "",
        finalStatus: "",
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

export function renewGroupSessionRetentionMaintenanceLease(handle: any) {
  if (!handle || handle.released || handle.fd < 0) return false;
  const current = inspectGroupSessionRetentionMaintenanceLease({ file: handle.file });
  if (!current.active || current.lease?.leaseId !== handle.lease?.leaseId || current.lease?.fencingToken !== handle.lease?.fencingToken) return false;
  const now = new Date();
  writeLeaseHandle(handle, { ...handle.lease, renewedAt: now.toISOString(), expiresAt: new Date(now.getTime() + handle.ttlMs).toISOString() });
  return true;
}

export function releaseGroupSessionRetentionMaintenanceLease(handle: any, finalStatus = "completed") {
  if (!handle || handle.released || handle.fd < 0) return false;
  try {
    const now = new Date().toISOString();
    writeLeaseHandle(handle, { ...handle.lease, status: "released", releasedAt: now, expiresAt: now, finalStatus });
    fs.closeSync(handle.fd);
    handle.released = true;
    return true;
  } catch {
    try { fs.closeSync(handle.fd); } catch {}
    handle.released = true;
    return false;
  }
}

function appendMaintenanceJournal(entry: any) {
  fs.mkdirSync(path.dirname(JOURNAL_FILE), { recursive: true });
  fs.appendFileSync(JOURNAL_FILE, `${JSON.stringify(entry)}\n`, "utf-8");
}

function writeStatus(status: any) {
  fs.mkdirSync(path.dirname(STATUS_FILE), { recursive: true });
  const temp = `${STATUS_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(status, null, 2), "utf-8");
  fs.renameSync(temp, STATUS_FILE);
}

export function readGroupSessionRetentionMaintenanceStatus() {
  try { return JSON.parse(fs.readFileSync(STATUS_FILE, "utf-8")); }
  catch {
    return {
      schema: "ccm-group-session-retention-maintenance-status-v1",
      enabled: false,
      running: false,
      lastRunAt: "",
      nextRunAt: "",
      groups: [],
    };
  }
}

export function purgeLegacyDefaultGroupSessions(options: any = {}) {
  const groups = Array.isArray(options.groups) ? options.groups : loadGroups();
  const purgeFn = options.purgeFn || purgeLegacyDefaultGroupChatSession;
  const artifactDeleteFn = options.artifactDeleteFn || deleteGroupSessionMemoryArtifacts;
  const rows: any[] = [];
  for (const group of groups) {
    const groupId = String(group?.id || "");
    if (!groupId) continue;
    try {
      const result = purgeFn(groupId, { force: true });
      const memoryArtifacts = artifactDeleteFn(groupId, "default");
      rows.push({ groupId, purged: result?.purged === true, reason: result?.reason || "", memoryArtifacts });
    } catch (error: any) {
      rows.push({ groupId, purged: false, error: String(error?.message || error) });
    }
  }
  const summary = {
    schema: "ccm-group-chat-legacy-session-fleet-purge-v1",
    generatedAt: new Date().toISOString(),
    groupCount: rows.length,
    purgedCount: rows.filter(row => row.purged).length,
    failedCount: rows.filter(row => !!row.error).length,
    migrationPerformed: false,
    policy: "delete_legacy_default_without_migration",
    rows,
  };
  if (options.skipJournal !== true) {
    appendMaintenanceJournal({ type: "legacy_default_purge", at: summary.generatedAt, groupCount: summary.groupCount, purgedCount: summary.purgedCount, failedCount: summary.failedCount });
  }
  return summary;
}

export function runGroupSessionRetentionMaintenance(options: any = {}) {
  const config = { ...loadOrchestratorConfig(), ...(options.config || {}) };
  const enabled = options.force === true || config.groupSessionAutoPruneEnabled === true;
  const dryRun = options.dryRun === true || options.dry_run === true;
  const startedAt = new Date().toISOString();
  if (!enabled) {
    const disabled = {
      ...readGroupSessionRetentionMaintenanceStatus(),
      schema: "ccm-group-session-retention-maintenance-status-v1",
      enabled: false,
      running: false,
      skipped: true,
      reason: "auto_prune_disabled",
      checkedAt: startedAt,
    };
    writeStatus(disabled);
    return disabled;
  }
  const leaseResult: any = options.skipLease === true
    ? { acquired: true, recovered: false, handle: null, lease: { leaseId: "skip-lease", fencingToken: 0, ownerPid: process.pid, ownerHostname: os.hostname() } }
    : acquireGroupSessionRetentionMaintenanceLease({
      file: options.leaseFile,
      at: options.now,
      ttlMs: options.leaseTtlMs,
      ownerInstanceId: options.ownerInstanceId,
    });
  if (!leaseResult.acquired) {
    const busy = {
      ...readGroupSessionRetentionMaintenanceStatus(),
      schema: "ccm-group-session-retention-maintenance-status-v1",
      enabled: config.groupSessionAutoPruneEnabled === true,
      running: false,
      success: false,
      skipped: true,
      reason: leaseResult.reason || "lease_busy",
      lease: leaseResult.status?.lease || null,
      groupCount: 0,
      candidateCount: 0,
      deletedCount: 0,
      failedCount: 0,
      groups: [],
      checkedAt: startedAt,
    };
    writeStatus(busy);
    appendMaintenanceJournal({ type: "skipped", at: startedAt, reason: busy.reason, lease: busy.lease });
    return busy;
  }
  const groups = Array.isArray(options.groups) ? options.groups : loadGroups();
  const pruneFn = options.pruneFn || pruneArchivedGroupChatSessions;
  const artifactDeleteFn = options.artifactDeleteFn || deleteGroupSessionMemoryArtifacts;
  const rows: any[] = [];
  let runError = "";
  try {
    for (const group of groups) {
      const groupId = String(group?.id || "");
      const result = pruneFn(groupId, {
        retentionDays: config.groupSessionRetentionDays,
        maxArchived: config.groupSessionMaxArchived,
        dryRun,
        now: options.now,
      });
      if (!dryRun) {
        for (const row of result.results || []) {
          if (row.deleted) row.memoryArtifacts = artifactDeleteFn(groupId, row.id);
        }
      }
      rows.push({ groupId, groupName: String(group?.name || ""), ...result });
      if (leaseResult.handle && !renewGroupSessionRetentionMaintenanceLease(leaseResult.handle)) throw new Error("maintenance lease lost while processing groups");
    }
  } catch (error: any) {
    runError = String(error?.message || error);
  }
  const intervalHours = Math.max(1, Number(config.groupSessionRetentionIntervalHours || 24));
  const completedAt = new Date().toISOString();
  const status = {
    schema: "ccm-group-session-retention-maintenance-status-v1",
    enabled: config.groupSessionAutoPruneEnabled === true,
    running: false,
    success: !runError,
    error: runError,
    dryRun,
    trigger: String(options.trigger || "manual"),
    retentionDays: Number(config.groupSessionRetentionDays || 30),
    maxArchived: Number(config.groupSessionMaxArchived || 20),
    intervalHours,
    groupCount: rows.length,
    candidateCount: rows.reduce((sum: number, row: any) => sum + Number(row.candidateCount || 0), 0),
    deletedCount: rows.reduce((sum: number, row: any) => sum + (row.results || []).filter((item: any) => item.deleted).length, 0),
    failedCount: rows.reduce((sum: number, row: any) => sum + (row.results || []).filter((item: any) => !item.deleted).length, 0),
    groups: rows,
    lastRunAt: completedAt,
    startedAt,
    nextRunAt: new Date(Date.now() + intervalHours * 3_600_000).toISOString(),
    lease: {
      leaseId: leaseResult.lease?.leaseId || "",
      fencingToken: Number(leaseResult.lease?.fencingToken || 0),
      recoveryCount: Number(leaseResult.lease?.recoveryCount || 0),
      recovered: leaseResult.recovered === true,
      ownerPid: Number(leaseResult.lease?.ownerPid || 0),
      ownerHostname: String(leaseResult.lease?.ownerHostname || ""),
    },
  };
  writeStatus(status);
  appendMaintenanceJournal({ type: runError ? "failed" : "completed", at: completedAt, trigger: status.trigger, dryRun, groupCount: rows.length, candidateCount: status.candidateCount, deletedCount: status.deletedCount, error: runError, lease: status.lease });
  if (leaseResult.handle) releaseGroupSessionRetentionMaintenanceLease(leaseResult.handle, runError ? "failed" : "completed");
  return status;
}

export function startGroupSessionRetentionMaintenanceScheduler() {
  stopGroupSessionRetentionMaintenanceScheduler();
  const legacyPurge = purgeLegacyDefaultGroupSessions();
  const config = loadOrchestratorConfig();
  if (config.groupSessionAutoPruneEnabled !== true) {
    runGroupSessionRetentionMaintenance({ trigger: "startup-disabled-check" });
    return { started: false, enabled: false, legacyPurge };
  }
  const intervalMs = Math.max(1, Number(config.groupSessionRetentionIntervalHours || 24)) * 3_600_000;
  writeStatus({
    ...readGroupSessionRetentionMaintenanceStatus(),
    schema: "ccm-group-session-retention-maintenance-status-v1",
    enabled: true,
    running: false,
    scheduled: true,
    intervalHours: Number(config.groupSessionRetentionIntervalHours || 24),
    nextRunAt: new Date(Date.now() + 60_000).toISOString(),
    scheduledAt: new Date().toISOString(),
  });
  initialTimer = setTimeout(() => runGroupSessionRetentionMaintenance({ trigger: "startup" }), 60_000);
  initialTimer.unref?.();
  maintenanceTimer = setInterval(() => runGroupSessionRetentionMaintenance({ trigger: "interval" }), intervalMs);
  maintenanceTimer.unref?.();
  return { started: true, enabled: true, intervalMs, legacyPurge };
}

export function stopGroupSessionRetentionMaintenanceScheduler() {
  if (initialTimer) clearTimeout(initialTimer);
  if (maintenanceTimer) clearInterval(maintenanceTimer);
  initialTimer = null;
  maintenanceTimer = null;
}

export function runGroupSessionRetentionMaintenanceSelfTest() {
  const deleted: string[] = [];
  const leaseFile = `${LEASE_FILE}.selftest.${process.pid}.${Date.now()}.json`;
  const config = {
    groupSessionAutoPruneEnabled: true,
    groupSessionRetentionDays: 30,
    groupSessionMaxArchived: 20,
    groupSessionRetentionIntervalHours: 24,
  };
  const result = runGroupSessionRetentionMaintenance({
    force: true,
    groups: [{ id: "maintenance-a", name: "A" }, { id: "maintenance-b", name: "B" }],
    config,
    leaseFile,
    trigger: "selftest",
    pruneFn: (groupId: string, input: any) => ({
      schema: "ccm-group-chat-session-retention-v1",
      groupId,
      dryRun: input.dryRun,
      candidateCount: 1,
      results: [{ id: `${groupId}-old`, deleted: true }],
    }),
    artifactDeleteFn: (_groupId: string, sessionId: string) => { deleted.push(sessionId); return { deletedFiles: 3 }; },
  });
  const disabled = runGroupSessionRetentionMaintenance({ groups: [], config: { ...config, groupSessionAutoPruneEnabled: false } });
  const firstLease = acquireGroupSessionRetentionMaintenanceLease({ file: leaseFile, ttlMs: 10_000 });
  const competingLease = acquireGroupSessionRetentionMaintenanceLease({ file: leaseFile, ttlMs: 10_000 });
  if (firstLease.handle) releaseGroupSessionRetentionMaintenanceLease(firstLease.handle, "selftest-release");
  const staleStart = "2026-07-12T00:00:00.000Z";
  const staleLease = acquireGroupSessionRetentionMaintenanceLease({ file: leaseFile, at: staleStart, ttlMs: 5_000 });
  if (staleLease.handle && !staleLease.handle.released) {
    try { fs.closeSync(staleLease.handle.fd); staleLease.handle.released = true; } catch {}
  }
  const recoveredLease = acquireGroupSessionRetentionMaintenanceLease({ file: leaseFile, at: "2026-07-12T00:00:06.000Z", ttlMs: 5_000 });
  if (recoveredLease.handle) releaseGroupSessionRetentionMaintenanceLease(recoveredLease.handle, "selftest-recovered");
  const checks = {
    enabledRunCoversAllGroups: result.groupCount === 2 && result.candidateCount === 2,
    enabledRunDeletesArtifacts: result.deletedCount === 2 && deleted.length === 2,
    statusCarriesNextRun: !!result.nextRunAt && result.intervalHours === 24,
    disabledRunIsFailClosed: disabled.skipped === true && disabled.reason === "auto_prune_disabled",
    firstLeaseAcquires: firstLease.acquired === true,
    competingLeaseIsRejected: competingLease.acquired === false && competingLease.reason === "lease_busy",
    expiredLeaseIsRecovered: recoveredLease.acquired === true && recoveredLease.recovered === true,
    fencingTokenAdvancesOnRecovery: Number(recoveredLease.lease?.fencingToken || 0) > Number(staleLease.lease?.fencingToken || 0),
  };
  try {
    const dir = path.dirname(leaseFile);
    const prefix = path.basename(leaseFile);
    for (const name of fs.readdirSync(dir)) {
      if (name.startsWith(prefix)) fs.unlinkSync(path.join(dir, name));
    }
  } catch {}
  return { pass: Object.values(checks).every(Boolean), checks, result, disabled };
}
