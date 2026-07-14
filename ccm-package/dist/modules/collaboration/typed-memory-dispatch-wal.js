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
exports.TYPED_MEMORY_DISPATCH_WAL_DIR = void 0;
exports.getTypedMemoryDispatchWalFile = getTypedMemoryDispatchWalFile;
exports.getTypedMemoryDispatchWalScopeDir = getTypedMemoryDispatchWalScopeDir;
exports.readTypedMemoryDispatchWal = readTypedMemoryDispatchWal;
exports.createTypedMemoryDispatchWal = createTypedMemoryDispatchWal;
exports.transitionTypedMemoryDispatchWal = transitionTypedMemoryDispatchWal;
exports.listTypedMemoryDispatchWal = listTypedMemoryDispatchWal;
exports.pruneTypedMemoryDispatchWal = pruneTypedMemoryDispatchWal;
exports.verifyTypedMemoryDispatchWal = verifyTypedMemoryDispatchWal;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
exports.TYPED_MEMORY_DISPATCH_WAL_DIR = path.join(utils_1.CCM_DIR, "group-typed-memory-dispatch-wal");
const WAL_SCHEMA = "ccm-child-typed-memory-dispatch-wal-v1";
const TERMINAL_STATES = new Set(["committed", "cancelled", "expired", "uncertain_after_crash"]);
const LOCK_STALE_MS = 60_000;
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
function cleanPart(value) {
    return String(value || "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 160) || "unknown";
}
function recordChecksum(record) {
    const payload = { ...(record || {}) };
    delete payload.record_checksum;
    delete payload.checksum_valid;
    delete payload.file;
    return checksum(payload);
}
function processAlive(pid) {
    if (!Number.isFinite(pid) || pid <= 0)
        return false;
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
function writeJsonAtomic(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.${crypto.randomBytes(3).toString("hex")}.tmp`;
    const fd = fs.openSync(temp, "w");
    try {
        fs.writeFileSync(fd, JSON.stringify(value, null, 2), "utf-8");
        fs.fsyncSync(fd);
    }
    finally {
        fs.closeSync(fd);
    }
    fs.renameSync(temp, file);
}
function acquireLock(file) {
    const lockFile = `${file}.lock`;
    fs.mkdirSync(path.dirname(lockFile), { recursive: true });
    for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
            const fd = fs.openSync(lockFile, "wx");
            fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, hostname: os.hostname(), acquired_at: new Date().toISOString() }), "utf-8");
            fs.fsyncSync(fd);
            return { fd, lockFile };
        }
        catch (error) {
            if (error?.code !== "EEXIST")
                throw error;
            let stale = false;
            try {
                const lock = JSON.parse(fs.readFileSync(lockFile, "utf-8"));
                const age = Date.now() - fs.statSync(lockFile).mtimeMs;
                stale = (String(lock.hostname || "") === os.hostname() && !processAlive(Number(lock.pid || 0))) || age > LOCK_STALE_MS;
            }
            catch {
                stale = true;
            }
            if (!stale)
                throw new Error("typed memory dispatch WAL is locked by another process");
            try {
                fs.unlinkSync(lockFile);
            }
            catch { }
        }
    }
    throw new Error("typed memory dispatch WAL lock contention");
}
function releaseLock(lock) {
    try {
        fs.closeSync(lock.fd);
    }
    catch { }
    try {
        fs.unlinkSync(lock.lockFile);
    }
    catch { }
}
function getTypedMemoryDispatchWalFile(groupId, groupSessionId, ticketId) {
    return path.join(getTypedMemoryDispatchWalScopeDir(groupId, groupSessionId), `${cleanPart(ticketId)}.json`);
}
function getTypedMemoryDispatchWalScopeDir(groupId, groupSessionId) {
    const scopeId = `${cleanPart(groupId)}--${cleanPart(groupSessionId)}`;
    return path.join(exports.TYPED_MEMORY_DISPATCH_WAL_DIR, scopeId);
}
function readTypedMemoryDispatchWal(file) {
    try {
        const record = JSON.parse(fs.readFileSync(file, "utf-8"));
        const checksumValid = String(record.record_checksum || "") === recordChecksum(record);
        return { ...record, checksum_valid: checksumValid, file };
    }
    catch {
        return null;
    }
}
function mutateWal(file, expectedRevision, mutate) {
    const lock = acquireLock(file);
    try {
        const current = fs.existsSync(file) ? readTypedMemoryDispatchWal(file) : null;
        if (current && current.checksum_valid !== true)
            throw new Error("typed memory dispatch WAL checksum mismatch");
        if (expectedRevision !== null && Number(current?.revision || 0) !== expectedRevision)
            throw new Error("typed memory dispatch WAL CAS revision mismatch");
        const nextPayload = mutate(current);
        const next = {
            ...nextPayload,
            schema: WAL_SCHEMA,
            version: 1,
            revision: Number(current?.revision || 0) + 1,
            updated_at: new Date().toISOString(),
        };
        next.record_checksum = recordChecksum(next);
        writeJsonAtomic(file, next);
        return { ...next, checksum_valid: true, file };
    }
    finally {
        releaseLock(lock);
    }
}
function createTypedMemoryDispatchWal(input = {}) {
    const ticket = input.dispatchTicket || input.dispatch_ticket || null;
    const lease = input.deliveryLease || input.delivery_lease || input.lease || null;
    const capsule = input.deliveryCapsule || input.delivery_capsule || input.capsule || null;
    const packet = input.workerContextPacket || input.worker_context_packet || null;
    const memoryBundle = input.memoryBundle || input.memory_bundle || null;
    const renderedPrompt = String(input.renderedPrompt || input.rendered_prompt || "");
    const snapshotRenderedPrompt = String(input.snapshotRenderedPrompt || input.snapshot_rendered_prompt || renderedPrompt);
    const capacityRevalidationProof = input.capacityRevalidationProof || input.capacity_revalidation_proof || null;
    if (!ticket?.ticket_id)
        return { required: false, created: false, reason: "dispatch_ticket_not_required" };
    const groupId = String(lease?.group_id || memoryBundle?.group_id || "");
    const groupSessionId = String(lease?.group_session_id || memoryBundle?.group_session_id || "");
    if (!groupId || !groupSessionId.startsWith("gcs_"))
        throw new Error("typed memory dispatch WAL requires groupId--gcs_* identity");
    const file = getTypedMemoryDispatchWalFile(groupId, groupSessionId, ticket.ticket_id);
    const existing = readTypedMemoryDispatchWal(file);
    if (existing?.checksum_valid === true) {
        if (existing.ticket_checksum !== ticket.ticket_checksum || existing.prompt_checksum !== ticket.prompt_checksum) {
            throw new Error("typed memory dispatch WAL ticket identity collision");
        }
        return { required: true, created: false, idempotent: true, record: existing };
    }
    const now = new Date().toISOString();
    const record = mutateWal(file, 0, () => ({
        state: "admitted",
        ticket_id: String(ticket.ticket_id || ""),
        ticket_checksum: String(ticket.ticket_checksum || ""),
        lease_id: String(ticket.lease_id || lease?.lease_id || ""),
        lease_checksum: String(ticket.lease_checksum || lease?.lease_checksum || ""),
        capsule_checksum: String(ticket.capsule_checksum || capsule?.capsule_checksum || ""),
        group_id: groupId,
        group_session_id: groupSessionId,
        project: String(lease?.target_project || memoryBundle?.target_project || ""),
        task_id: String(lease?.task_id || ""),
        task_agent_session_id: String(lease?.task_agent_session_id || ""),
        compact_epoch: String(ticket.compact_epoch || lease?.compact_epoch || "precompact"),
        attempt_sequence: Number(ticket.attempt_sequence || lease?.attempt_sequence || 0),
        worker_context_packet_id: String(ticket.worker_context_packet_id || packet?.packet_id || ""),
        prompt_checksum: String(ticket.prompt_checksum || ""),
        platform_dispatch_id: String(input.platformDispatchId || input.platform_dispatch_id || `pdi_${crypto.randomBytes(12).toString("hex")}`),
        execution_id: String(input.executionId || input.execution_id || ""),
        capacity_revalidation_proof_checksum: String(capacityRevalidationProof?.proof_checksum || ""),
        admitted_at: String(ticket.admitted_at || now),
        dispatch_not_after: String(ticket.dispatch_not_after || ""),
        dispatch_started_at: "",
        runner_returned_at: "",
        runner_request_id: "",
        delivery_receipt_id: "",
        delivery_receipt_checksum: "",
        committed_at: "",
        terminal_reason: "",
        recovery_count: 0,
        created_at: now,
        recovery_payload: {
            memory_bundle: memoryBundle,
            worker_context_packet: packet,
            rendered_prompt: renderedPrompt,
            snapshot_rendered_prompt: snapshotRenderedPrompt,
            dispatch_ticket: ticket,
            delivery_lease: lease,
            delivery_capsule: capsule,
            capacity_revalidation_proof: capacityRevalidationProof,
        },
    }));
    return { required: true, created: true, record };
}
function transitionTypedMemoryDispatchWal(recordOrFile, nextState, evidence = {}) {
    const file = typeof recordOrFile === "string" ? recordOrFile : String(recordOrFile?.file || "");
    if (!file)
        return null;
    const expectedRevision = typeof recordOrFile === "object" ? Number(recordOrFile.revision || 0) : null;
    return mutateWal(file, expectedRevision, current => {
        if (!current)
            throw new Error("typed memory dispatch WAL record missing");
        const state = String(current.state || "");
        if (state === nextState)
            return { ...current, ...evidence };
        if (TERMINAL_STATES.has(state))
            throw new Error(`typed memory dispatch WAL is terminal: ${state}`);
        const allowed = {
            admitted: ["dispatch_started", "cancelled", "expired"],
            dispatch_started: ["runner_returned", "cancelled", "uncertain_after_crash"],
            runner_returned: ["committed", "cancelled", "uncertain_after_crash"],
        };
        if (!(allowed[state] || []).includes(nextState))
            throw new Error(`invalid typed memory dispatch WAL transition: ${state} -> ${nextState}`);
        const now = new Date().toISOString();
        return {
            ...current,
            ...evidence,
            state: nextState,
            dispatch_started_at: nextState === "dispatch_started" ? String(evidence.dispatch_started_at || now) : current.dispatch_started_at,
            runner_returned_at: nextState === "runner_returned" ? String(evidence.runner_returned_at || now) : current.runner_returned_at,
            committed_at: nextState === "committed" ? String(evidence.committed_at || now) : current.committed_at,
            terminal_reason: TERMINAL_STATES.has(nextState) ? String(evidence.terminal_reason || evidence.reason || nextState) : current.terminal_reason,
        };
    });
}
function listTypedMemoryDispatchWal() {
    if (!fs.existsSync(exports.TYPED_MEMORY_DISPATCH_WAL_DIR))
        return [];
    const files = [];
    for (const scope of fs.readdirSync(exports.TYPED_MEMORY_DISPATCH_WAL_DIR, { withFileTypes: true })) {
        if (!scope.isDirectory())
            continue;
        const dir = path.join(exports.TYPED_MEMORY_DISPATCH_WAL_DIR, scope.name);
        let entries = [];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const entry of entries) {
            if (entry.isFile() && entry.name.endsWith(".json") && !entry.name.endsWith(".lock"))
                files.push(path.join(dir, entry.name));
        }
    }
    return files.map(readTypedMemoryDispatchWal).filter(Boolean);
}
function pruneTypedMemoryDispatchWal(options = {}) {
    const now = Date.parse(String(options.now || "")) || Date.now();
    const retentionMs = Math.max(86_400_000, Number(options.retentionMs || options.retention_ms || 14 * 86_400_000));
    const deleted = [];
    for (const record of listTypedMemoryDispatchWal()) {
        if (!TERMINAL_STATES.has(String(record.state || "")))
            continue;
        const at = Date.parse(String(record.committed_at || record.updated_at || ""));
        if (Number.isFinite(at) && now - at >= retentionMs) {
            try {
                fs.unlinkSync(record.file);
                deleted.push(record.file);
            }
            catch { }
        }
    }
    return { deleted_count: deleted.length, deleted };
}
function verifyTypedMemoryDispatchWal(record) {
    const issues = [];
    if (record?.schema !== WAL_SCHEMA)
        issues.push("unsupported_schema");
    if (String(record?.record_checksum || "") !== recordChecksum(record))
        issues.push("record_checksum_mismatch");
    if (!String(record?.group_session_id || "").startsWith("gcs_"))
        issues.push("group_session_not_gcs");
    if (!String(record?.task_agent_session_id || "").startsWith("tas_"))
        issues.push("task_agent_session_not_tas");
    if (String(record?.state || "") !== "committed" && (!record?.recovery_payload?.dispatch_ticket || !record?.recovery_payload?.worker_context_packet))
        issues.push("recovery_payload_missing");
    return { valid: issues.length === 0, issues };
}
//# sourceMappingURL=typed-memory-dispatch-wal.js.map