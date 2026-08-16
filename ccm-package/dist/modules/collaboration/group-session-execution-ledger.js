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
exports.listGroupSessionExecutionEvents = listGroupSessionExecutionEvents;
exports.appendGroupSessionExecutionEvent = appendGroupSessionExecutionEvent;
exports.runGroupSessionExecutionLedgerSelfTest = runGroupSessionExecutionLedgerSelfTest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const group_memory_storage_1 = require("./group-memory-storage");
const session_execution_ledger_1 = require("../../system/session-execution-ledger");
const GROUP_SESSION_EXECUTION_DIR = path.join(utils_1.CCM_DIR, "group-session-execution");
function ledgerFile(groupId, groupSessionId) {
    return (0, group_memory_storage_1.getGroupSessionSidecarFile)(GROUP_SESSION_EXECUTION_DIR, groupId, groupSessionId);
}
function emptyLedger(groupId, groupSessionId) {
    return {
        schema: "ccm-group-session-execution-v1",
        version: 1,
        groupId,
        groupSessionId,
        execution_history: [],
        updated_at: "",
    };
}
function listGroupSessionExecutionEvents(groupId, groupSessionId) {
    const id = String(groupId || "").trim();
    const sessionId = String(groupSessionId || "").trim();
    if (!id || !sessionId.startsWith("gcs_"))
        return [];
    const file = ledgerFile(id, sessionId);
    if (!fs.existsSync(file))
        return [];
    try {
        const data = JSON.parse(fs.readFileSync(file, "utf8"));
        return (0, session_execution_ledger_1.normalizeSessionExecutionEvents)(data?.execution_history || data?.executionHistory);
    }
    catch {
        return [];
    }
}
function appendGroupSessionExecutionEvent(groupIdInput, groupSessionIdInput, event) {
    const groupId = String(groupIdInput || "").trim();
    const groupSessionId = String(groupSessionIdInput || "").trim();
    if (!groupId || !groupSessionId.startsWith("gcs_"))
        return null;
    const file = ledgerFile(groupId, groupSessionId);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const current = fs.existsSync(file)
            ? { ...emptyLedger(groupId, groupSessionId), ...JSON.parse(fs.readFileSync(file, "utf8")) }
            : emptyLedger(groupId, groupSessionId);
        const events = (0, session_execution_ledger_1.normalizeSessionExecutionEvents)(current.execution_history);
        const type = String(event?.type || "") === "tool_use" || String(event?.type || "") === "tool_started" ? "tool_use" : "tool_result";
        const toolName = String(event?.toolName || event?.tool_name || event?.tool || "tool");
        const runId = String(event?.runId || event?.run_id || "");
        const toolCallId = type === "tool_result"
            ? (String(event?.toolCallId || event?.tool_call_id || "") || (0, session_execution_ledger_1.findPendingToolCallId)(events, runId, toolName))
            : String(event?.toolCallId || event?.tool_call_id || "");
        const created = (0, session_execution_ledger_1.createSessionExecutionEvent)({
            type,
            toolName,
            toolCallId,
            runId,
            traceId: String(event?.traceId || event?.trace_id || ""),
            anchorMessageId: String(event?.anchorMessageId || event?.anchor_message_id || ""),
            timestamp: event?.timestamp || event?.at || new Date().toISOString(),
            status: event?.status === "error" || event?.error ? "error" : type === "tool_use" ? "running" : "ok",
            payload: event?.payload ?? (type === "tool_use" ? { arguments: event?.arguments || {} } : { observation: event?.observation ?? null, error: event?.error || "" }),
            persistContext: { scope: "group", sessionId: groupSessionId },
        });
        if (!events.some(item => item.id === created.id))
            events.push(created);
        (0, atomic_json_file_1.writeJsonAtomic)(file, {
            ...current,
            schema: "ccm-group-session-execution-v1",
            version: 1,
            groupId,
            groupSessionId,
            execution_history: events.sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
            updated_at: new Date().toISOString(),
        });
        return created;
    });
}
function runGroupSessionExecutionLedgerSelfTest() {
    const groupId = `selftest-group-${Date.now()}`;
    const sessionId = `gcs_selftest_${Date.now()}`;
    const use = appendGroupSessionExecutionEvent(groupId, sessionId, {
        type: "tool_use",
        toolName: "read_file",
        toolCallId: "call_self",
        runId: "run_self",
        anchorMessageId: "u1",
        arguments: { path: "README.md" },
    });
    const result = appendGroupSessionExecutionEvent(groupId, sessionId, {
        type: "tool_result",
        toolName: "read_file",
        toolCallId: "call_self",
        runId: "run_self",
        anchorMessageId: "u1",
        observation: { text: "# Hello" },
    });
    const listed = listGroupSessionExecutionEvents(groupId, sessionId);
    const file = ledgerFile(groupId, sessionId);
    try {
        fs.unlinkSync(file);
    }
    catch { }
    const checks = {
        wroteUse: String(use?.toolCallId || "") === "call_self",
        wroteResult: String(result?.type || "") === "tool_result",
        listedPair: listed.length === 2 && listed[0].toolName === "read_file",
        rejectsNonExactSession: appendGroupSessionExecutionEvent(groupId, "default", { type: "tool_use", toolName: "read_file" }) == null,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=group-session-execution-ledger.js.map