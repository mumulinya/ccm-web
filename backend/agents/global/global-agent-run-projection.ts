import { buildRoleSkillPrompt } from "../../skills/role-skills";
import { captureReasoningFacts, type AgentReasoningState } from "../reasoning-loop";
import { normalizeWorkflowDecision } from "../workflow-decision";
import type { GlobalAgentDecision, GlobalAgentDecisionState, GlobalAgentLoopRuntime, GlobalAgentRun } from "./loop";
import { WORKSPACE_READONLY_TOOL_DEFINITIONS_V3 } from "../../tools/workspace-readonly-tools";
import { attachTransientModelBlocks, collectTransientModelBlocks } from "../../system/transient-model-content";
import { tryBuildGlobalNativeModelMessages } from "./global-native-messages";
import { buildGlobalMainIdentityRules, buildGlobalMainSessionGuidance } from "../main-agent-identity";
import { renderSlashCommandSessionDirective } from "../../system/slash-command-session-state";
import { buildGlobalAgentToolRuntimeContext } from "../../modules/global/global-agent-tool-authorization";

export function compactObservation(value: any) {
  return value;
}

export const GLOBAL_MODEL_ROUTE_KEYS = new Set([
  "success", "accepted", "completed", "replayed", "operation", "id", "mission_id", "global_mission_id",
  "supervisor_id", "status", "state", "supervisor_status", "task_id", "group_id", "project", "target",
  "name", "queued", "enabled", "schedule", "target_type", "children", "rejected", "count", "total", "active",
  "updated_at", "created_at", "completed_at", "trace_id", "phase", "attempt", "attempts", "max_attempts",
]);

export const GLOBAL_MODEL_FORBIDDEN_FIELD = /(?:^|_)(?:group_session(?:_id)?|group_messages?|group_memory|project_memory|messages?|prompt|raw_payload|raw_receipt|worker_context_packet|task_agent_session|native_session)(?:$|_)/i;
export const GROUP_SESSION_ID_PATTERN = /\bgcs_[a-z0-9_-]+\b/ig;

export function redactGroupSessionIds(value: any) {
  return typeof value === "string" ? value.replace(GROUP_SESSION_ID_PATTERN, "[group-session-redacted]") : value;
}

export function redactGroupSessionFields(value: any): any {
  if (Array.isArray(value)) return value.slice(0, 100).map(redactGroupSessionFields);
  if (!value || typeof value !== "object") return redactGroupSessionIds(value);
  const projected: any = {};
  for (const [key, nested] of Object.entries(value)) {
    if (GLOBAL_MODEL_FORBIDDEN_FIELD.test(key)) continue;
    projected[key] = redactGroupSessionFields(nested);
  }
  return projected;
}

export function projectRoutingValue(value: any): any {
  if (Array.isArray(value)) return value.slice(0, 100).map(projectRoutingValue);
  if (!value || typeof value !== "object") return redactGroupSessionIds(value);
  const projected: any = {};
  for (const [key, nested] of Object.entries(value)) {
    if (GLOBAL_MODEL_FORBIDDEN_FIELD.test(key) || !GLOBAL_MODEL_ROUTE_KEYS.has(key)) continue;
    projected[key] = projectRoutingValue(nested);
  }
  return projected;
}

export function projectProjectRows(rows: any) {
  return (Array.isArray(rows) ? rows : []).slice(0, 100).map((row: any) => ({
    name: redactGroupSessionIds(String(row?.name || "")),
    work_dir: redactGroupSessionIds(String(row?.work_dir || row?.workDir || "")),
    agent: redactGroupSessionIds(String(row?.agent || "")),
    platform: redactGroupSessionIds(String(row?.platform || "")),
  }));
}

