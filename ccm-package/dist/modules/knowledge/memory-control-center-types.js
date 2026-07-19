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
exports.API_MICROCOMPACT_NATIVE_APPLY_TELEMETRY_MAX_AGE_MS = exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_DIR = exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_DIR = exports.GROUP_GLOBAL_MEMORY_ARBITRATION_DIR = exports.GROUP_COMPACT_FILE_REFERENCE_DIR = exports.GROUP_TOOL_CONTINUITY_DIR = exports.GROUP_SESSION_MEMORY_DIR = exports.GROUP_TYPED_MEMORY_MD_DIR = exports.GROUP_MEMORY_WORKER_CONTEXT_PTL_EMERGENCIES_DIR = exports.GROUP_MEMORY_WORKER_CONTEXT_COMPACT_STRATEGIES_DIR = exports.GROUP_MEMORY_WORKER_CONTEXT_COMPACT_OUTCOMES_DIR = exports.GROUP_MEMORY_WORKER_CONTEXT_COMPACT_HOOKS_DIR = exports.GROUP_MEMORY_REPLAY_REPAIR_TIMELINE_BINDINGS_DIR = exports.GROUP_MEMORY_REPLAY_REPAIR_DISPATCH_BINDINGS_DIR = exports.GROUP_MEMORY_REPLAY_REPAIR_DISPATCH_PLANS_DIR = exports.GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR = exports.GROUP_MEMORY_REPLAY_REPAIR_DIR = exports.KNOWLEDGE_DIR = exports.GLOBAL_MEMORY_FILE = exports.PROJECT_MEMORY_DIR = exports.GROUP_SESSION_SCOPED_MEMORY_DIR = exports.GROUP_MEMORY_DIR = exports.DISPATCH_RECOVERY_RESOLUTION_DIR = exports.QUALITY_FILE = exports.METRICS_FILE = exports.AUDIT_FILE = exports.CONTROL_FILE = exports.CONTROL_DIR = void 0;
exports.now = now;
exports.compactMemoryCenterText = compactMemoryCenterText;
exports.ensureDir = ensureDir;
exports.readJson = readJson;
exports.writeJsonAtomic = writeJsonAtomic;
exports.hash = hash;
exports.canonicalFleetValue = canonicalFleetValue;
exports.cleanId = cleanId;
exports.sidecarFileId = sidecarFileId;
exports.groupSessionSidecarFile = groupSessionSidecarFile;
exports.getGroupSessionMemorySnapshotFile = getGroupSessionMemorySnapshotFile;
exports.getGroupSessionMemoryMarkdownFile = getGroupSessionMemoryMarkdownFile;
exports.getGroupToolContinuitySnapshotFile = getGroupToolContinuitySnapshotFile;
exports.getGroupToolContinuityMarkdownFile = getGroupToolContinuityMarkdownFile;
exports.getGroupCompactFileReferenceLedgerFile = getGroupCompactFileReferenceLedgerFile;
exports.getGroupGlobalMemoryArbitrationLedgerFile = getGroupGlobalMemoryArbitrationLedgerFile;
exports.getGroupApiMicrocompactNativeApplyProofLedgerFile = getGroupApiMicrocompactNativeApplyProofLedgerFile;
exports.getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile = getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile;
exports.acquireGlobalMemorySelfTestLock = acquireGlobalMemorySelfTestLock;
exports.normalizeCompactFileReferencePath = normalizeCompactFileReferencePath;
exports.readGroupSessionMemorySnapshotForCenter = readGroupSessionMemorySnapshotForCenter;
exports.readGroupToolContinuitySnapshotForCenter = readGroupToolContinuitySnapshotForCenter;
exports.getControlsState = getControlsState;
exports.appendAudit = appendAudit;
// Behavior-freeze extraction from memory-control-center.ts.
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
exports.CONTROL_DIR = process.env.CCM_MEMORY_CONTROL_DIR || path.join(utils_1.CCM_DIR, "memory-control");
exports.CONTROL_FILE = path.join(exports.CONTROL_DIR, "overrides.json");
exports.AUDIT_FILE = path.join(exports.CONTROL_DIR, "audit.jsonl");
exports.METRICS_FILE = path.join(exports.CONTROL_DIR, "metrics.json");
exports.QUALITY_FILE = path.join(exports.CONTROL_DIR, "quality.json");
exports.DISPATCH_RECOVERY_RESOLUTION_DIR = path.join(exports.CONTROL_DIR, "dispatch-recovery-resolutions");
exports.GROUP_MEMORY_DIR = path.join(utils_1.CCM_DIR, "group-memory");
exports.GROUP_SESSION_SCOPED_MEMORY_DIR = path.join(utils_1.CCM_DIR, "group-memory-sessions");
exports.PROJECT_MEMORY_DIR = path.join(utils_1.CCM_DIR, "project-memory");
exports.GLOBAL_MEMORY_FILE = path.join(utils_1.CCM_DIR, "global-agent-memory", "memory.json");
exports.KNOWLEDGE_DIR = path.join(process.env.USERPROFILE || "C:/Users/admin", ".cc-connect", "knowledge");
exports.GROUP_MEMORY_REPLAY_REPAIR_DIR = path.join(utils_1.CCM_DIR, "group-memory-replay-repair");
exports.GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR = path.join(utils_1.CCM_DIR, "group-memory-replay-repair-work-items");
exports.GROUP_MEMORY_REPLAY_REPAIR_DISPATCH_PLANS_DIR = path.join(utils_1.CCM_DIR, "group-memory-replay-repair-dispatch-plans");
exports.GROUP_MEMORY_REPLAY_REPAIR_DISPATCH_BINDINGS_DIR = path.join(utils_1.CCM_DIR, "group-memory-replay-repair-dispatch-bindings");
exports.GROUP_MEMORY_REPLAY_REPAIR_TIMELINE_BINDINGS_DIR = path.join(utils_1.CCM_DIR, "group-memory-replay-repair-timeline-bindings");
exports.GROUP_MEMORY_WORKER_CONTEXT_COMPACT_HOOKS_DIR = path.join(utils_1.CCM_DIR, "group-memory-worker-context-compact-hooks");
exports.GROUP_MEMORY_WORKER_CONTEXT_COMPACT_OUTCOMES_DIR = path.join(utils_1.CCM_DIR, "group-memory-worker-context-compact-outcomes");
exports.GROUP_MEMORY_WORKER_CONTEXT_COMPACT_STRATEGIES_DIR = path.join(utils_1.CCM_DIR, "group-memory-worker-context-compact-strategies");
exports.GROUP_MEMORY_WORKER_CONTEXT_PTL_EMERGENCIES_DIR = path.join(utils_1.CCM_DIR, "group-memory-worker-context-ptl-emergencies");
exports.GROUP_TYPED_MEMORY_MD_DIR = path.join(utils_1.CCM_DIR, "group-memory-md");
exports.GROUP_SESSION_MEMORY_DIR = path.join(utils_1.CCM_DIR, "group-session-memory");
exports.GROUP_TOOL_CONTINUITY_DIR = path.join(utils_1.CCM_DIR, "group-tool-continuity");
exports.GROUP_COMPACT_FILE_REFERENCE_DIR = path.join(utils_1.CCM_DIR, "group-memory-file-references");
exports.GROUP_GLOBAL_MEMORY_ARBITRATION_DIR = path.join(utils_1.CCM_DIR, "group-global-memory-arbitration");
exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_DIR = path.join(utils_1.CCM_DIR, "group-api-microcompact-native-apply-proof");
exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_DIR = path.join(utils_1.CCM_DIR, "group-api-microcompact-native-apply-request-telemetry");
exports.API_MICROCOMPACT_NATIVE_APPLY_TELEMETRY_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
function now() { return new Date().toISOString(); }
function compactMemoryCenterText(value, maxLength = 240) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length <= maxLength ? text : `${text.slice(0, Math.max(0, maxLength - 3))}...`;
}
function ensureDir() {
    fs.mkdirSync(exports.CONTROL_DIR, { recursive: true });
}
function readJson(file, fallback) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return fallback;
    }
}
function writeJsonAtomic(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
    fs.renameSync(temp, file);
}
function hash(value, length = 16) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex").slice(0, length);
}
function canonicalFleetValue(value) {
    if (Array.isArray(value))
        return value.map(canonicalFleetValue);
    if (!value || typeof value !== "object")
        return value;
    return Object.keys(value).sort().reduce((result, key) => {
        if (value[key] !== undefined)
            result[key] = canonicalFleetValue(value[key]);
        return result;
    }, {});
}
function cleanId(value) {
    return String(value || "").trim().replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 120);
}
function sidecarFileId(value) {
    return String(value || "unknown").trim().replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown";
}
function groupSessionSidecarFile(root, groupId, sessionId = "") {
    let cleanSessionId = String(sessionId || "").trim();
    if (!cleanSessionId) {
        try {
            cleanSessionId = String(require("../collaboration/storage").getActiveGroupChatSessionId(groupId) || "default").trim();
        }
        catch {
            cleanSessionId = "default";
        }
    }
    if (!cleanSessionId || cleanSessionId === "default")
        return path.join(root, `${sidecarFileId(groupId)}.json`);
    return path.join(root, sidecarFileId(groupId), `${sidecarFileId(cleanSessionId)}.json`);
}
function getGroupSessionMemorySnapshotFile(groupId) {
    return path.join(exports.GROUP_SESSION_MEMORY_DIR, sidecarFileId(groupId), "snapshot.json");
}
function getGroupSessionMemoryMarkdownFile(groupId) {
    return path.join(exports.GROUP_SESSION_MEMORY_DIR, sidecarFileId(groupId), "summary.md");
}
function getGroupToolContinuitySnapshotFile(groupId) {
    return path.join(exports.GROUP_TOOL_CONTINUITY_DIR, sidecarFileId(groupId), "snapshot.json");
}
function getGroupToolContinuityMarkdownFile(groupId) {
    return path.join(exports.GROUP_TOOL_CONTINUITY_DIR, sidecarFileId(groupId), "summary.md");
}
function getGroupCompactFileReferenceLedgerFile(groupId) {
    return path.join(exports.GROUP_COMPACT_FILE_REFERENCE_DIR, `${sidecarFileId(groupId)}.json`);
}
function getGroupGlobalMemoryArbitrationLedgerFile(groupId) {
    return path.join(exports.GROUP_GLOBAL_MEMORY_ARBITRATION_DIR, `${sidecarFileId(groupId)}.json`);
}
function getGroupApiMicrocompactNativeApplyProofLedgerFile(groupId, sessionId = "") {
    return groupSessionSidecarFile(exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_DIR, groupId, sessionId);
}
function getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile(groupId, sessionId = "") {
    return groupSessionSidecarFile(exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_DIR, groupId, sessionId);
}
function acquireGlobalMemorySelfTestLock(label) {
    try {
        const api = require("../../agents/global/memory");
        if (typeof api.acquireGlobalAgentMemorySelfTestLock === "function") {
            return api.acquireGlobalAgentMemorySelfTestLock(label);
        }
    }
    catch { }
    return () => { };
}
function normalizeCompactFileReferencePath(value) {
    return String(value || "").replace(/\\/g, "/").trim();
}
function readGroupSessionMemorySnapshotForCenter(groupId) {
    const snapshotFile = getGroupSessionMemorySnapshotFile(groupId);
    const summaryFile = getGroupSessionMemoryMarkdownFile(groupId);
    const parsed = readJson(snapshotFile, null);
    const markdown = (() => {
        try {
            return fs.readFileSync(summaryFile, "utf-8");
        }
        catch {
            return "";
        }
    })();
    const markdownChecksum = markdown ? hash(markdown, 24) : "";
    let memoryBudget = parsed?.memoryBudget || null;
    try {
        const api = require("../collaboration/memory");
        if (typeof api.analyzeGroupSessionMemoryBudget === "function")
            memoryBudget = api.analyzeGroupSessionMemoryBudget(markdown);
    }
    catch { }
    if (parsed?.schema === "ccm-group-session-memory-snapshot-v1") {
        return {
            ...parsed,
            snapshotFile,
            summaryFile,
            markdownExists: !!markdown,
            markdownChecksumMatches: !!markdown && markdownChecksum === parsed.markdownChecksum,
            markdownChars: markdown.length || Number(parsed.markdownChars || 0),
            markdownTokens: Number(memoryBudget?.totalTokens || parsed.markdownTokens || 0),
            memoryBudget,
            markdownExcerpt: compactMemoryCenterText(parsed.markdownExcerpt || markdown, 1200),
        };
    }
    return {
        schema: "ccm-group-session-memory-snapshot-v1",
        groupId,
        snapshotFile,
        summaryFile,
        markdownExists: !!markdown,
        markdownChecksumMatches: false,
        markdownChars: markdown.length,
        markdownTokens: Number(memoryBudget?.totalTokens || 0),
        memoryBudget,
        hasSummary: false,
        generatedAt: "",
        markdownExcerpt: compactMemoryCenterText(markdown, 1200),
    };
}
function readGroupToolContinuitySnapshotForCenter(groupId) {
    const snapshotFile = getGroupToolContinuitySnapshotFile(groupId);
    const summaryFile = getGroupToolContinuityMarkdownFile(groupId);
    const parsed = readJson(snapshotFile, null);
    const markdown = (() => {
        try {
            return fs.readFileSync(summaryFile, "utf-8");
        }
        catch {
            return "";
        }
    })();
    const markdownChecksum = markdown ? hash(markdown, 24) : "";
    if (parsed?.schema === "ccm-group-tool-continuity-snapshot-v1") {
        return {
            ...parsed,
            snapshotFile,
            summaryFile,
            markdownExists: !!markdown,
            markdownChecksumMatches: !!markdown && markdownChecksum === parsed.markdownChecksum,
            markdownChars: markdown.length || Number(parsed.markdownChars || 0),
            markdownExcerpt: compactMemoryCenterText(parsed.markdownExcerpt || markdown, 1200),
        };
    }
    return {
        schema: "ccm-group-tool-continuity-snapshot-v1",
        groupId,
        snapshotFile,
        summaryFile,
        status: "empty",
        markdownExists: !!markdown,
        markdownChecksumMatches: false,
        markdownChars: markdown.length,
        shouldReuseAsContext: true,
        shouldBypassAuthorization: false,
        configuredTools: { mcp: [], skill: [] },
        allowedTools: { mcp: [], skill: [] },
        requested: { mcp: [], skill: [] },
        synced: { mcp: [], skill: [] },
        missing: { mcp: [], skill: [] },
        invokedSkills: [],
        hasRuntimeEvidence: false,
        generatedAt: "",
        markdownExcerpt: compactMemoryCenterText(markdown, 1200),
    };
}
function getControlsState() {
    return readJson(exports.CONTROL_FILE, { version: 1, controls: [], updatedAt: "" });
}
function appendAudit(event) {
    ensureDir();
    const record = { id: `audit-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`, at: now(), ...event };
    fs.appendFileSync(exports.AUDIT_FILE, JSON.stringify(record) + "\n", "utf-8");
    return record;
}
//# sourceMappingURL=memory-control-center-types.js.map