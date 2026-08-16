// group-orchestrator-coded.ts — merged from 5 part files (behavior-freeze merge).

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
import {
  withFileLock,
  writeJsonAtomic,
} from "../../core/atomic-json-file";
import {
  getConfigInfo,
  recordMetric,
} from "../../core/db";
import {
  isCredentialReference,
  protectCredential,
  resolveCredential,
} from "../../core/credential-store";
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
import {
  resolveTrustedModelContextCapacity,
} from "./model-capability-cache";
import {
  buildRoleSkillPrompt,
} from "../../skills/role-skills";
import {
  WORKFLOW_DECISION_GUIDANCE,
  normalizeWorkflowDecision,
  type WorkflowDecision,
} from "../../agents/workflow-decision";
import { parsedRequestsUserClarification } from "../../agents/clarification-turn";
import {
  claimGroupReactiveCompactRetry,
  completeGroupReactiveCompactRetry,
} from "./group-reactive-compact-retry-ownership";
import {
  recordGroupPromptCacheUsage,
} from "./group-prompt-cache-break-detection";
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

// ===== merged from group-orchestrator-coded-part-01.ts =====

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
  // Production retrieval is asynchronous and scope-bound in
  // runGroupOrchestratorCore. The coded path must never use tag-only lookup.
  return { context: "", citations: [], scoped: false };
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
  if (plan?.architecture?.goal) lines.push(`- 目标：${plan.architecture.goal}`);
  if (Array.isArray(plan?.architecture?.boundaries) && plan.architecture.boundaries.length) {
    lines.push(`- 边界：${plan.architecture.boundaries.join("；")}`);
  }
  if (Array.isArray(plan?.architecture?.dataRelationships) && plan.architecture.dataRelationships.length) {
    lines.push(`- 数据关系：${plan.architecture.dataRelationships.join("；")}`);
  }
  for (const phase of plan.phases) lines.push(`- ${phase}`);
  if (Array.isArray(plan?.architecture?.dependencySteps) && plan.architecture.dependencySteps.length) {
    lines.push("- 执行步骤：");
    for (const step of plan.architecture.dependencySteps) {
      const dependency = Array.isArray(step.dependsOn) && step.dependsOn.length ? `，依赖 ${step.dependsOn.join("、")}` : "";
      lines.push(`  - ${step.title}${step.project ? `（${step.project}${dependency}）` : dependency}`);
    }
  }
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
  const selectedSkillNames = Array.isArray(options.analysis?.workflowDecision?.selectedSkills)
    ? options.analysis.workflowDecision.selectedSkills.map((name: any) => String(name || "").trim()).filter(Boolean).slice(0, 6)
    : [];
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
    selected_skill_names: selectedSkillNames,
    semantic_decision_source: selectedSkillNames.length ? "model" : "none",
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
  options: { requiresConfirmation?: boolean; risk?: string; nextStep?: string; structuredClarificationQuestions?: any[] } = {}
) {
  return {
    action,
    reason: reason || "",
    requiresConfirmation: !!options.requiresConfirmation,
    risk: options.risk || "",
    nextStep: options.nextStep || "",
    structuredClarificationQuestions: Array.isArray(options.structuredClarificationQuestions) ? options.structuredClarificationQuestions.slice(0, 3) : [],
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
  const action = parsedRequestsUserClarification(parsed)
    ? "ask_user"
    : allowed.has(rawAction)
      ? rawAction
      : targets.length > 0 ? "delegate" : analysis.missingInfo?.length ? "ask_user" : "direct_answer";
  const reason = String(parsed?.dispatchPolicy?.reason || parsed?.dispatchReason || "").trim();
  return buildDispatchPolicy(action, reason, analysis, {
    requiresConfirmation: parsedRequiresConfirmation,
    risk: String(parsed?.dispatchPolicy?.risk || parsed?.risk || "").trim(),
    nextStep: String(parsed?.dispatchPolicy?.nextStep || parsed?.nextStep || (action === "delegate" ? "立即派发给对应子 Agent" : "")).trim(),
    structuredClarificationQuestions: parsed?.dispatchPolicy?.structuredClarificationQuestions
      || parsed?.dispatchPolicy?.structured_clarification_questions
      || parsed?.workflowDecision?.structuredClarificationQuestions
      || parsed?.workflow_decision?.structured_clarification_questions
      || [],
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

// ===== merged from group-orchestrator-coded-part-02.ts =====

export function workerContextCompactOutcomeCategoriesForCoordinator(entry: any = {}) {
  const selected = Array.isArray(entry.partial_compact_policy?.selected_categories)
    ? entry.partial_compact_policy.selected_categories
    : [];
  const fallback = Array.isArray(entry.partial_compaction_categories)
    ? entry.partial_compaction_categories
    : [];
  const supported = new Set(WORKER_CONTEXT_METADATA_COMPACT_CATEGORIES);
  return [...new Set([...selected, ...fallback]
    .map((item: any) => String(item || "").trim())
    .filter((item: string) => supported.has(item)))];
}

export function normalizeWorkerContextCompactStrategyMemoryForCoordinator(raw: any = {}, groupId = "", groupSessionId = "") {
  const exactSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(groupSessionId || raw.groupSessionId || raw.group_session_id || "");
  const categories = Array.isArray(raw.categories) ? raw.categories.map((item: any = {}) => ({
    category: String(item.category || ""),
    attempts: Number(item.attempts || 0),
    recovered: Number(item.recovered || 0),
    blocked: Number(item.blocked || 0),
    recovery_rate: Number(item.recovery_rate || 0),
    task_preserved: Number(item.task_preserved || 0),
    task_compacted: Number(item.task_compacted || 0),
    avg_token_delta: Number(item.avg_token_delta || 0),
    avg_free_token_delta: Number(item.avg_free_token_delta || 0),
    avg_partial_omitted_chars: Number(item.avg_partial_omitted_chars || 0),
    strategy_score: Number(item.strategy_score || 0),
    recommendation: String(item.recommendation || "observe"),
    latest_at: String(item.latest_at || ""),
  })).filter((item: any) => item.category) : [];
  return {
    schema: "ccm-worker-context-compact-strategy-memory-v1",
    version: 1,
    strategy_id: String(raw.strategy_id || raw.strategyId || `wccs:${hashCoordinator([groupId || raw.groupId || raw.group_id || "", categories], 14)}`),
    groupId: String(raw.groupId || raw.group_id || groupId || ""),
    groupSessionId: exactSessionId,
    scopeId: workerContextCompactScopeIdForCoordinator(groupId || raw.groupId || raw.group_id || "", exactSessionId),
    file: String(raw.file || ""),
    source_ledger_file: String(raw.source_ledger_file || raw.sourceLedgerFile || ""),
    source_ledger_updated_at: String(raw.source_ledger_updated_at || raw.sourceLedgerUpdatedAt || ""),
    sample_count: Number(raw.sample_count || raw.sampleCount || 0),
    category_count: Number(raw.category_count || raw.categoryCount || categories.length),
    preferred_categories: Array.isArray(raw.preferred_categories || raw.preferredCategories)
      ? (raw.preferred_categories || raw.preferredCategories).map((item: any) => String(item || "")).filter(Boolean)
      : categories.filter((item: any) => item.recommendation === "prefer").map((item: any) => item.category),
    avoid_categories: Array.isArray(raw.avoid_categories || raw.avoidCategories)
      ? (raw.avoid_categories || raw.avoidCategories).map((item: any) => String(item || "")).filter(Boolean)
      : categories.filter((item: any) => item.recommendation === "avoid").map((item: any) => item.category),
    categories,
    generated_at: String(raw.generated_at || raw.generatedAt || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || raw.updated_at || raw.generated_at || raw.generatedAt || new Date().toISOString()),
  };
}

export function buildWorkerContextCompactStrategyMemoryForCoordinator(groupId: string, entries: any[] = [], options: any = {}) {
  const groupSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(options.groupSessionId || options.group_session_id || "");
  const file = getWorkerContextCompactStrategyMemoryFileForCoordinator(groupId, groupSessionId);
  const sourceLedgerFile = String(options.sourceLedgerFile || options.source_ledger_file || getWorkerContextCompactOutcomeLedgerFileForCoordinator(groupId, groupSessionId));
  const sourceLedgerUpdatedAt = String(options.sourceLedgerUpdatedAt || options.source_ledger_updated_at || "");
  const nowIso = String(options.generatedAt || options.generated_at || new Date().toISOString());
  const supported = new Set(WORKER_CONTEXT_METADATA_COMPACT_CATEGORIES);
  const byCategory: Record<string, any> = {};
  let sampleCount = 0;
  for (const entry of entries || []) {
    if (entry?.distillation_candidate === false) continue;
    const categories = workerContextCompactOutcomeCategoriesForCoordinator(entry).filter((category: string) => supported.has(category));
    if (!categories.length) continue;
    sampleCount++;
    for (const category of categories) {
      const row = byCategory[category] || {
        category,
        attempts: 0,
        recovered: 0,
        blocked: 0,
        task_preserved: 0,
        task_compacted: 0,
        total_token_delta: 0,
        total_free_token_delta: 0,
        total_partial_omitted_chars: 0,
        latest_at: "",
      };
      row.attempts += 1;
      if (entry.status === "recovered" || entry.dispatch_ready === true) row.recovered += 1;
      if (entry.status === "blocked" || entry.dispatch_ready === false) row.blocked += 1;
      if (entry.task_hash_unchanged === true) row.task_preserved += 1;
      if (entry.task_compacted === true) row.task_compacted += 1;
      row.total_token_delta += Math.max(0, Number(entry.token_delta || 0));
      row.total_free_token_delta += Math.max(0, Number(entry.free_token_delta || 0));
      row.total_partial_omitted_chars += Math.max(0, Number(entry.partial_omitted_chars || 0));
      if (entry.at && (!row.latest_at || String(entry.at) > row.latest_at)) row.latest_at = String(entry.at);
      byCategory[category] = row;
    }
  }
  const categories = Object.values(byCategory).map((row: any) => {
    const attempts = Math.max(1, Number(row.attempts || 0));
    const recoveryRate = Number(row.recovered || 0) / attempts;
    const taskPreservedRate = Number(row.task_preserved || 0) / attempts;
    const blockedRate = Number(row.blocked || 0) / attempts;
    const avgTokenDelta = Math.round(Number(row.total_token_delta || 0) / attempts);
    const avgFreeTokenDelta = Math.round(Number(row.total_free_token_delta || 0) / attempts);
    const avgPartialOmittedChars = Math.round(Number(row.total_partial_omitted_chars || 0) / attempts);
    const strategyScore = Math.round(
      recoveryRate * 1000
      + Math.min(500, avgFreeTokenDelta / 8)
      + taskPreservedRate * 120
      - blockedRate * 300
      - Number(row.task_compacted || 0) * 35
    );
    const recommendation = Number(row.recovered || 0) > 0 && avgFreeTokenDelta > 0
      ? "prefer"
      : Number(row.attempts || 0) >= 2 && Number(row.recovered || 0) === 0 ? "avoid" : "observe";
    return {
      category: row.category,
      attempts: Number(row.attempts || 0),
      recovered: Number(row.recovered || 0),
      blocked: Number(row.blocked || 0),
      recovery_rate: Math.round(recoveryRate * 1000) / 1000,
      task_preserved: Number(row.task_preserved || 0),
      task_compacted: Number(row.task_compacted || 0),
      avg_token_delta: avgTokenDelta,
      avg_free_token_delta: avgFreeTokenDelta,
      avg_partial_omitted_chars: avgPartialOmittedChars,
      strategy_score: strategyScore,
      recommendation,
      latest_at: row.latest_at || "",
    };
  }).sort((a: any, b: any) =>
    Number(b.strategy_score || 0) - Number(a.strategy_score || 0)
    || Number(b.avg_free_token_delta || 0) - Number(a.avg_free_token_delta || 0)
    || a.category.localeCompare(b.category)
  );
  const preferred = categories
    .filter((item: any) => item.recommendation === "prefer")
    .map((item: any) => item.category);
  const avoid = categories
    .filter((item: any) => item.recommendation === "avoid")
    .map((item: any) => item.category);
  return normalizeWorkerContextCompactStrategyMemoryForCoordinator({
    schema: "ccm-worker-context-compact-strategy-memory-v1",
    version: 1,
    strategy_id: `wccs:${hashCoordinator([groupId, groupSessionId, sourceLedgerUpdatedAt, categories], 14)}`,
    groupId,
    groupSessionId,
    file,
    source_ledger_file: sourceLedgerFile,
    source_ledger_updated_at: sourceLedgerUpdatedAt,
    sample_count: sampleCount,
    category_count: categories.length,
    preferred_categories: preferred.length ? preferred : categories.map((item: any) => item.category),
    avoid_categories: avoid,
    categories,
    generated_at: nowIso,
    updatedAt: nowIso,
  }, groupId, groupSessionId);
}

export function writeWorkerContextCompactStrategyMemoryForCoordinator(groupId: string, entries: any[] = [], options: any = {}) {
  const groupSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(options.groupSessionId || options.group_session_id || "");
  const strategy = buildWorkerContextCompactStrategyMemoryForCoordinator(groupId, entries, options);
  writeJsonAtomicForCoordinator(strategy.file || getWorkerContextCompactStrategyMemoryFileForCoordinator(groupId, groupSessionId), strategy);
  return strategy;
}

export function readWorkerContextCompactStrategyMemoryForCoordinator(groupId: string, groupSessionId = "") {
  return require("./group-orchestrator-worker-context").readWorkerContextCompactStrategyMemoryForCoordinator(groupId, groupSessionId);
}

export function normalizeWorkerContextPtlEmergencyHintForCoordinator(raw: any = {}, groupId = "", groupSessionId = "") {
  const exactSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(groupSessionId || raw.groupSessionId || raw.group_session_id || "");
  const recommendedRetryOptions = raw.recommended_retry_options || raw.recommendedRetryOptions || {};
  return {
    schema: "ccm-worker-context-ptl-emergency-hint-v1",
    version: 1,
    hint_id: String(raw.hint_id || raw.hintId || `wcptl:${hashCoordinator([groupId || raw.groupId || raw.group_id || "", raw.reason || "", raw.generated_at || Date.now()], 14)}`),
    groupId: String(raw.groupId || raw.group_id || groupId || ""),
    groupSessionId: exactSessionId,
    scopeId: workerContextCompactScopeIdForCoordinator(groupId || raw.groupId || raw.group_id || "", exactSessionId),
    file: String(raw.file || getWorkerContextPtlEmergencyHintFileForCoordinator(groupId || raw.groupId || raw.group_id || "", exactSessionId)),
    engaged: raw.engaged === true,
    emergency_level: String(raw.emergency_level || raw.emergencyLevel || (raw.engaged ? "warning" : "none")),
    reason: String(raw.reason || ""),
    blocked_outcome_count: Number(raw.blocked_outcome_count || raw.blockedOutcomeCount || 0),
    task_compacted_blocked_count: Number(raw.task_compacted_blocked_count || raw.taskCompactedBlockedCount || 0),
    repeated_failed_categories: Array.isArray(raw.repeated_failed_categories || raw.repeatedFailedCategories)
      ? (raw.repeated_failed_categories || raw.repeatedFailedCategories).map((item: any) => String(item || "")).filter(Boolean)
      : [],
    source_ledger_file: String(raw.source_ledger_file || raw.sourceLedgerFile || ""),
    source_strategy_file: String(raw.source_strategy_file || raw.sourceStrategyFile || ""),
    recommended_retry_options: {
      memory: recommendedRetryOptions.memory || recommendedRetryOptions.memoryOptions || {},
      replayRepairDispatchBriefs: recommendedRetryOptions.replayRepairDispatchBriefs || recommendedRetryOptions.replay_repair_dispatch_briefs || {},
      metadata: recommendedRetryOptions.metadata || recommendedRetryOptions.metadataPartialCompact || {},
      maxTaskChars: Number(recommendedRetryOptions.maxTaskChars || recommendedRetryOptions.max_task_chars || 0),
    },
    generated_at: String(raw.generated_at || raw.generatedAt || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || raw.updated_at || raw.generated_at || raw.generatedAt || new Date().toISOString()),
  };
}

export function buildWorkerContextPtlEmergencyHintForCoordinator(groupId: string, entries: any[] = [], strategy: any = {}, options: any = {}) {
  const groupSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(options.groupSessionId || options.group_session_id || strategy?.groupSessionId || "");
  const file = getWorkerContextPtlEmergencyHintFileForCoordinator(groupId, groupSessionId);
  const sourceLedgerFile = String(options.sourceLedgerFile || options.source_ledger_file || getWorkerContextCompactOutcomeLedgerFileForCoordinator(groupId, groupSessionId));
  const sourceStrategyFile = String(options.sourceStrategyFile || options.source_strategy_file || strategy?.file || getWorkerContextCompactStrategyMemoryFileForCoordinator(groupId, groupSessionId));
  const nowIso = String(options.generatedAt || options.generated_at || new Date().toISOString());
  const distillable = (entries || []).filter((entry: any) => entry?.distillation_candidate !== false);
  const blocked = distillable.filter((entry: any) => entry.status === "blocked" || entry.dispatch_ready === false);
  const taskCompactedBlocked = blocked.filter((entry: any) => entry.task_compacted === true);
  const repeatedFailedCategories = (Array.isArray(strategy?.categories) ? strategy.categories : [])
    .filter((item: any) =>
      Number(item.attempts || 0) >= 2
      && (Number(item.recovered || 0) === 0 || String(item.recommendation || "") === "avoid")
    )
    .map((item: any) => String(item.category || ""))
    .filter(Boolean);
  const engaged = blocked.length >= 2 || taskCompactedBlocked.length > 0 || repeatedFailedCategories.length > 0;
  const emergencyLevel = taskCompactedBlocked.length > 0 || blocked.length >= 3 ? "critical" : engaged ? "warning" : "none";
  const reasonParts = [
    blocked.length >= 2 ? `blocked_outcomes=${blocked.length}` : "",
    taskCompactedBlocked.length > 0 ? `task_compacted_still_blocked=${taskCompactedBlocked.length}` : "",
    repeatedFailedCategories.length ? `failed_categories=${repeatedFailedCategories.join(",")}` : "",
  ].filter(Boolean);
  return normalizeWorkerContextPtlEmergencyHintForCoordinator({
    schema: "ccm-worker-context-ptl-emergency-hint-v1",
    version: 1,
    hint_id: `wcptl:${hashCoordinator([groupId, groupSessionId, sourceLedgerFile, sourceStrategyFile, blocked.length, taskCompactedBlocked.length, repeatedFailedCategories], 14)}`,
    groupId,
    groupSessionId,
    file,
    engaged,
    emergency_level: emergencyLevel,
    reason: engaged
      ? `WorkerContextPacket repeated compact failure requires PTL emergency downgrade: ${reasonParts.join("; ")}`
      : "WorkerContextPacket compact outcomes do not require PTL emergency downgrade.",
    blocked_outcome_count: blocked.length,
    task_compacted_blocked_count: taskCompactedBlocked.length,
    repeated_failed_categories: repeatedFailedCategories,
    source_ledger_file: sourceLedgerFile,
    source_strategy_file: sourceStrategyFile,
    recommended_retry_options: {
      memory: {
        maxRenderedChars: emergencyLevel === "critical" ? 900 : 1400,
        maxJsonChars: emergencyLevel === "critical" ? 700 : 1000,
        maxRecallItems: emergencyLevel === "critical" ? 3 : 5,
      },
      replayRepairDispatchBriefs: {
        maxBriefs: emergencyLevel === "critical" ? 4 : 6,
        maxStringChars: emergencyLevel === "critical" ? 120 : 180,
        maxIdChars: emergencyLevel === "critical" ? 100 : 140,
      },
      metadata: {
        maxCategories: 1,
        maxItems: emergencyLevel === "critical" ? 2 : 3,
        maxStringChars: emergencyLevel === "critical" ? 100 : 140,
        maxDependencyReasonChars: emergencyLevel === "critical" ? 100 : 140,
        maxContractSummaryChars: emergencyLevel === "critical" ? 100 : 140,
      },
      maxTaskChars: emergencyLevel === "critical" ? 1400 : 2200,
    },
    generated_at: nowIso,
    updatedAt: nowIso,
  }, groupId, groupSessionId);
}

export function writeWorkerContextPtlEmergencyHintForCoordinator(groupId: string, entries: any[] = [], strategy: any = {}, options: any = {}) {
  const groupSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(options.groupSessionId || options.group_session_id || strategy?.groupSessionId || "");
  const hint = buildWorkerContextPtlEmergencyHintForCoordinator(groupId, entries, strategy, options);
  if (hint.engaged || options.writeEmpty === true || options.write_empty === true) {
    writeJsonAtomicForCoordinator(getWorkerContextPtlEmergencyHintFileForCoordinator(groupId, groupSessionId), hint);
  }
  return hint;
}

export function readWorkerContextPtlEmergencyHintForCoordinator(groupId: string, groupSessionId = "") {
  return require("./group-orchestrator-worker-context").readWorkerContextPtlEmergencyHintForCoordinator(groupId, groupSessionId);
}

export function mergeWorkerContextRetryOptionsForCoordinator(base: any = {}, override: any = {}) {
  return {
    ...base,
    ...override,
    memory: { ...(base.memory || base.memoryOptions || {}), ...(override.memory || {}) },
    memoryOptions: { ...(base.memoryOptions || base.memory || {}), ...(override.memory || {}) },
    replayRepairDispatchBriefs: {
      ...(base.replayRepairDispatchBriefs || base.replay_repair_dispatch_briefs || {}),
      ...(override.replayRepairDispatchBriefs || override.replay_repair_dispatch_briefs || {}),
    },
    replay_repair_dispatch_briefs: {
      ...(base.replay_repair_dispatch_briefs || base.replayRepairDispatchBriefs || {}),
      ...(override.replayRepairDispatchBriefs || override.replay_repair_dispatch_briefs || {}),
    },
    metadata: { ...(base.metadata || base.metadataPartialCompact || base.metadata_partial_compact || {}), ...(override.metadata || {}) },
    metadataPartialCompact: { ...(base.metadataPartialCompact || base.metadata || {}), ...(override.metadata || {}) },
    metadata_partial_compact: { ...(base.metadata_partial_compact || base.metadata || {}), ...(override.metadata || {}) },
    maxTaskChars: Number(override.maxTaskChars || override.max_task_chars || base.maxTaskChars || base.max_task_chars || 0) || undefined,
    max_task_chars: Number(override.maxTaskChars || override.max_task_chars || base.max_task_chars || base.maxTaskChars || 0) || undefined,
  };
}

export function readWorkerContextCompactOutcomeLedgerForCoordinator(groupId: string, groupSessionId = "") {
  return require("./group-orchestrator-worker-context").readWorkerContextCompactOutcomeLedgerForCoordinator(groupId, groupSessionId);
}

export const WORKER_CONTEXT_COMPACT_OUTCOME_RECENT_RETENTION_LIMIT = 800;

export function compactOutcomeCompletionSummaryCoveredForRetention(expected: any = {}, actual: any = {}) {
  const listFields = [
    "completion_doc_rel_paths", "required_doc_rel_paths", "work_item_ids", "timeline_binding_ids",
    "historical_task_agent_session_ids", "historical_native_session_ids", "conflict_resolution_doc_rel_paths",
  ];
  for (const field of listFields) {
    const expectedValues = uniqueCoordinatorStrings(expected[field] || []);
    const actualValues = uniqueCoordinatorStrings(actual[field] || []);
    if (expectedValues.some((value: string) => !actualValues.includes(value))) return false;
  }
  const completionCovered = actual.present === true
    && String(actual.current_session_binding_id || "") === String(expected.current_session_binding_id || "")
    && String(actual.current_task_agent_session_id || "") === String(expected.current_task_agent_session_id || "")
    && String(actual.current_native_session_id || "") === String(expected.current_native_session_id || "")
    && actual.usage_acceptance_required === true
    && actual.current_session_acceptance_required === true
    && actual.authority_boundary_valid === true;
  if (!completionCovered || expected.conflict_resolution_present !== true) return completionCovered;
  return actual.conflict_resolution_present === true
    && String(actual.conflict_resolution_entry_id || "") === String(expected.conflict_resolution_entry_id || "")
    && String(actual.conflict_resolution_state || "") === String(expected.conflict_resolution_state || "")
    && String(actual.conflict_resolution_usage_state || "") === String(expected.conflict_resolution_usage_state || "")
    && String(actual.conflict_resolution_task_agent_session_id || "") === String(expected.conflict_resolution_task_agent_session_id || "")
    && String(actual.conflict_resolution_native_session_id || "") === String(expected.conflict_resolution_native_session_id || "")
    && actual.conflict_resolution_active === (expected.conflict_resolution_active === true)
    && actual.conflict_resolution_reopened === (expected.conflict_resolution_reopened === true)
    && actual.conflict_resolution_reversible === true
    && actual.conflict_resolution_historical_branches_preserved === true
    && actual.conflict_resolution_reverification_acceptance_required === (expected.conflict_resolution_reverification_acceptance_required === true)
    && actual.conflict_resolution_reversible_acceptance_required === (expected.conflict_resolution_reversible_acceptance_required === true)
    && actual.conflict_verification_acceptance_required === (expected.conflict_verification_acceptance_required === true);
}

export function compactOutcomeHasStrictCorrectedCompletionProofForRetention(entry: any = {}, expected: any = {}) {
  const proof = entry.post_compact_receipt_memory_usage_repair_completion_preservation || {};
  return proof.schema === "ccm-post-compact-receipt-memory-usage-repair-completion-preservation-v1"
    && proof.required === true
    && proof.preserved === true
    && entry.post_compact_receipt_memory_usage_repair_completion_preserved === true
    && !(proof.gaps || []).length
    && compactOutcomeCompletionSummaryCoveredForRetention(expected, proof.before || {})
    && compactOutcomeCompletionSummaryCoveredForRetention(expected, proof.after || {});
}

export function retainWorkerContextCompactOutcomeEntriesForCoordinator(groupId: string, input: any[] = [], options: any = {}) {
  const groupSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(options.groupSessionId || options.group_session_id || "");
  const recentLimit = Math.max(100, Number(options.recentLimit || options.recent_limit || WORKER_CONTEXT_COMPACT_OUTCOME_RECENT_RETENTION_LIMIT));
  const rejected: any[] = [];
  const crossSessionRejected: any[] = [];
  const accepted: Array<{ entry: any; key: string; index: number }> = [];
  for (const [index, entry] of (Array.isArray(input) ? input : []).entries()) {
    const entryGroupId = String(entry?.group_id || entry?.groupId || groupId || "").trim();
    if (entryGroupId && entryGroupId !== groupId) {
      rejected.push(entry);
      continue;
    }
    const entryGroupSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(entry?.group_session_id || entry?.groupSessionId || "");
    if (groupSessionId && entryGroupSessionId !== groupSessionId) {
      crossSessionRejected.push(entry);
      continue;
    }
    const normalized = normalizeWorkerContextCompactOutcomeEntryForCoordinator({
      ...entry,
      group_id: groupId,
      group_session_id: groupSessionId || "",
    });
    const key = String(normalized.outcome_id || "").trim() || `anonymous:${hashCoordinator([normalized.assignment_id, normalized.retry_id, normalized.at, index], 20)}`;
    accepted.push({ entry: normalized, key, index });
  }
  const latestByKey = new Map<string, { entry: any; key: string; index: number }>();
  for (const row of accepted) latestByKey.set(row.key, row);
  const rows = [...latestByKey.values()].sort((a, b) => a.index - b.index);
  const unresolvedFailures: string[] = [];
  for (const row of rows) {
    const proof = row.entry.post_compact_receipt_memory_usage_repair_completion_preservation || {};
    const failed = proof.required === true && (proof.preserved !== true
      || row.entry.post_compact_receipt_memory_usage_repair_completion_preserved !== true
      || (proof.gaps || []).length > 0);
    if (!failed) continue;
    const expected = proof.before || {};
    const corrected = rows.some(candidate => candidate.index > row.index
      && String(candidate.entry.assignment_id || "") === String(row.entry.assignment_id || "")
      && (!row.entry.project || !candidate.entry.project || candidate.entry.project === row.entry.project)
      && candidate.entry.outcome_id !== row.entry.outcome_id
      && candidate.entry.retry_id !== row.entry.retry_id
      && compactOutcomeHasStrictCorrectedCompletionProofForRetention(candidate.entry, expected));
    if (!corrected) unresolvedFailures.push(row.key);
  }
  const latestAssignment = new Map<string, string>();
  const latestResolution = new Map<string, string>();
  for (const row of rows) {
    const assignmentKey = String(row.entry.assignment_id || row.entry.dispatch_key || "").trim();
    if (assignmentKey) latestAssignment.set(assignmentKey, row.key);
    const proof = row.entry.post_compact_receipt_memory_usage_repair_completion_preservation || {};
    const resolutionEntryId = String(proof.before?.conflict_resolution_entry_id || proof.after?.conflict_resolution_entry_id || "").trim();
    if (resolutionEntryId) latestResolution.set(resolutionEntryId, row.key);
  }
  const keep = new Set<string>([
    ...rows.slice(-recentLimit).map(row => row.key),
    ...unresolvedFailures,
    ...latestAssignment.values(),
    ...latestResolution.values(),
  ]);
  const retained = rows.filter(row => keep.has(row.key));
  const dropped = rows.filter(row => !keep.has(row.key));
  return {
    entries: retained.map(row => row.entry),
    retention: {
      schema: "ccm-worker-context-compact-outcome-retention-v1",
      policy: "recent_plus_unresolved_failures_latest_assignment_and_resolution",
      group_id: groupId,
      group_session_id: groupSessionId,
      input_count: Array.isArray(input) ? input.length : 0,
      accepted_count: accepted.length,
      deduplicated_count: rows.length,
      retained_count: retained.length,
      dropped_count: dropped.length,
      recent_limit: recentLimit,
      protected_unresolved_failure_count: new Set(unresolvedFailures).size,
      protected_latest_assignment_count: new Set(latestAssignment.values()).size,
      protected_latest_resolution_count: new Set(latestResolution.values()).size,
      dropped_unresolved_failure_count: dropped.filter(row => unresolvedFailures.includes(row.key)).length,
      cross_group_rejected_count: rejected.length,
      cross_session_rejected_count: crossSessionRejected.length,
      dropped_digest: hashCoordinator(dropped.map(row => [row.key, row.entry.status, row.entry.retry_id]), 32),
      cross_group_rejected_digest: hashCoordinator(rejected.map((entry: any) => entry.outcome_id || entry.retry_id || ""), 32),
      cross_session_rejected_digest: hashCoordinator(crossSessionRejected.map((entry: any) => entry.outcome_id || entry.retry_id || ""), 32),
      compacted_at: String(options.at || new Date().toISOString()),
    },
  };
}

export function appendWorkerContextCompactOutcomeEntriesForCoordinator(groupId: string, entries: any[] = [], groupSessionId = "") {
  const exactSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(groupSessionId);
  const normalized = entries
    .map((entry: any) => normalizeWorkerContextCompactOutcomeEntryForCoordinator({
      ...entry,
      group_id: entry.group_id || groupId,
      group_session_id: exactSessionId || "",
    }))
    .filter((entry: any) => entry.group_id === groupId && (!exactSessionId || entry.group_session_id === exactSessionId));
  if (!normalized.length) return readWorkerContextCompactOutcomeLedgerForCoordinator(groupId, exactSessionId);
  const file = getWorkerContextCompactOutcomeLedgerFileForCoordinator(groupId, exactSessionId);
  return withFileLock(file, () => {
    const ledger = readWorkerContextCompactOutcomeLedgerForCoordinator(groupId, exactSessionId);
    const retained = retainWorkerContextCompactOutcomeEntriesForCoordinator(groupId, [...(ledger.entries || []), ...normalized], {
      groupSessionId: exactSessionId,
      at: normalized[normalized.length - 1]?.at || new Date().toISOString(),
    });
    const nextEntries = retained.entries;
    const next = {
      schema: "ccm-worker-context-compact-outcome-ledger-v1",
      version: 1,
      groupId,
      groupSessionId: exactSessionId,
      scopeId: workerContextCompactScopeIdForCoordinator(groupId, exactSessionId),
      file,
      entries: nextEntries,
      stats: buildWorkerContextCompactOutcomeStatsForCoordinator(nextEntries),
      retention: retained.retention,
      updatedAt: normalized[normalized.length - 1]?.at || new Date().toISOString(),
    };
    writeJsonAtomicForCoordinator(file, next);
    try {
      const strategy = writeWorkerContextCompactStrategyMemoryForCoordinator(groupId, nextEntries, {
        groupSessionId: exactSessionId,
        sourceLedgerFile: file,
        sourceLedgerUpdatedAt: next.updatedAt,
      });
      writeWorkerContextPtlEmergencyHintForCoordinator(groupId, nextEntries, strategy, {
        groupSessionId: exactSessionId,
        sourceLedgerFile: file,
        sourceStrategyFile: strategy.file,
        sourceLedgerUpdatedAt: next.updatedAt,
      });
    } catch {}
    return next;
  });
}

export function compactWorkerContextCompactOutcomeLedgerRetentionForCoordinator(groupId: string, options: any = {}) {
  return require("./group-orchestrator-worker-context").compactWorkerContextCompactOutcomeLedgerRetentionForCoordinator(groupId, options);
}

export function readWorkerContextCompactSessionArtifactsForCoordinator(groupId: string, groupSessionId: string) {
  return require("./group-orchestrator-worker-context").readWorkerContextCompactSessionArtifactsForCoordinator(groupId, groupSessionId);
}

export function deleteWorkerContextCompactSessionArtifactsForCoordinator(groupId: string, groupSessionId: string) {
  return require("./group-orchestrator-worker-context").deleteWorkerContextCompactSessionArtifactsForCoordinator(groupId, groupSessionId);
}

export function workerContextUsagePressureStatusForCoordinator(usage: any = {}) {
  const status = String(usage.status || "").trim();
  if (["compact_recommended", "critical", "over_budget"].includes(status)) return status;
  const pressure = Number(usage.pressure || 0);
  const freeTokens = Number(usage.free_tokens || 0);
  if (usage.compact_recommended === true || pressure >= 82 || freeTokens < 0) {
    if (pressure >= 100 || freeTokens < 0) return "over_budget";
    if (pressure >= 90) return "critical";
    return "compact_recommended";
  }
  return "";
}

export function workerContextUsageTopCategoriesForCoordinator(usage: any = {}) {
  const explicit = Array.isArray(usage.top_categories || usage.topCategories)
    ? (usage.top_categories || usage.topCategories)
    : [];
  const fallback = Array.isArray(usage.categories) ? usage.categories : [];
  return (explicit.length ? explicit : fallback)
    .filter((item: any) => Number(item.tokens || 0) > 0 && !["free_space", "autocompact_buffer"].includes(String(item.id || item.category_id || "")))
    .sort((a: any, b: any) => Number(b.tokens || 0) - Number(a.tokens || 0))
    .slice(0, 8)
    .map((item: any) => ({
      id: String(item.id || item.category_id || item.categoryId || ""),
      name: String(item.name || item.label || item.id || item.category_id || ""),
      tokens: Number(item.tokens || 0),
      chars: Number(item.chars || 0),
    }));
}

export function compactWorkerContextTaskForRetry(task: any, options: any = {}) {
  const text = String(task || "").trim();
  const maxChars = Math.max(1200, Number(options.maxTaskChars || options.max_task_chars || 6000));
  if (text.length <= maxChars) {
    return {
      compacted: false,
      text,
      originalChars: text.length,
      compactedChars: text.length,
      omittedChars: 0,
      criticalLines: [],
    };
  }
  const headChars = Math.max(600, Math.floor(maxChars * 0.42));
  const tailChars = Math.max(500, Math.floor(maxChars * 0.28));
  const criticalPattern = /CCM_AGENT_RECEIPT|ACK gate|验证要求|验收|交付物|本次任务|需求理解|用户约束|文档依据|Replay repair|brief_id|work_item_id|proof|request_patch_checksum|runner|execution|Context usage budget|WorkerContextPacket/i;
  const criticalLines = uniqueCoordinatorStrings(text.split(/\r?\n/g)
    .map(line => line.trim())
    .filter(line => line && criticalPattern.test(line))
    .map(line => compactText(line, 220)))
    .slice(0, 18);
  const marker = [
    "",
    `[AUTO_CONTEXT_COMPACT omitted_chars=${Math.max(0, text.length - headChars - tailChars)} original_sha=${hashCoordinator(text, 24)}]`,
    "Preserved critical dispatch lines:",
    ...(criticalLines.length ? criticalLines.map(line => `- ${line}`) : ["- ACK gate / CCM_AGENT_RECEIPT / verification contract retained by WorkerContextPacket acceptance fields."]),
    "[/AUTO_CONTEXT_COMPACT]",
    "",
  ].join("\n");
  let compacted = `${text.slice(0, headChars).trimEnd()}${marker}${text.slice(-tailChars).trimStart()}`.trim();
  if (compacted.length > maxChars + 600) {
    const markerBudget = Math.min(1800, marker.length);
    const compactHead = Math.max(500, Math.floor((maxChars - markerBudget) * 0.58));
    const compactTail = Math.max(400, Math.floor((maxChars - markerBudget) * 0.30));
    compacted = `${text.slice(0, compactHead).trimEnd()}${marker}${text.slice(-compactTail).trimStart()}`.trim();
  }
  return {
    compacted: true,
    text: compacted,
    originalChars: text.length,
    compactedChars: compacted.length,
    omittedChars: Math.max(0, text.length - compacted.length),
    criticalLines,
  };
}

export const WORKER_CONTEXT_REPLAY_BRIEF_PARTIAL_COMPACT_FIELDS = [
  "brief_id",
  "work_item_id",
  "source",
  "component",
  "target_project",
  "reinjection_gate_id",
  "post_compact_candidate_id",
  "post_compact_candidate_kind",
  "post_compact_candidate_value",
  "post_compact_candidate_source_message_id",
  "proof_entry_id",
  "request_patch_checksum",
  "provider_reproof_status",
  "provider_reproof_reason",
  "reproof_candidate_id",
  "timeline_binding_id",
  "original_work_item_id",
  "request_telemetry_session_status",
  "request_telemetry_dispatch_status",
  "runner_request_id",
  "execution_id",
];

export function replayBriefPartialCompactValue(raw: any = {}, key: string) {
  const aliases: Record<string, string[]> = {
    brief_id: ["brief_id", "briefId"],
    work_item_id: ["work_item_id", "workItemId"],
    target_project: ["target_project", "targetProject"],
    reinjection_gate_id: ["reinjection_gate_id", "reinjectionGateId"],
    post_compact_candidate_id: ["post_compact_candidate_id", "postCompactCandidateId"],
    post_compact_candidate_kind: ["post_compact_candidate_kind", "postCompactCandidateKind"],
    post_compact_candidate_value: ["post_compact_candidate_value", "postCompactCandidateValue"],
    post_compact_candidate_source_message_id: ["post_compact_candidate_source_message_id", "postCompactCandidateSourceMessageId"],
    proof_entry_id: ["proof_entry_id", "proofEntryId"],
    request_patch_checksum: ["request_patch_checksum", "requestPatchChecksum"],
    provider_reproof_status: ["provider_reproof_status", "providerReproofStatus"],
    provider_reproof_reason: ["provider_reproof_reason", "providerReproofReason"],
    reproof_candidate_id: ["reproof_candidate_id", "reproofCandidateId"],
    timeline_binding_id: ["timeline_binding_id", "timelineBindingId"],
    original_work_item_id: ["original_work_item_id", "originalWorkItemId"],
    request_telemetry_session_status: ["request_telemetry_session_status", "requestTelemetrySessionStatus"],
    request_telemetry_dispatch_status: ["request_telemetry_dispatch_status", "requestTelemetryDispatchStatus"],
    runner_request_id: ["runner_request_id", "runnerRequestId"],
    execution_id: ["execution_id", "executionId"],
  };
  for (const alias of aliases[key] || [key]) {
    if (raw[alias] !== undefined && raw[alias] !== null && raw[alias] !== "") return raw[alias];
  }
  return "";
}

export function compactReplayRepairDispatchBriefsForWorkerContextRetry(briefs: any[] = [], options: any = {}) {
  return require("./group-orchestrator-replay-repair").compactReplayRepairDispatchBriefsForWorkerContextRetry(briefs, options);
}

export function combineWorkerContextPartialCompactionSummariesForCoordinator(summaries: any[] = []) {
  const items = (summaries || []).filter((item: any) => item?.schema);
  if (items.length <= 1) return items[0] || null;
  return {
    schema: "ccm-worker-context-partial-compaction-set-v1",
    method: "ordered_category_partial_compactions_before_task_compaction",
    category: "multi_category",
    status: items.every((item: any) => item.status === "compacted") ? "compacted" : "attempted",
    categories: items.map((item: any) => item.category || "").filter(Boolean),
    item_count: items.length,
    items,
    omitted_chars: items.reduce((sum, item) => sum + Number(item.omitted_chars || 0), 0),
    preserves_receipt_reference: items.every((item: any) => item.preserves_receipt_reference !== false),
    preserves_real_task_suppression: items.every((item: any) => item.preserves_real_task_suppression !== false),
    generated_at: new Date().toISOString(),
  };
}

export function workerContextPartialCompactMethodForCoordinator(memoryCompacted: boolean, summaries: any[] = [], taskCompacted = false) {
  const categories = (summaries || []).map((item: any) => String(item?.category || "")).filter(Boolean);
  const parts = [];
  if (memoryCompacted) parts.push("memory_first");
  if (categories.includes("replay_repair_dispatch_briefs")) parts.push("replay_brief_partial");
  if (categories.includes("worker_context_metadata")) parts.push("metadata_partial");
  if (taskCompacted) parts.push("deterministic_head_tail_critical_lines");
  return parts.length ? `${parts.join("_then_")}_compact`.replace("_critical_lines_compact", "_critical_lines") : "deterministic_head_tail_critical_lines";
}

export function compactWorkerContextMetadataStringsForCoordinator(values: any[] = [], options: any = {}, defaults: any = {}) {
  const list = Array.isArray(values) ? values.map((item: any) => String(item || "").trim()).filter(Boolean) : [];
  const maxItems = Math.max(1, Number(options.maxItems || options.max_items || defaults.maxItems || 8));
  const maxStringChars = Math.max(80, Number(options.maxStringChars || options.max_string_chars || defaults.maxStringChars || 260));
  return list.slice(0, maxItems).map((item: string) => compactText(item, maxStringChars));
}

export function workerContextPressureRecallUsageSummaryForCompactPolicy(options: any = {}) {
  const explicit = options.pressureRecallUsageSummary
    || options.pressure_recall_usage_summary
    || options.workerContextPressureRecallUsageSummary
    || options.worker_context_pressure_recall_usage_summary
    || null;
  if (explicit?.schema) return explicit;
  const groupId = String(options.groupId || options.group_id || options.group?.id || "").trim();
  if (!groupId || options.disablePressureRecallUsageStrategy === true || options.disable_pressure_recall_usage_strategy === true) return null;
  try {
    const summary = buildGroupTypedMemoryPressureRecallUsageSummary(groupId, {
      targetProject: options.targetProject || options.target_project || options.project || "",
      nowMs: options.nowMs || options.now_ms,
      now: options.now,
      generatedAt: options.generatedAt || options.generated_at,
      usageHalfLifeDays: options.usageHalfLifeDays || options.usage_half_life_days,
      usageStaleAfterDays: options.usageStaleAfterDays || options.usage_stale_after_days,
      disableUsageAging: options.disableUsageAging || options.disable_usage_aging,
    });
    if (summary?.has_history === true || Number(summary?.memory_count || 0) > 0) return summary;
    if (options.disableCrossGroupPressureRecallUsage === true
      || options.disable_cross_group_pressure_recall_usage === true
      || options.crossGroupPressureRecallUsage === false
      || options.cross_group_pressure_recall_usage === false) return null;
    const crossGroupSummary = buildGroupTypedMemoryPressureRecallUsageProjectSummary(groupId, {
      targetProject: options.targetProject || options.target_project || options.project || "",
      nowMs: options.nowMs || options.now_ms,
      now: options.now,
      generatedAt: options.generatedAt || options.generated_at,
      usageHalfLifeDays: options.usageHalfLifeDays || options.usage_half_life_days,
      usageStaleAfterDays: options.usageStaleAfterDays || options.usage_stale_after_days,
      disableUsageAging: options.disableUsageAging || options.disable_usage_aging,
      groupIds: options.crossGroupPressureRecallUsageGroupIds
        || options.cross_group_pressure_recall_usage_group_ids
        || options.crossGroupIds
        || options.cross_group_ids,
      maxGroups: options.maxCrossGroupPressureRecallUsageGroups || options.max_cross_group_pressure_recall_usage_groups,
    });
    return crossGroupSummary?.has_history === true || Number(crossGroupSummary?.memory_count || 0) > 0 ? crossGroupSummary : null;
  } catch {
    return null;
  }
}

export function workerContextCompactStrategyPressureUsageBiasForCoordinator(summary: any = null) {
  const rows = [
    ...(Array.isArray(summary?.rows) ? summary.rows : []),
    ...(Array.isArray(summary?.useful_pressure_memories) ? summary.useful_pressure_memories : []),
    ...(Array.isArray(summary?.ignored_pressure_memories) ? summary.ignored_pressure_memories : []),
    ...(Array.isArray(summary?.stale_pressure_memories) ? summary.stale_pressure_memories : []),
  ];
  const compactStrategyRows = rows.filter((row: any = {}) => {
    const relPath = String(row.rel_path || row.relPath || "").toLowerCase();
    const name = String(row.name || "").toLowerCase();
    return relPath === "worker-context-compact-strategy-memory.md"
      || /worker-context-compact-strategy-memory|compact strategy memory/.test(`${relPath}\n${name}`);
  });
  const row = compactStrategyRows
    .sort((a: any, b: any) => Number(b.weighted_total_count || b.total_count || 0) - Number(a.weighted_total_count || a.total_count || 0))[0] || null;
  if (!row) {
    return {
      schema: "ccm-worker-context-partial-compact-pressure-recall-usage-bias-v1",
      active: false,
      reason: "no_compact_strategy_pressure_usage_feedback",
      category_adjustment_cap: 0,
      summary_source: summary?.source || "",
      source_group_count: Number(summary?.source_group_count || 0),
    };
  }
  const weightedUsed = Number(row.weighted_used_count || row.used_count || 0);
  const weightedVerified = Number(row.weighted_verified_count || row.verified_count || 0);
  const weightedIgnored = Number(row.weighted_ignored_count || row.ignored_count || 0);
  const weightedMentioned = Number(row.weighted_mentioned_count || row.mentioned_count || 0);
  const weightedTotal = Number(row.weighted_total_count || weightedUsed + weightedVerified + weightedIgnored + weightedMentioned || 0);
  const useful = weightedUsed + weightedVerified * 1.2;
  const ignored = weightedIgnored + weightedMentioned * 0.35;
  const trustScore = Math.round((useful - ignored) * 100) / 100;
  const recommendation = String(row.recommendation || "");
  const active = recommendation === "promote_pressure_recall"
    || trustScore >= 1.25;
  const suppressed = recommendation === "deprioritize_pressure_recall" || trustScore <= -1.25;
  const stale = recommendation === "stale_pressure_recall_history"
    || (Number(row.stale_count || 0) > 0 && Number(row.fresh_count || 0) === 0);
  return {
    schema: "ccm-worker-context-partial-compact-pressure-recall-usage-bias-v1",
    active: active && !stale,
    suppressed: suppressed || stale,
    stale,
    rel_path: row.rel_path || row.relPath || "",
    recommendation: recommendation || "neutral_verify_current_pressure",
    weighted_used_count: Math.round(weightedUsed * 1000) / 1000,
    weighted_verified_count: Math.round(weightedVerified * 1000) / 1000,
    weighted_ignored_count: Math.round(weightedIgnored * 1000) / 1000,
    weighted_mentioned_count: Math.round(weightedMentioned * 1000) / 1000,
    weighted_total_count: Math.round(weightedTotal * 1000) / 1000,
    stale_count: Number(row.stale_count || 0),
    fresh_count: Number(row.fresh_count || 0),
    avg_decay_weight: Number(row.avg_decay_weight || row.decay_weight || 0),
    trust_score: trustScore,
    category_adjustment_cap: active && !stale ? Math.min(1200, Math.max(160, Math.round((useful + Math.max(0, trustScore)) * 260))) : 0,
    reason: active && !stale
      ? "compact_strategy_pressure_memory_recently_used"
      : stale
        ? "compact_strategy_pressure_memory_feedback_is_stale"
        : suppressed
          ? "compact_strategy_pressure_memory_recently_ignored"
          : "compact_strategy_pressure_memory_feedback_neutral",
    summary_ledger_file: summary?.ledger_file || "",
    summary_source: summary?.source || "",
    source_group_count: Number(summary?.source_group_count || 0),
    source_groups: Array.isArray(summary?.source_groups) ? summary.source_groups.slice(0, 8) : [],
  };
}

export function buildWorkerContextMetadataPartialCompactPolicyForCoordinator(packet: any = {}, options: any = {}) {
  return require("./group-orchestrator-worker-context").buildWorkerContextMetadataPartialCompactPolicyForCoordinator(packet, options);
}

export function compactWorkerContextMetadataCategoriesForRetry(packet: any = {}, baseOptions: any = {}, options: any = {}) {
  const policy = buildWorkerContextMetadataPartialCompactPolicyForCoordinator(packet, options);
  const selectedCategories = new Set(policy.selected_categories || []);
  const constraints = Array.isArray(packet.constraints) ? packet.constraints : [];
  const documentFindings = Array.isArray(packet.document_findings) ? packet.document_findings : [];
  const dependencies = Array.isArray(packet.dependencies) ? packet.dependencies : [];
  const contractInjections = Array.isArray(packet.contract_injections) ? packet.contract_injections : [];
  const beforeValue = {
    constraints: selectedCategories.has("constraints_and_documents") ? constraints : [],
    document_findings: selectedCategories.has("constraints_and_documents") ? documentFindings : [],
    dependencies: selectedCategories.has("dependencies") ? dependencies : [],
    contract_injections: selectedCategories.has("contract_injections") ? contractInjections : [],
  };
  const beforeText = JSON.stringify(beforeValue);
  if (!policy.selected_categories.length || !beforeText || beforeText === "{}") return { compacted: false, options: baseOptions, summary: null, policy };
  const maxItems = Math.max(1, Number(options.maxItems || options.max_items || 8));
  const maxStringChars = Math.max(80, Number(options.maxStringChars || options.max_string_chars || 260));
  const maxDependencyReasonChars = Math.max(80, Number(options.maxDependencyReasonChars || options.max_dependency_reason_chars || maxStringChars));
  const maxContractSummaryChars = Math.max(80, Number(options.maxContractSummaryChars || options.max_contract_summary_chars || maxStringChars));
  const compactedConstraints = selectedCategories.has("constraints_and_documents")
    ? compactWorkerContextMetadataStringsForCoordinator(constraints, { maxItems, maxStringChars }, { maxItems: 8, maxStringChars: 220 })
    : constraints;
  const compactedDocumentFindings = selectedCategories.has("constraints_and_documents")
    ? compactWorkerContextMetadataStringsForCoordinator(documentFindings, { maxItems, maxStringChars }, { maxItems: 8, maxStringChars: 260 })
    : documentFindings;
  const compactedDependencies = selectedCategories.has("dependencies") ? dependencies.slice(0, maxItems).map((item: any = {}) => ({
    project: String(item.project || item.target_project || item.targetProject || item.name || "").trim(),
    reason: compactText(String(item.reason || item.summary || item.blocker || "前置依赖").trim(), maxDependencyReasonChars),
    dependency_id: item.dependency_id || item.dependencyId || item.id || "",
    required_receipt_reference: item.required_receipt_reference === true || item.requiredReceiptReference === true,
  })) : dependencies;
  const compactedContractInjections = selectedCategories.has("contract_injections") ? contractInjections.slice(0, Math.max(1, Number(options.maxContractItems || options.max_contract_items || maxItems))).map((item: any = {}) => ({
    injection_id: item.injection_id || item.injectionId || "",
    source_agent: item.source_agent || item.sourceAgent || item.source || "",
    target_agent: item.target_agent || item.targetAgent || item.target || packet.project || "",
    endpoint: item.endpoint || item.type || "",
    summary: compactText(String(item.summary || item.change || "").trim(), maxContractSummaryChars),
    required_receipt_reference: true,
  })) : contractInjections;
  const afterValue = {
    constraints: selectedCategories.has("constraints_and_documents") ? compactedConstraints : [],
    document_findings: selectedCategories.has("constraints_and_documents") ? compactedDocumentFindings : [],
    dependencies: selectedCategories.has("dependencies") ? compactedDependencies : [],
    contract_injections: selectedCategories.has("contract_injections") ? compactedContractInjections : [],
  };
  const afterText = JSON.stringify(afterValue);
  const compacted = afterText.length < beforeText.length;
  const compactedOptions = compacted ? {
    ...baseOptions,
    analysis: {
      ...(baseOptions.analysis || {}),
      constraints: compactedConstraints,
      documentFindings: compactedDocumentFindings,
    },
    workerContextDependencies: compactedDependencies,
    contractInjections: compactedContractInjections,
  } : baseOptions;
  const summary = compacted ? {
    schema: "ccm-worker-context-metadata-partial-compaction-v1",
    method: "top_category_metadata_field_compaction",
    category: "worker_context_metadata",
    categories: (policy.selected_categories || []).filter((category: string) => {
      if (category === "constraints_and_documents") return constraints.length || documentFindings.length;
      if (category === "contract_injections") return contractInjections.length;
      if (category === "dependencies") return dependencies.length;
      return false;
    }),
    partial_compact_policy: policy,
    selected_from_top_categories: policy.selected_categories || [],
    skipped_categories: policy.skipped_categories || [],
    status: "compacted",
    original_metadata_hash: hashCoordinator(beforeText, 24),
    compacted_metadata_hash: hashCoordinator(afterText, 24),
    original_metadata_chars: beforeText.length,
    compacted_metadata_chars: afterText.length,
    omitted_chars: Math.max(0, beforeText.length - afterText.length),
    original_counts: {
      constraints: constraints.length,
      document_findings: documentFindings.length,
      dependencies: dependencies.length,
      contract_injections: contractInjections.length,
    },
    compacted_counts: {
      constraints: compactedConstraints.length,
      document_findings: compactedDocumentFindings.length,
      dependencies: compactedDependencies.length,
      contract_injections: compactedContractInjections.length,
    },
    max_items: maxItems,
    max_string_chars: maxStringChars,
    max_dependency_reason_chars: maxDependencyReasonChars,
    max_contract_summary_chars: maxContractSummaryChars,
    preserved_fields: [
      "constraints",
      "documentFindings",
      "dependency.project",
      "dependency.reason",
      "dependency.dependency_id",
      "contract.injection_id",
      "contract.source_agent",
      "contract.target_agent",
      "contract.endpoint",
      "contract.required_receipt_reference",
    ],
    preserves_receipt_reference: true,
    preserves_real_task_suppression: true,
    generated_at: new Date().toISOString(),
  } : null;
  return { compacted, options: compactedOptions, summary, policy };
}

export function buildWorkerContextPacketForAssignment(baseAssignment: any, dependsOn: string, replayRepairDispatchBriefs: any[], options: any = {}) {
  return require("./group-orchestrator-worker-context").buildWorkerContextPacketForAssignment(baseAssignment, dependsOn, replayRepairDispatchBriefs, options);
}

export function pressureProvenanceProviderDispatchPolicyForCoordinator(healthStatus: string) {
  if (healthStatus === "critical") return "hold_until_repair";
  if (healthStatus === "warning") return "strict_review_before_dispatch";
  if (healthStatus === "monitor") return "allow_with_receipt_sampling";
  if (healthStatus === "watch") return "allow_with_monitoring";
  return "preferred";
}

export function pressureProvenanceProviderHealthForCoordinator(policy: any = {}, row: any = {}) {
  if (policy?.active === true && (row?.provider_switch_execution_mismatch_escalated === true || row?.providerSwitchExecutionMismatchEscalated === true)) return "critical";
  if (policy?.active === true && (row?.provider_override_followup_receipt_validation_escalated === true || row?.providerOverrideFollowupReceiptValidationEscalated === true)) return "critical";
  if (policy?.active === true && row?.relapsed === true) return "critical";
  if (policy?.active === true) return "warning";
  if (Number(row?.provider_switch_execution_mismatch_count || row?.providerSwitchExecutionMismatchCount || 0) > 0) return "monitor";
  if (row?.recovered === true) return "monitor";
  if (row?.provider_override_followup_repaired === true || row?.providerOverrideFollowupRepaired === true) return "monitor";
  if (Number(row?.violation_count || row?.violationCount || 0) > 0) return "watch";
  if (row?.cross_group_provider_reliability_actionable === true || row?.crossGroupProviderReliabilityActionable === true) {
    return ["high", "medium"].includes(String(row?.cross_group_provider_reliability_risk_status || row?.crossGroupProviderReliabilityRiskStatus || "")) ? "monitor" : "watch";
  }
  return "healthy";
}

export function providerReliabilityConfiguredCandidatesForCoordinator(project: string, selectedAgentType: string, options: any = {}) {
  const group = options.group && typeof options.group === "object" ? options.group : null;
  const member = Array.isArray(group?.members)
    ? group.members.find((item: any) => String(item.project || "").trim().toLowerCase() === String(project || "").trim().toLowerCase())
    : null;
  const raw = [
    ...(Array.isArray(options.providerCandidates || options.provider_candidates) ? (options.providerCandidates || options.provider_candidates) : []),
    ...(Array.isArray(options.configuredProviderCandidates || options.configured_provider_candidates) ? (options.configuredProviderCandidates || options.configured_provider_candidates) : []),
    ...(Array.isArray(member?.providerCandidates || member?.provider_candidates) ? (member.providerCandidates || member.provider_candidates) : []),
    ...(Array.isArray(member?.alternativeAgents || member?.alternative_agents) ? (member.alternativeAgents || member.alternative_agents) : []),
    ...(Array.isArray(member?.agents) ? member.agents : []),
  ];
  const seen = new Set<string>();
  const selectedKey = String(selectedAgentType || "").trim().toLowerCase();
  const candidates: any[] = [];
  for (const item of raw) {
    const row = typeof item === "string" ? { agent_type: item } : item || {};
    const agentType = String(row.agent_type || row.agentType || row.agent || row.provider || row.runner || "").trim();
    const candidateProject = String(row.project || row.target_project || row.targetProject || project || "").trim();
    const key = `${agentType.toLowerCase()}|${candidateProject.toLowerCase()}`;
    if (!agentType || agentType.toLowerCase() === selectedKey || candidateProject.toLowerCase() !== String(project || "").trim().toLowerCase()) continue;
    if (row.enabled === false || row.configured === false || seen.has(key)) continue;
    seen.add(key);
    candidates.push({
      agent_type: agentType,
      project: candidateProject,
      configured: true,
      source: "explicit_same_project_provider_candidate",
    });
  }
  return candidates.slice(0, 12);
}

export function providerReliabilityHealthRankForCoordinator(healthStatus: any) {
  const rank: Record<string, number> = {
    healthy: 0,
    watch: 1,
    monitor: 2,
    warning: 3,
    critical: 4,
  };
  return rank[String(healthStatus || "healthy")] ?? 5;
}

export function providerReliabilityRiskRankForCoordinator(riskStatus: any) {
  const rank: Record<string, number> = {
    low: 0,
    empty: 1,
    medium: 2,
    high: 3,
  };
  return rank[String(riskStatus || "empty")] ?? 4;
}

export function providerSwitchExecutionRankPenaltyForCoordinator(row: any = {}) {
  const weightedRiskScore = Math.max(0, Number(
    row.provider_switch_execution_weighted_risk_score
      || row.providerSwitchExecutionWeightedRiskScore
      || 0
  ));
  const riskScore = Math.max(0, Number(row.provider_switch_execution_risk_score || row.providerSwitchExecutionRiskScore || 0));
  const confidence = Math.max(0, Math.min(1, Number(row.provider_switch_execution_risk_confidence || row.providerSwitchExecutionRiskConfidence || 0)));
  const mismatchCount = Math.max(0, Number(row.provider_switch_execution_mismatch_count || row.providerSwitchExecutionMismatchCount || 0));
  if (!weightedRiskScore && !riskScore && !mismatchCount) return 0;
  const weightedPenalty = Math.min(8, weightedRiskScore * 4);
  const confidencePenalty = Math.min(4, riskScore * confidence * 4);
  const mismatchFloor = mismatchCount > 0 ? 1 : 0;
  return Math.max(mismatchFloor, Math.round(weightedPenalty + confidencePenalty));
}

export function providerSwitchExecutionRankingProvenanceForCoordinator(row: any = {}, role = "candidate") {
  const memoryRelPaths = Array.isArray(row.provider_switch_execution_memory_rel_paths || row.providerSwitchExecutionMemoryRelPaths)
    ? (row.provider_switch_execution_memory_rel_paths || row.providerSwitchExecutionMemoryRelPaths).slice(0, 8)
    : [];
  const rowIds = Array.isArray(row.provider_switch_execution_row_ids || row.providerSwitchExecutionRowIds)
    ? (row.provider_switch_execution_row_ids || row.providerSwitchExecutionRowIds).slice(0, 12)
    : [];
  const receiptIds = Array.isArray(row.provider_switch_execution_receipt_ids || row.providerSwitchExecutionReceiptIds)
    ? (row.provider_switch_execution_receipt_ids || row.providerSwitchExecutionReceiptIds).slice(0, 8)
    : [];
  const decisionIds = Array.isArray(row.provider_switch_execution_decision_receipt_ids || row.providerSwitchExecutionDecisionReceiptIds)
    ? (row.provider_switch_execution_decision_receipt_ids || row.providerSwitchExecutionDecisionReceiptIds).slice(0, 8)
    : [];
  const hasExecutionEvidence = memoryRelPaths.length > 0
    || rowIds.length > 0
    || Number(row.provider_switch_execution_executed_count || row.providerSwitchExecutionExecutedCount || 0) > 0;
  return {
    schema: "ccm-provider-ranking-provenance-v1",
    role,
    source: hasExecutionEvidence ? "typed-memory:provider-switch-execution-memory" : "none",
    typed_memory_rel_paths: memoryRelPaths,
    typed_memory_row_ids: rowIds,
    execution_receipt_ids: receiptIds,
    decision_receipt_ids: decisionIds,
    provider_switch_execution_executed_count: Number(row.provider_switch_execution_executed_count || row.providerSwitchExecutionExecutedCount || 0),
    provider_switch_execution_mismatch_count: Number(row.provider_switch_execution_mismatch_count || row.providerSwitchExecutionMismatchCount || 0),
    provider_switch_execution_weighted_risk_score: Number(row.provider_switch_execution_weighted_risk_score || row.providerSwitchExecutionWeightedRiskScore || 0),
    provider_switch_execution_risk_score: Number(row.provider_switch_execution_risk_score || row.providerSwitchExecutionRiskScore || 0),
    provider_switch_execution_risk_confidence: Number(row.provider_switch_execution_risk_confidence || row.providerSwitchExecutionRiskConfidence || 0),
    local_execution_rank_penalty: Number(row.local_execution_rank_penalty || row.localExecutionRankPenalty || 0),
    composite_rank: Number(row.composite_rank || row.compositeRank || 0),
    selected_composite_rank: Number(row.selected_composite_rank || row.selectedCompositeRank || 0),
    compact_safe: true,
    boundary: "ranking evidence only; passed history is not future switch authorization",
  };
}

export function providerReliabilitySignalForAgentForCoordinator(snapshotRead: any = {}, agentType = "") {
  const envelope = snapshotRead?.snapshot?.signals || {};
  const signals = Array.isArray(envelope.signals) ? envelope.signals : [];
  return signals.find((signal: any) => String(signal.agent_type || signal.agentType || "").trim().toLowerCase() === String(agentType || "").trim().toLowerCase()) || null;
}

// ===== merged from group-orchestrator-coded-part-03.ts =====

export function buildPressureProvenanceProviderDispatchAdvisoryForCoordinator(groupId: string, project: string, agentType: string, policy: any = null, options: any = {}) {
  if (!groupId || !project || !agentType || !policy?.schema) return null;
  const rows = Array.isArray(policy.policyRows || policy.policy_rows)
    ? (policy.policyRows || policy.policy_rows)
    : [];
  const targetKey = `${String(agentType || "unknown").toLowerCase()}|${String(project || "unknown").toLowerCase()}`;
  const row = rows.find((item: any) => `${String(item.agent_type || item.agentType || "unknown").toLowerCase()}|${String(item.project || "unknown").toLowerCase()}` === targetKey)
    || rows[0]
    || {};
  const hasEvidence = policy.active === true
    || row.recovered === true
    || Number(row.violation_count || row.violationCount || 0) > 0
    || Number(row.effective_violation_count || row.effectiveViolationCount || 0) > 0
    || Number(row.provider_override_followup_receipt_validation_attempt_count || row.providerOverrideFollowupReceiptValidationAttemptCount || 0) > 0
    || Number(row.provider_switch_execution_executed_count || row.providerSwitchExecutionExecutedCount || 0) > 0
    || Number(row.provider_switch_execution_mismatch_count || row.providerSwitchExecutionMismatchCount || 0) > 0
    || row.cross_group_provider_reliability_actionable === true
    || row.crossGroupProviderReliabilityActionable === true;
  if (!hasEvidence) return null;
  const healthStatus = pressureProvenanceProviderHealthForCoordinator(policy, row);
  const dispatchPolicy = pressureProvenanceProviderDispatchPolicyForCoordinator(healthStatus);
  const holdDisabled = options.disablePressureProvenanceProviderDispatchHold === true
    || options.disable_pressure_provenance_provider_dispatch_hold === true
    || options.disableProviderDispatchHold === true
    || options.disable_provider_dispatch_hold === true;
  const shouldHoldDispatch = dispatchPolicy === "hold_until_repair" && !holdDisabled;
  const configuredCandidates = providerReliabilityConfiguredCandidatesForCoordinator(project, agentType, options);
  const snapshotEnabled = configuredCandidates.length > 0
    || options.enableProviderReliabilitySnapshot === true
    || options.enable_provider_reliability_snapshot === true;
  const snapshotRead = snapshotEnabled
    ? getOrRefreshGlobalProviderDispatchReliabilitySnapshot({
      snapshotFile: options.providerReliabilitySnapshotFile || options.provider_reliability_snapshot_file,
      ttlMs: options.providerReliabilitySnapshotTtlMs || options.provider_reliability_snapshot_ttl_ms,
      crossGroupProviderReliabilityGroupIds: options.crossGroupProviderReliabilityGroupIds || options.cross_group_provider_reliability_group_ids,
      minSourceGroups: options.crossGroupProviderReliabilityMinSourceGroups || options.cross_group_provider_reliability_min_source_groups || options.minSourceGroups || options.min_source_groups,
      providerReliabilityHalfLifeDays: options.providerReliabilityHalfLifeDays || options.provider_reliability_half_life_days,
      providerOverrideFollowupReceiptValidationFailureThreshold: options.providerOverrideFollowupReceiptValidationFailureThreshold || options.provider_override_followup_receipt_validation_failure_threshold,
      nowMs: options.providerReliabilitySnapshotNowMs || options.provider_reliability_snapshot_now_ms,
      generatedAt: options.generatedAt || options.generated_at,
    })
    : null;
  const selectedGlobalSignal = providerReliabilitySignalForAgentForCoordinator(snapshotRead, agentType);
  const selectedExecutionRankPenalty = providerSwitchExecutionRankPenaltyForCoordinator(row);
  const selectedCompositeRank = providerReliabilityHealthRankForCoordinator(healthStatus) * 10
    + providerReliabilityRiskRankForCoordinator(selectedGlobalSignal?.risk_status || row.cross_group_provider_reliability_risk_status || "empty")
    + selectedExecutionRankPenalty;
  const rankedProviderCandidates = configuredCandidates.map((candidate: any) => {
      const candidatePolicy: any = buildPressureProvenancePreDispatchComplianceDispatchPolicy(groupId, {
        ...options,
        targetProject: project,
        agentType: candidate.agent_type,
      });
      const candidateRows = Array.isArray(candidatePolicy.policyRows || candidatePolicy.policy_rows)
        ? (candidatePolicy.policyRows || candidatePolicy.policy_rows)
        : [];
      const candidateRow = candidateRows.find((item: any) =>
        String(item.agent_type || item.agentType || "").trim().toLowerCase() === String(candidate.agent_type || "").trim().toLowerCase()
        && String(item.project || "").trim().toLowerCase() === String(project || "").trim().toLowerCase()
      ) || candidateRows[0] || {};
      const candidateHealth = pressureProvenanceProviderHealthForCoordinator(candidatePolicy, candidateRow);
      const candidateDispatchPolicy = pressureProvenanceProviderDispatchPolicyForCoordinator(candidateHealth);
      const candidateSignal = providerReliabilitySignalForAgentForCoordinator(snapshotRead, candidate.agent_type);
      const candidateExecutionRankPenalty = providerSwitchExecutionRankPenaltyForCoordinator(candidateRow);
      const compositeRank = providerReliabilityHealthRankForCoordinator(candidateHealth) * 10
        + providerReliabilityRiskRankForCoordinator(candidateSignal?.risk_status || candidateRow.cross_group_provider_reliability_risk_status || "empty")
        + candidateExecutionRankPenalty;
      return {
        schema: "ccm-provider-dispatch-safer-alternative-v1",
        agent_type: candidate.agent_type,
        project,
        configured: true,
        source: candidate.source,
        local_health_status: candidateHealth,
        local_dispatch_policy: candidateDispatchPolicy,
        local_policy_active: candidatePolicy.active === true,
        global_risk_status: candidateSignal?.risk_status || "empty",
        global_risk_score: Number(candidateSignal?.risk_score || 0),
        global_confidence: Number(candidateSignal?.confidence || 0),
        global_source_group_count: Number(candidateSignal?.source_group_count || 0),
        local_execution_rank_penalty: candidateExecutionRankPenalty,
        selected_local_execution_rank_penalty: selectedExecutionRankPenalty,
        provider_switch_execution_executed_count: Number(candidateRow.provider_switch_execution_executed_count || candidateRow.providerSwitchExecutionExecutedCount || 0),
        provider_switch_execution_passed_count: Number(candidateRow.provider_switch_execution_passed_count || candidateRow.providerSwitchExecutionPassedCount || 0),
        provider_switch_execution_failed_count: Number(candidateRow.provider_switch_execution_failed_count || candidateRow.providerSwitchExecutionFailedCount || 0),
        provider_switch_execution_mismatch_count: Number(candidateRow.provider_switch_execution_mismatch_count || candidateRow.providerSwitchExecutionMismatchCount || 0),
        provider_switch_execution_decayed_mismatch_score: Number(candidateRow.provider_switch_execution_decayed_mismatch_score || candidateRow.providerSwitchExecutionDecayedMismatchScore || 0),
        provider_switch_execution_decayed_failed_score: Number(candidateRow.provider_switch_execution_decayed_failed_score || candidateRow.providerSwitchExecutionDecayedFailedScore || 0),
        provider_switch_execution_decayed_passed_score: Number(candidateRow.provider_switch_execution_decayed_passed_score || candidateRow.providerSwitchExecutionDecayedPassedScore || 0),
        provider_switch_execution_weighted_risk_score: Number(candidateRow.provider_switch_execution_weighted_risk_score || candidateRow.providerSwitchExecutionWeightedRiskScore || 0),
        provider_switch_execution_risk_score: Number(candidateRow.provider_switch_execution_risk_score || candidateRow.providerSwitchExecutionRiskScore || 0),
        provider_switch_execution_risk_confidence: Number(candidateRow.provider_switch_execution_risk_confidence || candidateRow.providerSwitchExecutionRiskConfidence || 0),
        provider_switch_execution_row_ids: Array.isArray(candidateRow.provider_switch_execution_row_ids || candidateRow.providerSwitchExecutionRowIds) ? (candidateRow.provider_switch_execution_row_ids || candidateRow.providerSwitchExecutionRowIds).slice(0, 12) : [],
        provider_switch_execution_memory_rel_paths: Array.isArray(candidateRow.provider_switch_execution_memory_rel_paths || candidateRow.providerSwitchExecutionMemoryRelPaths) ? (candidateRow.provider_switch_execution_memory_rel_paths || candidateRow.providerSwitchExecutionMemoryRelPaths).slice(0, 8) : [],
        composite_rank: compositeRank,
        selected_composite_rank: selectedCompositeRank,
        provider_ranking_provenance: providerSwitchExecutionRankingProvenanceForCoordinator({
          ...candidateRow,
          local_execution_rank_penalty: candidateExecutionRankPenalty,
          composite_rank: compositeRank,
          selected_composite_rank: selectedCompositeRank,
        }, "candidate"),
        safer_than_selected: compositeRank < selectedCompositeRank
          && !["critical", "warning"].includes(candidateHealth)
          && candidateDispatchPolicy !== "hold_until_repair",
        snapshot_id: snapshotRead?.snapshot?.snapshot_id || "",
        snapshot_checksum: snapshotRead?.snapshot?.snapshot_checksum || "",
        snapshot_status: snapshotRead?.status || "",
      };
    })
    .sort((a: any, b: any) => Number(a.composite_rank || 0) - Number(b.composite_rank || 0) || String(a.agent_type || "").localeCompare(String(b.agent_type || "")));
  const saferAlternatives = rankedProviderCandidates
    .filter((candidate: any) => candidate.safer_than_selected)
    .slice(0, 6);
  const selected = {
    schema: "ccm-pressure-provenance-feedback-provider-dispatch-selected-candidate-v1",
    groupId,
    project,
    agent_type: agentType,
    health_status: healthStatus,
    dispatch_policy: dispatchPolicy,
    dispatch_recommendation: shouldHoldDispatch
      ? "hold_child_dispatch_until_pressure_provenance_repair"
      : healthStatus === "warning"
        ? "strict_receipt_review_or_repair_before_ordinary_dispatch"
        : healthStatus === "monitor"
          ? "allow_dispatch_with_receipt_sampling"
          : "allow_dispatch_with_pressure_provenance_monitoring",
    policy_action: policy.action || "",
    policy_severity: policy.severity || "",
    relapsed: row.relapsed === true,
    recovered: row.recovered === true,
    violation_count: Number(row.violation_count || row.violationCount || 0),
    effective_violation_count: Number(row.effective_violation_count || row.effectiveViolationCount || row.violation_count || 0),
    recovery_credit: Number(row.recovery_credit || row.recoveryCredit || 0),
    post_recovery_violation_count: Number(row.post_recovery_violation_count || row.postRecoveryViolationCount || 0),
    recovery_last_compliant_at: row.recovery_last_compliant_at || row.recoveryLastCompliantAt || "",
    recovery_streak_broken_at: row.recovery_streak_broken_at || row.recoveryStreakBrokenAt || "",
    current_open_repair_item_ids: [...new Set([
      ...(Array.isArray(row.repair_work_item_ids || row.repairWorkItemIds) ? (row.repair_work_item_ids || row.repairWorkItemIds) : []),
      ...(Array.isArray(row.provider_override_followup_receipt_validation_repair_work_item_ids || row.providerOverrideFollowupReceiptValidationRepairWorkItemIds)
        ? (row.provider_override_followup_receipt_validation_repair_work_item_ids || row.providerOverrideFollowupReceiptValidationRepairWorkItemIds)
        : []),
    ])].slice(0, 8),
    provider_override_followup_repaired: row.provider_override_followup_repaired === true || row.providerOverrideFollowupRepaired === true,
    provider_override_followup_only: row.provider_override_followup_only === true || row.providerOverrideFollowupOnly === true,
    provider_override_followup_repaired_count: Number(row.provider_override_followup_repaired_count || row.providerOverrideFollowupRepairedCount || 0),
    provider_override_followup_memory_provenance_usage_count: Number(row.provider_override_followup_memory_provenance_usage_count || row.providerOverrideFollowupMemoryProvenanceUsageCount || 0),
    provider_override_followup_current_source_verified_count: Number(row.provider_override_followup_current_source_verified_count || row.providerOverrideFollowupCurrentSourceVerifiedCount || 0),
    provider_override_followup_last_completed_at: row.provider_override_followup_last_completed_at || row.providerOverrideFollowupLastCompletedAt || "",
    provider_override_followup_fresh_after_last_violation: row.provider_override_followup_fresh_after_last_violation === true || row.providerOverrideFollowupFreshAfterLastViolation === true,
    provider_override_followup_rel_paths: Array.isArray(row.provider_override_followup_rel_paths || row.providerOverrideFollowupRelPaths) ? (row.provider_override_followup_rel_paths || row.providerOverrideFollowupRelPaths).slice(0, 8) : [],
    provider_override_followup_work_item_ids: Array.isArray(row.provider_override_followup_work_item_ids || row.providerOverrideFollowupWorkItemIds) ? (row.provider_override_followup_work_item_ids || row.providerOverrideFollowupWorkItemIds).slice(0, 8) : [],
    provider_override_followup_override_ids: Array.isArray(row.provider_override_followup_override_ids || row.providerOverrideFollowupOverrideIds) ? (row.provider_override_followup_override_ids || row.providerOverrideFollowupOverrideIds).slice(0, 8) : [],
    provider_override_followup_receipt_validation_attempt_count: Number(row.provider_override_followup_receipt_validation_attempt_count || row.providerOverrideFollowupReceiptValidationAttemptCount || 0),
    provider_override_followup_receipt_validation_failed_count: Number(row.provider_override_followup_receipt_validation_failed_count || row.providerOverrideFollowupReceiptValidationFailedCount || 0),
    provider_override_followup_receipt_validation_passed_count: Number(row.provider_override_followup_receipt_validation_passed_count || row.providerOverrideFollowupReceiptValidationPassedCount || 0),
    provider_override_followup_receipt_validation_consecutive_failure_count: Number(row.provider_override_followup_receipt_validation_consecutive_failure_count || row.providerOverrideFollowupReceiptValidationConsecutiveFailureCount || 0),
    provider_override_followup_receipt_validation_latest_status: row.provider_override_followup_receipt_validation_latest_status || row.providerOverrideFollowupReceiptValidationLatestStatus || "",
    provider_override_followup_receipt_validation_escalated: row.provider_override_followup_receipt_validation_escalated === true || row.providerOverrideFollowupReceiptValidationEscalated === true,
    provider_override_followup_receipt_validation_repair_verified: row.provider_override_followup_receipt_validation_repair_verified === true || row.providerOverrideFollowupReceiptValidationRepairVerified === true,
    provider_override_followup_receipt_validation_last_failed_at: row.provider_override_followup_receipt_validation_last_failed_at || row.providerOverrideFollowupReceiptValidationLastFailedAt || "",
    provider_override_followup_receipt_validation_last_passed_at: row.provider_override_followup_receipt_validation_last_passed_at || row.providerOverrideFollowupReceiptValidationLastPassedAt || "",
    provider_override_followup_receipt_validation_ids: Array.isArray(row.provider_override_followup_receipt_validation_ids || row.providerOverrideFollowupReceiptValidationIds) ? (row.provider_override_followup_receipt_validation_ids || row.providerOverrideFollowupReceiptValidationIds).slice(0, 8) : [],
    provider_override_followup_receipt_validation_repair_work_item_ids: Array.isArray(row.provider_override_followup_receipt_validation_repair_work_item_ids || row.providerOverrideFollowupReceiptValidationRepairWorkItemIds) ? (row.provider_override_followup_receipt_validation_repair_work_item_ids || row.providerOverrideFollowupReceiptValidationRepairWorkItemIds).slice(0, 8) : [],
    provider_override_followup_receipt_validation_gap_codes: Array.isArray(row.provider_override_followup_receipt_validation_gap_codes || row.providerOverrideFollowupReceiptValidationGapCodes) ? (row.provider_override_followup_receipt_validation_gap_codes || row.providerOverrideFollowupReceiptValidationGapCodes).slice(0, 8) : [],
    provider_override_followup_receipt_validation_decayed_failure_score: Number(row.provider_override_followup_receipt_validation_decayed_failure_score || row.providerOverrideFollowupReceiptValidationDecayedFailureScore || 0),
    provider_override_followup_receipt_validation_decayed_passed_score: Number(row.provider_override_followup_receipt_validation_decayed_passed_score || row.providerOverrideFollowupReceiptValidationDecayedPassedScore || 0),
    provider_override_followup_receipt_validation_risk_score: Number(row.provider_override_followup_receipt_validation_risk_score || row.providerOverrideFollowupReceiptValidationRiskScore || 0),
    provider_override_followup_receipt_validation_risk_confidence: Number(row.provider_override_followup_receipt_validation_risk_confidence || row.providerOverrideFollowupReceiptValidationRiskConfidence || 0),
    provider_switch_execution_history_present: row.provider_switch_execution_history_present === true || row.providerSwitchExecutionHistoryPresent === true,
    provider_switch_execution_executed_count: Number(row.provider_switch_execution_executed_count || row.providerSwitchExecutionExecutedCount || 0),
    provider_switch_execution_approved_count: Number(row.provider_switch_execution_approved_count || row.providerSwitchExecutionApprovedCount || 0),
    provider_switch_execution_passed_count: Number(row.provider_switch_execution_passed_count || row.providerSwitchExecutionPassedCount || 0),
    provider_switch_execution_failed_count: Number(row.provider_switch_execution_failed_count || row.providerSwitchExecutionFailedCount || 0),
    provider_switch_execution_mismatch_count: Number(row.provider_switch_execution_mismatch_count || row.providerSwitchExecutionMismatchCount || 0),
    provider_switch_execution_mismatch_escalated: row.provider_switch_execution_mismatch_escalated === true || row.providerSwitchExecutionMismatchEscalated === true,
    provider_switch_execution_mismatch_threshold: Number(row.provider_switch_execution_mismatch_threshold || row.providerSwitchExecutionMismatchThreshold || 0),
    provider_switch_execution_expected_provider: row.provider_switch_execution_expected_provider || row.providerSwitchExecutionExpectedProvider || "",
    provider_switch_execution_actual_providers: Array.isArray(row.provider_switch_execution_actual_providers || row.providerSwitchExecutionActualProviders) ? (row.provider_switch_execution_actual_providers || row.providerSwitchExecutionActualProviders).slice(0, 8) : [],
    provider_switch_execution_last_executed_at: row.provider_switch_execution_last_executed_at || row.providerSwitchExecutionLastExecutedAt || "",
    provider_switch_execution_last_failed_at: row.provider_switch_execution_last_failed_at || row.providerSwitchExecutionLastFailedAt || "",
    provider_switch_execution_last_passed_at: row.provider_switch_execution_last_passed_at || row.providerSwitchExecutionLastPassedAt || "",
    provider_switch_execution_receipt_ids: Array.isArray(row.provider_switch_execution_receipt_ids || row.providerSwitchExecutionReceiptIds) ? (row.provider_switch_execution_receipt_ids || row.providerSwitchExecutionReceiptIds).slice(0, 8) : [],
    provider_switch_execution_decision_receipt_ids: Array.isArray(row.provider_switch_execution_decision_receipt_ids || row.providerSwitchExecutionDecisionReceiptIds) ? (row.provider_switch_execution_decision_receipt_ids || row.providerSwitchExecutionDecisionReceiptIds).slice(0, 8) : [],
    provider_switch_execution_gap_codes: Array.isArray(row.provider_switch_execution_gap_codes || row.providerSwitchExecutionGapCodes) ? (row.provider_switch_execution_gap_codes || row.providerSwitchExecutionGapCodes).slice(0, 8) : [],
    provider_switch_execution_decayed_mismatch_score: Number(row.provider_switch_execution_decayed_mismatch_score || row.providerSwitchExecutionDecayedMismatchScore || 0),
    provider_switch_execution_decayed_failed_score: Number(row.provider_switch_execution_decayed_failed_score || row.providerSwitchExecutionDecayedFailedScore || 0),
    provider_switch_execution_decayed_passed_score: Number(row.provider_switch_execution_decayed_passed_score || row.providerSwitchExecutionDecayedPassedScore || 0),
    provider_switch_execution_weighted_risk_score: Number(row.provider_switch_execution_weighted_risk_score || row.providerSwitchExecutionWeightedRiskScore || 0),
    provider_switch_execution_risk_score: Number(row.provider_switch_execution_risk_score || row.providerSwitchExecutionRiskScore || 0),
    provider_switch_execution_risk_confidence: Number(row.provider_switch_execution_risk_confidence || row.providerSwitchExecutionRiskConfidence || 0),
    provider_switch_execution_half_life_days: Number(row.provider_switch_execution_half_life_days || row.providerSwitchExecutionHalfLifeDays || 0),
    provider_switch_execution_row_ids: Array.isArray(row.provider_switch_execution_row_ids || row.providerSwitchExecutionRowIds) ? (row.provider_switch_execution_row_ids || row.providerSwitchExecutionRowIds).slice(0, 12) : [],
    provider_switch_execution_memory_rel_paths: Array.isArray(row.provider_switch_execution_memory_rel_paths || row.providerSwitchExecutionMemoryRelPaths) ? (row.provider_switch_execution_memory_rel_paths || row.providerSwitchExecutionMemoryRelPaths).slice(0, 8) : [],
    local_execution_rank_penalty: selectedExecutionRankPenalty,
    composite_rank: selectedCompositeRank,
    provider_ranking_provenance: providerSwitchExecutionRankingProvenanceForCoordinator({
      ...row,
      local_execution_rank_penalty: selectedExecutionRankPenalty,
      composite_rank: selectedCompositeRank,
      selected_composite_rank: selectedCompositeRank,
    }, "selected"),
    cross_group_provider_reliability_guidance: row.cross_group_provider_reliability_guidance || row.crossGroupProviderReliabilityGuidance || null,
    cross_group_provider_reliability_actionable: row.cross_group_provider_reliability_actionable === true || row.crossGroupProviderReliabilityActionable === true,
    cross_group_provider_reliability_risk_status: row.cross_group_provider_reliability_risk_status || row.crossGroupProviderReliabilityRiskStatus || "empty",
    cross_group_provider_reliability_risk_score: Number(row.cross_group_provider_reliability_risk_score || row.crossGroupProviderReliabilityRiskScore || 0),
    cross_group_provider_reliability_confidence: Number(row.cross_group_provider_reliability_confidence || row.crossGroupProviderReliabilityConfidence || 0),
    cross_group_provider_reliability_source_group_count: Number(row.cross_group_provider_reliability_source_group_count || row.crossGroupProviderReliabilitySourceGroupCount || 0),
    ...(snapshotRead?.snapshot ? {
      provider_reliability_snapshot_id: snapshotRead.snapshot.snapshot_id || "",
      provider_reliability_snapshot_checksum: snapshotRead.snapshot.snapshot_checksum || "",
      provider_reliability_snapshot_status: snapshotRead.status || "missing",
      provider_reliability_snapshot_expires_at: snapshotRead.snapshot.expires_at || "",
      provider_reliability_snapshot_generation_id: snapshotRead.snapshot.generation_id || "",
    } : {}),
    should_hold_dispatch: shouldHoldDispatch,
  };
  return {
    schema: "ccm-pressure-provenance-provider-dispatch-advisory-selection-v1",
    version: 1,
    groupId,
    project,
    agent_type: agentType,
    source: "typed-feedback:pressure-provenance-provider-dispatch-advisory",
    source_policy_action: policy.action || "",
    source_policy_severity: policy.severity || "",
    selected_candidate: selected,
    dispatch_policy: dispatchPolicy,
    health_status: healthStatus,
    should_hold_dispatch: shouldHoldDispatch,
    ...(snapshotRead?.snapshot ? { provider_reliability_snapshot: {
      schema: "ccm-provider-dispatch-reliability-snapshot-ref-v1",
      snapshot_id: snapshotRead.snapshot.snapshot_id || "",
      generation_id: snapshotRead.snapshot.generation_id || "",
      snapshot_checksum: snapshotRead.snapshot.snapshot_checksum || "",
      payload_checksum: snapshotRead.snapshot.payload_checksum || "",
      status: snapshotRead.status || "",
      usable: snapshotRead.usable === true,
      refreshed: snapshotRead.refreshed === true,
      generated_at: snapshotRead.snapshot.generated_at || "",
      expires_at: snapshotRead.snapshot.expires_at || "",
      source_generation_checksum: snapshotRead.snapshot.source_provenance?.generation_checksum || "",
      source_ledger_count: Number(snapshotRead.snapshot.source_provenance?.source_ledger_count || 0),
      guidance_only: true,
      local_policy_override_allowed: false,
      contains_private_memory: false,
    } } : {}),
    ranked_provider_candidate_count: rankedProviderCandidates.length,
    ranked_provider_candidates: rankedProviderCandidates.slice(0, 12),
    safer_alternative_count: saferAlternatives.length,
    safer_alternatives: saferAlternatives,
    recommendation: shouldHoldDispatch
      ? selected.provider_switch_execution_mismatch_escalated
        ? `hold ${agentType}/${project} provider switches after ${selected.provider_switch_execution_mismatch_count || 0} system-attested execution mismatch(es)`
        : selected.provider_override_followup_receipt_validation_escalated
        ? `hold ${agentType}/${project} child-agent dispatch after ${selected.provider_override_followup_receipt_validation_consecutive_failure_count || 0} consecutive corrected-receipt validation failures`
        : `hold ${agentType}/${project} child-agent dispatch until pressure provenance repair closes`
      : saferAlternatives.length
        ? `keep current ${agentType}/${project} assignment unchanged, but prefer configured safer candidate ${saferAlternatives[0].agent_type} on the next dispatch decision when task/provider compatibility is confirmed`
      : selected.provider_switch_execution_mismatch_count > 0
        ? `allow ${agentType}/${project} with receipt sampling; provider switch execution history has ${selected.provider_switch_execution_mismatch_count || 0} mismatch(es), and passed history is not future switch authorization`
      : selected.provider_override_followup_repaired
      ? `allow ${agentType}/${project} dispatch with receipt sampling; verified provider override follow-up history exists but current evidence is still required`
      : selected.cross_group_provider_reliability_actionable
        ? `allow ${agentType}/${project} only with receipt sampling based on privacy-redacted cross-group reliability guidance; local group policy remains authoritative`
      : selected.dispatch_recommendation,
    generated_at: new Date().toISOString(),
  };
}

export function providerSwitchDecisionReceiptComparableForCoordinator(receipt: any = {}) {
  const comparable = { ...receipt };
  delete comparable.receipt_checksum;
  delete comparable.validation;
  delete comparable.gaps;
  delete comparable.valid;
  return comparable;
}

export function providerSwitchDecisionReceiptChecksumForCoordinator(receipt: any = {}) {
  return hashCoordinator(providerSwitchDecisionReceiptComparableForCoordinator(receipt), 48);
}

export function normalizeProviderSwitchAuthorityForCoordinator(value: any = {}) {
  const authority = value && typeof value === "object" ? value : {};
  const kind = String(authority.kind || authority.type || authority.source || "").trim().toLowerCase();
  const localKinds = new Set(["local_user", "user", "task_runtime_override", "group_local_policy", "local_policy"]);
  return {
    kind,
    authority_id: String(authority.authority_id || authority.authorityId || authority.id || "").trim(),
    approved: authority.approved === true || authority.allowed === true,
    local_policy_authority: authority.local_policy_authority === true
      || authority.localPolicyAuthority === true
      || localKinds.has(kind),
    allow_switch_away_from_held_provider: authority.allow_switch_away_from_held_provider === true
      || authority.allowSwitchAwayFromHeldProvider === true,
    reason: compactText(authority.reason || authority.note || "", 360),
  };
}

export function normalizeProviderSwitchRequestForCoordinator(value: any = {}) {
  const request = value && typeof value === "object" ? value : {};
  const evidence = Array.isArray(request.compatibility_evidence || request.compatibilityEvidence)
    ? (request.compatibility_evidence || request.compatibilityEvidence)
    : request.compatibility_evidence || request.compatibilityEvidence
      ? [request.compatibility_evidence || request.compatibilityEvidence]
      : [];
  return {
    requested_agent_type: String(
      request.requested_agent_type
      || request.requestedAgentType
      || request.new_agent_type
      || request.newAgentType
      || request.provider
      || request.runner
      || ""
    ).trim(),
    compatibility_confirmed: request.compatibility_confirmed === true || request.compatibilityConfirmed === true,
    compatibility_evidence: uniqueCoordinatorStrings(evidence).slice(0, 12),
    reason: compactText(request.reason || request.switch_reason || request.switchReason || "", 500),
    authority: normalizeProviderSwitchAuthorityForCoordinator(request.authority || request.approval || {}),
  };
}

export function providerSwitchRequestForAssignmentForCoordinator(member: any = {}, project = "", options: any = {}) {
  const requests = options.providerSwitchRequests || options.provider_switch_requests || {};
  const mapped = requests && typeof requests === "object"
    ? requests[project] || requests["*"] || null
    : null;
  return mapped
    || member.providerSwitchRequest
    || member.provider_switch_request
    || options.providerSwitchRequest
    || options.provider_switch_request
    || null;
}

export function validateProviderSwitchDecisionReceiptForCoordinator(receipt: any = {}, options: any = {}) {
  return require("./group-orchestrator-worker-context").validateProviderSwitchDecisionReceiptForCoordinator(receipt, options);
}

export function buildProviderSwitchDecisionReceiptForCoordinator(groupId: string, assignment: any = {}, requestValue: any = {}, options: any = {}) {
  return require("./group-orchestrator-worker-context").buildProviderSwitchDecisionReceiptForCoordinator(groupId, assignment, requestValue, options);
}

export function providerRankingProvenanceListForCoordinator(packet: any = {}) {
  const advisory = packet.pressure_provenance_provider_dispatch_advisory
    || packet.pressureProvenanceProviderDispatchAdvisory
    || {};
  const selected = advisory.selected_candidate || advisory.selectedCandidate || {};
  const alternatives = Array.isArray(advisory.safer_alternatives || advisory.saferAlternatives)
    ? (advisory.safer_alternatives || advisory.saferAlternatives)
    : [];
  const ranked = Array.isArray(advisory.ranked_provider_candidates || advisory.rankedProviderCandidates)
    ? (advisory.ranked_provider_candidates || advisory.rankedProviderCandidates)
    : [];
  const receipt = packet.provider_switch_decision_receipt || packet.providerSwitchDecisionReceipt || {};
  const receiptProvenance = receipt.provider_ranking_provenance || receipt.providerRankingProvenance || {};
  return [
    selected.provider_ranking_provenance || selected.providerRankingProvenance,
    ...alternatives.map((item: any) => item.provider_ranking_provenance || item.providerRankingProvenance),
    ...ranked.map((item: any) => item.provider_ranking_provenance || item.providerRankingProvenance),
    receiptProvenance.selected || receiptProvenance.selected_candidate || receiptProvenance.selectedCandidate,
    receiptProvenance.requested_candidate || receiptProvenance.requestedCandidate,
    receipt.old_provider?.provider_ranking_provenance || receipt.oldProvider?.providerRankingProvenance,
    receipt.new_provider?.provider_ranking_provenance || receipt.newProvider?.providerRankingProvenance,
  ].filter((item: any) => item && typeof item === "object");
}

export function providerRankingProvenancePacketSummaryForCoordinator(packet: any = {}) {
  const receipt = packet.provider_switch_decision_receipt || packet.providerSwitchDecisionReceipt || {};
  const receiptProvenance = receipt.provider_ranking_provenance || receipt.providerRankingProvenance || {};
  const provenances = providerRankingProvenanceListForCoordinator(packet);
  const relPaths = uniqueCoordinatorStrings(provenances.flatMap((item: any) =>
    Array.isArray(item.typed_memory_rel_paths || item.typedMemoryRelPaths) ? (item.typed_memory_rel_paths || item.typedMemoryRelPaths) : []
  )).slice(0, 16);
  const rowIds = uniqueCoordinatorStrings(provenances.flatMap((item: any) =>
    Array.isArray(item.typed_memory_row_ids || item.typedMemoryRowIds) ? (item.typed_memory_row_ids || item.typedMemoryRowIds) : []
  )).slice(0, 32);
  const executionReceiptIds = uniqueCoordinatorStrings(provenances.flatMap((item: any) =>
    Array.isArray(item.execution_receipt_ids || item.executionReceiptIds) ? (item.execution_receipt_ids || item.executionReceiptIds) : []
  )).slice(0, 24);
  const decisionReceiptIds = uniqueCoordinatorStrings([
    ...provenances.flatMap((item: any) =>
      Array.isArray(item.decision_receipt_ids || item.decisionReceiptIds) ? (item.decision_receipt_ids || item.decisionReceiptIds) : []
    ),
    receipt.receipt_id || receipt.receiptId || "",
  ]).filter(Boolean).slice(0, 24);
  const providerSwitchDecisionReceiptPresent = receipt.schema === "ccm-provider-switch-decision-receipt-v1";
  const present = provenances.length > 0 || relPaths.length > 0 || rowIds.length > 0 || (providerSwitchDecisionReceiptPresent && receiptProvenance?.schema);
  return {
    schema: "ccm-provider-ranking-provenance-packet-summary-v1",
    present,
    compact_safe: provenances.some((item: any) => item.compact_safe === true || item.compactSafe === true)
      || receiptProvenance.compact_safe === true
      || receiptProvenance.compactSafe === true,
    provider_switch_decision_receipt_present: providerSwitchDecisionReceiptPresent,
    provider_switch_decision_receipt_id: receipt.receipt_id || receipt.receiptId || "",
    provider_switch_decision_receipt_checksum: receipt.receipt_checksum || receipt.receiptChecksum || "",
    typed_memory_rel_paths: relPaths,
    typed_memory_row_ids: rowIds,
    execution_receipt_ids: executionReceiptIds,
    decision_receipt_ids: decisionReceiptIds,
    provenance_count: provenances.length,
  };
}

export function buildProviderRankingProvenancePreservationForCoordinator(beforePacket: any = {}, afterPacket: any = {}, options: any = {}) {
  const before = providerRankingProvenancePacketSummaryForCoordinator(beforePacket);
  const after = providerRankingProvenancePacketSummaryForCoordinator(afterPacket);
  const required = before.present === true || before.provider_switch_decision_receipt_present === true;
  const missingRelPaths = before.typed_memory_rel_paths.filter((item: string) => !after.typed_memory_rel_paths.includes(item));
  const missingRowIds = before.typed_memory_row_ids.filter((item: string) => !after.typed_memory_row_ids.includes(item));
  const gaps = uniqueCoordinatorStrings([
    required && after.present !== true ? "provider_ranking_provenance_missing_after_compact" : "",
    before.provider_switch_decision_receipt_present === true && after.provider_switch_decision_receipt_present !== true ? "provider_switch_decision_receipt_missing_after_compact" : "",
    before.provider_switch_decision_receipt_id && after.provider_switch_decision_receipt_id && before.provider_switch_decision_receipt_id !== after.provider_switch_decision_receipt_id ? "provider_switch_decision_receipt_id_changed" : "",
    missingRelPaths.length ? "typed_memory_rel_paths_missing_after_compact" : "",
    missingRowIds.length ? "typed_memory_row_ids_missing_after_compact" : "",
  ]);
  const preserved = !required || gaps.length === 0;
  return {
    schema: "ccm-provider-ranking-provenance-preservation-v1",
    required,
    preserved,
    compact_safe_preserved: !required || (after.compact_safe === true && gaps.length === 0),
    source: "worker_context_packet_compaction_retry",
    retry_id: options.retry_id || options.retryId || "",
    before,
    after,
    missing_typed_memory_rel_paths: missingRelPaths,
    missing_typed_memory_row_ids: missingRowIds,
    gaps,
  };
}

export function normalizeProviderRankingProvenancePreservationForCoordinator(raw: any = null) {
  if (!raw || typeof raw !== "object" || raw.schema !== "ccm-provider-ranking-provenance-preservation-v1") return null;
  const before = raw.before || {};
  const after = raw.after || {};
  const summary = (value: any = {}) => ({
    schema: "ccm-provider-ranking-provenance-packet-summary-v1",
    present: value.present === true,
    compact_safe: value.compact_safe === true || value.compactSafe === true,
    provider_switch_decision_receipt_present: value.provider_switch_decision_receipt_present === true || value.providerSwitchDecisionReceiptPresent === true,
    provider_switch_decision_receipt_id: String(value.provider_switch_decision_receipt_id || value.providerSwitchDecisionReceiptId || ""),
    provider_switch_decision_receipt_checksum: String(value.provider_switch_decision_receipt_checksum || value.providerSwitchDecisionReceiptChecksum || ""),
    typed_memory_rel_paths: uniqueCoordinatorStrings(Array.isArray(value.typed_memory_rel_paths || value.typedMemoryRelPaths) ? (value.typed_memory_rel_paths || value.typedMemoryRelPaths) : []).slice(0, 16),
    typed_memory_row_ids: uniqueCoordinatorStrings(Array.isArray(value.typed_memory_row_ids || value.typedMemoryRowIds) ? (value.typed_memory_row_ids || value.typedMemoryRowIds) : []).slice(0, 32),
    execution_receipt_ids: uniqueCoordinatorStrings(Array.isArray(value.execution_receipt_ids || value.executionReceiptIds) ? (value.execution_receipt_ids || value.executionReceiptIds) : []).slice(0, 24),
    decision_receipt_ids: uniqueCoordinatorStrings(Array.isArray(value.decision_receipt_ids || value.decisionReceiptIds) ? (value.decision_receipt_ids || value.decisionReceiptIds) : []).slice(0, 24),
    provenance_count: Number(value.provenance_count || value.provenanceCount || 0),
  });
  return {
    schema: "ccm-provider-ranking-provenance-preservation-v1",
    required: raw.required === true,
    preserved: raw.preserved === true,
    compact_safe_preserved: raw.compact_safe_preserved === true || raw.compactSafePreserved === true,
    source: String(raw.source || "worker_context_packet_compaction_retry"),
    retry_id: String(raw.retry_id || raw.retryId || ""),
    before: summary(before),
    after: summary(after),
    missing_typed_memory_rel_paths: uniqueCoordinatorStrings(Array.isArray(raw.missing_typed_memory_rel_paths || raw.missingTypedMemoryRelPaths) ? (raw.missing_typed_memory_rel_paths || raw.missingTypedMemoryRelPaths) : []).slice(0, 16),
    missing_typed_memory_row_ids: uniqueCoordinatorStrings(Array.isArray(raw.missing_typed_memory_row_ids || raw.missingTypedMemoryRowIds) ? (raw.missing_typed_memory_row_ids || raw.missingTypedMemoryRowIds) : []).slice(0, 32),
    gaps: uniqueCoordinatorStrings(Array.isArray(raw.gaps) ? raw.gaps : []).slice(0, 16),
  };
}

export function postCompactReceiptMemoryUsageRepairCompletionPacketSummaryForCoordinator(packet: any = {}) {
  const contract = packet.post_compact_reinjection_repair_receipt_memory_contract
    || packet.postCompactReinjectionRepairReceiptMemoryContract
    || {};
  const acceptance = packet.acceptance || {};
  const requiredDocRelPaths = uniqueCoordinatorStrings(contract.memory_receipt_required_doc_rel_paths || contract.memoryReceiptRequiredDocRelPaths || []).slice(0, 16);
  const completionDocRelPaths = uniqueCoordinatorStrings(contract.corrected_receipt_completion_doc_rel_paths || contract.correctedReceiptCompletionDocRelPaths || []).slice(0, 16);
  const workItemIds = uniqueCoordinatorStrings(contract.corrected_receipt_completion_work_item_ids || contract.correctedReceiptCompletionWorkItemIds || []).slice(0, 24);
  const timelineBindingIds = uniqueCoordinatorStrings(contract.corrected_receipt_completion_timeline_binding_ids || contract.correctedReceiptCompletionTimelineBindingIds || []).slice(0, 24);
  const historicalTaskAgentSessionIds = uniqueCoordinatorStrings(contract.historical_task_agent_session_ids || contract.historicalTaskAgentSessionIds || []).slice(0, 24);
  const historicalNativeSessionIds = uniqueCoordinatorStrings(contract.historical_native_session_ids || contract.historicalNativeSessionIds || []).slice(0, 24);
  const currentSessionBindingId = String(contract.current_session_binding_id || contract.currentSessionBindingId || "");
  const currentTaskAgentSessionId = String(contract.current_task_agent_session_id || contract.currentTaskAgentSessionId || "");
  const currentNativeSessionId = String(contract.current_native_session_id || contract.currentNativeSessionId || "");
  const conflictResolutionDocRelPaths: string[] = requiredDocRelPaths.filter((relPath: string) => relPath === "post-compact-completion-memory-preservation-closure-conflict-resolutions.md");
  const conflictResolutionActive = contract.closure_conflict_resolution_active === true;
  const conflictResolutionReopened = contract.closure_conflict_resolution_reopened === true;
  const conflictResolutionEntryId = String(contract.closure_conflict_resolution_entry_id || "");
  const conflictResolutionState = String(contract.closure_conflict_resolution_state || "");
  const conflictResolutionUsageState = String(contract.closure_conflict_resolution_usage_state || "");
  const conflictResolutionTaskAgentSessionId = String(contract.closure_conflict_resolution_task_agent_session_id || "");
  const conflictResolutionNativeSessionId = String(contract.closure_conflict_resolution_native_session_id || "");
  const conflictResolutionPresent = !!conflictResolutionEntryId && (conflictResolutionActive || conflictResolutionReopened);
  const present = contract.active === true && contract.corrected_receipt_completion_memory_active === true;
  const authorityBoundaryValid = !present || (!!currentSessionBindingId
    && !!currentTaskAgentSessionId
    && !!currentNativeSessionId
    && !historicalTaskAgentSessionIds.includes(currentTaskAgentSessionId)
    && !historicalNativeSessionIds.includes(currentNativeSessionId));
  return {
    schema: "ccm-post-compact-receipt-memory-usage-repair-completion-packet-summary-v1",
    present,
    completion_doc_rel_paths: completionDocRelPaths,
    required_doc_rel_paths: requiredDocRelPaths,
    work_item_ids: workItemIds,
    timeline_binding_ids: timelineBindingIds,
    historical_task_agent_session_ids: historicalTaskAgentSessionIds,
    historical_native_session_ids: historicalNativeSessionIds,
    current_session_binding_id: currentSessionBindingId,
    current_task_agent_session_id: currentTaskAgentSessionId,
    current_native_session_id: currentNativeSessionId,
    conflict_resolution_present: conflictResolutionPresent,
    conflict_resolution_doc_rel_paths: conflictResolutionDocRelPaths,
    conflict_resolution_active: conflictResolutionActive,
    conflict_resolution_reopened: conflictResolutionReopened,
    conflict_resolution_state: conflictResolutionState,
    conflict_resolution_entry_id: conflictResolutionEntryId,
    conflict_resolution_usage_state: conflictResolutionUsageState,
    conflict_resolution_task_agent_session_id: conflictResolutionTaskAgentSessionId,
    conflict_resolution_native_session_id: conflictResolutionNativeSessionId,
    conflict_resolution_reversible: contract.closure_conflict_resolution_reversible === true,
    conflict_resolution_historical_branches_preserved: contract.closure_conflict_resolution_historical_branches_preserved === true,
    conflict_resolution_reverification_acceptance_required: acceptance.post_compact_completion_memory_preservation_closure_conflict_resolution_reverification_required === true,
    conflict_resolution_reversible_acceptance_required: acceptance.post_compact_completion_memory_preservation_closure_conflict_resolution_reversible === true,
    conflict_verification_acceptance_required: acceptance.post_compact_completion_memory_preservation_closure_feedback_conflict_current_session_verification_required === true,
    usage_acceptance_required: acceptance.post_compact_receipt_memory_usage_repair_completion_memory_usage_required === true,
    current_session_acceptance_required: acceptance.post_compact_receipt_memory_usage_repair_completion_current_session_binding_required === true,
    authority_boundary_valid: authorityBoundaryValid,
  };
}

export function buildPostCompactReceiptMemoryUsageRepairCompletionPreservationForCoordinator(beforePacket: any = {}, afterPacket: any = {}, options: any = {}) {
  const before = postCompactReceiptMemoryUsageRepairCompletionPacketSummaryForCoordinator(beforePacket);
  const after = postCompactReceiptMemoryUsageRepairCompletionPacketSummaryForCoordinator(afterPacket);
  const required = before.present === true;
  const missingCompletionDocRelPaths = before.completion_doc_rel_paths.filter((item: string) => !after.completion_doc_rel_paths.includes(item));
  const missingRequiredDocRelPaths = before.required_doc_rel_paths.filter((item: string) => !after.required_doc_rel_paths.includes(item));
  const missingWorkItemIds = before.work_item_ids.filter((item: string) => !after.work_item_ids.includes(item));
  const missingTimelineBindingIds = before.timeline_binding_ids.filter((item: string) => !after.timeline_binding_ids.includes(item));
  const missingHistoricalTaskAgentSessionIds = before.historical_task_agent_session_ids.filter((item: string) => !after.historical_task_agent_session_ids.includes(item));
  const missingHistoricalNativeSessionIds = before.historical_native_session_ids.filter((item: string) => !after.historical_native_session_ids.includes(item));
  const missingConflictResolutionDocRelPaths = before.conflict_resolution_doc_rel_paths.filter((item: string) => !after.conflict_resolution_doc_rel_paths.includes(item));
  const gaps = uniqueCoordinatorStrings([
    required && after.present !== true ? "completion_memory_contract_missing_after_compact" : "",
    missingCompletionDocRelPaths.length ? "completion_doc_rel_paths_missing_after_compact" : "",
    missingRequiredDocRelPaths.length ? "required_doc_rel_paths_missing_after_compact" : "",
    missingWorkItemIds.length ? "completion_work_item_ids_missing_after_compact" : "",
    missingTimelineBindingIds.length ? "completion_timeline_binding_ids_missing_after_compact" : "",
    missingHistoricalTaskAgentSessionIds.length ? "historical_task_agent_session_ids_missing_after_compact" : "",
    missingHistoricalNativeSessionIds.length ? "historical_native_session_ids_missing_after_compact" : "",
    required && before.current_session_binding_id !== after.current_session_binding_id ? "current_session_binding_changed_after_compact" : "",
    required && before.current_task_agent_session_id !== after.current_task_agent_session_id ? "current_task_agent_session_changed_after_compact" : "",
    required && before.current_native_session_id !== after.current_native_session_id ? "current_native_session_changed_after_compact" : "",
    required && after.usage_acceptance_required !== true ? "completion_memory_usage_acceptance_missing_after_compact" : "",
    required && after.current_session_acceptance_required !== true ? "completion_current_session_acceptance_missing_after_compact" : "",
    required && after.authority_boundary_valid !== true ? "historical_session_promoted_to_current_authority" : "",
    before.conflict_resolution_present && after.conflict_resolution_present !== true ? "conflict_resolution_contract_missing_after_compact" : "",
    missingConflictResolutionDocRelPaths.length ? "conflict_resolution_doc_rel_paths_missing_after_compact" : "",
    before.conflict_resolution_present && before.conflict_resolution_entry_id !== after.conflict_resolution_entry_id ? "conflict_resolution_entry_id_changed_after_compact" : "",
    before.conflict_resolution_present && before.conflict_resolution_state !== after.conflict_resolution_state ? "conflict_resolution_state_changed_after_compact" : "",
    before.conflict_resolution_present && before.conflict_resolution_usage_state !== after.conflict_resolution_usage_state ? "conflict_resolution_usage_state_changed_after_compact" : "",
    before.conflict_resolution_present && before.conflict_resolution_task_agent_session_id !== after.conflict_resolution_task_agent_session_id ? "conflict_resolution_task_session_changed_after_compact" : "",
    before.conflict_resolution_present && before.conflict_resolution_native_session_id !== after.conflict_resolution_native_session_id ? "conflict_resolution_native_session_changed_after_compact" : "",
    before.conflict_resolution_present && before.conflict_resolution_active !== after.conflict_resolution_active ? "conflict_resolution_active_state_changed_after_compact" : "",
    before.conflict_resolution_present && before.conflict_resolution_reopened !== after.conflict_resolution_reopened ? "conflict_resolution_reopened_state_changed_after_compact" : "",
    before.conflict_resolution_present && after.conflict_resolution_reversible !== true ? "conflict_resolution_reversible_missing_after_compact" : "",
    before.conflict_resolution_present && after.conflict_resolution_historical_branches_preserved !== true ? "conflict_resolution_historical_branches_missing_after_compact" : "",
    before.conflict_resolution_active && after.conflict_resolution_reverification_acceptance_required !== true ? "conflict_resolution_reverification_acceptance_missing_after_compact" : "",
    before.conflict_resolution_active && after.conflict_resolution_reversible_acceptance_required !== true ? "conflict_resolution_reversible_acceptance_missing_after_compact" : "",
    before.conflict_resolution_reopened && after.conflict_verification_acceptance_required !== true ? "reopened_conflict_current_session_verification_missing_after_compact" : "",
  ]);
  return {
    schema: "ccm-post-compact-receipt-memory-usage-repair-completion-preservation-v1",
    required,
    preserved: !required || gaps.length === 0,
    source: "worker_context_packet_compaction_retry",
    retry_id: String(options.retry_id || options.retryId || ""),
    before,
    after,
    missing_completion_doc_rel_paths: missingCompletionDocRelPaths,
    missing_required_doc_rel_paths: missingRequiredDocRelPaths,
    missing_work_item_ids: missingWorkItemIds,
    missing_timeline_binding_ids: missingTimelineBindingIds,
    missing_historical_task_agent_session_ids: missingHistoricalTaskAgentSessionIds,
    missing_historical_native_session_ids: missingHistoricalNativeSessionIds,
    missing_conflict_resolution_doc_rel_paths: missingConflictResolutionDocRelPaths,
    gaps,
  };
}

export function normalizePostCompactReceiptMemoryUsageRepairCompletionPreservationForCoordinator(raw: any = null) {
  if (!raw || typeof raw !== "object" || raw.schema !== "ccm-post-compact-receipt-memory-usage-repair-completion-preservation-v1") return null;
  const summary = (value: any = {}) => ({
    schema: "ccm-post-compact-receipt-memory-usage-repair-completion-packet-summary-v1",
    present: value.present === true,
    completion_doc_rel_paths: uniqueCoordinatorStrings(value.completion_doc_rel_paths || value.completionDocRelPaths || []).slice(0, 16),
    required_doc_rel_paths: uniqueCoordinatorStrings(value.required_doc_rel_paths || value.requiredDocRelPaths || []).slice(0, 16),
    work_item_ids: uniqueCoordinatorStrings(value.work_item_ids || value.workItemIds || []).slice(0, 24),
    timeline_binding_ids: uniqueCoordinatorStrings(value.timeline_binding_ids || value.timelineBindingIds || []).slice(0, 24),
    historical_task_agent_session_ids: uniqueCoordinatorStrings(value.historical_task_agent_session_ids || value.historicalTaskAgentSessionIds || []).slice(0, 24),
    historical_native_session_ids: uniqueCoordinatorStrings(value.historical_native_session_ids || value.historicalNativeSessionIds || []).slice(0, 24),
    current_session_binding_id: String(value.current_session_binding_id || value.currentSessionBindingId || ""),
    current_task_agent_session_id: String(value.current_task_agent_session_id || value.currentTaskAgentSessionId || ""),
    current_native_session_id: String(value.current_native_session_id || value.currentNativeSessionId || ""),
    conflict_resolution_present: value.conflict_resolution_present === true || value.conflictResolutionPresent === true,
    conflict_resolution_doc_rel_paths: uniqueCoordinatorStrings(value.conflict_resolution_doc_rel_paths || value.conflictResolutionDocRelPaths || []).slice(0, 8),
    conflict_resolution_active: value.conflict_resolution_active === true || value.conflictResolutionActive === true,
    conflict_resolution_reopened: value.conflict_resolution_reopened === true || value.conflictResolutionReopened === true,
    conflict_resolution_state: String(value.conflict_resolution_state || value.conflictResolutionState || ""),
    conflict_resolution_entry_id: String(value.conflict_resolution_entry_id || value.conflictResolutionEntryId || ""),
    conflict_resolution_usage_state: String(value.conflict_resolution_usage_state || value.conflictResolutionUsageState || ""),
    conflict_resolution_task_agent_session_id: String(value.conflict_resolution_task_agent_session_id || value.conflictResolutionTaskAgentSessionId || ""),
    conflict_resolution_native_session_id: String(value.conflict_resolution_native_session_id || value.conflictResolutionNativeSessionId || ""),
    conflict_resolution_reversible: value.conflict_resolution_reversible === true || value.conflictResolutionReversible === true,
    conflict_resolution_historical_branches_preserved: value.conflict_resolution_historical_branches_preserved === true || value.conflictResolutionHistoricalBranchesPreserved === true,
    conflict_resolution_reverification_acceptance_required: value.conflict_resolution_reverification_acceptance_required === true || value.conflictResolutionReverificationAcceptanceRequired === true,
    conflict_resolution_reversible_acceptance_required: value.conflict_resolution_reversible_acceptance_required === true || value.conflictResolutionReversibleAcceptanceRequired === true,
    conflict_verification_acceptance_required: value.conflict_verification_acceptance_required === true || value.conflictVerificationAcceptanceRequired === true,
    usage_acceptance_required: value.usage_acceptance_required === true || value.usageAcceptanceRequired === true,
    current_session_acceptance_required: value.current_session_acceptance_required === true || value.currentSessionAcceptanceRequired === true,
    authority_boundary_valid: value.authority_boundary_valid === true || value.authorityBoundaryValid === true,
  });
  return {
    schema: "ccm-post-compact-receipt-memory-usage-repair-completion-preservation-v1",
    required: raw.required === true,
    preserved: raw.preserved === true,
    source: String(raw.source || "worker_context_packet_compaction_retry"),
    retry_id: String(raw.retry_id || raw.retryId || ""),
    before: summary(raw.before || {}),
    after: summary(raw.after || {}),
    missing_completion_doc_rel_paths: uniqueCoordinatorStrings(raw.missing_completion_doc_rel_paths || raw.missingCompletionDocRelPaths || []).slice(0, 16),
    missing_required_doc_rel_paths: uniqueCoordinatorStrings(raw.missing_required_doc_rel_paths || raw.missingRequiredDocRelPaths || []).slice(0, 16),
    missing_work_item_ids: uniqueCoordinatorStrings(raw.missing_work_item_ids || raw.missingWorkItemIds || []).slice(0, 24),
    missing_timeline_binding_ids: uniqueCoordinatorStrings(raw.missing_timeline_binding_ids || raw.missingTimelineBindingIds || []).slice(0, 24),
    missing_historical_task_agent_session_ids: uniqueCoordinatorStrings(raw.missing_historical_task_agent_session_ids || raw.missingHistoricalTaskAgentSessionIds || []).slice(0, 24),
    missing_historical_native_session_ids: uniqueCoordinatorStrings(raw.missing_historical_native_session_ids || raw.missingHistoricalNativeSessionIds || []).slice(0, 24),
    missing_conflict_resolution_doc_rel_paths: uniqueCoordinatorStrings(raw.missing_conflict_resolution_doc_rel_paths || raw.missingConflictResolutionDocRelPaths || []).slice(0, 8),
    gaps: uniqueCoordinatorStrings(raw.gaps || []).slice(0, 24),
  };
}

export function maybeRetryWorkerContextPacketCompactionForCoordinator(baseAssignment: any, dependsOn: string, replayRepairDispatchBriefs: any[], initialPacket: any, initialGate: any, options: any = {}) {
  return require("./group-orchestrator-worker-context").maybeRetryWorkerContextPacketCompactionForCoordinator(baseAssignment, dependsOn, replayRepairDispatchBriefs, initialPacket, initialGate, options);
}

export function rawProviderDispatchOverrideForCoordinator(assignment: any = {}, packet: any = {}) {
  return assignment.provider_dispatch_override
    || assignment.providerDispatchOverride
    || assignment.pressure_provenance_provider_dispatch_override
    || assignment.pressureProvenanceProviderDispatchOverride
    || packet.provider_dispatch_override
    || packet.providerDispatchOverride
    || packet.pressure_provenance_provider_dispatch_override
    || packet.pressureProvenanceProviderDispatchOverride
    || null;
}

export function normalizeProviderDispatchOverrideReceiptForCoordinator(raw: any = null, context: any = {}) {
  if (!raw || typeof raw !== "object") return null;
  const project = String(context.project || "").trim();
  const agentType = String(context.agentType || context.agent_type || "").trim();
  const receiptProject = String(raw.project || raw.target_project || raw.targetProject || "").trim();
  const receiptAgentType = String(raw.agent_type || raw.agentType || raw.provider || raw.runner || "").trim();
  const schema = String(raw.schema || "ccm-pressure-provenance-provider-dispatch-override-receipt-v1").trim();
  const overrideAction = String(raw.override_action || raw.overrideAction || raw.action || "allow_once").trim();
  const approvedBy = String(raw.approved_by || raw.approvedBy || raw.user || raw.user_id || raw.userId || "").trim();
  const reason = String(raw.reason || raw.justification || raw.user_reason || raw.userReason || "").trim();
  const expiresAt = String(raw.expires_at || raw.expiresAt || "").trim();
  const nowMs = Number(context.nowMs || Date.now());
  const expiresMs = expiresAt ? Date.parse(expiresAt) : NaN;
  const gaps: string[] = [];
  if (schema !== "ccm-pressure-provenance-provider-dispatch-override-receipt-v1"
    && schema !== "ccm-worker-context-provider-dispatch-override-receipt-v1") gaps.push("schema");
  if (raw.approved !== true && raw.user_approved !== true && raw.userApproved !== true) gaps.push("approved");
  if (raw.risk_accepted !== true && raw.riskAccepted !== true) gaps.push("risk_accepted");
  if (raw.acknowledges_repair_required !== true && raw.acknowledgesRepairRequired !== true) gaps.push("acknowledges_repair_required");
  if (!approvedBy) gaps.push("approved_by");
  if (!reason) gaps.push("reason");
  if (receiptProject && project && receiptProject.toLowerCase() !== project.toLowerCase()) gaps.push("project_mismatch");
  if (receiptAgentType && agentType && receiptAgentType.toLowerCase() !== agentType.toLowerCase()) gaps.push("agent_type_mismatch");
  if (expiresAt && (!Number.isFinite(expiresMs) || expiresMs <= nowMs)) gaps.push("expires_at");
  if (!["allow_once", "allow", "force_dispatch"].includes(overrideAction)) gaps.push("override_action");
  const valid = gaps.length === 0;
  const overrideId = String(raw.override_id || raw.overrideId || `provider-dispatch-override:${hashCoordinator([
    context.groupId || context.group_id || "",
    project,
    agentType,
    approvedBy,
    reason,
    raw.approved_at || raw.approvedAt || "",
  ], 14)}`);
  return {
    schema: "ccm-pressure-provenance-provider-dispatch-override-receipt-v1",
    version: 1,
    override_id: overrideId,
    status: valid ? "valid" : "invalid",
    valid,
    gaps,
    override_action: overrideAction,
    approved: raw.approved === true || raw.user_approved === true || raw.userApproved === true,
    approved_by: approvedBy,
    approved_at: raw.approved_at || raw.approvedAt || raw.at || "",
    risk_accepted: raw.risk_accepted === true || raw.riskAccepted === true,
    acknowledges_repair_required: raw.acknowledges_repair_required === true || raw.acknowledgesRepairRequired === true,
    reason,
    project: receiptProject || project,
    agent_type: receiptAgentType || agentType,
    health_status: context.healthStatus || context.health_status || raw.health_status || raw.healthStatus || "",
    dispatch_policy: context.dispatchPolicy || context.dispatch_policy || raw.dispatch_policy || raw.dispatchPolicy || "",
    expires_at: expiresAt,
    source: raw.source || "user_approved_provider_dispatch_override",
    raw,
  };
}

export function buildWorkerContextPreDispatchGateForCoordinator(assignment: any = {}, packet: any = {}) {
  return require("./group-orchestrator-worker-context").buildWorkerContextPreDispatchGateForCoordinator(assignment, packet);
}

export function buildWorkerContextProviderDispatchDecisionForCoordinator(assignment: any = {}, packet: any = {}, gate: any = {}, options: any = {}) {
  return require("./group-orchestrator-worker-context").buildWorkerContextProviderDispatchDecisionForCoordinator(assignment, packet, gate, options);
}

export function summarizeWorkerContextPacketTypedMemoryPressureRecallForCoordinator(packet: any = {}) {
  const memory = packet.memory || packet.group_memory || packet.groupMemory || {};
  const recall = memory?.group_state?.typedMemory?.recall
    || memory?.group_state?.typed_memory?.recall
    || memory?.groupState?.typedMemory?.recall
    || memory?.typedMemory?.recall
    || memory?.typed_memory?.recall
    || memory?.typedMemoryRecall
    || memory?.typed_memory_recall
    || null;
  const scoring = recall?.workerContextPressureScoring || recall?.worker_context_pressure_scoring || {};
  const feedbackPolicyScoring = recall?.workerContextPressureFeedbackPolicyScoring
    || recall?.worker_context_pressure_feedback_policy_scoring
    || {};
  const provenanceRequiresReceipt = (match: any = {}) => {
    const provenance = String(match.provenance_status || match.provenanceStatus || "").trim();
    return provenance === "disputed_under_repair"
      || provenance === "stale_evidence_under_repair"
      || !!String(match.repair_work_item_id || match.repairWorkItemId || match.work_item_id || match.workItemId || "").trim()
      || match.repair_open === true
      || match.repairOpen === true;
  };
  const docs = (Array.isArray(recall?.recalled) ? recall.recalled : [])
    .filter((doc: any) => {
      const pressure = doc.workerContextPressureRecall || doc.worker_context_pressure_recall || {};
      const pressureUsage = doc.workerContextPressureUsage || doc.worker_context_pressure_usage || {};
      const pressureFeedbackPolicy = doc.workerContextPressureFeedbackPolicy || doc.worker_context_pressure_feedback_policy || {};
      return Number(pressure.adjustment || 0) > 0
        || Number(pressureUsage.adjustment || 0) !== 0
        || (Array.isArray(pressureUsage.matched) && pressureUsage.matched.length > 0)
        || Number(pressureFeedbackPolicy.adjustment || 0) !== 0
        || pressureFeedbackPolicy.risk_doc === true;
    })
    .map((doc: any) => {
      const pressure = doc.workerContextPressureRecall || doc.worker_context_pressure_recall || {};
      const pressureUsage = doc.workerContextPressureUsage || doc.worker_context_pressure_usage || {};
      const pressureFeedbackPolicy = doc.workerContextPressureFeedbackPolicy || doc.worker_context_pressure_feedback_policy || {};
      const pressureUsageMatches = Array.isArray(pressureUsage.matched) ? pressureUsage.matched : [];
      const primaryUsage = pressureUsageMatches.find(provenanceRequiresReceipt) || pressureUsageMatches[0] || {};
      const requiresMemoryProvenanceUsage = provenanceRequiresReceipt(doc) || pressureUsageMatches.some(provenanceRequiresReceipt);
      return {
        rel_path: doc.relPath || doc.rel_path || "",
        name: doc.name || "",
        type: doc.type || "",
        score: Number(doc.score || 0),
        pressure_adjustment: Number(pressure.adjustment || 0),
        pressure_status: pressure.pressure_status || scoring.pressure_status || "",
        kinds: Array.isArray(pressure.kinds) ? pressure.kinds.slice(0, 8) : [],
        pressure_usage_adjustment: Number(pressureUsage.adjustment || 0),
        pressure_feedback_policy_adjustment: Number(pressureFeedbackPolicy.adjustment || 0),
        pressure_feedback_policy_action: pressureFeedbackPolicy.action || "",
        pressure_feedback_policy_risk_doc: pressureFeedbackPolicy.risk_doc === true,
        pressure_feedback_policy_repair_first: pressureFeedbackPolicy.repair_first === true,
        pressure_usage_recommendation: primaryUsage.recommendation || "",
        pressure_usage_matches: pressureUsageMatches.slice(0, 4).map((match: any) => ({
          rel_path: match.rel_path || match.relPath || doc.relPath || doc.rel_path || "",
          name: match.name || doc.name || "",
          target_project: match.target_project || match.targetProject || "",
          recommendation: match.recommendation || "",
          hint_scope: match.hint_scope || match.hintScope || "",
          provenance_status: match.provenance_status || match.provenanceStatus || "",
          repair_work_item_id: match.repair_work_item_id || match.repairWorkItemId || "",
          repair_status: match.repair_status || match.repairStatus || "",
          repair_gap_type: match.repair_gap_type || match.repairGapType || "",
          repair_open: match.repair_open === true || match.repairOpen === true,
          source_group_count: Number(match.source_group_count || match.sourceGroupCount || 0),
        })),
        provenance_status: primaryUsage.provenance_status || primaryUsage.provenanceStatus || "",
        repair_work_item_id: primaryUsage.repair_work_item_id || primaryUsage.repairWorkItemId || "",
        repair_status: primaryUsage.repair_status || primaryUsage.repairStatus || "",
        repair_gap_type: primaryUsage.repair_gap_type || primaryUsage.repairGapType || "",
        requires_memory_provenance_usage: requiresMemoryProvenanceUsage,
      };
    });
  return {
    schema: "ccm-worker-context-packet-typed-memory-pressure-recall-v1",
    active: scoring.active === true || docs.length > 0,
    pressure_status: scoring.pressure_status || "",
    boosted_count: docs.length,
    recalled_count: Array.isArray(recall?.recalled) ? recall.recalled.length : 0,
    pressure_feedback_policy_scoring: feedbackPolicyScoring?.schema ? feedbackPolicyScoring : null,
    docs: docs.slice(0, 12),
  };
}

export function readReplayRepairDispatchPlanLedgerForCoordinator(groupId: string, groupSessionId = "") {
  return require("./group-orchestrator-replay-repair").readReplayRepairDispatchPlanLedgerForCoordinator(groupId, groupSessionId);
}

export function readReplayRepairDispatchBindingLedgerForCoordinator(groupId: string) {
  return require("./group-orchestrator-replay-repair").readReplayRepairDispatchBindingLedgerForCoordinator(groupId);
}

export function recordWorkerContextPacketAssignmentBindingForCoordinator(groupId: string, assignment: any = {}, options: any = {}) {
  return require("./group-orchestrator-worker-context").recordWorkerContextPacketAssignmentBindingForCoordinator(groupId, assignment, options);
}

export function providerSwitchBindingLedgerCountersForCoordinator(entries: any[] = []) {
  return {
    providerSwitchAdvisedCount: entries.filter((item: any) => item.provider_switch_ledger_state?.advised_alternative === true).length,
    providerSwitchApprovedCount: entries.filter((item: any) => item.provider_switch_ledger_state?.approved_switch === true).length,
    providerSwitchSessionBoundCount: entries.filter((item: any) => item.worker_context_provider_switch_session_binding?.status === "bound").length,
    providerSwitchExecutedCount: entries.filter((item: any) => !!item.provider_switch_ledger_state?.actually_executed_provider).length,
    providerSwitchExecutionPassedCount: entries.filter((item: any) => item.worker_context_provider_switch_execution_receipt?.status === "passed").length,
    providerSwitchExecutionFailedCount: entries.filter((item: any) => item.worker_context_provider_switch_execution_receipt?.status === "failed").length,
  };
}

export function findWorkerContextBindingIndexForCoordinator(entries: any[] = [], input: any = {}) {
  const bindingId = String(input.binding_id || input.bindingId || "").trim();
  const assignmentId = String(input.assignment_id || input.assignmentId || "").trim();
  const dispatchKey = String(input.dispatch_key || input.dispatchKey || "").trim();
  const packetId = String(input.worker_context_packet_id || input.workerContextPacketId || "").trim();
  return entries.findIndex((entry: any) => {
    if (bindingId && String(entry.binding_id || "") === bindingId) return true;
    if (assignmentId && String(entry.assignment_id || "") === assignmentId) return true;
    if (dispatchKey && String(entry.dispatch_key || "") === dispatchKey) return true;
    return !!packetId && String(entry.worker_context_packet_id || "") === packetId;
  });
}

export function recordWorkerContextProviderSwitchSessionBindingForCoordinator(groupId: string, input: any = {}, options: any = {}) {
  return require("./group-orchestrator-worker-context").recordWorkerContextProviderSwitchSessionBindingForCoordinator(groupId, input, options);
}

export function recordWorkerContextProviderSwitchExecutionReceiptForCoordinator(groupId: string, input: any = {}, options: any = {}) {
  return require("./group-orchestrator-worker-context").recordWorkerContextProviderSwitchExecutionReceiptForCoordinator(groupId, input, options);
}

export function recordWorkerContextProviderDispatchOverrideCompletionForCoordinator(groupId: string, input: any = {}, options: any = {}) {
  return require("./group-orchestrator-worker-context").recordWorkerContextProviderDispatchOverrideCompletionForCoordinator(groupId, input, options);
}

export function readReplayRepairDispatchTimelineBindingLedgerForCoordinator(groupId: string) {
  return require("./group-orchestrator-replay-repair").readReplayRepairDispatchTimelineBindingLedgerForCoordinator(groupId);
}

export function uniqueCoordinatorStrings(values: any[] = []) {
  return [...new Set((values || []).map((item: any) => String(item || "").trim()).filter(Boolean))];
}

export const REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS_FOR_COORDINATOR = [
  "dispatch",
  "child_agent_start",
  "worker_handoff_ready",
  "task_agent_memory_context_snapshot",
  "child_agent_receipt",
];

export function replayRepairWorkItemStatusForCoordinator(value: any) {
  const status = String(value || "").trim().toLowerCase();
  if (["in_progress", "running", "claimed", "dispatching"].includes(status)) return "in_progress";
  if (["blocked", "needs_info", "needs_user", "waiting"].includes(status)) return "blocked";
  if (["completed", "done", "resolved", "ok"].includes(status)) return "completed";
  if (["cancelled", "canceled", "superseded"].includes(status)) return "cancelled";
  return "pending";
}

export function replayRepairWorkItemOpenForCoordinator(status: any) {
  return ["pending", "in_progress", "blocked"].includes(replayRepairWorkItemStatusForCoordinator(status));
}

export const API_MICROCOMPACT_NATIVE_PROOF_REPAIR_SOURCES_FOR_COORDINATOR = new Set([
  "api_microcompact_native_apply_binding_repair",
  "api_microcompact_native_apply_provider_reproof",
]);

export function isApiMicrocompactNativeProofRepairSourceForCoordinator(source: any) {
  return API_MICROCOMPACT_NATIVE_PROOF_REPAIR_SOURCES_FOR_COORDINATOR.has(String(source || "").trim());
}

export function isTimelineClosableNativeRepairSourceForCoordinator(source: any) {
  return String(source || "").trim() === "api_microcompact_native_apply_binding_repair";
}

export function isProviderRankingProvenanceCompactRepairSourceForCoordinator(source: any) {
  return String(source || "").trim() === "worker_context_provider_ranking_provenance_compact_repair";
}

export function isPostCompactReinjectionRepairForCoordinator(value: any = {}) {
  return String(value.source || "").trim() === "compact_boundary_replay_repair"
    && String(value.component || "").trim() === "post_compact_reinject";
}

export function replayRepairWorkItemStatsForCoordinator(items: any[] = []) {
  const normalized = (Array.isArray(items) ? items : []).map((item: any) => replayRepairWorkItemStatusForCoordinator(item.status));
  return {
    total: normalized.length,
    openItemCount: normalized.filter(status => replayRepairWorkItemOpenForCoordinator(status)).length,
    pendingCount: normalized.filter(status => status === "pending").length,
    inProgressCount: normalized.filter(status => status === "in_progress").length,
    blockedCount: normalized.filter(status => status === "blocked").length,
    completedCount: normalized.filter(status => status === "completed").length,
    cancelledCount: normalized.filter(status => status === "cancelled").length,
  };
}

export function readReplayRepairWorkItemLedgerForCoordinator(groupId: string) {
  return require("./group-orchestrator-replay-repair").readReplayRepairWorkItemLedgerForCoordinator(groupId);
}

export function writeReplayRepairWorkItemLedgerForCoordinator(groupId: string, items: any[] = [], at = new Date().toISOString(), extra: any = {}) {
  const ledger = readReplayRepairWorkItemLedgerForCoordinator(groupId);
  const next = {
    ...ledger,
    ...extra,
    schema: ledger.schema || "ccm-compact-boundary-replay-repair-work-items-v1",
    version: ledger.version || 1,
    groupId: ledger.groupId || groupId,
    file: ledger.file || getReplayRepairWorkItemsFileForCoordinator(groupId),
    items: items.slice(-160),
    stats: replayRepairWorkItemStatsForCoordinator(items),
    updatedAt: at,
  };
  writeJsonAtomicForCoordinator(next.file, next);
  return next;
}

export function providerDispatchOverrideFollowupWorkItemIdForCoordinator(groupId: string, entry: any = {}) {
  const decision = entry.worker_context_provider_dispatch_decision || entry.provider_dispatch_decision || {};
  const overrideReceipt = entry.worker_context_provider_dispatch_override_receipt
    || decision.provider_dispatch_override_receipt
    || decision.override
    || {};
  return `provider-dispatch-override-followup:${hashCoordinator([
    groupId,
    decision.decision_id || "",
    overrideReceipt.override_id || "",
    entry.assignment_id || "",
    entry.worker_context_packet_id || "",
  ], 14)}`;
}

export function syncProviderDispatchOverrideFollowupRepairWorkItemForCoordinator(groupId: string, entry: any = {}, at = new Date().toISOString()) {
  const decision = entry.worker_context_provider_dispatch_decision || entry.provider_dispatch_decision || {};
  if (!groupId || decision.action !== "dispatch_with_provider_override") return null;
  const overrideReceipt = entry.worker_context_provider_dispatch_override_receipt
    || decision.provider_dispatch_override_receipt
    || decision.override
    || {};
  if (overrideReceipt?.valid !== true) return null;
  const ledger = readReplayRepairWorkItemLedgerForCoordinator(groupId);
  const items = Array.isArray(ledger.items) ? [...ledger.items] : [];
  const workItemId = providerDispatchOverrideFollowupWorkItemIdForCoordinator(groupId, entry);
  const evidence = [
    `decision_id=${decision.decision_id || ""}`,
    `override_id=${overrideReceipt.override_id || ""}`,
    `assignment_id=${entry.assignment_id || ""}`,
    `worker_context_packet_id=${entry.worker_context_packet_id || ""}`,
  ].filter(Boolean);
  const draft = {
    schema: "ccm-provider-dispatch-override-followup-repair-work-item-v1",
    id: workItemId,
    work_item_id: workItemId,
    source: "worker_context_pressure_provenance_provider_dispatch_override_followup",
    component: "worker_context_pressure_provenance_provider_dispatch_override",
    status: "pending",
    priority: "high",
    groupId,
    project: entry.project || decision.project || "",
    agent_type: entry.agent_type || decision.agent_type || "unknown",
    assignment_id: entry.assignment_id || "",
    dispatch_key: entry.dispatch_key || "",
    worker_context_packet_id: entry.worker_context_packet_id || "",
    decision_id: decision.decision_id || "",
    override_id: overrideReceipt.override_id || "",
    repair_target: "pressure_provenance_provider_override_followup",
    expected: "child Agent completion receipt must include memoryProvenanceUsage rows with currentSourceVerified=true after provider override dispatch",
    prompt_patch: "因为本次 provider hold 被用户结构化 override 放行，完成回执必须补强 memoryProvenanceUsage/currentSourceVerified=true，并说明后续 pressure provenance repair/recovery 证据。",
    reason: decision.reason || overrideReceipt.reason || "provider dispatch override requires follow-up pressure provenance repair evidence",
    evidence: uniqueCoordinatorStrings(evidence).slice(0, 24),
    blockers: [],
    needs: ["等待 override 子 Agent 完成回执补强 memoryProvenanceUsage/currentSourceVerified=true"],
    createdAt: at,
    updatedAt: at,
  };
  const existingIndex = items.findIndex((item: any) => String(item.work_item_id || item.id || "") === workItemId);
  if (existingIndex >= 0) {
    const existing = items[existingIndex];
    items[existingIndex] = {
      ...existing,
      ...draft,
      status: replayRepairWorkItemOpenForCoordinator(existing.status) ? existing.status || "pending" : existing.status,
      createdAt: existing.createdAt || existing.created_at || draft.createdAt,
      evidence: uniqueCoordinatorStrings([...(Array.isArray(existing.evidence) ? existing.evidence : []), ...draft.evidence]).slice(-24),
      needs: replayRepairWorkItemOpenForCoordinator(existing.status) ? uniqueCoordinatorStrings([...(Array.isArray(existing.needs) ? existing.needs : []), ...draft.needs]).slice(-12) : [],
      updatedAt: at,
    };
  } else {
    items.push(draft);
  }
  const next = writeReplayRepairWorkItemLedgerForCoordinator(groupId, items, at, {
    latestProviderDispatchOverrideFollowup: {
      work_item_id: workItemId,
      decision_id: decision.decision_id || "",
      override_id: overrideReceipt.override_id || "",
      assignment_id: entry.assignment_id || "",
      at,
    },
  });
  return {
    schema: "ccm-provider-dispatch-override-followup-repair-work-item-ref-v1",
    work_item_id: workItemId,
    file: next.file,
    status: (next.items || []).find((item: any) => String(item.work_item_id || item.id || "") === workItemId)?.status || "pending",
    source: "worker_context_pressure_provenance_provider_dispatch_override_followup",
  };
}

export function pressureProvenanceUsageRowsFromReceiptForCoordinator(receipt: any = {}) {
  return [
    ...(Array.isArray(receipt.memoryProvenanceUsage) ? receipt.memoryProvenanceUsage : []),
    ...(Array.isArray(receipt.memory_provenance_usage) ? receipt.memory_provenance_usage : []),
    ...(Array.isArray(receipt.pressureMemoryProvenanceUsage) ? receipt.pressureMemoryProvenanceUsage : []),
    ...(Array.isArray(receipt.pressure_memory_provenance_usage) ? receipt.pressure_memory_provenance_usage : []),
  ].filter((row: any) => row && typeof row === "object");
}

export function buildProviderDispatchOverrideCompletionForCoordinator(entry: any = {}, input: any = {}, at = new Date().toISOString()) {
  const receipt = input.receipt || input.ccm_receipt || input.delivery_summary || {};
  const rows = pressureProvenanceUsageRowsFromReceiptForCoordinator(receipt);
  const verifiedRows = rows.filter((row: any) => row.currentSourceVerified === true || row.current_source_verified === true);
  const receiptStatus = String(input.receipt_status || input.receiptStatus || receipt.status || "").trim().toLowerCase();
  const statusDone = ["done", "completed", "ok", "success"].includes(receiptStatus);
  const completionOk = statusDone && rows.length > 0 && verifiedRows.length === rows.length;
  const decision = entry.worker_context_provider_dispatch_decision || entry.provider_dispatch_decision || {};
  const overrideReceipt = entry.worker_context_provider_dispatch_override_receipt
    || decision.provider_dispatch_override_receipt
    || decision.override
    || {};
  return {
    schema: "ccm-worker-context-provider-dispatch-override-completion-v1",
    completion_id: `provider-dispatch-override-completion:${hashCoordinator([
      entry.binding_id || "",
      entry.assignment_id || "",
      entry.worker_context_packet_id || "",
      input.task_id || input.taskId || "",
      input.execution_id || input.executionId || "",
    ], 14)}`,
    status: completionOk ? "completed" : "needs_repair",
    groupId: entry.groupId || input.groupId || input.group_id || "",
    project: entry.project || input.project || "",
    agent_type: entry.agent_type || input.agent_type || input.agentType || "unknown",
    binding_id: entry.binding_id || "",
    assignment_id: entry.assignment_id || input.assignment_id || input.assignmentId || "",
    dispatch_key: entry.dispatch_key || input.dispatch_key || input.dispatchKey || "",
    worker_context_packet_id: entry.worker_context_packet_id || input.worker_context_packet_id || input.workerContextPacketId || "",
    decision_id: decision.decision_id || "",
    override_id: overrideReceipt.override_id || "",
    followup_work_item_id: entry.worker_context_provider_dispatch_override_followup_repair?.work_item_id
      || entry.provider_dispatch_override_followup_repair_work_item?.work_item_id
      || "",
    task_id: input.task_id || input.taskId || "",
    worker_handoff_id: input.worker_handoff_id || input.workerHandoffId || "",
    task_agent_session_id: input.task_agent_session_id || input.taskAgentSessionId || "",
    native_session_id: input.native_session_id || input.nativeSessionId || "",
    execution_id: input.execution_id || input.executionId || "",
    memory_context_snapshot_id: input.memory_context_snapshot_id || input.memoryContextSnapshotId || "",
    memory_context_snapshot_checksum: input.memory_context_snapshot_checksum || input.memoryContextSnapshotChecksum || "",
    receipt_status: receiptStatus,
    receipt,
    memory_provenance_usage_count: rows.length,
    current_source_verified_count: verifiedRows.length,
    completion_ok: completionOk,
    reason: completionOk
      ? "override child-agent completion receipt supplied verified memoryProvenanceUsage follow-up evidence"
      : "override child-agent completion receipt missing verified memoryProvenanceUsage follow-up evidence",
    at,
  };
}

export function providerOverrideFollowupContractStringListForCoordinator(value: any, limit = 16) {
  const raw = Array.isArray(value)
    ? value
    : value === undefined || value === null || value === "" ? [] : [value];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const text = String(item || "").trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

export function providerOverrideFollowupContractReceiptRowValueForCoordinator(row: any = {}, keys: string[] = []) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value || "").trim()) return String(value || "").trim();
  }
  return "";
}

export function providerOverrideFollowupContractReceiptRowReverifiedForCoordinator(row: any = {}) {
  return row.providerDispatchOverrideFollowupHistoryReverified === true
    || row.provider_dispatch_override_followup_history_reverified === true
    || row.providerOverrideFollowupHistoryReverified === true
    || row.provider_override_followup_history_reverified === true;
}

export function providerOverrideFollowupContractReceiptRowMatchesForCoordinator(row: any = {}, kind: string, value: string) {
  const target = String(value || "").trim().toLowerCase();
  if (!target) return false;
  if (kind === "rel_path") {
    return providerOverrideFollowupContractReceiptRowValueForCoordinator(row, ["relPath", "rel_path", "path", "memoryRelPath", "memory_rel_path"]).toLowerCase() === target;
  }
  if (kind === "work_item") {
    return providerOverrideFollowupContractReceiptRowValueForCoordinator(row, ["repairWorkItemId", "repair_work_item_id", "workItemId", "work_item_id"]).toLowerCase() === target;
  }
  if (kind === "override") {
    return providerOverrideFollowupContractReceiptRowValueForCoordinator(row, ["providerDispatchOverrideId", "provider_dispatch_override_id", "overrideId", "override_id"]).toLowerCase() === target;
  }
  return false;
}

// ===== merged from group-orchestrator-coded-part-04.ts =====

export function buildProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator(entry: any = {}, input: any = {}, at = new Date().toISOString()) {
  const contract = entry.worker_context_packet_pressure_provenance_provider_dispatch_override_followup_receipt_contract
    || entry.workerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptContract
    || {};
  const receipt = input.receipt || input.ccm_receipt || input.delivery_summary || {};
  const rows = pressureProvenanceUsageRowsFromReceiptForCoordinator(receipt);
  const receiptStatus = String(input.receipt_status || input.receiptStatus || receipt.status || "").trim().toLowerCase();
  const statusDone = ["done", "completed", "ok", "success"].includes(receiptStatus);
  const relPaths = providerOverrideFollowupContractStringListForCoordinator(contract.rel_paths || contract.relPaths, 24);
  const workItemIds = providerOverrideFollowupContractStringListForCoordinator(contract.followup_work_item_ids || contract.followupWorkItemIds, 24);
  const overrideIds = providerOverrideFollowupContractStringListForCoordinator(contract.override_ids || contract.overrideIds, 24);
  const reverifiedRows = rows.filter(providerOverrideFollowupContractReceiptRowReverifiedForCoordinator);
  const verifiedRows = rows.filter((row: any) => row.currentSourceVerified === true || row.current_source_verified === true || row.verified === true);
  const contractRows = rows.filter((row: any) => providerOverrideFollowupContractReceiptRowReverifiedForCoordinator(row)
    || String(row.repairGapType || row.repair_gap_type || "").trim() === "provider_dispatch_override_followup");
  const gaps: any[] = [];
  if (contract.schema !== "ccm-pressure-provenance-provider-dispatch-override-followup-receipt-contract-v1" || contract.active !== true) {
    gaps.push({ code: "missing_contract", reason: "binding missing active provider override follow-up receipt contract" });
  }
  if (!statusDone) gaps.push({ code: "receipt_status_not_done", reason: `receipt status ${receiptStatus || "missing"} is not done/completed/ok` });
  if (!rows.length) gaps.push({ code: "missing_memory_provenance_usage", reason: "receipt missing memoryProvenanceUsage rows" });
  if (!contractRows.length) gaps.push({ code: "missing_provider_override_followup_reverified_rows", reason: "receipt missing provider override follow-up reverified memoryProvenanceUsage rows" });
  const missingRelPaths = relPaths.filter(item => !rows.some((row: any) => providerOverrideFollowupContractReceiptRowMatchesForCoordinator(row, "rel_path", item)
    && providerOverrideFollowupContractReceiptRowReverifiedForCoordinator(row)
    && (row.currentSourceVerified === true || row.current_source_verified === true || row.verified === true)));
  const missingWorkItems = workItemIds.filter(item => !rows.some((row: any) => providerOverrideFollowupContractReceiptRowMatchesForCoordinator(row, "work_item", item)
    && providerOverrideFollowupContractReceiptRowReverifiedForCoordinator(row)
    && (row.currentSourceVerified === true || row.current_source_verified === true || row.verified === true)));
  const missingOverrideIds = overrideIds.filter(item => !rows.some((row: any) => providerOverrideFollowupContractReceiptRowMatchesForCoordinator(row, "override", item)
    && providerOverrideFollowupContractReceiptRowReverifiedForCoordinator(row)
    && (row.currentSourceVerified === true || row.current_source_verified === true || row.verified === true)));
  if (missingRelPaths.length) gaps.push({ code: "missing_rel_path_coverage", reason: `receipt missing reverified relPath coverage: ${missingRelPaths.join(", ")}`, missing: missingRelPaths });
  if (missingWorkItems.length) gaps.push({ code: "missing_followup_work_item_coverage", reason: `receipt missing reverified follow-up work item coverage: ${missingWorkItems.join(", ")}`, missing: missingWorkItems });
  if (missingOverrideIds.length) gaps.push({ code: "missing_override_id_coverage", reason: `receipt missing reverified override id coverage: ${missingOverrideIds.join(", ")}`, missing: missingOverrideIds });
  for (const row of contractRows) {
    const rowLabel = providerOverrideFollowupContractReceiptRowValueForCoordinator(row, ["relPath", "rel_path", "repairWorkItemId", "repair_work_item_id", "providerDispatchOverrideId", "provider_dispatch_override_id"]) || "provider override follow-up row";
    if (!(row.currentSourceVerified === true || row.current_source_verified === true || row.verified === true)) {
      gaps.push({ code: "current_source_verified_missing", reason: `${rowLabel} missing currentSourceVerified=true` });
    }
    if (!String(row.usageState || row.usage_state || "").trim()) gaps.push({ code: "usage_state_missing", reason: `${rowLabel} missing usageState` });
    if (!String(row.repairStatus || row.repair_status || "").trim()) gaps.push({ code: "repair_status_missing", reason: `${rowLabel} missing repairStatus` });
    if (String(row.repairGapType || row.repair_gap_type || "").trim() !== "provider_dispatch_override_followup") {
      gaps.push({ code: "repair_gap_type_mismatch", reason: `${rowLabel} missing repairGapType=provider_dispatch_override_followup` });
    }
  }
  const contractSatisfied = contract.schema === "ccm-pressure-provenance-provider-dispatch-override-followup-receipt-contract-v1"
    && contract.active === true
    && statusDone
    && rows.length > 0
    && contractRows.length > 0
    && gaps.length === 0;
  return {
    schema: "ccm-worker-context-provider-dispatch-override-followup-receipt-contract-validation-v1",
    validation_id: `provider-dispatch-override-followup-receipt-contract-validation:${hashCoordinator([
      entry.binding_id || "",
      entry.assignment_id || "",
      entry.worker_context_packet_id || "",
      input.task_id || input.taskId || "",
      input.execution_id || input.executionId || "",
    ], 14)}`,
    groupId: entry.groupId || input.groupId || input.group_id || "",
    project: entry.project || input.project || "",
    agent_type: entry.agent_type || input.agent_type || input.agentType || "unknown",
    binding_id: entry.binding_id || "",
    assignment_id: entry.assignment_id || input.assignment_id || input.assignmentId || "",
    dispatch_key: entry.dispatch_key || input.dispatch_key || input.dispatchKey || "",
    worker_context_packet_id: entry.worker_context_packet_id || input.worker_context_packet_id || input.workerContextPacketId || "",
    task_id: input.task_id || input.taskId || "",
    worker_handoff_id: input.worker_handoff_id || input.workerHandoffId || "",
    task_agent_session_id: input.task_agent_session_id || input.taskAgentSessionId || "",
    native_session_id: input.native_session_id || input.nativeSessionId || "",
    execution_id: input.execution_id || input.executionId || "",
    receipt_status: receiptStatus,
    receipt,
    contract,
    contract_required: contract.active === true,
    contract_satisfied: contractSatisfied,
    status: contractSatisfied ? "passed" : "failed",
    memory_provenance_usage_count: rows.length,
    provider_override_followup_reverified_row_count: reverifiedRows.length,
    current_source_verified_count: verifiedRows.length,
    contract_row_count: contractRows.length,
    required_rel_path_count: relPaths.length,
    covered_rel_path_count: Math.max(0, relPaths.length - missingRelPaths.length),
    required_followup_work_item_count: workItemIds.length,
    covered_followup_work_item_count: Math.max(0, workItemIds.length - missingWorkItems.length),
    required_override_id_count: overrideIds.length,
    covered_override_id_count: Math.max(0, overrideIds.length - missingOverrideIds.length),
    gaps,
    reason: contractSatisfied
      ? "provider override follow-up receipt contract satisfied by reverified memoryProvenanceUsage rows"
      : "provider override follow-up receipt contract missing required reverified memoryProvenanceUsage evidence",
    at,
  };
}

export function providerDispatchOverrideFollowupReceiptValidationRepairWorkItemIdForCoordinator(groupId: string, entry: any = {}) {
  return `provider-dispatch-override-followup-receipt-validation-repair:${hashCoordinator([
    groupId,
    entry.binding_id || "",
    entry.assignment_id || "",
    entry.worker_context_packet_id || "",
  ], 14)}`;
}

export function syncProviderDispatchOverrideFollowupReceiptValidationRepairWorkItemForCoordinator(groupId: string, entry: any = {}, validation: any = {}, at = new Date().toISOString()) {
  if (!groupId || !entry.worker_context_packet_id || validation.contract_required !== true) return null;
  const ledger = readReplayRepairWorkItemLedgerForCoordinator(groupId);
  const items = Array.isArray(ledger.items) ? [...ledger.items] : [];
  const workItemId = providerDispatchOverrideFollowupReceiptValidationRepairWorkItemIdForCoordinator(groupId, entry);
  const existingIndex = items.findIndex((item: any) => String(item.work_item_id || item.id || "") === workItemId);
  const contract = validation.contract || {};
  const relPaths = providerOverrideFollowupContractStringListForCoordinator(contract.rel_paths || contract.relPaths, 24);
  const followupWorkItemIds = providerOverrideFollowupContractStringListForCoordinator(contract.followup_work_item_ids || contract.followupWorkItemIds, 24);
  const overrideIds = providerOverrideFollowupContractStringListForCoordinator(contract.override_ids || contract.overrideIds, 24);
  const gapCodes = providerOverrideFollowupContractStringListForCoordinator((validation.gaps || []).map((gap: any) => gap.code || gap.reason), 24);
  const completed = validation.contract_satisfied === true && validation.status === "passed";
  const base = existingIndex >= 0 ? items[existingIndex] : {};
  const nextItem = {
    ...base,
    schema: "ccm-provider-dispatch-override-followup-receipt-validation-repair-work-item-v1",
    id: workItemId,
    work_item_id: workItemId,
    source: "worker_context_provider_dispatch_override_followup_receipt_contract_validation_repair",
    component: "worker_context_provider_dispatch_override_followup_receipt_contract",
    subject: `Repair provider override follow-up receipt contract for ${entry.project || validation.project || "unknown"}`,
    status: completed ? "completed" : "pending",
    priority: "high",
    owner: completed ? base.owner || "group-main-agent" : "group-main-agent",
    groupId,
    project: entry.project || validation.project || "",
    target_project: entry.project || validation.project || "",
    dispatch_target: completed ? "" : entry.project || validation.project || "",
    agent_type: entry.agent_type || validation.agent_type || "unknown",
    repair_target: entry.project || validation.project || "provider-dispatch-receipt",
    binding_id: entry.binding_id || validation.binding_id || "",
    worker_context_packet_binding_id: entry.binding_id || validation.binding_id || "",
    assignment_id: entry.assignment_id || validation.assignment_id || "",
    dispatch_key: entry.dispatch_key || validation.dispatch_key || "",
    worker_context_packet_id: entry.worker_context_packet_id || validation.worker_context_packet_id || "",
    task_id: validation.task_id || "",
    task_agent_session_id: validation.task_agent_session_id || "",
    execution_id: validation.execution_id || "",
    provider_override_followup_contract_validation_id: validation.validation_id || "",
    provider_override_followup_contract_rel_paths: relPaths,
    provider_override_followup_contract_work_item_ids: followupWorkItemIds,
    provider_override_followup_contract_override_ids: overrideIds,
    provider_override_followup_contract_gap_codes: gapCodes,
    instruction: "Return a corrected CCM_AGENT_RECEIPT.memoryProvenanceUsage covering every provider override follow-up repaired-history relPath, work item, and override id.",
    expected: "validation.status=passed; providerDispatchOverrideFollowupHistoryReverified=true; currentSourceVerified=true for every required row",
    prompt_patch: [
      "Only repair the final receipt evidence; do not redo unrelated implementation.",
      relPaths.length ? `Required relPath: ${relPaths.join(", ")}.` : "",
      followupWorkItemIds.length ? `Required repairWorkItemId: ${followupWorkItemIds.join(", ")}.` : "",
      overrideIds.length ? `Required providerDispatchOverrideId: ${overrideIds.join(", ")}.` : "",
      gapCodes.length ? `Validation gaps: ${gapCodes.join(", ")}.` : "",
      "Each corrected memoryProvenanceUsage row must set repairGapType=provider_dispatch_override_followup, currentSourceVerified=true, and providerDispatchOverrideFollowupHistoryReverified=true.",
    ].filter(Boolean).join("\n"),
    reason: validation.reason || "provider override follow-up receipt contract validation failed",
    blockers: completed ? [] : gapCodes,
    needs: completed ? [] : ["corrected CCM_AGENT_RECEIPT.memoryProvenanceUsage"],
    evidence: uniqueCoordinatorStrings([
      ...(Array.isArray(base.evidence) ? base.evidence : []),
      `validation_id=${validation.validation_id || ""}`,
      `binding_id=${entry.binding_id || ""}`,
      `worker_context_packet_id=${entry.worker_context_packet_id || ""}`,
      `validation_status=${validation.status || ""}`,
      ...gapCodes.map((code: string) => `gap=${code}`),
    ]).slice(-32),
    verification: completed
      ? uniqueCoordinatorStrings([...(Array.isArray(base.verification) ? base.verification : []), "provider override follow-up receipt contract validation passed"]).slice(-24)
      : Array.isArray(base.verification) ? base.verification : [],
    createdAt: base.createdAt || base.created_at || at,
    updatedAt: at,
    completedAt: completed ? base.completedAt || base.completed_at || at : "",
    completion_source: completed ? "provider_dispatch_override_followup_receipt_contract_validation" : "",
    resolutionReason: completed ? "corrected_child_agent_receipt_satisfied_provider_override_followup_contract" : "",
  };
  if (existingIndex >= 0) items[existingIndex] = nextItem;
  else items.push(nextItem);
  const next = writeReplayRepairWorkItemLedgerForCoordinator(groupId, items, at, {
    latestProviderDispatchOverrideFollowupReceiptValidationRepair: {
      work_item_id: workItemId,
      validation_id: validation.validation_id || "",
      status: nextItem.status,
      binding_id: entry.binding_id || "",
      at,
    },
  });
  return {
    schema: "ccm-provider-dispatch-override-followup-receipt-validation-repair-work-item-ref-v1",
    work_item_id: workItemId,
    status: nextItem.status,
    file: next.file,
    source: nextItem.source,
  };
}

export function recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator(groupId: string, input: any = {}, options: any = {}) {
  return require("./group-orchestrator-worker-context").recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator(groupId, input, options);
}

export function closeProviderDispatchOverrideFollowupRepairWorkItemForCoordinator(groupId: string, completion: any = {}, at = new Date().toISOString()) {
  if (!groupId || completion.completion_ok !== true || !completion.followup_work_item_id) return { closed: 0, itemIds: [] };
  const ledger = readReplayRepairWorkItemLedgerForCoordinator(groupId);
  const items = Array.isArray(ledger.items) ? [...ledger.items] : [];
  let closed = 0;
  const itemIds: string[] = [];
  const nextItems = items.map((item: any) => {
    const itemId = String(item.work_item_id || item.id || "").trim();
    if (itemId !== String(completion.followup_work_item_id || "").trim()) return item;
    if (!replayRepairWorkItemOpenForCoordinator(item.status)) return item;
    closed += 1;
    itemIds.push(itemId);
    return {
      ...item,
      status: "completed",
      updatedAt: at,
      completedAt: item.completedAt || item.completed_at || at,
      completion_source: "provider_dispatch_override_completion_receipt",
      resolutionReason: "override_child_agent_receipt_verified_pressure_provenance_followup",
      provider_dispatch_override_completion: {
        completion_id: completion.completion_id || "",
        decision_id: completion.decision_id || "",
        override_id: completion.override_id || "",
        task_id: completion.task_id || "",
        task_agent_session_id: completion.task_agent_session_id || "",
        execution_id: completion.execution_id || "",
        receipt_status: completion.receipt_status || "",
        memory_provenance_usage_count: completion.memory_provenance_usage_count || 0,
        current_source_verified_count: completion.current_source_verified_count || 0,
        completed_at: at,
      },
      blockers: [],
      needs: [],
      evidence: uniqueCoordinatorStrings([
        ...(Array.isArray(item.evidence) ? item.evidence : []),
        `completion_id=${completion.completion_id || ""}`,
        `task_agent_session_id=${completion.task_agent_session_id || ""}`,
        `execution_id=${completion.execution_id || ""}`,
        `memory_provenance_usage_count=${completion.memory_provenance_usage_count || 0}`,
      ]).slice(-24),
      verification: uniqueCoordinatorStrings([
        ...(Array.isArray(item.verification) ? item.verification : []),
        "override completion receipt supplied verified pressure provenance follow-up evidence",
      ]).slice(-24),
    };
  });
  if (!closed) return { closed: 0, itemIds: [] };
  writeReplayRepairWorkItemLedgerForCoordinator(groupId, nextItems, at, {
    latestProviderDispatchOverrideCompletion: {
      completion_id: completion.completion_id || "",
      work_item_id: completion.followup_work_item_id || "",
      closed,
      itemIds,
      at,
    },
  });
  return { closed, itemIds };
}

export function timelineBindingHasRequiredNativeRepairEvidence(binding: any = {}) {
  if (!isTimelineClosableNativeRepairSourceForCoordinator(binding.source)) return false;
  const eventTypes = new Set((Array.isArray(binding.event_types) ? binding.event_types : []).map((item: any) => String(item || "").trim()).filter(Boolean));
  if (!REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS_FOR_COORDINATOR.every(type => eventTypes.has(type))) return false;
  const receiptStatus = String(binding.receipt_status || binding.receiptStatus || "").trim();
  return !!binding.brief_id
    && !!binding.work_item_id
    && !!binding.task_id
    && !!binding.assignment_id
    && !!binding.dispatch_key
    && !!binding.worker_context_packet_id
    && !!binding.task_agent_session_id
    && !!binding.memory_context_snapshot_id
    && !!binding.execution_id
    && !!binding.runner_request_id
    && !!binding.proof_entry_id
    && !!binding.request_patch_checksum
    && !!binding.request_telemetry_session_status
    && !!binding.request_telemetry_dispatch_status
    && ["done", "completed", "ok"].includes(receiptStatus);
}

export function timelineBindingMatchesRepairWorkItem(binding: any = {}, item: any = {}) {
  const bindingWorkItemId = String(binding.work_item_id || "").trim();
  const itemId = String(item.work_item_id || item.id || "").trim();
  if (bindingWorkItemId && itemId && bindingWorkItemId === itemId) return true;
  const bindingRequest = String(binding.request_patch_checksum || "").trim();
  const itemRequest = String(item.request_patch_checksum || "").trim();
  if (bindingRequest && itemRequest && bindingRequest === itemRequest) return true;
  const bindingRunner = String(binding.runner_request_id || "").trim();
  const itemRunner = String(item.runner_request_id || item.request_telemetry_runner_request_id || "").trim();
  if (bindingRunner && itemRunner && bindingRunner === itemRunner) return true;
  const bindingProof = String(binding.proof_entry_id || "").trim();
  const itemProof = String(item.proof_entry_id || "").trim();
  return !!bindingProof && !!itemProof && bindingProof === itemProof;
}

export function providerRankingProvenanceProofString(value: any) {
  return String(value || "").trim();
}

export function providerRankingProvenanceProofStringListForCoordinator(...values: any[]) {
  const flattened: string[] = [];
  for (const value of values) {
    if (Array.isArray(value)) flattened.push(...value.map((item: any) => providerRankingProvenanceProofString(item)));
    else if (value !== undefined && value !== null && value !== "") flattened.push(providerRankingProvenanceProofString(value));
  }
  return uniqueCoordinatorStrings(flattened);
}

export function providerRankingProvenanceProofBooleanForCoordinator(value: any) {
  if (value === true) return true;
  if (value === false) return false;
  const text = String(value || "").trim().toLowerCase();
  if (["true", "yes", "1", "preserved", "ok", "completed", "verified"].includes(text)) return true;
  if (["false", "no", "0", "missing", "lost", "blocked", "failed"].includes(text)) return false;
  return false;
}

export function providerRankingProvenanceRepairStatusForCoordinator(value: any) {
  const status = String(value || "").trim().toLowerCase();
  if (["completed", "complete", "done", "resolved", "ok", "verified"].includes(status)) return "completed";
  if (["blocked", "failed", "needs_info", "needs_user"].includes(status)) return "blocked";
  if (["running", "in_progress", "claimed"].includes(status)) return "in_progress";
  return status;
}

export function providerRankingProvenanceGapTypeForCoordinator(value: any) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function providerRankingProvenanceProofFromConsumptionRowForCoordinator(row: any = {}, brief: any = {}, status = "") {
  const preservation = row.provider_ranking_provenance_preservation
    || row.providerRankingProvenancePreservation
    || row.preservation
    || {};
  const typedMemoryRelPaths = providerRankingProvenanceProofStringListForCoordinator(
    row.typedMemoryRelPaths,
    row.typed_memory_rel_paths,
    row.provider_ranking_provenance_rel_paths,
    row.providerRankingProvenanceRelPaths,
    preservation.typed_memory_rel_paths,
    preservation.typedMemoryRelPaths,
  );
  const typedMemoryRowIds = providerRankingProvenanceProofStringListForCoordinator(
    row.typedMemoryRowIds,
    row.typed_memory_row_ids,
    row.provider_ranking_provenance_row_ids,
    row.providerRankingProvenanceRowIds,
    preservation.typed_memory_row_ids,
    preservation.typedMemoryRowIds,
  );
  const receiptId = providerRankingProvenanceProofString(
    row.providerSwitchDecisionReceiptId
      || row.provider_switch_decision_receipt_id
      || row.providerSwitchReceiptId
      || row.provider_switch_receipt_id
      || preservation.provider_switch_decision_receipt_id
      || preservation.providerSwitchDecisionReceiptId
      || "",
  );
  const receiptChecksum = providerRankingProvenanceProofString(
    row.providerSwitchDecisionReceiptChecksum
      || row.provider_switch_decision_receipt_checksum
      || row.providerSwitchReceiptChecksum
      || row.provider_switch_receipt_checksum
      || preservation.provider_switch_decision_receipt_checksum
      || preservation.providerSwitchDecisionReceiptChecksum
      || "",
  );
  const repairStatus = providerRankingProvenanceRepairStatusForCoordinator(
    row.repairStatus
      || row.repair_status
      || row.providerRankingProvenanceRepairStatus
      || row.provider_ranking_provenance_repair_status
      || preservation.repair_status
      || preservation.repairStatus
      || "",
  );
  const repairGapType = providerRankingProvenanceGapTypeForCoordinator(
    row.repairGapType
      || row.repair_gap_type
      || row.providerRankingProvenanceRepairGapType
      || row.provider_ranking_provenance_repair_gap_type
      || preservation.repair_gap_type
      || preservation.repairGapType
      || "",
  );
  const preserved = providerRankingProvenanceProofBooleanForCoordinator(
    row.providerRankingProvenancePreserved
      ?? row.provider_ranking_provenance_preserved
      ?? preservation.preserved
      ?? preservation.provider_ranking_provenance_preserved
      ?? preservation.providerRankingProvenancePreserved
      ?? false,
  );
  const required = providerRankingProvenanceProofBooleanForCoordinator(
    row.providerRankingProvenanceRequired
      ?? row.provider_ranking_provenance_required
      ?? preservation.required
      ?? preservation.provider_ranking_provenance_required
      ?? preservation.providerRankingProvenanceRequired
      ?? false,
  );
  const rowBriefId = providerRankingProvenanceProofString(row.brief_id || row.briefId || "");
  const rowWorkItemId = providerRankingProvenanceProofString(row.work_item_id || row.workItemId || "");
  const briefId = providerRankingProvenanceProofString(brief.brief_id || brief.briefId || "");
  const workItemId = providerRankingProvenanceProofString(brief.work_item_id || brief.workItemId || "");
  const statusOk = String(status || "").trim().toLowerCase() === "verified";
  const matchesBrief = !!briefId && rowBriefId === briefId;
  const matchesWorkItem = !!workItemId && rowWorkItemId === workItemId;
  const verified = statusOk
    && matchesBrief
    && matchesWorkItem
    && !!receiptId
    && !!receiptChecksum
    && typedMemoryRelPaths.length > 0
    && typedMemoryRowIds.length > 0
    && preserved === true
    && repairStatus === "completed"
    && repairGapType === "provider_ranking_provenance_compact";
  return {
    verified,
    receiptId,
    receiptChecksum,
    typedMemoryRelPaths,
    typedMemoryRowIds,
    preserved,
    required,
    repairStatus,
    repairGapType,
    rowBriefId,
    rowWorkItemId,
  };
}

export function timelineBindingMatchesProviderRankingProvenanceRepairWorkItem(binding: any = {}, item: any = {}) {
  if (!isProviderRankingProvenanceCompactRepairSourceForCoordinator(item.source)) return false;
  const bindingWorkItemId = providerRankingProvenanceProofString(binding.work_item_id || "");
  const itemId = providerRankingProvenanceProofString(item.work_item_id || item.id || "");
  if (!bindingWorkItemId || !itemId || bindingWorkItemId !== itemId) return false;
  const expectedReceiptId = providerRankingProvenanceProofString(item.provider_switch_decision_receipt_id || "");
  const expectedReceiptChecksum = providerRankingProvenanceProofString(item.provider_switch_decision_receipt_checksum || "");
  if (expectedReceiptId && binding.provider_switch_decision_receipt_id !== expectedReceiptId) return false;
  if (expectedReceiptChecksum && binding.provider_switch_decision_receipt_checksum !== expectedReceiptChecksum) return false;
  const bindingRelPaths = new Set(providerRankingProvenanceProofStringListForCoordinator(binding.provider_ranking_provenance_rel_paths));
  const bindingRowIds = new Set(providerRankingProvenanceProofStringListForCoordinator(binding.provider_ranking_provenance_row_ids));
  const expectedRelPaths = providerRankingProvenanceProofStringListForCoordinator(item.provider_ranking_provenance_rel_paths);
  const expectedRowIds = providerRankingProvenanceProofStringListForCoordinator(item.provider_ranking_provenance_row_ids);
  if (expectedRelPaths.length && !expectedRelPaths.every(value => bindingRelPaths.has(value))) return false;
  if (expectedRowIds.length && !expectedRowIds.every(value => bindingRowIds.has(value))) return false;
  return true;
}

export function timelineBindingHasRequiredProviderRankingProvenanceRepairEvidence(binding: any = {}, item: any = null) {
  if (!isProviderRankingProvenanceCompactRepairSourceForCoordinator(binding.source)) return false;
  const eventTypes = new Set((Array.isArray(binding.event_types) ? binding.event_types : []).map((event: any) => String(event || "").trim()).filter(Boolean));
  if (!REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS_FOR_COORDINATOR.every(type => eventTypes.has(type))) return false;
  const receiptStatus = String(binding.receipt_status || binding.receiptStatus || "").trim().toLowerCase();
  if (!["done", "completed", "ok", "success"].includes(receiptStatus)) return false;
  if (binding.replay_repair_consumption_source !== "receipt.replayRepairDispatchBriefUsage") return false;
  if (binding.provider_ranking_provenance_receipt_consumption_verified !== true) return false;
  if (!binding.brief_id || !binding.work_item_id || !binding.task_id || !binding.assignment_id || !binding.dispatch_key) return false;
  if (!binding.worker_context_packet_id || !binding.task_agent_session_id || !binding.memory_context_snapshot_id || !binding.execution_id) return false;
  if (!binding.provider_switch_decision_receipt_id || !binding.provider_switch_decision_receipt_checksum) return false;
  if (!Array.isArray(binding.provider_ranking_provenance_rel_paths) || binding.provider_ranking_provenance_rel_paths.length === 0) return false;
  if (!Array.isArray(binding.provider_ranking_provenance_row_ids) || binding.provider_ranking_provenance_row_ids.length === 0) return false;
  if (binding.provider_ranking_provenance_preserved !== true) return false;
  if (binding.provider_ranking_provenance_repair_status !== "completed") return false;
  if (binding.provider_ranking_provenance_repair_gap_type !== "provider_ranking_provenance_compact") return false;
  return item ? timelineBindingMatchesProviderRankingProvenanceRepairWorkItem(binding, item) : true;
}

export function timelineBindingMatchesPostCompactReinjectionRepairWorkItem(binding: any = {}, item: any = {}) {
  if (!isPostCompactReinjectionRepairForCoordinator(binding) || !isPostCompactReinjectionRepairForCoordinator(item)) return false;
  const bindingWorkItemId = String(binding.work_item_id || "").trim();
  const itemId = String(item.work_item_id || item.id || "").trim();
  if (!bindingWorkItemId || !itemId || bindingWorkItemId !== itemId) return false;
  const mirroredFields = [
    "reinjection_gate_id",
    "post_compact_candidate_id",
    "post_compact_candidate_kind",
    "post_compact_candidate_value",
  ];
  for (const field of mirroredFields) {
    const expected = String(item[field] || "").trim();
    if (expected && String(binding[field] || "").trim() !== expected) return false;
  }
  return true;
}

export function timelineBindingHasRequiredPostCompactReinjectionRepairEvidence(binding: any = {}, item: any = null) {
  if (!isPostCompactReinjectionRepairForCoordinator(binding)) return false;
  const eventTypes = new Set((Array.isArray(binding.event_types) ? binding.event_types : []).map((event: any) => String(event || "").trim()).filter(Boolean));
  if (!REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS_FOR_COORDINATOR.every(type => eventTypes.has(type))) return false;
  const receiptStatus = String(binding.receipt_status || binding.receiptStatus || "").trim().toLowerCase();
  if (!["done", "completed", "ok", "success"].includes(receiptStatus)) return false;
  if (binding.replay_repair_consumption_source !== "receipt.replayRepairDispatchBriefUsage") return false;
  if (!["used", "verified", "ignored"].includes(String(binding.replay_repair_consumption_status || "").trim().toLowerCase())) return false;
  if (binding.post_compact_reinjection_receipt_verified !== true) return false;
  if (!binding.reinjection_gate_id || !binding.post_compact_candidate_id || !binding.post_compact_candidate_kind) return false;
  if (!binding.brief_id || !binding.work_item_id || !binding.task_id || !binding.assignment_id || !binding.dispatch_key) return false;
  if (!binding.worker_context_packet_id || !binding.worker_handoff_id || !binding.memory_context_snapshot_id) return false;
  if (!binding.task_agent_session_id || !binding.native_session_id || !binding.execution_id) return false;
  if (binding.post_compact_reinjection_task_session_matched !== true || binding.post_compact_reinjection_native_session_matched !== true) return false;
  const usageState = String(binding.post_compact_reinjection_receipt_usage_state || "").trim().toLowerCase();
  if (!["used", "verified", "ignored"].includes(usageState)) return false;
  if (usageState === "ignored") {
    if (!String(binding.post_compact_reinjection_receipt_reason || "").trim()) return false;
  } else if (binding.post_compact_reinjection_current_source_verified !== true) {
    return false;
  }
  if (binding.post_compact_reinjection_memory_receipt_matched !== true) return false;
  return item ? timelineBindingMatchesPostCompactReinjectionRepairWorkItem(binding, item) : true;
}

export function timelineBindingMatchesPostCompactReceiptMemoryUsageRepairWorkItem(binding: any = {}, item: any = {}) {
  if (!isPostCompactReceiptMemoryUsageRepairForCoordinator(binding) || !isPostCompactReceiptMemoryUsageRepairForCoordinator(item)) return false;
  const bindingWorkItemId = String(binding.work_item_id || "").trim();
  const itemId = String(item.work_item_id || item.id || "").trim();
  if (!bindingWorkItemId || bindingWorkItemId !== itemId) return false;
  const expectedDocs = uniqueCoordinatorStrings(item.post_compact_receipt_memory_required_doc_rel_paths || []);
  const bindingDocs = new Set(uniqueCoordinatorStrings([
    ...(binding.post_compact_receipt_memory_required_doc_rel_paths || []),
    ...(binding.post_compact_receipt_memory_usage_repair_required_doc_rel_paths || []),
  ]));
  return expectedDocs.length > 0 && expectedDocs.every((relPath: string) => bindingDocs.has(relPath));
}

export function timelineBindingHasRequiredPostCompactReceiptMemoryUsageRepairEvidence(binding: any = {}, item: any = null) {
  if (!isPostCompactReceiptMemoryUsageRepairForCoordinator(binding)) return false;
  const eventTypes = new Set((Array.isArray(binding.event_types) ? binding.event_types : []).map((event: any) => String(event || "").trim()).filter(Boolean));
  if (!REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS_FOR_COORDINATOR.every(type => eventTypes.has(type))) return false;
  const receiptStatus = String(binding.receipt_status || "").trim().toLowerCase();
  if (!["done", "completed", "ok", "success"].includes(receiptStatus)) return false;
  if (binding.replay_repair_consumption_source !== "receipt.replayRepairDispatchBriefUsage") return false;
  if (!["used", "verified"].includes(String(binding.replay_repair_consumption_status || "").trim().toLowerCase())) return false;
  if (binding.post_compact_receipt_memory_usage_repair_verified !== true) return false;
  if (binding.post_compact_receipt_memory_usage_repair_all_docs_compliant !== true) return false;
  if (binding.post_compact_receipt_memory_usage_repair_historical_boundary_covered !== true) return false;
  if (binding.post_compact_receipt_memory_usage_repair_task_session_matched !== true
    || binding.post_compact_receipt_memory_usage_repair_native_session_matched !== true) return false;
  if (!binding.brief_id || !binding.work_item_id || !binding.task_id || !binding.assignment_id || !binding.dispatch_key) return false;
  if (!binding.worker_context_packet_id || !binding.worker_handoff_id || !binding.memory_context_snapshot_id) return false;
  if (!binding.task_agent_session_id || !binding.native_session_id || !binding.execution_id) return false;
  const requiredDocs = uniqueCoordinatorStrings(binding.post_compact_receipt_memory_usage_repair_required_doc_rel_paths || []);
  const coveredDocs = new Set(uniqueCoordinatorStrings(binding.post_compact_receipt_memory_usage_repair_covered_doc_rel_paths || []));
  if (!requiredDocs.length || !requiredDocs.every((relPath: string) => coveredDocs.has(relPath))) return false;
  return item ? timelineBindingMatchesPostCompactReceiptMemoryUsageRepairWorkItem(binding, item) : true;
}

export function closeReplayRepairWorkItemsFromTimelineBindingForCoordinator(groupId: string, binding: any = {}, at = new Date().toISOString()) {
  if (!groupId) return { closed: 0, itemIds: [] };
  const nativeTimelineClosable = timelineBindingHasRequiredNativeRepairEvidence(binding);
  const providerRankingTimelineClosable = timelineBindingHasRequiredProviderRankingProvenanceRepairEvidence(binding);
  const postCompactReinjectionTimelineClosable = timelineBindingHasRequiredPostCompactReinjectionRepairEvidence(binding);
  const postCompactReceiptMemoryUsageTimelineClosable = timelineBindingHasRequiredPostCompactReceiptMemoryUsageRepairEvidence(binding);
  if (!nativeTimelineClosable && !providerRankingTimelineClosable && !postCompactReinjectionTimelineClosable && !postCompactReceiptMemoryUsageTimelineClosable) return { closed: 0, itemIds: [] };
  const groupSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(binding.groupSessionId || binding.group_session_id || "");
  const file = getReplayRepairWorkItemsFileForCoordinator(groupId, groupSessionId);
  let ledger: any = null;
  try { ledger = JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return { closed: 0, itemIds: [] }; }
  const items = Array.isArray(ledger?.items) ? ledger.items : [];
  let closed = 0;
  const itemIds: string[] = [];
  const nextItems = items.map((item: any) => {
    const closeAsNative = nativeTimelineClosable
      && isTimelineClosableNativeRepairSourceForCoordinator(item.source)
      && timelineBindingMatchesRepairWorkItem(binding, item);
    const closeAsProviderRanking = providerRankingTimelineClosable
      && isProviderRankingProvenanceCompactRepairSourceForCoordinator(item.source)
      && timelineBindingHasRequiredProviderRankingProvenanceRepairEvidence(binding, item);
    const closeAsPostCompactReinjection = postCompactReinjectionTimelineClosable
      && isPostCompactReinjectionRepairForCoordinator(item)
      && timelineBindingHasRequiredPostCompactReinjectionRepairEvidence(binding, item);
    const closeAsPostCompactReceiptMemoryUsage = postCompactReceiptMemoryUsageTimelineClosable
      && isPostCompactReceiptMemoryUsageRepairForCoordinator(item)
      && timelineBindingHasRequiredPostCompactReceiptMemoryUsageRepairEvidence(binding, item);
    if (!closeAsNative && !closeAsProviderRanking && !closeAsPostCompactReinjection && !closeAsPostCompactReceiptMemoryUsage) return item;
    if (!replayRepairWorkItemOpenForCoordinator(item.status)) return item;
    closed += 1;
    itemIds.push(String(item.work_item_id || item.id || ""));
    const evidence = [
      ...(Array.isArray(item.evidence) ? item.evidence : []),
      `timeline_binding=${binding.timeline_binding_id || ""}`,
      `timeline_events=${(binding.event_types || []).join(",")}`,
      binding.receipt_status ? `receipt_status=${binding.receipt_status}` : "",
      closeAsProviderRanking && binding.provider_switch_decision_receipt_id ? `provider_switch_decision_receipt_id=${binding.provider_switch_decision_receipt_id}` : "",
      closeAsProviderRanking && binding.provider_switch_decision_receipt_checksum ? `provider_switch_decision_receipt_checksum=${binding.provider_switch_decision_receipt_checksum}` : "",
      closeAsProviderRanking && binding.provider_ranking_provenance_rel_paths?.length ? `provider_ranking_rel_paths=${binding.provider_ranking_provenance_rel_paths.join(";")}` : "",
      closeAsProviderRanking && binding.provider_ranking_provenance_row_ids?.length ? `provider_ranking_row_ids=${binding.provider_ranking_provenance_row_ids.slice(0, 8).join(";")}` : "",
      closeAsPostCompactReinjection && binding.reinjection_gate_id ? `reinjection_gate_id=${binding.reinjection_gate_id}` : "",
      closeAsPostCompactReinjection && binding.post_compact_candidate_id ? `post_compact_candidate_id=${binding.post_compact_candidate_id}` : "",
      closeAsPostCompactReinjection && binding.post_compact_reinjection_receipt_usage_state ? `post_compact_candidate_usage=${binding.post_compact_reinjection_receipt_usage_state}` : "",
      closeAsPostCompactReinjection ? `post_compact_current_source_verified=${binding.post_compact_reinjection_current_source_verified === true}` : "",
      closeAsPostCompactReceiptMemoryUsage && binding.post_compact_receipt_memory_usage_repair_required_doc_rel_paths?.length ? `post_compact_receipt_memory_required_docs=${binding.post_compact_receipt_memory_usage_repair_required_doc_rel_paths.join(";")}` : "",
      closeAsPostCompactReceiptMemoryUsage ? `post_compact_receipt_memory_historical_boundary=${binding.post_compact_receipt_memory_usage_repair_historical_boundary_covered === true}` : "",
      closeAsPostCompactReceiptMemoryUsage ? `post_compact_receipt_memory_repair_session=${binding.task_agent_session_id || ""}/${binding.native_session_id || ""}` : "",
    ].filter(Boolean);
    const verification = [
      ...(Array.isArray(item.verification) ? item.verification : []),
      closeAsProviderRanking
        ? "receipt replayRepairDispatchBriefUsage 已证明 provider ranking provenance compact repair 完成"
        : closeAsPostCompactReceiptMemoryUsage
        ? "corrected receipt 已在新 repair session 覆盖全部 post-compact receipt MEMORY.md，并满足 current-source / ignored-reason / historical-boundary 合同"
        : closeAsPostCompactReinjection
        ? "receipt postCompactCandidateUsage 已证明精确 reinjection gate/candidate 在绑定子 Agent 会话中完成 used/ignored/verified 分类"
        : "timeline binding 已证明 dispatch->session->snapshot->execution->receipt 闭环",
    ];
    const completionSource = closeAsProviderRanking
      ? "provider_ranking_provenance_replay_repair_receipt_consumption"
      : closeAsPostCompactReceiptMemoryUsage
      ? "post_compact_reinjection_receipt_memory_usage_repair_receipt_consumption"
      : closeAsPostCompactReinjection
      ? "post_compact_reinjection_replay_repair_receipt_consumption"
      : "replay_repair_timeline_binding";
    const resolutionReason = closeAsProviderRanking
      ? "provider_ranking_provenance_compact_repair_receipt_verified"
      : closeAsPostCompactReceiptMemoryUsage
      ? "post_compact_reinjection_receipt_memory_usage_corrected_receipt_verified"
      : closeAsPostCompactReinjection
      ? "post_compact_reinjection_repair_receipt_verified"
      : "timeline_binding_child_receipt_proved_native_repair";
    return {
      ...item,
      status: "completed",
      updatedAt: at,
      completedAt: item.completedAt || item.completed_at || at,
      resolutionReason,
      completion_source: completionSource,
      replay_repair_timeline_binding: {
        timeline_binding_id: binding.timeline_binding_id || "",
        brief_id: binding.brief_id || "",
        task_id: binding.task_id || "",
        assignment_id: binding.assignment_id || "",
        worker_context_packet_id: binding.worker_context_packet_id || "",
        task_agent_session_id: binding.task_agent_session_id || "",
        memory_context_snapshot_id: binding.memory_context_snapshot_id || "",
        execution_id: binding.execution_id || "",
        runner_request_id: binding.runner_request_id || "",
        receipt_status: binding.receipt_status || "",
        event_types: binding.event_types || [],
        groupSessionId,
        group_session_id: groupSessionId,
        completed_at: at,
      },
      provider_ranking_provenance_repair_receipt: closeAsProviderRanking ? {
        timeline_binding_id: binding.timeline_binding_id || "",
        brief_id: binding.brief_id || "",
        work_item_id: binding.work_item_id || "",
        provider_switch_decision_receipt_id: binding.provider_switch_decision_receipt_id || "",
        provider_switch_decision_receipt_checksum: binding.provider_switch_decision_receipt_checksum || "",
        typed_memory_rel_paths: binding.provider_ranking_provenance_rel_paths || [],
        typed_memory_row_ids: binding.provider_ranking_provenance_row_ids || [],
        provider_ranking_provenance_preserved: binding.provider_ranking_provenance_preserved === true,
        repair_status: binding.provider_ranking_provenance_repair_status || "",
        repair_gap_type: binding.provider_ranking_provenance_repair_gap_type || "",
        consumption_status: binding.replay_repair_consumption_status || "",
        consumption_source: binding.replay_repair_consumption_source || "",
        completed_at: at,
      } : item.provider_ranking_provenance_repair_receipt,
      post_compact_reinjection_repair_receipt: closeAsPostCompactReinjection ? {
        timeline_binding_id: binding.timeline_binding_id || "",
        brief_id: binding.brief_id || "",
        work_item_id: binding.work_item_id || "",
        reinjection_gate_id: binding.reinjection_gate_id || "",
        post_compact_candidate_id: binding.post_compact_candidate_id || "",
        post_compact_candidate_kind: binding.post_compact_candidate_kind || "",
        post_compact_candidate_value: binding.post_compact_candidate_value || "",
        usage_state: binding.post_compact_reinjection_receipt_usage_state || "",
        current_source_verified: binding.post_compact_reinjection_current_source_verified === true,
        memory_receipt_matched: binding.post_compact_reinjection_memory_receipt_matched === true,
        task_agent_session_id: binding.task_agent_session_id || "",
        native_session_id: binding.native_session_id || "",
        execution_id: binding.execution_id || "",
        groupSessionId,
        group_session_id: groupSessionId,
        completed_at: at,
      } : item.post_compact_reinjection_repair_receipt,
      post_compact_receipt_memory_usage_repair_receipt: closeAsPostCompactReceiptMemoryUsage ? {
        schema: "ccm-post-compact-reinjection-repair-receipt-memory-usage-repair-proof-v1",
        verified: true,
        timeline_binding_id: binding.timeline_binding_id || "",
        brief_id: binding.brief_id || "",
        work_item_id: binding.work_item_id || "",
        original_worker_context_packet_id: binding.original_worker_context_packet_id || item.original_worker_context_packet_id || "",
        original_binding_id: binding.original_binding_id || item.original_binding_id || "",
        required_doc_rel_paths: binding.post_compact_receipt_memory_usage_repair_required_doc_rel_paths || [],
        covered_doc_rel_paths: binding.post_compact_receipt_memory_usage_repair_covered_doc_rel_paths || [],
        coverage_rows: binding.post_compact_receipt_memory_usage_repair_coverage_rows || [],
        all_docs_compliant: binding.post_compact_receipt_memory_usage_repair_all_docs_compliant === true,
        historical_boundary_covered: binding.post_compact_receipt_memory_usage_repair_historical_boundary_covered === true,
        task_session_matched: binding.post_compact_receipt_memory_usage_repair_task_session_matched === true,
        native_session_matched: binding.post_compact_receipt_memory_usage_repair_native_session_matched === true,
        original_task_agent_session_id: binding.original_task_agent_session_id || item.original_task_agent_session_id || "",
        original_native_session_id: binding.original_native_session_id || item.original_native_session_id || "",
        original_assignment_id: binding.original_assignment_id || item.original_assignment_id || "",
        original_dispatch_key: binding.original_dispatch_key || item.original_dispatch_key || "",
        event_types: binding.event_types || [],
        task_agent_session_id: binding.task_agent_session_id || "",
        native_session_id: binding.native_session_id || "",
        execution_id: binding.execution_id || "",
        groupSessionId,
        group_session_id: groupSessionId,
        completed_at: at,
      } : item.post_compact_receipt_memory_usage_repair_receipt,
      blockers: [],
      needs: [],
      evidence: uniqueCoordinatorStrings(evidence).slice(-24),
      verification: uniqueCoordinatorStrings(verification).slice(-24),
    };
  });
  if (!closed) return { closed: 0, itemIds: [] };
  const next = {
    ...ledger,
    schema: ledger.schema || "ccm-compact-boundary-replay-repair-work-items-v1",
    version: ledger.version || 1,
    groupId: ledger.groupId || groupId,
    groupSessionId: groupSessionId || ledger.groupSessionId || "default",
    file: ledger.file || file,
    items: nextItems.slice(-160),
    stats: replayRepairWorkItemStatsForCoordinator(nextItems),
    updatedAt: at,
    latestTimelineCompletion: {
      timeline_binding_id: binding.timeline_binding_id || "",
      brief_id: binding.brief_id || "",
      source: binding.source || "",
      completion_source: providerRankingTimelineClosable
        ? "provider_ranking_provenance_replay_repair_receipt_consumption"
        : postCompactReceiptMemoryUsageTimelineClosable
        ? "post_compact_reinjection_receipt_memory_usage_repair_receipt_consumption"
        : postCompactReinjectionTimelineClosable
        ? "post_compact_reinjection_replay_repair_receipt_consumption"
        : "replay_repair_timeline_binding",
      closed,
      itemIds,
      at,
    },
  };
  writeJsonAtomicForCoordinator(file, next);
  return { closed, itemIds };
}

export function mergeReplayRepairTimelineBinding(current: any = {}, incoming: any = {}) {
  const eventRefs = [
    ...(Array.isArray(current.event_refs) ? current.event_refs : []),
    ...(Array.isArray(incoming.event_refs) ? incoming.event_refs : []),
  ];
  const seenRefs = new Set<string>();
  const mergedRefs = eventRefs.filter((event: any) => {
    const key = `${event.type || ""}|${event.id || ""}|${event.at || ""}`;
    if (seenRefs.has(key)) return false;
    seenRefs.add(key);
    return true;
  }).slice(-40);
  const merged: any = {
    ...current,
    ...incoming,
    first_seen_at: current.first_seen_at || current.at || incoming.at || incoming.updated_at || "",
    at: incoming.at || current.at || "",
    updated_at: incoming.updated_at || incoming.at || current.updated_at || "",
    event_types: uniqueCoordinatorStrings([...(current.event_types || []), ...(incoming.event_types || [])]).slice(0, 40),
    event_refs: mergedRefs,
  };
  for (const key of [
    "task_id",
    "project",
    "component",
    "assignment_id",
    "dispatch_key",
    "worker_context_packet_id",
    "worker_handoff_id",
    "memory_context_snapshot_id",
    "memory_context_snapshot_checksum",
    "task_agent_session_id",
    "native_session_id",
    "execution_id",
    "runner_request_id",
    "reinjection_gate_id",
    "post_compact_candidate_id",
    "post_compact_candidate_kind",
    "post_compact_candidate_value",
    "post_compact_candidate_source_message_id",
    "post_compact_reinjection_receipt_usage_state",
    "post_compact_reinjection_receipt_reason",
    "post_compact_reinjection_receipt_task_agent_session_id",
    "post_compact_reinjection_receipt_native_session_id",
    "original_worker_context_packet_id",
    "original_binding_id",
    "original_assignment_id",
    "original_dispatch_key",
    "original_task_agent_session_id",
    "original_native_session_id",
    "post_compact_receipt_memory_usage_repair_receipt_task_agent_session_id",
    "post_compact_receipt_memory_usage_repair_receipt_native_session_id",
    "proof_entry_id",
    "request_patch_checksum",
    "provider_reproof_status",
    "provider_reproof_reason",
    "reproof_candidate_id",
    "original_timeline_binding_id",
    "original_work_item_id",
    "request_telemetry_session_status",
    "request_telemetry_dispatch_status",
    "receipt_status",
    "replay_repair_consumption_status",
    "replay_repair_consumption_reason",
    "replay_repair_consumption_source",
    "replay_repair_consumption_state",
    "provider_switch_decision_receipt_id",
    "provider_switch_decision_receipt_checksum",
    "provider_ranking_provenance_repair_status",
    "provider_ranking_provenance_repair_gap_type",
  ]) {
    merged[key] = incoming[key] || current[key] || "";
  }
  merged.provider_ranking_provenance_rel_paths = uniqueCoordinatorStrings([
    ...(Array.isArray(current.provider_ranking_provenance_rel_paths) ? current.provider_ranking_provenance_rel_paths : []),
    ...(Array.isArray(incoming.provider_ranking_provenance_rel_paths) ? incoming.provider_ranking_provenance_rel_paths : []),
  ]).slice(0, 24);
  merged.provider_ranking_provenance_row_ids = uniqueCoordinatorStrings([
    ...(Array.isArray(current.provider_ranking_provenance_row_ids) ? current.provider_ranking_provenance_row_ids : []),
    ...(Array.isArray(incoming.provider_ranking_provenance_row_ids) ? incoming.provider_ranking_provenance_row_ids : []),
  ]).slice(0, 32);
  merged.provider_ranking_provenance_preserved = incoming.provider_ranking_provenance_preserved === true
    || current.provider_ranking_provenance_preserved === true;
  merged.provider_ranking_provenance_required = incoming.provider_ranking_provenance_required === true
    || current.provider_ranking_provenance_required === true;
  merged.provider_ranking_provenance_receipt_consumption_verified = incoming.provider_ranking_provenance_receipt_consumption_verified === true
    || current.provider_ranking_provenance_receipt_consumption_verified === true;
  merged.post_compact_reinjection_current_source_verified = incoming.post_compact_reinjection_current_source_verified === true
    || current.post_compact_reinjection_current_source_verified === true;
  merged.post_compact_reinjection_memory_receipt_matched = incoming.post_compact_reinjection_memory_receipt_matched === true
    || current.post_compact_reinjection_memory_receipt_matched === true;
  merged.post_compact_reinjection_task_session_matched = incoming.post_compact_reinjection_task_session_matched === true
    || current.post_compact_reinjection_task_session_matched === true;
  merged.post_compact_reinjection_native_session_matched = incoming.post_compact_reinjection_native_session_matched === true
    || current.post_compact_reinjection_native_session_matched === true;
  merged.post_compact_reinjection_receipt_verified = incoming.post_compact_reinjection_receipt_verified === true
    || current.post_compact_reinjection_receipt_verified === true;
  merged.post_compact_reinjection_receipt_gaps = incoming.post_compact_reinjection_receipt_verified === true
    ? []
    : uniqueCoordinatorStrings([
      ...(Array.isArray(current.post_compact_reinjection_receipt_gaps) ? current.post_compact_reinjection_receipt_gaps : []),
      ...(Array.isArray(incoming.post_compact_reinjection_receipt_gaps) ? incoming.post_compact_reinjection_receipt_gaps : []),
    ]).slice(0, 24);
  merged.post_compact_receipt_memory_required_doc_rel_paths = uniqueCoordinatorStrings([
    ...(Array.isArray(current.post_compact_receipt_memory_required_doc_rel_paths) ? current.post_compact_receipt_memory_required_doc_rel_paths : []),
    ...(Array.isArray(incoming.post_compact_receipt_memory_required_doc_rel_paths) ? incoming.post_compact_receipt_memory_required_doc_rel_paths : []),
  ]).slice(0, 16);
  merged.post_compact_receipt_memory_usage_repair_required_doc_rel_paths = uniqueCoordinatorStrings([
    ...(Array.isArray(current.post_compact_receipt_memory_usage_repair_required_doc_rel_paths) ? current.post_compact_receipt_memory_usage_repair_required_doc_rel_paths : []),
    ...(Array.isArray(incoming.post_compact_receipt_memory_usage_repair_required_doc_rel_paths) ? incoming.post_compact_receipt_memory_usage_repair_required_doc_rel_paths : []),
  ]).slice(0, 16);
  merged.post_compact_receipt_memory_usage_repair_covered_doc_rel_paths = uniqueCoordinatorStrings([
    ...(Array.isArray(current.post_compact_receipt_memory_usage_repair_covered_doc_rel_paths) ? current.post_compact_receipt_memory_usage_repair_covered_doc_rel_paths : []),
    ...(Array.isArray(incoming.post_compact_receipt_memory_usage_repair_covered_doc_rel_paths) ? incoming.post_compact_receipt_memory_usage_repair_covered_doc_rel_paths : []),
  ]).slice(0, 16);
  merged.post_compact_receipt_memory_gap_codes = uniqueCoordinatorStrings([
    ...(Array.isArray(current.post_compact_receipt_memory_gap_codes) ? current.post_compact_receipt_memory_gap_codes : []),
    ...(Array.isArray(incoming.post_compact_receipt_memory_gap_codes) ? incoming.post_compact_receipt_memory_gap_codes : []),
  ]).slice(0, 24);
  merged.post_compact_receipt_memory_usage_repair_coverage_rows = Array.isArray(incoming.post_compact_receipt_memory_usage_repair_coverage_rows)
    && incoming.post_compact_receipt_memory_usage_repair_coverage_rows.length
    ? incoming.post_compact_receipt_memory_usage_repair_coverage_rows
    : Array.isArray(current.post_compact_receipt_memory_usage_repair_coverage_rows)
    ? current.post_compact_receipt_memory_usage_repair_coverage_rows
    : [];
  merged.post_compact_receipt_memory_usage_repair_historical_boundary_covered = incoming.post_compact_receipt_memory_usage_repair_historical_boundary_covered === true
    || current.post_compact_receipt_memory_usage_repair_historical_boundary_covered === true;
  merged.post_compact_receipt_memory_usage_repair_all_docs_compliant = incoming.post_compact_receipt_memory_usage_repair_all_docs_compliant === true
    || current.post_compact_receipt_memory_usage_repair_all_docs_compliant === true;
  merged.post_compact_receipt_memory_usage_repair_task_session_matched = incoming.post_compact_receipt_memory_usage_repair_task_session_matched === true
    || current.post_compact_receipt_memory_usage_repair_task_session_matched === true;
  merged.post_compact_receipt_memory_usage_repair_native_session_matched = incoming.post_compact_receipt_memory_usage_repair_native_session_matched === true
    || current.post_compact_receipt_memory_usage_repair_native_session_matched === true;
  merged.post_compact_receipt_memory_usage_repair_verified = incoming.post_compact_receipt_memory_usage_repair_verified === true
    || current.post_compact_receipt_memory_usage_repair_verified === true;
  merged.post_compact_receipt_memory_usage_repair_gaps = incoming.post_compact_receipt_memory_usage_repair_verified === true
    ? []
    : uniqueCoordinatorStrings([
      ...(Array.isArray(current.post_compact_receipt_memory_usage_repair_gaps) ? current.post_compact_receipt_memory_usage_repair_gaps : []),
      ...(Array.isArray(incoming.post_compact_receipt_memory_usage_repair_gaps) ? incoming.post_compact_receipt_memory_usage_repair_gaps : []),
    ]).slice(0, 24);
  return merged;
}

export function replayRepairConsumptionStringListForCoordinator(value: any): string[] {
  if (Array.isArray(value)) return value.map((item: any) => typeof item === "string" ? item : JSON.stringify(item || {})).filter(Boolean);
  if (value === undefined || value === null || value === "") return [];
  return [typeof value === "string" ? value : JSON.stringify(value || {})].filter(Boolean);
}

export function replayRepairConsumptionRowsForCoordinator(receipt: any = {}) {
  const rows = [
    ...(Array.isArray(receipt.replayRepairDispatchBriefUsage) ? receipt.replayRepairDispatchBriefUsage : []),
    ...(Array.isArray(receipt.replay_repair_dispatch_brief_usage) ? receipt.replay_repair_dispatch_brief_usage : []),
    ...(Array.isArray(receipt.replayRepairBriefUsage) ? receipt.replayRepairBriefUsage : []),
    ...(Array.isArray(receipt.replay_repair_brief_usage) ? receipt.replay_repair_brief_usage : []),
    ...(Array.isArray(receipt.replayRepairUsage) ? receipt.replayRepairUsage : []),
    ...(Array.isArray(receipt.replay_repair_usage) ? receipt.replay_repair_usage : []),
  ];
  return rows.filter((row: any) => row && typeof row === "object");
}

export function replayRepairConsumptionMatchesBriefForCoordinator(row: any = {}, brief: any = {}) {
  const rowBriefId = String(row.brief_id || row.briefId || "").trim();
  const briefId = String(brief.brief_id || brief.briefId || "").trim();
  if (rowBriefId && briefId && rowBriefId === briefId) return true;
  const rowWorkItem = String(row.work_item_id || row.workItemId || "").trim();
  const workItem = String(brief.work_item_id || brief.workItemId || "").trim();
  if (rowWorkItem && workItem && rowWorkItem === workItem) return true;
  const rowRequest = String(row.request_patch_checksum || row.requestPatchChecksum || "").trim();
  const request = String(brief.request_patch_checksum || brief.requestPatchChecksum || "").trim();
  return !!rowRequest && !!request && rowRequest === request;
}

export function normalizeReplayRepairConsumptionStatusForCoordinator(value: any, fallback = "") {
  const status = String(value || fallback || "").trim().toLowerCase();
  if (["strong", "native_strong", "provider_strong"].includes(status)) return "strong";
  if (["used", "consumed", "applied"].includes(status)) return "used";
  if (["verified", "checked", "rechecked"].includes(status)) return "verified";
  if (["ignored", "not_used", "skipped"].includes(status)) return "ignored";
  if (["blocked", "failed", "needs_info", "needs-user", "needs_user"].includes(status)) return "blocked";
  return "";
}

export function postCompactCandidateUsageRowsForCoordinator(receipt: any = {}) {
  return [
    ...(Array.isArray(receipt.postCompactCandidateUsage) ? receipt.postCompactCandidateUsage : []),
    ...(Array.isArray(receipt.post_compact_candidate_usage) ? receipt.post_compact_candidate_usage : []),
    ...(Array.isArray(receipt.postCompactCandidateUsageRows) ? receipt.postCompactCandidateUsageRows : []),
    ...(Array.isArray(receipt.post_compact_candidate_usage_rows) ? receipt.post_compact_candidate_usage_rows : []),
  ].filter((row: any) => row && typeof row === "object");
}

export function normalizePostCompactCandidateUsageStateForCoordinator(value: any) {
  const state = String(value || "").trim().toLowerCase();
  if (["used", "applied", "consumed"].includes(state)) return "used";
  if (["verified", "checked", "reviewed", "validated", "confirmed"].includes(state)) return "verified";
  if (["ignored", "skipped", "unused", "not_used", "not-used", "not used"].includes(state)) return "ignored";
  return "";
}

export function postCompactReinjectionReceiptProofForCoordinator(brief: any = {}, receipt: any = null) {
  if (!isPostCompactReinjectionRepairForCoordinator(brief) || !receipt || typeof receipt !== "object") return null;
  const expectedGateId = String(brief.reinjection_gate_id || brief.reinjectionGateId || "").trim();
  const expectedCandidateId = String(brief.post_compact_candidate_id || brief.postCompactCandidateId || "").trim();
  const expectedCandidateKind = String(brief.post_compact_candidate_kind || brief.postCompactCandidateKind || "").trim();
  const expectedCandidateValue = String(brief.post_compact_candidate_value || brief.postCompactCandidateValue || "").trim();
  const rows = postCompactCandidateUsageRowsForCoordinator(receipt);
  const row = rows.find((item: any) => {
    const gateId = String(item.gateId || item.gate_id || item.reinjectionGateId || item.reinjection_gate_id || "").trim();
    const candidateId = String(item.candidateId || item.candidate_id || item.postCompactCandidateId || item.post_compact_candidate_id || "").trim();
    return !!expectedGateId && !!expectedCandidateId && gateId === expectedGateId && candidateId === expectedCandidateId;
  }) || null;
  const usageState = normalizePostCompactCandidateUsageStateForCoordinator(
    row?.usageState || row?.usage_state || row?.status || row?.state || "",
  );
  const currentSourceVerified = row?.currentSourceVerified === true
    || row?.current_source_verified === true
    || ["true", "yes", "1", "verified"].includes(String(row?.currentSourceVerified || row?.current_source_verified || "").trim().toLowerCase());
  const reason = compactText(row?.reason || row?.summary || "", 360);
  const usedText = replayRepairConsumptionStringListForCoordinator(receipt.memoryUsed || receipt.memory_used || receipt.used).join("\n");
  const ignoredText = replayRepairConsumptionStringListForCoordinator(receipt.memoryIgnored || receipt.memory_ignored || receipt.ignored).join("\n");
  const expectedTokens = [expectedGateId, expectedCandidateId].filter(Boolean);
  const memoryText = usageState === "ignored" ? ignoredText : usedText;
  const memoryReceiptMatched = expectedTokens.length === 2 && expectedTokens.every(token => memoryText.includes(token));
  const receiptTaskAgentSessionId = String(
    receipt.task_agent_session_id
      || receipt.taskAgentSessionId
      || receipt.session?.task_agent_session_id
      || receipt.session?.taskAgentSessionId
      || ""
  ).trim();
  const receiptNativeSessionId = String(
    receipt.native_session_id
      || receipt.nativeSessionId
      || receipt.session?.native_session_id
      || receipt.session?.nativeSessionId
      || ""
  ).trim();
  const usageValid = ["used", "verified", "ignored"].includes(usageState);
  const verificationValid = usageState === "ignored" ? !!reason : currentSourceVerified === true;
  const gaps = [
    !row ? "post_compact_candidate_usage_row" : "",
    !expectedGateId ? "reinjection_gate_id" : "",
    !expectedCandidateId ? "post_compact_candidate_id" : "",
    !usageValid ? "usage_state" : "",
    usageState !== "ignored" && currentSourceVerified !== true ? "current_source_verified" : "",
    usageState === "ignored" && !reason ? "ignored_reason" : "",
    !memoryReceiptMatched ? usageState === "ignored" ? "memoryIgnored_gate_candidate" : "memoryUsed_gate_candidate" : "",
    !receiptTaskAgentSessionId ? "receipt_task_agent_session_id" : "",
    !receiptNativeSessionId ? "receipt_native_session_id" : "",
  ].filter(Boolean);
  return {
    schema: "ccm-post-compact-reinjection-repair-receipt-proof-v1",
    verified: gaps.length === 0 && usageValid && verificationValid && memoryReceiptMatched,
    reinjectionGateId: expectedGateId,
    candidateId: expectedCandidateId,
    candidateKind: expectedCandidateKind,
    candidateValue: expectedCandidateValue,
    usageState,
    currentSourceVerified,
    reason,
    memoryReceiptMatched,
    receiptTaskAgentSessionId,
    receiptNativeSessionId,
    gaps,
  };
}

export function isPostCompactReceiptMemoryUsageRepairForCoordinator(value: any = {}) {
  return String(value.source || value.dispatch_source || "").trim() === "post_compact_reinjection_repair_receipt_memory_usage_receipt_repair";
}

export function postCompactReceiptMemoryUsageRepairProofForCoordinator(brief: any = {}, receipt: any = null) {
  if (!isPostCompactReceiptMemoryUsageRepairForCoordinator(brief) || !receipt || typeof receipt !== "object") return null;
  const requiredDocRelPaths = uniqueCoordinatorStrings(brief.post_compact_receipt_memory_required_doc_rel_paths || []).slice(0, 12);
  const memoryUsed = replayRepairConsumptionStringListForCoordinator(receipt.memoryUsed || receipt.memory_used || receipt.used);
  const memoryIgnored = replayRepairConsumptionStringListForCoordinator(receipt.memoryIgnored || receipt.memory_ignored || receipt.ignored);
  const coverageRows = requiredDocRelPaths.map((relPath: string) => {
    const usedRows = memoryUsed.filter((item: string) => item.includes(relPath));
    const ignoredRows = memoryIgnored.filter((item: string) => item.includes(relPath));
    const usedCovered = usedRows.some((item: string) => /usageState\s*=\s*(used|verified)|\b(used|verified)\b/i.test(item));
    const currentSourceVerified = usedRows.some((item: string) => /currentSourceVerified\s*=\s*true/i.test(item));
    const ignoredCovered = ignoredRows.some((item: string) => /usageState\s*=\s*(ignored|not_used|not used)|\bignored\b/i.test(item));
    const ignoredReasonCovered = ignoredRows.some((item: string) => /reason\s*=\s*[^;\s][^;]*/i.test(item));
    const ignoredReason = ignoredRows.map((item: string) => item.match(/reason\s*=\s*([^;]+)/i)?.[1]?.trim() || "").find(Boolean) || "";
    return {
      relPath,
      usageState: usedCovered ? "verified" : ignoredCovered ? "ignored" : "missing",
      covered: usedCovered || ignoredCovered,
      compliant: usedCovered ? currentSourceVerified : ignoredCovered ? ignoredReasonCovered : false,
      usedCovered,
      currentSourceVerified,
      ignoredCovered,
      ignoredReasonCovered,
      reason: ignoredReason,
    };
  });
  const receiptText = [...memoryUsed, ...memoryIgnored].join("\n");
  const historicalBoundaryCovered = /historical repair completion is recovery evidence|recovery evidence.*not permanent repository truth|历史.*恢复证据.*不是.*永久/i.test(receiptText);
  const receiptTaskAgentSessionId = String(receipt.task_agent_session_id || receipt.taskAgentSessionId || receipt.session?.task_agent_session_id || "").trim();
  const receiptNativeSessionId = String(receipt.native_session_id || receipt.nativeSessionId || receipt.session?.native_session_id || "").trim();
  const originalTaskAgentSessionId = String(brief.original_task_agent_session_id || brief.originalTaskAgentSessionId || "").trim();
  const originalNativeSessionId = String(brief.original_native_session_id || brief.originalNativeSessionId || "").trim();
  const allDocsCovered = requiredDocRelPaths.length > 0 && coverageRows.every((row: any) => row.covered === true);
  const allDocsCompliant = requiredDocRelPaths.length > 0 && coverageRows.every((row: any) => row.compliant === true);
  const gaps = [
    !requiredDocRelPaths.length ? "required_doc_rel_paths" : "",
    !allDocsCovered ? "required_docs_missing" : "",
    !allDocsCompliant ? "usage_state_or_freshness_invalid" : "",
    !historicalBoundaryCovered ? "historical_freshness_boundary_missing" : "",
    !receiptTaskAgentSessionId ? "receipt_task_agent_session_id" : "",
    !receiptNativeSessionId ? "receipt_native_session_id" : "",
    originalTaskAgentSessionId && receiptTaskAgentSessionId === originalTaskAgentSessionId ? "repair_task_session_reused_original" : "",
    originalNativeSessionId && receiptNativeSessionId === originalNativeSessionId ? "repair_native_session_reused_original" : "",
  ].filter(Boolean);
  return {
    schema: "ccm-post-compact-reinjection-repair-receipt-memory-usage-repair-proof-v1",
    verified: gaps.length === 0,
    requiredDocRelPaths,
    coveredDocRelPaths: coverageRows.filter((row: any) => row.covered).map((row: any) => row.relPath),
    coverageRows,
    historicalBoundaryCovered,
    allDocsCovered,
    allDocsCompliant,
    receiptTaskAgentSessionId,
    receiptNativeSessionId,
    originalTaskAgentSessionId,
    originalNativeSessionId,
    gaps,
  };
}

export function classifyReplayRepairBriefConsumptionForCoordinator(brief: any = {}, receipt: any = null) {
  if (!receipt || typeof receipt !== "object" || !Object.keys(receipt).length) return null;
  const postCompactReinjectionProof = postCompactReinjectionReceiptProofForCoordinator(brief, receipt);
  const postCompactReceiptMemoryUsageRepairProof = postCompactReceiptMemoryUsageRepairProofForCoordinator(brief, receipt);
  const rows = replayRepairConsumptionRowsForCoordinator(receipt);
  const matchedRow = rows.find((row: any) => replayRepairConsumptionMatchesBriefForCoordinator(row, brief));
  if (matchedRow) {
    const status = normalizeReplayRepairConsumptionStatusForCoordinator(
      matchedRow.usage_state || matchedRow.usageState || matchedRow.status || matchedRow.provider_reproof_status || matchedRow.providerReproofStatus,
      String(matchedRow.provider_reproof_status || matchedRow.providerReproofStatus || "").trim().toLowerCase() === "strong" ? "strong" : "used",
    );
    const providerRankingProof = providerRankingProvenanceProofFromConsumptionRowForCoordinator(matchedRow, brief, status || "used");
    return {
      status: status || "used",
      state: String(matchedRow.usage_state || matchedRow.usageState || matchedRow.status || ""),
      reason: compactText(matchedRow.reason || matchedRow.summary || "", 360),
      source: "receipt.replayRepairDispatchBriefUsage",
      providerRankingProof,
      postCompactReinjectionProof,
      postCompactReceiptMemoryUsageRepairProof,
    };
  }
  const tokens = [
    brief.brief_id,
    brief.work_item_id,
    brief.request_patch_checksum,
    brief.proof_entry_id,
    brief.runner_request_id,
  ].map((item: any) => String(item || "").trim()).filter(Boolean);
  const containsToken = (values: any[]) => {
    const text = replayRepairConsumptionStringListForCoordinator(values).join("\n");
    return tokens.some(token => token && text.includes(token));
  };
  if (containsToken(receipt.memoryUsed || receipt.memory_used || receipt.used)) {
    const text = replayRepairConsumptionStringListForCoordinator(receipt.memoryUsed || receipt.memory_used || receipt.used).join("\n");
    return {
      status: /provider[_\s-]*reproof[_\s-]*status\s*[:=]\s*strong|nativeApplyStrongProof\s*[:=]\s*true/i.test(text) ? "strong" : "used",
      state: "",
      reason: compactText(text, 360),
      source: "receipt.memoryUsed",
      postCompactReinjectionProof,
      postCompactReceiptMemoryUsageRepairProof,
    };
  }
  if (containsToken(receipt.memoryIgnored || receipt.memory_ignored || receipt.ignored)) {
    const text = replayRepairConsumptionStringListForCoordinator(receipt.memoryIgnored || receipt.memory_ignored || receipt.ignored).join("\n");
    return {
      status: "ignored",
      state: "",
      reason: compactText(text, 360),
      source: "receipt.memoryIgnored",
      postCompactReinjectionProof,
      postCompactReceiptMemoryUsageRepairProof,
    };
  }
  const blockerText = replayRepairConsumptionStringListForCoordinator([
    ...(Array.isArray(receipt.blockers) ? receipt.blockers : []),
    ...(Array.isArray(receipt.needs) ? receipt.needs : []),
    receipt.summary || "",
  ]).join("\n");
  if (tokens.some(token => token && blockerText.includes(token)) || ["blocked", "failed", "needs_info"].includes(String(receipt.status || "").trim())) {
    return {
      status: "blocked",
      state: String(receipt.status || ""),
      reason: compactText(blockerText || receipt.summary || "receipt blocked without replay repair usage declaration", 360),
      source: "receipt.blockers",
      postCompactReinjectionProof,
    };
  }
  return {
    status: "missing",
    state: "",
    reason: "receipt did not declare replay repair brief usage",
    source: "receipt",
    postCompactReinjectionProof,
  };
}

export function recordReplayRepairDispatchBriefTimelineBinding(groupId: string, input: any = {}, options: any = {}) {
  return require("./group-orchestrator-replay-repair").recordReplayRepairDispatchBriefTimelineBinding(groupId, input, options);
}

export function replayRepairStatusForCoordinator(item: any) {
  const status = String(item?.status || "").toLowerCase();
  if (["in_progress", "running", "claimed", "dispatching"].includes(status)) return "in_progress";
  if (["blocked", "needs_info", "needs_user", "waiting"].includes(status)) return "blocked";
  if (["completed", "done", "resolved", "ok"].includes(status)) return "completed";
  if (["cancelled", "canceled", "superseded"].includes(status)) return "cancelled";
  return "pending";
}

export function replayRepairPriorityRankForCoordinator(priority: any) {
  const value = String(priority || "").toLowerCase();
  if (value === "critical") return 0;
  if (value === "high") return 1;
  if (value === "medium") return 2;
  return 3;
}

export function candidateNativeBindingForCoordinator(candidate: any = {}) {
  return [
    candidate.proof_entry_id ? `proof=${candidate.proof_entry_id}` : "",
    candidate.request_patch_checksum ? `request=${candidate.request_patch_checksum}` : "",
    candidate.provider_reproof_status ? `provider_reproof=${candidate.provider_reproof_status}` : "",
    candidate.provider_reproof_reason ? `provider_reason=${candidate.provider_reproof_reason}` : "",
    candidate.timeline_binding_id ? `timeline=${candidate.timeline_binding_id}` : "",
    candidate.request_telemetry_source ? `source=${candidate.request_telemetry_source}` : "",
    candidate.request_telemetry_session_status ? `session=${candidate.request_telemetry_session_status}` : "",
    candidate.request_telemetry_dispatch_status ? `dispatch=${candidate.request_telemetry_dispatch_status}` : "",
    candidate.runner_request_id ? `runner=${candidate.runner_request_id}` : "",
    candidate.execution_id ? `execution=${candidate.execution_id}` : "",
    candidate.provider_switch_decision_receipt_id ? `provider_receipt=${candidate.provider_switch_decision_receipt_id}` : "",
    candidate.provider_switch_decision_receipt_checksum ? `provider_receipt_checksum=${candidate.provider_switch_decision_receipt_checksum}` : "",
    Array.isArray(candidate.provider_ranking_provenance_rel_paths) && candidate.provider_ranking_provenance_rel_paths.length
      ? `provider_memory=${candidate.provider_ranking_provenance_rel_paths.slice(0, 3).join("|")}`
      : "",
    Array.isArray(candidate.provider_ranking_provenance_gap_codes) && candidate.provider_ranking_provenance_gap_codes.length
      ? `provider_gaps=${candidate.provider_ranking_provenance_gap_codes.slice(0, 3).join("|")}`
      : "",
  ].filter(Boolean);
}

export function readyReplayRepairDispatchBriefsForCoordinator(groupId: string) {
  const ledger = readReplayRepairDispatchPlanLedgerForCoordinator(groupId);
  return (Array.isArray(ledger.briefs) ? ledger.briefs : [])
    .filter((brief: any) => String(brief.status || "") === "ready");
}

export function replayRepairBriefMatchText(value: any) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function replayRepairBriefMatchScore(brief: any = {}, assignment: any = {}) {
  const project = String(assignment.project || assignment.targetName || "").trim();
  const text = replayRepairBriefMatchText([
    assignment.task,
    assignment.reason,
    assignment.dependsOn,
  ].filter(Boolean).join("\n"));
  const target = String(brief.dispatch_target || brief.target_project || "").trim();
  if (target && project && target !== project) return { score: 0, matched: [] };
  let score = target && project && target === project ? 20 : 0;
  const tokens = [
    { value: brief.brief_id, weight: 80, key: "brief_id" },
    { value: brief.work_item_id, weight: 70, key: "work_item_id" },
    { value: brief.request_patch_checksum, weight: 55, key: "request_patch_checksum" },
    { value: brief.runner_request_id, weight: 45, key: "runner_request_id" },
    { value: brief.proof_entry_id, weight: 35, key: "proof_entry_id" },
  ];
  const matched: string[] = [];
  for (const token of tokens) {
    const value = replayRepairBriefMatchText(token.value);
    if (value && text.includes(value)) {
      score += token.weight;
      matched.push(token.key);
    }
  }
  if (/replay|repair|修复|记忆|压缩|compact|native|proof|证明|runner|telemetry|派发/.test(text)) score += 18;
  if (isApiMicrocompactNativeProofRepairSourceForCoordinator(brief.source) && /native|proof|证明|runner|telemetry|microcompact|原生|re-proof/.test(text)) score += 18;
  return { score, matched };
}

// ===== merged from group-orchestrator-coded-part-05.ts =====

export function findReplayRepairDispatchBriefForAssignment(groupId: string, assignment: any = {}) {
  if (!groupId) return null;
  const briefs = readyReplayRepairDispatchBriefsForCoordinator(groupId);
  let best: any = null;
  for (const brief of briefs) {
    const match = replayRepairBriefMatchScore(brief, assignment);
    if (Number(match.score || 0) < 45) continue;
    if (!best || Number(match.score || 0) > Number(best.match_score || 0)) {
      best = {
        brief,
        match_score: match.score,
        matched_by: match.matched || [],
      };
    }
  }
  return best;
}

export function normalizeReplayRepairPacketBriefForCoordinator(item: any = {}) {
  return {
    brief_id: item.brief_id || item.briefId || "",
    work_item_id: item.work_item_id || item.workItemId || "",
    source: item.source || "",
    component: item.component || "",
    target_project: item.target_project || item.targetProject || "",
    reinjection_gate_id: item.reinjection_gate_id || item.reinjectionGateId || "",
    post_compact_candidate_id: item.post_compact_candidate_id || item.postCompactCandidateId || "",
    post_compact_candidate_kind: item.post_compact_candidate_kind || item.postCompactCandidateKind || "",
    post_compact_candidate_value: item.post_compact_candidate_value || item.postCompactCandidateValue || "",
    post_compact_candidate_source_message_id: item.post_compact_candidate_source_message_id || item.postCompactCandidateSourceMessageId || "",
    original_worker_context_packet_id: item.original_worker_context_packet_id || item.originalWorkerContextPacketId || "",
    original_binding_id: item.original_binding_id || item.originalBindingId || "",
    original_task_agent_session_id: item.original_task_agent_session_id || item.originalTaskAgentSessionId || "",
    original_native_session_id: item.original_native_session_id || item.originalNativeSessionId || "",
    post_compact_receipt_memory_required_doc_rel_paths: item.post_compact_receipt_memory_required_doc_rel_paths || item.postCompactReceiptMemoryRequiredDocRelPaths || [],
    proof_entry_id: item.proof_entry_id || item.proofEntryId || "",
    request_patch_checksum: item.request_patch_checksum || item.requestPatchChecksum || "",
    provider_reproof_status: item.provider_reproof_status || item.providerReproofStatus || "",
    provider_reproof_reason: item.provider_reproof_reason || item.providerReproofReason || "",
    reproof_candidate_id: item.reproof_candidate_id || item.reproofCandidateId || "",
    timeline_binding_id: item.timeline_binding_id || item.timelineBindingId || "",
    original_work_item_id: item.original_work_item_id || item.originalWorkItemId || "",
    request_telemetry_session_status: item.request_telemetry_session_status || item.requestTelemetrySessionStatus || "",
    request_telemetry_dispatch_status: item.request_telemetry_dispatch_status || item.requestTelemetryDispatchStatus || "",
    runner_request_id: item.runner_request_id || item.runnerRequestId || "",
    execution_id: item.execution_id || item.executionId || "",
    required_receipt_reference: item.required_receipt_reference !== false && item.requiredReceiptReference !== false,
    should_create_real_task: item.should_create_real_task === false || item.shouldCreateRealTask === false ? false : item.should_create_real_task,
  };
}

export function replayRepairPacketBriefMatchesForCoordinator(packetBrief: any = {}, brief: any = {}) {
  const packetBriefId = String(packetBrief.brief_id || "").trim();
  const briefId = String(brief.brief_id || "").trim();
  if (packetBriefId && briefId && packetBriefId === briefId) return true;
  const packetWorkItem = String(packetBrief.work_item_id || "").trim();
  const briefWorkItem = String(brief.work_item_id || "").trim();
  return !!packetWorkItem && !!briefWorkItem && packetWorkItem === briefWorkItem;
}

export function buildReplayRepairWorkerContextPacketProbeForCoordinator(assignment: any = {}, brief: any = {}) {
  const packet = assignment.worker_context_packet || assignment.workerContextPacket || {};
  const packetBriefs = (Array.isArray(packet.replay_repair_dispatch_briefs) ? packet.replay_repair_dispatch_briefs : [])
    .map(normalizeReplayRepairPacketBriefForCoordinator);
  const matchingBrief = packetBriefs.find((item: any) => replayRepairPacketBriefMatchesForCoordinator(item, brief)) || {};
  let rendered = "";
  try { rendered = renderWorkerContextPacket(packet); } catch {}
  const renderedIncludes = (value: any) => {
    const text = String(value || "").trim();
    return !text || rendered.includes(text);
  };
  return {
    packet_id: packet.packet_id || "",
    context_usage: packet.context_usage || packet.contextUsage || null,
    replay_repair_dispatch_brief_count: packetBriefs.length,
    matching_brief: matchingBrief,
    rendered_flags: {
      has_brief_id: renderedIncludes(brief.brief_id),
      has_work_item_id: renderedIncludes(brief.work_item_id),
      has_source: renderedIncludes(brief.source),
      has_component: renderedIncludes(brief.component),
      has_reinjection_gate_id: renderedIncludes(brief.reinjection_gate_id),
      has_post_compact_candidate_id: renderedIncludes(brief.post_compact_candidate_id),
      has_post_compact_candidate_kind: renderedIncludes(brief.post_compact_candidate_kind),
      has_post_compact_candidate_value: renderedIncludes(brief.post_compact_candidate_value),
      has_post_compact_candidate_source_message_id: renderedIncludes(brief.post_compact_candidate_source_message_id),
      has_proof_entry_id: renderedIncludes(brief.proof_entry_id),
      has_request_patch_checksum: renderedIncludes(brief.request_patch_checksum),
      has_provider_reproof_status: renderedIncludes(brief.provider_reproof_status),
      has_provider_reproof_reason: renderedIncludes(brief.provider_reproof_reason),
      has_reproof_candidate_id: renderedIncludes(brief.reproof_candidate_id),
      has_timeline_binding_id: renderedIncludes(brief.timeline_binding_id),
      has_original_work_item_id: renderedIncludes(brief.original_work_item_id),
      has_request_telemetry_session_status: renderedIncludes(brief.request_telemetry_session_status),
      has_request_telemetry_dispatch_status: renderedIncludes(brief.request_telemetry_dispatch_status),
      has_runner_request_id: renderedIncludes(brief.runner_request_id),
      has_execution_id: renderedIncludes(brief.execution_id),
      has_should_create_real_task_false: rendered.includes("shouldCreateRealTask=false"),
      has_context_usage_budget: rendered.includes("Context usage budget"),
      has_platform_memory: rendered.includes("平台记忆"),
      has_memory_reinjection_proof: rendered.includes("Memory reinjection proof"),
      has_memory_compaction_hash: !!(packet.memory_reinjection_proof?.expected_compacted_memory_hash || packet.memoryReinjectionProof?.expectedCompactedMemoryHash)
        && rendered.includes(packet.memory_reinjection_proof?.expected_compacted_memory_hash || packet.memoryReinjectionProof?.expectedCompactedMemoryHash || ""),
    },
    rendered_excerpt: compactText(rendered, 1200),
    briefs: packetBriefs,
  };
}

export function recordReplayRepairDispatchBriefAssignmentBinding(groupId: string, assignment: any = {}, match: any = {}, options: any = {}) {
  return require("./group-orchestrator-replay-repair").recordReplayRepairDispatchBriefAssignmentBinding(groupId, assignment, match, options);
}

export function attachReplayRepairAssignmentReceiptForCoordinator(groupId: string, binding: any = {}, receipt: any = null, at = new Date().toISOString()) {
  if (!groupId || !receipt || typeof receipt !== "object") return null;
  const ledger = readReplayRepairDispatchBindingLedgerForCoordinator(groupId);
  const entries = Array.isArray(ledger.entries) ? [...ledger.entries] : [];
  const index = entries.findIndex((entry: any) => {
    if (binding.brief_id && String(entry.brief_id || "") !== String(binding.brief_id || "")) return false;
    if (binding.assignment_id && String(entry.assignment_id || "") === String(binding.assignment_id || "")) return true;
    if (binding.dispatch_key && String(entry.dispatch_key || "") === String(binding.dispatch_key || "")) return true;
    return !!binding.worker_context_packet_id
      && String(entry.worker_context_packet_id || "") === String(binding.worker_context_packet_id || "");
  });
  if (index < 0) return null;
  entries[index] = {
    ...entries[index],
    worker_context_packet_receipt: receipt,
    receipt_status: binding.receipt_status || receipt.status || entries[index].receipt_status || "",
    task_id: binding.task_id || entries[index].task_id || "",
    worker_handoff_id: binding.worker_handoff_id || entries[index].worker_handoff_id || "",
    task_agent_session_id: binding.task_agent_session_id || entries[index].task_agent_session_id || "",
    native_session_id: binding.native_session_id || entries[index].native_session_id || "",
    execution_id: binding.execution_id || entries[index].execution_id || "",
    receipt_attached_at: at,
    at,
  };
  const next = {
    ...ledger,
    schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
    version: ledger.version || 1,
    groupId,
    file: ledger.file || getReplayRepairDispatchBindingsFileForCoordinator(groupId),
    updatedAt: at,
    bindingCount: entries.length,
    receiptAttachedCount: entries.filter((entry: any) => entry.worker_context_packet_receipt && typeof entry.worker_context_packet_receipt === "object").length,
    ...providerSwitchBindingLedgerCountersForCoordinator(entries),
    entries: entries.slice(-160),
  };
  writeJsonAtomicForCoordinator(next.file, next);
  return entries[index];
}

export function buildReplayRepairDispatchBriefForCoordinator(groupId: string, candidate: any = {}, index = 0, existing: any = {}, at = new Date().toISOString()) {
  return require("./group-orchestrator-replay-repair").buildReplayRepairDispatchBriefForCoordinator(groupId, candidate, index, existing, at);
}

export function syncReplayRepairDispatchPlansForCoordinator(groupId: string, summaryInput: any = null, options: any = {}) {
  return require("./group-orchestrator-replay-repair").syncReplayRepairDispatchPlansForCoordinator(groupId, summaryInput, options);
}

export function readReplayRepairDispatchCandidatesForCoordinator(groupId: string, limit = 8) {
  const file = getReplayRepairWorkItemsFileForCoordinator(groupId);
  try {
    const ledger = JSON.parse(fs.readFileSync(file, "utf-8"));
    if (ledger?.schema !== "ccm-compact-boundary-replay-repair-work-items-v1") return null;
    const items = Array.isArray(ledger.items) ? ledger.items : [];
    const openItems = items.filter((item: any) => ["pending", "in_progress", "blocked"].includes(replayRepairStatusForCoordinator(item)));
    const candidates = openItems
      .filter((item: any) => {
        const status = replayRepairStatusForCoordinator(item);
        const priority = String(item.priority || "").toLowerCase();
        return !!String(item.dispatch_target || item.dispatchTarget || "").trim()
          || (status === "in_progress" && String(item.owner || "") === "group-main-agent")
          || (status === "pending" && ["critical", "high"].includes(priority));
      })
      .sort((a: any, b: any) => {
        const dispatchA = String(a.dispatch_target || a.dispatchTarget || "").trim() ? 0 : replayRepairStatusForCoordinator(a) === "in_progress" ? 1 : 2;
        const dispatchB = String(b.dispatch_target || b.dispatchTarget || "").trim() ? 0 : replayRepairStatusForCoordinator(b) === "in_progress" ? 1 : 2;
        if (dispatchA !== dispatchB) return dispatchA - dispatchB;
        const priority = replayRepairPriorityRankForCoordinator(a.priority) - replayRepairPriorityRankForCoordinator(b.priority);
        if (priority) return priority;
        return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
      })
      .slice(0, limit)
      .map((item: any, index: number) => {
        const status = replayRepairStatusForCoordinator(item);
        const dispatchTarget = compactText(item.dispatch_target || item.dispatchTarget || "", 120);
        const targetProject = compactText(dispatchTarget || item.target_project || item.target || item.repair_target || "", 120);
        const workItemId = String(item.work_item_id || item.id || `repair-${index}`);
        return {
          candidate_id: `replay-repair-dispatch:${workItemId.replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 80)}`,
          work_item_id: workItemId,
          status,
          priority: item.priority || "medium",
          component: item.component || "replay_renderer",
          source: item.source || "",
          subject: item.subject || item.title || "",
          targetProject,
          dispatch_target: dispatchTarget,
          repair_target: item.repair_target || "",
          reinjection_gate_id: item.reinjection_gate_id || "",
          post_compact_candidate_id: item.post_compact_candidate_id || "",
          post_compact_candidate_kind: item.post_compact_candidate_kind || "",
          post_compact_candidate_value: item.post_compact_candidate_value || "",
          post_compact_candidate_source_message_id: item.post_compact_candidate_source_message_id || "",
          proof_entry_id: item.proof_entry_id || "",
          plan_checksum: item.plan_checksum || "",
          apply_plan_checksum: item.apply_plan_checksum || "",
          request_patch_checksum: item.request_patch_checksum || "",
          worker_context_packet_id: item.worker_context_packet_id || item.packet_id || "",
          worker_context_packet_binding_id: item.worker_context_packet_binding_id || item.binding_id || "",
          worker_context_packet_memory_policy_reason: item.worker_context_packet_memory_policy_reason || "",
          binding_id: item.binding_id || item.worker_context_packet_binding_id || "",
          assignment_id: item.assignment_id || "",
          dispatch_key: item.dispatch_key || "",
          provider_override_followup_contract_validation_id: item.provider_override_followup_contract_validation_id || "",
          provider_override_followup_contract_rel_paths: item.provider_override_followup_contract_rel_paths || [],
          provider_override_followup_contract_work_item_ids: item.provider_override_followup_contract_work_item_ids || [],
          provider_override_followup_contract_override_ids: item.provider_override_followup_contract_override_ids || [],
          provider_override_followup_contract_gap_codes: item.provider_override_followup_contract_gap_codes || [],
          provider_switch_decision_receipt_id: item.provider_switch_decision_receipt_id || "",
          provider_switch_decision_receipt_checksum: item.provider_switch_decision_receipt_checksum || "",
          provider_ranking_provenance_gap_codes: item.provider_ranking_provenance_gap_codes || [],
          provider_ranking_provenance_rel_paths: item.provider_ranking_provenance_rel_paths || [],
          provider_ranking_provenance_row_ids: item.provider_ranking_provenance_row_ids || [],
          provider_ranking_provenance_missing_rel_paths: item.provider_ranking_provenance_missing_rel_paths || [],
          provider_ranking_provenance_missing_row_ids: item.provider_ranking_provenance_missing_row_ids || [],
          provider_ranking_memory_receipt_required_doc_rel_paths: item.provider_ranking_memory_receipt_required_doc_rel_paths || [],
          provider_ranking_memory_receipt_missing_doc_rel_paths: item.provider_ranking_memory_receipt_missing_doc_rel_paths || [],
          provider_ranking_memory_receipt_missing_usage_state_doc_rel_paths: item.provider_ranking_memory_receipt_missing_usage_state_doc_rel_paths || [],
          post_compact_receipt_memory_gap_codes: item.post_compact_receipt_memory_gap_codes || [],
          post_compact_receipt_memory_required_doc_rel_paths: item.post_compact_receipt_memory_required_doc_rel_paths || [],
          post_compact_receipt_memory_missing_doc_rel_paths: item.post_compact_receipt_memory_missing_doc_rel_paths || [],
          post_compact_receipt_memory_missing_current_source_verified_doc_rel_paths: item.post_compact_receipt_memory_missing_current_source_verified_doc_rel_paths || [],
          post_compact_receipt_memory_missing_ignored_reason_doc_rel_paths: item.post_compact_receipt_memory_missing_ignored_reason_doc_rel_paths || [],
          original_worker_context_packet_id: item.original_worker_context_packet_id || "",
          original_binding_id: item.original_binding_id || "",
          original_assignment_id: item.original_assignment_id || "",
          original_dispatch_key: item.original_dispatch_key || "",
          original_task_agent_session_id: item.original_task_agent_session_id || "",
          original_native_session_id: item.original_native_session_id || "",
          compact_outcome_id: item.compact_outcome_id || "",
          compact_retry_id: item.compact_retry_id || "",
          compact_hook_run_id: item.compact_hook_run_id || "",
          provider_reproof_status: item.provider_reproof_status || "",
          provider_reproof_reason: item.provider_reproof_reason || "",
          reproof_candidate_id: item.reproof_candidate_id || "",
          timeline_binding_id: item.timeline_binding_id || "",
          original_work_item_id: item.original_work_item_id || "",
          request_telemetry_entry_id: item.request_telemetry_entry_id || "",
          request_telemetry_status: item.request_telemetry_status || "",
          request_telemetry_source: item.request_telemetry_source || "",
          request_telemetry_session_status: item.request_telemetry_session_status || "",
          request_telemetry_dispatch_status: item.request_telemetry_dispatch_status || "",
          runner_request_id: item.runner_request_id || item.request_telemetry_runner_request_id || "",
          execution_id: item.execution_id || "",
          instruction: compactText(item.instruction || item.description || item.expected || item.subject || "", 360),
          expected: compactText(item.expected || "", 180),
          prompt_patch: compactText(item.prompt_patch || "", 900),
          recommendedAction: dispatchTarget
            ? "main_agent_review_and_dispatch_to_child_agent"
            : status === "in_progress"
            ? "main_agent_prepare_dispatch_brief"
            : "main_agent_claim_or_triage_before_next_child_dispatch",
        };
      });
    return {
      schema: "ccm-replay-repair-main-agent-dispatch-candidates-v1",
      groupId,
      file,
      updatedAt: ledger.updatedAt || "",
      candidateCount: candidates.length,
      openItemCount: openItems.length,
      claimedCount: openItems.filter((item: any) => replayRepairStatusForCoordinator(item) === "in_progress" && String(item.owner || "") === "group-main-agent").length,
      dispatchMarkedCount: openItems.filter((item: any) => String(item.dispatch_target || item.dispatchTarget || "").trim()).length,
      readyCount: candidates.filter((candidate: any) => candidate.dispatch_target || candidate.status === "in_progress").length,
      shouldCreateRealTask: false,
      candidates,
    };
  } catch {
    return null;
  }
}
