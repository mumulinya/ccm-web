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
exports.GROUP_SESSION_LIFECYCLE_HEAD_DIR = exports.GROUP_SESSION_LIFECYCLE_HEAD_SCHEMA = void 0;
exports.getGroupSessionLifecycleHeadFile = getGroupSessionLifecycleHeadFile;
exports.verifyGroupSessionLifecycleHead = verifyGroupSessionLifecycleHead;
exports.readGroupSessionLifecycleHead = readGroupSessionLifecycleHead;
exports.ensureGroupSessionLifecycleHead = ensureGroupSessionLifecycleHead;
exports.transitionGroupSessionLifecycleHead = transitionGroupSessionLifecycleHead;
exports.validateGroupSessionLifecycleBinding = validateGroupSessionLifecycleBinding;
exports.normalizeGroupSessionLifecycleRuntimeFence = normalizeGroupSessionLifecycleRuntimeFence;
exports.validateGroupSessionLifecycleRuntimeFence = validateGroupSessionLifecycleRuntimeFence;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../../core/atomic-json-file");
const utils_1 = require("../../core/utils");
exports.GROUP_SESSION_LIFECYCLE_HEAD_SCHEMA = "ccm-group-session-lifecycle-head-v1";
exports.GROUP_SESSION_LIFECYCLE_HEAD_DIR = path.join(utils_1.CCM_DIR, "group-session-lifecycle-heads");
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
function getGroupSessionLifecycleHeadFile(groupId, groupSessionId) {
    return path.join(exports.GROUP_SESSION_LIFECYCLE_HEAD_DIR, `${clean(groupId)}--${clean(groupSessionId)}.json`);
}
function lifecycleHeadChecksum(head) {
    const payload = { ...(head || {}) };
    delete payload.head_checksum;
    delete payload.checksum_valid;
    delete payload.file;
    return checksum(payload);
}
function verifyGroupSessionLifecycleHead(head, expected = {}) {
    const issues = [];
    if (head?.schema !== exports.GROUP_SESSION_LIFECYCLE_HEAD_SCHEMA || Number(head?.version || 0) !== 1)
        issues.push("session_lifecycle_head_schema_invalid");
    if (!String(head?.group_id || ""))
        issues.push("session_lifecycle_group_missing");
    if (!String(head?.group_session_id || "").startsWith("gcs_"))
        issues.push("session_lifecycle_group_session_invalid");
    if (!["active", "archived", "deleted"].includes(String(head?.status || "")))
        issues.push("session_lifecycle_status_invalid");
    if (Number(head?.generation || 0) < 1)
        issues.push("session_lifecycle_generation_invalid");
    if (!String(head?.lifecycle_head_id || ""))
        issues.push("session_lifecycle_head_id_missing");
    if (String(head?.head_checksum || "") !== lifecycleHeadChecksum(head))
        issues.push("session_lifecycle_head_checksum_invalid");
    if (expected.groupId && String(head?.group_id || "") !== String(expected.groupId))
        issues.push("session_lifecycle_group_mismatch");
    if (expected.groupSessionId && String(head?.group_session_id || "") !== String(expected.groupSessionId))
        issues.push("session_lifecycle_group_session_mismatch");
    return { valid: issues.length === 0, issues };
}
function readGroupSessionLifecycleHead(groupId, groupSessionId) {
    const file = getGroupSessionLifecycleHeadFile(groupId, groupSessionId);
    for (const candidate of [file, `${file}.bak`]) {
        try {
            if (!fs.existsSync(candidate))
                continue;
            const head = JSON.parse(fs.readFileSync(candidate, "utf-8"));
            const verification = verifyGroupSessionLifecycleHead(head, { groupId, groupSessionId });
            if (verification.valid)
                return { ...head, checksum_valid: true, file, recovered_from_backup: candidate !== file };
        }
        catch { }
    }
    return null;
}
function buildLifecycleHead(groupId, groupSessionId, status, previous, input = {}) {
    const generation = Number(previous?.generation || 0) + 1;
    const transitionedAt = String(input.transitionedAt || input.transitioned_at || new Date().toISOString());
    const createdAt = String(previous?.created_at || input.createdAt || input.created_at || transitionedAt);
    const payload = {
        schema: exports.GROUP_SESSION_LIFECYCLE_HEAD_SCHEMA,
        version: 1,
        lifecycle_head_id: `gslh_${checksum([groupId, groupSessionId, generation, status, transitionedAt], 24)}`,
        group_id: groupId,
        group_session_id: groupSessionId,
        generation,
        status,
        reason: String(input.reason || ""),
        previous_status: String(previous?.status || ""),
        previous_head_checksum: String(previous?.head_checksum || ""),
        created_at: createdAt,
        transitioned_at: transitionedAt,
    };
    return { ...payload, head_checksum: lifecycleHeadChecksum(payload) };
}
function ensureGroupSessionLifecycleHead(groupId, groupSessionId, input = {}) {
    const id = String(groupId || "").trim();
    const sessionId = String(groupSessionId || "").trim();
    if (!id || !sessionId.startsWith("gcs_"))
        throw new Error("session lifecycle head requires groupId + gcs_* identity");
    const file = getGroupSessionLifecycleHeadFile(id, sessionId);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const previous = readGroupSessionLifecycleHead(id, sessionId);
        if (previous)
            return { committed: false, idempotent: true, head: previous, file };
        if (fs.existsSync(file) || fs.existsSync(`${file}.bak`))
            throw new Error("session lifecycle head exists but failed integrity validation");
        const head = buildLifecycleHead(id, sessionId, "active", null, { ...input, reason: input.reason || "session_created_or_adopted" });
        (0, atomic_json_file_1.writeJsonAtomic)(file, head);
        return { committed: true, idempotent: false, head: { ...head, checksum_valid: true, file }, file };
    });
}
function transitionGroupSessionLifecycleHead(input = {}) {
    const groupId = String(input.groupId || input.group_id || "").trim();
    const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
    const status = String(input.status || "").trim();
    if (!groupId || !groupSessionId.startsWith("gcs_"))
        throw new Error("session lifecycle transition requires groupId + gcs_* identity");
    if (!["active", "archived", "deleted"].includes(status))
        throw new Error(`unsupported session lifecycle status: ${status || "missing"}`);
    const file = getGroupSessionLifecycleHeadFile(groupId, groupSessionId);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const previous = readGroupSessionLifecycleHead(groupId, groupSessionId);
        if (!previous && (fs.existsSync(file) || fs.existsSync(`${file}.bak`)))
            throw new Error("session lifecycle head exists but failed integrity validation");
        if (previous?.status === status)
            return { committed: false, idempotent: true, head: previous, file };
        if (previous?.status === "deleted" && status !== "deleted")
            throw new Error("deleted group session lifecycle tombstone cannot be reactivated");
        const head = buildLifecycleHead(groupId, groupSessionId, status, previous, input);
        (0, atomic_json_file_1.writeJsonAtomic)(file, head);
        return { committed: true, idempotent: false, head: { ...head, checksum_valid: true, file }, file };
    });
}
function validateGroupSessionLifecycleBinding(input = {}) {
    const groupId = String(input.groupId || input.group_id || "").trim();
    const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
    const generation = Math.max(0, Number(input.lifecycleGeneration || input.lifecycle_generation || 0));
    const lifecycleHeadId = String(input.lifecycleHeadId || input.lifecycle_head_id || "").trim();
    const lifecycleHeadChecksum = String(input.lifecycleHeadChecksum || input.lifecycle_head_checksum || "").trim();
    const lifecycleStatus = String(input.lifecycleStatus || input.lifecycle_status || "active").trim() || "active";
    const head = readGroupSessionLifecycleHead(groupId, groupSessionId);
    const issues = [];
    if (!head) {
        issues.push("session_lifecycle_head_missing");
    }
    else {
        if (String(head.status || "") !== "active")
            issues.push(`session_lifecycle_${String(head.status || "unknown")}`);
        if (lifecycleStatus !== String(head.status || ""))
            issues.push("session_lifecycle_status_stale");
        if (generation !== Number(head.generation || 0))
            issues.push("session_lifecycle_generation_stale");
        if (lifecycleHeadId !== String(head.lifecycle_head_id || ""))
            issues.push("session_lifecycle_head_id_stale");
        if (lifecycleHeadChecksum !== String(head.head_checksum || ""))
            issues.push("session_lifecycle_head_checksum_stale");
    }
    return {
        schema: "ccm-group-session-lifecycle-binding-validation-v1",
        valid: issues.length === 0,
        status: issues.length ? String(head?.status || "missing") : "current_active",
        issues,
        expected: head ? {
            lifecycleHeadId: String(head.lifecycle_head_id || ""),
            generation: Number(head.generation || 0),
            status: String(head.status || ""),
            lifecycleHeadChecksum: String(head.head_checksum || ""),
        } : null,
    };
}
function normalizeGroupSessionLifecycleRuntimeFence(input = {}) {
    const source = input.sessionLifecycleFence
        || input.session_lifecycle_fence
        || input.groupSessionMemoryBinding
        || input.group_session_memory_binding
        || input;
    const groupId = String(source.groupId || source.group_id || input.groupId || input.group_id || "").trim();
    const groupSessionId = String(source.groupSessionId || source.group_session_id || input.groupSessionId || input.group_session_id || "").trim();
    const required = source.required === true
        || source.sessionLifecycleFenceRequired === true
        || source.session_lifecycle_fence_required === true
        || groupSessionId.startsWith("gcs_");
    return {
        schema: "ccm-group-session-lifecycle-runtime-fence-v1",
        required,
        groupId,
        groupSessionId,
        lifecycleGeneration: Math.max(0, Number(source.lifecycleGeneration
            || source.lifecycle_generation
            || source.sessionLifecycleGeneration
            || source.session_lifecycle_generation
            || 0)),
        lifecycleStatus: String(source.lifecycleStatus
            || source.lifecycle_status
            || source.sessionLifecycleStatus
            || source.session_lifecycle_status
            || "").trim(),
        lifecycleHeadId: String(source.lifecycleHeadId
            || source.lifecycle_head_id
            || source.sessionLifecycleHeadId
            || source.session_lifecycle_head_id
            || "").trim(),
        lifecycleHeadChecksum: String(source.lifecycleHeadChecksum
            || source.lifecycle_head_checksum
            || source.sessionLifecycleHeadChecksum
            || source.session_lifecycle_head_checksum
            || "").trim(),
        memoryContextSnapshotId: String(source.memoryContextSnapshotId || source.memory_context_snapshot_id || "").trim(),
        memoryContextSnapshotChecksum: String(source.memoryContextSnapshotChecksum || source.memory_context_snapshot_checksum || "").trim(),
    };
}
function validateGroupSessionLifecycleRuntimeFence(input = {}) {
    const fence = normalizeGroupSessionLifecycleRuntimeFence(input);
    if (!fence.required) {
        return {
            schema: "ccm-group-session-lifecycle-runtime-fence-validation-v1",
            valid: true,
            required: false,
            status: "not_required",
            issues: [],
            fence,
            expected: null,
        };
    }
    const issues = [];
    if (!fence.groupId)
        issues.push("session_lifecycle_runtime_group_missing");
    if (!fence.groupSessionId.startsWith("gcs_"))
        issues.push("session_lifecycle_runtime_group_session_invalid");
    if (fence.lifecycleGeneration < 1)
        issues.push("session_lifecycle_runtime_generation_missing");
    if (!fence.lifecycleStatus)
        issues.push("session_lifecycle_runtime_status_missing");
    if (!fence.lifecycleHeadId)
        issues.push("session_lifecycle_runtime_head_id_missing");
    if (!fence.lifecycleHeadChecksum)
        issues.push("session_lifecycle_runtime_head_checksum_missing");
    const bindingValidation = issues.length ? null : validateGroupSessionLifecycleBinding(fence);
    if (bindingValidation && !bindingValidation.valid)
        issues.push(...bindingValidation.issues);
    return {
        schema: "ccm-group-session-lifecycle-runtime-fence-validation-v1",
        valid: issues.length === 0,
        required: true,
        status: issues.length ? String(bindingValidation?.status || "invalid") : "current_active",
        issues: Array.from(new Set(issues)),
        fence,
        expected: bindingValidation?.expected || null,
    };
}
//# sourceMappingURL=group-session-lifecycle-head.js.map