export function projectGroupRows(rows: any) {
  return (Array.isArray(rows) ? rows : []).slice(0, 100).map((row: any) => ({
    id: redactGroupSessionIds(String(row?.id || "")),
    name: redactGroupSessionIds(String(row?.name || "")),
    members: (Array.isArray(row?.members) ? row.members : []).slice(0, 100).map((member: any) => ({
      project: redactGroupSessionIds(String(member?.project || "")),
      agent: redactGroupSessionIds(String(member?.agent || "")),
    })),
  }));
}

export function projectGlobalTaskRows(observation: any) {
  if (observation?.task_boundary?.policy !== "global_agent_owned_tasks_only") return [];
  return (Array.isArray(observation?.tasks) ? observation.tasks : []).slice(0, 100).map((task: any) => ({
    id: redactGroupSessionIds(String(task?.id || "")),
    title: redactGroupSessionIds(String(task?.title || "")),
    status: String(task?.status || ""),
    status_detail: redactGroupSessionIds(String(task?.status_detail || "")),
    group_id: redactGroupSessionIds(String(task?.group_id || "")),
    target_project: redactGroupSessionIds(String(task?.target_project || "")),
    updated_at: String(task?.updated_at || ""),
    trace_id: redactGroupSessionIds(String(task?.trace_id || "")),
  }));
}

export function projectGlobalAgentObservationForModel(toolName: string, observation: any) {
  const name = String(toolName || "");
  if (!observation || typeof observation !== "object") return observation === undefined ? undefined : { available: true };
  if (WORKSPACE_READONLY_TOOL_DEFINITIONS_V3.some(tool => tool.name === name.replace(/^mcp__ccm__ccm_workspace_readonly__/, ""))) {
    return compactObservation(redactGroupSessionFields(observation));
  }
  if (name === "list_projects") return { success: observation.success !== false, projects: projectProjectRows(observation.projects) };
  if (name === "inspect_project") return {
    success: observation.success !== false,
    project: redactGroupSessionIds(String(observation.project || "")),
    config: observation.config ? {
      work_dir: redactGroupSessionIds(String(observation.config.work_dir || "")),
      agent: redactGroupSessionIds(String(observation.config.agent || "")),
      platform: redactGroupSessionIds(String(observation.config.platform || "")),
    } : undefined,
    memory_boundary: { project_memory_included: false, policy: "routing_metadata_only_delegate_to_group_main_agent" },
  };
  if (name === "list_groups") return { success: observation.success !== false, groups: projectGroupRows(observation.groups) };
  if (name === "list_tasks") return {
    success: observation.success !== false,
    tasks: projectGlobalTaskRows(observation),
    task_boundary: { policy: "global_agent_owned_tasks_only", historical_unproven_rows_dropped: observation?.task_boundary?.policy !== "global_agent_owned_tasks_only" },
  };
  if (name === "list_cron") return { success: observation.success !== false, jobs: projectRoutingValue(observation.jobs) };
  if (name === "inspect_system") return {
    success: observation.success !== false,
    projects: projectProjectRows(observation.projects),
    groups: projectGroupRows(observation.groups),
    missions: projectRoutingValue(observation.missions),
    memory_context_boundary: { group_session_context_included: false, group_memory_included: false, project_memory_included: false },
  };
  if (["query_global_memory", "manage_global_memory", "query_knowledge"].includes(name)) return compactObservation(redactGroupSessionFields(observation));
  return projectRoutingValue(observation);
}

export function projectGlobalAgentReasoningForModel(reasoning: AgentReasoningState) {
  return {
    version: reasoning.version,
    original_goal: reasoning.original_goal,
    effective_goal: reasoning.effective_goal,
    authorization_scope: reasoning.authorization_scope,
    clarification_chain: reasoning.clarification_chain,
    plan_version: reasoning.plan_version,
    replan_required: reasoning.replan_required,
    fact_snapshots: reasoning.fact_snapshots.map(item => ({ id: item.id, source: item.source, hash: item.hash, at: item.at })),
    assertions: reasoning.assertions.map(item => ({ id: item.id, kind: item.kind, status: item.status, updated_at: item.updated_at })),
    deviations: reasoning.deviations.map(item => ({ id: item.id, type: item.type, severity: item.severity, at: item.at })),
    recovery_checks: reasoning.recovery_checks.map(item => ({
      goal_revalidated: item.goal_revalidated,
      state_revalidated: item.state_revalidated,
      acceptance_revalidated: item.acceptance_revalidated,
      remaining_gap_count: item.remaining_gaps.length,
      at: item.at,
    })),
    updated_at: reasoning.updated_at,
  };
}


