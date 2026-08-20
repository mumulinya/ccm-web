import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { buildContextBudget, estimateTextTokens, microCompactText } from "../../system/context-budget";
import {
  calculateSessionMemoryKeepWindow,
  SESSION_MEMORY_MAX_KEEP_TOKENS,
  SESSION_MEMORY_MIN_KEEP_TOKENS,
  SESSION_MEMORY_MIN_TEXT_MESSAGES,
} from "../../system/session-memory-window";
import { CCM_DIR } from "../../core/utils";
import { applyMemoryControls, recordMemoryMetric, recordMemoryOperation } from "../../modules/knowledge/memory-control-center";
import { callCompactionModel } from "../../modules/collaboration/group-compaction-engine";
import { callUnifiedCompactionModel } from "../../system/unified-session-compaction-model";
import { loadOrchestratorConfig } from "../../modules/collaboration/group-orchestrator-config";
import { resolveMainAgentContextPolicy } from "../../tools/main-agent-context-policy";
import { selectUserMcpToolDefinitions } from "../../system/session-context-tool-buckets";
import { getGroupAutoCompactThreshold, resolveGroupModelContextCapacity } from "../../modules/collaboration/group-compaction-strategy";
import {
  buildSessionPostCompactGate,
  buildModelVisiblePayloadSnapshot,
  modelVisibleFixedTokens,
  modelVisiblePayloadAccounting,
  buildSessionCompactionBoundaryMarker,
  buildSessionMemoryState,
  evaluateSessionMemoryCadence,
  measureSessionContextTokens,
  normalizeSessionCompactionState,
  normalizeSessionProviderUsage,
  recordSessionCompactionFailure,
  resetSessionCompactionFailures,
  runSessionCompactionHooks,
  sessionCompactionCircuitOpen,
  validateSessionMemoryState,
  waitForScheduledSessionMemoryExtraction,
  scheduleSessionMemoryExtraction,
  sessionCompactionChecksum,
} from "../../system/session-compaction-core";
import {
  createSessionExecutionEvent,
  eventsAnchoredToMessages,
  findPendingToolCallId,
  mergeConversationWithExecution,
  normalizeSessionExecutionEvents,
  type SessionExecutionEvent,
} from "../../system/session-execution-ledger";
import { ccDurableMemoryTaxonomyReceipt } from "../../system/durable-memory-taxonomy";
import { buildUnifiedSessionModelContextProjection, resolveSessionModelMicroCompactPolicy } from "../../system/session-model-context";
import { buildUnifiedCompactionReceipt, buildUnifiedRecoveryContext, buildUnifiedSessionCompactionStateV1, orchestrateUnifiedCompaction, createUnifiedSessionCompactionEngine } from "../../system/unified-session-compaction";
import { buildUnifiedRecoveryAttachment } from "../../system/unified-session-compaction-recovery";
import { unifiedSummaryChecksum } from "../../system/unified-session-compaction-summary";
import { createUnifiedScopeAdapter } from "../../system/unified-session-compaction-adapters";
import type { UnifiedCompactionResult } from "../../system/unified-session-compaction-types";
import { evaluateSessionSummaryQuality } from "../../system/session-summary-quality-gate";
import { reviewSessionSummaryIfSelected } from "../../system/session-summary-secondary-review";
import { MemorySemanticExtractionV1, runSemanticDecision } from "../../system/semantic-decision-runtime";
import { getGlobalAgentToolAuthorizationPayload } from "../../modules/global/global-agent-tool-authorization";
import { toolManager } from "../../tools/tool-manager";
import {
  buildMainAgentPostCompactRestoreManifest,
  persistMainAgentPostCompactRestoreManifest,
  restoreMainAgentPostCompactContext,
} from "../../system/main-agent-post-compact-continuity";

export type GlobalMemoryItemType = "user" | "feedback" | "authorization" | "decisions" | "missions" | "unresolved" | "references";

export function createGlobalSessionCompactionAdapter(input: {
  sessionId: string;
  load: () => Promise<any> | any;
  commit: (result: UnifiedCompactionResult, fence: any) => Promise<void> | void;
  acquire?: () => Promise<any> | any;
  failure?: (error: unknown, fence: any) => Promise<void> | void;
  validate?: (fence: any, snapshot: any) => Promise<void> | void;
}) {
  return createUnifiedScopeAdapter({
    load: async () => ({ scope: "global", exactSessionId: String(input.sessionId), ...(await input.load()) }),
    acquire: input.acquire,
    commit: input.commit,
    failure: input.failure,
    validate: input.validate,
  });
}

export interface GlobalMemoryItem {
  id: string;
  type: GlobalMemoryItemType;
  text: string;
  why?: string;
  howToApply?: string;
  importance: number;
  confidence: number;
  createdAt: string;
  updatedAt: string;
  source: {
    sessionId?: string;
    messageIds?: string[];
    missionId?: string;
    traceId?: string;
    source?: string;
    timestamp?: string;
  };
  expiresAt?: string;
  ccMemoryType?: "user" | "feedback" | "project" | "reference";
  taxonomy?: any;
  extractionSource?: "model_semantic" | "structured_event" | "manual" | "legacy_unverified";
  evidenceMessageIds?: string[];
  semanticStatus?: "confirmed" | "legacy_unverified";
  semanticDecisionReceipt?: any;
}

const MEMORY_DIR = process.env.CCM_GLOBAL_AGENT_MEMORY_DIR || path.join(CCM_DIR, "global-agent-memory");
export const GLOBAL_AGENT_MEMORY_FILE = path.join(MEMORY_DIR, "memory.json");
const TRANSCRIPT_DIR = path.join(MEMORY_DIR, "transcripts");
const KEY_FILE = path.join(MEMORY_DIR, "transcript.key");
const POLICY_FILE = path.join(MEMORY_DIR, "policy.json");
const SELFTEST_LOCK_FILE = path.join(MEMORY_DIR, ".selftest.lock");
const SELFTEST_RESIDUE_ARCHIVE_DIR = path.join(MEMORY_DIR, "selftest-residue-archive");
const MEMORY_ITEM_KEYS: GlobalMemoryItemType[] = ["user", "feedback", "authorization", "decisions", "missions", "unresolved", "references"];
const COMPACT_MESSAGE_THRESHOLD = 60;
const COMPACT_TOKEN_THRESHOLD = 50_000;
const MAX_COMPACTION_FAILURES = 3;
const MAX_ITEMS_PER_TYPE = 300;
const GLOBAL_COMPACTION_MODEL_MAX_OUTPUT_TOKENS = 20_000;
const globalModelCompactions = new Map<string, {
  promise: Promise<any>;
  force: boolean;
  customInstructions: string;
  reason: string;
  startedAt: string;
}>();
const globalLongTermExtractions = new Map<string, Promise<any>>();

export function getGlobalAgentSessionCompactionActivity(sessionId: string) {
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
function sha(value: any, length = 32) { return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex").slice(0, length); }
function cleanId(value: any) { return String(value || "default").replace(/[^a-zA-Z0-9._@-]+/g, "_").slice(0, 110); }
function compact(value: any, max = 2000) { const text = String(value || "").trim(); return text.length > max ? `${text.slice(0, Math.ceil(max * .64))}\n…[中间内容已压缩，原文可从加密转录恢复]…\n${text.slice(-Math.floor(max * .3))}` : text; }
function estimateTokens(value: any) { return estimateTextTokens(value); }

function writeAtomic(file: string, value: any) {
  ensureDirs();
  const temp = `${file}.${process.pid}.${Date.now()}.${crypto.randomBytes(2).toString("hex")}.tmp`;
  if (fs.existsSync(file)) { try { fs.copyFileSync(file, `${file}.bak`); } catch {} }
  fs.writeFileSync(temp, typeof value === "string" ? value : JSON.stringify(value, null, 2), "utf-8");
  fs.renameSync(temp, file);
}

function sleepSync(ms: number) {
  const buffer = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(buffer), 0, 0, ms);
}

export function acquireGlobalAgentMemorySelfTestLock(label = "global-memory-selftest", options: any = {}) {
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
        if (released) return;
        released = true;
        try {
          const lock = readJson(SELFTEST_LOCK_FILE, {});
          if (Number(lock.pid || 0) === process.pid) fs.rmSync(SELFTEST_LOCK_FILE, { force: true });
        } catch {
          try { fs.rmSync(SELFTEST_LOCK_FILE, { force: true }); } catch {}
        }
      };
    } catch {
      try {
        const stat = fs.statSync(SELFTEST_LOCK_FILE);
        if (Date.now() - stat.mtimeMs > staleMs) fs.rmSync(SELFTEST_LOCK_FILE, { force: true });
      } catch {}
      sleepSync(50);
    }
  }
  throw new Error(`Global Agent memory selftest lock timeout: ${label}`);
}

function globalAgentMemorySelftestMatch(value: any) {
  const text = typeof value === "string" ? value : JSON.stringify(value || {});
  if (!text) return { contaminated: false, sentinels: [], hasSelftestSource: false };
  const sentinels = [...new Set([...text.matchAll(/\b[A-Z][A-Z0-9_]{4,}_SENTINEL\b/g)].map(match => match[0]))].slice(0, 12);
  const hasSelftestSource = /"source"\s*:\s*"self-?test"|source['"]?\s*:\s*['"]self-?test|selftest/i.test(text);
  return {
    contaminated: sentinels.length > 0 || hasSelftestSource,
    sentinels,
    hasSelftestSource,
  };
}

function globalAgentMemoryScanFiles(options: any = {}) {
  const includeResidue = options.includeResidue !== false && options.include_residue !== false;
  const files = [
    { file: GLOBAL_AGENT_MEMORY_FILE, role: "active", active: true },
    { file: `${GLOBAL_AGENT_MEMORY_FILE}.bak`, role: "active_backup", active: true },
  ];
  if (includeResidue) {
    try {
      for (const name of fs.readdirSync(MEMORY_DIR)) {
        if (!/^memory\.(?:json\..*\.tmp|selftest-polluted-|bak-before-)/.test(name)) continue;
        const file = path.join(MEMORY_DIR, name);
        if (files.some(item => item.file === file)) continue;
        files.push({ file, role: "residue", active: false });
      }
    } catch {}
  }
  return files;
}

export function scanGlobalAgentMemorySelfTestContamination(options: any = {}) {
  const rows: any[] = [];
  const files = globalAgentMemoryScanFiles(options).map(meta => {
    const exists = fs.existsSync(meta.file);
    if (!exists) return { ...meta, exists, contaminated: false, sentinelCount: 0, hasSelftestSource: false, bytes: 0 };
    const text = (() => { try { return fs.readFileSync(meta.file, "utf-8"); } catch { return ""; } })();
    const parsed = (() => { try { return JSON.parse(text); } catch { return null; } })();
    const match = globalAgentMemorySelftestMatch(text);
    if (match.contaminated) {
      const memory = parsed && typeof parsed === "object" ? parsed : {};
      const addRow = (kind: string, entry: any, index: number) => {
        const entryMatch = globalAgentMemorySelftestMatch(entry);
        if (!entryMatch.contaminated) return;
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
        entries.forEach((entry: any, index: number) => addRow(key, entry, index));
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
    file: GLOBAL_AGENT_MEMORY_FILE,
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

export function archiveGlobalAgentMemorySelfTestResidues(options: any = {}) {
  const dryRun = options.dryRun === true || options.dry_run === true;
  const reason = String(options.reason || "").trim();
  const actor = String(options.actor || "local-user").trim() || "local-user";
  if (!dryRun && !reason) throw new Error("归档 Global Agent 记忆自测残留前必须填写 reason");
  const release = acquireGlobalAgentMemorySelfTestLock("archive-global-memory-selftest-residue");
  try {
    const rawFiles = Array.isArray(options.files || options.file)
      ? (options.files || options.file)
      : (options.files || options.file ? [options.files || options.file] : []);
    const selectedFileList = rawFiles.map((value: any) => String(value || "").trim()).filter(Boolean);
    const selectedFiles = new Set<string>(selectedFileList);
    const selectedBasenames = new Set<string>(selectedFileList.map((file: string) => path.basename(file)));
    const scanBefore = scanGlobalAgentMemorySelfTestContamination({ includeResidue: true, limit: options.limit || 200 });
    const residueFiles = scanBefore.files
      .filter((file: any) => file.exists && file.contaminated && file.active !== true && file.role === "residue")
      .filter((file: any) => !selectedFiles.size || selectedFiles.has(file.file) || selectedBasenames.has(path.basename(file.file)));
    const archived: any[] = [];
    const skipped: any[] = [];
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
      recordMemoryOperation({
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
  } finally {
    release();
  }
}

export function runGlobalAgentMemorySelfTestResidueArchiveSelfTest() {
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
      beforeDetectsResidue: before.rows?.some((row: any) => row.file === testFile && row.active === false),
      dryRunDoesNotMoveFile: dryRun.dryRun === true && existsAfterDryRun && dryRun.archivedCount === 1,
      archiveMovesOnlyResidue: archived.dryRun === false && archived.archivedCount === 1 && !fs.existsSync(testFile) && !!archiveFile && fs.existsSync(archiveFile),
      activeMemoryStillClean: after.active_contamination_count === 0,
      residueNoLongerIncludesTestFile: !after.rows?.some((row: any) => row.file === testFile),
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      archived: { archiveFile, archivedCount: archived.archivedCount, skippedCount: archived.skippedCount },
    };
  } finally {
    try { if (fs.existsSync(testFile)) fs.rmSync(testFile, { force: true }); } catch {}
    try { if (archiveFile && fs.existsSync(archiveFile)) fs.rmSync(archiveFile, { force: true }); } catch {}
  }
}

export function runGlobalAgentMemorySelfTestIsolationSelfTest() {
  const before = scanGlobalAgentMemorySelfTestContamination({ includeResidue: false });
  const release = acquireGlobalAgentMemorySelfTestLock("global-memory-isolation-selftest");
  const previousMain = fs.existsSync(GLOBAL_AGENT_MEMORY_FILE) ? fs.readFileSync(GLOBAL_AGENT_MEMORY_FILE, "utf-8") : null;
  const previousBak = fs.existsSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`) ? fs.readFileSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`, "utf-8") : null;
  try {
    writeAtomic(GLOBAL_AGENT_MEMORY_FILE, {
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
  } finally {
    try {
      if (previousMain === null) fs.rmSync(GLOBAL_AGENT_MEMORY_FILE, { force: true });
      else fs.writeFileSync(GLOBAL_AGENT_MEMORY_FILE, previousMain, "utf-8");
      if (previousBak === null) fs.rmSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`, { force: true });
      else fs.writeFileSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`, previousBak, "utf-8");
    } catch {}
    release();
  }
}

function readJson(file: string, fallback: any) {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return fallback; }
}

function getEncryptionKey() {
  ensureDirs();
  for (const file of [KEY_FILE, `${KEY_FILE}.bak`]) {
    if (!fs.existsSync(file)) continue;
    const key = Buffer.from(fs.readFileSync(file, "utf-8").trim(), "base64");
    if (key.length === 32) {
      if (file.endsWith(".bak")) fs.copyFileSync(file, KEY_FILE);
      return key;
    }
  }
  const key = crypto.randomBytes(32);
  fs.writeFileSync(KEY_FILE, key.toString("base64"), { encoding: "utf-8", mode: 0o600 });
  fs.copyFileSync(KEY_FILE, `${KEY_FILE}.bak`);
  return key;
}

function encryptJson(value: any) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf-8"), cipher.final()]);
  return { version: 1, algorithm: "aes-256-gcm", iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: encrypted.toString("base64") };
}

function decryptJson(value: any) {
  if (!value?.iv || !value?.tag || !value?.data) throw new Error("加密转录格式无效");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(value.iv, "base64"));
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.data, "base64")), decipher.final()]).toString("utf-8"));
}

