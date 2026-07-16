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
exports.DIRECT_AGENT_DISPATCH_TRANSCRIPT_SCHEMA = exports.DIRECT_AGENT_DISPATCH_RESULT_SCHEMA = exports.DIRECT_AGENT_DISPATCH_REQUEST_SCHEMA = void 0;
exports.readDirectAgentDispatchTranscript = readDirectAgentDispatchTranscript;
exports.appendDirectAgentDispatchTranscript = appendDirectAgentDispatchTranscript;
exports.createDirectAgentDispatchRequest = createDirectAgentDispatchRequest;
exports.markDirectAgentDispatchStarted = markDirectAgentDispatchStarted;
exports.completeDirectAgentDispatch = completeDirectAgentDispatch;
exports.readDirectAgentDispatchRequest = readDirectAgentDispatchRequest;
exports.readDirectAgentDispatchResult = readDirectAgentDispatchResult;
exports.validateDirectAgentDispatchPair = validateDirectAgentDispatchPair;
exports.listDirectAgentDispatchSpool = listDirectAgentDispatchSpool;
exports.cancelPreparedDirectAgentDispatch = cancelPreparedDirectAgentDispatch;
exports.pruneDirectAgentDispatchTerminalPair = pruneDirectAgentDispatchTerminalPair;
exports.pruneDirectAgentDispatchSpool = pruneDirectAgentDispatchSpool;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const provider_memory_channel_1 = require("./provider-memory-channel");
const memory_context_consumption_receipt_1 = require("../integrations/memory-context-consumption-receipt");
const memory_context_consumption_recovery_1 = require("../integrations/memory-context-consumption-recovery");
const ROOT = path.join(utils_1.CCM_DIR, "agent-runner");
const REQUESTS_DIR = path.join(ROOT, "requests");
const RESULTS_DIR = path.join(ROOT, "results");
const TRANSCRIPTS_DIR = path.join(ROOT, "transcripts");
const TRANSCRIPT_MAX_BYTES = 512 * 1024;
const TRANSCRIPT_STREAM_BUDGET_BYTES = 448 * 1024;
const TRANSCRIPT_EVENT_TEXT_MAX = 4096;
exports.DIRECT_AGENT_DISPATCH_REQUEST_SCHEMA = "ccm-direct-agent-dispatch-request-v1";
exports.DIRECT_AGENT_DISPATCH_RESULT_SCHEMA = "ccm-direct-agent-dispatch-result-v1";
exports.DIRECT_AGENT_DISPATCH_TRANSCRIPT_SCHEMA = "ccm-direct-agent-dispatch-transcript-event-v1";
const transcriptState = new Map();
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
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}
function recordChecksum(value) {
    const payload = { ...(value || {}) };
    delete payload.record_checksum;
    delete payload.checksum_valid;
    delete payload.file;
    return checksum(payload);
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
function requestFile(id) {
    return path.join(REQUESTS_DIR, `${id}.json`);
}
function resultFile(id) {
    return path.join(RESULTS_DIR, `${id}.json`);
}
function transcriptFile(id) {
    return path.join(TRANSCRIPTS_DIR, `${id}.jsonl`);
}
function validDispatchId(id) {
    return /^adr_[a-z0-9]+_[a-f0-9]{12}$/i.test(String(id || ""));
}
function readRecord(file) {
    try {
        const record = JSON.parse(fs.readFileSync(file, "utf-8"));
        return { ...record, checksum_valid: String(record.record_checksum || "") === recordChecksum(record), file };
    }
    catch {
        return null;
    }
}
function writeRecord(file, record) {
    const next = { ...record };
    next.record_checksum = recordChecksum(next);
    writeJsonAtomic(file, next);
    return { ...next, checksum_valid: true, file };
}
function compactTranscriptValue(value, depth = 0) {
    if (depth > 4)
        return "[depth-limited]";
    if (typeof value === "string")
        return value.slice(0, TRANSCRIPT_EVENT_TEXT_MAX);
    if (typeof value === "number" || typeof value === "boolean" || value === null)
        return value;
    if (Array.isArray(value))
        return value.slice(0, 24).map(item => compactTranscriptValue(item, depth + 1));
    if (!value || typeof value !== "object")
        return String(value ?? "").slice(0, TRANSCRIPT_EVENT_TEXT_MAX);
    return Object.keys(value).slice(0, 32).reduce((result, key) => {
        result[key] = compactTranscriptValue(value[key], depth + 1);
        return result;
    }, {});
}
function transcriptEventChecksum(event) {
    const payload = { ...(event || {}) };
    delete payload.event_checksum;
    return checksum(payload);
}
function readDirectAgentDispatchTranscript(id, options = {}) {
    if (!validDispatchId(id))
        return { id, valid: false, issues: ["dispatch_id_invalid"], events: [], bytes: 0, file: "" };
    const file = transcriptFile(id);
    if (!fs.existsSync(file))
        return { id, valid: true, issues: [], events: [], bytes: 0, file, last_event: null, stream_bytes: 0 };
    const issues = [];
    const events = [];
    let previousChecksum = "";
    let expectedSequence = 1;
    let streamBytes = 0;
    try {
        const content = fs.readFileSync(file, "utf-8");
        for (const line of content.split(/\r?\n/).filter(Boolean)) {
            let event = null;
            try {
                event = JSON.parse(line);
            }
            catch {
                issues.push("transcript_json_invalid");
                break;
            }
            if (event.schema !== exports.DIRECT_AGENT_DISPATCH_TRANSCRIPT_SCHEMA)
                issues.push("transcript_schema_invalid");
            if (String(event.id || "") !== id)
                issues.push("transcript_dispatch_id_mismatch");
            if (Number(event.sequence || 0) !== expectedSequence)
                issues.push("transcript_sequence_invalid");
            if (String(event.previous_checksum || "") !== previousChecksum)
                issues.push("transcript_chain_invalid");
            if (String(event.event_checksum || "") !== transcriptEventChecksum(event))
                issues.push("transcript_checksum_invalid");
            if (["stdout", "stderr"].includes(String(event.type || "")))
                streamBytes += Number(event.payload_bytes || 0);
            events.push(event);
            previousChecksum = String(event.event_checksum || "");
            expectedSequence += 1;
        }
        const limit = Math.max(1, Math.min(200, Number(options.limit || 80)));
        const selected = events.slice(-limit).map(event => ({
            sequence: event.sequence,
            type: event.type,
            at: event.at,
            payload: event.payload,
            payloadBytes: event.payload_bytes,
            eventChecksum: event.event_checksum,
        }));
        return {
            id,
            valid: issues.length === 0,
            issues: Array.from(new Set(issues)),
            events: selected,
            event_count: events.length,
            bytes: fs.statSync(file).size,
            stream_bytes: streamBytes,
            last_event: selected[selected.length - 1] || null,
            head_checksum: previousChecksum,
            file,
        };
    }
    catch {
        return { id, valid: false, issues: ["transcript_read_failed"], events: [], bytes: 0, file, last_event: null, stream_bytes: 0 };
    }
}
function appendDirectAgentDispatchTranscript(id, type, payload = {}) {
    if (!validDispatchId(id) || !String(type || "").trim())
        return null;
    try {
        let state = transcriptState.get(id);
        if (!state) {
            const current = readDirectAgentDispatchTranscript(id, { limit: 1 });
            if (current.valid !== true)
                return null;
            state = {
                sequence: Number(current.event_count || 0),
                checksum: String(current.head_checksum || ""),
                bytes: Number(current.bytes || 0),
                streamBytes: Number(current.stream_bytes || 0),
            };
        }
        const eventType = String(type).trim().slice(0, 80);
        const isStream = eventType === "stdout" || eventType === "stderr";
        if (isStream && (state.bytes >= TRANSCRIPT_STREAM_BUDGET_BYTES || state.streamBytes >= TRANSCRIPT_STREAM_BUDGET_BYTES))
            return null;
        if (!isStream && state.bytes >= TRANSCRIPT_MAX_BYTES)
            return null;
        const compactPayload = compactTranscriptValue(payload);
        const payloadJson = JSON.stringify(compactPayload);
        const event = {
            schema: exports.DIRECT_AGENT_DISPATCH_TRANSCRIPT_SCHEMA,
            version: 1,
            id,
            sequence: state.sequence + 1,
            type: eventType,
            at: new Date().toISOString(),
            previous_checksum: state.checksum,
            payload_bytes: Buffer.byteLength(payloadJson),
            payload: compactPayload,
        };
        event.event_checksum = transcriptEventChecksum(event);
        const line = `${JSON.stringify(event)}\n`;
        if (state.bytes + Buffer.byteLength(line) > TRANSCRIPT_MAX_BYTES)
            return null;
        fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
        const fd = fs.openSync(transcriptFile(id), "a");
        try {
            fs.writeFileSync(fd, line, "utf-8");
            fs.fsyncSync(fd);
        }
        finally {
            fs.closeSync(fd);
        }
        state = {
            sequence: event.sequence,
            checksum: event.event_checksum,
            bytes: state.bytes + Buffer.byteLength(line),
            streamBytes: state.streamBytes + (isStream ? event.payload_bytes : 0),
        };
        transcriptState.set(id, state);
        return { ...event, file: transcriptFile(id) };
    }
    catch {
        return null;
    }
}
function createDirectAgentDispatchRequest(input = {}) {
    const id = `adr_${Date.now().toString(36)}_${crypto.randomBytes(6).toString("hex")}`;
    const createdAt = new Date().toISOString();
    const message = String(input.message || "");
    const request = writeRecord(requestFile(id), {
        schema: exports.DIRECT_AGENT_DISPATCH_REQUEST_SCHEMA,
        version: 1,
        id,
        transport: "server_direct_cli",
        status: "prepared",
        projectName: String(input.projectName || ""),
        workDir: String(input.workDir || ""),
        agentType: String(input.agentType || ""),
        timeoutMs: Number(input.timeoutMs || 300_000),
        taskId: String(input.taskId || ""),
        executionId: String(input.executionId || ""),
        taskAgentSessionId: String(input.taskAgentSessionId || ""),
        groupId: String(input.groupId || ""),
        requestedNativeSessionId: String(input.requestedNativeSessionId || input.requested_native_session_id || ""),
        nativeResumeRequested: input.nativeResumeRequested === true || input.native_resume_requested === true,
        trustedMemoryProviderChannelRequired: input.trustedMemoryProviderChannelRequired === true,
        trustedMemoryProviderAcknowledgementRequired: input.trustedMemoryProviderAcknowledgementRequired === true,
        memoryContextConsumptionReceiptRequired: input.memoryContextConsumptionReceiptRequired === true,
        memoryContextConsumptionChallenge: input.memoryContextConsumptionChallenge || null,
        trustedMemoryEnvelopeChecksum: String(input.trustedMemoryEnvelopeChecksum || ""),
        trustedMemoryEnvelopeSourceChecksum: String(input.trustedMemoryEnvelopeSourceChecksum || ""),
        message,
        prompt_checksum: crypto.createHash("sha256").update(message).digest("hex").slice(0, 32),
        created_at: createdAt,
        started_at: "",
        completed_at: "",
        runner_pid: 0,
    });
    appendDirectAgentDispatchTranscript(id, "request_prepared", {
        projectName: request.projectName,
        agentType: request.agentType,
        taskId: request.taskId,
        executionId: request.executionId,
        taskAgentSessionId: request.taskAgentSessionId,
        groupId: request.groupId,
        promptChecksum: request.prompt_checksum,
    });
    return { id, requestFile: request.file, resultFile: resultFile(id), request };
}
function markDirectAgentDispatchStarted(id, input = {}) {
    const file = requestFile(id);
    const current = readRecord(file);
    if (!current?.checksum_valid || current.schema !== exports.DIRECT_AGENT_DISPATCH_REQUEST_SCHEMA)
        return null;
    if (current.status === "running" || current.status === "done" || current.status === "failed")
        return current;
    const request = writeRecord(file, {
        ...current,
        checksum_valid: undefined,
        file: undefined,
        status: "running",
        started_at: String(input.startedAt || input.started_at || new Date().toISOString()),
        runner_pid: Number(input.runnerPid || input.runner_pid || 0),
    });
    appendDirectAgentDispatchTranscript(id, "process_spawned", {
        runnerPid: request.runner_pid,
        startedAt: request.started_at,
    });
    return request;
}
function completeDirectAgentDispatch(id, input = {}) {
    const requestPath = requestFile(id);
    const current = readRecord(requestPath);
    if (!current?.checksum_valid || current.schema !== exports.DIRECT_AGENT_DISPATCH_REQUEST_SCHEMA)
        return null;
    const completedAt = String(input.completedAt || input.completed_at || new Date().toISOString());
    const output = String(input.output || input.error || "");
    const success = input.success === true;
    const result = writeRecord(resultFile(id), {
        schema: exports.DIRECT_AGENT_DISPATCH_RESULT_SCHEMA,
        version: 1,
        id,
        transport: "server_direct_cli",
        success,
        error: success ? "" : String(input.error || output || "direct CLI failed"),
        output,
        output_checksum: crypto.createHash("sha256").update(output).digest("hex"),
        nativeSessionId: String(input.nativeSessionId || input.native_session_id || ""),
        nativeContinuationEvidence: input.nativeContinuationEvidence || input.native_continuation_evidence || null,
        nativeModelCapabilityReceipt: input.nativeModelCapabilityReceipt || input.native_model_capability_receipt || null,
        nativeModelCapabilityRecord: input.nativeModelCapabilityRecord || input.native_model_capability_record || null,
        providerToolAccessEvidence: input.providerToolAccessEvidence || input.provider_tool_access_evidence || null,
        providerMemoryChannelEvidence: input.providerMemoryChannelEvidence || input.provider_memory_channel_evidence || null,
        memoryContextConsumptionReceipt: input.memoryContextConsumptionReceipt || input.memory_context_consumption_receipt || null,
        memoryContextConsumptionRecovery: input.memoryContextConsumptionRecovery || input.memory_context_consumption_recovery || null,
        usage: input.usage && typeof input.usage === "object" ? input.usage : null,
        exitCode: input.exitCode ?? input.exit_code ?? null,
        signal: String(input.signal || ""),
        taskId: String(current.taskId || ""),
        executionId: String(current.executionId || ""),
        taskAgentSessionId: String(current.taskAgentSessionId || ""),
        groupId: String(current.groupId || ""),
        prompt_checksum: String(current.prompt_checksum || ""),
        started_at: String(current.started_at || ""),
        completed_at: completedAt,
    });
    const request = writeRecord(requestPath, {
        ...current,
        checksum_valid: undefined,
        file: undefined,
        status: success ? "done" : "failed",
        completed_at: completedAt,
        result_checksum: String(result.record_checksum || ""),
    });
    appendDirectAgentDispatchTranscript(id, "result_committed", {
        success,
        completedAt,
        exitCode: result.exitCode,
        signal: result.signal,
        outputChecksum: result.output_checksum,
        resultChecksum: result.record_checksum,
    });
    return { request, result };
}
function readDirectAgentDispatchRequest(id) {
    return readRecord(requestFile(id));
}
function readDirectAgentDispatchResult(id) {
    return readRecord(resultFile(id));
}
function validateDirectAgentDispatchPair(request, result) {
    const issues = [];
    if (request?.schema !== exports.DIRECT_AGENT_DISPATCH_REQUEST_SCHEMA)
        issues.push("request_schema_invalid");
    if (result?.schema !== exports.DIRECT_AGENT_DISPATCH_RESULT_SCHEMA)
        issues.push("result_schema_invalid");
    if (String(request?.record_checksum || "") !== recordChecksum(request))
        issues.push("request_checksum_invalid");
    if (String(result?.record_checksum || "") !== recordChecksum(result))
        issues.push("result_checksum_invalid");
    if (!request?.started_at || !result?.started_at)
        issues.push("dispatch_start_missing");
    if (String(request?.id || "") !== String(result?.id || ""))
        issues.push("request_result_id_mismatch");
    if (String(request?.prompt_checksum || "") !== String(result?.prompt_checksum || ""))
        issues.push("prompt_checksum_mismatch");
    if (String(request?.taskAgentSessionId || "") !== String(result?.taskAgentSessionId || ""))
        issues.push("task_agent_session_mismatch");
    if (String(request?.groupId || "") !== String(result?.groupId || ""))
        issues.push("group_mismatch");
    if (request?.trustedMemoryProviderChannelRequired === true) {
        const channel = (0, provider_memory_channel_1.verifyProviderMemoryChannelEvidence)(result?.providerMemoryChannelEvidence, {
            provider: request.agentType,
            originalPrompt: request.message,
            envelopeChecksum: request.trustedMemoryEnvelopeChecksum,
            sourceChecksum: request.trustedMemoryEnvelopeSourceChecksum,
            runnerRequestId: request.id,
            required: true,
            requireAcknowledgement: request.trustedMemoryProviderAcknowledgementRequired === true,
            providerOutputContractEvidence: result?.nativeContinuationEvidence?.providerOutputContractEvidence || null,
            nativeContinuationEvidence: result?.nativeContinuationEvidence || null,
            executionSucceeded: result?.success === true,
        });
        if (!channel.valid)
            issues.push(...channel.issues);
    }
    if (request?.memoryContextConsumptionReceiptRequired === true) {
        const receipt = (0, memory_context_consumption_receipt_1.readMemoryContextConsumptionReceipt)(request.memoryContextConsumptionChallenge, {
            groupId: request.groupId,
            taskId: request.taskId,
            executionId: request.executionId,
            project: request.projectName,
            taskAgentSessionId: request.taskAgentSessionId,
        });
        if (!receipt.valid)
            issues.push(...receipt.issues);
        if (String(result?.memoryContextConsumptionReceipt?.receipt_signature || "") !== String(receipt.receiptSignature || "")) {
            issues.push("memory_context_consumption_receipt_mismatch");
        }
        if (result?.memoryContextConsumptionRecovery) {
            const recovery = (0, memory_context_consumption_recovery_1.verifyMemoryContextConsumptionRecovery)(result.memoryContextConsumptionRecovery, {
                challengeId: request.memoryContextConsumptionChallenge?.challenge_id || "",
                runnerRequestId: request.id,
                groupId: request.groupId,
                taskId: request.taskId,
                executionId: request.executionId,
                project: request.projectName,
                taskAgentSessionId: request.taskAgentSessionId,
                provider: request.agentType,
            });
            if (!recovery.valid)
                issues.push(...recovery.issues);
            if (result.success === true && result.memoryContextConsumptionRecovery.status !== "recovered")
                issues.push("memory_context_consumption_recovery_not_recovered");
        }
    }
    return { valid: issues.length === 0, issues };
}
function listDirectAgentDispatchSpool(options = {}) {
    const ids = new Set();
    for (const dir of [REQUESTS_DIR, RESULTS_DIR, TRANSCRIPTS_DIR]) {
        if (!fs.existsSync(dir))
            continue;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const match = entry.isFile() ? entry.name.match(/^(adr_[a-z0-9]+_[a-f0-9]{12})\.(?:json|jsonl)$/i) : null;
            if (match)
                ids.add(match[1]);
        }
    }
    const limit = Math.max(1, Math.min(5000, Number(options.limit || 1000)));
    return Array.from(ids).map(id => {
        const request = readDirectAgentDispatchRequest(id);
        const result = readDirectAgentDispatchResult(id);
        const transcript = readDirectAgentDispatchTranscript(id, { limit: options.transcriptLimit || 40 });
        const pair = request && result ? validateDirectAgentDispatchPair(request, result) : { valid: false, issues: [request ? "result_missing" : "request_missing"] };
        return { id, request, result, transcript, pair };
    }).sort((a, b) => String(b.request?.created_at || "").localeCompare(String(a.request?.created_at || ""))).slice(0, limit);
}
function cancelPreparedDirectAgentDispatch(id, input = {}) {
    const current = readDirectAgentDispatchRequest(id);
    if (!current?.checksum_valid || current.schema !== exports.DIRECT_AGENT_DISPATCH_REQUEST_SCHEMA)
        throw new Error("direct dispatch request invalid");
    if (String(current.status || "") !== "prepared" || current.started_at)
        throw new Error("only prepared unstarted direct dispatch can be cancelled");
    if (readDirectAgentDispatchResult(id))
        throw new Error("prepared direct dispatch already has a result");
    const completedAt = new Date().toISOString();
    const request = writeRecord(requestFile(id), {
        ...current,
        checksum_valid: undefined,
        file: undefined,
        status: "cancelled",
        completed_at: completedAt,
        cancellation_reason: String(input.reason || "operator_cancelled_before_spawn").slice(0, 1000),
        cancelled_by: String(input.actor || "memory-center").slice(0, 160),
    });
    appendDirectAgentDispatchTranscript(id, "request_cancelled", { completedAt, actor: request.cancelled_by, reason: request.cancellation_reason });
    return request;
}
function pruneDirectAgentDispatchTerminalPair(id) {
    const request = readDirectAgentDispatchRequest(id);
    const result = readDirectAgentDispatchResult(id);
    const pair = validateDirectAgentDispatchPair(request, result);
    if (!request || !result || pair.valid !== true || !["done", "failed"].includes(String(request.status || ""))) {
        throw new Error("only a complete terminal direct dispatch pair can be pruned");
    }
    const deleted = [];
    for (const file of [requestFile(id), resultFile(id), transcriptFile(id)]) {
        if (!fs.existsSync(file))
            continue;
        fs.unlinkSync(file);
        deleted.push(file);
    }
    transcriptState.delete(id);
    return { id, deleted_count: deleted.length, deleted };
}
function pruneDirectAgentDispatchSpool(options = {}) {
    if (!fs.existsSync(REQUESTS_DIR))
        return { deleted_count: 0, deleted: [] };
    const nowMs = Date.parse(String(options.now || "")) || Date.now();
    const retentionMs = Math.max(86_400_000, Number(options.retentionMs || options.retention_ms || 14 * 86_400_000));
    const deleted = [];
    for (const entry of fs.readdirSync(REQUESTS_DIR, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.startsWith("adr_") || !entry.name.endsWith(".json"))
            continue;
        const request = readRecord(path.join(REQUESTS_DIR, entry.name));
        if (!request?.checksum_valid || request.schema !== exports.DIRECT_AGENT_DISPATCH_REQUEST_SCHEMA || !["done", "failed", "cancelled"].includes(String(request.status || "")))
            continue;
        const completedAt = Date.parse(String(request.completed_at || ""));
        if (!Number.isFinite(completedAt) || nowMs - completedAt < retentionMs)
            continue;
        const result = readRecord(resultFile(String(request.id || "")));
        const pair = result ? validateDirectAgentDispatchPair(request, result) : { valid: false, issues: [] };
        const cancellableTerminal = request.status === "cancelled" && !request.started_at && !result;
        const preSpawnTerminal = request.status === "failed" && !request.started_at && result
            && pair.issues.length === 1 && pair.issues[0] === "dispatch_start_missing";
        if (pair.valid !== true && !cancellableTerminal && !preSpawnTerminal)
            continue;
        for (const file of [request.file, result?.file, transcriptFile(String(request.id || ""))]) {
            if (!file || !fs.existsSync(file))
                continue;
            try {
                fs.unlinkSync(file);
                deleted.push(file);
            }
            catch { }
        }
        transcriptState.delete(String(request.id || ""));
    }
    return { deleted_count: deleted.length, deleted };
}
//# sourceMappingURL=direct-dispatch-spool.js.map