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
exports.GROUP_MEMORY_RESUME_PROJECTION_VERSION = exports.GROUP_MEMORY_BOUNDARY_JOURNAL_VERSION = void 0;
exports.getGroupMemoryBoundaryJournalFile = getGroupMemoryBoundaryJournalFile;
exports.getGroupMemoryResumeProofFile = getGroupMemoryResumeProofFile;
exports.readGroupMemoryBoundaryJournal = readGroupMemoryBoundaryJournal;
exports.calculateGroupMemorySummaryChecksum = calculateGroupMemorySummaryChecksum;
exports.commitGroupMemoryCompactBoundary = commitGroupMemoryCompactBoundary;
exports.buildGroupMemoryResumeProjection = buildGroupMemoryResumeProjection;
exports.recordGroupMemoryResumeProjectionProof = recordGroupMemoryResumeProjectionProof;
exports.readGroupMemoryResumeProjectionProofs = readGroupMemoryResumeProjectionProofs;
exports.quarantineInvalidGroupMemoryBoundaryJournal = quarantineInvalidGroupMemoryBoundaryJournal;
exports.retireGroupMemoryBoundaryJournal = retireGroupMemoryBoundaryJournal;
exports.inspectGroupMemoryResumeProjection = inspectGroupMemoryResumeProjection;
exports.deleteGroupMemoryBoundaryArtifacts = deleteGroupMemoryBoundaryArtifacts;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
exports.GROUP_MEMORY_BOUNDARY_JOURNAL_VERSION = 1;
exports.GROUP_MEMORY_RESUME_PROJECTION_VERSION = 1;
const DEFAULT_ROOT = path.join(utils_1.CCM_DIR, "group-memory-compact-boundaries");
const DEFAULT_LOCK_STALE_MS = 30_000;
const DEFAULT_LOCK_WAIT_MS = 2_000;
function cleanPart(value) {
    return String(value || "unknown").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120) || "unknown";
}
function sha256(value, length = 48) {
    const source = Buffer.isBuffer(value) ? value : Buffer.from(String(value ?? ""), "utf-8");
    return crypto.createHash("sha256").update(source).digest("hex").slice(0, length);
}
function checksumObject(value, field = "rowChecksum", length = 48) {
    const source = { ...(value || {}) };
    delete source[field];
    return sha256(JSON.stringify(source), length);
}
function messageId(message, index = 0) {
    return String(message?.id || message?.uuid || `${message?.timestamp || "unknown"}-${index}`);
}
function boundaryRoot(options = {}) {
    return String(options.rootDir || options.root_dir || DEFAULT_ROOT);
}
function getGroupMemoryBoundaryJournalFile(groupId, sessionId, options = {}) {
    if (options.journalFile || options.journal_file)
        return String(options.journalFile || options.journal_file);
    return path.join(boundaryRoot(options), cleanPart(groupId), `${cleanPart(sessionId || "default")}.jsonl`);
}
function getGroupMemoryResumeProofFile(groupId, sessionId, options = {}) {
    if (options.proofFile || options.proof_file)
        return String(options.proofFile || options.proof_file);
    return path.join(boundaryRoot(options), cleanPart(groupId), `${cleanPart(sessionId || "default")}.resume.jsonl`);
}
function getLockFile(groupId, sessionId, options = {}) {
    if (options.lockFile || options.lock_file)
        return String(options.lockFile || options.lock_file);
    return `${getGroupMemoryBoundaryJournalFile(groupId, sessionId, options)}.lock`;
}
function appendDurableJsonLine(file, row) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const fd = fs.openSync(file, "a");
    try {
        fs.writeSync(fd, `${JSON.stringify(row)}\n`, undefined, "utf-8");
        fs.fsyncSync(fd);
    }
    finally {
        fs.closeSync(fd);
    }
}
function waitSync(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.max(1, ms));
}
function withJournalLock(groupId, sessionId, options, work) {
    const file = getLockFile(groupId, sessionId, options);
    const startedAt = Date.now();
    const waitMs = Math.max(50, Number(options.lockWaitMs || options.lock_wait_ms || DEFAULT_LOCK_WAIT_MS));
    const staleMs = Math.max(1_000, Number(options.lockStaleMs || options.lock_stale_ms || DEFAULT_LOCK_STALE_MS));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    while (true) {
        try {
            const fd = fs.openSync(file, "wx");
            try {
                fs.writeFileSync(fd, JSON.stringify({ schema: "ccm-group-memory-boundary-lock-v1", pid: process.pid, acquiredAt: new Date().toISOString() }), "utf-8");
                fs.fsyncSync(fd);
            }
            finally {
                fs.closeSync(fd);
            }
            break;
        }
        catch (error) {
            if (String(error?.code || "") !== "EEXIST")
                throw error;
            try {
                const stat = fs.statSync(file);
                if (Date.now() - stat.mtimeMs > staleMs) {
                    fs.unlinkSync(file);
                    continue;
                }
            }
            catch { }
            if (Date.now() - startedAt >= waitMs)
                throw new Error(`compact boundary journal lock timeout: ${file}`);
            waitSync(25);
        }
    }
    try {
        return work();
    }
    finally {
        try {
            fs.unlinkSync(file);
        }
        catch { }
    }
}
function readChecksummedJsonLines(file, schema) {
    if (!fs.existsSync(file))
        return { rows: [], invalidRows: [], lineCount: 0 };
    const lines = fs.readFileSync(file, "utf-8").split(/\r?\n/);
    const rows = [];
    const invalidRows = [];
    lines.forEach((line, index) => {
        if (!line.trim())
            return;
        try {
            const row = JSON.parse(line);
            const valid = row?.schema === schema
                && String(row.rowChecksum || "")
                && String(row.rowChecksum) === checksumObject(row);
            if (!valid)
                invalidRows.push({ line: index + 1, reason: row?.schema !== schema ? "schema_invalid" : "checksum_invalid" });
            else
                rows.push(row);
        }
        catch {
            invalidRows.push({ line: index + 1, reason: "json_invalid" });
        }
    });
    return { rows, invalidRows, lineCount: lines.filter(line => line.trim()).length };
}
function readGroupMemoryBoundaryJournal(groupId, sessionId, options = {}) {
    const file = getGroupMemoryBoundaryJournalFile(groupId, sessionId, options);
    const parsed = readChecksummedJsonLines(file, "ccm-group-memory-compact-boundary-commit-v1");
    const commits = parsed.rows
        .filter(row => row.type === "boundary_commit")
        .sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));
    const latestCommit = commits[commits.length - 1] || null;
    const missing = !fs.existsSync(file);
    return {
        schema: "ccm-group-memory-boundary-journal-state-v1",
        version: exports.GROUP_MEMORY_BOUNDARY_JOURNAL_VERSION,
        groupId,
        sessionId: String(sessionId || "default"),
        file,
        missing,
        valid: !parsed.invalidRows.length,
        status: missing ? "missing" : parsed.invalidRows.length ? "invalid" : commits.length ? "committed" : "empty",
        commitCount: commits.length,
        lineCount: parsed.lineCount,
        invalidRows: parsed.invalidRows,
        latestCommit,
    };
}
function calculateGroupMemorySummaryChecksum(memory) {
    if (memory?.conversationSummary != null)
        return sha256(JSON.stringify(memory.conversationSummary), 24);
    if (String(memory?.messageDigest || "").trim())
        return sha256(String(memory.messageDigest), 24);
    return "";
}
function declaredSummaryChecksum(memory, boundary) {
    return String(memory?.compaction?.summaryChecksum
        || boundary?.summaryChecksum
        || boundary?.post_compact_restore?.summaryChecksum
        || boundary?.preservedSegment?.summaryChecksum
        || "");
}
function boundaryIdentity(boundary, summaryChecksum) {
    const segment = boundary?.preservedSegment || boundary?.post_compact_restore?.preservedSegment || {};
    const identity = {
        boundaryId: String(boundary?.id || ""),
        summarizedThroughMessageId: String(boundary?.summarizedThroughMessageId || segment?.summarizedThroughMessageId || ""),
        firstPreservedMessageId: String(segment?.firstPreservedMessageId || ""),
        lastPreservedMessageId: String(segment?.lastPreservedMessageId || ""),
        preservedMessageCount: Number(segment?.preservedMessageCount || 0),
        summaryChecksum,
    };
    const hasAnchorContract = Number(segment?.version || 0) >= 2
        || !!(segment?.anchorMessageId || segment?.anchor_message_id || segment?.anchorKind || segment?.anchor_kind);
    if (hasAnchorContract) {
        identity.headMessageId = String(segment?.headMessageId || segment?.head_message_id || "");
        identity.anchorMessageId = String(segment?.anchorMessageId || segment?.anchor_message_id || "");
        identity.tailMessageId = String(segment?.tailMessageId || segment?.tail_message_id || "");
        identity.anchorKind = String(segment?.anchorKind || segment?.anchor_kind || "");
        identity.anchorMode = String(segment?.anchorMode || segment?.anchor_mode || "");
    }
    return identity;
}
function buildBoundaryCommit(input, sequence, fencingToken) {
    const messages = Array.isArray(input.messages) ? input.messages : [];
    const memory = input.memory || {};
    const boundary = input.boundary || memory.compactBoundary || null;
    if (!boundary?.id)
        throw new Error("compact boundary id is missing");
    const calculatedSummary = calculateGroupMemorySummaryChecksum(memory);
    const declaredSummary = declaredSummaryChecksum(memory, boundary);
    if (declaredSummary && calculatedSummary && declaredSummary !== calculatedSummary) {
        throw new Error(`compact summary checksum mismatch: declared=${declaredSummary}, calculated=${calculatedSummary}`);
    }
    const summaryChecksum = calculatedSummary || declaredSummary;
    const identity = boundaryIdentity(boundary, summaryChecksum);
    const hasAnchorContract = Object.prototype.hasOwnProperty.call(identity, "anchorMessageId");
    if (hasAnchorContract && (!identity.anchorMessageId
        || identity.headMessageId !== identity.firstPreservedMessageId
        || identity.tailMessageId !== identity.lastPreservedMessageId
        || identity.anchorMessageId !== String((boundary?.preservedSegment || boundary?.post_compact_restore?.preservedSegment || {})?.summaryMessageId || "")
        || identity.anchorKind !== "compact_summary"
        || identity.anchorMode !== "suffix_preserving")) {
        throw new Error("compact summary head/anchor/tail contract is invalid");
    }
    const throughIndex = messages.findIndex((message, index) => messageId(message, index) === identity.summarizedThroughMessageId);
    const headIndex = messages.findIndex((message, index) => messageId(message, index) === identity.firstPreservedMessageId);
    const tailIndex = messages.findIndex((message, index) => messageId(message, index) === identity.lastPreservedMessageId);
    if (throughIndex < 0 || headIndex !== throughIndex + 1 || tailIndex < headIndex) {
        throw new Error("compact preserved segment is not contiguous with the raw transcript");
    }
    if (identity.preservedMessageCount !== tailIndex - headIndex + 1) {
        throw new Error("compact preserved segment count does not match the raw transcript");
    }
    const segment = boundary?.preservedSegment || boundary?.post_compact_restore?.preservedSegment || {};
    const preservedIds = Array.isArray(segment.preservedMessageIds) ? segment.preservedMessageIds.map((item) => String(item)) : [];
    const prefix = messages.slice(0, tailIndex + 1);
    const raw = JSON.stringify(messages);
    const committedAt = String(input.now || new Date().toISOString());
    const core = {
        schema: "ccm-group-memory-compact-boundary-commit-v1",
        version: exports.GROUP_MEMORY_BOUNDARY_JOURNAL_VERSION,
        type: "boundary_commit",
        groupId: String(input.groupId || memory.groupId || ""),
        sessionId: String(input.sessionId || memory.groupSessionId || "default"),
        commitId: `gmbc_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`,
        sequence,
        fencingToken,
        ...identity,
        preservedMessageIds: preservedIds,
        omittedPreservedMessageIds: Number(segment.omittedPreservedMessageIds || 0),
        boundaryChecksum: sha256(JSON.stringify(identity), 32),
        transcript: {
            path: String(input.transcriptPath || input.transcript_path || segment.transcriptPath || ""),
            messageCount: messages.length,
            byteLength: Buffer.byteLength(raw, "utf-8"),
            checksum: sha256(raw, 32),
            prefixMessageCount: prefix.length,
            prefixChecksum: sha256(JSON.stringify(prefix), 32),
            summarizedThroughIndex: throughIndex,
            preservedHeadIndex: headIndex,
            preservedTailIndex: tailIndex,
        },
        committedAt,
        ownerPid: process.pid,
    };
    return { ...core, rowChecksum: checksumObject(core) };
}
function commitGroupMemoryCompactBoundary(input) {
    const groupId = String(input.groupId || input.memory?.groupId || "").trim();
    const sessionId = String(input.sessionId || input.memory?.groupSessionId || "default").trim() || "default";
    const boundary = input.boundary || input.memory?.compactBoundary || null;
    if (!groupId || !boundary?.id || !boundary?.summarizedThroughMessageId) {
        return { committed: false, reason: "no_compact_boundary", groupId, sessionId };
    }
    return withJournalLock(groupId, sessionId, input, () => {
        const state = readGroupMemoryBoundaryJournal(groupId, sessionId, input);
        if (!state.valid)
            throw new Error(`compact boundary journal is invalid: ${state.file}`);
        const sequence = Number(state.latestCommit?.sequence || 0) + 1;
        const fencingToken = Number(state.latestCommit?.fencingToken || 0) + 1;
        const commit = buildBoundaryCommit(input, sequence, fencingToken);
        if (state.latestCommit
            && state.latestCommit.boundaryId === commit.boundaryId
            && state.latestCommit.boundaryChecksum === commit.boundaryChecksum
            && state.latestCommit.transcript?.prefixChecksum === commit.transcript?.prefixChecksum) {
            return { committed: false, reason: "already_committed", commit: state.latestCommit, journal: state };
        }
        appendDurableJsonLine(state.file, commit);
        return { committed: true, commit, journal: readGroupMemoryBoundaryJournal(groupId, sessionId, input) };
    });
}
function validationCheck(checks, id, pass, evidence) {
    checks.push({ id, pass: !!pass, evidence: String(evidence ?? "") });
}
function buildGroupMemoryResumeProjection(input) {
    const groupId = String(input.groupId || input.memory?.groupId || "").trim();
    const sessionId = String(input.sessionId || input.memory?.groupSessionId || "default").trim() || "default";
    const memory = input.memory || {};
    const messages = Array.isArray(input.messages) ? input.messages : [];
    const boundary = memory.compactBoundary || null;
    const journal = readGroupMemoryBoundaryJournal(groupId, sessionId, input);
    const generatedAt = String(input.now || new Date().toISOString());
    const fail = (reason, checks = []) => ({
        schema: "ccm-group-memory-resume-projection-v1",
        version: exports.GROUP_MEMORY_RESUME_PROJECTION_VERSION,
        groupId,
        sessionId,
        status: "fail_closed_rebuild_required",
        reason,
        verified: false,
        useProjection: false,
        mustUseFullRawTranscript: true,
        checks,
        journal: { file: journal.file, status: journal.status, valid: journal.valid, commitCount: journal.commitCount, invalidRows: journal.invalidRows },
        boundary: boundary ? boundaryIdentity(boundary, calculateGroupMemorySummaryChecksum(memory)) : null,
        projectedMessages: messages,
        preservedMessages: [],
        messagesAfterBoundary: [],
        omittedMessageCount: 0,
        generatedAt,
    });
    if (!boundary?.id) {
        if (journal.latestCommit)
            return fail("memory_boundary_missing");
        return {
            schema: "ccm-group-memory-resume-projection-v1",
            version: exports.GROUP_MEMORY_RESUME_PROJECTION_VERSION,
            groupId,
            sessionId,
            status: "no_boundary",
            reason: messages.length ? "raw_transcript_only" : "empty_session",
            verified: true,
            useProjection: false,
            mustUseFullRawTranscript: true,
            checks: [],
            journal: { file: journal.file, status: journal.status, valid: journal.valid, commitCount: journal.commitCount, invalidRows: journal.invalidRows },
            boundary: null,
            projectedMessages: messages,
            preservedMessages: messages,
            messagesAfterBoundary: [],
            omittedMessageCount: 0,
            generatedAt,
        };
    }
    if (!journal.valid)
        return fail("boundary_journal_invalid");
    if (!journal.latestCommit)
        return fail("boundary_commit_missing");
    const commit = journal.latestCommit;
    if (String(commit.boundaryId || "") !== String(boundary.id || ""))
        return fail("uncommitted_memory_boundary");
    const checks = [];
    const calculatedSummary = calculateGroupMemorySummaryChecksum(memory);
    const identity = boundaryIdentity(boundary, calculatedSummary);
    validationCheck(checks, "group_scope_matches", commit.groupId === groupId, `${commit.groupId}:${groupId}`);
    validationCheck(checks, "session_scope_matches", commit.sessionId === sessionId, `${commit.sessionId}:${sessionId}`);
    validationCheck(checks, "boundary_checksum_matches", commit.boundaryChecksum === sha256(JSON.stringify(identity), 32), commit.boundaryChecksum);
    validationCheck(checks, "summary_checksum_matches", !!calculatedSummary && commit.summaryChecksum === calculatedSummary, `${commit.summaryChecksum}:${calculatedSummary}`);
    validationCheck(checks, "summarized_through_matches", commit.summarizedThroughMessageId === identity.summarizedThroughMessageId, identity.summarizedThroughMessageId);
    validationCheck(checks, "preserved_head_matches", commit.firstPreservedMessageId === identity.firstPreservedMessageId, identity.firstPreservedMessageId);
    validationCheck(checks, "preserved_tail_matches", commit.lastPreservedMessageId === identity.lastPreservedMessageId, identity.lastPreservedMessageId);
    validationCheck(checks, "preserved_count_matches", Number(commit.preservedMessageCount || 0) === Number(identity.preservedMessageCount || 0), identity.preservedMessageCount);
    if (Object.prototype.hasOwnProperty.call(identity, "anchorMessageId")) {
        validationCheck(checks, "head_message_matches", commit.headMessageId === identity.headMessageId && identity.headMessageId === identity.firstPreservedMessageId, identity.headMessageId);
        validationCheck(checks, "summary_anchor_matches", commit.anchorMessageId === identity.anchorMessageId && identity.anchorMessageId === String((boundary?.preservedSegment || boundary?.post_compact_restore?.preservedSegment || {})?.summaryMessageId || ""), identity.anchorMessageId);
        validationCheck(checks, "tail_message_matches", commit.tailMessageId === identity.tailMessageId && identity.tailMessageId === identity.lastPreservedMessageId, identity.tailMessageId);
        validationCheck(checks, "anchor_kind_matches", commit.anchorKind === "compact_summary" && identity.anchorKind === "compact_summary", identity.anchorKind);
        validationCheck(checks, "anchor_mode_matches", commit.anchorMode === "suffix_preserving" && identity.anchorMode === "suffix_preserving", identity.anchorMode);
    }
    const throughIndex = messages.findIndex((message, index) => messageId(message, index) === commit.summarizedThroughMessageId);
    const headIndex = messages.findIndex((message, index) => messageId(message, index) === commit.firstPreservedMessageId);
    const tailIndex = messages.findIndex((message, index) => messageId(message, index) === commit.lastPreservedMessageId);
    validationCheck(checks, "summarized_through_present", throughIndex >= 0, throughIndex);
    validationCheck(checks, "preserved_head_present", headIndex >= 0, headIndex);
    validationCheck(checks, "preserved_tail_present", tailIndex >= 0, tailIndex);
    validationCheck(checks, "preserved_segment_contiguous", headIndex === throughIndex + 1 && tailIndex >= headIndex, `${throughIndex}:${headIndex}:${tailIndex}`);
    validationCheck(checks, "preserved_segment_length", tailIndex >= headIndex && tailIndex - headIndex + 1 === Number(commit.preservedMessageCount || 0), `${tailIndex - headIndex + 1}:${commit.preservedMessageCount}`);
    validationCheck(checks, "transcript_not_truncated", messages.length >= Number(commit.transcript?.messageCount || 0), `${messages.length}:${commit.transcript?.messageCount || 0}`);
    const prefix = tailIndex >= 0 ? messages.slice(0, tailIndex + 1) : [];
    validationCheck(checks, "committed_prefix_checksum", tailIndex >= 0 && sha256(JSON.stringify(prefix), 32) === String(commit.transcript?.prefixChecksum || ""), commit.transcript?.prefixChecksum || "");
    const declaredIds = Array.isArray(commit.preservedMessageIds) ? commit.preservedMessageIds.map((item) => String(item)) : [];
    const actualIds = tailIndex >= headIndex && headIndex >= 0 ? messages.slice(headIndex, tailIndex + 1).map(messageId) : [];
    validationCheck(checks, "preserved_id_suffix_matches", !declaredIds.length || JSON.stringify(actualIds.slice(-declaredIds.length)) === JSON.stringify(declaredIds), `${declaredIds.length}:${actualIds.length}`);
    const failedChecks = checks.filter(check => !check.pass).map(check => check.id);
    if (failedChecks.length)
        return fail(`projection_validation_failed:${failedChecks.join(",")}`, checks);
    const preservedMessages = messages.slice(headIndex, tailIndex + 1);
    const messagesAfterBoundary = messages.slice(tailIndex + 1);
    const projectedMessages = messages.slice(headIndex);
    const projectionCore = {
        schema: "ccm-group-memory-resume-projection-v1",
        version: exports.GROUP_MEMORY_RESUME_PROJECTION_VERSION,
        groupId,
        sessionId,
        status: "verified",
        reason: "latest_committed_boundary_verified",
        verified: true,
        useProjection: true,
        mustUseFullRawTranscript: false,
        boundary: {
            commitId: commit.commitId,
            boundaryId: commit.boundaryId,
            sequence: commit.sequence,
            fencingToken: commit.fencingToken,
            summaryChecksum: commit.summaryChecksum,
            summarizedThroughMessageId: commit.summarizedThroughMessageId,
            firstPreservedMessageId: commit.firstPreservedMessageId,
            lastPreservedMessageId: commit.lastPreservedMessageId,
            headMessageId: commit.headMessageId || commit.firstPreservedMessageId,
            anchorMessageId: commit.anchorMessageId || "",
            tailMessageId: commit.tailMessageId || commit.lastPreservedMessageId,
            anchorKind: commit.anchorKind || "",
            anchorMode: commit.anchorMode || "",
        },
        summaryText: String(memory.messageDigest || ""),
        rawMessageCount: messages.length,
        omittedMessageCount: headIndex,
        preservedMessageCount: preservedMessages.length,
        messagesAfterBoundaryCount: messagesAfterBoundary.length,
        projectedMessageCount: projectedMessages.length,
        projectedMessageIds: projectedMessages.map(messageId),
        checks,
        journal: { file: journal.file, status: journal.status, valid: journal.valid, commitCount: journal.commitCount, invalidRows: journal.invalidRows },
        generatedAt,
    };
    const projectionChecksum = sha256(JSON.stringify(projectionCore), 32);
    return { ...projectionCore, projectionChecksum, projectedMessages, preservedMessages, messagesAfterBoundary };
}
function compactProof(projection, input = {}) {
    const recovered = input.recovered === true;
    const core = {
        schema: "ccm-group-memory-resume-projection-proof-v1",
        version: exports.GROUP_MEMORY_RESUME_PROJECTION_VERSION,
        type: "resume_projection",
        proofId: `gmrp_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`,
        groupId: projection.groupId,
        sessionId: projection.sessionId,
        status: projection.status,
        reason: projection.reason,
        verified: projection.verified === true,
        recovered,
        recoveryReason: String(input.recoveryReason || input.recovery_reason || ""),
        priorStatus: String(input.priorStatus || input.prior_status || ""),
        priorReason: String(input.priorReason || input.prior_reason || ""),
        boundary: projection.boundary || null,
        journal: projection.journal || null,
        rawMessageCount: Number(projection.rawMessageCount ?? projection.projectedMessages?.length ?? 0),
        omittedMessageCount: Number(projection.omittedMessageCount || 0),
        preservedMessageCount: Number(projection.preservedMessageCount || projection.preservedMessages?.length || 0),
        messagesAfterBoundaryCount: Number(projection.messagesAfterBoundaryCount || projection.messagesAfterBoundary?.length || 0),
        projectedMessageCount: Number(projection.projectedMessageCount || projection.projectedMessages?.length || 0),
        projectionChecksum: String(projection.projectionChecksum || ""),
        failedChecks: (projection.checks || []).filter((check) => !check.pass).map((check) => check.id),
        generatedAt: String(input.now || projection.generatedAt || new Date().toISOString()),
        ownerPid: process.pid,
    };
    return { ...core, rowChecksum: checksumObject(core) };
}
function recordGroupMemoryResumeProjectionProof(projection, options = {}) {
    if (!projection?.groupId || !projection?.sessionId)
        return null;
    const file = getGroupMemoryResumeProofFile(projection.groupId, projection.sessionId, options);
    const proof = compactProof(projection, options);
    appendDurableJsonLine(file, proof);
    return { ...proof, file };
}
function readGroupMemoryResumeProjectionProofs(groupId, sessionId, options = {}) {
    const file = getGroupMemoryResumeProofFile(groupId, sessionId, options);
    const parsed = readChecksummedJsonLines(file, "ccm-group-memory-resume-projection-proof-v1");
    return {
        schema: "ccm-group-memory-resume-projection-proof-ledger-v1",
        groupId,
        sessionId: String(sessionId || "default"),
        file,
        valid: !parsed.invalidRows.length,
        proofCount: parsed.rows.length,
        invalidRows: parsed.invalidRows,
        latestProof: parsed.rows[parsed.rows.length - 1] || null,
        recentProofs: parsed.rows.slice(-20),
    };
}
function rotateJournal(groupId, sessionId, reason, options = {}) {
    const file = getGroupMemoryBoundaryJournalFile(groupId, sessionId, options);
    if (!fs.existsSync(file))
        return { rotated: false, reason: "missing", file };
    const suffix = new Date().toISOString().replace(/[:.]/g, "-");
    const target = `${file}.${cleanPart(reason)}-${suffix}`;
    fs.renameSync(file, target);
    return { rotated: true, reason, file, target };
}
function quarantineInvalidGroupMemoryBoundaryJournal(groupId, sessionId, options = {}) {
    return withJournalLock(groupId, sessionId, options, () => rotateJournal(groupId, sessionId, "invalid", options));
}
function retireGroupMemoryBoundaryJournal(groupId, sessionId, options = {}) {
    return withJournalLock(groupId, sessionId, options, () => rotateJournal(groupId, sessionId, "retired", options));
}
function inspectGroupMemoryResumeProjection(input) {
    const projection = buildGroupMemoryResumeProjection(input);
    const proofs = readGroupMemoryResumeProjectionProofs(projection.groupId, projection.sessionId, input);
    const { projectedMessages, preservedMessages, messagesAfterBoundary, summaryText, ...summary } = projection;
    return { ...summary, summaryTextLength: String(summaryText || "").length, proofs };
}
function deleteGroupMemoryBoundaryArtifacts(groupId, sessionId, options = {}) {
    const journalFile = getGroupMemoryBoundaryJournalFile(groupId, sessionId, options);
    const proofFile = getGroupMemoryResumeProofFile(groupId, sessionId, options);
    const files = [journalFile, proofFile, getLockFile(groupId, sessionId, options)];
    try {
        const dir = path.dirname(journalFile);
        const journalName = path.basename(journalFile);
        const proofName = path.basename(proofFile);
        for (const name of fs.readdirSync(dir)) {
            if (name.startsWith(`${journalName}.`) || name.startsWith(`${proofName}.`))
                files.push(path.join(dir, name));
        }
    }
    catch { }
    let deletedFiles = 0;
    for (const file of [...new Set(files)]) {
        try {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
                deletedFiles += 1;
            }
        }
        catch { }
    }
    return { schema: "ccm-group-memory-boundary-artifact-delete-v1", groupId, sessionId, deletedFiles, files, deletedAt: new Date().toISOString() };
}
//# sourceMappingURL=group-memory-boundary-journal.js.map