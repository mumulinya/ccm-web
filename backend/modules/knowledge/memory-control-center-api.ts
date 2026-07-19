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
import { MemoryScope, CONTROL_DIR, AUDIT_FILE, GROUP_MEMORY_DIR, GROUP_SESSION_SCOPED_MEMORY_DIR, PROJECT_MEMORY_DIR, GLOBAL_MEMORY_FILE, now, readJson, hash, cleanId, readGroupSessionMemorySnapshotForCenter, readGroupToolContinuitySnapshotForCenter, appendAudit } from "./memory-control-center-types";
import { getMemoryItemId, itemText, scopeControls, applyMemoryControls } from "./memory-control-center-controls";
import { estimateGroupMessageTokens } from "../collaboration/group-compaction-projections-part-01";
import { getGroupAutoCompactThreshold, resolveGroupModelContextCapacity } from "../collaboration/group-compaction-strategy";
import { loadOrchestratorConfig } from "../collaboration/group-orchestrator-config";
import { readGroupCompactionActivity } from "../collaboration/group-compaction-activity";

function currentCompactionActivity(scope: MemoryScope, scopeId: string, memory: any) {
  try {
    if (scope === "group") {
      const exact = parseGroupMemoryScopeId(scopeId, memory);
      const ledger = readGroupCompactionActivity(exact.groupId, exact.sessionId);
      const row = ledger?.current;
      const active = row?.status === "running" && Date.parse(String(row?.lease_expires_at || "")) > Date.now();
      return active ? {
        active: true,
        status: "running",
        stage: String(row.stage || "model_compaction"),
        reason: String(row.reason || ""),
        startedAt: String(row.started_at || ""),
        updatedAt: String(row.heartbeat_at || row.started_at || ""),
      } : { active: false, status: "idle", stage: "", reason: "", startedAt: "", updatedAt: String(ledger?.updated_at || "") };
    }
    if (scope === "global_session") {
      return require("../../agents/global/memory").getGlobalAgentSessionCompactionActivity(scopeId.replace(/^session:/, ""));
    }
    if (scope === "project_session") {
      const separator = scopeId.indexOf("::");
      if (separator > 0) {
        return require("../projects/project-session-compaction").getProjectSessionCompactionActivity(
          scopeId.slice(0, separator),
          scopeId.slice(separator + 2),
        );
      }
    }
  } catch {}
  return { active: false, status: "idle", stage: "", reason: "", startedAt: "", updatedAt: "" };
}

export function listJsonFiles(dir: string) {
  try { return fs.readdirSync(dir).filter(name => name.endsWith(".json") && !name.includes(".pre-rollback-")).map(name => path.join(dir, name)); } catch { return []; }
}


export function readMemoryFile(file: string) {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return null; }
}


export function groupLabelMap() {
  const groups = readJson(path.join(CCM_DIR, "groups.json"), []);
  return new Map((Array.isArray(groups) ? groups : groups?.groups || []).map((item: any) => [String(item.id), item.name || item.title || item.id]));
}


export function projectFile(project: string) {
  return listJsonFiles(PROJECT_MEMORY_DIR).find(file => readMemoryFile(file)?.project === project) || "";
}


export function parseGroupMemoryScopeId(scopeId: string, memory: any = null) {
  const raw = String(scopeId || "").trim();
  const separator = raw.indexOf("::");
  const explicitGroupId = separator >= 0 ? raw.slice(0, separator) : raw;
  const explicitSessionId = separator >= 0 ? raw.slice(separator + 2) : "";
  const groupId = String(memory?.groupId || explicitGroupId || "").trim();
  const sessionId = String(memory?.groupSessionId || explicitSessionId || "default").trim() || "default";
  return {
    groupId,
    sessionId,
    scopeId: sessionId === "default" ? groupId : `${groupId}::${sessionId}`,
  };
}


export function listGroupSessionMemoryFiles() {
  const files: string[] = [];
  try {
    for (const groupEntry of fs.readdirSync(GROUP_SESSION_SCOPED_MEMORY_DIR, { withFileTypes: true })) {
      if (!groupEntry.isDirectory()) continue;
      const groupDir = path.join(GROUP_SESSION_SCOPED_MEMORY_DIR, groupEntry.name);
      for (const name of fs.readdirSync(groupDir)) {
        if (name.endsWith(".json") && !name.endsWith(".bak") && !name.includes(".pre-rollback-")) files.push(path.join(groupDir, name));
      }
    }
  } catch {}
  return files;
}


export function listGroupMemoryScopes() {
  const rows: any[] = [];
  const seen = new Set<string>();
  for (const file of [...listJsonFiles(GROUP_MEMORY_DIR), ...listGroupSessionMemoryFiles()]) {
    const memory = readMemoryFile(file);
    if (!memory) continue;
    const parts = parseGroupMemoryScopeId(String(memory.groupId || path.basename(file, ".json")), memory);
    if (!parts.groupId || seen.has(parts.scopeId)) continue;
    seen.add(parts.scopeId);
    rows.push({ ...parts, file, memory });
  }
  return rows;
}


