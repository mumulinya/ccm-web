// Behavior-freeze split from group-orchestrator-coded.ts (part 1/5).
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
import { withFileLock, writeJsonAtomic } from "../../core/atomic-json-file";
import { getConfigInfo, recordMetric } from "../../core/db";
import { isCredentialReference, protectCredential, resolveCredential } from "../../core/credential-store";
import {
  buildWorkerContextPacket,
  compactWorkerContextMemoryForRetry,
  refreshWorkerContextPacketUsage,
  renderWorkerContextPacket,
} from "../../agents/runtime-kernel";
import {
  callAnthropicCompatibleChat,
  callAnthropicCompatibleJson,
  callOpenAiCompatibleChat,
  callOpenAiCompatibleJson,
  extractJsonObject,
  shouldUseAnthropic,
  type LlmTokenUsage,
} from "./group-orchestrator-llm-client";
import {
  getCollectedOutputAgent,
  parseTaskNotificationsFromText,
} from "./agent-notifications";
import {
  buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext,
  buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext,
  inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth,
  buildGroupTypedMemoryPressureRecallUsageProjectSummary,
  buildGroupTypedMemoryPressureRecallUsageSummary,
  buildPressureProvenancePreDispatchComplianceDispatchPolicy,
  distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory,
  distillPressureProvenancePreDispatchComplianceToTypedMemory,
  distillProviderDispatchOverrideFollowupToTypedMemory,
  distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory,
  distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory,
  distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory,
  distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory,
  distillProviderSwitchExecutionToTypedMemory,
  distillProviderReproofReceiptConsumptionToTypedMemory,
  getOrRefreshGlobalProviderDispatchReliabilitySnapshot,
  readGlobalProviderDispatchReliabilitySnapshot,
  getGroupTypedMemoryDir,
  getGroupTypedMemoryPressureRecallUsageLedgerFile,
  recordGroupTypedMemoryPressureRecallUsageLedger,
} from "./group-memory-index";
import { resolveTrustedModelContextCapacity } from "./model-capability-cache";
import { buildRoleSkillPrompt } from "../../skills/role-skills";
import {
  WORKFLOW_DECISION_GUIDANCE,
  normalizeWorkflowDecision,
  type WorkflowDecision,
} from "../../agents/workflow-decision";
import {
  claimGroupReactiveCompactRetry,
  completeGroupReactiveCompactRetry,
} from "./group-reactive-compact-retry-ownership";
import { recordGroupPromptCacheUsage } from "./group-prompt-cache-break-detection";
import {
  COORDINATOR_PROJECT,
  DEFAULT_GROUP_ORCHESTRATOR,
  CCM_DIR,
  loadOrchestratorConfig,
  buildGroupMainAgentBoundary,
} from "./group-orchestrator-config";

import {
  BROAD_HINTS,
  GROUP_MEMORY_REPLAY_REPAIR_TIMELINE_BINDINGS_DIR,
  analyzeRequirement,
  buildCoordinatorPlan,
  buildVisibleAssignmentLine,
  containsAny,
  formatRequirementUnderstanding,
  getCoordinatorMember,
  getRoutableMembers,
  inferCoordinatorStrategy,
  isExplicitExecutionRequest,
  isSimpleMessage,
  memberKind,
  normalizeGroupOrchestrator,
  routeMembers,
} from "./group-orchestrator-routing";
import {
  buildCodedCoordinatorNotificationRows,
  compactText,
} from "./group-orchestrator-prompts";

import {
  buildWorkerContextPacketForAssignment,
  normalizeWorkerContextPtlEmergencyHintForCoordinator,
} from "./group-orchestrator-coded-part-02";

import {
  buildProviderSwitchDecisionReceiptForCoordinator,
  buildWorkerContextPreDispatchGateForCoordinator,
  buildWorkerContextProviderDispatchDecisionForCoordinator,
  maybeRetryWorkerContextPacketCompactionForCoordinator,
  normalizePostCompactReceiptMemoryUsageRepairCompletionPreservationForCoordinator,
  normalizeProviderRankingProvenancePreservationForCoordinator,
  providerSwitchRequestForAssignmentForCoordinator,
  recordWorkerContextPacketAssignmentBindingForCoordinator,
} from "./group-orchestrator-coded-part-03";

import {
  findReplayRepairDispatchBriefForAssignment,
  recordReplayRepairDispatchBriefAssignmentBinding,
} from "./group-orchestrator-coded-part-05";

export const DOCUMENT_FINDING_PATTERN = /接口|api|endpoint|路径|字段|入参|出参|参数|返回|状态|流转|验收|权限|鉴权|页面|按钮|流程|规则|错误码|PRD|prd|需求|文档|acceptance|schema|GET\s+|POST\s+|PUT\s+|PATCH\s+|DELETE\s+|\/api\//i;

export function extractDocumentFindingsFromText(value: any, sourceLabel = "", limit = 8) {
  const text = String(value || "").replace(/\r/g, "");
  if (!text.trim()) return [];
  const lines = text
    .split("\n")
    .map(line => line.replace(/^\s*[-*]\s+/, "").trim())
    .filter(Boolean);
  const findings: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    if (!DOCUMENT_FINDING_PATTERN.test(line)) continue;
    const compacted = compactText(line.replace(/\s*\|\s*/g, " | "), 220);
    const finding = sourceLabel ? `${sourceLabel}: ${compacted}` : compacted;
    const key = finding.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    findings.push(finding);
    if (findings.length >= limit) break;
  }
  return findings;
}

export function getLazyRagQueryKnowledgeBase(): null | ((query: string, limit?: number, filterTags?: string[]) => string) {
  try {
    // 避免 group-orchestrator.ts 与 rag.ts 顶层循环 import；运行时懒加载即可。
    const mod = require("../knowledge/rag");
    return typeof mod.queryKnowledgeBase === "function" ? mod.queryKnowledgeBase : null;
  } catch {
    return null;
  }
}

export function normalizeRagTag(value: any) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.startsWith("#") ? text : `#${text}`;
}

export function buildGroupRagTags(group: any) {
  const normalized = normalizeGroupOrchestrator(group);
  const members = getRoutableMembers(normalized);
  return Array.from(new Set([
    normalizeRagTag("group-chat"),
    normalizeRagTag(normalized.id),
    normalizeRagTag(normalized.name),
    normalized.id ? normalizeRagTag(`group:${normalized.id}`) : "",
    ...members.map((member: any) => normalizeRagTag(member.project)),
    ...members.map((member: any) => normalizeRagTag(`project:${member.project}`)),
  ].filter(Boolean)));
}