export function getGlobalAgentTranscriptFile(sessionId: string) { return path.join(TRANSCRIPT_DIR, `${cleanId(sessionId)}-${sha(String(sessionId || "default"), 12)}.enc.json`); }

function transcriptFile(sessionId: string) { return getGlobalAgentTranscriptFile(sessionId); }

function pathInside(parent: string, child: string) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return !!relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function normalizeMessage(message: any, sessionId: string, source = "global-agent") {
  const role = message?.role === "assistant" ? "assistant" : "user";
  const content = String(message?.content || "").slice(0, 100_000);
  const timestamp = message?.timestamp || now();
  const id = String(message?.id || message?.messageId || `gam_${sha([sessionId, role, content, timestamp], 24)}`);
  return { id, role, content, timestamp, source: message?.source || source, traceId: message?.trace_id || message?.traceId || "", missionId: message?.mission_id || message?.missionId || "" };
}

export function loadGlobalAgentTranscript(sessionId: string) {
  const file = transcriptFile(sessionId);
  for (const candidate of [file, `${file}.bak`]) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const transcript = decryptJson(readJson(candidate, null));
      return { version: 2, sessionId, source: transcript.source || "global-agent", messages: Array.isArray(transcript.messages) ? transcript.messages : [], executionMessages: normalizeSessionExecutionEvents(transcript.executionMessages || transcript.execution_messages), updatedAt: transcript.updatedAt || "", storageRecovery: candidate.endsWith(".bak") ? { recoveredFromBackup: true, recoveredAt: now() } : null };
    } catch {}
  }
  return { version: 2, sessionId, source: "global-agent", messages: [], executionMessages: [] as SessionExecutionEvent[], updatedAt: "", storageRecovery: null };
}

function saveTranscript(transcript: any) {
  const file = transcriptFile(transcript.sessionId);
  writeAtomic(file, encryptJson(transcript));
  return file;
}

function globalExecutionForMessages(transcript: any, messages: any[]) {
  return eventsAnchoredToMessages(normalizeSessionExecutionEvents(transcript.executionMessages), messages);
}

export function appendGlobalAgentExecutionEvent(sessionIdInput: string, event: any) {
  const sessionId = String(sessionIdInput || "").trim();
  if (!sessionId) return null;
  const transcript = loadGlobalAgentTranscript(sessionId);
  const events = normalizeSessionExecutionEvents(transcript.executionMessages);
  const eventType = String(event?.type || "");
  const type = eventType === "tool_started" ? "tool_use" : "tool_result";
  if (!["tool_started", "tool_completed", "tool_failed", "clarification_required"].includes(eventType)) return null;
  const toolName = String(event?.tool || event?.toolName || "tool");
  const runId = String(event?.runId || event?.run_id || "");
  const toolCallId = type === "tool_result"
    ? (String(event?.toolCallId || event?.tool_call_id || "") || findPendingToolCallId(events, runId, toolName))
    : String(event?.toolCallId || event?.tool_call_id || "");
  const anchor = [...transcript.messages].reverse().find((message: any) => message?.role === "user") || transcript.messages.at(-1) || null;
  const created = createSessionExecutionEvent({
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
    persistContext: { scope: "global", sessionId },
  });
  if (!events.some(item => item.id === created.id)) events.push(created);
  transcript.executionMessages = events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  transcript.updatedAt = now();
  saveTranscript(transcript);
  return created;
}

export function previewGlobalTranscriptContextSourceMaintenance(sessionIdInput: string) {
  const sessionId = String(sessionIdInput || "").trim();
  const file = transcriptFile(sessionId);
  if (!sessionId || !fs.existsSync(file)) return null;
  const disk = fs.readFileSync(file, "utf8");
  const transcript = decryptJson(JSON.parse(disk));
  const before = JSON.stringify(transcript?.executionMessages || transcript?.execution_messages || []);
  const projectedEvents = normalizeSessionExecutionEvents(transcript?.executionMessages || transcript?.execution_messages);
  const after = JSON.stringify(projectedEvents);
  return {
    file,
    fileChecksum: sha(disk, 64),
    changed: before === after ? 0 : projectedEvents.filter((event: any) => event.type === "tool_result" && event.payload?.contentStored === false).length,
    removedTokens: Math.max(0, estimateTextTokens(before) - estimateTextTokens(after)),
    contentStored: false,
  };
}

export function applyGlobalTranscriptContextSourceMaintenance(plan: any, backupFile: string) {
  if (!plan?.file || !fs.existsSync(plan.file)) throw new Error("global_transcript_maintenance_source_missing");
  const disk = fs.readFileSync(plan.file, "utf8");
  if (sha(disk, 64) !== String(plan.fileChecksum || "")) throw new Error("global_transcript_maintenance_source_drift");
  const transcript = decryptJson(JSON.parse(disk));
  const projectedTranscript = {
    ...transcript,
    executionMessages: normalizeSessionExecutionEvents(transcript?.executionMessages || transcript?.execution_messages),
    execution_messages: undefined,
    updatedAt: now(),
  };
  fs.mkdirSync(path.dirname(backupFile), { recursive: true });
  fs.copyFileSync(plan.file, backupFile);
  writeAtomic(plan.file, encryptJson(projectedTranscript));
  return { updated: Number(plan.changed || 0), backupFile };
}

export function rollbackGlobalTranscriptContextSourceMaintenance(file: string, backupFile: string) {
  if (!fs.existsSync(backupFile)) throw new Error("global_transcript_maintenance_backup_missing");
  fs.copyFileSync(backupFile, file);
  return { restored: 1 };
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

export function loadGlobalAgentMemory(options: { recover?: boolean } = {}) {
  const candidates = [GLOBAL_AGENT_MEMORY_FILE, `${GLOBAL_AGENT_MEMORY_FILE}.bak`];
  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue;
      const memory = { ...emptyMemory(), ...JSON.parse(fs.readFileSync(file, "utf-8")) };
      for (const key of MEMORY_ITEM_KEYS) memory[key] = Array.isArray(memory[key]) ? memory[key] : [];
      memory.sessions = Array.isArray(memory.sessions) ? memory.sessions : [];
      memory.archives = Array.isArray(memory.archives) ? memory.archives : [];
      const corrupted = memory.archives.filter((archive: any) => archive.checksum !== sha(archive.records || [], 40) || archive.summaryChecksum !== sha(archive.summary || {}, 40)).map((archive: any) => archive.id);
      memory.integrity = { pass: corrupted.length === 0, corruptedArchives: corrupted };
      if (file.endsWith(".bak")) memory.storageRecovery = { recoveredFromBackup: true, recoveredAt: now() };
      if (options.recover !== false && file.endsWith(".bak")) writeAtomic(GLOBAL_AGENT_MEMORY_FILE, memory);
      return memory;
    } catch {}
  }
  return emptyMemory();
}

function saveMemory(memory: any) {
  memory.updatedAt = now();
  writeAtomic(GLOBAL_AGENT_MEMORY_FILE, memory);
  return memory;
}

function globalSessionCompactionState(session: any, sessionId: string) {
  const unified = session?.unifiedSessionCompaction;
  if (!unified || unified.schema !== "ccm-unified-session-compaction-state-v1") {
    return normalizeSessionCompactionState({}, {
      scope: "global",
      sessionId,
    });
  }
  const state = normalizeSessionCompactionState(unified, {
    scope: "global",
    sessionId,
  });
  return { ...state, activeSummary: session.unifiedSessionSummary || null };
}

function globalSessionSummarySource(session: any) {
  return String(session?.summarySource || session?.summary_source || session?.compaction?.summarySource || session?.compaction?.summary_source || "").toLowerCase();
}

function isTrustedGlobalSummarySource(source: string) {
  return ["model", "session_memory", "session-memory"].includes(String(source || "").toLowerCase());
}

function canonicalGlobalSessionSummary(session: any, state: any) {
  if (session?.unifiedSessionSummary && session?.unifiedSessionCompaction?.schema === "ccm-unified-session-compaction-state-v1") return session.unifiedSessionSummary;
  return isTrustedGlobalSummarySource(globalSessionSummarySource(session))
    ? (state?.activeSummary || session?.summary || null)
    : null;
}

function bindTrustedGlobalSourceBoundary(summary: any, sourceMessageIds: string[]) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return summary;
  return { ...summary, sourceMessageIds: [...sourceMessageIds] };
}

function dedupeGlobalPendingRequest(messages: any[], value: any) {
  if (value == null || value === "") return null;
  const content = typeof value === "string" ? value : String(value?.content || JSON.stringify(value));
  const last = messages.at(-1);
  if (String(last?.role || "") === "user" && String(last?.content || "") === content) return null;
  return typeof value === "string" ? { role: "user", content } : value;
}

function replaceGlobalSession(memory: any, sessionId: string, next: any) {
  const index = memory.sessions.findIndex((item: any) => item.sessionId === sessionId);
  if (index >= 0) memory.sessions[index] = next;
  else memory.sessions.push(next);
  return next;
}

