import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { DEFAULT_CONTEXT_WINDOW_TOKENS } from "../../system/context-budget";
import { CCM_DIR, GROUP_MESSAGES_DIR } from "../../core/utils";
import { loadProjectConfigs, loadTasks } from "../../core/db";

export type MemoryScope = "group" | "project" | "global";
type MemoryAction = "pin" | "unpin" | "lock" | "unlock" | "edit" | "deprecate" | "delete" | "restore";

const CONTROL_DIR = process.env.CCM_MEMORY_CONTROL_DIR || path.join(CCM_DIR, "memory-control");
const CONTROL_FILE = path.join(CONTROL_DIR, "overrides.json");
const AUDIT_FILE = path.join(CONTROL_DIR, "audit.jsonl");
const METRICS_FILE = path.join(CONTROL_DIR, "metrics.json");
const QUALITY_FILE = path.join(CONTROL_DIR, "quality.json");
const GROUP_MEMORY_DIR = path.join(CCM_DIR, "group-memory");
const PROJECT_MEMORY_DIR = path.join(CCM_DIR, "project-memory");
const GLOBAL_MEMORY_FILE = path.join(CCM_DIR, "global-agent-memory", "memory.json");
const KNOWLEDGE_DIR = path.join(process.env.USERPROFILE || "C:/Users/admin", ".cc-connect", "knowledge");
const GROUP_MEMORY_REPLAY_REPAIR_DIR = path.join(CCM_DIR, "group-memory-replay-repair");
const GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR = path.join(CCM_DIR, "group-memory-replay-repair-work-items");
const GROUP_SESSION_MEMORY_DIR = path.join(CCM_DIR, "group-session-memory");
const GROUP_TOOL_CONTINUITY_DIR = path.join(CCM_DIR, "group-tool-continuity");
const GROUP_COMPACT_FILE_REFERENCE_DIR = path.join(CCM_DIR, "group-memory-file-references");
const GROUP_GLOBAL_MEMORY_ARBITRATION_DIR = path.join(CCM_DIR, "group-global-memory-arbitration");

function now() { return new Date().toISOString(); }

function ensureDir() {
  fs.mkdirSync(CONTROL_DIR, { recursive: true });
}

function readJson(file: string, fallback: any) {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return fallback; }
}

function writeJsonAtomic(file: string, value: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
  fs.renameSync(temp, file);
}

function hash(value: any, length = 16) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex").slice(0, length);
}

function cleanId(value: any) {
  return String(value || "").trim().replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 120);
}

function sidecarFileId(value: any) {
  return String(value || "unknown").trim().replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown";
}

function getGroupSessionMemorySnapshotFile(groupId: string) {
  return path.join(GROUP_SESSION_MEMORY_DIR, sidecarFileId(groupId), "snapshot.json");
}

function getGroupSessionMemoryMarkdownFile(groupId: string) {
  return path.join(GROUP_SESSION_MEMORY_DIR, sidecarFileId(groupId), "summary.md");
}

function getGroupToolContinuitySnapshotFile(groupId: string) {
  return path.join(GROUP_TOOL_CONTINUITY_DIR, sidecarFileId(groupId), "snapshot.json");
}

function getGroupToolContinuityMarkdownFile(groupId: string) {
  return path.join(GROUP_TOOL_CONTINUITY_DIR, sidecarFileId(groupId), "summary.md");
}

function getGroupCompactFileReferenceLedgerFile(groupId: string) {
  return path.join(GROUP_COMPACT_FILE_REFERENCE_DIR, `${sidecarFileId(groupId)}.json`);
}

function getGroupGlobalMemoryArbitrationLedgerFile(groupId: string) {
  return path.join(GROUP_GLOBAL_MEMORY_ARBITRATION_DIR, `${sidecarFileId(groupId)}.json`);
}

function normalizeCompactFileReferencePath(value: any) {
  return String(value || "").replace(/\\/g, "/").trim();
}

function readGroupSessionMemorySnapshotForCenter(groupId: string) {
  const snapshotFile = getGroupSessionMemorySnapshotFile(groupId);
  const summaryFile = getGroupSessionMemoryMarkdownFile(groupId);
  const parsed = readJson(snapshotFile, null);
  const markdown = (() => {
    try { return fs.readFileSync(summaryFile, "utf-8"); } catch { return ""; }
  })();
  const markdownChecksum = markdown ? hash(markdown, 24) : "";
  if (parsed?.schema === "ccm-group-session-memory-snapshot-v1") {
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
    schema: "ccm-group-session-memory-snapshot-v1",
    groupId,
    snapshotFile,
    summaryFile,
    markdownExists: !!markdown,
    markdownChecksumMatches: false,
    markdownChars: markdown.length,
    hasSummary: false,
    generatedAt: "",
    markdownExcerpt: compactMemoryCenterText(markdown, 1200),
  };
}

function readGroupToolContinuitySnapshotForCenter(groupId: string) {
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

function getControlsState() {
  return readJson(CONTROL_FILE, { version: 1, controls: [], updatedAt: "" });
}

function appendAudit(event: any) {
  ensureDir();
  const record = { id: `audit-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`, at: now(), ...event };
  fs.appendFileSync(AUDIT_FILE, JSON.stringify(record) + "\n", "utf-8");
  return record;
}

export function getMemoryItemId(itemType: string, item: any, index = 0) {
  const explicit = item?.id || item?.messageId;
  if (explicit) return `${cleanId(itemType)}:${cleanId(explicit)}`;
  const identity = [item?.archiveId, item?.taskId, item?.groupId, item?.time, item?.timestamp, item?.decision, item?.summary, item?.text, item?.reason, item?.question, item?.action];
  if (!identity.some(Boolean)) identity.push(index);
  return `${cleanId(itemType)}:${hash(identity)}`;
}

function editableField(itemType: string, item: any) {
  if (itemType === "factAnchors" || itemType === "persistentRequirements") return "text";
  if (itemType === "decisions") return "decision";
  if (itemType === "conclusions" || itemType === "completed" || itemType === "workerLedger") return "summary";
  if (itemType === "blocked") return "reason";
  if (itemType === "openQuestions") return typeof item === "string" ? "value" : "question";
  if (itemType === "nextActions") return typeof item === "string" ? "value" : "action";
  if (["user", "feedback", "authorization", "missions", "unresolved", "references"].includes(itemType)) return "text";
  return item?.text !== undefined ? "text" : item?.summary !== undefined ? "summary" : "value";
}

function itemText(itemType: string, item: any) {
  if (typeof item === "string") return item;
  const field = editableField(itemType, item);
  return String(item?.[field] || item?.text || item?.summary || item?.decision || item?.reason || "");
}

function scopeControls(scope: MemoryScope, scopeId: string) {
  return (getControlsState().controls || []).filter((item: any) => item.scope === scope && item.scopeId === scopeId);
}

function applyListControls(scope: MemoryScope, scopeId: string, itemType: string, source: any[]) {
  const controls = scopeControls(scope, scopeId).filter((item: any) => item.itemType === itemType);
  const mapped = (Array.isArray(source) ? source : []).map((original: any, index: number) => {
    const id = getMemoryItemId(itemType, original, index);
    const control = controls.find((item: any) => item.itemId === id);
    let value: any = typeof original === "string" ? original : { ...original };
    if (control?.editedText !== undefined) {
      const field = editableField(itemType, original);
      value = field === "value" ? control.editedText : { ...value, [field]: control.editedText };
    }
    if (typeof value === "object" && value) {
      value.memoryControl = control ? {
        pinned: !!control.pinned,
        deprecated: !!control.deprecated,
        reason: control.reason || "",
        updatedAt: control.updatedAt,
        itemId: id,
      } : { pinned: false, deprecated: false, itemId: id };
    }
    return { id, value, control };
  }).filter((entry: any) => !entry.control?.deprecated);
  mapped.sort((a: any, b: any) => Number(!!b.control?.pinned) - Number(!!a.control?.pinned));
  return mapped.map((entry: any) => entry.value);
}

export function applyMemoryControls(scope: MemoryScope, scopeId: string, source: any) {
  const memory = JSON.parse(JSON.stringify(source || {}));
  const keys = scope === "group"
    ? ["factAnchors", "persistentRequirements", "decisions", "completed", "blocked", "workerLedger", "openQuestions", "nextActions"]
    : scope === "project" ? ["conclusions", "decisions"] : ["user", "feedback", "authorization", "decisions", "missions", "unresolved", "references"];
  for (const key of keys) memory[key] = applyListControls(scope, scopeId, key, memory[key]);
  if (scope === "project") {
    for (const archiveKey of ["conclusionArchives", "decisionArchives"]) {
      memory[archiveKey] = (memory[archiveKey] || []).map((archive: any) => ({
        ...archive,
        records: applyListControls(scope, scopeId, archiveKey === "conclusionArchives" ? "conclusions" : "decisions", (archive.records || []).map((item: any) => ({ ...item, archiveId: archive.id }))),
      }));
    }
  }
  return memory;
}

export function updateMemoryControl(input: {
  scope: MemoryScope; scopeId: string; itemType: string; itemId: string; action: MemoryAction;
  text?: string; reason?: string; actor?: string;
}) {
  const scope: MemoryScope = input.scope === "project" ? "project" : input.scope === "global" ? "global" : "group";
  const scopeId = String(input.scopeId || "").trim();
  const itemType = cleanId(input.itemType);
  const itemId = cleanId(input.itemId);
  const action = input.action;
  if (!scopeId || !itemType || !itemId) throw new Error("缺少记忆定位信息");
  if (!["pin", "unpin", "lock", "unlock", "edit", "deprecate", "delete", "restore"].includes(action)) throw new Error("不支持的记忆操作");
  if ((action === "edit" || action === "deprecate" || action === "delete") && !String(input.reason || "").trim()) throw new Error("修改或删除记忆时必须填写原因");
  if (action === "edit" && !String(input.text || "").trim()) throw new Error("修改后的记忆不能为空");

  const state = getControlsState();
  const controls = Array.isArray(state.controls) ? state.controls : [];
  const index = controls.findIndex((item: any) => item.scope === scope && item.scopeId === scopeId && item.itemType === itemType && item.itemId === itemId);
  const before = index >= 0 ? controls[index] : null;
  const current = { scope, scopeId, itemType, itemId, pinned: false, deprecated: false, ...(before || {}) };
  if (action === "pin" || action === "lock") current.pinned = true;
  if (action === "unpin" || action === "unlock") current.pinned = false;
  if (action === "edit") current.editedText = String(input.text || "").trim();
  if (action === "deprecate" || action === "delete") current.deprecated = true;
  if (action === "restore") {
    current.deprecated = false;
    delete current.editedText;
  }
  current.reason = String(input.reason || current.reason || "").trim();
  current.updatedAt = now();
  current.updatedBy = String(input.actor || "local-user");
  if (index >= 0) controls[index] = current; else controls.push(current);
  const next = { version: 1, controls, updatedAt: current.updatedAt };
  writeJsonAtomic(CONTROL_FILE, next);
  const audit = appendAudit({
    type: "memory_control", action, scope, scopeId, itemType, itemId,
    actor: current.updatedBy, reason: current.reason,
    beforeHash: before ? hash(before, 24) : "", afterHash: hash(current, 24),
  });
  return { control: current, audit };
}

function listJsonFiles(dir: string) {
  try { return fs.readdirSync(dir).filter(name => name.endsWith(".json") && !name.includes(".pre-rollback-")).map(name => path.join(dir, name)); } catch { return []; }
}

function readMemoryFile(file: string) {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return null; }
}

function groupLabelMap() {
  const groups = readJson(path.join(CCM_DIR, "groups.json"), []);
  return new Map((Array.isArray(groups) ? groups : groups?.groups || []).map((item: any) => [String(item.id), item.name || item.title || item.id]));
}

function projectFile(project: string) {
  return listJsonFiles(PROJECT_MEMORY_DIR).find(file => readMemoryFile(file)?.project === project) || "";
}

function scopeFile(scope: MemoryScope, scopeId: string) {
  if (scope === "group") return path.join(GROUP_MEMORY_DIR, `${scopeId}.json`);
  if (scope === "project") return projectFile(scopeId);
  return GLOBAL_MEMORY_FILE;
}

function healthAlerts(scope: MemoryScope, scopeId: string, memory: any) {
  const alerts: any[] = [];
  const add = (severity: string, code: string, message: string) => alerts.push({ id: `${scope}:${scopeId}:${code}`, scope, scopeId, severity, code, message });
  if (memory?.storageRecovery?.failed) add("critical", "storage_recovery_failed", "主文件和备份均不可读取");
  else if (memory?.storageRecovery?.recoveredFromBackup) add("warning", "storage_recovered", "本次从备份恢复，请检查最近一次写入");
  if (scope === "group") {
    const compaction = memory?.compaction || {};
    if (compaction.health && compaction.health !== "healthy") add("warning", "compaction_health", `压缩健康状态：${compaction.health}`);
    if (compaction.validation?.pass === false) add("critical", "summary_validation", "压缩摘要未通过事实保真校验");
    if (Number(compaction.thrashCount || 0) >= 3) add("warning", "compaction_thrash", "连续压缩释放空间不足");
    if (Number(compaction.consecutiveFailures || 0) > 0) add("warning", "model_compaction_failure", `模型压缩连续失败 ${compaction.consecutiveFailures} 次`);
    const currentPressure = compaction.postCompactTokenCount ? (Number(compaction.postCompactTokenCount) / DEFAULT_CONTEXT_WINDOW_TOKENS) * 100 : 0;
    if (currentPressure >= 90) add("warning", "token_pressure", `当前上下文占用 ${Math.round(currentPressure * 10) / 10}%`);
  } else if (scope === "project") {
    if (memory?.integrity?.conclusions?.pass === false || memory?.integrity?.decisions?.pass === false) add("critical", "archive_integrity", "项目记忆归档校验失败");
  } else {
    const compaction = memory?.compaction || {};
    if (memory?.integrity?.pass === false) add("critical", "global_archive_integrity", `全局记忆归档校验失败：${(memory.integrity.corruptedArchives || []).join("、")}`);
    if (compaction.health && compaction.health !== "healthy") add("warning", "global_compaction_health", `全局压缩健康状态：${compaction.health}`);
    if (Number(compaction.consecutiveFailures || 0) >= 3) add("critical", "global_compaction_circuit_breaker", "全局记忆压缩连续失败，熔断器已触发");
    if (memory?.privacy?.encryptedTranscripts !== true) add("critical", "global_transcript_encryption", "全局 Agent 原始转录未启用加密");
  }
  return alerts;
}

function memorySummary(scope: MemoryScope, scopeId: string, memory: any, label: string) {
  const controls = scopeControls(scope, scopeId);
  const alerts = healthAlerts(scope, scopeId, memory);
  const compaction = memory?.compaction || {};
  const sessionMemory = scope === "group" ? (memory?.sessionMemory?.schema ? memory.sessionMemory : readGroupSessionMemorySnapshotForCenter(scopeId)) : null;
  const toolContinuity = scope === "group" ? (memory?.toolContinuity?.schema ? memory.toolContinuity : readGroupToolContinuitySnapshotForCenter(scopeId)) : null;
  return {
    scope, id: scopeId, label, health: alerts.some(item => item.severity === "critical") ? "critical" : alerts.length ? "warning" : "healthy",
    alerts: alerts.length,
    pinned: controls.filter((item: any) => item.pinned && !item.deprecated).length,
    edited: controls.filter((item: any) => item.editedText !== undefined && !item.deprecated).length,
    deprecated: controls.filter((item: any) => item.deprecated).length,
    tokenPressure: Number(compaction.postCompactTokenCount ? Math.round((Number(compaction.postCompactTokenCount) / DEFAULT_CONTEXT_WINDOW_TOKENS) * 1000) / 10 : 0),
    preCompactPressure: Number(compaction.pressurePercent || 0),
    beforeTokens: Number(compaction.preCompactTokenCount || 0),
    afterTokens: Number(compaction.postCompactTokenCount || 0),
    updatedAt: memory?.updated_at || memory?.updatedAt || compaction.lastCompactedAt || "",
    sessionMemory: sessionMemory ? {
      summaryFile: sessionMemory.summaryFile || sessionMemory.summary_file || "",
      snapshotFile: sessionMemory.snapshotFile || sessionMemory.snapshot_file || "",
      hasSummary: sessionMemory.hasSummary === true,
      markdownExists: sessionMemory.markdownExists === true,
      markdownChecksumMatches: sessionMemory.markdownChecksumMatches === true,
    } : null,
    toolContinuity: toolContinuity ? {
      summaryFile: toolContinuity.summaryFile || toolContinuity.summary_file || "",
      snapshotFile: toolContinuity.snapshotFile || toolContinuity.snapshot_file || "",
      status: toolContinuity.status || "empty",
      markdownExists: toolContinuity.markdownExists === true,
      markdownChecksumMatches: toolContinuity.markdownChecksumMatches === true,
      allowedCount: Number((toolContinuity.allowedTools?.mcp || []).length + (toolContinuity.allowedTools?.skill || []).length),
      missingCount: Number((toolContinuity.missing?.mcp || []).length + (toolContinuity.missing?.skill || []).length),
      invokedSkillCount: Number((toolContinuity.invokedSkills || []).length),
      shouldBypassAuthorization: toolContinuity.shouldBypassAuthorization === true,
    } : null,
    postCompactUsage: scope === "group" ? buildGroupPostCompactUsageOverview(scopeId) : null,
  };
}

function compactMemoryCenterText(value: any, max = 360) {
  const text = String(value || "").replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trim();
  return text.length > max ? `${text.slice(0, Math.max(1, max - 1))}…` : text;
}

function summarizePostCompactUsageRow(row: any = {}) {
  return {
    candidate_id: String(row.candidate_id || row.candidateId || ""),
    kind: String(row.kind || ""),
    value: compactMemoryCenterText(row.value || "", 320),
    sourceMessageId: String(row.sourceMessageId || row.source_message_id || ""),
    target_project: String(row.target_project || row.targetProject || ""),
    used_count: Number(row.used_count || 0),
    ignored_count: Number(row.ignored_count || 0),
    verified_count: Number(row.verified_count || 0),
    mentioned_count: Number(row.mentioned_count || 0),
    total_count: Number(row.total_count || 0),
    recommendation: String(row.recommendation || ""),
    last_usage_state: String(row.last_usage_state || ""),
    last_agent: String(row.last_agent || ""),
    last_task_id: String(row.last_task_id || ""),
    last_gate_id: String(row.last_gate_id || ""),
    last_seen_at: String(row.last_seen_at || ""),
  };
}

function summarizePostCompactUsageEntry(entry: any = {}) {
  return {
    entry_id: String(entry.entry_id || ""),
    target_project: String(entry.target_project || ""),
    agent: String(entry.agent || ""),
    task_id: String(entry.task_id || ""),
    gate_id: String(entry.gate_id || ""),
    candidate_id: String(entry.candidate_id || ""),
    kind: String(entry.kind || ""),
    value: compactMemoryCenterText(entry.value || "", 260),
    usage_state: String(entry.usage_state || ""),
    receipt_status: String(entry.receipt_status || ""),
    generated_at: String(entry.generated_at || ""),
  };
}

function buildGroupPostCompactUsageOverview(groupId: string) {
  const id = String(groupId || "").trim();
  if (!id) return null;
  try {
    const { buildGroupPostCompactCandidateUsageSummary } = require("../collaboration/memory");
    const summary = buildGroupPostCompactCandidateUsageSummary(id, {});
    const totals = summary.totals || { used: 0, ignored: 0, verified: 0, mentioned: 0, total: 0 };
    const classified = Number(totals.used || 0) + Number(totals.ignored || 0) + Number(totals.verified || 0);
    const total = Number(totals.total || 0);
    return {
      schema: "ccm-memory-center-post-compact-usage-overview-v1",
      hasHistory: summary.has_history === true,
      candidateCount: Number(summary.candidate_count || 0),
      totals,
      strictClassificationRate: qualityRate(classified, total),
      ledgerFile: summary.ledger_file || "",
      updatedAt: summary.updatedAt || "",
    };
  } catch (error: any) {
    return {
      schema: "ccm-memory-center-post-compact-usage-overview-v1",
      hasHistory: false,
      candidateCount: 0,
      totals: { used: 0, ignored: 0, verified: 0, mentioned: 0, total: 0 },
      strictClassificationRate: null,
      ledgerFile: "",
      updatedAt: "",
      error: error?.message || String(error),
    };
  }
}

function buildGroupPostCompactRecallProbeQuery(memory: any = {}, usageSummary: any = {}, archive: any = {}) {
  const rows = [
    ...(Array.isArray(usageSummary.useful_candidates) ? usageSummary.useful_candidates : []),
    ...(Array.isArray(usageSummary.ignored_candidates) ? usageSummary.ignored_candidates : []),
    ...(Array.isArray(usageSummary.missing_usage_candidates) ? usageSummary.missing_usage_candidates : []),
    ...(Array.isArray(archive.rows) ? archive.rows : []),
  ];
  const memoryHints = [
    memory?.goal,
    memory?.summary,
    memory?.conversationSummary,
    ...(Array.isArray(memory?.persistentRequirements) ? memory.persistentRequirements.map((item: any) => item?.text || item) : []),
    ...(Array.isArray(memory?.factAnchors) ? memory.factAnchors.map((item: any) => item?.text || item) : []),
    ...(Array.isArray(memory?.decisions) ? memory.decisions.map((item: any) => item?.decision || item?.text || item) : []),
  ];
  const usageHints = rows.map((row: any) => row?.value || row?.candidate_id || "").filter(Boolean);
  const query = [...memoryHints, ...usageHints].filter(Boolean).join("\n");
  return compactMemoryCenterText(query || "group memory compact post-compact candidate usage child agent recall", 4200);
}

export function buildGroupPostCompactUsageDiagnostics(groupId: string, memory: any = {}) {
  const id = String(groupId || "").trim();
  if (!id) return null;
  try {
    const {
      readGroupPostCompactCandidateUsageLedger,
      buildGroupPostCompactCandidateUsageSummary,
      buildGroupCompactFileReferences,
      buildGroupCompactFileReferenceReadPlan,
      buildGroupMemorySourceManifest,
      summarizeGroupCompactFileReferenceAccess,
      summarizeGroupCompactFileReferenceReadPlanAccess,
      summarizeGroupCompactFileReferenceReadPlanFreshness,
      buildGroupCompactFileReferenceReadPlanRevalidationGate,
      latestGroupCompactFileReferenceReadPlanRevalidationGate,
    } = require("../collaboration/memory");
    const {
      buildGroupTypedMemoryRecall,
      readGroupTypedMemoryDistillationLedger,
      scanGroupTypedMemoryDocuments,
    } = require("../collaboration/group-memory-index");
    const { readGroupMemoryCompactionHookLedger } = require("../collaboration/group-memory-compaction");

    const ledger = readGroupPostCompactCandidateUsageLedger(id);
    const hookLedger = summarizeCompactionHookLedger(id, memory, readGroupMemoryCompactionHookLedger(id));
    const usageSummary = buildGroupPostCompactCandidateUsageSummary(id, {});
    const distillationLedger = readGroupTypedMemoryDistillationLedger(id);
    const archive = distillationLedger.postCompactUsageArchive || {};
    const docs = scanGroupTypedMemoryDocuments(id);
    const recallQuery = buildGroupPostCompactRecallProbeQuery(memory, usageSummary, archive);
    const recall = buildGroupTypedMemoryRecall(id, recallQuery, {
      max: 8,
      snippetChars: 260,
      postCompactCandidateUsage: usageSummary,
    });
    const disciplineTrend = buildPostCompactCandidateDisciplineTrend({ groupIds: [id], taskLimit: 120, minSample: 1 });
    const dispatchTrend = buildPostCompactDispatchMarkerTrend({ groupIds: [id] });
    const agentReliabilityReport = buildChildAgentMemoryReliabilityReport({ groupIds: [id], taskLimit: 120 });
    const dispatchDiagnostics = dispatchTrend.groups?.[0] || null;
    const agentReliability = agentReliabilityReport.groups?.[0] || null;
    const disciplineDiagnostics = disciplineTrend.groups?.[0] || null;
    const docsByType = (Array.isArray(docs) ? docs : []).reduce((acc: any, doc: any) => {
      const type = String(doc.type || "project");
      acc[type] = Number(acc[type] || 0) + 1;
      return acc;
    }, {});
    const recallDiagnostics = Array.isArray(recall?.diagnostics) ? recall.diagnostics : [];
    const timeline = buildGroupCompactBoundaryTimeline(id, memory, {
      usageSummary,
      discipline: disciplineDiagnostics,
      dispatch: dispatchDiagnostics,
      agentReliability,
      recall,
      archive,
    });
    const replay = buildGroupCompactBoundaryReplayGate(id, memory, { hookLedger });
    const historicalReplay = buildGroupHistoricalCompactBoundaryReplay(id, memory, { hookLedger });
    const agentTypeReplay = buildGroupChildAgentTypeReplayMatrix(id, memory, { hookLedger });
    const replayRepairWorkItems = replay.repairWorkItems || summarizeReplayRepairPendingWorkItems(id);
    const replayRepairDispatchCandidates = buildReplayRepairMainAgentDispatchCandidates(id);
    const sessionMemory = memory?.sessionMemory?.schema ? memory.sessionMemory : readGroupSessionMemorySnapshotForCenter(id);
    const toolContinuity = memory?.toolContinuity?.schema ? memory.toolContinuity : readGroupToolContinuitySnapshotForCenter(id);
    const sourceManifest = buildGroupMemorySourceManifest(id, {
      generatedAt: now(),
      typedDocs: docs,
    });
    const compactFileReferences = buildGroupCompactFileReferences(id, {
      sourceManifest,
      sessionMemory,
      toolContinuity,
      typedMemory: {
        sync: {
          index_file: docs.find((doc: any) => String(doc.relPath || "").toUpperCase() === "MEMORY.md")?.file || "",
          memory_dir: path.dirname(docs[0]?.file || path.join(CCM_DIR, "group-memory-md", sidecarFileId(id), "MEMORY.md")),
        },
      },
      rawSources: {
        group_memory_file: path.join(GROUP_MEMORY_DIR, `${id}.json`),
        group_messages_file: path.join(GROUP_MESSAGES_DIR, `${id}.json`),
        group_session_memory_snapshot_file: sessionMemory?.snapshotFile || getGroupSessionMemorySnapshotFile(id),
        group_session_memory_summary_file: sessionMemory?.summaryFile || getGroupSessionMemoryMarkdownFile(id),
        group_tool_continuity_snapshot_file: toolContinuity?.snapshotFile || getGroupToolContinuitySnapshotFile(id),
        group_tool_continuity_summary_file: toolContinuity?.summaryFile || getGroupToolContinuityMarkdownFile(id),
      },
    });
    const compactFileReferenceReadPlan = buildGroupCompactFileReferenceReadPlan(id, compactFileReferences, {
      generatedAt: now(),
      maxEntries: 10,
    });
    const surfacedReadPlanRows = latestCompactFileReferenceReadPlanRowsForDiscipline(id, compactFileReferenceReadPlan);
    const compactFileReferenceReadPlanForFreshness = {
      ...compactFileReferenceReadPlan,
      entries: surfacedReadPlanRows.rows,
      plannedCount: surfacedReadPlanRows.rows.filter((entry: any) => entry.action !== "skip_missing").length,
      sourceReferenceCount: surfacedReadPlanRows.rows.length,
    };
    const compactFileReferenceReadPlanAccess = summarizeGroupCompactFileReferenceReadPlanAccess(id, compactFileReferenceReadPlan, memory);
    const compactFileReferenceReadPlanFreshness = summarizeGroupCompactFileReferenceReadPlanFreshness(id, compactFileReferenceReadPlanForFreshness);
    const compactFileReferenceReadPlanRevalidationGate = latestGroupCompactFileReferenceReadPlanRevalidationGate(id)
      || buildGroupCompactFileReferenceReadPlanRevalidationGate(id, compactFileReferenceReadPlanFreshness, { scope: "memory-center" });
    const compactFileReferenceAccess = summarizeGroupCompactFileReferenceAccess(id, compactFileReferences, memory);
    const compactFileReferenceReadPlanDiscipline = buildCompactFileReferenceReadPlanUsageDisciplineReport({ groupIds: [id] }).groups?.[0] || null;
    const compactFileReferenceReadPlanRevalidationDiscipline = buildCompactFileReferenceReadPlanRevalidationGateReport({ groupIds: [id] }).groups?.[0] || null;
    const readPlanRevalidationRepairWorkItems = compactFileReferenceReadPlanRevalidationDiscipline
      ? syncCompactFileReferenceReadPlanRevalidationRepairWorkItems(id, compactFileReferenceReadPlanRevalidationDiscipline)
      : replayRepairWorkItems;
    const replayRepairWorkItemsFinal = readPlanRevalidationRepairWorkItems || replayRepairWorkItems;
    const replayRepairDispatchCandidatesFinal = buildReplayRepairMainAgentDispatchCandidates(id);
    const compactFileReferenceReadPlanRevalidationSessionBinding = compactFileReferenceReadPlanRevalidationDiscipline ? {
      schema: "ccm-compact-file-reference-read-plan-revalidation-session-binding-group-v1",
      groupId: id,
      status: Number(compactFileReferenceReadPlanRevalidationDiscipline.sessionMismatch || 0) > 0
        ? "fail"
        : Number(compactFileReferenceReadPlanRevalidationDiscipline.sessionRequired || 0) > 0
          ? "ok"
          : "empty",
      checked: Number(compactFileReferenceReadPlanRevalidationDiscipline.sessionRequired || 0),
      passed: Number(compactFileReferenceReadPlanRevalidationDiscipline.sessionMatched || 0),
      missing: Number(compactFileReferenceReadPlanRevalidationDiscipline.sessionMismatch || 0),
      sessionMatchRate: qualityRate(
        Number(compactFileReferenceReadPlanRevalidationDiscipline.sessionMatched || 0),
        Number(compactFileReferenceReadPlanRevalidationDiscipline.sessionRequired || 0)
      ),
      rows: (Array.isArray(compactFileReferenceReadPlanRevalidationDiscipline.rows) ? compactFileReferenceReadPlanRevalidationDiscipline.rows : [])
        .filter((row: any) => row.session_required)
        .slice(0, 20),
      gaps: (Array.isArray(compactFileReferenceReadPlanRevalidationDiscipline.gaps) ? compactFileReferenceReadPlanRevalidationDiscipline.gaps : [])
        .filter((gap: any) => gap.session_mismatch)
        .slice(0, 12),
    } : null;
    const compactFileReferenceDiscipline = buildCompactFileReferenceUsageDisciplineReport({ groupIds: [id] }).groups?.[0] || null;
    return {
      schema: "ccm-memory-center-post-compact-usage-diagnostics-v1",
      groupId: id,
      ledger: {
        file: ledger.file || usageSummary.ledger_file || "",
        updatedAt: ledger.updatedAt || usageSummary.updatedAt || "",
        totals: ledger.totals || usageSummary.totals || {},
        entryCount: Array.isArray(ledger.entries) ? ledger.entries.length : 0,
        statsCount: Object.keys(ledger.stats || {}).length,
        recentEntries: (Array.isArray(usageSummary.recent_entries) ? usageSummary.recent_entries : [])
          .slice(-12)
          .reverse()
          .map(summarizePostCompactUsageEntry),
      },
      summary: {
        hasHistory: usageSummary.has_history === true,
        candidateCount: Number(usageSummary.candidate_count || 0),
        totals: usageSummary.totals || {},
        usefulCandidates: (Array.isArray(usageSummary.useful_candidates) ? usageSummary.useful_candidates : []).slice(0, 8).map(summarizePostCompactUsageRow),
        ignoredCandidates: (Array.isArray(usageSummary.ignored_candidates) ? usageSummary.ignored_candidates : []).slice(0, 8).map(summarizePostCompactUsageRow),
        missingUsageCandidates: (Array.isArray(usageSummary.missing_usage_candidates) ? usageSummary.missing_usage_candidates : []).slice(0, 8).map(summarizePostCompactUsageRow),
      },
      discipline: disciplineDiagnostics,
      dispatch: dispatchDiagnostics,
      agentReliability,
      boundaryTimeline: timeline,
      sessionMemory,
      toolContinuity,
      compactFileReferences,
      compactFileReferenceReadPlan,
      compactFileReferenceReadPlanAccess,
      compactFileReferenceReadPlanFreshness,
      compactFileReferenceReadPlanRevalidationGate,
      compactFileReferenceReadPlanDiscipline,
      compactFileReferenceReadPlanRevalidationDiscipline,
      compactFileReferenceReadPlanRevalidationSessionBinding,
      compactFileReferenceAccess,
      compactFileReferenceDiscipline,
      compactionHooks: hookLedger,
      boundaryReplay: replay,
      replayRepairWorkItems: replayRepairWorkItemsFinal,
      replayRepairDispatchCandidates: replayRepairDispatchCandidatesFinal,
      readPlanRevalidationRepairWorkItems,
      historicalBoundaryReplay: historicalReplay,
      agentTypeReplay,
      archive: {
        file: distillationLedger.file || "",
        schema: archive.schema || "ccm-group-post-compact-candidate-usage-distillation-v1",
        archivedCount: Number(archive.archived_count || 0),
        updatedAt: archive.updatedAt || distillationLedger.updatedAt || "",
        rows: (Array.isArray(archive.rows) ? archive.rows : []).slice(0, 12).map(summarizePostCompactUsageRow),
      },
      typedMemory: {
        totalDocs: Array.isArray(docs) ? docs.length : 0,
        byType: docsByType,
        recallQueryHash: hash(recallQuery, 16),
        recallScoring: recall?.postCompactUsageScoring || {
          schema: "ccm-group-typed-memory-post-compact-usage-scoring-v1",
          hint_count: 0,
          matched_count: 0,
          boosted_count: 0,
          deprioritized_count: 0,
        },
        surfaced: Array.isArray(recall?.surfaced) ? recall.surfaced : [],
        boostedDocs: recallDiagnostics
          .filter((item: any) => Number(item.postCompactUsage?.adjustment || 0) > 0)
          .slice(0, 8)
          .map((item: any) => ({ relPath: item.relPath, score: Number(item.score || 0), adjustment: Number(item.postCompactUsage?.adjustment || 0), matched: item.postCompactUsage?.matched || [] })),
        deprioritizedDocs: recallDiagnostics
          .filter((item: any) => Number(item.postCompactUsage?.adjustment || 0) < 0)
          .slice(0, 8)
          .map((item: any) => ({ relPath: item.relPath, score: Number(item.score || 0), adjustment: Number(item.postCompactUsage?.adjustment || 0), matched: item.postCompactUsage?.matched || [] })),
        diagnostics: recallDiagnostics.slice(-16).map((item: any) => ({
          relPath: item.relPath,
          skipped: item.skipped === true,
          reason: item.reason || "",
          score: Number(item.score || 0),
          adjustment: Number(item.postCompactUsage?.adjustment || 0),
          matched: item.postCompactUsage?.matched || [],
        })),
      },
    };
  } catch (error: any) {
    return {
      schema: "ccm-memory-center-post-compact-usage-diagnostics-v1",
      groupId: id,
      error: error?.message || String(error),
    };
  }
}

export function getMemoryMetrics() {
  const state = readJson(METRICS_FILE, { version: 1, counters: {}, events: [], updatedAt: "" });
  const c = state.counters || {};
  const rate = (good: number, total: number, invert = false) => total > 0 ? Math.round(((invert ? total - good : good) / total) * 1000) / 10 : null;
  const sampledRates = {
    recallRate: rate(Number(c.recallHits || 0), Number(c.recallAttempts || 0)),
    forgettingRate: rate(Number(c.forgettingFailures || 0), Number(c.memoryChecks || 0)),
    misdispatchRate: rate(Number(c.misdispatches || 0), Number(c.dispatches || 0)),
    recoverySuccessRate: rate(Number(c.recoverySuccesses || 0), Number(c.recoveryAttempts || 0)),
  };
  const acceptanceRates = state.latestAcceptance?.rates || {};
  return {
    ...state,
    rates: {
      recallRate: sampledRates.recallRate ?? acceptanceRates.recallRate ?? null,
      forgettingRate: sampledRates.forgettingRate ?? acceptanceRates.forgettingRate ?? null,
      misdispatchRate: sampledRates.misdispatchRate ?? acceptanceRates.misdispatchRate ?? null,
      recoverySuccessRate: sampledRates.recoverySuccessRate ?? acceptanceRates.recoverySuccessRate ?? null,
    },
    sampledRates,
  };
}

export function recordMemoryMetric(type: string, payload: any = {}) {
  const state = readJson(METRICS_FILE, { version: 1, counters: {}, events: [], updatedAt: "" });
  const counters = { ...(state.counters || {}) };
  const increments: Record<string, Record<string, number>> = {
    recall_hit: { recallAttempts: 1, recallHits: 1 }, recall_miss: { recallAttempts: 1 },
    remembered: { memoryChecks: 1 }, forgotten: { memoryChecks: 1, forgettingFailures: 1 },
    dispatch: { dispatches: 1 }, dispatch_correct: {}, misdispatch: { misdispatches: 1 },
    recovery_success: { recoveryAttempts: 1, recoverySuccesses: 1 }, recovery_failure: { recoveryAttempts: 1 },
  };
  for (const [key, value] of Object.entries(increments[type] || {})) counters[key] = Number(counters[key] || 0) + value;
  const event = { id: `metric-${Date.now().toString(36)}-${crypto.randomBytes(2).toString("hex")}`, at: now(), type, ...payload };
  const next = { version: 1, counters, events: [...(state.events || []), event].slice(-500), updatedAt: event.at };
  writeJsonAtomic(METRICS_FILE, next);
  return getMemoryMetrics();
}

function percent(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : null;
}

function evidenceTextMatches(content: any, storedText: any) {
  const normalize = (value: any) => String(value || "").replace(/\s+/g, " ").trim();
  const haystack = normalize(content);
  const fullNeedle = normalize(storedText).replace(/(?:\.\.\.|…)+$/, "").trim();
  if (!haystack || !fullNeedle) return false;
  const stablePrefix = fullNeedle.slice(0, Math.min(fullNeedle.length, 260));
  return stablePrefix.length >= 12 && haystack.includes(stablePrefix);
}

function backupReadable(file: string) {
  try { JSON.parse(fs.readFileSync(`${file}.bak`, "utf-8")); return true; } catch { return false; }
}

function archivesValid(memory: any) {
  const archives = [...(memory?.conclusionArchives || []), ...(memory?.decisionArchives || [])];
  return archives.every((archive: any) => archive?.checksum === crypto.createHash("sha256").update(JSON.stringify(archive?.records || [])).digest("hex"));
}

export function runMemoryAcceptanceSnapshot() {
  let recallChecks = 0;
  let recallHits = 0;
  let memoryChecks = 0;
  let forgettingFailures = 0;
  let dispatches = 0;
  let misdispatchSignals = 0;
  let recoveryAttempts = 0;
  let recoverySuccesses = 0;
  let projectIntegrityChecks = 0;
  let projectIntegrityPasses = 0;
  const scopes: any[] = [];

  for (const file of listJsonFiles(GROUP_MEMORY_DIR)) {
    const memory = readMemoryFile(file);
    if (!memory) continue;
    const groupId = String(memory.groupId || path.basename(file, ".json"));
    const messages = readJson(path.join(GROUP_MESSAGES_DIR, `${groupId}.json`), []);
    const byId = new Map((Array.isArray(messages) ? messages : []).map((message: any) => [String(message.id || message.uuid || ""), message]));
    const anchors = (memory.factAnchors || []).slice(-200);
    let scopeRecallChecks = 0;
    let scopeRecallHits = 0;
    for (const anchor of anchors) {
      if (!anchor?.messageId || !anchor?.text) continue;
      scopeRecallChecks++;
      const message: any = byId.get(String(anchor.messageId));
      if (message) scopeRecallHits++;
    }
    const requirements = applyMemoryControls("group", groupId, memory)?.persistentRequirements || [];
    let scopeMemoryChecks = 0;
    let scopeForgettingFailures = 0;
    for (const requirement of requirements) {
      if (!requirement?.messageId || !requirement?.text) continue;
      scopeMemoryChecks++;
      const message: any = byId.get(String(requirement.messageId));
      if (!message || !evidenceTextMatches(message.content, requirement.text)) scopeForgettingFailures++;
    }
    const groupDispatches = (Array.isArray(messages) ? messages : []).reduce((sum: number, message: any) => sum + (Array.isArray(message?.assignments) ? message.assignments.length : 0), 0);
    const groupCorrections = (Array.isArray(messages) ? messages : []).filter((message: any) => message?.role === "user" && /(不该|不要|无需|错误|误).{0,16}(派发|分派|创建任务)/i.test(String(message?.content || ""))).length;
    recallChecks += scopeRecallChecks;
    recallHits += scopeRecallHits;
    memoryChecks += scopeMemoryChecks;
    forgettingFailures += scopeForgettingFailures;
    dispatches += groupDispatches;
    misdispatchSignals += Math.min(groupDispatches, groupCorrections);
    if (fs.existsSync(`${file}.bak`)) {
      recoveryAttempts++;
      if (backupReadable(file)) recoverySuccesses++;
    }
    scopes.push({ scope: "group", scopeId: groupId, messages: Array.isArray(messages) ? messages.length : 0, recallChecks: scopeRecallChecks, recallHits: scopeRecallHits, memoryChecks: scopeMemoryChecks, forgettingFailures: scopeForgettingFailures, dispatches: groupDispatches, misdispatchSignals: groupCorrections });
  }

  for (const file of listJsonFiles(PROJECT_MEMORY_DIR)) {
    const memory = readMemoryFile(file);
    if (!memory) continue;
    projectIntegrityChecks++;
    if (archivesValid(memory)) projectIntegrityPasses++;
    if (fs.existsSync(`${file}.bak`)) {
      recoveryAttempts++;
      if (backupReadable(file)) recoverySuccesses++;
    }
    scopes.push({ scope: "project", scopeId: memory.project || path.basename(file, ".json"), archiveIntegrity: archivesValid(memory) });
  }

  if (fs.existsSync(GLOBAL_MEMORY_FILE)) {
    const { loadGlobalAgentMemory, getGlobalMemoryEvidence } = require("../../agents/global/memory");
    const globalMemory = loadGlobalAgentMemory();
    const globalItems = ["user", "feedback", "authorization", "decisions", "unresolved", "references"]
      .flatMap((key: string) => globalMemory[key] || []);
    let scopeRecallChecks = 0;
    let scopeRecallHits = 0;
    for (const item of globalItems) {
      const sessionId = item.source?.sessionId;
      const messageId = item.source?.messageIds?.[0];
      if (!sessionId || !messageId) continue;
      scopeRecallChecks++;
      if (getGlobalMemoryEvidence({ sessionId, messageId }).length > 0) scopeRecallHits++;
    }
    recallChecks += scopeRecallChecks;
    recallHits += scopeRecallHits;
    memoryChecks += scopeRecallChecks;
    forgettingFailures += scopeRecallChecks - scopeRecallHits;
    projectIntegrityChecks++;
    if (globalMemory.integrity?.pass === true) projectIntegrityPasses++;
    if (fs.existsSync(`${GLOBAL_MEMORY_FILE}.bak`)) {
      recoveryAttempts++;
      if (backupReadable(GLOBAL_MEMORY_FILE)) recoverySuccesses++;
    }
    scopes.push({ scope: "global", scopeId: "global-agent", memoryItems: globalItems.length, recallChecks: scopeRecallChecks, recallHits: scopeRecallHits, archiveIntegrity: globalMemory.integrity?.pass === true, encryptedTranscripts: globalMemory.privacy?.encryptedTranscripts === true });
  }

  const snapshot = {
    id: `acceptance-${Date.now().toString(36)}`,
    at: now(),
    dataset: { scopes: scopes.length, groupMessages: scopes.filter(item => item.scope === "group").reduce((sum, item) => sum + item.messages, 0), recallChecks, memoryChecks, dispatches, recoveryAttempts, projectIntegrityChecks },
    counts: { recallHits, forgettingFailures, misdispatchSignals, recoverySuccesses, projectIntegrityPasses },
    rates: {
      recallRate: percent(recallHits, recallChecks),
      forgettingRate: percent(forgettingFailures, memoryChecks),
      misdispatchRate: percent(misdispatchSignals, dispatches),
      recoverySuccessRate: percent(recoverySuccesses, recoveryAttempts),
      projectIntegrityRate: percent(projectIntegrityPasses, projectIntegrityChecks),
    },
    scopes,
  };
  const state = readJson(METRICS_FILE, { version: 1, counters: {}, events: [], updatedAt: "" });
  const event = { id: snapshot.id, at: snapshot.at, type: "acceptance_run", dataset: snapshot.dataset, rates: snapshot.rates };
  writeJsonAtomic(METRICS_FILE, { ...state, latestAcceptance: snapshot, events: [...(state.events || []), event].slice(-500), updatedAt: snapshot.at });
  appendAudit({ type: "memory_acceptance", action: "acceptance_run", scope: "system", scopeId: "all", actor: "local-user", reason: "真实项目长期记忆验收快照", dataset: snapshot.dataset, rates: snapshot.rates });
  return snapshot;
}

function tokenizeQualityText(value: any) {
  return Array.from(new Set(String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_:/.-]+/gu, " ")
    .split(/\s+/)
    .map(item => item.trim())
    .filter(item => item.length >= 2 && !/^(the|and|for|with|this|that|一个|这个|那个|需要|必须|项目|任务)$/.test(item))
  ));
}

function qualityRate(ok: number, total: number) {
  return total > 0 ? Math.round((ok / total) * 1000) / 10 : null;
}

function makeQualityCheck(id: string, label: string, checked: number, passed: number, evidence: any[] = [], gaps: any[] = [], note = "") {
  const score = qualityRate(passed, checked);
  return {
    id, label, checked, passed, failed: Math.max(0, checked - passed), score,
    pass: checked === 0 ? null : Number(score) >= 90,
    status: checked === 0 ? "empty" : Number(score) >= 90 ? "ok" : Number(score) >= 70 ? "warn" : "fail",
    evidence: evidence.slice(0, 12),
    gaps: gaps.slice(0, 12),
    note,
  };
}

function normalizeQualityStringList(value: any) {
  if (Array.isArray(value)) return value.map(item => String(item || "").trim()).filter(Boolean);
  const text = String(value || "").trim();
  if (!text) return [];
  return text.split(/[；;,\n]/).map(item => item.trim()).filter(Boolean);
}

function normalizeQualityPostCompactUsageState(value: any) {
  const state = String(value || "").trim().toLowerCase();
  if (["used", "ignored", "verified", "mentioned", "unreferenced"].includes(state)) return state;
  if (["checked", "reviewed", "validated", "confirmed"].includes(state)) return "verified";
  if (["skipped", "unused", "not_used", "not-used", "not used"].includes(state)) return "ignored";
  if (["applied", "referenced", "consumed"].includes(state)) return "used";
  return "";
}

function postCompactQualityCandidateId(row: any = {}) {
  return String(row.candidate_id || row.candidateId || row.id || "").trim();
}

function postCompactQualityCandidateValue(row: any = {}) {
  return compactMemoryCenterText(row.value || row.text || row.summary || "", 360);
}

function postCompactQualityCandidateMatches(row: any = {}, stale: any = {}) {
  const rowId = postCompactQualityCandidateId(row).toLowerCase();
  const staleId = postCompactQualityCandidateId(stale).toLowerCase();
  if (rowId && staleId && rowId === staleId) return true;
  const rowValue = postCompactQualityCandidateValue(row).toLowerCase();
  const staleValue = postCompactQualityCandidateValue(stale).toLowerCase();
  return !!rowValue && !!staleValue && (rowValue.includes(staleValue) || staleValue.includes(rowValue));
}

function collectPostCompactQualityRows(summary: any = {}) {
  const receiptRows = Array.isArray(summary.post_compact_reinjection_gate_receipt_rows || summary.postCompactReinjectionGateReceiptRows)
    ? (summary.post_compact_reinjection_gate_receipt_rows || summary.postCompactReinjectionGateReceiptRows)
    : [];
  const visibleRows = Array.isArray(summary.post_compact_reinjection_gate_summary?.rows || summary.postCompactReinjectionGateSummary?.rows)
    ? (summary.post_compact_reinjection_gate_summary?.rows || summary.postCompactReinjectionGateSummary?.rows)
    : [];
  const sources = receiptRows.length ? receiptRows : visibleRows;
  const rows: any[] = [];
  for (const source of sources) {
    const gate = source.post_compact_reinjection_gate || source.postCompactReinjectionGate || source;
    const gateIds = normalizeQualityStringList(gate.gate_ids || gate.gateIds || source.gate_ids || source.gateIds);
    const fallbackGateId = String(gate.gate_id || gate.gateId || gate.reinjection_gate_id || gate.reinjectionGateId || gateIds[0] || "").trim();
    const candidateRows = Array.isArray(gate.candidate_usage_rows || gate.candidateUsageRows || source.candidate_usage_rows || source.candidateUsageRows)
      ? (gate.candidate_usage_rows || gate.candidateUsageRows || source.candidate_usage_rows || source.candidateUsageRows)
      : [];
    for (const candidate of candidateRows) {
      rows.push({
        ...candidate,
        gate_id: String(candidate.gate_id || candidate.gateId || fallbackGateId || "").trim(),
        agent: source.agent || source.project || source.target || "",
      });
    }
  }
  return rows;
}

function summarizePostCompactQualityRow(row: any = {}) {
  return {
    gate_id: String(row.gate_id || row.gateId || ""),
    candidate_id: postCompactQualityCandidateId(row),
    value: postCompactQualityCandidateValue(row),
    usage_state: normalizeQualityPostCompactUsageState(row.usage_state || row.usageState || row.status || row.state),
    agent: String(row.agent || row.project || ""),
  };
}

function evaluatePostCompactCandidateDiscipline(options: any = {}) {
  const taskLimit = Math.max(5, Number(options.taskLimit || 40));
  const tasks = Array.isArray(options.tasks) ? options.tasks : loadTasks().slice(-taskLimit);
  const explicitGroupIds = Array.isArray(options.groupIds || options.group_ids)
    ? (options.groupIds || options.group_ids).map((item: any) => String(item || "").trim()).filter(Boolean)
    : null;
  const groupIds = new Set<string>(explicitGroupIds || []);
  if (!explicitGroupIds) {
    for (const file of listJsonFiles(GROUP_MEMORY_DIR)) {
      const memory = readMemoryFile(file);
      const id = String(memory?.groupId || path.basename(file, ".json")).trim();
      if (id) groupIds.add(id);
    }
  }
  for (const task of tasks) {
    const groupId = String(task?.group_id || task?.groupId || "").trim();
    if (groupId) groupIds.add(groupId);
  }

  const usageSummaries = new Map<string, any>();
  const staleByGroup = new Map<string, any[]>();
  const getUsageSummary = (groupId: string) => {
    if (!groupId) return null;
    if (usageSummaries.has(groupId)) return usageSummaries.get(groupId);
    try {
      const { buildGroupPostCompactCandidateUsageSummary, readGroupPostCompactCandidateUsageLedger } = require("../collaboration/memory");
      const { readGroupTypedMemoryDistillationLedger } = require("../collaboration/group-memory-index");
      const summary = buildGroupPostCompactCandidateUsageSummary(groupId, {});
      const usageLedger = readGroupPostCompactCandidateUsageLedger(groupId);
      const distillationLedger = readGroupTypedMemoryDistillationLedger(groupId);
      const archiveRows = Array.isArray(distillationLedger?.postCompactUsageArchive?.rows) ? distillationLedger.postCompactUsageArchive.rows : [];
      const historicallyIgnoredRows = Object.values(usageLedger?.stats || {}).filter((row: any) => Number(row?.ignored_count || 0) > 0);
      usageSummaries.set(groupId, summary);
      staleByGroup.set(groupId, [
        ...historicallyIgnoredRows,
        ...(Array.isArray(summary.ignored_candidates) ? summary.ignored_candidates : []),
        ...archiveRows,
      ]);
      return summary;
    } catch {
      usageSummaries.set(groupId, null);
      staleByGroup.set(groupId, []);
      return null;
    }
  };

  let checked = 0;
  let passed = 0;
  const evidence: any[] = [];
  const gaps: any[] = [];
  const seenCandidateKeys = new Set<string>();

  for (const task of tasks.filter((item: any) => item?.delivery_summary)) {
    const summary = task.delivery_summary || {};
    const gateSummary = summary.post_compact_reinjection_gate_summary || summary.postCompactReinjectionGateSummary || {};
    const required = gateSummary.required === true
      || Number(summary.post_compact_reinjection_gate_count || summary.postCompactReinjectionGateCount || 0) > 0
      || Array.isArray(summary.post_compact_reinjection_gate_receipt_rows || summary.postCompactReinjectionGateReceiptRows);
    if (!required) continue;
    const taskGroupId = String(task.group_id || task.groupId || "").trim();
    const rows = collectPostCompactQualityRows(summary);
    const staleRows = staleByGroup.has(taskGroupId) ? (staleByGroup.get(taskGroupId) || []) : (getUsageSummary(taskGroupId), staleByGroup.get(taskGroupId) || []);
    const candidateCount = Number(gateSummary.candidate_count || summary.post_compact_reinjection_candidate_count || 0);
    if (!rows.length && candidateCount > 0) {
      checked += candidateCount;
      gaps.push({ taskId: task.id, title: task.title, groupId: taskGroupId, reason: `压缩重注入 gate 要求 ${candidateCount} 个候选，但结果说明没有候选使用行` });
      continue;
    }
    for (const rawRow of rows) {
      const row = summarizePostCompactQualityRow(rawRow);
      const key = `${task.id || ""}|${row.gate_id}|${row.candidate_id || row.value}`;
      if (seenCandidateKeys.has(key)) continue;
      seenCandidateKeys.add(key);
      checked++;
      const stale = staleRows.find((item: any) => postCompactQualityCandidateMatches(row, item));
      const classified = ["used", "ignored", "verified"].includes(row.usage_state);
      const stalePromoted = !!stale && row.usage_state === "used";
      if (classified && !stalePromoted) {
        passed++;
        evidence.push({ taskId: task.id, title: task.title, groupId: taskGroupId, ...row, stale: !!stale });
      } else {
        gaps.push({
          taskId: task.id,
          title: task.title,
          groupId: taskGroupId,
          ...row,
          reason: !classified
            ? "候选缺少 used / ignored / verified 分类"
            : "历史忽略或归档候选被直接 used，需要先 verified 或继续 ignored",
        });
      }
    }
  }

  for (const groupId of groupIds) {
    const summary = getUsageSummary(groupId);
    for (const row of Array.isArray(summary?.missing_usage_candidates) ? summary.missing_usage_candidates : []) {
      const key = `ledger|${groupId}|${postCompactQualityCandidateId(row) || postCompactQualityCandidateValue(row)}`;
      if (seenCandidateKeys.has(key)) continue;
      seenCandidateKeys.add(key);
      checked++;
      gaps.push({
        groupId,
        candidate_id: postCompactQualityCandidateId(row),
        value: postCompactQualityCandidateValue(row),
        usage_state: "mentioned",
        reason: "历史账本中该候选只有 mentioned，缺少 used / ignored / verified 回执",
      });
    }
  }

  const check: any = makeQualityCheck(
    "post_compact_candidate_discipline",
    "压缩候选纪律",
    checked,
    passed,
    evidence,
    gaps,
    "检查压缩后重注入候选是否逐条 classified，并防止历史 ignored/归档候选未经 verified 又被 promoted 为 used。"
  );
  check.trend = buildPostCompactCandidateDisciplineTrend({ tasks, groupIds: Array.from(groupIds), taskLimit, minSample: 1 });
  return check;
}

const POST_COMPACT_CANDIDATE_DISCIPLINE_THRESHOLD = 90;

function qualityTaskTime(task: any = {}) {
  return String(
    task.completed_at
      || task.completedAt
      || task.updated_at
      || task.updatedAt
      || task.delivery_summary?.completed_at
      || task.delivery_summary?.updated_at
      || task.created_at
      || task.createdAt
      || task.time
      || task.timestamp
      || ""
  ).trim();
}

function qualityTaskTimeMs(task: any = {}) {
  const parsed = Date.parse(qualityTaskTime(task));
  return Number.isFinite(parsed) ? parsed : 0;
}

function postCompactDisciplineBucketKey(value: any) {
  const parsed = Date.parse(String(value || ""));
  if (!Number.isFinite(parsed)) return "unknown";
  return new Date(parsed).toISOString().slice(0, 10);
}

function makePostCompactDisciplineStats(groupId: string) {
  return {
    groupId,
    taskCount: 0,
    checked: 0,
    strictClassified: 0,
    missing: 0,
    unclassified: 0,
    stalePromoted: 0,
    stateCounts: { used: 0, ignored: 0, verified: 0, mentioned: 0, unreferenced: 0, unclassified: 0 },
    recentRows: [] as any[],
    stalePromotions: [] as any[],
    buckets: new Map<string, any>(),
    taskIds: new Set<string>(),
    ledger: {
      file: "",
      updatedAt: "",
      totals: { used: 0, ignored: 0, verified: 0, mentioned: 0, total: 0 },
      strictClassified: 0,
      total: 0,
      strictClassificationRate: null as any,
      openMentionedCount: 0,
    },
  };
}

function addPostCompactDisciplineBucket(stats: any, bucketKey: string, sample: any = {}) {
  const key = bucketKey || "unknown";
  const bucket = stats.buckets.get(key) || {
    key,
    checked: 0,
    strictClassified: 0,
    missing: 0,
    unclassified: 0,
    stalePromoted: 0,
    taskCount: 0,
  };
  bucket.checked += Number(sample.checked || 0);
  bucket.strictClassified += Number(sample.strictClassified || 0);
  bucket.missing += Number(sample.missing || 0);
  bucket.unclassified += Number(sample.unclassified || 0);
  bucket.stalePromoted += Number(sample.stalePromoted || 0);
  if (sample.taskId && !bucket.taskIds?.has?.(sample.taskId)) {
    bucket.taskIds = bucket.taskIds || new Set<string>();
    bucket.taskIds.add(sample.taskId);
    bucket.taskCount = bucket.taskIds.size;
  }
  stats.buckets.set(key, bucket);
}

function finalizePostCompactDisciplineStats(stats: any, threshold: number, minSample: number) {
  const ledgerTotals = stats.ledger?.totals || {};
  const ledgerClassified = Number(ledgerTotals.used || 0) + Number(ledgerTotals.ignored || 0) + Number(ledgerTotals.verified || 0);
  const ledgerTotal = Number(ledgerTotals.total || 0);
  stats.ledger.strictClassified = ledgerClassified;
  stats.ledger.total = ledgerTotal;
  stats.ledger.strictClassificationRate = qualityRate(ledgerClassified, ledgerTotal);
  const strictClassificationRate = qualityRate(Number(stats.strictClassified || 0), Number(stats.checked || 0));
  const effectiveRate = strictClassificationRate ?? stats.ledger.strictClassificationRate;
  const hasSample = Number(stats.checked || 0) > 0 || ledgerTotal > 0;
  const alert = (Number(stats.checked || 0) >= minSample && Number(strictClassificationRate) < threshold)
    || (Number(stats.checked || 0) === 0 && ledgerTotal >= minSample && Number(stats.ledger.strictClassificationRate) < threshold);
  const buckets = Array.from(stats.buckets.values())
    .sort((a: any, b: any) => String(a.key || "").localeCompare(String(b.key || "")))
    .slice(-14)
    .map((bucket: any) => ({
      key: bucket.key,
      checked: Number(bucket.checked || 0),
      strictClassified: Number(bucket.strictClassified || 0),
      missing: Number(bucket.missing || 0),
      unclassified: Number(bucket.unclassified || 0),
      stalePromoted: Number(bucket.stalePromoted || 0),
      taskCount: Number(bucket.taskCount || 0),
      strictClassificationRate: qualityRate(Number(bucket.strictClassified || 0), Number(bucket.checked || 0)),
    }));
  return {
    schema: "ccm-post-compact-candidate-discipline-group-trend-v1",
    groupId: stats.groupId,
    taskCount: Number(stats.taskCount || 0),
    checked: Number(stats.checked || 0),
    strictClassified: Number(stats.strictClassified || 0),
    missing: Number(stats.missing || 0),
    unclassified: Number(stats.unclassified || 0),
    stalePromoted: Number(stats.stalePromoted || 0),
    stateCounts: stats.stateCounts,
    strictClassificationRate,
    effectiveStrictClassificationRate: effectiveRate,
    status: !hasSample ? "empty" : Number(effectiveRate) >= threshold ? "ok" : Number(effectiveRate) >= 70 ? "warn" : "fail",
    alert,
    threshold,
    minSample,
    buckets,
    ledger: stats.ledger,
    recentRows: (stats.recentRows || []).sort((a: any, b: any) => Number(b.atMs || 0) - Number(a.atMs || 0)).slice(0, 12).map((row: any) => {
      const { atMs, ...rest } = row;
      return rest;
    }),
    stalePromotions: (stats.stalePromotions || []).sort((a: any, b: any) => Number(b.atMs || 0) - Number(a.atMs || 0)).slice(0, 8).map((row: any) => {
      const { atMs, ...rest } = row;
      return rest;
    }),
  };
}

export function buildPostCompactCandidateDisciplineTrend(options: any = {}) {
  const taskLimit = Math.max(5, Number(options.taskLimit || 120));
  const threshold = Math.max(1, Math.min(100, Number(options.threshold || POST_COMPACT_CANDIDATE_DISCIPLINE_THRESHOLD)));
  const minSample = Math.max(1, Number(options.minSample || 3));
  const tasks = Array.isArray(options.tasks) ? options.tasks : loadTasks().slice(-taskLimit);
  const explicitGroupIds = Array.isArray(options.groupIds || options.group_ids)
    ? (options.groupIds || options.group_ids).map((item: any) => String(item || "").trim()).filter(Boolean)
    : null;
  const groupIds = new Set<string>(explicitGroupIds || []);
  if (!explicitGroupIds) {
    for (const file of listJsonFiles(GROUP_MEMORY_DIR)) {
      const memory = readMemoryFile(file);
      const id = String(memory?.groupId || path.basename(file, ".json")).trim();
      if (id) groupIds.add(id);
    }
  }
  for (const task of tasks) {
    const groupId = String(task?.group_id || task?.groupId || "").trim();
    if (groupId && (!explicitGroupIds || groupIds.has(groupId))) groupIds.add(groupId);
  }

  const usageSummaries = new Map<string, any>();
  const staleByGroup = new Map<string, any[]>();
  const getUsageSummary = (groupId: string) => {
    if (!groupId) return null;
    if (usageSummaries.has(groupId)) return usageSummaries.get(groupId);
    try {
      const { buildGroupPostCompactCandidateUsageSummary, readGroupPostCompactCandidateUsageLedger } = require("../collaboration/memory");
      const { readGroupTypedMemoryDistillationLedger } = require("../collaboration/group-memory-index");
      const summary = buildGroupPostCompactCandidateUsageSummary(groupId, {});
      const usageLedger = readGroupPostCompactCandidateUsageLedger(groupId);
      const distillationLedger = readGroupTypedMemoryDistillationLedger(groupId);
      const archiveRows = Array.isArray(distillationLedger?.postCompactUsageArchive?.rows) ? distillationLedger.postCompactUsageArchive.rows : [];
      const historicallyIgnoredRows = Object.values(usageLedger?.stats || {}).filter((row: any) => Number(row?.ignored_count || 0) > 0);
      usageSummaries.set(groupId, summary);
      staleByGroup.set(groupId, [
        ...historicallyIgnoredRows,
        ...(Array.isArray(summary.ignored_candidates) ? summary.ignored_candidates : []),
        ...archiveRows,
      ]);
      return summary;
    } catch {
      usageSummaries.set(groupId, null);
      staleByGroup.set(groupId, []);
      return null;
    }
  };

  const groups = new Map<string, any>();
  const ensureStats = (groupId: string) => {
    const id = groupId || "unknown";
    if (!groups.has(id)) groups.set(id, makePostCompactDisciplineStats(id));
    return groups.get(id);
  };
  for (const groupId of groupIds) ensureStats(groupId);

  for (const task of tasks.filter((item: any) => item?.delivery_summary)) {
    const taskGroupId = String(task.group_id || task.groupId || "").trim();
    if (explicitGroupIds && !groupIds.has(taskGroupId)) continue;
    const summary = task.delivery_summary || {};
    const gateSummary = summary.post_compact_reinjection_gate_summary || summary.postCompactReinjectionGateSummary || {};
    const required = gateSummary.required === true
      || Number(summary.post_compact_reinjection_gate_count || summary.postCompactReinjectionGateCount || 0) > 0
      || Array.isArray(summary.post_compact_reinjection_gate_receipt_rows || summary.postCompactReinjectionGateReceiptRows);
    if (!required) continue;
    const stats = ensureStats(taskGroupId);
    const taskId = String(task.id || task.task_id || task.taskId || "");
    if (taskId && !stats.taskIds.has(taskId)) {
      stats.taskIds.add(taskId);
      stats.taskCount = stats.taskIds.size;
    }
    const at = qualityTaskTime(task) || now();
    const atMs = qualityTaskTimeMs(task);
    const bucketKey = postCompactDisciplineBucketKey(at);
    const rows = collectPostCompactQualityRows(summary);
    const candidateCount = Number(gateSummary.candidate_count || summary.post_compact_reinjection_candidate_count || 0);
    if (!rows.length && candidateCount > 0) {
      stats.checked += candidateCount;
      stats.missing += candidateCount;
      stats.unclassified += candidateCount;
      stats.stateCounts.unclassified += candidateCount;
      addPostCompactDisciplineBucket(stats, bucketKey, { taskId, checked: candidateCount, missing: candidateCount, unclassified: candidateCount });
      stats.recentRows.push({
        at,
        atMs,
        taskId,
        title: task.title || "",
        groupId: taskGroupId,
        usage_state: "unclassified",
        strict_pass: false,
        reason: `压缩重注入 gate 要求 ${candidateCount} 个候选，但结果说明没有候选使用行`,
      });
      continue;
    }
    const staleRows = staleByGroup.has(taskGroupId) ? (staleByGroup.get(taskGroupId) || []) : (getUsageSummary(taskGroupId), staleByGroup.get(taskGroupId) || []);
    for (const rawRow of rows) {
      const row = summarizePostCompactQualityRow(rawRow);
      const state = row.usage_state || "unclassified";
      const classified = ["used", "ignored", "verified"].includes(row.usage_state);
      const stale = staleRows.find((item: any) => postCompactQualityCandidateMatches(row, item));
      const stalePromoted = !!stale && row.usage_state === "used";
      const strictPass = classified && !stalePromoted;
      stats.checked++;
      if (strictPass) stats.strictClassified++;
      if (!classified) {
        stats.unclassified++;
        if (state === "mentioned" || state === "unreferenced" || state === "unclassified") stats.missing++;
      }
      if (stalePromoted) stats.stalePromoted++;
      if (stats.stateCounts[state] === undefined) stats.stateCounts[state] = 0;
      stats.stateCounts[state]++;
      addPostCompactDisciplineBucket(stats, bucketKey, {
        taskId,
        checked: 1,
        strictClassified: strictPass ? 1 : 0,
        missing: !classified ? 1 : 0,
        unclassified: !classified ? 1 : 0,
        stalePromoted: stalePromoted ? 1 : 0,
      });
      const recent = {
        at,
        atMs,
        taskId,
        title: task.title || "",
        groupId: taskGroupId,
        gate_id: row.gate_id,
        candidate_id: row.candidate_id,
        value: row.value,
        usage_state: row.usage_state || "unclassified",
        strict_pass: strictPass,
        stale: !!stale,
        reason: strictPass
          ? "已严格分类"
          : stalePromoted
            ? "历史忽略或归档候选被直接 used"
            : "候选缺少 used / ignored / verified 分类",
      };
      stats.recentRows.push(recent);
      if (stalePromoted) stats.stalePromotions.push(recent);
    }
  }

  for (const groupId of groupIds) {
    const stats = ensureStats(groupId);
    const summary = getUsageSummary(groupId);
    const totals = summary?.totals || { used: 0, ignored: 0, verified: 0, mentioned: 0, total: 0 };
    stats.ledger = {
      file: summary?.ledger_file || "",
      updatedAt: summary?.updatedAt || "",
      totals,
      strictClassified: 0,
      total: 0,
      strictClassificationRate: null,
      openMentionedCount: Array.isArray(summary?.missing_usage_candidates) ? summary.missing_usage_candidates.length : 0,
    };
  }

  const groupRows = Array.from(groups.values())
    .map((stats: any) => finalizePostCompactDisciplineStats(stats, threshold, minSample))
    .sort((a: any, b: any) => {
      const aRate = a.effectiveStrictClassificationRate === null || a.effectiveStrictClassificationRate === undefined ? 101 : Number(a.effectiveStrictClassificationRate);
      const bRate = b.effectiveStrictClassificationRate === null || b.effectiveStrictClassificationRate === undefined ? 101 : Number(b.effectiveStrictClassificationRate);
      return aRate - bRate || Number(b.checked || 0) - Number(a.checked || 0);
    });
  const overall = groupRows.reduce((acc: any, group: any) => {
    acc.checked += Number(group.checked || 0);
    acc.strictClassified += Number(group.strictClassified || 0);
    acc.missing += Number(group.missing || 0);
    acc.unclassified += Number(group.unclassified || 0);
    acc.stalePromoted += Number(group.stalePromoted || 0);
    acc.taskCount += Number(group.taskCount || 0);
    acc.ledger.total += Number(group.ledger?.total || 0);
    acc.ledger.strictClassified += Number(group.ledger?.strictClassified || 0);
    acc.ledger.openMentionedCount += Number(group.ledger?.openMentionedCount || 0);
    return acc;
  }, { checked: 0, strictClassified: 0, missing: 0, unclassified: 0, stalePromoted: 0, taskCount: 0, ledger: { total: 0, strictClassified: 0, openMentionedCount: 0 } });
  overall.strictClassificationRate = qualityRate(overall.strictClassified, overall.checked);
  overall.ledger.strictClassificationRate = qualityRate(overall.ledger.strictClassified, overall.ledger.total);
  overall.effectiveStrictClassificationRate = overall.strictClassificationRate ?? overall.ledger.strictClassificationRate;
  overall.status = overall.effectiveStrictClassificationRate === null || overall.effectiveStrictClassificationRate === undefined
    ? "empty"
    : Number(overall.effectiveStrictClassificationRate) >= threshold ? "ok" : Number(overall.effectiveStrictClassificationRate) >= 70 ? "warn" : "fail";
  overall.alert = (overall.checked >= minSample && Number(overall.strictClassificationRate) < threshold)
    || (overall.checked === 0 && overall.ledger.total >= minSample && Number(overall.ledger.strictClassificationRate) < threshold);

  return {
    schema: "ccm-post-compact-candidate-discipline-trend-v1",
    generatedAt: now(),
    threshold,
    minSample,
    taskLimit,
    overall,
    groups: groupRows,
    alertGroups: groupRows.filter((group: any) => group.alert).slice(0, 12),
  };
}

const POST_COMPACT_DISPATCH_WAIT_ALERT_MS = 30 * 60 * 1000;

function compactMemoryHasPostCompactBoundary(memory: any = {}) {
  const compaction = memory?.compaction || {};
  const boundary = memory?.compactBoundary || {};
  const restore = boundary.post_compact_restore || {};
  const compactedMessageCount = Number(
    compaction.compactedMessageCount
      || compaction.compacted_message_count
      || memory?.messageCompression?.compressedMessages
      || boundary.summarizedMessageCount
      || boundary.summarized_message_count
      || 0
  );
  const summaryChecksum = String(
    compaction.summaryChecksum
      || compaction.summary_checksum
      || boundary.summaryChecksum
      || boundary.summary_checksum
      || restore.summaryChecksum
      || restore.summary_checksum
      || ""
  ).trim();
  const lastCompactedAt = String(compaction.lastCompactedAt || memory?.messageCompression?.lastCompressedAt || "").trim();
  const summarizedThroughMessageId = String(boundary.summarizedThroughMessageId || boundary.summarized_through_message_id || "").trim();
  const hasReinject = !!(compaction.postCompactReinject || restore.reinjectionPlan || memory?.messageCompression?.postCompactRecoveryAudit);
  return {
    hasBoundary: !!(summaryChecksum || summarizedThroughMessageId || lastCompactedAt || hasReinject) && (compactedMessageCount > 0 || hasReinject || !!summaryChecksum),
    compactedMessageCount,
    summaryChecksum,
    lastCompactedAt,
    summarizedThroughMessageId,
    preCompactTokenCount: Number(
      compaction.preCompactTokenCount
        || compaction.pre_compact_token_count
        || boundary.preCompactTokenCount
        || boundary.pre_compact_token_count
        || memory?.messageCompression?.preCompactTokenCount
        || memory?.messageCompression?.pre_compact_token_count
        || 0
    ),
    postCompactTokenCount: Number(
      compaction.postCompactTokenCount
        || compaction.post_compact_token_count
        || boundary.postCompactTokenCount
        || boundary.post_compact_token_count
        || memory?.messageCompression?.postCompactTokenCount
        || memory?.messageCompression?.post_compact_token_count
        || 0
    ),
  };
}

function summarizePostCompactDispatchEntry(entry: any = {}) {
  return {
    marker_id: String(entry.marker_id || entry.markerId || ""),
    target_project: String(entry.target_project || entry.targetProject || ""),
    scope: String(entry.scope || ""),
    generated_at: String(entry.generated_at || entry.generatedAt || ""),
    boundary_id: String(entry.boundary_id || entry.boundaryId || ""),
    summary_checksum: String(entry.summary_checksum || entry.summaryChecksum || ""),
    first_dispatch_after_compact: entry.first_dispatch_after_compact === true || entry.firstDispatchAfterCompact === true,
    dispatch_sequence: Number(entry.dispatch_sequence || entry.dispatchSequence || 0),
    previous_dispatch_at: String(entry.previous_dispatch_at || entry.previousDispatchAt || ""),
    status: String(entry.status || ""),
    reinjection_gate_id: String(entry.reinjection_gate_id || entry.reinjectionGateId || ""),
    candidate_count: Number(entry.candidate_count || entry.candidateCount || 0),
  };
}

function postCompactDispatchScopeKey(entry: any = {}) {
  return String(entry.scope || entry.target_project || entry.targetProject || "child").trim() || "child";
}

function makePostCompactDispatchStats(groupId: string, memory: any = {}) {
  const boundary = compactMemoryHasPostCompactBoundary(memory);
  return {
    groupId,
    boundary,
    entries: [] as any[],
    gaps: [] as any[],
    targets: new Map<string, any>(),
    boundaries: new Map<string, any>(),
    latestBoundaryId: "",
    latestBoundaryEntries: [] as any[],
    ledger: { file: "", updatedAt: "" },
  };
}

function finalizePostCompactDispatchStats(stats: any, options: any = {}) {
  const entries = (stats.entries || []).map(summarizePostCompactDispatchEntry)
    .sort((a: any, b: any) => String(a.generated_at || "").localeCompare(String(b.generated_at || "")));
  const firstDispatches = entries.filter((entry: any) => entry.first_dispatch_after_compact === true);
  const followups = entries.filter((entry: any) => entry.first_dispatch_after_compact !== true);
  const targets = new Map<string, any>();
  const boundaries = new Map<string, any>();
  const gaps: any[] = [...(stats.gaps || [])];
  for (const entry of entries) {
    const scope = postCompactDispatchScopeKey(entry);
    const target = targets.get(scope) || { scope, target_project: entry.target_project, dispatchCount: 0, firstDispatchCount: 0, followupDispatchCount: 0, latestDispatchAt: "", latestSequence: 0 };
    target.dispatchCount++;
    if (entry.first_dispatch_after_compact) target.firstDispatchCount++;
    else target.followupDispatchCount++;
    target.latestDispatchAt = entry.generated_at || target.latestDispatchAt;
    target.latestSequence = Math.max(Number(target.latestSequence || 0), Number(entry.dispatch_sequence || 0));
    targets.set(scope, target);

    const boundaryId = entry.boundary_id || "unknown";
    const boundary = boundaries.get(boundaryId) || { boundary_id: boundaryId, summary_checksum: entry.summary_checksum, dispatchCount: 0, firstDispatchCount: 0, followupDispatchCount: 0, scopes: new Set<string>(), firstScopes: new Set<string>(), latestDispatchAt: "" };
    boundary.dispatchCount++;
    if (entry.first_dispatch_after_compact) {
      boundary.firstDispatchCount++;
      boundary.firstScopes.add(scope);
    } else {
      boundary.followupDispatchCount++;
    }
    boundary.scopes.add(scope);
    boundary.latestDispatchAt = entry.generated_at || boundary.latestDispatchAt;
    boundaries.set(boundaryId, boundary);

    if (Number(entry.dispatch_sequence || 0) === 1 && entry.first_dispatch_after_compact !== true) {
      gaps.push({ groupId: stats.groupId, marker_id: entry.marker_id, scope, boundary_id: boundaryId, reason: "dispatch_sequence=1 但 first_dispatch_after_compact 不是 true" });
    }
    if (Number(entry.dispatch_sequence || 0) > 1 && !entry.previous_dispatch_at) {
      gaps.push({ groupId: stats.groupId, marker_id: entry.marker_id, scope, boundary_id: boundaryId, reason: "followup dispatch 缺少 previous_dispatch_at" });
    }
  }

  const currentChecksum = String(stats.boundary?.summaryChecksum || "");
  const currentBoundaryByChecksum = currentChecksum
    ? entries.filter((entry: any) => entry.summary_checksum === currentChecksum)
    : [];
  const latestBoundaryId = currentBoundaryByChecksum[0]?.boundary_id
    || entries[entries.length - 1]?.boundary_id
    || "";
  const latestBoundaryEntries = latestBoundaryId ? entries.filter((entry: any) => entry.boundary_id === latestBoundaryId) : [];
  const latestScopes = new Set(latestBoundaryEntries.map(postCompactDispatchScopeKey));
  const latestFirstScopes = new Set(latestBoundaryEntries.filter((entry: any) => entry.first_dispatch_after_compact).map(postCompactDispatchScopeKey));
  const latestBoundaryTargetCoverageRate = qualityRate(latestFirstScopes.size, latestScopes.size);
  if (latestScopes.size > 0 && latestFirstScopes.size < latestScopes.size) {
    gaps.push({
      groupId: stats.groupId,
      boundary_id: latestBoundaryId,
      reason: "最新 compact boundary 有 target dispatch，但缺少对应 first_dispatch_after_compact marker",
      missingScopes: [...latestScopes].filter(scope => !latestFirstScopes.has(scope)),
    });
  }

  const lastCompactedAtMs = Date.parse(String(stats.boundary?.lastCompactedAt || ""));
  const firstAfterCompact = currentBoundaryByChecksum.find((entry: any) => entry.first_dispatch_after_compact)
    || firstDispatches[0]
    || null;
  const firstDispatchLatencyMs = firstAfterCompact && Number.isFinite(lastCompactedAtMs)
    ? Math.max(0, Date.parse(firstAfterCompact.generated_at) - lastCompactedAtMs)
    : null;
  const waitingAgeMs = stats.boundary?.hasBoundary && entries.length === 0 && Number.isFinite(lastCompactedAtMs)
    ? Math.max(0, Date.now() - lastCompactedAtMs)
    : null;
  if (stats.boundary?.hasBoundary && entries.length === 0) {
    gaps.push({
      groupId: stats.groupId,
      reason: waitingAgeMs !== null && waitingAgeMs >= POST_COMPACT_DISPATCH_WAIT_ALERT_MS
        ? "压缩后超过等待阈值仍没有子 Agent 首派发 marker"
        : "压缩后尚未观测到子 Agent 首派发 marker",
      waitingAgeMs,
    });
  }

  const invariantGapCount = gaps.filter((gap: any) => !String(gap.reason || "").includes("尚未观测")).length;
  const staleWaiting = waitingAgeMs !== null && waitingAgeMs >= POST_COMPACT_DISPATCH_WAIT_ALERT_MS;
  const status = invariantGapCount > 0
    ? "fail"
    : staleWaiting
      ? "warn"
      : stats.boundary?.hasBoundary && entries.length === 0
        ? "waiting"
        : entries.length > 0
          ? "ok"
          : "empty";
  const boundaryRows = Array.from(boundaries.values()).map((boundary: any) => ({
    boundary_id: boundary.boundary_id,
    summary_checksum: boundary.summary_checksum || "",
    dispatchCount: Number(boundary.dispatchCount || 0),
    firstDispatchCount: Number(boundary.firstDispatchCount || 0),
    followupDispatchCount: Number(boundary.followupDispatchCount || 0),
    targetCount: boundary.scopes?.size || 0,
    firstTargetCount: boundary.firstScopes?.size || 0,
    firstTargetCoverageRate: qualityRate(boundary.firstScopes?.size || 0, boundary.scopes?.size || 0),
    latestDispatchAt: boundary.latestDispatchAt || "",
  })).sort((a: any, b: any) => String(b.latestDispatchAt || "").localeCompare(String(a.latestDispatchAt || "")));

  return {
    schema: "ccm-post-compact-dispatch-marker-group-trend-v1",
    groupId: stats.groupId,
    status,
    alert: status === "fail" || status === "warn",
    compacted: stats.boundary?.hasBoundary === true,
    compactedMessageCount: Number(stats.boundary?.compactedMessageCount || 0),
    lastCompactedAt: stats.boundary?.lastCompactedAt || "",
    summaryChecksum: stats.boundary?.summaryChecksum || "",
    ledger: stats.ledger,
    entryCount: entries.length,
    targetCount: targets.size,
    boundaryCount: boundaries.size,
    firstDispatchCount: firstDispatches.length,
    followupDispatchCount: followups.length,
    firstDispatchRate: qualityRate(firstDispatches.length, entries.length),
    latestBoundaryId,
    latestBoundaryTargetCount: latestScopes.size,
    latestBoundaryFirstTargetCount: latestFirstScopes.size,
    latestBoundaryTargetCoverageRate,
    firstDispatchLatencyMs,
    waitingAgeMs,
    targets: Array.from(targets.values()).sort((a: any, b: any) => String(a.scope || "").localeCompare(String(b.scope || ""))).slice(0, 20),
    boundaries: boundaryRows.slice(0, 12),
    recentEntries: entries.slice(-12).reverse(),
    gaps: gaps.slice(0, 12),
    ccParityReference: "Claude Code pendingPostCompaction / consumePostCompaction: compact 后首个后续调用必须被一次性标记。",
  };
}

export function buildPostCompactDispatchMarkerTrend(options: any = {}) {
  const explicitGroupIds = Array.isArray(options.groupIds || options.group_ids)
    ? (options.groupIds || options.group_ids).map((item: any) => String(item || "").trim()).filter(Boolean)
    : null;
  const groupIds = new Set<string>(explicitGroupIds || []);
  const memoryByGroup = new Map<string, any>();
  if (!explicitGroupIds) {
    for (const file of listJsonFiles(GROUP_MEMORY_DIR)) {
      const memory = readMemoryFile(file);
      const id = String(memory?.groupId || path.basename(file, ".json")).trim();
      if (id) {
        groupIds.add(id);
        memoryByGroup.set(id, memory);
      }
    }
  }
  const rows: any[] = [];
  for (const groupId of groupIds) {
    const memory = memoryByGroup.get(groupId) || readMemoryFile(path.join(GROUP_MEMORY_DIR, `${groupId}.json`)) || {};
    const stats = makePostCompactDispatchStats(groupId, memory);
    try {
      const { readGroupPostCompactDispatchLedger } = require("../collaboration/memory");
      const ledger = readGroupPostCompactDispatchLedger(groupId);
      stats.ledger = { file: ledger.file || "", updatedAt: ledger.updatedAt || "" };
      stats.entries = Array.isArray(ledger.entries) ? ledger.entries : [];
    } catch (error: any) {
      stats.gaps.push({ groupId, reason: `无法读取压缩后派发 ledger：${error?.message || String(error)}` });
    }
    rows.push(finalizePostCompactDispatchStats(stats, options));
  }
  rows.sort((a: any, b: any) => {
    const rank: any = { fail: 0, warn: 1, waiting: 2, ok: 3, empty: 4 };
    return Number(rank[a.status] ?? 9) - Number(rank[b.status] ?? 9)
      || Number(b.entryCount || 0) - Number(a.entryCount || 0);
  });
  const overall = rows.reduce((acc: any, group: any) => {
    acc.groups += 1;
    if (group.compacted) acc.compactedGroups += 1;
    if (group.entryCount > 0) acc.groupsWithDispatch += 1;
    acc.entries += Number(group.entryCount || 0);
    acc.firstDispatches += Number(group.firstDispatchCount || 0);
    acc.followups += Number(group.followupDispatchCount || 0);
    acc.targets += Number(group.targetCount || 0);
    acc.gaps += Number(group.gaps?.length || 0);
    if (group.status === "fail") acc.failedGroups += 1;
    if (group.status === "warn") acc.warnGroups += 1;
    if (group.status === "waiting") acc.waitingGroups += 1;
    return acc;
  }, { groups: 0, compactedGroups: 0, groupsWithDispatch: 0, entries: 0, firstDispatches: 0, followups: 0, targets: 0, gaps: 0, failedGroups: 0, warnGroups: 0, waitingGroups: 0 });
  overall.firstDispatchRate = qualityRate(overall.firstDispatches, overall.entries);
  overall.dispatchCoverageRate = qualityRate(overall.groupsWithDispatch, overall.compactedGroups);
  overall.status = overall.failedGroups > 0 ? "fail" : overall.warnGroups > 0 ? "warn" : overall.waitingGroups > 0 ? "waiting" : overall.entries > 0 ? "ok" : "empty";
  return {
    schema: "ccm-post-compact-dispatch-marker-trend-v1",
    generatedAt: now(),
    waitAlertMs: POST_COMPACT_DISPATCH_WAIT_ALERT_MS,
    overall,
    groups: rows,
    alertGroups: rows.filter((group: any) => group.alert).slice(0, 12),
  };
}

function evaluatePostCompactDispatchContinuity(options: any = {}) {
  const trend = buildPostCompactDispatchMarkerTrend(options);
  const checked = Number(trend.overall.compactedGroups || 0)
    + (trend.groups || []).filter((group: any) => group.compacted !== true && Number(group.entryCount || 0) > 0).length;
  const failedGroups = (trend.groups || []).filter((group: any) => group.status === "fail" || group.status === "warn");
  const waitingGroups = (trend.groups || []).filter((group: any) => group.status === "waiting");
  const passed = Math.max(0, checked - failedGroups.length);
  const evidence = (trend.groups || [])
    .filter((group: any) => group.status === "ok")
    .slice(0, 12)
    .map((group: any) => ({
      groupId: group.groupId,
      entryCount: group.entryCount,
      targetCount: group.targetCount,
      firstDispatchCount: group.firstDispatchCount,
      latestBoundaryTargetCoverageRate: group.latestBoundaryTargetCoverageRate,
    }));
  const gaps = [
    ...failedGroups.map((group: any) => ({
      groupId: group.groupId,
      reason: group.gaps?.[0]?.reason || "压缩后首派发 marker 异常",
      status: group.status,
      entryCount: group.entryCount,
      firstDispatchCount: group.firstDispatchCount,
    })),
    ...waitingGroups.slice(0, 6).map((group: any) => ({
      groupId: group.groupId,
      reason: "压缩后还没有观测到子 Agent 首派发 marker",
      status: group.status,
      waitingAgeMs: group.waitingAgeMs,
    })),
  ];
  const check: any = makeQualityCheck(
    "post_compact_dispatch_marker",
    "压缩后首派发",
    checked,
    passed,
    evidence,
    gaps,
    "检查每个群聊 compact boundary 后的子 Agent 首次派发是否被一次性 marker 记录，并暴露等待或异常序列。"
  );
  check.trend = trend;
  return check;
}

function normalizeReliabilityAgent(value: any) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.replace(/^child:/, "").trim() || text;
}

function makeChildAgentReliabilityStats(groupId: string, agent: string) {
  return {
    groupId,
    agent,
    receiptTasks: new Set<string>(),
    memoryDeclaredTasks: new Set<string>(),
    memoryUsedTasks: new Set<string>(),
    memoryIgnoredTasks: new Set<string>(),
    candidateChecked: 0,
    candidateStrict: 0,
    candidateMissing: 0,
    stalePromoted: 0,
    dispatchMarkers: 0,
    firstDispatches: 0,
    followupDispatches: 0,
    latestDispatchAt: "",
    latestDispatchSequence: 0,
    evidence: [] as any[],
    gaps: [] as any[],
  };
}

function addReliabilityEvidence(stats: any, item: any) {
  stats.evidence.push(item);
  if (stats.evidence.length > 16) stats.evidence = stats.evidence.slice(-16);
}

function addReliabilityGap(stats: any, item: any) {
  stats.gaps.push(item);
  if (stats.gaps.length > 16) stats.gaps = stats.gaps.slice(-16);
}

function scoreChildAgentReliability(stats: any, groupCompacted = false) {
  const receiptTasks = stats.receiptTasks.size;
  const memoryDeclaredTasks = stats.memoryDeclaredTasks.size;
  const memoryUsedTasks = stats.memoryUsedTasks.size;
  const receiptDeclarationRate = qualityRate(memoryDeclaredTasks, receiptTasks);
  const memoryUseRate = qualityRate(memoryUsedTasks, receiptTasks);
  const receiptScore = receiptTasks > 0
    ? Math.round(((Number(receiptDeclarationRate || 0) * 0.7) + (Number(memoryUseRate || 0) * 0.3)) * 10) / 10
    : null;
  const candidateStrictRate = qualityRate(Number(stats.candidateStrict || 0), Number(stats.candidateChecked || 0));
  const candidateScore = stats.candidateChecked > 0 ? candidateStrictRate : null;
  const dispatchScore = stats.dispatchMarkers > 0
    ? qualityRate(Number(stats.firstDispatches || 0), Math.max(1, Number(stats.firstDispatches || 0) + (Number(stats.firstDispatches || 0) === 0 ? 1 : 0)))
    : groupCompacted && (receiptTasks > 0 || stats.candidateChecked > 0)
      ? 0
      : null;
  const components = [
    { key: "receipt", score: receiptScore, weight: 45 },
    { key: "candidate", score: candidateScore, weight: 35 },
    { key: "dispatch", score: dispatchScore, weight: 20 },
  ].filter(item => item.score !== null && item.score !== undefined);
  const weightTotal = components.reduce((sum, item) => sum + item.weight, 0);
  const score = weightTotal > 0
    ? Math.round(components.reduce((sum, item) => sum + Number(item.score || 0) * item.weight, 0) / weightTotal * 10) / 10
    : null;
  const status = score === null ? "empty" : score >= 90 ? "ok" : score >= 70 ? "warn" : "fail";
  return {
    schema: "ccm-child-agent-memory-reliability-v1",
    groupId: stats.groupId,
    agent: stats.agent,
    score,
    status,
    receiptTasks,
    memoryDeclaredTasks,
    memoryUsedTasks,
    memoryIgnoredTasks: stats.memoryIgnoredTasks.size,
    receiptDeclarationRate,
    memoryUseRate,
    receiptScore,
    candidateChecked: Number(stats.candidateChecked || 0),
    candidateStrict: Number(stats.candidateStrict || 0),
    candidateMissing: Number(stats.candidateMissing || 0),
    stalePromoted: Number(stats.stalePromoted || 0),
    candidateStrictRate,
    candidateScore,
    dispatchMarkers: Number(stats.dispatchMarkers || 0),
    firstDispatches: Number(stats.firstDispatches || 0),
    followupDispatches: Number(stats.followupDispatches || 0),
    dispatchScore,
    latestDispatchAt: stats.latestDispatchAt || "",
    latestDispatchSequence: Number(stats.latestDispatchSequence || 0),
    components,
    evidence: (stats.evidence || []).slice(-8).reverse(),
    gaps: (stats.gaps || []).slice(-8).reverse(),
  };
}

export function buildChildAgentMemoryReliabilityReport(options: any = {}) {
  const taskLimit = Math.max(5, Number(options.taskLimit || 120));
  const tasks = Array.isArray(options.tasks) ? options.tasks : loadTasks().slice(-taskLimit);
  const explicitGroupIds = Array.isArray(options.groupIds || options.group_ids)
    ? (options.groupIds || options.group_ids).map((item: any) => String(item || "").trim()).filter(Boolean)
    : null;
  const groupIds = new Set<string>(explicitGroupIds || []);
  const memoryByGroup = new Map<string, any>();
  if (!explicitGroupIds) {
    for (const file of listJsonFiles(GROUP_MEMORY_DIR)) {
      const memory = readMemoryFile(file);
      const id = String(memory?.groupId || path.basename(file, ".json")).trim();
      if (id) {
        groupIds.add(id);
        memoryByGroup.set(id, memory);
      }
    }
  }
  for (const task of tasks) {
    const groupId = String(task?.group_id || task?.groupId || "").trim();
    if (groupId && (!explicitGroupIds || groupIds.has(groupId))) groupIds.add(groupId);
  }

  const dispatchTrend = buildPostCompactDispatchMarkerTrend({ groupIds: Array.from(groupIds) });
  const staleByGroup = new Map<string, any[]>();
  const getStaleRows = (groupId: string) => {
    if (staleByGroup.has(groupId)) return staleByGroup.get(groupId) || [];
    try {
      const { readGroupPostCompactCandidateUsageLedger } = require("../collaboration/memory");
      const { readGroupTypedMemoryDistillationLedger } = require("../collaboration/group-memory-index");
      const usageLedger = readGroupPostCompactCandidateUsageLedger(groupId);
      const distillationLedger = readGroupTypedMemoryDistillationLedger(groupId);
      const archiveRows = Array.isArray(distillationLedger?.postCompactUsageArchive?.rows) ? distillationLedger.postCompactUsageArchive.rows : [];
      const rows = [
        ...Object.values(usageLedger?.stats || {}).filter((row: any) => Number(row?.ignored_count || 0) > 0),
        ...archiveRows,
      ];
      staleByGroup.set(groupId, rows);
      return rows;
    } catch {
      staleByGroup.set(groupId, []);
      return [];
    }
  };

  const groupStats = new Map<string, any>();
  const ensureGroup = (groupId: string) => {
    const id = groupId || "unknown";
    if (!groupStats.has(id)) {
      const memory = memoryByGroup.get(id) || readMemoryFile(path.join(GROUP_MEMORY_DIR, `${id}.json`)) || {};
      groupStats.set(id, {
        groupId: id,
        compacted: compactMemoryHasPostCompactBoundary(memory).hasBoundary === true,
        agents: new Map<string, any>(),
      });
    }
    return groupStats.get(id);
  };
  const ensureAgent = (groupId: string, agentValue: any) => {
    const group = ensureGroup(groupId);
    const agent = normalizeReliabilityAgent(agentValue) || "unknown";
    if (!group.agents.has(agent)) group.agents.set(agent, makeChildAgentReliabilityStats(group.groupId, agent));
    return group.agents.get(agent);
  };
  for (const groupId of groupIds) ensureGroup(groupId);

  for (const dispatchGroup of dispatchTrend.groups || []) {
    for (const target of dispatchGroup.targets || []) {
      const agent = normalizeReliabilityAgent(target.target_project || target.scope);
      const stats = ensureAgent(dispatchGroup.groupId, agent);
      stats.dispatchMarkers += Number(target.dispatchCount || 0);
      stats.firstDispatches += Number(target.firstDispatchCount || 0);
      stats.followupDispatches += Number(target.followupDispatchCount || 0);
      stats.latestDispatchAt = target.latestDispatchAt || stats.latestDispatchAt;
      stats.latestDispatchSequence = Math.max(Number(stats.latestDispatchSequence || 0), Number(target.latestSequence || 0));
      addReliabilityEvidence(stats, { type: "post_compact_dispatch", dispatchCount: target.dispatchCount, firstDispatchCount: target.firstDispatchCount, latestDispatchAt: target.latestDispatchAt });
      if (Number(target.firstDispatchCount || 0) <= 0) addReliabilityGap(stats, { type: "post_compact_dispatch", reason: "压缩后 dispatch 有记录但缺少 first_dispatch_after_compact", dispatchCount: target.dispatchCount });
    }
  }

  for (const task of tasks.filter((item: any) => item?.delivery_summary)) {
    const groupId = String(task.group_id || task.groupId || "").trim();
    if (explicitGroupIds && !groupIds.has(groupId)) continue;
    const taskId = String(task.id || task.task_id || task.taskId || "");
    const summary = task.delivery_summary || {};
    const receiptSources = [
      ...(Array.isArray(summary.receipts) ? summary.receipts : []),
      ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
      ...(Array.isArray(summary.memory_usage) ? summary.memory_usage : []),
    ];
    const receiptByAgent = new Map<string, any>();
    for (const receipt of receiptSources) {
      const agent = normalizeReliabilityAgent(receipt?.agent || receipt?.project || receipt?.target || receipt?.name);
      if (!agent) continue;
      const used = normalizeQualityStringList(receipt?.memoryUsed || receipt?.memory_used || receipt?.used);
      const ignored = normalizeQualityStringList(receipt?.memoryIgnored || receipt?.memory_ignored || receipt?.ignored);
      const existing = receiptByAgent.get(agent) || { agent, used: [], ignored: [], declared: false };
      existing.used.push(...used);
      existing.ignored.push(...ignored);
      existing.declared = existing.declared
        || used.length > 0
        || ignored.length > 0
        || Array.isArray(receipt?.memoryUsed || receipt?.memory_used)
        || Array.isArray(receipt?.memoryIgnored || receipt?.memory_ignored);
      receiptByAgent.set(agent, existing);
    }
    for (const receipt of receiptByAgent.values()) {
      const stats = ensureAgent(groupId, receipt.agent);
      if (taskId) stats.receiptTasks.add(taskId);
      if (receipt.declared) stats.memoryDeclaredTasks.add(taskId || `${receipt.agent}:${stats.receiptTasks.size}`);
      if (receipt.used.length) stats.memoryUsedTasks.add(taskId || `${receipt.agent}:used:${stats.memoryUsedTasks.size}`);
      if (receipt.ignored.length) stats.memoryIgnoredTasks.add(taskId || `${receipt.agent}:ignored:${stats.memoryIgnoredTasks.size}`);
      if (receipt.used.length) addReliabilityEvidence(stats, { type: "memory_used", taskId, values: receipt.used.slice(0, 4) });
      else if (receipt.ignored.length) addReliabilityGap(stats, { type: "memory_ignored", taskId, reason: receipt.ignored.slice(0, 2).join("；") || "子 Agent 声明未使用记忆" });
      else addReliabilityGap(stats, { type: "memory_receipt", taskId, reason: "子 Agent 回执未声明 memoryUsed/memoryIgnored" });
    }

    const staleRows = getStaleRows(groupId);
    for (const rawRow of collectPostCompactQualityRows(summary)) {
      const row = summarizePostCompactQualityRow(rawRow);
      const agent = normalizeReliabilityAgent(row.agent || rawRow.agent || rawRow.project || rawRow.target_project || rawRow.targetProject);
      if (!agent) continue;
      const stats = ensureAgent(groupId, agent);
      const classified = ["used", "ignored", "verified"].includes(row.usage_state);
      const stale = staleRows.find((item: any) => postCompactQualityCandidateMatches(row, item));
      const stalePromoted = !!stale && row.usage_state === "used";
      stats.candidateChecked++;
      if (classified && !stalePromoted) {
        stats.candidateStrict++;
        addReliabilityEvidence(stats, { type: "candidate_usage", taskId, candidate_id: row.candidate_id, usage_state: row.usage_state, stale: !!stale });
      } else {
        stats.candidateMissing++;
        if (stalePromoted) stats.stalePromoted++;
        addReliabilityGap(stats, {
          type: "candidate_usage",
          taskId,
          candidate_id: row.candidate_id,
          usage_state: row.usage_state || "unclassified",
          reason: stalePromoted ? "历史 ignored/归档候选被直接 used" : "候选缺少 used/ignored/verified 分类",
        });
      }
    }
  }

  const groups = Array.from(groupStats.values()).map((group: any) => {
    for (const stats of group.agents.values()) {
      if (group.compacted && (stats.receiptTasks.size > 0 || stats.candidateChecked > 0) && Number(stats.dispatchMarkers || 0) === 0) {
        addReliabilityGap(stats, { type: "post_compact_dispatch", reason: "该子 Agent 有记忆回执或候选结果，但没有压缩后首派发 marker" });
      }
    }
    const agents = Array.from(group.agents.values())
      .map((stats: any) => scoreChildAgentReliability(stats, group.compacted))
      .sort((a: any, b: any) => {
        const aScore = a.score === null || a.score === undefined ? 101 : Number(a.score);
        const bScore = b.score === null || b.score === undefined ? 101 : Number(b.score);
        return aScore - bScore || String(a.agent || "").localeCompare(String(b.agent || ""));
      });
    const scored = agents.filter((agent: any) => agent.score !== null && agent.score !== undefined);
    const score = scored.length ? Math.round(scored.reduce((sum: number, agent: any) => sum + Number(agent.score || 0), 0) / scored.length * 10) / 10 : null;
    return {
      schema: "ccm-group-child-agent-memory-reliability-v1",
      groupId: group.groupId,
      compacted: group.compacted,
      score,
      status: score === null ? "empty" : score >= 90 ? "ok" : score >= 70 ? "warn" : "fail",
      agentCount: agents.length,
      scoredAgentCount: scored.length,
      agents,
      gaps: agents.flatMap((agent: any) => (agent.gaps || []).map((gap: any) => ({ agent: agent.agent, ...gap }))).slice(0, 12),
    };
  }).sort((a: any, b: any) => {
    const rank: any = { fail: 0, warn: 1, ok: 2, empty: 3 };
    return Number(rank[a.status] ?? 9) - Number(rank[b.status] ?? 9)
      || Number(a.score ?? 101) - Number(b.score ?? 101);
  });
  const allAgents = groups.flatMap(group => group.agents.map((agent: any) => ({ ...agent, groupId: group.groupId })));
  const scoredAgents = allAgents.filter((agent: any) => agent.score !== null && agent.score !== undefined);
  const overallScore = scoredAgents.length ? Math.round(scoredAgents.reduce((sum: number, agent: any) => sum + Number(agent.score || 0), 0) / scoredAgents.length * 10) / 10 : null;
  return {
    schema: "ccm-child-agent-memory-reliability-report-v1",
    generatedAt: now(),
    taskLimit,
    overall: {
      score: overallScore,
      status: overallScore === null ? "empty" : overallScore >= 90 ? "ok" : overallScore >= 70 ? "warn" : "fail",
      groupCount: groups.length,
      agentCount: allAgents.length,
      scoredAgentCount: scoredAgents.length,
      failAgents: scoredAgents.filter((agent: any) => agent.status === "fail").length,
      warnAgents: scoredAgents.filter((agent: any) => agent.status === "warn").length,
      okAgents: scoredAgents.filter((agent: any) => agent.status === "ok").length,
    },
    groups,
    weakAgents: allAgents.filter((agent: any) => agent.status === "fail" || agent.status === "warn").slice(0, 20),
  };
}

function evaluateChildAgentMemoryReliability(options: any = {}) {
  const report = buildChildAgentMemoryReliabilityReport(options);
  const agents = report.groups.flatMap((group: any) => group.agents.map((agent: any) => ({ ...agent, groupId: group.groupId })));
  const checked = agents.filter((agent: any) => agent.score !== null && agent.score !== undefined).length;
  const passed = agents.filter((agent: any) => agent.status === "ok").length;
  const evidence = agents.filter((agent: any) => agent.status === "ok").slice(0, 12).map((agent: any) => ({
    groupId: agent.groupId,
    agent: agent.agent,
    score: agent.score,
    receiptDeclarationRate: agent.receiptDeclarationRate,
    candidateStrictRate: agent.candidateStrictRate,
    dispatchScore: agent.dispatchScore,
  }));
  const gaps = report.weakAgents.slice(0, 12).map((agent: any) => ({
    groupId: agent.groupId,
    agent: agent.agent,
    score: agent.score,
    reason: agent.gaps?.[0]?.reason || "子 Agent 记忆可靠性低于阈值",
  }));
  const check: any = makeQualityCheck(
    "child_agent_memory_reliability",
    "子 Agent 记忆可靠性",
    checked,
    passed,
    evidence,
    gaps,
    "按子 Agent 汇总 memoryUsed/memoryIgnored、压缩候选分类纪律和 post-compact 首派发 marker，定位不可靠的第三方会话。"
  );
  check.report = report;
  return check;
}

function timelineStatusFromScore(score: any) {
  if (score === null || score === undefined) return "empty";
  return Number(score) >= 90 ? "ok" : Number(score) >= 70 ? "warn" : "fail";
}

function addTimelineEvent(events: any[], event: any) {
  if (!event) return;
  events.push({
    at: String(event.at || ""),
    kind: String(event.kind || "event"),
    status: String(event.status || "empty"),
    title: String(event.title || ""),
    detail: compactMemoryCenterText(event.detail || "", 260),
    metrics: event.metrics || {},
  });
}

function compactBoundaryRecoveryAudit(memory: any = {}) {
  return memory?.compaction?.postCompactRecoveryAudit
    || memory?.compactBoundary?.post_compact_restore?.recoveryAudit
    || memory?.messageCompression?.postCompactRecoveryAudit
    || null;
}

function compactBoundaryQuality(memory: any = {}) {
  return memory?.compaction?.quality
    || memory?.messageCompression?.quality
    || memory?.compactBoundary?.quality
    || null;
}

function buildGroupCompactBoundaryTimeline(groupId: string, memory: any = {}, diagnostics: any = {}) {
  const boundary = compactMemoryHasPostCompactBoundary(memory);
  const compaction = memory?.compaction || {};
  const usageSummary = diagnostics.usageSummary || {};
  const discipline = diagnostics.discipline || {};
  const dispatch = diagnostics.dispatch || {};
  const reliability = diagnostics.agentReliability || {};
  const recall = diagnostics.recall || {};
  const archive = diagnostics.archive || {};
  const recoveryAudit = compactBoundaryRecoveryAudit(memory);
  const quality = compactBoundaryQuality(memory);
  const preTokens = Number(boundary.preCompactTokenCount || compaction.preCompactTokenCount || 0);
  const postTokens = Number(boundary.postCompactTokenCount || compaction.postCompactTokenCount || 0);
  const reductionRate = preTokens > 0 && postTokens >= 0 ? Math.round(Math.max(0, 1 - (postTokens / preTokens)) * 1000) / 10 : null;
  const tokenPressure = postTokens > 0 ? Math.round((postTokens / DEFAULT_CONTEXT_WINDOW_TOKENS) * 1000) / 10 : null;
  const compressionScore = boundary.hasBoundary
    ? (postTokens > 0 && preTokens > 0 && postTokens < preTokens ? 100 : postTokens > 0 ? 70 : 85)
    : null;
  const recoveryPass = recoveryAudit?.pass === true || recoveryAudit?.status === "pass" || recoveryAudit?.status === "ok";
  const recoveryFail = recoveryAudit?.pass === false || recoveryAudit?.status === "fail" || recoveryAudit?.status === "failed";
  const recoveryScore = recoveryAudit?.schema || recoveryAudit?.status
    ? recoveryPass ? 100 : recoveryFail ? 0 : 70
    : null;
  const dispatchScore = dispatch.status === "ok" ? 100
    : dispatch.status === "waiting" ? 70
      : dispatch.status === "warn" ? 50
        : dispatch.status === "fail" ? 0
          : null;
  const candidateScore = discipline.effectiveStrictClassificationRate ?? discipline.strictClassificationRate ?? null;
  const agentScore = reliability.score ?? null;
  const recallScoring = recall?.postCompactUsageScoring || {};
  const recallScore = Number(recallScoring.hint_count || 0) > 0
    ? Number(recallScoring.matched_count || 0) > 0 ? 100 : 50
    : null;
  const components = [
    {
      key: "compression",
      label: "压缩边界",
      score: compressionScore,
      status: timelineStatusFromScore(compressionScore),
      metrics: { preTokens, postTokens, reductionRate, tokenPressure, compactedMessageCount: boundary.compactedMessageCount },
    },
    {
      key: "recovery",
      label: "恢复审计",
      score: recoveryScore,
      status: timelineStatusFromScore(recoveryScore),
      metrics: {
        status: recoveryAudit?.status || "",
        passedChecks: Number(recoveryAudit?.passedChecks || recoveryAudit?.passed_checks || 0),
        checkCount: Number(recoveryAudit?.checkCount || recoveryAudit?.check_count || 0),
        failedChecks: Array.isArray(recoveryAudit?.failedChecks || recoveryAudit?.failed_checks) ? (recoveryAudit.failedChecks || recoveryAudit.failed_checks).length : 0,
      },
    },
    {
      key: "dispatch",
      label: "首派发",
      score: dispatchScore,
      status: dispatch.status || timelineStatusFromScore(dispatchScore),
      metrics: {
        firstDispatchLatencyMs: dispatch.firstDispatchLatencyMs ?? null,
        latestBoundaryTargetCoverageRate: dispatch.latestBoundaryTargetCoverageRate ?? null,
        firstDispatchCount: Number(dispatch.firstDispatchCount || 0),
        targetCount: Number(dispatch.targetCount || 0),
      },
    },
    {
      key: "candidate_usage",
      label: "候选使用",
      score: candidateScore,
      status: discipline.status || timelineStatusFromScore(candidateScore),
      metrics: {
        checked: Number(discipline.checked || 0),
        strictClassified: Number(discipline.strictClassified || 0),
        stalePromoted: Number(discipline.stalePromoted || 0),
        ledgerTotal: Number(usageSummary?.totals?.total || 0),
      },
    },
    {
      key: "agent_reliability",
      label: "子 Agent 可靠性",
      score: agentScore,
      status: reliability.status || timelineStatusFromScore(agentScore),
      metrics: {
        agentCount: Number(reliability.agentCount || 0),
        scoredAgentCount: Number(reliability.scoredAgentCount || 0),
        weakAgents: Array.isArray(reliability.agents) ? reliability.agents.filter((agent: any) => agent.status === "fail" || agent.status === "warn").length : 0,
      },
    },
    {
      key: "typed_recall",
      label: "类型化召回",
      score: recallScore,
      status: timelineStatusFromScore(recallScore),
      metrics: {
        hints: Number(recallScoring.hint_count || 0),
        matched: Number(recallScoring.matched_count || 0),
        boosted: Number(recallScoring.boosted_count || 0),
        deprioritized: Number(recallScoring.deprioritized_count || 0),
      },
    },
  ];
  const scored = components.filter(component => component.score !== null && component.score !== undefined);
  const score = scored.length ? Math.round(scored.reduce((sum, component) => sum + Number(component.score || 0), 0) / scored.length * 10) / 10 : null;
  const gaps: any[] = [];
  if (boundary.hasBoundary && preTokens > 0 && postTokens > 0 && postTokens >= preTokens) {
    gaps.push({ reason: `compact boundary 未降低 token：${preTokens} -> ${postTokens}`, component: "compression" });
  }
  if (boundary.hasBoundary && (!preTokens || !postTokens)) {
    gaps.push({ reason: "compact boundary 缺少压缩前后 token 指标", component: "compression" });
  }
  if (boundary.hasBoundary && !recoveryAudit) gaps.push({ reason: "compact boundary 缺少 post-compact recovery audit", component: "recovery" });
  if (boundary.hasBoundary && dispatch.status === "waiting") gaps.push({ reason: "compact boundary 后尚未观测首派发 marker", component: "dispatch" });
  if (dispatch.status === "fail" || dispatch.status === "warn") gaps.push(...(Array.isArray(dispatch.gaps) ? dispatch.gaps.slice(0, 4).map((gap: any) => ({ ...gap, component: "dispatch" })) : []));
  if (Number(discipline.stalePromoted || 0) > 0) gaps.push({ reason: `存在 ${discipline.stalePromoted} 个 stale promoted 候选`, component: "candidate_usage" });
  if (Number(discipline.missing || 0) > 0) gaps.push({ reason: `存在 ${discipline.missing} 个候选缺少严格分类`, component: "candidate_usage" });
  if (Array.isArray(reliability.agents)) {
    for (const agent of reliability.agents.filter((item: any) => item.status === "fail" || item.status === "warn").slice(0, 4)) {
      gaps.push({ reason: `${agent.agent} 记忆可靠性 ${agent.score ?? "待采样"}%`, component: "agent_reliability", agent: agent.agent });
    }
  }

  const events: any[] = [];
  addTimelineEvent(events, {
    at: boundary.lastCompactedAt,
    kind: "compact_boundary",
    status: boundary.hasBoundary ? "ok" : "empty",
    title: "compact boundary",
    detail: boundary.hasBoundary ? `压缩 ${boundary.compactedMessageCount || 0} 条消息，token ${preTokens || 0} -> ${postTokens || 0}` : "尚未发现 compact boundary",
    metrics: { summaryChecksum: boundary.summaryChecksum, reductionRate, tokenPressure },
  });
  if (recoveryAudit?.schema || recoveryAudit?.status) {
    addTimelineEvent(events, {
      at: boundary.lastCompactedAt,
      kind: "recovery_audit",
      status: recoveryPass ? "ok" : recoveryFail ? "fail" : "warn",
      title: "post-compact recovery audit",
      detail: recoveryPass ? "恢复审计通过" : recoveryFail ? "恢复审计失败" : "恢复审计未给出明确 pass/fail",
      metrics: { status: recoveryAudit.status || "", summaryChecksum: recoveryAudit.summaryChecksum || recoveryAudit.summary_checksum || "" },
    });
  }
  const firstDispatch = Array.isArray(dispatch.recentEntries)
    ? [...dispatch.recentEntries].filter((entry: any) => entry.first_dispatch_after_compact === true).sort((a: any, b: any) => String(a.generated_at || "").localeCompare(String(b.generated_at || "")))[0]
    : null;
  if (firstDispatch || dispatch.entryCount > 0) {
    addTimelineEvent(events, {
      at: firstDispatch?.generated_at || dispatch.boundaries?.[0]?.latestDispatchAt || "",
      kind: "first_dispatch",
      status: dispatch.status || "ok",
      title: "first child-Agent dispatch",
      detail: firstDispatch ? `${firstDispatch.target_project || firstDispatch.scope || "child"} received first post-compact marker` : "dispatch marker 已记录",
      metrics: { latencyMs: dispatch.firstDispatchLatencyMs, coverageRate: dispatch.latestBoundaryTargetCoverageRate },
    });
  }
  if (usageSummary.updatedAt || usageSummary.has_history) {
    addTimelineEvent(events, {
      at: usageSummary.updatedAt || "",
      kind: "candidate_usage",
      status: discipline.status || "empty",
      title: "candidate usage ledger",
      detail: `used=${usageSummary.totals?.used || 0} ignored=${usageSummary.totals?.ignored || 0} verified=${usageSummary.totals?.verified || 0}`,
      metrics: { strictRate: candidateScore, candidateCount: Number(usageSummary.candidate_count || 0) },
    });
  }
  if (reliability.schema) {
    addTimelineEvent(events, {
      at: dispatch.recentEntries?.[0]?.generated_at || usageSummary.updatedAt || boundary.lastCompactedAt,
      kind: "agent_reliability",
      status: reliability.status || "empty",
      title: "child-Agent memory reliability",
      detail: `${reliability.agentCount || 0} agents，score=${reliability.score ?? "待采样"}`,
      metrics: { score: reliability.score, weakAgents: components.find(item => item.key === "agent_reliability")?.metrics?.weakAgents || 0 },
    });
  }
  if (Number(recallScoring.hint_count || 0) > 0 || Number(archive.archived_count || archive.archivedCount || 0) > 0) {
    addTimelineEvent(events, {
      at: usageSummary.updatedAt || boundary.lastCompactedAt,
      kind: "typed_recall",
      status: timelineStatusFromScore(recallScore),
      title: "typed memory recall scoring",
      detail: `hints=${recallScoring.hint_count || 0} matched=${recallScoring.matched_count || 0}`,
      metrics: components.find(item => item.key === "typed_recall")?.metrics || {},
    });
  }
  events.sort((a, b) => {
    const atA = Date.parse(a.at);
    const atB = Date.parse(b.at);
    const safeA = Number.isFinite(atA) ? atA : 0;
    const safeB = Number.isFinite(atB) ? atB : 0;
    return safeA - safeB || String(a.kind).localeCompare(String(b.kind));
  });

  return {
    schema: "ccm-group-compact-boundary-timeline-v1",
    groupId,
    status: score === null
      ? "empty"
      : components.some(component => component.status === "fail")
        || gaps.some(gap => gap.component === "dispatch" && String(gap.reason || "").includes("失败"))
        ? "fail"
        : components.some(component => component.status === "warn") || gaps.length
          ? "warn"
          : timelineStatusFromScore(score),
    score,
    boundary: {
      compacted: boundary.hasBoundary === true,
      summarizedThroughMessageId: boundary.summarizedThroughMessageId,
      summaryChecksum: boundary.summaryChecksum,
      lastCompactedAt: boundary.lastCompactedAt,
      compactedMessageCount: boundary.compactedMessageCount,
      preCompactTokenCount: preTokens,
      postCompactTokenCount: postTokens,
      reductionRate,
      tokenPressure,
      qualityStatus: quality?.status || "",
      qualityScore: quality?.score ?? null,
    },
    components,
    events,
    gaps: gaps.slice(0, 12),
    nextActions: gaps.slice(0, 6).map(gap => gap.reason || "补齐 compact boundary 诊断证据"),
  };
}

function buildCompactBoundaryTimelineReport(options: any = {}) {
  const explicitGroupIds = Array.isArray(options.groupIds || options.group_ids)
    ? (options.groupIds || options.group_ids).map((item: any) => String(item || "").trim()).filter(Boolean)
    : null;
  const rows: any[] = [];
  const files = explicitGroupIds
    ? explicitGroupIds.map((id: string) => path.join(GROUP_MEMORY_DIR, `${id}.json`))
    : listJsonFiles(GROUP_MEMORY_DIR);
  for (const file of files) {
    const memory = readMemoryFile(file);
    if (!memory) continue;
    const groupId = String(memory.groupId || path.basename(file, ".json"));
    const usage = buildGroupPostCompactUsageDiagnostics(groupId, memory);
    rows.push(usage?.boundaryTimeline || buildGroupCompactBoundaryTimeline(groupId, memory, {}));
  }
  const compactedRows = rows.filter(row => row?.boundary?.compacted === true);
  const scoredRows = compactedRows.filter(row => row.score !== null && row.score !== undefined);
  const score = scoredRows.length ? Math.round(scoredRows.reduce((sum, row) => sum + Number(row.score || 0), 0) / scoredRows.length * 10) / 10 : null;
  return {
    schema: "ccm-compact-boundary-timeline-report-v1",
    generatedAt: now(),
    overall: {
      score,
      status: score === null ? "empty" : score >= 90 ? "ok" : score >= 70 ? "warn" : "fail",
      groupCount: rows.length,
      compactedGroupCount: compactedRows.length,
      scoredGroupCount: scoredRows.length,
      gapCount: compactedRows.reduce((sum, row) => sum + Number(row.gaps?.length || 0), 0),
    },
    groups: rows.sort((a, b) => Number(a.score ?? 101) - Number(b.score ?? 101)).slice(0, 50),
    weakGroups: compactedRows.filter(row => row.status === "fail" || row.status === "warn").slice(0, 20),
  };
}

function evaluateCompactBoundaryTimeline(options: any = {}) {
  const report = buildCompactBoundaryTimelineReport(options);
  const checked = Number(report.overall.compactedGroupCount || 0);
  const passed = (report.groups || []).filter((row: any) => row.boundary?.compacted === true && row.status === "ok").length;
  const evidence = (report.groups || []).filter((row: any) => row.boundary?.compacted === true && row.status === "ok").slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    score: row.score,
    eventCount: row.events?.length || 0,
    reductionRate: row.boundary?.reductionRate,
  }));
  const gaps = (report.weakGroups || []).slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    score: row.score,
    reason: row.gaps?.[0]?.reason || "compact boundary timeline 存在缺口",
  }));
  const check: any = makeQualityCheck(
    "compact_boundary_timeline",
    "压缩边界时间线",
    checked,
    passed,
    evidence,
    gaps,
    "把 token 压力、恢复审计、首派发、候选使用、子 Agent 可靠性和类型化召回串成同一条 compact boundary 诊断时间线。"
  );
  check.report = report;
  return check;
}

function summarizeCompactionHookLedger(groupId: string, memory: any = {}, ledger: any = {}) {
  const compaction = memory?.compaction || {};
  const legacyPre = Array.isArray(compaction.hookResults?.pre) ? compaction.hookResults.pre : [];
  const legacyPost = Array.isArray(compaction.hookResults?.post) ? compaction.hookResults.post : [];
  const entries = Array.isArray(ledger.entries) ? ledger.entries : [];
  const legacyEntries = [
    ...legacyPre.map((entry: any, index: number) => ({
      entry_id: `legacy-pre-${index}`,
      hook_run_id: compaction.hookLedger?.hookRunId || "legacy",
      group_id: groupId,
      phase: "pre",
      hook_index: index,
      ok: entry?.ok === true,
      status: entry?.ok === true ? "ok" : "fail",
      duration_ms: Number(entry?.duration_ms || entry?.durationMs || 0),
      error: compactMemoryCenterText(entry?.error || "", 500),
      result_summary: entry?.ledgerEntry?.result_summary || {},
      at: compaction.lastCompactedAt || "",
      boundary_id: memory?.compactBoundary?.id || "",
      summarized_through_message_id: memory?.compactBoundary?.summarizedThroughMessageId || compaction.lastCompactedMessageId || "",
      summary_checksum: compaction.summaryChecksum || memory?.compactBoundary?.summaryChecksum || "",
      legacy: true,
    })),
    ...legacyPost.map((entry: any, index: number) => ({
      entry_id: `legacy-post-${index}`,
      hook_run_id: compaction.hookLedger?.hookRunId || "legacy",
      group_id: groupId,
      phase: "post",
      hook_index: index,
      ok: entry?.ok === true,
      status: entry?.ok === true ? "ok" : "fail",
      duration_ms: Number(entry?.duration_ms || entry?.durationMs || 0),
      error: compactMemoryCenterText(entry?.error || "", 500),
      result_summary: entry?.ledgerEntry?.result_summary || {},
      at: compaction.lastCompactedAt || "",
      boundary_id: memory?.compactBoundary?.id || "",
      summarized_through_message_id: memory?.compactBoundary?.summarizedThroughMessageId || compaction.lastCompactedMessageId || "",
      summary_checksum: compaction.summaryChecksum || memory?.compactBoundary?.summaryChecksum || "",
      legacy: true,
    })),
  ];
  const merged = entries.length ? entries : legacyEntries;
  const preEntries = merged.filter((entry: any) => entry.phase === "pre");
  const postEntries = merged.filter((entry: any) => entry.phase === "post");
  const failedEntries = merged.filter((entry: any) => entry.ok === false || entry.status === "fail");
  const latestAt = merged.reduce((latest: string, entry: any) => String(entry.at || "") > latest ? String(entry.at || "") : latest, "");
  const totalDuration = merged.reduce((sum: number, entry: any) => sum + Number(entry.duration_ms || 0), 0);
  const boundary = compactMemoryHasPostCompactBoundary(memory);
  const gaps: any[] = [];
  if (boundary.hasBoundary && preEntries.length === 0) gaps.push({ component: "pre", reason: "compact boundary 缺少 pre-compact hook ledger" });
  if (boundary.hasBoundary && postEntries.length === 0) gaps.push({ component: "post", reason: "compact boundary 缺少 post-compact hook ledger" });
  for (const entry of failedEntries.slice(0, 6)) {
    gaps.push({ component: entry.phase || "hook", reason: `${entry.phase || "hook"} hook 失败：${entry.error || "unknown"}`, entryId: entry.entry_id });
  }
  const hasRequiredPhases = !boundary.hasBoundary || (preEntries.length > 0 && postEntries.length > 0);
  const score = !merged.length && !boundary.hasBoundary
    ? null
    : Math.max(0, (hasRequiredPhases ? 100 : 60) - failedEntries.length * 35);
  return {
    schema: "ccm-group-compaction-hook-ledger-summary-v1",
    groupId,
    compacted: boundary.hasBoundary === true,
    file: ledger.file || compaction.hookLedger?.file || "",
    status: score === null ? "empty" : score >= 90 ? "ok" : score >= 70 ? "warn" : "fail",
    score,
    hasLedger: entries.length > 0 || legacyEntries.length > 0,
    legacyOnly: entries.length === 0 && legacyEntries.length > 0,
    entryCount: merged.length,
    preCount: preEntries.length,
    postCount: postEntries.length,
    failedCount: failedEntries.length,
    avgDurationMs: merged.length ? Math.round(totalDuration / merged.length) : 0,
    latestAt,
    hookRunIds: Array.from(new Set(merged.map((entry: any) => String(entry.hook_run_id || "")).filter(Boolean))).slice(-8),
    recentEntries: merged.slice(-12).reverse().map((entry: any) => ({
      entryId: entry.entry_id,
      hookRunId: entry.hook_run_id,
      phase: entry.phase,
      ok: entry.ok === true,
      status: entry.status || (entry.ok ? "ok" : "fail"),
      durationMs: Number(entry.duration_ms || 0),
      error: compactMemoryCenterText(entry.error || "", 260),
      summary: entry.result_summary || {},
      at: entry.at,
      boundaryId: entry.boundary_id || "",
      summaryChecksum: entry.summary_checksum || "",
      legacy: entry.legacy === true,
    })),
    gaps,
  };
}

function buildCompactionHookLedgerReport(options: any = {}) {
  const explicitGroupIds = Array.isArray(options.groupIds || options.group_ids)
    ? (options.groupIds || options.group_ids).map((item: any) => String(item || "").trim()).filter(Boolean)
    : null;
  const files = explicitGroupIds
    ? explicitGroupIds.map((id: string) => path.join(GROUP_MEMORY_DIR, `${id}.json`))
    : listJsonFiles(GROUP_MEMORY_DIR);
  const rows: any[] = [];
  for (const file of files) {
    const memory = readMemoryFile(file);
    if (!memory) continue;
    const groupId = String(memory.groupId || path.basename(file, ".json"));
    try {
      const { readGroupMemoryCompactionHookLedger } = require("../collaboration/group-memory-compaction");
      rows.push(summarizeCompactionHookLedger(groupId, memory, readGroupMemoryCompactionHookLedger(groupId)));
    } catch {
      rows.push(summarizeCompactionHookLedger(groupId, memory, {}));
    }
  }
  const compactedRows = rows.filter(row => row.compacted === true || row.entryCount > 0);
  const scoredRows = compactedRows.filter(row => row.score !== null && row.score !== undefined);
  const score = scoredRows.length ? Math.round(scoredRows.reduce((sum, row) => sum + Number(row.score || 0), 0) / scoredRows.length * 10) / 10 : null;
  return {
    schema: "ccm-compaction-hook-ledger-report-v1",
    generatedAt: now(),
    overall: {
      score,
      status: score === null ? "empty" : score >= 90 ? "ok" : score >= 70 ? "warn" : "fail",
      groupCount: rows.length,
      checkedGroupCount: compactedRows.length,
      ledgerGroupCount: rows.filter(row => row.hasLedger).length,
      failedHookCount: rows.reduce((sum, row) => sum + Number(row.failedCount || 0), 0),
      missingPhaseGroupCount: rows.filter(row => row.gaps?.some((gap: any) => String(gap.reason || "").includes("缺少"))).length,
    },
    groups: rows.sort((a, b) => Number(a.score ?? 101) - Number(b.score ?? 101)).slice(0, 50),
    weakGroups: rows.filter(row => row.status === "fail" || row.status === "warn").slice(0, 20),
  };
}

function evaluateCompactionHookLedger(options: any = {}) {
  const report = buildCompactionHookLedgerReport(options);
  const checked = Number(report.overall.checkedGroupCount || 0);
  const passed = (report.groups || []).filter((row: any) => row.entryCount > 0 && row.status === "ok").length;
  const evidence = (report.groups || []).filter((row: any) => row.entryCount > 0 && row.status === "ok").slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    preCount: row.preCount,
    postCount: row.postCount,
    failedCount: row.failedCount,
    avgDurationMs: row.avgDurationMs,
  }));
  const gaps = (report.weakGroups || []).slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    score: row.score,
    reason: row.gaps?.[0]?.reason || "compact hook ledger 存在缺口",
  }));
  const check: any = makeQualityCheck(
    "compaction_hook_ledger",
    "压缩 Hook Ledger",
    checked,
    passed,
    evidence,
    gaps,
    "检查 pre/post compact hook 是否有独立 ledger、耗时和失败证据，避免压缩前后上下文增强过程不可追溯。"
  );
  check.report = report;
  return check;
}

function replayCandidateValue(row: any = {}) {
  return compactMemoryCenterText(row.value || row.text || row.path || row.command || row.name || row.summary || "", 420);
}

function collectPostCompactReplayCandidates(memory: any = {}) {
  const plan = memory?.compaction?.postCompactReinject
    || memory?.compactBoundary?.post_compact_restore?.reinjectionPlan
    || {};
  const candidates: any[] = [];
  const add = (kind: string, rows: any[] = []) => {
    for (const row of rows || []) {
      const value = replayCandidateValue(row);
      if (!value) continue;
      candidates.push({
        candidate_id: String(row.candidate_id || row.candidateId || `${kind}_${candidates.length + 1}`),
        kind,
        value,
        sourceMessageId: String(row.sourceMessageId || row.source_message_id || row.messageId || ""),
      });
    }
  };
  add("file", Array.isArray(plan.files) ? plan.files : []);
  add("skill", Array.isArray(plan.skills) ? plan.skills : []);
  add("verification", Array.isArray(plan.verification) ? plan.verification : []);
  add("blocker", Array.isArray(plan.blockers) ? plan.blockers : []);
  return candidates;
}

function replayNeedleMatches(rendered: string, value: any) {
  const text = String(rendered || "").toLowerCase();
  const expected = String(value || "").trim().toLowerCase();
  if (!expected) return true;
  if (text.includes(expected)) return true;
  const tokens = tokenizeQualityText(expected).filter(token => token.length >= 3).slice(0, 10);
  if (!tokens.length) return false;
  const matched = tokens.filter(token => text.includes(token)).length;
  return matched >= Math.max(1, Math.ceil(tokens.length * 0.55));
}

function addReplayNeedle(needles: any[], type: string, label: string, value: any, required = true) {
  const text = compactMemoryCenterText(value, 520);
  if (!text) return;
  needles.push({ type, label, value: text, required });
}

export function getGroupCompactBoundaryReplayRepairLedgerFile(groupId: string) {
  return path.join(GROUP_MEMORY_REPLAY_REPAIR_DIR, `${sidecarFileId(groupId)}.json`);
}

export function readGroupCompactBoundaryReplayRepairLedger(groupId: string) {
  const file = getGroupCompactBoundaryReplayRepairLedgerFile(groupId);
  const ledger = readJson(file, null);
  if (ledger?.schema === "ccm-compact-boundary-replay-repair-ledger-v1") {
    return {
      ...ledger,
      file,
      entries: Array.isArray(ledger.entries) ? ledger.entries : [],
      stats: ledger.stats || {},
    };
  }
  return {
    schema: "ccm-compact-boundary-replay-repair-ledger-v1",
    version: 1,
    groupId,
    file,
    entries: [],
    stats: {
      attemptCount: 0,
      okCount: 0,
      warnCount: 0,
      failCount: 0,
      reworkRequiredCount: 0,
      openActionCount: 0,
    },
    updatedAt: "",
  };
}

function writeGroupCompactBoundaryReplayRepairLedger(groupId: string, ledger: any) {
  const file = getGroupCompactBoundaryReplayRepairLedgerFile(groupId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const value = {
    schema: "ccm-compact-boundary-replay-repair-ledger-v1",
    version: 1,
    groupId,
    file,
    entries: Array.isArray(ledger.entries) ? ledger.entries.slice(-120) : [],
    stats: ledger.stats || {},
    updatedAt: ledger.updatedAt || now(),
  };
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
  fs.renameSync(temp, file);
  return value;
}

function summarizeReplayRepairActions(actions: any[] = []) {
  return (Array.isArray(actions) ? actions : []).slice(0, 8).map((action: any) => ({
    action_id: String(action.action_id || action.actionId || ""),
    priority: String(action.priority || ""),
    component: String(action.component || ""),
    title: String(action.title || ""),
    repair_target: String(action.repair_target || action.repairTarget || ""),
    instruction: compactMemoryCenterText(action.instruction || "", 260),
    expected: compactMemoryCenterText(action.expected || "", 180),
  }));
}

function summarizeReplayRepairLedger(groupId: string, ledgerInput: any = null) {
  const ledger = ledgerInput || readGroupCompactBoundaryReplayRepairLedger(groupId);
  const entries = Array.isArray(ledger.entries) ? ledger.entries : [];
  const latest = entries[entries.length - 1] || null;
  const historicalOpenEntries = entries.filter((entry: any) => Number(entry.required_action_count || 0) > 0);
  const latestRequiredActionCount = Number(latest?.required_action_count || 0);
  const currentOpenActionCount = latest?.status === "ok" ? 0 : latestRequiredActionCount;
  return {
    schema: "ccm-compact-boundary-replay-repair-ledger-summary-v1",
    groupId,
    file: ledger.file || getGroupCompactBoundaryReplayRepairLedgerFile(groupId),
    updatedAt: ledger.updatedAt || latest?.at || "",
    attemptCount: entries.length,
    okCount: entries.filter((entry: any) => entry.status === "ok").length,
    warnCount: entries.filter((entry: any) => entry.status === "warn").length,
    failCount: entries.filter((entry: any) => entry.status === "fail").length,
    historicalReworkRequiredCount: historicalOpenEntries.length,
    reworkRequiredCount: currentOpenActionCount > 0 ? 1 : 0,
    openActionCount: currentOpenActionCount,
    latestStatus: latest?.status || "",
    latestScore: latest?.score ?? null,
    latestRenderedHash: latest?.rendered_hash || "",
    latestBoundaryChecksum: latest?.boundary?.summaryChecksum || "",
    latestAttemptId: latest?.attempt_id || "",
    recentAttempts: entries.slice(-8).reverse().map((entry: any) => ({
      attempt_id: entry.attempt_id,
      at: entry.at,
      last_seen_at: entry.last_seen_at || entry.at,
      seen_count: Number(entry.seen_count || 1),
      target_project: entry.target_project,
      status: entry.status,
      score: entry.score,
      rendered_hash: entry.rendered_hash,
      required_action_count: Number(entry.required_action_count || 0),
      gap_count: Number(entry.gap_count || 0),
      actions: summarizeReplayRepairActions(entry.actions || []).slice(0, 3),
    })),
  };
}

function recordCompactBoundaryReplayRepairAttempt(groupId: string, replay: any = {}, options: any = {}) {
  if (!groupId || !replay?.schema) return summarizeReplayRepairLedger(groupId);
  const at = String(options.at || now());
  const repairPlan = replay.repairPlan || replay.repair_plan || {};
  const boundary = replay.boundary || repairPlan.boundary || {};
  const attemptId = `replay-attempt:${hash([
    groupId,
    replay.targetProject || repairPlan.targetProject || "",
    boundary.summaryChecksum || boundary.summarizedThroughMessageId || "",
    replay.renderedHash || repairPlan.sourceReplay?.renderedHash || "",
    replay.status || "",
    replay.score ?? "",
  ], 14)}`;
  const ledger = readGroupCompactBoundaryReplayRepairLedger(groupId);
  const entries = Array.isArray(ledger.entries) ? [...ledger.entries] : [];
  const existingIndex = entries.findIndex((entry: any) => entry.attempt_id === attemptId);
  const entry = {
    attempt_id: attemptId,
    group_id: groupId,
    target_project: String(replay.targetProject || repairPlan.targetProject || ""),
    status: String(replay.status || repairPlan.sourceReplay?.status || "empty"),
    score: replay.score ?? repairPlan.sourceReplay?.score ?? null,
    rendered_hash: String(replay.renderedHash || repairPlan.sourceReplay?.renderedHash || ""),
    rendered_chars: Number(replay.renderedChars || 0),
    checked: Number(replay.checked || 0),
    passed: Number(replay.passed || 0),
    candidate_count: Number(replay.candidateCount || repairPlan.candidateCount || 0),
    gap_count: Number(replay.gaps?.length || repairPlan.gapCount || 0),
    required_action_count: Number(repairPlan.requiredActionCount || 0),
    repair_status: String(repairPlan.status || ""),
    repair_action: String(repairPlan.action || ""),
    boundary: {
      compacted: boundary.compacted === true,
      summaryChecksum: String(boundary.summaryChecksum || ""),
      summarizedThroughMessageId: String(boundary.summarizedThroughMessageId || ""),
    },
    actions: summarizeReplayRepairActions(repairPlan.actions || []),
    prompt_patch_hash: repairPlan.promptPatch ? hash(repairPlan.promptPatch, 16) : "",
    raw_recovery: repairPlan.rawRecovery || {},
    at,
    last_seen_at: at,
    seen_count: 1,
  };
  if (existingIndex >= 0) {
    const previous = entries[existingIndex] || {};
    entries[existingIndex] = {
      ...previous,
      ...entry,
      at: previous.at || at,
      last_seen_at: at,
      seen_count: Number(previous.seen_count || 1) + 1,
    };
  } else {
    entries.push(entry);
  }
  const stats = {
    attemptCount: entries.length,
    okCount: entries.filter((item: any) => item.status === "ok").length,
    warnCount: entries.filter((item: any) => item.status === "warn").length,
    failCount: entries.filter((item: any) => item.status === "fail").length,
    emptyCount: entries.filter((item: any) => item.status === "empty").length,
    historicalReworkRequiredCount: entries.filter((item: any) => Number(item.required_action_count || 0) > 0).length,
    reworkRequiredCount: entry.status === "ok" ? 0 : Number(entry.required_action_count || 0) > 0 ? 1 : 0,
    openActionCount: entry.status === "ok" ? 0 : Number(entry.required_action_count || 0),
    latestStatus: entry.status,
    latestScore: entry.score,
    latestAttemptId: attemptId,
    latestRenderedHash: entry.rendered_hash,
  };
  return summarizeReplayRepairLedger(groupId, writeGroupCompactBoundaryReplayRepairLedger(groupId, {
    ...ledger,
    entries,
    stats,
    updatedAt: at,
  }));
}

export function getGroupCompactBoundaryReplayRepairWorkItemsFile(groupId: string) {
  return path.join(GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR, `${sidecarFileId(groupId)}.json`);
}

export function readGroupCompactBoundaryReplayRepairWorkItems(groupId: string) {
  const file = getGroupCompactBoundaryReplayRepairWorkItemsFile(groupId);
  const ledger = readJson(file, null);
  if (ledger?.schema === "ccm-compact-boundary-replay-repair-work-items-v1") {
    return {
      ...ledger,
      file,
      items: Array.isArray(ledger.items) ? ledger.items : [],
      stats: ledger.stats || {},
    };
  }
  return {
    schema: "ccm-compact-boundary-replay-repair-work-items-v1",
    version: 1,
    groupId,
    file,
    latestReplay: null,
    items: [],
    stats: {
      total: 0,
      openItemCount: 0,
      pendingCount: 0,
      inProgressCount: 0,
      blockedCount: 0,
      completedCount: 0,
      cancelledCount: 0,
    },
    updatedAt: "",
  };
}

function replayRepairWorkItemStatus(value: any) {
  const status = String(value || "").trim().toLowerCase();
  if (["in_progress", "running", "claimed", "dispatching"].includes(status)) return "in_progress";
  if (["blocked", "needs_info", "needs_user", "waiting"].includes(status)) return "blocked";
  if (["completed", "done", "resolved", "ok"].includes(status)) return "completed";
  if (["cancelled", "canceled", "superseded"].includes(status)) return "cancelled";
  return "pending";
}

function replayRepairWorkItemOpen(status: string) {
  return ["pending", "in_progress", "blocked"].includes(replayRepairWorkItemStatus(status));
}

function replayRepairWorkItemSignature(item: any = {}) {
  return JSON.stringify({
    status: replayRepairWorkItemStatus(item.status),
    priority: item.priority || "",
    component: item.component || "",
    source: item.source || "",
    title: item.subject || item.title || "",
    repairTarget: item.repair_target || item.repairTarget || "",
    instruction: item.instruction || "",
    expected: item.expected || "",
    replayAttemptId: item.replay_attempt_id || "",
    replayRenderedHash: item.replay_rendered_hash || "",
    boundaryChecksum: item.boundary_checksum || "",
    targetProject: item.target_project || "",
    revalidationGateId: item.revalidation_gate_id || "",
    readPlanId: item.read_plan_id || "",
    expectedTaskAgentSessionId: item.expected_task_agent_session_id || "",
  });
}

function buildReplayRepairPendingWorkItem(groupId: string, replay: any = {}, action: any = {}, index = 0, existing: any = {}, at = now()) {
  const repairPlan = replay.repairPlan || replay.repair_plan || {};
  const boundary = replay.boundary || repairPlan.boundary || {};
  const actionId = String(action.action_id || action.actionId || `action-${index}`);
  const targetProject = String(replay.targetProject || repairPlan.targetProject || "");
  const renderedHash = String(replay.renderedHash || repairPlan.sourceReplay?.renderedHash || "");
  const replayAttemptId = String(replay.repairLedger?.latestAttemptId || replay.repair_ledger?.latestAttemptId || "");
  const id = `replay-repair-work:${hash([
    groupId,
    actionId,
    boundary.summaryChecksum || boundary.summarizedThroughMessageId || "",
    targetProject,
  ], 14)}`;
  const previousStatus = replayRepairWorkItemStatus(existing.status);
  const status = ["in_progress", "blocked", "completed", "cancelled"].includes(previousStatus) ? previousStatus : "pending";
  return {
    id,
    work_item_id: id,
    taskId: "",
    scopeId: groupId,
    group_id: groupId,
    subject: compactMemoryCenterText(action.title || "修复 Replay Gate 缺口", 150),
    description: compactMemoryCenterText(action.instruction || action.source_reason || "", 520),
    activeForm: compactMemoryCenterText(`修复 ${action.component || "replay"}：${action.title || action.repair_target || "Replay Gate 缺口"}`, 180),
    owner: existing.owner && previousStatus !== "pending" ? existing.owner : "group-main-agent",
    target: compactMemoryCenterText(action.repair_target || targetProject || "memory-context", 120),
    agentType: "group-main-agent",
    status,
    priority: String(action.priority || "medium"),
    component: String(action.component || "replay_renderer"),
    source: "compact_boundary_replay_repair",
    source_action_id: actionId,
    repair_target: String(action.repair_target || action.repairTarget || ""),
    instruction: compactMemoryCenterText(action.instruction || "", 520),
    expected: compactMemoryCenterText(action.expected || "", 260),
    source_reason: compactMemoryCenterText(action.source_reason || "", 260),
    attempt: Math.max(1, Number(existing.attempt || 1) || 1),
    replay_attempt_id: replayAttemptId,
    replay_status: String(replay.status || repairPlan.sourceReplay?.status || ""),
    replay_score: replay.score ?? repairPlan.sourceReplay?.score ?? null,
    replay_rendered_hash: renderedHash,
    target_project: targetProject,
    boundary_checksum: String(boundary.summaryChecksum || ""),
    summarized_through_message_id: String(boundary.summarizedThroughMessageId || ""),
    prompt_patch: compactMemoryCenterText(repairPlan.promptPatch || "", 1800),
    dispatch_hint: {
      claim_policy: "group_main_agent_before_child_dispatch",
      next_step: "refresh_group_memory_context_bundle_and_replay",
      should_create_real_task: false,
      reason: "Memory Center diagnostic sidecar; main Agent may claim and dispatch deliberately.",
    },
    raw_recovery: repairPlan.rawRecovery || {},
    evidence: [
      replayAttemptId ? `replay_attempt=${replayAttemptId}` : "",
      renderedHash ? `rendered_hash=${renderedHash}` : "",
      boundary.summaryChecksum ? `summary_checksum=${boundary.summaryChecksum}` : "",
      action.source_reason ? compactMemoryCenterText(action.source_reason, 180) : "",
    ].filter(Boolean),
    filesChanged: [],
    verification: ["重新运行 compact boundary replay gate", "重新生成子 Agent 记忆包并检查 memoryUsed/memoryIgnored 契约"],
    blockers: [],
    needs: ["raw group messages / typed MEMORY.md 回溯", "修复后再次 replay"],
    requeueReason: "",
    createdAt: existing.createdAt || existing.created_at || at,
    updatedAt: existing.updatedAt || existing.updated_at || at,
    lastSeenAt: existing.lastSeenAt || existing.last_seen_at || at,
    completedAt: existing.completedAt || existing.completed_at || "",
    seenCount: Math.max(1, Number(existing.seenCount || existing.seen_count || 1) || 1),
  };
}

function buildReadPlanRevalidationRepairWorkItem(groupId: string, discipline: any = {}, gap: any = {}, index = 0, existing: any = {}, at = now()) {
  const gate = discipline.gate || {};
  const gateId = String(gap.gateId || gap.gate_id || discipline.gateId || gate.revalidation_gate_id || gate.revalidationGateId || "").trim();
  const readPlanId = String(gap.read_plan_id || gap.readPlanId || "").trim();
  const referenceId = String(gap.reference_id || gap.referenceId || "").trim();
  const expectedTaskSessionId = String(gap.expected_task_agent_session_id || gate.session_binding?.task_agent_session_id || gate.sessionBinding?.taskAgentSessionId || "").trim();
  const expectedNativeSessionId = String(gap.expected_native_session_id || gate.session_binding?.native_session_id || gate.sessionBinding?.nativeSessionId || "").trim();
  const receiptTaskSessionId = String(gap.receipt_task_agent_session_id || "").trim();
  const receiptNativeSessionId = String(gap.receipt_native_session_id || "").trim();
  const targetProject = String(gap.target_project || gate.target_project || gate.targetProject || discipline.gate?.target_project || "").trim();
  const sessionMismatch = gap.session_mismatch === true;
  const priority = sessionMismatch ? "critical" : "high";
  const id = `read-plan-revalidation-repair:${hash([
    groupId,
    gateId,
    readPlanId,
    expectedTaskSessionId || expectedNativeSessionId,
    targetProject,
  ], 14)}`;
  const previousStatus = replayRepairWorkItemStatus(existing.status);
  const status = ["in_progress", "blocked", "completed", "cancelled"].includes(previousStatus) ? previousStatus : "pending";
  const reason = sessionMismatch
    ? `错会话回执不能证明本轮子 Agent 已重读：expected=${expectedTaskSessionId || expectedNativeSessionId || "bound-session"}；receipt=${receiptTaskSessionId || receiptNativeSessionId || "missing"}`
    : compactMemoryCenterText(gap.reason || "stale read_plan_id 缺少 current source verified 回执", 260);
  const instruction = [
    `重新派发或续跑 ${targetProject || "目标子 Agent"} 的绑定会话，修复 compact read plan revalidation gate。`,
    gateId ? `必须引用 revalidation_gate_id=${gateId}` : "",
    readPlanId ? `必须引用 read_plan_id=${readPlanId}` : "",
    "必须在 memoryUsed/memoryIgnored 或 readPlanRevalidationUsage 中声明 currentSourceVerified=true，或明确 ignored 原因。",
    expectedTaskSessionId ? `回执 task_agent_session_id 必须等于 ${expectedTaskSessionId}` : "",
    expectedNativeSessionId ? `回执 native_session_id 必须等于 ${expectedNativeSessionId}` : "",
  ].filter(Boolean).join(" ");
  const expected = [
    gateId ? `gateId=${gateId}` : "",
    readPlanId ? `readPlanId=${readPlanId}` : "",
    "currentSourceVerified=true",
    expectedTaskSessionId ? `taskAgentSessionId=${expectedTaskSessionId}` : "",
    expectedNativeSessionId ? `nativeSessionId=${expectedNativeSessionId}` : "",
  ].filter(Boolean).join("; ");
  return {
    id,
    work_item_id: id,
    taskId: "",
    scopeId: groupId,
    group_id: groupId,
    subject: compactMemoryCenterText(sessionMismatch ? "修复读取计划重读会话不匹配" : "补齐读取计划当前源重读声明", 150),
    description: compactMemoryCenterText(reason, 520),
    activeForm: compactMemoryCenterText(`修复 read plan revalidation：${readPlanId || gateId || "stale read plan"}`, 180),
    owner: existing.owner && previousStatus !== "pending" ? existing.owner : "group-main-agent",
    target: compactMemoryCenterText(targetProject || "memory-context", 120),
    agentType: "group-main-agent",
    status,
    priority,
    component: "compact_read_plan_revalidation",
    source: "compact_read_plan_revalidation_repair",
    source_action_id: `read-plan-revalidation:${gateId || "gate"}:${readPlanId || referenceId || index}`,
    repair_target: readPlanId || referenceId || gateId,
    instruction: compactMemoryCenterText(instruction, 700),
    expected: compactMemoryCenterText(expected, 320),
    source_reason: compactMemoryCenterText(reason, 320),
    attempt: Math.max(1, Number(existing.attempt || 1) || 1),
    replay_attempt_id: "",
    replay_status: String(discipline.status || ""),
    replay_score: discipline.score ?? null,
    replay_rendered_hash: "",
    target_project: targetProject,
    boundary_checksum: "",
    summarized_through_message_id: "",
    prompt_patch: compactMemoryCenterText([
      "读取计划重读修复要求：",
      gateId ? `- revalidation_gate_id=${gateId}` : "",
      readPlanId ? `- read_plan_id=${readPlanId}` : "",
      referenceId ? `- reference_id=${referenceId}` : "",
      targetProject ? `- target_project=${targetProject}` : "",
      expectedTaskSessionId || expectedNativeSessionId ? `- session_binding=${expectedTaskSessionId || expectedNativeSessionId}` : "",
      "- 子 Agent 必须先重新读取当前源，再使用该 compact read plan 结论。",
      "- 回执必须写 readPlanRevalidationUsage 或 memoryUsed/memoryIgnored，并匹配绑定 session。",
    ].filter(Boolean).join("\n"), 1800),
    dispatch_hint: {
      claim_policy: "group_main_agent_before_child_dispatch",
      next_step: "rerun_bound_child_agent_session_read_plan_revalidation",
      should_create_real_task: false,
      reason: "Memory Center diagnostic sidecar; main Agent may claim and dispatch deliberately.",
    },
    raw_recovery: {
      rule: "read_plan_revalidation_current_source_verified",
      gate_id: gateId,
      read_plan_id: readPlanId,
      reference_id: referenceId,
      expected_task_agent_session_id: expectedTaskSessionId,
      expected_native_session_id: expectedNativeSessionId,
      receipt_task_agent_session_id: receiptTaskSessionId,
      receipt_native_session_id: receiptNativeSessionId,
    },
    revalidation_gate_id: gateId,
    read_plan_id: readPlanId,
    reference_id: referenceId,
    expected_task_agent_session_id: expectedTaskSessionId,
    expected_native_session_id: expectedNativeSessionId,
    receipt_task_agent_session_id: receiptTaskSessionId,
    receipt_native_session_id: receiptNativeSessionId,
    session_mismatch: sessionMismatch,
    evidence: [
      gateId ? `revalidation_gate_id=${gateId}` : "",
      readPlanId ? `read_plan_id=${readPlanId}` : "",
      reason,
    ].filter(Boolean),
    filesChanged: [],
    verification: ["重新运行 compact read plan revalidation gate report", "确认回执来自绑定子 Agent 会话"],
    blockers: [],
    needs: ["绑定子 Agent 会话续跑", "current source verified 回执"],
    requeueReason: "",
    createdAt: existing.createdAt || existing.created_at || at,
    updatedAt: existing.updatedAt || existing.updated_at || at,
    lastSeenAt: existing.lastSeenAt || existing.last_seen_at || at,
    completedAt: existing.completedAt || existing.completed_at || "",
    seenCount: Math.max(1, Number(existing.seenCount || existing.seen_count || 1) || 1),
  };
}

function replayRepairWorkItemStats(items: any[] = []) {
  const normalized = (Array.isArray(items) ? items : []).map(item => replayRepairWorkItemStatus(item.status));
  return {
    total: normalized.length,
    openItemCount: normalized.filter(status => replayRepairWorkItemOpen(status)).length,
    pendingCount: normalized.filter(status => status === "pending").length,
    inProgressCount: normalized.filter(status => status === "in_progress").length,
    blockedCount: normalized.filter(status => status === "blocked").length,
    completedCount: normalized.filter(status => status === "completed").length,
    cancelledCount: normalized.filter(status => status === "cancelled").length,
  };
}

function writeGroupCompactBoundaryReplayRepairWorkItems(groupId: string, ledger: any) {
  const file = getGroupCompactBoundaryReplayRepairWorkItemsFile(groupId);
  const items = Array.isArray(ledger.items) ? ledger.items.slice(-160) : [];
  const value = {
    schema: "ccm-compact-boundary-replay-repair-work-items-v1",
    version: 1,
    groupId,
    file,
    latestReplay: ledger.latestReplay || null,
    items,
    stats: ledger.stats || replayRepairWorkItemStats(items),
    updatedAt: ledger.updatedAt || now(),
  };
  writeJsonAtomic(file, value);
  return value;
}

function summarizeReplayRepairPendingWorkItems(groupId: string, ledgerInput: any = null) {
  const ledger = ledgerInput || readGroupCompactBoundaryReplayRepairWorkItems(groupId);
  const items = Array.isArray(ledger.items) ? ledger.items : [];
  const stats = ledger.stats || replayRepairWorkItemStats(items);
  const openItems = items.filter((item: any) => replayRepairWorkItemOpen(item.status))
    .sort((a: any, b: any) => replayRepairPriorityRank(a.priority) - replayRepairPriorityRank(b.priority));
  return {
    schema: "ccm-compact-boundary-replay-repair-work-items-summary-v1",
    groupId,
    file: ledger.file || getGroupCompactBoundaryReplayRepairWorkItemsFile(groupId),
    updatedAt: ledger.updatedAt || "",
    latestReplay: ledger.latestReplay || null,
    total: Number(stats.total || items.length || 0),
    openItemCount: Number(stats.openItemCount || 0),
    pendingCount: Number(stats.pendingCount || 0),
    inProgressCount: Number(stats.inProgressCount || 0),
    blockedCount: Number(stats.blockedCount || 0),
    completedCount: Number(stats.completedCount || 0),
    cancelledCount: Number(stats.cancelledCount || 0),
    items: [...openItems, ...items.filter((item: any) => !replayRepairWorkItemOpen(item.status)).slice(-8)]
      .slice(0, 12)
      .map((item: any) => ({
        id: item.id || item.work_item_id || "",
        work_item_id: item.work_item_id || item.id || "",
        status: replayRepairWorkItemStatus(item.status),
        owner: item.owner || "",
        priority: item.priority || "",
        component: item.component || "",
        source: item.source || "",
        subject: item.subject || "",
        activeForm: item.activeForm || item.active_form || "",
        target: item.target || "",
        repair_target: item.repair_target || "",
        target_project: item.target_project || "",
        revalidation_gate_id: item.revalidation_gate_id || "",
        read_plan_id: item.read_plan_id || "",
        expected_task_agent_session_id: item.expected_task_agent_session_id || "",
        receipt_task_agent_session_id: item.receipt_task_agent_session_id || "",
        session_mismatch: item.session_mismatch === true,
        instruction: compactMemoryCenterText(item.instruction || item.description || "", 260),
        expected: compactMemoryCenterText(item.expected || "", 160),
        dispatch_target: item.dispatch_target || item.dispatchTarget || "",
        replay_attempt_id: item.replay_attempt_id || "",
        replay_rendered_hash: item.replay_rendered_hash || "",
        boundary_checksum: item.boundary_checksum || "",
        createdAt: item.createdAt || "",
        updatedAt: item.updatedAt || "",
        startedAt: item.startedAt || "",
        completedAt: item.completedAt || "",
        blockedReason: item.blockedReason || item.blocked_reason || "",
        resolutionReason: item.resolutionReason || item.resolution_reason || "",
        seenCount: Number(item.seenCount || item.seen_count || 1),
      })),
    openItems: openItems.slice(0, 8).map((item: any) => ({
      id: item.id || item.work_item_id || "",
      status: replayRepairWorkItemStatus(item.status),
      owner: item.owner || "",
      priority: item.priority || "",
      component: item.component || "",
      source: item.source || "",
      subject: item.subject || "",
      repair_target: item.repair_target || "",
      target_project: item.target_project || "",
      revalidation_gate_id: item.revalidation_gate_id || "",
      read_plan_id: item.read_plan_id || "",
      expected_task_agent_session_id: item.expected_task_agent_session_id || "",
      receipt_task_agent_session_id: item.receipt_task_agent_session_id || "",
      session_mismatch: item.session_mismatch === true,
      instruction: compactMemoryCenterText(item.instruction || item.description || "", 260),
      expected: compactMemoryCenterText(item.expected || "", 160),
      dispatch_target: item.dispatch_target || item.dispatchTarget || "",
      replay_attempt_id: item.replay_attempt_id || "",
      replay_rendered_hash: item.replay_rendered_hash || "",
    })),
  };
}

function replayRepairWorkItemDispatchCandidatePriority(item: any = {}) {
  const status = replayRepairWorkItemStatus(item.status);
  const dispatchTarget = String(item.dispatch_target || item.dispatchTarget || "").trim();
  const owner = String(item.owner || "").trim();
  if (dispatchTarget) return 0;
  if (status === "in_progress" && owner === "group-main-agent") return 1;
  if (["critical", "high"].includes(String(item.priority || "").toLowerCase()) && replayRepairWorkItemOpen(status)) return 2;
  return 9;
}

function shouldSurfaceReplayRepairDispatchCandidate(item: any = {}) {
  const status = replayRepairWorkItemStatus(item.status);
  if (!replayRepairWorkItemOpen(status)) return false;
  const dispatchTarget = String(item.dispatch_target || item.dispatchTarget || "").trim();
  const owner = String(item.owner || "").trim();
  const priority = String(item.priority || "").toLowerCase();
  return !!dispatchTarget
    || (status === "in_progress" && owner === "group-main-agent")
    || (["critical", "high"].includes(priority) && status === "pending");
}

function buildReplayRepairDispatchCandidate(groupId: string, item: any = {}, index = 0) {
  const status = replayRepairWorkItemStatus(item.status);
  const workItemId = String(item.work_item_id || item.id || `repair-${index}`);
  const dispatchTarget = compactMemoryCenterText(item.dispatch_target || item.dispatchTarget || "", 120);
  const targetProject = compactMemoryCenterText(dispatchTarget || item.target_project || item.target || item.repair_target || "", 120);
  const claimedByMain = status === "in_progress" && String(item.owner || "") === "group-main-agent";
  const dispatchMarked = !!dispatchTarget;
  const priority = String(item.priority || "medium").toLowerCase();
  const recommendedAction = dispatchMarked
    ? "main_agent_review_and_dispatch_to_child_agent"
    : claimedByMain
    ? "main_agent_prepare_dispatch_brief"
    : ["critical", "high"].includes(priority)
    ? "main_agent_claim_or_triage_before_next_child_dispatch"
    : "keep_as_replay_repair_backlog";
  return {
    schema: "ccm-replay-repair-main-agent-dispatch-candidate-v1",
    candidate_id: `replay-repair-dispatch:${hash([groupId, workItemId, targetProject, item.replay_rendered_hash || ""], 14)}`,
    work_item_id: workItemId,
    groupId,
    status,
    owner: item.owner || "",
    priority: item.priority || "medium",
    component: item.component || "replay_renderer",
    source: item.source || "",
    subject: item.subject || item.title || "修复 Replay Gate 缺口",
    targetProject,
    dispatch_target: dispatchTarget,
    repair_target: item.repair_target || "",
    instruction: compactMemoryCenterText(item.instruction || item.description || "", 520),
    expected: compactMemoryCenterText(item.expected || "", 260),
    source_reason: compactMemoryCenterText(item.source_reason || "", 260),
    prompt_patch: compactMemoryCenterText(item.prompt_patch || "", 1400),
    raw_recovery: item.raw_recovery || {},
    replay_attempt_id: item.replay_attempt_id || "",
    replay_rendered_hash: item.replay_rendered_hash || "",
    boundary_checksum: item.boundary_checksum || "",
    revalidation_gate_id: item.revalidation_gate_id || "",
    read_plan_id: item.read_plan_id || "",
    expected_task_agent_session_id: item.expected_task_agent_session_id || "",
    expected_native_session_id: item.expected_native_session_id || "",
    receipt_task_agent_session_id: item.receipt_task_agent_session_id || "",
    receipt_native_session_id: item.receipt_native_session_id || "",
    session_mismatch: item.session_mismatch === true,
    startedAt: item.startedAt || "",
    updatedAt: item.updatedAt || "",
    claimedByMainAgent: claimedByMain,
    dispatchMarked,
    recommendedAction,
    shouldCreateRealTask: false,
    auditNote: "Memory Center 只生成主 Agent 候选上下文；真实任务/子 Agent 会话必须由主 Agent 后续显式派发。",
  };
}

export function buildReplayRepairMainAgentDispatchCandidates(groupId: string, options: any = {}) {
  const ledger = options.ledger || readGroupCompactBoundaryReplayRepairWorkItems(groupId);
  const items = Array.isArray(ledger.items) ? ledger.items : [];
  const candidates = items
    .filter(shouldSurfaceReplayRepairDispatchCandidate)
    .sort((a: any, b: any) => {
      const candidateRank = replayRepairWorkItemDispatchCandidatePriority(a) - replayRepairWorkItemDispatchCandidatePriority(b);
      if (candidateRank) return candidateRank;
      const priorityRank = replayRepairPriorityRank(String(a.priority || "")) - replayRepairPriorityRank(String(b.priority || ""));
      if (priorityRank) return priorityRank;
      return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    })
    .slice(0, Number(options.limit || 12))
    .map((item: any, index: number) => buildReplayRepairDispatchCandidate(groupId, item, index));
  const openItems = items.filter((item: any) => replayRepairWorkItemOpen(item.status));
  const claimedItems = openItems.filter((item: any) => replayRepairWorkItemStatus(item.status) === "in_progress" && String(item.owner || "") === "group-main-agent");
  const dispatchMarkedItems = openItems.filter((item: any) => String(item.dispatch_target || item.dispatchTarget || "").trim());
  const criticalItems = openItems.filter((item: any) => ["critical", "high"].includes(String(item.priority || "").toLowerCase()));
  return {
    schema: "ccm-replay-repair-main-agent-dispatch-candidates-v1",
    groupId,
    file: ledger.file || getGroupCompactBoundaryReplayRepairWorkItemsFile(groupId),
    updatedAt: ledger.updatedAt || "",
    candidateCount: candidates.length,
    openItemCount: openItems.length,
    claimedCount: claimedItems.length,
    dispatchMarkedCount: dispatchMarkedItems.length,
    criticalCount: criticalItems.length,
    readyCount: candidates.filter((candidate: any) => candidate.dispatchMarked || candidate.claimedByMainAgent).length,
    shouldCreateRealTask: false,
    candidates,
  };
}

function findReplayRepairWorkItemIndex(items: any[] = [], itemRef: any) {
  const ref = String(itemRef || "").replace(/^@/, "").trim().toLowerCase();
  if (!ref) return -1;
  return items.findIndex((item: any) => [
    item.id,
    item.work_item_id,
    item.source_action_id,
    item.repair_target,
    item.subject,
    item.target,
  ].some(value => String(value || "").trim().toLowerCase() === ref));
}

export function updateCompactBoundaryReplayRepairWorkItem(input: any = {}) {
  const groupId = String(input.groupId || input.group_id || input.scopeId || input.scope_id || "").trim();
  if (!groupId) throw new Error("缺少 groupId");
  const itemRef = String(input.itemId || input.item_id || input.workItemId || input.work_item_id || input.id || "").trim();
  if (!itemRef) throw new Error("缺少 replay repair work item id");
  const action = String(input.action || input.operation || "").trim().toLowerCase();
  if (!["claim", "dispatch", "complete", "resolve", "block", "cancel", "reopen"].includes(action)) throw new Error("不支持的 replay repair work item 操作");
  const at = String(input.at || now());
  const owner = compactMemoryCenterText(input.owner || input.actor || "group-main-agent", 120);
  const reason = compactMemoryCenterText(input.reason || input.detail || "", 420);
  const ledger = readGroupCompactBoundaryReplayRepairWorkItems(groupId);
  const items = Array.isArray(ledger.items) ? [...ledger.items] : [];
  const index = findReplayRepairWorkItemIndex(items, itemRef);
  if (index < 0) throw new Error("replay repair work item 不存在");
  const item = { ...items[index] };
  const status = replayRepairWorkItemStatus(item.status);
  const terminal = ["completed", "cancelled"].includes(status);
  const history = Array.isArray(item.history) ? item.history.slice(-30) : [];
  const historyEntry = {
    action,
    actor: owner,
    reason,
    at,
    from: status,
  };
  let nextStatus = status;
  if (action === "claim" || action === "dispatch") {
    if (terminal) throw new Error("已关闭的 replay repair work item 不能认领或派发");
    if (status === "in_progress" && item.owner && item.owner !== owner) throw new Error(`该 work item 已由 ${item.owner} 认领`);
    nextStatus = "in_progress";
    item.owner = owner;
    item.startedAt = item.startedAt || at;
    item.claimedAt = item.claimedAt || at;
    item.claimCount = Number(item.claimCount || 0) + 1;
    if (action === "dispatch") {
      item.dispatch_target = compactMemoryCenterText(input.dispatchTarget || input.dispatch_target || item.target_project || item.target || "", 120);
      item.dispatchedAt = at;
      item.dispatchReason = reason || "group_main_agent_replay_repair_dispatch";
    }
  } else if (action === "complete" || action === "resolve") {
    nextStatus = "completed";
    item.owner = owner || item.owner;
    item.completedAt = item.completedAt || at;
    item.resolutionReason = reason || input.resolutionReason || input.resolution_reason || "replay_repair_work_completed";
    item.lastReceipt = input.receipt || {
      status: "completed",
      summary: item.resolutionReason,
      at,
      actor: owner,
    };
    item.evidence = [
      ...(Array.isArray(item.evidence) ? item.evidence : []),
      reason || "replay repair work completed",
    ].filter(Boolean).slice(-12);
  } else if (action === "block") {
    if (terminal) throw new Error("已关闭的 replay repair work item 不能标记阻塞");
    nextStatus = "blocked";
    item.owner = owner || item.owner;
    item.blockedReason = reason || "replay_repair_work_blocked";
    item.blockers = [
      ...(Array.isArray(item.blockers) ? item.blockers : []),
      item.blockedReason,
    ].filter(Boolean).slice(-12);
  } else if (action === "cancel") {
    nextStatus = "cancelled";
    item.owner = owner || item.owner;
    item.completedAt = item.completedAt || at;
    item.resolutionReason = reason || "replay_repair_work_cancelled";
  } else if (action === "reopen") {
    nextStatus = "pending";
    item.owner = owner || "group-main-agent";
    item.completedAt = "";
    item.startedAt = "";
    item.blockedReason = "";
    item.resolutionReason = reason || "reopened_for_replay_repair";
    item.attempt = Number(item.attempt || 1) + 1;
  }
  item.status = nextStatus;
  item.updatedAt = at;
  item.history = [...history, { ...historyEntry, to: nextStatus }];
  items[index] = item;
  const nextLedger = writeGroupCompactBoundaryReplayRepairWorkItems(groupId, {
    ...ledger,
    items,
    stats: replayRepairWorkItemStats(items),
    updatedAt: at,
  });
  appendAudit({
    type: "replay_repair_work_item",
    action,
    scope: "group",
    scopeId: groupId,
    itemId: item.id || item.work_item_id || itemRef,
    actor: owner,
    reason: reason || action,
    status: nextStatus,
  });
  return {
    success: true,
    action,
    item,
    workItems: summarizeReplayRepairPendingWorkItems(groupId, nextLedger),
  };
}

function syncCompactBoundaryReplayRepairPendingWorkItems(groupId: string, replay: any = {}, options: any = {}) {
  if (!groupId || !replay?.schema) return summarizeReplayRepairPendingWorkItems(groupId);
  const at = String(options.at || now());
  const repairPlan = replay.repairPlan || replay.repair_plan || {};
  const actions = Array.isArray(repairPlan.actions) ? repairPlan.actions : [];
  const replayStatus = String(replay.status || repairPlan.sourceReplay?.status || "");
  const latestReplay = {
    status: replayStatus,
    score: replay.score ?? repairPlan.sourceReplay?.score ?? null,
    renderedHash: replay.renderedHash || repairPlan.sourceReplay?.renderedHash || "",
    targetProject: replay.targetProject || repairPlan.targetProject || "",
    attemptId: replay.repairLedger?.latestAttemptId || replay.repair_ledger?.latestAttemptId || "",
    requiredActionCount: Number(repairPlan.requiredActionCount || actions.length || 0),
    boundary: replay.boundary || repairPlan.boundary || {},
  };
  const ledger = readGroupCompactBoundaryReplayRepairWorkItems(groupId);
  const previousItems = Array.isArray(ledger.items) ? ledger.items : [];
  const previousById = new Map<string, any>(previousItems.map((item: any) => [String(item.id || item.work_item_id || ""), item]));
  const currentIds = new Set<string>();
  const nextItems: any[] = [];
  let changed = JSON.stringify(ledger.latestReplay || {}) !== JSON.stringify(latestReplay);

  for (const [index, action] of actions.entries()) {
    const draft = buildReplayRepairPendingWorkItem(groupId, replay, action, index, {}, at);
    const existing = previousById.get(draft.id) || {};
    let item = buildReplayRepairPendingWorkItem(groupId, replay, action, index, existing, at);
    const previousSignature = replayRepairWorkItemSignature(existing);
    const nextSignature = replayRepairWorkItemSignature(item);
    if (existing.id && previousSignature === nextSignature) {
      item = {
        ...existing,
        ...item,
        createdAt: existing.createdAt || item.createdAt,
        updatedAt: existing.updatedAt || item.updatedAt,
        lastSeenAt: existing.lastSeenAt || item.lastSeenAt,
        seenCount: Number(existing.seenCount || 1),
      };
    } else {
      item = {
        ...item,
        updatedAt: at,
        lastSeenAt: at,
        seenCount: existing.id ? Number(existing.seenCount || 1) + 1 : 1,
      };
      changed = true;
    }
    currentIds.add(item.id);
    nextItems.push(item);
  }

  for (const existing of previousItems) {
    const id = String(existing.id || existing.work_item_id || "");
    const source = String(existing.source || "");
    if (source && source !== "compact_boundary_replay_repair") {
      nextItems.push(existing);
      continue;
    }
    if (!id || currentIds.has(id)) continue;
    const currentStatus = replayRepairWorkItemStatus(existing.status);
    if (!replayRepairWorkItemOpen(currentStatus)) {
      nextItems.push(existing);
      continue;
    }
    const resolved = replayStatus === "ok" || Number(latestReplay.requiredActionCount || 0) === 0;
    nextItems.push({
      ...existing,
      status: resolved ? "completed" : "cancelled",
      updatedAt: at,
      completedAt: resolved ? (existing.completedAt || at) : existing.completedAt || "",
      resolutionReason: resolved ? "latest_replay_ok" : "superseded_by_latest_replay",
      latestReplay,
    });
    changed = true;
  }

  const prioritySorted = nextItems.sort((a, b) => {
    const statusRank = replayRepairWorkItemOpen(a.status) === replayRepairWorkItemOpen(b.status) ? 0 : replayRepairWorkItemOpen(a.status) ? -1 : 1;
    if (statusRank) return statusRank;
    const priority = replayRepairPriorityRank(a.priority) - replayRepairPriorityRank(b.priority);
    if (priority) return priority;
    return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
  }).slice(0, 160);
  const stats = replayRepairWorkItemStats(prioritySorted);
  const nextLedger = {
    ...ledger,
    latestReplay,
    items: prioritySorted,
    stats,
    updatedAt: changed || !ledger.updatedAt ? at : ledger.updatedAt,
  };
  const currentComparable = JSON.stringify({
    latestReplay: ledger.latestReplay || null,
    items: previousItems,
    stats: ledger.stats || {},
  });
  const nextComparable = JSON.stringify({
    latestReplay: nextLedger.latestReplay || null,
    items: nextLedger.items,
    stats: nextLedger.stats || {},
  });
  if (changed || currentComparable !== nextComparable || !fs.existsSync(ledger.file || getGroupCompactBoundaryReplayRepairWorkItemsFile(groupId))) {
    return summarizeReplayRepairPendingWorkItems(groupId, writeGroupCompactBoundaryReplayRepairWorkItems(groupId, nextLedger));
  }
  return summarizeReplayRepairPendingWorkItems(groupId, ledger);
}

function syncCompactFileReferenceReadPlanRevalidationRepairWorkItems(groupId: string, discipline: any = {}, options: any = {}) {
  if (!groupId || !discipline?.schema) return summarizeReplayRepairPendingWorkItems(groupId);
  const at = String(options.at || now());
  const ledger = readGroupCompactBoundaryReplayRepairWorkItems(groupId);
  const previousItems = Array.isArray(ledger.items) ? ledger.items : [];
  const previousById = new Map<string, any>(previousItems.map((item: any) => [String(item.id || item.work_item_id || ""), item]));
  const gaps = Array.isArray(discipline.gaps) ? discipline.gaps : [];
  const activeGaps = gaps.filter((gap: any) => gap?.read_plan_id || gap?.reference_id || gap?.session_mismatch);
  const currentIds = new Set<string>();
  const nextRepairItems: any[] = [];
  let changed = false;

  for (const [index, gap] of activeGaps.entries()) {
    const draft = buildReadPlanRevalidationRepairWorkItem(groupId, discipline, gap, index, {}, at);
    const existing = previousById.get(draft.id) || {};
    let item = buildReadPlanRevalidationRepairWorkItem(groupId, discipline, gap, index, existing, at);
    const previousSignature = replayRepairWorkItemSignature(existing);
    const nextSignature = replayRepairWorkItemSignature(item);
    if (existing.id && previousSignature === nextSignature) {
      item = {
        ...existing,
        ...item,
        createdAt: existing.createdAt || item.createdAt,
        updatedAt: existing.updatedAt || item.updatedAt,
        lastSeenAt: existing.lastSeenAt || item.lastSeenAt,
        seenCount: Number(existing.seenCount || 1),
      };
    } else {
      item = {
        ...item,
        updatedAt: at,
        lastSeenAt: at,
        seenCount: existing.id ? Number(existing.seenCount || 1) + 1 : 1,
      };
      changed = true;
    }
    currentIds.add(item.id);
    nextRepairItems.push(item);
  }

  const untouchedItems: any[] = [];
  for (const existing of previousItems) {
    const id = String(existing.id || existing.work_item_id || "");
    const source = String(existing.source || "");
    if (source !== "compact_read_plan_revalidation_repair") {
      untouchedItems.push(existing);
      continue;
    }
    if (!id || currentIds.has(id)) continue;
    const currentStatus = replayRepairWorkItemStatus(existing.status);
    if (!replayRepairWorkItemOpen(currentStatus)) {
      nextRepairItems.push(existing);
      continue;
    }
    const resolved = String(discipline.status || "") === "ok" || activeGaps.length === 0;
    nextRepairItems.push({
      ...existing,
      status: resolved ? "completed" : "cancelled",
      updatedAt: at,
      completedAt: resolved ? (existing.completedAt || at) : existing.completedAt || "",
      resolutionReason: resolved ? "read_plan_revalidation_gate_ok" : "superseded_by_latest_revalidation_report",
      latestRevalidation: {
        status: discipline.status || "",
        score: discipline.score ?? null,
        gateId: discipline.gateId || discipline.gate?.revalidation_gate_id || "",
      },
    });
    changed = true;
  }

  const nextItems = [...untouchedItems, ...nextRepairItems]
    .sort((a, b) => {
      const statusRank = replayRepairWorkItemOpen(a.status) === replayRepairWorkItemOpen(b.status) ? 0 : replayRepairWorkItemOpen(a.status) ? -1 : 1;
      if (statusRank) return statusRank;
      const priority = replayRepairPriorityRank(a.priority) - replayRepairPriorityRank(b.priority);
      if (priority) return priority;
      return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    })
    .slice(0, 160);
  const stats = replayRepairWorkItemStats(nextItems);
  const nextLedger = {
    ...ledger,
    latestReadPlanRevalidation: {
      status: discipline.status || "",
      score: discipline.score ?? null,
      gateId: discipline.gateId || discipline.gate?.revalidation_gate_id || "",
      checked: discipline.checked || 0,
      passed: discipline.passed || 0,
      missing: discipline.missing || 0,
      sessionMismatch: discipline.sessionMismatch || 0,
    },
    items: nextItems,
    stats,
    updatedAt: changed || !ledger.updatedAt ? at : ledger.updatedAt,
  };
  const currentComparable = JSON.stringify({
    latestReadPlanRevalidation: ledger.latestReadPlanRevalidation || null,
    items: previousItems.filter((item: any) => String(item.source || "") === "compact_read_plan_revalidation_repair"),
  });
  const nextComparable = JSON.stringify({
    latestReadPlanRevalidation: nextLedger.latestReadPlanRevalidation || null,
    items: nextItems.filter((item: any) => String(item.source || "") === "compact_read_plan_revalidation_repair"),
  });
  if (changed || currentComparable !== nextComparable || !fs.existsSync(ledger.file || getGroupCompactBoundaryReplayRepairWorkItemsFile(groupId))) {
    return summarizeReplayRepairPendingWorkItems(groupId, writeGroupCompactBoundaryReplayRepairWorkItems(groupId, nextLedger));
  }
  return summarizeReplayRepairPendingWorkItems(groupId, ledger);
}

function replayRepairPriorityRank(priority: string) {
  if (priority === "critical") return 0;
  if (priority === "high") return 1;
  if (priority === "medium") return 2;
  return 3;
}

function compactReplayRepairAction(groupId: string, gap: any = {}, index = 0) {
  const type = String(gap.type || "replay").trim() || "replay";
  const label = String(gap.label || type).trim() || type;
  const value = compactMemoryCenterText(gap.value || gap.reason || "", 220);
  const base = {
    action_id: `replay-repair:${hash([groupId, type, label, value, index], 12)}`,
    gap_type: type,
    gap_label: label,
    expected: value,
    source_reason: compactMemoryCenterText(gap.reason || `${label} 未进入 replay 上下文`, 260),
  };
  if (type === "receipt_contract") {
    return {
      ...base,
      priority: "critical",
      component: "child_agent_receipt_contract",
      title: "补齐子 Agent 回执契约",
      repair_target: "renderGroupMemoryContextBundle",
      instruction: "重新生成子 Agent 记忆包时必须显式注入 CCM_AGENT_RECEIPT 中的 memoryUsed/memoryIgnored 要求，避免新第三方会话执行后无法证明是否使用记忆。",
    };
  }
  if (type === "candidate_contract") {
    return {
      ...base,
      priority: "critical",
      component: "post_compact_candidate_usage",
      title: "补齐压缩候选使用账本契约",
      repair_target: "post_compact_candidate_usage",
      instruction: "把 postCompactCandidateUsage 要求重新写入记忆包，并要求子 Agent 对每条重注入候选声明 used / ignored / verified。",
    };
  }
  if (type === "boundary") {
    return {
      ...base,
      priority: "critical",
      component: "compact_boundary",
      title: "重建压缩边界索引",
      repair_target: "compactBoundary.summaryChecksum",
      instruction: "从 group memory 与 group messages 重新核对压缩边界、summary checksum 和 summarizedThroughMessageId，保证新会话能定位压缩前后分界。",
    };
  }
  if (type === "hook") {
    return {
      ...base,
      priority: "high",
      component: "compaction_hook_ledger",
      title: "重载压缩 Hook Ledger",
      repair_target: "compaction.hookLedger",
      instruction: "读取 group-memory-compaction-hooks sidecar，刷新 pre/post compact hook 摘要，确保压缩后清理、重载和候选恢复动作可审计。",
    };
  }
  if (type === "goal" || type === "constraint" || type === "fact") {
    return {
      ...base,
      priority: "high",
      component: "group_state",
      title: "补回群聊核心记忆",
      repair_target: type === "goal" ? "group_state.goal" : "group_state.persistentRequirements",
      instruction: "从群聊原始消息和 typed MEMORY.md 重新抽取该核心约束，写回群聊记忆后再次 replay，不能只依赖旧摘要。",
    };
  }
  if (["file", "skill", "verification", "blocker"].includes(type)) {
    return {
      ...base,
      priority: "medium",
      component: "post_compact_reinject",
      title: "补回压缩后重注入候选",
      repair_target: `postCompactReinject.${type}`,
      instruction: "把该候选从 raw transcript 或 typed MEMORY.md 恢复到 postCompactReinject，并在下一次子 Agent 派发时要求核验当前仓库状态。",
    };
  }
  return {
    ...base,
    priority: "medium",
    component: "replay_renderer",
    title: "重放渲染器补丁",
    repair_target: "rendered_child_agent_memory_context",
    instruction: "检查 replay 渲染路径和实际子 Agent 记忆包渲染路径是否一致，缺失字段需要在两处同时补齐。",
  };
}

function buildCompactBoundaryReplayRepairPlan(groupId: string, memory: any = {}, options: any = {}) {
  const gaps = Array.isArray(options.gaps) ? options.gaps : [];
  const replayStatus = String(options.status || "");
  const boundary = options.boundary || compactMemoryHasPostCompactBoundary(memory);
  const candidates = Array.isArray(options.candidates) ? options.candidates : [];
  const targetProject = String(options.targetProject || options.target_project || "");
  const actions = gaps
    .map((gap: any, index: number) => compactReplayRepairAction(groupId, gap, index))
    .sort((a: any, b: any) => replayRepairPriorityRank(a.priority) - replayRepairPriorityRank(b.priority));
  const hasReplay = replayStatus && replayStatus !== "empty";
  const promptPatch = actions.length ? [
    "Replay Gate 修复指令：",
    `- group=${groupId}；target=${targetProject || "child Agent"}；score=${options.score ?? "unknown"}；boundary=${boundary.summaryChecksum || boundary.summarizedThroughMessageId || "unknown"}。`,
    "- 先按 raw group messages / typed MEMORY.md 回溯缺失项，再重新生成子 Agent 记忆包；不要把失败 replay 当作可用上下文。",
    ...actions.slice(0, 6).map((action: any) => `- ${action.priority}:${action.component}：${action.instruction}${action.expected ? `；expected=${action.expected}` : ""}`),
  ].join("\n") : "";
  return {
    schema: "ccm-compact-boundary-replay-repair-plan-v1",
    groupId,
    targetProject,
    status: actions.length ? "rework_required" : hasReplay ? "ok" : "empty",
    action: actions.length ? "refresh_and_replay_child_agent_memory" : "none",
    generatedAt: now(),
    sourceReplay: {
      status: replayStatus || "empty",
      score: options.score ?? null,
      renderedHash: options.renderedHash || "",
    },
    boundary: {
      compacted: boundary.hasBoundary === true,
      summaryChecksum: boundary.summaryChecksum || "",
      summarizedThroughMessageId: boundary.summarizedThroughMessageId || "",
    },
    candidateCount: candidates.length,
    gapCount: gaps.length,
    requiredActionCount: actions.length,
    actions,
    promptPatch,
    rawRecovery: {
      groupMemoryFile: path.join(GROUP_MEMORY_DIR, `${groupId}.json`),
      groupMessagesFile: path.join(GROUP_MESSAGES_DIR, `${groupId}.json`),
      rule: "raw transcript remains source of truth; rebuild summary and replay before child Agent dispatch",
    },
    safeguards: [
      "修复后必须重新运行 compact boundary replay gate。",
      "涉及文件、命令和约束的候选必须按当前仓库状态重新核验。",
      "子 Agent 回执必须声明 memoryUsed/memoryIgnored 和 postCompactCandidateUsage。",
    ],
  };
}

function buildGroupCompactBoundaryReplayGate(groupId: string, memory: any = {}, options: any = {}) {
  const boundary = compactMemoryHasPostCompactBoundary(memory);
  const compaction = memory?.compaction || {};
  const hookLedger = options.hookLedger || summarizeCompactionHookLedger(groupId, memory, {});
  if (!boundary.hasBoundary && !compaction.postCompactReinject && !memory?.compactBoundary?.post_compact_restore?.reinjectionPlan) {
    return {
      schema: "ccm-compact-boundary-replay-gate-v1",
      groupId,
      status: "empty",
      score: null,
      checked: 0,
      passed: 0,
      targetProject: "",
      renderedHash: "",
      renderedChars: 0,
      needles: [],
      gaps: [],
      repairPlan: buildCompactBoundaryReplayRepairPlan(groupId, memory, { status: "empty" }),
      repairLedger: summarizeReplayRepairLedger(groupId),
      repairWorkItems: summarizeReplayRepairPendingWorkItems(groupId),
    };
  }
  const candidates = collectPostCompactReplayCandidates(memory);
  const targetProject = String(options.targetProject || options.target_project || Object.keys(memory?.agentMemories || {})[0] || "api");
  const replayTask = [
    memory.goal,
    ...candidates.map(item => item.value),
    ...(Array.isArray(memory?.persistentRequirements) ? memory.persistentRequirements.slice(-4).map((item: any) => item.text || item.value || item) : []),
  ].filter(Boolean).join("\n");
  let rendered = "";
  try {
    const { renderGroupMemoryContextBundle } = require("../collaboration/memory");
    rendered = renderGroupMemoryContextBundle({
      schema: "ccm-group-memory-context-v1",
      version: 1,
      group_id: groupId,
      target_project: targetProject,
      task_query: compactMemoryCenterText(replayTask || "compact boundary replay", 900),
      generated_at: now(),
      memory_policy: {
        priority: "platform_group_memory_over_third_party_cli_session",
        use: "must_consider",
        boundary: "read_only_replay_gate",
        raw_recovery: "group-messages JSON keeps raw transcript; request message id if more source text is needed",
      },
      compaction: {
        ...compaction,
        boundary: memory?.compactBoundary || null,
        postCompactRecoveryAudit: compaction.postCompactRecoveryAudit
          || memory?.compactBoundary?.post_compact_restore?.recoveryAudit
          || memory?.messageCompression?.postCompactRecoveryAudit
          || null,
        postCompactReinject: compaction.postCompactReinject || memory?.compactBoundary?.post_compact_restore?.reinjectionPlan || null,
        hookLedger: compaction.hookLedger || (hookLedger?.hasLedger ? {
          schema: "ccm-group-memory-compaction-hook-ledger-summary-v1",
          hookRunId: hookLedger.hookRunIds?.[hookLedger.hookRunIds.length - 1] || "",
          file: hookLedger.file || "",
          stats: {
            failed: hookLedger.failedCount || 0,
            pre: { total: hookLedger.preCount || 0, ok: hookLedger.preCount || 0 },
            post: { total: hookLedger.postCount || 0, ok: hookLedger.postCount || 0 },
          },
          recentEntries: (hookLedger.recentEntries || []).map((entry: any) => ({
            phase: entry.phase,
            ok: entry.ok,
            status: entry.status,
            duration_ms: entry.durationMs,
            result_summary: entry.summary || {},
            error: entry.error,
          })),
        } : null),
      },
      group_state: {
        goal: memory.goal || "",
        currentPhase: memory.currentPhase || "idle",
        summaryText: memory.messageDigest || memory.summary || "",
        decisions: (memory.decisions || []).slice(-6),
        openQuestions: (memory.openQuestions || []).slice(-4),
        nextActions: (memory.nextActions || []).slice(-4),
        persistentRequirements: (memory.persistentRequirements || []).slice(-8),
        factAnchors: (memory.factAnchors || []).slice(-8),
        typedMemory: {
          sync: null,
          loadPlan: null,
          recall: null,
        },
      },
      post_compact_reinjection_gate: {
        schema: candidates.length ? "ccm-child-agent-post-compact-reinjection-gate-v1" : "",
        reinjection_gate_id: candidates.length ? `replay:${hash([groupId, boundary.summaryChecksum, candidates.map(item => item.value)], 12)}` : "",
        status: candidates.length ? "required" : "not_required",
        candidate_count: candidates.length,
        candidates,
        post_compact_recovery_audit: {
          summary_checksum: compaction.summaryChecksum || memory?.compactBoundary?.summaryChecksum || "",
        },
      },
      post_compact_candidate_usage: {
        schema: "ccm-group-post-compact-candidate-usage-summary-v1",
        has_history: false,
        candidate_count: candidates.length,
        totals: {},
      },
      target_agent_memory: {},
      related_work: {},
      relevant_historical_evidence: "",
      raw_sources: {
        group_memory_file: path.join(GROUP_MEMORY_DIR, `${groupId}.json`),
        group_messages_file: path.join(GROUP_MESSAGES_DIR, `${groupId}.json`),
      },
    });
  } catch (error: any) {
    rendered = compactMemoryCenterText(error?.message || error, 1000);
  }

  const needles: any[] = [];
  addReplayNeedle(needles, "goal", "群聊目标", memory.goal, true);
  if (boundary.summaryChecksum) addReplayNeedle(needles, "boundary", "摘要校验", boundary.summaryChecksum, true);
  else if (boundary.summarizedThroughMessageId) addReplayNeedle(needles, "boundary", "压缩边界", boundary.summarizedThroughMessageId, true);
  for (const item of Array.isArray(memory?.persistentRequirements) ? memory.persistentRequirements.slice(-6) : []) {
    addReplayNeedle(needles, "constraint", item.messageId || "persistentRequirement", item.text || item.value || item, true);
  }
  for (const candidate of candidates) {
    addReplayNeedle(needles, candidate.kind, candidate.candidate_id || candidate.kind, candidate.value, true);
  }
  if (compaction.hookLedger?.hookRunId || hookLedger.hookRunIds?.length) {
    addReplayNeedle(needles, "hook", "hook ledger", compaction.hookLedger?.hookRunId || hookLedger.hookRunIds?.[hookLedger.hookRunIds.length - 1], true);
  }
  if (compaction.postCompactRecoveryAudit?.schema) {
    addReplayNeedle(needles, "recovery", "恢复审计", compaction.postCompactRecoveryAudit.status || compaction.postCompactRecoveryAudit.summaryChecksum || compaction.summaryChecksum, true);
  }
  const requiredNeedles = needles.filter(needle => needle.required !== false);
  const checks = requiredNeedles.map(needle => ({
    ...needle,
    matched: replayNeedleMatches(rendered, needle.value),
  }));
  const contractChecks = [
    { type: "receipt_contract", label: "memoryUsed/memoryIgnored", value: "memoryUsed/memoryIgnored", matched: rendered.includes("memoryUsed/memoryIgnored") },
    { type: "candidate_contract", label: "postCompactCandidateUsage", value: "postCompactCandidateUsage", matched: candidates.length === 0 || rendered.includes("postCompactCandidateUsage") },
  ];
  const allChecks = [...checks, ...contractChecks];
  const passed = allChecks.filter(check => check.matched).length;
  const score = allChecks.length ? Math.round((passed / allChecks.length) * 1000) / 10 : null;
  const gaps = allChecks.filter(check => !check.matched).map(check => ({
    type: check.type,
    label: check.label,
    value: compactMemoryCenterText(check.value, 220),
    reason: `${check.type} 未进入子 Agent replay 上下文：${compactMemoryCenterText(check.value, 120)}`,
  }));
  const status = score === null ? "empty" : score >= 95 ? "ok" : score >= 75 ? "warn" : "fail";
  const renderedHash = hash(rendered, 16);
  const repairPlan = buildCompactBoundaryReplayRepairPlan(groupId, memory, {
    status,
    score,
    gaps,
    candidates,
    boundary,
    hookLedger,
    targetProject,
    renderedHash,
  });
  const replay: any = {
    schema: "ccm-compact-boundary-replay-gate-v1",
    groupId,
    targetProject,
    status,
    score,
    checked: allChecks.length,
    passed,
    renderedHash,
    renderedChars: rendered.length,
    boundary: {
      compacted: boundary.hasBoundary === true,
      summaryChecksum: boundary.summaryChecksum,
      summarizedThroughMessageId: boundary.summarizedThroughMessageId,
    },
    candidateCount: candidates.length,
    hookLedgerVisible: replayNeedleMatches(rendered, compaction.hookLedger?.hookRunId || hookLedger.hookRunIds?.[hookLedger.hookRunIds.length - 1] || ""),
    receiptContractVisible: contractChecks[0].matched,
    candidateContractVisible: contractChecks[1].matched,
    needles: checks.slice(0, 24),
    gaps: gaps.slice(0, 12),
    repairPlan,
  };
  replay.repairLedger = options.recordRepairLedger === false || options.record_repair_ledger === false
    ? summarizeReplayRepairLedger(groupId)
    : recordCompactBoundaryReplayRepairAttempt(groupId, replay, { at: options.generatedAt || options.generated_at || now() });
  replay.repairWorkItems = options.recordRepairLedger === false
    || options.record_repair_ledger === false
    || options.recordRepairWorkItems === false
    || options.record_repair_work_items === false
    ? summarizeReplayRepairPendingWorkItems(groupId)
    : syncCompactBoundaryReplayRepairPendingWorkItems(groupId, replay, { at: options.generatedAt || options.generated_at || now() });
  return replay;
}

function normalizeHistoricalCompactBoundary(boundary: any = {}, index = 0) {
  const restore = boundary.post_compact_restore || boundary.postCompactRestore || {};
  const summaryChecksum = String(
    boundary.summaryChecksum
      || boundary.summary_checksum
      || restore.summaryChecksum
      || restore.summary_checksum
      || ""
  ).trim();
  const summarizedThroughMessageId = String(
    boundary.summarizedThroughMessageId
      || boundary.summarized_through_message_id
      || boundary.lastCompactedMessageId
      || boundary.last_compacted_message_id
      || ""
  ).trim();
  const boundaryId = String(
    boundary.id
      || boundary.boundary_id
      || summaryChecksum
      || summarizedThroughMessageId
      || `history-${index}`
  ).trim();
  return {
    ...boundary,
    id: boundaryId,
    boundary_id: boundaryId,
    summaryChecksum,
    summary_checksum: summaryChecksum,
    summarizedThroughMessageId,
    summarized_through_message_id: summarizedThroughMessageId,
    summarizedMessageCount: Number(boundary.summarizedMessageCount || boundary.summarized_message_count || boundary.compactedMessageCount || boundary.compacted_message_count || 0),
    preCompactTokenCount: Number(boundary.preCompactTokenCount || boundary.pre_compact_token_count || 0),
    postCompactTokenCount: Number(boundary.postCompactTokenCount || boundary.post_compact_token_count || 0),
    lastCompactedAt: String(boundary.lastCompactedAt || boundary.last_compacted_at || boundary.compactedAt || boundary.compacted_at || boundary.createdAt || boundary.created_at || ""),
    post_compact_restore: restore,
  };
}

function collectHistoricalCompactBoundaries(memory: any = {}, options: any = {}) {
  const maxBoundaries = Math.max(1, Math.min(8, Number(options.maxBoundaries || options.max_boundaries || 8)));
  const raw = [
    ...(Array.isArray(memory?.compaction?.boundaries) ? memory.compaction.boundaries : []),
    ...(memory?.compactBoundary ? [memory.compactBoundary] : []),
  ];
  const seen = new Set<string>();
  const rows: any[] = [];
  raw.forEach((item: any, index: number) => {
    const boundary = normalizeHistoricalCompactBoundary(item, index);
    const key = boundary.summaryChecksum || boundary.summarizedThroughMessageId || boundary.id;
    if (!key || seen.has(key)) return;
    seen.add(key);
    rows.push(boundary);
  });
  return rows.slice(-maxBoundaries);
}

function buildHistoricalBoundaryMemorySnapshot(memory: any = {}, boundary: any = {}) {
  const restore = boundary.post_compact_restore || {};
  const compaction = memory?.compaction || {};
  return {
    ...memory,
    compactBoundary: {
      ...(memory?.compactBoundary || {}),
      ...boundary,
      summarizedThroughMessageId: boundary.summarizedThroughMessageId,
      summaryChecksum: boundary.summaryChecksum,
      summarizedMessageCount: boundary.summarizedMessageCount,
      preCompactTokenCount: boundary.preCompactTokenCount,
      postCompactTokenCount: boundary.postCompactTokenCount,
      post_compact_restore: restore,
    },
    compaction: {
      ...compaction,
      lastCompactedMessageId: boundary.summarizedThroughMessageId || compaction.lastCompactedMessageId || "",
      lastCompactedAt: boundary.lastCompactedAt || compaction.lastCompactedAt || "",
      summaryChecksum: boundary.summaryChecksum || compaction.summaryChecksum || "",
      compactedMessageCount: boundary.summarizedMessageCount || compaction.compactedMessageCount || 0,
      preCompactTokenCount: boundary.preCompactTokenCount || compaction.preCompactTokenCount || 0,
      postCompactTokenCount: boundary.postCompactTokenCount || compaction.postCompactTokenCount || 0,
      postCompactReinject: restore.reinjectionPlan || restore.reinjection_plan || compaction.postCompactReinject || null,
      postCompactRecoveryAudit: restore.recoveryAudit || restore.recovery_audit || compaction.postCompactRecoveryAudit || null,
      boundary,
    },
  };
}

function buildGroupHistoricalCompactBoundaryReplay(groupId: string, memory: any = {}, options: any = {}) {
  const hookLedger = options.hookLedger || summarizeCompactionHookLedger(groupId, memory, {});
  const targetProject = String(options.targetProject || options.target_project || Object.keys(memory?.agentMemories || {})[0] || "api");
  const boundaries = collectHistoricalCompactBoundaries(memory, options);
  if (!boundaries.length) {
    return {
      schema: "ccm-historical-compact-boundary-replay-v1",
      groupId,
      targetProject,
      status: "empty",
      score: null,
      boundaryCount: 0,
      replayedBoundaryCount: 0,
      passedBoundaryCount: 0,
      gapCount: 0,
      boundaries: [],
      gaps: [],
    };
  }
  const rows = boundaries.map((boundary: any, index: number) => {
    const snapshot = buildHistoricalBoundaryMemorySnapshot(memory, boundary);
    const replay = buildGroupCompactBoundaryReplayGate(groupId, snapshot, {
      hookLedger,
      targetProject,
      recordRepairLedger: false,
    });
    const score = replay.score ?? null;
    const status = replay.status || "empty";
    const boundaryKey = boundary.summaryChecksum || boundary.summarizedThroughMessageId || boundary.id;
    return {
      historyIndex: index,
      boundaryId: boundary.id || boundary.boundary_id || boundaryKey,
      summaryChecksum: boundary.summaryChecksum,
      summarizedThroughMessageId: boundary.summarizedThroughMessageId,
      lastCompactedAt: boundary.lastCompactedAt,
      compactedMessageCount: boundary.summarizedMessageCount,
      preCompactTokenCount: boundary.preCompactTokenCount,
      postCompactTokenCount: boundary.postCompactTokenCount,
      replayStatus: status,
      score,
      checked: replay.checked || 0,
      passed: replay.passed || 0,
      renderedHash: replay.renderedHash || "",
      candidateCount: replay.candidateCount || 0,
      gapCount: replay.gaps?.length || 0,
      gaps: (replay.gaps || []).slice(0, 4),
    };
  });
  const replayedRows = rows.filter(row => row.score !== null && row.score !== undefined);
  const score = replayedRows.length ? Math.round(replayedRows.reduce((sum, row) => sum + Number(row.score || 0), 0) / replayedRows.length * 10) / 10 : null;
  const gaps = rows.flatMap(row => (row.gaps || []).map((gap: any) => ({
    boundaryId: row.boundaryId,
    summaryChecksum: row.summaryChecksum,
    type: gap.type,
    label: gap.label,
    reason: gap.reason,
  }))).slice(0, 16);
  return {
    schema: "ccm-historical-compact-boundary-replay-v1",
    groupId,
    targetProject,
    status: score === null ? "empty" : score >= 95 && !gaps.length ? "ok" : score >= 75 ? "warn" : "fail",
    score,
    boundaryCount: boundaries.length,
    replayedBoundaryCount: replayedRows.length,
    passedBoundaryCount: rows.filter(row => row.replayStatus === "ok").length,
    gapCount: rows.reduce((sum, row) => sum + Number(row.gapCount || 0), 0),
    boundaries: rows.sort((a, b) => Number(a.score ?? 101) - Number(b.score ?? 101)),
    gaps,
  };
}

function buildHistoricalCompactBoundaryReplayReport(options: any = {}) {
  const explicitGroupIds = Array.isArray(options.groupIds || options.group_ids)
    ? (options.groupIds || options.group_ids).map((item: any) => String(item || "").trim()).filter(Boolean)
    : null;
  const files = explicitGroupIds
    ? explicitGroupIds.map((id: string) => path.join(GROUP_MEMORY_DIR, `${id}.json`))
    : listJsonFiles(GROUP_MEMORY_DIR);
  const rows: any[] = [];
  for (const file of files) {
    const memory = readMemoryFile(file);
    if (!memory) continue;
    const groupId = String(memory.groupId || path.basename(file, ".json"));
    const hooks = (() => {
      try {
        const { readGroupMemoryCompactionHookLedger } = require("../collaboration/group-memory-compaction");
        return summarizeCompactionHookLedger(groupId, memory, readGroupMemoryCompactionHookLedger(groupId));
      } catch {
        return summarizeCompactionHookLedger(groupId, memory, {});
      }
    })();
    rows.push(buildGroupHistoricalCompactBoundaryReplay(groupId, memory, { hookLedger: hooks, maxBoundaries: options.maxBoundaries || options.max_boundaries }));
  }
  const checkedRows = rows.filter(row => row.status !== "empty");
  const scoredRows = checkedRows.filter(row => row.score !== null && row.score !== undefined);
  const score = scoredRows.length ? Math.round(scoredRows.reduce((sum, row) => sum + Number(row.score || 0), 0) / scoredRows.length * 10) / 10 : null;
  return {
    schema: "ccm-historical-compact-boundary-replay-report-v1",
    generatedAt: now(),
    overall: {
      score,
      status: score === null ? "empty" : score >= 95 ? "ok" : score >= 75 ? "warn" : "fail",
      groupCount: rows.length,
      checkedGroupCount: checkedRows.length,
      boundaryCount: checkedRows.reduce((sum, row) => sum + Number(row.boundaryCount || 0), 0),
      replayedBoundaryCount: checkedRows.reduce((sum, row) => sum + Number(row.replayedBoundaryCount || 0), 0),
      passedBoundaryCount: checkedRows.reduce((sum, row) => sum + Number(row.passedBoundaryCount || 0), 0),
      gapCount: checkedRows.reduce((sum, row) => sum + Number(row.gapCount || 0), 0),
    },
    groups: rows.sort((a, b) => Number(a.score ?? 101) - Number(b.score ?? 101)).slice(0, 50),
    weakGroups: checkedRows.filter(row => row.status === "fail" || row.status === "warn").slice(0, 20),
  };
}

function evaluateHistoricalCompactBoundaryReplay(options: any = {}) {
  const report = buildHistoricalCompactBoundaryReplayReport(options);
  const checked = Number(report.overall.checkedGroupCount || 0);
  const passed = (report.groups || []).filter((row: any) => row.status === "ok").length;
  const evidence = (report.groups || []).filter((row: any) => row.status === "ok").slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    score: row.score,
    boundaryCount: row.boundaryCount,
    replayedBoundaryCount: row.replayedBoundaryCount,
    passedBoundaryCount: row.passedBoundaryCount,
  }));
  const gaps = (report.weakGroups || []).slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    score: row.score,
    reason: row.gaps?.[0]?.reason || "历史 compact boundary replay 存在缺口",
    boundaryId: row.gaps?.[0]?.boundaryId || "",
  }));
  const check: any = makeQualityCheck(
    "historical_compact_boundary_replay",
    "历史压缩边界 Replay",
    checked,
    passed,
    evidence,
    gaps,
    "抽样 compaction.boundaries 中的历史压缩边界，验证旧边界的摘要校验、重注入候选和回执契约仍能进入第三方子 Agent 新会话上下文。"
  );
  check.report = report;
  return check;
}

function normalizeChildAgentReplayType(value: any) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "unknown";
  if (/(claude|claudecode|claude-code|cc\b)/i.test(raw)) return "claudecode";
  if (/cursor/i.test(raw)) return "cursor";
  if (/codex/i.test(raw)) return "codex";
  return raw.replace(/[^a-z0-9._:-]+/g, "-").slice(0, 80) || "unknown";
}

function collectChildAgentTypeReplayTargets(groupId: string, memory: any = {}, options: any = {}) {
  const rows: any[] = [];
  const add = (project: any, agentType: any, source = "memory") => {
    const targetProject = String(project || "").trim();
    if (!targetProject) return;
    rows.push({
      targetProject,
      agentType: normalizeChildAgentReplayType(agentType || targetProject),
      rawAgentType: String(agentType || "").trim(),
      source,
    });
  };
  if (Array.isArray(options.targets || options.agentTargets || options.agent_targets)) {
    for (const target of (options.targets || options.agentTargets || options.agent_targets)) {
      add(target?.project || target?.targetProject || target?.target_project || target?.name, target?.agentType || target?.agent_type || target?.agent, "options");
    }
  }
  const groups = readJson(path.join(CCM_DIR, "groups.json"), []);
  const groupList = Array.isArray(groups) ? groups : groups?.groups || [];
  const group = groupList.find((item: any) => String(item.id || item.groupId || "") === String(groupId));
  for (const member of Array.isArray(group?.members) ? group.members : []) {
    add(member.project || member.name || member.target_project || member.targetProject, member.agentType || member.agent_type || member.agent, "group_member");
  }
  for (const [project, agentMemory] of Object.entries(memory?.agentMemories || {})) {
    add(project, (agentMemory as any)?.agentType || (agentMemory as any)?.agent_type || (agentMemory as any)?.agent || "", "agent_memory");
  }
  for (const entry of Array.isArray(memory?.workerLedger) ? memory.workerLedger.slice(-30) : []) {
    add(entry.project || entry.target_project || entry.agent, entry.agentType || entry.agent_type || entry.runner || "", "worker_ledger");
  }
  if (!rows.length) add(Object.keys(memory?.agentMemories || {})[0] || "api", "unknown", "fallback");
  const seen = new Set<string>();
  return rows.filter(row => {
    const key = `${row.agentType}:${row.targetProject}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12);
}

function buildChildAgentTypeReplayProfile(agentType: string, replay: any = {}, memory: any = {}, target: any = {}) {
  const checks: any[] = [
    {
      key: "base_replay",
      label: "基础 replay",
      pass: replay.status === "ok",
      reason: replay.status === "ok" ? "" : `基础 replay 状态 ${replay.status || "unknown"}，score=${replay.score ?? "unknown"}`,
    },
    {
      key: "receipt_contract",
      label: "回执契约",
      pass: replay.receiptContractVisible === true,
      reason: "缺少 memoryUsed/memoryIgnored 回执契约",
    },
    {
      key: "candidate_usage",
      label: "候选使用契约",
      pass: replay.candidateContractVisible === true,
      reason: "缺少 postCompactCandidateUsage 候选使用契约",
    },
    {
      key: "boundary_identity",
      label: "压缩边界身份",
      pass: !!(replay.boundary?.summaryChecksum || replay.boundary?.summarizedThroughMessageId),
      reason: "缺少 summaryChecksum 或 summarizedThroughMessageId",
    },
  ];
  if (agentType === "claudecode") {
    checks.push({
      key: "claude_memory_bridge",
      label: "Claude 记忆桥",
      pass: replay.receiptContractVisible === true && !!(replay.boundary?.summaryChecksum || replay.boundary?.summarizedThroughMessageId),
      reason: "Claude Code 新会话需要明确平台记忆优先级、边界和回执，不能依赖内置 session 记忆",
    });
  } else if (agentType === "cursor") {
    checks.push({
      key: "cursor_file_hints",
      label: "Cursor 文件线索",
      pass: Number(replay.candidateCount || 0) > 0 || JSON.stringify(memory?.agentMemories?.[target.targetProject] || {}).includes("."),
      reason: "Cursor 子 Agent 需要文件/验证候选，避免只收到抽象摘要",
    });
  } else if (agentType === "codex") {
    checks.push({
      key: "codex_raw_recovery",
      label: "Codex 原始回溯",
      pass: !!(replay.repairPlan?.rawRecovery?.groupMessagesFile || replay.boundary?.summaryChecksum),
      reason: "Codex 新会话需要 raw group messages 或 summary checksum 作为回溯锚点",
    });
  }
  const passed = checks.filter(check => check.pass).length;
  const score = checks.length ? Math.round((passed / checks.length) * 1000) / 10 : null;
  return {
    schema: "ccm-child-agent-type-replay-profile-v1",
    agentType,
    score,
    status: score === null ? "empty" : score >= 95 ? "ok" : score >= 75 ? "warn" : "fail",
    checked: checks.length,
    passed,
    checks,
    gaps: checks.filter(check => !check.pass).map(check => ({
      component: check.key,
      reason: check.reason,
      label: check.label,
    })),
  };
}

function buildGroupChildAgentTypeReplayMatrix(groupId: string, memory: any = {}, options: any = {}) {
  const hookLedger = options.hookLedger || summarizeCompactionHookLedger(groupId, memory, {});
  const targets = collectChildAgentTypeReplayTargets(groupId, memory, options);
  const targetRows = targets.map(target => {
    const replay = buildGroupCompactBoundaryReplayGate(groupId, memory, {
      hookLedger,
      targetProject: target.targetProject,
      recordRepairLedger: false,
    });
    const profile = buildChildAgentTypeReplayProfile(target.agentType, replay, memory, target);
    return {
      schema: "ccm-child-agent-type-replay-target-v1",
      targetProject: target.targetProject,
      agentType: target.agentType,
      rawAgentType: target.rawAgentType,
      source: target.source,
      status: profile.status,
      score: profile.score,
      replayStatus: replay.status,
      replayScore: replay.score,
      checked: profile.checked,
      passed: profile.passed,
      renderedHash: replay.renderedHash || "",
      candidateCount: replay.candidateCount || 0,
      repairActionCount: replay.repairPlan?.requiredActionCount || 0,
      gaps: profile.gaps.slice(0, 8),
      profile,
    };
  });
  const typeMap = new Map<string, any>();
  for (const row of targetRows) {
    const current = typeMap.get(row.agentType) || {
      agentType: row.agentType,
      targetCount: 0,
      scoredTargetCount: 0,
      scoreTotal: 0,
      targets: [],
      gaps: [],
    };
    current.targetCount++;
    if (row.score !== null && row.score !== undefined) {
      current.scoredTargetCount++;
      current.scoreTotal += Number(row.score || 0);
    }
    current.targets.push(row);
    current.gaps.push(...(row.gaps || []).map((gap: any) => ({ ...gap, targetProject: row.targetProject })));
    typeMap.set(row.agentType, current);
  }
  const agentTypes = Array.from(typeMap.values()).map(row => {
    const score = row.scoredTargetCount ? Math.round((row.scoreTotal / row.scoredTargetCount) * 10) / 10 : null;
    return {
      schema: "ccm-child-agent-type-replay-row-v1",
      agentType: row.agentType,
      targetCount: row.targetCount,
      scoredTargetCount: row.scoredTargetCount,
      score,
      status: score === null ? "empty" : score >= 95 && !row.gaps.length ? "ok" : score >= 75 ? "warn" : "fail",
      gaps: row.gaps.slice(0, 8),
      targets: row.targets.slice(0, 8),
    };
  }).sort((a, b) => Number(a.score ?? 101) - Number(b.score ?? 101));
  const scoredTypes = agentTypes.filter(row => row.score !== null && row.score !== undefined);
  const score = scoredTypes.length ? Math.round(scoredTypes.reduce((sum, row) => sum + Number(row.score || 0), 0) / scoredTypes.length * 10) / 10 : null;
  return {
    schema: "ccm-child-agent-type-replay-matrix-v1",
    groupId,
    status: score === null ? "empty" : score >= 95 && !agentTypes.some(row => row.status !== "ok") ? "ok" : score >= 75 ? "warn" : "fail",
    score,
    targetCount: targetRows.length,
    agentTypeCount: agentTypes.length,
    weakTypeCount: agentTypes.filter(row => row.status === "fail" || row.status === "warn").length,
    agentTypes,
    targets: targetRows,
    gaps: agentTypes.flatMap(row => (row.gaps || []).map((gap: any) => ({ ...gap, agentType: row.agentType }))).slice(0, 16),
  };
}

function buildChildAgentTypeReplayMatrixReport(options: any = {}) {
  const explicitGroupIds = Array.isArray(options.groupIds || options.group_ids)
    ? (options.groupIds || options.group_ids).map((item: any) => String(item || "").trim()).filter(Boolean)
    : null;
  const files = explicitGroupIds
    ? explicitGroupIds.map((id: string) => path.join(GROUP_MEMORY_DIR, `${id}.json`))
    : listJsonFiles(GROUP_MEMORY_DIR);
  const rows: any[] = [];
  for (const file of files) {
    const memory = readMemoryFile(file);
    if (!memory) continue;
    const groupId = String(memory.groupId || path.basename(file, ".json"));
    const hooks = (() => {
      try {
        const { readGroupMemoryCompactionHookLedger } = require("../collaboration/group-memory-compaction");
        return summarizeCompactionHookLedger(groupId, memory, readGroupMemoryCompactionHookLedger(groupId));
      } catch {
        return summarizeCompactionHookLedger(groupId, memory, {});
      }
    })();
    rows.push(buildGroupChildAgentTypeReplayMatrix(groupId, memory, { hookLedger: hooks, targets: options.targets }));
  }
  const checkedRows = rows.filter(row => row.status !== "empty");
  const scoredRows = checkedRows.filter(row => row.score !== null && row.score !== undefined);
  const score = scoredRows.length ? Math.round(scoredRows.reduce((sum, row) => sum + Number(row.score || 0), 0) / scoredRows.length * 10) / 10 : null;
  return {
    schema: "ccm-child-agent-type-replay-matrix-report-v1",
    generatedAt: now(),
    overall: {
      score,
      status: score === null ? "empty" : score >= 95 ? "ok" : score >= 75 ? "warn" : "fail",
      groupCount: rows.length,
      checkedGroupCount: checkedRows.length,
      targetCount: checkedRows.reduce((sum, row) => sum + Number(row.targetCount || 0), 0),
      agentTypeCount: checkedRows.reduce((sum, row) => sum + Number(row.agentTypeCount || 0), 0),
      weakTypeCount: checkedRows.reduce((sum, row) => sum + Number(row.weakTypeCount || 0), 0),
      gapCount: checkedRows.reduce((sum, row) => sum + Number(row.gaps?.length || 0), 0),
    },
    groups: rows.sort((a, b) => Number(a.score ?? 101) - Number(b.score ?? 101)).slice(0, 50),
    weakGroups: checkedRows.filter(row => row.status === "fail" || row.status === "warn").slice(0, 20),
  };
}

function evaluateChildAgentTypeReplayMatrix(options: any = {}) {
  const report = buildChildAgentTypeReplayMatrixReport(options);
  const checked = Number(report.overall.checkedGroupCount || 0);
  const passed = (report.groups || []).filter((row: any) => row.status === "ok").length;
  const evidence = (report.groups || []).filter((row: any) => row.status === "ok").slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    score: row.score,
    targetCount: row.targetCount,
    agentTypeCount: row.agentTypeCount,
  }));
  const gaps = (report.weakGroups || []).slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    score: row.score,
    reason: row.gaps?.[0]?.reason || "子 Agent 类型 replay matrix 存在缺口",
    agentType: row.gaps?.[0]?.agentType || "",
    targetProject: row.gaps?.[0]?.targetProject || "",
  }));
  const check: any = makeQualityCheck(
    "child_agent_type_replay_matrix",
    "子 Agent 类型 Replay",
    checked,
    passed,
    evidence,
    gaps,
    "按 Claude Code / Cursor / Codex 等子 Agent 类型分维度重放群聊记忆包，验证每种第三方新会话都能拿到压缩边界、候选使用和回执契约。"
  );
  check.report = report;
  return check;
}

function buildCompactBoundaryReplayReport(options: any = {}) {
  const explicitGroupIds = Array.isArray(options.groupIds || options.group_ids)
    ? (options.groupIds || options.group_ids).map((item: any) => String(item || "").trim()).filter(Boolean)
    : null;
  const files = explicitGroupIds
    ? explicitGroupIds.map((id: string) => path.join(GROUP_MEMORY_DIR, `${id}.json`))
    : listJsonFiles(GROUP_MEMORY_DIR);
  const rows: any[] = [];
  for (const file of files) {
    const memory = readMemoryFile(file);
    if (!memory) continue;
    const groupId = String(memory.groupId || path.basename(file, ".json"));
    const hooks = (() => {
      try {
        const { readGroupMemoryCompactionHookLedger } = require("../collaboration/group-memory-compaction");
        return summarizeCompactionHookLedger(groupId, memory, readGroupMemoryCompactionHookLedger(groupId));
      } catch {
        return summarizeCompactionHookLedger(groupId, memory, {});
      }
    })();
    rows.push(buildGroupCompactBoundaryReplayGate(groupId, memory, { hookLedger: hooks }));
  }
  const checkedRows = rows.filter(row => row.status !== "empty");
  const scoredRows = checkedRows.filter(row => row.score !== null && row.score !== undefined);
  const score = scoredRows.length ? Math.round(scoredRows.reduce((sum, row) => sum + Number(row.score || 0), 0) / scoredRows.length * 10) / 10 : null;
  return {
    schema: "ccm-compact-boundary-replay-report-v1",
    generatedAt: now(),
    overall: {
      score,
      status: score === null ? "empty" : score >= 95 ? "ok" : score >= 75 ? "warn" : "fail",
      groupCount: rows.length,
      checkedGroupCount: checkedRows.length,
      replayedGroupCount: scoredRows.length,
      gapCount: checkedRows.reduce((sum, row) => sum + Number(row.gaps?.length || 0), 0),
      repairActionCount: checkedRows.reduce((sum, row) => sum + Number(row.repairPlan?.requiredActionCount || 0), 0),
      repairAttemptCount: checkedRows.reduce((sum, row) => sum + Number(row.repairLedger?.attemptCount || 0), 0),
      openRepairActionCount: checkedRows.reduce((sum, row) => sum + Number(row.repairLedger?.openActionCount || 0), 0),
    },
    groups: rows.sort((a, b) => Number(a.score ?? 101) - Number(b.score ?? 101)).slice(0, 50),
    weakGroups: checkedRows.filter(row => row.status === "fail" || row.status === "warn").slice(0, 20),
    topRepairActions: checkedRows
      .flatMap(row => (row.repairPlan?.actions || []).slice(0, 2).map((action: any) => ({ groupId: row.groupId, score: row.score, ...action })))
      .slice(0, 20),
  };
}

function evaluateCompactBoundaryReplayGate(options: any = {}) {
  const report = buildCompactBoundaryReplayReport(options);
  const checked = Number(report.overall.checkedGroupCount || 0);
  const passed = (report.groups || []).filter((row: any) => row.status === "ok").length;
  const evidence = (report.groups || []).filter((row: any) => row.status === "ok").slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    targetProject: row.targetProject,
    score: row.score,
    checked: row.checked,
    renderedHash: row.renderedHash,
  }));
  const gaps = (report.weakGroups || []).slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    score: row.score,
    reason: row.repairPlan?.actions?.[0]?.instruction || row.gaps?.[0]?.reason || "compact boundary replay gate 存在缺口",
    repairAction: row.repairPlan?.actions?.[0]?.title || "",
  }));
  const check: any = makeQualityCheck(
    "compact_boundary_replay_gate",
    "压缩边界 Replay Gate",
    checked,
    passed,
    evidence,
    gaps,
    "只读重放子 Agent 记忆包，验证压缩边界、重注入候选、hook 注入要求和回执契约是否能进入第三方子 Agent 新会话上下文。"
  );
  check.report = report;
  return check;
}

function replayOverrideForGroup(options: any = {}, groupId: string) {
  const overrides = options.replays || options.replayRows || options.replay_rows;
  if (Array.isArray(overrides)) return overrides.find((row: any) => String(row.groupId || row.group_id || "") === String(groupId)) || null;
  if (overrides && typeof overrides === "object") return overrides[groupId] || overrides[String(groupId)] || null;
  return null;
}

function buildReplayRepairPendingWorkItemReport(options: any = {}) {
  const explicitGroupIds = Array.isArray(options.groupIds || options.group_ids)
    ? (options.groupIds || options.group_ids).map((item: any) => String(item || "").trim()).filter(Boolean)
    : null;
  const overrideGroupIds = Array.isArray(options.replays || options.replayRows || options.replay_rows)
    ? (options.replays || options.replayRows || options.replay_rows).map((row: any) => String(row.groupId || row.group_id || "")).filter(Boolean)
    : [];
  const groupIds = explicitGroupIds || overrideGroupIds;
  const files = groupIds?.length
    ? groupIds.map((id: string) => path.join(GROUP_MEMORY_DIR, `${id}.json`))
    : listJsonFiles(GROUP_MEMORY_DIR);
  const rows: any[] = [];
  for (const file of files) {
    const fileGroupId = path.basename(file, ".json");
    const memory = readMemoryFile(file) || { groupId: fileGroupId };
    const groupId = String(memory.groupId || fileGroupId);
    const replayOverride = replayOverrideForGroup(options, groupId);
    const replay = replayOverride || (() => {
      const hooks = (() => {
        try {
          const { readGroupMemoryCompactionHookLedger } = require("../collaboration/group-memory-compaction");
          return summarizeCompactionHookLedger(groupId, memory, readGroupMemoryCompactionHookLedger(groupId));
        } catch {
          return summarizeCompactionHookLedger(groupId, memory, {});
        }
      })();
      return buildGroupCompactBoundaryReplayGate(groupId, memory, { hookLedger: hooks });
    })();
    const workItems = replayOverride
      ? syncCompactBoundaryReplayRepairPendingWorkItems(groupId, replayOverride, { at: options.generatedAt || options.generated_at || now() })
      : replay.repairWorkItems || summarizeReplayRepairPendingWorkItems(groupId);
    const requiredActionCount = Number(replay.repairPlan?.requiredActionCount || replay.repair_plan?.requiredActionCount || 0);
    const openItemCount = Number(workItems.openItemCount || 0);
    const coveredItemCount = openItemCount + Number(workItems.completedCount || 0);
    const status = requiredActionCount > 0
      ? coveredItemCount >= requiredActionCount ? "ok" : "fail"
      : openItemCount > 0 ? "warn" : "ok";
    rows.push({
      schema: "ccm-replay-repair-pending-work-item-group-v1",
      groupId,
      status,
      replayStatus: replay.status || "",
      replayScore: replay.score ?? null,
      requiredActionCount,
      openItemCount,
      coveredItemCount,
      total: Number(workItems.total || 0),
      pendingCount: Number(workItems.pendingCount || 0),
      inProgressCount: Number(workItems.inProgressCount || 0),
      blockedCount: Number(workItems.blockedCount || 0),
      completedCount: Number(workItems.completedCount || 0),
      file: workItems.file || getGroupCompactBoundaryReplayRepairWorkItemsFile(groupId),
      latestReplay: workItems.latestReplay || null,
      items: workItems.items || [],
      gaps: status === "fail" ? [{
        reason: `Replay repair actions=${requiredActionCount} 但 covered work items=${coveredItemCount}`,
      }] : [],
    });
  }
  const checkedRows = rows.filter(row => Number(row.requiredActionCount || 0) > 0 || Number(row.openItemCount || 0) > 0);
  const groupsNeedingWork = checkedRows.filter(row => Number(row.requiredActionCount || 0) > 0);
  const groupsCovered = groupsNeedingWork.filter(row => Number(row.coveredItemCount || 0) >= Number(row.requiredActionCount || 0));
  const coverageRate = groupsNeedingWork.length ? Math.round((groupsCovered.length / groupsNeedingWork.length) * 1000) / 10 : null;
  const status = coverageRate === null
    ? checkedRows.some(row => row.status === "warn") ? "warn" : "empty"
    : coverageRate >= 100 ? "ok" : coverageRate >= 75 ? "warn" : "fail";
  return {
    schema: "ccm-replay-repair-pending-work-item-report-v1",
    generatedAt: now(),
    overall: {
      status,
      coverageRate,
      groupCount: rows.length,
      checkedGroupCount: checkedRows.length,
      groupsNeedingWork: groupsNeedingWork.length,
      groupsCovered: groupsCovered.length,
      requiredActionCount: checkedRows.reduce((sum, row) => sum + Number(row.requiredActionCount || 0), 0),
      openItemCount: checkedRows.reduce((sum, row) => sum + Number(row.openItemCount || 0), 0),
      coveredItemCount: checkedRows.reduce((sum, row) => sum + Number(row.coveredItemCount || 0), 0),
      completedCount: checkedRows.reduce((sum, row) => sum + Number(row.completedCount || 0), 0),
    },
    groups: rows.sort((a, b) => Number(b.openItemCount || 0) - Number(a.openItemCount || 0)).slice(0, 50),
    weakGroups: rows.filter(row => row.status === "fail" || row.status === "warn").slice(0, 20),
  };
}

function evaluateReplayRepairPendingWorkItems(options: any = {}) {
  const report = buildReplayRepairPendingWorkItemReport(options);
  const checked = Number(report.overall.checkedGroupCount || 0);
  const passed = checked === 0
    ? 0
    : (report.groups || []).filter((row: any) => (Number(row.requiredActionCount || 0) > 0 || Number(row.openItemCount || 0) > 0) && row.status === "ok").length;
  const evidence = (report.groups || []).filter((row: any) => row.status === "ok" && Number(row.openItemCount || 0) > 0).slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    requiredActionCount: row.requiredActionCount,
    openItemCount: row.openItemCount,
    coveredItemCount: row.coveredItemCount,
    file: row.file,
  }));
  const gaps = (report.weakGroups || []).slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    reason: row.gaps?.[0]?.reason || (row.openItemCount > 0 ? "存在未完成 replay repair work items" : "repair plan 未物化为 pending work items"),
    requiredActionCount: row.requiredActionCount,
    openItemCount: row.openItemCount,
    coveredItemCount: row.coveredItemCount,
  }));
  const check: any = makeQualityCheck(
    "replay_repair_pending_work_items",
    "Replay 修复待办",
    checked,
    passed,
    evidence,
    gaps,
    "把 compact boundary replay 的修复动作物化为群聊主 Agent 可读的 sidecar work items；不自动创建真实任务，避免打开诊断页污染任务队列。"
  );
  check.report = report;
  return check;
}

function replayRepairDispatchCandidateGroupIds(options: any = {}) {
  const explicit = Array.isArray(options.groupIds || options.group_ids)
    ? (options.groupIds || options.group_ids).map((item: any) => String(item || "").trim()).filter(Boolean)
    : null;
  if (explicit?.length) return explicit;
  return listJsonFiles(GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR)
    .map(file => {
      const ledger = readJson(file, null);
      return String(ledger?.groupId || path.basename(file, ".json") || "").trim();
    })
    .filter(Boolean);
}

function buildReplayRepairDispatchCandidateReport(options: any = {}) {
  const groupIds = replayRepairDispatchCandidateGroupIds(options);
  const rows = groupIds.map((groupId: string) => {
    const summary = buildReplayRepairMainAgentDispatchCandidates(groupId, { limit: options.limit || 12 });
    const ledger = readGroupCompactBoundaryReplayRepairWorkItems(groupId);
    const openItems = (Array.isArray(ledger.items) ? ledger.items : []).filter((item: any) => replayRepairWorkItemOpen(item.status));
    const claimedItems = openItems.filter((item: any) => replayRepairWorkItemStatus(item.status) === "in_progress" && String(item.owner || "") === "group-main-agent");
    const dispatchMarkedItems = openItems.filter((item: any) => String(item.dispatch_target || item.dispatchTarget || "").trim());
    const highPriorityPendingItems = openItems.filter((item: any) => replayRepairWorkItemStatus(item.status) === "pending" && ["critical", "high"].includes(String(item.priority || "").toLowerCase()));
    const expectedCandidateCount = new Set([
      ...claimedItems,
      ...dispatchMarkedItems,
      ...highPriorityPendingItems,
    ].map((item: any) => String(item.id || item.work_item_id || ""))).size;
    const candidateWorkIds = new Set((summary.candidates || []).map((candidate: any) => String(candidate.work_item_id || "")));
    const missing = [...claimedItems, ...dispatchMarkedItems, ...highPriorityPendingItems]
      .filter((item: any) => !candidateWorkIds.has(String(item.id || item.work_item_id || "")));
    const status = expectedCandidateCount === 0
      ? "empty"
      : missing.length === 0 ? "ok" : summary.candidateCount > 0 ? "warn" : "fail";
    return {
      schema: "ccm-replay-repair-dispatch-candidate-group-v1",
      groupId,
      status,
      file: summary.file,
      updatedAt: summary.updatedAt,
      expectedCandidateCount,
      candidateCount: summary.candidateCount,
      claimedCount: summary.claimedCount,
      dispatchMarkedCount: summary.dispatchMarkedCount,
      criticalCount: summary.criticalCount,
      readyCount: summary.readyCount,
      candidates: summary.candidates,
      gaps: missing.slice(0, 8).map((item: any) => ({
        work_item_id: item.id || item.work_item_id || "",
        reason: "已认领/已派发/高优先级 replay repair work item 未进入主 Agent 派发候选",
        status: replayRepairWorkItemStatus(item.status),
        priority: item.priority || "",
        dispatch_target: item.dispatch_target || item.dispatchTarget || "",
      })),
    };
  });
  const checkedRows = rows.filter(row => Number(row.expectedCandidateCount || 0) > 0);
  const passedRows = checkedRows.filter(row => row.status === "ok");
  const coverageRate = checkedRows.length ? Math.round((passedRows.length / checkedRows.length) * 1000) / 10 : null;
  const status = coverageRate === null
    ? "empty"
    : coverageRate >= 100 ? "ok" : coverageRate >= 75 ? "warn" : "fail";
  return {
    schema: "ccm-replay-repair-dispatch-candidate-report-v1",
    generatedAt: now(),
    overall: {
      status,
      coverageRate,
      groupCount: rows.length,
      checkedGroupCount: checkedRows.length,
      groupsCovered: passedRows.length,
      expectedCandidateCount: checkedRows.reduce((sum, row) => sum + Number(row.expectedCandidateCount || 0), 0),
      candidateCount: checkedRows.reduce((sum, row) => sum + Number(row.candidateCount || 0), 0),
      readyCount: checkedRows.reduce((sum, row) => sum + Number(row.readyCount || 0), 0),
      dispatchMarkedCount: checkedRows.reduce((sum, row) => sum + Number(row.dispatchMarkedCount || 0), 0),
    },
    groups: rows.sort((a, b) => Number(b.readyCount || 0) - Number(a.readyCount || 0)).slice(0, 50),
    weakGroups: rows.filter(row => row.status === "fail" || row.status === "warn").slice(0, 20),
  };
}

function evaluateReplayRepairDispatchCandidates(options: any = {}) {
  const report = buildReplayRepairDispatchCandidateReport(options);
  const checked = Number(report.overall.checkedGroupCount || 0);
  const passed = Number(report.overall.groupsCovered || 0);
  const evidence = (report.groups || []).filter((row: any) => row.status === "ok").slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    candidateCount: row.candidateCount,
    readyCount: row.readyCount,
    dispatchMarkedCount: row.dispatchMarkedCount,
    file: row.file,
  }));
  const gaps = (report.weakGroups || []).flatMap((row: any) => (row.gaps || []).slice(0, 3).map((gap: any) => ({
    groupId: row.groupId,
    reason: gap.reason || "Replay repair 派发候选缺失",
    work_item_id: gap.work_item_id || "",
    status: gap.status || "",
    priority: gap.priority || "",
  }))).slice(0, 12);
  const check: any = makeQualityCheck(
    "replay_repair_dispatch_candidates",
    "Replay 修复派发候选",
    checked,
    passed,
    evidence,
    gaps,
    "把已认领/已派发/高优先级 replay repair work items 转成群聊主 Agent 可读候选；只作为规划上下文，不自动创建真实任务。"
  );
  check.report = report;
  return check;
}

function buildCompactFileReferenceReadPlanRevalidationRepairWorkItemReport(options: any = {}) {
  const revalidationReport = buildCompactFileReferenceReadPlanRevalidationGateReport(options);
  const rows = (revalidationReport.groups || []).map((group: any) => {
    const groupId = String(group.groupId || "");
    const workItems = syncCompactFileReferenceReadPlanRevalidationRepairWorkItems(groupId, group, { at: options.generatedAt || options.generated_at || now() });
    const ledger = readGroupCompactBoundaryReplayRepairWorkItems(groupId);
    const revalidationItems = (Array.isArray(ledger.items) ? ledger.items : [])
      .filter((item: any) => String(item.source || "") === "compact_read_plan_revalidation_repair");
    const openItems = revalidationItems.filter((item: any) => replayRepairWorkItemOpen(item.status));
    const completedItems = revalidationItems.filter((item: any) => replayRepairWorkItemStatus(item.status) === "completed");
    const requiredActionCount = Number(group.gaps?.length || 0);
    const coveredItemCount = requiredActionCount > 0 ? openItems.length + completedItems.length : completedItems.length;
    const status = requiredActionCount > 0
      ? coveredItemCount >= requiredActionCount ? "ok" : "fail"
      : openItems.length > 0 ? "warn" : "ok";
    return {
      schema: "ccm-read-plan-revalidation-repair-work-item-group-v1",
      groupId,
      status,
      gateId: group.gateId || group.gate?.revalidation_gate_id || "",
      revalidationStatus: group.status || "",
      requiredActionCount,
      openItemCount: openItems.length,
      coveredItemCount,
      total: revalidationItems.length,
      pendingCount: revalidationItems.filter((item: any) => replayRepairWorkItemStatus(item.status) === "pending").length,
      inProgressCount: revalidationItems.filter((item: any) => replayRepairWorkItemStatus(item.status) === "in_progress").length,
      completedCount: completedItems.length,
      sessionMismatchCount: revalidationItems.filter((item: any) => item.session_mismatch === true).length,
      file: workItems.file || getGroupCompactBoundaryReplayRepairWorkItemsFile(groupId),
      items: revalidationItems.slice(0, 12).map((item: any) => ({
        id: item.id || item.work_item_id || "",
        status: replayRepairWorkItemStatus(item.status),
        priority: item.priority || "",
        target_project: item.target_project || "",
        revalidation_gate_id: item.revalidation_gate_id || "",
        read_plan_id: item.read_plan_id || "",
        expected_task_agent_session_id: item.expected_task_agent_session_id || "",
        receipt_task_agent_session_id: item.receipt_task_agent_session_id || "",
        session_mismatch: item.session_mismatch === true,
        instruction: compactMemoryCenterText(item.instruction || "", 260),
      })),
      gaps: status === "fail" ? [{
        reason: `Read plan revalidation gaps=${requiredActionCount} 但 repair work items covered=${coveredItemCount}`,
        gateId: group.gateId || "",
      }] : [],
    };
  });
  const checkedRows = rows.filter(row => Number(row.requiredActionCount || 0) > 0 || Number(row.openItemCount || 0) > 0);
  const groupsNeedingWork = checkedRows.filter(row => Number(row.requiredActionCount || 0) > 0);
  const groupsCovered = groupsNeedingWork.filter(row => Number(row.coveredItemCount || 0) >= Number(row.requiredActionCount || 0));
  const coverageRate = groupsNeedingWork.length ? Math.round((groupsCovered.length / groupsNeedingWork.length) * 1000) / 10 : null;
  const status = coverageRate === null
    ? checkedRows.some(row => row.status === "warn") ? "warn" : "empty"
    : coverageRate >= 100 ? "ok" : coverageRate >= 75 ? "warn" : "fail";
  return {
    schema: "ccm-read-plan-revalidation-repair-work-item-report-v1",
    generatedAt: now(),
    overall: {
      status,
      coverageRate,
      groupCount: rows.length,
      checkedGroupCount: checkedRows.length,
      groupsNeedingWork: groupsNeedingWork.length,
      groupsCovered: groupsCovered.length,
      requiredActionCount: checkedRows.reduce((sum, row) => sum + Number(row.requiredActionCount || 0), 0),
      openItemCount: checkedRows.reduce((sum, row) => sum + Number(row.openItemCount || 0), 0),
      coveredItemCount: checkedRows.reduce((sum, row) => sum + Number(row.coveredItemCount || 0), 0),
      sessionMismatchCount: checkedRows.reduce((sum, row) => sum + Number(row.sessionMismatchCount || 0), 0),
    },
    groups: rows.sort((a, b) => Number(b.openItemCount || 0) - Number(a.openItemCount || 0)).slice(0, 50),
    weakGroups: rows.filter(row => row.status === "fail" || row.status === "warn").slice(0, 20),
  };
}

function evaluateCompactFileReferenceReadPlanRevalidationRepairWorkItems(options: any = {}) {
  const report = buildCompactFileReferenceReadPlanRevalidationRepairWorkItemReport(options);
  const checked = Number(report.overall.checkedGroupCount || 0);
  const passed = checked === 0
    ? 0
    : (report.groups || []).filter((row: any) => (Number(row.requiredActionCount || 0) > 0 || Number(row.openItemCount || 0) > 0) && row.status === "ok").length;
  const evidence = (report.groups || []).filter((row: any) => row.status === "ok" && Number(row.openItemCount || 0) > 0).slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    gateId: row.gateId,
    requiredActionCount: row.requiredActionCount,
    openItemCount: row.openItemCount,
    file: row.file,
  }));
  const gaps = (report.weakGroups || []).slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    gateId: row.gateId,
    reason: row.gaps?.[0]?.reason || "read plan revalidation repair work item 缺失",
    requiredActionCount: row.requiredActionCount,
    openItemCount: row.openItemCount,
    coveredItemCount: row.coveredItemCount,
  }));
  const check: any = makeQualityCheck(
    "compact_file_reference_read_plan_revalidation_repair_work_items",
    "读取计划重读修复待办",
    checked,
    passed,
    evidence,
    gaps,
    "当 compact read plan revalidation gate 失败或回执会话不匹配时，把缺口物化为群聊主 Agent 可读 sidecar work items，并进入派发候选上下文。"
  );
  check.report = report;
  return check;
}

function buildGroupSessionMemorySnapshotReport(options: any = {}) {
  const explicitGroupIds = Array.isArray(options.groupIds || options.group_ids)
    ? (options.groupIds || options.group_ids).map((item: any) => String(item || "").trim()).filter(Boolean)
    : null;
  const files = explicitGroupIds?.length
    ? explicitGroupIds.map((id: string) => path.join(GROUP_MEMORY_DIR, `${id}.json`))
    : listJsonFiles(GROUP_MEMORY_DIR);
  const rows = files.map(file => {
    const fileGroupId = path.basename(file, ".json");
    const memory = readMemoryFile(file) || { groupId: fileGroupId };
    const groupId = String(memory.groupId || fileGroupId);
    const snapshot = readGroupSessionMemorySnapshotForCenter(groupId);
    const requiresSnapshot = !!String(memory.messageDigest || "").trim()
      || !!memory.conversationSummary
      || Number(memory.compaction?.compactedMessageCount || memory.messageCompression?.compressedMessages || 0) > 0;
    const snapshotExists = fs.existsSync(snapshot.snapshotFile || getGroupSessionMemorySnapshotFile(groupId));
    const markdownExists = snapshot.markdownExists === true;
    const checksumMatches = snapshot.markdownChecksumMatches === true;
    const hasSummary = snapshot.hasSummary === true || !!String(snapshot.markdownExcerpt || "").trim();
    const status = !requiresSnapshot
      ? "empty"
      : snapshotExists && markdownExists && checksumMatches && hasSummary ? "ok"
      : snapshotExists && markdownExists && hasSummary ? "warn"
      : "fail";
    const gaps = [];
    if (requiresSnapshot && !snapshotExists) gaps.push({ reason: "缺少 group session memory snapshot.json" });
    if (requiresSnapshot && !markdownExists) gaps.push({ reason: "缺少 group session memory summary.md" });
    if (requiresSnapshot && markdownExists && !checksumMatches) gaps.push({ reason: "summary.md checksum 与 snapshot.json 不一致" });
    if (requiresSnapshot && !hasSummary) gaps.push({ reason: "group session memory 缺少可注入摘要内容" });
    return {
      schema: "ccm-group-session-memory-snapshot-row-v1",
      groupId,
      status,
      requiresSnapshot,
      snapshotExists,
      markdownExists,
      checksumMatches,
      hasSummary,
      compactedMessageCount: Number(memory.compaction?.compactedMessageCount || memory.messageCompression?.compressedMessages || 0),
      summaryFile: snapshot.summaryFile || getGroupSessionMemoryMarkdownFile(groupId),
      snapshotFile: snapshot.snapshotFile || getGroupSessionMemorySnapshotFile(groupId),
      markdownChars: Number(snapshot.markdownChars || 0),
      lastSummarizedMessageId: snapshot.lastSummarizedMessageId || "",
      summaryChecksum: snapshot.summaryChecksum || "",
      markdownChecksum: snapshot.markdownChecksum || "",
      gaps,
    };
  });
  const checkedRows = rows.filter(row => row.requiresSnapshot);
  const passedRows = checkedRows.filter(row => row.status === "ok");
  const coverageRate = checkedRows.length ? Math.round((passedRows.length / checkedRows.length) * 1000) / 10 : null;
  const status = coverageRate === null
    ? "empty"
    : coverageRate >= 100 ? "ok" : coverageRate >= 75 ? "warn" : "fail";
  return {
    schema: "ccm-group-session-memory-snapshot-report-v1",
    generatedAt: now(),
    overall: {
      status,
      coverageRate,
      groupCount: rows.length,
      checkedGroupCount: checkedRows.length,
      groupsCovered: passedRows.length,
      missingSnapshotCount: checkedRows.filter(row => !row.snapshotExists).length,
      missingMarkdownCount: checkedRows.filter(row => !row.markdownExists).length,
      checksumMismatchCount: checkedRows.filter(row => row.markdownExists && !row.checksumMatches).length,
    },
    groups: rows.sort((a, b) => Number(b.compactedMessageCount || 0) - Number(a.compactedMessageCount || 0)).slice(0, 50),
    weakGroups: rows.filter(row => row.status === "fail" || row.status === "warn").slice(0, 20),
  };
}

function evaluateGroupSessionMemorySnapshots(options: any = {}) {
  const report = buildGroupSessionMemorySnapshotReport(options);
  const checked = Number(report.overall.checkedGroupCount || 0);
  const passed = Number(report.overall.groupsCovered || 0);
  const evidence = (report.groups || []).filter((row: any) => row.status === "ok").slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    summaryFile: row.summaryFile,
    snapshotFile: row.snapshotFile,
    markdownChars: row.markdownChars,
    lastSummarizedMessageId: row.lastSummarizedMessageId,
  }));
  const gaps = (report.weakGroups || []).flatMap((row: any) => (row.gaps || []).slice(0, 3).map((gap: any) => ({
    groupId: row.groupId,
    reason: gap.reason || "group session memory snapshot 异常",
    summaryFile: row.summaryFile,
    snapshotFile: row.snapshotFile,
  }))).slice(0, 12);
  const check: any = makeQualityCheck(
    "group_session_memory_snapshot",
    "Group Session Memory 快照",
    checked,
    passed,
    evidence,
    gaps,
    "对齐 Claude Code Session Memory：压缩后的群聊会话摘要必须落到稳定 summary.md/snapshot.json，并可被主 Agent、全局 Agent 和子 Agent 上下文重注入。"
  );
  check.report = report;
  return check;
}

function memoryCenterToolSet(...sets: any[]) {
  const merged = { mcp: new Set<string>(), skill: new Set<string>() };
  for (const set of sets || []) {
    const source = set && typeof set === "object" ? set : {};
    for (const item of Array.isArray(source.mcp) ? source.mcp : []) {
      const value = String(item || "").trim();
      if (value) merged.mcp.add(value);
    }
    for (const item of Array.isArray(source.skill) ? source.skill : []) {
      const value = String(item || "").trim();
      if (value) merged.skill.add(value);
    }
  }
  return { mcp: Array.from(merged.mcp), skill: Array.from(merged.skill) };
}

function memoryCenterToolSetCount(set: any = {}) {
  return (Array.isArray(set.mcp) ? set.mcp.length : 0) + (Array.isArray(set.skill) ? set.skill.length : 0);
}

function configuredToolsForGroupQuality(groupId: string, memory: any = {}, groupById: Map<string, any>, projectConfigs: any = {}) {
  const group = groupById.get(String(groupId));
  const memberTools = (Array.isArray(group?.members) ? group.members : []).flatMap((member: any) => {
    const project = String(member?.project || "").trim();
    return [
      member?.tools || {},
      project ? projectConfigs?.[project]?.tools || {} : {},
    ];
  });
  return memoryCenterToolSet(memory.tools || memory.allowedTools || memory.allowed_tools || {}, group?.tools || {}, ...memberTools);
}

function memoryHasRuntimeToolContinuityEvidence(memory: any = {}) {
  return (Array.isArray(memory.workerLedger) ? memory.workerLedger : []).some((item: any) => {
    const text = JSON.stringify(item || {});
    return /runtimeToolSnapshot|runtime_tool_snapshot|runtimeToolSync|runtime_tool_sync|invokedSkills|invoked_skills|allowedTools|allowed_tools/.test(text);
  });
}

function buildGroupToolContinuitySnapshotReport(options: any = {}) {
  const explicitGroupIds = Array.isArray(options.groupIds || options.group_ids)
    ? (options.groupIds || options.group_ids).map((item: any) => String(item || "").trim()).filter(Boolean)
    : null;
  const files = explicitGroupIds?.length
    ? explicitGroupIds.map((id: string) => path.join(GROUP_MEMORY_DIR, `${id}.json`))
    : listJsonFiles(GROUP_MEMORY_DIR);
  let groups: any[] = [];
  try {
    groups = require("../collaboration/storage").loadGroups();
  } catch {}
  const groupById = new Map(groups.map((group: any) => [String(group?.id || ""), group]));
  let projectConfigs: any = {};
  try {
    projectConfigs = loadProjectConfigs();
  } catch {}
  const rows = files.map(file => {
    const fileGroupId = path.basename(file, ".json");
    const memory = readMemoryFile(file) || { groupId: fileGroupId };
    const groupId = String(memory.groupId || fileGroupId);
    const snapshot = readGroupToolContinuitySnapshotForCenter(groupId);
    const configuredTools = configuredToolsForGroupQuality(groupId, memory, groupById, projectConfigs);
    const snapshotExists = fs.existsSync(snapshot.snapshotFile || getGroupToolContinuitySnapshotFile(groupId));
    const markdownExists = snapshot.markdownExists === true;
    const checksumMatches = snapshot.markdownChecksumMatches === true;
    const contextOnly = snapshot.shouldReuseAsContext === true && snapshot.shouldBypassAuthorization !== true;
    const allowedCount = memoryCenterToolSetCount(snapshot.allowedTools);
    const requestedCount = memoryCenterToolSetCount(snapshot.requested);
    const syncedCount = memoryCenterToolSetCount(snapshot.synced);
    const missingCount = memoryCenterToolSetCount(snapshot.missing);
    const invokedSkillCount = Array.isArray(snapshot.invokedSkills) ? snapshot.invokedSkills.length : 0;
    const configuredCount = memoryCenterToolSetCount(configuredTools);
    const hasRuntimeEvidence = snapshot.hasRuntimeEvidence === true || memoryHasRuntimeToolContinuityEvidence(memory);
    const hasContinuity = allowedCount + requestedCount + syncedCount + missingCount + invokedSkillCount > 0 || hasRuntimeEvidence;
    const requiresSnapshot = configuredCount > 0 || hasRuntimeEvidence || memory.toolContinuity?.schema;
    const status = !requiresSnapshot
      ? "empty"
      : snapshotExists && markdownExists && checksumMatches && contextOnly && hasContinuity ? "ok"
      : snapshotExists && contextOnly && hasContinuity ? "warn"
      : "fail";
    const gaps = [];
    if (requiresSnapshot && !snapshotExists) gaps.push({ reason: "缺少 group tool continuity snapshot.json" });
    if (requiresSnapshot && !markdownExists) gaps.push({ reason: "缺少 group tool continuity summary.md" });
    if (requiresSnapshot && markdownExists && !checksumMatches) gaps.push({ reason: "summary.md checksum 与 snapshot.json 不一致" });
    if (requiresSnapshot && !contextOnly) gaps.push({ reason: "工具/技能连续性快照必须只作为上下文，不能声明绕过授权" });
    if (requiresSnapshot && !hasContinuity) gaps.push({ reason: "工具/技能连续性快照缺少 allowed/requested/synced/missing/invoked 证据" });
    return {
      schema: "ccm-group-tool-continuity-snapshot-row-v1",
      groupId,
      status,
      requiresSnapshot,
      snapshotExists,
      markdownExists,
      checksumMatches,
      contextOnly,
      configuredCount,
      allowedCount,
      requestedCount,
      syncedCount,
      missingCount,
      invokedSkillCount,
      hasRuntimeEvidence,
      summaryFile: snapshot.summaryFile || getGroupToolContinuityMarkdownFile(groupId),
      snapshotFile: snapshot.snapshotFile || getGroupToolContinuitySnapshotFile(groupId),
      markdownChars: Number(snapshot.markdownChars || 0),
      snapshotChecksum: snapshot.snapshotChecksum || "",
      markdownChecksum: snapshot.markdownChecksum || "",
      statusText: snapshot.status || "",
      gaps,
    };
  });
  const checkedRows = rows.filter(row => row.requiresSnapshot);
  const passedRows = checkedRows.filter(row => row.status === "ok");
  const coverageRate = checkedRows.length ? Math.round((passedRows.length / checkedRows.length) * 1000) / 10 : null;
  const status = coverageRate === null
    ? "empty"
    : coverageRate >= 100 ? "ok" : coverageRate >= 75 ? "warn" : "fail";
  return {
    schema: "ccm-group-tool-continuity-snapshot-report-v1",
    generatedAt: now(),
    overall: {
      status,
      coverageRate,
      groupCount: rows.length,
      checkedGroupCount: checkedRows.length,
      groupsCovered: passedRows.length,
      configuredToolCount: checkedRows.reduce((sum, row) => sum + Number(row.configuredCount || 0), 0),
      allowedToolCount: checkedRows.reduce((sum, row) => sum + Number(row.allowedCount || 0), 0),
      missingToolCount: checkedRows.reduce((sum, row) => sum + Number(row.missingCount || 0), 0),
      invokedSkillCount: checkedRows.reduce((sum, row) => sum + Number(row.invokedSkillCount || 0), 0),
    },
    groups: rows.sort((a, b) => Number(b.allowedCount + b.invokedSkillCount || 0) - Number(a.allowedCount + a.invokedSkillCount || 0)).slice(0, 50),
    weakGroups: rows.filter(row => row.status === "fail" || row.status === "warn").slice(0, 20),
  };
}

function evaluateGroupToolContinuitySnapshots(options: any = {}) {
  const report = buildGroupToolContinuitySnapshotReport(options);
  const checked = Number(report.overall.checkedGroupCount || 0);
  const passed = Number(report.overall.groupsCovered || 0);
  const evidence = (report.groups || []).filter((row: any) => row.status === "ok").slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    summaryFile: row.summaryFile,
    snapshotFile: row.snapshotFile,
    allowedCount: row.allowedCount,
    missingCount: row.missingCount,
    invokedSkillCount: row.invokedSkillCount,
  }));
  const gaps = (report.weakGroups || []).flatMap((row: any) => (row.gaps || []).slice(0, 3).map((gap: any) => ({
    groupId: row.groupId,
    reason: gap.reason || "group tool continuity snapshot 异常",
    summaryFile: row.summaryFile,
    snapshotFile: row.snapshotFile,
  }))).slice(0, 12);
  const check: any = makeQualityCheck(
    "group_tool_continuity_snapshot",
    "工具/技能连续性快照",
    checked,
    passed,
    evidence,
    gaps,
    "对齐 Claude Code 的 discovered tools / invoked skills 保留：压缩后必须把工具、技能、缺失项作为上下文恢复，但不能绕过当前授权与 runtime tool gate。"
  );
  check.report = report;
  return check;
}

function buildCompactFileReferenceReport(options: any = {}) {
  const explicitGroupIds = Array.isArray(options.groupIds || options.group_ids)
    ? (options.groupIds || options.group_ids).map((item: any) => String(item || "").trim()).filter(Boolean)
    : null;
  const files = explicitGroupIds?.length
    ? explicitGroupIds.map((id: string) => path.join(GROUP_MEMORY_DIR, `${id}.json`))
    : listJsonFiles(GROUP_MEMORY_DIR);
  let memoryApi: any = {};
  try {
    memoryApi = require("../collaboration/memory");
  } catch {}
  const rows = files.map(file => {
    const fileGroupId = path.basename(file, ".json");
    const memory = readMemoryFile(file) || { groupId: fileGroupId };
    const groupId = String(memory.groupId || fileGroupId);
    const sessionMemory = memory?.sessionMemory?.schema ? memory.sessionMemory : readGroupSessionMemorySnapshotForCenter(groupId);
    const toolContinuity = memory?.toolContinuity?.schema ? memory.toolContinuity : readGroupToolContinuitySnapshotForCenter(groupId);
    const refs = typeof memoryApi.buildGroupCompactFileReferences === "function"
      ? memoryApi.buildGroupCompactFileReferences(groupId, {
        sessionMemory,
        toolContinuity,
        rawSources: {
          group_memory_file: path.join(GROUP_MEMORY_DIR, `${groupId}.json`),
          group_messages_file: path.join(GROUP_MESSAGES_DIR, `${groupId}.json`),
          group_session_memory_snapshot_file: sessionMemory?.snapshotFile || getGroupSessionMemorySnapshotFile(groupId),
          group_session_memory_summary_file: sessionMemory?.summaryFile || getGroupSessionMemoryMarkdownFile(groupId),
          group_tool_continuity_snapshot_file: toolContinuity?.snapshotFile || getGroupToolContinuitySnapshotFile(groupId),
          group_tool_continuity_summary_file: toolContinuity?.summaryFile || getGroupToolContinuityMarkdownFile(groupId),
        },
      })
      : { schema: "ccm-group-compact-file-references-v1", references: [], referenceCount: 0, missingCount: 0 };
    const access = typeof memoryApi.summarizeGroupCompactFileReferenceAccess === "function"
      ? memoryApi.summarizeGroupCompactFileReferenceAccess(groupId, refs, memory)
      : { ledger_file: getGroupCompactFileReferenceLedgerFile(groupId), ledger_entry_count: 0, mentioned_count: 0, reference_count: refs.referenceCount || 0 };
    const referenceTypes = new Set((refs.references || []).map((item: any) => String(item.type || "")));
    const requiresReferences = Number(memory.compaction?.compactedMessageCount || memory.messageCompression?.compressedMessages || 0) > 0
      || sessionMemory?.schema === "ccm-group-session-memory-snapshot-v1"
      || toolContinuity?.schema === "ccm-group-tool-continuity-snapshot-v1";
    const hasRawSources = referenceTypes.has("group_memory_json") && referenceTypes.has("raw_group_messages_json");
    const hasCompactSource = referenceTypes.has("group_session_memory") || referenceTypes.has("typed_memory_index") || referenceTypes.has("tool_continuity_summary");
    const status = !requiresReferences
      ? "empty"
      : Number(refs.referenceCount || 0) >= 2 && hasRawSources && hasCompactSource ? "ok"
      : Number(refs.referenceCount || 0) >= 2 && hasRawSources ? "warn"
      : "fail";
    const gaps = [];
    if (requiresReferences && Number(refs.referenceCount || 0) < 2) gaps.push({ reason: "compact file references 数量不足" });
    if (requiresReferences && !hasRawSources) gaps.push({ reason: "缺少 group memory/raw messages 权威来源引用" });
    if (requiresReferences && !hasCompactSource) gaps.push({ reason: "缺少 session memory、typed MEMORY 或 tool continuity 压缩恢复来源引用" });
    if (Number(refs.missingCount || 0) > 0) gaps.push({ reason: `存在 ${refs.missingCount} 个缺失文件引用` });
    return {
      schema: "ccm-compact-file-reference-row-v1",
      groupId,
      status,
      requiresReferences,
      referenceCount: Number(refs.referenceCount || 0),
      missingCount: Number(refs.missingCount || 0),
      mentionedCount: Number(access.mentioned_count || 0),
      ledgerEntryCount: Number(access.ledger_entry_count || 0),
      ledgerFile: access.ledger_file || getGroupCompactFileReferenceLedgerFile(groupId),
      referenceTypes: Array.from(referenceTypes),
      references: (refs.references || []).slice(0, 12).map((item: any) => ({
        reference_id: item.reference_id || "",
        type: item.type || "",
        path: item.path || "",
        exists: item.exists === true,
      })),
      gaps,
    };
  });
  const checkedRows = rows.filter(row => row.requiresReferences);
  const passedRows = checkedRows.filter(row => row.status === "ok");
  const coverageRate = checkedRows.length ? Math.round((passedRows.length / checkedRows.length) * 1000) / 10 : null;
  const status = coverageRate === null
    ? "empty"
    : coverageRate >= 100 ? "ok" : coverageRate >= 75 ? "warn" : "fail";
  return {
    schema: "ccm-compact-file-reference-report-v1",
    generatedAt: now(),
    overall: {
      status,
      coverageRate,
      groupCount: rows.length,
      checkedGroupCount: checkedRows.length,
      groupsCovered: passedRows.length,
      referenceCount: checkedRows.reduce((sum, row) => sum + Number(row.referenceCount || 0), 0),
      missingCount: checkedRows.reduce((sum, row) => sum + Number(row.missingCount || 0), 0),
      mentionedCount: checkedRows.reduce((sum, row) => sum + Number(row.mentionedCount || 0), 0),
      ledgerEntryCount: checkedRows.reduce((sum, row) => sum + Number(row.ledgerEntryCount || 0), 0),
    },
    groups: rows.sort((a, b) => Number(b.referenceCount || 0) - Number(a.referenceCount || 0)).slice(0, 50),
    weakGroups: rows.filter(row => row.status === "fail" || row.status === "warn").slice(0, 20),
  };
}

function evaluateCompactFileReferences(options: any = {}) {
  const report = buildCompactFileReferenceReport(options);
  const checked = Number(report.overall.checkedGroupCount || 0);
  const passed = Number(report.overall.groupsCovered || 0);
  const evidence = (report.groups || []).filter((row: any) => row.status === "ok").slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    referenceCount: row.referenceCount,
    mentionedCount: row.mentionedCount,
    ledgerEntryCount: row.ledgerEntryCount,
    ledgerFile: row.ledgerFile,
  }));
  const gaps = (report.weakGroups || []).flatMap((row: any) => (row.gaps || []).slice(0, 3).map((gap: any) => ({
    groupId: row.groupId,
    reason: gap.reason || "compact file references 异常",
    ledgerFile: row.ledgerFile,
  }))).slice(0, 12);
  const check: any = makeQualityCheck(
    "compact_file_references",
    "压缩文件引用",
    checked,
    passed,
    evidence,
    gaps,
    "对齐 Claude Code compact_file_reference / sessionFileAccessHooks：压缩后把关键记忆来源作为可读文件引用暴露，并追踪子 Agent 是否声明使用。"
  );
  check.report = report;
  return check;
}

function buildCompactFileReferenceReadPlanReport(options: any = {}) {
  const explicitGroupIds = Array.isArray(options.groupIds || options.group_ids)
    ? (options.groupIds || options.group_ids).map((item: any) => String(item || "").trim()).filter(Boolean)
    : null;
  const files = explicitGroupIds?.length
    ? explicitGroupIds.map((id: string) => path.join(GROUP_MEMORY_DIR, `${id}.json`))
    : listJsonFiles(GROUP_MEMORY_DIR);
  let memoryApi: any = {};
  try {
    memoryApi = require("../collaboration/memory");
  } catch {}
  const rows = files.map(file => {
    const fileGroupId = path.basename(file, ".json");
    const memory = readMemoryFile(file) || { groupId: fileGroupId };
    const groupId = String(memory.groupId || fileGroupId);
    const sessionMemory = memory?.sessionMemory?.schema ? memory.sessionMemory : readGroupSessionMemorySnapshotForCenter(groupId);
    const toolContinuity = memory?.toolContinuity?.schema ? memory.toolContinuity : readGroupToolContinuitySnapshotForCenter(groupId);
    const refs = typeof memoryApi.buildGroupCompactFileReferences === "function"
      ? memoryApi.buildGroupCompactFileReferences(groupId, {
        sessionMemory,
        toolContinuity,
        rawSources: {
          group_memory_file: path.join(GROUP_MEMORY_DIR, `${groupId}.json`),
          group_messages_file: path.join(GROUP_MESSAGES_DIR, `${groupId}.json`),
          group_session_memory_snapshot_file: sessionMemory?.snapshotFile || getGroupSessionMemorySnapshotFile(groupId),
          group_session_memory_summary_file: sessionMemory?.summaryFile || getGroupSessionMemoryMarkdownFile(groupId),
          group_tool_continuity_snapshot_file: toolContinuity?.snapshotFile || getGroupToolContinuitySnapshotFile(groupId),
          group_tool_continuity_summary_file: toolContinuity?.summaryFile || getGroupToolContinuityMarkdownFile(groupId),
        },
      })
      : { schema: "ccm-group-compact-file-references-v1", references: [] };
    const readPlan = typeof memoryApi.buildGroupCompactFileReferenceReadPlan === "function"
      ? memoryApi.buildGroupCompactFileReferenceReadPlan(groupId, refs, { maxEntries: 10 })
      : { schema: "ccm-group-compact-file-reference-read-plan-v1", entries: [], plannedCount: 0 };
    const requiresPlan = Number(refs.referenceCount || 0) > 0;
    const hasSourceOfTruth = readPlan.hasSourceOfTruth === true || (readPlan.entries || []).some((entry: any) => ["raw_group_messages_json", "group_memory_json"].includes(String(entry.type || "")));
    const hasCompactSummary = readPlan.hasCompactSummary === true || (readPlan.entries || []).some((entry: any) => ["group_session_memory", "typed_memory_index", "tool_continuity_summary"].includes(String(entry.type || "")));
    const hasReceiptContract = (readPlan.entries || []).some((entry: any) => String(entry.receipt || "").includes("memoryUsed"));
    const plannedCount = Number(readPlan.plannedCount || (readPlan.entries || []).filter((entry: any) => entry.action !== "skip_missing").length || 0);
    const status = !requiresPlan
      ? "empty"
      : plannedCount >= 2 && hasSourceOfTruth && hasCompactSummary && hasReceiptContract ? "ok"
      : plannedCount >= 2 && hasSourceOfTruth ? "warn"
      : "fail";
    const gaps = [];
    if (requiresPlan && plannedCount < 2) gaps.push({ reason: "compact file reference read plan 可执行条目不足" });
    if (requiresPlan && !hasSourceOfTruth) gaps.push({ reason: "read plan 缺少 raw messages 或 group memory source-of-truth 入口" });
    if (requiresPlan && !hasCompactSummary) gaps.push({ reason: "read plan 缺少 Session Memory、typed MEMORY 或 tool continuity 摘要入口" });
    if (requiresPlan && !hasReceiptContract) gaps.push({ reason: "read plan 条目缺少 memoryUsed/memoryIgnored 回执要求" });
    return {
      schema: "ccm-compact-file-reference-read-plan-row-v1",
      groupId,
      status,
      requiresPlan,
      sourceReferenceCount: Number(readPlan.sourceReferenceCount || refs.referenceCount || 0),
      plannedCount,
      missingCount: Number(readPlan.missingCount || 0),
      hasSourceOfTruth,
      hasCompactSummary,
      hasReceiptContract,
      entries: (readPlan.entries || []).slice(0, 12).map((entry: any) => ({
        read_plan_id: entry.read_plan_id || "",
        reference_id: entry.reference_id || "",
        type: entry.type || "",
        action: entry.action || "",
        priority: Number(entry.priority || 0),
        path: entry.path || "",
      })),
      gaps,
    };
  });
  const checkedRows = rows.filter(row => row.requiresPlan);
  const passedRows = checkedRows.filter(row => row.status === "ok");
  const coverageRate = checkedRows.length ? Math.round((passedRows.length / checkedRows.length) * 1000) / 10 : null;
  const status = coverageRate === null
    ? "empty"
    : coverageRate >= 100 ? "ok" : coverageRate >= 75 ? "warn" : "fail";
  return {
    schema: "ccm-compact-file-reference-read-plan-report-v1",
    generatedAt: now(),
    overall: {
      status,
      coverageRate,
      groupCount: rows.length,
      checkedGroupCount: checkedRows.length,
      groupsCovered: passedRows.length,
      plannedCount: checkedRows.reduce((sum, row) => sum + Number(row.plannedCount || 0), 0),
      missingCount: checkedRows.reduce((sum, row) => sum + Number(row.missingCount || 0), 0),
    },
    groups: rows.sort((a, b) => Number(b.plannedCount || 0) - Number(a.plannedCount || 0)).slice(0, 50),
    weakGroups: rows.filter(row => row.status === "fail" || row.status === "warn").slice(0, 20),
  };
}

function evaluateCompactFileReferenceReadPlan(options: any = {}) {
  const report = buildCompactFileReferenceReadPlanReport(options);
  const checked = Number(report.overall.checkedGroupCount || 0);
  const passed = Number(report.overall.groupsCovered || 0);
  const evidence = (report.groups || []).filter((row: any) => row.status === "ok").slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    plannedCount: row.plannedCount,
    hasSourceOfTruth: row.hasSourceOfTruth,
    hasCompactSummary: row.hasCompactSummary,
  }));
  const gaps = (report.weakGroups || []).flatMap((row: any) => (row.gaps || []).slice(0, 3).map((gap: any) => ({
    groupId: row.groupId,
    reason: gap.reason || "compact file reference read plan 异常",
  }))).slice(0, 12);
  const check: any = makeQualityCheck(
    "compact_file_reference_read_plan",
    "压缩文件引用读取计划",
    checked,
    passed,
    evidence,
    gaps,
    "对齐 Claude Code post-compact file attachment：压缩后给子 Agent 明确的按需读取顺序、source-of-truth 入口和回执要求。"
  );
  check.report = report;
  return check;
}

function buildCompactFileReferenceReadPlanFreshnessReport(options: any = {}) {
  const explicitGroupIds = Array.isArray(options.groupIds || options.group_ids)
    ? (options.groupIds || options.group_ids).map((item: any) => String(item || "").trim()).filter(Boolean)
    : null;
  const files = explicitGroupIds?.length
    ? explicitGroupIds.map((id: string) => path.join(GROUP_MEMORY_DIR, `${id}.json`))
    : listJsonFiles(GROUP_MEMORY_DIR);
  let memoryApi: any = {};
  try {
    memoryApi = require("../collaboration/memory");
  } catch {}
  const rows = files.map(file => {
    const fileGroupId = path.basename(file, ".json");
    const memory = readMemoryFile(file) || { groupId: fileGroupId };
    const groupId = String(memory.groupId || fileGroupId);
    const sessionMemory = memory?.sessionMemory?.schema ? memory.sessionMemory : readGroupSessionMemorySnapshotForCenter(groupId);
    const toolContinuity = memory?.toolContinuity?.schema ? memory.toolContinuity : readGroupToolContinuitySnapshotForCenter(groupId);
    const refs = typeof memoryApi.buildGroupCompactFileReferences === "function"
      ? memoryApi.buildGroupCompactFileReferences(groupId, {
        sessionMemory,
        toolContinuity,
        rawSources: {
          group_memory_file: path.join(GROUP_MEMORY_DIR, `${groupId}.json`),
          group_messages_file: path.join(GROUP_MESSAGES_DIR, `${groupId}.json`),
          group_session_memory_snapshot_file: sessionMemory?.snapshotFile || getGroupSessionMemorySnapshotFile(groupId),
          group_session_memory_summary_file: sessionMemory?.summaryFile || getGroupSessionMemoryMarkdownFile(groupId),
          group_tool_continuity_snapshot_file: toolContinuity?.snapshotFile || getGroupToolContinuitySnapshotFile(groupId),
          group_tool_continuity_summary_file: toolContinuity?.summaryFile || getGroupToolContinuityMarkdownFile(groupId),
        },
      })
      : { schema: "ccm-group-compact-file-references-v1", references: [] };
    const readPlan = typeof memoryApi.buildGroupCompactFileReferenceReadPlan === "function"
      ? memoryApi.buildGroupCompactFileReferenceReadPlan(groupId, refs, { maxEntries: 10 })
      : { schema: "ccm-group-compact-file-reference-read-plan-v1", entries: [] };
    const surfaced = latestCompactFileReferenceReadPlanRowsForDiscipline(groupId, readPlan);
    const freshnessReadPlan = {
      ...readPlan,
      entries: surfaced.rows,
      plannedCount: surfaced.rows.filter((entry: any) => entry.action !== "skip_missing").length,
      sourceReferenceCount: surfaced.rows.length,
    };
    const freshness = typeof memoryApi.summarizeGroupCompactFileReferenceReadPlanFreshness === "function"
      ? memoryApi.summarizeGroupCompactFileReferenceReadPlanFreshness(groupId, freshnessReadPlan)
      : { schema: "ccm-group-compact-file-reference-read-plan-freshness-v1", status: "empty", checked: 0, freshCount: 0, changedCount: 0, unverifiableCount: 0, rows: [], gaps: [] };
    return {
      schema: "ccm-compact-file-reference-read-plan-freshness-row-v1",
      groupId,
      status: freshness.status || "empty",
      checked: Number(freshness.checked || 0),
      freshCount: Number(freshness.freshCount || 0),
      changedCount: Number(freshness.changedCount || 0),
      unverifiableCount: Number(freshness.unverifiableCount || 0),
      freshnessRate: freshness.freshnessRate ?? null,
      rows: (freshness.rows || []).slice(0, 12),
      gaps: (freshness.gaps || []).slice(0, 12),
    };
  });
  const checkedRows = rows.filter(row => Number(row.checked || 0) > 0);
  const checked = checkedRows.reduce((sum, row) => sum + Number(row.checked || 0), 0);
  const fresh = checkedRows.reduce((sum, row) => sum + Number(row.freshCount || 0), 0);
  const changed = checkedRows.reduce((sum, row) => sum + Number(row.changedCount || 0), 0);
  const unverifiable = checkedRows.reduce((sum, row) => sum + Number(row.unverifiableCount || 0), 0);
  const freshnessRate = qualityRate(fresh, checked);
  const status = checked === 0 ? "empty" : changed > 0 ? "fail" : unverifiable > 0 ? "warn" : "ok";
  return {
    schema: "ccm-compact-file-reference-read-plan-freshness-report-v1",
    generatedAt: now(),
    overall: {
      status,
      freshnessRate,
      checked,
      fresh,
      changed,
      unverifiable,
      groupCount: rows.length,
      checkedGroupCount: checkedRows.length,
      groupsCovered: checkedRows.filter(row => row.status === "ok").length,
    },
    groups: rows.sort((a, b) => Number(b.changedCount || 0) - Number(a.changedCount || 0) || Number(b.checked || 0) - Number(a.checked || 0)).slice(0, 50),
    weakGroups: rows.filter(row => row.status === "fail" || row.status === "warn").slice(0, 20),
  };
}

function evaluateCompactFileReferenceReadPlanFreshness(options: any = {}) {
  const report = buildCompactFileReferenceReadPlanFreshnessReport(options);
  const checked = Number(report.overall.checkedGroupCount || 0);
  const passed = Number(report.overall.groupsCovered || 0);
  const evidence = (report.groups || []).filter((row: any) => row.status === "ok").slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    checked: row.checked,
    freshCount: row.freshCount,
    freshnessRate: row.freshnessRate,
  }));
  const gaps = (report.weakGroups || []).flatMap((row: any) => (row.gaps || []).slice(0, 3).map((gap: any) => ({
    groupId: row.groupId,
    reason: gap.reason || "compact read plan source freshness 异常",
    read_plan_id: gap.read_plan_id || "",
    reference_id: gap.reference_id || "",
    changes: gap.changes || [],
  }))).slice(0, 12);
  const check: any = makeQualityCheck(
    "compact_file_reference_read_plan_freshness",
    "压缩读取计划源新鲜度",
    checked,
    passed,
    evidence,
    gaps,
    "compact read plan 下发时记录源文件指纹；如果源文件变化，子 Agent 使用前必须重新读取当前源并在回执声明。"
  );
  check.report = report;
  return check;
}

function compactReadPlanRevalidationEvidenceSources(groupId: string, memory: any = {}) {
  const sources: any[] = [];
  const push = (source: any) => {
    const text = [
      source.text,
      ...(Array.isArray(source.used) ? source.used : []),
      ...(Array.isArray(source.ignored) ? source.ignored : []),
    ].filter(Boolean).join("\n");
    if (!text.trim()) return;
    sources.push({
      ...source,
      text,
      used: Array.isArray(source.used) ? source.used : [],
      ignored: Array.isArray(source.ignored) ? source.ignored : [],
      hasMemoryUsed: Array.isArray(source.used) && source.used.length > 0,
      hasMemoryIgnored: Array.isArray(source.ignored) && source.ignored.length > 0,
    });
  };
  for (const item of Array.isArray(memory.workerLedger) ? memory.workerLedger : []) {
    const used = normalizeQualityStringList(item.memoryUsed || item.memory_used || item.used);
    const ignored = normalizeQualityStringList(item.memoryIgnored || item.memory_ignored || item.ignored);
    push({
      source: "worker_ledger",
      target_project: item.project || item.agent || "",
      task_id: item.taskId || item.task_id || "",
      trace_id: item.traceId || item.trace_id || "",
      execution_id: item.executionId || item.execution_id || "",
      task_agent_session_id: item.taskAgentSessionId || item.task_agent_session_id || "",
      native_session_id: item.nativeSessionId || item.native_session_id || "",
      agent_type: item.agentType || item.agent_type || "",
      text: [item.summary, item.verification, item.status].filter(Boolean).join("\n"),
      used,
      ignored,
    });
  }
  const messages = readJson(path.join(GROUP_MESSAGES_DIR, `${groupId}.json`), []);
  for (const message of (Array.isArray(messages) ? messages : []).slice(-220)) {
    const receipt = message.receipt || message.ccm_agent_receipt || {};
    const delivery = message.delivery_summary || message.deliverySummary || {};
    const used = normalizeQualityStringList(receipt.memoryUsed || receipt.memory_used || delivery.memoryUsed || delivery.memory_used);
    const ignored = normalizeQualityStringList(receipt.memoryIgnored || receipt.memory_ignored || delivery.memoryIgnored || delivery.memory_ignored);
    push({
      source: "group_message",
      target_project: message.agent || message.target || "",
      task_id: message.task_id || message.taskId || "",
      trace_id: message.trace_id || message.traceId || receipt.trace_id || receipt.traceId || "",
      execution_id: message.execution_id || message.executionId || receipt.execution_id || receipt.executionId || "",
      task_agent_session_id: message.task_agent_session_id || message.taskAgentSessionId || receipt.task_agent_session_id || receipt.taskAgentSessionId || "",
      native_session_id: message.native_session_id || message.nativeSessionId || receipt.native_session_id || receipt.nativeSessionId || "",
      agent_type: message.agent_type || message.agentType || receipt.agent_type || receipt.agentType || "",
      message_id: message.id || message.uuid || "",
      text: [
        message.content,
        JSON.stringify(receipt || {}),
        JSON.stringify(delivery || {}),
      ].filter(Boolean).join("\n"),
      used,
      ignored,
    });
  }
  return sources;
}

function compactReadPlanRevalidationMatch(source: any = {}, row: any = {}, gate: any = {}) {
  const lower = String(source.text || "").replace(/\\/g, "/").toLowerCase();
  const readPlanId = String(row.read_plan_id || row.readPlanId || "").toLowerCase();
  const gateId = String(gate.revalidation_gate_id || gate.revalidationGateId || "").toLowerCase();
  const refId = String(row.reference_id || row.referenceId || "").toLowerCase();
  const pathText = normalizeCompactFileReferencePath(row.path || row.displayPath || "").toLowerCase();
  const sessionBinding = gate.session_binding || gate.sessionBinding || {};
  const expectedTaskSessionId = String(gate.task_agent_session_id || gate.taskAgentSessionId || sessionBinding.task_agent_session_id || sessionBinding.taskAgentSessionId || "").trim();
  const expectedNativeSessionId = String(gate.native_session_id || gate.nativeSessionId || sessionBinding.native_session_id || sessionBinding.nativeSessionId || "").trim();
  const receiptTaskSessionId = String(source.task_agent_session_id || source.taskAgentSessionId || "").trim();
  const receiptNativeSessionId = String(source.native_session_id || source.nativeSessionId || "").trim();
  const sessionRequired = !!(expectedTaskSessionId || expectedNativeSessionId);
  const taskSessionMatched = !expectedTaskSessionId || receiptTaskSessionId === expectedTaskSessionId;
  const nativeSessionMatched = !expectedNativeSessionId || receiptNativeSessionId === expectedNativeSessionId;
  const sessionMatched = taskSessionMatched && nativeSessionMatched;
  const readPlanIdMentioned = !!readPlanId && lower.includes(readPlanId);
  const gateMentioned = !!gateId && lower.includes(gateId);
  const referenceMentioned = (!!refId && lower.includes(refId)) || (!!pathText && lower.includes(pathText));
  const revalidationSignal = /(re[\s_-]?read|reread|current source verified|verified current source|current source|source verified|latest source|current file|current checksum|重新读取|重读|当前源|当前文件|最新源|重新核验|重新核对|已核验|已验证|校验当前)/i.test(String(source.text || ""));
  const ignoredSignal = source.hasMemoryIgnored === true && /(memoryignored|memory ignored|ignored|ignore|skip|not used|not needed|unused|不使用|未使用|忽略|跳过|无需使用|缺失|不存在|missing)/i.test(String(source.text || ""));
  const contentMatched = readPlanIdMentioned && (revalidationSignal || ignoredSignal);
  return {
    matched: contentMatched && (!sessionRequired || sessionMatched),
    content_matched: contentMatched,
    read_plan_id_mentioned: readPlanIdMentioned,
    gate_mentioned: gateMentioned,
    reference_mentioned: referenceMentioned,
    current_source_verified: readPlanIdMentioned && revalidationSignal,
    ignored_with_reason: readPlanIdMentioned && ignoredSignal,
    session_required: sessionRequired,
    session_matched: !sessionRequired || sessionMatched,
    session_mismatch: sessionRequired && contentMatched && !sessionMatched,
    expected_task_agent_session_id: expectedTaskSessionId,
    receipt_task_agent_session_id: receiptTaskSessionId,
    expected_native_session_id: expectedNativeSessionId,
    receipt_native_session_id: receiptNativeSessionId,
    source: source.source || "",
    task_id: source.task_id || "",
    trace_id: source.trace_id || "",
    execution_id: source.execution_id || "",
    message_id: source.message_id || "",
    target_project: source.target_project || "",
    agent_type: source.agent_type || "",
  };
}

function buildCompactFileReferenceReadPlanRevalidationGateReport(options: any = {}) {
  const explicitGroupIds = Array.isArray(options.groupIds || options.group_ids)
    ? (options.groupIds || options.group_ids).map((item: any) => String(item || "").trim()).filter(Boolean)
    : null;
  const files = explicitGroupIds?.length
    ? explicitGroupIds.map((id: string) => path.join(GROUP_MEMORY_DIR, `${id}.json`))
    : listJsonFiles(GROUP_MEMORY_DIR);
  let memoryApi: any = {};
  try {
    memoryApi = require("../collaboration/memory");
  } catch {}
  const rows = files.map(file => {
    const fileGroupId = path.basename(file, ".json");
    const memory = readMemoryFile(file) || { groupId: fileGroupId };
    const groupId = String(memory.groupId || fileGroupId);
    const sessionMemory = memory?.sessionMemory?.schema ? memory.sessionMemory : readGroupSessionMemorySnapshotForCenter(groupId);
    const toolContinuity = memory?.toolContinuity?.schema ? memory.toolContinuity : readGroupToolContinuitySnapshotForCenter(groupId);
    const refs = typeof memoryApi.buildGroupCompactFileReferences === "function"
      ? memoryApi.buildGroupCompactFileReferences(groupId, {
        sessionMemory,
        toolContinuity,
        rawSources: {
          group_memory_file: path.join(GROUP_MEMORY_DIR, `${groupId}.json`),
          group_messages_file: path.join(GROUP_MESSAGES_DIR, `${groupId}.json`),
          group_session_memory_snapshot_file: sessionMemory?.snapshotFile || getGroupSessionMemorySnapshotFile(groupId),
          group_session_memory_summary_file: sessionMemory?.summaryFile || getGroupSessionMemoryMarkdownFile(groupId),
          group_tool_continuity_snapshot_file: toolContinuity?.snapshotFile || getGroupToolContinuitySnapshotFile(groupId),
          group_tool_continuity_summary_file: toolContinuity?.summaryFile || getGroupToolContinuityMarkdownFile(groupId),
        },
      })
      : { schema: "ccm-group-compact-file-references-v1", references: [] };
    const readPlan = typeof memoryApi.buildGroupCompactFileReferenceReadPlan === "function"
      ? memoryApi.buildGroupCompactFileReferenceReadPlan(groupId, refs, { maxEntries: 10 })
      : { schema: "ccm-group-compact-file-reference-read-plan-v1", entries: [] };
    const surfaced = latestCompactFileReferenceReadPlanRowsForDiscipline(groupId, readPlan);
    const freshnessReadPlan = {
      ...readPlan,
      entries: surfaced.rows,
      plannedCount: surfaced.rows.filter((entry: any) => entry.action !== "skip_missing").length,
      sourceReferenceCount: surfaced.rows.length,
    };
    const freshness = typeof memoryApi.summarizeGroupCompactFileReferenceReadPlanFreshness === "function"
      ? memoryApi.summarizeGroupCompactFileReferenceReadPlanFreshness(groupId, freshnessReadPlan)
      : { schema: "ccm-group-compact-file-reference-read-plan-freshness-v1", rows: [], status: "empty" };
    const gateFromLedger = typeof memoryApi.latestGroupCompactFileReferenceReadPlanRevalidationGate === "function"
      ? memoryApi.latestGroupCompactFileReferenceReadPlanRevalidationGate(groupId)
      : null;
    const gate = gateFromLedger || (typeof memoryApi.buildGroupCompactFileReferenceReadPlanRevalidationGate === "function"
      ? memoryApi.buildGroupCompactFileReferenceReadPlanRevalidationGate(groupId, freshness, { scope: "memory-center" })
      : { schema: "ccm-group-compact-file-reference-read-plan-revalidation-gate-v1", status: "empty", required_entries: [], verification_entries: [] });
    const requiredEntries = [
      ...(Array.isArray(gate.required_entries) ? gate.required_entries : []),
      ...(Array.isArray(gate.verification_entries) ? gate.verification_entries : []),
    ].filter((entry: any) => entry?.read_plan_id);
    const evidenceSources = compactReadPlanRevalidationEvidenceSources(groupId, memory);
    const checkRows = requiredEntries.map((entry: any) => {
      const matches = evidenceSources
        .map(source => compactReadPlanRevalidationMatch(source, entry, gate))
        .filter(match => match.read_plan_id_mentioned || match.reference_mentioned || match.gate_mentioned)
        .slice(-8);
      const satisfied = matches.some(match => match.matched);
      const contentSatisfied = matches.some(match => match.content_matched);
      const currentSourceVerified = matches.some(match => match.current_source_verified);
      const ignoredWithReason = matches.some(match => match.ignored_with_reason);
      const sessionRequired = matches.some(match => match.session_required) || !!(gate.session_binding || gate.sessionBinding);
      const sessionMatched = !sessionRequired || matches.some(match => match.content_matched && match.session_matched);
      const sessionMismatch = sessionRequired && contentSatisfied && !sessionMatched;
      const latest = matches[matches.length - 1] || null;
      return {
        read_plan_id: entry.read_plan_id || "",
        reference_id: entry.reference_id || "",
        type: entry.type || "",
        action: entry.action || "",
        revalidation_action: entry.revalidation_action || "",
        path: entry.path || "",
        freshness_status: entry.freshness_status || "",
        changes: entry.changes || [],
        satisfied,
        content_satisfied: contentSatisfied,
        current_source_verified: currentSourceVerified,
        ignored_with_reason: ignoredWithReason,
        session_required: sessionRequired,
        session_matched: sessionMatched,
        session_mismatch: sessionMismatch,
        expected_task_agent_session_id: latest?.expected_task_agent_session_id || gate.session_binding?.task_agent_session_id || gate.sessionBinding?.taskAgentSessionId || "",
        receipt_task_agent_session_id: latest?.receipt_task_agent_session_id || "",
        expected_native_session_id: latest?.expected_native_session_id || gate.session_binding?.native_session_id || gate.sessionBinding?.nativeSessionId || "",
        receipt_native_session_id: latest?.receipt_native_session_id || "",
        gate_mentioned: matches.some(match => match.gate_mentioned),
        mention_count: matches.length,
        latest,
      };
    });
    const checked = checkRows.length;
    const passed = checkRows.filter(row => row.satisfied).length;
    const verified = checkRows.filter(row => row.current_source_verified).length;
    const ignored = checkRows.filter(row => row.ignored_with_reason).length;
    const sessionRequired = checkRows.filter(row => row.session_required).length;
    const sessionMatched = checkRows.filter(row => row.session_required && row.session_matched).length;
    const sessionMismatch = checkRows.filter(row => row.session_mismatch).length;
    const score = qualityRate(passed, checked);
    const status = checked === 0 ? "empty" : passed === checked ? "ok" : passed > 0 ? "warn" : "fail";
    const gaps = checkRows.filter(row => !row.satisfied).slice(0, 12).map(row => ({
      read_plan_id: row.read_plan_id,
      reference_id: row.reference_id,
      type: row.type,
      path: row.path,
      changes: row.changes,
      session_mismatch: row.session_mismatch,
      expected_task_agent_session_id: row.expected_task_agent_session_id,
      receipt_task_agent_session_id: row.receipt_task_agent_session_id,
      expected_native_session_id: row.expected_native_session_id,
      receipt_native_session_id: row.receipt_native_session_id,
      reason: row.session_mismatch
        ? "stale read_plan_id 已声明重读，但回执来源不是绑定的子 Agent 会话"
        : row.mention_count
        ? "stale read_plan_id 被提及，但缺少 re-read/current source verified 或 memoryIgnored 不使用说明"
        : "stale read_plan_id 需要重读当前源，但近期回执未声明",
    }));
    return {
      schema: "ccm-compact-file-reference-read-plan-revalidation-gate-group-v1",
      groupId,
      status,
      score,
      checked,
      passed,
      verified,
      ignored,
      sessionRequired,
      sessionMatched,
      sessionMismatch,
      missing: Math.max(0, checked - passed),
      gate,
      gateId: gate.revalidation_gate_id || "",
      ledgerFile: gate.ledger_file || surfaced.ledgerFile,
      ledgerEntryCount: surfaced.ledgerEntryCount,
      rows: checkRows.slice(0, 20),
      gaps,
    };
  });
  const checkedRows = rows.filter(row => Number(row.checked || 0) > 0);
  const checked = checkedRows.reduce((sum, row) => sum + Number(row.checked || 0), 0);
  const passed = checkedRows.reduce((sum, row) => sum + Number(row.passed || 0), 0);
  const sessionRequired = checkedRows.reduce((sum, row) => sum + Number(row.sessionRequired || 0), 0);
  const sessionMatched = checkedRows.reduce((sum, row) => sum + Number(row.sessionMatched || 0), 0);
  const sessionMismatch = checkedRows.reduce((sum, row) => sum + Number(row.sessionMismatch || 0), 0);
  const score = qualityRate(passed, checked);
  const status = checked === 0 ? "empty" : passed === checked ? "ok" : Number(score) >= 70 ? "warn" : "fail";
  return {
    schema: "ccm-compact-file-reference-read-plan-revalidation-gate-report-v1",
    generatedAt: now(),
    overall: {
      status,
      score,
      checked,
      passed,
      missing: Math.max(0, checked - passed),
      sessionRequired,
      sessionMatched,
      sessionMismatch,
      sessionMatchRate: qualityRate(sessionMatched, sessionRequired),
      groupCount: rows.length,
      checkedGroupCount: checkedRows.length,
      groupsCovered: checkedRows.filter(row => row.status === "ok").length,
    },
    groups: rows.sort((a, b) => Number(b.checked || 0) - Number(a.checked || 0) || Number(b.missing || 0) - Number(a.missing || 0)).slice(0, 50),
    weakGroups: rows.filter(row => row.status === "fail" || row.status === "warn").slice(0, 20),
  };
}

function evaluateCompactFileReferenceReadPlanRevalidationGate(options: any = {}) {
  const report = buildCompactFileReferenceReadPlanRevalidationGateReport(options);
  const checked = Number(report.overall.checked || 0);
  const passed = Number(report.overall.passed || 0);
  const evidence = (report.groups || []).filter((row: any) => row.status === "ok").slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    gateId: row.gateId,
    checked: row.checked,
    passed: row.passed,
    ledgerFile: row.ledgerFile,
  }));
  const gaps = (report.weakGroups || []).flatMap((row: any) => (row.gaps || []).slice(0, 3).map((gap: any) => ({
    groupId: row.groupId,
    gateId: row.gateId,
    reason: gap.reason || "compact read plan revalidation gate 异常",
    read_plan_id: gap.read_plan_id || "",
    reference_id: gap.reference_id || "",
    changes: gap.changes || [],
  }))).slice(0, 12);
  const check: any = makeQualityCheck(
    "compact_file_reference_read_plan_revalidation_gate",
    "压缩读取计划重读门禁",
    checked,
    passed,
    evidence,
    gaps,
    "当历史 compact read plan 源文件变化时，子 Agent 回执必须按 read_plan_id 声明已 re-read/current source verified，或在 memoryIgnored 说明不使用。"
  );
  check.report = report;
  return check;
}

function evaluateCompactFileReferenceReadPlanRevalidationSessionBinding(options: any = {}) {
  const report = buildCompactFileReferenceReadPlanRevalidationGateReport(options);
  const checked = Number(report.overall.sessionRequired || 0);
  const passed = Number(report.overall.sessionMatched || 0);
  const evidence = (report.groups || []).filter((row: any) => row.sessionRequired > 0 && row.sessionMismatch === 0).slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    gateId: row.gateId,
    sessionRequired: row.sessionRequired,
    sessionMatched: row.sessionMatched,
    ledgerFile: row.ledgerFile,
  }));
  const gaps = (report.groups || []).flatMap((row: any) => (row.gaps || [])
    .filter((gap: any) => gap.session_mismatch === true)
    .slice(0, 3)
    .map((gap: any) => ({
      groupId: row.groupId,
      gateId: row.gateId,
      reason: gap.reason || "compact read plan revalidation 回执会话不匹配",
      read_plan_id: gap.read_plan_id || "",
      expected_task_agent_session_id: gap.expected_task_agent_session_id || "",
      receipt_task_agent_session_id: gap.receipt_task_agent_session_id || "",
      expected_native_session_id: gap.expected_native_session_id || "",
      receipt_native_session_id: gap.receipt_native_session_id || "",
    }))).slice(0, 12);
  const check: any = makeQualityCheck(
    "compact_file_reference_read_plan_revalidation_session_binding",
    "读取计划重读会话绑定",
    checked,
    passed,
    evidence,
    gaps,
    "compact read plan stale source 重读回执必须来自收到该 gate 的具体子 Agent 会话；错会话或缺 session 的回执不能证明当前第三方 Agent 会话已重读。"
  );
  check.report = report;
  return check;
}

function latestCompactFileReferenceReadPlanRowsForDiscipline(groupId: string, fallbackReadPlan: any = {}) {
  const ledger = readJson(getGroupCompactFileReferenceLedgerFile(groupId), null);
  const entries = Array.isArray(ledger?.entries) ? ledger.entries : [];
  const fromLedger = entries.slice(-8).flatMap((entry: any) => (Array.isArray(entry.read_plan_entries) ? entry.read_plan_entries : []).map((row: any) => ({
    ...row,
    surfaced_at: entry.generated_at || "",
    surfacing_scope: entry.scope || "",
    target_project: entry.target_project || "",
    surfacing_entry_id: entry.entry_id || "",
  })));
  const rowsSource = fromLedger.length ? fromLedger : (Array.isArray(fallbackReadPlan?.entries) ? fallbackReadPlan.entries : []);
  const seen = new Set<string>();
  const rows: any[] = [];
  for (const row of [...rowsSource].reverse()) {
    const id = String(row.read_plan_id || row.readPlanId || "").trim();
    const refId = String(row.reference_id || row.referenceId || "").trim();
    const refPath = String(row.path || "").trim();
    const key = id || refId || refPath;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    rows.unshift({
      read_plan_id: id,
      reference_id: refId,
      type: row.type || "",
      action: row.action || "",
      priority: Number(row.priority || 0),
      path: refPath,
      displayPath: row.displayPath || normalizeCompactFileReferencePath(refPath),
      exists: row.exists !== false,
      sourceChecksum: row.sourceChecksum || row.source_checksum || row.checksum || "",
      sourceChecksumMode: row.sourceChecksumMode || row.source_checksum_mode || row.checksumMode || "",
      sourceMtimeMs: Number(row.sourceMtimeMs || row.source_mtime_ms || row.mtimeMs || 0),
      sourceBytes: Number(row.sourceBytes || row.source_bytes || row.bytes || 0),
      surfaced_at: row.surfaced_at || row.generated_at || "",
      surfacing_scope: row.surfacing_scope || row.scope || "",
      target_project: row.target_project || "",
      surfacing_entry_id: row.surfacing_entry_id || row.entry_id || "",
    });
  }
  return {
    ledgerFile: getGroupCompactFileReferenceLedgerFile(groupId),
    ledgerEntryCount: entries.length,
    rows: rows.slice(0, 60),
  };
}

function buildCompactFileReferenceReadPlanUsageDisciplineReport(options: any = {}) {
  const explicitGroupIds = Array.isArray(options.groupIds || options.group_ids)
    ? (options.groupIds || options.group_ids).map((item: any) => String(item || "").trim()).filter(Boolean)
    : null;
  const files = explicitGroupIds?.length
    ? explicitGroupIds.map((id: string) => path.join(GROUP_MEMORY_DIR, `${id}.json`))
    : listJsonFiles(GROUP_MEMORY_DIR);
  let memoryApi: any = {};
  try {
    memoryApi = require("../collaboration/memory");
  } catch {}
  const rows = files.map(file => {
    const fileGroupId = path.basename(file, ".json");
    const memory = readMemoryFile(file) || { groupId: fileGroupId };
    const groupId = String(memory.groupId || fileGroupId);
    const sessionMemory = memory?.sessionMemory?.schema ? memory.sessionMemory : readGroupSessionMemorySnapshotForCenter(groupId);
    const toolContinuity = memory?.toolContinuity?.schema ? memory.toolContinuity : readGroupToolContinuitySnapshotForCenter(groupId);
    const refs = typeof memoryApi.buildGroupCompactFileReferences === "function"
      ? memoryApi.buildGroupCompactFileReferences(groupId, {
        sessionMemory,
        toolContinuity,
        rawSources: {
          group_memory_file: path.join(GROUP_MEMORY_DIR, `${groupId}.json`),
          group_messages_file: path.join(GROUP_MESSAGES_DIR, `${groupId}.json`),
          group_session_memory_snapshot_file: sessionMemory?.snapshotFile || getGroupSessionMemorySnapshotFile(groupId),
          group_session_memory_summary_file: sessionMemory?.summaryFile || getGroupSessionMemoryMarkdownFile(groupId),
          group_tool_continuity_snapshot_file: toolContinuity?.snapshotFile || getGroupToolContinuitySnapshotFile(groupId),
          group_tool_continuity_summary_file: toolContinuity?.summaryFile || getGroupToolContinuityMarkdownFile(groupId),
        },
      })
      : { schema: "ccm-group-compact-file-references-v1", references: [] };
    const readPlan = typeof memoryApi.buildGroupCompactFileReferenceReadPlan === "function"
      ? memoryApi.buildGroupCompactFileReferenceReadPlan(groupId, refs, { maxEntries: 10 })
      : { schema: "ccm-group-compact-file-reference-read-plan-v1", entries: [] };
    const surfaced = latestCompactFileReferenceReadPlanRowsForDiscipline(groupId, readPlan);
    const disciplineReadPlan = {
      schema: "ccm-group-compact-file-reference-read-plan-v1",
      groupId,
      entries: surfaced.rows,
      plannedCount: surfaced.rows.filter((entry: any) => entry.action !== "skip_missing").length,
      sourceReferenceCount: surfaced.rows.length,
    };
    const access = typeof memoryApi.summarizeGroupCompactFileReferenceReadPlanAccess === "function"
      ? memoryApi.summarizeGroupCompactFileReferenceReadPlanAccess(groupId, disciplineReadPlan, memory)
      : { rows: [], mentioned_count: 0, read_plan_id_mentioned_count: 0, read_plan_entry_count: surfaced.rows.length };
    const accessRows = Array.isArray(access.rows) ? access.rows : [];
    const checked = surfaced.ledgerEntryCount > 0 ? surfaced.rows.length : 0;
    const passed = checked ? accessRows.filter((row: any) => row.read_plan_id_mentioned === true).length : 0;
    const mentioned = checked ? accessRows.filter((row: any) => row.mentioned === true).length : 0;
    const score = qualityRate(passed, checked);
    const mentionRate = qualityRate(mentioned, checked);
    const status = checked === 0 ? "empty" : Number(score) >= 90 ? "ok" : Number(score) >= 70 ? "warn" : "fail";
    const gaps = checked
      ? accessRows.filter((row: any) => row.read_plan_id_mentioned !== true).slice(0, 12).map((row: any) => ({
        read_plan_id: row.read_plan_id || "",
        reference_id: row.reference_id || "",
        type: row.type || "",
        action: row.action || "",
        path: row.path || "",
        reason: row.mentioned
          ? "读取计划被 reference_id/path 间接提及，但未声明 read_plan_id"
          : "compact read plan 已下发给子 Agent，但近期回执/消息未声明 read_plan_id",
      }))
      : [];
    return {
      schema: "ccm-compact-file-reference-read-plan-usage-discipline-group-v1",
      groupId,
      status,
      score,
      mentionRate,
      checked,
      passed,
      mentioned,
      missing: Math.max(0, checked - passed),
      indirectMentionCount: Math.max(0, mentioned - passed),
      ledgerFile: surfaced.ledgerFile,
      ledgerEntryCount: surfaced.ledgerEntryCount,
      readPlanEntryCount: surfaced.rows.length,
      rows: accessRows.slice(0, 20),
      gaps,
    };
  });
  const checkedRows = rows.filter(row => Number(row.checked || 0) > 0);
  const checked = checkedRows.reduce((sum, row) => sum + Number(row.checked || 0), 0);
  const passed = checkedRows.reduce((sum, row) => sum + Number(row.passed || 0), 0);
  const mentioned = checkedRows.reduce((sum, row) => sum + Number(row.mentioned || 0), 0);
  const score = qualityRate(passed, checked);
  const status = checked === 0 ? "empty" : Number(score) >= 90 ? "ok" : Number(score) >= 70 ? "warn" : "fail";
  return {
    schema: "ccm-compact-file-reference-read-plan-usage-discipline-report-v1",
    generatedAt: now(),
    overall: {
      status,
      score,
      checked,
      passed,
      mentioned,
      missing: Math.max(0, checked - passed),
      indirectMentionCount: Math.max(0, mentioned - passed),
      groupCount: rows.length,
      checkedGroupCount: checkedRows.length,
      groupsCovered: checkedRows.filter(row => row.status === "ok").length,
      ledgerEntryCount: checkedRows.reduce((sum, row) => sum + Number(row.ledgerEntryCount || 0), 0),
    },
    groups: rows.sort((a, b) => Number(b.ledgerEntryCount || 0) - Number(a.ledgerEntryCount || 0)).slice(0, 50),
    weakGroups: rows.filter(row => row.status === "fail" || row.status === "warn").slice(0, 20),
  };
}

function evaluateCompactFileReferenceReadPlanUsageDiscipline(options: any = {}) {
  const report = buildCompactFileReferenceReadPlanUsageDisciplineReport(options);
  const checked = Number(report.overall.checked || 0);
  const passed = Number(report.overall.passed || 0);
  const evidence = (report.groups || []).filter((row: any) => row.status === "ok").slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    checked: row.checked,
    passed: row.passed,
    ledgerEntryCount: row.ledgerEntryCount,
    ledgerFile: row.ledgerFile,
  }));
  const gaps = (report.weakGroups || []).flatMap((row: any) => (row.gaps || []).slice(0, 3).map((gap: any) => ({
    groupId: row.groupId,
    reason: gap.reason || "compact read plan usage discipline 异常",
    read_plan_id: gap.read_plan_id || "",
    reference_id: gap.reference_id || "",
    ledgerFile: row.ledgerFile,
  }))).slice(0, 12);
  const check: any = makeQualityCheck(
    "compact_file_reference_read_plan_usage_discipline",
    "压缩读取计划回执纪律",
    checked,
    passed,
    evidence,
    gaps,
    "compact file reference read plan 一旦下发给子 Agent，后续回执或群聊消息应优先用 memoryUsed/memoryIgnored 声明 read_plan_id，形成按需读取计划的使用闭环。"
  );
  check.report = report;
  return check;
}

function latestCompactFileReferenceRowsForDiscipline(groupId: string, fallbackRefs: any = {}) {
  const ledger = readJson(getGroupCompactFileReferenceLedgerFile(groupId), null);
  const entries = Array.isArray(ledger?.entries) ? ledger.entries : [];
  const fromLedger = entries.slice(-8).flatMap((entry: any) => (Array.isArray(entry.references) ? entry.references : []).map((ref: any) => ({
    ...ref,
    surfaced_at: entry.generated_at || "",
    surfacing_scope: entry.scope || "",
    target_project: entry.target_project || "",
    surfacing_entry_id: entry.entry_id || "",
  })));
  const refs = fromLedger.length ? fromLedger : (Array.isArray(fallbackRefs?.references) ? fallbackRefs.references : []);
  const seen = new Set<string>();
  const rows: any[] = [];
  for (const ref of [...refs].reverse()) {
    const id = String(ref.reference_id || ref.referenceId || "").trim();
    const refPath = String(ref.path || "").trim();
    const key = id || refPath;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    rows.unshift({
      reference_id: id,
      type: ref.type || "",
      kind: ref.kind || "",
      path: refPath,
      displayPath: ref.displayPath || normalizeCompactFileReferencePath(refPath),
      exists: ref.exists !== false,
      checksum: ref.checksum || "",
      surfaced_at: ref.surfaced_at || ref.generated_at || "",
      surfacing_scope: ref.surfacing_scope || ref.scope || "",
      target_project: ref.target_project || "",
      surfacing_entry_id: ref.surfacing_entry_id || ref.entry_id || "",
    });
  }
  return {
    ledgerFile: getGroupCompactFileReferenceLedgerFile(groupId),
    ledgerEntryCount: entries.length,
    rows: rows.slice(0, 60),
  };
}

function buildCompactFileReferenceUsageDisciplineReport(options: any = {}) {
  const explicitGroupIds = Array.isArray(options.groupIds || options.group_ids)
    ? (options.groupIds || options.group_ids).map((item: any) => String(item || "").trim()).filter(Boolean)
    : null;
  const files = explicitGroupIds?.length
    ? explicitGroupIds.map((id: string) => path.join(GROUP_MEMORY_DIR, `${id}.json`))
    : listJsonFiles(GROUP_MEMORY_DIR);
  let memoryApi: any = {};
  try {
    memoryApi = require("../collaboration/memory");
  } catch {}
  const rows = files.map(file => {
    const fileGroupId = path.basename(file, ".json");
    const memory = readMemoryFile(file) || { groupId: fileGroupId };
    const groupId = String(memory.groupId || fileGroupId);
    const sessionMemory = memory?.sessionMemory?.schema ? memory.sessionMemory : readGroupSessionMemorySnapshotForCenter(groupId);
    const toolContinuity = memory?.toolContinuity?.schema ? memory.toolContinuity : readGroupToolContinuitySnapshotForCenter(groupId);
    const refs = typeof memoryApi.buildGroupCompactFileReferences === "function"
      ? memoryApi.buildGroupCompactFileReferences(groupId, {
        sessionMemory,
        toolContinuity,
        rawSources: {
          group_memory_file: path.join(GROUP_MEMORY_DIR, `${groupId}.json`),
          group_messages_file: path.join(GROUP_MESSAGES_DIR, `${groupId}.json`),
          group_session_memory_snapshot_file: sessionMemory?.snapshotFile || getGroupSessionMemorySnapshotFile(groupId),
          group_session_memory_summary_file: sessionMemory?.summaryFile || getGroupSessionMemoryMarkdownFile(groupId),
          group_tool_continuity_snapshot_file: toolContinuity?.snapshotFile || getGroupToolContinuitySnapshotFile(groupId),
          group_tool_continuity_summary_file: toolContinuity?.summaryFile || getGroupToolContinuityMarkdownFile(groupId),
        },
      })
      : { schema: "ccm-group-compact-file-references-v1", references: [] };
    const surfaced = latestCompactFileReferenceRowsForDiscipline(groupId, refs);
    const disciplineRefs = {
      schema: "ccm-group-compact-file-references-v1",
      references: surfaced.rows,
      referenceCount: surfaced.rows.length,
    };
    const access = typeof memoryApi.summarizeGroupCompactFileReferenceAccess === "function"
      ? memoryApi.summarizeGroupCompactFileReferenceAccess(groupId, disciplineRefs, memory)
      : { rows: [], mentioned_count: 0, reference_count: surfaced.rows.length };
    const accessRows = Array.isArray(access.rows) ? access.rows : [];
    const checked = surfaced.ledgerEntryCount > 0 ? surfaced.rows.length : 0;
    const passed = checked ? accessRows.filter((row: any) => row.mentioned === true).length : 0;
    const score = qualityRate(passed, checked);
    const status = checked === 0 ? "empty" : Number(score) >= 90 ? "ok" : Number(score) >= 70 ? "warn" : "fail";
    const gaps = checked
      ? accessRows.filter((row: any) => row.mentioned !== true).slice(0, 12).map((row: any) => ({
        reference_id: row.reference_id || "",
        type: row.type || "",
        path: row.path || "",
        reason: "compact file reference 已下发给子 Agent，但近期回执/消息未声明 memoryUsed 或 memoryIgnored",
      }))
      : [];
    return {
      schema: "ccm-compact-file-reference-usage-discipline-group-v1",
      groupId,
      status,
      score,
      checked,
      passed,
      missing: Math.max(0, checked - passed),
      ledgerFile: surfaced.ledgerFile,
      ledgerEntryCount: surfaced.ledgerEntryCount,
      referenceCount: surfaced.rows.length,
      mentionedCount: passed,
      mentionRate: score,
      rows: accessRows.slice(0, 20),
      gaps,
    };
  });
  const checkedRows = rows.filter(row => Number(row.checked || 0) > 0);
  const checked = checkedRows.reduce((sum, row) => sum + Number(row.checked || 0), 0);
  const passed = checkedRows.reduce((sum, row) => sum + Number(row.passed || 0), 0);
  const score = qualityRate(passed, checked);
  const status = checked === 0 ? "empty" : Number(score) >= 90 ? "ok" : Number(score) >= 70 ? "warn" : "fail";
  return {
    schema: "ccm-compact-file-reference-usage-discipline-report-v1",
    generatedAt: now(),
    overall: {
      status,
      score,
      checked,
      passed,
      missing: Math.max(0, checked - passed),
      groupCount: rows.length,
      checkedGroupCount: checkedRows.length,
      groupsCovered: checkedRows.filter(row => row.status === "ok").length,
      ledgerEntryCount: checkedRows.reduce((sum, row) => sum + Number(row.ledgerEntryCount || 0), 0),
    },
    groups: rows.sort((a, b) => Number(b.ledgerEntryCount || 0) - Number(a.ledgerEntryCount || 0)).slice(0, 50),
    weakGroups: rows.filter(row => row.status === "fail" || row.status === "warn").slice(0, 20),
  };
}

function evaluateCompactFileReferenceUsageDiscipline(options: any = {}) {
  const report = buildCompactFileReferenceUsageDisciplineReport(options);
  const checked = Number(report.overall.checked || 0);
  const passed = Number(report.overall.passed || 0);
  const evidence = (report.groups || []).filter((row: any) => row.status === "ok").slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    checked: row.checked,
    passed: row.passed,
    ledgerEntryCount: row.ledgerEntryCount,
    ledgerFile: row.ledgerFile,
  }));
  const gaps = (report.weakGroups || []).flatMap((row: any) => (row.gaps || []).slice(0, 3).map((gap: any) => ({
    groupId: row.groupId,
    reason: gap.reason || "compact file reference usage discipline 异常",
    reference_id: gap.reference_id || "",
    path: gap.path || "",
    ledgerFile: row.ledgerFile,
  }))).slice(0, 12);
  const check: any = makeQualityCheck(
    "compact_file_reference_usage_discipline",
    "压缩文件引用使用纪律",
    checked,
    passed,
    evidence,
    gaps,
    "compact file references 一旦下发给子 Agent，后续回执或群聊消息必须用 memoryUsed/memoryIgnored 声明 reference id 或路径，形成压缩上下文使用闭环。"
  );
  check.report = report;
  return check;
}

function extractTaskMemoryUsageEvidence(task: any) {
  const summary = task?.delivery_summary || {};
  const usage = [
    ...(Array.isArray(summary.memory_usage) ? summary.memory_usage : []),
    ...(Array.isArray(summary.receipts) ? summary.receipts : []),
    ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
  ];
  const used: any[] = [];
  const ignored: any[] = [];
  for (const item of usage) {
    const agent = item?.agent || item?.project || "";
    const itemUsed = normalizeQualityStringList(item?.memoryUsed || item?.memory_used || item?.used);
    const itemIgnored = normalizeQualityStringList(item?.memoryIgnored || item?.memory_ignored || item?.ignored);
    if (itemUsed.length) used.push({ agent, values: itemUsed });
    if (itemIgnored.length) ignored.push({ agent, values: itemIgnored });
  }
  const groupId = String(task?.group_id || task?.groupId || "");
  if (groupId) {
    const memory = readMemoryFile(path.join(GROUP_MEMORY_DIR, `${groupId}.json`));
    const ledger = Array.isArray(memory?.workerLedger) ? memory.workerLedger : [];
    for (const item of ledger.filter((entry: any) => !task?.id || entry.taskId === task.id).slice(-20)) {
      const itemUsed = normalizeQualityStringList(item?.memoryUsed || item?.memory_used);
      const itemIgnored = normalizeQualityStringList(item?.memoryIgnored || item?.memory_ignored);
      if (itemUsed.length) used.push({ agent: item.project || item.agent || "", values: itemUsed });
      if (itemIgnored.length) ignored.push({ agent: item.project || item.agent || "", values: itemIgnored });
    }
  }
  return { used, ignored };
}

function sourceMessageExists(groupId: string, messageId: string, expectedText = "") {
  const messages = readJson(path.join(GROUP_MESSAGES_DIR, `${groupId}.json`), []);
  const found = (Array.isArray(messages) ? messages : []).find((message: any) => String(message.id || message.uuid || "") === String(messageId));
  if (!found) return { exists: false, matched: false };
  return { exists: true, matched: !expectedText || evidenceTextMatches(found.content, expectedText) };
}

function evaluateConstraintRetention(options: any = {}) {
  const traceSources = options.traceSources !== false;
  const perScopeLimit = Math.max(20, Number(options.perScopeLimit || 200));
  let checked = 0;
  let passed = 0;
  const evidence: any[] = [];
  const gaps: any[] = [];
  for (const file of listJsonFiles(GROUP_MEMORY_DIR)) {
    const memory = readMemoryFile(file);
    if (!memory) continue;
    const groupId = String(memory.groupId || path.basename(file, ".json"));
    const requirements = (applyMemoryControls("group", groupId, memory)?.persistentRequirements || []).slice(-perScopeLimit);
    for (const requirement of requirements) {
      if (!requirement?.text) continue;
      checked++;
      const source = traceSources && requirement.messageId ? sourceMessageExists(groupId, requirement.messageId, requirement.text) : { exists: !!requirement.messageId, matched: !!requirement.messageId };
      const retained = String(requirement.text || "").trim().length >= 8 && (!requirement.messageId || source.matched);
      if (retained) {
        passed++;
        evidence.push({ scope: "group", scopeId: groupId, item: String(requirement.text).slice(0, 160), source: requirement.messageId || "" });
      } else {
        gaps.push({ scope: "group", scopeId: groupId, item: String(requirement.text).slice(0, 160), reason: requirement.messageId ? "压缩约束无法回溯或原文不匹配" : "缺少来源消息 ID" });
      }
    }
  }
  try {
    const globalMemory = require("../../agents/global/memory").loadGlobalAgentMemory({ recover: false });
    const constraints = [...(globalMemory.authorization || []), ...(globalMemory.feedback || [])];
    for (const item of constraints) {
      const text = itemText("feedback", item);
      if (!text) continue;
      checked++;
      const sessionId = item.source?.sessionId;
      const messageId = item.source?.messageIds?.[0];
      const traceable = sessionId && messageId && (!traceSources || require("../../agents/global/memory").getGlobalMemoryEvidence({ sessionId, messageId }).length > 0);
      if (traceable) {
        passed++;
        evidence.push({ scope: "global", scopeId: "global-agent", item: text.slice(0, 160), source: `${sessionId}/${messageId}` });
      } else {
        gaps.push({ scope: "global", scopeId: "global-agent", item: text.slice(0, 160), reason: "全局约束缺少可读原始证据" });
      }
    }
  } catch {}
  return makeQualityCheck("constraint_retention", "关键约束保留", checked, passed, evidence, gaps, "检查 persistentRequirements、authorization、feedback 是否仍可回溯原文。");
}

function evaluateChildAgentMemoryUse(options: any = {}) {
  const taskLimit = Math.max(5, Number(options.taskLimit || 20));
  const textLimit = Math.max(600, Number(options.textLimit || 2400));
  const tasks = loadTasks().slice(-taskLimit);
  let checked = 0;
  let passed = 0;
  const evidence: any[] = [];
  const gaps: any[] = [];
  const pattern = /(?:子 Agent 记忆包|受控记忆包|历史结论|项目背景|架构决策|项目记忆|共享文档|知识库参考|recentConclusions|decisions)/i;
  for (const task of tasks.filter((item: any) => item.assign_type === "group" || item.group_id || item.delivery_summary?.assignment_count)) {
    const summary = task.delivery_summary || {};
    const explicit = extractTaskMemoryUsageEvidence(task);
    const assignmentTexts = [
      ...(Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : []),
      ...(Array.isArray(summary.worker_notifications) ? summary.worker_notifications : []),
      task.status_detail,
      task.final_report,
    ].map((item: any) => {
      const text = typeof item === "string" ? item : JSON.stringify(item || {});
      return text.slice(0, textLimit);
    });
    const hasWorker = Number(summary.worker_notification_count || summary.receipt_count || 0) > 0 || assignmentTexts.length > 0 || explicit.used.length > 0 || explicit.ignored.length > 0;
    if (!hasWorker) continue;
    checked++;
    const joined = assignmentTexts.join("\n");
    if (explicit.used.length > 0) {
      passed++;
      evidence.push({ taskId: task.id, title: task.title, signal: "structured_receipt.memoryUsed", agents: explicit.used.map(item => item.agent).filter(Boolean), memoryUsed: explicit.used.flatMap(item => item.values).slice(0, 8) });
    } else if (pattern.test(joined)) {
      passed++;
      evidence.push({ taskId: task.id, title: task.title, signal: (joined.match(pattern) || [])[0] || "legacy_text_signal" });
    } else {
      gaps.push({ taskId: task.id, title: task.title, reason: explicit.ignored.length ? `子 Agent 声明未使用记忆：${explicit.ignored.flatMap(item => item.values).slice(0, 3).join("；")}` : "回执未声明 memoryUsed，派发/Worker 证据中也未发现记忆引用" });
    }
  }
  return makeQualityCheck("child_agent_memory_use", "子 Agent 使用记忆", checked, passed, evidence, gaps, "优先检查结构化回执 memoryUsed；旧任务回退检查派发与 Worker 文本中的项目/历史/文档记忆引用。");
}

function listKnowledgeSamples(limit = 12) {
  try {
    return fs.readdirSync(KNOWLEDGE_DIR)
      .filter(name => /\.(md|txt|json)$/i.test(name))
      .slice(-limit)
      .map(name => {
        const text = fs.readFileSync(path.join(KNOWLEDGE_DIR, name), "utf-8").slice(0, 4000);
        const title = (text.match(/^#\s+(.+)$/m)?.[1] || name).trim();
        const tokens = tokenizeQualityText(`${title}\n${text}`).filter(token => token.length >= 3).slice(0, 8);
        return { name, title, text, query: tokens.slice(0, 5).join(" ") || title };
      });
  } catch { return []; }
}

function evaluateRagRecall(options: any = {}) {
  if (options.skipRag === true) {
    const samples = listKnowledgeSamples(5);
    return makeQualityCheck("rag_recall_accuracy", "RAG 召回准确", 0, 0, samples.map(sample => ({ file: sample.name, query: sample.query })).slice(0, 5), [], "轻量模式不执行 RAG 检索；点击“评估压缩质量”运行完整 Top-3 召回检查。");
  }
  const samples = listKnowledgeSamples(Number(options.sampleLimit || 5));
  let checked = 0;
  let passed = 0;
  const evidence: any[] = [];
  const gaps: any[] = [];
  for (const sample of samples) {
    if (!sample.query) continue;
    checked++;
    const { queryKnowledgeBase } = require("./rag");
    const result = queryKnowledgeBase(sample.query, 3);
    const resultText = String(result || "").toLowerCase();
    const filenameHit = resultText.includes(sample.name.toLowerCase());
    const tokenHits = tokenizeQualityText(sample.title).filter(token => resultText.includes(token.toLowerCase())).length;
    const ok = filenameHit || tokenHits >= Math.min(2, tokenizeQualityText(sample.title).length);
    if (ok) {
      passed++;
      evidence.push({ file: sample.name, query: sample.query, hit: filenameHit ? "filename" : "title-token" });
    } else {
      gaps.push({ file: sample.name, query: sample.query, reason: "Top-3 检索结果未命中文档名或标题关键词" });
    }
  }
  return makeQualityCheck("rag_recall_accuracy", "RAG 召回准确", checked, passed, evidence, gaps, "用知识库文档标题/关键词抽样检索，检测 Top-3 是否命中来源。");
}

function evaluateLongTaskGoalConsistency(options: any = {}) {
  const tasks = loadTasks().slice(-Math.max(5, Number(options.taskLimit || 30)));
  let checked = 0;
  let passed = 0;
  const evidence: any[] = [];
  const gaps: any[] = [];
  for (const task of tasks) {
    const reasoning = task.reasoning_loop || {};
    const planVersion = Number(reasoning.plan_version || 0);
    const recoveries = Array.isArray(reasoning.recovery_checks) ? reasoning.recovery_checks : [];
    const hasMultiRound = planVersion > 1 || recoveries.length > 0 || Number(task.watchdog_recoveries || 0) > 0 || Number(task.auto_gap_continue_count || 0) > 0;
    if (!hasMultiRound) continue;
    checked++;
    const goal = String(reasoning.original_goal || task.business_goal || task.description || task.title || "");
    const effective = String(reasoning.effective_goal || task.business_goal || task.description || task.title || "");
    const goalTokens = tokenizeQualityText(goal).slice(0, 12);
    const overlap = goalTokens.length ? goalTokens.filter(token => effective.toLowerCase().includes(token)).length / goalTokens.length : 1;
    const recoveredOk = recoveries.every((item: any) => item.goal_revalidated !== false && item.acceptance_revalidated !== false);
    if (overlap >= 0.45 && recoveredOk) {
      passed++;
      evidence.push({ taskId: task.id, title: task.title, planVersion, recoveries: recoveries.length });
    } else {
      gaps.push({ taskId: task.id, title: task.title, reason: overlap < 0.45 ? "多轮后有效目标与原始目标关键词重合过低" : "恢复记录未重新核对目标/验收" });
    }
  }
  return makeQualityCheck("long_task_goal_consistency", "长任务目标一致", checked, passed, evidence, gaps, "检查多轮/恢复任务是否保留原始目标并重新核对验收条件。");
}

function evaluateSourceTraceability(options: any = {}) {
  const perScopeLimit = Math.max(20, Number(options.perScopeLimit || 200));
  const traceSources = options.traceSources !== false;
  let checked = 0;
  let passed = 0;
  const evidence: any[] = [];
  const gaps: any[] = [];
  for (const file of listJsonFiles(GROUP_MEMORY_DIR)) {
    const memory = readMemoryFile(file);
    if (!memory) continue;
    const groupId = String(memory.groupId || path.basename(file, ".json"));
    const items = [...(memory.factAnchors || []), ...(memory.persistentRequirements || []), ...(memory.decisions || [])].slice(-perScopeLimit);
    for (const item of items) {
      const text = itemText("factAnchors", item);
      if (!text) continue;
      checked++;
      const messageId = item.messageId || item.source?.messageId;
      const source = traceSources && messageId ? sourceMessageExists(groupId, messageId) : { exists: !!messageId };
      if (source.exists) {
        passed++;
        evidence.push({ scope: "group", scopeId: groupId, source: messageId, item: text.slice(0, 120) });
      } else {
        gaps.push({ scope: "group", scopeId: groupId, item: text.slice(0, 120), reason: "缺少可定位群聊消息来源" });
      }
    }
  }
  for (const file of listJsonFiles(PROJECT_MEMORY_DIR)) {
    const memory = readMemoryFile(file);
    if (!memory) continue;
    const archives = [...(memory.conclusionArchives || []), ...(memory.decisionArchives || [])];
    for (const archive of archives.slice(-perScopeLimit)) {
      checked++;
      const ok = !!archive.id && !!archive.checksum && Array.isArray(archive.records);
      if (ok) {
        passed++;
        evidence.push({ scope: "project", scopeId: memory.project, source: archive.id, records: archive.records.length });
      } else gaps.push({ scope: "project", scopeId: memory.project, reason: "项目归档缺少 archive id/checksum/records" });
    }
  }
  try {
    const globalMemory = require("../../agents/global/memory").loadGlobalAgentMemory({ recover: false });
    for (const archive of globalMemory.archives || []) {
      checked++;
      const ids = archive.summary?.sourceMessageIds || [];
      if (ids.length > 0 && ids.length === Number(archive.count || ids.length)) {
        passed++;
        evidence.push({ scope: "global", scopeId: "global-agent", source: archive.archiveId || archive.id, messages: ids.length });
      } else gaps.push({ scope: "global", scopeId: "global-agent", reason: "全局归档 sourceMessageIds 不完整" });
    }
  } catch {}
  return makeQualityCheck("source_traceability", "摘要来源可追溯", checked, passed, evidence, gaps, "检查群聊消息 ID、项目归档 checksum、全局 sourceMessageIds。");
}

function childGlobalAgentMemoryBridgeTarget(memory: any = {}) {
  const agentMemoryKeys = Object.keys(memory.agentMemories || {}).filter(Boolean);
  if (agentMemoryKeys.length) return agentMemoryKeys[0];
  const completedProject = (Array.isArray(memory.completed) ? memory.completed : []).map((item: any) => item.project).find(Boolean);
  if (completedProject) return completedProject;
  const ledgerProject = (Array.isArray(memory.workerLedger) ? memory.workerLedger : []).map((item: any) => item.project || item.agent).find(Boolean);
  return ledgerProject || "coordinator";
}

function buildChildGlobalAgentMemoryBridgeReport(options: any = {}) {
  const explicitGroupIds = Array.isArray(options.groupIds || options.group_ids)
    ? (options.groupIds || options.group_ids).map((item: any) => String(item || "").trim()).filter(Boolean)
    : null;
  const files = explicitGroupIds?.length
    ? explicitGroupIds.map((id: string) => path.join(GROUP_MEMORY_DIR, `${id}.json`))
    : listJsonFiles(GROUP_MEMORY_DIR).slice(0, Number(options.groupLimit || options.group_limit || 30));
  let memoryApi: any = {};
  try {
    memoryApi = require("../collaboration/memory");
  } catch {}
  const rows = files.map(file => {
    const fileGroupId = path.basename(file, ".json");
    const memory = readMemoryFile(file) || { groupId: fileGroupId };
    const groupId = String(memory.groupId || fileGroupId);
    if (typeof memoryApi.buildAgentMemoryContextBundle !== "function") {
      return {
        groupId,
        status: "fail",
        targetProject: "",
        itemCount: 0,
        renderedHasBridge: false,
        sourceManifestHasGlobalMemory: false,
        compactReferencesHasGlobalMemory: false,
        reason: "buildAgentMemoryContextBundle unavailable",
      };
    }
    const targetProject = String(options.targetProject || options.target_project || childGlobalAgentMemoryBridgeTarget(memory));
    const query = compactMemoryCenterText([
      options.query || "",
      memory.goal || "",
      memory.currentPhase || "",
      memory.messageDigest || "",
      targetProject,
    ].filter(Boolean).join("\n"), 1800);
    let bundle: any = {};
    try {
      bundle = memoryApi.buildAgentMemoryContextBundle(groupId, targetProject, query || "global agent memory bridge diagnostic", {
        maxRenderedChars: options.maxRenderedChars || options.max_rendered_chars || 9000,
        maxGlobalAgentMemory: options.maxGlobalAgentMemory || options.max_global_agent_memory || 5,
        includeGlobalClaudeMemory: options.includeGlobalClaudeMemory === true,
        includeProjectMemory: options.includeProjectMemory === true,
      });
    } catch (error: any) {
      return {
        groupId,
        status: "fail",
        targetProject,
        itemCount: 0,
        renderedHasBridge: false,
        sourceManifestHasGlobalMemory: false,
        compactReferencesHasGlobalMemory: false,
        reason: compactMemoryCenterText(error?.message || error, 260),
      };
    }
    const recall = bundle.global_agent_memory || {};
    const itemCount = Number(recall.itemCount || (Array.isArray(recall.items) ? recall.items.length : 0));
    const arbitration = recall.arbitration || {};
    const demotedCount = Number(arbitration.demotedCount || 0);
    const conflictCount = Number(arbitration.conflictCount || 0);
    const crossGroupSuppression = recall.crossGroupSuppression || {};
    const crossGroupSuppressedCount = Number(arbitration.crossGroupSuppressedCount || crossGroupSuppression.suppressedCount || 0);
    const rendered = String(bundle.rendered_text || "");
    const renderedHasBridge = itemCount > 0
      ? rendered.includes("全局 Agent 长期记忆召回") && rendered.includes("global_memory_id=")
      : !rendered.includes("全局 Agent 长期记忆召回");
    const renderedHasArbitration = demotedCount > 0 || conflictCount > 0
      ? rendered.includes("全局记忆仲裁规则") && (rendered.includes("local_evidence=") || rendered.includes("cross_group_evidence="))
      : true;
    const renderedHasCrossGroupSuppression = crossGroupSuppressedCount > 0
      ? rendered.includes("跨群聊全局记忆抑制") && rendered.includes("cross_group_suppression=background_only")
      : true;
    const sourceManifestHasGlobalMemory = (bundle.source_manifest?.entries || []).some((entry: any) => entry.id === "global_agent_memory" || entry.type === "global_agent_memory_json");
    const sourceManifestHasArbitrationLedger = (bundle.source_manifest?.entries || []).some((entry: any) => entry.id === "global_memory_arbitration_ledger" || entry.type === "global_memory_arbitration_ledger");
    const sourceManifestHasCrossGroupArbitration = (bundle.source_manifest?.entries || []).some((entry: any) => entry.id === "global_memory_cross_group_arbitration" || entry.type === "global_memory_cross_group_arbitration_ledgers");
    const compactReferencesHasGlobalMemory = (bundle.compact_file_references?.references || []).some((entry: any) => entry.type === "global_agent_memory_json");
    const compactReferencesHasArbitrationLedger = (bundle.compact_file_references?.references || []).some((entry: any) => entry.type === "global_memory_arbitration_ledger");
    const compactReferencesHasCrossGroupArbitration = (bundle.compact_file_references?.references || []).some((entry: any) => entry.type === "global_memory_cross_group_arbitration");
    const rawSourceHasGlobalMemory = !!bundle.raw_sources?.global_agent_memory_file;
    const ledger = bundle.global_memory_arbitration_ledger || {};
    const ledgerRequired = demotedCount > 0 || conflictCount > 0;
    const crossGroupSuppressionRequired = crossGroupSuppressedCount > 0;
    const ledgerFile = ledger.file || bundle.raw_sources?.group_global_memory_arbitration_ledger_file || getGroupGlobalMemoryArbitrationLedgerFile(groupId);
    const ledgerRecorded = !ledgerRequired || (ledger.schema === "ccm-group-global-memory-arbitration-ledger-summary-v1"
      && Number(ledger.entryCount || 0) >= Math.max(1, demotedCount + conflictCount > 0 ? 1 : 0)
      && fs.existsSync(ledgerFile));
    const status = itemCount === 0
      ? "empty"
      : renderedHasBridge
        && renderedHasArbitration
        && sourceManifestHasGlobalMemory
        && compactReferencesHasGlobalMemory
        && rawSourceHasGlobalMemory
        && ledgerRecorded
        && (!ledgerRequired || (sourceManifestHasArbitrationLedger && compactReferencesHasArbitrationLedger))
        && (!crossGroupSuppressionRequired || (renderedHasCrossGroupSuppression && sourceManifestHasCrossGroupArbitration && compactReferencesHasCrossGroupArbitration))
          ? "ok" : "fail";
    return {
      schema: "ccm-child-global-agent-memory-bridge-row-v1",
      groupId,
      status,
      targetProject,
      itemCount,
      demotedCount,
      conflictCount,
      crossGroupSuppressedCount,
      crossGroupSuppressionRequired,
      renderedHasCrossGroupSuppression,
      recallReason: recall.reason || "",
      renderedHasBridge,
      renderedHasArbitration,
      sourceManifestHasGlobalMemory,
      sourceManifestHasArbitrationLedger,
      sourceManifestHasCrossGroupArbitration,
      compactReferencesHasGlobalMemory,
      compactReferencesHasArbitrationLedger,
      compactReferencesHasCrossGroupArbitration,
      rawSourceHasGlobalMemory,
      arbitrationLedgerRequired: ledgerRequired,
      arbitrationLedgerRecorded: ledgerRecorded,
      arbitrationLedgerFile: ledgerFile,
      crossGroupSuppressionSourceDir: crossGroupSuppression.sourceDir || bundle.raw_sources?.global_memory_cross_group_arbitration_dir || "",
      crossGroupSuppressionItems: crossGroupSuppression.items || [],
      arbitrationLedgerEntryCount: Number(ledger.entryCount || 0),
      arbitrationLedgerRepeatedConflictCount: Number(ledger.repeatedConflictCount || 0),
      arbitrationDistillationCandidateCount: Array.isArray(ledger.distillationCandidates) ? ledger.distillationCandidates.length : 0,
      arbitrationDistilledConflictCount: Number(ledger.distilledConflictCount || 0),
      arbitrationPendingDistillationCount: Number(ledger.pendingDistillationCount || 0),
      arbitrationTypedMemoryDocs: Array.isArray(ledger.typedMemoryDocs) ? ledger.typedMemoryDocs : [],
      file: recall.file || GLOBAL_MEMORY_FILE,
      recalledIds: (Array.isArray(recall.items) ? recall.items : []).map((item: any) => item.id).filter(Boolean).slice(0, 8),
      reason: status === "fail" ? "全局 Agent 记忆召回、仲裁账本或跨群聊抑制未完整进入子 Agent 包 / source manifest / compact references" : "",
    };
  });
  const checkedRows = rows.filter(row => Number(row.itemCount || 0) > 0 || row.status === "fail");
  const passedRows = checkedRows.filter(row => row.status === "ok");
  const coverageRate = checkedRows.length ? Math.round((passedRows.length / checkedRows.length) * 1000) / 10 : null;
  const status = coverageRate === null ? "empty" : coverageRate >= 100 ? "ok" : coverageRate >= 75 ? "warn" : "fail";
  return {
    schema: "ccm-child-global-agent-memory-bridge-report-v1",
    generatedAt: now(),
    overall: {
      status,
      coverageRate,
      groupCount: rows.length,
      checkedGroupCount: checkedRows.length,
      groupsCovered: passedRows.length,
      recalledItemCount: checkedRows.reduce((sum, row) => sum + Number(row.itemCount || 0), 0),
      missingRenderedCount: checkedRows.filter(row => Number(row.itemCount || 0) > 0 && !row.renderedHasBridge).length,
      missingArbitrationRenderCount: checkedRows.filter(row => (Number(row.demotedCount || 0) > 0 || Number(row.conflictCount || 0) > 0) && !row.renderedHasArbitration).length,
      missingCrossGroupSuppressionRenderCount: checkedRows.filter(row => Number(row.crossGroupSuppressedCount || 0) > 0 && !row.renderedHasCrossGroupSuppression).length,
      missingArbitrationLedgerCount: checkedRows.filter(row => row.arbitrationLedgerRequired && !row.arbitrationLedgerRecorded).length,
      missingArbitrationLedgerReferenceCount: checkedRows.filter(row => row.arbitrationLedgerRequired && (!row.sourceManifestHasArbitrationLedger || !row.compactReferencesHasArbitrationLedger)).length,
      missingCrossGroupSuppressionReferenceCount: checkedRows.filter(row => row.crossGroupSuppressionRequired && (!row.sourceManifestHasCrossGroupArbitration || !row.compactReferencesHasCrossGroupArbitration)).length,
      missingSourceCount: checkedRows.filter(row => Number(row.itemCount || 0) > 0 && !row.sourceManifestHasGlobalMemory).length,
      missingCompactReferenceCount: checkedRows.filter(row => Number(row.itemCount || 0) > 0 && !row.compactReferencesHasGlobalMemory).length,
      demotedCount: checkedRows.reduce((sum, row) => sum + Number(row.demotedCount || 0), 0),
      conflictCount: checkedRows.reduce((sum, row) => sum + Number(row.conflictCount || 0), 0),
      crossGroupSuppressedCount: checkedRows.reduce((sum, row) => sum + Number(row.crossGroupSuppressedCount || 0), 0),
      arbitrationLedgerEntryCount: checkedRows.reduce((sum, row) => sum + Number(row.arbitrationLedgerEntryCount || 0), 0),
      repeatedArbitrationConflictCount: checkedRows.reduce((sum, row) => sum + Number(row.arbitrationLedgerRepeatedConflictCount || 0), 0),
      arbitrationDistillationCandidateCount: checkedRows.reduce((sum, row) => sum + Number(row.arbitrationDistillationCandidateCount || 0), 0),
      arbitrationDistilledConflictCount: checkedRows.reduce((sum, row) => sum + Number(row.arbitrationDistilledConflictCount || 0), 0),
      arbitrationPendingDistillationCount: checkedRows.reduce((sum, row) => sum + Number(row.arbitrationPendingDistillationCount || 0), 0),
    },
    groups: rows.slice(0, 50),
    weakGroups: rows.filter(row => row.status === "fail").slice(0, 20),
  };
}

function evaluateChildGlobalAgentMemoryBridge(options: any = {}) {
  const report = buildChildGlobalAgentMemoryBridgeReport(options);
  const checked = Number(report.overall.checkedGroupCount || 0);
  const passed = Number(report.overall.groupsCovered || 0);
  const evidence = (report.groups || []).filter((row: any) => row.status === "ok").slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    targetProject: row.targetProject,
    itemCount: row.itemCount,
    demotedCount: row.demotedCount,
    conflictCount: row.conflictCount,
    arbitrationLedgerEntryCount: row.arbitrationLedgerEntryCount,
    arbitrationLedgerRepeatedConflictCount: row.arbitrationLedgerRepeatedConflictCount,
    arbitrationDistillationCandidateCount: row.arbitrationDistillationCandidateCount,
    arbitrationDistilledConflictCount: row.arbitrationDistilledConflictCount,
    arbitrationPendingDistillationCount: row.arbitrationPendingDistillationCount,
    file: row.file,
    arbitrationLedgerFile: row.arbitrationLedgerFile,
    recalledIds: row.recalledIds,
  }));
  const gaps = (report.weakGroups || []).slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    targetProject: row.targetProject,
    reason: row.reason || "全局 Agent 记忆未完整桥接到子 Agent 包",
    itemCount: row.itemCount,
    renderedHasBridge: row.renderedHasBridge,
    renderedHasArbitration: row.renderedHasArbitration,
    arbitrationLedgerRequired: row.arbitrationLedgerRequired,
    arbitrationLedgerRecorded: row.arbitrationLedgerRecorded,
    sourceManifestHasArbitrationLedger: row.sourceManifestHasArbitrationLedger,
    compactReferencesHasArbitrationLedger: row.compactReferencesHasArbitrationLedger,
    sourceManifestHasGlobalMemory: row.sourceManifestHasGlobalMemory,
    compactReferencesHasGlobalMemory: row.compactReferencesHasGlobalMemory,
  }));
  const check: any = makeQualityCheck(
    "child_global_agent_memory_bridge",
    "子 Agent 全局记忆桥接",
    checked,
    passed,
    evidence,
    gaps,
    "当全局 Agent 长期记忆与群聊/项目子 Agent 任务相关时，必须作为独立、有来源边界的上下文注入子 Agent 记忆包，并纳入 source manifest 与 compact file references。"
  );
  check.report = report;
  return check;
}

function evaluateGlobalMemoryArbitrationLedger(options: any = {}) {
  const report = buildChildGlobalAgentMemoryBridgeReport(options);
  const rows = (report.groups || []).filter((row: any) => row.arbitrationLedgerRequired === true);
  const passedRows = rows.filter((row: any) => row.arbitrationLedgerRecorded === true
    && row.sourceManifestHasArbitrationLedger === true
    && row.compactReferencesHasArbitrationLedger === true);
  const evidence = passedRows.slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    targetProject: row.targetProject,
    demotedCount: row.demotedCount,
    conflictCount: row.conflictCount,
    ledgerFile: row.arbitrationLedgerFile,
    entryCount: row.arbitrationLedgerEntryCount,
    repeatedConflictCount: row.arbitrationLedgerRepeatedConflictCount,
    distillationCandidateCount: row.arbitrationDistillationCandidateCount,
    distilledConflictCount: row.arbitrationDistilledConflictCount,
    pendingDistillationCount: row.arbitrationPendingDistillationCount,
    typedMemoryDocs: row.arbitrationTypedMemoryDocs,
  }));
  const gaps = rows.filter((row: any) => !passedRows.includes(row)).slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    targetProject: row.targetProject,
    reason: "全局/群聊记忆仲裁有 demotion/conflict，但缺少持久化 ledger 或上下文引用。",
    demotedCount: row.demotedCount,
    conflictCount: row.conflictCount,
    arbitrationLedgerRecorded: row.arbitrationLedgerRecorded,
    sourceManifestHasArbitrationLedger: row.sourceManifestHasArbitrationLedger,
    compactReferencesHasArbitrationLedger: row.compactReferencesHasArbitrationLedger,
    ledgerFile: row.arbitrationLedgerFile,
  }));
  const check: any = makeQualityCheck(
    "global_memory_arbitration_ledger",
    "全局记忆仲裁账本",
    rows.length,
    passedRows.length,
    evidence,
    gaps,
    "当全局 Agent 记忆被群聊新证据降权或冲突时，必须写入群聊仲裁账本，并纳入 source manifest 与 compact file references，支持后续 typed memory 蒸馏。"
  );
  check.report = {
    schema: "ccm-global-memory-arbitration-ledger-quality-report-v1",
    generatedAt: now(),
    overall: {
      checkedGroupCount: rows.length,
      passedGroupCount: passedRows.length,
      demotedCount: report.overall?.demotedCount || 0,
      conflictCount: report.overall?.conflictCount || 0,
      ledgerEntryCount: report.overall?.arbitrationLedgerEntryCount || 0,
      repeatedConflictCount: report.overall?.repeatedArbitrationConflictCount || 0,
      distillationCandidateCount: report.overall?.arbitrationDistillationCandidateCount || 0,
      missingLedgerCount: report.overall?.missingArbitrationLedgerCount || 0,
      missingLedgerReferenceCount: report.overall?.missingArbitrationLedgerReferenceCount || 0,
    },
    groups: rows.slice(0, 50),
  };
  return check;
}

function evaluateGlobalMemoryArbitrationDistillation(options: any = {}) {
  const report = buildChildGlobalAgentMemoryBridgeReport(options);
  const rows = (report.groups || []).filter((row: any) => Number(row.arbitrationLedgerRepeatedConflictCount || 0) > 0);
  const passedRows = rows.filter((row: any) => Number(row.arbitrationPendingDistillationCount || 0) === 0
    && Number(row.arbitrationDistilledConflictCount || 0) >= Number(row.arbitrationLedgerRepeatedConflictCount || 0)
    && Array.isArray(row.arbitrationTypedMemoryDocs)
    && row.arbitrationTypedMemoryDocs.length > 0);
  const evidence = passedRows.slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    targetProject: row.targetProject,
    repeatedConflictCount: row.arbitrationLedgerRepeatedConflictCount,
    distilledConflictCount: row.arbitrationDistilledConflictCount,
    typedMemoryDocs: row.arbitrationTypedMemoryDocs,
    ledgerFile: row.arbitrationLedgerFile,
  }));
  const gaps = rows.filter((row: any) => !passedRows.includes(row)).slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    targetProject: row.targetProject,
    reason: "全局/群聊记忆重复冲突尚未蒸馏为 typed MEMORY.md。",
    repeatedConflictCount: row.arbitrationLedgerRepeatedConflictCount,
    distilledConflictCount: row.arbitrationDistilledConflictCount,
    pendingDistillationCount: row.arbitrationPendingDistillationCount,
    typedMemoryDocs: row.arbitrationTypedMemoryDocs,
    ledgerFile: row.arbitrationLedgerFile,
  }));
  const check: any = makeQualityCheck(
    "global_memory_arbitration_distillation",
    "全局记忆仲裁蒸馏",
    rows.length,
    passedRows.length,
    evidence,
    gaps,
    "同一全局记忆多次被群聊新证据降权/冲突时，必须自动沉淀为 typed MEMORY.md，供后续子 Agent 稳定召回。"
  );
  check.report = {
    schema: "ccm-global-memory-arbitration-distillation-quality-report-v1",
    generatedAt: now(),
    overall: {
      checkedGroupCount: rows.length,
      passedGroupCount: passedRows.length,
      repeatedConflictCount: report.overall?.repeatedArbitrationConflictCount || 0,
      distilledConflictCount: report.overall?.arbitrationDistilledConflictCount || 0,
      pendingDistillationCount: report.overall?.arbitrationPendingDistillationCount || 0,
    },
    groups: rows.slice(0, 50),
  };
  return check;
}

function evaluateGlobalMemoryCrossGroupSuppression(options: any = {}) {
  const report = buildChildGlobalAgentMemoryBridgeReport(options);
  const rows = (report.groups || []).filter((row: any) => Number(row.crossGroupSuppressedCount || 0) > 0);
  const passedRows = rows.filter((row: any) => row.renderedHasCrossGroupSuppression === true
    && row.sourceManifestHasCrossGroupArbitration === true
    && row.compactReferencesHasCrossGroupArbitration === true);
  const evidence = passedRows.slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    targetProject: row.targetProject,
    suppressedCount: row.crossGroupSuppressedCount,
    sourceDir: row.crossGroupSuppressionSourceDir,
    items: row.crossGroupSuppressionItems,
  }));
  const gaps = rows.filter((row: any) => !passedRows.includes(row)).slice(0, 12).map((row: any) => ({
    groupId: row.groupId,
    targetProject: row.targetProject,
    reason: "跨群聊全局记忆抑制存在，但缺少渲染提示或 source/compact references。",
    suppressedCount: row.crossGroupSuppressedCount,
    renderedHasCrossGroupSuppression: row.renderedHasCrossGroupSuppression,
    sourceManifestHasCrossGroupArbitration: row.sourceManifestHasCrossGroupArbitration,
    compactReferencesHasCrossGroupArbitration: row.compactReferencesHasCrossGroupArbitration,
    sourceDir: row.crossGroupSuppressionSourceDir,
  }));
  const check: any = makeQualityCheck(
    "global_memory_cross_group_suppression",
    "跨群聊全局记忆抑制",
    rows.length,
    passedRows.length,
    evidence,
    gaps,
    "当同一全局 Agent 记忆已在其他群聊被降权或冲突时，后续子 Agent 包必须显式降为 background-only，并保留跨群聊仲裁 ledger 来源。"
  );
  check.report = {
    schema: "ccm-global-memory-cross-group-suppression-quality-report-v1",
    generatedAt: now(),
    overall: {
      checkedGroupCount: rows.length,
      passedGroupCount: passedRows.length,
      suppressedCount: report.overall?.crossGroupSuppressedCount || 0,
      missingRenderCount: report.overall?.missingCrossGroupSuppressionRenderCount || 0,
      missingReferenceCount: report.overall?.missingCrossGroupSuppressionReferenceCount || 0,
    },
    groups: rows.slice(0, 50),
  };
  return check;
}

function readCachedQualityReport(maxAgeMs = 10 * 60 * 1000) {
  const cached = readJson(QUALITY_FILE, null);
  if (!cached?.generatedAt) return null;
  const ageMs = Date.now() - Date.parse(cached.generatedAt);
  return ageMs >= 0 && ageMs <= maxAgeMs ? { ...cached, cached: true, cacheAgeMs: ageMs } : null;
}

function normalizeQualityCheckIds(options: any = {}) {
  const raw = options.checkIds ?? options.check_ids ?? options.checks ?? options.check ?? options.id ?? "";
  const list = Array.isArray(raw)
    ? raw
    : String(raw || "").split(/[,\s]+/g);
  return [...new Set(list.map((item: any) => String(item || "").trim()).filter(Boolean))];
}

function memoryQualityCheckDescriptors(lightweight: boolean, options: any = {}) {
  return [
    { id: "constraint_retention", run: () => evaluateConstraintRetention({ perScopeLimit: lightweight ? 80 : 300, traceSources: !lightweight }) },
    { id: "child_agent_memory_use", run: () => evaluateChildAgentMemoryUse({ taskLimit: lightweight ? 12 : 80, textLimit: lightweight ? 1800 : 6000 }) },
    { id: "child_agent_memory_reliability", run: () => evaluateChildAgentMemoryReliability({ taskLimit: lightweight ? 20 : 120 }) },
    { id: "compact_boundary_timeline", run: () => evaluateCompactBoundaryTimeline({}) },
    { id: "compaction_hook_ledger", run: () => evaluateCompactionHookLedger({}) },
    { id: "compact_boundary_replay_gate", run: () => evaluateCompactBoundaryReplayGate({}) },
    { id: "replay_repair_pending_work_items", run: () => evaluateReplayRepairPendingWorkItems({}) },
    { id: "replay_repair_dispatch_candidates", run: () => evaluateReplayRepairDispatchCandidates({}) },
    { id: "group_session_memory_snapshots", run: () => evaluateGroupSessionMemorySnapshots({}) },
    { id: "group_tool_continuity_snapshots", run: () => evaluateGroupToolContinuitySnapshots({}) },
    { id: "compact_file_references", run: () => evaluateCompactFileReferences({}) },
    { id: "compact_file_reference_read_plan", run: () => evaluateCompactFileReferenceReadPlan({}) },
    { id: "compact_file_reference_read_plan_freshness", run: () => evaluateCompactFileReferenceReadPlanFreshness({}) },
    { id: "compact_file_reference_read_plan_revalidation_gate", run: () => evaluateCompactFileReferenceReadPlanRevalidationGate({}) },
    { id: "compact_file_reference_read_plan_revalidation_session_binding", run: () => evaluateCompactFileReferenceReadPlanRevalidationSessionBinding({}) },
    { id: "compact_file_reference_read_plan_revalidation_repair_work_items", run: () => evaluateCompactFileReferenceReadPlanRevalidationRepairWorkItems({}) },
    { id: "compact_file_reference_read_plan_usage_discipline", run: () => evaluateCompactFileReferenceReadPlanUsageDiscipline({}) },
    { id: "compact_file_reference_usage_discipline", run: () => evaluateCompactFileReferenceUsageDiscipline({}) },
    { id: "historical_compact_boundary_replay", run: () => evaluateHistoricalCompactBoundaryReplay({}) },
    { id: "child_agent_type_replay_matrix", run: () => evaluateChildAgentTypeReplayMatrix({}) },
    { id: "post_compact_candidate_discipline", run: () => evaluatePostCompactCandidateDiscipline({ taskLimit: lightweight ? 20 : 120 }) },
    { id: "post_compact_dispatch_continuity", run: () => evaluatePostCompactDispatchContinuity({}) },
    { id: "rag_recall", run: () => evaluateRagRecall({ skipRag: lightweight, sampleLimit: options.ragSampleLimit || 5 }) },
    { id: "long_task_goal_consistency", run: () => evaluateLongTaskGoalConsistency({ taskLimit: lightweight ? 20 : 120 }) },
    { id: "source_traceability", run: () => evaluateSourceTraceability({ perScopeLimit: lightweight ? 80 : 300, traceSources: !lightweight }) },
    { id: "child_global_agent_memory_bridge", run: () => evaluateChildGlobalAgentMemoryBridge({ groupLimit: lightweight ? 8 : 30 }) },
    { id: "global_memory_arbitration_ledger", run: () => evaluateGlobalMemoryArbitrationLedger({ groupLimit: lightweight ? 8 : 30 }) },
    { id: "global_memory_arbitration_distillation", run: () => evaluateGlobalMemoryArbitrationDistillation({ groupLimit: lightweight ? 8 : 30 }) },
    { id: "global_memory_cross_group_suppression", run: () => evaluateGlobalMemoryCrossGroupSuppression({ groupLimit: lightweight ? 8 : 30 }) },
  ];
}

export function buildMemoryQualityReport(options: any = {}) {
  const requestedCheckIds = normalizeQualityCheckIds(options);
  const targeted = requestedCheckIds.length > 0;
  if (!targeted && options.refresh !== true) {
    const cached = readCachedQualityReport(Number(options.cacheMaxAgeMs || 10 * 60 * 1000));
    if (cached) return cached;
  }
  const lightweight = options.refresh !== true;
  const descriptors = memoryQualityCheckDescriptors(lightweight, options);
  const requested = new Set(requestedCheckIds);
  const selectedDescriptors = targeted
    ? descriptors.filter(item => requested.has(item.id))
    : descriptors;
  const selectedIds = selectedDescriptors.map(item => item.id);
  const unknownCheckIds = targeted ? requestedCheckIds.filter(id => !selectedIds.includes(id)) : [];
  const startedAtMs = Date.now();
  const checks = selectedDescriptors.map(descriptor => descriptor.run());
  const scored = checks.filter(item => item.score !== null);
  const overallScore = scored.length ? Math.round(scored.reduce((sum, item) => sum + Number(item.score || 0), 0) / scored.length * 10) / 10 : null;
  const report = {
    id: `memory-quality-${Date.now().toString(36)}`,
    generatedAt: now(),
    overallScore,
    status: overallScore === null ? "empty" : overallScore >= 90 ? "ok" : overallScore >= 70 ? "warn" : "fail",
    checks,
    nextActions: checks.flatMap(check => (check.gaps || []).slice(0, 2).map((gap: any) => `${check.label}：${gap.reason || "存在缺口"}`)).slice(0, 8),
    lightweight,
    targeted,
    requestedCheckIds,
    unknownCheckIds,
    availableCheckIds: descriptors.map(item => item.id),
    durationMs: Date.now() - startedAtMs,
    cached: false,
  };
  if (!targeted || options.writeTargeted === true || options.write_targeted === true) writeJsonAtomic(QUALITY_FILE, report);
  if (options.record === true) appendAudit({
    type: "memory_quality",
    action: targeted ? "quality_report_targeted" : "quality_report",
    scope: "system",
    scopeId: "all",
    actor: "local-user",
    reason: targeted ? `记忆压缩质量定向评估：${requestedCheckIds.join(",")}` : "记忆压缩质量评估",
    overallScore,
    status: report.status,
    targeted,
    requestedCheckIds,
    unknownCheckIds,
  });
  return report;
}

export function buildMemoryCenterOverview() {
  const labels = groupLabelMap();
  const groups = listJsonFiles(GROUP_MEMORY_DIR).map(file => readMemoryFile(file)).filter(Boolean)
    .map((memory: any) => memorySummary("group", String(memory.groupId || path.basename(memory.__file || "", ".json")), memory, String(labels.get(String(memory.groupId)) || memory.groupId)));
  const projects = listJsonFiles(PROJECT_MEMORY_DIR).map(file => readMemoryFile(file)).filter(Boolean)
    .map((memory: any) => memorySummary("project", String(memory.project || "unknown"), memory, String(memory.project || "unknown")));
  const globalMemory = fs.existsSync(GLOBAL_MEMORY_FILE) ? require("../../agents/global/memory").loadGlobalAgentMemory({ recover: false }) : null;
  const globals = globalMemory ? [memorySummary("global", "global-agent", globalMemory, "全局 Agent 长期记忆")] : [];
  const allAlerts = [
    ...listJsonFiles(GROUP_MEMORY_DIR).flatMap(file => { const memory = readMemoryFile(file); return memory ? healthAlerts("group", String(memory.groupId || path.basename(file, ".json")), memory) : []; }),
    ...listJsonFiles(PROJECT_MEMORY_DIR).flatMap(file => { const memory = readMemoryFile(file); return memory ? healthAlerts("project", String(memory.project || path.basename(file, ".json")), memory) : []; }),
    ...(globalMemory ? healthAlerts("global", "global-agent", globalMemory) : []),
  ];
  const metrics = getMemoryMetrics();
  const acceptanceRates = metrics.latestAcceptance?.rates || {};
  const addSystemAlert = (severity: string, code: string, message: string) => allAlerts.push({ id: `system:all:${code}`, scope: "system", scopeId: "all", severity, code, message });
  if (acceptanceRates.recallRate !== null && acceptanceRates.recallRate < 95) addSystemAlert("warning", "recall_baseline", `真实历史证据召回率仅 ${acceptanceRates.recallRate}%`);
  if (Number(acceptanceRates.forgettingRate || 0) > 0) addSystemAlert("critical", "memory_forgetting", `检测到 ${acceptanceRates.forgettingRate}% 的持续约束无法回溯原文`);
  if (acceptanceRates.recoverySuccessRate !== null && acceptanceRates.recoverySuccessRate < 100) addSystemAlert("critical", "backup_recoverability", `可用备份比例仅 ${acceptanceRates.recoverySuccessRate}%`);
  if (acceptanceRates.projectIntegrityRate !== null && acceptanceRates.projectIntegrityRate < 100) addSystemAlert("critical", "project_archive_integrity", `项目归档完整率仅 ${acceptanceRates.projectIntegrityRate}%`);
  const postCompactDisciplineTrend = buildPostCompactCandidateDisciplineTrend({ taskLimit: 120, minSample: 3 });
  const postCompactDispatchTrend = buildPostCompactDispatchMarkerTrend({});
  const childAgentReliabilityReport = buildChildAgentMemoryReliabilityReport({ taskLimit: 120 });
  const compactBoundaryTimelineReport = buildCompactBoundaryTimelineReport({});
  const compactionHookLedgerReport = buildCompactionHookLedgerReport({});
  const compactBoundaryReplayReport = buildCompactBoundaryReplayReport({});
  const replayRepairPendingWorkItemReport = buildReplayRepairPendingWorkItemReport({});
  const historicalCompactBoundaryReplayReport = buildHistoricalCompactBoundaryReplayReport({});
  const childAgentTypeReplayMatrixReport = buildChildAgentTypeReplayMatrixReport({});
  const compactFileReferenceReadPlanReport = buildCompactFileReferenceReadPlanReport({});
  const compactFileReferenceReadPlanFreshnessReport = buildCompactFileReferenceReadPlanFreshnessReport({});
  const compactFileReferenceReadPlanRevalidationGateReport = buildCompactFileReferenceReadPlanRevalidationGateReport({});
  const compactFileReferenceReadPlanRevalidationSessionBindingReport = compactFileReferenceReadPlanRevalidationGateReport;
  const compactFileReferenceReadPlanRevalidationRepairWorkItemReport = buildCompactFileReferenceReadPlanRevalidationRepairWorkItemReport({});
  const compactFileReferenceReadPlanUsageDisciplineReport = buildCompactFileReferenceReadPlanUsageDisciplineReport({});
  const compactFileReferenceUsageDisciplineReport = buildCompactFileReferenceUsageDisciplineReport({});
  const childGlobalAgentMemoryBridgeReport = buildChildGlobalAgentMemoryBridgeReport({ groupLimit: 12 });
  if (postCompactDisciplineTrend.overall?.alert) {
    const rate = postCompactDisciplineTrend.overall.strictClassificationRate ?? postCompactDisciplineTrend.overall.ledger?.strictClassificationRate ?? "待采样";
    addSystemAlert(
      postCompactDisciplineTrend.overall.status === "fail" ? "critical" : "warning",
      "post_compact_candidate_discipline",
      `压缩重注入候选严格分类率 ${rate}%，低于 ${postCompactDisciplineTrend.threshold}% 阈值；stale promoted ${postCompactDisciplineTrend.overall.stalePromoted || 0} 个`
    );
  }
  for (const group of postCompactDisciplineTrend.alertGroups || []) {
    const severity = group.status === "fail" ? "critical" : "warning";
    allAlerts.push({
      id: `group:${group.groupId}:post_compact_candidate_discipline`,
      scope: "group",
      scopeId: group.groupId,
      severity,
      code: "post_compact_candidate_discipline",
      message: `压缩候选严格分类率 ${group.strictClassificationRate ?? group.ledger?.strictClassificationRate ?? "待采样"}%，stale promoted ${group.stalePromoted || 0} 个，需补 used/ignored/verified 回执`,
    });
    const summary = groups.find(item => item.id === group.groupId);
    if (summary) {
      summary.alerts = Number(summary.alerts || 0) + 1;
      if (severity === "critical") summary.health = "critical";
      else if (summary.health === "healthy") summary.health = "warning";
    }
  }
  if (postCompactDispatchTrend.overall?.status === "fail" || postCompactDispatchTrend.overall?.status === "warn") {
    addSystemAlert(
      postCompactDispatchTrend.overall.status === "fail" ? "critical" : "warning",
      "post_compact_dispatch_marker",
      `压缩后首派发 marker 异常群聊 ${postCompactDispatchTrend.overall.failedGroups || 0} 个，等待超时 ${postCompactDispatchTrend.overall.warnGroups || 0} 个`
    );
  }
  for (const group of postCompactDispatchTrend.alertGroups || []) {
    const severity = group.status === "fail" ? "critical" : "warning";
    allAlerts.push({
      id: `group:${group.groupId}:post_compact_dispatch_marker`,
      scope: "group",
      scopeId: group.groupId,
      severity,
      code: "post_compact_dispatch_marker",
      message: group.gaps?.[0]?.reason || "压缩后首派发 marker 异常",
    });
    const summary = groups.find(item => item.id === group.groupId);
    if (summary) {
      summary.alerts = Number(summary.alerts || 0) + 1;
      if (severity === "critical") summary.health = "critical";
      else if (summary.health === "healthy") summary.health = "warning";
    }
  }
  if (childAgentReliabilityReport.overall?.status === "fail" || childAgentReliabilityReport.overall?.status === "warn") {
    addSystemAlert(
      childAgentReliabilityReport.overall.status === "fail" ? "critical" : "warning",
      "child_agent_memory_reliability",
      `子 Agent 记忆可靠性 ${childAgentReliabilityReport.overall.score ?? "待采样"}%，弱 Agent ${childAgentReliabilityReport.weakAgents?.length || 0} 个`
    );
  }
  for (const agent of childAgentReliabilityReport.weakAgents || []) {
    const severity = agent.status === "fail" ? "critical" : "warning";
    allAlerts.push({
      id: `group:${agent.groupId}:child_agent_memory_reliability:${agent.agent}`,
      scope: "group",
      scopeId: agent.groupId,
      severity,
      code: "child_agent_memory_reliability",
      message: `${agent.agent} 记忆可靠性 ${agent.score ?? "待采样"}%，${agent.gaps?.[0]?.reason || "需要补记忆使用证据"}`,
    });
    const summary = groups.find(item => item.id === agent.groupId);
    if (summary) {
      summary.alerts = Number(summary.alerts || 0) + 1;
      if (severity === "critical") summary.health = "critical";
      else if (summary.health === "healthy") summary.health = "warning";
    }
  }
  if (compactBoundaryTimelineReport.overall?.status === "fail" || compactBoundaryTimelineReport.overall?.status === "warn") {
    addSystemAlert(
      compactBoundaryTimelineReport.overall.status === "fail" ? "critical" : "warning",
      "compact_boundary_timeline",
      `压缩边界时间线 ${compactBoundaryTimelineReport.overall.score ?? "待采样"}%，缺口 ${compactBoundaryTimelineReport.overall.gapCount || 0} 个`
    );
  }
  for (const row of compactBoundaryTimelineReport.weakGroups || []) {
    const severity = row.status === "fail" ? "critical" : "warning";
    allAlerts.push({
      id: `group:${row.groupId}:compact_boundary_timeline`,
      scope: "group",
      scopeId: row.groupId,
      severity,
      code: "compact_boundary_timeline",
      message: row.gaps?.[0]?.reason || "compact boundary timeline 存在缺口",
    });
    const summary = groups.find(item => item.id === row.groupId);
    if (summary) {
      summary.alerts = Number(summary.alerts || 0) + 1;
      if (severity === "critical") summary.health = "critical";
      else if (summary.health === "healthy") summary.health = "warning";
    }
  }
  if (compactionHookLedgerReport.overall?.status === "fail" || compactionHookLedgerReport.overall?.status === "warn") {
    addSystemAlert(
      compactionHookLedgerReport.overall.status === "fail" ? "critical" : "warning",
      "compaction_hook_ledger",
      `压缩 Hook Ledger ${compactionHookLedgerReport.overall.score ?? "待采样"}%，失败 hook ${compactionHookLedgerReport.overall.failedHookCount || 0} 个，缺阶段 ${compactionHookLedgerReport.overall.missingPhaseGroupCount || 0} 个群聊`
    );
  }
  for (const row of compactionHookLedgerReport.weakGroups || []) {
    const severity = row.status === "fail" ? "critical" : "warning";
    allAlerts.push({
      id: `group:${row.groupId}:compaction_hook_ledger`,
      scope: "group",
      scopeId: row.groupId,
      severity,
      code: "compaction_hook_ledger",
      message: row.gaps?.[0]?.reason || "compact hook ledger 存在缺口",
    });
    const summary = groups.find(item => item.id === row.groupId);
    if (summary) {
      summary.alerts = Number(summary.alerts || 0) + 1;
      if (severity === "critical") summary.health = "critical";
      else if (summary.health === "healthy") summary.health = "warning";
    }
  }
  if (compactBoundaryReplayReport.overall?.status === "fail" || compactBoundaryReplayReport.overall?.status === "warn") {
    addSystemAlert(
      compactBoundaryReplayReport.overall.status === "fail" ? "critical" : "warning",
      "compact_boundary_replay_gate",
      `压缩边界 Replay Gate ${compactBoundaryReplayReport.overall.score ?? "待采样"}%，缺口 ${compactBoundaryReplayReport.overall.gapCount || 0} 个，待修复动作 ${compactBoundaryReplayReport.overall.repairActionCount || 0} 个`
    );
  }
  for (const row of compactBoundaryReplayReport.weakGroups || []) {
    const severity = row.status === "fail" ? "critical" : "warning";
    allAlerts.push({
      id: `group:${row.groupId}:compact_boundary_replay_gate`,
      scope: "group",
      scopeId: row.groupId,
      severity,
      code: "compact_boundary_replay_gate",
      message: row.repairPlan?.actions?.[0]?.instruction || row.gaps?.[0]?.reason || "compact boundary replay gate 存在缺口",
    });
    const summary = groups.find(item => item.id === row.groupId);
    if (summary) {
      summary.alerts = Number(summary.alerts || 0) + 1;
      if (severity === "critical") summary.health = "critical";
      else if (summary.health === "healthy") summary.health = "warning";
    }
  }
  if (replayRepairPendingWorkItemReport.overall?.status === "fail" || replayRepairPendingWorkItemReport.overall?.status === "warn") {
    addSystemAlert(
      replayRepairPendingWorkItemReport.overall.status === "fail" ? "critical" : "warning",
      "replay_repair_pending_work_items",
      `Replay 修复待办覆盖率 ${replayRepairPendingWorkItemReport.overall.coverageRate ?? "待采样"}%，open ${replayRepairPendingWorkItemReport.overall.openItemCount || 0} 个，required ${replayRepairPendingWorkItemReport.overall.requiredActionCount || 0} 个`
    );
  }
  for (const row of replayRepairPendingWorkItemReport.weakGroups || []) {
    const severity = row.status === "fail" ? "critical" : "warning";
    allAlerts.push({
      id: `group:${row.groupId}:replay_repair_pending_work_items`,
      scope: "group",
      scopeId: row.groupId,
      severity,
      code: "replay_repair_pending_work_items",
      message: row.gaps?.[0]?.reason || `Replay repair work items open ${row.openItemCount || 0}`,
    });
    const summary = groups.find(item => item.id === row.groupId);
    if (summary) {
      summary.alerts = Number(summary.alerts || 0) + 1;
      if (severity === "critical") summary.health = "critical";
      else if (summary.health === "healthy") summary.health = "warning";
    }
  }
  if (historicalCompactBoundaryReplayReport.overall?.status === "fail" || historicalCompactBoundaryReplayReport.overall?.status === "warn") {
    addSystemAlert(
      historicalCompactBoundaryReplayReport.overall.status === "fail" ? "critical" : "warning",
      "historical_compact_boundary_replay",
      `历史压缩边界 Replay ${historicalCompactBoundaryReplayReport.overall.score ?? "待采样"}%，历史边界 ${historicalCompactBoundaryReplayReport.overall.boundaryCount || 0} 个，缺口 ${historicalCompactBoundaryReplayReport.overall.gapCount || 0} 个`
    );
  }
  for (const row of historicalCompactBoundaryReplayReport.weakGroups || []) {
    const severity = row.status === "fail" ? "critical" : "warning";
    allAlerts.push({
      id: `group:${row.groupId}:historical_compact_boundary_replay`,
      scope: "group",
      scopeId: row.groupId,
      severity,
      code: "historical_compact_boundary_replay",
      message: row.gaps?.[0]?.reason || "historical compact boundary replay 存在缺口",
    });
    const summary = groups.find(item => item.id === row.groupId);
    if (summary) {
      summary.alerts = Number(summary.alerts || 0) + 1;
      if (severity === "critical") summary.health = "critical";
      else if (summary.health === "healthy") summary.health = "warning";
    }
  }
  if (childAgentTypeReplayMatrixReport.overall?.status === "fail" || childAgentTypeReplayMatrixReport.overall?.status === "warn") {
    addSystemAlert(
      childAgentTypeReplayMatrixReport.overall.status === "fail" ? "critical" : "warning",
      "child_agent_type_replay_matrix",
      `子 Agent 类型 Replay ${childAgentTypeReplayMatrixReport.overall.score ?? "待采样"}%，弱类型 ${childAgentTypeReplayMatrixReport.overall.weakTypeCount || 0} 个，缺口 ${childAgentTypeReplayMatrixReport.overall.gapCount || 0} 个`
    );
  }
  for (const row of childAgentTypeReplayMatrixReport.weakGroups || []) {
    const severity = row.status === "fail" ? "critical" : "warning";
    allAlerts.push({
      id: `group:${row.groupId}:child_agent_type_replay_matrix`,
      scope: "group",
      scopeId: row.groupId,
      severity,
      code: "child_agent_type_replay_matrix",
      message: row.gaps?.[0]?.reason || "child agent type replay matrix 存在缺口",
    });
    const summary = groups.find(item => item.id === row.groupId);
    if (summary) {
      summary.alerts = Number(summary.alerts || 0) + 1;
      if (severity === "critical") summary.health = "critical";
      else if (summary.health === "healthy") summary.health = "warning";
    }
  }
  if (compactFileReferenceReadPlanReport.overall?.status === "fail" || compactFileReferenceReadPlanReport.overall?.status === "warn") {
    addSystemAlert(
      compactFileReferenceReadPlanReport.overall.status === "fail" ? "critical" : "warning",
      "compact_file_reference_read_plan",
      `compact file reference read plan 覆盖率 ${compactFileReferenceReadPlanReport.overall.coverageRate ?? "待采样"}%，弱群聊 ${compactFileReferenceReadPlanReport.weakGroups?.length || 0} 个`
    );
  }
  for (const row of compactFileReferenceReadPlanReport.weakGroups || []) {
    const severity = row.status === "fail" ? "critical" : "warning";
    allAlerts.push({
      id: `group:${row.groupId}:compact_file_reference_read_plan`,
      scope: "group",
      scopeId: row.groupId,
      severity,
      code: "compact_file_reference_read_plan",
      message: row.gaps?.[0]?.reason || "compact file reference 缺少按需读取计划",
    });
    const summary = groups.find(item => item.id === row.groupId);
    if (summary) {
      summary.alerts = Number(summary.alerts || 0) + 1;
      if (severity === "critical") summary.health = "critical";
      else if (summary.health === "healthy") summary.health = "warning";
    }
  }
  if (compactFileReferenceReadPlanFreshnessReport.overall?.status === "fail" || compactFileReferenceReadPlanFreshnessReport.overall?.status === "warn") {
    addSystemAlert(
      compactFileReferenceReadPlanFreshnessReport.overall.status === "fail" ? "critical" : "warning",
      "compact_file_reference_read_plan_freshness",
      `compact read plan 源新鲜度 ${compactFileReferenceReadPlanFreshnessReport.overall.freshnessRate ?? "待采样"}%，changed ${compactFileReferenceReadPlanFreshnessReport.overall.changed || 0}，unverifiable ${compactFileReferenceReadPlanFreshnessReport.overall.unverifiable || 0}`
    );
  }
  for (const row of compactFileReferenceReadPlanFreshnessReport.weakGroups || []) {
    const severity = row.status === "fail" ? "critical" : "warning";
    allAlerts.push({
      id: `group:${row.groupId}:compact_file_reference_read_plan_freshness`,
      scope: "group",
      scopeId: row.groupId,
      severity,
      code: "compact_file_reference_read_plan_freshness",
      message: row.gaps?.[0]?.reason || "compact read plan 源文件已变化或无法核验",
    });
    const summary = groups.find(item => item.id === row.groupId);
    if (summary) {
      summary.alerts = Number(summary.alerts || 0) + 1;
      if (severity === "critical") summary.health = "critical";
      else if (summary.health === "healthy") summary.health = "warning";
    }
  }
  if (compactFileReferenceReadPlanRevalidationGateReport.overall?.status === "fail" || compactFileReferenceReadPlanRevalidationGateReport.overall?.status === "warn") {
    addSystemAlert(
      compactFileReferenceReadPlanRevalidationGateReport.overall.status === "fail" ? "critical" : "warning",
      "compact_file_reference_read_plan_revalidation_gate",
      `compact read plan 重读门禁完成率 ${compactFileReferenceReadPlanRevalidationGateReport.overall.score ?? "待采样"}%，缺少 ${compactFileReferenceReadPlanRevalidationGateReport.overall.missing || 0} 个 current source verified 回执`
    );
  }
  for (const row of compactFileReferenceReadPlanRevalidationGateReport.weakGroups || []) {
    const severity = row.status === "fail" ? "critical" : "warning";
    allAlerts.push({
      id: `group:${row.groupId}:compact_file_reference_read_plan_revalidation_gate`,
      scope: "group",
      scopeId: row.groupId,
      severity,
      code: "compact_file_reference_read_plan_revalidation_gate",
      message: row.gaps?.[0]?.reason || "compact read plan stale source 缺少重读/当前源验证回执",
    });
    const summary = groups.find(item => item.id === row.groupId);
    if (summary) {
      summary.alerts = Number(summary.alerts || 0) + 1;
      if (severity === "critical") summary.health = "critical";
      else if (summary.health === "healthy") summary.health = "warning";
    }
  }
  if (Number(compactFileReferenceReadPlanRevalidationSessionBindingReport.overall?.sessionMismatch || 0) > 0) {
    addSystemAlert(
      "critical",
      "compact_file_reference_read_plan_revalidation_session_binding",
      `compact read plan 重读回执存在 ${compactFileReferenceReadPlanRevalidationSessionBindingReport.overall.sessionMismatch || 0} 个子 Agent 会话不匹配`
    );
  }
  for (const row of compactFileReferenceReadPlanRevalidationSessionBindingReport.groups || []) {
    if (Number(row.sessionMismatch || 0) <= 0) continue;
    allAlerts.push({
      id: `group:${row.groupId}:compact_file_reference_read_plan_revalidation_session_binding`,
      scope: "group",
      scopeId: row.groupId,
      severity: "critical",
      code: "compact_file_reference_read_plan_revalidation_session_binding",
      message: row.gaps?.find((gap: any) => gap.session_mismatch)?.reason || "compact read plan 重读回执来自错误子 Agent 会话",
    });
    const summary = groups.find(item => item.id === row.groupId);
    if (summary) {
      summary.alerts = Number(summary.alerts || 0) + 1;
      summary.health = "critical";
    }
  }
  if (compactFileReferenceReadPlanRevalidationRepairWorkItemReport.overall?.status === "fail" || compactFileReferenceReadPlanRevalidationRepairWorkItemReport.overall?.status === "warn") {
    addSystemAlert(
      compactFileReferenceReadPlanRevalidationRepairWorkItemReport.overall.status === "fail" ? "critical" : "warning",
      "compact_file_reference_read_plan_revalidation_repair_work_items",
      `读取计划重读修复待办覆盖率 ${compactFileReferenceReadPlanRevalidationRepairWorkItemReport.overall.coverageRate ?? "待采样"}%，open ${compactFileReferenceReadPlanRevalidationRepairWorkItemReport.overall.openItemCount || 0} 个，required ${compactFileReferenceReadPlanRevalidationRepairWorkItemReport.overall.requiredActionCount || 0} 个`
    );
  }
  for (const row of compactFileReferenceReadPlanRevalidationRepairWorkItemReport.weakGroups || []) {
    const severity = row.status === "fail" ? "critical" : "warning";
    allAlerts.push({
      id: `group:${row.groupId}:compact_file_reference_read_plan_revalidation_repair_work_items`,
      scope: "group",
      scopeId: row.groupId,
      severity,
      code: "compact_file_reference_read_plan_revalidation_repair_work_items",
      message: row.gaps?.[0]?.reason || `读取计划重读修复待办 open ${row.openItemCount || 0}`,
    });
    const summary = groups.find(item => item.id === row.groupId);
    if (summary) {
      summary.alerts = Number(summary.alerts || 0) + 1;
      if (severity === "critical") summary.health = "critical";
      else if (summary.health === "healthy") summary.health = "warning";
    }
  }
  if (compactFileReferenceReadPlanUsageDisciplineReport.overall?.status === "fail" || compactFileReferenceReadPlanUsageDisciplineReport.overall?.status === "warn") {
    addSystemAlert(
      compactFileReferenceReadPlanUsageDisciplineReport.overall.status === "fail" ? "critical" : "warning",
      "compact_file_reference_read_plan_usage_discipline",
      `compact read plan read_plan_id 声明率 ${compactFileReferenceReadPlanUsageDisciplineReport.overall.score ?? "待采样"}%，缺少 ${compactFileReferenceReadPlanUsageDisciplineReport.overall.missing || 0} 个回执证据`
    );
  }
  for (const row of compactFileReferenceReadPlanUsageDisciplineReport.weakGroups || []) {
    const severity = row.status === "fail" ? "critical" : "warning";
    allAlerts.push({
      id: `group:${row.groupId}:compact_file_reference_read_plan_usage_discipline`,
      scope: "group",
      scopeId: row.groupId,
      severity,
      code: "compact_file_reference_read_plan_usage_discipline",
      message: row.gaps?.[0]?.reason || "compact read plan 下发后缺少 read_plan_id 回执证据",
    });
    const summary = groups.find(item => item.id === row.groupId);
    if (summary) {
      summary.alerts = Number(summary.alerts || 0) + 1;
      if (severity === "critical") summary.health = "critical";
      else if (summary.health === "healthy") summary.health = "warning";
    }
  }
  if (compactFileReferenceUsageDisciplineReport.overall?.status === "fail" || compactFileReferenceUsageDisciplineReport.overall?.status === "warn") {
    addSystemAlert(
      compactFileReferenceUsageDisciplineReport.overall.status === "fail" ? "critical" : "warning",
      "compact_file_reference_usage_discipline",
      `compact file reference 使用声明率 ${compactFileReferenceUsageDisciplineReport.overall.score ?? "待采样"}%，缺少 ${compactFileReferenceUsageDisciplineReport.overall.missing || 0} 个 memoryUsed/memoryIgnored 证据`
    );
  }
  for (const row of compactFileReferenceUsageDisciplineReport.weakGroups || []) {
    const severity = row.status === "fail" ? "critical" : "warning";
    allAlerts.push({
      id: `group:${row.groupId}:compact_file_reference_usage_discipline`,
      scope: "group",
      scopeId: row.groupId,
      severity,
      code: "compact_file_reference_usage_discipline",
      message: row.gaps?.[0]?.reason || "compact file reference 下发后缺少 memoryUsed/memoryIgnored 证据",
    });
    const summary = groups.find(item => item.id === row.groupId);
    if (summary) {
      summary.alerts = Number(summary.alerts || 0) + 1;
      if (severity === "critical") summary.health = "critical";
      else if (summary.health === "healthy") summary.health = "warning";
    }
  }
  return {
    generatedAt: now(), groups, projects, globals, alerts: allAlerts,
    totals: { scopes: groups.length + projects.length + globals.length, healthy: [...groups, ...projects, ...globals].filter(item => item.health === "healthy").length, alerts: allAlerts.length },
    metrics,
    postCompactDisciplineTrend,
    postCompactDispatchTrend,
    childAgentReliabilityReport,
    compactBoundaryTimelineReport,
    compactionHookLedgerReport,
    compactBoundaryReplayReport,
    replayRepairPendingWorkItemReport,
    historicalCompactBoundaryReplayReport,
    childAgentTypeReplayMatrixReport,
    compactFileReferenceReadPlanReport,
    compactFileReferenceReadPlanFreshnessReport,
    compactFileReferenceReadPlanRevalidationGateReport,
    compactFileReferenceReadPlanRevalidationSessionBindingReport,
    compactFileReferenceReadPlanRevalidationRepairWorkItemReport,
    compactFileReferenceReadPlanUsageDisciplineReport,
    compactFileReferenceUsageDisciplineReport,
    childGlobalAgentMemoryBridgeReport,
  };
}

function collectItems(scope: MemoryScope, scopeId: string, memory: any) {
  const controls = scopeControls(scope, scopeId);
  const groups: any[] = [];
  const keys = scope === "group"
    ? ["persistentRequirements", "factAnchors", "decisions", "completed", "blocked", "workerLedger", "openQuestions", "nextActions"]
    : scope === "project" ? ["decisions", "conclusions"] : ["user", "feedback", "authorization", "decisions", "missions", "unresolved", "references"];
  for (const key of keys) {
    const values = Array.isArray(memory?.[key]) ? memory[key] : [];
    groups.push({
      type: key,
      items: values.map((item: any, index: number) => {
        const itemId = getMemoryItemId(key, item, index);
        const control = controls.find((entry: any) => entry.itemType === key && entry.itemId === itemId);
        return {
          itemId, type: key, text: control?.editedText !== undefined ? control.editedText : itemText(key, item),
          originalText: itemText(key, item), pinned: !!control?.pinned, deprecated: !!control?.deprecated,
          reason: control?.reason || "", updatedAt: control?.updatedAt || "",
          evidence: {
            groupId: item?.groupId || (scope === "group" ? scopeId : ""),
            messageId: item?.messageId || item?.source?.messageIds?.[0] || "",
            taskId: item?.taskId || "",
            sessionId: item?.source?.sessionId || "",
            missionId: item?.source?.missionId || "",
            time: item?.time || item?.timestamp || item?.source?.timestamp || "",
          },
          raw: item,
        };
      }),
    });
  }
  if (scope === "project") {
    for (const [archiveKey, type] of [["decisionArchives", "decisions"], ["conclusionArchives", "conclusions"]] as any) {
      const archived = (memory?.[archiveKey] || []).flatMap((archive: any) => (archive.records || []).map((item: any) => ({ ...item, archiveId: archive.id })));
      groups.push({ type: `${type}Archive`, items: archived.map((item: any, index: number) => {
        const itemId = getMemoryItemId(type, item, index);
        const control = controls.find((entry: any) => entry.itemType === type && entry.itemId === itemId);
        return { itemId, type, archived: true, archiveId: item.archiveId, text: control?.editedText !== undefined ? control.editedText : itemText(type, item), originalText: itemText(type, item), pinned: !!control?.pinned, deprecated: !!control?.deprecated, reason: control?.reason || "", evidence: { groupId: item.groupId || "", taskId: item.taskId || "", time: item.time || "" }, raw: item };
      }) });
    }
  }
  if (scope === "global") {
    groups.push({
      type: "sessionArchives",
      items: (memory?.archives || []).map((archive: any, index: number) => ({
        itemId: getMemoryItemId("sessionArchives", archive, index),
        type: "sessionArchives",
        archived: true,
        archiveId: archive.id,
        text: `会话 ${archive.sessionId}：${archive.summary?.primaryRequest || "历史压缩段"}（${archive.count || 0} 条）`,
        originalText: archive.summary?.latestOutcome || "",
        pinned: false,
        deprecated: false,
        evidence: { sessionId: archive.sessionId, messageId: archive.summary?.sourceMessageIds?.[0] || "", time: archive.from || "" },
        raw: archive,
      })),
    });
  }
  return groups;
}

export function getMemoryCenterScope(scope: MemoryScope, scopeId: string) {
  const file = scopeFile(scope, scopeId);
  if (!file || !fs.existsSync(file)) throw new Error("记忆不存在");
  const rawMemory = scope === "global" ? require("../../agents/global/memory").loadGlobalAgentMemory({ recover: false }) : readMemoryFile(file);
  if (!rawMemory) throw new Error("记忆文件无法读取");
  const policy = scope === "global" ? require("../../agents/global/memory").getGlobalAgentMemoryPolicy() : null;
  return {
    scope, id: scopeId, file, backupExists: fs.existsSync(`${file}.bak`),
    policy,
    summary: memorySummary(scope, scopeId, rawMemory, scopeId), alerts: healthAlerts(scope, scopeId, rawMemory),
    memory: applyMemoryControls(scope, scopeId, rawMemory), rawMemory,
    itemGroups: collectItems(scope, scopeId, rawMemory),
    postCompactUsage: scope === "group" ? buildGroupPostCompactUsageDiagnostics(scopeId, rawMemory) : null,
  };
}

export function listMemoryAudit(limit = 200, filters: any = {}) {
  let rows: any[] = [];
  try { rows = fs.readFileSync(AUDIT_FILE, "utf-8").split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)); } catch {}
  if (filters.scope) rows = rows.filter(item => item.scope === filters.scope);
  if (filters.scopeId) rows = rows.filter(item => item.scopeId === filters.scopeId);
  return rows.slice(-Math.max(1, Math.min(1000, limit))).reverse();
}

export function findMemoryEvidence(input: { scope?: string; groupId?: string; messageId?: string; taskId?: string; sessionId?: string; missionId?: string }) {
  if (input.scope === "global" || input.sessionId || input.missionId) {
    const { getGlobalMemoryEvidence } = require("../../agents/global/memory");
    return getGlobalMemoryEvidence(input);
  }
  const groupIds = input.groupId ? [input.groupId] : listJsonFiles(GROUP_MESSAGES_DIR).map(file => path.basename(file, ".json"));
  const matches: any[] = [];
  for (const groupId of groupIds) {
    const messages = readJson(path.join(GROUP_MESSAGES_DIR, `${groupId}.json`), []);
    for (const message of Array.isArray(messages) ? messages : []) {
      if (input.messageId && String(message.id || message.uuid || "") !== input.messageId) continue;
      if (input.taskId && String(message.task_id || message.taskId || "") !== input.taskId) continue;
      matches.push({ groupId, messageId: message.id || message.uuid || "", role: message.role || "", agent: message.agent || message.target || "", content: message.content || message.delivery_summary?.headline || "", timestamp: message.timestamp || "", taskId: message.task_id || message.taskId || "", raw: message });
      if (matches.length >= 50) return matches;
    }
  }
  return matches;
}

export function rollbackMemory(scope: MemoryScope, scopeId: string, reason: string, actor = "local-user") {
  if (!String(reason || "").trim()) throw new Error("回滚前必须填写原因");
  const file = scopeFile(scope, scopeId);
  const backup = file ? `${file}.bak` : "";
  if (!file || !fs.existsSync(backup)) throw new Error("没有可用的记忆备份");
  const backupData = fs.readFileSync(backup, "utf-8");
  JSON.parse(backupData);
  const snapshotDir = path.join(CONTROL_DIR, "snapshots");
  fs.mkdirSync(snapshotDir, { recursive: true });
  const snapshot = path.join(snapshotDir, `${scope}-${cleanId(scopeId)}-pre-rollback-${Date.now()}.json`);
  if (fs.existsSync(file)) fs.copyFileSync(file, snapshot);
  const temp = `${file}.${process.pid}.${Date.now()}.rollback.tmp`;
  fs.writeFileSync(temp, backupData, "utf-8");
  fs.renameSync(temp, file);
  recordMemoryMetric("recovery_success", { scope, scopeId, source: "manual_rollback" });
  const audit = appendAudit({ type: "memory_rollback", action: "rollback", scope, scopeId, actor, reason, backup, snapshot, restoredHash: hash(backupData, 24) });
  return { restored: true, snapshot, audit, memory: readMemoryFile(file) };
}

export function recordMemoryOperation(input: any) {
  return appendAudit({ type: "memory_operation", ...input });
}

export function runGlobalMemoryControlSelfTest() {
  const before = JSON.parse(JSON.stringify(getControlsState()));
  const item = { id: `control-selftest-${process.pid}`, text: "全局 Agent 必须验证当前状态后再使用历史记忆", importance: 90 };
  const itemId = getMemoryItemId("feedback", item);
  try {
    updateMemoryControl({ scope: "global", scopeId: "global-agent", itemType: "feedback", itemId, action: "lock", actor: "self-test" });
    const pinned = applyMemoryControls("global", "global-agent", { feedback: [item] }).feedback[0];
    updateMemoryControl({ scope: "global", scopeId: "global-agent", itemType: "feedback", itemId, action: "edit", text: "使用历史记忆前必须核验当前真实状态", reason: "验证可编辑能力", actor: "self-test" });
    const edited = applyMemoryControls("global", "global-agent", { feedback: [item] }).feedback[0];
    updateMemoryControl({ scope: "global", scopeId: "global-agent", itemType: "feedback", itemId, action: "delete", reason: "验证软删除与审计", actor: "self-test" });
    const deleted = applyMemoryControls("global", "global-agent", { feedback: [item] }).feedback;
    updateMemoryControl({ scope: "global", scopeId: "global-agent", itemType: "feedback", itemId, action: "restore", reason: "验证恢复", actor: "self-test" });
    const restored = applyMemoryControls("global", "global-agent", { feedback: [item] }).feedback[0];
    const checks = {
      globalScopePins: pinned?.memoryControl?.pinned === true,
      globalScopeEdits: edited?.text === "使用历史记忆前必须核验当前真实状态",
      globalScopeDeletes: deleted.length === 0,
      globalScopeRestores: restored?.text === item.text && restored?.memoryControl?.deprecated === false,
      operationsAreAudited: listMemoryAudit(20, { scope: "global", scopeId: "global-agent" }).some(event => event.itemId === itemId),
    };
    return { pass: Object.values(checks).every(Boolean), checks };
  } finally {
    writeJsonAtomic(CONTROL_FILE, before);
  }
}

export function runMemoryCenterPostCompactUsageDiagnosticsSelfTest() {
  const groupId = `memory-center-pccu-selftest-${process.pid}-${Date.now()}`;
  const groupFile = path.join(GROUP_MEMORY_DIR, `${groupId}.json`);
  const memory = {
    groupId,
    goal: "把群聊记忆压缩后稳定注入项目子 Agent 会话",
    persistentRequirements: [{ id: "req-1", text: "项目子 Agent 每次新会话都必须收到群聊记忆上下文" }],
    decisions: [{ id: "decision-1", decision: "Memory Center 必须暴露压缩重注入候选的使用情况" }],
    compaction: { postCompactTokenCount: 1200, preCompactTokenCount: 5200, lastCompactedAt: now() },
  };
  let usageFile = "";
  let typedDir = "";
  try {
    fs.mkdirSync(GROUP_MEMORY_DIR, { recursive: true });
    fs.writeFileSync(groupFile, JSON.stringify(memory, null, 2), "utf-8");
    const {
      getGroupPostCompactCandidateUsageLedgerFile,
      recordGroupPostCompactCandidateUsageLedger,
      buildGroupPostCompactCandidateUsageSummary,
    } = require("../collaboration/memory");
    const {
      distillGroupMessagesToTypedMemory,
      getGroupTypedMemoryDir,
      upsertGroupTypedMemoryDocument,
    } = require("../collaboration/group-memory-index");
    usageFile = getGroupPostCompactCandidateUsageLedgerFile(groupId);
    typedDir = getGroupTypedMemoryDir(groupId);
    recordGroupPostCompactCandidateUsageLedger(groupId, {
      taskId: "task-memory-center-selftest",
      executionId: "exec-memory-center-selftest",
      targetProject: "ccm",
      rows: [
        { candidate_id: "pccu_active_context", kind: "requirement", value: "project child agents must receive group memory bundle", usage_state: "used", gate_id: "gate-used" },
        { candidate_id: "pccu_stale_context", kind: "decision", value: "old compact summary should stay archived", usage_state: "ignored", gate_id: "gate-ignored-a" },
        { candidate_id: "pccu_stale_context", kind: "decision", value: "old compact summary should stay archived", usage_state: "ignored", gate_id: "gate-ignored-b" },
        { candidate_id: "pccu_missing_receipt", kind: "fact", value: "candidate usage receipt must be explicit", usage_state: "mentioned", gate_id: "gate-mentioned" },
      ],
      generatedAt: now(),
    });
    upsertGroupTypedMemoryDocument(groupId, {
      type: "project",
      slug: "active-context-selftest",
      name: "Active context selftest",
      description: "Used post-compact candidate should stay visible.",
      body: "project child agents must receive group memory bundle",
      updatedAt: now(),
    });
    upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "stale-context-selftest",
      name: "Stale context selftest",
      description: "Ignored post-compact candidate should be deprioritized.",
      body: "old compact summary should stay archived",
      updatedAt: now(),
    });
    const usageSummary = buildGroupPostCompactCandidateUsageSummary(groupId, {});
    distillGroupMessagesToTypedMemory(groupId, [
      { id: "m1", role: "user", agent: "user", content: "必须把群聊记忆作为子 Agent 的稳定上下文。", timestamp: now() },
      { id: "m2", role: "assistant", agent: "main", content: "采用 Memory Center 诊断 post-compact usage。", timestamp: now(), delivery_summary: { status: "completed", headline: "完成诊断" } },
    ], memory, { postCompactCandidateUsage: usageSummary, reason: "memory-center-post-compact-selftest" });
    const detail: any = getMemoryCenterScope("group", groupId);
    const diagnostics: any = detail.postCompactUsage || {};
    const checks = {
      scopeExposesDiagnostics: diagnostics.schema === "ccm-memory-center-post-compact-usage-diagnostics-v1",
      ledgerTotalsVisible: Number(diagnostics.ledger?.totals?.used || 0) >= 1 && Number(diagnostics.ledger?.totals?.ignored || 0) >= 2,
      summaryBucketsVisible: (diagnostics.summary?.usefulCandidates || []).length >= 1 && (diagnostics.summary?.ignoredCandidates || []).length >= 1,
      archiveRowsVisible: Number(diagnostics.archive?.archivedCount || 0) >= 1,
      recallScoringVisible: Number(diagnostics.typedMemory?.recallScoring?.hint_count || 0) >= 3,
      boostAndDeprioritizeVisible: (diagnostics.typedMemory?.boostedDocs || []).length >= 1 && (diagnostics.typedMemory?.deprioritizedDocs || []).length >= 1,
      disciplineTrendVisible: diagnostics.discipline?.schema === "ccm-post-compact-candidate-discipline-group-trend-v1"
        && diagnostics.discipline?.ledger?.strictClassificationRate !== null,
      boundaryTimelineVisible: diagnostics.boundaryTimeline?.schema === "ccm-group-compact-boundary-timeline-v1"
        && Array.isArray(diagnostics.boundaryTimeline?.components),
      overviewCarriesLightStats: Number(detail.summary?.postCompactUsage?.candidateCount || 0) >= 3,
    };
    return { pass: Object.values(checks).every(Boolean), checks, diagnostics };
  } finally {
    try { if (fs.existsSync(groupFile)) fs.unlinkSync(groupFile); } catch {}
    try { if (usageFile && fs.existsSync(usageFile)) fs.unlinkSync(usageFile); } catch {}
    try { if (typedDir && fs.existsSync(typedDir)) fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
  }
}

export function runMemoryCenterPostCompactCandidateDisciplineSelfTest() {
  const groupId = `memory-center-pccd-selftest-${process.pid}-${Date.now()}`;
  let usageFile = "";
  try {
    const {
      getGroupPostCompactCandidateUsageLedgerFile,
      recordGroupPostCompactCandidateUsageLedger,
    } = require("../collaboration/memory");
    usageFile = getGroupPostCompactCandidateUsageLedgerFile(groupId);
    recordGroupPostCompactCandidateUsageLedger(groupId, {
      taskId: "task-memory-center-candidate-discipline-ledger",
      executionId: "exec-memory-center-candidate-discipline-ledger",
      targetProject: "ccm",
      rows: [
        { candidate_id: "pccd_stale_context", kind: "decision", value: "old stale recovered context", usage_state: "ignored", gate_id: "gate-stale-a" },
        { candidate_id: "pccd_stale_context", kind: "decision", value: "old stale recovered context", usage_state: "ignored", gate_id: "gate-stale-b" },
        { candidate_id: "pccd_missing_receipt", kind: "fact", value: "candidate usage receipt must classify every row", usage_state: "mentioned", gate_id: "gate-missing" },
      ],
      generatedAt: now(),
    });
    const tasks = [
      {
        id: "task-memory-center-candidate-discipline-good",
        title: "候选纪律通过样例",
        group_id: groupId,
        delivery_summary: {
          post_compact_reinjection_gate_summary: { required: true, candidate_count: 2 },
          post_compact_reinjection_gate_receipt_rows: [{
            agent: "ccm",
            post_compact_reinjection_gate: {
              required: true,
              pass: true,
              gate_ids: ["pcrg_discipline_good"],
              candidate_usage_rows: [
                { gate_id: "pcrg_discipline_good", candidate_id: "pccd_active_context", value: "active recovered context", usage_state: "used" },
                { gate_id: "pcrg_discipline_good", candidate_id: "pccd_stale_context", value: "old stale recovered context", usage_state: "verified" },
              ],
            },
          }],
        },
      },
      {
        id: "task-memory-center-candidate-discipline-bad",
        title: "候选纪律失败样例",
        group_id: groupId,
        delivery_summary: {
          post_compact_reinjection_gate_summary: { required: true, candidate_count: 2 },
          post_compact_reinjection_gate_receipt_rows: [{
            agent: "ccm",
            post_compact_reinjection_gate: {
              required: true,
              pass: false,
              gate_ids: ["pcrg_discipline_bad"],
              candidate_usage_rows: [
                { gate_id: "pcrg_discipline_bad", candidate_id: "pccd_stale_context", value: "old stale recovered context", usage_state: "used" },
                { gate_id: "pcrg_discipline_bad", candidate_id: "pccd_missing_receipt", value: "candidate usage receipt must classify every row", usage_state: "mentioned" },
              ],
            },
          }],
        },
      },
    ];
    const check = evaluatePostCompactCandidateDiscipline({ tasks, groupIds: [groupId], taskLimit: 10 });
    const gapText = JSON.stringify(check.gaps || []);
    const evidenceText = JSON.stringify(check.evidence || []);
    const checks = {
      qualityCheckHasSchema: check.id === "post_compact_candidate_discipline" && check.label === "压缩候选纪律",
      strictClassificationCountsRows: Number(check.checked || 0) >= 5 && Number(check.passed || 0) >= 2,
      staleUsedIsGap: gapText.includes("历史忽略或归档候选被直接 used") && gapText.includes("pccd_stale_context"),
      mentionedCandidateIsGap: gapText.includes("候选缺少 used / ignored / verified 分类") && gapText.includes("pccd_missing_receipt"),
      ledgerMentionedIsGap: gapText.includes("历史账本中该候选只有 mentioned"),
      verifiedStaleCanPass: evidenceText.includes("pccd_stale_context") && evidenceText.includes("\"stale\":true"),
    };
    return { pass: Object.values(checks).every(Boolean), checks, quality: check };
  } finally {
    try { if (usageFile && fs.existsSync(usageFile)) fs.unlinkSync(usageFile); } catch {}
  }
}

export function runMemoryCenterPostCompactCandidateDisciplineTrendSelfTest() {
  const groupId = `memory-center-pccd-trend-selftest-${process.pid}-${Date.now()}`;
  let usageFile = "";
  try {
    const {
      getGroupPostCompactCandidateUsageLedgerFile,
      recordGroupPostCompactCandidateUsageLedger,
    } = require("../collaboration/memory");
    usageFile = getGroupPostCompactCandidateUsageLedgerFile(groupId);
    recordGroupPostCompactCandidateUsageLedger(groupId, {
      taskId: "task-memory-center-candidate-trend-ledger",
      executionId: "exec-memory-center-candidate-trend-ledger",
      targetProject: "ccm",
      rows: [
        { candidate_id: "pccd_trend_stale", kind: "decision", value: "stale trend recovered context", usage_state: "ignored", gate_id: "gate-trend-stale" },
        { candidate_id: "pccd_trend_missing", kind: "fact", value: "trend candidate must be classified", usage_state: "mentioned", gate_id: "gate-trend-mentioned" },
      ],
      generatedAt: "2026-07-01T00:00:00.000Z",
    });
    const tasks = [
      {
        id: "task-memory-center-candidate-trend-good",
        title: "趋势通过样例",
        group_id: groupId,
        updated_at: "2026-07-02T10:00:00.000Z",
        delivery_summary: {
          post_compact_reinjection_gate_summary: { required: true, candidate_count: 2 },
          post_compact_reinjection_gate_receipt_rows: [{
            agent: "ccm",
            post_compact_reinjection_gate: {
              required: true,
              gate_ids: ["pcrg_trend_good"],
              candidate_usage_rows: [
                { gate_id: "pcrg_trend_good", candidate_id: "pccd_trend_active", value: "active trend context", usage_state: "used" },
                { gate_id: "pcrg_trend_good", candidate_id: "pccd_trend_stale", value: "stale trend recovered context", usage_state: "verified" },
              ],
            },
          }],
        },
      },
      {
        id: "task-memory-center-candidate-trend-bad",
        title: "趋势失败样例",
        group_id: groupId,
        updated_at: "2026-07-03T10:00:00.000Z",
        delivery_summary: {
          post_compact_reinjection_gate_summary: { required: true, candidate_count: 2 },
          post_compact_reinjection_gate_receipt_rows: [{
            agent: "ccm",
            post_compact_reinjection_gate: {
              required: true,
              gate_ids: ["pcrg_trend_bad"],
              candidate_usage_rows: [
                { gate_id: "pcrg_trend_bad", candidate_id: "pccd_trend_stale", value: "stale trend recovered context", usage_state: "used" },
                { gate_id: "pcrg_trend_bad", candidate_id: "pccd_trend_missing", value: "trend candidate must be classified", usage_state: "mentioned" },
              ],
            },
          }],
        },
      },
      {
        id: "task-memory-center-candidate-trend-empty",
        title: "趋势缺候选行样例",
        group_id: groupId,
        updated_at: "2026-07-04T10:00:00.000Z",
        delivery_summary: {
          post_compact_reinjection_gate_summary: { required: true, candidate_count: 1 },
          post_compact_reinjection_gate_receipt_rows: [],
        },
      },
    ];
    const trend = buildPostCompactCandidateDisciplineTrend({ tasks, groupIds: [groupId], taskLimit: 10, threshold: 90, minSample: 1 });
    const group: any = trend.groups.find((item: any) => item.groupId === groupId) || {};
    const gapText = JSON.stringify(group.recentRows || []);
    const checks = {
      trendHasSchema: trend.schema === "ccm-post-compact-candidate-discipline-trend-v1",
      groupTrendHasSchema: group.schema === "ccm-post-compact-candidate-discipline-group-trend-v1",
      countsStrictRows: Number(group.checked || 0) === 5 && Number(group.strictClassified || 0) === 2,
      stalePromotionCounted: Number(group.stalePromoted || 0) === 1 && (group.stalePromotions || []).length === 1,
      missingRowsCounted: Number(group.missing || 0) >= 2 && gapText.includes("候选缺少 used / ignored / verified 分类"),
      noRowsCandidateCounted: gapText.includes("结果说明没有候选使用行"),
      bucketTrendBuilt: (group.buckets || []).length >= 3 && (group.buckets || []).some((bucket: any) => bucket.key === "2026-07-03" && bucket.stalePromoted === 1),
      lowRateRaisesAlert: group.alert === true && trend.alertGroups.some((item: any) => item.groupId === groupId),
      ledgerRateVisible: Number(group.ledger?.total || 0) === 2 && Number(group.ledger?.openMentionedCount || 0) === 1,
      overallAggregatesGroup: trend.overall?.checked === group.checked && trend.overall?.stalePromoted === group.stalePromoted,
    };
    return { pass: Object.values(checks).every(Boolean), checks, trend };
  } finally {
    try { if (usageFile && fs.existsSync(usageFile)) fs.unlinkSync(usageFile); } catch {}
  }
}

export function runMemoryCenterPostCompactDispatchMarkerTrendSelfTest() {
  const groupId = `memory-center-pcfd-trend-selftest-${process.pid}-${Date.now()}`;
  const groupFile = path.join(GROUP_MEMORY_DIR, `${groupId}.json`);
  const messageFile = path.join(GROUP_MESSAGES_DIR, `${groupId}.json`);
  const reloadFile = path.join(CCM_DIR, "group-memory-reload", `${cleanId(groupId)}.json`);
  let dispatchFile = "";
  let typedDir = "";
  try {
    const {
      buildAgentMemoryContextBundle,
      getGroupPostCompactDispatchLedgerFile,
      saveGroupMemory,
    } = require("../collaboration/memory");
    const { saveGroupMessages } = require("../collaboration/storage");
    const { getGroupTypedMemoryDir } = require("../collaboration/group-memory-index");
    dispatchFile = getGroupPostCompactDispatchLedgerFile(groupId);
    typedDir = getGroupTypedMemoryDir(groupId);
    saveGroupMessages(groupId, Array.from({ length: 14 }, (_: any, index: number) => ({
      id: `pcfd-trend-${index}`,
      role: index % 2 ? "assistant" : "user",
      agent: index % 2 ? "api" : undefined,
      target: index % 2 ? undefined : "coordinator",
      content: index === 0
        ? "必须保留 MEMORY_CENTER_PCFD_TREND_SENTINEL，压缩后首派发 marker 要进入 Memory Center。"
        : `首派发趋势自测 ${index}，涉及 src/post-compact-dispatch-trend.ts。`,
      timestamp: "2026-07-07T00:00:00.000Z",
    })));
    saveGroupMemory(groupId, {
      groupId,
      goal: "压缩后首派发 marker 趋势自测",
      persistentRequirements: [{ messageId: "pcfd-trend-0", text: "必须保留 MEMORY_CENTER_PCFD_TREND_SENTINEL。" }],
      compaction: {
        version: 1,
        compactedMessageCount: 10,
        preservedRecentMessages: 4,
        preCompactTokenCount: 8200,
        postCompactTokenCount: 2100,
        lastCompactedAt: "2026-07-07T00:00:00.000Z",
        summaryChecksum: "pcfd-trend-summary",
        postCompactReinject: {
          schema: "ccm-post-compact-reinjection-v1",
          hasCandidates: true,
          files: [{ value: "src/post-compact-dispatch-trend.ts", sourceMessageId: "pcfd-trend-2" }],
          verification: [{ value: "npm run check", sourceMessageId: "pcfd-trend-3" }],
        },
        postCompactRecoveryAudit: {
          schema: "ccm-post-compact-recovery-audit-v1",
          status: "pass",
          pass: true,
          summary_checksum: "pcfd-trend-summary",
          checkCount: 3,
          passedChecks: 3,
          failedChecks: [],
        },
      },
      compactBoundary: {
        summarizedThroughMessageId: "pcfd-trend-9",
        summarizedMessageCount: 10,
        summaryChecksum: "pcfd-trend-summary",
      },
    });
    const first = buildAgentMemoryContextBundle(groupId, "api", "继续 MEMORY_CENTER_PCFD_TREND_SENTINEL", {
      includeGlobalClaudeMemory: false,
      minKeepTokens: 1,
    });
    const second = buildAgentMemoryContextBundle(groupId, "api", "继续 MEMORY_CENTER_PCFD_TREND_SENTINEL", {
      includeGlobalClaudeMemory: false,
      minKeepTokens: 1,
    });
    const other = buildAgentMemoryContextBundle(groupId, "web", "继续 MEMORY_CENTER_PCFD_TREND_SENTINEL", {
      includeGlobalClaudeMemory: false,
      minKeepTokens: 1,
    });
    const trend = buildPostCompactDispatchMarkerTrend({ groupIds: [groupId] });
    const group: any = trend.groups.find((item: any) => item.groupId === groupId) || {};
    const detail: any = getMemoryCenterScope("group", groupId);
    const dispatch = detail.postCompactUsage?.dispatch || {};
    const firstMarker = first.post_compact_dispatch_marker || {};
    const secondMarker = second.post_compact_dispatch_marker || {};
    const otherMarker = other.post_compact_dispatch_marker || {};
    const checks = {
      firstMarkerIsFirst: firstMarker.schema === "ccm-post-compact-first-dispatch-marker-v1"
        && firstMarker.first_dispatch_after_compact === true
        && firstMarker.dispatch_sequence === 1,
      secondMarkerIsFollowup: secondMarker.schema === "ccm-post-compact-first-dispatch-marker-v1"
        && secondMarker.boundary_id === firstMarker.boundary_id
        && secondMarker.first_dispatch_after_compact === false
        && secondMarker.dispatch_sequence === 2,
      otherTargetGetsOwnFirst: otherMarker.schema === "ccm-post-compact-first-dispatch-marker-v1"
        && otherMarker.boundary_id === firstMarker.boundary_id
        && otherMarker.target_project === "web"
        && otherMarker.first_dispatch_after_compact === true,
      trendAggregatesMarkers: group.schema === "ccm-post-compact-dispatch-marker-group-trend-v1"
        && group.status === "ok"
        && Number(group.entryCount || 0) === 3
        && Number(group.firstDispatchCount || 0) === 2
        && Number(group.followupDispatchCount || 0) === 1
        && Number(group.targetCount || 0) === 2,
      latestBoundaryCoverageVisible: Number(group.latestBoundaryTargetCoverageRate || 0) === 100
        && Number(group.latestBoundaryTargetCount || 0) === 2,
      detailExposesDispatchTrend: dispatch.schema === "ccm-post-compact-dispatch-marker-group-trend-v1"
        && dispatch.ledger?.file === dispatchFile
        && Number(dispatch.firstDispatchCount || 0) === 2,
      overviewTrendAggregates: trend.overall?.status === "ok"
        && Number(trend.overall.firstDispatches || 0) === 2
        && Number(trend.overall.followups || 0) === 1,
    };
    return { pass: Object.values(checks).every(Boolean), checks, trend: group };
  } finally {
    for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, reloadFile, `${reloadFile}.bak`, dispatchFile]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
    try { if (typedDir && fs.existsSync(typedDir)) fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
  }
}

export function runMemoryCenterChildAgentMemoryReliabilitySelfTest() {
  const groupId = `memory-center-agent-reliability-selftest-${process.pid}-${Date.now()}`;
  const groupFile = path.join(GROUP_MEMORY_DIR, `${groupId}.json`);
  const messageFile = path.join(GROUP_MESSAGES_DIR, `${groupId}.json`);
  const reloadFile = path.join(CCM_DIR, "group-memory-reload", `${cleanId(groupId)}.json`);
  let dispatchFile = "";
  let usageFile = "";
  let typedDir = "";
  try {
    const {
      buildAgentMemoryContextBundle,
      getGroupPostCompactCandidateUsageLedgerFile,
      getGroupPostCompactDispatchLedgerFile,
      recordGroupPostCompactCandidateUsageLedger,
      saveGroupMemory,
    } = require("../collaboration/memory");
    const { saveGroupMessages } = require("../collaboration/storage");
    const { getGroupTypedMemoryDir } = require("../collaboration/group-memory-index");
    dispatchFile = getGroupPostCompactDispatchLedgerFile(groupId);
    usageFile = getGroupPostCompactCandidateUsageLedgerFile(groupId);
    typedDir = getGroupTypedMemoryDir(groupId);
    saveGroupMessages(groupId, Array.from({ length: 12 }, (_: any, index: number) => ({
      id: `car-${index}`,
      role: index % 2 ? "assistant" : "user",
      agent: index % 2 ? "api" : undefined,
      target: index % 2 ? undefined : "coordinator",
      content: index === 0
        ? "必须保留 CHILD_AGENT_MEMORY_RELIABILITY_SENTINEL。"
        : `子 Agent 记忆可靠性自测 ${index}，涉及 src/reliability.ts。`,
      timestamp: "2026-07-07T01:00:00.000Z",
    })));
    saveGroupMemory(groupId, {
      groupId,
      goal: "子 Agent 记忆可靠性自测",
      persistentRequirements: [{ messageId: "car-0", text: "必须保留 CHILD_AGENT_MEMORY_RELIABILITY_SENTINEL。" }],
      compaction: {
        version: 1,
        compactedMessageCount: 8,
        preservedRecentMessages: 4,
        preCompactTokenCount: 7200,
        postCompactTokenCount: 1900,
        lastCompactedAt: "2026-07-07T01:00:00.000Z",
        summaryChecksum: "car-summary",
        postCompactReinject: {
          schema: "ccm-post-compact-reinjection-v1",
          hasCandidates: true,
          files: [{ value: "src/reliability.ts", sourceMessageId: "car-2" }],
          verification: [{ value: "npm run check", sourceMessageId: "car-3" }],
        },
      },
      compactBoundary: {
        summarizedThroughMessageId: "car-8",
        summarizedMessageCount: 8,
        summaryChecksum: "car-summary",
      },
    });
    recordGroupPostCompactCandidateUsageLedger(groupId, {
      taskId: "task-car-ledger",
      targetProject: "web",
      rows: [
        { candidate_id: "car_web_stale", value: "legacy stale web context", usage_state: "ignored", gate_id: "gate-car-stale" },
      ],
      generatedAt: "2026-07-07T01:02:00.000Z",
    });
    buildAgentMemoryContextBundle(groupId, "api", "继续 CHILD_AGENT_MEMORY_RELIABILITY_SENTINEL", {
      includeGlobalClaudeMemory: false,
      minKeepTokens: 1,
    });
    const tasks = [
      {
        id: "task-car-api-good",
        title: "可靠 api 子 Agent",
        group_id: groupId,
        updated_at: "2026-07-07T01:10:00.000Z",
        delivery_summary: {
          receipt_statuses: [{
            agent: "api",
            status: "done",
            memoryUsed: ["使用平台群聊记忆 CHILD_AGENT_MEMORY_RELIABILITY_SENTINEL"],
            memoryIgnored: [],
          }],
          post_compact_reinjection_gate_summary: { required: true, candidate_count: 2 },
          post_compact_reinjection_gate_receipt_rows: [{
            agent: "api",
            post_compact_reinjection_gate: {
              required: true,
              gate_ids: ["gate-car-api"],
              candidate_usage_rows: [
                { gate_id: "gate-car-api", candidate_id: "car_api_file", value: "src/reliability.ts", usage_state: "used" },
                { gate_id: "gate-car-api", candidate_id: "car_api_check", value: "npm run check", usage_state: "verified" },
              ],
            },
          }],
        },
      },
      {
        id: "task-car-web-bad",
        title: "不可靠 web 子 Agent",
        group_id: groupId,
        updated_at: "2026-07-07T01:12:00.000Z",
        delivery_summary: {
          receipt_statuses: [{
            agent: "web",
            status: "done",
            memoryUsed: [],
            memoryIgnored: [],
          }],
          post_compact_reinjection_gate_summary: { required: true, candidate_count: 2 },
          post_compact_reinjection_gate_receipt_rows: [{
            agent: "web",
            post_compact_reinjection_gate: {
              required: true,
              gate_ids: ["gate-car-web"],
              candidate_usage_rows: [
                { gate_id: "gate-car-web", candidate_id: "car_web_stale", value: "legacy stale web context", usage_state: "used" },
                { gate_id: "gate-car-web", candidate_id: "car_web_missing", value: "missing classification", usage_state: "mentioned" },
              ],
            },
          }],
        },
      },
    ];
    const report = buildChildAgentMemoryReliabilityReport({ tasks, groupIds: [groupId], taskLimit: 10 });
    const group: any = (report.groups.find((item: any) => item.groupId === groupId) || {}) as any;
    const agents: any[] = Array.isArray((group as any).agents) ? (group as any).agents : [];
    const api: any = agents.find((item: any) => item.agent === "api") || {};
    const web: any = agents.find((item: any) => item.agent === "web") || {};
    const check = evaluateChildAgentMemoryReliability({ tasks, groupIds: [groupId], taskLimit: 10 });
    const detail: any = getMemoryCenterScope("group", groupId);
    const detailReliability: any = detail.postCompactUsage?.agentReliability || {};
    const gapText = JSON.stringify(web.gaps || []);
    const checks = {
      reportHasSchema: report.schema === "ccm-child-agent-memory-reliability-report-v1",
      groupHasTwoAgents: group.schema === "ccm-group-child-agent-memory-reliability-v1" && Number(group.agentCount || 0) >= 2,
      apiScoresOk: api.status === "ok" && Number(api.score || 0) >= 90 && Number(api.firstDispatches || 0) >= 1,
      webScoresFail: web.status === "fail" && Number(web.score || 100) < 70,
      webGapsIncludeCandidateAndDispatch: gapText.includes("历史 ignored/归档候选被直接 used")
        && gapText.includes("没有压缩后首派发 marker"),
      qualityCheckFlagsWeakAgent: check.id === "child_agent_memory_reliability"
        && check.gaps?.some((gap: any) => gap.agent === "web"),
      detailExposesReliability: detailReliability.schema === "ccm-group-child-agent-memory-reliability-v1"
        && detailReliability.agents?.some((agent: any) => agent.agent === "api")
        && Number(detailReliability.agentCount || 0) >= 1,
    };
    return { pass: Object.values(checks).every(Boolean), checks, report: group };
  } finally {
    for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, reloadFile, `${reloadFile}.bak`, dispatchFile, usageFile]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
    try { if (typedDir && fs.existsSync(typedDir)) fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
  }
}

export function runMemoryCenterChildGlobalAgentMemoryBridgeSelfTest() {
  const groupId = `memory-center-child-global-agent-memory-bridge-selftest-${process.pid}-${Date.now()}`;
  const groupFile = path.join(GROUP_MEMORY_DIR, `${groupId}.json`);
  const messageFile = path.join(GROUP_MESSAGES_DIR, `${groupId}.json`);
  const reloadFile = path.join(CCM_DIR, "group-memory-reload", `${cleanId(groupId)}.json`);
  const typedDir = path.join(CCM_DIR, "group-memory-md", sidecarFileId(groupId));
  const sessionDir = path.join(GROUP_SESSION_MEMORY_DIR, sidecarFileId(groupId));
  const toolDir = path.join(GROUP_TOOL_CONTINUITY_DIR, sidecarFileId(groupId));
  const compactReferenceFile = getGroupCompactFileReferenceLedgerFile(groupId);
  const previousGlobalMemory = fs.existsSync(GLOBAL_MEMORY_FILE) ? fs.readFileSync(GLOBAL_MEMORY_FILE, "utf-8") : null;
  const previousGlobalMemoryBak = fs.existsSync(`${GLOBAL_MEMORY_FILE}.bak`) ? fs.readFileSync(`${GLOBAL_MEMORY_FILE}.bak`, "utf-8") : null;
  try {
    const { saveGroupMessages } = require("../collaboration/storage");
    const { saveGroupMemory } = require("../collaboration/memory");
    const at = now();
    writeJsonAtomic(GLOBAL_MEMORY_FILE, {
      version: 1,
      scope: "global",
      id: "global-agent",
      user: [{
        id: "gmi_memory_center_global_bridge",
        text: "MEMORY_CENTER_GLOBAL_BRIDGE_SENTINEL: src/global-bridge.ts 子 Agent 必须继承相关全局 Agent 长期记忆。",
        why: "验证 Memory Center 能检查全局 Agent 记忆桥接。",
        howToApply: "只在 global bridge 相关任务中作为上下文，执行前核验当前仓库状态。",
        importance: 99,
        confidence: 0.99,
        createdAt: at,
        updatedAt: at,
        source: {
          sessionId: "memory-center-global-bridge-session",
          messageIds: ["memory-center-global-bridge-message"],
          source: "selftest",
          timestamp: at,
        },
      }],
      feedback: [],
      authorization: [],
      decisions: [],
      missions: [],
      unresolved: [],
      references: [],
      sessions: [],
      archives: [],
      compaction: { boundaryVersion: 1, totalCompactions: 0, consecutiveFailures: 0, health: "healthy", boundaries: [] },
      privacy: { rejectedCandidates: 0, encryptedTranscripts: true, lastScanAt: at },
      integrity: { pass: true, corruptedArchives: [] },
      updatedAt: at,
    });
    saveGroupMessages(groupId, [
      { id: "mcggb-1", role: "user", target: "coordinator", timestamp: at, content: "继续 MEMORY_CENTER_GLOBAL_BRIDGE_SENTINEL src/global-bridge.ts。" },
    ]);
    saveGroupMemory(groupId, {
      groupId,
      goal: "验证 MEMORY_CENTER_GLOBAL_BRIDGE_SENTINEL 能进入子 Agent 记忆包",
      currentPhase: "global-agent-memory-bridge",
      persistentRequirements: [{ messageId: "mcggb-1", text: "必须继承相关全局 Agent 长期记忆。" }],
      completed: [{ project: "api", summary: "准备检查 src/global-bridge.ts" }],
    });
    const report = buildChildGlobalAgentMemoryBridgeReport({
      groupIds: [groupId],
      query: "MEMORY_CENTER_GLOBAL_BRIDGE_SENTINEL src/global-bridge.ts",
      targetProject: "api",
    });
    const check = evaluateChildGlobalAgentMemoryBridge({
      groupIds: [groupId],
      query: "MEMORY_CENTER_GLOBAL_BRIDGE_SENTINEL src/global-bridge.ts",
      targetProject: "api",
    });
    const row = report.groups?.[0] || {};
    const checks = {
      reportCoversBridge: report.schema === "ccm-child-global-agent-memory-bridge-report-v1"
        && report.overall?.status === "ok"
        && Number(row.itemCount || 0) >= 1,
      rowHasRenderedBridge: row.renderedHasBridge === true,
      rowHasSourceManifest: row.sourceManifestHasGlobalMemory === true,
      rowHasCompactReference: row.compactReferencesHasGlobalMemory === true,
      qualityCheckCoversBridge: check.id === "child_global_agent_memory_bridge"
        && Number(check.checked || 0) === 1
        && Number(check.passed || 0) === 1,
    };
    return { pass: Object.values(checks).every(Boolean), checks, row };
  } finally {
    for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, reloadFile, `${reloadFile}.bak`, compactReferenceFile, `${compactReferenceFile}.bak`]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
    for (const dir of [typedDir, sessionDir, toolDir]) {
      try { if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
    try {
      fs.mkdirSync(path.dirname(GLOBAL_MEMORY_FILE), { recursive: true });
      if (previousGlobalMemory === null) fs.rmSync(GLOBAL_MEMORY_FILE, { force: true });
      else fs.writeFileSync(GLOBAL_MEMORY_FILE, previousGlobalMemory, "utf-8");
      if (previousGlobalMemoryBak === null) fs.rmSync(`${GLOBAL_MEMORY_FILE}.bak`, { force: true });
      else fs.writeFileSync(`${GLOBAL_MEMORY_FILE}.bak`, previousGlobalMemoryBak, "utf-8");
    } catch {}
  }
}

export function runMemoryCenterChildGlobalAgentMemoryArbitrationSelfTest() {
  const groupId = `memory-center-child-global-agent-memory-arbitration-selftest-${process.pid}-${Date.now()}`;
  const groupFile = path.join(GROUP_MEMORY_DIR, `${groupId}.json`);
  const messageFile = path.join(GROUP_MESSAGES_DIR, `${groupId}.json`);
  const reloadFile = path.join(CCM_DIR, "group-memory-reload", `${cleanId(groupId)}.json`);
  const typedDir = path.join(CCM_DIR, "group-memory-md", sidecarFileId(groupId));
  const sessionDir = path.join(GROUP_SESSION_MEMORY_DIR, sidecarFileId(groupId));
  const toolDir = path.join(GROUP_TOOL_CONTINUITY_DIR, sidecarFileId(groupId));
  const compactReferenceFile = getGroupCompactFileReferenceLedgerFile(groupId);
  const arbitrationLedgerFile = getGroupGlobalMemoryArbitrationLedgerFile(groupId);
  const previousGlobalMemory = fs.existsSync(GLOBAL_MEMORY_FILE) ? fs.readFileSync(GLOBAL_MEMORY_FILE, "utf-8") : null;
  const previousGlobalMemoryBak = fs.existsSync(`${GLOBAL_MEMORY_FILE}.bak`) ? fs.readFileSync(`${GLOBAL_MEMORY_FILE}.bak`, "utf-8") : null;
  try {
    const { saveGroupMessages } = require("../collaboration/storage");
    const { saveGroupMemory } = require("../collaboration/memory");
    const globalAt = "2026-07-07T03:00:00.000Z";
    const groupAt = "2026-07-07T04:00:00.000Z";
    writeJsonAtomic(GLOBAL_MEMORY_FILE, {
      version: 1,
      scope: "global",
      id: "global-agent",
      user: [{
        id: "gmi_memory_center_global_arbitration",
        text: "MEMORY_CENTER_GLOBAL_ARBITRATION_SENTINEL: src/global-arbitration.ts 必须使用 stale-global-rule。",
        why: "验证 Memory Center 能统计全局记忆被群聊新证据降权。",
        howToApply: "旧规则：使用 stale-global-rule。",
        importance: 99,
        confidence: 0.99,
        createdAt: globalAt,
        updatedAt: globalAt,
        source: {
          sessionId: "memory-center-global-arbitration-session",
          messageIds: ["memory-center-global-arbitration-message"],
          source: "selftest",
          timestamp: globalAt,
        },
      }],
      feedback: [],
      authorization: [],
      decisions: [],
      missions: [],
      unresolved: [],
      references: [],
      sessions: [],
      archives: [],
      compaction: { boundaryVersion: 1, totalCompactions: 0, consecutiveFailures: 0, health: "healthy", boundaries: [] },
      privacy: { rejectedCandidates: 0, encryptedTranscripts: true, lastScanAt: globalAt },
      integrity: { pass: true, corruptedArchives: [] },
      updatedAt: globalAt,
    });
    saveGroupMessages(groupId, [
      { id: "mcgga-1", role: "user", target: "coordinator", timestamp: groupAt, content: "MEMORY_CENTER_GLOBAL_ARBITRATION_SENTINEL: src/global-arbitration.ts 不再使用 stale-global-rule，改为 fresh-group-rule。" },
    ]);
    saveGroupMemory(groupId, {
      groupId,
      goal: "验证 MEMORY_CENTER_GLOBAL_ARBITRATION_SENTINEL 全局记忆仲裁",
      currentPhase: "global-agent-memory-arbitration",
      persistentRequirements: [{ messageId: "mcgga-1", text: "src/global-arbitration.ts 不再使用 stale-global-rule，改为 fresh-group-rule。" }],
      completed: [{ project: "api", summary: "准备检查 src/global-arbitration.ts" }],
    });
    const report = buildChildGlobalAgentMemoryBridgeReport({
      groupIds: [groupId],
      query: "MEMORY_CENTER_GLOBAL_ARBITRATION_SENTINEL src/global-arbitration.ts",
      targetProject: "api",
    });
    const arbitrationLedgerCheck = evaluateGlobalMemoryArbitrationLedger({
      groupIds: [groupId],
      query: "MEMORY_CENTER_GLOBAL_ARBITRATION_SENTINEL src/global-arbitration.ts",
      targetProject: "api",
    });
    const arbitrationDistillationCheck = evaluateGlobalMemoryArbitrationDistillation({
      groupIds: [groupId],
      query: "MEMORY_CENTER_GLOBAL_ARBITRATION_SENTINEL src/global-arbitration.ts",
      targetProject: "api",
    });
    const row = report.groups?.[0] || {};
    const checks = {
      reportStillPassesWithArbitration: report.schema === "ccm-child-global-agent-memory-bridge-report-v1"
        && report.overall?.status === "ok"
        && row.status === "ok",
      reportCountsDemotion: Number(row.demotedCount || 0) >= 1
        && Number(row.conflictCount || 0) >= 1
        && Number(report.overall?.demotedCount || 0) >= 1
        && Number(report.overall?.conflictCount || 0) >= 1,
      renderedArbitrationVerified: row.renderedHasArbitration === true,
      bridgeStillHasSources: row.sourceManifestHasGlobalMemory === true
        && row.compactReferencesHasGlobalMemory === true,
      arbitrationLedgerRecorded: row.arbitrationLedgerRequired === true
        && row.arbitrationLedgerRecorded === true
        && row.sourceManifestHasArbitrationLedger === true
        && row.compactReferencesHasArbitrationLedger === true
        && row.arbitrationLedgerFile === arbitrationLedgerFile,
      arbitrationLedgerQualityCheckPasses: arbitrationLedgerCheck.id === "global_memory_arbitration_ledger"
        && Number(arbitrationLedgerCheck.checked || 0) === 1
        && Number(arbitrationLedgerCheck.passed || 0) === 1,
      arbitrationDistillationQualityCheckPasses: arbitrationDistillationCheck.id === "global_memory_arbitration_distillation"
        && Number(arbitrationDistillationCheck.checked || 0) === 1
        && Number(arbitrationDistillationCheck.passed || 0) === 1,
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      row,
      arbitrationLedgerQuality: arbitrationLedgerCheck.report?.overall || {},
      arbitrationDistillationQuality: arbitrationDistillationCheck.report?.overall || {},
    };
  } finally {
    for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, reloadFile, `${reloadFile}.bak`, compactReferenceFile, `${compactReferenceFile}.bak`, arbitrationLedgerFile, `${arbitrationLedgerFile}.bak`]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
    for (const dir of [typedDir, sessionDir, toolDir]) {
      try { if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
    try {
      fs.mkdirSync(path.dirname(GLOBAL_MEMORY_FILE), { recursive: true });
      if (previousGlobalMemory === null) fs.rmSync(GLOBAL_MEMORY_FILE, { force: true });
      else fs.writeFileSync(GLOBAL_MEMORY_FILE, previousGlobalMemory, "utf-8");
      if (previousGlobalMemoryBak === null) fs.rmSync(`${GLOBAL_MEMORY_FILE}.bak`, { force: true });
      else fs.writeFileSync(`${GLOBAL_MEMORY_FILE}.bak`, previousGlobalMemoryBak, "utf-8");
    } catch {}
  }
}

export function runMemoryCenterChildGlobalAgentMemoryCrossGroupSuppressionSelfTest() {
  const suffix = `${process.pid}-${Date.now()}`;
  const sourceGroupId = `memory-center-global-cross-group-source-${suffix}`;
  const targetGroupId = `memory-center-global-cross-group-target-${suffix}`;
  const groupFiles = [sourceGroupId, targetGroupId].flatMap(groupId => [
    path.join(GROUP_MEMORY_DIR, `${groupId}.json`),
    path.join(GROUP_MEMORY_DIR, `${groupId}.json.bak`),
    path.join(GROUP_MESSAGES_DIR, `${groupId}.json`),
    path.join(GROUP_MESSAGES_DIR, `${groupId}.json.bak`),
    path.join(CCM_DIR, "group-memory-reload", `${cleanId(groupId)}.json`),
    path.join(CCM_DIR, "group-memory-reload", `${cleanId(groupId)}.json.bak`),
    getGroupCompactFileReferenceLedgerFile(groupId),
    `${getGroupCompactFileReferenceLedgerFile(groupId)}.bak`,
    getGroupGlobalMemoryArbitrationLedgerFile(groupId),
    `${getGroupGlobalMemoryArbitrationLedgerFile(groupId)}.bak`,
  ]);
  const cleanupDirs = [sourceGroupId, targetGroupId].flatMap(groupId => [
    path.join(CCM_DIR, "group-memory-md", sidecarFileId(groupId)),
    path.join(GROUP_SESSION_MEMORY_DIR, sidecarFileId(groupId)),
    path.join(GROUP_TOOL_CONTINUITY_DIR, sidecarFileId(groupId)),
  ]);
  const previousGlobalMemory = fs.existsSync(GLOBAL_MEMORY_FILE) ? fs.readFileSync(GLOBAL_MEMORY_FILE, "utf-8") : null;
  const previousGlobalMemoryBak = fs.existsSync(`${GLOBAL_MEMORY_FILE}.bak`) ? fs.readFileSync(`${GLOBAL_MEMORY_FILE}.bak`, "utf-8") : null;
  try {
    const { saveGroupMessages } = require("../collaboration/storage");
    const { buildAgentMemoryContextBundle, saveGroupMemory } = require("../collaboration/memory");
    const globalAt = "2026-07-07T08:00:00.000Z";
    const sourceAt = "2026-07-07T09:00:00.000Z";
    const targetAt = "2026-07-07T10:00:00.000Z";
    writeJsonAtomic(GLOBAL_MEMORY_FILE, {
      version: 1,
      scope: "global",
      id: "global-agent",
      user: [{
        id: "gmi_memory_center_cross_group_suppression",
        text: "MEMORY_CENTER_CROSS_GROUP_SUPPRESSION_SENTINEL: src/cross-center.ts 必须使用 stale-center-rule。",
        why: "验证 Memory Center 可以检查跨群聊全局记忆抑制。",
        howToApply: "旧规则：直接使用 stale-center-rule。",
        importance: 99,
        confidence: 0.99,
        createdAt: globalAt,
        updatedAt: globalAt,
        source: {
          sessionId: "memory-center-cross-group-session",
          messageIds: ["memory-center-cross-group-message"],
          source: "selftest",
          timestamp: globalAt,
        },
      }],
      feedback: [],
      authorization: [],
      decisions: [],
      missions: [],
      unresolved: [],
      references: [],
      sessions: [],
      archives: [],
      compaction: { boundaryVersion: 1, totalCompactions: 0, consecutiveFailures: 0, health: "healthy", boundaries: [] },
      privacy: { rejectedCandidates: 0, encryptedTranscripts: true, lastScanAt: globalAt },
      integrity: { pass: true, corruptedArchives: [] },
      updatedAt: globalAt,
    });
    saveGroupMessages(sourceGroupId, [
      { id: "mccgs-a-1", role: "user", target: "coordinator", timestamp: sourceAt, content: "MEMORY_CENTER_CROSS_GROUP_SUPPRESSION_SENTINEL: src/cross-center.ts 不再使用 stale-center-rule，改为 fresh-center-rule。" },
    ]);
    saveGroupMemory(sourceGroupId, {
      groupId: sourceGroupId,
      goal: "验证 Memory Center 跨群聊全局记忆抑制来源群聊",
      currentPhase: "memory-center-cross-group-source",
      persistentRequirements: [{ messageId: "mccgs-a-1", text: "src/cross-center.ts 不再使用 stale-center-rule，改为 fresh-center-rule。" }],
      completed: [{ project: "api", summary: "已记录 fresh-center-rule。" }],
    });
    buildAgentMemoryContextBundle(sourceGroupId, "api", "继续 MEMORY_CENTER_CROSS_GROUP_SUPPRESSION_SENTINEL src/cross-center.ts", {
      minKeepTokens: 1,
      maxGlobalAgentMemory: 4,
    });
    saveGroupMessages(targetGroupId, [
      { id: "mccgs-b-1", role: "user", target: "coordinator", timestamp: targetAt, content: "继续 src/cross-center.ts，先按当前仓库状态核验。" },
    ]);
    saveGroupMemory(targetGroupId, {
      groupId: targetGroupId,
      goal: "验证 Memory Center 跨群聊全局记忆抑制目标群聊",
      currentPhase: "memory-center-cross-group-target",
      completed: [{ project: "api", summary: "准备检查 src/cross-center.ts 当前状态。" }],
    });
    const report = buildChildGlobalAgentMemoryBridgeReport({
      groupIds: [targetGroupId],
      query: "MEMORY_CENTER_CROSS_GROUP_SUPPRESSION_SENTINEL src/cross-center.ts",
      targetProject: "api",
    });
    const check = evaluateGlobalMemoryCrossGroupSuppression({
      groupIds: [targetGroupId],
      query: "MEMORY_CENTER_CROSS_GROUP_SUPPRESSION_SENTINEL src/cross-center.ts",
      targetProject: "api",
    });
    const row = report.groups?.[0] || {};
    const checks = {
      reportCoversCrossGroupSuppression: report.schema === "ccm-child-global-agent-memory-bridge-report-v1"
        && report.overall?.status === "ok"
        && Number(row.crossGroupSuppressedCount || 0) >= 1,
      rowHasRenderedCrossGroupSuppression: row.renderedHasCrossGroupSuppression === true,
      rowHasCrossGroupSources: row.sourceManifestHasCrossGroupArbitration === true
        && row.compactReferencesHasCrossGroupArbitration === true,
      qualityCheckPasses: check.id === "global_memory_cross_group_suppression"
        && Number(check.checked || 0) === 1
        && Number(check.passed || 0) === 1,
      reportOverallCountsSuppression: Number(check.report?.overall?.suppressedCount || 0) >= 1,
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      row,
      quality: check.report?.overall || {},
    };
  } finally {
    for (const file of groupFiles) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
    for (const dir of cleanupDirs) {
      try { if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
    try {
      fs.mkdirSync(path.dirname(GLOBAL_MEMORY_FILE), { recursive: true });
      if (previousGlobalMemory === null) fs.rmSync(GLOBAL_MEMORY_FILE, { force: true });
      else fs.writeFileSync(GLOBAL_MEMORY_FILE, previousGlobalMemory, "utf-8");
      if (previousGlobalMemoryBak === null) fs.rmSync(`${GLOBAL_MEMORY_FILE}.bak`, { force: true });
      else fs.writeFileSync(`${GLOBAL_MEMORY_FILE}.bak`, previousGlobalMemoryBak, "utf-8");
    } catch {}
  }
}

export function runMemoryCenterQualityTargetedRefreshSelfTest() {
  const previousQuality = fs.existsSync(QUALITY_FILE) ? fs.readFileSync(QUALITY_FILE, "utf-8") : null;
  try {
    const sentinel = {
      id: "quality-cache-sentinel",
      generatedAt: now(),
      overallScore: 77,
      status: "warn",
      checks: [],
      cached: false,
    };
    writeJsonAtomic(QUALITY_FILE, sentinel);
    const targeted = buildMemoryQualityReport({
      checkIds: ["child_global_agent_memory_bridge"],
      cacheMaxAgeMs: 0,
    });
    const cachedAfterTargeted = readJson(QUALITY_FILE, {});
    const unknown = buildMemoryQualityReport({
      checkIds: ["child_global_agent_memory_bridge", "missing_quality_check_id"],
      cacheMaxAgeMs: 0,
    });
    const checks = {
      targetedReportOnlyRunsRequestedCheck: targeted.targeted === true
        && targeted.checks?.length === 1
        && targeted.checks?.[0]?.id === "child_global_agent_memory_bridge",
      targetedReportDoesNotOverwriteMainCache: cachedAfterTargeted.id === "quality-cache-sentinel"
        && cachedAfterTargeted.overallScore === 77,
      targetedReportCarriesAvailableIds: Array.isArray(targeted.availableCheckIds)
        && targeted.availableCheckIds.includes("child_global_agent_memory_bridge")
        && targeted.availableCheckIds.includes("global_memory_cross_group_suppression")
        && targeted.availableCheckIds.includes("rag_recall"),
      unknownIdsAreReported: unknown.targeted === true
        && unknown.checks?.length === 1
        && Array.isArray(unknown.unknownCheckIds)
        && unknown.unknownCheckIds.includes("missing_quality_check_id"),
      targetedDurationRecorded: Number(targeted.durationMs || 0) >= 0,
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      targeted: {
        id: targeted.id,
        status: targeted.status,
        checkIds: targeted.checks?.map((check: any) => check.id) || [],
        unknownCheckIds: targeted.unknownCheckIds || [],
      },
    };
  } finally {
    try {
      if (previousQuality === null) fs.rmSync(QUALITY_FILE, { force: true });
      else fs.writeFileSync(QUALITY_FILE, previousQuality, "utf-8");
    } catch {}
  }
}

export function runMemoryCenterCompactBoundaryTimelineSelfTest() {
  const groupId = `memory-center-boundary-timeline-selftest-${process.pid}-${Date.now()}`;
  const groupFile = path.join(GROUP_MEMORY_DIR, `${groupId}.json`);
  const messageFile = path.join(GROUP_MESSAGES_DIR, `${groupId}.json`);
  const reloadFile = path.join(CCM_DIR, "group-memory-reload", `${cleanId(groupId)}.json`);
  let dispatchFile = "";
  let usageFile = "";
  let typedDir = "";
  try {
    const {
      buildAgentMemoryContextBundle,
      getGroupPostCompactCandidateUsageLedgerFile,
      getGroupPostCompactDispatchLedgerFile,
      recordGroupPostCompactCandidateUsageLedger,
      saveGroupMemory,
    } = require("../collaboration/memory");
    const { saveGroupMessages } = require("../collaboration/storage");
    const { getGroupTypedMemoryDir } = require("../collaboration/group-memory-index");
    dispatchFile = getGroupPostCompactDispatchLedgerFile(groupId);
    usageFile = getGroupPostCompactCandidateUsageLedgerFile(groupId);
    typedDir = getGroupTypedMemoryDir(groupId);
    const longCompactPayload = [
      "压缩边界时间线需要保留 src/timeline.ts、npm run check、COMPACT_BOUNDARY_TIMELINE_SENTINEL。",
      "这是一段较长的群聊历史，用来验证真实刷新后的 compact boundary token 会下降。",
      "每个子 Agent 会话都是第三方新会话，必须从群聊记忆包恢复约束、文件、验证命令和压缩后派发 marker。",
      "memoryUsed/memoryIgnored、candidate usage ledger、typed memory recall scoring 都需要在时间线上能被串起来。",
    ].join(" ");
    saveGroupMessages(groupId, Array.from({ length: 16 }, (_: any, index: number) => ({
      id: `cbt-${index}`,
      role: index % 2 ? "assistant" : "user",
      agent: index % 2 ? "api" : undefined,
      target: index % 2 ? undefined : "coordinator",
      content: index === 0
        ? `必须保留 COMPACT_BOUNDARY_TIMELINE_SENTINEL。${longCompactPayload.repeat(8)}`
        : `压缩边界时间线自测 ${index}，涉及 src/timeline.ts 和 npm run check。${longCompactPayload.repeat(8)}`,
      timestamp: "2026-07-07T02:00:00.000Z",
    })));
    saveGroupMemory(groupId, {
      groupId,
      goal: "压缩边界时间线自测",
      persistentRequirements: [{ messageId: "cbt-0", text: "必须保留 COMPACT_BOUNDARY_TIMELINE_SENTINEL。" }],
      compaction: {
        version: 1,
        compactedMessageCount: 12,
        preservedRecentMessages: 4,
        preCompactTokenCount: 9000,
        postCompactTokenCount: 1800,
        lastCompactedAt: "2026-07-07T02:00:00.000Z",
        summaryChecksum: "cbt-summary",
        quality: { score: 98, status: "pass", pass: true },
        postCompactReinject: {
          schema: "ccm-post-compact-reinjection-v1",
          hasCandidates: true,
          files: [{ value: "src/timeline.ts", sourceMessageId: "cbt-2" }],
          verification: [{ value: "npm run check", sourceMessageId: "cbt-3" }],
        },
        postCompactRecoveryAudit: {
          schema: "ccm-post-compact-recovery-audit-v1",
          status: "pass",
          pass: true,
          summaryChecksum: "cbt-summary",
          checkCount: 4,
          passedChecks: 4,
          failedChecks: [],
        },
      },
      compactBoundary: {
        summarizedThroughMessageId: "cbt-11",
        summarizedMessageCount: 12,
        summaryChecksum: "cbt-summary",
      },
    });
    recordGroupPostCompactCandidateUsageLedger(groupId, {
      taskId: "task-cbt-ledger",
      targetProject: "api",
      rows: [
        { candidate_id: "cbt_file", value: "src/timeline.ts", usage_state: "used", gate_id: "gate-cbt" },
        { candidate_id: "cbt_check", value: "npm run check", usage_state: "verified", gate_id: "gate-cbt" },
      ],
      generatedAt: "2026-07-07T02:05:00.000Z",
    });
    buildAgentMemoryContextBundle(groupId, "api", "继续 COMPACT_BOUNDARY_TIMELINE_SENTINEL src/timeline.ts", {
      includeGlobalClaudeMemory: false,
      recentLimit: 4,
      minKeepTokens: 1,
    });
    const detail: any = getMemoryCenterScope("group", groupId);
    const timeline = detail.postCompactUsage?.boundaryTimeline || {};
    const report = buildCompactBoundaryTimelineReport({ groupIds: [groupId] });
    const check = evaluateCompactBoundaryTimeline({ groupIds: [groupId] });
    const eventKinds = (timeline.events || []).map((event: any) => event.kind);
    const componentKeys = (timeline.components || []).map((component: any) => component.key);
    const checks = {
      timelineHasSchema: timeline.schema === "ccm-group-compact-boundary-timeline-v1",
      boundaryCapturesTokens: timeline.boundary?.compacted === true
        && Number(timeline.boundary?.preCompactTokenCount || 0) > 0
        && Number(timeline.boundary?.postCompactTokenCount || 0) > 0
        && Number(timeline.boundary?.postCompactTokenCount || 0) < Number(timeline.boundary?.preCompactTokenCount || 0)
        && Number(timeline.boundary?.reductionRate || 0) >= 20,
      componentsCoverCompactLifecycle: ["compression", "recovery", "dispatch", "candidate_usage", "agent_reliability"].every(key => componentKeys.includes(key)),
      eventsCoverCompactLifecycle: ["compact_boundary", "recovery_audit", "first_dispatch", "candidate_usage", "agent_reliability"].every(kind => eventKinds.includes(kind)),
      timelineScoresHealthy: timeline.status === "ok" && Number(timeline.score || 0) >= 90,
      reportAggregatesTimeline: report.schema === "ccm-compact-boundary-timeline-report-v1"
        && report.overall?.status === "ok"
        && report.groups?.some((row: any) => row.groupId === groupId),
      qualityCheckPassesTimeline: check.id === "compact_boundary_timeline"
        && Number(check.checked || 0) === 1
        && Number(check.passed || 0) === 1,
    };
    return { pass: Object.values(checks).every(Boolean), checks, timeline };
  } finally {
    for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, reloadFile, `${reloadFile}.bak`, dispatchFile, usageFile]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
    try { if (typedDir && fs.existsSync(typedDir)) fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
  }
}

export function runMemoryCenterCompactionHookLedgerSelfTest() {
  const groupId = `memory-center-hook-ledger-selftest-${process.pid}-${Date.now()}`;
  const groupFile = path.join(GROUP_MEMORY_DIR, `${groupId}.json`);
  const messageFile = path.join(GROUP_MESSAGES_DIR, `${groupId}.json`);
  const reloadFile = path.join(CCM_DIR, "group-memory-reload", `${cleanId(groupId)}.json`);
  const replayRepairLedgerFile = getGroupCompactBoundaryReplayRepairLedgerFile(groupId);
  let hookLedgerFile = "";
  try {
    const {
      getGroupMemoryCompactionHookLedgerFile,
    } = require("../collaboration/group-memory-compaction");
    const { saveGroupMemory } = require("../collaboration/memory");
    const { saveGroupMessages } = require("../collaboration/storage");
    hookLedgerFile = getGroupMemoryCompactionHookLedgerFile(groupId);
    const hookRunId = `gmch-selftest-${Date.now().toString(36)}`;
    saveGroupMessages(groupId, Array.from({ length: 10 }, (_: any, index: number) => ({
      id: `hook-ledger-${index}`,
      role: index % 2 ? "assistant" : "user",
      agent: index % 2 ? "api" : undefined,
      content: index === 0
        ? "必须保留 HOOK_LEDGER_SENTINEL。"
        : `hook ledger 自测 ${index}，涉及 src/hook-ledger.ts。`,
      timestamp: "2026-07-07T03:00:00.000Z",
    })));
    saveGroupMemory(groupId, {
      groupId,
      goal: "压缩 hook ledger 自测",
      persistentRequirements: [{ messageId: "hook-ledger-0", text: "必须保留 HOOK_LEDGER_SENTINEL。" }],
      compaction: {
        version: 1,
        compactedMessageCount: 6,
        preservedRecentMessages: 4,
        preCompactTokenCount: 6000,
        postCompactTokenCount: 1600,
        lastCompactedAt: "2026-07-07T03:00:00.000Z",
        summaryChecksum: "hook-ledger-summary",
        hookLedger: {
          schema: "ccm-group-memory-compaction-hook-ledger-summary-v1",
          hookRunId,
          file: hookLedgerFile,
        },
        postCompactRecoveryAudit: {
          schema: "ccm-post-compact-recovery-audit-v1",
          status: "pass",
          pass: true,
          checkCount: 2,
          passedChecks: 2,
          failedChecks: [],
        },
      },
      compactBoundary: {
        id: "boundary-hook-ledger-selftest",
        summarizedThroughMessageId: "hook-ledger-5",
        summarizedMessageCount: 6,
        summaryChecksum: "hook-ledger-summary",
        preCompactTokenCount: 6000,
        postCompactTokenCount: 1600,
      },
    });
    const entries = [
      {
        entry_id: "hook-ledger-pre",
        hook_run_id: hookRunId,
        group_id: groupId,
        phase: "pre",
        hook_index: 0,
        ok: true,
        status: "ok",
        duration_ms: 3,
        error: "",
        result_summary: { keys: ["mustKeep", "factAnchors"], persistentRequirementCount: 1, factAnchorCount: 1 },
        at: "2026-07-07T03:00:00.000Z",
        boundary_id: "",
        summarized_through_message_id: "",
        summary_checksum: "",
      },
      {
        entry_id: "hook-ledger-post",
        hook_run_id: hookRunId,
        group_id: groupId,
        phase: "post",
        hook_index: 0,
        ok: true,
        status: "ok",
        duration_ms: 5,
        error: "",
        result_summary: { keys: ["checked", "microRecords"], checked: true },
        at: "2026-07-07T03:00:01.000Z",
        boundary_id: "boundary-hook-ledger-selftest",
        summarized_through_message_id: "hook-ledger-5",
        summary_checksum: "hook-ledger-summary",
      },
    ];
    fs.mkdirSync(path.dirname(hookLedgerFile), { recursive: true });
    fs.writeFileSync(hookLedgerFile, JSON.stringify({
      schema: "ccm-group-memory-compaction-hook-ledger-v1",
      version: 1,
      groupId,
      entries,
      stats: { total: 2, ok: 2, failed: 0, pre: { total: 1, ok: 1, failed: 0 }, post: { total: 1, ok: 1, failed: 0 } },
      updatedAt: "2026-07-07T03:00:01.000Z",
    }, null, 2), "utf-8");
    const detail: any = getMemoryCenterScope("group", groupId);
    const hooks = detail.postCompactUsage?.compactionHooks || {};
    const report = buildCompactionHookLedgerReport({ groupIds: [groupId] });
    const check = evaluateCompactionHookLedger({ groupIds: [groupId] });
    const overview = buildMemoryCenterOverview();
    const overviewHookReport: any = overview.compactionHookLedgerReport || {};
    const checks = {
      detailExposesHookLedger: hooks.schema === "ccm-group-compaction-hook-ledger-summary-v1"
        && hooks.status === "ok"
        && hooks.preCount === 1
        && hooks.postCount === 1
        && hooks.failedCount === 0
        && hooks.recentEntries?.some((entry: any) => entry.phase === "post"),
      reportAggregatesHookLedger: report.schema === "ccm-compaction-hook-ledger-report-v1"
        && report.overall?.status === "ok"
        && report.groups?.some((row: any) => row.groupId === groupId && row.status === "ok"),
      qualityCheckPassesHookLedger: check.id === "compaction_hook_ledger"
        && Number(check.checked || 0) === 1
        && Number(check.passed || 0) === 1,
      overviewExposesHookReport: overviewHookReport.schema === "ccm-compaction-hook-ledger-report-v1"
        && overviewHookReport.overall
        && Array.isArray(overviewHookReport.groups),
    };
    return { pass: Object.values(checks).every(Boolean), checks, hooks };
  } finally {
    for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, reloadFile, `${reloadFile}.bak`, hookLedgerFile, replayRepairLedgerFile]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
  }
}

export function runMemoryCenterCompactBoundaryReplayGateSelfTest() {
  const groupId = `memory-center-replay-gate-selftest-${process.pid}-${Date.now()}`;
  const groupFile = path.join(GROUP_MEMORY_DIR, `${groupId}.json`);
  const messageFile = path.join(GROUP_MESSAGES_DIR, `${groupId}.json`);
  const reloadFile = path.join(CCM_DIR, "group-memory-reload", `${cleanId(groupId)}.json`);
  let hookLedgerFile = "";
  try {
    const { getGroupMemoryCompactionHookLedgerFile } = require("../collaboration/group-memory-compaction");
    const { saveGroupMemory } = require("../collaboration/memory");
    const { saveGroupMessages } = require("../collaboration/storage");
    hookLedgerFile = getGroupMemoryCompactionHookLedgerFile(groupId);
    const hookRunId = `gmch-replay-${Date.now().toString(36)}`;
    saveGroupMessages(groupId, Array.from({ length: 12 }, (_: any, index: number) => ({
      id: `replay-gate-${index}`,
      role: index % 2 ? "assistant" : "user",
      agent: index % 2 ? "api" : undefined,
      content: index === 0
        ? "必须保留 REPLAY_GATE_HOOK_SENTINEL。"
        : `Replay gate 自测 ${index}，涉及 src/replay-gate.ts 和 npm run test:replay。`,
      timestamp: "2026-07-07T04:00:00.000Z",
    })));
    saveGroupMemory(groupId, {
      groupId,
      goal: "验证压缩边界 replay gate 能恢复子 Agent 上下文",
      persistentRequirements: [{ messageId: "hook-pre", text: "必须保留 REPLAY_GATE_HOOK_SENTINEL。" }],
      nextActions: [{ action: "继续核对 replay gate 验收线索" }],
      compaction: {
        version: 1,
        compactedMessageCount: 8,
        preservedRecentMessages: 4,
        preCompactTokenCount: 7600,
        postCompactTokenCount: 1700,
        lastCompactedAt: "2026-07-07T04:00:00.000Z",
        summaryChecksum: "replay-gate-summary",
        postCompactReinject: {
          schema: "ccm-post-compact-reinjection-v1",
          hasCandidates: true,
          files: [{ candidate_id: "replay_file", value: "src/replay-gate.ts", sourceMessageId: "replay-gate-2" }],
          verification: [{ candidate_id: "replay_check", value: "npm run test:replay", sourceMessageId: "replay-gate-3" }],
        },
        postCompactRecoveryAudit: {
          schema: "ccm-post-compact-recovery-audit-v1",
          status: "pass",
          pass: true,
          summaryChecksum: "replay-gate-summary",
          checkCount: 3,
          passedChecks: 3,
          failedChecks: [],
        },
        hookLedger: {
          schema: "ccm-group-memory-compaction-hook-ledger-summary-v1",
          hookRunId,
          file: hookLedgerFile,
          stats: {
            failed: 0,
            pre: { total: 1, ok: 1, failed: 0 },
            post: { total: 1, ok: 1, failed: 0 },
          },
          recentEntries: [
            {
              entry_id: "replay-hook-pre",
              hook_run_id: hookRunId,
              phase: "pre",
              ok: true,
              status: "ok",
              duration_ms: 2,
              result_summary: { keys: ["mustKeep"], persistentRequirementCount: 1, text: "REPLAY_GATE_HOOK_SENTINEL" },
              at: "2026-07-07T04:00:00.000Z",
            },
            {
              entry_id: "replay-hook-post",
              hook_run_id: hookRunId,
              phase: "post",
              ok: true,
              status: "ok",
              duration_ms: 3,
              result_summary: { keys: ["checked"], checked: true },
              at: "2026-07-07T04:00:01.000Z",
            },
          ],
        },
      },
      compactBoundary: {
        id: "boundary-replay-gate-selftest",
        summarizedThroughMessageId: "replay-gate-7",
        summarizedMessageCount: 8,
        summaryChecksum: "replay-gate-summary",
        preCompactTokenCount: 7600,
        postCompactTokenCount: 1700,
      },
      agentMemories: { api: { project: "api", recentReceipts: [], frequentFiles: ["src/replay-gate.ts"] } },
    });
    fs.mkdirSync(path.dirname(hookLedgerFile), { recursive: true });
    fs.writeFileSync(hookLedgerFile, JSON.stringify({
      schema: "ccm-group-memory-compaction-hook-ledger-v1",
      version: 1,
      groupId,
      entries: [
        {
          entry_id: "replay-hook-pre",
          hook_run_id: hookRunId,
          group_id: groupId,
          phase: "pre",
          hook_index: 0,
          ok: true,
          status: "ok",
          duration_ms: 2,
          result_summary: { keys: ["mustKeep"], persistentRequirementCount: 1, text: "REPLAY_GATE_HOOK_SENTINEL" },
          at: "2026-07-07T04:00:00.000Z",
        },
        {
          entry_id: "replay-hook-post",
          hook_run_id: hookRunId,
          group_id: groupId,
          phase: "post",
          hook_index: 0,
          ok: true,
          status: "ok",
          duration_ms: 3,
          result_summary: { keys: ["checked"], checked: true },
          at: "2026-07-07T04:00:01.000Z",
        },
      ],
      stats: { total: 2, ok: 2, failed: 0, pre: { total: 1, ok: 1, failed: 0 }, post: { total: 1, ok: 1, failed: 0 } },
      updatedAt: "2026-07-07T04:00:01.000Z",
    }, null, 2), "utf-8");
    const detail: any = getMemoryCenterScope("group", groupId);
    const replay = detail.postCompactUsage?.boundaryReplay || {};
    const report = buildCompactBoundaryReplayReport({ groupIds: [groupId] });
    const check = evaluateCompactBoundaryReplayGate({ groupIds: [groupId] });
    const needleText = JSON.stringify(replay.needles || []);
    const checks = {
      detailExposesReplayGate: replay.schema === "ccm-compact-boundary-replay-gate-v1"
        && replay.status === "ok"
        && Number(replay.score || 0) >= 95
        && replay.receiptContractVisible === true
        && replay.candidateContractVisible === true,
      replayMatchesHookConstraint: needleText.includes("REPLAY_GATE_HOOK_SENTINEL")
        && replay.needles?.some((needle: any) => needle.type === "constraint" && needle.matched === true),
      replayMatchesFileAndVerification: replay.needles?.some((needle: any) => needle.type === "file" && needle.value.includes("src/replay-gate.ts") && needle.matched === true)
        && replay.needles?.some((needle: any) => needle.type === "verification" && needle.value.includes("npm run test:replay") && needle.matched === true),
      replayMatchesBoundaryAndHook: replay.needles?.some((needle: any) => needle.type === "boundary" && needle.value.includes("replay-gate-summary") && needle.matched === true)
        && replay.needles?.some((needle: any) => needle.type === "hook" && needle.value.includes(hookRunId) && needle.matched === true),
      replayRepairPlanIdleWhenHealthy: replay.repairPlan?.schema === "ccm-compact-boundary-replay-repair-plan-v1"
        && replay.repairPlan?.status === "ok"
        && Number(replay.repairPlan?.requiredActionCount || 0) === 0,
      reportAggregatesReplayGate: report.schema === "ccm-compact-boundary-replay-report-v1"
        && report.overall?.status === "ok"
        && report.groups?.some((row: any) => row.groupId === groupId && row.status === "ok"),
      qualityCheckPassesReplayGate: check.id === "compact_boundary_replay_gate"
        && Number(check.checked || 0) === 1
        && Number(check.passed || 0) === 1,
    };
    return { pass: Object.values(checks).every(Boolean), checks, replay };
  } finally {
    for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, reloadFile, `${reloadFile}.bak`, hookLedgerFile]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
  }
}

export function runMemoryCenterCompactBoundaryReplayRepairPlanSelfTest() {
  const groupId = `memory-center-replay-repair-selftest-${process.pid}-${Date.now()}`;
  const memory = {
    groupId,
    goal: "验证 replay repair plan 能把失败 replay 变成可执行修复动作",
    compaction: {
      summaryChecksum: "repair-plan-summary",
      compactedMessageCount: 9,
      preservedRecentMessages: 3,
      postCompactReinject: {
        schema: "ccm-post-compact-reinjection-v1",
        files: [{ candidate_id: "lost_file", value: "src/lost-context.ts", sourceMessageId: "m2" }],
      },
    },
    compactBoundary: {
      summarizedThroughMessageId: "m9",
      summaryChecksum: "repair-plan-summary",
    },
  };
  const gaps = [
    {
      type: "receipt_contract",
      label: "memoryUsed/memoryIgnored",
      value: "memoryUsed/memoryIgnored",
      reason: "回执契约未进入子 Agent replay 上下文",
    },
    {
      type: "file",
      label: "lost_file",
      value: "src/lost-context.ts",
      reason: "压缩后文件候选未进入子 Agent replay 上下文",
    },
  ];
  const plan = buildCompactBoundaryReplayRepairPlan(groupId, memory, {
    status: "fail",
    score: 50,
    targetProject: "api",
    renderedHash: "repair-plan-rendered",
    gaps,
    candidates: memory.compaction.postCompactReinject.files,
    boundary: compactMemoryHasPostCompactBoundary(memory),
  });
  const checks = {
    exposesRepairPlanSchema: plan.schema === "ccm-compact-boundary-replay-repair-plan-v1"
      && plan.status === "rework_required"
      && plan.action === "refresh_and_replay_child_agent_memory",
    prioritizesReceiptContract: plan.actions?.[0]?.component === "child_agent_receipt_contract"
      && plan.actions?.[0]?.priority === "critical",
    carriesCandidateReinjectionAction: plan.actions?.some((action: any) => action.component === "post_compact_reinject" && String(action.expected || "").includes("src/lost-context.ts")),
    emitsChildAgentPromptPatch: String(plan.promptPatch || "").includes("memoryUsed/memoryIgnored")
      && String(plan.promptPatch || "").includes("src/lost-context.ts"),
    keepsRawRecoveryPointers: String(plan.rawRecovery?.groupMemoryFile || "").endsWith(`${groupId}.json`)
      && String(plan.rawRecovery?.groupMessagesFile || "").endsWith(`${groupId}.json`),
  };
  return { pass: Object.values(checks).every(Boolean), checks, plan };
}

export function runMemoryCenterCompactBoundaryReplayRepairLedgerSelfTest() {
  const groupId = `memory-center-replay-repair-ledger-selftest-${process.pid}-${Date.now()}`;
  const ledgerFile = getGroupCompactBoundaryReplayRepairLedgerFile(groupId);
  try {
    const memory = {
      groupId,
      goal: "验证 replay repair ledger 能记录 attempt history",
      compaction: { summaryChecksum: "repair-ledger-summary", compactedMessageCount: 8 },
      compactBoundary: { summarizedThroughMessageId: "ledger-m8", summaryChecksum: "repair-ledger-summary" },
    };
    const plan = buildCompactBoundaryReplayRepairPlan(groupId, memory, {
      status: "fail",
      score: 50,
      targetProject: "api",
      renderedHash: "repair-ledger-fail",
      boundary: compactMemoryHasPostCompactBoundary(memory),
      gaps: [
        { type: "receipt_contract", label: "memoryUsed/memoryIgnored", value: "memoryUsed/memoryIgnored", reason: "回执契约缺失" },
        { type: "file", label: "lost_file", value: "src/lost-ledger.ts", reason: "候选文件缺失" },
      ],
      candidates: [{ candidate_id: "lost_file", kind: "file", value: "src/lost-ledger.ts" }],
    });
    const failReplay = {
      schema: "ccm-compact-boundary-replay-gate-v1",
      groupId,
      targetProject: "api",
      status: "fail",
      score: 50,
      renderedHash: "repair-ledger-fail",
      renderedChars: 1200,
      checked: 4,
      passed: 2,
      candidateCount: 1,
      boundary: plan.boundary,
      gaps: [{ type: "receipt_contract" }, { type: "file" }],
      repairPlan: plan,
    };
    const first = recordCompactBoundaryReplayRepairAttempt(groupId, failReplay, { at: "2026-07-07T05:00:00.000Z" });
    const duplicate = recordCompactBoundaryReplayRepairAttempt(groupId, failReplay, { at: "2026-07-07T05:00:01.000Z" });
    const okReplay = {
      ...failReplay,
      status: "ok",
      score: 100,
      renderedHash: "repair-ledger-ok",
      checked: 4,
      passed: 4,
      gaps: [],
      repairPlan: buildCompactBoundaryReplayRepairPlan(groupId, memory, {
        status: "ok",
        score: 100,
        targetProject: "api",
        renderedHash: "repair-ledger-ok",
        boundary: compactMemoryHasPostCompactBoundary(memory),
        gaps: [],
        candidates: [{ candidate_id: "lost_file", kind: "file", value: "src/lost-ledger.ts" }],
      }),
    };
    const resolved = recordCompactBoundaryReplayRepairAttempt(groupId, okReplay, { at: "2026-07-07T05:00:02.000Z" });
    const ledger = readGroupCompactBoundaryReplayRepairLedger(groupId);
    const rendered = (() => {
      try {
        const { renderGroupMemoryContextBundle } = require("../collaboration/memory");
        return renderGroupMemoryContextBundle({
          schema: "ccm-group-memory-context-v1",
          target_project: "api",
          group_state: { goal: memory.goal, currentPhase: "test" },
          memory_policy: { use: "must_consider" },
          compaction: { replayRepairLedger: resolved },
        });
      } catch (error: any) {
        return String(error?.message || error);
      }
    })();
    const checks = {
      firstAttemptCreatesLedger: first.schema === "ccm-compact-boundary-replay-repair-ledger-summary-v1"
        && first.attemptCount === 1
        && first.openActionCount === 2,
      duplicateDoesNotCreateSecondAttempt: duplicate.attemptCount === 1
        && duplicate.recentAttempts?.[0]?.seen_count === 2,
      resolvedAttemptAppendsHistory: resolved.attemptCount === 2
        && resolved.latestStatus === "ok"
        && resolved.openActionCount === 0
        && resolved.recentAttempts?.some((attempt: any) => attempt.status === "fail" && attempt.required_action_count === 2),
      ledgerPersistsSidecar: fs.existsSync(ledgerFile)
        && ledger.entries?.length === 2
        && ledger.stats?.latestStatus === "ok",
      childAgentRendererMentionsAttemptLedger: rendered.includes("Replay Gate attempt ledger")
        && rendered.includes("attempts=2")
        && rendered.includes("openActions=0"),
    };
    return { pass: Object.values(checks).every(Boolean), checks, ledger: resolved };
  } finally {
    for (const file of [ledgerFile, `${ledgerFile}.bak`]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
  }
}

export function runMemoryCenterReplayRepairPendingWorkItemsSelfTest() {
  const groupId = `memory-center-replay-repair-work-selftest-${process.pid}-${Date.now()}`;
  const workItemsFile = getGroupCompactBoundaryReplayRepairWorkItemsFile(groupId);
  const repairLedgerFile = getGroupCompactBoundaryReplayRepairLedgerFile(groupId);
  try {
    const memory = {
      groupId,
      goal: "验证 replay repair pending work items 能被主 Agent 读取",
      compaction: { summaryChecksum: "repair-work-summary", compactedMessageCount: 8 },
      compactBoundary: { summarizedThroughMessageId: "work-m8", summaryChecksum: "repair-work-summary" },
    };
    const failPlan = buildCompactBoundaryReplayRepairPlan(groupId, memory, {
      status: "fail",
      score: 50,
      targetProject: "api",
      renderedHash: "repair-work-fail",
      boundary: compactMemoryHasPostCompactBoundary(memory),
      gaps: [
        { type: "receipt_contract", label: "memoryUsed/memoryIgnored", value: "memoryUsed/memoryIgnored", reason: "回执契约缺失" },
        { type: "file", label: "lost_file", value: "src/lost-work.ts", reason: "候选文件缺失" },
      ],
      candidates: [{ candidate_id: "lost_file", kind: "file", value: "src/lost-work.ts" }],
    });
    const failReplay = {
      schema: "ccm-compact-boundary-replay-gate-v1",
      groupId,
      targetProject: "api",
      status: "fail",
      score: 50,
      renderedHash: "repair-work-fail",
      renderedChars: 1200,
      checked: 4,
      passed: 2,
      candidateCount: 1,
      boundary: failPlan.boundary,
      gaps: [{ type: "receipt_contract" }, { type: "file" }],
      repairPlan: failPlan,
      repairLedger: { latestAttemptId: "replay-attempt:repair-work-fail" },
    };
    const first = syncCompactBoundaryReplayRepairPendingWorkItems(groupId, failReplay, { at: "2026-07-07T08:00:00.000Z" });
    const duplicate = syncCompactBoundaryReplayRepairPendingWorkItems(groupId, failReplay, { at: "2026-07-07T08:00:01.000Z" });
    const report = buildReplayRepairPendingWorkItemReport({ groupIds: [groupId], replays: [failReplay], generatedAt: "2026-07-07T08:00:02.000Z" });
    const check = evaluateReplayRepairPendingWorkItems({ groupIds: [groupId], replays: [failReplay], generatedAt: "2026-07-07T08:00:03.000Z" });
    const rendered = (() => {
      try {
        const { renderGroupMemoryContextBundle } = require("../collaboration/memory");
        return renderGroupMemoryContextBundle({
          schema: "ccm-group-memory-context-v1",
          target_project: "api",
          memory_policy: { use: "must_consider" },
          group_state: { goal: memory.goal, currentPhase: "test" },
          compaction: { replayRepairWorkItems: first },
        });
      } catch (error: any) {
        return String(error?.message || error);
      }
    })();
    const okPlan = buildCompactBoundaryReplayRepairPlan(groupId, memory, {
      status: "ok",
      score: 100,
      targetProject: "api",
      renderedHash: "repair-work-ok",
      boundary: compactMemoryHasPostCompactBoundary(memory),
      gaps: [],
      candidates: [{ candidate_id: "lost_file", kind: "file", value: "src/lost-work.ts" }],
    });
    const resolved = syncCompactBoundaryReplayRepairPendingWorkItems(groupId, {
      ...failReplay,
      status: "ok",
      score: 100,
      renderedHash: "repair-work-ok",
      checked: 4,
      passed: 4,
      gaps: [],
      repairPlan: okPlan,
      repairLedger: { latestAttemptId: "replay-attempt:repair-work-ok" },
    }, { at: "2026-07-07T08:00:04.000Z" });
    const ledger = readGroupCompactBoundaryReplayRepairWorkItems(groupId);
    const checks = {
      firstMaterializesOpenItems: first.schema === "ccm-compact-boundary-replay-repair-work-items-summary-v1"
        && first.openItemCount === 2
        && first.pendingCount === 2
        && first.items?.some((item: any) => item.priority === "critical"),
      duplicateDoesNotAppend: duplicate.total === 2
        && duplicate.openItemCount === 2
        && readGroupCompactBoundaryReplayRepairWorkItems(groupId).items.length === 2,
      reportCoversRequiredActions: report.schema === "ccm-replay-repair-pending-work-item-report-v1"
        && report.overall?.status === "ok"
        && report.overall?.coverageRate === 100
        && report.overall?.requiredActionCount === 2,
      qualityCheckPassesWorkItems: check.id === "replay_repair_pending_work_items"
        && Number(check.checked || 0) === 1
        && Number(check.passed || 0) === 1,
      childAgentRendererMentionsPendingWork: rendered.includes("Replay Repair pending work")
        && rendered.includes("open=2")
        && rendered.includes("group-main-agent"),
      resolvedReplayClosesOpenItems: resolved.openItemCount === 0
        && resolved.completedCount === 2
        && ledger.items?.every((item: any) => item.status === "completed"),
    };
    return { pass: Object.values(checks).every(Boolean), checks, first, resolved };
  } finally {
    for (const file of [workItemsFile, `${workItemsFile}.bak`, repairLedgerFile, `${repairLedgerFile}.bak`]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
  }
}

export function runMemoryCenterReplayRepairWorkItemClaimSelfTest() {
  const groupId = `memory-center-replay-repair-claim-selftest-${process.pid}-${Date.now()}`;
  const workItemsFile = getGroupCompactBoundaryReplayRepairWorkItemsFile(groupId);
  const repairLedgerFile = getGroupCompactBoundaryReplayRepairLedgerFile(groupId);
  try {
    const memory = {
      groupId,
      goal: "验证 replay repair work item claim/dispatch 状态机",
      compaction: { summaryChecksum: "repair-claim-summary", compactedMessageCount: 8 },
      compactBoundary: { summarizedThroughMessageId: "claim-m8", summaryChecksum: "repair-claim-summary" },
    };
    const plan = buildCompactBoundaryReplayRepairPlan(groupId, memory, {
      status: "fail",
      score: 50,
      targetProject: "api",
      renderedHash: "repair-claim-fail",
      boundary: compactMemoryHasPostCompactBoundary(memory),
      gaps: [
        { type: "receipt_contract", label: "memoryUsed/memoryIgnored", value: "memoryUsed/memoryIgnored", reason: "回执契约缺失" },
      ],
      candidates: [],
    });
    const failReplay = {
      schema: "ccm-compact-boundary-replay-gate-v1",
      groupId,
      targetProject: "api",
      status: "fail",
      score: 50,
      renderedHash: "repair-claim-fail",
      checked: 2,
      passed: 1,
      boundary: plan.boundary,
      gaps: [{ type: "receipt_contract" }],
      repairPlan: plan,
      repairLedger: { latestAttemptId: "replay-attempt:repair-claim-fail" },
    };
    const synced = syncCompactBoundaryReplayRepairPendingWorkItems(groupId, failReplay, { at: "2026-07-07T09:00:00.000Z" });
    const itemId = synced.items?.[0]?.id;
    const claim = updateCompactBoundaryReplayRepairWorkItem({
      groupId,
      itemId,
      action: "claim",
      owner: "group-main-agent",
      reason: "主 Agent 认领 replay 修复",
      at: "2026-07-07T09:00:01.000Z",
    });
    let alreadyClaimed = "";
    try {
      updateCompactBoundaryReplayRepairWorkItem({
        groupId,
        itemId,
        action: "claim",
        owner: "other-agent",
        at: "2026-07-07T09:00:02.000Z",
      });
    } catch (error: any) {
      alreadyClaimed = error?.message || String(error);
    }
    const dispatch = updateCompactBoundaryReplayRepairWorkItem({
      groupId,
      itemId,
      action: "dispatch",
      owner: "group-main-agent",
      dispatchTarget: "api",
      reason: "主 Agent 标记准备派发给 api",
      at: "2026-07-07T09:00:03.000Z",
    });
    const blocked = updateCompactBoundaryReplayRepairWorkItem({
      groupId,
      itemId,
      action: "block",
      owner: "group-main-agent",
      reason: "等待 typed MEMORY.md 回溯",
      at: "2026-07-07T09:00:04.000Z",
    });
    const completed = updateCompactBoundaryReplayRepairWorkItem({
      groupId,
      itemId,
      action: "complete",
      owner: "group-main-agent",
      reason: "已补齐回执契约并等待 replay 验证",
      at: "2026-07-07T09:00:05.000Z",
    });
    const reopened = updateCompactBoundaryReplayRepairWorkItem({
      groupId,
      itemId,
      action: "reopen",
      owner: "group-main-agent",
      reason: "replay 仍失败，重开修复项",
      at: "2026-07-07T09:00:06.000Z",
    });
    const rendered = (() => {
      try {
        const { renderGroupMemoryContextBundle } = require("../collaboration/memory");
        return renderGroupMemoryContextBundle({
          schema: "ccm-group-memory-context-v1",
          target_project: "api",
          memory_policy: { use: "must_consider" },
          group_state: { goal: memory.goal, currentPhase: "test" },
          compaction: { replayRepairWorkItems: reopened.workItems },
        });
      } catch (error: any) {
        return String(error?.message || error);
      }
    })();
    const ledger = readGroupCompactBoundaryReplayRepairWorkItems(groupId);
    const item = ledger.items?.find((entry: any) => entry.id === itemId) || {};
    const checks = {
      claimMovesToInProgress: claim.item?.status === "in_progress"
        && claim.item?.owner === "group-main-agent"
        && !!claim.item?.startedAt,
      alreadyClaimedGuard: alreadyClaimed.includes("已由 group-main-agent 认领"),
      dispatchKeepsInProgressAndRecordsTarget: dispatch.item?.status === "in_progress"
        && dispatch.item?.dispatch_target === "api",
      blockRecordsReason: blocked.item?.status === "blocked"
        && String(blocked.item?.blockedReason || "").includes("typed MEMORY"),
      completeClosesItem: completed.item?.status === "completed"
        && completed.workItems.completedCount === 1
        && completed.workItems.openItemCount === 0,
      reopenReturnsPending: reopened.item?.status === "pending"
        && reopened.workItems.openItemCount === 1
        && Number(reopened.item?.attempt || 0) >= 2,
      historyPersistsStateTransitions: Array.isArray(item.history)
        && ["claim", "dispatch", "block", "complete", "reopen"].every(action => item.history.some((entry: any) => entry.action === action)),
      childAgentRendererSeesReopenedWork: rendered.includes("Replay Repair pending work")
        && rendered.includes("open=1")
        && rendered.includes("group-main-agent"),
    };
    return { pass: Object.values(checks).every(Boolean), checks, item };
  } finally {
    for (const file of [workItemsFile, `${workItemsFile}.bak`, repairLedgerFile, `${repairLedgerFile}.bak`]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
  }
}

export function runMemoryCenterReplayRepairDispatchCandidateSelfTest() {
  const groupId = `memory-center-replay-repair-dispatch-candidate-selftest-${process.pid}-${Date.now()}`;
  const workItemsFile = getGroupCompactBoundaryReplayRepairWorkItemsFile(groupId);
  const repairLedgerFile = getGroupCompactBoundaryReplayRepairLedgerFile(groupId);
  try {
    const memory = {
      groupId,
      goal: "验证 replay repair work item 能进入主 Agent 派发候选上下文",
      compaction: { summaryChecksum: "repair-dispatch-summary", compactedMessageCount: 8 },
      compactBoundary: { summarizedThroughMessageId: "dispatch-m8", summaryChecksum: "repair-dispatch-summary" },
    };
    const plan = buildCompactBoundaryReplayRepairPlan(groupId, memory, {
      status: "fail",
      score: 42,
      targetProject: "api",
      renderedHash: "repair-dispatch-fail",
      boundary: compactMemoryHasPostCompactBoundary(memory),
      gaps: [
        { type: "file", label: "src/lost-memory.ts", value: "src/lost-memory.ts", reason: "压缩后文件候选未进入子 Agent 记忆包" },
      ],
      candidates: [{ candidate_id: "lost-memory-file", kind: "file", value: "src/lost-memory.ts" }],
    });
    const failReplay = {
      schema: "ccm-compact-boundary-replay-gate-v1",
      groupId,
      targetProject: "api",
      status: "fail",
      score: 42,
      renderedHash: "repair-dispatch-fail",
      checked: 3,
      passed: 1,
      candidateCount: 1,
      boundary: plan.boundary,
      gaps: [{ type: "file" }],
      repairPlan: plan,
      repairLedger: { latestAttemptId: "replay-attempt:repair-dispatch-fail" },
    };
    const synced = syncCompactBoundaryReplayRepairPendingWorkItems(groupId, failReplay, { at: "2026-07-07T10:00:00.000Z" });
    const itemId = synced.items?.[0]?.id || synced.items?.[0]?.work_item_id;
    updateCompactBoundaryReplayRepairWorkItem({
      groupId,
      itemId,
      action: "claim",
      owner: "group-main-agent",
      reason: "主 Agent 认领 replay dispatch candidate",
      at: "2026-07-07T10:00:01.000Z",
    });
    updateCompactBoundaryReplayRepairWorkItem({
      groupId,
      itemId,
      action: "dispatch",
      owner: "group-main-agent",
      dispatchTarget: "api",
      reason: "主 Agent 准备把 replay 修复派发给 api",
      at: "2026-07-07T10:00:02.000Z",
    });
    const candidates = buildReplayRepairMainAgentDispatchCandidates(groupId);
    const candidate = candidates.candidates?.[0] || {};
    const report = buildReplayRepairDispatchCandidateReport({ groupIds: [groupId] });
    const check = evaluateReplayRepairDispatchCandidates({ groupIds: [groupId] });
    const rendered = (() => {
      try {
        const { renderGroupMemoryContextBundle } = require("../collaboration/memory");
        return renderGroupMemoryContextBundle({
          schema: "ccm-group-memory-context-v1",
          target_project: "api",
          memory_policy: { use: "must_consider" },
          group_state: { goal: memory.goal, currentPhase: "test" },
          compaction: {
            replayRepairWorkItems: summarizeReplayRepairPendingWorkItems(groupId),
            replayRepairDispatchCandidates: candidates,
          },
        });
      } catch (error: any) {
        return String(error?.message || error);
      }
    })();
    const coordinatorPrompt = (() => {
      try {
        const { buildCoordinatorPrompt } = require("../collaboration/group-orchestrator");
        return buildCoordinatorPrompt({
          group: {
            id: groupId,
            members: [
              { project: "coordinator", role: "coordinator", agent: "coded-orchestrator" },
              { project: "api", agent: "claude-code" },
            ],
          },
          context: "用户要求继续修复记忆 replay 缺口",
          message: "继续处理记忆 replay 修复候选",
        });
      } catch (error: any) {
        return String(error?.message || error);
      }
    })();
    const checks = {
      candidateSummaryIncludesDispatchItem: candidates.schema === "ccm-replay-repair-main-agent-dispatch-candidates-v1"
        && candidates.candidateCount === 1
        && candidates.dispatchMarkedCount === 1
        && candidate.dispatch_target === "api"
        && candidate.shouldCreateRealTask === false,
      candidateCarriesRepairPayload: String(candidate.prompt_patch || "").includes("Replay")
        && !!candidate.raw_recovery?.rule
        && String(candidate.expected || "").includes("src/lost-memory.ts"),
      qualityCheckCoversCandidate: report.overall?.status === "ok"
        && report.overall?.candidateCount === 1
        && check.id === "replay_repair_dispatch_candidates"
        && Number(check.passed || 0) === 1,
      childAgentRendererMentionsDispatchCandidate: rendered.includes("Main Agent replay repair dispatch candidates")
        && rendered.includes("shouldCreateRealTask=false")
        && rendered.includes("api"),
      coordinatorPromptReceivesCandidate: coordinatorPrompt.includes("群聊记忆 Replay 修复派发候选")
        && coordinatorPrompt.includes("shouldCreateRealTask=false")
        && coordinatorPrompt.includes("main_agent_review_and_dispatch_to_child_agent"),
    };
    return { pass: Object.values(checks).every(Boolean), checks, candidates };
  } finally {
    for (const file of [workItemsFile, `${workItemsFile}.bak`, repairLedgerFile, `${repairLedgerFile}.bak`]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
  }
}

export function runMemoryCenterGroupSessionMemorySnapshotSelfTest() {
  const groupId = `memory-center-session-memory-selftest-${process.pid}-${Date.now()}`;
  const groupFile = path.join(GROUP_MEMORY_DIR, `${groupId}.json`);
  const messageFile = path.join(GROUP_MESSAGES_DIR, `${groupId}.json`);
  const snapshotFile = getGroupSessionMemorySnapshotFile(groupId);
  const summaryFile = getGroupSessionMemoryMarkdownFile(groupId);
  const reloadFile = path.join(CCM_DIR, "group-memory-reload", `${cleanId(groupId)}.json`);
  const typedDir = path.join(CCM_DIR, "group-memory-md", sidecarFileId(groupId));
  try {
    const {
      saveGroupMessages,
    } = require("../collaboration/storage");
    const {
      buildGroupContextPacket,
      buildAgentMemoryContextBundle,
      renderGroupMemoryContextBundle,
      buildGlobalGroupMemoryContext,
      renderGlobalGroupMemoryContextBundle,
      loadGroupMemory,
      readGroupSessionMemorySnapshotSummary,
    } = require("../collaboration/memory");
    const messages = Array.from({ length: 80 }, (_, index) => ({
      id: `gsm-${index}`,
      role: index % 2 === 0 ? "user" : "assistant",
      target: index % 2 === 0 ? "coordinator" : undefined,
      agent: index % 2 === 1 ? "api" : undefined,
      timestamp: `2026-07-07T11:${String(index).padStart(2, "0")}:00.000Z`,
      content: index === 0
        ? "必须保留 GROUP_SESSION_MEMORY_SENTINEL，所有子 Agent 新会话都要收到群聊会话摘要。"
        : `Session Memory 自测消息 ${index}，涉及 src/session-memory-${index}.ts，需要压缩后仍可恢复。${"上下文证据".repeat(90)}`,
    }));
    saveGroupMessages(groupId, messages);
    const context = buildGroupContextPacket(groupId, { recentLimit: 4, olderLimit: 8, fullCount: 2 });
    const memory = loadGroupMemory(groupId);
    const snapshot = readGroupSessionMemorySnapshotSummary(groupId);
    const markdown = fs.readFileSync(summaryFile, "utf-8");
    const childBundle = buildAgentMemoryContextBundle(groupId, "api", "继续处理 GROUP_SESSION_MEMORY_SENTINEL");
    const childRendered = renderGroupMemoryContextBundle(childBundle);
    const globalBundle = buildGlobalGroupMemoryContext("GROUP_SESSION_MEMORY_SENTINEL", {
      groups: [{ id: groupId, name: "Session Memory Selftest", members: [{ project: "api", agent: "claude-code" }] }],
      disableLedger: true,
      maxGroups: 1,
    });
    const globalRendered = renderGlobalGroupMemoryContextBundle(globalBundle);
    const report = buildGroupSessionMemorySnapshotReport({ groupIds: [groupId] });
    const check = evaluateGroupSessionMemorySnapshots({ groupIds: [groupId] });
    const checks = {
      contextMentionsSessionMemory: context.includes("CC 风格 Session Memory")
        && context.includes("summary.md"),
      memoryCarriesSessionSnapshot: memory.sessionMemory?.schema === "ccm-group-session-memory-snapshot-v1"
        && memory.sessionMemory?.summaryFile === summaryFile,
      sidecarFilesExist: fs.existsSync(snapshotFile)
        && fs.existsSync(summaryFile),
      markdownPreservesSentinel: markdown.includes("GROUP_SESSION_MEMORY_SENTINEL")
        && markdown.includes("CCM Group Session Memory"),
      checksumMatches: snapshot.markdownChecksumMatches === true
        && snapshot.markdownExists === true,
      childAgentContextSeesSessionMemory: childRendered.includes("CC 风格 Session Memory")
        && childRendered.includes("GROUP_SESSION_MEMORY_SENTINEL"),
      globalAgentContextSeesSessionMemory: globalRendered.includes("CC 风格 Session Memory")
        && globalRendered.includes("GROUP_SESSION_MEMORY_SENTINEL"),
      qualityCheckCoversSnapshot: report.overall?.status === "ok"
        && check.id === "group_session_memory_snapshot"
        && Number(check.passed || 0) === 1,
    };
    return { pass: Object.values(checks).every(Boolean), checks, snapshot };
  } finally {
    for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, reloadFile, `${reloadFile}.bak`]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
    for (const dir of [path.dirname(snapshotFile), typedDir]) {
      try { if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
  }
}

export function runMemoryCenterGroupToolContinuitySnapshotSelfTest() {
  const groupId = `memory-center-tool-continuity-selftest-${process.pid}-${Date.now()}`;
  const groupFile = path.join(GROUP_MEMORY_DIR, `${groupId}.json`);
  const messageFile = path.join(GROUP_MESSAGES_DIR, `${groupId}.json`);
  const snapshotFile = getGroupToolContinuitySnapshotFile(groupId);
  const summaryFile = getGroupToolContinuityMarkdownFile(groupId);
  const sessionDir = path.join(GROUP_SESSION_MEMORY_DIR, sidecarFileId(groupId));
  const toolDir = path.dirname(snapshotFile);
  const reloadFile = path.join(CCM_DIR, "group-memory-reload", `${cleanId(groupId)}.json`);
  const typedDir = path.join(CCM_DIR, "group-memory-md", sidecarFileId(groupId));
  try {
    const {
      saveGroupMemory,
      loadGroupMemory,
      buildAgentMemoryContextBundle,
      renderGroupMemoryContextBundle,
      buildGlobalGroupMemoryContext,
      renderGlobalGroupMemoryContextBundle,
      readGroupToolContinuitySnapshotSummary,
    } = require("../collaboration/memory");
    const memory = saveGroupMemory(groupId, {
      groupId,
      goal: "验证工具/技能连续性快照能像 Claude Code 一样跨压缩保留 discovered tools 与 invoked skills",
      currentPhase: "tool-continuity-selftest",
      messageDigest: "TOOL_CONTINUITY_SENTINEL：payments/createInvoice 和 release-notes Skill 必须作为上下文传给新的子 Agent 会话。",
      tools: { mcp: ["payments/createInvoice"], skill: ["release-notes"] },
      workerLedger: [{
        time: "2026-07-07T12:00:00.000Z",
        taskId: "tool-continuity-task",
        project: "api",
        status: "completed",
        summary: "已使用 payments/createInvoice 并调用 release-notes Skill。",
        runtimeToolSnapshot: {
          snapshotId: "tool-continuity-snapshot",
          snapshotPath: "C:/tmp/tool-continuity-snapshot.json",
          mcpConfigPath: "C:/tmp/mcp.json",
          allowedTools: { mcp: ["payments/createInvoice"], skill: ["release-notes"] },
          dispatchGate: { dispatch_gate_id: "tool-continuity-gate", dispatchReady: true, blockers: [] },
        },
        runtimeToolSync: {
          runtime: "claude-code",
          mode: "ready",
          requested: { mcp: ["payments/createInvoice"], skill: ["release-notes"] },
          synced: { mcp: ["payments/createInvoice"], skill: ["release-notes"] },
          missing: { mcp: ["payments/refund"], skill: ["legacy-skill"] },
          mcp_statuses: [{ name: "payments", state: "connected", availableTools: ["createInvoice"] }],
          skill_statuses: [{ name: "release-notes", state: "available", contentHash: "abc123" }],
          permission_rules: [{ rule: "allow", value: "payments/createInvoice" }],
          invoked_skills: [{ name: "release-notes", contentHash: "abc123" }],
          dispatch_gate: { dispatch_gate_id: "tool-continuity-gate", dispatchReady: true, blockers: [] },
          timestamp: "2026-07-07T12:00:00.000Z",
        },
        invokedSkills: [{ name: "release-notes", contentHash: "abc123" }],
      }],
    });
    const snapshot = readGroupToolContinuitySnapshotSummary(groupId);
    const markdown = fs.readFileSync(summaryFile, "utf-8");
    const childBundle = buildAgentMemoryContextBundle(groupId, "api", "继续处理 TOOL_CONTINUITY_SENTINEL，需要发票工具和 release notes 技能");
    const childRendered = renderGroupMemoryContextBundle(childBundle);
    const globalBundle = buildGlobalGroupMemoryContext("TOOL_CONTINUITY_SENTINEL", {
      groups: [{ id: groupId, name: "Tool Continuity Selftest", members: [{ project: "api", agent: "claude-code" }] }],
      disableLedger: true,
      maxGroups: 1,
    });
    const globalRendered = renderGlobalGroupMemoryContextBundle(globalBundle);
    const report = buildGroupToolContinuitySnapshotReport({ groupIds: [groupId] });
    const check = evaluateGroupToolContinuitySnapshots({ groupIds: [groupId] });
    const detail: any = getMemoryCenterScope("group", groupId);
    const continuity = detail.postCompactUsage?.toolContinuity || {};
    const checks = {
      memoryCarriesToolContinuitySnapshot: memory.toolContinuity?.schema === "ccm-group-tool-continuity-snapshot-v1"
        && memory.toolContinuity?.summaryFile === summaryFile,
      sidecarFilesExist: fs.existsSync(snapshotFile)
        && fs.existsSync(summaryFile),
      snapshotPreservesAllowedTools: (snapshot.allowedTools?.mcp || []).includes("payments/createInvoice")
        && (snapshot.allowedTools?.skill || []).includes("release-notes"),
      snapshotPreservesRuntimeEvidence: (snapshot.synced?.mcp || []).includes("payments/createInvoice")
        && (snapshot.missing?.mcp || []).includes("payments/refund")
        && (snapshot.invokedSkills || []).some((item: any) => item.name === "release-notes" && item.contentHash === "abc123"),
      markdownStatesContextOnlyPolicy: markdown.includes("never bypasses CCM runtime authorization")
        && markdown.includes("TOOL_CONTINUITY") === false
        && snapshot.shouldBypassAuthorization === false
        && snapshot.shouldReuseAsContext === true,
      childAgentContextSeesToolContinuity: childRendered.includes("CC 风格工具/技能连续性")
        && childRendered.includes("payments/createInvoice")
        && childRendered.includes("release-notes")
        && childRendered.includes("不扩大授权"),
      globalAgentContextSeesToolContinuity: globalRendered.includes("CC 风格工具/技能连续性")
        && globalRendered.includes("不扩大授权"),
      memoryCenterExposesToolContinuity: continuity.schema === "ccm-group-tool-continuity-snapshot-v1"
        && (continuity.allowedTools?.mcp || []).includes("payments/createInvoice"),
      qualityCheckCoversToolContinuity: report.overall?.status === "ok"
        && check.id === "group_tool_continuity_snapshot"
        && Number(check.passed || 0) === 1,
    };
    return { pass: Object.values(checks).every(Boolean), checks, snapshot };
  } finally {
    for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, reloadFile, `${reloadFile}.bak`]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
    for (const dir of [sessionDir, toolDir, typedDir]) {
      try { if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
  }
}

export function runMemoryCenterCompactFileReferenceSelfTest() {
  const groupId = `memory-center-compact-file-reference-selftest-${process.pid}-${Date.now()}`;
  const groupFile = path.join(GROUP_MEMORY_DIR, `${groupId}.json`);
  const messageFile = path.join(GROUP_MESSAGES_DIR, `${groupId}.json`);
  const ledgerFile = getGroupCompactFileReferenceLedgerFile(groupId);
  const reloadFile = path.join(CCM_DIR, "group-memory-reload", `${cleanId(groupId)}.json`);
  const typedDir = path.join(CCM_DIR, "group-memory-md", sidecarFileId(groupId));
  const sessionDir = path.join(GROUP_SESSION_MEMORY_DIR, sidecarFileId(groupId));
  const toolDir = path.join(GROUP_TOOL_CONTINUITY_DIR, sidecarFileId(groupId));
  try {
    const { saveGroupMessages } = require("../collaboration/storage");
    const {
      saveGroupMemory,
      buildAgentMemoryContextBundle,
      renderGroupMemoryContextBundle,
      buildGlobalGroupMemoryContext,
      renderGlobalGroupMemoryContextBundle,
      buildGroupCompactFileReferences,
      summarizeGroupCompactFileReferenceAccess,
    } = require("../collaboration/memory");
    saveGroupMessages(groupId, [
      { id: "cfr-1", role: "user", target: "coordinator", timestamp: "2026-07-07T13:00:00.000Z", content: "必须保留 COMPACT_FILE_REFERENCE_SENTINEL，并让子 Agent 能按 raw messages 和 summary.md 回溯。" },
      { id: "cfr-2", role: "assistant", agent: "api", timestamp: "2026-07-07T13:01:00.000Z", content: "api 处理 src/compact-file-reference.ts，验证 npm run check passed。" },
    ]);
    saveGroupMemory(groupId, {
      groupId,
      goal: "验证 compact file references 能作为压缩后记忆文件引用恢复",
      messageDigest: "COMPACT_FILE_REFERENCE_SENTINEL：raw messages 和 Session Memory summary.md 是压缩后回溯来源。",
      persistentRequirements: [{ messageId: "cfr-1", text: "必须保留 COMPACT_FILE_REFERENCE_SENTINEL。" }],
      compaction: {
        version: 1,
        compactedMessageCount: 2,
        preservedRecentMessages: 1,
        summaryChecksum: "compact-file-reference-summary",
        lastCompactedMessageId: "cfr-2",
      },
    });
    const childBundle = buildAgentMemoryContextBundle(groupId, "api", "继续 COMPACT_FILE_REFERENCE_SENTINEL src/compact-file-reference.ts", {
      disableLedger: true,
      minKeepTokens: 1,
    });
    const rendered = renderGroupMemoryContextBundle(childBundle);
    const refs = childBundle.compact_file_references || buildGroupCompactFileReferences(groupId, childBundle);
    const access = summarizeGroupCompactFileReferenceAccess(groupId, refs, {
      groupId,
      workerLedger: [{
        project: "api",
        taskId: "compact-file-reference-task",
        summary: `已读取 ${refs.references?.[0]?.reference_id || "compact-file-reference"} 并核对 raw messages。`,
        memoryUsed: [refs.references?.[0]?.reference_id || ""],
      }],
    });
    const detail: any = getMemoryCenterScope("group", groupId);
    const report = buildCompactFileReferenceReport({ groupIds: [groupId] });
    const check = evaluateCompactFileReferences({ groupIds: [groupId] });
    const globalBundle = buildGlobalGroupMemoryContext("COMPACT_FILE_REFERENCE_SENTINEL", {
      groups: [{ id: groupId, name: "Compact File Reference Selftest", members: [{ project: "api", agent: "claude-code" }] }],
      disableLedger: true,
      maxGroups: 1,
    });
    const globalRendered = renderGlobalGroupMemoryContextBundle(globalBundle);
    const detailRefs = detail.postCompactUsage?.compactFileReferences || {};
    const checks = {
      childBundleBuildsReferences: refs.schema === "ccm-group-compact-file-references-v1"
        && Number(refs.referenceCount || 0) >= 3
        && (refs.references || []).some((item: any) => item.type === "raw_group_messages_json")
        && (refs.references || []).some((item: any) => item.type === "group_session_memory"),
      childRenderedMentionsReferences: rendered.includes("CC 风格 compact file references")
        && rendered.includes("reference_id=")
        && rendered.includes("raw_group_messages_json"),
      surfacingLedgerPersisted: fs.existsSync(ledgerFile)
        && JSON.stringify(readJson(ledgerFile, {})).includes("compact-file"),
      accessSummaryDetectsReferenceUse: access.schema === "ccm-group-compact-file-reference-access-summary-v1"
        && Number(access.mentioned_count || 0) >= 1,
      memoryCenterExposesReferences: detailRefs.schema === "ccm-group-compact-file-references-v1"
        && Number(detailRefs.referenceCount || 0) >= 3,
      globalAgentSeesReferences: globalRendered.includes("compact file references")
        && globalRendered.includes("raw messages"),
      qualityCheckCoversReferences: report.overall?.status === "ok"
        && check.id === "compact_file_references"
        && Number(check.passed || 0) === 1,
    };
    return { pass: Object.values(checks).every(Boolean), checks, refs: { referenceCount: refs.referenceCount, missingCount: refs.missingCount } };
  } finally {
    for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, ledgerFile, reloadFile, `${reloadFile}.bak`]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
    for (const dir of [typedDir, sessionDir, toolDir]) {
      try { if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
  }
}

export function runMemoryCenterCompactFileReferenceReadPlanSelfTest() {
  const groupId = `memory-center-compact-file-reference-read-plan-selftest-${process.pid}-${Date.now()}`;
  const groupFile = path.join(GROUP_MEMORY_DIR, `${groupId}.json`);
  const messageFile = path.join(GROUP_MESSAGES_DIR, `${groupId}.json`);
  const ledgerFile = getGroupCompactFileReferenceLedgerFile(groupId);
  const reloadFile = path.join(CCM_DIR, "group-memory-reload", `${cleanId(groupId)}.json`);
  const typedDir = path.join(CCM_DIR, "group-memory-md", sidecarFileId(groupId));
  const sessionDir = path.join(GROUP_SESSION_MEMORY_DIR, sidecarFileId(groupId));
  const toolDir = path.join(GROUP_TOOL_CONTINUITY_DIR, sidecarFileId(groupId));
  try {
    const { saveGroupMessages } = require("../collaboration/storage");
    const {
      saveGroupMemory,
      buildAgentMemoryContextBundle,
      renderGroupMemoryContextBundle,
      buildGlobalGroupMemoryContext,
      renderGlobalGroupMemoryContextBundle,
      buildGroupCompactFileReferenceReadPlan,
    } = require("../collaboration/memory");
    saveGroupMessages(groupId, [
      { id: "cfrp-mc-1", role: "user", target: "coordinator", timestamp: "2026-07-07T15:30:00.000Z", content: "MEMORY_CENTER_READ_PLAN_SENTINEL：Memory Center 要展示 compact file reference read plan。" },
      { id: "cfrp-mc-2", role: "assistant", agent: "api", timestamp: "2026-07-07T15:31:00.000Z", content: "api 需要按 read_plan_id 声明读取或忽略。" },
    ]);
    saveGroupMemory(groupId, {
      groupId,
      goal: "验证 Memory Center 暴露 compact file reference read plan",
      messageDigest: "MEMORY_CENTER_READ_PLAN_SENTINEL：read plan 应进入子 Agent 记忆包、全局上下文和质量报告。",
      persistentRequirements: [{ messageId: "cfrp-mc-1", text: "Memory Center 必须展示 compact file reference read plan。" }],
      compaction: {
        version: 1,
        compactedMessageCount: 2,
        preservedRecentMessages: 1,
        summaryChecksum: "memory-center-compact-reference-read-plan",
        lastCompactedMessageId: "cfrp-mc-2",
      },
    });
    const childBundle = buildAgentMemoryContextBundle(groupId, "api", "继续 MEMORY_CENTER_READ_PLAN_SENTINEL src/read-plan.ts");
    const rendered = renderGroupMemoryContextBundle(childBundle);
    const refs = childBundle.compact_file_references || {};
    const readPlan = childBundle.compact_file_reference_read_plan || buildGroupCompactFileReferenceReadPlan(groupId, refs);
    const detail: any = getMemoryCenterScope("group", groupId);
    const detailReadPlan = detail.postCompactUsage?.compactFileReferenceReadPlan || {};
    const report = buildCompactFileReferenceReadPlanReport({ groupIds: [groupId] });
    const check = evaluateCompactFileReferenceReadPlan({ groupIds: [groupId] });
    const globalBundle = buildGlobalGroupMemoryContext("MEMORY_CENTER_READ_PLAN_SENTINEL", {
      groups: [{ id: groupId, name: "Compact Read Plan Selftest", members: [{ project: "api", agent: "claude-code" }] }],
      disableLedger: true,
      maxGroups: 1,
    });
    const globalRendered = renderGlobalGroupMemoryContextBundle(globalBundle);
    const entries = Array.isArray(readPlan.entries) ? readPlan.entries : [];
    const checks = {
      childBundleBuildsReadPlan: readPlan.schema === "ccm-group-compact-file-reference-read-plan-v1"
        && Number(readPlan.plannedCount || 0) >= 3
        && entries.some((entry: any) => entry.type === "raw_group_messages_json")
        && entries.some((entry: any) => entry.type === "group_session_memory"),
      childRenderedMentionsReadPlan: rendered.includes("compact file reference read plan")
        && rendered.includes("read_plan_id=")
        && rendered.includes("memoryUsed/memoryIgnored"),
      memoryCenterExposesReadPlan: detailReadPlan.schema === "ccm-group-compact-file-reference-read-plan-v1"
        && Number(detailReadPlan.plannedCount || 0) >= 3,
      globalAgentSeesReadPlan: globalRendered.includes("compact file reference read plan")
        && globalRendered.includes("sourceOfTruth=true"),
      qualityCheckCoversReadPlan: report.overall?.status === "ok"
        && check.id === "compact_file_reference_read_plan"
        && Number(check.passed || 0) === 1,
      readPlanKeepsOnDemandPolicy: readPlan.policy?.doNotReadAll === true
        && readPlan.policy?.mode === "read_on_demand_after_compact",
    };
    return { pass: Object.values(checks).every(Boolean), checks, readPlan: { plannedCount: readPlan.plannedCount, hasSourceOfTruth: readPlan.hasSourceOfTruth, hasCompactSummary: readPlan.hasCompactSummary } };
  } finally {
    for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, ledgerFile, reloadFile, `${reloadFile}.bak`]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
    for (const dir of [typedDir, sessionDir, toolDir]) {
      try { if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
  }
}

export function runMemoryCenterCompactFileReferenceReadPlanUsageDisciplineSelfTest() {
  const groupId = `memory-center-compact-file-reference-read-plan-discipline-selftest-${process.pid}-${Date.now()}`;
  const groupFile = path.join(GROUP_MEMORY_DIR, `${groupId}.json`);
  const messageFile = path.join(GROUP_MESSAGES_DIR, `${groupId}.json`);
  const ledgerFile = getGroupCompactFileReferenceLedgerFile(groupId);
  const reloadFile = path.join(CCM_DIR, "group-memory-reload", `${cleanId(groupId)}.json`);
  const typedDir = path.join(CCM_DIR, "group-memory-md", sidecarFileId(groupId));
  const sessionDir = path.join(GROUP_SESSION_MEMORY_DIR, sidecarFileId(groupId));
  const toolDir = path.join(GROUP_TOOL_CONTINUITY_DIR, sidecarFileId(groupId));
  try {
    const { saveGroupMessages } = require("../collaboration/storage");
    const {
      saveGroupMemory,
      buildAgentMemoryContextBundle,
      summarizeGroupCompactFileReferenceReadPlanAccess,
    } = require("../collaboration/memory");
    saveGroupMessages(groupId, [
      { id: "cfrpd-1", role: "user", target: "coordinator", timestamp: "2026-07-07T16:00:00.000Z", content: "READ_PLAN_DISCIPLINE_SENTINEL：子 Agent 回执必须声明 read_plan_id。" },
      { id: "cfrpd-2", role: "assistant", agent: "api", timestamp: "2026-07-07T16:01:00.000Z", content: "api 将按 read_plan_id 记录读取计划使用。" },
    ]);
    saveGroupMemory(groupId, {
      groupId,
      goal: "验证 compact read plan 下发后的 read_plan_id 回执纪律",
      messageDigest: "READ_PLAN_DISCIPLINE_SENTINEL：read plan 使用应可被 Memory Center 审计。",
      persistentRequirements: [{ messageId: "cfrpd-1", text: "子 Agent 回执必须声明 read_plan_id。" }],
      compaction: {
        version: 1,
        compactedMessageCount: 2,
        preservedRecentMessages: 1,
        summaryChecksum: "compact-read-plan-discipline-summary",
        lastCompactedMessageId: "cfrpd-2",
      },
    });
    const childBundle = buildAgentMemoryContextBundle(groupId, "api", "继续 READ_PLAN_DISCIPLINE_SENTINEL src/read-plan-discipline.ts");
    const readPlan = childBundle.compact_file_reference_read_plan || {};
    const entries = Array.isArray(readPlan.entries) ? readPlan.entries : [];
    const usedEntry = entries.find((entry: any) => entry.type === "raw_group_messages_json") || entries[0] || {};
    const unmentionedEntry = entries.find((entry: any) => entry.read_plan_id && entry.read_plan_id !== usedEntry.read_plan_id) || {};
    const memory = saveGroupMemory(groupId, {
      groupId,
      goal: "验证 compact read plan 下发后的 read_plan_id 回执纪律",
      messageDigest: "READ_PLAN_DISCIPLINE_SENTINEL：read plan 使用应可被 Memory Center 审计。",
      persistentRequirements: [{ messageId: "cfrpd-1", text: "子 Agent 回执必须声明 read_plan_id。" }],
      compaction: {
        version: 1,
        compactedMessageCount: 2,
        preservedRecentMessages: 1,
        summaryChecksum: "compact-read-plan-discipline-summary",
        lastCompactedMessageId: "cfrpd-2",
      },
      workerLedger: [{
        time: "2026-07-07T16:02:00.000Z",
        taskId: "compact-read-plan-discipline-task",
        project: "api",
        status: "completed",
        summary: `已按读取计划 ${usedEntry.read_plan_id || "cfr-read"} 核对原始来源。`,
        memoryUsed: [`read_plan_id=${usedEntry.read_plan_id || ""}；reference_id=${usedEntry.reference_id || ""}；action=${usedEntry.action || ""}`],
        memoryIgnored: [],
      }],
    });
    const access = summarizeGroupCompactFileReferenceReadPlanAccess(groupId, readPlan, memory);
    const report = buildCompactFileReferenceReadPlanUsageDisciplineReport({ groupIds: [groupId] });
    const group = report.groups?.[0] || {};
    const check = evaluateCompactFileReferenceReadPlanUsageDiscipline({ groupIds: [groupId] });
    const detail: any = getMemoryCenterScope("group", groupId);
    const detailDiscipline = detail.postCompactUsage?.compactFileReferenceReadPlanDiscipline || {};
    const detailAccess = detail.postCompactUsage?.compactFileReferenceReadPlanAccess || {};
    const checks = {
      childBundleSurfacesReadPlan: readPlan.schema === "ccm-group-compact-file-reference-read-plan-v1"
        && Number(readPlan.plannedCount || 0) >= 3
        && !!usedEntry.read_plan_id
        && !!unmentionedEntry.read_plan_id,
      surfacingLedgerStoresReadPlan: fs.existsSync(ledgerFile)
        && JSON.stringify(readJson(ledgerFile, {})).includes("read_plan_entries"),
      accessSummaryFindsReadPlanId: access.schema === "ccm-group-compact-file-reference-read-plan-access-summary-v1"
        && (access.rows || []).some((row: any) => row.read_plan_id === usedEntry.read_plan_id && row.read_plan_id_mentioned === true),
      disciplineReportChecksSurfacedPlans: report.schema === "ccm-compact-file-reference-read-plan-usage-discipline-report-v1"
        && Number(group.checked || 0) >= 3
        && Number(group.passed || 0) >= 1,
      unmentionedPlansBecomeGaps: (group.gaps || []).some((gap: any) => gap.read_plan_id === unmentionedEntry.read_plan_id)
        && Number(group.missing || 0) >= 1,
      qualityCheckCoversReadPlanDiscipline: check.id === "compact_file_reference_read_plan_usage_discipline"
        && Number(check.checked || 0) === Number(group.checked || 0)
        && Number(check.passed || 0) === Number(group.passed || 0),
      memoryCenterDetailExposesReadPlanDiscipline: detailDiscipline.schema === "ccm-compact-file-reference-read-plan-usage-discipline-group-v1"
        && Number(detailDiscipline.checked || 0) === Number(group.checked || 0)
        && detailAccess.schema === "ccm-group-compact-file-reference-read-plan-access-summary-v1",
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      discipline: {
        checked: group.checked,
        passed: group.passed,
        missing: group.missing,
        status: group.status,
        usedReadPlan: usedEntry.read_plan_id,
        unmentionedReadPlan: unmentionedEntry.read_plan_id,
      },
    };
  } finally {
    for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, ledgerFile, reloadFile, `${reloadFile}.bak`]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
    for (const dir of [typedDir, sessionDir, toolDir]) {
      try { if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
  }
}

export function runMemoryCenterCompactFileReferenceReadPlanFreshnessSelfTest() {
  const groupId = `memory-center-compact-file-reference-read-plan-freshness-selftest-${process.pid}-${Date.now()}`;
  const groupFile = path.join(GROUP_MEMORY_DIR, `${groupId}.json`);
  const messageFile = path.join(GROUP_MESSAGES_DIR, `${groupId}.json`);
  const ledgerFile = getGroupCompactFileReferenceLedgerFile(groupId);
  const reloadFile = path.join(CCM_DIR, "group-memory-reload", `${cleanId(groupId)}.json`);
  const typedDir = path.join(CCM_DIR, "group-memory-md", sidecarFileId(groupId));
  const sessionDir = path.join(GROUP_SESSION_MEMORY_DIR, sidecarFileId(groupId));
  const toolDir = path.join(GROUP_TOOL_CONTINUITY_DIR, sidecarFileId(groupId));
  try {
    const { saveGroupMessages } = require("../collaboration/storage");
    const {
      saveGroupMemory,
      buildAgentMemoryContextBundle,
      summarizeGroupCompactFileReferenceReadPlanFreshness,
    } = require("../collaboration/memory");
    const initialMessages = [
      { id: "cfrpf-1", role: "user", target: "coordinator", timestamp: "2026-07-07T16:30:00.000Z", content: "READ_PLAN_FRESHNESS_SENTINEL：read plan 下发后必须能发现 raw messages 是否变化。" },
      { id: "cfrpf-2", role: "assistant", agent: "api", timestamp: "2026-07-07T16:31:00.000Z", content: "api 将使用 raw messages 作为 source-of-truth。" },
    ];
    saveGroupMessages(groupId, initialMessages);
    saveGroupMemory(groupId, {
      groupId,
      goal: "验证 compact read plan 源文件新鲜度",
      messageDigest: "READ_PLAN_FRESHNESS_SENTINEL：Memory Center 应检测历史 read plan 指向的源是否变化。",
      persistentRequirements: [{ messageId: "cfrpf-1", text: "read plan source freshness 必须可审计。" }],
      compaction: {
        version: 1,
        compactedMessageCount: 2,
        preservedRecentMessages: 1,
        summaryChecksum: "compact-read-plan-freshness-summary",
        lastCompactedMessageId: "cfrpf-2",
      },
    });
    const childBundle = buildAgentMemoryContextBundle(groupId, "api", "继续 READ_PLAN_FRESHNESS_SENTINEL src/read-plan-freshness.ts");
    const readPlan = childBundle.compact_file_reference_read_plan || {};
    const rawEntry = (readPlan.entries || []).find((entry: any) => entry.type === "raw_group_messages_json") || {};
    fs.writeFileSync(messageFile, JSON.stringify([
      ...initialMessages,
      { id: "cfrpf-3", role: "assistant", agent: "api", timestamp: "2026-07-07T16:32:00.000Z", content: "raw messages changed after read plan surfacing。" },
    ], null, 2), "utf-8");
    const directFreshness = summarizeGroupCompactFileReferenceReadPlanFreshness(groupId, {
      ...readPlan,
      entries: [rawEntry],
      plannedCount: 1,
      sourceReferenceCount: 1,
    });
    const report = buildCompactFileReferenceReadPlanFreshnessReport({ groupIds: [groupId] });
    const group = report.groups?.[0] || {};
    const check = evaluateCompactFileReferenceReadPlanFreshness({ groupIds: [groupId] });
    const detail: any = getMemoryCenterScope("group", groupId);
    const detailFreshness = detail.postCompactUsage?.compactFileReferenceReadPlanFreshness || {};
    const checks = {
      childBundleSurfacesFingerprintedReadPlan: readPlan.schema === "ccm-group-compact-file-reference-read-plan-v1"
        && !!rawEntry.read_plan_id
        && !!rawEntry.sourceChecksum
        && Number(rawEntry.sourceMtimeMs || 0) > 0,
      surfacingLedgerStoresSourceFingerprint: fs.existsSync(ledgerFile)
        && JSON.stringify(readJson(ledgerFile, {})).includes("sourceChecksum"),
      directFreshnessDetectsChangedRawMessages: directFreshness.schema === "ccm-group-compact-file-reference-read-plan-freshness-v1"
        && Number(directFreshness.changedCount || 0) >= 1
        && (directFreshness.staleRows || []).some((row: any) => row.read_plan_id === rawEntry.read_plan_id),
      memoryCenterReportUsesSurfacedSnapshot: report.schema === "ccm-compact-file-reference-read-plan-freshness-report-v1"
        && Number(group.changedCount || 0) >= 1
        && group.status === "fail",
      qualityCheckCoversFreshness: check.id === "compact_file_reference_read_plan_freshness"
        && check.status === "fail",
      memoryCenterDetailExposesFreshness: detailFreshness.schema === "ccm-group-compact-file-reference-read-plan-freshness-v1"
        && Number(detailFreshness.changedCount || 0) >= 1,
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      freshness: {
        status: group.status,
        checked: group.checked,
        changedCount: group.changedCount,
        rawReadPlan: rawEntry.read_plan_id,
      },
    };
  } finally {
    for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, ledgerFile, reloadFile, `${reloadFile}.bak`]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
    for (const dir of [typedDir, sessionDir, toolDir]) {
      try { if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
  }
}

export function runMemoryCenterCompactFileReferenceReadPlanRevalidationGateSelfTest() {
  const groupId = `memory-center-compact-file-reference-read-plan-revalidation-selftest-${process.pid}-${Date.now()}`;
  const groupFile = path.join(GROUP_MEMORY_DIR, `${groupId}.json`);
  const messageFile = path.join(GROUP_MESSAGES_DIR, `${groupId}.json`);
  const ledgerFile = getGroupCompactFileReferenceLedgerFile(groupId);
  const reloadFile = path.join(CCM_DIR, "group-memory-reload", `${cleanId(groupId)}.json`);
  const typedDir = path.join(CCM_DIR, "group-memory-md", sidecarFileId(groupId));
  const sessionDir = path.join(GROUP_SESSION_MEMORY_DIR, sidecarFileId(groupId));
  const toolDir = path.join(GROUP_TOOL_CONTINUITY_DIR, sidecarFileId(groupId));
  try {
    const { saveGroupMessages } = require("../collaboration/storage");
    const {
      saveGroupMemory,
      buildAgentMemoryContextBundle,
      renderGroupMemoryContextBundle,
    } = require("../collaboration/memory");
    const initialMessages = [
      { id: "cfrpr-1", role: "user", target: "coordinator", timestamp: "2026-07-07T17:00:00.000Z", content: "READ_PLAN_REVALIDATION_SENTINEL：stale read plan 必须重读当前源。" },
      { id: "cfrpr-2", role: "assistant", agent: "api", timestamp: "2026-07-07T17:01:00.000Z", content: "api 将验证 current source 后再使用压缩记忆。" },
    ];
    saveGroupMessages(groupId, initialMessages);
    saveGroupMemory(groupId, {
      groupId,
      goal: "验证 compact read plan stale source revalidation gate",
      messageDigest: "READ_PLAN_REVALIDATION_SENTINEL：如果历史 read plan 源变化，下一次子 Agent bundle 必须要求 re-read/current source verified。",
      persistentRequirements: [{ messageId: "cfrpr-1", text: "stale read plan 必须重读当前源。" }],
      compaction: {
        version: 1,
        compactedMessageCount: 2,
        preservedRecentMessages: 1,
        summaryChecksum: "compact-read-plan-revalidation-summary",
        lastCompactedMessageId: "cfrpr-2",
      },
    });
    const sessionOptions = {
      taskId: "compact-read-plan-revalidation-task",
      traceId: "trace-compact-read-plan-revalidation",
      executionId: "exec-compact-read-plan-revalidation",
      taskAgentSessionId: "tas-compact-read-plan-revalidation",
      nativeSessionId: "native-compact-read-plan-revalidation",
      taskAgentSessionTurn: 2,
      agentType: "codex",
    };
    const firstBundle = buildAgentMemoryContextBundle(groupId, "api", "首次下发 READ_PLAN_REVALIDATION_SENTINEL src/revalidation.ts", sessionOptions);
    const firstReadPlan = firstBundle.compact_file_reference_read_plan || {};
    const rawEntry = (firstReadPlan.entries || []).find((entry: any) => entry.type === "raw_group_messages_json") || {};
    fs.writeFileSync(messageFile, JSON.stringify([
      ...initialMessages,
      { id: "cfrpr-3", role: "assistant", agent: "api", timestamp: "2026-07-07T17:02:00.000Z", content: "raw messages changed after first read plan surfacing。" },
    ], null, 2), "utf-8");
    const secondBundle = buildAgentMemoryContextBundle(groupId, "api", "再次下发 READ_PLAN_REVALIDATION_SENTINEL src/revalidation.ts", sessionOptions);
    const rendered = renderGroupMemoryContextBundle(secondBundle);
    const gate = secondBundle.compact_file_reference_read_plan_revalidation_gate || {};
    const failingReport = buildCompactFileReferenceReadPlanRevalidationGateReport({ groupIds: [groupId] });
    const failingGroup = failingReport.groups?.[0] || {};
    const requiredReadPlanIds = (gate.required_entries || []).map((entry: any) => entry.read_plan_id).filter(Boolean);
    saveGroupMemory(groupId, {
      groupId,
      goal: "验证 compact read plan stale source revalidation gate",
      messageDigest: "READ_PLAN_REVALIDATION_SENTINEL：如果历史 read plan 源变化，下一次子 Agent bundle 必须要求 re-read/current source verified。",
      persistentRequirements: [{ messageId: "cfrpr-1", text: "stale read plan 必须重读当前源。" }],
      compaction: {
        version: 1,
        compactedMessageCount: 2,
        preservedRecentMessages: 1,
        summaryChecksum: "compact-read-plan-revalidation-summary",
        lastCompactedMessageId: "cfrpr-2",
      },
      workerLedger: [{
        time: "2026-07-07T17:02:30.000Z",
        taskId: "compact-read-plan-revalidation-task",
        project: "api",
        status: "completed",
        taskAgentSessionId: "tas-wrong-compact-read-plan-revalidation",
        nativeSessionId: "native-compact-read-plan-revalidation",
        traceId: "trace-compact-read-plan-revalidation",
        executionId: "exec-compact-read-plan-revalidation",
        agentType: "codex",
        summary: `错误会话声称已按 ${gate.revalidation_gate_id || "cfr-rvg"} 重新读取当前源并验证 ${requiredReadPlanIds.join("、") || rawEntry.read_plan_id || "cfr-read"}。`,
        memoryUsed: (requiredReadPlanIds.length ? requiredReadPlanIds : [rawEntry.read_plan_id]).filter(Boolean).map((id: string) => `gate=${gate.revalidation_gate_id || ""}；read_plan_id=${id}；re-read current source verified；path=${rawEntry.path || ""}`),
        memoryIgnored: [],
      }],
    });
    const wrongSessionReport = buildCompactFileReferenceReadPlanRevalidationGateReport({ groupIds: [groupId] });
    const wrongSessionGroup = wrongSessionReport.groups?.[0] || {};
    const memoryWithReceipt = saveGroupMemory(groupId, {
      groupId,
      goal: "验证 compact read plan stale source revalidation gate",
      messageDigest: "READ_PLAN_REVALIDATION_SENTINEL：如果历史 read plan 源变化，下一次子 Agent bundle 必须要求 re-read/current source verified。",
      persistentRequirements: [{ messageId: "cfrpr-1", text: "stale read plan 必须重读当前源。" }],
      compaction: {
        version: 1,
        compactedMessageCount: 2,
        preservedRecentMessages: 1,
        summaryChecksum: "compact-read-plan-revalidation-summary",
        lastCompactedMessageId: "cfrpr-2",
      },
      workerLedger: [{
        time: "2026-07-07T17:03:00.000Z",
        taskId: "compact-read-plan-revalidation-task",
        project: "api",
        status: "completed",
        taskAgentSessionId: "tas-compact-read-plan-revalidation",
        nativeSessionId: "native-compact-read-plan-revalidation",
        traceId: "trace-compact-read-plan-revalidation",
        executionId: "exec-compact-read-plan-revalidation",
        agentType: "codex",
        summary: `已按 ${gate.revalidation_gate_id || "cfr-rvg"} 重新读取当前源并验证 ${requiredReadPlanIds.join("、") || rawEntry.read_plan_id || "cfr-read"}。`,
        memoryUsed: (requiredReadPlanIds.length ? requiredReadPlanIds : [rawEntry.read_plan_id]).filter(Boolean).map((id: string) => `gate=${gate.revalidation_gate_id || ""}；read_plan_id=${id}；re-read current source verified；path=${rawEntry.path || ""}`),
        memoryIgnored: [],
      }],
    });
    const passingReport = buildCompactFileReferenceReadPlanRevalidationGateReport({ groupIds: [groupId] });
    const passingGroup = passingReport.groups?.[0] || {};
    const check = evaluateCompactFileReferenceReadPlanRevalidationGate({ groupIds: [groupId] });
    const sessionCheck = evaluateCompactFileReferenceReadPlanRevalidationSessionBinding({ groupIds: [groupId] });
    const detail: any = getMemoryCenterScope("group", groupId);
    const detailGate = detail.postCompactUsage?.compactFileReferenceReadPlanRevalidationGate || {};
    const detailDiscipline = detail.postCompactUsage?.compactFileReferenceReadPlanRevalidationDiscipline || {};
    const detailSessionBinding = detail.postCompactUsage?.compactFileReferenceReadPlanRevalidationSessionBinding || {};
    const checks = {
      firstBundleSurfacesReadPlan: firstReadPlan.schema === "ccm-group-compact-file-reference-read-plan-v1"
        && !!rawEntry.read_plan_id
        && !!rawEntry.sourceChecksum,
      secondBundleRequiresRevalidation: gate.schema === "ccm-group-compact-file-reference-read-plan-revalidation-gate-v1"
        && gate.status === "required"
        && (gate.required_entries || []).some((entry: any) => entry.read_plan_id === rawEntry.read_plan_id),
      secondBundleCarriesSessionBinding: gate.session_binding?.task_agent_session_id === "tas-compact-read-plan-revalidation"
        && gate.session_binding?.native_session_id === "native-compact-read-plan-revalidation",
      childPromptPromotesMustReRead: rendered.includes("compact read plan revalidation gate")
        && rendered.includes("must re-read")
        && rendered.includes(rawEntry.read_plan_id || "missing-read-plan"),
      surfacingLedgerStoresGate: fs.existsSync(ledgerFile)
        && JSON.stringify(readJson(ledgerFile, {})).includes("read_plan_revalidation_gate"),
      reportFailsBeforeReceipt: failingReport.schema === "ccm-compact-file-reference-read-plan-revalidation-gate-report-v1"
        && Number(failingGroup.checked || 0) >= 1
        && failingGroup.status === "fail",
      reportRejectsWrongSessionReceipt: wrongSessionGroup.status === "fail"
        && Number(wrongSessionGroup.sessionMismatch || 0) >= 1
        && wrongSessionGroup.gaps?.some((gap: any) => gap.session_mismatch === true),
      reportPassesAfterCurrentSourceReceipt: passingGroup.status === "ok"
        && Number(passingGroup.passed || 0) >= 1
        && (passingGroup.rows || []).some((row: any) => row.read_plan_id === rawEntry.read_plan_id && row.current_source_verified === true && row.session_matched === true),
      qualityCheckCoversRevalidationGate: check.id === "compact_file_reference_read_plan_revalidation_gate"
        && Number(check.passed || 0) === Number(passingGroup.passed || 0),
      qualityCheckCoversSessionBinding: sessionCheck.id === "compact_file_reference_read_plan_revalidation_session_binding"
        && Number(sessionCheck.passed || 0) >= 1
        && !(sessionCheck.gaps || []).some((gap: any) => gap.read_plan_id === rawEntry.read_plan_id),
      memoryCenterDetailExposesRevalidation: detailGate.schema === "ccm-group-compact-file-reference-read-plan-revalidation-gate-v1"
        && detailDiscipline.schema === "ccm-compact-file-reference-read-plan-revalidation-gate-group-v1",
      memoryCenterDetailExposesSessionBinding: detailSessionBinding.schema === "ccm-compact-file-reference-read-plan-revalidation-session-binding-group-v1"
        && detailSessionBinding.status === "ok"
        && Number(detailSessionBinding.passed || 0) >= 1,
      receiptSavedToMemory: Array.isArray(memoryWithReceipt.workerLedger)
        && memoryWithReceipt.workerLedger.some((row: any) => String(row.memoryUsed || "").includes(rawEntry.read_plan_id || "missing")),
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      revalidation: {
        gateId: gate.revalidation_gate_id,
        requiredCount: gate.required_count,
        failingStatus: failingGroup.status,
        wrongSessionStatus: wrongSessionGroup.status,
        passingStatus: passingGroup.status,
        readPlanId: rawEntry.read_plan_id,
      },
    };
  } finally {
    for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, ledgerFile, reloadFile, `${reloadFile}.bak`]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
    for (const dir of [typedDir, sessionDir, toolDir]) {
      try { if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
  }
}

export function runMemoryCenterCompactFileReferenceReadPlanRevalidationRepairWorkItemsSelfTest() {
  const groupId = `memory-center-compact-read-plan-revalidation-repair-selftest-${process.pid}-${Date.now()}`;
  const groupFile = path.join(GROUP_MEMORY_DIR, `${groupId}.json`);
  const messageFile = path.join(GROUP_MESSAGES_DIR, `${groupId}.json`);
  const ledgerFile = getGroupCompactFileReferenceLedgerFile(groupId);
  const workItemsFile = getGroupCompactBoundaryReplayRepairWorkItemsFile(groupId);
  const repairLedgerFile = getGroupCompactBoundaryReplayRepairLedgerFile(groupId);
  const reloadFile = path.join(CCM_DIR, "group-memory-reload", `${cleanId(groupId)}.json`);
  const typedDir = path.join(CCM_DIR, "group-memory-md", sidecarFileId(groupId));
  const sessionDir = path.join(GROUP_SESSION_MEMORY_DIR, sidecarFileId(groupId));
  const toolDir = path.join(GROUP_TOOL_CONTINUITY_DIR, sidecarFileId(groupId));
  try {
    const { saveGroupMessages } = require("../collaboration/storage");
    const {
      saveGroupMemory,
      buildAgentMemoryContextBundle,
      renderGroupMemoryContextBundle,
    } = require("../collaboration/memory");
    const sessionOptions = {
      taskId: "compact-read-plan-revalidation-repair-task",
      traceId: "trace-compact-read-plan-revalidation-repair",
      executionId: "exec-compact-read-plan-revalidation-repair",
      taskAgentSessionId: "tas-compact-read-plan-revalidation-repair",
      nativeSessionId: "native-compact-read-plan-revalidation-repair",
      taskAgentSessionTurn: 3,
      agentType: "claudecode",
    };
    const initialMessages = [
      { id: "cfrprw-1", role: "user", target: "coordinator", timestamp: "2026-07-07T18:00:00.000Z", content: "READ_PLAN_REVALIDATION_REPAIR_SENTINEL：错会话回执必须转成修复待办。" },
      { id: "cfrprw-2", role: "assistant", agent: "api", timestamp: "2026-07-07T18:01:00.000Z", content: "api 将在绑定会话中重读当前源。" },
    ];
    saveGroupMessages(groupId, initialMessages);
    saveGroupMemory(groupId, {
      groupId,
      goal: "验证 read plan revalidation repair work items",
      messageDigest: "READ_PLAN_REVALIDATION_REPAIR_SENTINEL：错会话回执需要进入 repair work item。",
      persistentRequirements: [{ messageId: "cfrprw-1", text: "错会话回执必须转成修复待办。" }],
      compaction: {
        version: 1,
        compactedMessageCount: 2,
        preservedRecentMessages: 1,
        summaryChecksum: "compact-read-plan-revalidation-repair-summary",
        lastCompactedMessageId: "cfrprw-2",
      },
    });
    const firstBundle = buildAgentMemoryContextBundle(groupId, "api", "首次下发 READ_PLAN_REVALIDATION_REPAIR_SENTINEL", sessionOptions);
    const firstReadPlan = firstBundle.compact_file_reference_read_plan || {};
    const rawEntry = (firstReadPlan.entries || []).find((entry: any) => entry.type === "raw_group_messages_json") || {};
    fs.writeFileSync(messageFile, JSON.stringify([
      ...initialMessages,
      { id: "cfrprw-3", role: "assistant", agent: "api", timestamp: "2026-07-07T18:02:00.000Z", content: "raw messages changed before repair work item。" },
    ], null, 2), "utf-8");
    const secondBundle = buildAgentMemoryContextBundle(groupId, "api", "再次下发 READ_PLAN_REVALIDATION_REPAIR_SENTINEL", sessionOptions);
    const gate = secondBundle.compact_file_reference_read_plan_revalidation_gate || {};
    const requiredReadPlanIds = (gate.required_entries || []).map((entry: any) => entry.read_plan_id).filter(Boolean);
    saveGroupMemory(groupId, {
      groupId,
      goal: "验证 read plan revalidation repair work items",
      messageDigest: "READ_PLAN_REVALIDATION_REPAIR_SENTINEL：错会话回执需要进入 repair work item。",
      persistentRequirements: [{ messageId: "cfrprw-1", text: "错会话回执必须转成修复待办。" }],
      compaction: {
        version: 1,
        compactedMessageCount: 2,
        preservedRecentMessages: 1,
        summaryChecksum: "compact-read-plan-revalidation-repair-summary",
        lastCompactedMessageId: "cfrprw-2",
      },
      workerLedger: [{
        time: "2026-07-07T18:03:00.000Z",
        taskId: "compact-read-plan-revalidation-repair-task",
        project: "api",
        status: "completed",
        taskAgentSessionId: "tas-wrong-compact-read-plan-revalidation-repair",
        nativeSessionId: "native-compact-read-plan-revalidation-repair",
        traceId: "trace-compact-read-plan-revalidation-repair",
        executionId: "exec-compact-read-plan-revalidation-repair",
        agentType: "claudecode",
        summary: `错误会话声称已按 ${gate.revalidation_gate_id || "cfr-rvg"} 重新读取当前源并验证 ${requiredReadPlanIds.join("、") || rawEntry.read_plan_id || "cfr-read"}。`,
        memoryUsed: (requiredReadPlanIds.length ? requiredReadPlanIds : [rawEntry.read_plan_id]).filter(Boolean).map((id: string) => `gate=${gate.revalidation_gate_id || ""}；read_plan_id=${id}；re-read current source verified；path=${rawEntry.path || ""}`),
        memoryIgnored: [],
      }],
    });
    const failingDetail: any = getMemoryCenterScope("group", groupId);
    const failingWorkItems = failingDetail.postCompactUsage?.readPlanRevalidationRepairWorkItems || failingDetail.postCompactUsage?.replayRepairWorkItems || {};
    const failingCandidates = failingDetail.postCompactUsage?.replayRepairDispatchCandidates || {};
    const repairReport = buildCompactFileReferenceReadPlanRevalidationRepairWorkItemReport({ groupIds: [groupId] });
    const repairCheck = evaluateCompactFileReferenceReadPlanRevalidationRepairWorkItems({ groupIds: [groupId] });
    const rendered = renderGroupMemoryContextBundle({
      schema: "ccm-group-memory-context-v1",
      target_project: "api",
      memory_policy: { use: "must_consider" },
      group_state: { goal: "repair work item selftest", currentPhase: "test" },
      compaction: {
        replayRepairWorkItems: failingWorkItems,
        replayRepairDispatchCandidates: failingCandidates,
      },
    });
    const expectedReadPlanIds = (requiredReadPlanIds.length ? requiredReadPlanIds : [rawEntry.read_plan_id])
      .map((id: any) => String(id || "").trim())
      .filter(Boolean);
    const matchesExpectedReadPlan = (value: any) => {
      const text = String(value || "");
      return expectedReadPlanIds.length
        ? expectedReadPlanIds.some(id => text.includes(id))
        : !!text.trim();
    };
    const repairItem = (failingWorkItems.openItems || failingWorkItems.items || []).find((item: any) => item.source === "compact_read_plan_revalidation_repair" || item.component === "compact_read_plan_revalidation") || {};
    const candidate = (failingCandidates.candidates || []).find((item: any) => item.source === "compact_read_plan_revalidation_repair" || item.component === "compact_read_plan_revalidation") || {};
    saveGroupMemory(groupId, {
      groupId,
      goal: "验证 read plan revalidation repair work items",
      messageDigest: "READ_PLAN_REVALIDATION_REPAIR_SENTINEL：错会话回执需要进入 repair work item。",
      persistentRequirements: [{ messageId: "cfrprw-1", text: "错会话回执必须转成修复待办。" }],
      compaction: {
        version: 1,
        compactedMessageCount: 2,
        preservedRecentMessages: 1,
        summaryChecksum: "compact-read-plan-revalidation-repair-summary",
        lastCompactedMessageId: "cfrprw-2",
      },
      workerLedger: [{
        time: "2026-07-07T18:04:00.000Z",
        taskId: "compact-read-plan-revalidation-repair-task",
        project: "api",
        status: "completed",
        taskAgentSessionId: "tas-compact-read-plan-revalidation-repair",
        nativeSessionId: "native-compact-read-plan-revalidation-repair",
        traceId: "trace-compact-read-plan-revalidation-repair",
        executionId: "exec-compact-read-plan-revalidation-repair",
        agentType: "claudecode",
        summary: `已按 ${gate.revalidation_gate_id || "cfr-rvg"} 重新读取当前源并验证 ${requiredReadPlanIds.join("、") || rawEntry.read_plan_id || "cfr-read"}。`,
        memoryUsed: (requiredReadPlanIds.length ? requiredReadPlanIds : [rawEntry.read_plan_id]).filter(Boolean).map((id: string) => `gate=${gate.revalidation_gate_id || ""}；read_plan_id=${id}；re-read current source verified；path=${rawEntry.path || ""}`),
        memoryIgnored: [],
      }],
    });
    const resolvedDetail: any = getMemoryCenterScope("group", groupId);
    const resolvedWorkItems = resolvedDetail.postCompactUsage?.readPlanRevalidationRepairWorkItems || resolvedDetail.postCompactUsage?.replayRepairWorkItems || {};
    const resolvedLedger = readGroupCompactBoundaryReplayRepairWorkItems(groupId);
    const resolvedReadPlanRepairItems = (Array.isArray(resolvedLedger.items) ? resolvedLedger.items : [])
      .filter((item: any) => item.source === "compact_read_plan_revalidation_repair" || item.component === "compact_read_plan_revalidation");
    const checks = {
      failingDetailCreatesRepairWorkItem: failingWorkItems.schema === "ccm-compact-boundary-replay-repair-work-items-summary-v1"
        && Number(failingWorkItems.openItemCount || 0) >= 1
        && repairItem.component === "compact_read_plan_revalidation"
        && repairItem.session_mismatch === true
        && matchesExpectedReadPlan(repairItem.read_plan_id || repairItem.repair_target),
      dispatchCandidateCreated: failingCandidates.schema === "ccm-replay-repair-main-agent-dispatch-candidates-v1"
        && Number(failingCandidates.candidateCount || 0) >= 1
        && candidate.component === "compact_read_plan_revalidation"
        && candidate.shouldCreateRealTask === false
        && matchesExpectedReadPlan(candidate.read_plan_id || candidate.repair_target || candidate.prompt_patch),
      repairQualityCheckCoversWorkItem: repairReport.overall?.status === "ok"
        && repairCheck.id === "compact_file_reference_read_plan_revalidation_repair_work_items"
        && Number(repairCheck.passed || 0) === 1,
      renderedContextCarriesRepairCandidate: rendered.includes("Replay Repair pending work")
        && rendered.includes("compact_read_plan_revalidation")
        && rendered.includes("Main Agent replay repair dispatch candidates"),
      correctSessionClosesRepairWorkItem: resolvedReadPlanRepairItems.length >= 1
        && !resolvedReadPlanRepairItems.some((item: any) => replayRepairWorkItemOpen(item.status))
        && resolvedReadPlanRepairItems.some((item: any) => item.component === "compact_read_plan_revalidation" && replayRepairWorkItemStatus(item.status) === "completed"),
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      repairItem,
      candidate,
      resolvedReadPlanRepairItems: resolvedReadPlanRepairItems.map((item: any) => ({
        id: item.id || item.work_item_id || "",
        status: replayRepairWorkItemStatus(item.status),
        component: item.component || "",
        source: item.source || "",
        read_plan_id: item.read_plan_id || "",
        revalidation_gate_id: item.revalidation_gate_id || "",
        session_mismatch: item.session_mismatch === true,
        resolutionReason: item.resolutionReason || item.resolution_reason || "",
      })),
    };
  } finally {
    for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, ledgerFile, workItemsFile, `${workItemsFile}.bak`, repairLedgerFile, `${repairLedgerFile}.bak`, reloadFile, `${reloadFile}.bak`]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
    for (const dir of [typedDir, sessionDir, toolDir]) {
      try { if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
  }
}

export function runMemoryCenterCompactFileReferenceUsageDisciplineSelfTest() {
  const groupId = `memory-center-compact-file-reference-discipline-selftest-${process.pid}-${Date.now()}`;
  const groupFile = path.join(GROUP_MEMORY_DIR, `${groupId}.json`);
  const messageFile = path.join(GROUP_MESSAGES_DIR, `${groupId}.json`);
  const ledgerFile = getGroupCompactFileReferenceLedgerFile(groupId);
  const reloadFile = path.join(CCM_DIR, "group-memory-reload", `${cleanId(groupId)}.json`);
  const typedDir = path.join(CCM_DIR, "group-memory-md", sidecarFileId(groupId));
  const sessionDir = path.join(GROUP_SESSION_MEMORY_DIR, sidecarFileId(groupId));
  const toolDir = path.join(GROUP_TOOL_CONTINUITY_DIR, sidecarFileId(groupId));
  try {
    const { saveGroupMessages } = require("../collaboration/storage");
    const {
      saveGroupMemory,
      buildAgentMemoryContextBundle,
      buildGroupCompactFileReferences,
      summarizeGroupCompactFileReferenceAccess,
    } = require("../collaboration/memory");
    saveGroupMessages(groupId, [
      { id: "cfrd-1", role: "user", target: "coordinator", timestamp: "2026-07-07T14:00:00.000Z", content: "COMPACT_FILE_REFERENCE_DISCIPLINE_SENTINEL：子 Agent 新会话必须能拿到群聊压缩文件引用。" },
      { id: "cfrd-2", role: "assistant", agent: "api", timestamp: "2026-07-07T14:01:00.000Z", content: "api 将在回执 memoryUsed 中声明实际使用的 reference_id。" },
    ]);
    saveGroupMemory(groupId, {
      groupId,
      goal: "验证 compact file reference 下发后必须有 memoryUsed/memoryIgnored 使用声明",
      messageDigest: "COMPACT_FILE_REFERENCE_DISCIPLINE_SENTINEL：压缩文件引用要被子 Agent 回执闭环。",
      persistentRequirements: [{ messageId: "cfrd-1", text: "compact file reference 使用情况必须可审计。" }],
      compaction: {
        version: 1,
        compactedMessageCount: 2,
        preservedRecentMessages: 1,
        summaryChecksum: "compact-file-reference-discipline-summary",
        lastCompactedMessageId: "cfrd-2",
      },
    });
    const childBundle = buildAgentMemoryContextBundle(groupId, "api", "继续处理 COMPACT_FILE_REFERENCE_DISCIPLINE_SENTINEL");
    const refs = childBundle.compact_file_references || buildGroupCompactFileReferences(groupId, childBundle);
    const usedRef = (refs.references || []).find((item: any) => item.type === "raw_group_messages_json") || refs.references?.[0] || {};
    const unmentionedRef = (refs.references || []).find((item: any) => item.reference_id && item.reference_id !== usedRef.reference_id) || {};
    const memory = saveGroupMemory(groupId, {
      groupId,
      goal: "验证 compact file reference 下发后必须有 memoryUsed/memoryIgnored 使用声明",
      messageDigest: "COMPACT_FILE_REFERENCE_DISCIPLINE_SENTINEL：压缩文件引用要被子 Agent 回执闭环。",
      persistentRequirements: [{ messageId: "cfrd-1", text: "compact file reference 使用情况必须可审计。" }],
      compaction: {
        version: 1,
        compactedMessageCount: 2,
        preservedRecentMessages: 1,
        summaryChecksum: "compact-file-reference-discipline-summary",
        lastCompactedMessageId: "cfrd-2",
      },
      workerLedger: [{
        time: "2026-07-07T14:02:00.000Z",
        taskId: "compact-file-reference-discipline-task",
        project: "api",
        status: "completed",
        summary: `已按 compact reference 读取 ${usedRef.reference_id || "compact-file-reference"} 并核对原始消息。`,
        memoryUsed: [`reference_id=${usedRef.reference_id || ""}；path=${usedRef.displayPath || usedRef.path || ""}`],
        memoryIgnored: [],
      }],
    });
    const access = summarizeGroupCompactFileReferenceAccess(groupId, refs, memory);
    const report = buildCompactFileReferenceUsageDisciplineReport({ groupIds: [groupId] });
    const group = report.groups?.[0] || {};
    const check = evaluateCompactFileReferenceUsageDiscipline({ groupIds: [groupId] });
    const detail: any = getMemoryCenterScope("group", groupId);
    const detailDiscipline = detail.postCompactUsage?.compactFileReferenceDiscipline || {};
    const checks = {
      childBundleSurfacesCompactReferences: refs.schema === "ccm-group-compact-file-references-v1"
        && Number(refs.referenceCount || 0) >= 3
        && !!usedRef.reference_id
        && !!unmentionedRef.reference_id,
      surfacingLedgerExists: fs.existsSync(ledgerFile)
        && Number(readJson(ledgerFile, {})?.entries?.length || 0) >= 1,
      accessSummaryFindsUsedReference: access.schema === "ccm-group-compact-file-reference-access-summary-v1"
        && (access.rows || []).some((row: any) => row.reference_id === usedRef.reference_id && row.mentioned === true),
      disciplineReportChecksSurfacedRefs: report.schema === "ccm-compact-file-reference-usage-discipline-report-v1"
        && Number(group.checked || 0) >= 3
        && Number(group.passed || 0) >= 1,
      unmentionedRefsBecomeGaps: (group.gaps || []).some((gap: any) => gap.reference_id === unmentionedRef.reference_id)
        && Number(group.missing || 0) >= 1,
      qualityCheckCoversDiscipline: check.id === "compact_file_reference_usage_discipline"
        && Number(check.checked || 0) === Number(group.checked || 0)
        && Number(check.passed || 0) === Number(group.passed || 0),
      memoryCenterDetailExposesDiscipline: detailDiscipline.schema === "ccm-compact-file-reference-usage-discipline-group-v1"
        && Number(detailDiscipline.checked || 0) === Number(group.checked || 0)
        && (detailDiscipline.rows || []).some((row: any) => row.reference_id === usedRef.reference_id && row.mentioned === true),
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      discipline: {
        checked: group.checked,
        passed: group.passed,
        missing: group.missing,
        status: group.status,
        usedReference: usedRef.reference_id,
        unmentionedReference: unmentionedRef.reference_id,
      },
    };
  } finally {
    for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, ledgerFile, reloadFile, `${reloadFile}.bak`]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
    for (const dir of [typedDir, sessionDir, toolDir]) {
      try { if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
  }
}

export function runMemoryCenterHistoricalCompactBoundaryReplaySelfTest() {
  const groupId = `memory-center-historical-replay-selftest-${process.pid}-${Date.now()}`;
  const groupFile = path.join(GROUP_MEMORY_DIR, `${groupId}.json`);
  const replayRepairLedgerFile = getGroupCompactBoundaryReplayRepairLedgerFile(groupId);
  const reloadFile = path.join(CCM_DIR, "group-memory-reload", `${cleanId(groupId)}.json`);
  try {
    const { saveGroupMemory, renderGroupMemoryContextBundle } = require("../collaboration/memory");
    const boundaries = [
      {
        id: "historical-boundary-a",
        summarizedThroughMessageId: "history-a-10",
        summarizedMessageCount: 10,
        summaryChecksum: "historical-summary-a",
        preCompactTokenCount: 9000,
        postCompactTokenCount: 2100,
        lastCompactedAt: "2026-07-07T06:00:00.000Z",
      },
      {
        id: "historical-boundary-b",
        summarizedThroughMessageId: "history-b-18",
        summarizedMessageCount: 18,
        summaryChecksum: "historical-summary-b",
        preCompactTokenCount: 11200,
        postCompactTokenCount: 2600,
        lastCompactedAt: "2026-07-07T06:10:00.000Z",
      },
    ];
    const memory = {
      groupId,
      goal: "验证历史 compact boundary replay 能覆盖多个旧边界",
      persistentRequirements: [{ messageId: "history-req", text: "必须保留 HISTORICAL_BOUNDARY_SENTINEL。" }],
      compaction: {
        version: 1,
        compactedMessageCount: 18,
        preservedRecentMessages: 4,
        summaryChecksum: "historical-summary-b",
        lastCompactedMessageId: "history-b-18",
        lastCompactedAt: "2026-07-07T06:10:00.000Z",
        preCompactTokenCount: 11200,
        postCompactTokenCount: 2600,
        boundaries,
        postCompactReinject: {
          schema: "ccm-post-compact-reinjection-v1",
          files: [{ candidate_id: "historical_file", value: "src/historical-boundary.ts", sourceMessageId: "history-a-2" }],
          verification: [{ candidate_id: "historical_check", value: "npm run test:historical-boundary", sourceMessageId: "history-b-3" }],
        },
        postCompactRecoveryAudit: {
          schema: "ccm-post-compact-recovery-audit-v1",
          status: "pass",
          pass: true,
          checkCount: 2,
          passedChecks: 2,
          summaryChecksum: "historical-summary-b",
        },
      },
      compactBoundary: boundaries[1],
      agentMemories: { api: { project: "api", frequentFiles: ["src/historical-boundary.ts"] } },
    };
    saveGroupMemory(groupId, memory);
    const direct = buildGroupHistoricalCompactBoundaryReplay(groupId, memory, {});
    const detail: any = getMemoryCenterScope("group", groupId);
    const historical = detail.postCompactUsage?.historicalBoundaryReplay || {};
    const report = buildHistoricalCompactBoundaryReplayReport({ groupIds: [groupId] });
    const check = evaluateHistoricalCompactBoundaryReplay({ groupIds: [groupId] });
    const rendered = renderGroupMemoryContextBundle({
      schema: "ccm-group-memory-context-v1",
      target_project: "api",
      memory_policy: { use: "must_consider" },
      group_state: { goal: memory.goal, currentPhase: "test" },
      compaction: {
        boundaryHistory: {
          schema: "ccm-compact-boundary-history-summary-v1",
          boundaryCount: boundaries.length,
          latest: { summaryChecksum: "historical-summary-b" },
          rows: boundaries,
        },
      },
    });
    const checks = {
      directReplaysMultipleBoundaries: direct.schema === "ccm-historical-compact-boundary-replay-v1"
        && direct.boundaryCount === 2
        && direct.replayedBoundaryCount === 2
        && direct.passedBoundaryCount === 2
        && Number(direct.score || 0) >= 95,
      detailExposesHistoricalReplay: historical.schema === "ccm-historical-compact-boundary-replay-v1"
        && historical.boundaries?.some((row: any) => row.summaryChecksum === "historical-summary-a")
        && historical.boundaries?.some((row: any) => row.summaryChecksum === "historical-summary-b"),
      reportAggregatesHistoricalReplay: report.schema === "ccm-historical-compact-boundary-replay-report-v1"
        && report.overall?.boundaryCount === 2
        && report.overall?.status === "ok",
      qualityCheckPassesHistoricalReplay: check.id === "historical_compact_boundary_replay"
        && Number(check.checked || 0) === 1
        && Number(check.passed || 0) === 1,
      childAgentRendererMentionsBoundaryHistory: rendered.includes("历史压缩边界")
        && rendered.includes("historical-summary-b"),
    };
    return { pass: Object.values(checks).every(Boolean), checks, historical };
  } finally {
    for (const file of [groupFile, `${groupFile}.bak`, replayRepairLedgerFile, reloadFile, `${reloadFile}.bak`]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
  }
}

export function runMemoryCenterChildAgentTypeReplayMatrixSelfTest() {
  const groupId = `memory-center-agent-type-replay-selftest-${process.pid}-${Date.now()}`;
  const groupFile = path.join(GROUP_MEMORY_DIR, `${groupId}.json`);
  const replayRepairLedgerFile = getGroupCompactBoundaryReplayRepairLedgerFile(groupId);
  const reloadFile = path.join(CCM_DIR, "group-memory-reload", `${cleanId(groupId)}.json`);
  try {
    const { saveGroupMemory, renderGroupMemoryContextBundle } = require("../collaboration/memory");
    const memory = {
      groupId,
      goal: "验证 Claude Code / Cursor / Codex 子 Agent 类型 replay matrix",
      persistentRequirements: [{ messageId: "agent-type-req", text: "必须保留 AGENT_TYPE_REPLAY_SENTINEL。" }],
      compaction: {
        version: 1,
        compactedMessageCount: 16,
        preservedRecentMessages: 5,
        summaryChecksum: "agent-type-summary",
        lastCompactedMessageId: "agent-type-16",
        lastCompactedAt: "2026-07-07T07:00:00.000Z",
        preCompactTokenCount: 9800,
        postCompactTokenCount: 2400,
        postCompactReinject: {
          schema: "ccm-post-compact-reinjection-v1",
          files: [{ candidate_id: "agent_type_file", value: "src/agent-type-replay.ts", sourceMessageId: "agent-type-2" }],
          verification: [{ candidate_id: "agent_type_check", value: "npm run test:agent-type-replay", sourceMessageId: "agent-type-3" }],
        },
        postCompactRecoveryAudit: {
          schema: "ccm-post-compact-recovery-audit-v1",
          status: "pass",
          pass: true,
          checkCount: 2,
          passedChecks: 2,
          summaryChecksum: "agent-type-summary",
        },
      },
      compactBoundary: {
        id: "agent-type-boundary",
        summarizedThroughMessageId: "agent-type-16",
        summarizedMessageCount: 16,
        summaryChecksum: "agent-type-summary",
        preCompactTokenCount: 9800,
        postCompactTokenCount: 2400,
      },
      agentMemories: {
        api: { project: "api", agentType: "claudecode", frequentFiles: ["src/agent-type-replay.ts"] },
        web: { project: "web", agentType: "cursor", frequentFiles: ["src/agent-type-replay.ts"] },
        cli: { project: "cli", agentType: "codex", frequentFiles: ["src/agent-type-replay.ts"] },
      },
      workerLedger: [
        { project: "api", agentType: "claudecode", summary: "Claude Code handled API replay" },
        { project: "web", agentType: "cursor", summary: "Cursor handled UI replay" },
        { project: "cli", agentType: "codex", summary: "Codex handled CLI replay" },
      ],
    };
    saveGroupMemory(groupId, memory);
    const direct = buildGroupChildAgentTypeReplayMatrix(groupId, memory, {});
    const report = buildChildAgentTypeReplayMatrixReport({ groupIds: [groupId] });
    const check = evaluateChildAgentTypeReplayMatrix({ groupIds: [groupId] });
    const detail: any = getMemoryCenterScope("group", groupId);
    const matrix = detail.postCompactUsage?.agentTypeReplay || {};
    const rendered = renderGroupMemoryContextBundle({
      schema: "ccm-group-memory-context-v1",
      target_project: "api",
      memory_policy: { use: "must_consider" },
      group_state: { goal: memory.goal, currentPhase: "test" },
      compaction: {
        childAgentTypes: {
          schema: "ccm-child-agent-type-summary-v1",
          agentTypeCount: 3,
          targetCount: 3,
          rows: [
            { agentType: "claudecode", targetCount: 1, targets: [{ targetProject: "api" }] },
            { agentType: "cursor", targetCount: 1, targets: [{ targetProject: "web" }] },
            { agentType: "codex", targetCount: 1, targets: [{ targetProject: "cli" }] },
          ],
        },
      },
    });
    const typeNames = JSON.stringify(direct.agentTypes || []);
    const checks = {
      directScoresThreeAgentTypes: direct.schema === "ccm-child-agent-type-replay-matrix-v1"
        && direct.agentTypeCount === 3
        && direct.targetCount === 3
        && ["claudecode", "cursor", "codex"].every(name => typeNames.includes(name))
        && Number(direct.score || 0) >= 95,
      detailExposesTypeMatrix: matrix.schema === "ccm-child-agent-type-replay-matrix-v1"
        && matrix.agentTypes?.some((row: any) => row.agentType === "claudecode")
        && matrix.agentTypes?.some((row: any) => row.agentType === "cursor")
        && matrix.agentTypes?.some((row: any) => row.agentType === "codex"),
      reportAggregatesTypeMatrix: report.schema === "ccm-child-agent-type-replay-matrix-report-v1"
        && report.overall?.targetCount === 3
        && report.overall?.status === "ok",
      qualityCheckPassesTypeMatrix: check.id === "child_agent_type_replay_matrix"
        && Number(check.checked || 0) === 1
        && Number(check.passed || 0) === 1,
      childAgentRendererMentionsTypeMatrix: rendered.includes("子 Agent 类型矩阵")
        && rendered.includes("claudecode")
        && rendered.includes("cursor")
        && rendered.includes("codex"),
    };
    return { pass: Object.values(checks).every(Boolean), checks, matrix };
  } finally {
    for (const file of [groupFile, `${groupFile}.bak`, replayRepairLedgerFile, reloadFile, `${reloadFile}.bak`]) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
  }
}

export function handleMemoryCenterApi(pathname: string, req: any, res: any, parsed: any): boolean {
  if (!pathname.startsWith("/api/memory-center/")) return false;

  const { sendJson } = require("../../core/utils");

  if (pathname === "/api/memory-center/overview" && req.method === "GET") {
    sendJson(res, buildMemoryCenterOverview());
    return true;
  }

  if (pathname === "/api/memory-center/scope" && req.method === "GET") {
    sendJson(res, getMemoryCenterScope(parsed.query.scope, parsed.query.id));
    return true;
  }

  if (pathname === "/api/memory-center/audit" && req.method === "GET") {
    const limit = parseInt(parsed.query.limit) || 200;
    sendJson(res, { audit: listMemoryAudit(limit, parsed.query) });
    return true;
  }

  if (pathname === "/api/memory-center/evidence" && req.method === "GET") {
    sendJson(res, { evidence: findMemoryEvidence({
      ...parsed.query,
      groupId: parsed.query.groupId || parsed.query.group_id,
      messageId: parsed.query.messageId || parsed.query.message_id,
      taskId: parsed.query.taskId || parsed.query.task_id,
      sessionId: parsed.query.sessionId || parsed.query.session_id,
      missionId: parsed.query.missionId || parsed.query.mission_id,
    }) });
    return true;
  }

  if (pathname === "/api/memory-center/control" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        updateMemoryControl({
          ...data,
          scopeId: data.scopeId || data.scope_id,
          itemType: data.itemType || data.item_type,
          itemId: data.itemId || data.item_id,
        });
        sendJson(res, { success: true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/memory-center/operation" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const scope: MemoryScope = data.scope === "global" ? "global" : data.scope === "project" ? "project" : "group";
        const scopeId = data.scopeId || data.scope_id || (scope === "global" ? "global-agent" : "");
        const operation = String(data.operation || "");
        if (!String(data.reason || "").trim()) throw new Error("维护操作必须填写原因");
        let result: any = null;
        if (operation === "rollback") result = rollbackMemory(scope, scopeId, data.reason, data.actor || "local-user");
        else if (scope === "global" && operation === "compact") {
          const { loadGlobalAgentMemory, compactGlobalAgentSession } = require("../../agents/global/memory");
          result = { sessions: loadGlobalAgentMemory().sessions.map((session: any) => compactGlobalAgentSession(session.sessionId, { force: true, reason: data.reason })) };
        } else if (scope === "global" && operation === "rebuild") {
          const { rebuildGlobalAgentMemory } = require("../../agents/global/memory");
          result = rebuildGlobalAgentMemory(data.reason, data.actor || "local-user");
        } else if (scope === "global" && ["disable", "enable", "block_pattern", "remove_block_pattern"].includes(operation)) {
          const { getGlobalAgentMemoryPolicy, setGlobalAgentMemoryPolicy } = require("../../agents/global/memory");
          const current = getGlobalAgentMemoryPolicy();
          let blockedPatterns = current.blockedPatterns || [];
          const pattern = String(data.pattern || "").trim();
          if (["block_pattern", "remove_block_pattern"].includes(operation) && !pattern) throw new Error("请输入禁记规则");
          if (operation === "block_pattern") blockedPatterns = [...new Set([...blockedPatterns, pattern])];
          if (operation === "remove_block_pattern") blockedPatterns = blockedPatterns.filter((item: string) => item !== pattern);
          result = setGlobalAgentMemoryPolicy({ disabled: operation === "disable" ? true : operation === "enable" ? false : current.disabled, blockedPatterns, reason: data.reason, actor: data.actor || "local-user" });
        } else {
          result = recordMemoryOperation({ ...data, scope, scopeId });
        }
        sendJson(res, { success: true, result });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/memory-center/replay-repair-work-item" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const result = updateCompactBoundaryReplayRepairWorkItem({
          ...data,
          groupId: data.groupId || data.group_id || data.scopeId || data.scope_id,
          itemId: data.itemId || data.item_id || data.workItemId || data.work_item_id,
        });
        sendJson(res, { success: true, result, workItems: result.workItems });
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/memory-center/acceptance" && req.method === "POST") {
    const acceptance = runMemoryAcceptanceSnapshot();
    const metrics = getMemoryMetrics();
    sendJson(res, { acceptance, metrics });
    return true;
  }

  if (pathname === "/api/memory-center/quality" && (req.method === "GET" || req.method === "POST")) {
    const queryOptions = {
      checkIds: parsed.query.checkIds || parsed.query.check_ids || parsed.query.check || parsed.query.id || parsed.query.ids || "",
      cacheMaxAgeMs: parsed.query.cacheMaxAgeMs || parsed.query.cache_max_age_ms,
      ragSampleLimit: parsed.query.ragSampleLimit || parsed.query.rag_sample_limit,
      writeTargeted: parsed.query.writeTargeted === "true" || parsed.query.write_targeted === "true",
      refresh: req.method === "POST" || parsed.query.refresh === "true" || parsed.query.refresh === "1",
      record: req.method === "POST" || parsed.query.record === "true" || parsed.query.record === "1",
    };
    if (req.method === "GET") {
      try {
        sendJson(res, { success: true, quality: buildMemoryQualityReport(queryOptions) });
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 500);
      }
    } else {
      let body = "";
      req.on("data", (chunk: any) => body += chunk);
      req.on("end", () => {
        try {
          const data = body.trim() ? JSON.parse(body) : {};
          sendJson(res, {
            success: true,
            quality: buildMemoryQualityReport({
              ...queryOptions,
              ...data,
              checkIds: data.checkIds || data.check_ids || queryOptions.checkIds,
              refresh: data.refresh !== undefined ? data.refresh === true : queryOptions.refresh,
              record: data.record !== undefined ? data.record === true : queryOptions.record,
              writeTargeted: data.writeTargeted === true || data.write_targeted === true || queryOptions.writeTargeted,
            }),
          });
        } catch (e: any) {
          sendJson(res, { success: false, error: e.message }, 500);
        }
      });
    }
    return true;
  }

  if (pathname === "/api/memory-center/feedback" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        recordMemoryMetric("feedback", data);
        sendJson(res, { success: true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  return false;
}