export function parseGlobalAgentDecision(raw: string | GlobalAgentDecision, fallbackWorkflowDecision: any = null): GlobalAgentDecision {
  if (raw && typeof raw === "object") return normalizeDecision(raw as GlobalAgentDecision, fallbackWorkflowDecision);
  const text = String(raw || "").trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidates = [fenced, text, text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)].filter(Boolean) as string[];
  let lastError: any;
  for (const candidate of candidates) {
    try { return normalizeDecision(JSON.parse(candidate), fallbackWorkflowDecision); } catch (error) { lastError = error; }
  }
  throw new Error(`Agent 决策不是合法 JSON：${lastError?.message || "无法解析"}`);
}

export function normalizeDecision(value: any, fallbackWorkflowDecision: any = null): GlobalAgentDecision {
  const state = String(value?.state || "").toLowerCase() as GlobalAgentDecisionState;
  if (!["answer", "investigate", "plan", "execute", "needs_confirmation", "complete"].includes(state)) throw new Error(`无效决策状态：${state || "空"}`);
  const tool = value?.tool && value.tool.name ? { name: String(value.tool.name), arguments: value.tool.arguments && typeof value.tool.arguments === "object" ? value.tool.arguments : {} } : null;
  const rawCompletion = value?.completion && typeof value.completion === "object" ? value.completion : null;
  const compactItem = (item: any) => typeof item === "string" ? item : JSON.stringify(item);
  const rawWorkflowDecision = value?.workflowDecision || value?.workflow_decision || null;
  const derivedWorkflowDecision = {
        mode: tool?.name === "decompose_requirement_epic"
          ? "decompose_epic"
          : state === "plan"
            ? "plan_task"
            : tool
              ? "execute_direct"
              : "answer",
        reason: "根据大模型返回的状态和工具选择生成工作流记录",
        confidence: Number(value?.intent?.confidence ?? 0.8),
      };
  const workflowDecision = normalizeWorkflowDecision({
    ...(fallbackWorkflowDecision || {}),
    ...(rawWorkflowDecision || derivedWorkflowDecision),
  });
  const intent = value?.intent && typeof value.intent === "object" ? value.intent : {
    category: workflowDecision.riskLevel === "high"
      ? "high_risk"
      : workflowDecision.actionRequired
        ? "execution"
        : workflowDecision.mode === "project_analysis"
          ? "analysis"
          : workflowDecision.intentKind === "question" ? "question" : "conversation",
    goal: String(value?.message || ""),
    action_required: workflowDecision.actionRequired,
    target_refs: workflowDecision.targetRefs,
    impact_scope: workflowDecision.impactScope,
    confidence: workflowDecision.confidence,
    authorization_basis: "none",
    reason: workflowDecision.reason,
  };
  return {
    state,
    message: String(value?.message || "").slice(0, 20_000),
    plan: Array.isArray(value?.plan) ? value.plan.map((item: any) => String(item).slice(0, 500)).slice(0, 12) : [],
    tool,
    intent,
    workflowDecision,
    completion: rawCompletion ? {
      summary: String(rawCompletion.summary || ""),
      evidence: Array.isArray(rawCompletion.evidence) ? rawCompletion.evidence.map(compactItem).slice(0, 20) : [],
      risks: Array.isArray(rawCompletion.risks) ? rawCompletion.risks.map(compactItem).slice(0, 20) : [],
      next_action: String(rawCompletion.next_action || ""),
    } : undefined,
  };
}