export function extractRagCitations(text: string) {
  const citations = new Set<string>();
  for (const match of String(text || "").matchAll(/来源文件:\s*([^\s)]+(?:#\d+)?)/g)) {
    if (match[1]) citations.add(match[1]);
  }
  return Array.from(citations).slice(0, 8);
}

export function buildGroupRagQuery(group: any, input: { message?: string; context?: string; sharedFilesContext?: string }) {
  const members = getRoutableMembers(group).map((member: any) => member.project).filter(Boolean).join(" ");
  return [
    input.message || "",
    input.sharedFilesContext || "",
    members ? `群聊项目：${members}` : "",
  ].filter(Boolean).join("\n").slice(0, 4000);
}

export function buildGroupRagContext(group: any, input: { message?: string; context?: string; sharedFilesContext?: string }) {
  const queryKnowledgeBase = getLazyRagQueryKnowledgeBase();
  if (!queryKnowledgeBase || !String(input.message || "").trim()) return { context: "", citations: [], scoped: false };
  const query = buildGroupRagQuery(group, input);
  const tags = buildGroupRagTags(group);
  let scoped = "";
  try {
    scoped = tags.length ? queryKnowledgeBase(query, 4, tags) : "";
  } catch {}
  let general = "";
  if (!scoped) {
    try { general = queryKnowledgeBase(query, 3); } catch {}
  }
  const matched = scoped || general;
  if (!matched) return { context: "", citations: [], scoped: false };
  const citations = extractRagCitations(matched);
  return {
    context: [
      `检索方式：${scoped ? "群聊/项目标签优先" : "全局兜底"}`,
      citations.length ? `引用：${citations.join("、")}` : "",
      "",
      matched,
    ].filter(Boolean).join("\n"),
    citations,
    scoped: !!scoped,
  };
}

export function withGroupRagContext<T extends { group: any; message?: string; context?: string; sharedFilesContext?: string; ragContext?: string; ragCitations?: string[]; ragScoped?: boolean }>(input: T): T {
  if (input.ragContext !== undefined) return input;
  const rag = buildGroupRagContext(input.group, input);
  return {
    ...input,
    ragContext: rag.context,
    ragCitations: rag.citations,
    ragScoped: rag.scoped,
  };
}

export function extractCodedDocumentFindings(input: { message?: string; context?: string; sharedFilesContext?: string; ragContext?: string }) {
  const findings = [
    ...extractDocumentFindingsFromText(input.message, "用户需求", 4),
    ...extractDocumentFindingsFromText(input.context, "群聊上下文", 4),
    ...extractDocumentFindingsFromText(input.sharedFilesContext, "共享文档", 8),
    ...extractDocumentFindingsFromText(input.ragContext, "知识库", 8),
  ];
  const seen = new Set<string>();
  return findings.filter(item => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);
}

export function mergeDocumentFindings(...groups: any[]) {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const group of groups) {
    const values = Array.isArray(group) ? group : [];
    for (const value of values) {
      const item = String(value || "").trim();
      if (!item) continue;
      const key = item.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
      if (merged.length >= 12) return merged;
    }
  }
  return merged;
}

export function buildDocumentAwareAnalysis(group: any, input: { message?: string; context?: string; sharedFilesContext?: string; ragContext?: string; ragCitations?: string[]; ragScoped?: boolean }) {
  const documentContext = [input.context || "", input.sharedFilesContext || "", input.ragContext || ""].filter(Boolean).join("\n");
  const baseAnalysis = analyzeRequirement(group, input.message || "", documentContext);
  const documentFindings = extractCodedDocumentFindings(input);
  const provisionalAnalysis = {
    ...baseAnalysis,
    documentFindings,
    ragContext: input.ragContext ? {
      citations: Array.isArray(input.ragCitations) ? input.ragCitations : extractRagCitations(input.ragContext),
      scoped: !!input.ragScoped,
      injected: true,
    } : null,
  };
  return {
    ...baseAnalysis,
    documentFindings,
    ragContext: provisionalAnalysis.ragContext,
    coordinationStrategy: inferCoordinatorStrategy(provisionalAnalysis, Array.isArray(baseAnalysis.domains) ? baseAnalysis.domains.length : 0),
    constraints: [
      ...(baseAnalysis.constraints || []),
      documentFindings.length ? "需要按业务/接口文档中的字段、规则和验收点执行" : "",
    ].filter(Boolean),
    needsCoordination: baseAnalysis.needsCoordination || documentFindings.length > 0,
    confidence: documentFindings.length ? Math.max(baseAnalysis.confidence || 0, 0.72) : baseAnalysis.confidence,
  };
}

export function buildCoordinatorPlanText(plan: any) {
  if (!plan?.phases?.length) return "";
  const lines = ["主 Agent 计划："];
  for (const phase of plan.phases) lines.push(`- ${phase}`);
  if (plan.missingInfo?.length) lines.push(`- 已识别缺口：${plan.missingInfo.join("；")}`);
  return lines.join("\n");
}

export function buildSelfContainedWorkerTask(project: string, rawTask: string, analysis: any, options: any = {}) {
  const task = String(rawTask || "").trim();
  const reason = String(options.reason || "").trim();
  const dependsOn = String(options.dependsOn || "").trim();
  const documentFindings = Array.isArray(analysis?.documentFindings) ? analysis.documentFindings.filter(Boolean) : [];
  const constraints = Array.isArray(analysis?.constraints) ? analysis.constraints.filter(Boolean) : [];
  const missingInfo = Array.isArray(analysis?.missingInfo) ? analysis.missingInfo.filter(Boolean) : [];
  const deliverables = Array.isArray(analysis?.deliverables) && analysis.deliverables.length
    ? analysis.deliverables
    : ["结论、实际动作、文件变更和验证记录"];
  const coordinationStrategy = String(options.coordinationStrategy || analysis?.coordinationStrategy || inferCoordinatorStrategy(analysis, 1));

  const alreadyStructured = /主 Agent 工作单|需求理解|交付物|验证要求|CCM_AGENT_RECEIPT/i.test(task);
  if (alreadyStructured) return task;
  const workerContextPacket = buildWorkerContextPacket({
    group: options.group || null,
    project,
    task: task || analysis?.raw || "根据主 Agent 的需求理解完成本项目相关工作。",
    analysis,
    traceId: options.traceId || options.trace_id || "",
    taskId: options.taskId || options.task_id || "",
    dependencies: dependsOn ? [{ project: dependsOn, reason: "前置依赖" }] : [],
    contractInjections: Array.isArray(options.contractInjections) ? options.contractInjections : [],
    memory: options.memory || null,
    verification: options.verification || null,
  });

  const lines = [
    `主 Agent 工作单：${project}`,
    renderWorkerContextPacket(workerContextPacket),
    "",
    `- 需求理解：${analysis?.summary || compactText(analysis?.raw || task, 260)}`,
    `- 你的职责：只处理 ${project} 项目职责范围内的代码、配置、文档或验证；不要越权修改其他项目。`,
    reason ? `- 派发原因：${reason}` : "",
    dependsOn ? `- 依赖关系：先参考 ${dependsOn} 的结论；如果前置结果未到，请说明等待项或可先做的独立检查。` : "",
    coordinationStrategy === "research_synthesis_implementation_verification"
      ? "- 协调协议：按 Claude Code Coordinator/Worker 思路执行。主 Agent 已先理解并计划；你负责本项目 Research/Implementation/Verification，把事实和证据交回主 Agent 综合验收。不要把理解责任再推给其他 Agent。"
      : "- 协调协议：这是主 Agent 派给你的自包含工作单；直接按本项目职责执行并提交证据。",
    `- 本次任务：${task || analysis?.raw || "根据主 Agent 的需求理解完成本项目相关工作。"}`,
    documentFindings.length ? `- 文档依据/验收关注：${documentFindings.slice(0, 6).map((item: any) => compactText(String(item), 180)).join("；")}` : "",
    constraints.length ? `- 用户约束：${constraints.join("；")}` : "",
    missingInfo.length ? `- 已知缺口/风险：${missingInfo.join("；")}；能在项目内确认的先确认，不能确认的写入 blockers/needs。` : "",
    `- 交付物：${deliverables.join("；")}`,
    "- 禁止空泛回复：不要只写“按文档实现”“根据前置结果处理”。必须说明你实际检查了什么、修改了什么、验证了什么，或为什么被阻塞。",
    "- 验证要求：运行与你改动范围匹配的最小必要验证；未运行的验证必须明确写成建议，不能伪造成已执行。",
    "- 回执要求：最后必须追加 CCM_AGENT_RECEIPT，写明 status、summary、actions、filesChanged、verification、blockers、needs。",
  ].filter(Boolean);
  return lines.join("\n");
}

export function inferCodedExecutionPlan(message: string, analysis: any, routed: any[]) {
  const documentText = Array.isArray(analysis?.documentFindings) ? analysis.documentFindings.join("\n") : "";
  const text = [
    message || analysis?.raw || "",
    analysis?.contextSignal || "",
    documentText,
  ].filter(Boolean).join("\n").toLowerCase();
  const hasBackend = (routed || []).some((item: any) => memberKind(item.member) === "backend");
  const hasFrontend = (routed || []).some((item: any) => memberKind(item.member) === "frontend");
  const needsBackendFirst = hasBackend && hasFrontend && /接口|api|字段|契约|联调|对接|入参|出参|endpoint|schema|后端.*前端|前端.*后端/i.test(text);
  const needsSequential = !needsBackendFirst
    && routed.length > 1
    && /先.+再|然后|依赖|步骤|流程|迁移|分阶段|串行|sequential/i.test(text);
  const executionOrder = needsBackendFirst ? "backend_first" : needsSequential ? "sequential" : "parallel";
  const firstBackend = needsBackendFirst
    ? routed.find((item: any) => memberKind(item.member) === "backend")?.member?.project || ""
    : "";
  const plannedRouted = (routed || []).map((item: any) => ({
    ...item,
    dependsOn: item.dependsOn || (firstBackend && memberKind(item.member) === "frontend" ? firstBackend : ""),
    reason: item.reason || (needsBackendFirst && memberKind(item.member) === "frontend"
      ? `前端对接依赖 ${firstBackend} 先确认接口契约`
      : needsBackendFirst && memberKind(item.member) === "backend"
        ? "接口/字段/联调类需求需要先确认后端契约"
        : needsSequential
          ? "该需求存在步骤或依赖关系，按顺序推进"
          : "规则主 Agent 根据需求范围和项目职责派发"),
  }));
  return { executionOrder, routed: plannedRouted };
}

export function buildAssignment(member: any, task: string, reason = "", dependsOn = "", options: any = {}) {
  const groupId = String(options.group?.id || options.groupId || options.group_id || "").trim();
  const groupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
  const project = String(member?.project || "").trim();
  const agentType = String(member?.agentType || member?.agent_type || member?.agent || member?.executor || member?.runner || options.agentType || options.agent_type || "unknown").trim() || "unknown";
  const providerDispatchOverride = member?.providerDispatchOverride
    || member?.provider_dispatch_override
    || member?.pressureProvenanceProviderDispatchOverride
    || member?.pressure_provenance_provider_dispatch_override
    || options.providerDispatchOverride
    || options.provider_dispatch_override
    || options.pressureProvenanceProviderDispatchOverride
    || options.pressure_provenance_provider_dispatch_override
    || null;
  const taskText = String(task || "").trim();
  const taskFingerprint = compactText(taskText, 240).toLowerCase().replace(/[`*_#>\[\]{}()（）【】]+/g, " ").replace(/[，。；、,.;:：\-—\s]+/g, " ").trim().slice(0, 220);
  const dispatchKey = [groupId || "conversation", "coordinator", project || "unknown", taskFingerprint].filter(Boolean).join("|");
  const baseAssignment: any = {
    project,
    task: taskText,
    reason: String(reason || "").trim(),
    dependsOn: String(dependsOn || "").trim(),
    taskFingerprint,
    dispatchKey,
    assignmentId: [project || "unknown", dispatchKey, "initial", 1].filter(Boolean).join("::"),
    attempt: 1,
    sourceProject: "coordinator",
    scopeId: groupId || "conversation",
    groupSessionId,
    group_session_id: groupSessionId,
    agentType,
    agent_type: agentType,
    provider_dispatch_override: providerDispatchOverride,
    providerDispatchOverride: providerDispatchOverride,
    permissionPlan: options.permissionPlan || options.permission_plan || null,
    permission_plan: options.permissionPlan || options.permission_plan || null,
  };
  const briefMatch = groupId ? findReplayRepairDispatchBriefForAssignment(groupId, baseAssignment) : null;
  const replayRepairDispatchBriefs = briefMatch?.brief ? [{
    brief_id: briefMatch.brief.brief_id || "",
    work_item_id: briefMatch.brief.work_item_id || "",
    source: briefMatch.brief.source || "",
    target_project: briefMatch.brief.target_project || baseAssignment.project,
    proof_entry_id: briefMatch.brief.proof_entry_id || "",
    request_patch_checksum: briefMatch.brief.request_patch_checksum || "",
    worker_context_packet_id: briefMatch.brief.worker_context_packet_id || "",
    worker_context_packet_binding_id: briefMatch.brief.worker_context_packet_binding_id || briefMatch.brief.binding_id || "",
    worker_context_packet_memory_policy_reason: briefMatch.brief.worker_context_packet_memory_policy_reason || "",
    binding_id: briefMatch.brief.binding_id || briefMatch.brief.worker_context_packet_binding_id || "",
    source_assignment_id: briefMatch.brief.assignment_id || "",
    source_dispatch_key: briefMatch.brief.dispatch_key || "",
    provider_reproof_status: briefMatch.brief.provider_reproof_status || "",
    provider_reproof_reason: briefMatch.brief.provider_reproof_reason || "",
    reproof_candidate_id: briefMatch.brief.reproof_candidate_id || "",
    timeline_binding_id: briefMatch.brief.timeline_binding_id || "",
    original_work_item_id: briefMatch.brief.original_work_item_id || "",
    request_telemetry_session_status: briefMatch.brief.request_telemetry_session_status || "",
    request_telemetry_dispatch_status: briefMatch.brief.request_telemetry_dispatch_status || "",
    runner_request_id: briefMatch.brief.runner_request_id || "",
    execution_id: briefMatch.brief.execution_id || "",
    should_create_real_task: false,
  }] : [];
  const initialWorkerContextPacket = buildWorkerContextPacketForAssignment(baseAssignment, dependsOn, replayRepairDispatchBriefs, options);
  const initialPreDispatchGate = buildWorkerContextPreDispatchGateForCoordinator(baseAssignment, initialWorkerContextPacket);
  const retryResult = maybeRetryWorkerContextPacketCompactionForCoordinator(baseAssignment, dependsOn, replayRepairDispatchBriefs, initialWorkerContextPacket, initialPreDispatchGate, options);
  const providerSwitchRequest = providerSwitchRequestForAssignmentForCoordinator(member, project, options);
  const providerSwitchDecisionReceipt = providerSwitchRequest
    ? buildProviderSwitchDecisionReceiptForCoordinator(groupId, {
      ...baseAssignment,
      task: retryResult.task,
      worker_context_packet: retryResult.packet,
      worker_context_pre_dispatch_gate: retryResult.gate,
    }, providerSwitchRequest, options)
    : null;
  const effectiveBaseAssignment = providerSwitchDecisionReceipt?.valid === true
    ? {
      ...baseAssignment,
      original_agent_type: agentType,
      originalAgentType: agentType,
      agentType: providerSwitchDecisionReceipt.new_provider?.agent_type || agentType,
      agent_type: providerSwitchDecisionReceipt.new_provider?.agent_type || agentType,
    }
    : baseAssignment;
  const switchedPacket = providerSwitchDecisionReceipt?.valid === true
    ? buildWorkerContextPacketForAssignment(effectiveBaseAssignment, dependsOn, replayRepairDispatchBriefs, {
      ...options,
      providerSwitchDecisionReceipt,
    })
    : retryResult.packet;
  const switchedGate = providerSwitchDecisionReceipt?.valid === true
    ? buildWorkerContextPreDispatchGateForCoordinator(effectiveBaseAssignment, switchedPacket)
    : retryResult.gate;
  const effectiveRetryResult = providerSwitchDecisionReceipt?.valid === true
    ? maybeRetryWorkerContextPacketCompactionForCoordinator(
      effectiveBaseAssignment,
      dependsOn,
      replayRepairDispatchBriefs,
      switchedPacket,
      switchedGate,
      { ...options, providerSwitchDecisionReceipt }
    )
    : retryResult;
  const workerContextPacket = effectiveRetryResult.packet;
  const preDispatchGate = effectiveRetryResult.gate;
  const providerDispatchDecision = buildWorkerContextProviderDispatchDecisionForCoordinator(effectiveBaseAssignment, workerContextPacket, preDispatchGate);
  const needs = preDispatchGate.dispatch_ready === false
    ? [
      preDispatchGate.provider_dispatch_hold === true ? "先完成 pressure provenance provider repair/recovery，再启动第三方子 Agent 会话" : "",
      preDispatchGate.pressure_status === "over_budget" ? "先压缩 WorkerContextPacket 到预算内，再启动第三方子 Agent 会话" : "",
    ].filter(Boolean)
    : [];
  const assignment: any = {
    ...effectiveBaseAssignment,
    task: effectiveRetryResult.task,
    original_task_hash: effectiveRetryResult.retry ? effectiveRetryResult.retry.original_task_hash : "",
    context_compaction_retry: effectiveRetryResult.retry,
    status: preDispatchGate.dispatch_ready === false ? "blocked" : "pending",
    dispatchReady: preDispatchGate.dispatch_ready !== false,
    dispatch_ready: preDispatchGate.dispatch_ready !== false,
    worker_context_pre_dispatch_gate: preDispatchGate,
    workerContextPreDispatchGate: preDispatchGate,
    blockers: preDispatchGate.dispatch_ready === false ? [preDispatchGate.reason] : [],
    needs,
    worker_context_provider_dispatch_decision: providerDispatchDecision,
    provider_dispatch_decision: providerDispatchDecision,
    provider_switch_decision_receipt: providerSwitchDecisionReceipt,
    providerSwitchDecisionReceipt: providerSwitchDecisionReceipt,
    provider_switch_request: providerSwitchRequest,
    worker_context_packet: workerContextPacket,
  };
  if (groupId) recordWorkerContextPacketAssignmentBindingForCoordinator(groupId, assignment);
  if (briefMatch?.brief) {
    assignment.replay_repair_dispatch_brief = {
      ...replayRepairDispatchBriefs[0],
      match_score: Number(briefMatch.match_score || 0),
      matched_by: Array.isArray(briefMatch.matched_by) ? briefMatch.matched_by : [],
      binding_policy: "attach_when_assignment_matches_ready_replay_repair_dispatch_brief",
    };
    const binding = recordReplayRepairDispatchBriefAssignmentBinding(groupId, assignment, briefMatch);
    if (binding) assignment.replay_repair_dispatch_brief.binding_id = binding.binding_id;
  }
  return assignment;
}

export function buildAssignmentsFromTargets(targets: any[], options: any = {}) {
  return (targets || [])
    .map((item: any) => buildAssignment(item.member, item.task, item.reason, item.dependsOn, {
      ...options,
      providerSwitchRequest: item.providerSwitchRequest || item.provider_switch_request || options.providerSwitchRequest || options.provider_switch_request || null,
      permissionPlan: item.permissionPlan || item.permission_plan || null,
    }))
    .filter((item: any) => item.project && item.task);
}

export function buildDispatchPolicy(
  action: string,
  reason: string,
  analysis: any,
  options: { requiresConfirmation?: boolean; risk?: string; nextStep?: string } = {}
) {
  return {
    action,
    reason: reason || "",
    requiresConfirmation: !!options.requiresConfirmation,
    risk: options.risk || "",
    nextStep: options.nextStep || "",
    confidence: typeof analysis?.confidence === "number" ? analysis.confidence : 0,
  };
}

export function isBroadDevelopmentRequest(message: string, analysis: any = {}) {
  const text = String(message || analysis?.raw || "").toLowerCase();
  return !!analysis?.needsCoordination
    && ["implementation", "planning", "bugfix"].includes(String(analysis?.intent || ""))
    && (containsAny(text, BROAD_HINTS) || /业务|需求|文档|prd|实现|开发|功能|模块/i.test(String(message || analysis?.raw || "")));
}

export function inferCodedDispatchPolicy(group: any, message: string, analysis: any, targets: any[]) {
  if (isSimpleMessage(message) || analysis.intent === "greeting") {
    return buildDispatchPolicy("direct_answer", "简单寒暄或确认消息，不需要调用项目 Agent。", analysis, {
      nextStep: "直接回复用户",
    });
  }

  if (!isExplicitExecutionRequest(message)) {
    return buildDispatchPolicy("direct_answer", "用户没有要求执行或修改，主 Agent 直接回答，不创建开发任务。", analysis, {
      nextStep: "直接回答用户",
    });
  }

  if (getRoutableMembers(group).length === 0) {
    return buildDispatchPolicy("hold", "当前群聊没有可分派的项目 Agent。", analysis, {
      risk: "无法执行项目级排查或修改",
      nextStep: "请先添加群聊成员",
    });
  }

  const broadDevelopmentRequest = isBroadDevelopmentRequest(message, analysis);
  if (targets.length === 0 || (analysis.missingInfo?.length && analysis.confidence < 0.72 && !broadDevelopmentRequest)) {
    return buildDispatchPolicy("ask_user", analysis.missingInfo?.[0] || "需求范围不够明确，先问用户补充关键信息。", analysis, {
      risk: "信息不足时派发会导致子 Agent 空转或误改",
      nextStep: "向用户追问一个关键问题",
    });
  }

  const risky = /删除|清空|重置|迁移|生产|线上|支付|权限|密钥|token|数据库|drop|delete|reset/i.test(message);
  return buildDispatchPolicy("delegate", broadDevelopmentRequest
    ? "业务开发需求需要项目 Agent 先按职责判断并落地处理。"
    : targets.length > 1 ? "需要多个项目 Agent 协作处理。" : "需要项目 Agent 查看代码或项目上下文。", analysis, {
    requiresConfirmation: risky,
    risk: risky ? "包含高风险操作，建议用户确认后再执行具体修改。" : (broadDevelopmentRequest && analysis.missingInfo?.length ? analysis.missingInfo.join("；") : ""),
    nextStep: risky ? "先展示派发计划并等待确认" : "立即派发给对应子 Agent",
  });
}

export function normalizeDispatchPolicy(parsed: any, analysis: any, targets: any[]) {
  const rawAction = String(parsed?.dispatchPolicy?.action || parsed?.dispatchAction || "").trim();
  const allowed = new Set(["direct_answer", "ask_user", "delegate", "hold"]);
  const parsedRequiresConfirmation = !!(parsed?.dispatchPolicy?.requiresConfirmation || parsed?.requiresConfirmation);
  const action = allowed.has(rawAction)
    ? rawAction
    : targets.length > 0 ? "delegate" : analysis.missingInfo?.length ? "ask_user" : "direct_answer";
  const reason = String(parsed?.dispatchPolicy?.reason || parsed?.dispatchReason || "").trim();
  return buildDispatchPolicy(action, reason, analysis, {
    requiresConfirmation: parsedRequiresConfirmation,
    risk: String(parsed?.dispatchPolicy?.risk || parsed?.risk || "").trim(),
    nextStep: String(parsed?.dispatchPolicy?.nextStep || parsed?.nextStep || (action === "delegate" ? "立即派发给对应子 Agent" : "")).trim(),
  });
}

export function runCodedGroupOrchestrator(input: {
  group: any;
  message: string;
  context?: string;
  source?: string;
  sharedFilesContext?: string;
  ragContext?: string;
  ragCitations?: string[];
  ragScoped?: boolean;
  workerContextUsageOptions?: any;
  autoWorkerContextCompactRetry?: boolean;
  workerContextRetryOptions?: any;
  providerSwitchRequests?: any;
  provider_switch_requests?: any;
  groupSessionId?: string;
  group_session_id?: string;
}) {
  const group = normalizeGroupOrchestrator(input.group);
  const coordinator = getCoordinatorMember(group);
  const analysis = buildDocumentAwareAnalysis(group, input);
  const routed = routeMembers(group, input.message, analysis);
  const members = getRoutableMembers(group);

  // 优化1：简单消息直接给出自然回复，不展示结构化分析
  if (isSimpleMessage(input.message)) {
    const memberNames = members.length ? members.map((m: any) => m.project).join("、") : "暂无";
    const dispatchPolicy = inferCodedDispatchPolicy(group, input.message, analysis, []);
    let friendlyReply = "";
    if (analysis.intent === "greeting") {
      friendlyReply = `你好！我是群聊协调者，可以帮你把任务分配给 ${memberNames}。直接说你想做什么就行 😊`;
    } else {
      friendlyReply = `收到！如果有具体需求可以直接说，我会安排 ${memberNames} 来处理。`;
    }
    return {
      agent: coordinator.project,
      delegated: [],
      assignments: [],
      analysis,
      dispatchPolicy,
      content: friendlyReply,
    };
  }

  if (!isExplicitExecutionRequest(input.message)) {
    const memberNames = members.length ? members.map((m: any) => m.project).join("、") : "暂无已绑定项目";
    const projectOverview = members.length
      ? members.map((member: any) => {
        const kind = memberKind(member);
        const role = kind === "frontend" ? "前端/客户端" : kind === "backend" ? "后端/API" : "项目模块";
        return `- ${member.project}：${role}`;
      }).join("\n")
      : "- 当前还没有绑定项目 Agent";
    const dispatchPolicy = inferCodedDispatchPolicy(group, input.message, analysis, []);
    const ragFindings = (Array.isArray(analysis.documentFindings) ? analysis.documentFindings : [])
      .filter((item: string) => /^知识库:/.test(String(item || "")))
      .slice(0, 5);
    const ragCitations = analysis.ragContext?.citations || [];
    const ragAnswer = ragFindings.length
      ? [
        "",
        "我先查了本地知识库，相关参考：",
        ...ragFindings.map((item: string) => `- ${compactText(item.replace(/^知识库:\s*/, ""), 220)}`),
        ragCitations.length ? `引用：${ragCitations.join("、")}` : "",
      ].filter(Boolean).join("\n")
      : "";
    const projectContextFindings = (Array.isArray(analysis.documentFindings) ? analysis.documentFindings : [])
      .filter((item: string) => !/^知识库:/.test(String(item || "")))
      .slice(0, 8);
    const projectContextAnswer = projectContextFindings.length
      ? [
        "",
        "我读取了当前只读项目上下文，关键信息：",
        ...projectContextFindings.map((item: string) => `- ${compactText(String(item).replace(/^共享文档:\s*/, ""), 240)}`),
      ].join("\n")
      : "";
    return {
      agent: coordinator.project,
      delegated: [],
      assignments: [],
      analysis: { ...analysis, needsCoordination: false },
      dispatchPolicy,
      content: `这是一个信息咨询/项目分析，我不会创建开发任务、分派子 Agent 或修改文件。${projectContextAnswer}${ragAnswer}\n\n当前群聊关联项目：${memberNames}\n${projectOverview}\n\n从成员职责和只读上下文看，这是一个由上述项目共同组成的协作开发空间；需要更具体的架构、技术栈、目录或功能说明时，我会优先基于群聊记忆、项目资料和知识库回答。`,
    };
  }

  if (members.length === 0) {
    const dispatchPolicy = inferCodedDispatchPolicy(group, input.message, analysis, []);
    return {
      agent: coordinator.project,
      delegated: [],
      assignments: [],
      analysis,
      dispatchPolicy,
      content: [
        "需求理解：",
        ...formatRequirementUnderstanding(analysis).map(line => `- ${line}`),
        "",
        "判断：当前群聊还没有可分派的项目 Agent。",
        "",
        "当前结论/等待项：请先在群聊成员里添加项目 Agent，然后我再负责协调分配。"
      ].join("\n"),
    };
  }

  if (routed.length === 0) {
    const memberNames = members.map((m: any) => m.project).join("、");
    const question = analysis.missingInfo[0] || "这是前端、后端、联调还是排查任务";
    const dispatchPolicy = inferCodedDispatchPolicy(group, input.message, analysis, routed);
    return {
      agent: coordinator.project,
      delegated: [],
      assignments: [],
      analysis,
      dispatchPolicy,
      content: `我大致理解了你的需求，不过还需要你补充一下：**${question}**\n\n当前可协调成员：${memberNames}`,
    };
  }

  const executionPlan = inferCodedExecutionPlan(input.message, analysis, routed);
  const executionOrder = executionPlan.executionOrder;
  const coordinationStrategy = inferCoordinatorStrategy(analysis, executionPlan.routed.length);
  analysis.coordinationStrategy = coordinationStrategy;
  const plannedRouted = executionPlan.routed.map((item: any) => ({
    ...item,
    task: buildSelfContainedWorkerTask(item.member.project, item.task || input.message, analysis, {
      group,
      reason: item.reason || "规则主 Agent 根据需求范围和项目职责派发",
      dependsOn: item.dependsOn || "",
      coordinationStrategy,
    }),
  }));
  const plan = buildCoordinatorPlan(group, analysis, plannedRouted, executionOrder, coordinationStrategy);
  const delegated = plannedRouted.map(item => item.member.project);
  const assignments = buildAssignmentsFromTargets(plannedRouted, {
    group,
    analysis,
    groupSessionId: input.groupSessionId || input.group_session_id || "",
    workerContextUsageOptions: input.workerContextUsageOptions || null,
    autoWorkerContextCompactRetry: input.autoWorkerContextCompactRetry,
    workerContextRetryOptions: input.workerContextRetryOptions || null,
    providerSwitchRequests: input.providerSwitchRequests || input.provider_switch_requests || null,
  });
  const blockedAssignments = assignments.filter((item: any) => item.worker_context_pre_dispatch_gate?.dispatch_ready === false || item.dispatchReady === false || item.dispatch_ready === false);
  const delegationLines = blockedAssignments.length
    ? assignments.map((item: any) => {
      const gate = item.worker_context_pre_dispatch_gate || {};
      const prefix = gate.dispatch_ready === false ? "派发前暂停" : "可派发";
      return `- ${item.project}：${prefix}；${gate.reason || compactText(item.task || "", 180)}`;
    })
    : plannedRouted.map(item => buildVisibleAssignmentLine(item));
  const dispatchPolicy = inferCodedDispatchPolicy(group, input.message, analysis, plannedRouted);
  const finalDispatchPolicy = blockedAssignments.length
    ? {
      ...dispatchPolicy,
      action: "hold",
      requiresConfirmation: true,
      reason: `WorkerContextPacket 派发前上下文预算阻断：${blockedAssignments.map((item: any) => item.project).join("、")}`,
      risk: "worker_context_packet_over_budget",
      nextStep: "先执行 worker_context_packet_context_usage_repair，重新生成预算内 WorkerContextPacket 后再派发子 Agent",
    }
    : dispatchPolicy;

  return {
    agent: coordinator.project,
    delegated,
    assignments,
    executionOrder,
    coordinationStrategy,
    analysis,
    coordinationPlan: plan,
    dispatchPolicy: finalDispatchPolicy,
    content: [
      blockedAssignments.length
        ? `我已经形成派发计划，但 ${blockedAssignments.map((item: any) => item.project).join("、")} 的 WorkerContextPacket 超出上下文预算，已触发派发前 gate，暂不启动第三方子 Agent 会话。`
        : `好的，这个需求我安排 ${delegated.join("、")} 来处理。`,
      "",
      buildCoordinatorPlanText(plan),
      "",
      ...delegationLines,
      "",
      `等他们回复后我会做汇总 📋`
    ].join("\n"),
  };
}

export function runCoordinatorProtocolSelfTest() {
  return require("./group-orchestrator-protocol-self-tests").runCoordinatorProtocolSelfTest();
}

export function runWorkerContextPreDispatchGateSelfTest() {
  return require("./group-orchestrator-worker-context").runWorkerContextPreDispatchGateSelfTest();
}

export function runWorkerContextCompactionRetrySelfTest() {
  return require("./group-orchestrator-worker-context").runWorkerContextCompactionRetrySelfTest();
}

export function runWorkerContextMemoryFirstCompactionRetrySelfTest() {
  return require("./group-orchestrator-worker-context").runWorkerContextMemoryFirstCompactionRetrySelfTest();
}

export function runWorkerContextPartialCompactionRetrySelfTest() {
  return require("./group-orchestrator-worker-context").runWorkerContextPartialCompactionRetrySelfTest();
}

export function runWorkerContextMetadataPartialCompactionRetrySelfTest() {
  return require("./group-orchestrator-worker-context").runWorkerContextMetadataPartialCompactionRetrySelfTest();
}

export function runWorkerContextMetadataPartialCompactPolicySelfTest() {
  return require("./group-orchestrator-worker-context").runWorkerContextMetadataPartialCompactPolicySelfTest();
}

export function runWorkerContextCompactOutcomeLedgerSelfTest() {
  return require("./group-orchestrator-worker-context").runWorkerContextCompactOutcomeLedgerSelfTest();
}

export function runWorkerContextCompactStrategyMemorySelfTest() {
  return require("./group-orchestrator-worker-context").runWorkerContextCompactStrategyMemorySelfTest();
}

export function runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest() {
  return require("./group-orchestrator-worker-context").runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest();
}

export function runWorkerContextPartialCompactCrossGroupPressureRecallUsageStrategySelfTest() {
  return require("./group-orchestrator-worker-context").runWorkerContextPartialCompactCrossGroupPressureRecallUsageStrategySelfTest();
}

export function runWorkerContextPtlEmergencyDowngradeSelfTest() {
  return require("./group-orchestrator-worker-context").runWorkerContextPtlEmergencyDowngradeSelfTest();
}

export function runWorkerContextCompletionMemoryCompactionPreservationSelfTest() {
  return require("./group-orchestrator-worker-context").runWorkerContextCompletionMemoryCompactionPreservationSelfTest();
}

export function runWorkerContextIgnoreMemoryPolicySelfTest() {
  return require("./group-orchestrator-worker-context").runWorkerContextIgnoreMemoryPolicySelfTest();
}

export function runWorkerContextPressureProvenanceProviderDispatchGateSelfTest() {
  return require("./group-orchestrator-worker-context").runWorkerContextPressureProvenanceProviderDispatchGateSelfTest();
}

export function runWorkerContextPressureProvenanceProviderDispatchOverrideFollowupPreDispatchMemorySelfTest() {
  return require("./group-orchestrator-worker-context").runWorkerContextPressureProvenanceProviderDispatchOverrideFollowupPreDispatchMemorySelfTest();
}

export function runWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationSelfTest() {
  return require("./group-orchestrator-worker-context").runWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationSelfTest();
}

export function runWorkerContextProviderDispatchOverrideFollowupReceiptValidationPolicySelfTest() {
  return require("./group-orchestrator-worker-context").runWorkerContextProviderDispatchOverrideFollowupReceiptValidationPolicySelfTest();
}

export function runWorkerContextCrossGroupProviderReliabilityGuidanceSelfTest() {
  return require("./group-orchestrator-worker-context").runWorkerContextCrossGroupProviderReliabilityGuidanceSelfTest();
}

export function runWorkerContextProviderReliabilitySnapshotRankingSelfTest() {
  return require("./group-orchestrator-worker-context").runWorkerContextProviderReliabilitySnapshotRankingSelfTest();
}

export function runWorkerContextProviderSwitchExecutionRankingSelfTest() {
  return require("./group-orchestrator-worker-context").runWorkerContextProviderSwitchExecutionRankingSelfTest();
}

export function runWorkerContextProviderSwitchDecisionReceiptSelfTest() {
  return require("./group-orchestrator-worker-context").runWorkerContextProviderSwitchDecisionReceiptSelfTest();
}

export function runWorkerContextPressureProvenanceProviderDispatchDecisionLedgerSelfTest() {
  return require("./group-orchestrator-worker-context").runWorkerContextPressureProvenanceProviderDispatchDecisionLedgerSelfTest();
}

export function runWorkerContextPressureProvenanceProviderDispatchOverrideReceiptSelfTest() {
  return require("./group-orchestrator-worker-context").runWorkerContextPressureProvenanceProviderDispatchOverrideReceiptSelfTest();
}

export function runWorkerContextPressureProvenanceProviderDispatchOverrideCompletionSelfTest() {
  return require("./group-orchestrator-worker-context").runWorkerContextPressureProvenanceProviderDispatchOverrideCompletionSelfTest();
}

export function buildCodedCoordinatorSummary(group: any, outputs: string[]) {
  const coordinator = getCoordinatorMember(group);
  const rows = buildCodedCoordinatorNotificationRows(outputs || []);
  if (rows.length === 0) return null;
  const gaps = Array.from(new Set(rows.flatMap((item: any) => item.gaps || []))).slice(0, 6);
  const blockedCount = rows.filter((item: any) => (item.gaps || []).length > 0).length;
  const nextAction = gaps.length
    ? `主 Agent 会先处理：${gaps.join("；")}。`
    : "主 Agent 会把这些结果纳入验收，并整理最终总结。";
  const lines = [
    "协调汇总：",
    `- 子 Agent 结果：${rows.length} 条，${blockedCount ? `${blockedCount} 条需要继续处理` : "当前没有发现明显阻塞"}。`,
    ...rows.slice(0, 6).map((item: any) => {
      const summary = item.summary || item.result || `${item.agent} 已返回结果。`;
      const gapText = (item.gaps || []).length ? ` 需要继续：${item.gaps.join("、")}。` : "";
      return `- ${item.agent}：${item.status_label}。${summary}${gapText}`;
    }),
    `- 下一步：${nextAction}`,
  ];

  return {
    agent: coordinator.project,
    content: lines.join("\n"),
    structured_summary: {
      schema: "ccm-coded-coordinator-notification-digest-v1",
      rows,
      gaps,
      next_action: nextAction,
    },
  };
}

export function buildAllowedProjectBrief(group: any) {
  return getRoutableMembers(group).map((m: any) => {
    const kind = memberKind(m);
    return `- ${m.project}: ${kind === "frontend" ? "前端/客户端/UI/交互" : kind === "backend" ? "后端/API/服务/数据" : "通用项目 Agent"}，底层 Agent: ${m.agent || "未指定"}`;
  }).join("\n");
}

export function getReplayRepairWorkItemsFileForCoordinator(groupId: string, groupSessionId = "") {
  return require("./group-orchestrator-replay-repair").getReplayRepairWorkItemsFileForCoordinator(groupId, groupSessionId);
}

export function getReplayRepairDispatchPlansFileForCoordinator(groupId: string, groupSessionId = "") {
  return require("./group-orchestrator-replay-repair").getReplayRepairDispatchPlansFileForCoordinator(groupId, groupSessionId);
}

export function getReplayRepairDispatchBindingsFileForCoordinator(groupId: string) {
  return require("./group-orchestrator-replay-repair").getReplayRepairDispatchBindingsFileForCoordinator(groupId);
}

export function getReplayRepairDispatchTimelineBindingsFileForCoordinator(groupId: string) {
  const safe = String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown";
  return path.join(GROUP_MEMORY_REPLAY_REPAIR_TIMELINE_BINDINGS_DIR, `${safe}.json`);
}

export function normalizeWorkerContextCompactGroupSessionIdForCoordinator(groupSessionId: any = "") {
  const value = String(groupSessionId || "").trim();
  return value.startsWith("gcs_") ? value : "";
}

export function safeWorkerContextCompactScopeSegmentForCoordinator(value: any, fallback = "unknown") {
  return String(value || fallback).replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || fallback;
}

export function getWorkerContextCompactScopedFileForCoordinator(root: string, groupId: string, groupSessionId = "") {
  const safeGroup = safeWorkerContextCompactScopeSegmentForCoordinator(groupId);
  const exactSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(groupSessionId);
  if (!exactSessionId) return path.join(root, `${safeGroup}.json`);
  return path.join(root, safeGroup, `${safeWorkerContextCompactScopeSegmentForCoordinator(exactSessionId, "gcs_unknown")}.json`);
}

export function getWorkerContextCompactHookLedgerFileForCoordinator(groupId: string, groupSessionId = "") {
  return require("./group-orchestrator-worker-context").getWorkerContextCompactHookLedgerFileForCoordinator(groupId, groupSessionId);
}

export function getWorkerContextCompactOutcomeLedgerFileForCoordinator(groupId: string, groupSessionId = "") {
  return require("./group-orchestrator-worker-context").getWorkerContextCompactOutcomeLedgerFileForCoordinator(groupId, groupSessionId);
}

export function getWorkerContextCompactStrategyMemoryFileForCoordinator(groupId: string, groupSessionId = "") {
  return require("./group-orchestrator-worker-context").getWorkerContextCompactStrategyMemoryFileForCoordinator(groupId, groupSessionId);
}

export function getWorkerContextPtlEmergencyHintFileForCoordinator(groupId: string, groupSessionId = "") {
  return require("./group-orchestrator-worker-context").getWorkerContextPtlEmergencyHintFileForCoordinator(groupId, groupSessionId);
}

export function writeJsonAtomicForCoordinator(file: string, value: any) {
  writeJsonAtomic(file, value);
}

export function readJsonWithBackupForCoordinator(file: string, schema: string) {
  for (const [candidate, recoveredFromBackup] of [[file, false], [`${file}.bak`, true]] as const) {
    try {
      const value = JSON.parse(fs.readFileSync(candidate, "utf-8"));
      if (value?.schema === schema) return { value, recoveredFromBackup };
    } catch {}
  }
  return { value: null, recoveredFromBackup: false };
}

export function workerContextCompactScopeIdForCoordinator(groupId: string, groupSessionId = "") {
  const exactSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(groupSessionId);
  return exactSessionId ? `${groupId}::${exactSessionId}` : String(groupId || "");
}

export function hashCoordinator(value: any, length = 16) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex").slice(0, length);
}

export function normalizeWorkerContextCompactHookEntryForCoordinator(raw: any = {}) {
  const ok = raw.ok !== false && String(raw.status || "ok") !== "fail";
  return {
    schema: "ccm-worker-context-compact-hook-entry-v1",
    entry_id: String(raw.entry_id || raw.entryId || `wcch-entry:${hashCoordinator([raw.hook_run_id, raw.phase, raw.assignment_id, raw.retry_packet_id, Date.now(), Math.random()], 14)}`),
    hook_run_id: String(raw.hook_run_id || raw.hookRunId || ""),
    group_id: String(raw.group_id || raw.groupId || ""),
    group_session_id: String(raw.group_session_id || raw.groupSessionId || ""),
    phase: String(raw.phase || "") === "post" ? "post" : "pre",
    ok,
    status: ok ? String(raw.status || "ok") : "fail",
    assignment_id: String(raw.assignment_id || raw.assignmentId || ""),
    dispatch_key: String(raw.dispatch_key || raw.dispatchKey || ""),
    project: String(raw.project || ""),
    from_packet_id: String(raw.from_packet_id || raw.fromPacketId || ""),
    retry_packet_id: String(raw.retry_packet_id || raw.retryPacketId || ""),
    method: String(raw.method || ""),
    memory_first: raw.memory_first === true || raw.memoryFirst === true,
    initial_usage_status: String(raw.initial_usage_status || raw.initialUsageStatus || ""),
    final_usage_status: String(raw.final_usage_status || raw.finalUsageStatus || ""),
    dispatch_ready: raw.dispatch_ready === false || raw.dispatchReady === false ? false : true,
    result_summary: raw.result_summary || raw.resultSummary || {},
    error: compactText(raw.error || "", 500),
    at: String(raw.at || new Date().toISOString()),
  };
}

export function buildWorkerContextCompactHookStatsForCoordinator(entries: any[] = []) {
  const stats: any = {
    total: entries.length,
    ok: 0,
    failed: 0,
    pre: { total: 0, ok: 0, failed: 0 },
    post: { total: 0, ok: 0, failed: 0 },
    latestAt: "",
  };
  for (const entry of entries) {
    const phase = entry.phase === "post" ? "post" : "pre";
    stats[phase].total++;
    if (entry.ok === false || entry.status === "fail") {
      stats.failed++;
      stats[phase].failed++;
    } else {
      stats.ok++;
      stats[phase].ok++;
    }
    if (entry.at && (!stats.latestAt || String(entry.at) > stats.latestAt)) stats.latestAt = String(entry.at);
  }
  return stats;
}

export function readWorkerContextCompactHookLedgerForCoordinator(groupId: string, groupSessionId = "") {
  return require("./group-orchestrator-worker-context").readWorkerContextCompactHookLedgerForCoordinator(groupId, groupSessionId);
}

export function appendWorkerContextCompactHookEntriesForCoordinator(groupId: string, entries: any[] = [], groupSessionId = "") {
  const exactSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(groupSessionId);
  const normalized = entries
    .map((entry: any) => normalizeWorkerContextCompactHookEntryForCoordinator({
      ...entry,
      group_id: entry.group_id || groupId,
      group_session_id: exactSessionId || "",
    }))
    .filter((entry: any) => entry.group_id === groupId && (!exactSessionId || entry.group_session_id === exactSessionId));
  if (!normalized.length) return readWorkerContextCompactHookLedgerForCoordinator(groupId, exactSessionId);
  const file = getWorkerContextCompactHookLedgerFileForCoordinator(groupId, exactSessionId);
  return withFileLock(file, () => {
    const ledger = readWorkerContextCompactHookLedgerForCoordinator(groupId, exactSessionId);
    const nextEntries = [...(ledger.entries || []), ...normalized].slice(-500);
    const next = {
      schema: "ccm-worker-context-compact-hook-ledger-v1",
      version: 1,
      groupId,
      groupSessionId: exactSessionId,
      scopeId: workerContextCompactScopeIdForCoordinator(groupId, exactSessionId),
      file,
      entries: nextEntries,
      stats: buildWorkerContextCompactHookStatsForCoordinator(nextEntries),
      updatedAt: normalized[normalized.length - 1]?.at || new Date().toISOString(),
    };
    writeJsonAtomicForCoordinator(file, next);
    return next;
  });
}

export function normalizeWorkerContextCompactOutcomeEntryForCoordinator(raw: any = {}) {
  const status = String(raw.status || raw.retry_status || raw.retryStatus || "").trim() || (raw.dispatch_ready === false || raw.dispatchReady === false ? "blocked" : "recovered");
  const partialPolicy = raw.partial_compact_policy || raw.partialCompactPolicy || {};
  const ptlHint = raw.ptl_emergency_hint || raw.ptlEmergencyHint || null;
  const providerRankingProvenancePreservation = normalizeProviderRankingProvenancePreservationForCoordinator(
    raw.provider_ranking_provenance_preservation || raw.providerRankingProvenancePreservation || null
  );
  const completionMemoryPreservation = normalizePostCompactReceiptMemoryUsageRepairCompletionPreservationForCoordinator(
    raw.post_compact_receipt_memory_usage_repair_completion_preservation
      || raw.postCompactReceiptMemoryUsageRepairCompletionPreservation
      || null
  );
  const selectedCategories = Array.isArray(partialPolicy.selected_categories || partialPolicy.selectedCategories)
    ? (partialPolicy.selected_categories || partialPolicy.selectedCategories).map((item: any) => String(item || "")).filter(Boolean)
    : [];
  const skippedCategories = Array.isArray(partialPolicy.skipped_categories || partialPolicy.skippedCategories)
    ? (partialPolicy.skipped_categories || partialPolicy.skippedCategories).map((item: any) => String(item || "")).filter(Boolean)
    : [];
  const compactStrategyMemory = partialPolicy.compact_strategy_memory || partialPolicy.compactStrategyMemory || null;
  const pressureRecallUsageBias = partialPolicy.pressure_recall_usage_strategy_bias || partialPolicy.pressureRecallUsageStrategyBias || null;
  const pressureRecallUsageSummary = partialPolicy.pressure_recall_usage_summary || partialPolicy.pressureRecallUsageSummary || null;
  return {
    schema: "ccm-worker-context-compact-outcome-entry-v1",
    outcome_id: String(raw.outcome_id || raw.outcomeId || `wcco:${hashCoordinator([raw.group_id, raw.assignment_id, raw.retry_id, raw.retry_packet_id, raw.at || Date.now()], 14)}`),
    group_id: String(raw.group_id || raw.groupId || ""),
    group_session_id: String(raw.group_session_id || raw.groupSessionId || ""),
    assignment_id: String(raw.assignment_id || raw.assignmentId || ""),
    dispatch_key: String(raw.dispatch_key || raw.dispatchKey || ""),
    project: String(raw.project || ""),
    hook_run_id: String(raw.hook_run_id || raw.hookRunId || ""),
    retry_id: String(raw.retry_id || raw.retryId || ""),
    method: String(raw.method || ""),
    status,
    dispatch_ready: raw.dispatch_ready === false || raw.dispatchReady === false ? false : true,
    from_packet_id: String(raw.from_packet_id || raw.fromPacketId || ""),
    retry_packet_id: String(raw.retry_packet_id || raw.retryPacketId || ""),
    initial_usage_status: String(raw.initial_usage_status || raw.initialUsageStatus || ""),
    final_usage_status: String(raw.final_usage_status || raw.finalUsageStatus || ""),
    from_total_tokens: Number(raw.from_total_tokens || raw.fromTotalTokens || 0),
    retry_total_tokens: Number(raw.retry_total_tokens || raw.retryTotalTokens || 0),
    from_free_tokens: Number(raw.from_free_tokens || raw.fromFreeTokens || 0),
    retry_free_tokens: Number(raw.retry_free_tokens || raw.retryFreeTokens || 0),
    token_delta: Number(raw.token_delta || raw.tokenDelta || 0),
    free_token_delta: Number(raw.free_token_delta || raw.freeTokenDelta || 0),
    memory_first: raw.memory_first === true || raw.memoryFirst === true,
    partial_compact: raw.partial_compact === true || raw.partialCompact === true,
    task_compacted: raw.task_compacted === true || raw.taskCompacted === true,
    task_hash_unchanged: raw.task_hash_unchanged === true || raw.taskHashUnchanged === true,
    partial_compaction_categories: Array.isArray(raw.partial_compaction_categories || raw.partialCompactionCategories)
      ? (raw.partial_compaction_categories || raw.partialCompactionCategories).map((item: any) => String(item || "")).filter(Boolean)
      : [],
    partial_compact_policy: partialPolicy?.schema ? {
      schema: partialPolicy.schema,
      method: partialPolicy.method || "",
      selected_categories: selectedCategories,
      skipped_categories: skippedCategories,
      max_categories: Number(partialPolicy.max_categories || partialPolicy.maxCategories || 0),
      fallback_used: partialPolicy.fallback_used === true || partialPolicy.fallbackUsed === true,
      compact_strategy_memory: compactStrategyMemory?.schema ? {
        schema: String(compactStrategyMemory.schema || ""),
        strategy_id: String(compactStrategyMemory.strategy_id || compactStrategyMemory.strategyId || ""),
        source_ledger_file: String(compactStrategyMemory.source_ledger_file || compactStrategyMemory.sourceLedgerFile || ""),
        sample_count: Number(compactStrategyMemory.sample_count || compactStrategyMemory.sampleCount || 0),
        preferred_categories: Array.isArray(compactStrategyMemory.preferred_categories || compactStrategyMemory.preferredCategories)
          ? (compactStrategyMemory.preferred_categories || compactStrategyMemory.preferredCategories).map((item: any) => String(item || "")).filter(Boolean)
          : [],
        avoid_categories: Array.isArray(compactStrategyMemory.avoid_categories || compactStrategyMemory.avoidCategories)
          ? (compactStrategyMemory.avoid_categories || compactStrategyMemory.avoidCategories).map((item: any) => String(item || "")).filter(Boolean)
          : [],
      } : null,
      pressure_recall_usage_strategy_bias: pressureRecallUsageBias?.schema ? {
        schema: String(pressureRecallUsageBias.schema || ""),
        active: pressureRecallUsageBias.active === true,
        suppressed: pressureRecallUsageBias.suppressed === true,
        stale: pressureRecallUsageBias.stale === true,
        recommendation: String(pressureRecallUsageBias.recommendation || ""),
        trust_score: Number(pressureRecallUsageBias.trust_score || 0),
        category_adjustment_cap: Number(pressureRecallUsageBias.category_adjustment_cap || 0),
        weighted_used_count: Number(pressureRecallUsageBias.weighted_used_count || 0),
        weighted_verified_count: Number(pressureRecallUsageBias.weighted_verified_count || 0),
        weighted_ignored_count: Number(pressureRecallUsageBias.weighted_ignored_count || 0),
        stale_count: Number(pressureRecallUsageBias.stale_count || 0),
        fresh_count: Number(pressureRecallUsageBias.fresh_count || 0),
        summary_ledger_file: String(pressureRecallUsageBias.summary_ledger_file || ""),
      } : null,
      pressure_recall_usage_summary: pressureRecallUsageSummary?.schema ? {
        schema: String(pressureRecallUsageSummary.schema || ""),
        ledger_file: String(pressureRecallUsageSummary.ledger_file || ""),
        target_project: String(pressureRecallUsageSummary.target_project || ""),
        weighted_totals: pressureRecallUsageSummary.weighted_totals || {},
      } : null,
    } : null,
    ptl_emergency_hint: ptlHint?.schema ? normalizeWorkerContextPtlEmergencyHintForCoordinator(
      ptlHint,
      raw.group_id || raw.groupId || "",
      raw.group_session_id || raw.groupSessionId || ""
    ) : null,
    omitted_chars: Number(raw.omitted_chars || raw.omittedChars || 0),
    memory_omitted_chars: Number(raw.memory_omitted_chars || raw.memoryOmittedChars || 0),
    partial_omitted_chars: Number(raw.partial_omitted_chars || raw.partialOmittedChars || 0),
    original_task_hash: String(raw.original_task_hash || raw.originalTaskHash || ""),
    compacted_task_hash: String(raw.compacted_task_hash || raw.compactedTaskHash || ""),
    provider_ranking_provenance_preservation: providerRankingProvenancePreservation,
    provider_ranking_provenance_preserved: providerRankingProvenancePreservation
      ? providerRankingProvenancePreservation.preserved === true
      : raw.provider_ranking_provenance_preserved === true || raw.providerRankingProvenancePreserved === true,
    post_compact_receipt_memory_usage_repair_completion_preservation: completionMemoryPreservation,
    post_compact_receipt_memory_usage_repair_completion_preserved: completionMemoryPreservation
      ? completionMemoryPreservation.preserved === true
      : raw.post_compact_receipt_memory_usage_repair_completion_preserved === true || raw.postCompactReceiptMemoryUsageRepairCompletionPreserved === true,
    source: String(raw.source || "worker_context_packet_compaction_retry"),
    distillation_candidate: raw.distillation_candidate === false || raw.distillationCandidate === false ? false : true,
    at: String(raw.at || new Date().toISOString()),
  };
}

export function buildWorkerContextCompactOutcomeStatsForCoordinator(entries: any[] = []) {
  const recovered = entries.filter((item: any) => item.status === "recovered" || item.dispatch_ready === true);
  const blocked = entries.filter((item: any) => item.status === "blocked" || item.dispatch_ready === false);
  const partialPolicyRows = entries.filter((item: any) => item.partial_compact_policy?.schema === "ccm-worker-context-partial-compact-policy-v1");
  const selectedCounts: Record<string, number> = {};
  for (const entry of partialPolicyRows) {
    for (const category of entry.partial_compact_policy?.selected_categories || []) {
      selectedCounts[category] = Number(selectedCounts[category] || 0) + 1;
    }
  }
  return {
    total: entries.length,
    recovered: recovered.length,
    blocked: blocked.length,
    memoryFirst: entries.filter((item: any) => item.memory_first === true).length,
    partialCompact: entries.filter((item: any) => item.partial_compact === true).length,
    partialCompactPolicy: partialPolicyRows.length,
    taskCompacted: entries.filter((item: any) => item.task_compacted === true).length,
    taskPreserved: entries.filter((item: any) => item.task_hash_unchanged === true).length,
    providerRankingProvenanceRequired: entries.filter((item: any) => item.provider_ranking_provenance_preservation?.required === true).length,
    providerRankingProvenancePreserved: entries.filter((item: any) => item.provider_ranking_provenance_preservation?.required === true && item.provider_ranking_provenance_preservation?.preserved === true).length,
    completionMemoryPreservationRequired: entries.filter((item: any) => item.post_compact_receipt_memory_usage_repair_completion_preservation?.required === true).length,
    completionMemoryPreserved: entries.filter((item: any) => item.post_compact_receipt_memory_usage_repair_completion_preservation?.required === true && item.post_compact_receipt_memory_usage_repair_completion_preservation?.preserved === true).length,
    totalOmittedChars: entries.reduce((sum, item) => sum + Number(item.omitted_chars || 0), 0),
    partialOmittedChars: entries.reduce((sum, item) => sum + Number(item.partial_omitted_chars || 0), 0),
    selectedCategoryCounts: selectedCounts,
    latestAt: entries.reduce((latest: string, item: any) => item.at && (!latest || item.at > latest) ? item.at : latest, ""),
  };
}

export const WORKER_CONTEXT_METADATA_COMPACT_CATEGORIES = [
  "constraints_and_documents",
  "contract_injections",
  "dependencies",
];