export function listMemoryCenterGroupSessionScopes() {
  const labels = groupLabelMap();
  const stored = listGroupMemoryScopes();
  const storedByScope = new Map(stored.map((entry: any) => [entry.scopeId, entry]));
  const rows: any[] = [];
  const seen = new Set<string>();
  for (const [groupId, groupLabel] of labels.entries()) {
    let sessions: any[] = [];
    try { sessions = require("../collaboration/storage").listGroupChatSessions(groupId).sessions || []; } catch {}
    for (const session of sessions) {
      const sessionId = String(session.id || "");
      if (!sessionId) continue;
      const scopeId = `${groupId}::${sessionId}`;
      const entry: any = storedByScope.get(scopeId);
      const memory = entry?.memory || { groupId, groupSessionId: sessionId, compaction: {} };
      rows.push({
        ...memorySummary("group", scopeId, memory, String(session.title || sessionId)),
        groupId,
        groupSessionId: sessionId,
        groupLabel: String(groupLabel || groupId),
        sessionLabel: String(session.title || sessionId),
        memoryKind: "session",
        hasMemoryState: !!entry,
        messageCount: Number(session.messageCount || 0),
      });
      seen.add(scopeId);
    }
  }
  for (const entry of stored) {
    if (seen.has(entry.scopeId) || entry.sessionId === "default") continue;
    rows.push({
      ...memorySummary("group", entry.scopeId, entry.memory, groupSessionLabel(entry.groupId, entry.sessionId, labels)),
      groupId: entry.groupId,
      groupSessionId: entry.sessionId,
      groupLabel: String(labels.get(entry.groupId) || entry.groupId),
      sessionLabel: entry.sessionId,
      memoryKind: "session",
      hasMemoryState: true,
    });
  }
  return rows;
}


export function groupSessionLabel(groupId: string, sessionId: string, labels = groupLabelMap()) {
  const groupLabel = String(labels.get(groupId) || groupId);
  if (sessionId === "default") return groupLabel;
  try {
    const { listGroupChatSessions } = require("../collaboration/storage");
    const session = listGroupChatSessions(groupId).sessions.find((item: any) => String(item.id) === sessionId);
    return `${groupLabel} / ${session?.title || sessionId}`;
  } catch {
    return `${groupLabel} / ${sessionId}`;
  }
}


export function scopeFile(scope: MemoryScope, scopeId: string) {
  if (scope === "group") {
    const parts = parseGroupMemoryScopeId(scopeId);
    if (parts.sessionId === "default") return path.join(GROUP_MEMORY_DIR, `${parts.groupId}.json`);
    try {
      const { getGroupMemoryFile } = require("../collaboration/memory");
      return getGroupMemoryFile(parts.groupId, parts.sessionId);
    } catch {
      return path.join(GROUP_SESSION_SCOPED_MEMORY_DIR, cleanId(parts.groupId), `${cleanId(parts.sessionId)}.json`);
    }
  }
  if (scope === "global_session") return GLOBAL_MEMORY_FILE;
  if (scope === "project_session") {
    const separator = scopeId.indexOf("::");
    const project = cleanId(separator >= 0 ? scopeId.slice(0, separator) : "");
    const sessionId = cleanId(separator >= 0 ? scopeId.slice(separator + 2) : "");
    return project && sessionId ? path.join(CCM_DIR, "web-sessions", project, `${sessionId}.json`) : "";
  }
  if (scope === "task_agent") return path.join(CCM_DIR, "task-agent-sessions.json");
  if (scope === "project") return projectFile(scopeId);
  return GLOBAL_MEMORY_FILE;
}