export function pruneDeletedGlobalWebSessionMemory(activeSessionIds: string[]) {
  const active = new Set((Array.isArray(activeSessionIds) ? activeSessionIds : []).map(String).filter(Boolean));
  const memory = loadGlobalAgentMemory();
  const removed = (memory.sessions || [])
    .filter((session: any) => String(session.source || "web") === "web" && !active.has(String(session.sessionId || "")))
    .map((session: any) => String(session.sessionId || ""))
    .filter(Boolean);
  if (!removed.length) return { removed: [], transcriptFilesRemoved: 0 };
  const removedSet = new Set(removed);
  memory.sessions = (memory.sessions || []).filter((session: any) => !removedSet.has(String(session.sessionId || "")));
  memory.archives = (memory.archives || []).filter((archive: any) => !removedSet.has(String(archive.sessionId || "")));
  let transcriptFilesRemoved = 0;
  for (const sessionId of removed) {
    for (const file of [transcriptFile(sessionId), `${transcriptFile(sessionId)}.bak`]) {
      if (!fs.existsSync(file)) continue;
      fs.rmSync(file, { force: true });
      transcriptFilesRemoved += 1;
    }
  }
  saveMemory(memory);
  recordMemoryOperation({ action: "global_web_session_prune", scope: "global", scopeId: "global-agent", removedSessionIds: removed, transcriptFilesRemoved });
  return { removed, transcriptFilesRemoved };
}

