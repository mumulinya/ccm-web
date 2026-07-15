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
exports.GROUP_COMPACT_HEAD_DIR = exports.GROUP_COMPACT_HEAD_SCHEMA = void 0;
exports.getGroupCompactHeadFile = getGroupCompactHeadFile;
exports.verifyGroupCompactHead = verifyGroupCompactHead;
exports.readGroupCompactHead = readGroupCompactHead;
exports.commitGroupCompactHead = commitGroupCompactHead;
exports.reconcileGroupCompactHeadFromMemory = reconcileGroupCompactHeadFromMemory;
exports.validateGroupCompactHeadBinding = validateGroupCompactHeadBinding;
exports.deleteGroupCompactHead = deleteGroupCompactHead;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../../core/atomic-json-file");
const utils_1 = require("../../core/utils");
const group_memory_compaction_1 = require("./group-memory-compaction");
const group_memory_boundary_journal_1 = require("./group-memory-boundary-journal");
exports.GROUP_COMPACT_HEAD_SCHEMA = "ccm-group-compact-head-v1";
exports.GROUP_COMPACT_HEAD_DIR = path.join(utils_1.CCM_DIR, "group-compact-heads");
function canonical(value) {
    if (Array.isArray(value))
        return value.map(canonical);
    if (!value || typeof value !== "object")
        return value;
    return Object.keys(value).sort().reduce((result, key) => {
        if (value[key] !== undefined)
            result[key] = canonical(value[key]);
        return result;
    }, {});
}
function checksum(value, length = 64) {
    return crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex").slice(0, length);
}
function clean(value) {
    return String(value || "").trim().replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 160) || "unknown";
}
function getGroupCompactHeadFile(groupId, groupSessionId) {
    return path.join(exports.GROUP_COMPACT_HEAD_DIR, `${clean(groupId)}--${clean(groupSessionId)}.json`);
}
function headChecksum(head) {
    const payload = { ...(head || {}) };
    delete payload.head_checksum;
    delete payload.checksum_valid;
    delete payload.file;
    delete payload.recovered_from_backup;
    return checksum(payload);
}
function verifyGroupCompactHead(head, expected = {}) {
    const issues = [];
    if (head?.schema !== exports.GROUP_COMPACT_HEAD_SCHEMA || Number(head?.version || 0) !== 1)
        issues.push("compact_head_schema_invalid");
    if (!String(head?.group_id || ""))
        issues.push("compact_head_group_missing");
    if (!String(head?.group_session_id || "").startsWith("gcs_"))
        issues.push("compact_head_group_session_invalid");
    if (!String(head?.boundary_id || ""))
        issues.push("compact_head_boundary_missing");
    if (!String(head?.compact_epoch || "").startsWith("cmp_"))
        issues.push("compact_head_epoch_invalid");
    if (!String(head?.compact_transaction_receipt_checksum || ""))
        issues.push("compact_head_receipt_missing");
    if (Number(head?.generation || 0) < 1)
        issues.push("compact_head_generation_invalid");
    if (String(head?.head_checksum || "") !== headChecksum(head))
        issues.push("compact_head_checksum_invalid");
    if (expected.groupId && String(head?.group_id || "") !== String(expected.groupId))
        issues.push("compact_head_group_mismatch");
    if (expected.groupSessionId && String(head?.group_session_id || "") !== String(expected.groupSessionId))
        issues.push("compact_head_group_session_mismatch");
    return { valid: issues.length === 0, issues };
}
function readGroupCompactHead(groupId, groupSessionId) {
    const file = getGroupCompactHeadFile(groupId, groupSessionId);
    for (const candidate of [file, `${file}.bak`]) {
        try {
            if (!fs.existsSync(candidate))
                continue;
            const head = JSON.parse(fs.readFileSync(candidate, "utf-8"));
            const verification = verifyGroupCompactHead(head, { groupId, groupSessionId });
            if (verification.valid)
                return { ...head, checksum_valid: true, file, recovered_from_backup: candidate !== file };
        }
        catch { }
    }
    return null;
}
function commitGroupCompactHead(input = {}) {
    const receipt = input.compactTransactionReceipt || input.compact_transaction_receipt || input.receipt || {};
    const groupId = String(input.groupId || input.group_id || receipt.group_id || "").trim();
    const groupSessionId = String(input.groupSessionId || input.group_session_id || receipt.group_session_id || "").trim();
    if (!groupId || !groupSessionId.startsWith("gcs_"))
        throw new Error("compact head requires groupId + gcs_* identity");
    if (String(receipt.group_id || "") !== groupId || String(receipt.group_session_id || "") !== groupSessionId)
        throw new Error("compact head receipt identity mismatch");
    const receiptChecksum = String(receipt.receipt_checksum || "").trim();
    const compactEpoch = String(receipt.compact_epoch || "").trim();
    const boundaryId = String(receipt.boundary_id || "").trim();
    if (!receiptChecksum || !compactEpoch.startsWith("cmp_") || !boundaryId)
        throw new Error("compact head receipt is incomplete");
    const file = getGroupCompactHeadFile(groupId, groupSessionId);
    const receiptVerification = (0, group_memory_compaction_1.verifyGroupCompactTransactionReceipt)(receipt, { groupId, groupSessionId, boundaryId, compactEpoch });
    if (!receiptVerification.valid)
        throw new Error(`compact head receipt invalid: ${receiptVerification.issues.join(",")}`);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const previous = readGroupCompactHead(groupId, groupSessionId);
        if (previous?.compact_transaction_receipt_checksum === receiptChecksum)
            return { committed: false, idempotent: true, head: previous, file: previous.file };
        const generation = Number(previous?.generation || 0) + 1;
        const committedAt = String(input.committedAt || input.committed_at || receipt.committed_at || new Date().toISOString());
        const payload = {
            schema: exports.GROUP_COMPACT_HEAD_SCHEMA,
            version: 1,
            head_id: `gch_${checksum([groupId, groupSessionId, generation, receiptChecksum], 24)}`,
            group_id: groupId,
            group_session_id: groupSessionId,
            generation,
            boundary_id: boundaryId,
            compact_epoch: compactEpoch,
            compact_transaction_receipt_id: String(receipt.receipt_id || ""),
            compact_transaction_receipt_checksum: receiptChecksum,
            cleanup_audit_checksum: String(receipt.cleanup_audit_checksum || ""),
            summary_checksum: String(receipt.summary_checksum || ""),
            previous_head_checksum: String(previous?.head_checksum || ""),
            committed_at: committedAt,
        };
        const head = { ...payload, head_checksum: headChecksum(payload) };
        (0, atomic_json_file_1.writeJsonAtomic)(file, head);
        return { committed: true, idempotent: false, head: { ...head, checksum_valid: true, file }, file };
    });
}
function reconcileGroupCompactHeadFromMemory(input = {}) {
    const memory = input.memory || {};
    const groupId = String(input.groupId || input.group_id || memory.groupId || "").trim();
    const groupSessionId = String(input.groupSessionId || input.group_session_id || memory.groupSessionId || "").trim();
    const currentHead = groupId && groupSessionId.startsWith("gcs_") ? readGroupCompactHead(groupId, groupSessionId) : null;
    const receipt = memory?.compaction?.compactTransactionReceipt
        || memory?.compactBoundary?.compactTransactionReceipt
        || memory?.compactBoundary?.post_compact_restore?.compactTransactionReceipt
        || memory?.messageCompression?.compactTransactionReceipt
        || null;
    const boundaryId = String(memory?.compactBoundary?.id || receipt?.boundary_id || "");
    const cleanupAudit = memory?.compaction?.postCompactCleanupAudit
        || memory?.compactBoundary?.post_compact_restore?.cleanupAudit
        || memory?.messageCompression?.postCompactCleanupAudit
        || null;
    const receiptRequiresCleanupBinding = Number(receipt?.version || 0) >= 3;
    const cleanupAuditVerification = receiptRequiresCleanupBinding
        ? (0, group_memory_compaction_1.verifyGroupPostCompactCleanupAudit)(cleanupAudit, { groupId, groupSessionId, boundaryId })
        : { valid: true, issues: [] };
    const auditBase = {
        schema: "ccm-group-compact-head-restart-recovery-v1",
        version: 1,
        groupId,
        groupSessionId,
        boundaryId,
        receiptId: String(receipt?.receipt_id || ""),
        receiptChecksum: String(receipt?.receipt_checksum || ""),
        priorHeadId: String(currentHead?.head_id || ""),
        priorHeadGeneration: Number(currentHead?.generation || 0),
        priorHeadBoundaryId: String(currentHead?.boundary_id || ""),
    };
    if (!groupId || !groupSessionId.startsWith("gcs_"))
        return { ...auditBase, status: "rejected", recovered: false, issues: ["exact_group_session_required"] };
    if (!receipt || !boundaryId)
        return { ...auditBase, status: "not_applicable", recovered: false, issues: ["durable_compact_receipt_missing"] };
    const receiptVerification = (0, group_memory_compaction_1.verifyGroupCompactTransactionReceipt)(receipt, {
        groupId,
        groupSessionId,
        boundaryId,
        summaryChecksum: memory?.compaction?.summaryChecksum || memory?.compactBoundary?.summaryChecksum || "",
        cleanupAuditChecksum: receiptRequiresCleanupBinding ? String(cleanupAudit?.audit_checksum || "") : "",
    });
    const journal = (0, group_memory_boundary_journal_1.readGroupMemoryBoundaryJournal)(groupId, groupSessionId, input);
    const issues = [...receiptVerification.issues, ...cleanupAuditVerification.issues];
    if (!journal.valid)
        issues.push("boundary_journal_invalid");
    if (!journal.latestCommit)
        issues.push("boundary_commit_missing");
    if (journal.latestCommit && String(journal.latestCommit.boundaryId || "") !== boundaryId)
        issues.push("boundary_journal_head_mismatch");
    if (journal.latestCommit && String(journal.latestCommit.summaryChecksum || "") !== String(receipt.summary_checksum || ""))
        issues.push("boundary_journal_summary_mismatch");
    if (issues.length) {
        return {
            ...auditBase,
            status: "fail_closed",
            recovered: false,
            issues: [...new Set(issues)],
            journal: { status: journal.status, valid: journal.valid, commitCount: journal.commitCount, file: journal.file },
        };
    }
    if (currentHead
        && String(currentHead.boundary_id || "") === boundaryId
        && String(currentHead.compact_transaction_receipt_checksum || "") === String(receipt.receipt_checksum || "")) {
        return {
            ...auditBase,
            status: "current",
            recovered: false,
            idempotent: true,
            issues: [],
            head: currentHead,
            journal: { status: journal.status, valid: journal.valid, commitCount: journal.commitCount, file: journal.file },
        };
    }
    const committed = commitGroupCompactHead({ groupId, groupSessionId, compactTransactionReceipt: receipt });
    return {
        ...auditBase,
        status: "recovered",
        recovered: true,
        idempotent: committed.idempotent === true,
        issues: [],
        head: committed.head,
        journal: { status: journal.status, valid: journal.valid, commitCount: journal.commitCount, file: journal.file },
        recoveredAt: new Date().toISOString(),
    };
}
function validateGroupCompactHeadBinding(input = {}) {
    const groupId = String(input.groupId || input.group_id || "").trim();
    const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
    const compactEpoch = String(input.compactEpoch || input.compact_epoch || "precompact").trim() || "precompact";
    const receiptChecksum = String(input.compactTransactionReceiptChecksum || input.compact_transaction_receipt_checksum || "").trim();
    const boundaryId = String(input.compactTransactionBoundaryId || input.compact_transaction_boundary_id || "").trim();
    const generation = Math.max(0, Number(input.compactHeadGeneration || input.compact_head_generation || 0));
    const headId = String(input.compactHeadId || input.compact_head_id || "").trim();
    const headChecksumValue = String(input.compactHeadChecksum || input.compact_head_checksum || "").trim();
    const head = readGroupCompactHead(groupId, groupSessionId);
    const issues = [];
    if (!head) {
        if (compactEpoch !== "precompact" || receiptChecksum || boundaryId || generation > 0 || headId || headChecksumValue)
            issues.push("compact_head_missing_for_postcompact_context");
    }
    else {
        if (compactEpoch !== String(head.compact_epoch || ""))
            issues.push("compact_head_epoch_stale");
        if (receiptChecksum !== String(head.compact_transaction_receipt_checksum || ""))
            issues.push("compact_head_receipt_stale");
        if (boundaryId !== String(head.boundary_id || ""))
            issues.push("compact_head_boundary_stale");
        if (generation !== Number(head.generation || 0))
            issues.push("compact_head_generation_stale");
        if (headId !== String(head.head_id || ""))
            issues.push("compact_head_id_stale");
        if (headChecksumValue !== String(head.head_checksum || ""))
            issues.push("compact_head_checksum_stale");
    }
    return {
        schema: "ccm-group-compact-head-binding-validation-v1",
        valid: issues.length === 0,
        status: issues.length ? "stale" : head ? "current_postcompact" : "current_precompact",
        issues,
        expected: head ? {
            headId: head.head_id,
            generation: Number(head.generation || 0),
            compactEpoch: String(head.compact_epoch || ""),
            boundaryId: String(head.boundary_id || ""),
            compactTransactionReceiptChecksum: String(head.compact_transaction_receipt_checksum || ""),
            headChecksum: String(head.head_checksum || ""),
        } : {
            headId: "",
            generation: 0,
            compactEpoch: "precompact",
            boundaryId: "",
            compactTransactionReceiptChecksum: "",
            headChecksum: "",
        },
    };
}
function deleteGroupCompactHead(groupId, groupSessionId) {
    const file = getGroupCompactHeadFile(groupId, groupSessionId);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        let deleted = 0;
        for (const candidate of [file, `${file}.bak`]) {
            try {
                if (fs.existsSync(candidate)) {
                    fs.unlinkSync(candidate);
                    deleted += 1;
                }
            }
            catch { }
        }
        return { deleted, groupId, groupSessionId, file };
    });
}
//# sourceMappingURL=group-compact-head.js.map