export function resolveMemoryCenterTokenState(scope: MemoryScope, scopeId: string, memory: any, options: any = {}) {
  const compaction = memory?.compaction?.v2 || memory?.compaction || {};
  const warning = compaction.contextPressureWarning || compaction.compactWarning || {};
  const decision = compaction.compactStrategyDecision || {};
  const config = options.config || loadOrchestratorConfig();
  const defaultCapacity = resolveGroupModelContextCapacity(config);
  const capacity = memory?.compaction?.resolved_model_capacity || compaction.resolvedModelCapacity || compaction.resolved_model_capacity || defaultCapacity;
  const modelVisiblePayload = memory?.compaction?.model_visible_payload || compaction.modelVisiblePayload || compaction.model_visible_payload || compaction.postCompactGate?.model_visible_payload || compaction.post_compact_gate?.model_visible_payload || null;
  let currentTokens = Number(compaction.tokenMeasurement?.activeTokens ?? compaction.token_measurement?.activeTokens ?? modelVisiblePayload?.totalTokens ?? compaction.postCompactTokenCount ?? memory?.providerContextUsageBaseline?.observed_context_tokens ?? 0);
  let currentMessageCount = 0;
  let tokenSource = currentTokens > 0 ? "post_compact_record" : "empty";
  let tokenUpdatedAt = warning.createdAt || decision.createdAt || compaction.lastPressureSampleAt || compaction.lastCompactedAt || "";
  if (scope === "project") {
    const activeDurable = (Array.isArray(memory?.durableMemories) ? memory.durableMemories : [])
      .filter((item: any) => item?.content && !["resolved", "superseded"].includes(String(item.status || "active")))
      .sort((a: any, b: any) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
      .slice(0, 24);
    const projectedContext = {
      project: memory?.project || scopeId,
      workDir: memory?.workDir || "",
      architecture: memory?.architecture || "",
      techStack: memory?.techStack || [],
      durableMemories: activeDurable,
      resources: memory?.resources || {},
    };
    currentTokens = estimateGroupMessageTokens({ role: "system", content: JSON.stringify(projectedContext) });
    currentMessageCount = activeDurable.length;
    tokenSource = "project_long_term_injection_estimate";
    tokenUpdatedAt = memory?.updatedAt || tokenUpdatedAt;
  } else if (scope === "group") {
    const parts = parseGroupMemoryScopeId(scopeId, memory);
    const recordedTokens = Number(
      warning.tokenUsage
        ?? decision.activeTokensBeforeCompact
        ?? compaction.apiMicroCompactEditPlan?.activeTokens
        ?? compaction.postCompactTokenCount
        ?? 0
    );
    if (Number.isFinite(recordedTokens) && recordedTokens >= 0 && (warning.schema || decision.schema || compaction.apiMicroCompactEditPlan?.schema)) {
      currentTokens = recordedTokens;
      currentMessageCount = Number(warning.activeMessageCount || decision.activeMessageCount || compaction.totalMessagesSeen || 0);
      tokenSource = warning.schema ? "context_pressure_sample" : decision.schema ? "compact_strategy_sample" : "api_microcompact_sample";
    } else if (currentTokens <= 0) {
      try {
        const messages = require("../collaboration/storage").getGroupMessages(parts.groupId, parts.sessionId);
        currentTokens = messages.reduce((sum: number, message: any) => sum + estimateGroupMessageTokens(message), 0);
        currentMessageCount = messages.length;
        tokenSource = "message_estimate";
      } catch {}
    } else {
      currentMessageCount = Number(
        (compaction.preservedRecentMessageIds || compaction.preserved_recent_message_ids || []).length
        || compaction.preservedRecentMessages
        || 0
      );
      tokenSource = String(compaction.tokenMeasurement?.source || compaction.token_measurement?.source || tokenSource);
    }
  } else if (scope === "global_session") {
    if (currentTokens <= 0) {
      try {
        const sessionId = scopeId.replace(/^session:/, "");
        const transcript = require("../../agents/global/memory").loadGlobalAgentTranscript(sessionId);
        const lastCompactedIndex = Number(compaction.lastCompactedIndex ?? memory?.lastCompactedIndex ?? -1);
        const visibleMessages = (Array.isArray(transcript?.messages) ? transcript.messages : []).slice(Math.max(0, lastCompactedIndex + 1));
        currentTokens = visibleMessages.reduce((sum: number, message: any) => sum + estimateGroupMessageTokens(message), 0);
        currentMessageCount = visibleMessages.length;
        const summarySource = String(memory?.summarySource || memory?.summary_source || compaction.summarySource || compaction.summary_source || "").toLowerCase();
        if (["model", "session_memory", "session-memory"].includes(summarySource)) {
          const activeSummary = compaction.activeSummary || memory?.summary;
          if (activeSummary) currentTokens += estimateGroupMessageTokens({ role: "system", content: activeSummary });
        }
        tokenSource = "encrypted_transcript_estimate";
        tokenUpdatedAt = transcript?.updatedAt || tokenUpdatedAt;
      } catch {}
    } else {
      currentMessageCount = Number((compaction.preservedRecentMessageIds || compaction.preserved_recent_message_ids || []).length || 0);
      tokenSource = String(compaction.tokenMeasurement?.source || compaction.token_measurement?.source || tokenSource);
    }
  }
  const autoCompactThreshold = scope === "project" ? 0 : Number(
    memory?.compaction?.auto_compact_threshold
    || compaction.autoCompactThreshold
    || compaction.auto_compact_threshold
    || warning.thresholds?.autoCompactThreshold
    || decision.triggerTokens
    || getGroupAutoCompactThreshold(config)
    || capacity.autoCompactThreshold,
  );
  const effectiveContextWindow = Number(capacity.effectiveContextWindow || capacity.effective_context_window || capacity.contextWindow || capacity.context_window || DEFAULT_CONTEXT_WINDOW_TOKENS);
  const remainingTokens = scope === "project" ? 0 : Math.max(0, autoCompactThreshold - currentTokens);
  return {
    currentTokens,
    currentMessageCount,
    tokenSource,
    autoCompactThreshold,
    remainingTokens,
    effectiveContextWindow,
    tokenPressure: scope !== "project" && autoCompactThreshold > 0 ? Math.round((currentTokens / autoCompactThreshold) * 1000) / 10 : 0,
    tokenUpdatedAt,
    sampledAutoCompactThreshold: Number(warning.thresholds?.autoCompactThreshold || decision.triggerTokens || 0),
  };
}


export function healthAlerts(scope: MemoryScope, scopeId: string, memory: any) {
  const alerts: any[] = [];
  const add = (severity: string, code: string, message: string) => alerts.push({ id: `${scope}:${scopeId}:${code}`, scope, scopeId, severity, code, message });
  if (memory?.storageRecovery?.failed) add("critical", "storage_recovery_failed", "主文件和备份均不可读取");
  else if (memory?.storageRecovery?.recoveredFromBackup) add("warning", "storage_recovered", "本次从备份恢复，请检查最近一次写入");
  if (scope === "group") {
    const compaction = memory?.compaction || {};
    if (compaction.health && !["healthy", "empty", "recent-window-only"].includes(String(compaction.health))) add("warning", "compaction_health", `压缩健康状态：${compaction.health}`);
    if (compaction.validation?.pass === false) add("critical", "summary_validation", "压缩摘要未通过事实保真校验");
    if (Number(compaction.thrashCount || 0) >= 3) add("warning", "compaction_thrash", "连续压缩释放空间不足");
    if (Number(compaction.consecutiveFailures || 0) > 0) add("warning", "model_compaction_failure", `模型压缩连续失败 ${compaction.consecutiveFailures} 次`);
    const currentPressure = resolveMemoryCenterTokenState(scope, scopeId, memory).tokenPressure;
    if (currentPressure >= 90) add("warning", "token_pressure", `当前上下文占用 ${Math.round(currentPressure * 10) / 10}%`);
  } else if (scope === "project" || scope === "project_session") {
    if (memory?.integrity?.conclusions?.pass === false || memory?.integrity?.decisions?.pass === false) add("critical", "archive_integrity", "项目记忆归档校验失败");
    const compaction = memory?.compaction?.v2 || memory?.compaction || {};
    if (Number(compaction.consecutiveFailures || compaction.consecutive_failures || 0) > 0) add("warning", "project_session_compaction_failure", `项目会话压缩连续失败 ${Number(compaction.consecutiveFailures || compaction.consecutive_failures || 0)} 次`);
  } else if (scope === "global" || scope === "global_session") {
    const compaction = memory?.compaction?.v2 || memory?.compaction || {};
    if (memory?.integrity?.pass === false) add("critical", "global_archive_integrity", `全局记忆归档校验失败：${(memory.integrity.corruptedArchives || []).join("、")}`);
    if (compaction.health && compaction.health !== "healthy") add("warning", "global_compaction_health", `全局压缩健康状态：${compaction.health}`);
    if (Number(compaction.consecutiveFailures || 0) >= 3) add("critical", "global_compaction_circuit_breaker", "全局记忆压缩连续失败，熔断器已触发");
    if (scope === "global" && memory?.privacy?.encryptedTranscripts !== true) add("critical", "global_transcript_encryption", "全局 Agent 原始转录未启用加密");
  } else if (scope === "task_agent") {
    const failures = Number(memory?.compaction?.consecutiveFailures || memory?.compaction?.consecutive_failures || memory?.finalDispatchReactiveCompactCircuitBreaker?.consecutive_failures || 0);
    if (failures > 0) add(failures >= 3 ? "critical" : "warning", "task_agent_compaction_failure", `任务 Agent 精确会话压缩连续失败 ${failures} 次`);
  }
  return alerts;
}


export function memorySummary(scope: MemoryScope, scopeId: string, memory: any, label: string) {
  const groupScope = scope === "group" ? parseGroupMemoryScopeId(scopeId, memory) : null;
  const controls = scopeControls(scope, scopeId);
  const alerts = healthAlerts(scope, scopeId, memory);
  const compactionContainer = memory?.compaction || {};
  const compaction = compactionContainer?.v2 || compactionContainer;
  const exactGroupSessionMemoryId = groupScope?.sessionId && groupScope.sessionId !== "default"
    ? `${groupScope.groupId}--${groupScope.sessionId}`
    : groupScope?.groupId || scopeId;
  const sessionMemory = scope === "group"
    ? readGroupSessionMemorySnapshotForCenter(exactGroupSessionMemoryId)
    : compaction.sessionMemoryState || compaction.session_memory_state || null;
  const toolContinuity = scope === "group" ? readGroupToolContinuitySnapshotForCenter(exactGroupSessionMemoryId) : null;
  const canonicalGroupSessionMemory = scope === "group"
    && sessionMemory?.modelExtracted === true
    && sessionMemory?.hasSummary === true
    && sessionMemory?.markdownExists === true
    && sessionMemory?.markdownChecksumMatches === true;
  const tokenState = resolveMemoryCenterTokenState(scope, scopeId, memory);
  const compactionActivity = currentCompactionActivity(scope, scopeId, memory);
  return {
    scope, id: scopeId, label, health: alerts.some(item => item.severity === "critical") ? "critical" : alerts.length ? "warning" : "healthy",
    groupId: groupScope?.groupId || "",
    groupSessionId: groupScope?.sessionId || "",
    alerts: alerts.length,
    pinned: controls.filter((item: any) => item.pinned && !item.deprecated).length,
    edited: controls.filter((item: any) => item.editedText !== undefined && !item.deprecated).length,
    deprecated: controls.filter((item: any) => item.deprecated).length,
    tokenPressure: tokenState.tokenPressure,
    currentTokens: tokenState.currentTokens,
    currentMessageCount: tokenState.currentMessageCount,
    tokenSource: tokenState.tokenSource,
    tokenUpdatedAt: tokenState.tokenUpdatedAt,
    compacting: compactionActivity.active === true,
    compactionActivity,
    autoCompactThreshold: tokenState.autoCompactThreshold,
    remainingTokens: tokenState.remainingTokens,
    effectiveContextWindow: tokenState.effectiveContextWindow,
    preCompactPressure: Number(compaction.pressurePercent || 0),
    beforeTokens: Number(compaction.preCompactTokenCount ?? compactionContainer.before_tokens ?? 0),
    afterTokens: Number(compaction.postCompactTokenCount ?? compactionContainer.after_tokens ?? compaction.postCompactGate?.afterTokens ?? 0),
    summarySource: String(memory?.summarySource || compactionContainer?.summary_source || compactionContainer?.summarySource || (compaction.activeSummary ? "model" : canonicalGroupSessionMemory ? "session_memory" : "")),
    preservedRecentTokens: Number(
      compaction.preservedRecentTokens
      ?? compaction.preserved_recent_token_count
      ?? compaction.compactStrategyDecision?.preservedSegment?.preservedTokenEstimate
      ?? compaction.compact_strategy_decision?.preserved_segment?.preserved_token_estimate
      ?? 0
    ),
    preservedRecentMessages: Number(
      (compaction.preservedRecentMessageIds || compaction.preserved_recent_message_ids || []).length
      || compaction.compactStrategyDecision?.preservedSegment?.preservedMessageCount
      || compaction.compact_strategy_decision?.preserved_segment?.preserved_message_count
      || compaction.preservedRecentMessages
      || 0
    ),
    consecutiveFailures: Number(compaction.consecutiveFailures ?? compaction.consecutive_failures ?? memory?.finalDispatchReactiveCompactCircuitBreaker?.consecutive_failures ?? 0),
    circuitOpen: Number(compaction.consecutiveFailures ?? compaction.consecutive_failures ?? memory?.finalDispatchReactiveCompactCircuitBreaker?.consecutive_failures ?? 0) >= 3,
    postCompactGate: compaction.postCompactGate || compaction.post_compact_gate || compactionContainer.post_compact_gate || null,
    tokenMeasurement: compaction.tokenMeasurement || compaction.token_measurement || compactionContainer.token_measurement || null,
    modelVisiblePayload: compaction.modelVisiblePayload || compaction.model_visible_payload || compactionContainer.model_visible_payload || memory?.modelVisiblePayload || null,
    resolvedModelCapacity: compaction.resolvedModelCapacity || compaction.resolved_model_capacity || compactionContainer.resolved_model_capacity || memory?.model?.modelContextCapacity || null,
    pendingRequestTokens: Number(compaction.pendingRequestTokens ?? compaction.pending_request_tokens ?? compactionContainer.pending_request_tokens ?? 0),
    recoveryContextTokens: Number(compaction.recoveryContextTokens ?? compaction.recovery_context_tokens ?? compactionContainer.recovery_context_tokens ?? 0),
    hookResultTokens: Number(compaction.hookResultTokens ?? compaction.hook_result_tokens ?? compactionContainer.hook_result_tokens ?? 0),
    ptlRecoveryAttempts: Number(compaction.ptlRecoveryAttempts ?? compaction.ptl_recovery_attempts ?? compactionContainer.ptl_recovery_attempts ?? 0),
    boundaryGeneration: Number(compaction.boundaryGeneration ?? compaction.boundary_generation ?? 0),
    longTermMemory: scope === "project" ? {
      schema: memory?.memoryPolicy?.schema || "legacy_project_memory",
      durableCount: Array.isArray(memory?.durableMemories) ? memory.durableMemories.length : 0,
      activeCount: (Array.isArray(memory?.durableMemories) ? memory.durableMemories : []).filter((item: any) => !["resolved", "superseded"].includes(String(item?.status || "active"))).length,
      taskHistoryCount: Array.isArray(memory?.taskHistory) ? memory.taskHistory.length : 0,
      legacyConclusionCount: (Array.isArray(memory?.conclusions) ? memory.conclusions.length : 0)
        + (Array.isArray(memory?.conclusionArchives) ? memory.conclusionArchives.reduce((sum: number, item: any) => sum + Number(item?.count || 0), 0) : 0),
      writePolicy: memory?.memoryPolicy?.durableMemoryRequiresAcceptedDoneReceipt === true ? "accepted_delivery_only" : "legacy",
      taskHistoryInjectedByDefault: memory?.memoryPolicy?.taskHistoryInjectedByDefault === true,
      lastAdmission: memory?.lastMemoryAdmission || null,
    } : null,
    updatedAt: memory?.updated_at || memory?.updatedAt || compaction.lastCompactedAt || "",
    sessionMemory: sessionMemory ? {
      status: scope === "group"
        ? (sessionMemory.modelExtracted === true
          && sessionMemory.hasSummary === true
          && sessionMemory.markdownExists === true
          && sessionMemory.markdownChecksumMatches === true
            ? "ready"
            : sessionMemory.modelExtracted === true
              ? "invalid"
              : sessionMemory.deterministicFallback === true
                ? "waiting_model"
                : sessionMemory.updateCadence?.status || sessionMemory.status || "waiting")
        : (sessionMemory.summary || sessionMemory.hasSummary ? "ready" : sessionMemory.status || "waiting"),
      source: sessionMemory.extractionSource || sessionMemory.sourceType || sessionMemory.source_type || "",
      updatedAt: sessionMemory.updatedAt || sessionMemory.updated_at || "",
      tokensAtLastExtraction: Number(sessionMemory.tokensAtLastExtraction || sessionMemory.tokens_at_last_extraction || 0),
      summaryFile: sessionMemory.summaryFile || sessionMemory.summary_file || "",
      snapshotFile: sessionMemory.snapshotFile || sessionMemory.snapshot_file || "",
      hasSummary: sessionMemory.hasSummary === true,
      canonical: scope === "group"
        ? sessionMemory.modelExtracted === true
          && sessionMemory.hasSummary === true
          && sessionMemory.markdownExists === true
          && sessionMemory.markdownChecksumMatches === true
        : !!(sessionMemory.summary || sessionMemory.hasSummary),
      modelExtracted: sessionMemory.modelExtracted === true,
      deterministicFallback: sessionMemory.deterministicFallback === true,
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
  };
}

function readableGlobalSessionSummary(value: any) {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  const compactValue = (input: any, max = 1800) => {
    const text = String(input || "").trim().replace(/^#[a-zA-Z0-9._:-]+\s+/, "");
    return text.length > max ? `${text.slice(0, max)}…` : text;
  };
  const list = (input: any, limit = 8) => (Array.isArray(input) ? input : [])
    .map(item => compactValue(item, 500))
    .filter(Boolean)
    .slice(-limit)
    .join("；");
  const sections = [
    ["主要目标", compactValue(value.primaryRequest)],
    ["近期要求", list(value.userRequests)],
    ["关键决策", list(value.decisions)],
    ["未完成事项", list(value.unresolved)],
    ["授权", list(value.authorization)],
    ["反馈", list(value.feedback)],
    ["文件与资源", list(value.filesAndResources)],
    ["最新结果", compactValue(value.latestOutcome)],
  ].filter(([, text]) => text);
  if (sections.length) return sections.map(([label, text]) => `${label}：${text}`).join("\n");
  try { return JSON.stringify(value, null, 2); } catch { return "结构化会话摘要"; }
}

function messageTextForMemoryCenter(message: any) {
  const value = message?.content ?? message?.text ?? message?.message ?? "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(item => {
    if (typeof item === "string") return item;
    return String(item?.text || item?.content || "");
  }).filter(Boolean).join("\n").trim();
  try { return JSON.stringify(value); } catch { return String(value || ""); }
}

function recentSessionMessagesForMemoryCenter(scope: MemoryScope, scopeId: string, memory: any) {
  let messages: any[] = [];
  try {
    if (scope === "group") {
      const exact = parseGroupMemoryScopeId(scopeId, memory);
      if (exact.sessionId !== "default") messages = require("../collaboration/storage").getGroupMessages(exact.groupId, exact.sessionId) || [];
    } else if (scope === "global_session") {
      messages = require("../../agents/global/memory").loadGlobalAgentTranscript(scopeId.replace(/^session:/, ""))?.messages || [];
    } else if (scope === "project_session") {
      messages = memory?.history || memory?.messages || [];
    } else if (scope === "task_agent") {
      messages = memory?.history || memory?.messages || memory?.transcript || [];
    }
  } catch {}
  if (!Array.isArray(messages) || !messages.length) return [];
  const compaction = memory?.compaction?.v2 || memory?.compaction || {};
  const preservedIds = compaction.preservedRecentMessageIds
    || compaction.preserved_recent_message_ids
    || compaction.compactStrategyDecision?.preservedSegment?.preservedMessageIds
    || compaction.compact_strategy_decision?.preserved_segment?.preserved_message_ids
    || [];
  let visible = messages;
  if (Array.isArray(preservedIds) && preservedIds.length) {
    const ids = new Set(preservedIds.map((id: any) => String(id)));
    const selected = messages.filter(message => ids.has(String(message?.id || message?.messageId || message?.uuid || "")));
    if (selected.length) visible = selected;
  } else {
    const lastCompactedIndex = Number(compaction.lastCompactedIndex ?? memory?.lastCompactedIndex ?? -1);
    if (lastCompactedIndex >= 0) visible = messages.slice(lastCompactedIndex + 1);
  }
  return visible.filter(message => messageTextForMemoryCenter(message)).slice(-20);
}

function appendSessionContinuityItems(groups: any[], scope: MemoryScope, scopeId: string, memory: any) {
  const isExactGroupSession = scope === "group" && parseGroupMemoryScopeId(scopeId, memory).sessionId !== "default";
  if (!isExactGroupSession && !["global_session", "project_session", "task_agent"].includes(scope)) return;
  const compaction = memory?.compaction?.v2 || memory?.compaction || {};
  let activeSummaryValue = compaction.activeSummary || memory?.summary || memory?.conversationSummary || "";
  let summarySource = String(memory?.summarySource || memory?.summary_source || compaction.summarySource || compaction.summary_source || "").toLowerCase();
  if (isExactGroupSession && !activeSummaryValue) {
    const exact = parseGroupMemoryScopeId(scopeId, memory);
    const sessionMemory = readGroupSessionMemorySnapshotForCenter(`${exact.groupId}--${exact.sessionId}`);
    const canonicalSessionMemory = sessionMemory.modelExtracted === true
      && sessionMemory.hasSummary === true
      && sessionMemory.markdownExists === true
      && sessionMemory.markdownChecksumMatches === true;
    if (canonicalSessionMemory) {
      activeSummaryValue = sessionMemory.markdownExcerpt || "";
      summarySource = "session_memory";
    }
  }
  const activeSummary = readableGlobalSessionSummary(activeSummaryValue);
  const canonicalSummary = ["model", "session_memory", "session-memory"].includes(summarySource);
  if (activeSummary) groups.push({
    type: canonicalSummary ? "sessionSummary" : "legacySessionSummary",
    items: [{
      itemId: `session-summary:${scopeId}`,
      type: canonicalSummary ? "sessionSummary" : "legacySessionSummary",
      text: activeSummary,
      originalText: activeSummary,
      pinned: false,
      deprecated: false,
      readOnly: true,
      evidence: {
        sessionId: scope === "global_session" ? scopeId.replace(/^session:/, "") : scopeId,
        messageId: compaction.lastCompactedMessageId || "",
        time: compaction.lastCompactedAt || memory?.lastCompactedAt || "",
      },
      raw: { checksum: compaction.activeSummaryChecksum || compaction.summaryChecksum || "", summarySource, canonical: canonicalSummary },
    }],
  });
  const recent = recentSessionMessagesForMemoryCenter(scope, scopeId, memory);
  if (recent.length) groups.push({
    type: "recentMessages",
    items: recent.map((message: any, index: number) => {
      const role = String(message?.role || message?.type || "message").toLowerCase();
      const actor = role === "user" ? "用户" : role === "assistant" ? "Agent" : role === "system" ? "系统" : role;
      return {
        itemId: `recent-message:${message?.id || message?.messageId || message?.uuid || index}`,
        type: "recentMessages",
        text: `${actor}：${messageTextForMemoryCenter(message)}`,
        originalText: messageTextForMemoryCenter(message),
        pinned: false,
        deprecated: false,
        readOnly: true,
        evidence: {
          groupId: message?.groupId || "",
          sessionId: scopeId,
          messageId: message?.id || message?.messageId || message?.uuid || "",
          time: message?.timestamp || message?.createdAt || message?.created_at || "",
        },
        raw: message,
      };
    }),
  });
  if (scope === "global_session") groups.push({
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
      readOnly: true,
      evidence: { sessionId: archive.sessionId, messageId: archive.summary?.sourceMessageIds?.[0] || "", time: archive.from || "" },
      raw: archive,
    })),
  });
}