export function recordGlobalAgentSessionProviderUsage(sessionId: string, input: any = {}) {
  const exactSessionId = String(sessionId || "").trim();
  if (!exactSessionId) return null;
  const memory = loadGlobalAgentMemory();
  const session = memory.sessions.find((item: any) => item.sessionId === exactSessionId) || { sessionId: exactSessionId };
  const state = globalSessionCompactionState(session, exactSessionId);
  const transcript = loadGlobalAgentTranscript(exactSessionId);
  const floorIndex = state.lastCompactedIndex + 1;
  const unsummarized = transcript.messages.slice(floorIndex);
  const anchorMessageId = String(input.anchorMessageId || input.anchor_message_id || "");
  const anchorIndex = anchorMessageId ? unsummarized.findIndex((message: any) => String(message?.id || "") === anchorMessageId) : -1;
  const visibleMessages = anchorIndex >= 0 ? unsummarized.slice(0, anchorIndex) : unsummarized;
  const modelVisibleMessages = mergeConversationWithExecution(visibleMessages, globalExecutionForMessages(transcript, visibleMessages));
  const currentRequest = dedupeGlobalPendingRequest(visibleMessages, input.currentRequest || input.current_request);
  const config = loadOrchestratorConfig();
  const suppliedPayload = input.modelVisiblePayload || input.model_visible_payload || null;
  const payload = suppliedPayload?.schema === "ccm-model-visible-payload-snapshot-v1" ? suppliedPayload : buildModelVisiblePayloadSnapshot({
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
  const usage = normalizeSessionProviderUsage({
    ...(input || {}),
    scope: "global",
    sessionId: exactSessionId,
    boundaryGeneration: state.boundaryGeneration,
    payloadChecksum: input.payloadChecksum || input.payload_checksum || payload.payloadChecksum,
    fixedContextChecksum: input.fixedContextChecksum || input.fixed_context_checksum || payload.fixedContextChecksum,
    estimatedFixedTokens: input.estimatedFixedTokens || input.estimated_fixed_tokens || modelVisibleFixedTokens(payload),
    estimatedContextTokens: input.estimatedContextTokens || input.estimated_context_tokens || payload.totalTokens,
    estimatedPayloadTokens: input.estimatedPayloadTokens || input.estimated_payload_tokens || payload.totalTokens,
  });
  const measurementUsage = usage || state.latestProviderUsage;
  const tokenMeasurement = measureSessionContextTokens({
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
    modelVisiblePayload: modelVisiblePayloadAccounting(payload),
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

export function setGlobalAgentMemoryPolicy(input: any) {
  const policy = loadPolicy();
  if (input.disabled !== undefined) policy.disabled = input.disabled === true;
  if (Array.isArray(input.blockedPatterns)) policy.blockedPatterns = input.blockedPatterns.map((value: any) => String(value).slice(0, 200)).filter(Boolean).slice(0, 50);
  policy.updatedAt = now();
  writeAtomic(POLICY_FILE, policy);
  recordMemoryOperation({ action: "policy_update", scope: "global", scopeId: "global-agent", actor: input.actor || "local-user", reason: input.reason || "", disabled: policy.disabled, blockedPatternCount: policy.blockedPatterns.length });
  return policy;
}

function containsSensitiveData(text: string) {
  const patterns = [
    /\b(?:sk|rk|pk)-[a-z0-9_-]{12,}\b/i,
    /\bBearer\s+[a-z0-9._~+\/-]{12,}/i,
    /(?:api[_-]?key|app[_-]?secret|client[_-]?secret|password|passwd|token)\s*[:=]\s*["']?[^\s"']{6,}/i,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  ];
  return patterns.some(pattern => pattern.test(text));
}

function shouldRejectCandidate(text: string) {
  const policy = loadPolicy();
  if (policy.disabled || containsSensitiveData(text)) return true;
  if (policy.blockedPatterns.some((pattern: string) => { try { return new RegExp(pattern, "i").test(text); } catch { return text.toLowerCase().includes(pattern.toLowerCase()); } })) return true;
  const value = text.trim();
  if (value.length < 8 || value.length > 5000) return true;
  if (/^[\s\p{P}\p{S}]*$/u.test(value)) return true;
  return false;
}

function candidate(type: GlobalMemoryItemType, text: string, message: any, sessionId: string, options: any = {}): GlobalMemoryItem | null {
  const normalized = compact(text.replace(/\s+/g, " "), 1800);
  if (shouldRejectCandidate(normalized)) return null;
  const createdAt = message.timestamp || now();
  const taxonomy = ccDurableMemoryTaxonomyReceipt(type, {
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

export function extractGlobalMemoryCandidates(messages: any[], sessionId: string) {
  const sourceIds = new Set(messages.map(message => String(message?.id || "")).filter(Boolean));
  const memory = loadGlobalAgentMemory();
  const candidates = MEMORY_ITEM_KEYS.flatMap(key => Array.isArray(memory[key]) ? memory[key] : [])
    .filter((item: any) => item?.semanticStatus === "confirmed")
    .filter((item: any) => String(item?.source?.sessionId || "") === String(sessionId || ""))
    .filter((item: any) => {
      const evidenceIds = [
        ...(Array.isArray(item?.evidenceMessageIds) ? item.evidenceMessageIds : []),
        ...(Array.isArray(item?.source?.messageIds) ? item.source.messageIds : []),
      ].map(String).filter(Boolean);
      return evidenceIds.some(id => sourceIds.has(id));
    }) as GlobalMemoryItem[];
  return { candidates, rejected: 0, mode: "confirmed_semantic_facts" };
}

function upsertItems(memory: any, items: GlobalMemoryItem[]) {
  let created = 0;
  let updated = 0;
  for (const item of items) {
    const list = Array.isArray(memory[item.type]) ? memory[item.type] : [];
    const index = list.findIndex((existing: any) => existing.id === item.id);
    if (index >= 0) {
      const priorMessageIds = new Set(list[index].source?.messageIds || []);
      const hasNewEvidence = (item.source.messageIds || []).some(id => !priorMessageIds.has(id));
      if (hasNewEvidence) updated += 1;
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
    } else { list.push(item); created += 1; }
    const controlled = applyMemoryControls("global" as any, "global-agent", { ...memory, [item.type]: list })?.[item.type] || [];
    const pinnedIds = new Set(controlled.filter((entry: any) => entry.memoryControl?.pinned).map((entry: any) => entry.id));
    const pinned = list.filter((entry: any) => pinnedIds.has(entry.id));
    const recent = list.filter((entry: any) => !pinnedIds.has(entry.id)).sort((a: any, b: any) => String(a.updatedAt).localeCompare(String(b.updatedAt))).slice(-Math.max(0, MAX_ITEMS_PER_TYPE - pinned.length));
    memory[item.type] = [...recent, ...pinned].slice(-MAX_ITEMS_PER_TYPE);
  }
  return { created, updated };
}

function buildSegmentSummary(messages: any[], candidates: GlobalMemoryItem[]) {
  const users = messages.filter(item => item.role === "user" && item.hidden_execution !== true);
  const assistant = messages.filter(item => item.role === "assistant" && item.hidden_execution !== true);
  const executionResults = messages.filter(item => item.type === "tool_result" || (item.hidden_execution === true && item.role === "user"));
  const errors = messages.filter(item => item?.structuredStatus === "failed" || item?.structuredStatus === "blocked").slice(-8);
  const paths = [...new Set(messages.flatMap(item => String(item.content || "").match(/(?:[A-Za-z]:\\[^\s"'<>|]+|\/?(?:[\w.-]+\/){1,8}[\w.-]+\.[A-Za-z0-9]{1,8})/g) || []))].slice(-30);
  const missionIds = [...new Set(messages.flatMap(item => [item.missionId, ...(String(item.content || "").match(/\b(?:mission|mq)[-_a-z0-9]{6,}\b/gi) || [])]).filter(Boolean))].slice(-20);
  const byType = (type: GlobalMemoryItemType) => candidates.filter(item => item.type === type).map(item => item.text).slice(-8);
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

function splitGlobalCompactionTimelineByCompleteTurns(messages: any[], maxTokens: number) {
  const rounds: any[][] = [];
  let current: any[] = [];
  for (const message of messages) {
    const startsNewTurn = message?.role === "user"
      && message?.hidden_execution !== true
      && current.some((item) => item?.role === "assistant" && item?.hidden_execution !== true);
    if (startsNewTurn && current.length) {
      rounds.push(current);
      current = [];
    }
    current.push(message);
  }
  if (current.length) rounds.push(current);

  const chunks: any[][] = [];
  let chunk: any[] = [];
  let chunkTokens = 0;
  for (const round of rounds) {
    const roundTokens = round.reduce((sum, item) => sum + estimateTokens(item?.content || item), 0);
    if (roundTokens > maxTokens) {
      const error: any = new Error(`单个完整对话轮次超过压缩模型容量：${roundTokens}/${maxTokens}`);
      error.code = "GLOBAL_COMPACTION_COMPLETE_TURN_TOO_LARGE";
      throw error;
    }
    if (chunk.length && chunkTokens + roundTokens > maxTokens) {
      chunks.push(chunk);
      chunk = [];
      chunkTokens = 0;
    }
    chunk.push(...round);
    chunkTokens += roundTokens;
  }
  if (chunk.length) chunks.push(chunk);
  return chunks;
}

function mergeGlobalChunkSummaries(summaries: any[], sourceMessageIds: string[]) {
  const list = (key: string, max: number) => summaries.flatMap((summary) => Array.isArray(summary?.[key]) ? summary[key] : []).map(String).filter(Boolean).slice(-max);
  return normalizeGlobalModelSummary({
    primaryRequest: summaries[0]?.primaryRequest || summaries.at(-1)?.primaryRequest || "",
    userRequests: list("userRequests", 20),
    keyOutcomes: list("keyOutcomes", 20),
    userAnchors: list("userAnchors", 16),
    feedback: list("feedback", 16),
    authorization: list("authorization", 16),
    decisions: list("decisions", 20),
    references: list("references", 24),
    unresolved: list("unresolved", 20),
    errors: list("errors", 16),
    filesAndResources: list("filesAndResources", 40),
    missionIds: list("missionIds", 24),
    latestOutcome: summaries.at(-1)?.latestOutcome || "",
  }, sourceMessageIds);
}

function calculateGlobalMessagesToKeepIndex(messages: any[], options: { floorIndex?: number; force?: boolean } = {}) {
  return calculateSessionMemoryKeepWindow(messages, { floorIndex: options.floorIndex });
}

function buildMicroCompactRecords(messages: any[]) {
  return messages.map((message: any) => {
    const content = String(message?.content || "");
    const compacted = microCompactText(content, 8000);
    if (!compacted.compacted) return null;
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

type GlobalSessionCompactionOptions = {
  force?: boolean;
  reason?: string;
  summaryOverride?: any;
  summarySource?: "model" | "session_memory";
  modelMetadata?: any;
  expectedSourceMessageIds?: string[];
  recordFailure?: boolean;
  currentRequest?: any;
  fixedContext?: any;
  tools?: any;
  recoveryContext?: any;
  modelVisiblePayload?: any;
  contextComponents?: any;
};

function globalFixedContext(memory: any, config: any, options: GlobalSessionCompactionOptions = {}) {
  return options.fixedContext || {
    scope: "global_only",
    model: config?.model || "",
    policy: memory?.privacy || null,
    longTermMemory: Object.fromEntries(MEMORY_ITEM_KEYS.map(key => [key, (memory?.[key] || []).slice(-12)])),
  };
}

function normalizeGlobalModelSummary(value: any, sourceMessageIds: string[]) {
  const list = (input: any, maxItems: number, maxChars = 1200) => (Array.isArray(input) ? input : [])
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

function validateGlobalModelSummary(summary: any, reference: any, sourceMessageIds: string[], context: { sessionId?: string; sourceMessages?: any[]; previousSummary?: any } = {}) {
  const issues: string[] = [];
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) issues.push("summary_not_object");
  if (sourceMessageIds.length && !String(summary?.primaryRequest || summary?.latestOutcome || "").trim()) issues.push("summary_core_empty");
  const actualIds = Array.isArray(summary?.sourceMessageIds) ? summary.sourceMessageIds.map(String) : [];
  if (actualIds.length !== sourceMessageIds.length || actualIds.some((id, index) => id !== sourceMessageIds[index])) issues.push("source_boundary_mismatch");
  for (const key of ["userAnchors", "feedback", "authorization", "decisions", "references", "unresolved"] as const) {
    const preserved = (Array.isArray(summary?.[key]) ? summary[key] : []).map(String);
    for (const anchor of reference?.[key] || []) if (!preserved.includes(String(anchor))) issues.push(`${key}_anchor_missing`);
  }
  const quality = evaluateSessionSummaryQuality({
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

function commitGlobalAgentSessionCompaction(sessionId: string, options: GlobalSessionCompactionOptions = {}) {
  const transcript = loadGlobalAgentTranscript(sessionId);
  const memory = loadGlobalAgentMemory();
  const session = memory.sessions.find((item: any) => item.sessionId === sessionId) || { sessionId, lastCompactedIndex: -1, recentMessageIds: [] };
  const state = globalSessionCompactionState(session, sessionId);
  const canonicalSummary = canonicalGlobalSessionSummary(session, state);
  if (!options.summaryOverride || !["model", "session_memory"].includes(String(options.summarySource || ""))) {
    const error: any = new Error("全局会话 canonical compact 必须提供已验证的模型摘要或 Session Memory");
    error.code = "GLOBAL_SESSION_CANONICAL_MODEL_SUMMARY_REQUIRED";
    throw error;
  }
  const floorIndex = state.lastCompactedIndex + 1;
  const unsummarized = transcript.messages.slice(floorIndex);
  const unsummarizedExecution = globalExecutionForMessages(transcript, unsummarized);
  const unsummarizedModelTimeline = mergeConversationWithExecution(unsummarized, unsummarizedExecution);
  const config = loadOrchestratorConfig();
  const effectiveContextPolicy = resolveMainAgentContextPolicy(config).effective;
  const modelCapacity = resolveGroupModelContextCapacity(config);
  const threshold = getGroupAutoCompactThreshold(config);
  const triggerPayload = buildModelVisiblePayloadSnapshot({
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
  const tokenMeasurement = measureSessionContextTokens({
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
  if (sessionCompactionCircuitOpen(state) && !options.force) {
    return { compacted: false, reason: "circuit_breaker", tokenCount, messageCount: unsummarized.length, memory };
  }
  try {
    const recentWindow = calculateSessionMemoryKeepWindow(transcript.messages, {
      floorIndex,
      lastSummarizedMessageId: String(state.sessionMemoryState?.lastExtractedMessageId || ""),
    });
    const keepStart = recentWindow.startIndex;
    const segment = transcript.messages.slice(Number(session.lastCompactedIndex || -1) + 1, keepStart);
    if (segment.length === 0) return { compacted: false, reason: "nothing_to_compact", tokenCount, messageCount: unsummarized.length, memory };
    const segmentExecution = globalExecutionForMessages(transcript, segment);
    const segmentModelTimeline = mergeConversationWithExecution(segment, segmentExecution);
    const extracted = extractGlobalMemoryCandidates(segment, sessionId);
    const expectedSourceMessageIds = segmentModelTimeline.map((item: any) => String(item.id));
    if (options.expectedSourceMessageIds && (
      options.expectedSourceMessageIds.length !== expectedSourceMessageIds.length
      || options.expectedSourceMessageIds.some((id, index) => id !== expectedSourceMessageIds[index])
    )) throw new Error("全局 Agent 会话在模型摘要期间发生变化，请重试压缩");
    const summary = normalizeGlobalModelSummary(options.summaryOverride, expectedSourceMessageIds);
    const microCompactRecords = buildMicroCompactRecords(segmentModelTimeline);
    const keptMessages = transcript.messages.slice(keepStart);
    const keptExecution = globalExecutionForMessages(transcript, keptMessages);
    const keptModelTimeline = mergeConversationWithExecution(keptMessages, keptExecution);
    const recentTokenCount = keptModelTimeline.reduce((sum: number, item: any) => sum + estimateTokens(item.content), 0);
    const nextBoundaryGeneration = state.boundaryGeneration + 1;
    const globalToolAuthorization = getGlobalAgentToolAuthorizationPayload();
    const dynamicToolIdentity = {
      agentKind: "global" as const,
      scope: "global" as const,
      scopeId: "global-agent",
      exactSessionId: sessionId,
      generation: nextBoundaryGeneration,
    };
    const dynamicToolScope = {
      ...globalToolAuthorization.tools,
      auditContext: { runtime: "global-agent", sessionId, source: "post-compact-restore" },
    };
    const dynamicContextRestoreManifest = buildMainAgentPostCompactRestoreManifest({
      identity: dynamicToolIdentity,
      boundaryGeneration: nextBoundaryGeneration,
      scope: dynamicToolScope,
    });
    const dynamicContextRestore = restoreMainAgentPostCompactContext({
      identity: dynamicToolIdentity,
      scope: dynamicToolScope,
      manifest: dynamicContextRestoreManifest,
      maxPerSkillTokens: effectiveContextPolicy.postCompactSkillPerItemMaxTokens,
      maxTotalSkillTokens: effectiveContextPolicy.postCompactSkillTotalMaxTokens,
    });
    const restoredMcpCatalog = toolManager.getScopedToolCatalog(dynamicToolScope).tools
      .filter((tool: any) => dynamicContextRestore.loadedToolNames.includes(String(tool.canonicalName || tool.name || "")));
    const hasDynamicRestorePayload = dynamicContextRestore.skillAttachments.length > 0 || restoredMcpCatalog.length > 0;
    const postCompactPayload = (!hasDynamicRestorePayload && options.modelVisiblePayload) || buildModelVisiblePayloadSnapshot({
      scope: "global",
      sessionId,
      system: globalFixedContext(memory, config, options),
      tools: options.tools || null,
      activeSummary: summary,
      recentMessages: keptModelTimeline,
      currentRequest: options.currentRequest || null,
      recoveryContext: options.recoveryContext || null,
      hookResults: options.modelMetadata?.hookResults?.sessionStart || [],
      contextComponents: {
        ...(options.contextComponents || {}),
        messageSkills: dynamicContextRestore.skillAttachments,
        messageMcpTools: selectUserMcpToolDefinitions(restoredMcpCatalog),
      },
    });
    const postCompactTokenCount = postCompactPayload.totalTokens;
    const postCompactGate = {
      ...buildSessionPostCompactGate({ modelVisiblePayload: postCompactPayload, threshold }),
      formalRecompaction: options.modelMetadata?.formalRecompaction || null,
    };
    if (postCompactGate.providerCallAllowed !== true) {
      const error: any = new Error(`全局 Agent 会话压缩后仍超过阈值：${postCompactTokenCount}/${threshold}`);
      error.code = "GLOBAL_SESSION_POST_COMPACT_THRESHOLD_EXCEEDED";
      error.postCompactGate = postCompactGate;
      throw error;
    }
    const contextBudget = buildContextBudget({
      context: {
        summary,
        recent: keptModelTimeline.map((item: any) => ({ id: item.id, role: item.role, content: microCompactText(item.content, 1800).text })),
      },
      maxChars: 48_000,
      maxTokens: SESSION_MEMORY_MAX_KEEP_TOKENS + COMPACT_TOKEN_THRESHOLD,
    });
    const postCompactRestore = {
      strategy: "summary_recent_anchor_reinject",
      filesAndResources: (summary.filesAndResources || []).slice(-8),
      references: (summary.references || []).slice(-8),
      missionIds: (summary.missionIds || []).slice(-8),
      sourceMessageIds: (summary.sourceMessageIds || []).slice(-12),
      recentMessageIds: keptModelTimeline.slice(-12).map((item: any) => item.id),
      dynamicContextRestoreManifest,
      dynamicContextRestoreReceipt: dynamicContextRestore.receipt,
    };
    const boundaryMarker = buildSessionCompactionBoundaryMarker({
      scope: "global",
      sessionId,
      generation: nextBoundaryGeneration,
      summarizedThroughMessageId: segment.at(-1)?.id || "",
      previousSummaryChecksum: state.activeSummaryChecksum || (canonicalSummary ? sha(canonicalSummary, 40) : ""),
      preservedMessageIds: keptModelTimeline.map((item: any) => String(item.id || "")),
      dynamicContextRestoreManifest,
    });
    const archive: any = {
      id: `gma_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`,
      sessionId,
      fromIndex: state.lastCompactedIndex + 1,
      toIndex: keepStart - 1,
      from: segment[0]?.timestamp || "",
      to: segment.at(-1)?.timestamp || "",
      count: segmentModelTimeline.length,
      visibleMessageCount: segment.length,
      executionMessageCount: segmentExecution.length,
      records: segmentModelTimeline.map((item: any) => ({ id: item.id, role: item.role, type: item.type || "message", timestamp: item.timestamp, contentHash: sha(item.content, 40) })),
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
    const nextCompaction = resetSessionCompactionFailures({
      ...state,
      activeSummary: summary,
      activeSummaryChecksum: sha(summary, 40),
      previousSummaryChecksum: state.activeSummaryChecksum || (canonicalSummary ? sha(canonicalSummary, 40) : ""),
      lastCompactedIndex: keepStart - 1,
      lastCompactedMessageId: segment.at(-1)?.id || "",
      preservedRecentMessageIds: keptModelTimeline.map((item: any) => String(item.id || "")),
      preservedRecentTokens: recentTokenCount,
      preservedRecentTextMessageCount: recentWindow.preservedTextMessageCount,
      tokenMeasurement,
      sessionMemoryState: options.modelMetadata?.sessionMemoryState ?? state.sessionMemoryState ?? null,
      postCompactGate,
      latestProviderUsage: null,
      lastCompactedAt: now(),
      boundaryGeneration: nextBoundaryGeneration,
      modelVisiblePayloadChecksum: postCompactPayload.payloadChecksum,
      fixedContextChecksum: postCompactPayload.fixedContextChecksum,
      pendingRequestChecksum: postCompactPayload.pendingRequestChecksum,
      boundaryMarker,
      preservedSegmentChecksum: sessionCompactionChecksum(keptModelTimeline.map((item: any) => String(item.id || ""))),
      recoveryContextTokens: postCompactPayload.tokenBreakdown.recoveryContext,
      hookResultTokens: postCompactPayload.tokenBreakdown.hookResults,
      ptlRecoveryAttempts: Number(options.modelMetadata?.promptTooLongRetries || 0),
      formalRecompaction: options.modelMetadata?.formalRecompaction || null,
      unifiedCompaction: options.modelMetadata?.unifiedCompaction || null,
      dynamicContextRestoreManifest,
      dynamicContextRestoreReceipt: dynamicContextRestore.receipt,
    });
    const nextSession = {
      ...session,
      sessionId,
      source: transcript.source,
      summary,
      lastCompactedIndex: keepStart - 1,
      lastCompactedMessageId: segment.at(-1)?.id || "",
      recentMessageIds: transcript.messages.slice(keepStart).map((item: any) => item.id),
      preCompactTokenCount: tokenCount,
      postCompactTokenCount,
      lastCompactedAt: now(),
      summarySource: archive.summarySource,
      model: archive.model,
      modelVisiblePayload: postCompactPayload,
      compaction: nextCompaction,
      unifiedSessionCompaction: options.modelMetadata?.unifiedStateV1 || null,
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
    persistMainAgentPostCompactRestoreManifest(dynamicContextRestoreManifest);
    recordMemoryOperation({ action: "compact", scope: "global", scopeId: "global-agent", sessionId, archiveId: archive.id, reason: options.reason || "auto", beforeTokens: nextSession.preCompactTokenCount, afterTokens: nextSession.postCompactTokenCount, rejectedCandidates: extracted.rejected });
    return { compacted: true, archive, session: nextSession, memory };
  } catch (error: any) {
    if (options.recordFailure !== false) {
      const failedState = recordSessionCompactionFailure(state, error);
      replaceGlobalSession(memory, sessionId, { ...session, sessionId, compaction: failedState });
      memory.compaction = { ...(memory.compaction || {}), health: "degraded", lastError: failedState.lastError, lastFailureAt: failedState.lastFailureAt, latestSessionId: sessionId };
      saveMemory(memory);
    }
    throw error;
  }
}

/** The only production global-session compression lifecycle. */
async function runUnifiedGlobalSessionCompaction(sessionId: string, options: any = {}) {
  const exactSessionId = String(sessionId || "").trim();
  if (!exactSessionId) throw new Error("global_session_required");
  const config = loadOrchestratorConfig();
  const threshold = getGroupAutoCompactThreshold(config);
  const modelCapacity = resolveGroupModelContextCapacity(config);
  const sourceChecksum = (transcript: any, session: any) => sha({
    messages: (transcript?.messages || []).map((item: any) => String(item?.id || item?.messageId || "")),
    execution: (transcript?.executionMessages || []).map((item: any) => String(item?.id || "")),
    generation: Number(session?.unifiedSessionCompaction?.boundaryGeneration || 0),
  }, 64);
  let acquiredChecksum = "";
  const adapter = createGlobalSessionCompactionAdapter({
    sessionId: exactSessionId,
    acquire: () => {
      const transcript = loadGlobalAgentTranscript(exactSessionId);
      const memory = loadGlobalAgentMemory();
      const session = memory.sessions.find((item: any) => item.sessionId === exactSessionId) || { sessionId: exactSessionId };
      acquiredChecksum = sourceChecksum(transcript, session);
      let released = false;
      return {
        scope: "global",
        exactSessionId,
        generation: Number(session?.unifiedSessionCompaction?.boundaryGeneration || 0),
        checksum: acquiredChecksum,
        acquiredAt: new Date().toISOString(),
        release: () => { released = true; void released; },
      };
    },
    load: () => {
      const transcript = loadGlobalAgentTranscript(exactSessionId);
      const memory = loadGlobalAgentMemory();
      const session = memory.sessions.find((item: any) => item.sessionId === exactSessionId) || { sessionId: exactSessionId, unifiedSessionCompaction: null, unifiedSessionSummary: null };
      const state = session.unifiedSessionCompaction || {};
      return {
        messages: transcript.messages,
        executionEvents: transcript.executionMessages,
        activeSummary: session.unifiedSessionSummary || null,
        previousState: state,
        boundaryGeneration: Number(state.boundaryGeneration || 0),
        compactionFloorIndex: Number(state.summarizedMessageCount || 0),
        recoveryContext: options.recoveryContext || session.unifiedRecoveryContext || {
          permissionBoundary: "global-agent",
          taskBindings: session.taskBindings || [],
          planBindings: session.planBindings || [],
        },
        contextComponents: options.contextComponents || {},
        providerUsage: state.providerUsage || null,
        currentRequest: options.currentRequest || null,
        sourceChecksum: sourceChecksum(transcript, session),
        scope: "global",
        exactSessionId,
      } as any;
    },
    validate: () => {
      const transcript = loadGlobalAgentTranscript(exactSessionId);
      const memory = loadGlobalAgentMemory();
      const session = memory.sessions.find((item: any) => item.sessionId === exactSessionId) || { sessionId: exactSessionId };
      if (sourceChecksum(transcript, session) !== acquiredChecksum) throw new Error("global_compaction_fence_stale");
    },
    commit: (result, fence) => {
      const transcript = loadGlobalAgentTranscript(exactSessionId);
      const memory = loadGlobalAgentMemory();
      const session = memory.sessions.find((item: any) => item.sessionId === exactSessionId) || { sessionId: exactSessionId };
      if (sourceChecksum(transcript, session) !== fence.checksum) throw new Error("global_compaction_commit_fence_stale");
      const floorIndex = Math.max(0, Number(result.snapshot.compactionFloorIndex ?? result.snapshot.previousState?.summarizedMessageCount ?? 0));
      const summarizedThroughIndex = Math.max(floorIndex, Number(result.preservedRecentWindow.startIndex || floorIndex)) - 1;
      const summarizedMessages = transcript.messages.slice(floorIndex, summarizedThroughIndex + 1);
      const summary = result.fullCompaction.summary;
      if (!summary || summary.schema !== "ccm-unified-session-summary-v1") throw new Error("global_compaction_summary_missing");
      const recovery = result.recoveryContext;
      const state = buildUnifiedSessionCompactionStateV1({
        receipt: result.receipt,
        summaryQuality: result.summaryQuality,
        microCompact: result.microCompact,
        recoveryContext: recovery,
        triggerReason: options.reason || "automatic",
        summarizedThroughMessageId: summarizedMessages.at(-1)?.id || "",
        summarizedMessageCount: summarizedThroughIndex + 1,
        preservedRecentMessageIds: result.preservedRecentWindow.messages.map((item: any) => String(item?.id || "")),
      });
      const extracted = extractGlobalMemoryCandidates(summarizedMessages, exactSessionId);
      upsertItems(memory, extracted.candidates);
      const archive = {
        id: `guc_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`,
        sessionId: exactSessionId,
        sourceMessageIds: summary.sourceMessageIds,
        sourceMessageCount: summary.sourceMessageIds.length,
        summaryChecksum: unifiedSummaryChecksum(summary),
        previousSummaryChecksum: session.unifiedSessionSummary ? unifiedSummaryChecksum(session.unifiedSessionSummary) : "",
        receiptChecksum: result.receipt.checksum,
        contentStored: false,
        summarySource: "model",
        provider: String(result.modelMetadata?.provider || ""),
        model: String(result.modelMetadata?.model || ""),
        createdAt: new Date().toISOString(),
      };
      const nextSession = {
        ...session,
        sessionId: exactSessionId,
        unifiedSessionSummary: summary,
        unifiedSessionCompaction: state,
        unifiedRecoveryContext: recovery,
        unifiedSessionBoundary: {
          summarizedThroughMessageId: summarizedMessages.at(-1)?.id || "",
          summarizedMessageCount: summarizedThroughIndex + 1,
          preservedRecentMessageIds: result.preservedRecentWindow.messages.map((item: any) => String(item?.id || "")),
          checksum: sha({ summarizedThroughIndex, summaryChecksum: unifiedSummaryChecksum(summary) }, 64),
        },
        summarySource: "model",
        model: {
          provider: String(result.modelMetadata?.provider || ""),
          model: String(result.modelMetadata?.model || ""),
          autoCompactTokenLimit: threshold,
          modelContextCapacity: modelCapacity,
        },
        boundary: {
          type: "compact_boundary",
          preservedMessageCount: result.preservedRecentWindow.messages.length,
          preservedTokenCount: result.preservedRecentWindow.tokens,
          preservedTextMessageCount: result.preservedRecentWindow.textMessageCount,
          recent_window: result.preservedRecentWindow,
        },
        updatedAt: new Date().toISOString(),
      };
      replaceGlobalSession(memory, exactSessionId, nextSession);
      memory.archives = [...(memory.archives || []), archive].slice(-1000);
      memory.privacy = { ...(memory.privacy || {}), encryptedTranscripts: true, lastScanAt: new Date().toISOString() };
      saveMemory(memory);
      return nextSession;
    },
    failure: (error) => {
      const memory = loadGlobalAgentMemory();
      const session = memory.sessions.find((item: any) => item.sessionId === exactSessionId);
      if (!session) return;
      replaceGlobalSession(memory, exactSessionId, {
        ...session,
        unifiedSessionCompactionFailure: {
          code: String((error as any)?.code || "CCM_UNIFIED_COMPACTION_FAILED"),
          message: String((error as any)?.message || error || "compaction failed").slice(0, 300),
          at: new Date().toISOString(),
          contentStored: false,
        },
      });
      memory.compaction = { ...(memory.compaction || {}), health: "degraded", lastError: String((error as any)?.message || error).slice(0, 300), lastFailureAt: new Date().toISOString(), latestSessionId: exactSessionId };
      saveMemory(memory);
    },
  });
  const modelCall = options.modelCall || ((request: any) => callUnifiedCompactionModel(config, request.system, request.user, request.maxOutputTokens, {
    beforeRequest: ({ provider, model }) => { options.onCompactionActivity?.({ stage: "model_summary_request", provider, model }); },
  }));
  const result: any = await createUnifiedSessionCompactionEngine({
    adapter,
    config: { ...config, autoCompactThreshold: threshold },
    force: options.force,
    promptTooLong: options.promptTooLong,
    reason: options.reason,
    customInstructions: options.customInstructions,
    modelCall,
    buildProjection: (snapshot: any) => options.modelVisiblePayload || buildModelVisiblePayloadSnapshot({
      scope: "global",
      sessionId: exactSessionId,
      system: options.fixedContext || globalFixedContext(loadGlobalAgentMemory(), config, options),
      tools: options.tools || null,
      activeSummary: snapshot.activeSummary,
      recentMessages: mergeConversationWithExecution(snapshot.messages, snapshot.executionEvents),
      currentRequest: options.currentRequest || null,
      recoveryContext: snapshot.recoveryContext,
      hookResults: [],
      contextComponents: options.contextComponents || {},
    }),
    buildPostCompactPayload: ({ summary, preservedTimeline, recoveryContext }: any) => buildModelVisiblePayloadSnapshot({
      scope: "global",
      sessionId: exactSessionId,
      system: options.fixedContext || globalFixedContext(loadGlobalAgentMemory(), config, options),
      tools: options.tools || null,
      activeSummary: summary,
      recentMessages: preservedTimeline,
      currentRequest: options.currentRequest || null,
      recoveryContext,
      hookResults: [],
      contextComponents: options.contextComponents || {},
    }),
    measure: (payload: any) => Number(payload?.totalTokens || estimateTextTokens(JSON.stringify(payload || {}))),
    qualityReference: (snapshot: any) => {
      const remembered = loadGlobalAgentMemory();
      const authorizationBoundaries = (remembered.authorization || [])
        .filter((item: any) => !item?.source?.sessionId || String(item.source.sessionId) === exactSessionId)
        .map((item: any) => String(item.text || item.value || ""))
        .filter(Boolean).slice(-24);
      return { userGoals: [], authorizationBoundaries, fileReferences: [], verificationEvidence: [], pendingWork: [], sourceMessageIds: [] };
    },
  }).run();
  const persistedMemory = loadGlobalAgentMemory();
  const persistedSession = persistedMemory.sessions.find((item: any) => item.sessionId === exactSessionId) || null;
  const persistedArchive = [...(persistedMemory.archives || [])].reverse().find((item: any) => item.sessionId === exactSessionId && item.receiptChecksum === result.receipt.checksum) || null;
  if (!result.compacted && result.reason === "below_threshold" && persistedSession?.compaction) {
    persistedSession.compaction.consecutiveFailures = 0;
    persistedSession.compaction.lastFailureAt = "";
    persistedSession.compaction.lastError = "";
    saveMemory(persistedMemory);
  }
  return {
    compacted: result.compacted,
    reason: result.reason,
    before_tokens: result.receipt.beforeTokens,
    after_tokens: result.receipt.afterTokens,
    summary_source: result.receipt.summarySource,
    boundary_generation: result.boundaryGeneration,
    unifiedSessionSummary: result.fullCompaction.summary,
    unifiedSessionCompaction: result.receipt,
    model_context_capacity: modelCapacity,
    auto_compact_threshold: threshold,
    contentStored: false,
    archive: persistedArchive,
    session: persistedSession,
    legacySummaryIgnored: Boolean(persistedSession?.summary && !persistedSession?.unifiedSessionSummary),
  };
}

export async function compactGlobalAgentSessionWithModel(sessionId: string, options: {
  force?: boolean;
  promptTooLong?: boolean;
  reason?: string;
  customInstructions?: string;
  modelCall?: (request: any) => Promise<any>;
  currentRequest?: any;
  fixedContext?: any;
  tools?: any;
  recoveryContext?: any;
  modelVisiblePayload?: any;
  contextComponents?: any;
  postCompactPayloadBuilder?: (input: any) => Promise<any> | any;
} = {}) {
 return runUnifiedGlobalSessionCompaction(sessionId, options);
}

function scheduleGlobalAgentModelCompaction(sessionId: string) {
  void compactGlobalAgentSessionWithModel(sessionId, { reason: "auto_model" })
    .catch(error => console.warn(`[全局记忆] 自动模型压缩失败 (${sessionId})：${error?.message || error}`));
  return { scheduled: true, mode: "model_required", sessionId };
}

export function scheduleGlobalAgentSessionMemoryExtraction(sessionId: string, options: { modelCall?: (request: any) => Promise<any> } = {}) {
  const exactSessionId = String(sessionId || "").trim();
  if (!exactSessionId) return { scheduled: false, reason: "session_missing" };
  const transcript = loadGlobalAgentTranscript(exactSessionId);
  const memory = loadGlobalAgentMemory();
  const session = memory.sessions.find((item: any) => item.sessionId === exactSessionId) || { sessionId: exactSessionId };
  const state = globalSessionCompactionState(session, exactSessionId);
  const floorIndex = state.lastCompactedIndex + 1;
  const recentWindow = calculateSessionMemoryKeepWindow(transcript.messages, { floorIndex });
  const keepStart = recentWindow.startIndex;
  const visibleTimeline = transcript.messages.slice(floorIndex, keepStart);
  if (!visibleTimeline.length) return { scheduled: false, reason: "no_compactable_messages" };
  const timelineExecution = globalExecutionForMessages(transcript, visibleTimeline);
  const timeline = mergeConversationWithExecution(visibleTimeline, timelineExecution);
  const cadence = evaluateSessionMemoryCadence(mergeConversationWithExecution(transcript.messages.slice(0, keepStart), globalExecutionForMessages(transcript, transcript.messages.slice(0, keepStart))), state.sessionMemoryState || {});
  if (!cadence.shouldExtract) return { scheduled: false, reason: cadence.reason, cadence };
  const extracted = extractGlobalMemoryCandidates(visibleTimeline, exactSessionId);
  const currentReference = buildSegmentSummary(timeline, extracted.candidates);
  const previousSummary = state.sessionMemoryState?.summary || state.activeSummary || null;
  const mergeList = (key: string, max: number) => [
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
  const sourceMessageIds = timeline.map((item: any) => String(item.id || ""));
  const config = loadOrchestratorConfig();
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
    transcriptChecksum: sessionCompactionChecksum([
      ...transcript.messages.map((message: any) => [message.id, message.role, message.content]),
      ...normalizeSessionExecutionEvents(transcript.executionMessages).map(message => [message.id, message.type, message.toolCallId, message.payload]),
    ]),
    cadence: { ...cadence, sourceLastMessageId: String(timeline.at(-1)?.id || ""), sourceMessageIds },
  };
  const invoke = options.modelCall || ((request: any) => callCompactionModel(config, request.system, request.user, request.maxOutputTokens));
  const scheduled = scheduleSessionMemoryExtraction({
    scope: "global",
    sessionId: exactSessionId,
    identity,
    extract: () => invoke({ system, user, maxOutputTokens: GLOBAL_COMPACTION_MODEL_MAX_OUTPUT_TOKENS, sessionMemory: true }),
    commit: async (raw, expected) => {
      const latestTranscript = loadGlobalAgentTranscript(exactSessionId);
      const latestMemory = loadGlobalAgentMemory();
      const latestSession = latestMemory.sessions.find((item: any) => item.sessionId === exactSessionId) || { sessionId: exactSessionId };
      const latestState = globalSessionCompactionState(latestSession, exactSessionId);
      if (latestState.boundaryGeneration !== expected.boundaryGeneration
        || String(latestTranscript.messages.at(-1)?.id || "") !== expected.transcriptLastMessageId
        || sessionCompactionChecksum([
          ...latestTranscript.messages.map((message: any) => [message.id, message.role, message.content]),
          ...normalizeSessionExecutionEvents(latestTranscript.executionMessages).map(message => [message.id, message.type, message.toolCallId, message.payload]),
        ]) !== expected.transcriptChecksum) {
        return { committed: false, reason: "stale_identity" };
      }
      const candidate = raw?.summary || raw;
      const validation = validateGlobalModelSummary(bindTrustedGlobalSourceBoundary(candidate, sourceMessageIds), reference, sourceMessageIds, {
        sessionId: exactSessionId,
        sourceMessages: timeline,
        previousSummary: state.activeSummary,
      });
      if (!validation.valid) throw new Error(`全局 Session Memory 校验失败：${validation.issues.join(", ")}`);
      const summary = normalizeGlobalModelSummary(candidate, sourceMessageIds);
      const sessionMemoryState = buildSessionMemoryState({
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

async function extractGlobalLongTermMemoryWithModel(sessionId: string) {
  const exactSessionId = String(sessionId || "").trim();
  const transcript = loadGlobalAgentTranscript(exactSessionId);
  const memory = loadGlobalAgentMemory();
  const session = memory.sessions.find((item: any) => item.sessionId === exactSessionId) || { sessionId: exactSessionId };
  const cursor = String(session?.longTermMemoryExtraction?.cursorMessageId || "");
  const cursorIndex = cursor ? transcript.messages.findIndex((item: any) => String(item.id || "") === cursor) : -1;
  const sourceMessages = transcript.messages
    .slice(cursorIndex + 1)
    .filter((item: any) => item.hidden_execution !== true && ["user", "assistant"].includes(String(item.role || "")));
  if (!sourceMessages.length || sourceMessages.at(-1)?.role !== "assistant" || !sourceMessages.some((item: any) => item.role === "user")) {
    return { scheduled: false, reason: "complete_turn_not_ready" };
  }
  const batch = sourceMessages.slice(0, 24);
  while (batch.length && batch.at(-1)?.role !== "assistant") batch.pop();
  if (!batch.length || !batch.some((item: any) => item.role === "user")) return { scheduled: false, reason: "complete_turn_not_ready" };
  const bounded = batch.map((item: any) => ({ id: String(item.id || ""), role: String(item.role || ""), content: String(item.content || "") }));
  const byId = new Map<string, { id: string; role: string; content: string }>(bounded.map(item => [item.id, item]));
  const result = await runSemanticDecision<MemorySemanticExtractionV1>({
    kind: "memory_extraction",
    identity: { scope: "global", scopeId: "global-agent", sessionId: exactSessionId },
    system: [
      "You are the CCM global Agent long-term memory extractor. Save only facts, preferences, authorization boundaries, decisions, references, and unresolved items explicitly expressed by the user and useful across sessions.",
      "Ordinary answers, one-off requests, assistant guesses, and process text must use operation=ignore. Use operation=supersede to correct an older item. Never classify mechanically by keywords.",
      "Every non-ignore candidate must cite an exact message ID and a short verbatim quote from that message.",
      "Return JSON only: {\"candidates\":[{\"type\":\"user|feedback|authorization|decisions|unresolved|references\",\"operation\":\"add|update|supersede|ignore\",\"text\":\"normalized fact\",\"evidenceMessageIds\":[],\"evidenceQuotes\":[],\"confidence\":0.0,\"applicableScope\":\"global-agent\",\"supersedes\":[]}]}",
    ].join("\n"),
    input: { messages: bounded },
    maxTokens: 2_400,
    validate: value => {
      const rows = Array.isArray(value?.candidates) ? value.candidates : [];
      const allowedTypes = new Set<GlobalMemoryItemType>(["user", "feedback", "authorization", "decisions", "unresolved", "references"]);
      const allowedOperations = new Set(["add", "update", "supersede", "ignore"]);
      const candidates = rows.slice(0, 30).map((row: any) => {
        const type = String(row?.type || "") as GlobalMemoryItemType;
        const operation = String(row?.operation || "");
        const text = compact(row?.text, 1_800);
        const evidenceMessageIds = Array.isArray(row?.evidenceMessageIds || row?.evidence_message_ids) ? (row.evidenceMessageIds || row.evidence_message_ids).map(String).filter(Boolean).slice(0, 20) : [];
        const evidenceQuotes = Array.isArray(row?.evidenceQuotes || row?.evidence_quotes) ? (row.evidenceQuotes || row.evidence_quotes).map((item: any) => compact(item, 500)).filter(Boolean).slice(0, 20) : [];
        if (!allowedTypes.has(type) || !allowedOperations.has(operation)) throw new Error("global_memory_semantic_candidate_invalid");
        if (operation !== "ignore") {
          if (!text || containsSensitiveData(text) || !evidenceMessageIds.length || !evidenceQuotes.length) throw new Error("global_memory_semantic_evidence_required");
          if (evidenceMessageIds.some((id: string) => !byId.has(id))) throw new Error("global_memory_semantic_message_scope_mismatch");
          if (evidenceQuotes.some((quote: string) => !evidenceMessageIds.some((id: string) => String(byId.get(id)?.content || "").includes(quote)))) throw new Error("global_memory_semantic_quote_mismatch");
        }
        return {
          type,
          operation: operation as "add" | "update" | "supersede" | "ignore",
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
  const accepted: GlobalMemoryItem[] = [];
  for (const row of result.value.candidates) {
    if (row.operation === "ignore" || row.confidence < 0.65) continue;
    if (row.operation === "supersede") {
      const removeIds = new Set(row.supersedes || []);
      for (const key of MEMORY_ITEM_KEYS) memory[key] = (memory[key] || []).filter((item: any) => !removeIds.has(String(item.id || "")));
    }
    const sourceMessage = byId.get(row.evidenceMessageIds[0]);
    const item = candidate(row.type as GlobalMemoryItemType, row.text, {
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
    if (item) accepted.push(item);
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
  recordMemoryOperation({ action: "model_semantic_ingest", scope: "global", scopeId: "global-agent", sessionId: exactSessionId, created: upsert.created, updated: upsert.updated, itemIds: accepted.map(item => item.id), semanticDecisionReceipt: result.receipt });
  return {
    scheduled: true,
    committed: true,
    candidates: accepted.length,
    receipt: result.receipt,
    remaining: String(bounded.at(-1)?.id || "") !== String(sourceMessages.at(-1)?.id || ""),
  };
}

function scheduleGlobalLongTermMemoryExtraction(sessionId: string) {
  const exactSessionId = String(sessionId || "").trim();
  const existing = globalLongTermExtractions.get(exactSessionId);
  if (existing) return { scheduled: false, mode: "model_semantic", reason: "already_in_flight" };
  let hasMore = false;
  const operation = (async () => {
    let result: any = null;
    for (let batch = 0; batch < 8; batch += 1) {
      result = await extractGlobalLongTermMemoryWithModel(exactSessionId);
      hasMore = result?.remaining === true;
      if (!result?.committed || !hasMore) break;
    }
    return result;
  })().catch(error => {
    const memory = loadGlobalAgentMemory();
    const session = memory.sessions.find((item: any) => item.sessionId === exactSessionId) || { sessionId: exactSessionId };
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
    if (hasMore) setTimeout(() => scheduleGlobalLongTermMemoryExtraction(exactSessionId), 0);
  });
  globalLongTermExtractions.set(exactSessionId, operation);
  return { scheduled: true, mode: "model_semantic" };
}

export function ingestGlobalAgentConversation(input: { sessionId: string; source?: string; messages: any[]; compact?: boolean; extractMemory?: boolean }) {
  const sessionId = String(input.sessionId || "default");
  const transcript = loadGlobalAgentTranscript(sessionId);
  transcript.source = input.source || transcript.source || "global-agent";
  const byId = new Map(transcript.messages.map((item: any) => [item.id, item]));
  let assistantAdded = false;
  for (const raw of input.messages || []) {
    const message = normalizeMessage(raw, sessionId, input.source);
    if (!message.content.trim()) continue;
    const duplicate = [...byId.values()].reverse().find((item: any) => item.role === message.role && item.content === message.content && Math.abs(Date.parse(item.timestamp) - Date.parse(message.timestamp)) <= 10_000);
    if (duplicate) continue;
    byId.set(message.id, message);
    if (message.role === "assistant") assistantAdded = true;
  }
  transcript.messages = [...byId.values()].sort((a: any, b: any) => String(a.timestamp).localeCompare(String(b.timestamp)));
  transcript.updatedAt = now();
  saveTranscript(transcript);
  const memory = loadGlobalAgentMemory();
  memory.privacy = { ...(memory.privacy || {}), encryptedTranscripts: true, lastScanAt: now() };
  const sessionIndex = memory.sessions.findIndex((item: any) => item.sessionId === sessionId);
  const session = { ...(sessionIndex >= 0 ? memory.sessions[sessionIndex] : {}), sessionId, source: transcript.source, messageCount: transcript.messages.length, transcriptUpdatedAt: transcript.updatedAt };
  if (sessionIndex >= 0) memory.sessions[sessionIndex] = session; else memory.sessions.push(session);
  saveMemory(memory);
  if (assistantAdded && input.extractMemory !== false) {
    scheduleGlobalLongTermMemoryExtraction(sessionId);
    scheduleGlobalAgentSessionMemoryExtraction(sessionId);
  }
  const compaction = input.compact === false ? null : scheduleGlobalAgentModelCompaction(sessionId);
  return {
    transcript: { sessionId, messageCount: transcript.messages.length, updatedAt: transcript.updatedAt },
    extracted: 0,
    extraction: assistantAdded
      ? input.extractMemory === false ? "skipped_for_model_confirmed_direct_reply" : "model_semantic_scheduled"
      : "awaiting_complete_turn",
    rejected: 0,
    compaction,
  };
}

function queryTerms(text: string) {
  const lower = String(text || "").toLowerCase();
  const words = lower.match(/[a-z0-9_./:@-]{2,}|[\u3400-\u9fff]{2,}/g) || [];
  const chinese = (lower.match(/[\u3400-\u9fff]/g) || []).join("");
  const bigrams = Array.from({ length: Math.max(0, chinese.length - 1) }, (_, index) => chinese.slice(index, index + 2));
  return [...new Set([...words, ...bigrams])].slice(0, 200);
}

function relevanceScore(item: any, query: string) {
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

export function recallGlobalAgentMemory(query: string, options: { sessionId?: string; limit?: number; recordMetric?: boolean; memoryPolicy?: "use" | "ignore"; workflowDecision?: any } = {}) {
  const memoryPolicy = String(options.memoryPolicy || options.workflowDecision?.memoryPolicy || options.workflowDecision?.memory_policy || "use");
  if (memoryPolicy === "ignore") return { ignored: true, items: [], sessionSummary: null, citations: [] };
  const raw = loadGlobalAgentMemory();
  const memory = applyMemoryControls("global" as any, "global-agent", raw);
  const limit = Math.max(1, Math.min(12, Number(options.limit || 7)));
  const all = MEMORY_ITEM_KEYS.flatMap(key => (memory[key] || []).map((item: any) => ({ ...item, type: key })))
    .filter((item: any) => !item.expiresAt || Date.parse(item.expiresAt) > Date.now())
    .map((item: any) => ({ ...item, ...relevanceScore(item, query) }))
    .filter((item: any) => item.memoryControl?.pinned || (item.matchedTerms.length >= 2 && item.score >= 42))
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, limit);
  const session = options.sessionId ? memory.sessions.find((item: any) => item.sessionId === options.sessionId) : null;
  if (options.recordMetric !== false) {
    recordMemoryMetric(all.length > 0 ? "recall_hit" : "recall_miss", { scope: "global", scopeId: "global-agent", sessionId: options.sessionId || "", queryHash: sha(query, 16), selected: all.map((item: any) => item.id) });
  }
  return {
    ignored: false,
    items: all,
    sessionSummary: session ? canonicalGlobalSessionSummary(session, globalSessionCompactionState(session, String(session.sessionId || ""))) : null,
    boundary: session?.boundary || null,
    citations: all.map((item: any) => ({ memoryId: item.id, type: item.type, ...item.source })),
  };
}

export function buildGlobalAgentSessionContinuation(sessionId: string, options: { persistMicroCompactReceipt?: boolean } = {}) {
  const exactSessionId = String(sessionId || "").trim();
  if (!exactSessionId) return { schema: "ccm-global-session-continuation-v2", sessionId: "", summary: null, messages: [], boundary: null };
  const transcript = loadGlobalAgentTranscript(exactSessionId);
  const memory = loadGlobalAgentMemory();
  const session = memory.sessions.find((item: any) => item.sessionId === exactSessionId) || { sessionId: exactSessionId };
  const state = globalSessionCompactionState(session, exactSessionId);
  const canonicalSummary = canonicalGlobalSessionSummary(session, state);
  const config = loadOrchestratorConfig();
  const unified = buildUnifiedSessionModelContextProjection({
    scope: "global",
    scopeId: `global:${exactSessionId}`,
    sessionId: exactSessionId,
    messages: transcript.messages,
    executionEvents: normalizeSessionExecutionEvents(transcript.executionMessages),
    canonicalSummary,
    summarySource: canonicalSummary ? globalSessionSummarySource(session) : "",
    summaryChecksum: state.activeSummaryChecksum || (canonicalSummary ? sha(canonicalSummary, 40) : ""),
    boundaryGeneration: Number(state.boundaryGeneration || 0),
    summarizedThroughIndex: Number(state.lastCompactedIndex || -1),
    lastSummarizedMessageId: String(state.sessionMemoryState?.lastExtractedMessageId || ""),
    microCompact: resolveSessionModelMicroCompactPolicy(config, {
      contextTokens: Number(state.tokenMeasurement?.activeTokens || 0),
      pressureThresholdTokens: getGroupAutoCompactThreshold(config),
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

export function buildGlobalAgentMemoryPacket(query: string, options: { sessionId?: string; limit?: number; maxChars?: number; recordMetric?: boolean } = {}) {
  const recalled = recallGlobalAgentMemory(query, options);
  if (recalled.ignored) return "[全局记忆已按用户要求忽略]";
  const lines = [
    "[全局 Agent 相关记忆｜仅作历史上下文，当前系统状态优先]",
    "使用规则：记忆中提到的文件、函数、任务状态或配置可能已过期；采取行动前必须读取当前真实状态验证。",
  ];
  if (recalled.sessionSummary) lines.push(`当前会话压缩摘要：${compact(JSON.stringify(recalled.sessionSummary), 3000)}`);
  if (recalled.boundary) {
    const budget = recalled.boundary.context_budget || {};
    lines.push(`当前会话压缩边界：archive=${recalled.boundary.archiveId || ""}；保留 recent=${recalled.boundary.preservedMessageCount || 0} 条/${recalled.boundary.preservedTokenCount || 0} tokens；压力=${budget.pressure ?? ""}%`);
  }
  if (Array.isArray(recalled.sessionSummary?.filesAndResources) && recalled.sessionSummary.filesAndResources.length) {
    lines.push(`压缩后恢复锚点：${recalled.sessionSummary.filesAndResources.slice(-8).join("、")}`);
  }
  if (options.sessionId) {
    const continuation = buildGlobalAgentSessionContinuation(options.sessionId);
    if (continuation.messages.length) lines.push(`当前会话近期原文由独立连续性通道回灌：${continuation.messages.length} 条。`);
  }
  for (const item of recalled.items) {
    const source = item.source || {};
    lines.push(`- [${item.type}｜${item.id}｜${source.timestamp || item.updatedAt || ""}] ${item.text}${item.why ? `\n  Why: ${item.why}` : ""}${item.howToApply ? `\n  How to apply: ${item.howToApply}` : ""}\n  来源: session=${source.sessionId || ""}${source.missionId ? ` mission=${source.missionId}` : ""} messages=${(source.messageIds || []).join(",")}`);
  }
  return compact(lines.join("\n"), Number(options.maxChars || 12_000));
}

export function recordGlobalMissionMemory(input: any) {
  const memory = loadGlobalAgentMemory();
  const report = input.report || {};
  const missionTerminal = ["completed", "cancelled"].includes(String(input.status || ""));
  const text = [
    `全局任务 ${input.missionId || input.mission_id || ""}：${report.summary || input.summary || input.status || ""}`,
    report.completed_content?.length ? `执行目标：${report.completed_content.map((item: any) => item.target || item.task_id).filter(Boolean).join("、")}` : "",
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
    memory.unresolved = (memory.unresolved || []).filter((existing: any) => existing.source?.missionId !== input.missionId);
  }
  const upsert = item ? upsertItems(memory, [item]) : { created: 0, updated: 0 };
  saveMemory(memory);
  if (item) recordMemoryOperation({ action: "mission_writeback", scope: "global", scopeId: "global-agent", missionId: input.missionId || "", status: input.status || "", itemId: item.id, created: upsert.created, updated: upsert.updated });
  return item;
}

export function recordGlobalStructuredMemoryFact(input: {
  type: GlobalMemoryItemType;
  text: string;
  sessionId: string;
  messageId: string;
  source?: string;
  importance?: number;
  confidence?: number;
  why?: string;
  howToApply?: string;
}) {
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
  if (!item) return null;
  upsertItems(memory, [item]);
  saveMemory(memory);
  recordMemoryOperation({
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

export function recordGlobalDirectDispatchMemory(input: any) {
  const memory = loadGlobalAgentMemory();
  const task = input.task || {};
  const report = input.report || task.delivery_summary || {};
  const dispatchId = String(input.dispatchId || task.id || report.task_id || "").trim();
  const userGoal = compact(input.userGoal || task.business_goal || task.title || report.goal || "", 900);
  const changes = (report.files_modified || report.actual_file_changes || report.actual_file_change_paths || report.files || [])
    .map((item: any) => typeof item === "string" ? item : item?.path || item?.file || "")
    .filter(Boolean)
    .slice(0, 20);
  const verification = (report.verification_results || report.verification_executed || report.verification || [])
    .map((item: any) => typeof item === "string" ? item : item?.command || item?.summary || JSON.stringify(item))
    .filter(Boolean)
    .slice(0, 20);
  const risks = (report.risks || report.known_risks || report.remaining_risks || [])
    .map((item: any) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 10);
  const remaining = (report.remaining_items || report.next_steps || report.blockers || [])
    .map((item: any) => String(item || "").trim())
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
  if (item) recordMemoryOperation({ action: "global_direct_dispatch_writeback", scope: "global", scopeId: "global-agent", sessionId: input.sessionId || "", missionId: sourceMissionId, status: "completed", itemId: item.id, created: upsert.created, updated: upsert.updated });
  return item;
}

export function recordGlobalDirectDispatchRollbackMemory(input: any) {
  const memory = loadGlobalAgentMemory();
  const task = input.task || {};
  const report = input.report || task.delivery_summary || {};
  const dispatchId = String(input.dispatchId || task.id || report.task_id || "").trim();
  const sourceMissionId = `global-direct:${dispatchId || sha(input.messageId || input.at || now(), 12)}`;
  const userGoal = compact(input.userGoal || task.business_goal || task.title || report.goal || "", 900);
  const reason = compact(input.reason || task.rollback_reason || report.rollback_reason || "", 500);
  const rollbackCount = Array.isArray(task.rollback_results || input.rollbackResults) ? (task.rollback_results || input.rollbackResults).length : Number(input.rollbackCount || 0);
  for (const key of ["missions", "unresolved"] as GlobalMemoryItemType[]) {
    memory[key] = (memory[key] || []).filter((existing: any) => existing.source?.missionId !== sourceMissionId);
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
  if (item) recordMemoryOperation({ action: "global_direct_dispatch_rollback_writeback", scope: "global", scopeId: "global-agent", sessionId: input.sessionId || "", missionId: sourceMissionId, status: "reverted", itemId: item.id, created: upsert.created, updated: upsert.updated });
  return item;
}

export function getGlobalMemoryEvidence(input: { sessionId?: string; messageId?: string; missionId?: string }) {
  const sessionIds = input.sessionId ? [input.sessionId] : loadGlobalAgentMemory().sessions.map((item: any) => item.sessionId);
  const matches: any[] = [];
  for (const sessionId of sessionIds) {
    const transcript = loadGlobalAgentTranscript(sessionId);
    for (const message of transcript.messages) {
      if (input.messageId && message.id !== input.messageId) continue;
      if (input.missionId && message.missionId !== input.missionId) continue;
      matches.push({ sessionId, messageId: message.id, role: message.role, content: message.content, timestamp: message.timestamp, missionId: message.missionId || "", traceId: message.traceId || "" });
      if (matches.length >= 50) return matches;
    }
  }
  return matches;
}

export function rebuildGlobalAgentMemory(reason = "manual_rebuild", actor = "local-user") {
  const previous = loadGlobalAgentMemory();
  const rebuilt = emptyMemory();
  const transcripts = new Map<string, any>();
  for (const file of fs.existsSync(TRANSCRIPT_DIR) ? fs.readdirSync(TRANSCRIPT_DIR).filter(name => name.endsWith(".enc.json")) : []) {
    let transcript: any;
    try { transcript = decryptJson(readJson(path.join(TRANSCRIPT_DIR, file), null)); } catch { continue; }
    const sessionId = String(transcript.sessionId || file.replace(/\.enc\.json$/, ""));
    const existing = transcripts.get(sessionId);
    if (!existing || String(transcript.updatedAt || "") > String(existing.updatedAt || "")) transcripts.set(sessionId, transcript);
  }
  for (const [sessionId, transcript] of transcripts) {
    saveTranscript({ ...transcript, sessionId });
    const extracted = extractGlobalMemoryCandidates(transcript.messages, sessionId);
    upsertItems(rebuilt, extracted.candidates);
    rebuilt.privacy.rejectedCandidates += extracted.rejected;
    rebuilt.sessions.push({ sessionId, source: transcript.source, messageCount: transcript.messages.length, transcriptUpdatedAt: transcript.updatedAt });
  }
  for (const mission of previous.missions || []) upsertItems(rebuilt, [mission]);
  saveMemory(rebuilt);
  recordMemoryOperation({ action: "rebuild", scope: "global", scopeId: "global-agent", actor, reason, transcriptCount: rebuilt.sessions.length });
  return loadGlobalAgentMemory();
}

export function getGlobalAgentMemoryPolicy() { return loadPolicy(); }

export function runGlobalAgentMemorySelfTest() {
  const releaseGlobalMemorySelftest = acquireGlobalAgentMemorySelfTestLock("global-agent-memory-selftest");
  const previousMainMemoryText = fs.existsSync(GLOBAL_AGENT_MEMORY_FILE) ? fs.readFileSync(GLOBAL_AGENT_MEMORY_FILE, "utf-8") : null;
  const previousBakMemoryText = fs.existsSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`) ? fs.readFileSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`, "utf-8") : null;
  const previousMemory = previousMainMemoryText ? JSON.parse(previousMainMemoryText) : emptyMemory();
  const id = `memory-selftest-${process.pid}-${Date.now().toString(36)}`;
  const messages: any[] = [];
  for (let index = 0; index < 90; index += 1) {
    messages.push({ role: "user", timestamp: new Date(Date.now() + index * 1000).toISOString(), content: index === 2 ? "以后全局 Agent 没有明确授权时不要直接操作项目，必须先确认" : index === 4 ? "我的 Claude Code 源码在 D:\\claude-code，以后分析压缩机制先看这里" : index === 6 ? "api_key=super-secret-value-123456" : `第 ${index} 轮普通对话，讨论全局任务连续性和记忆压缩边界。${"需要持续保留项目约束、验证证据、文件引用、失败原因和下一步。".repeat(60)}` });
    messages.push({ role: "assistant", timestamp: new Date(Date.now() + index * 1000 + 10).toISOString(), content: index === 8 ? "下一步仍需完成全局记忆控制中心的跨会话验收" : index === 12 ? `大型工具输出 ${"x".repeat(12_000)} 结束` : `已记录第 ${index} 轮上下文` });
  }
  const result = ingestGlobalAgentConversation({ sessionId: id, source: "self-test", messages, compact: false });
  const selfTestTranscript = loadGlobalAgentTranscript(id);
  const selfTestWindow = calculateSessionMemoryKeepWindow(selfTestTranscript.messages, { floorIndex: 0 });
  const selfTestSegment = selfTestTranscript.messages.slice(0, selfTestWindow.startIndex);
  const selfTestExtracted = extractGlobalMemoryCandidates(selfTestSegment, id);
  const compacted = commitGlobalAgentSessionCompaction(id, {
    force: true,
    reason: "self-test",
    summaryOverride: buildSegmentSummary(selfTestSegment, selfTestExtracted.candidates),
    summarySource: "model",
    expectedSourceMessageIds: selfTestSegment.map((message: any) => String(message.id || "")),
  });
  const missionId = `mission-${id}`;
  recordGlobalMissionMemory({ missionId, sessionId: id, status: "waiting_user", report: { summary: "等待人工确认数据库迁移", remaining_items: ["确认迁移窗口"] } });
  const waitingWasStored = loadGlobalAgentMemory().unresolved.some((item: any) => item.source?.missionId === missionId);
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
    privacyRejectsSecret: !MEMORY_ITEM_KEYS.flatMap(key => memory[key] || []).some((item: any) => item.text.includes("super-secret-value")),
    oneShotInstructionDoesNotPolluteLongTerm: !oneShotCandidates.some(item => item.type === "authorization" || item.type === "feedback"),
    missionWritebackTracksAndClearsUnresolved: waitingWasStored && !memory.unresolved.some((item: any) => item.source?.missionId === missionId) && memory.missions.some((item: any) => item.source?.missionId === missionId && item.text.includes("backend-api")),
    globalDirectDispatchCompletionIsRemembered: memory.missions.some((item: any) => item.source?.missionId === `global-direct:${directDispatchId}` && item.text.includes("群聊主 Agent") && item.text.includes("通过验收")) && directDispatchPacket.includes("负责人筛选") && directDispatchPacket.includes("通过验收"),
    globalDirectDispatchRollbackOverridesCompletion: rollbackMemory.missions.some((item: any) => item.source?.missionId === `global-direct:${directDispatchId}` && item.text.includes("安全撤销") && item.text.includes("不再视为完成"))
      && !rollbackMemory.missions.some((item: any) => item.source?.missionId === `global-direct:${directDispatchId}` && item.text.includes("通过验收"))
      && directDispatchRollbackPacket.includes("安全撤销")
      && directDispatchRollbackPacket.includes("不再视为完成"),
    durableAuthorizationRemembered: packet.includes("没有明确授权") && packet.includes("D:\\claude-code"),
    crossSessionRecallWorks: crossSessionPacket.includes("没有明确授权") && crossSessionPacket.includes("D:\\claude-code"),
    explicitIgnoreMemoryWorks: ignoredPacket.includes("已按用户要求忽略"),
    evidenceTraceable: archive?.summary?.sourceMessageIds?.length === archive?.count,
    recentWindowPreserved: Number(compacted.session?.boundary?.preservedTokenCount || 0) >= SESSION_MEMORY_MIN_KEEP_TOKENS
      && Number(compacted.session?.boundary?.preservedTextMessageCount || 0) >= SESSION_MEMORY_MIN_TEXT_MESSAGES
      && Number(compacted.session?.boundary?.preservedTokenCount || 0) <= SESSION_MEMORY_MAX_KEEP_TOKENS,
    tokenAwareBoundaryRecorded: !!compacted.session?.boundary?.context_budget && Number(compacted.session?.boundary?.preservedTokenCount || 0) > 0,
    microCompactRecordsLargeOutput: Number(archive?.microCompact?.compactedMessageCount || 0) >= 1,
    postCompactRestoreAnchorsRecorded: String(JSON.stringify(compacted.session?.boundary?.post_compact_restore || {})).includes("claude-code") && compacted.session?.boundary?.post_compact_restore?.recentMessageIds?.length > 0,
    corruptedTranscriptRecoversFromBackup: recoveredTranscript.storageRecovery?.recoveredFromBackup === true && recoveredTranscript.messages.length === messages.length,
  };
  try {
    fs.rmSync(transcriptFile(id), { force: true });
    fs.rmSync(`${transcriptFile(id)}.bak`, { force: true });
    if (previousMainMemoryText === null) fs.rmSync(GLOBAL_AGENT_MEMORY_FILE, { force: true });
    else fs.writeFileSync(GLOBAL_AGENT_MEMORY_FILE, previousMainMemoryText, "utf-8");
    if (previousBakMemoryText === null) fs.rmSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`, { force: true });
    else fs.writeFileSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`, previousBakMemoryText, "utf-8");
  } catch {} finally {
    releaseGlobalMemorySelftest();
  }
  return { pass: Object.values(checks).every(Boolean), checks, packetPreview: packet.slice(0, 1200), ingest: { extracted: result.extracted, rejected: result.rejected } };
}

export function runGlobalAgentMemoryStressSelfTest() {
  const releaseGlobalMemorySelftest = acquireGlobalAgentMemorySelfTestLock("global-agent-memory-stress-selftest");
  const previousMainMemoryText = fs.existsSync(GLOBAL_AGENT_MEMORY_FILE) ? fs.readFileSync(GLOBAL_AGENT_MEMORY_FILE, "utf-8") : null;
  const previousBakMemoryText = fs.existsSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`) ? fs.readFileSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`, "utf-8") : null;
  const id = `memory-stress-${process.pid}-${Date.now().toString(36)}`;
  let totalMessages = 0;
  try {
    for (let round = 0; round < 10; round += 1) {
      const batch: any[] = [];
      for (let index = 0; index < 36; index += 1) {
        const content = round === 0 && index === 0
          ? "以后所有全局开发任务必须等测试和合并门禁都通过后才能报告完成"
          : `压力轮次 ${round} 消息 ${index}，跟踪跨项目目标、失败恢复、验证证据和下一步。${"持续保留项目约束、验收证据、失败原因、文件引用和后续动作。".repeat(60)}`;
        batch.push({ role: index % 2 ? "assistant" : "user", content, timestamp: new Date(Date.now() + round * 100_000 + index * 1000).toISOString() });
      }
      totalMessages += batch.length;
      ingestGlobalAgentConversation({ sessionId: id, source: "self-test", messages: batch, compact: false });
      const stressTranscript = loadGlobalAgentTranscript(id);
      const stressSession = loadGlobalAgentMemory().sessions.find((item: any) => item.sessionId === id) || { sessionId: id };
      const stressState = globalSessionCompactionState(stressSession, id);
      const stressWindow = calculateSessionMemoryKeepWindow(stressTranscript.messages, { floorIndex: stressState.lastCompactedIndex + 1 });
      const stressSegment = stressTranscript.messages.slice(stressState.lastCompactedIndex + 1, stressWindow.startIndex);
      if (stressSegment.length) {
        const stressExtracted = extractGlobalMemoryCandidates(stressSegment, id);
        const currentSummary = buildSegmentSummary(stressSegment, stressExtracted.candidates);
        const previousSummary = stressState.activeSummary;
        const mergeList = (key: string, max: number) => [
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
          expectedSourceMessageIds: stressSegment.map((message: any) => String(message.id || "")),
        });
      }
    }
    const memory = loadGlobalAgentMemory();
    const session = memory.sessions.find((item: any) => item.sessionId === id);
    const archives = memory.archives.filter((item: any) => item.sessionId === id);
    const transcript = loadGlobalAgentTranscript(id);
    const packet = buildGlobalAgentMemoryPacket("继续全局开发任务，什么时候才能报告完成", { sessionId: `${id}-other` });
    const boundaries = memory.compaction?.boundaries?.filter((item: any) => archives.some((archive: any) => archive.id === item.archiveId)) || [];
    const checks = {
      repeatedCompactionCreatesBoundedArchives: archives.length >= 8 && archives.length <= 10,
      boundariesMonotonicallyAdvance: boundaries.every((item: any, index: number) => index === 0 || Number(item.preservedFromIndex) > Number(boundaries[index - 1].preservedFromIndex)),
      rawTranscriptNeverLosesMessages: transcript.messages.length === totalMessages,
      archiveChecksumsRemainValid: archives.every((archive: any) => archive.checksum === sha(archive.records || [], 40) && archive.summaryChecksum === sha(archive.summary || {}, 40)),
      persistentRequirementSurvivesDrift: packet.includes("测试和合并门禁") && packet.includes("报告完成"),
      recentWindowRemainsBounded: Number(session?.boundary?.preservedTokenCount || 0) >= SESSION_MEMORY_MIN_KEEP_TOKENS
        && Number(session?.boundary?.preservedTokenCount || 0) <= SESSION_MEMORY_MAX_KEEP_TOKENS,
      circuitBreakerHealthy: Number(memory.compaction?.consecutiveFailures || 0) === 0,
    };
    return { pass: Object.values(checks).every(Boolean), checks, archives: archives.length, transcriptMessages: transcript.messages.length };
  } finally {
    try {
      fs.rmSync(transcriptFile(id), { force: true });
      fs.rmSync(`${transcriptFile(id)}.bak`, { force: true });
      if (previousMainMemoryText === null) fs.rmSync(GLOBAL_AGENT_MEMORY_FILE, { force: true });
      else fs.writeFileSync(GLOBAL_AGENT_MEMORY_FILE, previousMainMemoryText, "utf-8");
      if (previousBakMemoryText === null) fs.rmSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`, { force: true });
      else fs.writeFileSync(`${GLOBAL_AGENT_MEMORY_FILE}.bak`, previousBakMemoryText, "utf-8");
    } catch {} finally {
      releaseGlobalMemorySelftest();
    }
  }
}
