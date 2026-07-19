// Behavior-freeze extraction from memory-control-center.ts.
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { DEFAULT_CONTEXT_WINDOW_TOKENS } from "../../system/context-budget";
import { CCM_DIR, GROUP_MESSAGES_DIR } from "../../core/utils";
import { withFileLock, writeJsonAtomic as writeJsonAtomicDurable } from "../../core/atomic-json-file";
import { loadProjectConfigs, loadTasks, saveTasks } from "../../core/db";
import {
  inspectGroupSessionMemoryExtractionLease,
  readGroupSessionMemoryExtractionState,
} from "../collaboration/group-session-memory-extraction";
import {
  inspectGroupSessionMemoryModelExtractionArtifactRetention,
  readGroupSessionMemoryTypedMemoryRetryState,
  retryGroupSessionModelExtractionTypedMemory,
  readGroupSessionMemoryModelExtractionHistory,
  replayGroupSessionMemoryModelExtraction,
  readGroupSessionMemoryCustomPromptProfile,
  readGroupSessionMemoryCustomTemplateProfile,
  runGroupSessionMemoryModelExtractionNow,
  runGroupSessionMemoryModelExtractionArtifactRetention,
  saveGroupSessionMemoryCustomPrompt,
  saveGroupSessionMemoryCustomTemplate,
  verifyGroupSessionMemoryDirectWriteSuppressionReceipt,
  verifyGroupSessionMemoryFactSupersessionGraph,
  verifyGroupSessionMemoryModelExtractionReceipt,
  verifyGroupSessionMemoryModelExtractionReplayEvidence,
} from "../collaboration/group-session-memory-model-extraction";
import {
  cancelPreparedDirectAgentDispatch,
  listDirectAgentDispatchSpool,
  pruneDirectAgentDispatchTerminalPair,
} from "../../agents/direct-dispatch-spool";
import {
  listTypedMemoryDispatchWal,
  transitionTypedMemoryDispatchWal,
  TYPED_MEMORY_DISPATCH_WAL_DIR,
  verifyTypedMemoryDispatchWal,
} from "../collaboration/typed-memory-dispatch-wal";
import { readGroupPostTurnSummaries } from "../collaboration/group-post-turn-summary";
import {
  GROUP_SESSION_LIFECYCLE_HEAD_DIR,
  readGroupSessionLifecycleCommitChain,
  readGroupSessionLifecycleHead,
  readGroupSessionLifecycleJournal,
  verifyGroupSessionLifecycleHead,
} from "../collaboration/group-session-lifecycle-head";

export type MemoryScope = "group" | "project" | "global" | "global_session" | "project_session" | "task_agent";

export type MemoryAction = "pin" | "unpin" | "lock" | "unlock" | "edit" | "deprecate" | "delete" | "restore";


export const CONTROL_DIR = process.env.CCM_MEMORY_CONTROL_DIR || path.join(CCM_DIR, "memory-control");

export const CONTROL_FILE = path.join(CONTROL_DIR, "overrides.json");

export const AUDIT_FILE = path.join(CONTROL_DIR, "audit.jsonl");

export const METRICS_FILE = path.join(CONTROL_DIR, "metrics.json");

export const QUALITY_FILE = path.join(CONTROL_DIR, "quality.json");

export const DISPATCH_RECOVERY_RESOLUTION_DIR = path.join(CONTROL_DIR, "dispatch-recovery-resolutions");

export const GROUP_MEMORY_DIR = path.join(CCM_DIR, "group-memory");

export const GROUP_SESSION_SCOPED_MEMORY_DIR = path.join(CCM_DIR, "group-memory-sessions");

export const PROJECT_MEMORY_DIR = path.join(CCM_DIR, "project-memory");

export const GLOBAL_MEMORY_FILE = path.join(CCM_DIR, "global-agent-memory", "memory.json");

export const KNOWLEDGE_DIR = path.join(process.env.USERPROFILE || "C:/Users/admin", ".cc-connect", "knowledge");

export const GROUP_MEMORY_REPLAY_REPAIR_DIR = path.join(CCM_DIR, "group-memory-replay-repair");

export const GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR = path.join(CCM_DIR, "group-memory-replay-repair-work-items");

export const GROUP_MEMORY_REPLAY_REPAIR_DISPATCH_PLANS_DIR = path.join(CCM_DIR, "group-memory-replay-repair-dispatch-plans");

export const GROUP_MEMORY_REPLAY_REPAIR_DISPATCH_BINDINGS_DIR = path.join(CCM_DIR, "group-memory-replay-repair-dispatch-bindings");

export const GROUP_MEMORY_REPLAY_REPAIR_TIMELINE_BINDINGS_DIR = path.join(CCM_DIR, "group-memory-replay-repair-timeline-bindings");

export const GROUP_MEMORY_WORKER_CONTEXT_COMPACT_HOOKS_DIR = path.join(CCM_DIR, "group-memory-worker-context-compact-hooks");

export const GROUP_MEMORY_WORKER_CONTEXT_COMPACT_OUTCOMES_DIR = path.join(CCM_DIR, "group-memory-worker-context-compact-outcomes");

export const GROUP_MEMORY_WORKER_CONTEXT_COMPACT_STRATEGIES_DIR = path.join(CCM_DIR, "group-memory-worker-context-compact-strategies");

export const GROUP_MEMORY_WORKER_CONTEXT_PTL_EMERGENCIES_DIR = path.join(CCM_DIR, "group-memory-worker-context-ptl-emergencies");

export const GROUP_TYPED_MEMORY_MD_DIR = path.join(CCM_DIR, "group-memory-md");

export const GROUP_SESSION_MEMORY_DIR = path.join(CCM_DIR, "group-session-memory");

