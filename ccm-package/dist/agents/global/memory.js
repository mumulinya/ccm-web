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
exports.GLOBAL_AGENT_MEMORY_FILE = void 0;
exports.getGlobalAgentSessionCompactionActivity = getGlobalAgentSessionCompactionActivity;
exports.acquireGlobalAgentMemorySelfTestLock = acquireGlobalAgentMemorySelfTestLock;
exports.scanGlobalAgentMemorySelfTestContamination = scanGlobalAgentMemorySelfTestContamination;
exports.archiveGlobalAgentMemorySelfTestResidues = archiveGlobalAgentMemorySelfTestResidues;
exports.runGlobalAgentMemorySelfTestResidueArchiveSelfTest = runGlobalAgentMemorySelfTestResidueArchiveSelfTest;
exports.runGlobalAgentMemorySelfTestIsolationSelfTest = runGlobalAgentMemorySelfTestIsolationSelfTest;
exports.getGlobalAgentTranscriptFile = getGlobalAgentTranscriptFile;
exports.loadGlobalAgentTranscript = loadGlobalAgentTranscript;
exports.appendGlobalAgentExecutionEvent = appendGlobalAgentExecutionEvent;
exports.loadGlobalAgentMemory = loadGlobalAgentMemory;
exports.pruneDeletedGlobalWebSessionMemory = pruneDeletedGlobalWebSessionMemory;
exports.recordGlobalAgentSessionProviderUsage = recordGlobalAgentSessionProviderUsage;
exports.setGlobalAgentMemoryPolicy = setGlobalAgentMemoryPolicy;
exports.extractGlobalMemoryCandidates = extractGlobalMemoryCandidates;
exports.compactGlobalAgentSessionWithModel = compactGlobalAgentSessionWithModel;
exports.scheduleGlobalAgentSessionMemoryExtraction = scheduleGlobalAgentSessionMemoryExtraction;
exports.ingestGlobalAgentConversation = ingestGlobalAgentConversation;
exports.recallGlobalAgentMemory = recallGlobalAgentMemory;
exports.buildGlobalAgentSessionContinuation = buildGlobalAgentSessionContinuation;
exports.buildGlobalAgentMemoryPacket = buildGlobalAgentMemoryPacket;
exports.recordGlobalMissionMemory = recordGlobalMissionMemory;
exports.recordGlobalStructuredMemoryFact = recordGlobalStructuredMemoryFact;
exports.recordGlobalDirectDispatchMemory = recordGlobalDirectDispatchMemory;
exports.recordGlobalDirectDispatchRollbackMemory = recordGlobalDirectDispatchRollbackMemory;
exports.getGlobalMemoryEvidence = getGlobalMemoryEvidence;
exports.rebuildGlobalAgentMemory = rebuildGlobalAgentMemory;
exports.getGlobalAgentMemoryPolicy = getGlobalAgentMemoryPolicy;
exports.runGlobalAgentMemorySelfTest = runGlobalAgentMemorySelfTest;
exports.runGlobalAgentMemoryStressSelfTest = runGlobalAgentMemoryStressSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const context_budget_1 = require("../../system/context-budget");
const session_memory_window_1 = require("../../system/session-memory-window");
const utils_1 = require("../../core/utils");
const memory_control_center_1 = require("../../modules/knowledge/memory-control-center");
const group_compaction_engine_1 = require("../../modules/collaboration/group-compaction-engine");
const group_orchestrator_config_1 = require("../../modules/collaboration/group-orchestrator-config");
const group_compaction_strategy_1 = require("../../modules/collaboration/group-compaction-strategy");
const session_compaction_core_1 = require("../../system/session-compaction-core");
const session_execution_ledger_1 = require("../../system/session-execution-ledger");
const durable_memory_taxonomy_1 = require("../../system/durable-memory-taxonomy");
const session_model_context_1 = require("../../system/session-model-context");
const session_summary_quality_gate_1 = require("../../system/session-summary-quality-gate");
const session_summary_secondary_review_1 = require("../../system/session-summary-secondary-review");
const semantic_decision_runtime_1 = require("../../system/semantic-decision-runtime");
const MEMORY_DIR = process.env.CCM_GLOBAL_AGENT_MEMORY_DIR || path.join(utils_1.CCM_DIR, "global-agent-memory");
exports.GLOBAL_AGENT_MEMORY_FILE = path.join(MEMORY_DIR, "memory.json");
const TRANSCRIPT_DIR = path.join(MEMORY_DIR, "transcripts");
const KEY_FILE = path.join(MEMORY_DIR, "transcript.key");
const POLICY_FILE = path.join(MEMORY_DIR, "policy.json");
const SELFTEST_LOCK_FILE = path.join(MEMORY_DIR, ".selftest.lock");
const SELFTEST_RESIDUE_ARCHIVE_DIR = path.join(MEMORY_DIR, "selftest-residue-archive");
const MEMORY_ITEM_KEYS = ["user", "feedback", "authorization", "decisions", "missions", "unresolved", "references"];
const COMPACT_MESSAGE_THRESHOLD = 60;
const COMPACT_TOKEN_THRESHOLD = 50_000;
const MAX_COMPACTION_FAILURES = 3;
const MAX_ITEMS_PER_TYPE = 300;
const GLOBAL_COMPACTION_MODEL_MAX_OUTPUT_TOKENS = 20_000;
const globalModelCompactions = new Map();
const globalLongTermExtractions = new Map();
function getGlobalAgentSessionCompactionActivity(sessionId) {
    const exactSessionId = String(sessionId || "").trim();
    const active = exactSessionId ? globalModelCompactions.get(exactSessionId) : null;
    return active ? {
        active: true,
        status: "running",
        stage: "model_compaction",
        reason: active.reason,
        startedAt: active.startedAt,
        updatedAt: active.startedAt,
    } : { active: false, status: "idle", stage: "", reason: "", startedAt: "", updatedAt: "" };
}
function now() { return new Date().toISOString(); }
function ensureDirs() { fs.mkdirSync(TRANSCRIPT_DIR, { recursive: true }); }
function sha(value, length = 32) { return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex").slice(0, length); }
function cleanId(value) { return String(value || "default").replace(/[^a-zA-Z0-9._@-]+/g, "_").slice(0, 110); }
function compact(value, max = 2000) { const text = String(value || "").trim(); return text.length > max ? `${text.slice(0, Math.ceil(max * .64))}\n…[中间内容已压缩，原文可从加密转录恢复]…\n${text.slice(-Math.floor(max * .3))}` : text; }
function estimateTokens(value) { return (0, context_budget_1.estimateTextTokens)(value); }
function writeAtomic(file, value) {
    ensureDirs();
    const temp = `${file}.${process.pid}.${Date.now()}.${crypto.randomBytes(2).toString("hex")}.tmp`;
    if (fs.existsSync(file)) {
        try {
            fs.copyFileSync(file, `${file}.bak`);
        }
        catch { }
    }
    fs.writeFileSync(temp, typeof value === "string" ? value : JSON.stringify(value, null, 2), "utf-8");
    fs.renameSync(temp, file);
}
function sleepSync(ms) {
    const buffer = new SharedArrayBuffer(4);
    Atomics.wait(new Int32Array(buffer), 0, 0, ms);
}
function acquireGlobalAgentMemorySelfTestLock(label = "global-memory-selftest", options = {}) {
    ensureDirs();
    const timeoutMs = Math.max(500, Number(options.timeoutMs || options.timeout_ms || 30_000));
    const staleMs = Math.max(timeoutMs, Number(options.staleMs || options.stale_ms || 120_000));
    const startedAt = Date.now();
    const payload = () => JSON.stringify({
        schema: "ccm-global-agent-memory-selftest-lock-v1",
        label,
        pid: process.pid,
        acquiredAt: now(),
    }, null, 2);
    while (Date.now() - startedAt < timeoutMs) {
        try {
            const fd = fs.openSync(SELFTEST_LOCK_FILE, "wx");
            fs.writeFileSync(fd, payload(), "utf-8");
            fs.closeSync(fd);
            let released = false;
            return () => {
                if (released)
                    return;
                released = true;
                try {
                    const lock = readJson(SELFTEST_LOCK_FILE, {});
                    if (Number(lock.pid || 0) === process.pid)
                        fs.rmSync(SELFTEST_LOCK_FILE, { force: true });
                }
                catch {
                    try {
                        fs.rmSync(SELFTEST_LOCK_FILE, { force: true });
                    }
                    catch { }
                }
            };
        }
        catch {
            try {
                const stat = fs.statSync(SELFTEST_LOCK_FILE);
                if (Date.now() - stat.mtimeMs > staleMs)
                    fs.rmSync(SELFTEST_LOCK_FILE, { force: true });
            }
            catch { }
            sleepSync(50);
        }
    }
    throw new Error(`Global Agent memory selftest lock timeout: ${label}`);
}
function globalAgentMemorySelftestMatch(value) {
    const text = typeof value === "string" ? value : JSON.stringify(value || {});
    if (!text)
        return { contaminated: false, sentinels: [], hasSelftestSource: false };
    const sentinels = [...new Set([...text.matchAll(/\b[A-Z][A-Z0-9_]{4,}_SENTINEL\b/g)].map(match => match[0]))].slice(0, 12);
    const hasSelftestSource = /"source"\s*:\s*"self-?test"|source['"]?\s*:\s*['"]self-?test|selftest/i.test(text);
    return {
        contaminated: sentinels.length > 0 || hasSelftestSource,
        sentinels,
        hasSelftestSource,
    };
}
function globalAgentMemoryScanFiles(options = {}) {
    const includeResidue = options.includeResidue !== false && options.include_residue !== false;
    const files = [
        { file: exports.GLOBAL_AGENT_MEMORY_FILE, role: "active", active: true },
        { file: `${exports.GLOBAL_AGENT_MEMORY_FILE}.bak`, role: "active_backup", active: true },
    ];
    if (includeResidue) {
        try {
            for (const name of fs.readdirSync(MEMORY_DIR)) {
                if (!/^memory\.(?:json\..*\.tmp|selftest-polluted-|bak-before-)/.test(name))
                    continue;
                const file = path.join(MEMORY_DIR, name);
                if (files.some(item => item.file === file))
                    continue;
                files.push({ file, role: "residue", active: false });
            }
        }
        catch { }
    }
    return files;
}
function scanGlobalAgentMemorySelfTestContamination(options = {}) {
    const rows = [];
    const files = globalAgentMemoryScanFiles(options).map(meta => {
        const exists = fs.existsSync(meta.file);
        if (!exists)
            return { ...meta, exists, contaminated: false, sentinelCount: 0, hasSelftestSource: false, bytes: 0 };
        const text = (() => { try {
            return fs.readFileSync(meta.file, "utf-8");
        }
        catch {
            return "";
        } })();
        const parsed = (() => { try {
            return JSON.parse(text);
        }
        catch {
            return null;
        } })();
        const match = globalAgentMemorySelftestMatch(text);
        if (match.contaminated) {
            const memory = parsed && typeof parsed === "object" ? parsed : {};
            const addRow = (kind, entry, index) => {
                const entryMatch = globalAgentMemorySelftestMatch(entry);
                if (!entryMatch.contaminated)
                    return;
                rows.push({
                    file: meta.file,
                    role: meta.role,
                    active: meta.active,
                    kind,
                    index,
                    id: entry?.id || entry?.sessionId || entry?.archiveId || "",
                    source: entry?.source?.source || entry?.source || "",
                    sentinels: entryMatch.sentinels,
                    has_selftest_source: entryMatch.hasSelftestSource,
                    preview: compact(JSON.stringify(entry || {}).replace(/\s+/g, " "), 420),
                });
            };
            for (const key of [...MEMORY_ITEM_KEYS, "sessions", "archives"]) {
                const entries = Array.isArray(memory[key]) ? memory[key] : [];
                entries.forEach((entry, index) => addRow(key, entry, index));
            }
            if (!rows.some(row => row.file === meta.file)) {
                rows.push({
                    file: meta.file,
                    role: meta.role,
                    active: meta.active,
                    kind: "file",
                    index: 0,
                    id: "",
                    source: "",
                    sentinels: match.sentinels,
                    has_selftest_source: match.hasSelftestSource,
                    preview: compact(text.replace(/\s+/g, " "), 420),
                });
            }
        }
        return {
            ...meta,
            exists,
            contaminated: match.contaminated,
            sentinelCount: match.sentinels.length,
            hasSelftestSource: match.hasSelftestSource,
            bytes: Buffer.byteLength(text, "utf-8"),
        };
    });
    const activeRows = rows.filter(row => row.active);
    const residueRows = rows.filter(row => !row.active);
    const status = activeRows.length ? "fail" : residueRows.length ? "warn" : "ok";
    return {
        schema: "ccm-global-agent-memory-selftest-contamination-scan-v1",
        generatedAt: now(),
        file: exports.GLOBAL_AGENT_MEMORY_FILE,
        status,
        pass: activeRows.length === 0,
        active_contamination_count: activeRows.length,
        residue_contamination_count: residueRows.length,
        contamination_count: rows.length,
        contaminated_file_count: files.filter(file => file.contaminated).length,
        files,
        rows: rows.slice(0, Number(options.limit || 80)),
    };
}
function archiveGlobalAgentMemorySelfTestResidues(options = {}) {
    const dryRun = options.dryRun === true || options.dry_run === true;
    const reason = String(options.reason || "").trim();
    const actor = String(options.actor || "local-user").trim() || "local-user";
    if (!dryRun && !reason)
        throw new Error("归档 Global Agent 记忆自测残留前必须填写 reason");
    const release = acquireGlobalAgentMemorySelfTestLock("archive-global-memory-selftest-residue");
    try {
        const rawFiles = Array.isArray(options.files || options.file)
            ? (options.files || options.file)
            : (options.files || options.file ? [options.files || options.file] : []);
        const selectedFileList = rawFiles.map((value) => String(value || "").trim()).filter(Boolean);
        const selectedFiles = new Set(selectedFileList);
        const selectedBasenames = new Set(selectedFileList.map((file) => path.basename(file)));
        const scanBefore = scanGlobalAgentMemorySelfTestContamination({ includeResidue: true, limit: options.limit || 200 });
        const residueFiles = scanBefore.files
            .filter((file) => file.exists && file.contaminated && file.active !== true && file.role === "residue")
            .filter((file) => !selectedFiles.size || selectedFiles.has(file.file) || selectedBasenames.has(path.basename(file.file)));
        const archived = [];
        const skipped = [];
        for (const row of residueFiles) {
            const file = path.resolve(row.file);
            if (!pathInside(MEMORY_DIR, file)) {
                skipped.push({ file: row.file, reason: "outside_memory_dir" });
                continue;
            }
            if (!fs.existsSync(file)) {
                skipped.push({ file: row.file, reason: "missing" });
                continue;
            }
            const text = fs.readFileSync(file, "utf-8");
            const match = globalAgentMemorySelftestMatch(text);
            if (!match.contaminated) {
                skipped.push({ file: row.file, reason: "not_contaminated" });
                continue;
            }
            const archiveName = `${cleanId(path.basename(file))}-${sha(file, 10)}-${Date.now().toString(36)}.json`;
            const target = path.join(SELFTEST_RESIDUE_ARCHIVE_DIR, archiveName);
            if (!pathInside(SELFTEST_RESIDUE_ARCHIVE_DIR, target)) {
                skipped.push({ file: row.file, reason: "unsafe_archive_target" });
                continue;
            }
            const item = {
                file,
                archiveFile: target,
                bytes: Buffer.byteLength(text, "utf-8"),
                sentinels: match.sentinels,
                dryRun,
            };
            if (!dryRun) {
                fs.mkdirSync(SELFTEST_RESIDUE_ARCHIVE_DIR, { recursive: true });
                fs.renameSync(file, target);
            }
            archived.push(item);
        }
        const scanAfter = dryRun ? scanBefore : scanGlobalAgentMemorySelfTestContamination({ includeResidue: true, limit: options.limit || 200 });
        const result = {
            schema: "ccm-global-agent-memory-selftest-residue-archive-v1",
            dryRun,
            reason,
            actor,
            archiveDir: SELFTEST_RESIDUE_ARCHIVE_DIR,
            selectedCount: selectedFiles.size,
            archivedCount: archived.length,
            skippedCount: skipped.length,
            archived,
            skipped,
            before: {
                active_contamination_count: scanBefore.active_contamination_count,
                residue_contamination_count: scanBefore.residue_contamination_count,
            },
            after: {
                active_contamination_count: scanAfter.active_contamination_count,
                residue_contamination_count: scanAfter.residue_contamination_count,
            },
        };
        if (!dryRun) {
            (0, memory_control_center_1.recordMemoryOperation)({
                action: "archive_selftest_residue",
                scope: "global",
                scopeId: "global-agent",
                actor,
                reason,
                archivedCount: archived.length,
                skippedCount: skipped.length,
                archiveDir: SELFTEST_RESIDUE_ARCHIVE_DIR,
            });
        }
        return result;
    }
    finally {
        release();
    }
}
function runGlobalAgentMemorySelfTestResidueArchiveSelfTest() {
    const testFile = path.join(MEMORY_DIR, `memory.selftest-polluted-phase73-${process.pid}-${Date.now().toString(36)}.json`);
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
    fs.writeFileSync(testFile, JSON.stringify({
        version: 1,
        scope: "global",
        id: "global-agent",
        user: [{
                id: "gmi_phase73_residue_archive",
                text: "GLOBAL_AGENT_MEMORY_RESIDUE_ARCHIVE_SENTINEL: residue archive selftest",
                source: { source: "selftest" },
            }],
    }, null, 2), "utf-8");
    let archiveFile = "";
    try {
        const before = scanGlobalAgentMemorySelfTestContamination({ includeResidue: true });
        const dryRun = archiveGlobalAgentMemorySelfTestResidues({
            dryRun: true,
            files: [testFile],
            reason: "selftest dry-run",
            actor: "selftest",
        });
        const existsAfterDryRun = fs.existsSync(testFile);
        const archived = archiveGlobalAgentMemorySelfTestResidues({
            files: [testFile],
            reason: "selftest archive",
            actor: "selftest",
        });
        archiveFile = archived.archived?.[0]?.archiveFile || "";
        const after = scanGlobalAgentMemorySelfTestContamination({ includeResidue: true });
        const checks = {
            beforeDetectsResidue: before.rows?.some((row) => row.file === testFile && row.active === false),
            dryRunDoesNotMoveFile: dryRun.dryRun === true && existsAfterDryRun && dryRun.archivedCount === 1,
            archiveMovesOnlyResidue: archived.dryRun === false && archived.archivedCount === 1 && !fs.existsSync(testFile) && !!archiveFile && fs.existsSync(archiveFile),
            activeMemoryStillClean: after.active_contamination_count === 0,
            residueNoLongerIncludesTestFile: !after.rows?.some((row) => row.file === testFile),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            archived: { archiveFile, archivedCount: archived.archivedCount, skippedCount: archived.skippedCount },
        };
    }
    finally {
        try {
            if (fs.existsSync(testFile))
                fs.rmSync(testFile, { force: true });
        }
        catch { }
        try {
            if (archiveFile && fs.existsSync(archiveFile))
                fs.rmSync(archiveFile, { force: true });
        }
        catch { }
    }
}
function runGlobalAgentMemorySelfTestIsolationSelfTest() {
    const before = scanGlobalAgentMemorySelfTestContamination({ includeResidue: false });
    const release = acquireGlobalAgentMemorySelfTestLock("global-memory-isolation-selftest");
    const previousMain = fs.existsSync(exports.GLOBAL_AGENT_MEMORY_FILE) ? fs.readFileSync(exports.GLOBAL_AGENT_MEMORY_FILE, "utf-8") : null;
    const previousBak = fs.existsSync(`${exports.GLOBAL_AGENT_MEMORY_FILE}.bak`) ? fs.readFileSync(`${exports.GLOBAL_AGENT_MEMORY_FILE}.bak`, "utf-8") : null;
    try {
        writeAtomic(exports.GLOBAL_AGENT_MEMORY_FILE, {
            ...emptyMemory(),
            user: [{
                    id: "gmi_selftest_isolation_sentinel",
                    type: "user",
                    text: "GLOBAL_AGENT_MEMORY_ISOLATION_SENTINEL: this test data must not survive sandbox restore.",
                    importance: 1,
                    confidence: 1,
                    createdAt: now(),
                    updatedAt: now(),
                    source: { source: "selftest", sessionId: "isolation-selftest", messageIds: ["isolation-selftest"] },
                }],
        });
        const polluted = scanGlobalAgentMemorySelfTestContamination({ includeResidue: false });
        const checksBeforeRestore = {
            detectsActivePollution: polluted.pass === false
                && polluted.active_contamination_count >= 1
                && JSON.stringify(polluted.rows || []).includes("GLOBAL_AGENT_MEMORY_ISOLATION_SENTINEL"),
            lockFileExists: fs.existsSync(SELFTEST_LOCK_FILE),
            startedCleanOrWarnOnly: before.active_contamination_count === 0,
        };
        return {
            pass: Object.values(checksBeforeRestore).every(Boolean),
            checks: checksBeforeRestore,
            polluted: { status: polluted.status, active: polluted.active_contamination_count },
        };
    }
    finally {
        try {
            if (previousMain === null)
                fs.rmSync(exports.GLOBAL_AGENT_MEMORY_FILE, { force: true });
            else
                fs.writeFileSync(exports.GLOBAL_AGENT_MEMORY_FILE, previousMain, "utf-8");
            if (previousBak === null)
                fs.rmSync(`${exports.GLOBAL_AGENT_MEMORY_FILE}.bak`, { force: true });
            else
                fs.writeFileSync(`${exports.GLOBAL_AGENT_MEMORY_FILE}.bak`, previousBak, "utf-8");
        }
        catch { }
        release();
    }
}
function readJson(file, fallback) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return fallback;
    }
}
function getEncryptionKey() {
    ensureDirs();
    for (const file of [KEY_FILE, `${KEY_FILE}.bak`]) {
        if (!fs.existsSync(file))
            continue;
        const key = Buffer.from(fs.readFileSync(file, "utf-8").trim(), "base64");
        if (key.length === 32) {
            if (file.endsWith(".bak"))
                fs.copyFileSync(file, KEY_FILE);
            return key;
        }
    }
    const key = crypto.randomBytes(32);
    fs.writeFileSync(KEY_FILE, key.toString("base64"), { encoding: "utf-8", mode: 0o600 });
    fs.copyFileSync(KEY_FILE, `${KEY_FILE}.bak`);
    return key;
}
function encryptJson(value) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf-8"), cipher.final()]);
    return { version: 1, algorithm: "aes-256-gcm", iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: encrypted.toString("base64") };
}
function decryptJson(value) {
    if (!value?.iv || !value?.tag || !value?.data)
        throw new Error("加密转录格式无效");
    const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(value.iv, "base64"));
    decipher.setAuthTag(Buffer.from(value.tag, "base64"));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.data, "base64")), decipher.final()]).toString("utf-8"));
}
function getGlobalAgentTranscriptFile(sessionId) { return path.join(TRANSCRIPT_DIR, `${cleanId(sessionId)}-${sha(String(sessionId || "default"), 12)}.enc.json`); }
function transcriptFile(sessionId) { return getGlobalAgentTranscriptFile(sessionId); }
function pathInside(parent, child) {
    const relative = path.relative(path.resolve(parent), path.resolve(child));
    return !!relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}