export function collectItems(scope: MemoryScope, scopeId: string, memory: any) {
  const groupScope = scope === "group" ? parseGroupMemoryScopeId(scopeId, memory) : null;
  const controls = scopeControls(scope, scopeId);
  const groups: any[] = [];
  const exactSessionScope = (scope === "group" && groupScope?.sessionId !== "default") || ["global_session", "project_session", "task_agent"].includes(scope);
  const keys = exactSessionScope ? []
    : scope === "group" ? ["persistentRequirements", "factAnchors", "decisions", "completed", "blocked", "workerLedger", "openQuestions", "nextActions"]
    : scope === "project" ? ["durableMemories"]
    : ["user", "feedback", "authorization", "decisions", "missions", "unresolved", "references"];
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
            groupId: item?.groupId || groupScope?.groupId || "",
            messageId: item?.messageId || item?.source?.messageIds?.[0] || "",
            taskId: item?.taskId || item?.source?.taskId || "",
            sessionId: item?.source?.sessionId || groupScope?.sessionId || "",
            missionId: item?.source?.missionId || "",
            time: item?.updatedAt || item?.time || item?.timestamp || item?.source?.timestamp || "",
          },
          raw: item,
        };
      }),
    });
  }
  appendSessionContinuityItems(groups, scope, scopeId, memory);
  return groups;
}


