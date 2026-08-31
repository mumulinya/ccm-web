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
exports.prepareTaskAgentMemoryEntrySyncContext = prepareTaskAgentMemoryEntrySyncContext;
exports.verifyTaskAgentMemoryEntryRenderContentionReceipt = verifyTaskAgentMemoryEntryRenderContentionReceipt;
exports.prepareTaskAgentMemoryEntrySyncContextWithRetry = prepareTaskAgentMemoryEntrySyncContextWithRetry;
exports.bindTaskAgentMemoryContextSnapshot = bindTaskAgentMemoryContextSnapshot;
exports.attachTaskAgentFinalDispatchPayloadGate = attachTaskAgentFinalDispatchPayloadGate;
// Behavior-freeze extraction from agent-sessions.ts.
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
const runtime_1 = require("../agents/runtime");
const final_dispatch_payload_gate_1 = require("../agents/final-dispatch-payload-gate");
const final_dispatch_reactive_compact_1 = require("../agents/final-dispatch-reactive-compact");
const trusted_memory_prompt_envelope_1 = require("../agents/trusted-memory-prompt-envelope");
const group_post_turn_summary_1 = require("../modules/collaboration/group-post-turn-summary");
const task_agent_memory_entry_sync_1 = require("./task-agent-memory-entry-sync");
const agent_sessions_shared_1 = require("./agent-sessions-shared");
function prepareTaskAgentMemoryEntrySyncContext(sessionId, memoryContextInput) {
    const id = String(sessionId || "").trim();
    if (!id || !memoryContextInput || typeof memoryContextInput !== "object")
        return { memoryContext: memoryContextInput, plan: null, prepared: false };
    return (0, agent_sessions_shared_1.withTaskAgentSessionStoreLock)(() => {
        const store = (0, agent_sessions_shared_1.loadStore)();
        const session = store.sessions.find((item) => item.id === id);
        if (!session)
            return { memoryContext: memoryContextInput, plan: null, prepared: false };
        const binding = (0, agent_sessions_shared_1.extractGroupSessionMemoryBinding)(memoryContextInput || {});
        const groupSessionId = String(binding?.groupSessionId || "");
        if (!groupSessionId.startsWith("gcs_"))
            return { memoryContext: memoryContextInput, plan: null, prepared: false };
        if (session.groupSessionId?.startsWith("gcs_") && session.groupSessionId !== groupSessionId) {
            const error = new Error(`task Agent memory entry sync belongs to another group session: ${session.groupSessionId} -> ${groupSessionId}`);
            error.code = "TASK_AGENT_MEMORY_SNAPSHOT_CROSS_SESSION_REJECTED";
            throw error;
        }
        const preparedAtMs = Date.now();
        const sourceMemoryContextChecksum = (0, task_agent_memory_entry_sync_1.taskAgentMemorySemanticChecksum)(memoryContextInput);
        const existingRenderLease = session.memoryEntrySyncRenderLease || null;
        const existingLeaseExpiresMs = Date.parse(String(existingRenderLease?.expires_at || ""));
        const existingLeaseActive = existingRenderLease?.status === "prepared"
            && Number.isFinite(existingLeaseExpiresMs)
            && existingLeaseExpiresMs > preparedAtMs
            && (0, agent_sessions_shared_1.processIsAlive)(Number(existingRenderLease?.owner_pid || 0));
        if (existingLeaseActive
            && (Number(existingRenderLease.owner_pid || 0) !== process.pid
                || String(existingRenderLease.source_memory_context_checksum || "") !== sourceMemoryContextChecksum)) {
            const error = new Error(`task Agent memory entry render lease is busy: ${existingRenderLease.lease_id || "unknown"}`);
            error.code = "TASK_AGENT_MEMORY_ENTRY_SYNC_RENDER_BUSY";
            error.leaseId = String(existingRenderLease.lease_id || "");
            error.fencingToken = Number(existingRenderLease.fencing_token || 0);
            error.ownerPid = Number(existingRenderLease.owner_pid || 0);
            error.leaseExpiresAt = String(existingRenderLease.expires_at || "");
            throw error;
        }
        const refs = (0, agent_sessions_shared_1.normalizeMemorySnapshotRefs)(session.memoryContextSnapshots);
        const previousRef = refs.length ? refs[refs.length - 1] : null;
        const previousSnapshot = previousRef?.snapshotPath ? (0, agent_sessions_shared_1.safeReadJson)(previousRef.snapshotPath, null) : null;
        const previousOuterTrusted = !!previousSnapshot
            && previousSnapshot.schema === agent_sessions_shared_1.TASK_AGENT_MEMORY_CONTEXT_SNAPSHOT_SCHEMA
            && (0, agent_sessions_shared_1.verifyMemoryContextSnapshotChecksum)(previousSnapshot)
            && String(previousSnapshot?.session?.id || "") === session.id
            && String(previousSnapshot?.session?.group_id || "") === session.groupId
            && String(previousSnapshot?.session?.task_id || "") === session.taskId
            && String(previousSnapshot?.session?.project || "") === session.project
            && String(previousSnapshot?.context?.group_session_memory_binding?.groupSessionId || "") === groupSessionId;
        const previousMemoryContext = previousSnapshot?.context?.memory_context || null;
        const previousSemanticChecksum = previousOuterTrusted ? (0, task_agent_memory_entry_sync_1.taskAgentMemorySemanticChecksum)(previousMemoryContext) : "";
        const previousSync = previousSnapshot?.context?.memory_snapshot_sync || null;
        const previousSyncVerification = previousOuterTrusted ? (0, agent_sessions_shared_1.verifyTaskAgentMemorySnapshotSyncDecision)(previousSync, {
            groupId: session.groupId,
            groupSessionId,
            taskId: session.taskId,
            taskAgentSessionId: session.id,
            targetProject: session.project,
            currentMemoryContextChecksum: previousSemanticChecksum,
        }) : { valid: false };
        const previousProof = previousSnapshot?.context?.memory_prompt_injection_proof || null;
        const previousProofVerification = previousOuterTrusted && previousSyncVerification.valid === true
            ? (0, agent_sessions_shared_1.verifyTaskAgentMemoryPromptInjectionProof)(previousProof, {
                groupId: session.groupId,
                groupSessionId,
                taskId: session.taskId,
                taskAgentSessionId: session.id,
                targetProject: session.project,
                memoryContextChecksum: previousSemanticChecksum,
                syncChecksum: String(previousSync?.sync_checksum || ""),
                renderedPromptChecksum: String(previousSnapshot?.context?.rendered_prompt_checksum || ""),
            })
            : { valid: false, deliveryReady: false };
        const previousReceipt = previousRef?.deliveryReceiptPath ? (0, agent_sessions_shared_1.safeReadJson)(previousRef.deliveryReceiptPath, null) : null;
        const previousReceiptTrusted = !!previousReceipt
            && (0, agent_sessions_shared_1.verifyMemoryContextDeliveryReceiptChecksum)(previousReceipt)
            && previousReceipt.delivered === true
            && String(previousReceipt.status || "") === "delivered"
            && String(previousReceipt.receiptId || "") === String(previousRef?.deliveryReceiptId || "")
            && String(previousReceipt.checksum || "") === String(previousRef?.deliveryReceiptChecksum || "")
            && String(previousReceipt.taskAgentSessionId || "") === session.id
            && String(previousReceipt.memoryContextSnapshotId || "") === String(previousSnapshot?.snapshot_id || "")
            && String(previousReceipt.memoryContextSnapshotChecksum || "") === String(previousSnapshot?.checksum || "");
        const previousCommitFile = String(previousRef?.memorySnapshotSyncCommitPath || (previousRef?.snapshotId ? (0, agent_sessions_shared_1.getMemorySnapshotSyncCommitFile)(session.id, previousRef.snapshotId) : ""));
        const previousCommit = previousCommitFile ? (0, agent_sessions_shared_1.safeReadJson)(previousCommitFile, null) : null;
        const previousCommitVerification = previousReceiptTrusted && previousProofVerification.valid === true && previousProofVerification.deliveryReady === true
            ? (0, agent_sessions_shared_1.verifyTaskAgentMemorySnapshotSyncCommit)(previousCommit, {
                groupId: session.groupId,
                groupSessionId,
                taskId: session.taskId,
                taskAgentSessionId: session.id,
                targetProject: session.project,
                snapshotId: String(previousSnapshot?.snapshot_id || ""),
                snapshotChecksum: String(previousSnapshot?.checksum || ""),
                syncChecksum: String(previousSync?.sync_checksum || ""),
                syncAction: String(previousSync?.action || ""),
                memoryPromptInjectionProofChecksum: String(previousProof?.proof_checksum || ""),
                deliveryReceiptId: String(previousReceipt?.receiptId || ""),
                deliveryReceiptChecksum: String(previousReceipt?.checksum || ""),
            })
            : { valid: false, committed: false };
        const previousEntryPlan = previousSnapshot?.context?.memory_entry_sync || (0, task_agent_memory_entry_sync_1.taskAgentMemoryEntrySyncPlan)(previousMemoryContext);
        const previousManifest = previousEntryPlan?.current_manifest || null;
        const previousManifestVerification = previousManifest ? (0, task_agent_memory_entry_sync_1.verifyTaskAgentMemoryEntryManifest)(previousManifest, {
            groupId: session.groupId,
            groupSessionId,
            sourceMemoryContextChecksum: previousSemanticChecksum,
        }) : { valid: false };
        const previousTrusted = previousOuterTrusted
            && previousSyncVerification.valid === true
            && previousProofVerification.valid === true
            && previousProofVerification.deliveryReady === true
            && previousReceiptTrusted
            && previousCommitVerification.valid === true
            && previousCommitVerification.committed === true
            && previousManifestVerification.valid === true;
        const reuseRenderLease = existingLeaseActive
            && Number(existingRenderLease.owner_pid || 0) === process.pid
            && String(existingRenderLease.source_memory_context_checksum || "") === sourceMemoryContextChecksum
            && String(existingRenderLease.base_snapshot_id || "") === String(previousSnapshot?.snapshot_id || previousRef?.snapshotId || "")
            && String(existingRenderLease.base_snapshot_checksum || "") === String(previousSnapshot?.checksum || previousRef?.checksum || "");
        const staleRenderLeaseRecovered = !!existingRenderLease
            && existingRenderLease.status === "prepared"
            && !reuseRenderLease;
        const renderFencingToken = reuseRenderLease
            ? Number(existingRenderLease.fencing_token || 0)
            : Math.max(Number(session.memoryEntrySyncRenderFencingToken || 0), Number(existingRenderLease?.fencing_token || 0)) + 1;
        const renderLease = reuseRenderLease ? existingRenderLease : {
            schema: "ccm-task-agent-memory-entry-render-lease-v1",
            version: 1,
            lease_id: `tamerl_${crypto.randomBytes(12).toString("hex")}`,
            fencing_token: renderFencingToken,
            owner_pid: process.pid,
            status: "prepared",
            group_id: session.groupId,
            group_session_id: groupSessionId,
            task_id: session.taskId,
            task_agent_session_id: session.id,
            target_project: session.project,
            source_memory_context_checksum: sourceMemoryContextChecksum,
            base_snapshot_id: String(previousSnapshot?.snapshot_id || previousRef?.snapshotId || ""),
            base_snapshot_checksum: String(previousSnapshot?.checksum || previousRef?.checksum || ""),
            base_manifest_checksum: previousTrusted ? String(previousManifest?.manifest_checksum || "") : "",
            acquired_at: new Date(preparedAtMs).toISOString(),
            expires_at: new Date(preparedAtMs + agent_sessions_shared_1.MEMORY_ENTRY_RENDER_LEASE_TTL_MS).toISOString(),
            recovered_stale_lease_id: staleRenderLeaseRecovered ? String(existingRenderLease?.lease_id || "") : "",
        };
        const plan = (0, task_agent_memory_entry_sync_1.buildTaskAgentMemoryEntrySyncPlan)({
            memory: memoryContextInput,
            groupId: session.groupId,
            groupSessionId,
            taskId: session.taskId,
            taskAgentSessionId: session.id,
            targetProject: session.project,
            previousSnapshotId: String(previousSnapshot?.snapshot_id || previousRef?.snapshotId || ""),
            previousSnapshotChecksum: String(previousSnapshot?.checksum || previousRef?.checksum || ""),
            previousManifest,
            previousTrusted,
            renderLease,
        });
        const sealedRenderLease = {
            ...renderLease,
            plan_checksum: plan.plan_checksum,
            manifest_checksum: String(plan.current_manifest?.manifest_checksum || ""),
            transport_mode: plan.transport_mode,
        };
        const previousHistory = Array.isArray(session.memoryEntrySyncRenderLeaseHistory) ? session.memoryEntrySyncRenderLeaseHistory : [];
        if (!reuseRenderLease && existingRenderLease?.lease_id) {
            session.memoryEntrySyncRenderLeaseHistory = [...previousHistory, existingRenderLease].slice(-agent_sessions_shared_1.MEMORY_ENTRY_RENDER_LEASE_HISTORY_LIMIT);
        }
        if (!session.groupSessionId && groupSessionId.startsWith("gcs_"))
            session.groupSessionId = groupSessionId;
        session.memoryEntrySyncRenderLease = sealedRenderLease;
        session.memoryEntrySyncRenderFencingToken = renderFencingToken;
        session.memoryEntrySyncRenderLeaseTakeoverCount = Number(session.memoryEntrySyncRenderLeaseTakeoverCount || 0) + (staleRenderLeaseRecovered ? 1 : 0);
        session.lastUsedAt = new Date(preparedAtMs).toISOString();
        (0, agent_sessions_shared_1.saveStore)(store);
        return {
            memoryContext: (0, task_agent_memory_entry_sync_1.attachTaskAgentMemoryEntrySyncPlan)(memoryContextInput, plan),
            plan,
            prepared: true,
            previousBaselineTrusted: previousTrusted,
            renderLease: sealedRenderLease,
            renderLeaseReused: reuseRenderLease,
            staleRenderLeaseRecovered,
        };
    });
}
function verifyTaskAgentMemoryEntryRenderContentionReceipt(receipt, expected = {}) {
    const issues = [];
    if (receipt?.schema !== agent_sessions_shared_1.MEMORY_ENTRY_RENDER_CONTENTION_SCHEMA)
        issues.push("render_contention_schema_invalid");
    if (Number(receipt?.version || 0) !== 1)
        issues.push("render_contention_version_invalid");
    if (!new Set(["resolved", "timeout", "same_process"]).has(String(receipt?.status || "")))
        issues.push("render_contention_status_invalid");
    if (String(receipt?.contention_checksum || "") !== (0, agent_sessions_shared_1.memoryEntryRenderContentionChecksum)(receipt))
        issues.push("render_contention_checksum_invalid");
    const bindings = [
        ["group_id", expected.groupId, receipt?.group_id],
        ["group_session_id", expected.groupSessionId, receipt?.group_session_id],
        ["task_id", expected.taskId, receipt?.task_id],
        ["task_agent_session_id", expected.taskAgentSessionId, receipt?.task_agent_session_id],
        ["target_project", expected.targetProject, receipt?.target_project],
    ];
    for (const [field, wanted, actual] of bindings)
        if (wanted !== undefined && String(wanted || "") !== String(actual || ""))
            issues.push(`render_contention_${field}_mismatch`);
    if (!Number.isInteger(Number(receipt?.contender_pid || 0)) || Number(receipt?.contender_pid || 0) <= 0)
        issues.push("render_contention_contender_pid_invalid");
    if (!/^tamerl_[a-f0-9]{24}$/.test(String(receipt?.blocked_lease_id || "")))
        issues.push("render_contention_blocked_lease_invalid");
    if (!Number.isInteger(Number(receipt?.blocked_fencing_token || 0)) || Number(receipt?.blocked_fencing_token || 0) <= 0)
        issues.push("render_contention_fencing_token_invalid");
    if (!Number.isInteger(Number(receipt?.blocked_owner_pid || 0)) || Number(receipt?.blocked_owner_pid || 0) <= 0)
        issues.push("render_contention_owner_pid_invalid");
    if (!Number.isInteger(Number(receipt?.retries ?? -1)) || Number(receipt?.retries ?? -1) < 0 || Number(receipt?.retries || 0) > 5)
        issues.push("render_contention_retries_invalid");
    if (!Number.isInteger(Number(receipt?.waited_ms ?? -1)) || Number(receipt?.waited_ms ?? -1) < 0)
        issues.push("render_contention_wait_invalid");
    if (!/^[a-f0-9]{64}$/.test(String(receipt?.source_memory_context_checksum || "")))
        issues.push("render_contention_source_checksum_invalid");
    if (!Number.isFinite(Date.parse(String(receipt?.observed_at || ""))))
        issues.push("render_contention_observed_at_invalid");
    if (receipt?.status === "same_process" && (Number(receipt?.retries || 0) !== 0 || Number(receipt?.waited_ms || 0) !== 0))
        issues.push("render_contention_same_process_wait_invalid");
    return { valid: issues.length === 0, issues: [...new Set(issues)], status: String(receipt?.status || "") };
}
function prepareTaskAgentMemoryEntrySyncContextWithRetry(sessionId, memoryContextInput, options = {}) {
    const maxConflictRetries = Math.min(5, Math.max(0, Math.floor(Number(options.maxConflictRetries ?? agent_sessions_shared_1.MEMORY_ENTRY_RENDER_CONFLICT_MAX_RETRIES))));
    const baseDelayMs = Math.min(1_000, Math.max(1, Math.floor(Number(options.baseDelayMs ?? agent_sessions_shared_1.MEMORY_ENTRY_RENDER_CONFLICT_BASE_DELAY_MS))));
    const maxDelayMs = Math.min(2_000, Math.max(baseDelayMs, Math.floor(Number(options.maxDelayMs ?? agent_sessions_shared_1.MEMORY_ENTRY_RENDER_CONFLICT_MAX_DELAY_MS))));
    const jitterMs = Math.min(500, Math.max(0, Math.floor(Number(options.jitterMs ?? agent_sessions_shared_1.MEMORY_ENTRY_RENDER_CONFLICT_JITTER_MS))));
    const sourceMemoryContextChecksum = (0, task_agent_memory_entry_sync_1.taskAgentMemorySemanticChecksum)(memoryContextInput || {});
    let retries = 0;
    let waitedMs = 0;
    let firstConflict = null;
    while (true) {
        try {
            const prepared = prepareTaskAgentMemoryEntrySyncContext(sessionId, memoryContextInput);
            if (!firstConflict)
                return prepared;
            const contention = (0, agent_sessions_shared_1.recordTaskAgentMemoryEntryRenderContention)(sessionId, {
                status: "resolved",
                retries,
                waitedMs,
                blockedLeaseId: firstConflict.leaseId,
                blockedFencingToken: firstConflict.fencingToken,
                blockedOwnerPid: firstConflict.ownerPid,
                sourceMemoryContextChecksum,
            });
            return { ...prepared, renderContention: contention };
        }
        catch (error) {
            if (error?.code !== "TASK_AGENT_MEMORY_ENTRY_SYNC_RENDER_BUSY")
                throw error;
            firstConflict ||= error;
            const sameProcess = Number(error.ownerPid || 0) === process.pid;
            if (sameProcess || retries >= maxConflictRetries) {
                const status = sameProcess ? "same_process" : "timeout";
                const contention = (0, agent_sessions_shared_1.recordTaskAgentMemoryEntryRenderContention)(sessionId, {
                    status,
                    retries,
                    waitedMs,
                    blockedLeaseId: firstConflict.leaseId,
                    blockedFencingToken: firstConflict.fencingToken,
                    blockedOwnerPid: firstConflict.ownerPid,
                    sourceMemoryContextChecksum,
                });
                error.renderContentionStatus = status;
                error.renderContentionRetries = retries;
                error.renderContentionWaitedMs = waitedMs;
                error.renderContentionReceipt = contention;
                throw error;
            }
            const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * (2 ** retries));
            const delayMs = exponentialDelay + (jitterMs > 0 ? crypto.randomInt(0, jitterMs + 1) : 0);
            (0, agent_sessions_shared_1.sleepForStoreLock)(delayMs);
            waitedMs += delayMs;
            retries += 1;
        }
    }
}
function bindTaskAgentMemoryContextSnapshot(sessionId, input = {}) {
    const id = String(sessionId || "").trim();
    if (!id)
        return null;
    return (0, agent_sessions_shared_1.withTaskAgentSessionStoreLock)(() => {
        const store = (0, agent_sessions_shared_1.loadStore)();
        const index = store.sessions.findIndex((item) => item.id === id);
        if (index < 0)
            return null;
        const current = store.sessions[index];
        const packet = input.workerContextPacket || input.workerHandoff?.worker_context_packet || input.workerHandoff?.workerContextPacket || {};
        const packetMemory = packet.memory || input.workerHandoff?.references?.memory_context || input.workerHandoff?.references?.memoryContext || null;
        const memoryContext = (0, task_agent_memory_entry_sync_1.taskAgentMemoryEntrySyncPlan)(packetMemory)
            ? packetMemory
            : input.memoryContext || packetMemory || null;
        const groupSessionMemoryBinding = (0, agent_sessions_shared_1.extractGroupSessionMemoryBinding)(memoryContext || {});
        const workerHandoffId = String(input.workerHandoff?.handoff_id || input.workerHandoff?.handoffId || input.workerHandoffSummary?.handoff_id || input.workerHandoffSummary?.handoffId || "").trim();
        const workerContextPacketId = String(packet?.packet_id || packet?.packetId || input.workerHandoffSummary?.packet_id || input.workerHandoffSummary?.packetId || "").trim();
        const generatedAt = new Date().toISOString();
        const turn = Number(input.turn || current.turnCount + 1 || 0);
        const memoryContextChecksum = (0, task_agent_memory_entry_sync_1.taskAgentMemorySemanticChecksum)(memoryContext || {});
        const refs = (0, agent_sessions_shared_1.normalizeMemorySnapshotRefs)(current.memoryContextSnapshots);
        const memoryEntrySync = (0, task_agent_memory_entry_sync_1.taskAgentMemoryEntrySyncPlan)(memoryContext);
        const memoryEntryTransport = (0, task_agent_memory_entry_sync_1.taskAgentMemoryTransport)(memoryContext);
        const rejectCurrentMemoryEntryRenderLease = (reason) => {
            const lease = current.memoryEntrySyncRenderLease || null;
            if (!lease || String(lease.lease_id || "") !== String(memoryEntrySync?.render_lease_id || "")
                || Number(lease.fencing_token || 0) !== Number(memoryEntrySync?.render_fencing_token || 0))
                return;
            current.memoryEntrySyncRenderLease = {
                ...lease,
                status: "rejected",
                rejected_at: new Date().toISOString(),
                rejection_reason: reason,
            };
            current.lastUsedAt = new Date().toISOString();
            store.sessions[index] = current;
            (0, agent_sessions_shared_1.saveStore)(store);
        };
        if (memoryEntrySync && !memoryEntryTransport.valid) {
            rejectCurrentMemoryEntryRenderLease(`plan_invalid:${memoryEntryTransport.issues.join(",")}`);
            const error = new Error(`task Agent memory entry sync plan invalid: ${memoryEntryTransport.issues.join(",")}`);
            error.code = "TASK_AGENT_MEMORY_ENTRY_SYNC_INVALID";
            throw error;
        }
        const effectiveRenderedMemoryContext = memoryEntryTransport.mode === "delta"
            ? memoryEntryTransport.text
            : memoryEntryTransport.mode === "continuation"
                ? ""
                : String(input.renderedMemoryContext || "");
        const renderedProjection = (0, agent_sessions_shared_1.renderedMemoryProjection)(memoryContext, effectiveRenderedMemoryContext);
        const trustedEnvelopeRequired = input.requireTrustedMemoryPromptEnvelope === true;
        const trustedEnvelope = (0, trusted_memory_prompt_envelope_1.verifyTrustedMemoryPromptEnvelope)(String(input.renderedPrompt || ""), {
            ...(renderedProjection.text ? { projection: renderedProjection.text } : {}),
            sourceChecksum: (0, trusted_memory_prompt_envelope_1.trustedMemorySourceChecksum)(memoryContext || {}),
        });
        const fullMemoryProjectionInjected = !!renderedProjection.text
            && (trustedEnvelopeRequired
                ? trustedEnvelope.valid
                : String(input.renderedPrompt || "").includes(renderedProjection.text));
        const memorySnapshotSync = (0, agent_sessions_shared_1.createTaskAgentMemorySnapshotSyncDecision)({
            session: current,
            refs,
            groupSessionMemoryBinding,
            currentMemoryContextChecksum: memoryContextChecksum,
            generatedAt,
            turn,
            fullMemoryProjectionInjected: memoryEntryTransport.mode === "delta" ? false : fullMemoryProjectionInjected,
            enforcementRequired: input.requireMemoryPromptInjectionProof === true,
        });
        if (memoryEntrySync) {
            const currentManifest = (0, task_agent_memory_entry_sync_1.buildTaskAgentMemoryEntryManifest)((0, task_agent_memory_entry_sync_1.stripTaskAgentMemoryEntrySync)(memoryContext));
            const entryVerification = (0, task_agent_memory_entry_sync_1.verifyTaskAgentMemoryEntrySyncPlan)(memoryEntrySync, {
                groupId: current.groupId,
                groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
                taskId: current.taskId,
                taskAgentSessionId: current.id,
                targetProject: current.project,
                sourceMemoryContextChecksum: memoryContextChecksum,
            });
            const entryIssues = [...entryVerification.issues];
            const currentRenderLease = current.memoryEntrySyncRenderLease || null;
            const renderLeaseExpiresMs = Date.parse(String(currentRenderLease?.expires_at || ""));
            if (currentRenderLease?.schema !== "ccm-task-agent-memory-entry-render-lease-v1")
                entryIssues.push("entry_sync_render_lease_missing");
            if (String(currentRenderLease?.status || "") !== "prepared")
                entryIssues.push("entry_sync_render_lease_not_prepared");
            if (String(currentRenderLease?.lease_id || "") !== String(memoryEntrySync?.render_lease_id || ""))
                entryIssues.push("entry_sync_render_lease_id_stale");
            if (Number(currentRenderLease?.fencing_token || 0) !== Number(memoryEntrySync?.render_fencing_token || 0))
                entryIssues.push("entry_sync_render_fencing_token_stale");
            if (Number(memoryEntrySync?.render_lease_owner_pid || 0) !== process.pid || Number(currentRenderLease?.owner_pid || 0) !== process.pid)
                entryIssues.push("entry_sync_render_lease_owner_mismatch");
            if (!Number.isFinite(renderLeaseExpiresMs) || renderLeaseExpiresMs <= Date.now())
                entryIssues.push("entry_sync_render_lease_expired");
            if (String(currentRenderLease?.source_memory_context_checksum || "") !== memoryContextChecksum)
                entryIssues.push("entry_sync_render_lease_source_mismatch");
            if (String(currentRenderLease?.plan_checksum || "") !== String(memoryEntrySync?.plan_checksum || ""))
                entryIssues.push("entry_sync_render_lease_plan_mismatch");
            if (String(currentRenderLease?.manifest_checksum || "") !== String(memoryEntrySync?.current_manifest?.manifest_checksum || ""))
                entryIssues.push("entry_sync_render_lease_manifest_mismatch");
            if (String(currentRenderLease?.base_snapshot_id || "") !== String(memoryEntrySync?.previous_snapshot_id || ""))
                entryIssues.push("entry_sync_render_lease_base_snapshot_mismatch");
            if (String(currentRenderLease?.base_manifest_checksum || "") !== String(memoryEntrySync?.previous_manifest_checksum || ""))
                entryIssues.push("entry_sync_render_lease_base_manifest_mismatch");
            if (String(memoryEntrySync?.current_manifest?.manifest_checksum || "") !== String(currentManifest.manifest_checksum || ""))
                entryIssues.push("entry_sync_current_manifest_stale");
            if (memoryEntryTransport.mode !== "full" && String(memoryEntrySync?.previous_snapshot_id || "") !== String(memorySnapshotSync?.previous_snapshot_id || ""))
                entryIssues.push("entry_sync_previous_snapshot_stale");
            const compatible = (memorySnapshotSync.action === "initialize" && memoryEntryTransport.mode === "full")
                || (memorySnapshotSync.action === "none" && memoryEntryTransport.mode === "continuation")
                || (memorySnapshotSync.action === "prompt_update" && ["full", "delta"].includes(memoryEntryTransport.mode));
            if (!compatible)
                entryIssues.push("entry_sync_snapshot_action_mismatch");
            if (entryIssues.length) {
                rejectCurrentMemoryEntryRenderLease(`bind_stale:${[...new Set(entryIssues)].join(",")}`);
                const error = new Error(`task Agent memory entry sync changed before snapshot bind: ${[...new Set(entryIssues)].join(",")}`);
                error.code = "TASK_AGENT_MEMORY_ENTRY_SYNC_STALE";
                throw error;
            }
        }
        const memoryPromptInjectionProof = (0, agent_sessions_shared_1.createTaskAgentMemoryPromptInjectionProof)({
            session: current,
            groupSessionMemoryBinding,
            memoryContext,
            memoryContextChecksum,
            memorySnapshotSync,
            renderedPrompt: String(input.renderedPrompt || ""),
            renderedMemoryContext: effectiveRenderedMemoryContext,
            enforcementRequired: input.requireMemoryPromptInjectionProof === true,
            trustedEnvelopeRequired,
            generatedAt,
        });
        const gateIds = Array.from((0, agent_sessions_shared_1.collectMemoryContextGateIds)({
            worker_context_packet: packet,
            worker_handoff: input.workerHandoff || null,
            memory_context: memoryContext,
        })).slice(0, 100);
        const postTurnSummaryCapsuleInput = packet?.post_turn_summary_delivery_capsule
            || packet?.postTurnSummaryDeliveryCapsule
            || (0, group_post_turn_summary_1.extractGroupPostTurnSummaryDeliveryCapsule)(memoryContext || packet || null);
        const postTurnSummaryCapsule = (0, group_post_turn_summary_1.validateGroupPostTurnSummaryDeliveryCapsule)(postTurnSummaryCapsuleInput, {
            expectedBinding: {
                group_id: String(input.groupId || current.groupId || ""),
                task_id: String(input.taskId || current.taskId || ""),
                target_project: String(input.project || current.project || ""),
                task_agent_session_id: current.id,
                native_session_id: String(input.nativeSessionId || current.nativeSessionId || ""),
                execution_id: String(input.executionId || ""),
                attempt_sequence: turn,
                invocation_kind: turn > 1 ? "resume" : "spawn",
                ...(input.invocationLineage?.invocation_edge_id ? {
                    invocation_edge_id: input.invocationLineage.invocation_edge_id,
                    parent_invocation_edge_id: input.invocationLineage.parent_invocation_edge_id || "",
                    root_invocation_edge_id: input.invocationLineage.root_invocation_edge_id || "",
                    branch_id: input.invocationLineage.branch_id || "",
                    parent_branch_id: input.invocationLineage.parent_branch_id || "",
                    branch_kind: input.invocationLineage.branch_kind || "main",
                    expected_lineage_head_checksum: input.invocationLineage.expected_lineage_head_checksum || "",
                } : {}),
            },
            renderedPrompt: input.renderedPrompt || "",
        });
        const snapshotSeed = [
            current.id,
            input.taskId || current.taskId,
            input.groupId || current.groupId,
            input.project || current.project,
            input.executionId || "",
            workerContextPacketId,
            turn,
            generatedAt,
        ].join("\0");
        const snapshotId = `tams_${(0, agent_sessions_shared_1.hashValue)(snapshotSeed, 18)}`;
        const snapshotFile = path.join((0, agent_sessions_shared_1.getMemoryContextSnapshotDir)(current.id), `${snapshotId}.json`);
        const payloadWithoutChecksum = {
            schema: agent_sessions_shared_1.TASK_AGENT_MEMORY_CONTEXT_SNAPSHOT_SCHEMA,
            snapshot_id: snapshotId,
            generated_at: generatedAt,
            session: {
                id: current.id,
                scope_id: current.scopeId,
                task_id: String(input.taskId || current.taskId || "").trim(),
                group_id: String(input.groupId || current.groupId || "").trim(),
                project: String(input.project || current.project || "").trim(),
                agent_type: (0, runtime_1.normalizeAgentRuntimeId)(input.agentType || current.agentType || ""),
                native_session_id: String(input.nativeSessionId || current.nativeSessionId || "").trim(),
                turn,
                resume_mode: current.resumeMode,
            },
            context: {
                execution_id: String(input.executionId || "").trim(),
                trace_id: String(input.traceId || "").trim(),
                worker_context_packet_id: workerContextPacketId,
                worker_handoff_id: workerHandoffId,
                worker_context_packet: packet || null,
                worker_handoff_summary: input.workerHandoffSummary || null,
                memory_context: memoryContext || null,
                memory_context_checksum: memoryContextChecksum,
                memory_entry_sync: memoryEntrySync || null,
                group_session_memory_binding: groupSessionMemoryBinding,
                memory_snapshot_sync: memorySnapshotSync,
                memory_prompt_injection_proof: memoryPromptInjectionProof,
                provider_memory_channel_acknowledgement_required: input.requireProviderMemoryChannelAcknowledgement === true,
                memory_context_consumption_receipt_required: input.requireMemoryContextConsumptionReceipt === true,
                memory_context_consumption_challenge: input.memoryContextConsumptionChallenge || null,
                post_turn_summary_delivery_capsule: postTurnSummaryCapsule,
                post_turn_summary_capsule_checksum: String(postTurnSummaryCapsule?.capsule_checksum || ""),
                post_turn_summary_capsule_prompt_bound: postTurnSummaryCapsule?.prompt_bound === true,
                post_turn_summary_capsule_selected_count: Number(postTurnSummaryCapsule?.selected_count || 0),
                post_turn_summary_capsule_ledger_head_checksum: String(postTurnSummaryCapsule?.ledger_head_checksum || ""),
                task_agent_invocation_lineage: input.invocationLineage || packet?.task_agent_invocation_lineage || null,
                invocation_edge_id: String(input.invocationLineage?.invocation_edge_id || packet?.task_agent_invocation_lineage?.invocation_edge_id || ""),
                invocation_branch_id: String(input.invocationLineage?.branch_id || packet?.task_agent_invocation_lineage?.branch_id || ""),
                rendered_handoff_checksum: input.renderedHandoff ? (0, agent_sessions_shared_1.hashValue)(input.renderedHandoff) : "",
                rendered_prompt_checksum: input.renderedPrompt ? (0, agent_sessions_shared_1.hashValue)(input.renderedPrompt) : "",
                rendered_prompt_excerpt: input.renderedPrompt ? String(input.renderedPrompt).slice(0, 4000) : "",
                runtime_tool_snapshot: input.runtimeToolSnapshot || null,
                gate_ids: gateIds,
            },
        };
        const checksum = (0, agent_sessions_shared_1.hashValue)(JSON.parse(JSON.stringify(payloadWithoutChecksum)));
        const snapshot = {
            ...payloadWithoutChecksum,
            checksum,
            snapshot_file: snapshotFile,
        };
        (0, agent_sessions_shared_1.writeJsonAtomic)(snapshotFile, snapshot);
        const ref = {
            snapshotId,
            snapshotPath: snapshotFile,
            checksum,
            workerContextPacketId,
            workerHandoffId,
            gateIds,
            generatedAt,
            invocationEdgeId: String(input.invocationLineage?.invocation_edge_id || packet?.task_agent_invocation_lineage?.invocation_edge_id || ""),
            branchId: String(input.invocationLineage?.branch_id || packet?.task_agent_invocation_lineage?.branch_id || ""),
            memorySnapshotSyncAction: memorySnapshotSync.action,
            memorySnapshotSyncChecksum: memorySnapshotSync.sync_checksum,
            memorySnapshotSyncedFromId: memorySnapshotSync.previous_snapshot_id,
        };
        refs.push(ref);
        const next = {
            ...current,
            groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || current.groupSessionId || ""),
            memoryContextSnapshotId: snapshotId,
            memoryContextSnapshotPath: snapshotFile,
            memoryContextSnapshotChecksum: checksum,
            memoryContextPacketId: workerContextPacketId,
            memoryContextSnapshotAt: generatedAt,
            memoryContextDeliveryReceiptId: "",
            memoryContextDeliveryReceiptPath: "",
            memoryContextDeliveryReceiptChecksum: "",
            memoryContextDeliveryStatus: "pending",
            memoryContextDeliveredAt: "",
            latestMemoryContextDeliveryAttemptReceiptId: "",
            latestMemoryContextDeliveryAttemptReceiptPath: "",
            latestMemoryContextDeliveryAttemptReceiptChecksum: "",
            latestMemoryContextDeliveryAttemptStatus: "pending",
            latestMemoryContextDeliveryAttemptAt: "",
            memorySnapshotSyncCommitPath: "",
            memorySnapshotSyncCommitChecksum: "",
            memorySnapshotSyncCommitStatus: "pending",
            memorySnapshotSyncCommittedAt: "",
            memoryEntrySyncRenderLease: memoryEntrySync ? {
                ...current.memoryEntrySyncRenderLease,
                status: "bound",
                bound_at: generatedAt,
                bound_snapshot_id: snapshotId,
                bound_snapshot_checksum: checksum,
            } : current.memoryEntrySyncRenderLease,
            memoryContextSnapshots: refs.slice(-agent_sessions_shared_1.MAX_MEMORY_CONTEXT_SNAPSHOTS_PER_SESSION),
            lastUsedAt: generatedAt,
        };
        store.sessions[index] = next;
        (0, agent_sessions_shared_1.saveStore)(store);
        return { session: next, snapshot, ref };
    });
}
function attachTaskAgentFinalDispatchPayloadGate(sessionId, input = {}) {
    const id = String(sessionId || "").trim();
    const requestedSnapshotId = String(input.snapshotId || "").trim();
    const gate = input.finalDispatchPayloadGate || input.final_dispatch_payload_gate || null;
    const reactiveCompact = input.finalDispatchReactiveCompact || input.final_dispatch_reactive_compact || null;
    const renderedPrompt = String(input.renderedPrompt || input.rendered_prompt || "");
    if (!id || !gate || !renderedPrompt)
        return { updated: false, reason: "missing_final_dispatch_binding_input" };
    return (0, agent_sessions_shared_1.withTaskAgentSessionStoreLock)(() => {
        const store = (0, agent_sessions_shared_1.loadStore)();
        const index = store.sessions.findIndex((item) => item.id === id);
        if (index < 0)
            return { updated: false, reason: "task_agent_session_missing" };
        const current = store.sessions[index];
        const refs = (0, agent_sessions_shared_1.normalizeMemorySnapshotRefs)(current.memoryContextSnapshots);
        const ref = refs.find(item => item.snapshotId === (requestedSnapshotId || current.memoryContextSnapshotId))
            || refs.find(item => item.snapshotId === current.memoryContextSnapshotId);
        const snapshotFile = String(ref?.snapshotPath || current.memoryContextSnapshotPath || "").trim();
        const snapshot = (0, agent_sessions_shared_1.safeReadJson)(snapshotFile, null);
        if (!snapshot || !(0, agent_sessions_shared_1.verifyMemoryContextSnapshotChecksum)(snapshot))
            return { updated: false, reason: "memory_context_snapshot_invalid" };
        const context = snapshot.context || {};
        const packet = context.worker_context_packet || {};
        const verification = (0, final_dispatch_payload_gate_1.verifyFinalWorkerDispatchPayloadGate)(gate, {
            renderedPrompt,
            groupId: snapshot.session?.group_id || current.groupId,
            groupSessionId: (0, agent_sessions_shared_1.capacityRevalidationGroupSessionId)(packet),
            taskId: snapshot.session?.task_id || current.taskId,
            taskAgentSessionId: snapshot.session?.id || current.id,
            workerContextPacketId: context.worker_context_packet_id || packet.packet_id || current.memoryContextPacketId,
        });
        if (!verification.valid)
            return { updated: false, reason: "final_dispatch_payload_gate_invalid", issues: verification.issues };
        const reactiveCompactVerification = reactiveCompact ? (0, final_dispatch_reactive_compact_1.verifyFinalDispatchReactiveCompactReceipt)(reactiveCompact, {
            groupId: snapshot.session?.group_id || current.groupId,
            groupSessionId: (0, agent_sessions_shared_1.capacityRevalidationGroupSessionId)(packet),
            taskId: snapshot.session?.task_id || current.taskId,
            taskAgentSessionId: snapshot.session?.id || current.id,
            workerContextPacketId: context.worker_context_packet_id || packet.packet_id || current.memoryContextPacketId,
        }) : { valid: true, issues: [] };
        if (!reactiveCompactVerification.valid)
            return { updated: false, reason: "final_dispatch_reactive_compact_invalid", issues: reactiveCompactVerification.issues };
        let memoryPromptInjectionProof = null;
        try {
            memoryPromptInjectionProof = (0, agent_sessions_shared_1.createTaskAgentMemoryPromptInjectionProof)({
                session: current,
                groupSessionMemoryBinding: context.group_session_memory_binding || (0, agent_sessions_shared_1.extractGroupSessionMemoryBinding)(context.memory_context || {}),
                memoryContext: context.memory_context || null,
                memoryContextChecksum: String(context.memory_context_checksum || ""),
                memorySnapshotSync: context.memory_snapshot_sync || null,
                renderedPrompt,
                enforcementRequired: context.memory_prompt_injection_proof?.enforcement_required === true,
                trustedEnvelopeRequired: context.memory_prompt_injection_proof?.trusted_envelope_required === true,
                generatedAt: new Date().toISOString(),
            });
        }
        catch (error) {
            return { updated: false, reason: "memory_prompt_injection_required", issues: error?.issues || [error?.message || String(error)] };
        }
        const nextWithoutChecksum = {
            ...snapshot,
            context: {
                ...context,
                worker_context_packet: {
                    ...packet,
                    final_dispatch_payload_gate: gate,
                    ...(reactiveCompact ? { final_dispatch_reactive_compact: reactiveCompact } : {}),
                },
                final_dispatch_payload_gate: gate,
                ...(reactiveCompact ? { final_dispatch_reactive_compact: reactiveCompact } : {}),
                final_dispatch_prompt_checksum: String(gate.prompt_checksum || ""),
                final_dispatch_prompt_tokens: Number(gate.estimated_total_input_tokens || 0),
                final_dispatch_prompt_chars: Number(gate.prompt_chars || renderedPrompt.length),
                final_dispatch_gate_attached_at: new Date().toISOString(),
                rendered_prompt_checksum: (0, agent_sessions_shared_1.hashValue)(renderedPrompt),
                rendered_prompt_excerpt: renderedPrompt.slice(0, 4000),
                memory_prompt_injection_proof: memoryPromptInjectionProof,
            },
        };
        delete nextWithoutChecksum.checksum;
        delete nextWithoutChecksum.snapshot_file;
        const serializedPayload = JSON.parse(JSON.stringify(nextWithoutChecksum));
        const checksum = (0, agent_sessions_shared_1.hashValue)(serializedPayload);
        const nextSnapshot = { ...serializedPayload, checksum, snapshot_file: snapshotFile };
        (0, agent_sessions_shared_1.writeJsonAtomic)(snapshotFile, nextSnapshot);
        const nextRefs = refs.map(item => item.snapshotId === snapshot.snapshot_id ? { ...item, checksum } : item);
        const nextSession = {
            ...current,
            memoryContextSnapshotChecksum: current.memoryContextSnapshotId === snapshot.snapshot_id ? checksum : current.memoryContextSnapshotChecksum,
            memoryContextSnapshots: nextRefs,
            lastUsedAt: new Date().toISOString(),
        };
        store.sessions[index] = nextSession;
        (0, agent_sessions_shared_1.saveStore)(store);
        return { updated: true, session: nextSession, snapshot: nextSnapshot, gate, verification, reactiveCompact, reactiveCompactVerification };
    });
}
//# sourceMappingURL=agent-sessions-bind.js.map