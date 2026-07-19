"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeTaskAgentSessions = closeTaskAgentSessions;
exports.pruneTaskAgentMemoryContextSnapshots = pruneTaskAgentMemoryContextSnapshots;
exports.purgeTaskAgentSessions = purgeTaskAgentSessions;
exports.reconcileTaskAgentSessions = reconcileTaskAgentSessions;
exports.shouldCloseTaskAgentSessions = shouldCloseTaskAgentSessions;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const memory_context_consumption_receipt_1 = require("../integrations/memory-context-consumption-receipt");
const memory_context_consumption_recovery_1 = require("../integrations/memory-context-consumption-recovery");
const agent_sessions_shared_1 = require("./agent-sessions-shared");
const agent_sessions_inventory_1 = require("./agent-sessions-inventory");
function closeTaskAgentSessions(input, reason = "主 Agent 已完成最终验收") {
    if (!String(input.scopeId || "").trim() && !String(input.taskId || "").trim())
        return [];
    return (0, agent_sessions_shared_1.withTaskAgentSessionStoreLock)(() => {
        const store = (0, agent_sessions_shared_1.loadStore)();
        const now = new Date().toISOString();
        const closed = [];
        store.sessions = store.sessions.map((item) => {
            const matches = item.status === "open"
                && (!input.scopeId || item.scopeId === input.scopeId)
                && (!input.taskId || item.taskId === input.taskId)
                && (!input.groupId || item.groupId === input.groupId);
            if (!matches)
                return item;
            const next = { ...item, status: "closed", closedAt: now, closeReason: reason, lastUsedAt: now };
            closed.push(next);
            return next;
        });
        if (closed.length)
            (0, agent_sessions_shared_1.saveStore)(store);
        return closed;
    });
}
function pruneTaskAgentMemoryContextSnapshots(options = {}) {
    const dryRun = options.dryRun !== false && options.dry_run !== false;
    const inventory = (0, agent_sessions_inventory_1.buildTaskAgentMemoryContextSnapshotInventory)(options);
    const candidates = (inventory.prunableRows || []).filter((row) => row.fileExists && row.snapshotFile && (0, agent_sessions_shared_1.pathIsInsideMemorySnapshotDir)(row.snapshotFile));
    const pruned = [];
    const skipped = [];
    const prunedMemoryReceiptChallengeIds = new Set();
    for (const row of candidates) {
        if (dryRun) {
            pruned.push({ snapshotId: row.snapshotId, snapshotFile: row.snapshotFile, deliveryReceiptFile: row.deliveryReceiptFile || "", latestDeliveryAttemptReceiptFile: row.latestDeliveryAttemptReceiptFile || "", syncCommitFile: row.memorySnapshotSyncCommitPath || "", sessionId: row.sessionId, dryRun: true, reason: row.source === "orphan_file" ? "orphan_file" : "retention_expired" });
            continue;
        }
        try {
            if (/^mcrc_[a-f0-9]{28}$/.test(String(row.memoryContextConsumptionChallengeId || ""))) {
                prunedMemoryReceiptChallengeIds.add(String(row.memoryContextConsumptionChallengeId));
            }
            fs.rmSync(row.snapshotFile, { force: true });
            if (row.deliveryReceiptFile && (0, agent_sessions_shared_1.pathIsInsideMemorySnapshotDir)(row.deliveryReceiptFile))
                fs.rmSync(row.deliveryReceiptFile, { force: true });
            if (row.latestDeliveryAttemptReceiptFile && (0, agent_sessions_shared_1.pathIsInsideMemorySnapshotDir)(row.latestDeliveryAttemptReceiptFile))
                fs.rmSync(row.latestDeliveryAttemptReceiptFile, { force: true });
            if (row.memorySnapshotSyncCommitPath && (0, agent_sessions_shared_1.pathIsInsideMemorySnapshotDir)(row.memorySnapshotSyncCommitPath))
                fs.rmSync(row.memorySnapshotSyncCommitPath, { force: true });
            pruned.push({ snapshotId: row.snapshotId, snapshotFile: row.snapshotFile, deliveryReceiptFile: row.deliveryReceiptFile || "", latestDeliveryAttemptReceiptFile: row.latestDeliveryAttemptReceiptFile || "", syncCommitFile: row.memorySnapshotSyncCommitPath || "", sessionId: row.sessionId, dryRun: false, reason: row.source === "orphan_file" ? "orphan_file" : "retention_expired" });
            try {
                const dir = path.dirname(row.snapshotFile);
                if ((0, agent_sessions_shared_1.pathIsInsideMemorySnapshotDir)(dir) && fs.existsSync(dir) && fs.readdirSync(dir).length === 0)
                    fs.rmdirSync(dir);
            }
            catch { }
        }
        catch (error) {
            skipped.push({ snapshotId: row.snapshotId, snapshotFile: row.snapshotFile, reason: error?.message || String(error) });
        }
    }
    if (!dryRun && pruned.length) {
        const prunedIds = new Set(pruned.map(row => String(row.snapshotId || "")).filter(Boolean));
        const prunedFiles = new Set(pruned.map(row => (0, agent_sessions_shared_1.normalizeSnapshotFileKey)(row.snapshotFile)).filter(Boolean));
        (0, agent_sessions_shared_1.withTaskAgentSessionStoreLock)(() => {
            const store = (0, agent_sessions_shared_1.loadStore)();
            store.sessions = store.sessions.map((session) => {
                const refs = (0, agent_sessions_shared_1.normalizeMemorySnapshotRefs)(session.memoryContextSnapshots).filter(ref => !prunedIds.has(ref.snapshotId)
                    && !prunedFiles.has((0, agent_sessions_shared_1.normalizeSnapshotFileKey)(ref.snapshotPath)));
                const currentPruned = prunedIds.has(String(session.memoryContextSnapshotId || ""))
                    || prunedFiles.has((0, agent_sessions_shared_1.normalizeSnapshotFileKey)(session.memoryContextSnapshotPath || ""));
                if (!currentPruned && refs.length === (0, agent_sessions_shared_1.normalizeMemorySnapshotRefs)(session.memoryContextSnapshots).length)
                    return session;
                const latest = [...refs].sort((a, b) => String(b.generatedAt || "").localeCompare(String(a.generatedAt || "")))[0] || null;
                return {
                    ...session,
                    memoryContextSnapshotId: latest?.snapshotId || "",
                    memoryContextSnapshotPath: latest?.snapshotPath || "",
                    memoryContextSnapshotChecksum: latest?.checksum || "",
                    memoryContextPacketId: latest?.workerContextPacketId || "",
                    memoryContextSnapshotAt: latest?.generatedAt || "",
                    memoryContextDeliveryReceiptId: latest?.deliveryReceiptId || "",
                    memoryContextDeliveryReceiptPath: latest?.deliveryReceiptPath || "",
                    memoryContextDeliveryReceiptChecksum: latest?.deliveryReceiptChecksum || "",
                    memoryContextDeliveryStatus: latest?.deliveryStatus || "",
                    memoryContextDeliveredAt: latest?.deliveredAt || "",
                    latestMemoryContextDeliveryAttemptReceiptId: latest?.latestDeliveryAttemptReceiptId || "",
                    latestMemoryContextDeliveryAttemptReceiptPath: latest?.latestDeliveryAttemptReceiptPath || "",
                    latestMemoryContextDeliveryAttemptReceiptChecksum: latest?.latestDeliveryAttemptReceiptChecksum || "",
                    latestMemoryContextDeliveryAttemptStatus: latest?.latestDeliveryAttemptStatus || "",
                    latestMemoryContextDeliveryAttemptAt: latest?.latestDeliveryAttemptAt || "",
                    memorySnapshotSyncCommitPath: latest?.memorySnapshotSyncCommitPath || "",
                    memorySnapshotSyncCommitChecksum: latest?.memorySnapshotSyncCommitChecksum || "",
                    memorySnapshotSyncCommitStatus: latest?.memorySnapshotSyncCommitStatus || "",
                    memorySnapshotSyncCommittedAt: latest?.memorySnapshotSyncCommittedAt || "",
                    memoryContextSnapshots: refs,
                };
            });
            (0, agent_sessions_shared_1.saveStore)(store);
        });
        for (const challengeId of prunedMemoryReceiptChallengeIds)
            (0, memory_context_consumption_receipt_1.removeMemoryContextConsumptionReceiptIfUnreferenced)(challengeId);
        for (const challengeId of prunedMemoryReceiptChallengeIds)
            (0, memory_context_consumption_recovery_1.removeMemoryContextConsumptionRecoveryIfUnreferenced)(challengeId);
    }
    return {
        schema: "ccm-task-agent-memory-context-snapshot-retention-result-v1",
        generatedAt: new Date().toISOString(),
        dryRun,
        policy: inventory.policy,
        before: inventory.summary,
        candidateCount: candidates.length,
        prunedCount: pruned.length,
        skippedCount: skipped.length,
        pruned,
        skipped,
    };
}
function purgeTaskAgentSessions(taskId) {
    const id = String(taskId || "").trim();
    if (!id)
        return [];
    return (0, agent_sessions_shared_1.withTaskAgentSessionStoreLock)(() => {
        const store = (0, agent_sessions_shared_1.loadStore)();
        const removed = store.sessions.filter((item) => item.taskId === id || item.scopeId === id);
        if (!removed.length)
            return [];
        store.sessions = store.sessions.filter((item) => item.taskId !== id && item.scopeId !== id);
        for (const session of removed)
            (0, agent_sessions_shared_1.purgeMemoryContextSnapshotsForSession)(session.id);
        (0, agent_sessions_shared_1.saveStore)(store);
        // A purged session must not be recoverable from the store backup.
        try {
            fs.copyFileSync(agent_sessions_shared_1.STORE_FILE, agent_sessions_shared_1.STORE_BACKUP_FILE);
        }
        catch { }
        return removed;
    });
}
function reconcileTaskAgentSessions(tasks, nowMs = Date.now()) {
    const taskMap = new Map((Array.isArray(tasks) ? tasks : []).map((task) => [String(task.id || ""), task]));
    return (0, agent_sessions_shared_1.withTaskAgentSessionStoreLock)(() => {
        const store = (0, agent_sessions_shared_1.loadStore)();
        const closed = [];
        const now = new Date(nowMs).toISOString();
        store.sessions = store.sessions.map((session) => {
            if (session.status !== "open")
                return session;
            const task = taskMap.get(session.taskId || session.scopeId);
            const inactiveMs = nowMs - Date.parse(session.lastUsedAt || session.createdAt || now);
            const terminal = !task || task.archived || task.deleted_at || ["done", "cancelled", "archived"].includes(String(task.status || ""));
            const abandoned = inactiveMs > 30 * 24 * 60 * 60 * 1000 && String(task?.status || "") !== "in_progress";
            if (!terminal && !abandoned)
                return session;
            const next = { ...session, status: "closed", closedAt: now, lastUsedAt: now, closeReason: terminal ? "任务已终态、归档或不存在，自动关闭残留会话" : "会话超过 30 天未使用，自动关闭" };
            closed.push(next);
            return next;
        });
        if (closed.length)
            (0, agent_sessions_shared_1.saveStore)(store);
        return { closed: closed.length, sessions: closed };
    });
}
function shouldCloseTaskAgentSessions(input) {
    const hasPersistentTask = !!String(input.taskId || "").trim();
    const terminalStatuses = new Set(["done", "cancelled", "archived", "deleted"]);
    return hasPersistentTask
        ? terminalStatuses.has(String(input.taskStatus || ""))
        : String(input.reviewStatus || "") === "complete";
}
//# sourceMappingURL=agent-sessions-purge.js.map