export function getMemoryCenterScope(scope: MemoryScope, scopeId: string) {
  const file = scopeFile(scope, scopeId);
  let virtualGroupMemory: any = null;
  if (scope === "group" && file && !fs.existsSync(file)) {
    const exact = parseGroupMemoryScopeId(scopeId);
    try {
      const session = (require("../collaboration/storage").listGroupChatSessions(exact.groupId).sessions || [])
        .find((item: any) => String(item.id || "") === exact.sessionId);
      if (session) virtualGroupMemory = { groupId: exact.groupId, groupSessionId: exact.sessionId, compaction: {}, virtualSession: true };
    } catch {}
  }
  if ((!file || !fs.existsSync(file)) && !virtualGroupMemory) throw new Error("记忆不存在");
  let rawMemory: any;
  if (scope === "global") rawMemory = require("../../agents/global/memory").loadGlobalAgentMemory({ recover: false });
  else if (scope === "global_session") {
    const globalMemory = require("../../agents/global/memory").loadGlobalAgentMemory({ recover: false });
    const sessionId = scopeId.replace(/^session:/, "");
    const session = (globalMemory.sessions || []).find((item: any) => String(item.sessionId) === sessionId);
    if (!session) throw new Error("全局会话不存在");
    rawMemory = { ...session, archives: (globalMemory.archives || []).filter((item: any) => String(item.sessionId) === sessionId), updatedAt: session.transcriptUpdatedAt || session.lastCompactedAt || "" };
  } else if (scope === "task_agent") {
    const store = readMemoryFile(file);
    const session = (store?.sessions || []).find((item: any) => String(item.id) === scopeId);
    if (!session) throw new Error("任务 Agent 会话不存在");
    rawMemory = { ...session, compaction: session.compaction || { latestProviderUsage: session.providerContextUsageBaseline, consecutiveFailures: session.finalDispatchReactiveCompactCircuitBreaker?.consecutive_failures || 0 } };
  } else rawMemory = virtualGroupMemory || readMemoryFile(file);
  if (!rawMemory) throw new Error("记忆文件无法读取");
  const policy = scope === "global" || scope === "global_session" ? require("../../agents/global/memory").getGlobalAgentMemoryPolicy() : null;
  const groupScope = scope === "group" ? parseGroupMemoryScopeId(scopeId, rawMemory) : null;
  return {
    scope, id: scopeId, file, backupExists: fs.existsSync(`${file}.bak`),
    groupId: groupScope?.groupId || "",
    groupSessionId: groupScope?.sessionId || "",
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
  if (input.scope === "global" || input.missionId || (input.sessionId && !input.groupId)) {
    const { getGlobalMemoryEvidence } = require("../../agents/global/memory");
    return getGlobalMemoryEvidence(input);
  }
  const groupIds = input.groupId ? [input.groupId] : listJsonFiles(GROUP_MESSAGES_DIR).map(file => path.basename(file, ".json"));
  const matches: any[] = [];
  for (const groupId of groupIds) {
    let messages: any[] = [];
    if (input.sessionId) {
      try { messages = require("../collaboration/storage").getGroupMessages(groupId, input.sessionId); } catch {}
    } else {
      messages = readJson(path.join(GROUP_MESSAGES_DIR, `${groupId}.json`), []);
    }
    for (const message of Array.isArray(messages) ? messages : []) {
      if (input.messageId && String(message.id || message.uuid || "") !== input.messageId) continue;
      if (input.taskId && String(message.task_id || message.taskId || "") !== input.taskId) continue;
      matches.push({ groupId, sessionId: input.sessionId || message.group_session_id || message.groupSessionId || "default", messageId: message.id || message.uuid || "", role: message.role || "", agent: message.agent || message.target || "", content: message.content || message.delivery_summary?.headline || "", timestamp: message.timestamp || "", taskId: message.task_id || message.taskId || "", raw: message });
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
  const audit = appendAudit({ type: "memory_rollback", action: "rollback", scope, scopeId, actor, reason, backup, snapshot, restoredHash: hash(backupData, 24) });
  return { restored: true, snapshot, audit, memory: readMemoryFile(file) };
}


export function recordMemoryOperation(input: any) {
  return appendAudit({ type: "memory_operation", ...input });
}


export function memoryCenterExactGroupSessionScope(scopeId: any) {
  const parsed = parseGroupMemoryScopeId(String(scopeId || ""));
  if (!parsed.groupId || !/^gcs_[a-zA-Z0-9._-]+$/.test(parsed.sessionId)) throw new Error("An exact group::gcs_* session scope is required");
  return { ...parsed, typedScopeId: `${parsed.groupId}--${parsed.sessionId}` };
}