/**
 * The global directory is intentionally broad, but it must never become a
 * model-sized dump of every MCP schema, resource and historical task.  The
 * detailed records remain available through the read tools.  This projection
 * is the only global context embedded in a provider request.
 */
function buildBoundedGlobalModelContext(context: any) {
  const text = (value: any, limit: number) => {
    const source = typeof value === "string" ? value : JSON.stringify(value ?? "");
    return source.length > limit ? `${source.slice(0, Math.max(0, limit - 32)).trimEnd()}\n[已按上下文预算截断]` : source;
  };
  const rows = (value: any, limit: number) => Array.isArray(value) ? value.slice(0, limit) : [];
  const toolCatalog = context?.tools || {};
  const workspace = rows(toolCatalog.workspace, 32).map((tool: any) => ({
    name: String(tool?.name || ""),
    description: text(tool?.description || "", 260),
    schema_available_on_demand: true,
  })).filter((tool: any) => tool.name);
  const mcp = rows(toolCatalog.mcp, 32).map((tool: any) => ({
    name: String(tool?.name || tool?.canonicalName || ""),
    server: String(tool?.server || ""),
    description: text(tool?.description || "", 260),
    // The runtime validates arguments against the authoritative schema.  Full
    // schemas can be loaded on demand and are too large for every turn.
    schema_available_on_demand: true,
  })).filter((tool: any) => tool.name);
  const skills = rows(toolCatalog.skills, 20).map((skill: any) => ({
    name: String(skill?.name || ""),
    description: text(skill?.description || "", 240),
  })).filter((skill: any) => skill.name);
  const projects = rows(context?.projects, 48).map((project: any) => ({
    name: String(project?.name || ""),
    display_name: String(project?.display_name || ""),
    agent: String(project?.agent || ""),
    platform: String(project?.platform || ""),
  })).filter((project: any) => project.name);
  const groups = rows(context?.groups, 48).map((group: any) => ({
    id: String(group?.id || ""),
    name: String(group?.name || ""),
    members: rows(group?.members, 16).map((member: any) => ({ project: String(member?.project || ""), agent: String(member?.agent || "") })),
  })).filter((group: any) => group.id || group.name);
  const sharedFiles = context?.global_shared_files || {};
  return {
    projects,
    groups,
    requested_dispatch_targets: context?.requested_dispatch_targets || { targets: [], policy: "only_these_targets_may_receive_tasks" },
    task_summary: {
      policy: context?.task_summary?.policy || "global_agent_owned_tasks_only",
      total: Number(context?.task_summary?.total || 0),
      active: Number(context?.task_summary?.active || 0),
      recent: rows(context?.task_summary?.recent, 12).map((task: any) => ({
        id: String(task?.id || ""), title: text(task?.title || "", 240), status: String(task?.status || ""),
        status_detail: text(task?.status_detail || "", 260), target_project: String(task?.target_project || ""), updated_at: String(task?.updated_at || ""),
      })),
    },
    cron_jobs: rows(context?.cron_jobs, 24).map((job: any) => ({ id: String(job?.id || ""), name: text(job?.name || "", 160), schedule: String(job?.schedule || ""), enabled: job?.enabled !== false, target_type: String(job?.target_type || "") })),
    tools: {
      policy: toolCatalog.policy || "global_scope_authorized_only",
      available_counts: toolCatalog.available_counts || toolCatalog.configured_counts || {},
      loaded_tool_names: rows(toolCatalog.loaded_tool_names, 80).map(String),
      workspace,
      deferred_workspace: rows(toolCatalog.deferred_workspace, 48).map((tool: any) => ({ name: String(tool?.name || tool || "") })).filter((tool: any) => tool.name),
      mcp,
      deferred_mcp: rows(toolCatalog.deferred_mcp, 48).map((tool: any) => ({ name: String(tool?.name || tool || "") })).filter((tool: any) => tool.name),
      skills,
    },
    global_memory: text(context?.global_memory || "", 18_000),
    global_knowledge: text(context?.global_knowledge || "", 10_000),
    context_source_catalog: text(context?.context_source_catalog || "", 12_000),
    global_shared_files: {
      context: text(sharedFiles.context || "", 12_000),
      manifest_checksum: String(sharedFiles.manifest_checksum || ""),
      complete: sharedFiles.complete === true,
      files: rows(sharedFiles.files, 30).map((file: any) => ({ id: String(file?.id || ""), name: String(file?.name || ""), checksum: String(file?.checksum || ""), chunks: Number(file?.chunks || 0) })),
    },
    // Message bodies are emitted separately as continuation messages.
    session_continuity: context?.session_continuity ? {
      schema: String(context.session_continuity?.schema || ""),
      boundary_generation: Number(context.session_continuity?.boundary?.generation || context.session_continuity?.boundary_generation || 0),
      summary_available: !!context.session_continuity?.summary,
    } : null,
    memory_context_boundary: context?.memory_context_boundary || null,
    context_source_manifest: context?.context_source_manifest || null,
  };
}

