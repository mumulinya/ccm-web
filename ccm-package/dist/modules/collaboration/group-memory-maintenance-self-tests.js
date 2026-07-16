"use strict";
// Extracted functional module. The original entry remains a compatibility facade.
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
exports.runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairLifecycleContextSelfTest = runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairLifecycleContextSelfTest;
exports.runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionSelfTest = runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionSelfTest;
exports.runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionStartupDiscoverySelfTest = runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionStartupDiscoverySelfTest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const group_memory_index_1 = require("./group-memory-index");
function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairLifecycleContextSelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const groupA = `cleanup-commit-repair-lifecycle-a-${suffix}`;
    const groupB = `cleanup-commit-repair-lifecycle-b-${suffix}`;
    const workItemId = `cleanup-commit-repair:selftest-${suffix}`;
    const briefId = `cleanup-commit-repair-brief:selftest-${suffix}`;
    const quarantineId = `cleanup-commit-quarantine:selftest-${suffix}`;
    const transactionId = `delivery-cleanup-commit:selftest-${suffix}`;
    const workFile = (0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile)(groupA);
    const briefFile = (0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile)(groupA);
    const quarantineFile = (0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile)(groupA);
    const receiptFile = (0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile)(groupA);
    const approvalFileA = (0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile)(groupA);
    const approvalFileB = (0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile)(groupB);
    const cleanupDirs = [...new Set([path.dirname(workFile), path.dirname((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile)(groupB))])];
    const tasksBefore = require("../../core/db").loadTasks().length;
    const approvalsBefore = ((0, group_memory_index_1.readJson)(approvalFileA, {}).entries || []).length + ((0, group_memory_index_1.readJson)(approvalFileB, {}).entries || []).length;
    const throws = (fn, includes = "") => {
        try {
            fn();
            return false;
        }
        catch (error) {
            return !includes || String(error?.message || error).includes(includes);
        }
    };
    try {
        const at = "2026-07-12T14:00:00.000Z";
        const evidence = {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-quarantine-entry-v1",
            quarantine_id: quarantineId,
            group_id: groupA,
            transaction_id: transactionId,
            observed_group_id: groupA,
            gaps: ["transaction_journal_missing"],
            transaction_checksum: `transaction-checksum-${suffix}`,
            status: "quarantined_unproven_commit",
            first_seen_at: at,
            last_seen_at: at,
        };
        evidence.evidence_checksum = (0, group_memory_index_1.cleanupCommitRepairEvidenceChecksum)(evidence);
        (0, group_memory_index_1.writeJsonAtomic)(quarantineFile, {
            schema: "ccm-cleanup-commit-quarantine-ledger-v1",
            version: 1,
            group_id: groupA,
            entries: [evidence],
            entry_count: 1,
            updated_at: at,
            ledger_checksum: (0, group_memory_index_1.checksum)([evidence.evidence_checksum], 48),
        });
        (0, group_memory_index_1.writeCleanupCommitRepairWorkItems)(groupA, [{
                schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-repair-work-item-v1",
                work_item_id: workItemId,
                group_id: groupA,
                transaction_id: transactionId,
                quarantine_id: quarantineId,
                status: "pending",
                priority: "critical",
                reason: "selftest unproven cleanup commit WAL binding",
                gaps: ["transaction_journal_missing"],
                required_proof: ["valid group-local receipt checksum", "exact journal binding"],
                should_create_real_task: false,
                created_at: at,
                updated_at: at,
            }], at);
        (0, group_memory_index_1.writeCleanupCommitRepairBriefs)(groupA, [{
                schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-repair-dispatch-brief-v1",
                brief_id: briefId,
                group_id: groupA,
                work_item_id: workItemId,
                transaction_id: transactionId,
                target_agent_role: "group-main-agent",
                title: "Repair selftest cleanup commit WAL binding",
                status: "ready",
                instructions: ["Do not delete evidence or rewrite the WAL", "Re-prove exact bindings"],
                required_files: [quarantineFile],
                should_create_real_task: false,
                created_at: at,
                updated_at: at,
            }], at);
        const group = { id: groupA, name: "Repair lifecycle selftest", members: [{ project: "api", agent: "claudecode" }] };
        const { buildCoordinatorMaintenanceNotificationInstructions, buildWorkerContextPacketForAssignment } = require("./group-orchestrator");
        const { buildAgenticContext } = require("../global/global-agent");
        const mainBefore = (0, group_memory_index_1.buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext)(groupA, "group-main-agent");
        const globalBefore = buildAgenticContext("", "", { groups: [group, { id: groupB, name: "Other group", members: [] }] }).cleanup_commit_repair_context || null;
        const coordinatorBefore = buildCoordinatorMaintenanceNotificationInstructions(group, { at }).cleanup_commit_repair_context;
        const globalClaimBlocked = throws(() => (0, group_memory_index_1.updatePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItem)(groupA, {
            at: "2026-07-12T14:00:10.000Z", workItemId, action: "claim", actorRole: "global-agent", actorId: "global", reason: "not authorized", explicitAction: true,
        }), "not authorized");
        const claimed = (0, group_memory_index_1.updatePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItem)(groupA, {
            at: "2026-07-12T14:00:11.000Z", workItemId, action: "claim", actorRole: "group-main-agent", actorId: "coordinator", reason: "accept repair", explicitAction: true,
        });
        const dispatched = (0, group_memory_index_1.updatePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItem)(groupA, {
            at: "2026-07-12T14:00:12.000Z", workItemId, action: "dispatch", actorRole: "group-main-agent", actorId: "coordinator", reason: "send exact evidence review", explicitAction: true,
        });
        const assignmentId = `api::${groupA}|coordinator|api|repair-selftest::initial::1`;
        const unauthorizedAssignmentBlocked = throws(() => (0, group_memory_index_1.createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignment)(groupA, {
            at: "2026-07-12T14:00:13.000Z", workItemId, project: "api", agentType: "claudecode", assignmentId, childSessionId: "child-session-1",
            actorRole: "global-agent", actorId: "global", explicitAssignment: true,
        }), "not authorized");
        const assignment = (0, group_memory_index_1.createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignment)(groupA, {
            at: "2026-07-12T14:00:14.000Z", workItemId, project: "api", agentType: "claudecode", assignmentId, childSessionId: "child-session-1",
            actorRole: "group-main-agent", actorId: "coordinator", explicitAssignment: true,
        });
        const childOptions = { assignmentId, project: "api", agentType: "claudecode", childSessionId: "child-session-1" };
        const childExact = (0, group_memory_index_1.buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext)(groupA, "project-child-agent", childOptions);
        const childUnassigned = (0, group_memory_index_1.buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext)(groupA, "project-child-agent", { ...childOptions, assignmentId: "wrong-assignment" });
        const childWrongProject = (0, group_memory_index_1.buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext)(groupA, "project-child-agent", { ...childOptions, project: "frontend" });
        const childWrongSession = (0, group_memory_index_1.buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext)(groupA, "project-child-agent", { ...childOptions, childSessionId: "wrong-session" });
        const childWrongGroup = (0, group_memory_index_1.buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext)(groupB, "project-child-agent", childOptions);
        const baseAssignment = { project: "api", task: "repair selftest", assignmentId, scopeId: groupA, agentType: "claudecode" };
        const exactPacket = buildWorkerContextPacketForAssignment(baseAssignment, "", [], { group, childSessionId: "child-session-1" });
        const wrongPacket = buildWorkerContextPacketForAssignment({ ...baseAssignment, assignmentId: "wrong-assignment" }, "", [], { group, childSessionId: "child-session-1" });
        const expiredReceipt = (0, group_memory_index_1.createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt)(groupA, {
            at: "2026-07-12T14:01:00.000Z", workItemId, resolutionAction: "resolved", actorRole: "group-main-agent", actorId: "coordinator", reason: "expired approval selftest", explicitApproval: true, expiresInMs: 60_000,
        });
        const expiredBlocked = throws(() => (0, group_memory_index_1.executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt)(groupA, {
            at: "2026-07-12T14:02:01.000Z", receiptId: expiredReceipt.receipt_id, explicitExecution: true,
        }), "expired");
        const validReceipt = (0, group_memory_index_1.createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt)(groupA, {
            at: "2026-07-12T14:03:00.000Z", workItemId, resolutionAction: "resolved", actorRole: "group-main-agent", actorId: "coordinator", reason: "proof reviewed", explicitApproval: true, expiresInMs: 60_000,
        });
        const crossGroupBlocked = throws(() => (0, group_memory_index_1.executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt)(groupB, {
            at: "2026-07-12T14:03:10.000Z", receiptId: validReceipt.receipt_id, explicitExecution: true,
        }), "ledger checksum invalid");
        const resolved = (0, group_memory_index_1.executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt)(groupA, {
            at: "2026-07-12T14:03:20.000Z", receiptId: validReceipt.receipt_id, explicitExecution: true,
        });
        const replayBlocked = throws(() => (0, group_memory_index_1.executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt)(groupA, {
            at: "2026-07-12T14:03:21.000Z", receiptId: validReceipt.receipt_id, explicitExecution: true,
        }), "invalid or consumed");
        const qualityCheckId = "post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_cleanup_commit_repair_lifecycle_context";
        const { buildMemoryQualityReport } = require("../knowledge/memory-control-center");
        const qualityBeforeTamper = buildMemoryQualityReport({ checkIds: [qualityCheckId], groupIds: [groupA], now: "2026-07-12T14:03:21.500Z", refresh: true, writeTargeted: false }).checks?.[0] || {};
        const receiptLedger = (0, group_memory_index_1.readJson)(receiptFile, {});
        (0, group_memory_index_1.writeJsonAtomic)(receiptFile, {
            ...receiptLedger,
            entries: (receiptLedger.entries || []).map((entry) => entry.receipt_id === validReceipt.receipt_id ? { ...entry, consumed: false } : entry),
        });
        const consumedStateTamperBlocked = throws(() => (0, group_memory_index_1.executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt)(groupA, {
            at: "2026-07-12T14:03:22.000Z", receiptId: validReceipt.receipt_id, explicitExecution: true,
        }), "ledger checksum invalid");
        const qualityAfterTamper = buildMemoryQualityReport({ checkIds: [qualityCheckId], groupIds: [groupA], now: "2026-07-12T14:03:22.500Z", refresh: true, writeTargeted: false }).checks?.[0] || {};
        const mainAfter = (0, group_memory_index_1.buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext)(groupA, "group-main-agent");
        const childAfter = (0, group_memory_index_1.buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext)(groupA, "project-child-agent", childOptions);
        const coordinatorAfter = buildCoordinatorMaintenanceNotificationInstructions(group, { at: "2026-07-12T14:03:30.000Z" }).cleanup_commit_repair_context;
        const globalAfter = buildAgenticContext("", "", { groups: [group] }).cleanup_commit_repair_context || null;
        const quarantineAfter = (0, group_memory_index_1.readJson)(quarantineFile, {});
        const approvalsAfter = ((0, group_memory_index_1.readJson)(approvalFileA, {}).entries || []).length + ((0, group_memory_index_1.readJson)(approvalFileB, {}).entries || []).length;
        const checks = {
            readyBriefInjectedIntoGroupMainAndCoordinator: mainBefore.brief_count === 1 && coordinatorBefore.brief_count === 1,
            globalAgentExcludesGroupScopedRepairContext: globalBefore == null,
            globalAgentCannotClaimOrAssign: globalClaimBlocked && unauthorizedAssignmentBlocked,
            lifecycleTransitionsPendingClaimedDispatched: claimed.status === "claimed" && dispatched.status === "dispatched",
            exactAssignmentBindingCreated: assignment.group_id === groupA && assignment.assignment_id === assignmentId && assignment.child_session_id === "child-session-1",
            unassignedAndMismatchedChildrenSeeNoBrief: childUnassigned.brief_count === 0 && childWrongProject.brief_count === 0 && childWrongSession.brief_count === 0 && childWrongGroup.brief_count === 0,
            exactChildAndWorkerPacketReceiveOneBrief: childExact.brief_count === 1 && childExact.briefs[0]?.brief_id === briefId
                && exactPacket.cleanup_commit_repair_context?.brief_count === 1 && wrongPacket.cleanup_commit_repair_context == null,
            approvalAndExecutionAreSeparated: validReceipt.consumed === false && resolved.status === "resolved" && resolved.resolution_receipt_id === validReceipt.receipt_id,
            expiredAndCrossGroupReceiptsBlocked: expiredBlocked && crossGroupBlocked,
            replayAndConsumedStateTamperBlocked: replayBlocked && consumedStateTamperBlocked,
            persistentQualityGateAcceptsHealthyAndRejectsTamper: qualityBeforeTamper.id === qualityCheckId && qualityBeforeTamper.status === "ok"
                && qualityAfterTamper.id === qualityCheckId && qualityAfterTamper.status === "fail",
            resolvedBriefRemovedFromAllContexts: mainAfter.brief_count === 0 && childAfter.brief_count === 0 && coordinatorAfter.brief_count === 0 && globalAfter == null,
            evidenceTasksAndApprovalsPreserved: quarantineAfter.entries?.[0]?.evidence_checksum === evidence.evidence_checksum
                && require("../../core/db").loadTasks().length === tasksBefore && approvalsAfter === approvalsBefore,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            lifecycle: { claimed: claimed.status, dispatched: dispatched.status, resolved: resolved.status },
            assignment: { binding_id: assignment.binding_id, packet_brief_count: exactPacket.cleanup_commit_repair_context?.brief_count || 0 },
            receipt: { expiredBlocked, crossGroupBlocked, replayBlocked, consumedStateTamperBlocked },
            quality: {
                before: { id: qualityBeforeTamper.id, status: qualityBeforeTamper.status, report: qualityBeforeTamper.report },
                after: { id: qualityAfterTamper.id, status: qualityAfterTamper.status, report: qualityAfterTamper.report },
            },
        };
    }
    finally {
        for (const dir of cleanupDirs) {
            try {
                if (fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionSelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const groupA = `cleanup-commit-repair-resolution-tx-a-${suffix}`;
    const groupB = `cleanup-commit-repair-resolution-tx-b-${suffix}`;
    const groupC = `cleanup-commit-repair-resolution-tx-c-${suffix}`;
    const phases = ["prepared", "work_item_written", "work_item_committed", "brief_written", "brief_committed", "assignment_written", "assignment_committed", "receipt_written", "receipt_committed"];
    const schedulerStateFile = path.join(utils_1.CCM_DIR, "memory-control", `cleanup-commit-repair-resolution-tx-selftest-${suffix}.json`);
    const groupIds = [groupA, groupB, groupC];
    const cleanupDirs = groupIds.map(groupId => path.dirname((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile)(groupId)));
    const tasksBefore = require("../../core/db").loadTasks().length;
    const approvalFiles = groupIds.map(groupId => (0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile)(groupId));
    const approvalsBefore = approvalFiles.reduce((sum, file) => sum + ((0, group_memory_index_1.readJson)(file, {}).entries || []).length, 0);
    const throws = (fn, includes = "") => {
        try {
            fn();
            return false;
        }
        catch (error) {
            return !includes || String(error?.message || error).includes(includes);
        }
    };
    const seed = (groupId, labels, baseAt) => {
        const evidenceEntries = [];
        const workEntries = [];
        const briefEntries = [];
        const assignmentEntries = [];
        for (const [index, label] of labels.entries()) {
            const transactionId = `delivery-cleanup-commit:${groupId}:${label}`;
            const gaps = ["transaction_journal_missing"];
            const quarantineId = `cleanup-commit-quarantine:${(0, group_memory_index_1.checksum)([groupId, transactionId, (0, group_memory_index_1.checksum)(gaps, 32)], 24)}`;
            const workItemId = `cleanup-commit-repair:${(0, group_memory_index_1.checksum)([groupId, quarantineId], 24)}`;
            const briefId = `cleanup-commit-repair-brief:${(0, group_memory_index_1.checksum)([groupId, workItemId], 24)}`;
            const evidence = {
                schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-quarantine-entry-v1",
                quarantine_id: quarantineId,
                group_id: groupId,
                transaction_id: transactionId,
                observed_group_id: groupId,
                gaps,
                transaction_checksum: `transaction-checksum-${label}`,
                status: "quarantined_unproven_commit",
                first_seen_at: baseAt,
                last_seen_at: baseAt,
            };
            evidence.evidence_checksum = (0, group_memory_index_1.cleanupCommitRepairEvidenceChecksum)(evidence);
            evidenceEntries.push(evidence);
            workEntries.push({
                schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-repair-work-item-v1",
                work_item_id: workItemId,
                group_id: groupId,
                transaction_id: transactionId,
                quarantine_id: quarantineId,
                status: "dispatched",
                priority: "critical",
                reason: `resolution transaction selftest ${label}`,
                gaps: ["transaction_journal_missing"],
                required_proof: ["valid exact binding"],
                should_create_real_task: false,
                created_at: baseAt,
                updated_at: baseAt,
            });
            briefEntries.push({
                schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-repair-dispatch-brief-v1",
                brief_id: briefId,
                group_id: groupId,
                work_item_id: workItemId,
                transaction_id: transactionId,
                target_agent_role: "group-main-agent",
                title: `Repair resolution transaction ${label}`,
                status: "assigned",
                instructions: ["Preserve evidence"],
                required_files: [],
                should_create_real_task: false,
                created_at: baseAt,
                updated_at: baseAt,
            });
            assignmentEntries.push({
                schema: "ccm-cleanup-commit-repair-assignment-v1",
                version: 1,
                binding_id: `cleanup-commit-repair-assignment:${groupId}:${label}`,
                group_id: groupId,
                work_item_id: workItemId,
                brief_id: briefId,
                transaction_id: transactionId,
                assignment_id: `assignment:${groupId}:${label}`,
                project: "api",
                agent_type: "claudecode",
                child_session_id: `child-session:${label}`,
                assigned_by_role: "group-main-agent",
                assigned_by: "coordinator",
                status: "active",
                assigned_at: baseAt,
            });
        }
        const quarantineFile = (0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile)(groupId);
        (0, group_memory_index_1.writeJsonAtomic)(quarantineFile, {
            schema: "ccm-cleanup-commit-quarantine-ledger-v1",
            version: 1,
            group_id: groupId,
            entries: evidenceEntries,
            entry_count: evidenceEntries.length,
            updated_at: baseAt,
            ledger_checksum: (0, group_memory_index_1.checksum)(evidenceEntries.map(entry => entry.evidence_checksum), 48),
        });
        const writtenWork = (0, group_memory_index_1.writeCleanupCommitRepairWorkItems)(groupId, workEntries, baseAt);
        (0, group_memory_index_1.writeCleanupCommitRepairBriefs)(groupId, briefEntries, baseAt);
        (0, group_memory_index_1.writeCleanupCommitRepairAssignments)(groupId, assignmentEntries, baseAt);
        const receipts = writtenWork.map((item, index) => (0, group_memory_index_1.createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt)(groupId, {
            at: new Date(Date.parse(baseAt) + (index + 1) * 1_000).toISOString(),
            workItemId: item.work_item_id,
            resolutionAction: "resolved",
            actorRole: "group-main-agent",
            actorId: "coordinator",
            reason: `verified resolution proof ${labels[index]}`,
            explicitApproval: true,
            expiresInMs: 60 * 60 * 1000,
        }));
        return { workItems: writtenWork, receipts, evidenceEntries };
    };
    try {
        const seededA = seed(groupA, phases, "2026-07-12T16:00:00.000Z");
        const seededB = seed(groupB, ["isolation"], "2026-07-12T16:00:00.000Z");
        const moduleFile = path.resolve(__dirname, "group-memory-index.js");
        const childProcess = require("child_process");
        const interrupted = [];
        for (const [index, phase] of phases.entries()) {
            const script = [
                "const m=require(process.argv[1]);",
                "const r=m.executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt(process.argv[2],{at:process.argv[4],receiptId:process.argv[3],explicitExecution:true,simulateResolutionCrashAfter:process.argv[5]});",
                "process.stdout.write(JSON.stringify(r));",
                "process.exit(r.status==='interrupted'?0:1);",
            ].join("");
            const at = new Date(Date.parse("2026-07-12T16:10:00.000Z") + index * 1_000).toISOString();
            const run = childProcess.spawnSync(process.execPath, ["-e", script, moduleFile, groupA, seededA.receipts[index].receipt_id, at, phase], {
                cwd: process.cwd(), encoding: "utf-8", windowsHide: true, timeout: 30_000,
            });
            let result = null;
            try {
                result = JSON.parse(String(run.stdout || "{}"));
            }
            catch {
                result = { status: "invalid_child_output", stderr: run.stderr };
            }
            interrupted.push({ phase, runStatus: run.status, result });
        }
        const beforeRecovery = (0, group_memory_index_1.inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions)(groupA);
        const discoveryEntriesBefore = {
            quarantine: (0, group_memory_index_1.readJson)((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile)(groupA), {}).entries || [],
            work: (0, group_memory_index_1.readJson)((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile)(groupA), {}).entries || [],
            brief: (0, group_memory_index_1.readJson)((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile)(groupA), {}).entries || [],
        };
        (0, group_memory_index_1.writeCleanupCommitDiscoveryArtifacts)(groupA, phases.map(label => ({
            transaction_id: `delivery-cleanup-commit:${groupA}:${label}`,
            transaction: {
                transaction_id: `delivery-cleanup-commit:${groupA}:${label}`,
                group_id: groupA,
                transaction_checksum: `transaction-checksum-${label}`,
            },
            gaps: ["transaction_journal_missing"],
        })), "2026-07-12T16:10:30.000Z");
        const discoveryEntriesAfter = {
            quarantine: (0, group_memory_index_1.readJson)((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile)(groupA), {}).entries || [],
            work: (0, group_memory_index_1.readJson)((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile)(groupA), {}).entries || [],
            brief: (0, group_memory_index_1.readJson)((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile)(groupA), {}).entries || [],
        };
        const preparedWork = (0, group_memory_index_1.readJson)((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile)(groupA), {}).entries?.[0] || {};
        const mutationBlocked = throws(() => (0, group_memory_index_1.updatePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItem)(groupA, {
            at: "2026-07-12T16:11:00.000Z", workItemId: seededA.workItems[0].work_item_id, action: "reopen", actorRole: "group-main-agent", actorId: "coordinator", reason: "must wait for recovery", explicitAction: true,
        }), "transaction already in progress");
        const groupBBefore = {
            work: (0, group_memory_index_1.checksum)(fs.readFileSync((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile)(groupB), "utf-8"), 48),
            brief: (0, group_memory_index_1.checksum)(fs.readFileSync((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile)(groupB), "utf-8"), 48),
            assignment: (0, group_memory_index_1.checksum)(fs.readFileSync((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignmentFile)(groupB), "utf-8"), 48),
            receipt: (0, group_memory_index_1.checksum)(fs.readFileSync((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile)(groupB), "utf-8"), 48),
        };
        const recovered = (0, group_memory_index_1.reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions)(groupA, {
            at: "2026-07-12T16:20:00.000Z", trigger: "startup-selftest",
        });
        const recoveredAgain = (0, group_memory_index_1.reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions)(groupA, {
            at: "2026-07-12T16:20:01.000Z", trigger: "startup-selftest-repeat",
        });
        const workAfter = (0, group_memory_index_1.readJson)((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile)(groupA), {}).entries || [];
        const briefAfter = (0, group_memory_index_1.readJson)((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile)(groupA), {}).entries || [];
        const assignmentAfter = (0, group_memory_index_1.readJson)((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignmentFile)(groupA), {}).entries || [];
        const receiptAfter = (0, group_memory_index_1.readJson)((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile)(groupA), {}).entries || [];
        const groupBAfter = {
            work: (0, group_memory_index_1.checksum)(fs.readFileSync((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile)(groupB), "utf-8"), 48),
            brief: (0, group_memory_index_1.checksum)(fs.readFileSync((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile)(groupB), "utf-8"), 48),
            assignment: (0, group_memory_index_1.checksum)(fs.readFileSync((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairAssignmentFile)(groupB), "utf-8"), 48),
            receipt: (0, group_memory_index_1.checksum)(fs.readFileSync((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile)(groupB), "utf-8"), 48),
        };
        const seededC = seed(groupC, ["scheduler"], "2026-07-12T17:00:00.000Z");
        const schedulerCrash = (0, group_memory_index_1.executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt)(groupC, {
            at: "2026-07-12T17:00:10.000Z", receiptId: seededC.receipts[0].receipt_id, explicitExecution: true, simulateResolutionCrashAfter: "brief_written",
        });
        (0, group_memory_index_1.writeJsonAtomic)((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile)(groupC), { schema: "selftest-manifest", group_id: groupC });
        const safeTelemetry = () => ({ destructive_action_authorized: false, deleted_count: 0, created_task_count: 0, created_approval_receipt_count: 0 });
        const { runConflictResolutionMemoryMaintenanceSchedulerTick } = require("../scheduling/cron");
        const scheduler = runConflictResolutionMemoryMaintenanceSchedulerTick({
            at: "2026-07-12T17:01:00.000Z", groupIds: [groupC], force: true, stateFile: schedulerStateFile,
            runMaintenance: () => ({ dueCount: 0, skippedCount: 1, destructiveActionAuthorized: false, deletedCount: 0 }),
            runTelemetryRecovery: safeTelemetry,
            runTelemetryOrphanReconciliation: safeTelemetry,
            runTelemetryCleanupCommitDiscovery: safeTelemetry,
            runTelemetryCleanupJournalReconciliation: () => ({ ...safeTelemetry(), ledger_checksum_valid: true, commit_ledger_checksum_valid: true, group_ledger_lock_valid: true, invalid_commit_transaction_count: 0, candidate_claim_conflict_count: 0 }),
            runTelemetryQuarantineRetention: safeTelemetry,
            runTelemetryRetention: safeTelemetry,
        });
        const qualityId = "post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_cleanup_commit_repair_resolution_transaction";
        const { buildMemoryQualityReport } = require("../knowledge/memory-control-center");
        const qualityBeforeTamper = buildMemoryQualityReport({ checkIds: [qualityId], groupIds: [groupA, groupC], now: "2026-07-12T17:02:00.000Z", refresh: true, writeTargeted: false }).checks?.[0] || {};
        const transactionFileA = (0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionFile)(groupA);
        const transactionLedgerA = (0, group_memory_index_1.readJson)(transactionFileA, {});
        (0, group_memory_index_1.writeJsonAtomic)(transactionFileA, {
            ...transactionLedgerA,
            entries: (transactionLedgerA.entries || []).map((entry, index) => index === 0 ? { ...entry, recovery_count: Number(entry.recovery_count || 0) + 1 } : entry),
        });
        const tamperedHealth = (0, group_memory_index_1.inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions)(groupA);
        const tamperedRecovery = (0, group_memory_index_1.reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions)(groupA, { at: "2026-07-12T17:02:01.000Z", trigger: "tamper-selftest" });
        const qualityAfterTamper = buildMemoryQualityReport({ checkIds: [qualityId], groupIds: [groupA], now: "2026-07-12T17:02:02.000Z", refresh: true, writeTargeted: false }).checks?.[0] || {};
        const approvalsAfter = approvalFiles.reduce((sum, file) => sum + ((0, group_memory_index_1.readJson)(file, {}).entries || []).length, 0);
        const expectedWriteBeforePhase = new Map([
            ["prepared", "prepared"], ["work_item_written", "prepared"], ["work_item_committed", "work_item_committed"],
            ["brief_written", "work_item_committed"], ["brief_committed", "brief_committed"],
            ["assignment_written", "brief_committed"], ["assignment_committed", "assignment_committed"],
            ["receipt_written", "assignment_committed"], ["receipt_committed", "receipt_committed"],
        ]);
        const checks = {
            allCrashBoundariesPersistAnOpenTransaction: interrupted.length === phases.length
                && interrupted.every(row => row.runStatus === 0 && row.result.status === "interrupted" && !!row.result.resolution_transaction_id)
                && beforeRecovery.open_transaction_count === phases.length,
            writeBeforePhaseInterruptionsRetainPreviousDurablePhase: interrupted.every(row => row.result.resolution_transaction_phase === expectedWriteBeforePhase.get(row.phase)),
            preparedWalPrecedesAnyRepairLedgerMutation: preparedWork.status === "dispatched" && !preparedWork.resolution_receipt_id,
            discoveryPreservesArtifactsBoundByOpenResolutionTransactions: (0, group_memory_index_1.checksum)(discoveryEntriesBefore, 48) === (0, group_memory_index_1.checksum)(discoveryEntriesAfter, 48),
            concurrentMutationBlockedWhileTransactionOpen: mutationBlocked,
            startupReconciliationRecoversEveryOpenTransaction: recovered.status === "ok" && recovered.recovered_now_count === phases.length
                && recovered.open_transaction_count === 0 && recovered.invalid_transaction_count === 0,
            completedTransactionsCarryAllPhaseProofs: recovered.rows.length === phases.length && recovered.rows.every((row) => row.status === "completed" && row.phase === "completed" && row.completion_proof_valid),
            allRepairLedgersConvergeToTerminalState: workAfter.every((entry) => entry.status === "resolved" && !!entry.resolution_receipt_id)
                && briefAfter.every((entry) => entry.status === "closed" && !!entry.resolution_receipt_id)
                && assignmentAfter.every((entry) => entry.status === "closed" && !!entry.resolution_receipt_id)
                && receiptAfter.every((entry) => entry.consumed === true),
            repeatedReconciliationIsIdempotent: recoveredAgain.status === "ok" && recoveredAgain.recovered_now_count === 0 && recoveredAgain.open_transaction_count === 0,
            otherGroupLedgersRemainByteStable: JSON.stringify(groupBBefore) === JSON.stringify(groupBAfter)
                && seededB.workItems.length === 1 && seededB.receipts.length === 1,
            schedulerRunsRealResolutionRecovery: schedulerCrash.status === "interrupted" && scheduler.failedCount === 0
                && scheduler.deliveryCleanupCommitRepairResolutionRecoveredNowCount === 1
                && scheduler.deliveryCleanupCommitRepairResolutionOpenTransactionCount === 0,
            qualityGateAcceptsRecoveredStateAndRejectsTamper: qualityBeforeTamper.id === qualityId && qualityBeforeTamper.status === "ok"
                && qualityAfterTamper.id === qualityId && qualityAfterTamper.status === "fail",
            transactionAndLedgerTamperFailClosed: tamperedHealth.invalid_transaction_count > 0 && tamperedRecovery.status === "blocked" && tamperedRecovery.recovered_now_count === 0,
            recoveryCreatesNoTasksApprovalsOrDeletionAuthority: require("../../core/db").loadTasks().length === tasksBefore
                && approvalsAfter === approvalsBefore && recovered.destructive_action_authorized === false && recovered.deleted_count === 0
                && scheduler.destructiveActionAuthorized === false && scheduler.deletedCount === 0,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            crashMatrix: interrupted.map(row => ({ requested: row.phase, durablePhase: row.result.resolution_transaction_phase, status: row.result.status })),
            recovery: { recoveredNow: recovered.recovered_now_count, completed: recovered.completed_transaction_count, open: recovered.open_transaction_count, invalid: recovered.invalid_transaction_count },
            scheduler: { failed: scheduler.failedCount, recoveredNow: scheduler.deliveryCleanupCommitRepairResolutionRecoveredNowCount, open: scheduler.deliveryCleanupCommitRepairResolutionOpenTransactionCount },
            quality: { before: qualityBeforeTamper.status, after: qualityAfterTamper.status },
        };
    }
    finally {
        for (const file of [schedulerStateFile, `${schedulerStateFile}.bak`]) {
            try {
                if (fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of cleanupDirs) {
            try {
                if (fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionStartupDiscoverySelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const groupA = `cleanup-commit-repair-resolution-discovery-a-${suffix}`;
    const groupB = `cleanup-commit-repair-resolution-discovery-b-${suffix}`;
    const groupIds = [groupA, groupB];
    const schedulerStateFile = path.join(utils_1.CCM_DIR, "memory-control", `cleanup-commit-repair-resolution-discovery-selftest-${suffix}.json`);
    const cleanupDirs = groupIds.map(groupId => path.dirname((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile)(groupId)));
    const approvalFiles = groupIds.map(groupId => (0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile)(groupId));
    const tasksBefore = require("../../core/db").loadTasks().length;
    const approvalsBefore = approvalFiles.reduce((sum, file) => sum + ((0, group_memory_index_1.readJson)(file, {}).entries || []).length, 0);
    const seed = (groupId, labels, baseAt) => {
        const evidenceEntries = [];
        const workEntries = [];
        const briefEntries = [];
        for (const label of labels) {
            const transactionId = `delivery-cleanup-commit:${groupId}:${label}`;
            const gaps = ["transaction_journal_missing"];
            const quarantineId = `cleanup-commit-quarantine:${(0, group_memory_index_1.checksum)([groupId, transactionId, (0, group_memory_index_1.checksum)(gaps, 32)], 24)}`;
            const workItemId = `cleanup-commit-repair:${(0, group_memory_index_1.checksum)([groupId, quarantineId], 24)}`;
            const briefId = `cleanup-commit-repair-brief:${(0, group_memory_index_1.checksum)([groupId, workItemId], 24)}`;
            const evidence = {
                schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-quarantine-entry-v1",
                quarantine_id: quarantineId,
                group_id: groupId,
                transaction_id: transactionId,
                observed_group_id: groupId,
                gaps,
                transaction_checksum: `transaction-checksum-${label}`,
                status: "quarantined_unproven_commit",
                first_seen_at: baseAt,
                last_seen_at: baseAt,
            };
            evidence.evidence_checksum = (0, group_memory_index_1.cleanupCommitRepairEvidenceChecksum)(evidence);
            evidenceEntries.push(evidence);
            workEntries.push({
                schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-repair-work-item-v1",
                work_item_id: workItemId,
                group_id: groupId,
                transaction_id: transactionId,
                quarantine_id: quarantineId,
                status: "dispatched",
                priority: "critical",
                reason: `startup discovery ${label}`,
                gaps,
                required_proof: ["exact group-local proof"],
                should_create_real_task: false,
                created_at: baseAt,
                updated_at: baseAt,
            });
            briefEntries.push({
                schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-commit-repair-dispatch-brief-v1",
                brief_id: briefId,
                group_id: groupId,
                work_item_id: workItemId,
                transaction_id: transactionId,
                target_agent_role: "group-main-agent",
                title: `Startup discovery ${label}`,
                status: "ready",
                instructions: ["Preserve evidence"],
                required_files: [],
                should_create_real_task: false,
                created_at: baseAt,
                updated_at: baseAt,
            });
        }
        const quarantineFile = (0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile)(groupId);
        (0, group_memory_index_1.writeJsonAtomic)(quarantineFile, {
            schema: "ccm-cleanup-commit-quarantine-ledger-v1", version: 1, group_id: groupId,
            entries: evidenceEntries, entry_count: evidenceEntries.length, updated_at: baseAt,
            ledger_checksum: (0, group_memory_index_1.checksum)(evidenceEntries.map(entry => entry.evidence_checksum), 48),
        });
        const workItems = (0, group_memory_index_1.writeCleanupCommitRepairWorkItems)(groupId, workEntries, baseAt);
        (0, group_memory_index_1.writeCleanupCommitRepairBriefs)(groupId, briefEntries, baseAt);
        const receipts = workItems.map((item, index) => (0, group_memory_index_1.createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt)(groupId, {
            at: new Date(Date.parse(baseAt) + (index + 1) * 1_000).toISOString(),
            workItemId: item.work_item_id,
            resolutionAction: "resolved",
            actorRole: "group-main-agent",
            actorId: "coordinator",
            reason: `verified startup discovery proof ${labels[index]}`,
            explicitApproval: true,
            expiresInMs: 60 * 60 * 1000,
        }));
        return { workItems, receipts, evidenceEntries };
    };
    try {
        const compactLabels = Array.from({ length: 7 }, (_, index) => `compact-${index}`);
        const seededA = seed(groupA, compactLabels, "2026-07-12T18:00:00.000Z");
        const compactExecutions = seededA.receipts.map((receipt, index) => (0, group_memory_index_1.executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt)(groupA, {
            at: new Date(Date.parse("2026-07-12T18:05:00.000Z") + index * 1_000).toISOString(),
            receiptId: receipt.receipt_id,
            explicitExecution: true,
            resolutionTransactionTerminalLimit: 4,
        }));
        const retainedTransactionLedgerA = (0, group_memory_index_1.readCleanupCommitRepairResolutionTransactionLedger)(groupA);
        const retainedWorkItemIds = new Set(retainedTransactionLedgerA.entries.map((entry) => entry.work_item_id));
        const retainedArtifactSnapshot = () => ({
            quarantine: ((0, group_memory_index_1.readJson)((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitQuarantineFile)(groupA), {}).entries || []).filter((entry) => retainedWorkItemIds.has((seededA.workItems.find((item) => item.quarantine_id === entry.quarantine_id) || {}).work_item_id)),
            work: ((0, group_memory_index_1.readJson)((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairWorkItemFile)(groupA), {}).entries || []).filter((entry) => retainedWorkItemIds.has(entry.work_item_id)),
            brief: ((0, group_memory_index_1.readJson)((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairDispatchBriefFile)(groupA), {}).entries || []).filter((entry) => retainedWorkItemIds.has(entry.work_item_id)),
        });
        const retainedArtifactsBeforeDiscovery = retainedArtifactSnapshot();
        (0, group_memory_index_1.writeCleanupCommitDiscoveryArtifacts)(groupA, compactLabels.map(label => ({
            transaction_id: `delivery-cleanup-commit:${groupA}:${label}`,
            transaction: { transaction_id: `delivery-cleanup-commit:${groupA}:${label}`, group_id: groupA, transaction_checksum: `transaction-checksum-${label}` },
            gaps: ["transaction_journal_missing"],
        })), "2026-07-12T18:05:30.000Z");
        const retainedArtifactsAfterDiscovery = retainedArtifactSnapshot();
        const compactDiscovery = (0, group_memory_index_1.discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions)(groupA, {
            at: "2026-07-12T18:06:00.000Z", persist: true, recover: true, trigger: "startup-selftest-compact",
        });
        const invalidLabels = ["recoverable", "cross-group", "checksum-tamper", "missing-receipt"];
        const seededB = seed(groupB, invalidLabels, "2026-07-12T18:10:00.000Z");
        const prepared = seededB.receipts.map((receipt, index) => (0, group_memory_index_1.executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt)(groupB, {
            at: new Date(Date.parse("2026-07-12T18:15:00.000Z") + index * 1_000).toISOString(),
            receiptId: receipt.receipt_id,
            explicitExecution: true,
            simulateResolutionCrashAfter: "prepared",
        }));
        const transactionFileB = (0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionFile)(groupB);
        const transactionLedgerB = (0, group_memory_index_1.readJson)(transactionFileB, {});
        const txByReceipt = new Map((transactionLedgerB.entries || []).map((entry) => [entry.receipt_id, entry]));
        const crossTx = { ...txByReceipt.get(seededB.receipts[1].receipt_id), group_id: groupA };
        crossTx.transaction_checksum = (0, group_memory_index_1.cleanupCommitRepairResolutionTransactionChecksum)(crossTx);
        const tamperedTx = { ...txByReceipt.get(seededB.receipts[2].receipt_id), recovery_count: 77 };
        const updatedTransactions = (transactionLedgerB.entries || []).map((entry) => entry.receipt_id === crossTx.receipt_id ? crossTx : entry.receipt_id === tamperedTx.receipt_id ? tamperedTx : entry);
        const updatedTransactionLedger = { ...transactionLedgerB, entries: updatedTransactions };
        updatedTransactionLedger.ledger_checksum = (0, group_memory_index_1.cleanupCommitRepairResolutionTransactionLedgerChecksum)(updatedTransactionLedger);
        (0, group_memory_index_1.writeJsonAtomic)(transactionFileB, updatedTransactionLedger);
        const receiptFileB = (0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile)(groupB);
        const receiptLedgerB = (0, group_memory_index_1.readJson)(receiptFileB, {});
        (0, group_memory_index_1.writeCleanupCommitRepairResolutionReceipts)(groupB, (receiptLedgerB.entries || []).filter((entry) => entry.receipt_id !== seededB.receipts[3].receipt_id), "2026-07-12T18:15:10.000Z");
        const invalidIds = new Set([crossTx.resolution_transaction_id, tamperedTx.resolution_transaction_id, txByReceipt.get(seededB.receipts[3].receipt_id).resolution_transaction_id]);
        const invalidBefore = new Map(((0, group_memory_index_1.readJson)(transactionFileB, {}).entries || []).filter((entry) => invalidIds.has(entry.resolution_transaction_id)).map((entry) => [entry.resolution_transaction_id, (0, group_memory_index_1.checksum)(entry, 48)]));
        const discoveryB = (0, group_memory_index_1.discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions)(groupB, {
            at: "2026-07-12T18:16:00.000Z", persist: true, recover: true, trigger: "startup-selftest-invalid",
        });
        const invalidAfter = new Map(((0, group_memory_index_1.readJson)(transactionFileB, {}).entries || []).filter((entry) => invalidIds.has(entry.resolution_transaction_id)).map((entry) => [entry.resolution_transaction_id, (0, group_memory_index_1.checksum)(entry, 48)]));
        const discoveryBRepeat = (0, group_memory_index_1.discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions)(groupB, {
            at: "2026-07-12T18:16:01.000Z", persist: true, recover: true, trigger: "startup-selftest-invalid-repeat",
        });
        const batch = (0, group_memory_index_1.runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionStartupDiscovery)([groupA, groupB], {
            at: "2026-07-12T18:16:02.000Z", persist: true, recover: true, trigger: "startup-selftest-batch",
        });
        const workArtifacts = (0, group_memory_index_1.readJson)(discoveryB.repair_work_item_file, {}).entries || [];
        const briefArtifacts = (0, group_memory_index_1.readJson)(discoveryB.repair_dispatch_brief_file, {}).entries || [];
        const quarantineArtifacts = (0, group_memory_index_1.readJson)(discoveryB.quarantine_file, {}).entries || [];
        (0, group_memory_index_1.writeJsonAtomic)((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile)(groupB), { schema: "selftest-manifest", group_id: groupB });
        const safeTelemetry = () => ({ destructive_action_authorized: false, deleted_count: 0, created_task_count: 0, created_approval_receipt_count: 0 });
        const { runConflictResolutionMemoryMaintenanceSchedulerTick } = require("../scheduling/cron");
        const scheduler = runConflictResolutionMemoryMaintenanceSchedulerTick({
            at: "2026-07-12T18:17:00.000Z", groupIds: [groupB], force: true, stateFile: schedulerStateFile,
            runMaintenance: () => ({ dueCount: 0, skippedCount: 1, destructiveActionAuthorized: false, deletedCount: 0 }),
            runTelemetryRecovery: safeTelemetry,
            runTelemetryOrphanReconciliation: safeTelemetry,
            runTelemetryCleanupCommitDiscovery: safeTelemetry,
            runTelemetryCleanupJournalReconciliation: () => ({ ...safeTelemetry(), ledger_checksum_valid: true, commit_ledger_checksum_valid: true, group_ledger_lock_valid: true, invalid_commit_transaction_count: 0, candidate_claim_conflict_count: 0 }),
            runTelemetryQuarantineRetention: safeTelemetry,
            runTelemetryRetention: safeTelemetry,
        });
        const qualityId = "post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_cleanup_commit_repair_resolution_transaction_startup_discovery";
        const { buildMemoryQualityReport } = require("../knowledge/memory-control-center");
        const qualityBeforeTamper = buildMemoryQualityReport({ checkIds: [qualityId], groupIds: [groupA, groupB], now: "2026-07-12T18:18:00.000Z", refresh: true, writeTargeted: false }).checks?.[0] || {};
        const transactionLedgerA = (0, group_memory_index_1.readJson)((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionFile)(groupA), {});
        (0, group_memory_index_1.writeJsonAtomic)((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionFile)(groupA), {
            ...transactionLedgerA,
            compacted_history: { ...transactionLedgerA.compacted_history, transaction_ids_root: `${transactionLedgerA.compacted_history?.transaction_ids_root || ""}-tampered` },
        });
        const qualityAfterCompactTamper = buildMemoryQualityReport({ checkIds: [qualityId], groupIds: [groupA], now: "2026-07-12T18:18:01.000Z", refresh: true, writeTargeted: false }).checks?.[0] || {};
        const approvalsAfter = approvalFiles.reduce((sum, file) => sum + ((0, group_memory_index_1.readJson)(file, {}).entries || []).length, 0);
        const checks = {
            terminalResolutionHistoryCompactsWithAuditRoot: compactExecutions.every((entry) => entry.status === "resolved")
                && compactDiscovery.transaction_count === 4 && compactDiscovery.compacted_transaction_count === 3
                && compactDiscovery.compacted_history_valid === true && !!compactDiscovery.compacted_history?.transaction_ids_root
                && !!compactDiscovery.compacted_history?.transaction_checksums_root && !!compactDiscovery.compacted_history?.compact_checksum,
            terminalDetailedTransactionEvidenceRemainsFrozenAcrossDiscovery: (0, group_memory_index_1.checksum)(retainedArtifactsBeforeDiscovery, 48) === (0, group_memory_index_1.checksum)(retainedArtifactsAfterDiscovery, 48)
                && compactDiscovery.invalid_transaction_count === 0,
            walFirstDiscoveryRecoversExactTransaction: prepared.every((entry) => entry.status === "interrupted")
                && discoveryB.recovered_now_count === 1 && discoveryB.rows.some((row) => row.transaction.receipt_id === seededB.receipts[0].receipt_id && row.status === "completed"),
            missingReceiptTransactionIsFoundDirectlyFromWal: discoveryB.rows.some((row) => row.resolution_transaction_id === txByReceipt.get(seededB.receipts[3].receipt_id).resolution_transaction_id
                && row.gaps.includes("resolution_transaction_receipt_missing")),
            crossGroupAndChecksumTamperAreNotAutoRecovered: discoveryB.invalid_transaction_count === 3
                && discoveryB.rows.some((row) => row.resolution_transaction_id === crossTx.resolution_transaction_id && row.gaps.includes("resolution_transaction_group_mismatch"))
                && discoveryB.rows.some((row) => row.resolution_transaction_id === tamperedTx.resolution_transaction_id && row.gaps.includes("resolution_transaction_checksum_invalid")),
            invalidTransactionsAreFullyContainedWithoutTasks: discoveryB.contained_invalid_transaction_count === 3 && discoveryB.uncontained_invalid_transaction_count === 0
                && quarantineArtifacts.filter((entry) => entry.status === "quarantined_unproven_resolution_transaction").length === 3
                && workArtifacts.filter((entry) => entry.status === "pending" && entry.should_create_real_task === false).length === 3
                && briefArtifacts.filter((entry) => entry.status === "ready" && entry.should_create_real_task === false).length === 3,
            containmentDoesNotRewriteInvalidWalRows: [...invalidBefore].every(([id, value]) => invalidAfter.get(id) === value),
            repeatedDiscoveryIsIdempotent: discoveryBRepeat.repair_work_item_count === discoveryB.repair_work_item_count
                && discoveryBRepeat.repair_dispatch_brief_count === discoveryB.repair_dispatch_brief_count
                && discoveryBRepeat.contained_invalid_transaction_count === discoveryB.contained_invalid_transaction_count,
            startupBatchCoversMultipleGroups: batch.group_count === 2 && batch.compacted_transaction_count === 3
                && batch.invalid_transaction_count === 3 && batch.contained_invalid_transaction_count === 3,
            schedulerAcceptsContainedInvalidState: scheduler.failedCount === 0
                && scheduler.deliveryCleanupCommitRepairResolutionContainedInvalidTransactionCount === 3
                && scheduler.deliveryCleanupCommitRepairResolutionRecoveredNowCount === 0,
            qualityGateAcceptsHealthyOrContainedAndRejectsCompactTamper: qualityBeforeTamper.id === qualityId && qualityBeforeTamper.status === "ok"
                && Number(qualityBeforeTamper.checked || 0) === 2 && Number(qualityBeforeTamper.passed || 0) === 2
                && qualityAfterCompactTamper.id === qualityId && qualityAfterCompactTamper.status === "fail",
            recoveryAndContainmentCreateNoTasksApprovalsOrDeletion: require("../../core/db").loadTasks().length === tasksBefore
                && approvalsAfter === approvalsBefore && discoveryB.destructive_action_authorized === false && discoveryB.deleted_count === 0
                && scheduler.destructiveActionAuthorized === false && scheduler.deletedCount === 0,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            compact: { retained: compactDiscovery.transaction_count, compacted: compactDiscovery.compacted_transaction_count, history: compactDiscovery.compacted_history },
            discovery: { recovered: discoveryB.recovered_now_count, invalid: discoveryB.invalid_transaction_count, contained: discoveryB.contained_invalid_transaction_count, repairs: discoveryB.repair_work_item_count, briefs: discoveryB.repair_dispatch_brief_count },
            scheduler: { failed: scheduler.failedCount, contained: scheduler.deliveryCleanupCommitRepairResolutionContainedInvalidTransactionCount },
            quality: { before: qualityBeforeTamper.status, afterCompactTamper: qualityAfterCompactTamper.status },
        };
    }
    finally {
        for (const file of [schedulerStateFile, `${schedulerStateFile}.bak`]) {
            try {
                if (fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of cleanupDirs) {
            try {
                if (fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
//# sourceMappingURL=group-memory-maintenance-self-tests.js.map