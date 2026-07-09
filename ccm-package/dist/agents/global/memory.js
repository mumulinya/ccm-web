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
exports.acquireGlobalAgentMemorySelfTestLock = acquireGlobalAgentMemorySelfTestLock;
exports.scanGlobalAgentMemorySelfTestContamination = scanGlobalAgentMemorySelfTestContamination;
exports.archiveGlobalAgentMemorySelfTestResidues = archiveGlobalAgentMemorySelfTestResidues;
exports.runGlobalAgentMemorySelfTestResidueArchiveSelfTest = runGlobalAgentMemorySelfTestResidueArchiveSelfTest;
exports.runGlobalAgentMemorySelfTestIsolationSelfTest = runGlobalAgentMemorySelfTestIsolationSelfTest;
exports.loadGlobalAgentTranscript = loadGlobalAgentTranscript;
exports.loadGlobalAgentMemory = loadGlobalAgentMemory;
exports.setGlobalAgentMemoryPolicy = setGlobalAgentMemoryPolicy;
exports.extractGlobalMemoryCandidates = extractGlobalMemoryCandidates;
exports.compactGlobalAgentSession = compactGlobalAgentSession;
exports.ingestGlobalAgentConversation = ingestGlobalAgentConversation;
exports.recallGlobalAgentMemory = recallGlobalAgentMemory;
exports.buildGlobalAgentMemoryPacket = buildGlobalAgentMemoryPacket;
exports.recordGlobalMissionMemory = recordGlobalMissionMemory;
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
const utils_1 = require("../../core/utils");
const memory_control_center_1 = require("../../modules/knowledge/memory-control-center");
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
const RECENT_MESSAGES_TO_KEEP = 24;
const RECENT_MIN_TOKENS_TO_KEEP = 10_000;
const RECENT_MAX_TOKENS_TO_KEEP = 40_000;
const MAX_COMPACTION_FAILURES = 3;
const MAX_ITEMS_PER_TYPE = 300;
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
function transcriptFile(sessionId) { return path.join(TRANSCRIPT_DIR, `${cleanId(sessionId)}-${sha(String(sessionId || "default"), 12)}.enc.json`); }
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
            return { version: 1, sessionId, source: transcript.source || "global-agent", messages: Array.isArray(transcript.messages) ? transcript.messages : [], updatedAt: transcript.updatedAt || "", storageRecovery: candidate.endsWith(".bak") ? { recoveredFromBackup: true, recoveredAt: now() } : null };
        }
        catch { }
    }
    return { version: 1, sessionId, source: "global-agent", messages: [], updatedAt: "", storageRecovery: null };
}
function saveTranscript(transcript) {
    const file = transcriptFile(transcript.sessionId);
    writeAtomic(file, encryptJson(transcript));
    return file;
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
        source: { sessionId, messageIds: [message.id], source: message.source || "global-agent", timestamp: createdAt, traceId: message.traceId || "", missionId: message.missionId || "" },
        expiresAt: options.expiresAt,
    };
}
function extractGlobalMemoryCandidates(messages, sessionId) {
    const result = [];
    let rejected = 0;
    const push = (item) => item ? result.push(item) : rejected += 1;
    for (const raw of messages) {
        const message = normalizeMessage(raw, sessionId, raw.source || "global-agent");
        const text = message.content.trim();
        if (!text || containsSensitiveData(text)) {
            if (text)
                rejected += 1;
            continue;
        }
        if (message.role === "user") {
            const durableAuthorization = /(?:以后|默认|每次|始终|一律|长期|没有明确授权)|(?:全局\s*Agent).{0,50}(?:不要|不允许|必须确认|先确认|可以直接|不用确认)/i.test(text)
                && /(?:没有明确授权|不要|不允许|必须确认|先确认|可以直接|不用确认).{0,60}(?:操作|修改|删除|派发|执行|项目|任务|写入)/.test(text)
                && !/[?？]/.test(text);
            const isQuestionOrOneShot = /[?？]/.test(text)
                || /(?:这次|本次|当前|现在|临时).{0,24}(?:只|仅|不要|无需|先别)/.test(text)
                || /(?:只|仅)(?:需|需要|要)?(?:说明|回答|分析|查看|检查)|不要执行任何操作/.test(text);
            if (/(?:我是|我负责|我的职责|我主要做|我以后(?:要|会)使用|我熟悉|我不熟悉)/.test(text)) {
                push(candidate("user", text, message, sessionId, { importance: 72, why: "用于跨会话适配用户背景与工作方式", howToApply: "只在与当前问题相关时使用，不推断用户未明确表达的属性" }));
            }
            if (!durableAuthorization && !isQuestionOrOneShot && /(?:以后|默认|每次|总是|不要再|我希望|我更喜欢|我的偏好|就按这种方式)|(?:全局\s*Agent).{0,40}(?:必须|务必|优先|不要)|(?:必须|务必|优先).{0,40}(?:全局\s*Agent|回答方式|操作前|派发前|先确认)/i.test(text)) {
                push(candidate("feedback", text, message, sessionId, { importance: 86, why: "用户给出了可跨会话复用的工作方式或纠正", howToApply: "后续执行前检查是否仍适用；与当前明确指令冲突时以当前指令为准" }));
            }
            if (durableAuthorization) {
                push(candidate("authorization", text, message, sessionId, { importance: 96, confidence: .94, why: "约束全局 Agent 的操作授权边界", howToApply: "任何写操作决策前检查；高风险操作仍须当前确认" }));
            }
            if (/(?:以这个为目标|就按照这个实现|决定|目标是|下一步目标|优先实现)/.test(text)) {
                push(candidate("decisions", text, message, sessionId, { importance: 82, why: "记录跨会话仍可能影响工作的全局目标或决策", howToApply: "先与当前任务和真实系统状态核对，再用于规划" }));
            }
            if (/(?:源码|文档|资料|配置|知识库).{0,30}(?:在|路径|地址)|(?:[A-Za-z]:\\|https?:\/\/)/.test(text)) {
                push(candidate("references", text, message, sessionId, { importance: 68, why: "保存外部资源定位信息", howToApply: "使用前验证路径或资源仍存在" }));
            }
        }
    }
    return { candidates: result, rejected };
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
    const users = messages.filter(item => item.role === "user");
    const assistant = messages.filter(item => item.role === "assistant");
    const errors = messages.filter(item => /(?:错误|失败|异常|阻塞|超时|error|failed|timeout)/i.test(item.content)).slice(-8);
    const paths = [...new Set(messages.flatMap(item => String(item.content || "").match(/(?:[A-Za-z]:\\[^\s"'<>|]+|\/?(?:[\w.-]+\/){1,8}[\w.-]+\.[A-Za-z0-9]{1,8})/g) || []))].slice(-30);
    const missionIds = [...new Set(messages.flatMap(item => [item.missionId, ...(String(item.content || "").match(/\b(?:mission|mq)[-_a-z0-9]{6,}\b/gi) || [])]).filter(Boolean))].slice(-20);
    const byType = (type) => candidates.filter(item => item.type === type).map(item => item.text).slice(-8);
    return {
        primaryRequest: compact(users.at(-1)?.content || "", 1200),
        userRequests: users.slice(-12).map(item => `#${item.id} ${compact(item.content, 700)}`),
        keyOutcomes: assistant.slice(-10).map(item => `#${item.id} ${compact(item.content, 700)}`),
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
    const floorIndex = Math.max(0, Math.min(messages.length, Number(options.floorIndex || 0)));
    let startIndex = messages.length;
    let totalTokens = 0;
    let textMessages = 0;
    for (let index = messages.length - 1; index >= floorIndex; index -= 1) {
        const messageTokens = estimateTokens(messages[index]?.content || "");
        const meetsMinimum = textMessages >= RECENT_MESSAGES_TO_KEEP && totalTokens >= RECENT_MIN_TOKENS_TO_KEEP;
        if (meetsMinimum)
            break;
        if (textMessages >= 3 && totalTokens + messageTokens > RECENT_MAX_TOKENS_TO_KEEP)
            break;
        startIndex = index;
        totalTokens += messageTokens;
        if (String(messages[index]?.content || "").trim())
            textMessages += 1;
    }
    if (options.force && startIndex === floorIndex && messages.length - floorIndex > RECENT_MESSAGES_TO_KEEP && totalTokens < RECENT_MIN_TOKENS_TO_KEEP) {
        return Math.max(floorIndex, messages.length - RECENT_MESSAGES_TO_KEEP);
    }
    return startIndex;
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
function compactGlobalAgentSession(sessionId, options = {}) {
    const transcript = loadGlobalAgentTranscript(sessionId);
    const memory = loadGlobalAgentMemory();
    const session = memory.sessions.find((item) => item.sessionId === sessionId) || { sessionId, lastCompactedIndex: -1, recentMessageIds: [] };
    const unsummarized = transcript.messages.slice(Number(session.lastCompactedIndex || -1) + 1);
    const tokenCount = unsummarized.reduce((sum, item) => sum + estimateTokens(item.content), 0);
    if (!options.force && unsummarized.length < COMPACT_MESSAGE_THRESHOLD && tokenCount < COMPACT_TOKEN_THRESHOLD) {
        return { compacted: false, reason: "below_threshold", tokenCount, messageCount: unsummarized.length, memory };
    }
    if (Number(memory.compaction?.consecutiveFailures || 0) >= MAX_COMPACTION_FAILURES && !options.force) {
        return { compacted: false, reason: "circuit_breaker", tokenCount, messageCount: unsummarized.length, memory };
    }
    try {
        const floorIndex = Number(session.lastCompactedIndex || -1) + 1;
        const keepStart = calculateGlobalMessagesToKeepIndex(transcript.messages, { floorIndex, force: !!options.force });
        const segment = transcript.messages.slice(Number(session.lastCompactedIndex || -1) + 1, keepStart);
        if (segment.length === 0)
            return { compacted: false, reason: "nothing_to_compact", tokenCount, messageCount: unsummarized.length, memory };
        const extracted = extractGlobalMemoryCandidates(segment, sessionId);
        const summary = buildSegmentSummary(segment, extracted.candidates);
        const microCompactRecords = buildMicroCompactRecords(segment);
        const keptMessages = transcript.messages.slice(keepStart);
        const recentTokenCount = keptMessages.reduce((sum, item) => sum + estimateTokens(item.content), 0);
        const postCompactTokenCount = recentTokenCount + estimateTokens(JSON.stringify(summary));
        const contextBudget = (0, context_budget_1.buildContextBudget)({
            context: {
                summary,
                recent: keptMessages.map((item) => ({ id: item.id, role: item.role, content: (0, context_budget_1.microCompactText)(item.content, 1800).text })),
            },
            maxChars: 48_000,
            maxTokens: RECENT_MAX_TOKENS_TO_KEEP + COMPACT_TOKEN_THRESHOLD,
        });
        const postCompactRestore = {
            strategy: "summary_recent_anchor_reinject",
            filesAndResources: (summary.filesAndResources || []).slice(-8),
            references: (summary.references || []).slice(-8),
            missionIds: (summary.missionIds || []).slice(-8),
            sourceMessageIds: (summary.sourceMessageIds || []).slice(-12),
            recentMessageIds: keptMessages.slice(-12).map((item) => item.id),
        };
        const archive = {
            id: `gma_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`,
            sessionId,
            fromIndex: Number(session.lastCompactedIndex || -1) + 1,
            toIndex: keepStart - 1,
            from: segment[0]?.timestamp || "",
            to: segment.at(-1)?.timestamp || "",
            count: segment.length,
            records: segment.map((item) => ({ id: item.id, role: item.role, timestamp: item.timestamp, contentHash: sha(item.content, 40) })),
            summary,
            microCompact: {
                version: 1,
                compactedMessages: microCompactRecords,
                compactedMessageCount: microCompactRecords.length,
            },
            transcriptFile: path.basename(transcriptFile(sessionId)),
            createdAt: now(),
            reason: options.reason || "auto",
        };
        archive.checksum = sha(archive.records, 40);
        archive.summaryChecksum = sha(archive.summary, 40);
        archive.validation = { pass: archive.summary.sourceMessageIds.length === archive.records.length, deterministicAnchorsPreserved: true };
        upsertItems(memory, extracted.candidates);
        memory.archives = [...memory.archives, archive].slice(-1000);
        const sessionIndex = memory.sessions.findIndex((item) => item.sessionId === sessionId);
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
            boundary: {
                type: "compact_boundary",
                archiveId: archive.id,
                preCompactTokenCount: tokenCount,
                postCompactTokenCount,
                preservedFromIndex: keepStart,
                preservedMessageCount: keptMessages.length,
                preservedTokenCount: recentTokenCount,
                post_compact_restore: postCompactRestore,
                context_budget: contextBudget,
            },
        };
        if (sessionIndex >= 0)
            memory.sessions[sessionIndex] = nextSession;
        else
            memory.sessions.push(nextSession);
        memory.compaction = {
            ...(memory.compaction || {}),
            totalCompactions: Number(memory.compaction?.totalCompactions || 0) + 1,
            consecutiveFailures: 0,
            health: "healthy",
            lastCompactedAt: nextSession.lastCompactedAt,
            preCompactTokenCount: nextSession.preCompactTokenCount,
            postCompactTokenCount: nextSession.postCompactTokenCount,
            context_budget: contextBudget,
            boundaries: [...(memory.compaction?.boundaries || []), nextSession.boundary].slice(-100),
        };
        memory.privacy = { ...(memory.privacy || {}), rejectedCandidates: Number(memory.privacy?.rejectedCandidates || 0) + extracted.rejected, encryptedTranscripts: true, lastScanAt: now() };
        saveMemory(memory);
        (0, memory_control_center_1.recordMemoryOperation)({ action: "compact", scope: "global", scopeId: "global-agent", sessionId, archiveId: archive.id, reason: options.reason || "auto", beforeTokens: nextSession.preCompactTokenCount, afterTokens: nextSession.postCompactTokenCount, rejectedCandidates: extracted.rejected });
        return { compacted: true, archive, session: nextSession, memory };
    }
    catch (error) {
        memory.compaction = { ...(memory.compaction || {}), consecutiveFailures: Number(memory.compaction?.consecutiveFailures || 0) + 1, health: "degraded", lastError: error?.message || String(error), lastFailureAt: now() };
        saveMemory(memory);
        throw error;
    }
}
function ingestGlobalAgentConversation(input) {
    const sessionId = String(input.sessionId || "default");
    const transcript = loadGlobalAgentTranscript(sessionId);
    transcript.source = input.source || transcript.source || "global-agent";
    const byId = new Map(transcript.messages.map((item) => [item.id, item]));
    for (const raw of input.messages || []) {
        const message = normalizeMessage(raw, sessionId, input.source);
        if (!message.content.trim())
            continue;
        const duplicate = [...byId.values()].reverse().find((item) => item.role === message.role && item.content === message.content && Math.abs(Date.parse(item.timestamp) - Date.parse(message.timestamp)) <= 10_000);
        if (duplicate)
            continue;
        byId.set(message.id, message);
    }
    transcript.messages = [...byId.values()].sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
    transcript.updatedAt = now();
    saveTranscript(transcript);
    const extracted = extractGlobalMemoryCandidates(transcript.messages.slice(-20), sessionId);
    const memory = loadGlobalAgentMemory();
    const upsert = upsertItems(memory, extracted.candidates);
    memory.privacy = { ...(memory.privacy || {}), rejectedCandidates: Number(memory.privacy?.rejectedCandidates || 0) + extracted.rejected, encryptedTranscripts: true, lastScanAt: now() };
    const sessionIndex = memory.sessions.findIndex((item) => item.sessionId === sessionId);
    const session = { ...(sessionIndex >= 0 ? memory.sessions[sessionIndex] : {}), sessionId, source: transcript.source, messageCount: transcript.messages.length, transcriptUpdatedAt: transcript.updatedAt };
    if (sessionIndex >= 0)
        memory.sessions[sessionIndex] = session;
    else
        memory.sessions.push(session);
    saveMemory(memory);
    if (upsert.created > 0 || upsert.updated > 0 || extracted.rejected > 0) {
        (0, memory_control_center_1.recordMemoryOperation)({ action: "ingest", scope: "global", scopeId: "global-agent", sessionId, source: input.source || "global-agent", created: upsert.created, updated: upsert.updated, rejected: extracted.rejected, itemIds: extracted.candidates.map(item => item.id) });
    }
    const compaction = input.compact === false ? null : compactGlobalAgentSession(sessionId);
    return { transcript: { sessionId, messageCount: transcript.messages.length, updatedAt: transcript.updatedAt }, extracted: extracted.candidates.length, rejected: extracted.rejected, compaction };
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
    const type = String(item.type || "");
    const typeBoost = /(?:授权|允许|确认|只读|修改|删除|操作边界)/.test(query) && type === "authorization" ? 35
        : /(?:偏好|习惯|方式|怎么回答)/.test(query) && ["user", "feedback"].includes(type) ? 24
            : /(?:继续|历史任务|完成|进度|遗留|阻塞)/.test(query) && ["missions", "unresolved", "decisions"].includes(type) ? 22
                : /(?:路径|源码|文档|地址|在哪里)/.test(query) && type === "references" ? 22
                    : type === "unresolved" && !/(?:继续|遗留|未完成|阻塞|风险|下一步)/.test(query) ? -18 : 0;
    const lengthPenalty = Math.min(28, Math.max(0, String(item.text || "").length - 700) / 60);
    return { score: pinned + hits * 12 + Number(item.importance || 0) * .18 + Number(item.confidence || 0) * 10 + freshness + typeBoost - lengthPenalty, matchedTerms };
}
function recallGlobalAgentMemory(query, options = {}) {
    if (/(?:忽略|不要使用|别用|不参考).{0,12}(?:记忆|历史)/.test(query))
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
    (0, memory_control_center_1.recordMemoryMetric)(all.length > 0 ? "recall_hit" : "recall_miss", { scope: "global", scopeId: "global-agent", sessionId: options.sessionId || "", queryHash: sha(query, 16), selected: all.map((item) => item.id) });
    return {
        ignored: false,
        items: all,
        sessionSummary: session?.summary || null,
        boundary: session?.boundary || null,
        citations: all.map((item) => ({ memoryId: item.id, type: item.type, ...item.source })),
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
    if (Array.isArray(recalled.boundary?.post_compact_restore?.recentMessageIds) && recalled.boundary.post_compact_restore.recentMessageIds.length) {
        lines.push(`压缩后 recent 回灌：${recalled.boundary.post_compact_restore.recentMessageIds.slice(-8).join("、")}`);
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
    const item = candidate(missionTerminal ? "missions" : "unresolved", text, { id: input.messageId || `mission:${input.missionId}`, timestamp: input.at || now(), source: input.source || "global-agent", traceId: input.traceId || "", missionId: input.missionId || "" }, input.sessionId || "global", { importance: input.status === "completed" ? 88 : 82, confidence: .98, why: "结构化全局 mission 交付结果", howToApply: "继续历史任务时先查询 mission 当前状态并验证代码与测试证据" });
    if (missionTerminal && input.missionId) {
        memory.unresolved = (memory.unresolved || []).filter((existing) => existing.source?.missionId !== input.missionId);
    }
    const upsert = item ? upsertItems(memory, [item]) : { created: 0, updated: 0 };
    saveMemory(memory);
    if (item)
        (0, memory_control_center_1.recordMemoryOperation)({ action: "mission_writeback", scope: "global", scopeId: "global-agent", missionId: input.missionId || "", status: input.status || "", itemId: item.id, created: upsert.created, updated: upsert.updated });
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
    for (const session of rebuilt.sessions)
        compactGlobalAgentSession(session.sessionId, { force: true, reason: "rebuild" });
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
        messages.push({ role: "user", timestamp: new Date(Date.now() + index * 1000).toISOString(), content: index === 2 ? "以后全局 Agent 没有明确授权时不要直接操作项目，必须先确认" : index === 4 ? "我的 Claude Code 源码在 D:\\claude-code，以后分析压缩机制先看这里" : index === 6 ? "api_key=super-secret-value-123456" : `第 ${index} 轮普通对话，讨论全局任务连续性和记忆压缩边界` });
        messages.push({ role: "assistant", timestamp: new Date(Date.now() + index * 1000 + 10).toISOString(), content: index === 8 ? "下一步仍需完成全局记忆控制中心的跨会话验收" : index === 12 ? `大型工具输出 ${"x".repeat(12_000)} 结束` : `已记录第 ${index} 轮上下文` });
    }
    const result = ingestGlobalAgentConversation({ sessionId: id, source: "self-test", messages, compact: false });
    const compacted = compactGlobalAgentSession(id, { force: true, reason: "self-test" });
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
        recentWindowPreserved: compacted.session?.recentMessageIds?.length === RECENT_MESSAGES_TO_KEEP,
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
                    : `压力轮次 ${round} 消息 ${index}，跟踪跨项目目标、失败恢复、验证证据和下一步`;
                batch.push({ role: index % 2 ? "assistant" : "user", content, timestamp: new Date(Date.now() + round * 100_000 + index * 1000).toISOString() });
            }
            totalMessages += batch.length;
            ingestGlobalAgentConversation({ sessionId: id, source: "self-test", messages: batch, compact: false });
            compactGlobalAgentSession(id, { force: true, reason: `stress-${round}` });
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
            recentWindowRemainsBounded: session?.recentMessageIds?.length === RECENT_MESSAGES_TO_KEEP,
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