export async function buildGlobalAgentModelMessages(run: GlobalAgentRun, runtime: GlobalAgentLoopRuntime, options: { sessionContinuationOverride?: any } = {}) {
  const context = runtime.getContext ? await runtime.getContext(run) : {};
  const boundaryValidation = runtime.verifyContextBoundary?.(context, run);
  if (boundaryValidation === false || (typeof boundaryValidation === "object" && boundaryValidation?.valid !== true)) {
    const issues = typeof boundaryValidation === "object" && Array.isArray(boundaryValidation?.issues) ? boundaryValidation.issues : ["context_boundary_rejected"];
    throw new Error(`global agent model context boundary failed: ${issues.join(", ")}`);
  }
  captureReasoningFacts(run.reasoning_loop, "current_system_context", context);
  const priorSteps = run.steps.map(step => ({
    index: step.index,
    state: step.state,
    tool: step.tool ? { name: step.tool.name, arguments: redactGroupSessionFields(step.tool.arguments), risk: step.tool.risk } : null,
    observation: projectGlobalAgentObservationForModel(step.tool?.name || "", step.observation),
    error: step.error ? "tool_failed" : "",
  }));
  const roleSkills = buildRoleSkillPrompt(
    "global-agent",
    run.reasoning_loop.effective_goal || run.user_message,
    {
      source: (run as any).source || "",
      phase: "planning",
      selectedSkillNames: (run.workflow_decision || run.workflowDecision)?.selectedSkills || [],
      modelDecision: run.workflow_decision || run.workflowDecision || null,
    },
  );
  const sessionId = String(run.session_id || "");
  const loadedToolNames = run.loaded_tool_names || run.loadedToolNames || [];
  const authorizedTools = buildGlobalAgentToolRuntimeContext(
    { taskId: run.id, sessionId, source: (run as any).source || "global-agent-model-messages" },
    loadedToolNames,
    { executionSkills: roleSkills.names },
  );
  const sessionGuidance = buildGlobalMainSessionGuidance();
  const identityRules = buildGlobalMainIdentityRules({
    sessionDirective: renderSlashCommandSessionDirective("global", "global", sessionId),
    roleSkillsPrompt: roleSkills.prompt,
  });
  const mcpPolicy = String(authorizedTools.policy_prompt || "").trim();
  const identitySystem = [identityRules, sessionGuidance].filter(Boolean).join("\n\n");
  const continuation = options.sessionContinuationOverride !== undefined
    ? options.sessionContinuationOverride
    : context?.session_continuity && typeof context.session_continuity === "object"
      ? context.session_continuity
      : null;
  const continuationMessages = (Array.isArray(continuation?.messages) ? continuation.messages : [])
    .map((item: any) => ({ role: item?.role === "assistant" ? "assistant" : "user", content: String(item?.content || "") }))
    .filter((item: any) => item.content.trim());
  const currentGoal = String(run.reasoning_loop.effective_goal || run.user_message || "").trim();
  const continuationWithoutCurrent = continuationMessages.filter((item: any) => !(item.role === "user" && item.content.trim() === currentGoal));
  const continuationKeys = new Set(continuationWithoutCurrent.map((item: any) => `${item.role}\0${item.content.trim()}`));
  const runHistoryMessages = (Array.isArray(run.history) ? run.history : [])
    .map((item: any) => ({ role: item?.role === "assistant" ? "assistant" : "user", content: String(item?.content || "") }))
    .filter((item: any) => item.content.trim() && item.content.trim() !== currentGoal)
    .filter((item: any) => {
      const key = `${item.role}\0${item.content.trim()}`;
      if (continuationKeys.has(key)) return false;
      continuationKeys.add(key);
      return true;
    });
  const { messages: _continuationMessages, ...continuationMetadata } = continuation || {};
  const modelContext = buildBoundedGlobalModelContext(continuation
    ? { ...context, session_continuity: continuationMetadata }
    : context);
  const summaryMessages = continuation?.summary
    ? [{ role: "user", content: `【当前全局会话压缩摘要】\n${JSON.stringify(continuation.summary)}` }]
    : [];
  const state = JSON.stringify({
    run: {
      id: run.id,
      status: run.status,
      phase: run.phase,
      explicit_write_authorization: run.explicit_write_authorization,
      max_steps: run.max_steps,
      remaining_steps: Math.max(0, run.max_steps - run.steps.length),
      latest_user_steer: run.last_user_steer || run.lastUserSteer || null,
      replan_required: run.reasoning_loop.replan_required === true,
      selected_role_skills: roleSkills.names,
      workflow_decision: run.workflow_decision || run.workflowDecision || null,
      requirement_sources: {
        available: Number((run as any).source_ingestion?.source_count || 0) > 0
          || !!(run as any).requirement_extraction
          || !!(run as any).requirement_decomposition,
        content_hash: String((run as any).requirement_content_hash || ""),
        source_count: Number((run as any).source_ingestion?.source_count || 0),
        has_extraction: !!(run as any).requirement_extraction,
        has_decomposition: !!(run as any).requirement_decomposition,
        decomposition_item_count: Array.isArray((run as any).requirement_decomposition?.items)
          ? (run as any).requirement_decomposition.items.length
          : 0,
        clarification_question_count: Array.isArray((run as any).requirement_decomposition?.clarification_questions)
          ? (run as any).requirement_decomposition.clarification_questions.length
          : 0,
      },
    },
    reasoning_loop: projectGlobalAgentReasoningForModel(run.reasoning_loop),
    context: modelContext,
    prior_steps: priorSteps,
  });
  const currentUserText = `【用户当前目标】\n${currentGoal}`;
  const nativeMessages = tryBuildGlobalNativeModelMessages({
    sessionId,
    currentUserText,
    identityRules,
    sessionGuidance,
    mcpPolicy,
    continuation,
    runHistory: run.history,
    metaBlocks: [{
      title: "当前运行状态",
      body: state,
    }],
    observations: run.steps.map(step => step.observation),
  });
  if (nativeMessages) return nativeMessages;
  return attachTransientModelBlocks([
    { role: "system", content: identitySystem },
    ...(mcpPolicy ? [{ role: "system", contextBlockType: "mcp", content: mcpPolicy } as any] : []),
    ...summaryMessages,
    ...continuationWithoutCurrent,
    ...runHistoryMessages,
    { role: "user", content: `【用户当前目标】\n${run.reasoning_loop.effective_goal || run.user_message}\n\n【当前运行状态】\n${state}\n\n请决定下一步：直接回答、调用工具，或 ccm_ask_user。` },
  ], collectTransientModelBlocks(run.steps.map(step => step.observation)));
}