function normalizeMessage(message, sessionId, source = "global-agent") {
    const role = message?.role === "assistant" ? "assistant" : "user";
    const content = String(message?.content || "").slice(0, 100_000);
    const timestamp = message?.timestamp || now();
    const id = String(message?.id || message?.messageId || `gam_${sha([sessionId, role, content, timestamp], 24)}`);
    return { id, role, content, timestamp, source: message?.source || source, traceId: message?.trace_id || message?.traceId || "", missionId: message?.mission_id || message?.missionId || "" };
}
function loadGlobalAgentTranscript(sessionId) {
    const file = transcriptFile(sessionId);
    for (const candidate of [file, `${file}.bak`]) {
        try {
            if (!fs.existsSync(candidate))
                continue;
            const transcript = decryptJson(readJson(candidate, null));
            return { version: 2, sessionId, source: transcript.source || "global-agent", messages: Array.isArray(transcript.messages) ? transcript.messages : [], executionMessages: (0, session_execution_ledger_1.normalizeSessionExecutionEvents)(transcript.executionMessages || transcript.execution_messages), updatedAt: transcript.updatedAt || "", storageRecovery: candidate.endsWith(".bak") ? { recoveredFromBackup: true, recoveredAt: now() } : null };
        }
        catch { }
    }
    return { version: 2, sessionId, source: "global-agent", messages: [], executionMessages: [], updatedAt: "", storageRecovery: null };
}
function saveTranscript(transcript) {
    const file = transcriptFile(transcript.sessionId);
    writeAtomic(file, encryptJson(transcript));
    return file;
}
function globalExecutionForMessages(transcript, messages) {
    return (0, session_execution_ledger_1.eventsAnchoredToMessages)((0, session_execution_ledger_1.normalizeSessionExecutionEvents)(transcript.executionMessages), messages);
}
function appendGlobalAgentExecutionEvent(sessionIdInput, event) {
    const sessionId = String(sessionIdInput || "").trim();
    if (!sessionId)
        return null;
    const transcript = loadGlobalAgentTranscript(sessionId);
    const events = (0, session_execution_ledger_1.normalizeSessionExecutionEvents)(transcript.executionMessages);
    const eventType = String(event?.type || "");
    const type = eventType === "tool_started" ? "tool_use" : "tool_result";
    if (!["tool_started", "tool_completed", "tool_failed", "clarification_required"].includes(eventType))
        return null;
    const toolName = String(event?.tool || event?.toolName || "tool");
    const runId = String(event?.runId || event?.run_id || "");
    const toolCallId = type === "tool_result"
        ? (String(event?.toolCallId || event?.tool_call_id || "") || (0, session_execution_ledger_1.findPendingToolCallId)(events, runId, toolName))
        : String(event?.toolCallId || event?.tool_call_id || "");
    const anchor = [...transcript.messages].reverse().find((message) => message?.role === "user") || transcript.messages.at(-1) || null;
    const created = (0, session_execution_ledger_1.createSessionExecutionEvent)({
        type,
        toolName,
        toolCallId,
        runId,
        traceId: String(event?.traceId || event?.trace_id || ""),
        anchorMessageId: String(event?.anchorMessageId || event?.anchor_message_id || anchor?.id || ""),
        status: ["tool_failed", "clarification_required"].includes(eventType) ? "error" : type === "tool_use" ? "running" : "ok",
        timestamp: event?.timestamp || event?.at || now(),
        payload: type === "tool_use"
            ? { arguments: event?.arguments || {}, risk: event?.risk || "", confirmed: event?.confirmed === true }
            : { observation: event?.observation ?? null, error: event?.error || event?.question || "", duration_ms: event?.duration_ms || 0, confirmed: event?.confirmed === true },
    });
    if (!events.some(item => item.id === created.id))
        events.push(created);
    transcript.executionMessages = events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    transcript.updatedAt = now();
    saveTranscript(transcript);
    return created;
}
function emptyMemory() {
    return {
        version: 1,
        scope: "global",
        id: "global-agent",
        user: [], feedback: [], authorization: [], decisions: [], missions: [], unresolved: [], references: [],
        sessions: [],
        archives: [],
        compaction: { boundaryVersion: 1, totalCompactions: 0, consecutiveFailures: 0, health: "healthy", boundaries: [] },
        privacy: { rejectedCandidates: 0, encryptedTranscripts: true, lastScanAt: "" },
        integrity: { pass: true, corruptedArchives: [] },
        updatedAt: "",
    };
}
function loadGlobalAgentMemory(options = {}) {
    const candidates = [exports.GLOBAL_AGENT_MEMORY_FILE, `${exports.GLOBAL_AGENT_MEMORY_FILE}.bak`];
    for (const file of candidates) {
        try {
            if (!fs.existsSync(file))
                continue;
            const memory = { ...emptyMemory(), ...JSON.parse(fs.readFileSync(file, "utf-8")) };
            for (const key of MEMORY_ITEM_KEYS)
                memory[key] = Array.isArray(memory[key]) ? memory[key] : [];
            memory.sessions = Array.isArray(memory.sessions) ? memory.sessions : [];
            memory.archives = Array.isArray(memory.archives) ? memory.archives : [];
            const corrupted = memory.archives.filter((archive) => archive.checksum !== sha(archive.records || [], 40) || archive.summaryChecksum !== sha(archive.summary || {}, 40)).map((archive) => archive.id);
            memory.integrity = { pass: corrupted.length === 0, corruptedArchives: corrupted };
            if (file.endsWith(".bak"))
                memory.storageRecovery = { recoveredFromBackup: true, recoveredAt: now() };
            if (options.recover !== false && file.endsWith(".bak"))
                writeAtomic(exports.GLOBAL_AGENT_MEMORY_FILE, memory);
            return memory;
        }
        catch { }
    }
    return emptyMemory();
}
function saveMemory(memory) {
    memory.updatedAt = now();
    writeAtomic(exports.GLOBAL_AGENT_MEMORY_FILE, memory);
    return memory;
}
function globalSessionCompactionState(session, sessionId) {
    const state = (0, session_compaction_core_1.normalizeSessionCompactionState)(session?.compaction || session || {}, {
        scope: "global",
        sessionId,
    });
    if (state.activeSummary && !isTrustedGlobalSummarySource(globalSessionSummarySource(session))) {
        return {
            ...state,
            activeSummary: null,
            activeSummaryChecksum: "",
            previousSummaryChecksum: "",
            lastCompactedIndex: -1,
            lastCompactedMessageId: "",
            preservedRecentMessageIds: [],
            preservedRecentTokens: 0,
            preservedRecentTextMessageCount: 0,
            latestProviderUsage: null,
            boundaryGeneration: 0,
        };
    }
    return state;
}
function globalSessionSummarySource(session) {
    return String(session?.summarySource || session?.summary_source || session?.compaction?.summarySource || session?.compaction?.summary_source || "").toLowerCase();
}
function isTrustedGlobalSummarySource(source) {
    return ["model", "session_memory", "session-memory"].includes(String(source || "").toLowerCase());
}
function canonicalGlobalSessionSummary(session, state) {
    return isTrustedGlobalSummarySource(globalSessionSummarySource(session))
        ? (state?.activeSummary || session?.summary || null)
        : null;
}
function bindTrustedGlobalSourceBoundary(summary, sourceMessageIds) {
    if (!summary || typeof summary !== "object" || Array.isArray(summary))
        return summary;
    return { ...summary, sourceMessageIds: [...sourceMessageIds] };
}
function dedupeGlobalPendingRequest(messages, value) {
    if (value == null || value === "")
        return null;
    const content = typeof value === "string" ? value : String(value?.content || JSON.stringify(value));
    const last = messages.at(-1);
    if (String(last?.role || "") === "user" && String(last?.content || "") === content)
        return null;
    return typeof value === "string" ? { role: "user", content } : value;
}
function replaceGlobalSession(memory, sessionId, next) {
    const index = memory.sessions.findIndex((item) => item.sessionId === sessionId);
    if (index >= 0)
        memory.sessions[index] = next;
    else
        memory.sessions.push(next);
    return next;
}
function pruneDeletedGlobalWebSessionMemory(activeSessionIds) {
    const active = new Set((Array.isArray(activeSessionIds) ? activeSessionIds : []).map(String).filter(Boolean));
    const memory = loadGlobalAgentMemory();
    const removed = (memory.sessions || [])
        .filter((session) => String(session.source || "web") === "web" && !active.has(String(session.sessionId || "")))
        .map((session) => String(session.sessionId || ""))
        .filter(Boolean);
    if (!removed.length)
        return { removed: [], transcriptFilesRemoved: 0 };
    const removedSet = new Set(removed);
    memory.sessions = (memory.sessions || []).filter((session) => !removedSet.has(String(session.sessionId || "")));
    memory.archives = (memory.archives || []).filter((archive) => !removedSet.has(String(archive.sessionId || "")));
    let transcriptFilesRemoved = 0;
    for (const sessionId of removed) {
        for (const file of [transcriptFile(sessionId), `${transcriptFile(sessionId)}.bak`]) {
            if (!fs.existsSync(file))
                continue;
            fs.rmSync(file, { force: true });
            transcriptFilesRemoved += 1;
        }
    }
    saveMemory(memory);
    (0, memory_control_center_1.recordMemoryOperation)({ action: "global_web_session_prune", scope: "global", scopeId: "global-agent", removedSessionIds: removed, transcriptFilesRemoved });
    return { removed, transcriptFilesRemoved };
}
function recordGlobalAgentSessionProviderUsage(sessionId, input = {}) {
    const exactSessionId = String(sessionId || "").trim();
    if (!exactSessionId)
        return null;
    const memory = loadGlobalAgentMemory();
    const session = memory.sessions.find((item) => item.sessionId === exactSessionId) || { sessionId: exactSessionId };
    const state = globalSessionCompactionState(session, exactSessionId);
    const transcript = loadGlobalAgentTranscript(exactSessionId);
    const floorIndex = state.lastCompactedIndex + 1;
    const unsummarized = transcript.messages.slice(floorIndex);
    const anchorMessageId = String(input.anchorMessageId || input.anchor_message_id || "");
    const anchorIndex = anchorMessageId ? unsummarized.findIndex((message) => String(message?.id || "") === anchorMessageId) : -1;
    const visibleMessages = anchorIndex >= 0 ? unsummarized.slice(0, anchorIndex) : unsummarized;
    const modelVisibleMessages = (0, session_execution_ledger_1.mergeConversationWithExecution)(visibleMessages, globalExecutionForMessages(transcript, visibleMessages));
    const currentRequest = dedupeGlobalPendingRequest(visibleMessages, input.currentRequest || input.current_request);
    const config = (0, group_orchestrator_config_1.loadOrchestratorConfig)();
    const suppliedPayload = input.modelVisiblePayload || input.model_visible_payload || null;
    const payload = suppliedPayload?.schema === "ccm-model-visible-payload-snapshot-v1" ? suppliedPayload : (0, session_compaction_core_1.buildModelVisiblePayloadSnapshot)({
        scope: "global",
        sessionId: exactSessionId,
        system: globalFixedContext(memory, config, { fixedContext: input.fixedContext || input.fixed_context }),
        tools: input.tools || null,
        activeSummary: state.activeSummary || null,
        recentMessages: modelVisibleMessages,
        currentRequest,
        recoveryContext: input.recoveryContext || input.recovery_context || null,
        hookResults: input.hookResults || input.hook_results || [],
        contextComponents: input.contextComponents || input.context_components || undefined,
    });
    const usage = (0, session_compaction_core_1.normalizeSessionProviderUsage)({
        ...(input || {}),
        scope: "global",
        sessionId: exactSessionId,
        boundaryGeneration: state.boundaryGeneration,
        payloadChecksum: input.payloadChecksum || input.payload_checksum || payload.payloadChecksum,
        fixedContextChecksum: input.fixedContextChecksum || input.fixed_context_checksum || payload.fixedContextChecksum,
        estimatedFixedTokens: input.estimatedFixedTokens || input.estimated_fixed_tokens || (0, session_compaction_core_1.modelVisibleFixedTokens)(payload),
        estimatedContextTokens: input.estimatedContextTokens || input.estimated_context_tokens || payload.totalTokens,
        estimatedPayloadTokens: input.estimatedPayloadTokens || input.estimated_payload_tokens || payload.totalTokens,
    });
    const measurementUsage = usage || state.latestProviderUsage;
    const tokenMeasurement = (0, session_compaction_core_1.measureSessionContextTokens)({
        scope: "global",
        sessionId: exactSessionId,
        messages: modelVisibleMessages,
        activeSummary: state.activeSummary,
        latestProviderUsage: measurementUsage,
        provider: String(measurementUsage?.provider || ""),
        model: String(measurementUsage?.model || ""),
        generation: Number(measurementUsage?.generation || 0),
        boundaryGeneration: state.boundaryGeneration,
        modelVisiblePayload: payload,
    });
    const nextState = {
        ...state,
        latestProviderUsage: measurementUsage || null,
        tokenMeasurement,
        modelVisiblePayload: (0, session_compaction_core_1.modelVisiblePayloadAccounting)(payload),
        modelVisiblePayloadChecksum: payload.payloadChecksum,
        fixedContextChecksum: payload.fixedContextChecksum,
        pendingRequestChecksum: payload.pendingRequestChecksum,
        recoveryContextTokens: payload.tokenBreakdown.recoveryContext,
        hookResultTokens: payload.tokenBreakdown.hookResults,
    };
    replaceGlobalSession(memory, exactSessionId, { ...session, sessionId: exactSessionId, compaction: nextState });
    saveMemory(memory);
    return usage;
}
function loadPolicy() {
    return { version: 1, disabled: false, blockedPatterns: [], ...(readJson(POLICY_FILE, {})) };
}
function setGlobalAgentMemoryPolicy(input) {
    const policy = loadPolicy();
    if (input.disabled !== undefined)
        policy.disabled = input.disabled === true;
    if (Array.isArray(input.blockedPatterns))
        policy.blockedPatterns = input.blockedPatterns.map((value) => String(value).slice(0, 200)).filter(Boolean).slice(0, 50);
    policy.updatedAt = now();
    writeAtomic(POLICY_FILE, policy);
    (0, memory_control_center_1.recordMemoryOperation)({ action: "policy_update", scope: "global", scopeId: "global-agent", actor: input.actor || "local-user", reason: input.reason || "", disabled: policy.disabled, blockedPatternCount: policy.blockedPatterns.length });
    return policy;
}
function containsSensitiveData(text) {
    const patterns = [
        /\b(?:sk|rk|pk)-[a-z0-9_-]{12,}\b/i,
        /\bBearer\s+[a-z0-9._~+\/-]{12,}/i,
        /(?:api[_-]?key|app[_-]?secret|client[_-]?secret|password|passwd|token)\s*[:=]\s*["']?[^\s"']{6,}/i,
        /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
    ];
    return patterns.some(pattern => pattern.test(text));
}
function shouldRejectCandidate(text) {
    const policy = loadPolicy();
    if (policy.disabled || containsSensitiveData(text))
        return true;
    if (policy.blockedPatterns.some((pattern) => { try {
        return new RegExp(pattern, "i").test(text);
    }
    catch {
        return text.toLowerCase().includes(pattern.toLowerCase());
    } }))
        return true;
    const value = text.trim();
    if (value.length < 8 || value.length > 5000)
        return true;
    if (/^[\s\p{P}\p{S}]*$/u.test(value))
        return true;
    return false;
}
function candidate(type, text, message, sessionId, options = {}) {
    const normalized = compact(text.replace(/\s+/g, " "), 1800);
    if (shouldRejectCandidate(normalized))
        return null;
    const createdAt = message.timestamp || now();
    const taxonomy = (0, durable_memory_taxonomy_1.ccDurableMemoryTaxonomyReceipt)(type, {
        content: normalized,
        accepted: true,
        sourceKind: "confirmed_user_message",
    });
    return {
        id: `gmi_${sha([type, normalized.toLowerCase()], 24)}`,
        type,
        text: normalized,
        why: compact(options.why || "", 800),
        howToApply: compact(options.howToApply || "", 800),
        importance: Math.max(1, Math.min(100, Number(options.importance || 60))),
        confidence: Math.max(0, Math.min(1, Number(options.confidence ?? .82))),
        createdAt,
        updatedAt: createdAt,
        source: {
            sessionId,
            messageIds: [...new Set([message.id, ...(Array.isArray(options.evidenceMessageIds) ? options.evidenceMessageIds : [])].map(String).filter(Boolean))].slice(0, 40),
            source: message.source || "global-agent",
            timestamp: createdAt,
            traceId: message.traceId || "",
            missionId: message.missionId || "",
        },
        expiresAt: options.expiresAt,
        ccMemoryType: taxonomy.type,
        taxonomy,
        extractionSource: options.extractionSource || "legacy_unverified",
        evidenceMessageIds: Array.isArray(options.evidenceMessageIds) ? options.evidenceMessageIds.map(String).filter(Boolean).slice(0, 40) : [],
        semanticStatus: options.semanticStatus || (options.extractionSource === "model_semantic" || options.extractionSource === "structured_event" || options.extractionSource === "manual" ? "confirmed" : "legacy_unverified"),
        semanticDecisionReceipt: options.semanticDecisionReceipt || null,
    };
}
function extractGlobalMemoryCandidates(messages, sessionId) {
    const sourceIds = new Set(messages.map(message => String(message?.id || "")).filter(Boolean));
    const memory = loadGlobalAgentMemory();
    const candidates = MEMORY_ITEM_KEYS.flatMap(key => Array.isArray(memory[key]) ? memory[key] : [])
        .filter((item) => item?.semanticStatus === "confirmed")
        .filter((item) => String(item?.source?.sessionId || "") === String(sessionId || ""))
        .filter((item) => {
        const evidenceIds = [
            ...(Array.isArray(item?.evidenceMessageIds) ? item.evidenceMessageIds : []),
            ...(Array.isArray(item?.source?.messageIds) ? item.source.messageIds : []),
        ].map(String).filter(Boolean);
        return evidenceIds.some(id => sourceIds.has(id));
    });
    return { candidates, rejected: 0, mode: "confirmed_semantic_facts" };
}
function upsertItems(memory, items) {
    let created = 0;
    let updated = 0;
    for (const item of items) {
        const list = Array.isArray(memory[item.type]) ? memory[item.type] : [];
        const index = list.findIndex((existing) => existing.id === item.id);
        if (index >= 0) {
            const priorMessageIds = new Set(list[index].source?.messageIds || []);
            const hasNewEvidence = (item.source.messageIds || []).some(id => !priorMessageIds.has(id));
            if (hasNewEvidence)
                updated += 1;
            list[index] = {
                ...list[index],
                updatedAt: item.updatedAt,
                importance: Math.max(Number(list[index].importance || 0), item.importance),
                confidence: Math.max(Number(list[index].confidence || 0), item.confidence),
                source: { ...list[index].source, messageIds: [...new Set([...(list[index].source?.messageIds || []), ...(item.source.messageIds || [])])].slice(-20) },
                extractionSource: item.extractionSource || list[index].extractionSource,
                evidenceMessageIds: [...new Set([...(list[index].evidenceMessageIds || []), ...(item.evidenceMessageIds || [])])].slice(-40),
                semanticStatus: item.semanticStatus || list[index].semanticStatus,
                semanticDecisionReceipt: item.semanticDecisionReceipt || list[index].semanticDecisionReceipt || null,
            };
        }
        else {
            list.push(item);
            created += 1;
        }
        const controlled = (0, memory_control_center_1.applyMemoryControls)("global", "global-agent", { ...memory, [item.type]: list })?.[item.type] || [];
        const pinnedIds = new Set(controlled.filter((entry) => entry.memoryControl?.pinned).map((entry) => entry.id));
        const pinned = list.filter((entry) => pinnedIds.has(entry.id));
        const recent = list.filter((entry) => !pinnedIds.has(entry.id)).sort((a, b) => String(a.updatedAt).localeCompare(String(b.updatedAt))).slice(-Math.max(0, MAX_ITEMS_PER_TYPE - pinned.length));
        memory[item.type] = [...recent, ...pinned].slice(-MAX_ITEMS_PER_TYPE);
    }
    return { created, updated };
}
function buildSegmentSummary(messages, candidates) {
    const users = messages.filter(item => item.role === "user" && item.hidden_execution !== true);
    const assistant = messages.filter(item => item.role === "assistant" && item.hidden_execution !== true);
    const executionResults = messages.filter(item => item.type === "tool_result" || (item.hidden_execution === true && item.role === "user"));
    const errors = messages.filter(item => item?.structuredStatus === "failed" || item?.structuredStatus === "blocked").slice(-8);
    const paths = [...new Set(messages.flatMap(item => String(item.content || "").match(/(?:[A-Za-z]:\\[^\s"'<>|]+|\/?(?:[\w.-]+\/){1,8}[\w.-]+\.[A-Za-z0-9]{1,8})/g) || []))].slice(-30);
    const missionIds = [...new Set(messages.flatMap(item => [item.missionId, ...(String(item.content || "").match(/\b(?:mission|mq)[-_a-z0-9]{6,}\b/gi) || [])]).filter(Boolean))].slice(-20);
    const byType = (type) => candidates.filter(item => item.type === type).map(item => item.text).slice(-8);
    return {
        primaryRequest: compact(users.at(-1)?.content || "", 1200),
        userRequests: users.slice(-12).map(item => `#${item.id} ${compact(item.content, 700)}`),
        keyOutcomes: [
            ...assistant.slice(-10).map(item => `#${item.id} ${compact(item.content, 700)}`),
            ...executionResults.slice(-12).map(item => `#${item.id} ${compact(item.content, 900)}`),
        ].slice(-20),
        userAnchors: byType("user"),
        feedback: byType("feedback"),
        authorization: byType("authorization"),
        decisions: byType("decisions"),
        references: byType("references"),
        unresolved: [...byType("unresolved"), ...errors.map(item => compact(item.content, 600))].slice(-12),
        errors: errors.map(item => `#${item.id} ${compact(item.content, 600)}`),
        filesAndResources: paths,
        missionIds,
        latestOutcome: compact(assistant.at(-1)?.content || "", 1200),
        sourceMessageIds: messages.map(item => item.id),
    };
}
function calculateGlobalMessagesToKeepIndex(messages, options = {}) {
    return (0, session_memory_window_1.calculateSessionMemoryKeepWindow)(messages, { floorIndex: options.floorIndex });
}
function buildMicroCompactRecords(messages) {
    return messages.map((message) => {
        const content = String(message?.content || "");
        const compacted = (0, context_budget_1.microCompactText)(content, 8000);
        if (!compacted.compacted)
            return null;
        return {
            messageId: message.id,
            originalChars: compacted.original_chars,
            compactedChars: compacted.compacted_chars,
            tokensBefore: compacted.tokens_before,
            tokensAfter: compacted.tokens_after,
            contentHash: sha(content, 40),
        };
    }).filter(Boolean);
}
function globalFixedContext(memory, config, options = {}) {
    return options.fixedContext || {
        scope: "global_only",
        model: config?.model || "",
        policy: memory?.privacy || null,
        longTermMemory: Object.fromEntries(MEMORY_ITEM_KEYS.map(key => [key, (memory?.[key] || []).slice(-12)])),
    };
}
function normalizeGlobalModelSummary(value, sourceMessageIds) {
    const list = (input, maxItems, maxChars = 1200) => (Array.isArray(input) ? input : [])
        .map(item => compact(item, maxChars))
        .filter(Boolean)
        .slice(-maxItems);
    return {
        primaryRequest: compact(value?.primaryRequest, 1600),
        userRequests: list(value?.userRequests, 20),
        keyOutcomes: list(value?.keyOutcomes, 20),
        userAnchors: list(value?.userAnchors, 16),
        feedback: list(value?.feedback, 16),
        authorization: list(value?.authorization, 16),
        decisions: list(value?.decisions, 20),
        references: list(value?.references, 24),
        unresolved: list(value?.unresolved, 20),
        errors: list(value?.errors, 16),
        filesAndResources: list(value?.filesAndResources, 40, 500),
        missionIds: list(value?.missionIds, 24, 300),
        latestOutcome: compact(value?.latestOutcome, 1600),
        sourceMessageIds: [...sourceMessageIds],
    };
}
function validateGlobalModelSummary(summary, reference, sourceMessageIds, context = {}) {
    const issues = [];
    if (!summary || typeof summary !== "object" || Array.isArray(summary))
        issues.push("summary_not_object");
    if (sourceMessageIds.length && !String(summary?.primaryRequest || summary?.latestOutcome || "").trim())
        issues.push("summary_core_empty");
    const actualIds = Array.isArray(summary?.sourceMessageIds) ? summary.sourceMessageIds.map(String) : [];
    if (actualIds.length !== sourceMessageIds.length || actualIds.some((id, index) => id !== sourceMessageIds[index]))
        issues.push("source_boundary_mismatch");
    for (const key of ["userAnchors", "feedback", "authorization", "decisions", "references", "unresolved"]) {
        const preserved = (Array.isArray(summary?.[key]) ? summary[key] : []).map(String);
        for (const anchor of reference?.[key] || [])
            if (!preserved.includes(String(anchor)))
                issues.push(`${key}_anchor_missing`);
    }
    const quality = (0, session_summary_quality_gate_1.evaluateSessionSummaryQuality)({
        scope: "global",
        sessionId: String(context.sessionId || "global-session"),
        summary,
        reference,
        previousSummary: context.previousSummary,
        sourceMessages: context.sourceMessages,
        sourceMessageIds,
    });
    issues.push(...quality.issues);
    return { valid: issues.length === 0, issues: [...new Set(issues)], quality };
}
function commitGlobalAgentSessionCompaction(sessionId, options = {}) {
    const transcript = loadGlobalAgentTranscript(sessionId);
    const memory = loadGlobalAgentMemory();
    const session = memory.sessions.find((item) => item.sessionId === sessionId) || { sessionId, lastCompactedIndex: -1, recentMessageIds: [] };
    const state = globalSessionCompactionState(session, sessionId);
    const canonicalSummary = canonicalGlobalSessionSummary(session, state);
    if (!options.summaryOverride || !["model", "session_memory"].includes(String(options.summarySource || ""))) {
        const error = new Error("全局会话 canonical compact 必须提供已验证的模型摘要或 Session Memory");
        error.code = "GLOBAL_SESSION_CANONICAL_MODEL_SUMMARY_REQUIRED";
        throw error;
    }
    const floorIndex = state.lastCompactedIndex + 1;
    const unsummarized = transcript.messages.slice(floorIndex);
    const unsummarizedExecution = globalExecutionForMessages(transcript, unsummarized);
    const unsummarizedModelTimeline = (0, session_execution_ledger_1.mergeConversationWithExecution)(unsummarized, unsummarizedExecution);
    const config = (0, group_orchestrator_config_1.loadOrchestratorConfig)();
    const modelCapacity = (0, group_compaction_strategy_1.resolveGroupModelContextCapacity)(config);
    const threshold = (0, group_compaction_strategy_1.getGroupAutoCompactThreshold)(config);
    const triggerPayload = (0, session_compaction_core_1.buildModelVisiblePayloadSnapshot)({
        scope: "global",
        sessionId,
        system: globalFixedContext(memory, config, options),
        tools: options.tools || null,
        activeSummary: canonicalSummary,
        recentMessages: unsummarizedModelTimeline,
        currentRequest: options.currentRequest || null,
        recoveryContext: options.recoveryContext || null,
        hookResults: [],
        contextComponents: options.contextComponents,
    });
    const tokenMeasurement = (0, session_compaction_core_1.measureSessionContextTokens)({
        scope: "global",
        sessionId,
        messages: unsummarizedModelTimeline,
        activeSummary: canonicalSummary,
        latestProviderUsage: state.latestProviderUsage,
        provider: String(state.latestProviderUsage?.provider || ""),
        model: String(state.latestProviderUsage?.model || config?.model || ""),
        generation: Number(state.latestProviderUsage?.generation || 0),
        boundaryGeneration: state.boundaryGeneration,
        modelVisiblePayload: triggerPayload,
    });
    const tokenCount = tokenMeasurement.activeTokens;
    if (!options.force && tokenCount < threshold) {
        return { compacted: false, reason: "below_threshold", tokenCount, messageCount: unsummarized.length, memory, tokenMeasurement };
    }
    if ((0, session_compaction_core_1.sessionCompactionCircuitOpen)(state) && !options.force) {
        return { compacted: false, reason: "circuit_breaker", tokenCount, messageCount: unsummarized.length, memory };
    }
    try {
        const recentWindow = (0, session_memory_window_1.calculateSessionMemoryKeepWindow)(transcript.messages, {
            floorIndex,
            lastSummarizedMessageId: String(state.sessionMemoryState?.lastExtractedMessageId || ""),
        });
        const keepStart = recentWindow.startIndex;
        const segment = transcript.messages.slice(Number(session.lastCompactedIndex || -1) + 1, keepStart);
        if (segment.length === 0)
            return { compacted: false, reason: "nothing_to_compact", tokenCount, messageCount: unsummarized.length, memory };
        const segmentExecution = globalExecutionForMessages(transcript, segment);
        const segmentModelTimeline = (0, session_execution_ledger_1.mergeConversationWithExecution)(segment, segmentExecution);
        const extracted = extractGlobalMemoryCandidates(segment, sessionId);
        const expectedSourceMessageIds = segmentModelTimeline.map((item) => String(item.id));
        if (options.expectedSourceMessageIds && (options.expectedSourceMessageIds.length !== expectedSourceMessageIds.length
            || options.expectedSourceMessageIds.some((id, index) => id !== expectedSourceMessageIds[index])))
            throw new Error("全局 Agent 会话在模型摘要期间发生变化，请重试压缩");
        const summary = normalizeGlobalModelSummary(options.summaryOverride, expectedSourceMessageIds);
        const microCompactRecords = buildMicroCompactRecords(segmentModelTimeline);
        const keptMessages = transcript.messages.slice(keepStart);
        const keptExecution = globalExecutionForMessages(transcript, keptMessages);
        const keptModelTimeline = (0, session_execution_ledger_1.mergeConversationWithExecution)(keptMessages, keptExecution);
        const recentTokenCount = keptModelTimeline.reduce((sum, item) => sum + estimateTokens(item.content), 0);
        const postCompactPayload = options.modelVisiblePayload || (0, session_compaction_core_1.buildModelVisiblePayloadSnapshot)({
            scope: "global",
            sessionId,
            system: globalFixedContext(memory, config, options),
            tools: options.tools || null,
            activeSummary: summary,
            recentMessages: keptModelTimeline,
            currentRequest: options.currentRequest || null,
            recoveryContext: options.recoveryContext || null,
            hookResults: options.modelMetadata?.hookResults?.sessionStart || [],
            contextComponents: options.contextComponents,
        });
        const postCompactTokenCount = postCompactPayload.totalTokens;
        const postCompactGate = {
            ...(0, session_compaction_core_1.buildSessionPostCompactGate)({ modelVisiblePayload: postCompactPayload, threshold }),
            formalRecompaction: options.modelMetadata?.formalRecompaction || null,
        };
        if (postCompactGate.providerCallAllowed !== true) {
            const error = new Error(`全局 Agent 会话压缩后仍超过阈值：${postCompactTokenCount}/${threshold}`);
            error.code = "GLOBAL_SESSION_POST_COMPACT_THRESHOLD_EXCEEDED";
            error.postCompactGate = postCompactGate;
            throw error;
        }
        const contextBudget = (0, context_budget_1.buildContextBudget)({
            context: {
                summary,
                recent: keptModelTimeline.map((item) => ({ id: item.id, role: item.role, content: (0, context_budget_1.microCompactText)(item.content, 1800).text })),
            },
            maxChars: 48_000,
            maxTokens: session_memory_window_1.SESSION_MEMORY_MAX_KEEP_TOKENS + COMPACT_TOKEN_THRESHOLD,
        });
        const postCompactRestore = {
            strategy: "summary_recent_anchor_reinject",
            filesAndResources: (summary.filesAndResources || []).slice(-8),
            references: (summary.references || []).slice(-8),
            missionIds: (summary.missionIds || []).slice(-8),
            sourceMessageIds: (summary.sourceMessageIds || []).slice(-12),
            recentMessageIds: keptModelTimeline.slice(-12).map((item) => item.id),
        };
        const boundaryMarker = (0, session_compaction_core_1.buildSessionCompactionBoundaryMarker)({
            scope: "global",
            sessionId,
            generation: state.boundaryGeneration + 1,
            summarizedThroughMessageId: segment.at(-1)?.id || "",
            previousSummaryChecksum: state.activeSummaryChecksum || (canonicalSummary ? sha(canonicalSummary, 40) : ""),
            preservedMessageIds: keptModelTimeline.map((item) => String(item.id || "")),
        });
        const archive = {
            id: `gma_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`,
            sessionId,
            fromIndex: state.lastCompactedIndex + 1,
            toIndex: keepStart - 1,
            from: segment[0]?.timestamp || "",
            to: segment.at(-1)?.timestamp || "",
            count: segmentModelTimeline.length,
            visibleMessageCount: segment.length,
            executionMessageCount: segmentExecution.length,
            records: segmentModelTimeline.map((item) => ({ id: item.id, role: item.role, type: item.type || "message", timestamp: item.timestamp, contentHash: sha(item.content, 40) })),
            summary,
            microCompact: {
                version: 1,
                compactedMessages: microCompactRecords,
                compactedMessageCount: microCompactRecords.length,
            },
            transcriptFile: path.basename(transcriptFile(sessionId)),
            createdAt: now(),
            reason: options.reason || "auto",
            summarySource: options.summarySource,
            model: options.modelMetadata || null,
            previousSummaryChecksum: state.activeSummaryChecksum || (canonicalSummary ? sha(canonicalSummary, 40) : ""),
            boundaryMarker,
            modelVisiblePayloadChecksum: postCompactPayload.payloadChecksum,
        };
        archive.checksum = sha(archive.records, 40);
        archive.summaryChecksum = sha(archive.summary, 40);
        archive.validation = {
            pass: archive.summary.sourceMessageIds.length === archive.records.length,
            deterministicAnchorsPreserved: true,
            summarySource: archive.summarySource,
        };
        upsertItems(memory, extracted.candidates);
        memory.archives = [...memory.archives, archive].slice(-1000);
        const nextCompaction = (0, session_compaction_core_1.resetSessionCompactionFailures)({
            ...state,
            activeSummary: summary,
            activeSummaryChecksum: sha(summary, 40),
            previousSummaryChecksum: state.activeSummaryChecksum || (canonicalSummary ? sha(canonicalSummary, 40) : ""),
            lastCompactedIndex: keepStart - 1,
            lastCompactedMessageId: segment.at(-1)?.id || "",
            preservedRecentMessageIds: keptModelTimeline.map((item) => String(item.id || "")),
            preservedRecentTokens: recentTokenCount,
            preservedRecentTextMessageCount: recentWindow.preservedTextMessageCount,
            tokenMeasurement,
            sessionMemoryState: options.modelMetadata?.sessionMemoryState ?? state.sessionMemoryState ?? null,
            postCompactGate,
            latestProviderUsage: null,
            lastCompactedAt: now(),
            boundaryGeneration: state.boundaryGeneration + 1,
            modelVisiblePayloadChecksum: postCompactPayload.payloadChecksum,
            fixedContextChecksum: postCompactPayload.fixedContextChecksum,
            pendingRequestChecksum: postCompactPayload.pendingRequestChecksum,
            boundaryMarker,
            preservedSegmentChecksum: (0, session_compaction_core_1.sessionCompactionChecksum)(keptModelTimeline.map((item) => String(item.id || ""))),
            recoveryContextTokens: postCompactPayload.tokenBreakdown.recoveryContext,
            hookResultTokens: postCompactPayload.tokenBreakdown.hookResults,
            ptlRecoveryAttempts: Number(options.modelMetadata?.promptTooLongRetries || 0),
            formalRecompaction: options.modelMetadata?.formalRecompaction || null,
        });
        const nextSession = {
            ...session,
            sessionId,
            source: transcript.source,
            summary,
            lastCompactedIndex: keepStart - 1,
            lastCompactedMessageId: segment.at(-1)?.id || "",
            recentMessageIds: transcript.messages.slice(keepStart).map((item) => item.id),
            preCompactTokenCount: tokenCount,
            postCompactTokenCount,
            lastCompactedAt: now(),
            summarySource: archive.summarySource,
            model: archive.model,
            modelVisiblePayload: postCompactPayload,
            compaction: nextCompaction,
            boundary: {
                type: "compact_boundary",
                marker: boundaryMarker,
                archiveId: archive.id,
                preCompactTokenCount: tokenCount,
                postCompactTokenCount,
                preservedFromIndex: keepStart,
                preservedMessageCount: keptMessages.length,
                preservedTokenCount: recentTokenCount,
                preservedTextMessageCount: recentWindow.preservedTextMessageCount,
                recent_window: recentWindow,
                post_compact_restore: postCompactRestore,
                formal_recompaction: options.modelMetadata?.formalRecompaction || null,
                context_budget: contextBudget,
            },
        };
        replaceGlobalSession(memory, sessionId, nextSession);
        memory.compaction = {
            ...(memory.compaction || {}),
            totalCompactions: Number(memory.compaction?.totalCompactions || 0) + 1,
            health: "healthy",
            lastCompactedAt: nextSession.lastCompactedAt,
            preCompactTokenCount: nextSession.preCompactTokenCount,
            postCompactTokenCount: nextSession.postCompactTokenCount,
            context_budget: contextBudget,
            latestSessionId: sessionId,
            latestSessionCompaction: nextCompaction,
            boundaries: [...(memory.compaction?.boundaries || []), nextSession.boundary].slice(-100),
        };
        memory.privacy = { ...(memory.privacy || {}), rejectedCandidates: Number(memory.privacy?.rejectedCandidates || 0) + extracted.rejected, encryptedTranscripts: true, lastScanAt: now() };
        saveMemory(memory);
        (0, memory_control_center_1.recordMemoryOperation)({ action: "compact", scope: "global", scopeId: "global-agent", sessionId, archiveId: archive.id, reason: options.reason || "auto", beforeTokens: nextSession.preCompactTokenCount, afterTokens: nextSession.postCompactTokenCount, rejectedCandidates: extracted.rejected });
        return { compacted: true, archive, session: nextSession, memory };
    }
    catch (error) {
        if (options.recordFailure !== false) {
            const failedState = (0, session_compaction_core_1.recordSessionCompactionFailure)(state, error);
            replaceGlobalSession(memory, sessionId, { ...session, sessionId, compaction: failedState });
            memory.compaction = { ...(memory.compaction || {}), health: "degraded", lastError: failedState.lastError, lastFailureAt: failedState.lastFailureAt, latestSessionId: sessionId };
            saveMemory(memory);
        }
        throw error;
    }
}
async function compactGlobalAgentSessionWithModel(sessionId, options = {}) {
    const exactSessionId = String(sessionId || "").trim();
    if (!exactSessionId)
        throw new Error("缺少全局 Agent 会话 ID");
    const inFlight = globalModelCompactions.get(exactSessionId);
    const customInstructions = String(options.customInstructions || "").trim();
    if (inFlight) {
        if (options.force && (!inFlight.force || customInstructions !== inFlight.customInstructions)) {
            return inFlight.promise.then(() => compactGlobalAgentSessionWithModel(exactSessionId, options));
        }
        return inFlight.promise;
    }
    const operation = (async () => {
        await (0, session_compaction_core_1.waitForScheduledSessionMemoryExtraction)("global", exactSessionId);
        const transcript = loadGlobalAgentTranscript(exactSessionId);
        const memory = loadGlobalAgentMemory();
        const session = memory.sessions.find((item) => item.sessionId === exactSessionId) || { sessionId: exactSessionId, lastCompactedIndex: -1 };
        let state = globalSessionCompactionState(session, exactSessionId);
        const storedSummarySource = globalSessionSummarySource(session);
        const legacySummaryNeedsValidation = !!session?.summary && !isTrustedGlobalSummarySource(storedSummarySource);
        const legacyBoundaryCircuit = legacySummaryNeedsValidation
            && (0, session_compaction_core_1.sessionCompactionCircuitOpen)(state)
            && /source_boundary_mismatch/i.test(String(state.lastError || ""));
        if (legacyBoundaryCircuit) {
            state = (0, session_compaction_core_1.resetSessionCompactionFailures)(state);
            replaceGlobalSession(memory, exactSessionId, { ...session, sessionId: exactSessionId, compaction: state });
            memory.compaction = { ...(memory.compaction || {}), health: "healthy", lastError: "", lastFailureAt: "", latestSessionId: exactSessionId };
            saveMemory(memory);
            (0, memory_control_center_1.recordMemoryOperation)({
                action: "repair_legacy_summary_boundary_circuit",
                scope: "global",
                scopeId: "global-agent",
                sessionId: exactSessionId,
                reason: "legacy local summary source IDs are now bound by the server",
            });
        }
        const canonicalSummary = canonicalGlobalSessionSummary(session, state);
        const floorIndex = state.lastCompactedIndex + 1;
        const unsummarized = transcript.messages.slice(floorIndex);
        const unsummarizedExecution = globalExecutionForMessages(transcript, unsummarized);
        const unsummarizedModelTimeline = (0, session_execution_ledger_1.mergeConversationWithExecution)(unsummarized, unsummarizedExecution);
        const currentRequest = dedupeGlobalPendingRequest(unsummarized, options.currentRequest);
        const config = (0, group_orchestrator_config_1.loadOrchestratorConfig)();
        const modelCapacity = (0, group_compaction_strategy_1.resolveGroupModelContextCapacity)(config);
        const autoCompactTokenLimit = (0, group_compaction_strategy_1.getGroupAutoCompactThreshold)(config);
        const triggerPayload = options.modelVisiblePayload || (0, session_compaction_core_1.buildModelVisiblePayloadSnapshot)({
            scope: "global",
            sessionId: exactSessionId,
            system: globalFixedContext(memory, config, options),
            tools: options.tools || null,
            activeSummary: canonicalSummary,
            recentMessages: unsummarizedModelTimeline,
            currentRequest,
            recoveryContext: options.recoveryContext || null,
            hookResults: [],
            contextComponents: options.contextComponents,
        });
        const tokenMeasurement = (0, session_compaction_core_1.measureSessionContextTokens)({
            scope: "global",
            sessionId: exactSessionId,
            messages: unsummarizedModelTimeline,
            activeSummary: canonicalSummary,
            latestProviderUsage: state.latestProviderUsage,
            provider: String(state.latestProviderUsage?.provider || ""),
            model: String(state.latestProviderUsage?.model || config?.model || ""),
            generation: Number(state.latestProviderUsage?.generation || 0),
            boundaryGeneration: state.boundaryGeneration,
            modelVisiblePayload: triggerPayload,
        });
        const tokenCount = options.modelVisiblePayload ? triggerPayload.totalTokens : tokenMeasurement.activeTokens;
        if (!options.force && !options.promptTooLong && tokenCount < autoCompactTokenLimit) {
            return {
                compacted: false,
                reason: "below_threshold",
                tokenCount,
                messageCount: unsummarized.length,
                autoCompactTokenLimit,
                modelContextCapacity: modelCapacity,
                legacySummaryIgnored: legacySummaryNeedsValidation,
            };
        }
        if ((0, session_compaction_core_1.sessionCompactionCircuitOpen)(state) && !options.force) {
            return { compacted: false, reason: "circuit_breaker", tokenCount, messageCount: unsummarized.length };
        }
        const recentWindow = (0, session_memory_window_1.calculateSessionMemoryKeepWindow)(transcript.messages, {
            floorIndex,
            lastSummarizedMessageId: String(state.sessionMemoryState?.lastExtractedMessageId || ""),
        });
        const keepStart = recentWindow.startIndex;
        const segment = transcript.messages.slice(floorIndex, keepStart);
        if (!segment.length)
            return { compacted: false, reason: "nothing_to_compact", tokenCount, messageCount: unsummarized.length };
        const segmentExecution = globalExecutionForMessages(transcript, segment);
        const segmentModelTimeline = (0, session_execution_ledger_1.mergeConversationWithExecution)(segment, segmentExecution);
        const extracted = extractGlobalMemoryCandidates(segment, exactSessionId);
        const previousSummary = canonicalSummary;
        const currentReference = buildSegmentSummary(segmentModelTimeline, extracted.candidates);
        const mergeList = (key, max) => [
            ...(Array.isArray(previousSummary?.[key]) ? previousSummary[key] : []),
            ...(Array.isArray(currentReference?.[key]) ? currentReference[key] : []),
        ].map(String).filter(Boolean).slice(-max);
        const reference = previousSummary ? {
            ...currentReference,
            primaryRequest: currentReference.primaryRequest || previousSummary.primaryRequest || "",
            userRequests: mergeList("userRequests", 20),
            keyOutcomes: mergeList("keyOutcomes", 20),
            userAnchors: mergeList("userAnchors", 16),
            feedback: mergeList("feedback", 16),
            authorization: mergeList("authorization", 16),
            decisions: mergeList("decisions", 20),
            references: mergeList("references", 24),
            unresolved: mergeList("unresolved", 20),
            errors: mergeList("errors", 16),
            filesAndResources: mergeList("filesAndResources", 40),
            missionIds: mergeList("missionIds", 24),
            latestOutcome: currentReference.latestOutcome || previousSummary.latestOutcome || "",
        } : currentReference;
        const sourceMessageIds = segmentModelTimeline.map((item) => String(item.id));
        const preHookResults = await (0, session_compaction_core_1.runSessionCompactionHooks)("pre_compact", {
            scope: "global",
            sessionId: exactSessionId,
            trigger: options.force ? "manual" : "auto",
            customInstructions,
            previousSummary,
            tokenMeasurement,
        });
        const hookInstructions = preHookResults.map((item) => String(item?.customInstructions || item?.custom_instructions || "")).filter(Boolean).join("\n\n");
        const effectiveInstructions = [customInstructions, hookInstructions].filter(Boolean).join("\n\n");
        const system = [
            "你是 CCM 全局 Agent 的会话压缩器。把已完成的旧对话压缩成可供后续模型直接继续工作的结构化摘要。",
            "只输出一个 JSON 对象，不要 Markdown。不得编造，不得删除授权边界、用户纠正、决策、未完成事项、错误、文件路径、任务 ID。",
            "userAnchors、feedback、authorization、decisions、references、unresolved 中的 PRESERVATION_REFERENCE 条目必须逐字保留。",
            "消息边界由服务端绑定，无需返回 sourceMessageIds。",
            "字段固定为 primaryRequest,userRequests,keyOutcomes,userAnchors,feedback,authorization,decisions,references,unresolved,errors,filesAndResources,missionIds,latestOutcome。",
        ].join("\n");
        let retryTimeline = segmentModelTimeline.map((item) => ({ id: item.id, role: item.role, type: item.type || "message", timestamp: item.timestamp, content: item.content }));
        const renderUser = () => JSON.stringify({
            sessionId: exactSessionId,
            reason: options.reason || "auto",
            customInstructions: compact(effectiveInstructions, 4000),
            previousSummary,
            previousSummaryChecksum: state.activeSummaryChecksum || (previousSummary ? sha(previousSummary, 40) : ""),
            PRESERVATION_REFERENCE: reference,
            sourceMessageIds,
            timeline: retryTimeline,
            fullTranscriptRetained: true,
        });
        const invoke = options.modelCall || (async ({ system, user, maxOutputTokens }) => (0, group_compaction_engine_1.callCompactionModel)(config, system, user, maxOutputTokens));
        let modelResult = null;
        let validation = { valid: false, issues: ["model_summary_missing"] };
        let lastError = null;
        let promptTooLongRetries = 0;
        let nextSessionMemoryState = state.sessionMemoryState || null;
        const expectedMemoryCursor = String(segment.at(-1)?.id || "");
        if (!customInstructions) {
            const reusable = (0, session_compaction_core_1.validateSessionMemoryState)(state.sessionMemoryState, {
                scope: "global",
                sessionId: exactSessionId,
                expectedLastMessageId: expectedMemoryCursor,
            });
            if (reusable.valid) {
                validation = validateGlobalModelSummary(bindTrustedGlobalSourceBoundary(reusable.summary, sourceMessageIds), reference, sourceMessageIds, {
                    sessionId: exactSessionId,
                    sourceMessages: segmentModelTimeline,
                    previousSummary,
                });
                if (validation.valid)
                    modelResult = { summary: reusable.summary, provider: state.sessionMemoryState?.provider, model: state.sessionMemoryState?.model, source: "session_memory" };
            }
        }
        for (let attempt = 1; !validation.valid && attempt <= 4; attempt += 1) {
            try {
                modelResult = await invoke({ system, user: renderUser(), maxOutputTokens: GLOBAL_COMPACTION_MODEL_MAX_OUTPUT_TOKENS, attempt, sessionId: exactSessionId });
                const candidate = bindTrustedGlobalSourceBoundary(modelResult?.summary || modelResult, sourceMessageIds);
                validation = validateGlobalModelSummary(candidate, reference, sourceMessageIds, {
                    sessionId: exactSessionId,
                    sourceMessages: segmentModelTimeline,
                    previousSummary,
                });
                if (validation.valid)
                    break;
                lastError = new Error(`模型摘要校验失败：${validation.issues.join(", ")}`);
            }
            catch (error) {
                lastError = error;
                const promptTooLong = /HTTP\s*413|prompt(?:\s+is)?\s+too\s+long|context(?:_length)?(?:\s+window)?\s*(?:exceeded|limit)|maximum context|request too large/i.test(String(error?.message || error || ""));
                if (promptTooLong && promptTooLongRetries < 3) {
                    const peeled = (0, session_memory_window_1.peelOldestApiConversationRound)(retryTimeline);
                    if (!peeled.peeled)
                        break;
                    retryTimeline = peeled.messages;
                    promptTooLongRetries += 1;
                }
            }
        }
        if (!validation.valid)
            throw lastError || new Error("全局 Agent 模型摘要不可用");
        let candidate = normalizeGlobalModelSummary(bindTrustedGlobalSourceBoundary(modelResult?.summary || modelResult, sourceMessageIds), sourceMessageIds);
        const recoveryContext = options.recoveryContext || {
            filesAndResources: candidate.filesAndResources || [],
            references: candidate.references || [],
            missionIds: candidate.missionIds || [],
            unresolved: candidate.unresolved || [],
        };
        const sessionStartHookResults = await (0, session_compaction_core_1.runSessionCompactionHooks)("session_start", {
            scope: "global",
            sessionId: exactSessionId,
            trigger: "compact",
            summary: candidate,
            previousSummary,
            recoveryContext,
        });
        const preservedVisibleMessages = transcript.messages.slice(keepStart);
        const preservedExecutionMessages = globalExecutionForMessages(transcript, preservedVisibleMessages);
        const preservedMessages = (0, session_execution_ledger_1.mergeConversationWithExecution)(preservedVisibleMessages, preservedExecutionMessages);
        const boundaryMarker = (0, session_compaction_core_1.buildSessionCompactionBoundaryMarker)({
            scope: "global",
            sessionId: exactSessionId,
            generation: state.boundaryGeneration + 1,
            summarizedThroughMessageId: segmentModelTimeline.at(-1)?.id || segment.at(-1)?.id || "",
            previousSummaryChecksum: state.activeSummaryChecksum || (previousSummary ? sha(previousSummary, 40) : ""),
            preservedMessageIds: preservedMessages.map((message) => String(message.id || "")),
        });
        const buildPostCompactPayload = async (activeSummary) => options.postCompactPayloadBuilder
            ? await options.postCompactPayloadBuilder({
                summary: activeSummary,
                preservedMessages,
                currentRequest: dedupeGlobalPendingRequest(preservedVisibleMessages, currentRequest),
                recoveryContext: { boundaryMarker, ...recoveryContext },
                hookResults: sessionStartHookResults,
                boundaryMarker,
            })
            : null;
        let builtPostCompactPayload = await buildPostCompactPayload(candidate);
        const fallbackPostCompactPayload = (activeSummary) => (0, session_compaction_core_1.buildModelVisiblePayloadSnapshot)({
            scope: "global",
            sessionId: exactSessionId,
            system: globalFixedContext(memory, config, options),
            tools: options.tools || null,
            activeSummary,
            recentMessages: preservedMessages,
            currentRequest: dedupeGlobalPendingRequest(preservedVisibleMessages, currentRequest),
            recoveryContext: { boundaryMarker, ...recoveryContext },
            hookResults: sessionStartHookResults,
            contextComponents: options.contextComponents,
        });
        let postCompactPayload = builtPostCompactPayload?.modelVisiblePayload || builtPostCompactPayload || fallbackPostCompactPayload(candidate);
        let postCompactGate = (0, session_compaction_core_1.buildSessionPostCompactGate)({ modelVisiblePayload: postCompactPayload, threshold: autoCompactTokenLimit });
        let formalRecompaction = {
            schema: "ccm-bounded-formal-recompaction-v1",
            scope: "global",
            sessionId: exactSessionId,
            attempted: false,
            maxAttempts: 1,
            initialTokens: postCompactPayload.totalTokens,
            threshold: autoCompactTokenLimit,
            status: "not_required",
        };
        if (postCompactGate.providerCallAllowed !== true) {
            formalRecompaction = { ...formalRecompaction, attempted: true, status: "running" };
            try {
                const retryResult = await invoke({
                    system: `${system}\n这是压缩后容量门禁触发的唯一一次正式重压缩。只压缩已有摘要，不添加新事实；PRESERVATION_REFERENCE 必须逐字保留。`,
                    user: JSON.stringify({
                        sessionId: exactSessionId,
                        currentSummary: candidate,
                        PRESERVATION_REFERENCE: reference,
                        sourceMessageIds,
                        target: "produce a materially shorter valid summary",
                    }),
                    maxOutputTokens: Math.min(8_000, GLOBAL_COMPACTION_MODEL_MAX_OUTPUT_TOKENS),
                    attempt: "post_compact_recompact_1",
                    sessionId: exactSessionId,
                });
                const rebound = bindTrustedGlobalSourceBoundary(retryResult?.summary || retryResult, sourceMessageIds);
                const retryValidation = validateGlobalModelSummary(rebound, reference, sourceMessageIds, {
                    sessionId: exactSessionId,
                    sourceMessages: segmentModelTimeline,
                    previousSummary,
                });
                if (!retryValidation.valid)
                    throw new Error(`正式重压缩摘要校验失败：${retryValidation.issues.join(", ")}`);
                candidate = normalizeGlobalModelSummary(rebound, sourceMessageIds);
                validation = retryValidation;
                modelResult = { ...modelResult, ...retryResult, summary: candidate, source: "model" };
                builtPostCompactPayload = await buildPostCompactPayload(candidate);
                postCompactPayload = builtPostCompactPayload?.modelVisiblePayload || builtPostCompactPayload || fallbackPostCompactPayload(candidate);
                postCompactGate = (0, session_compaction_core_1.buildSessionPostCompactGate)({ modelVisiblePayload: postCompactPayload, threshold: autoCompactTokenLimit });
                formalRecompaction = {
                    ...formalRecompaction,
                    status: postCompactGate.providerCallAllowed === true ? "passed" : "still_over_threshold",
                    finalTokens: postCompactPayload.totalTokens,
                    summaryValidated: true,
                };
            }
            catch (error) {
                formalRecompaction = { ...formalRecompaction, status: "failed", error: compact(error?.message || error, 500) };
            }
        }
        postCompactGate = { ...postCompactGate, formalRecompaction };
        if (postCompactGate.providerCallAllowed !== true) {
            const error = new Error(`全局 Agent 会话压缩后仍超过阈值：${postCompactPayload.totalTokens}/${autoCompactTokenLimit}`);
            error.code = "GLOBAL_SESSION_POST_COMPACT_THRESHOLD_EXCEEDED";
            error.postCompactGate = postCompactGate;
            throw error;
        }
        const secondaryReview = await (0, session_summary_secondary_review_1.reviewSessionSummaryIfSelected)({
            config,
            scope: "global",
            sessionId: exactSessionId,
            boundaryGeneration: state.boundaryGeneration + 1,
            summary: candidate,
            reference,
            sourceMessageIds,
            deterministicQuality: validation.quality,
        });
        const compacted = commitGlobalAgentSessionCompaction(exactSessionId, {
            force: options.force,
            reason: options.reason || "auto_model",
            summaryOverride: candidate,
            summarySource: modelResult?.source === "session_memory" ? "session_memory" : "model",
            currentRequest,
            fixedContext: globalFixedContext(memory, config, options),
            tools: options.tools || null,
            recoveryContext: { boundaryMarker, ...recoveryContext },
            modelVisiblePayload: postCompactPayload,
            modelMetadata: {
                provider: String(modelResult?.provider || ""),
                model: String(modelResult?.model || config?.model || ""),
                responseId: String(modelResult?.responseId || ""),
                usage: modelResult?.usage || null,
                autoCompactTokenLimit,
                modelContextCapacity: modelCapacity,
                tokenMeasurement,
                promptTooLongRetries,
                sessionMemoryState: nextSessionMemoryState,
                hookResults: { pre: preHookResults, sessionStart: sessionStartHookResults },
                postCompactGate,
                formalRecompaction,
                summaryQuality: validation.quality || null,
                secondaryReview,
            },
            expectedSourceMessageIds: sourceMessageIds,
            recordFailure: false,
        });
        await (0, session_compaction_core_1.runSessionCompactionHooks)("post_compact", {
            scope: "global",
            sessionId: exactSessionId,
            trigger: options.force ? "manual" : "auto",
            result: compacted,
        });
        if (Array.isArray(builtPostCompactPayload?.messages))
            compacted.preparedModelMessages = builtPostCompactPayload.messages;
        return compacted;
    })().catch(error => {
        const memory = loadGlobalAgentMemory();
        const session = memory.sessions.find((item) => item.sessionId === exactSessionId) || { sessionId: exactSessionId };
        const failedState = (0, session_compaction_core_1.recordSessionCompactionFailure)(globalSessionCompactionState(session, exactSessionId), error);
        replaceGlobalSession(memory, exactSessionId, { ...session, compaction: failedState });
        memory.compaction = { ...(memory.compaction || {}), health: "degraded", lastError: failedState.lastError, lastFailureAt: failedState.lastFailureAt, latestSessionId: exactSessionId };
        saveMemory(memory);
        throw error;
    }).finally(() => {
        if (globalModelCompactions.get(exactSessionId)?.promise === operation)
            globalModelCompactions.delete(exactSessionId);
    });
    globalModelCompactions.set(exactSessionId, {
        promise: operation,
        force: !!options.force,
        customInstructions,
        reason: String(options.reason || "auto_model"),
        startedAt: new Date().toISOString(),
    });
    return operation;
}
function scheduleGlobalAgentModelCompaction(sessionId) {
    void compactGlobalAgentSessionWithModel(sessionId, { reason: "auto_model" })
        .catch(error => console.warn(`[全局记忆] 自动模型压缩失败 (${sessionId})：${error?.message || error}`));
    return { scheduled: true, mode: "model_required", sessionId };
}
function scheduleGlobalAgentSessionMemoryExtraction(sessionId, options = {}) {
    const exactSessionId = String(sessionId || "").trim();
    if (!exactSessionId)
        return { scheduled: false, reason: "session_missing" };
    const transcript = loadGlobalAgentTranscript(exactSessionId);
    const memory = loadGlobalAgentMemory();
    const session = memory.sessions.find((item) => item.sessionId === exactSessionId) || { sessionId: exactSessionId };
    const state = globalSessionCompactionState(session, exactSessionId);
    const floorIndex = state.lastCompactedIndex + 1;
    const recentWindow = (0, session_memory_window_1.calculateSessionMemoryKeepWindow)(transcript.messages, { floorIndex });
    const keepStart = recentWindow.startIndex;
    const visibleTimeline = transcript.messages.slice(floorIndex, keepStart);
    if (!visibleTimeline.length)
        return { scheduled: false, reason: "no_compactable_messages" };
    const timelineExecution = globalExecutionForMessages(transcript, visibleTimeline);
    const timeline = (0, session_execution_ledger_1.mergeConversationWithExecution)(visibleTimeline, timelineExecution);
    const cadence = (0, session_compaction_core_1.evaluateSessionMemoryCadence)((0, session_execution_ledger_1.mergeConversationWithExecution)(transcript.messages.slice(0, keepStart), globalExecutionForMessages(transcript, transcript.messages.slice(0, keepStart))), state.sessionMemoryState || {});
    if (!cadence.shouldExtract)
        return { scheduled: false, reason: cadence.reason, cadence };
    const extracted = extractGlobalMemoryCandidates(visibleTimeline, exactSessionId);
    const currentReference = buildSegmentSummary(timeline, extracted.candidates);
    const previousSummary = state.sessionMemoryState?.summary || state.activeSummary || null;
    const mergeList = (key, max) => [
        ...(Array.isArray(previousSummary?.[key]) ? previousSummary[key] : []),
        ...(Array.isArray(currentReference?.[key]) ? currentReference[key] : []),
    ].map(String).filter(Boolean).slice(-max);
    const reference = previousSummary ? {
        ...currentReference,
        primaryRequest: currentReference.primaryRequest || previousSummary.primaryRequest || "",
        userRequests: mergeList("userRequests", 20),
        keyOutcomes: mergeList("keyOutcomes", 20),
        userAnchors: mergeList("userAnchors", 16),
        feedback: mergeList("feedback", 16),
        authorization: mergeList("authorization", 16),
        decisions: mergeList("decisions", 20),
        references: mergeList("references", 24),
        unresolved: mergeList("unresolved", 20),
        errors: mergeList("errors", 16),
        filesAndResources: mergeList("filesAndResources", 40),
        missionIds: mergeList("missionIds", 24),
        latestOutcome: currentReference.latestOutcome || previousSummary.latestOutcome || "",
    } : currentReference;
    const sourceMessageIds = timeline.map((item) => String(item.id || ""));
    const config = (0, group_orchestrator_config_1.loadOrchestratorConfig)();
    const system = [
        "你是 CCM 全局 Agent 的 Session Memory 提取器。只输出 JSON，不要 Markdown，不得编造。",
        "必须保留授权、用户纠正、决定、未完成事项、错误、文件路径、任务 ID 和 sourceMessageIds。",
    ].join("\n");
    const user = JSON.stringify({
        sessionId: exactSessionId,
        previousSummary,
        preservationReference: reference,
        sourceMessageIds,
        timeline,
    });
    const identity = {
        boundaryGeneration: state.boundaryGeneration,
        cursorMessageId: String(timeline.at(-1)?.id || ""),
        transcriptLastMessageId: String(transcript.messages.at(-1)?.id || ""),
        transcriptChecksum: (0, session_compaction_core_1.sessionCompactionChecksum)([
            ...transcript.messages.map((message) => [message.id, message.role, message.content]),
            ...(0, session_execution_ledger_1.normalizeSessionExecutionEvents)(transcript.executionMessages).map(message => [message.id, message.type, message.toolCallId, message.payload]),
        ]),
        cadence: { ...cadence, sourceLastMessageId: String(timeline.at(-1)?.id || ""), sourceMessageIds },
    };
    const invoke = options.modelCall || ((request) => (0, group_compaction_engine_1.callCompactionModel)(config, request.system, request.user, request.maxOutputTokens));
    const scheduled = (0, session_compaction_core_1.scheduleSessionMemoryExtraction)({
        scope: "global",
        sessionId: exactSessionId,
        identity,
        extract: () => invoke({ system, user, maxOutputTokens: GLOBAL_COMPACTION_MODEL_MAX_OUTPUT_TOKENS, sessionMemory: true }),
        commit: async (raw, expected) => {
            const latestTranscript = loadGlobalAgentTranscript(exactSessionId);
            const latestMemory = loadGlobalAgentMemory();
            const latestSession = latestMemory.sessions.find((item) => item.sessionId === exactSessionId) || { sessionId: exactSessionId };
            const latestState = globalSessionCompactionState(latestSession, exactSessionId);
            if (latestState.boundaryGeneration !== expected.boundaryGeneration
                || String(latestTranscript.messages.at(-1)?.id || "") !== expected.transcriptLastMessageId
                || (0, session_compaction_core_1.sessionCompactionChecksum)([
                    ...latestTranscript.messages.map((message) => [message.id, message.role, message.content]),
                    ...(0, session_execution_ledger_1.normalizeSessionExecutionEvents)(latestTranscript.executionMessages).map(message => [message.id, message.type, message.toolCallId, message.payload]),
                ]) !== expected.transcriptChecksum) {
                return { committed: false, reason: "stale_identity" };
            }
            const candidate = raw?.summary || raw;
            const validation = validateGlobalModelSummary(bindTrustedGlobalSourceBoundary(candidate, sourceMessageIds), reference, sourceMessageIds, {
                sessionId: exactSessionId,
                sourceMessages: timeline,
                previousSummary: state.activeSummary,
            });
            if (!validation.valid)
                throw new Error(`全局 Session Memory 校验失败：${validation.issues.join(", ")}`);
            const summary = normalizeGlobalModelSummary(candidate, sourceMessageIds);
            const sessionMemoryState = (0, session_compaction_core_1.buildSessionMemoryState)({
                scope: "global",
                sessionId: exactSessionId,
                summary,
                cadence: expected.cadence,
                provider: raw?.provider,
                model: raw?.model || config.model,
            });
            const extraction = { status: "committed", startedAt: scheduled.startedAt, completedAt: now() };
            replaceGlobalSession(latestMemory, exactSessionId, {
                ...latestSession,
                sessionId: exactSessionId,
                compaction: { ...latestState, sessionMemoryState, sessionMemoryExtraction: extraction },
            });
            saveMemory(latestMemory);
            return { committed: true, sessionMemoryState };
        },
    });
    if (scheduled.scheduled) {
        const extraction = { status: "in_flight", startedAt: scheduled.startedAt, identity };
        replaceGlobalSession(memory, exactSessionId, {
            ...session,
            sessionId: exactSessionId,
            compaction: { ...state, sessionMemoryExtraction: extraction },
        });
        saveMemory(memory);
    }
    return { ...scheduled, cadence };
}
async function extractGlobalLongTermMemoryWithModel(sessionId) {
    const exactSessionId = String(sessionId || "").trim();
    const transcript = loadGlobalAgentTranscript(exactSessionId);
    const memory = loadGlobalAgentMemory();
    const session = memory.sessions.find((item) => item.sessionId === exactSessionId) || { sessionId: exactSessionId };
    const cursor = String(session?.longTermMemoryExtraction?.cursorMessageId || "");
    const cursorIndex = cursor ? transcript.messages.findIndex((item) => String(item.id || "") === cursor) : -1;
    const sourceMessages = transcript.messages
        .slice(cursorIndex + 1)
        .filter((item) => item.hidden_execution !== true && ["user", "assistant"].includes(String(item.role || "")));
    if (!sourceMessages.length || sourceMessages.at(-1)?.role !== "assistant" || !sourceMessages.some((item) => item.role === "user")) {
        return { scheduled: false, reason: "complete_turn_not_ready" };
    }
    const batch = sourceMessages.slice(0, 24);
    while (batch.length && batch.at(-1)?.role !== "assistant")
        batch.pop();
    if (!batch.length || !batch.some((item) => item.role === "user"))
        return { scheduled: false, reason: "complete_turn_not_ready" };
    const bounded = batch.map((item) => ({ id: String(item.id || ""), role: String(item.role || ""), content: String(item.content || "") }));
    const byId = new Map(bounded.map(item => [item.id, item]));
    const result = await (0, semantic_decision_runtime_1.runSemanticDecision)({
        kind: "memory_extraction",
        identity: { scope: "global", scopeId: "global-agent", sessionId: exactSessionId },
        system: [
            "你是 CCM 全局 Agent 长期记忆提取器。只保存用户明确表达、跨会话仍有价值的事实、偏好、授权边界、决定、引用和未完成事项。",
            "普通问答、一次性请求、助手猜测和过程文本必须 ignore。纠正旧信息时使用 supersede。不能按关键词机械分类。",
            "每个非 ignore 候选必须引用精确 message ID 和该消息中的逐字短证据。",
            "只输出 JSON：{\"candidates\":[{\"type\":\"user|feedback|authorization|decisions|unresolved|references\",\"operation\":\"add|update|supersede|ignore\",\"text\":\"规范事实\",\"evidenceMessageIds\":[],\"evidenceQuotes\":[],\"confidence\":0.0,\"applicableScope\":\"global-agent\",\"supersedes\":[]}]}",
        ].join("\n"),
        input: { messages: bounded },
        maxTokens: 2_400,
        validate: value => {
            const rows = Array.isArray(value?.candidates) ? value.candidates : [];
            const allowedTypes = new Set(["user", "feedback", "authorization", "decisions", "unresolved", "references"]);
            const allowedOperations = new Set(["add", "update", "supersede", "ignore"]);
            const candidates = rows.slice(0, 30).map((row) => {
                const type = String(row?.type || "");
                const operation = String(row?.operation || "");
                const text = compact(row?.text, 1_800);
                const evidenceMessageIds = Array.isArray(row?.evidenceMessageIds || row?.evidence_message_ids) ? (row.evidenceMessageIds || row.evidence_message_ids).map(String).filter(Boolean).slice(0, 20) : [];
                const evidenceQuotes = Array.isArray(row?.evidenceQuotes || row?.evidence_quotes) ? (row.evidenceQuotes || row.evidence_quotes).map((item) => compact(item, 500)).filter(Boolean).slice(0, 20) : [];
                if (!allowedTypes.has(type) || !allowedOperations.has(operation))
                    throw new Error("global_memory_semantic_candidate_invalid");
                if (operation !== "ignore") {
                    if (!text || containsSensitiveData(text) || !evidenceMessageIds.length || !evidenceQuotes.length)
                        throw new Error("global_memory_semantic_evidence_required");
                    if (evidenceMessageIds.some((id) => !byId.has(id)))
                        throw new Error("global_memory_semantic_message_scope_mismatch");
                    if (evidenceQuotes.some((quote) => !evidenceMessageIds.some((id) => String(byId.get(id)?.content || "").includes(quote))))
                        throw new Error("global_memory_semantic_quote_mismatch");
                }
                return {
                    type,
                    operation: operation,
                    text,
                    evidenceMessageIds,
                    evidenceQuotes,
                    confidence: Math.max(0, Math.min(1, Number(row?.confidence || 0))),
                    applicableScope: "global-agent",
                    supersedes: Array.isArray(row?.supersedes) ? row.supersedes.map(String).filter(Boolean).slice(0, 20) : [],
                };
            });
            return { schema: "ccm-memory-semantic-extraction-v1", candidates };
        },
    });
    const accepted = [];
    for (const row of result.value.candidates) {
        if (row.operation === "ignore" || row.confidence < 0.65)
            continue;
        if (row.operation === "supersede") {
            const removeIds = new Set(row.supersedes || []);
            for (const key of MEMORY_ITEM_KEYS)
                memory[key] = (memory[key] || []).filter((item) => !removeIds.has(String(item.id || "")));
        }
        const sourceMessage = byId.get(row.evidenceMessageIds[0]);
        const item = candidate(row.type, row.text, {
            id: row.evidenceMessageIds[0],
            timestamp: new Date().toISOString(),
            source: "global-agent-model-semantic",
        }, exactSessionId, {
            confidence: row.confidence,
            importance: row.type === "authorization" ? 96 : row.type === "feedback" ? 86 : 78,
            why: "统一模型确认该信息具有跨会话价值",
            howToApply: "使用前与当前明确指令和真实系统状态核对",
            extractionSource: "model_semantic",
            evidenceMessageIds: row.evidenceMessageIds,
            semanticStatus: "confirmed",
            semanticDecisionReceipt: result.receipt,
            sourceMessage,
        });
        if (item)
            accepted.push(item);
    }
    const upsert = upsertItems(memory, accepted);
    const nextSession = {
        ...session,
        longTermMemoryExtraction: {
            status: "committed",
            cursorMessageId: String(bounded.at(-1)?.id || ""),
            extractedAt: new Date().toISOString(),
            semanticDecisionReceipt: result.receipt,
            candidateCount: accepted.length,
        },
    };
    replaceGlobalSession(memory, exactSessionId, nextSession);
    saveMemory(memory);
    (0, memory_control_center_1.recordMemoryOperation)({ action: "model_semantic_ingest", scope: "global", scopeId: "global-agent", sessionId: exactSessionId, created: upsert.created, updated: upsert.updated, itemIds: accepted.map(item => item.id), semanticDecisionReceipt: result.receipt });
    return {
        scheduled: true,
        committed: true,
        candidates: accepted.length,
        receipt: result.receipt,
        remaining: String(bounded.at(-1)?.id || "") !== String(sourceMessages.at(-1)?.id || ""),
    };
}
function scheduleGlobalLongTermMemoryExtraction(sessionId) {
    const exactSessionId = String(sessionId || "").trim();
    const existing = globalLongTermExtractions.get(exactSessionId);
    if (existing)
        return { scheduled: false, mode: "model_semantic", reason: "already_in_flight" };
    let hasMore = false;
    const operation = (async () => {
        let result = null;
        for (let batch = 0; batch < 8; batch += 1) {
            result = await extractGlobalLongTermMemoryWithModel(exactSessionId);
            hasMore = result?.remaining === true;
            if (!result?.committed || !hasMore)
                break;
        }
        return result;
    })().catch(error => {
        const memory = loadGlobalAgentMemory();
        const session = memory.sessions.find((item) => item.sessionId === exactSessionId) || { sessionId: exactSessionId };
        replaceGlobalSession(memory, exactSessionId, {
            ...session,
            longTermMemoryExtraction: {
                ...(session.longTermMemoryExtraction || {}),
                status: "pending_retry",
                failedAt: new Date().toISOString(),
                error: compact(error?.message || error, 600),
                semanticDecisionReceipt: error?.semanticDecisionReceipt || null,
            },
        });
        saveMemory(memory);
        return { committed: false, error: compact(error?.message || error, 600) };
    }).finally(() => {
        globalLongTermExtractions.delete(exactSessionId);
        if (hasMore)
            setTimeout(() => scheduleGlobalLongTermMemoryExtraction(exactSessionId), 0);
    });
    globalLongTermExtractions.set(exactSessionId, operation);
    return { scheduled: true, mode: "model_semantic" };
}
function ingestGlobalAgentConversation(input) {
    const sessionId = String(input.sessionId || "default");
    const transcript = loadGlobalAgentTranscript(sessionId);
    transcript.source = input.source || transcript.source || "global-agent";
    const byId = new Map(transcript.messages.map((item) => [item.id, item]));
    let assistantAdded = false;
    for (const raw of input.messages || []) {
        const message = normalizeMessage(raw, sessionId, input.source);
        if (!message.content.trim())
            continue;
        const duplicate = [...byId.values()].reverse().find((item) => item.role === message.role && item.content === message.content && Math.abs(Date.parse(item.timestamp) - Date.parse(message.timestamp)) <= 10_000);
        if (duplicate)
            continue;
        byId.set(message.id, message);
        if (message.role === "assistant")
            assistantAdded = true;
    }
    transcript.messages = [...byId.values()].sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
    transcript.updatedAt = now();
    saveTranscript(transcript);
    const memory = loadGlobalAgentMemory();
    memory.privacy = { ...(memory.privacy || {}), encryptedTranscripts: true, lastScanAt: now() };
    const sessionIndex = memory.sessions.findIndex((item) => item.sessionId === sessionId);
    const session = { ...(sessionIndex >= 0 ? memory.sessions[sessionIndex] : {}), sessionId, source: transcript.source, messageCount: transcript.messages.length, transcriptUpdatedAt: transcript.updatedAt };
    if (sessionIndex >= 0)
        memory.sessions[sessionIndex] = session;
    else
        memory.sessions.push(session);
    saveMemory(memory);
    if (assistantAdded) {
        scheduleGlobalLongTermMemoryExtraction(sessionId);
        scheduleGlobalAgentSessionMemoryExtraction(sessionId);
    }
    const compaction = input.compact === false ? null : scheduleGlobalAgentModelCompaction(sessionId);
    return { transcript: { sessionId, messageCount: transcript.messages.length, updatedAt: transcript.updatedAt }, extracted: 0, extraction: assistantAdded ? "model_semantic_scheduled" : "awaiting_complete_turn", rejected: 0, compaction };
}
function queryTerms(text) {
    const lower = String(text || "").toLowerCase();
    const words = lower.match(/[a-z0-9_./:@-]{2,}|[\u3400-\u9fff]{2,}/g) || [];
    const chinese = (lower.match(/[\u3400-\u9fff]/g) || []).join("");
    const bigrams = Array.from({ length: Math.max(0, chinese.length - 1) }, (_, index) => chinese.slice(index, index + 2));
    return [...new Set([...words, ...bigrams])].slice(0, 200);
}
function relevanceScore(item, query) {
    const terms = queryTerms(query);
    const haystack = `${item.text || ""} ${item.why || ""} ${item.howToApply || ""}`.toLowerCase();
    const matchedTerms = terms.filter(term => haystack.includes(term));
    const hits = matchedTerms.length;
    const ageDays = Math.max(0, (Date.now() - Date.parse(item.updatedAt || item.createdAt || now())) / 86_400_000);
    const freshness = Math.max(0, 12 - Math.log2(ageDays + 1) * 2);
    const pinned = item.memoryControl?.pinned ? 100 : 0;
    const lengthPenalty = Math.min(28, Math.max(0, String(item.text || "").length - 700) / 60);
    return { score: pinned + hits * 12 + Number(item.importance || 0) * .18 + Number(item.confidence || 0) * 10 + freshness - lengthPenalty, matchedTerms };
}
function recallGlobalAgentMemory(query, options = {}) {
    const memoryPolicy = String(options.memoryPolicy || options.workflowDecision?.memoryPolicy || options.workflowDecision?.memory_policy || "use");
    if (memoryPolicy === "ignore")
        return { ignored: true, items: [], sessionSummary: null, citations: [] };
    const raw = loadGlobalAgentMemory();
    const memory = (0, memory_control_center_1.applyMemoryControls)("global", "global-agent", raw);
    const limit = Math.max(1, Math.min(12, Number(options.limit || 7)));
    const all = MEMORY_ITEM_KEYS.flatMap(key => (memory[key] || []).map((item) => ({ ...item, type: key })))
        .filter((item) => !item.expiresAt || Date.parse(item.expiresAt) > Date.now())
        .map((item) => ({ ...item, ...relevanceScore(item, query) }))
        .filter((item) => item.memoryControl?.pinned || (item.matchedTerms.length >= 2 && item.score >= 42))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    const session = options.sessionId ? memory.sessions.find((item) => item.sessionId === options.sessionId) : null;
    if (options.recordMetric !== false) {
        (0, memory_control_center_1.recordMemoryMetric)(all.length > 0 ? "recall_hit" : "recall_miss", { scope: "global", scopeId: "global-agent", sessionId: options.sessionId || "", queryHash: sha(query, 16), selected: all.map((item) => item.id) });
    }
    return {
        ignored: false,
        items: all,
        sessionSummary: session ? canonicalGlobalSessionSummary(session, globalSessionCompactionState(session, String(session.sessionId || ""))) : null,
        boundary: session?.boundary || null,
        citations: all.map((item) => ({ memoryId: item.id, type: item.type, ...item.source })),
    };
}
function buildGlobalAgentSessionContinuation(sessionId, options = {}) {
    const exactSessionId = String(sessionId || "").trim();
    if (!exactSessionId)
        return { schema: "ccm-global-session-continuation-v2", sessionId: "", summary: null, messages: [], boundary: null };
    const transcript = loadGlobalAgentTranscript(exactSessionId);
    const memory = loadGlobalAgentMemory();
    const session = memory.sessions.find((item) => item.sessionId === exactSessionId) || { sessionId: exactSessionId };
    const state = globalSessionCompactionState(session, exactSessionId);
    const canonicalSummary = canonicalGlobalSessionSummary(session, state);
    const config = (0, group_orchestrator_config_1.loadOrchestratorConfig)();
    const unified = (0, session_model_context_1.buildUnifiedSessionModelContextProjection)({
        scope: "global",
        scopeId: `global:${exactSessionId}`,
        sessionId: exactSessionId,
        messages: transcript.messages,
        executionEvents: (0, session_execution_ledger_1.normalizeSessionExecutionEvents)(transcript.executionMessages),
        canonicalSummary,
        summarySource: canonicalSummary ? globalSessionSummarySource(session) : "",
        summaryChecksum: state.activeSummaryChecksum || (canonicalSummary ? sha(canonicalSummary, 40) : ""),
        boundaryGeneration: Number(state.boundaryGeneration || 0),
        summarizedThroughIndex: Number(state.lastCompactedIndex || -1),
        lastSummarizedMessageId: String(state.sessionMemoryState?.lastExtractedMessageId || ""),
        microCompact: (0, session_model_context_1.resolveSessionModelMicroCompactPolicy)(config, {
            contextTokens: Number(state.tokenMeasurement?.activeTokens || 0),
            pressureThresholdTokens: (0, group_compaction_strategy_1.getGroupAutoCompactThreshold)(config),
        }),
    });
    if (options.persistMicroCompactReceipt === true) {
        replaceGlobalSession(memory, exactSessionId, {
            ...session,
            sessionId: exactSessionId,
            compaction: {
                ...state,
                microCompactReceipt: unified.microCompact,
                toolResultContentReplacementReceipt: unified.contentReplacement,
            },
        });
        saveMemory(memory);
    }
    return {
        ...unified,
        schema: "ccm-global-session-continuation-v2",
        sessionId: exactSessionId,
        summary: canonicalSummary,
        summaryChecksum: state.activeSummaryChecksum || (canonicalSummary ? sha(canonicalSummary, 40) : ""),
        messages: unified.visibleMessages,
        boundary: session.boundary || null,
        tokenMeasurement: state.tokenMeasurement || null,
        postCompactGate: state.postCompactGate || null,
        consecutiveFailures: state.consecutiveFailures,
    };
}
function buildGlobalAgentMemoryPacket(query, options = {}) {
    const recalled = recallGlobalAgentMemory(query, options);
    if (recalled.ignored)
        return "[全局记忆已按用户要求忽略]";
    const lines = [
        "[全局 Agent 相关记忆｜仅作历史上下文，当前系统状态优先]",
        "使用规则：记忆中提到的文件、函数、任务状态或配置可能已过期；采取行动前必须读取当前真实状态验证。",
    ];
    if (recalled.sessionSummary)
        lines.push(`当前会话压缩摘要：${compact(JSON.stringify(recalled.sessionSummary), 3000)}`);
    if (recalled.boundary) {
        const budget = recalled.boundary.context_budget || {};
        lines.push(`当前会话压缩边界：archive=${recalled.boundary.archiveId || ""}；保留 recent=${recalled.boundary.preservedMessageCount || 0} 条/${recalled.boundary.preservedTokenCount || 0} tokens；压力=${budget.pressure ?? ""}%`);
    }
    if (Array.isArray(recalled.sessionSummary?.filesAndResources) && recalled.sessionSummary.filesAndResources.length) {
        lines.push(`压缩后恢复锚点：${recalled.sessionSummary.filesAndResources.slice(-8).join("、")}`);
    }
    if (options.sessionId) {
        const continuation = buildGlobalAgentSessionContinuation(options.sessionId);
        if (continuation.messages.length)
            lines.push(`当前会话近期原文由独立连续性通道回灌：${continuation.messages.length} 条。`);
    }
    for (const item of recalled.items) {
        const source = item.source || {};
        lines.push(`- [${item.type}｜${item.id}｜${source.timestamp || item.updatedAt || ""}] ${item.text}${item.why ? `\n  Why: ${item.why}` : ""}${item.howToApply ? `\n  How to apply: ${item.howToApply}` : ""}\n  来源: session=${source.sessionId || ""}${source.missionId ? ` mission=${source.missionId}` : ""} messages=${(source.messageIds || []).join(",")}`);
    }
    return compact(lines.join("\n"), Number(options.maxChars || 12_000));
}
function recordGlobalMissionMemory(input) {
    const memory = loadGlobalAgentMemory();
    const report = input.report || {};
    const missionTerminal = ["completed", "cancelled"].includes(String(input.status || ""));
    const text = [
        `全局任务 ${input.missionId || input.mission_id || ""}：${report.summary || input.summary || input.status || ""}`,
        report.completed_content?.length ? `执行目标：${report.completed_content.map((item) => item.target || item.task_id).filter(Boolean).join("、")}` : "",
        report.files_modified?.length ? `修改文件：${report.files_modified.join("、")}` : "",
        report.verification_results?.length ? `验证：${report.verification_results.join("；")}` : "",
        report.risks?.length ? `风险：${report.risks.join("；")}` : "",
        report.remaining_items?.length ? `遗留：${report.remaining_items.join("；")}` : "",
    ].filter(Boolean).join("\n");
    const item = candidate(missionTerminal ? "missions" : "unresolved", text, { id: input.messageId || `mission:${input.missionId}`, timestamp: input.at || now(), source: input.source || "global-agent", traceId: input.traceId || "", missionId: input.missionId || "" }, input.sessionId || "global", {
        importance: input.status === "completed" ? 88 : 82,
        confidence: .98,
        why: "结构化全局 mission 交付结果",
        howToApply: "继续历史任务时先查询 mission 当前状态并验证代码与测试证据",
        extractionSource: "structured_event",
        semanticStatus: "confirmed",
        evidenceMessageIds: input.messageId ? [input.messageId] : [],
    });
    if (missionTerminal && input.missionId) {
        memory.unresolved = (memory.unresolved || []).filter((existing) => existing.source?.missionId !== input.missionId);
    }
    const upsert = item ? upsertItems(memory, [item]) : { created: 0, updated: 0 };
    saveMemory(memory);
    if (item)
        (0, memory_control_center_1.recordMemoryOperation)({ action: "mission_writeback", scope: "global", scopeId: "global-agent", missionId: input.missionId || "", status: input.status || "", itemId: item.id, created: upsert.created, updated: upsert.updated });
    return item;
}
function recordGlobalStructuredMemoryFact(input) {
    const memory = loadGlobalAgentMemory();
    const item = candidate(input.type, input.text, {
        id: input.messageId,
        timestamp: now(),
        source: input.source || "structured-event",
    }, input.sessionId, {
        importance: input.importance || 85,
        confidence: input.confidence ?? .99,
        why: input.why || "结构化系统事件",
        howToApply: input.howToApply || "继续任务前核验当前状态",
        extractionSource: "structured_event",
        semanticStatus: "confirmed",
        evidenceMessageIds: [input.messageId],
    });
    if (!item)
        return null;
    upsertItems(memory, [item]);
    saveMemory(memory);
    (0, memory_control_center_1.recordMemoryOperation)({
        action: "structured_fact_writeback",
        scope: "global",
        scopeId: "global-agent",
        sessionId: input.sessionId,
        messageId: input.messageId,
        itemId: item.id,
        type: input.type,
    });
    return item;
}
function recordGlobalDirectDispatchMemory(input) {
    const memory = loadGlobalAgentMemory();
    const task = input.task || {};
    const report = input.report || task.delivery_summary || {};
    const dispatchId = String(input.dispatchId || task.id || report.task_id || "").trim();
    const userGoal = compact(input.userGoal || task.business_goal || task.title || report.goal || "", 900);
    const changes = (report.files_modified || report.actual_file_changes || report.actual_file_change_paths || report.files || [])
        .map((item) => typeof item === "string" ? item : item?.path || item?.file || "")
        .filter(Boolean)
        .slice(0, 20);
    const verification = (report.verification_results || report.verification_executed || report.verification || [])
        .map((item) => typeof item === "string" ? item : item?.command || item?.summary || JSON.stringify(item))
        .filter(Boolean)
        .slice(0, 20);
    const risks = (report.risks || report.known_risks || report.remaining_risks || [])
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .slice(0, 10);
    const remaining = (report.remaining_items || report.next_steps || report.blockers || [])
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .slice(0, 10);
    const text = [
        `全局直派群聊主 Agent 任务 ${dispatchId || "unknown"} 已通过验收：${report.headline || report.summary || task.status_detail || task.title || "任务已完成"}`,
        userGoal ? `用户目标：${userGoal}` : "",
        task.group_id || input.groupId ? `群聊：${task.group_id || input.groupId}` : "",
        task.target_project || input.targetProject ? `主执行方：${task.target_project || input.targetProject}` : "",
        changes.length ? `修改文件：${changes.join("、")}` : "",
        verification.length ? `验证：${verification.join("；")}` : "",
        risks.length ? `风险：${risks.join("；")}` : "风险：未发现已知风险",
        remaining.length ? `遗留：${remaining.join("；")}` : "遗留：无",
    ].filter(Boolean).join("\n");
    const sourceMissionId = `global-direct:${dispatchId || sha(text, 12)}`;
    const item = candidate("missions", text, {
        id: input.messageId || `global-direct:${dispatchId || sha(text, 12)}`,
        timestamp: input.at || now(),
        source: input.source || "global-agent-direct-dispatch",
        traceId: input.traceId || task.trace_id || "",
        missionId: sourceMissionId,
    }, input.sessionId || "global", {
        importance: 90,
        confidence: .98,
        why: "全局 Agent 直接派发到群聊主 Agent 的最终交付结果",
        howToApply: "用户追问历史任务、完成状态、验证证据或继续修改时，先用这条结论定位任务，再读取当前任务/代码状态复核。",
        extractionSource: "structured_event",
        semanticStatus: "confirmed",
        evidenceMessageIds: input.messageId ? [input.messageId] : [],
    });
    const upsert = item ? upsertItems(memory, [item]) : { created: 0, updated: 0 };
    saveMemory(memory);
    if (item)
        (0, memory_control_center_1.recordMemoryOperation)({ action: "global_direct_dispatch_writeback", scope: "global", scopeId: "global-agent", sessionId: input.sessionId || "", missionId: sourceMissionId, status: "completed", itemId: item.id, created: upsert.created, updated: upsert.updated });
    return item;
}
function recordGlobalDirectDispatchRollbackMemory(input) {
    const memory = loadGlobalAgentMemory();
    const task = input.task || {};
    const report = input.report || task.delivery_summary || {};
    const dispatchId = String(input.dispatchId || task.id || report.task_id || "").trim();
    const sourceMissionId = `global-direct:${dispatchId || sha(input.messageId || input.at || now(), 12)}`;
    const userGoal = compact(input.userGoal || task.business_goal || task.title || report.goal || "", 900);
    const reason = compact(input.reason || task.rollback_reason || report.rollback_reason || "", 500);
    const rollbackCount = Array.isArray(task.rollback_results || input.rollbackResults) ? (task.rollback_results || input.rollbackResults).length : Number(input.rollbackCount || 0);
    for (const key of ["missions", "unresolved"]) {
        memory[key] = (memory[key] || []).filter((existing) => existing.source?.missionId !== sourceMissionId);
    }
    const text = [
        `全局直派群聊主 Agent 任务 ${dispatchId || "unknown"} 已安全撤销，不再视为完成或已交付。`,
        userGoal ? `用户目标：${userGoal}` : "",
        task.group_id || input.groupId ? `群聊：${task.group_id || input.groupId}` : "",
        rollbackCount ? `已恢复检查点：${rollbackCount} 个` : "",
        reason ? `撤销原因：${reason}` : "",
        "后续处理：如用户继续这个需求，必须重新读取当前代码状态、重新规划并重新验收。",
    ].filter(Boolean).join("\n");
    const item = candidate("missions", text, {
        id: input.messageId || `global-direct-rollback:${dispatchId || sha(text, 12)}`,
        timestamp: input.at || now(),
        source: input.source || "global-agent-direct-dispatch",
        traceId: input.traceId || task.trace_id || "",
        missionId: sourceMissionId,
    }, input.sessionId || "global", {
        importance: 92,
        confidence: .99,
        why: "全局直派任务的完成结论已经被安全撤销覆盖",
        howToApply: "用户追问该任务是否完成时，先说明最近一次已撤销；继续执行前读取当前系统状态，不复用已撤销交付结论。",
        extractionSource: "structured_event",
        semanticStatus: "confirmed",
        evidenceMessageIds: input.messageId ? [input.messageId] : [],
    });
    const upsert = item ? upsertItems(memory, [item]) : { created: 0, updated: 0 };
    saveMemory(memory);
    if (item)
        (0, memory_control_center_1.recordMemoryOperation)({ action: "global_direct_dispatch_rollback_writeback", scope: "global", scopeId: "global-agent", sessionId: input.sessionId || "", missionId: sourceMissionId, status: "reverted", itemId: item.id, created: upsert.created, updated: upsert.updated });
    return item;
}
function getGlobalMemoryEvidence(input) {
    const sessionIds = input.sessionId ? [input.sessionId] : loadGlobalAgentMemory().sessions.map((item) => item.sessionId);
    const matches = [];
    for (const sessionId of sessionIds) {
        const transcript = loadGlobalAgentTranscript(sessionId);
        for (const message of transcript.messages) {
            if (input.messageId && message.id !== input.messageId)
                continue;
            if (input.missionId && message.missionId !== input.missionId)
                continue;
            matches.push({ sessionId, messageId: message.id, role: message.role, content: message.content, timestamp: message.timestamp, missionId: message.missionId || "", traceId: message.traceId || "" });
            if (matches.length >= 50)
                return matches;
        }
    }
    return matches;
}
function rebuildGlobalAgentMemory(reason = "manual_rebuild", actor = "local-user") {
    const previous = loadGlobalAgentMemory();
    const rebuilt = emptyMemory();
    const transcripts = new Map();
    for (const file of fs.existsSync(TRANSCRIPT_DIR) ? fs.readdirSync(TRANSCRIPT_DIR).filter(name => name.endsWith(".enc.json")) : []) {
        let transcript;
        try {
            transcript = decryptJson(readJson(path.join(TRANSCRIPT_DIR, file), null));
        }
        catch {
            continue;
        }
        const sessionId = String(transcript.sessionId || file.replace(/\.enc\.json$/, ""));
        const existing = transcripts.get(sessionId);
        if (!existing || String(transcript.updatedAt || "") > String(existing.updatedAt || ""))
            transcripts.set(sessionId, transcript);
    }
    for (const [sessionId, transcript] of transcripts) {
        saveTranscript({ ...transcript, sessionId });
        const extracted = extractGlobalMemoryCandidates(transcript.messages, sessionId);
        upsertItems(rebuilt, extracted.candidates);
        rebuilt.privacy.rejectedCandidates += extracted.rejected;
        rebuilt.sessions.push({ sessionId, source: transcript.source, messageCount: transcript.messages.length, transcriptUpdatedAt: transcript.updatedAt });
    }
    for (const mission of previous.missions || [])
        upsertItems(rebuilt, [mission]);
    saveMemory(rebuilt);
    (0, memory_control_center_1.recordMemoryOperation)({ action: "rebuild", scope: "global", scopeId: "global-agent", actor, reason, transcriptCount: rebuilt.sessions.length });
    return loadGlobalAgentMemory();
}
function getGlobalAgentMemoryPolicy() { return loadPolicy(); }
function runGlobalAgentMemorySelfTest() {
    const releaseGlobalMemorySelftest = acquireGlobalAgentMemorySelfTestLock("global-agent-memory-selftest");
    const previousMainMemoryText = fs.existsSync(exports.GLOBAL_AGENT_MEMORY_FILE) ? fs.readFileSync(exports.GLOBAL_AGENT_MEMORY_FILE, "utf-8") : null;
    const previousBakMemoryText = fs.existsSync(`${exports.GLOBAL_AGENT_MEMORY_FILE}.bak`) ? fs.readFileSync(`${exports.GLOBAL_AGENT_MEMORY_FILE}.bak`, "utf-8") : null;
    const previousMemory = previousMainMemoryText ? JSON.parse(previousMainMemoryText) : emptyMemory();
    const id = `memory-selftest-${process.pid}-${Date.now().toString(36)}`;
    const messages = [];
    for (let index = 0; index < 90; index += 1) {
        messages.push({ role: "user", timestamp: new Date(Date.now() + index * 1000).toISOString(), content: index === 2 ? "以后全局 Agent 没有明确授权时不要直接操作项目，必须先确认" : index === 4 ? "我的 Claude Code 源码在 D:\\claude-code，以后分析压缩机制先看这里" : index === 6 ? "api_key=super-secret-value-123456" : `第 ${index} 轮普通对话，讨论全局任务连续性和记忆压缩边界。${"需要持续保留项目约束、验证证据、文件引用、失败原因和下一步。".repeat(60)}` });
        messages.push({ role: "assistant", timestamp: new Date(Date.now() + index * 1000 + 10).toISOString(), content: index === 8 ? "下一步仍需完成全局记忆控制中心的跨会话验收" : index === 12 ? `大型工具输出 ${"x".repeat(12_000)} 结束` : `已记录第 ${index} 轮上下文` });
    }
    const result = ingestGlobalAgentConversation({ sessionId: id, source: "self-test", messages, compact: false });
    const selfTestTranscript = loadGlobalAgentTranscript(id);
    const selfTestWindow = (0, session_memory_window_1.calculateSessionMemoryKeepWindow)(selfTestTranscript.messages, { floorIndex: 0 });
    const selfTestSegment = selfTestTranscript.messages.slice(0, selfTestWindow.startIndex);
    const selfTestExtracted = extractGlobalMemoryCandidates(selfTestSegment, id);
    const compacted = commitGlobalAgentSessionCompaction(id, {
        force: true,
        reason: "self-test",
        summaryOverride: buildSegmentSummary(selfTestSegment, selfTestExtracted.candidates),
        summarySource: "model",
        expectedSourceMessageIds: selfTestSegment.map((message) => String(message.id || "")),
    });
    const missionId = `mission-${id}`;
    recordGlobalMissionMemory({ missionId, sessionId: id, status: "waiting_user", report: { summary: "等待人工确认数据库迁移", remaining_items: ["确认迁移窗口"] } });
    const waitingWasStored = loadGlobalAgentMemory().unresolved.some((item) => item.source?.missionId === missionId);
    recordGlobalMissionMemory({ missionId, sessionId: id, status: "completed", report: { summary: "支付任务完成", completed_content: [{ target: "backend-api" }, { target: "frontend-app" }], files_modified: ["src/payment.ts"], verification_results: ["npm test"], risks: [], remaining_items: [] } });
    const directDispatchId = `direct-${id}`;
    recordGlobalDirectDispatchMemory({
        dispatchId: directDispatchId,
        sessionId: id,
        source: "self-test",
        task: { id: directDispatchId, title: "负责人筛选", business_goal: "给工单页面增加负责人筛选", group_id: "dev-group", target_project: "coordinator" },
        report: { headline: "负责人筛选已完成", actual_file_changes: [{ path: "frontend/app.js" }], verification_executed: ["npm test"], risks: [], remaining_items: [] },
    });
    const memory = loadGlobalAgentMemory();
    const packet = buildGlobalAgentMemoryPacket("继续之前全局 Agent 的授权边界和 Claude Code 压缩工作", { sessionId: id });
    const crossSessionPacket = buildGlobalAgentMemoryPacket("在新的会话继续之前的授权边界和 Claude Code 压缩工作", { sessionId: `${id}-new-session` });
    const directDispatchPacket = buildGlobalAgentMemoryPacket("刚才群聊主 Agent 的负责人筛选任务完成了吗", { sessionId: `${id}-direct-dispatch` });
    recordGlobalDirectDispatchRollbackMemory({
        dispatchId: directDispatchId,
        sessionId: id,
        source: "self-test",
        task: { id: directDispatchId, title: "负责人筛选", business_goal: "给工单页面增加负责人筛选", group_id: "dev-group", rollback_results: [{ checkpointId: "checkpoint-selftest" }], rollback_reason: "用户安全撤销" },
        report: { headline: "负责人筛选已撤销", reverted: true },
    });
    const rollbackMemory = loadGlobalAgentMemory();
    const directDispatchRollbackPacket = buildGlobalAgentMemoryPacket("刚才群聊主 Agent 的负责人筛选任务完成了吗", { sessionId: `${id}-direct-dispatch-rollback` });
    const ignoredPacket = buildGlobalAgentMemoryPacket("这次不要使用历史记忆，只按当前消息回答", { sessionId: `${id}-ignore` });
    const transcriptDisk = fs.readFileSync(transcriptFile(id), "utf-8");
    const archive = compacted.archive;
    const oneShotCandidates = extractGlobalMemoryCandidates([
        { role: "user", content: "这次只回答，不要执行任何操作", timestamp: now() },
        { role: "user", content: "你还记得全局 Agent 的长期授权边界吗？只说明规则，不要执行操作。", timestamp: now() },
    ], `${id}-one-shot`).candidates;
    ingestGlobalAgentConversation({ sessionId: id, source: "self-test", messages: [{ role: "assistant", content: "用于生成加密转录备份", timestamp: new Date(Date.now() + 999_999).toISOString() }], compact: false });
    fs.writeFileSync(transcriptFile(id), "{corrupted", "utf-8");
    const recoveredTranscript = loadGlobalAgentTranscript(id);
    const checks = {
        encryptedTranscriptHidesPlaintext: !transcriptDisk.includes("super-secret-value") && !transcriptDisk.includes("授权时不要"),
        losslessTranscriptRecoverable: loadGlobalAgentTranscript(id).messages.length === messages.length,
        compactBoundaryCreated: compacted.compacted === true && archive?.count > 0 && compacted.session?.boundary?.type === "compact_boundary",
        archiveIntegrityPasses: archive?.checksum === sha(archive?.records || [], 40) && archive?.summaryChecksum === sha(archive?.summary || {}, 40) && memory.integrity.pass === true,
        privacyRejectsSecret: !MEMORY_ITEM_KEYS.flatMap(key => memory[key] || []).some((item) => item.text.includes("super-secret-value")),
        oneShotInstructionDoesNotPolluteLongTerm: !oneShotCandidates.some(item => item.type === "authorization" || item.type === "feedback"),
        missionWritebackTracksAndClearsUnresolved: waitingWasStored && !memory.unresolved.some((item) => item.source?.missionId === missionId) && memory.missions.some((item) => item.source?.missionId === missionId && item.text.includes("backend-api")),
        globalDirectDispatchCompletionIsRemembered: memory.missions.some((item) => item.source?.missionId === `global-direct:${directDispatchId}` && item.text.includes("群聊主 Agent") && item.text.includes("通过验收")) && directDispatchPacket.includes("负责人筛选") && directDispatchPacket.includes("通过验收"),
        globalDirectDispatchRollbackOverridesCompletion: rollbackMemory.missions.some((item) => item.source?.missionId === `global-direct:${directDispatchId}` && item.text.includes("安全撤销") && item.text.includes("不再视为完成"))
            && !rollbackMemory.missions.some((item) => item.source?.missionId === `global-direct:${directDispatchId}` && item.text.includes("通过验收"))
            && directDispatchRollbackPacket.includes("安全撤销")
            && directDispatchRollbackPacket.includes("不再视为完成"),
        durableAuthorizationRemembered: packet.includes("没有明确授权") && packet.includes("D:\\claude-code"),
        crossSessionRecallWorks: crossSessionPacket.includes("没有明确授权") && crossSessionPacket.includes("D:\\claude-code"),
        explicitIgnoreMemoryWorks: ignoredPacket.includes("已按用户要求忽略"),
        evidenceTraceable: archive?.summary?.sourceMessageIds?.length === archive?.count,
        recentWindowPreserved: Number(compacted.session?.boundary?.preservedTokenCount || 0) >= session_memory_window_1.SESSION_MEMORY_MIN_KEEP_TOKENS
            && Number(compacted.session?.boundary?.preservedTextMessageCount || 0) >= session_memory_window_1.SESSION_MEMORY_MIN_TEXT_MESSAGES
            && Number(compacted.session?.boundary?.preservedTokenCount || 0) <= session_memory_window_1.SESSION_MEMORY_MAX_KEEP_TOKENS,
        tokenAwareBoundaryRecorded: !!compacted.session?.boundary?.context_budget && Number(compacted.session?.boundary?.preservedTokenCount || 0) > 0,
        microCompactRecordsLargeOutput: Number(archive?.microCompact?.compactedMessageCount || 0) >= 1,
        postCompactRestoreAnchorsRecorded: String(JSON.stringify(compacted.session?.boundary?.post_compact_restore || {})).includes("claude-code") && compacted.session?.boundary?.post_compact_restore?.recentMessageIds?.length > 0,
        corruptedTranscriptRecoversFromBackup: recoveredTranscript.storageRecovery?.recoveredFromBackup === true && recoveredTranscript.messages.length === messages.length,
    };
    try {
        fs.rmSync(transcriptFile(id), { force: true });
        fs.rmSync(`${transcriptFile(id)}.bak`, { force: true });
        if (previousMainMemoryText === null)
            fs.rmSync(exports.GLOBAL_AGENT_MEMORY_FILE, { force: true });
        else
            fs.writeFileSync(exports.GLOBAL_AGENT_MEMORY_FILE, previousMainMemoryText, "utf-8");
        if (previousBakMemoryText === null)
            fs.rmSync(`${exports.GLOBAL_AGENT_MEMORY_FILE}.bak`, { force: true });
        else
            fs.writeFileSync(`${exports.GLOBAL_AGENT_MEMORY_FILE}.bak`, previousBakMemoryText, "utf-8");
    }
    catch { }
    finally {
        releaseGlobalMemorySelftest();
    }
    return { pass: Object.values(checks).every(Boolean), checks, packetPreview: packet.slice(0, 1200), ingest: { extracted: result.extracted, rejected: result.rejected } };
}
function runGlobalAgentMemoryStressSelfTest() {
    const releaseGlobalMemorySelftest = acquireGlobalAgentMemorySelfTestLock("global-agent-memory-stress-selftest");
    const previousMainMemoryText = fs.existsSync(exports.GLOBAL_AGENT_MEMORY_FILE) ? fs.readFileSync(exports.GLOBAL_AGENT_MEMORY_FILE, "utf-8") : null;
    const previousBakMemoryText = fs.existsSync(`${exports.GLOBAL_AGENT_MEMORY_FILE}.bak`) ? fs.readFileSync(`${exports.GLOBAL_AGENT_MEMORY_FILE}.bak`, "utf-8") : null;
    const id = `memory-stress-${process.pid}-${Date.now().toString(36)}`;
    let totalMessages = 0;
    try {
        for (let round = 0; round < 10; round += 1) {
            const batch = [];
            for (let index = 0; index < 36; index += 1) {
                const content = round === 0 && index === 0
                    ? "以后所有全局开发任务必须等测试和合并门禁都通过后才能报告完成"
                    : `压力轮次 ${round} 消息 ${index}，跟踪跨项目目标、失败恢复、验证证据和下一步。${"持续保留项目约束、验收证据、失败原因、文件引用和后续动作。".repeat(60)}`;
                batch.push({ role: index % 2 ? "assistant" : "user", content, timestamp: new Date(Date.now() + round * 100_000 + index * 1000).toISOString() });
            }
            totalMessages += batch.length;
            ingestGlobalAgentConversation({ sessionId: id, source: "self-test", messages: batch, compact: false });
            const stressTranscript = loadGlobalAgentTranscript(id);
            const stressSession = loadGlobalAgentMemory().sessions.find((item) => item.sessionId === id) || { sessionId: id };
            const stressState = globalSessionCompactionState(stressSession, id);
            const stressWindow = (0, session_memory_window_1.calculateSessionMemoryKeepWindow)(stressTranscript.messages, { floorIndex: stressState.lastCompactedIndex + 1 });
            const stressSegment = stressTranscript.messages.slice(stressState.lastCompactedIndex + 1, stressWindow.startIndex);
            if (stressSegment.length) {
                const stressExtracted = extractGlobalMemoryCandidates(stressSegment, id);
                const currentSummary = buildSegmentSummary(stressSegment, stressExtracted.candidates);
                const previousSummary = stressState.activeSummary;
                const mergeList = (key, max) => [
                    ...(Array.isArray(previousSummary?.[key]) ? previousSummary[key] : []),
                    ...(Array.isArray(currentSummary?.[key]) ? currentSummary[key] : []),
                ].map(String).filter(Boolean).slice(-max);
                commitGlobalAgentSessionCompaction(id, {
                    force: true,
                    reason: `stress-${round}`,
                    summaryOverride: previousSummary ? {
                        ...currentSummary,
                        primaryRequest: currentSummary.primaryRequest || previousSummary.primaryRequest || "",
                        userRequests: mergeList("userRequests", 20),
                        keyOutcomes: mergeList("keyOutcomes", 20),
                        userAnchors: mergeList("userAnchors", 16),
                        feedback: mergeList("feedback", 16),
                        authorization: mergeList("authorization", 16),
                        decisions: mergeList("decisions", 20),
                        references: mergeList("references", 24),
                        unresolved: mergeList("unresolved", 20),
                        errors: mergeList("errors", 16),
                        filesAndResources: mergeList("filesAndResources", 40),
                        missionIds: mergeList("missionIds", 24),
                        latestOutcome: currentSummary.latestOutcome || previousSummary.latestOutcome || "",
                    } : currentSummary,
                    summarySource: "model",
                    expectedSourceMessageIds: stressSegment.map((message) => String(message.id || "")),
                });
            }
        }
        const memory = loadGlobalAgentMemory();
        const session = memory.sessions.find((item) => item.sessionId === id);
        const archives = memory.archives.filter((item) => item.sessionId === id);
        const transcript = loadGlobalAgentTranscript(id);
        const packet = buildGlobalAgentMemoryPacket("继续全局开发任务，什么时候才能报告完成", { sessionId: `${id}-other` });
        const boundaries = memory.compaction?.boundaries?.filter((item) => archives.some((archive) => archive.id === item.archiveId)) || [];
        const checks = {
            repeatedCompactionCreatesBoundedArchives: archives.length >= 8 && archives.length <= 10,
            boundariesMonotonicallyAdvance: boundaries.every((item, index) => index === 0 || Number(item.preservedFromIndex) > Number(boundaries[index - 1].preservedFromIndex)),
            rawTranscriptNeverLosesMessages: transcript.messages.length === totalMessages,
            archiveChecksumsRemainValid: archives.every((archive) => archive.checksum === sha(archive.records || [], 40) && archive.summaryChecksum === sha(archive.summary || {}, 40)),
            persistentRequirementSurvivesDrift: packet.includes("测试和合并门禁") && packet.includes("报告完成"),
            recentWindowRemainsBounded: Number(session?.boundary?.preservedTokenCount || 0) >= session_memory_window_1.SESSION_MEMORY_MIN_KEEP_TOKENS
                && Number(session?.boundary?.preservedTokenCount || 0) <= session_memory_window_1.SESSION_MEMORY_MAX_KEEP_TOKENS,
            circuitBreakerHealthy: Number(memory.compaction?.consecutiveFailures || 0) === 0,
        };
        return { pass: Object.values(checks).every(Boolean), checks, archives: archives.length, transcriptMessages: transcript.messages.length };
    }
    finally {
        try {
            fs.rmSync(transcriptFile(id), { force: true });
            fs.rmSync(`${transcriptFile(id)}.bak`, { force: true });
            if (previousMainMemoryText === null)
                fs.rmSync(exports.GLOBAL_AGENT_MEMORY_FILE, { force: true });
            else
                fs.writeFileSync(exports.GLOBAL_AGENT_MEMORY_FILE, previousMainMemoryText, "utf-8");
            if (previousBakMemoryText === null)
                fs.rmSync(`${exports.GLOBAL_AGENT_MEMORY_FILE}.bak`, { force: true });
            else
                fs.writeFileSync(`${exports.GLOBAL_AGENT_MEMORY_FILE}.bak`, previousBakMemoryText, "utf-8");
        }
        catch { }
        finally {
            releaseGlobalMemorySelftest();
        }
    }
}
//# sourceMappingURL=memory.js.map