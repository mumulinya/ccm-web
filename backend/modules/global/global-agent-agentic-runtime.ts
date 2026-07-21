import * as crypto from "crypto";
import type { CollabCtx } from "../collaboration/collaboration";
import type { GlobalAgentDecision, GlobalAgentLoopRuntime, GlobalAgentRun } from "../../agents/global/loop";
import { buildGlobalAgentModelMessages } from "../../agents/global/global-agent-run-projection";
import type { GlobalMissionSupervisorRuntime } from "../../agents/global/mission-supervisor";
import { buildModelVisiblePayloadSnapshot, buildSessionPostCompactGate } from "../../system/session-compaction-core";
import { getGroupAutoCompactThreshold, resolveGroupModelContextCapacity } from "../collaboration/group-compaction-strategy";
import {
  decomposeRequirementToTaskPlan,
  ingestRequirementSources,
  type RequirementIngestionResult,
} from "../requirements/source-ingestion";

type LocalIntentResult = any;

// Global-only context, tool execution, mission supervision, and agentic loop lifecycle.
export function createGlobalAgentAgenticRuntime(deps: any) {
  const { hasExplicitGlobalWriteAuthorization, GLOBAL_AGENT_TOOL_SPECS, GLOBAL_MANAGEMENT_ACTIONS, GLOBAL_PET_AGENT_NAME, acquireIdempotency, annotateGlobalAction, attachGlobalAgentRunSupervision, bindFeishuIdentifiersFromValue, bindFeishuTaskContext, buildGlobalAgentMemoryPacket, buildGlobalAgentSessionContinuation, buildGlobalSingleProjectMissionPayload, callGlobalModelWithRetry, compactGlobalAgentSessionWithModel, compactPetText, completeGlobalAgentSupervision, completeIdempotency, continueGlobalAgentRunWithClarification, controlGlobalDevelopmentMission, controlGlobalMissionSupervisor, createGlobalDevelopmentMission, createRequirementEpicWithChildren, executeFeishuAction, executePlayMusic, executeStopMusic, failIdempotency, findClarifyingGlobalAgentRun, formatGlobalMissionFinalReport, getAgentQualityPolicy, getConfigInfo, getConfigs, getGlobalAgentBackgroundOutput, getGlobalAgentMemoryPolicy, getGlobalAgentRun, getGlobalDevelopmentMission, getGlobalMissionSupervisor, getGlobalMissionSupervisorSchedulerStatus, globalRunVisibleReply, hasExplicitDevelopmentExecutionIntent, inferLocalGlobalAction, ingestGlobalAgentConversation, listGlobalAgentRuns, listGlobalMissionSupervisors, listTaskAgentSessions, loadCronJobs, loadGlobalAgentHistoryStore, loadGlobalAgentHooks, loadGlobalAgentMemory, loadGlobalAgentPermissionRules, loadGroups, loadMcpTools, loadOrchestratorConfig, loadSkills, loadTasks, normalizeText, notifyFeishuTaskStage, postLocalApi, queryKnowledgeBase, recallGlobalAgentMemory, rebuildGlobalAgentMemory, recordGlobalAgentRuntimeOutput, recordGlobalAgentSessionProviderUsage, recordGlobalMissionMemory, recoverInterruptedGlobalAgentRuns, refreshGlobalDevelopmentMissions, renderGlobalGroupMemoryContextBundle, resumeGlobalAgentRun, sanitizeGlobalDirectAgentOutput, sendFeishuReportMessage, setGlobalAgentMemoryPolicy, settleIdempotencyByTrace, startGlobalAgentRun, startGlobalMissionSupervisor, startGlobalMissionSupervisorScheduler, stopGlobalMissionSupervisorScheduler, superviseGlobalDevelopmentMissionCycle, updateGlobalAgentSupervisionState, waitForIdempotencyResult } = deps

  function safeProjectRows() {
    return getConfigs().map((config: any) => {
      const info = getConfigInfo(config.path)?.[0] || {};
      return {
        name: config.name,
        work_dir: info.workDir || "",
        agent: info.agent || "claudecode",
        platform: info.platform || "",
      };
    });
  }
  
  function compactTask(task: any) {
    return {
      id: task.id,
      title: task.title,
      status: task.status,
      status_detail: task.status_detail,
      group_id: task.group_id,
      target_project: task.target_project,
      updated_at: task.updated_at || task.completed_at || task.created_at,
      trace_id: task.trace_id,
    };
  }
  
  function isGlobalAgentOwnedTask(task: any) {
    const source = String(task?.source || task?.created_by || task?.createdBy || "").toLowerCase();
    return !!String(task?.global_mission_id || task?.globalMissionId || task?.global_run_id || task?.globalRunId || task?.parent_run_id || task?.parentRunId || "").trim()
      || source.includes("global-agent")
      || source.includes("global_agent");
  }
  
  const GLOBAL_AGENT_CONTEXT_ALLOWED_KEYS = new Set([
    "projects",
    "groups",
    "task_summary",
    "cron_jobs",
    "tools",
    "global_memory",
    "session_continuity",
    "memory_context_boundary",
    "context_source_manifest",
    "context_boundary_proof",
  ]);
  
  function globalAgentContextProofPayload(context: any = {}) {
    const payload = { ...(context || {}) };
    delete payload.context_boundary_proof;
    return payload;
  }
  
  function verifyGlobalAgentContextBoundary(context: any = {}) {
    const issues: string[] = [];
    for (const key of Object.keys(context || {})) if (!GLOBAL_AGENT_CONTEXT_ALLOWED_KEYS.has(key)) issues.push(`global_context_source_not_allowed:${key}`);
    if (context?.memory_context_boundary?.group_session_context_included !== false) issues.push("global_context_group_session_boundary_missing");
    if (context?.memory_context_boundary?.project_memory_included !== false) issues.push("global_context_project_memory_boundary_missing");
    if (context?.memory_context_boundary?.group_memory_included !== false) issues.push("global_context_group_memory_boundary_missing");
    for (const group of Array.isArray(context?.groups) ? context.groups : []) {
      for (const key of Object.keys(group || {})) if (!new Set(["id", "name", "members"]).has(key)) issues.push(`global_context_group_directory_field_not_allowed:${key}`);
      if (group?.group_session_id || group?.groupSessionId || group?.messages || group?.memory) issues.push("global_context_group_session_payload_present");
      for (const member of Array.isArray(group?.members) ? group.members : []) {
        for (const key of Object.keys(member || {})) if (!new Set(["project", "agent"]).has(key)) issues.push(`global_context_group_member_field_not_allowed:${key}`);
      }
    }
    for (const project of Array.isArray(context?.projects) ? context.projects : []) {
      for (const key of Object.keys(project || {})) if (!new Set(["name", "work_dir", "agent", "platform"]).has(key)) issues.push(`global_context_project_directory_field_not_allowed:${key}`);
    }
    if (context?.task_summary?.policy !== "global_agent_owned_tasks_only") issues.push("global_context_task_boundary_missing");
    for (const task of Array.isArray(context?.task_summary?.recent) ? context.task_summary.recent : []) {
      for (const key of Object.keys(task || {})) if (!new Set(["id", "title", "status", "status_detail", "group_id", "target_project", "updated_at", "trace_id"]).has(key)) issues.push(`global_context_task_field_not_allowed:${key}`);
      if (task?.group_session_id || task?.groupSessionId || task?.description || task?.content || task?.memory) issues.push("global_context_group_task_payload_present");
    }
    const manifestEntries = Array.isArray(context?.context_source_manifest?.entries) ? context.context_source_manifest.entries : [];
    const expectedSources = ["global_agent_memory", "global_agent_session", "routing_directory", "global_task_state", "runtime_capability_directory"];
    if (expectedSources.some(source => !manifestEntries.some((entry: any) => entry.source === source && entry.allowed === true))) issues.push("global_context_source_manifest_incomplete");
    if (manifestEntries.some((entry: any) => !expectedSources.includes(String(entry?.source || "")))) issues.push("global_context_source_manifest_unknown_source");
    if (manifestEntries.some((entry: any) => entry.allowed !== true)) issues.push("global_context_source_manifest_contains_unapproved_source");
    const proof = context?.context_boundary_proof || {};
    if (proof.schema !== "ccm-global-agent-context-boundary-proof-v1") issues.push("global_context_boundary_proof_schema_invalid");
    const expectedChecksum = crypto.createHash("sha256").update(JSON.stringify(globalAgentContextProofPayload(context))).digest("hex");
    if (String(proof.context_checksum || "") !== expectedChecksum) issues.push("global_context_boundary_checksum_invalid");
    if (/\bgcs_[a-z0-9_-]+\b/i.test(JSON.stringify(context || {}))) issues.push("global_context_group_session_identifier_present");
    return { schema: "ccm-global-agent-context-boundary-validation-v1", valid: issues.length === 0, issues, expectedChecksum };
  }
  
  function summarizeGlobalToolObservationForUser(observation: any, fallback = "操作已返回结果。") {
    if (!observation) return fallback;
    if (observation.success === false || observation.error) {
      return sanitizeGlobalDirectAgentOutput(observation.error || observation.summary || observation.message, "操作未完成；错误详情已放入技术详情。", 700);
    }
    const explicit = sanitizeGlobalDirectAgentOutput(observation.summary || observation.message || observation.reply || "", "", 700);
    if (explicit) return explicit;
    const count = observation.jobs?.length
      ?? observation.tasks?.length
      ?? observation.projects?.length
      ?? observation.groups?.length
      ?? observation.missions?.length
      ?? observation.children?.length;
    if (count !== undefined) return `操作已返回结果，共 ${count} 条；详细记录已放入技术详情。`;
    if (observation.accepted === true && observation.completed === false) return "任务已受理并进入持续跟进；这不代表最终完成，完成后会再给出交付总结。";
    if (observation.client_effect) return "操作已返回结果，界面会同步执行对应动作。";
    return "操作已返回结果；详细记录已放入技术详情。";
  }
  
  function buildGlobalAgentGroupMemoryModelContext(bundle: any, options: any = {}) {
    const maxChars = Math.max(4_000, Math.min(24_000, Number(options.maxChars || options.max_chars || 12_000)));
    const sourceText = typeof bundle === "string"
      ? bundle
      : String(bundle?.rendered_text || renderGlobalGroupMemoryContextBundle(bundle) || "");
    const truncated = sourceText.length > maxChars;
    const renderedText = truncated
      ? `${sourceText.slice(0, Math.max(0, maxChars - 56)).trimEnd()}\n[群聊记忆摘要已按模型上下文预算截断]`
      : sourceText;
    const selectedGroups = Array.isArray(bundle?.groups)
      ? bundle.groups.slice(0, 12).map((group: any) => ({
          group_id: String(group?.group_id || ""),
          group_name: String(group?.group_name || ""),
          score: Number(group?.score || 0),
        }))
      : [];
    const sourceBytes = typeof bundle === "string" ? Buffer.byteLength(bundle) : Buffer.byteLength(JSON.stringify(bundle || {}));
    return {
      schema: "ccm-global-group-memory-model-context-v1",
      source_schema: typeof bundle === "object" ? String(bundle?.schema || "") : "text",
      generated_at: typeof bundle === "object" ? String(bundle?.generated_at || "") : "",
      query: typeof bundle === "object" ? String(bundle?.query || "") : "",
      total_group_count: Number(bundle?.total_group_count || 0),
      selected_group_count: Number(bundle?.selected_group_count || selectedGroups.length),
      selected_groups: selectedGroups,
      memory_policy: bundle?.memory_policy || null,
      rendered_text: renderedText,
      context_budget: {
        max_chars: maxChars,
        used_chars: renderedText.length,
        approximate_tokens: Math.ceil(renderedText.length / 3),
        source_bytes: sourceBytes,
        truncated,
        full_context_available_via: "query_group_memory technical endpoint",
      },
    };
  }
  
  function buildAgenticContext(query = "", sessionId = "", options: any = {}) {
    const tasks = loadTasks();
    const groups = Array.isArray(options.groups) ? options.groups : loadGroups();
    const globalTasks = tasks.filter(isGlobalAgentOwnedTask);
    const context: any = {
      projects: safeProjectRows(),
      groups: groups.map((group: any) => ({ id: group.id, name: group.name, members: (group.members || []).map((member: any) => ({ project: member.project, agent: member.agent })) })),
      task_summary: {
        total: globalTasks.length,
        active: globalTasks.filter((task: any) => ["pending", "queued", "in_progress", "running"].includes(String(task.status))).length,
        recent: globalTasks.slice(-12).map(compactTask),
        policy: "global_agent_owned_tasks_only",
      },
      cron_jobs: loadCronJobs().map((job: any) => ({ id: job.id, name: job.name, schedule: job.schedule, enabled: job.enabled !== false, target_type: job.target_type, group_id: job.group_id, project: job.project })),
      tools: {
        mcp: loadMcpTools().map((tool: any) => tool.name),
        skills: loadSkills().map((skill: any) => skill.name),
      },
      global_memory: query ? buildGlobalAgentMemoryPacket(query, {
        sessionId,
        limit: 7,
        recordMetric: options.recordMemoryMetric !== false && options.record_memory_metric !== false,
      }) : "",
      session_continuity: sessionId && options.includeSessionContinuity !== false && options.include_session_continuity !== false
        ? buildGlobalAgentSessionContinuation(sessionId)
        : null,
      memory_context_boundary: {
        schema: "ccm-global-agent-memory-boundary-v1",
        policy: "global_memory_only_group_session_content_excluded",
        group_session_context_included: false,
        group_memory_included: false,
        project_memory_included: false,
        routing_directory_included: true,
        global_task_state_included: true,
      },
      context_source_manifest: {
        schema: "ccm-global-agent-context-source-manifest-v1",
        entries: [
          { source: "global_agent_memory", allowed: true },
          { source: "global_agent_session", allowed: true },
          { source: "routing_directory", allowed: true },
          { source: "global_task_state", allowed: true },
          { source: "runtime_capability_directory", allowed: true },
        ],
      },
    };
    context.context_boundary_proof = {
      schema: "ccm-global-agent-context-boundary-proof-v1",
      context_checksum: crypto.createHash("sha256").update(JSON.stringify(globalAgentContextProofPayload(context))).digest("hex"),
      generated_at: new Date().toISOString(),
    };
    const validation = verifyGlobalAgentContextBoundary(context);
    if (!validation.valid) throw new Error(`global agent context boundary failed: ${validation.issues.join(", ")}`);
    return context;
  }

  function buildGlobalProviderPayloadSnapshot(messages: Array<{ role: string; content: string }>, sessionId: string) {
    return buildModelVisiblePayloadSnapshot({
      scope: "global",
      sessionId,
      system: messages.filter(message => message.role === "system"),
      recentMessages: messages.filter(message => message.role !== "system"),
    });
  }

  function isGlobalPromptTooLongError(error: any) {
    return /HTTP\s*413|prompt(?:\s+is)?\s+too\s+long|context(?:_length)?(?:\s+window)?\s*(?:exceeded|limit)|maximum context|request too large/i.test(String(error?.message || error || ""));
  }

  async function prepareGlobalProviderMessages(
    messages: Array<{ role: string; content: string }>,
    run: GlobalAgentRun,
    runtime: GlobalAgentLoopRuntime,
    options: { promptTooLong?: boolean } = {},
  ) {
    const sessionId = String(run.session_id || "").trim();
    if (!sessionId) throw new Error("全局 Agent Provider 调用缺少精确会话 ID");
    const config = loadOrchestratorConfig();
    const modelCapacity = resolveGroupModelContextCapacity(config);
    const threshold = getGroupAutoCompactThreshold(config);
    const triggerPayload = buildGlobalProviderPayloadSnapshot(messages, sessionId);
    if (!options.promptTooLong && triggerPayload.totalTokens < threshold) return messages;

    const compaction = await compactGlobalAgentSessionWithModel(sessionId, {
      reason: options.promptTooLong ? "provider_prompt_too_long" : "provider_payload_preflight",
      promptTooLong: options.promptTooLong === true,
      currentRequest: { role: "user", content: run.reasoning_loop?.effective_goal || run.user_message },
      fixedContext: messages.filter(message => message.role === "system"),
      modelVisiblePayload: triggerPayload,
      postCompactPayloadBuilder: async ({ summary, preservedMessages, boundaryMarker, recoveryContext, hookResults }: any) => {
        const continuation = {
          schema: "ccm-global-session-continuation-v2",
          sessionId,
          summary,
          messages: preservedMessages.map((message: any) => ({
            id: String(message.id || ""),
            role: message.role === "assistant" ? "assistant" : "user",
            content: String(message.content || ""),
            timestamp: String(message.timestamp || ""),
          })),
          boundary: boundaryMarker,
          recoveryContext,
          hookResults,
        };
        const rebuiltMessages = await buildGlobalAgentModelMessages(run, runtime, { sessionContinuationOverride: continuation });
        return {
          messages: rebuiltMessages,
          modelVisiblePayload: buildGlobalProviderPayloadSnapshot(rebuiltMessages, sessionId),
        };
      },
    });
    if (compaction?.reason === "circuit_breaker") {
      throw new Error("当前全局会话记忆压缩已熔断，本轮未调用模型；请在记忆中心检查该精确会话");
    }
    if (compaction?.compacted !== true) {
      throw new Error(`全局 Agent 上下文已达到模型门禁，但无法形成可提交的正式压缩：${compaction?.reason || "unknown"}`);
    }

    const rebuiltMessages = Array.isArray(compaction.preparedModelMessages)
      ? compaction.preparedModelMessages
      : await buildGlobalAgentModelMessages(run, runtime);
    const rebuiltPayload = buildGlobalProviderPayloadSnapshot(rebuiltMessages, sessionId);
    const postCompactGate = buildSessionPostCompactGate({ modelVisiblePayload: rebuiltPayload, threshold });
    if (postCompactGate.providerCallAllowed !== true || rebuiltPayload.totalTokens >= modelCapacity.contextWindow) {
      throw new Error(`全局 Agent 正式压缩后的真实 Provider Payload 仍超限：${rebuiltPayload.totalTokens}/${threshold}`);
    }
    return rebuiltMessages;
  }
  
  function localActionToAgenticDecision(localIntent: LocalIntentResult | null, run: GlobalAgentRun): GlobalAgentDecision | null {
    if (run.steps.length > 0) {
      const last = run.steps[run.steps.length - 1];
      const observationText = summarizeGlobalToolObservationForUser(last.observation, localIntent?.reply || "操作已返回结果。");
      return {
        state: "complete",
        message: last.error ? `操作未完成：${last.error}` : `${localIntent?.reply || "操作已返回结果。"}\n\n${observationText}`,
        tool: null,
        completion: { evidence: last.error ? [] : [`工具 ${last.tool?.name || "unknown"} 已返回执行结果`], risks: last.error ? [last.error] : [] },
      };
    }
    if (!localIntent?.action?.type) {
      if (localIntent?.intent?.category === "conversation") {
        return { state: "answer", message: localIntent.reply, tool: null, intent: localIntent.intent };
      }
      return {
        state: "answer",
        message: "当前统一大模型不可用。我不会依据关键词擅自操作项目；请先检查统一大模型配置后再试。",
        tool: null,
        intent: {
          category: "question",
          goal: run.user_message,
          action_required: false,
          confidence: 0.2,
          authorization_basis: "none",
          reason: "模型不可用，未执行任何操作",
        },
      };
    }
    const action = localIntent.action;
    const toolName = action.type === "system_status" ? "inspect_system" : action.type;
    if (!GLOBAL_AGENT_TOOL_SPECS.some(spec => spec.name === toolName)) {
      return { state: "answer", message: `${localIntent.reply}\n\n当前动作还没有接入 Agentic Loop 后端工具，未执行。`, tool: null };
    }
    const spec = GLOBAL_AGENT_TOOL_SPECS.find(item => item.name === toolName)!;
    const fallbackRisk = typeof spec.risk === "function" ? spec.risk(action.params || {}) : spec.risk;
    const deterministicUiTools = new Set(["play_music", "stop_music", "toggle_pet", "navigate"]);
    if (fallbackRisk !== "read" && !deterministicUiTools.has(toolName)) {
      return {
        state: "answer",
        message: "当前统一大模型不可用。规则兜底只允许只读查询和界面动作，不会依据关键词执行任何数据写入、任务派发或项目修改。请恢复统一大模型配置后再执行该操作。",
        tool: null,
        intent: { category: "ambiguous", goal: run.user_message, action_required: false, confidence: 0.2, authorization_basis: "none", reason: "模型不可用，禁止关键词规则代替语义决策执行写操作" },
      };
    }
    return { state: "execute", message: localIntent.reply, tool: { name: toolName, arguments: action.params || {} } };
  }
  
  function createMissionSupervisorRuntime(ctx: CollabCtx): GlobalMissionSupervisorRuntime {
    return {
      inspectMission: (missionId) => getGlobalDevelopmentMission(missionId),
      advanceMission: (missionId, options) => superviseGlobalDevelopmentMissionCycle(missionId, ctx, options),
      controlMission: (missionId, operation, payload) => controlGlobalDevelopmentMission(missionId, operation, ctx, payload),
      onCompleted: async (record, report) => {
        const formatted = formatGlobalMissionFinalReport(report);
        recordGlobalMissionMemory({ missionId: record.mission_id, sessionId: record.session_id, traceId: record.trace_id, source: record.source, status: "completed", report });
        if (record.global_run_id) completeGlobalAgentSupervision(record.global_run_id, { ...report, formatted }, "completed");
        if (/feishu/i.test(record.source)) {
          bindFeishuIdentifiersFromValue(record.session_id, report);
          bindFeishuTaskContext({ sessionId: record.session_id, runIds: [record.global_run_id], missionIds: [record.mission_id], source: record.source });
          const delivered = await notifyFeishuTaskStage({ stage: "completion", title: "任务已经完成", markdown: formatted, sessionId: record.session_id, runId: record.global_run_id, missionId: record.mission_id, dedupeKey: `mission:${record.mission_id}:completed` });
          if (delivered.reason === "no_binding") await sendFeishuReportMessage({ title: "全局 Agent 最终交付报告", markdown: formatted });
        }
      },
      onProgress: async (record, event) => {
        if (event?.type === "waiting_user") recordGlobalMissionMemory({ missionId: record.mission_id, sessionId: record.session_id, traceId: record.trace_id, source: record.source, status: "waiting_user", report: { summary: `全局任务等待人工处理`, remaining_items: (event.items || []).map((item: any) => item.reason || item.task_id) } });
        if (record.global_run_id && event?.type === "waiting_user") updateGlobalAgentSupervisionState(record.global_run_id, "waiting_user");
        if (!/feishu/i.test(record.source)) return;
        const taskIds = [
          ...(event.items || []).map((item: any) => item.task_id || item.taskId),
          ...(event.actions || []).map((item: any) => item.task_id || item.taskId),
        ].filter(Boolean);
        bindFeishuTaskContext({ sessionId: record.session_id, runIds: [record.global_run_id], missionIds: [record.mission_id], taskIds, source: record.source });
        if (event?.type === "waiting_user") {
          const lines = (event.items || []).map((item: any) => `- ${item.reason || "需要你补充信息"}`);
          const markdown = `任务暂时需要你的帮助：\n${lines.join("\n")}`;
          const delivered = await notifyFeishuTaskStage({ stage: "waiting_user", title: "任务需要你补充信息", markdown, sessionId: record.session_id, missionId: record.mission_id, dedupeKey: `mission:${record.mission_id}:waiting-user:${record.cycle_count}` });
          if (delivered.reason === "no_binding") await sendFeishuReportMessage({ title: "全局 Agent 等待人工处理", markdown });
          return;
        }
        if (event?.type === "actions" && event.actions?.length) {
          const actionLabels: Record<string, string> = {
            gate_gap_rework: "验收发现缺口，已安排定向返工",
            failure_rework: "执行遇到问题，已安排返工",
            runtime_recovery: "执行通道异常，正在恢复原任务",
            stalled_recovery: "任务停滞，已从原进度继续恢复",
            merge_conflict_rework: "代码合并出现冲突，已安排定向处理",
            merge_failed: "代码合并未通过，正在处理",
            worktree_merged: "项目代码已经合并，正在继续验收",
            dependency_released: "前置任务已完成，后续工作开始执行",
            queue_recovered: "任务已重新进入执行队列",
          };
          const lines = event.actions.map((item: any) => `- ${actionLabels[item.type] || "任务进度已经更新"}`);
          await notifyFeishuTaskStage({ stage: "rework", title: "任务进度更新", markdown: [...new Set(lines)].join("\n"), sessionId: record.session_id, missionId: record.mission_id, dedupeKey: `mission:${record.mission_id}:actions:${record.cycle_count}` });
        }
      },
      onTerminal: async (record, outcome, report) => {
        recordGlobalMissionMemory({ missionId: record.mission_id, sessionId: record.session_id, traceId: record.trace_id, source: record.source, status: outcome, report });
        if (record.global_run_id) completeGlobalAgentSupervision(record.global_run_id, report, outcome);
        if (/feishu/i.test(record.source)) {
          bindFeishuTaskContext({ sessionId: record.session_id, runIds: [record.global_run_id], missionIds: [record.mission_id], source: record.source });
          const title = outcome === "cancelled" ? "任务已取消" : "任务执行遇到问题";
          const markdown = report?.summary || "任务未完成，我已经保留执行记录供排查。";
          const delivered = await notifyFeishuTaskStage({ stage: outcome, title, markdown, sessionId: record.session_id, missionId: record.mission_id, dedupeKey: `mission:${record.mission_id}:terminal:${outcome}` });
          if (delivered.reason === "no_binding") await sendFeishuReportMessage({ title, markdown });
        }
      },
    };
  }
  
  function attachGlobalRunTestAgentExecutionPlan(run: GlobalAgentRun, event: any = {}) {
    if (String(event?.type || "") !== "test_agent_execution_plan_ready") return;
    const plan = event.test_agent_execution_plan || event.testAgentExecutionPlan || event.technical?.test_agent_execution_plan || null;
    if (!plan) return;
    (run as any).test_agent_execution_plan = plan;
    (run as any).testAgentExecutionPlan = plan;
    (run as any).test_agent_execution_plan_summary = event.test_agent_execution_plan_summary || event.testAgentExecutionPlanSummary || event.detail || "";
    (run as any).testAgentExecutionPlanSummary = event.testAgentExecutionPlanSummary || event.test_agent_execution_plan_summary || event.detail || "";
    (run as any).test_agent_execution_plan_detail = event.detail || "";
    (run as any).testAgentExecutionPlanDetail = event.detail || "";
  }
  
  function attachGlobalRunTestAgentReview(run: GlobalAgentRun, event: any = {}) {
    if (String(event?.type || "") !== "test_agent_review_ready") return;
    const summary = event.test_agent_review_summary || event.testAgentReviewSummary || event.independent_review_summary || event.independentReviewSummary || null;
    if (!summary) return;
    const rows = Array.isArray(event.independent_review) ? event.independent_review : Array.isArray(event.independentReview) ? event.independentReview : [];
    (run as any).test_agent_review_summary = summary;
    (run as any).testAgentReviewSummary = summary;
    (run as any).independent_review_summary = summary;
    (run as any).independentReviewSummary = summary;
    (run as any).independent_review = rows;
    (run as any).independentReview = rows;
    (run as any).test_agent_report = event.test_agent_report || event.testAgentReport || event.technical?.test_agent_report || null;
    (run as any).testAgentReport = event.testAgentReport || event.test_agent_report || event.technical?.test_agent_report || null;
    (run as any).post_review_spot_check_summary = event.post_review_spot_check_summary || event.postReviewSpotCheckSummary || null;
    (run as any).postReviewSpotCheckSummary = event.postReviewSpotCheckSummary || event.post_review_spot_check_summary || null;
    (run as any).post_review_spot_check = event.technical?.post_review_spot_check || event.post_review_spot_check || event.postReviewSpotCheck || null;
    (run as any).postReviewSpotCheck = event.postReviewSpotCheck || event.post_review_spot_check || event.technical?.post_review_spot_check || null;
  }
  
  async function executeAgenticTool(baseUrl: string, ctx: CollabCtx, name: string, args: any, run: GlobalAgentRun, onEvent?: (event: any) => void) {
    const signature = crypto.createHash("sha256").update(`${name}:${JSON.stringify(args || {})}`).digest("hex").slice(0, 24);
    const operationKey = `${run.id}:${signature}`;
    const operation = acquireIdempotency({
      scope: "global-agent-tool",
      key: operationKey,
      traceId: run.trace_id,
      leaseMs: 12 * 60 * 1000,
      metadata: { run_id: run.id, tool: name },
    });
    if (!operation.acquired) {
      const settled = operation.inProgress ? await waitForIdempotencyResult("global-agent-tool", operationKey, 12 * 60 * 1000) : operation.record;
      if (settled?.status === "completed") return { ...(settled.result?.observation || settled.result || {}), replayed: true };
      if (settled?.status === "failed") throw new Error(settled.error || `工具 ${name} 的历史执行失败`);
      throw new Error(`工具 ${name} 仍在另一个执行实例中运行`);
    }
  
    try {
      let observation: any;
      if (name === "inspect_system") {
        observation = { success: true, ...buildAgenticContext(), missions: refreshGlobalDevelopmentMissions().slice(-8) };
      } else if (name === "list_projects") {
        observation = { success: true, projects: safeProjectRows() };
      } else if (name === "inspect_project") {
        const project = String(args.project || "");
        const config = getConfigs().find((item: any) => item.name === project);
        if (!config) throw new Error(`项目不存在：${project}`);
        const info = getConfigInfo(config.path)?.[0] || {};
        observation = {
          success: true,
          project,
          config: { work_dir: info.workDir || "", agent: info.agent || "claudecode", platform: info.platform || "" },
          memory_boundary: { project_memory_included: false, policy: "routing_metadata_only_delegate_to_group_main_agent" },
        };
      } else if (name === "list_groups") {
        observation = { success: true, groups: buildAgenticContext().groups };
      } else if (name === "list_tasks") {
        const tasks = loadTasks().filter(isGlobalAgentOwnedTask).filter((task: any) => !args.id || task.id === args.id).filter((task: any) => !args.status || task.status === args.status);
        observation = {
          success: true,
          tasks: tasks.slice(-50).map(compactTask),
          task_boundary: { schema: "ccm-global-agent-task-boundary-v1", policy: "global_agent_owned_tasks_only" },
        };
      } else if (name === "list_cron") {
        observation = { success: true, jobs: buildAgenticContext().cron_jobs };
      } else if (name === "query_knowledge") {
        observation = { success: true, query: args.query, content: queryKnowledgeBase(String(args.query || "")) || "未检索到相关知识" };
      } else if (name === "query_global_memory") {
        observation = { success: true, query: args.query, ...recallGlobalAgentMemory(String(args.query || ""), { sessionId: run.session_id, limit: Number(args.limit || 8) }) };
      } else if (name === "manage_global_memory") {
        const operation = String(args.operation || "").toLowerCase();
        if (operation !== "status" && !String(args.reason || "").trim()) throw new Error("全局记忆变更操作必须说明原因");
        if (operation === "compact") {
          observation = { success: true, operation, sessions: await Promise.all(loadGlobalAgentMemory().sessions.map((session: any) => compactGlobalAgentSessionWithModel(session.sessionId, { force: true, reason: args.reason }))) };
        } else if (operation === "rebuild") {
          const memory = rebuildGlobalAgentMemory(args.reason, "global-agent");
          const sessions = await Promise.all((memory.sessions || []).map((session: any) => compactGlobalAgentSessionWithModel(session.sessionId, { force: true, reason: args.reason || "rebuild" })));
          observation = { success: true, operation, memory: loadGlobalAgentMemory(), sessions };
        } else if (["enable", "disable"].includes(operation)) {
          observation = { success: true, operation, policy: setGlobalAgentMemoryPolicy({ disabled: operation === "disable", reason: args.reason, actor: "global-agent" }) };
        } else if (operation === "status") {
          observation = { success: true, operation, policy: getGlobalAgentMemoryPolicy(), memory: loadGlobalAgentMemory() };
        } else throw new Error(`不支持的全局记忆操作：${operation}`);
      } else if (name === "decompose_requirement_epic") {
        let plan = args.decomposition_plan
          || args.decompositionPlan
          || (run as any).requirement_decomposition
          || (run as any).requirementDecomposition;
        if (!plan?.items?.length) {
          const availableTargets = [
            ...loadGroups().map((group: any) => ({
              type: "group",
              id: group.id,
              name: group.name || group.id,
              capabilities: (group.members || []).flatMap((member: any) => member.skills || member.capabilities || []),
            })),
            ...getConfigs().map((config: any) => ({ type: "project", id: config.name, name: config.name })),
          ];
          const requirement = args.requirement_extraction
            || args.requirementExtraction
            || (run as any).requirement_extraction
            || (run as any).requirementExtraction;
          if (requirement) {
            plan = await decomposeRequirementToTaskPlan({
              requirement,
              sources: (run as any).requirement_sources || (run as any).requirementSources || [],
              contentHash: (run as any).requirement_content_hash || (run as any).requirementContentHash || "",
              availableTargets,
            });
          } else {
            const sourceAttachments = Array.isArray((run as any).source_attachments) ? (run as any).source_attachments : [];
            const ingestion = await ingestRequirementSources({
              files: sourceAttachments
                .filter((item: any) => item?.path)
                .map((item: any) => ({
                  filename: item.name || item.filename || "requirement-source",
                  savedPath: item.path,
                  size: Number(item.size || 0),
                  type: item.type || "",
                })),
              userText: run.original_user_message || run.user_message || "",
              extractRequirement: true,
              decomposeRequirement: true,
              availableTargets,
            });
            attachGlobalRunRequirementSources(run, ingestion);
            plan = ingestion.decomposition;
          }
          if (!plan?.items?.length) throw new Error("大模型未能从当前消息或资料生成可靠的 Epic 任务图，请补充业务目标、范围或验收标准");
          (run as any).requirement_decomposition = plan;
          (run as any).requirementDecomposition = plan;
        }
        observation = {
          success: true,
          read_only: true,
          needs_confirmation: true,
          needs_clarification: Array.isArray(plan.clarification_questions) && plan.clarification_questions.length > 0,
          clarification_questions: plan.clarification_questions || [],
          decomposition_plan: plan,
          summary: `已将需求文档拆成 ${plan.items.length} 个持久子任务；确认任务图后才会创建和派发。`,
        };
      } else if (name === "create_requirement_epic") {
        const plan = args.decomposition_plan
          || args.decompositionPlan
          || (run as any).requirement_decomposition
          || (run as any).requirementDecomposition;
        if (!plan?.items?.length) throw new Error("缺少已确认的需求拆解计划");
        const clarificationQuestions = Array.isArray(plan.clarification_questions) ? plan.clarification_questions.filter(Boolean) : [];
        const clarificationsResolved = args.clarifications_resolved === true
          || args.clarificationsResolved === true
          || clarificationQuestions.length === 0;
        if (clarificationQuestions.length && !clarificationsResolved) {
          observation = {
            success: false,
            accepted: false,
            completed: false,
            needs_clarification: true,
            clarification_questions: clarificationQuestions,
            decomposition_plan: plan,
            message: "需求拆解仍有阻断问题；请先逐项回答 clarification_questions，并在更新后的计划中清空这些问题后再创建 Epic。",
          };
        } else {
        const epicResult = createRequirementEpicWithChildren({
          ...args,
          decomposition_plan: plan,
          requirement_extraction: args.requirement_extraction || args.requirementExtraction || (run as any).requirement_extraction || null,
          requirement_content_hash: args.requirement_content_hash || args.requirementContentHash || (run as any).requirement_content_hash || plan.content_hash || "",
          source_documents: args.source_documents || args.sourceDocuments || run.user_message || "",
          source_attachments: args.source_attachments || args.sourceAttachments || (run as any).source_attachments || [],
          source_ingestion: args.source_ingestion || args.sourceIngestion || (run as any).source_ingestion || null,
          group_id: args.group_id || args.groupId || "",
          target_project: args.target_project || args.targetProject || "",
          source: run.source || "global-agent-requirement-epic",
          channel: run.source || "global-agent",
          conversation_id: run.session_id,
          client_message_id: args.client_message_id || args.clientMessageId || run.id,
          trace_id: run.trace_id,
          idempotency_key: args.idempotency_key || `${run.id}:requirement-epic:${plan.content_hash || "v1"}`,
          owner_agent: "global-agent",
          confirmed: args.confirmed === true || args.user_confirmed === true || args.userConfirmed === true,
          clarifications_resolved: clarificationsResolved,
          auto_execute: args.auto_execute !== false,
          requires_independent_review: args.requires_independent_review !== false,
        });
        if (!epicResult.success) {
          observation = {
            ...epicResult,
            success: false,
            accepted: false,
            completed: false,
            message: epicResult.needs_clarification
              ? "需求拆解仍有阻断问题；请先回答 clarification_questions，再重新确认任务图。"
              : "需求拆解计划仍需用户确认后才能创建。",
          };
        } else {
          const supervisor = startGlobalMissionSupervisor({
          mission_id: epicResult.epic.id,
          global_run_id: run.id,
          trace_id: run.trace_id,
          session_id: run.session_id,
          source: run.source,
          business_goal: epicResult.epic.business_goal,
          acceptance: epicResult.epic.acceptance_criteria,
          max_attempts: args.max_attempts || 3,
        });
          attachGlobalAgentRunSupervision(run, { mission_id: epicResult.epic.id, supervisor_id: supervisor.id, state: supervisor.status });
          const dispatch = await superviseGlobalDevelopmentMissionCycle(epicResult.epic.id, ctx, { max_attempts: args.max_attempts || 3 });
          observation = {
            success: true,
            accepted: true,
            completed: false,
            message: `需求 Epic 已创建，${epicResult.children.length} 个子任务将按依赖执行；当前不是完成状态。`,
            mission_id: epicResult.epic.id,
            epic: epicResult.epic,
            children: epicResult.children.map((task: any) => ({
              task_id: task.id,
              item_key: task.requirement_item_key,
              title: task.title,
              target: task.mission_target?.name || task.target_project,
              dependencies: task.mission_dependencies || [],
              status: task.status,
            })),
            dependency_edges: epicResult.dependency_edges,
            supervisor_id: supervisor.id,
            supervisor_status: supervisor.status,
            dispatch_actions: dispatch?.actions || [],
          };
        }
        }
      } else if (name === "inspect_mission") {
        const mission = getGlobalDevelopmentMission(String(args.id || ""));
        if (!mission) throw new Error("全局开发任务不存在");
        observation = { success: true, ...mission, supervisor: getGlobalMissionSupervisor(String(args.id || "")) };
      } else if (name === "inspect_supervision") {
        const supervisor = getGlobalMissionSupervisor(String(args.id || ""));
        if (!supervisor) throw new Error("全局任务监工不存在");
        observation = { success: true, supervisor, mission: getGlobalDevelopmentMission(supervisor.mission_id) };
      } else if (name === "orchestrate_development" || name === "send_project_cmd" || name === "create_task") {
        const missionArgs = name === "send_project_cmd"
          ? buildGlobalSingleProjectMissionPayload({
              project: String(args.project || args.projectName || ""),
              message: String(args.message || args.prompt || args.command || run.user_message || ""),
              originalText: run.original_user_message || run.user_message,
              traceId: run.trace_id,
              globalRunId: run.id,
              sessionId: run.session_id,
              source: run.source || "global-agent-single-project-dispatch",
              idempotencyKey: args.idempotency_key || `${run.id}:single-project-mission`,
            })
          : name === "create_task"
            ? {
                title: args.title || "全局 Agent 下发的协作任务",
                business_goal: args.business_goal || args.businessGoal || args.goal || args.message || run.original_user_message || run.user_message,
                source_documents: args.source_documents || args.sourceDocuments || run.user_message || "",
                source_attachments: args.source_attachments || args.sourceAttachments || (run as any).source_attachments || [],
                requirement_extraction: args.requirement_extraction || args.requirementExtraction || (run as any).requirement_extraction || null,
                source_ingestion: args.source_ingestion || args.sourceIngestion || (run as any).source_ingestion || null,
                acceptance: args.acceptance || args.acceptance_criteria || [
                  "群聊主 Agent 必须创建计划并派发项目子 Agent。",
                  "群聊主 Agent 必须验收项目子 Agent 的实际变更和验证证据。",
                  "涉及独立复核时由群聊主 Agent 调用 TestAgent，并负责返工、复验和最终总结。",
                ].join("；"),
                targets: [{
                  type: "group",
                  group_id: args.group_id || args.groupId || "",
                  task: args.business_goal || args.businessGoal || args.goal || args.message || run.original_user_message || run.user_message,
                  reason: "全局 Agent 将复杂任务交给群聊主 Agent 计划、派发、验收和总结。",
                  requires_code_changes: args.requires_code_changes !== false,
                  requires_verification: args.requires_verification !== false,
                  requires_independent_review: args.requires_independent_review !== false,
                }],
                requires_code_changes: args.requires_code_changes !== false,
                requires_verification: args.requires_verification !== false,
                requires_independent_review: args.requires_independent_review !== false,
                auto_execute: args.auto_execute !== false,
                source: run.source || "global-agent-create-task",
                trace_id: run.trace_id,
                idempotency_key: args.idempotency_key || `${run.id}:group-mission`,
              }
            : {
              ...args,
              source_documents: args.source_documents || args.sourceDocuments || run.user_message || "",
              source_attachments: args.source_attachments || args.sourceAttachments || (run as any).source_attachments || [],
              requirement_extraction: args.requirement_extraction || args.requirementExtraction || (run as any).requirement_extraction || null,
              source_ingestion: args.source_ingestion || args.sourceIngestion || (run as any).source_ingestion || null,
              source: run.source || "global-agent",
              trace_id: run.trace_id,
              idempotency_key: args.idempotency_key || `${run.id}:mission`,
            };
        const missionResult = createGlobalDevelopmentMission({
          ...missionArgs,
          source_documents: missionArgs.source_documents || missionArgs.sourceDocuments || run.user_message || "",
          source_attachments: missionArgs.source_attachments || missionArgs.sourceAttachments || (run as any).source_attachments || [],
          requirement_extraction: missionArgs.requirement_extraction || missionArgs.requirementExtraction || (run as any).requirement_extraction || null,
          source_ingestion: missionArgs.source_ingestion || missionArgs.sourceIngestion || (run as any).source_ingestion || null,
        }, ctx);
        const supervisor = startGlobalMissionSupervisor({
          mission_id: missionResult.mission.id,
          global_run_id: run.id,
          trace_id: run.trace_id,
          session_id: run.session_id,
          source: run.source,
          business_goal: missionResult.mission.business_goal || missionArgs.business_goal,
          acceptance: missionResult.mission.acceptance_criteria || missionArgs.acceptance,
          max_attempts: missionArgs.max_attempts || 3,
        });
        attachGlobalAgentRunSupervision(run, { mission_id: missionResult.mission.id, supervisor_id: supervisor.id, state: supervisor.status });
        observation = {
          success: true,
          accepted: true,
          completed: false,
          message: "全局任务已派发并进入持久监督；当前不是完成状态。",
          mission_id: missionResult.mission.id,
          supervisor_id: supervisor.id,
          supervisor_status: supervisor.status,
          children: missionResult.children.map((item: any) => ({ task_id: item.task?.id, target: item.target?.name, queued: item.queue_result?.queued, status: item.task?.status })),
          rejected: missionResult.rejected,
        };
      } else if (name === "manage_supervision") {
        const supervisor = await controlGlobalMissionSupervisor(String(args.id || ""), String(args.operation || ""), createMissionSupervisorRuntime(ctx), args);
        if (supervisor.global_run_id) {
          if (supervisor.status === "cancelled") completeGlobalAgentSupervision(supervisor.global_run_id, { summary: "全局任务已由用户取消。" }, "cancelled");
          else updateGlobalAgentSupervisionState(supervisor.global_run_id, supervisor.status);
        }
        observation = { success: true, supervisor, mission: getGlobalDevelopmentMission(supervisor.mission_id) };
      } else if (name === "navigate") {
        observation = { success: true, message: `Web 客户端可切换到 ${args.tab}`, client_effect: { type: "navigate", params: { tab: args.tab } } };
      } else if (name === "play_music") {
        const played = await executePlayMusic(baseUrl, {
          keyword: args.keyword || args.query || args.song || "",
          mode: args.mode || "",
          source: run.source || "global-agent",
          originalText: run.user_message,
        });
        observation = {
          success: played.success !== false,
          message: played.message,
          keyword: played.keyword,
          mode: played.mode,
          command: played.command,
          client_effect: played.client_effect,
        };
      } else if (name === "stop_music") {
        const stopped = await executeStopMusic(baseUrl, {
          source: run.source || "global-agent",
        });
        observation = {
          success: stopped.success !== false,
          message: stopped.message,
          command: stopped.command,
          client_effect: stopped.client_effect,
        };
      } else if (name === "git_review") {
        observation = await postLocalApi(baseUrl, "/api/global-agent/git-review", { project: args.project });
      } else if (name === "git_commit") {
        observation = await postLocalApi(baseUrl, "/api/git/commit", { project: args.project, message: args.message || "chore: 由全局 Agent 提交变更", files: args.files || [] });
      } else if (name === "create_template") {
        observation = await postLocalApi(baseUrl, "/api/templates", { name: args.name, category: args.category || "custom", prompt: args.content || args.prompt || "" });
      } else {
        let action: any = { type: name, params: { ...(args || {}) } };
        if (GLOBAL_MANAGEMENT_ACTIONS[name]) {
          action = annotateGlobalAction(action);
          if (action.validated === false) throw new Error(`缺少参数：${(action.missing_params || []).join("、")}`);
          action.confirmed = true;
        }
        const summary = await executeFeishuAction(baseUrl, action, run.user_message, run.trace_id, {
          globalRunId: run.id,
          sessionId: run.session_id,
          source: run.source,
          onEvent: (event: any) => {
            attachGlobalRunTestAgentExecutionPlan(run, event);
            attachGlobalRunTestAgentReview(run, event);
            onEvent?.(event);
          },
        });
        observation = { success: true, summary };
      }
      completeIdempotency("global-agent-tool", operationKey, { observation });
      return observation;
    } catch (error: any) {
      failIdempotency("global-agent-tool", operationKey, error);
      throw error;
    }
  }
  
  function attachGlobalRunRequirementSources(run: GlobalAgentRun, ingestion?: RequirementIngestionResult | null) {
    if (!ingestion) return;
    (run as any).source_ingestion = ingestion.technical;
    (run as any).sourceIngestion = ingestion.technical;
    (run as any).source_attachments = ingestion.attachments;
    (run as any).sourceAttachments = ingestion.attachments;
    (run as any).requirement_extraction = ingestion.requirement;
    (run as any).requirementExtraction = ingestion.requirement;
    (run as any).requirement_decomposition = ingestion.decomposition;
    (run as any).requirementDecomposition = ingestion.decomposition;
    (run as any).requirement_content_hash = ingestion.content_hash;
    (run as any).requirementContentHash = ingestion.content_hash;
    (run as any).requirement_source_documents = ingestion.source_documents || "";
    (run as any).requirementSourceDocuments = ingestion.source_documents || "";
    (run as any).requirement_sources = ingestion.sources || [];
    (run as any).requirementSources = ingestion.sources || [];
  }
  
  function createAgenticRuntime(baseUrl: string, ctx: CollabCtx, input: { localIntent?: LocalIntentResult | null; onEvent?: (event: any) => void; sourceIngestion?: RequirementIngestionResult | null } = {}): GlobalAgentLoopRuntime {
    const config = loadOrchestratorConfig();
    const runtime: GlobalAgentLoopRuntime = {
      callModel: async (messages, run) => {
        attachGlobalRunRequirementSources(run, input.sourceIngestion);
        if (!config.apiKey || !config.apiUrl || !config.model) throw new Error("统一大模型尚未配置");
        const { accumulateGlobalAgentRunUsage } = require("../../agents/global/global-agent-metrics");
        const invoke = (providerMessages: Array<{ role: string; content: string }>) => callGlobalModelWithRetry(config, providerMessages, {
          onUsage: (usage: any) => {
            (run as any).latest_context_usage = usage;
            accumulateGlobalAgentRunUsage(run, usage);
          },
        });
        try {
          return await invoke(messages);
        } catch (error: any) {
          if (!isGlobalPromptTooLongError(error)) throw error;
          const recoveredMessages = await prepareGlobalProviderMessages(messages, run, runtime, { promptTooLong: true });
          return invoke(recoveredMessages);
        }
      },
      prepareModelMessages: (messages, run) => prepareGlobalProviderMessages(messages, run, runtime),
      getContext: (run) => buildAgenticContext(run.user_message, run.session_id),
      verifyContextBoundary: context => verifyGlobalAgentContextBoundary(context),
      executeTool: (name, args, run) => {
        attachGlobalRunRequirementSources(run, input.sourceIngestion);
        return executeAgenticTool(baseUrl, ctx, name, args, run, input.onEvent);
      },
      fallbackDecision: (run, error) => {
        const detail = compactPetText(error?.message || error || "统一大模型调用失败", 800);
        console.warn(`[全局 Agent] 模型决策失败，已进入安全兜底：${detail}`);
        recordGlobalAgentRuntimeOutput(run, { type: "model_fallback", status: "warning", error: detail });
        // 模型不可用时只总结已有观察；不得让本地关键词规则替模型选择新工作流。
        return localActionToAgenticDecision(null, run);
      },
      onEvent: input.onEvent ? (event) => input.onEvent!(event) : undefined,
    };
    return runtime;
  }
  
  async function runAgenticGlobalRequest(baseUrl: string, ctx: CollabCtx, input: {
    message: string;
    history?: any[];
    sessionId?: string;
    source?: string;
    traceId?: string;
    clarificationRunId?: string;
    onEvent?: (event: any) => void;
    sourceIngestion?: RequirementIngestionResult | null;
  }) {
    const runtime = createAgenticRuntime(baseUrl, ctx, { localIntent: null, onEvent: input.onEvent, sourceIngestion: input.sourceIngestion });
    const sessionId = input.sessionId || "default";
    if (!/feishu/i.test(input.source || "")) {
      ingestGlobalAgentConversation({ sessionId, source: input.source || "web", messages: [...(input.history || []), { role: "user", content: input.message, timestamp: new Date().toISOString(), trace_id: input.traceId }], compact: false });
    }
    const compactionFixedContext = buildAgenticContext(input.message, sessionId, {
      includeSessionContinuity: false,
      recordMemoryMetric: false,
    });
    const compaction = await compactGlobalAgentSessionWithModel(sessionId, {
      reason: "auto_model",
      currentRequest: { role: "user", content: input.message },
      fixedContext: compactionFixedContext,
      tools: GLOBAL_AGENT_TOOL_SPECS,
    });
    if (compaction?.reason === "circuit_breaker") {
      throw new Error("当前全局会话记忆压缩已熔断，本轮未调用模型；请在记忆中心检查该精确会话");
    }
    const startsNewTopic = /^(?:新问题|换个问题|另外(?:一个)?问题|忽略刚才|取消刚才|重新开始)/.test(String(input.message || "").trim());
    const requestedClarificationRunId = String(input.clarificationRunId || "").trim();
    let waitingClarification: any = null;
    if (!startsNewTopic && requestedClarificationRunId) {
      const requestedRun = getGlobalAgentRun(requestedClarificationRunId);
      if (!requestedRun || requestedRun.session_id !== sessionId) throw new Error("当前会话中没有这个待补充请求");
      if (requestedRun.status !== "waiting_clarification") throw new Error("这个请求已不再等待补充，请刷新后查看最新状态");
      waitingClarification = requestedRun;
    } else if (!startsNewTopic) {
      waitingClarification = findClarifyingGlobalAgentRun(sessionId);
    }
    const run = waitingClarification
      ? await continueGlobalAgentRunWithClarification(waitingClarification.id, input.message, runtime, {
          explicitWriteAuthorization: hasExplicitGlobalWriteAuthorization(input.message),
        })
      : await startGlobalAgentRun({
          message: input.message,
          history: input.history || [],
          sessionId,
          source: input.source || "web",
          traceId: input.traceId,
          explicitWriteAuthorization: hasExplicitGlobalWriteAuthorization(input.message),
          maxSteps: 10,
          timeoutMs: 12 * 60 * 1000,
        }, runtime);
    attachGlobalRunRequirementSources(run, input.sourceIngestion);
    if (!/feishu/i.test(input.source || "")) {
      try {
        const assistantMessageId = `gam_${String(run.id || "result")}_assistant`;
        ingestGlobalAgentConversation({
          sessionId,
          source: input.source || "web",
          messages: [{
            id: assistantMessageId,
            role: "assistant",
            content: globalRunVisibleReply(run, "我已整理处理结果，技术细节已放入技术详情。"),
            technical_content: run.final_report?.technical_content || run.final_delivery_report?.technical_content || "",
            timestamp: new Date().toISOString(),
            trace_id: run.trace_id,
            mission_id: run.mission_id,
          }],
        });
        recordGlobalAgentSessionProviderUsage(sessionId, {
          usage: (run as any).latest_context_usage || null,
          provider: String((run as any).latest_context_usage?.provider || ""),
          model: String((run as any).latest_context_usage?.model || loadOrchestratorConfig()?.model || ""),
          anchorMessageId: assistantMessageId,
          currentRequest: { role: "user", content: input.message },
          fixedContext: compactionFixedContext,
          tools: GLOBAL_AGENT_TOOL_SPECS,
        });
      } catch (error: any) {
        console.warn(`[全局记忆] Agentic 结果写入失败：${error?.message || error}`);
      }
    }
    return run;
  }
  
  async function resumeGlobalAgentLoopsForServer(ctx: CollabCtx, port: number) {
    const result = await recoverInterruptedGlobalAgentRuns(createAgenticRuntime(`http://127.0.0.1:${port}`, ctx));
    for (const run of result.results || []) {
      if (!["completed", "failed", "cancelled"].includes(run.status)) continue;
      settleIdempotencyByTrace(
        run.trace_id,
        run.status === "completed" ? "completed" : "failed",
        { run_id: run.id, status: run.status, recovered: true },
        ["global-agent-request", "feishu-control-message", "feishu-event"],
      );
    }
    return result;
  }
  
  function startGlobalMissionSupervisionForServer(ctx: CollabCtx) {
    try {
      require("../collaboration/collaboration-task-runtime").bindTaskRuntimeCollabCtx(ctx);
    } catch { /* ignore bind failures during optional boot wiring */ }
    return startGlobalMissionSupervisorScheduler(createMissionSupervisorRuntime(ctx));
  }
  
  function bootstrapGlobalAgentMemoryForServer() {
    const store = loadGlobalAgentHistoryStore();
    const results: any[] = [];
    for (const session of store.sessions || []) {
      try {
        results.push(ingestGlobalAgentConversation({ sessionId: session.id, source: session.source || "history-migration", messages: session.messages || [] }));
      } catch (error: any) {
        results.push({ sessionId: session.id, error: error?.message || String(error) });
      }
    }
    return { total: (store.sessions || []).length, migrated: results.filter(item => !item.error).length, results };
  }
  
  function stopGlobalMissionSupervisionForServer() {
    stopGlobalMissionSupervisorScheduler();
  }

  return {
    hasExplicitGlobalWriteAuthorization, verifyGlobalAgentContextBoundary, buildGlobalAgentGroupMemoryModelContext, buildAgenticContext, localActionToAgenticDecision,
    createMissionSupervisorRuntime, createAgenticRuntime, runAgenticGlobalRequest, resumeGlobalAgentLoopsForServer,
    startGlobalMissionSupervisionForServer, bootstrapGlobalAgentMemoryForServer, stopGlobalMissionSupervisionForServer,
  }
}