export const GROUP_TOOL_CONTINUITY_DIR = path.join(CCM_DIR, "group-tool-continuity");

export const GROUP_COMPACT_FILE_REFERENCE_DIR = path.join(CCM_DIR, "group-memory-file-references");

export const GROUP_GLOBAL_MEMORY_ARBITRATION_DIR = path.join(CCM_DIR, "group-global-memory-arbitration");

export const GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_DIR = path.join(CCM_DIR, "group-api-microcompact-native-apply-proof");

export const GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_DIR = path.join(CCM_DIR, "group-api-microcompact-native-apply-request-telemetry");


export const API_MICROCOMPACT_NATIVE_APPLY_TELEMETRY_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;


export function now() { return new Date().toISOString(); }

export function compactMemoryCenterText(value: any, maxLength = 240) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length <= maxLength ? text : `${text.slice(0, Math.max(0, maxLength - 3))}...`;
}


export function ensureDir() {
  fs.mkdirSync(CONTROL_DIR, { recursive: true });
}


export function readJson(file: string, fallback: any) {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return fallback; }
}


export function writeJsonAtomic(file: string, value: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
  fs.renameSync(temp, file);
}


export function hash(value: any, length = 16) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex").slice(0, length);
}


export function canonicalFleetValue(value: any): any {
  if (Array.isArray(value)) return value.map(canonicalFleetValue);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((result: any, key) => {
    if (value[key] !== undefined) result[key] = canonicalFleetValue(value[key]);
    return result;
  }, {});
}


export function cleanId(value: any) {
  return String(value || "").trim().replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 120);
}


export function sidecarFileId(value: any) {
  return String(value || "unknown").trim().replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown";
}


export function groupSessionSidecarFile(root: string, groupId: string, sessionId = "") {
  let cleanSessionId = String(sessionId || "").trim();
  if (!cleanSessionId) {
    try {
      cleanSessionId = String(require("../collaboration/storage").getActiveGroupChatSessionId(groupId) || "default").trim();
    } catch {
      cleanSessionId = "default";
    }
  }
  if (!cleanSessionId || cleanSessionId === "default") return path.join(root, `${sidecarFileId(groupId)}.json`);
  return path.join(root, sidecarFileId(groupId), `${sidecarFileId(cleanSessionId)}.json`);
}


export function getGroupSessionMemorySnapshotFile(groupId: string) {
  return path.join(GROUP_SESSION_MEMORY_DIR, sidecarFileId(groupId), "snapshot.json");
}


export function getGroupSessionMemoryMarkdownFile(groupId: string) {
  return path.join(GROUP_SESSION_MEMORY_DIR, sidecarFileId(groupId), "summary.md");
}


export function getGroupToolContinuitySnapshotFile(groupId: string) {
  return path.join(GROUP_TOOL_CONTINUITY_DIR, sidecarFileId(groupId), "snapshot.json");
}


export function getGroupToolContinuityMarkdownFile(groupId: string) {
  return path.join(GROUP_TOOL_CONTINUITY_DIR, sidecarFileId(groupId), "summary.md");
}


export function getGroupCompactFileReferenceLedgerFile(groupId: string) {
  return path.join(GROUP_COMPACT_FILE_REFERENCE_DIR, `${sidecarFileId(groupId)}.json`);
}


export function getGroupGlobalMemoryArbitrationLedgerFile(groupId: string) {
  return path.join(GROUP_GLOBAL_MEMORY_ARBITRATION_DIR, `${sidecarFileId(groupId)}.json`);
}


export function getGroupApiMicrocompactNativeApplyProofLedgerFile(groupId: string, sessionId = "") {
  return groupSessionSidecarFile(GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_DIR, groupId, sessionId);
}


export function getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile(groupId: string, sessionId = "") {
  return groupSessionSidecarFile(GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_DIR, groupId, sessionId);
}


export function acquireGlobalMemorySelfTestLock(label: string) {
  try {
    const api = require("../../agents/global/memory");
    if (typeof api.acquireGlobalAgentMemorySelfTestLock === "function") {
      return api.acquireGlobalAgentMemorySelfTestLock(label);
    }
  } catch {}
  return () => {};
}


export function normalizeCompactFileReferencePath(value: any) {
  return String(value || "").replace(/\\/g, "/").trim();
}


export function readGroupSessionMemorySnapshotForCenter(groupId: string) {
  const snapshotFile = getGroupSessionMemorySnapshotFile(groupId);
  const summaryFile = getGroupSessionMemoryMarkdownFile(groupId);
  const parsed = readJson(snapshotFile, null);
  const markdown = (() => {
    try { return fs.readFileSync(summaryFile, "utf-8"); } catch { return ""; }
  })();
  const markdownChecksum = markdown ? hash(markdown, 24) : "";
  let memoryBudget = parsed?.memoryBudget || null;
  try {
    const api = require("../collaboration/memory");
    if (typeof api.analyzeGroupSessionMemoryBudget === "function") memoryBudget = api.analyzeGroupSessionMemoryBudget(markdown);
  } catch {}
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


export function readGroupToolContinuitySnapshotForCenter(groupId: string) {
  const snapshotFile = getGroupToolContinuitySnapshotFile(groupId);
  const summaryFile = getGroupToolContinuityMarkdownFile(groupId);
  const parsed = readJson(snapshotFile, null);
  const markdown = (() => {
    try { return fs.readFileSync(summaryFile, "utf-8"); } catch { return ""; }
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


export function getControlsState() {
  return readJson(CONTROL_FILE, { version: 1, controls: [], updatedAt: "" });
}


export function appendAudit(event: any) {
  ensureDir();
  const record = { id: `audit-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`, at: now(), ...event };
  fs.appendFileSync(AUDIT_FILE, JSON.stringify(record) + "\n", "utf-8");
  return record;
}
