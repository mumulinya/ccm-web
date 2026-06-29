import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CCM_DIR, GROUP_MESSAGES_DIR } from "../utils";

export type MemoryScope = "group" | "project" | "global";
type MemoryAction = "pin" | "unpin" | "lock" | "unlock" | "edit" | "deprecate" | "delete" | "restore";

const CONTROL_DIR = process.env.CCM_MEMORY_CONTROL_DIR || path.join(CCM_DIR, "memory-control");
const CONTROL_FILE = path.join(CONTROL_DIR, "overrides.json");
const AUDIT_FILE = path.join(CONTROL_DIR, "audit.jsonl");
const METRICS_FILE = path.join(CONTROL_DIR, "metrics.json");
const GROUP_MEMORY_DIR = path.join(CCM_DIR, "group-memory");
const PROJECT_MEMORY_DIR = path.join(CCM_DIR, "project-memory");
const GLOBAL_MEMORY_FILE = path.join(CCM_DIR, "global-agent-memory", "memory.json");

function now() { return new Date().toISOString(); }

function ensureDir() {
  fs.mkdirSync(CONTROL_DIR, { recursive: true });
}

function readJson(file: string, fallback: any) {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return fallback; }
}

function writeJsonAtomic(file: string, value: any) {
  ensureDir();
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
    const currentPressure = compaction.postCompactTokenCount ? (Number(compaction.postCompactTokenCount) / 200_000) * 100 : 0;
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
  return {
    scope, id: scopeId, label, health: alerts.some(item => item.severity === "critical") ? "critical" : alerts.length ? "warning" : "healthy",
    alerts: alerts.length,
    pinned: controls.filter((item: any) => item.pinned && !item.deprecated).length,
    edited: controls.filter((item: any) => item.editedText !== undefined && !item.deprecated).length,
    deprecated: controls.filter((item: any) => item.deprecated).length,
    tokenPressure: Number(compaction.postCompactTokenCount ? Math.round((Number(compaction.postCompactTokenCount) / 200_000) * 1000) / 10 : 0),
    preCompactPressure: Number(compaction.pressurePercent || 0),
    beforeTokens: Number(compaction.preCompactTokenCount || 0),
    afterTokens: Number(compaction.postCompactTokenCount || 0),
    updatedAt: memory?.updated_at || memory?.updatedAt || compaction.lastCompactedAt || "",
  };
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
    const { loadGlobalAgentMemory, getGlobalMemoryEvidence } = require("../global-agent-memory");
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

export function buildMemoryCenterOverview() {
  const labels = groupLabelMap();
  const groups = listJsonFiles(GROUP_MEMORY_DIR).map(file => readMemoryFile(file)).filter(Boolean)
    .map((memory: any) => memorySummary("group", String(memory.groupId || path.basename(memory.__file || "", ".json")), memory, String(labels.get(String(memory.groupId)) || memory.groupId)));
  const projects = listJsonFiles(PROJECT_MEMORY_DIR).map(file => readMemoryFile(file)).filter(Boolean)
    .map((memory: any) => memorySummary("project", String(memory.project || "unknown"), memory, String(memory.project || "unknown")));
  const globalMemory = fs.existsSync(GLOBAL_MEMORY_FILE) ? require("../global-agent-memory").loadGlobalAgentMemory({ recover: false }) : null;
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
  return {
    generatedAt: now(), groups, projects, globals, alerts: allAlerts,
    totals: { scopes: groups.length + projects.length + globals.length, healthy: [...groups, ...projects, ...globals].filter(item => item.health === "healthy").length, alerts: allAlerts.length },
    metrics,
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
  const rawMemory = scope === "global" ? require("../global-agent-memory").loadGlobalAgentMemory({ recover: false }) : readMemoryFile(file);
  if (!rawMemory) throw new Error("记忆文件无法读取");
  const policy = scope === "global" ? require("../global-agent-memory").getGlobalAgentMemoryPolicy() : null;
  return {
    scope, id: scopeId, file, backupExists: fs.existsSync(`${file}.bak`),
    policy,
    summary: memorySummary(scope, scopeId, rawMemory, scopeId), alerts: healthAlerts(scope, scopeId, rawMemory),
    memory: applyMemoryControls(scope, scopeId, rawMemory), rawMemory,
    itemGroups: collectItems(scope, scopeId, rawMemory),
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
    const { getGlobalMemoryEvidence } = require("../global-agent-memory");
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

export function handleMemoryCenterApi(pathname: string, req: any, res: any, parsed: any): boolean {
  if (!pathname.startsWith("/api/memory-center/")) return false;

  const { sendJson } = require("../utils");

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
          const { loadGlobalAgentMemory, compactGlobalAgentSession } = require("../global-agent-memory");
          result = { sessions: loadGlobalAgentMemory().sessions.map((session: any) => compactGlobalAgentSession(session.sessionId, { force: true, reason: data.reason })) };
        } else if (scope === "global" && operation === "rebuild") {
          const { rebuildGlobalAgentMemory } = require("../global-agent-memory");
          result = rebuildGlobalAgentMemory(data.reason, data.actor || "local-user");
        } else if (scope === "global" && ["disable", "enable", "block_pattern", "remove_block_pattern"].includes(operation)) {
          const { getGlobalAgentMemoryPolicy, setGlobalAgentMemoryPolicy } = require("../global-agent-memory");
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

  if (pathname === "/api/memory-center/acceptance" && req.method === "POST") {
    const acceptance = runMemoryAcceptanceSnapshot();
    const metrics = getMemoryMetrics();
    sendJson(res, { acceptance, metrics });
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
