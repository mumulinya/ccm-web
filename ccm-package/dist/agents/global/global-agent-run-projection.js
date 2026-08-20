"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GROUP_SESSION_ID_PATTERN = exports.GLOBAL_MODEL_FORBIDDEN_FIELD = exports.GLOBAL_MODEL_ROUTE_KEYS = void 0;
exports.compactObservation = compactObservation;
exports.redactGroupSessionIds = redactGroupSessionIds;
exports.redactGroupSessionFields = redactGroupSessionFields;
exports.projectRoutingValue = projectRoutingValue;
exports.projectProjectRows = projectProjectRows;
exports.projectGroupRows = projectGroupRows;
exports.projectGlobalTaskRows = projectGlobalTaskRows;
exports.projectGlobalAgentObservationForModel = projectGlobalAgentObservationForModel;
exports.projectGlobalAgentReasoningForModel = projectGlobalAgentReasoningForModel;
exports.parseGlobalAgentDecision = parseGlobalAgentDecision;
exports.normalizeDecision = normalizeDecision;
exports.buildGlobalAgentModelMessages = buildGlobalAgentModelMessages;
const role_skills_1 = require("../../skills/role-skills");
const reasoning_loop_1 = require("../reasoning-loop");
const workflow_decision_1 = require("../workflow-decision");
const workspace_readonly_tools_1 = require("../../tools/workspace-readonly-tools");
const transient_model_content_1 = require("../../system/transient-model-content");
const global_native_messages_1 = require("./global-native-messages");
const main_agent_identity_1 = require("../main-agent-identity");
const slash_command_session_state_1 = require("../../system/slash-command-session-state");
const global_agent_tool_authorization_1 = require("../../modules/global/global-agent-tool-authorization");
function compactObservation(value) {
    return value;
}
exports.GLOBAL_MODEL_ROUTE_KEYS = new Set([
    "success", "accepted", "completed", "replayed", "operation", "id", "mission_id", "global_mission_id",
    "supervisor_id", "status", "state", "supervisor_status", "task_id", "group_id", "project", "target",
    "name", "queued", "enabled", "schedule", "target_type", "children", "rejected", "count", "total", "active",
    "updated_at", "created_at", "completed_at", "trace_id", "phase", "attempt", "attempts", "max_attempts",
]);
exports.GLOBAL_MODEL_FORBIDDEN_FIELD = /(?:^|_)(?:group_session(?:_id)?|group_messages?|group_memory|project_memory|messages?|prompt|raw_payload|raw_receipt|worker_context_packet|task_agent_session|native_session)(?:$|_)/i;
exports.GROUP_SESSION_ID_PATTERN = /\bgcs_[a-z0-9_-]+\b/ig;
function redactGroupSessionIds(value) {
    return typeof value === "string" ? value.replace(exports.GROUP_SESSION_ID_PATTERN, "[group-session-redacted]") : value;
}
function redactGroupSessionFields(value) {
    if (Array.isArray(value))
        return value.slice(0, 100).map(redactGroupSessionFields);
    if (!value || typeof value !== "object")
        return redactGroupSessionIds(value);
    const projected = {};
    for (const [key, nested] of Object.entries(value)) {
        if (exports.GLOBAL_MODEL_FORBIDDEN_FIELD.test(key))
            continue;
        projected[key] = redactGroupSessionFields(nested);
    }
    return projected;
}
function projectRoutingValue(value) {
    if (Array.isArray(value))
        return value.slice(0, 100).map(projectRoutingValue);
    if (!value || typeof value !== "object")
        return redactGroupSessionIds(value);
    const projected = {};
    for (const [key, nested] of Object.entries(value)) {
        if (exports.GLOBAL_MODEL_FORBIDDEN_FIELD.test(key) || !exports.GLOBAL_MODEL_ROUTE_KEYS.has(key))
            continue;
        projected[key] = projectRoutingValue(nested);
    }
    return projected;
}
function projectProjectRows(rows) {
    return (Array.isArray(rows) ? rows : []).slice(0, 100).map((row) => ({
        name: redactGroupSessionIds(String(row?.name || "")),
        work_dir: redactGroupSessionIds(String(row?.work_dir || row?.workDir || "")),
        agent: redactGroupSessionIds(String(row?.agent || "")),
        platform: redactGroupSessionIds(String(row?.platform || "")),
    }));
}
function projectGroupRows(rows) {
    return (Array.isArray(rows) ? rows : []).slice(0, 100).map((row) => ({
        id: redactGroupSessionIds(String(row?.id || "")),
        name: redactGroupSessionIds(String(row?.name || "")),
        members: (Array.isArray(row?.members) ? row.members : []).slice(0, 100).map((member) => ({
            project: redactGroupSessionIds(String(member?.project || "")),
            agent: redactGroupSessionIds(String(member?.agent || "")),
        })),
    }));
}
function projectGlobalTaskRows(observation) {
    if (observation?.task_boundary?.policy !== "global_agent_owned_tasks_only")
        return [];
    return (Array.isArray(observation?.tasks) ? observation.tasks : []).slice(0, 100).map((task) => ({
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
function projectGlobalAgentObservationForModel(toolName, observation) {
    const name = String(toolName || "");
    if (!observation || typeof observation !== "object")
        return observation === undefined ? undefined : { available: true };
    if (workspace_readonly_tools_1.WORKSPACE_READONLY_TOOL_DEFINITIONS_V3.some(tool => tool.name === name.replace(/^mcp__ccm__ccm_workspace_readonly__/, ""))) {
        return compactObservation(redactGroupSessionFields(observation));
    }
    if (name === "list_projects")
        return { success: observation.success !== false, projects: projectProjectRows(observation.projects) };
    if (name === "inspect_project")
        return {
            success: observation.success !== false,
            project: redactGroupSessionIds(String(observation.project || "")),
            config: observation.config ? {
                work_dir: redactGroupSessionIds(String(observation.config.work_dir || "")),
                agent: redactGroupSessionIds(String(observation.config.agent || "")),
                platform: redactGroupSessionIds(String(observation.config.platform || "")),
            } : undefined,
            memory_boundary: { project_memory_included: false, policy: "routing_metadata_only_delegate_to_group_main_agent" },
        };
    if (name === "list_groups")
        return { success: observation.success !== false, groups: projectGroupRows(observation.groups) };
    if (name === "list_tasks")
        return {
            success: observation.success !== false,
            tasks: projectGlobalTaskRows(observation),
            task_boundary: { policy: "global_agent_owned_tasks_only", historical_unproven_rows_dropped: observation?.task_boundary?.policy !== "global_agent_owned_tasks_only" },
        };
    if (name === "list_cron")
        return { success: observation.success !== false, jobs: projectRoutingValue(observation.jobs) };
    if (name === "inspect_system")
        return {
            success: observation.success !== false,
            projects: projectProjectRows(observation.projects),
            groups: projectGroupRows(observation.groups),
            missions: projectRoutingValue(observation.missions),
            memory_context_boundary: { group_session_context_included: false, group_memory_included: false, project_memory_included: false },
        };
    if (["query_global_memory", "manage_global_memory", "query_knowledge"].includes(name))
        return compactObservation(redactGroupSessionFields(observation));
    return projectRoutingValue(observation);
}
function projectGlobalAgentReasoningForModel(reasoning) {
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
function parseGlobalAgentDecision(raw, fallbackWorkflowDecision = null) {
    if (raw && typeof raw === "object")
        return normalizeDecision(raw, fallbackWorkflowDecision);
    const text = String(raw || "").trim();
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
    const candidates = [fenced, text, text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)].filter(Boolean);
    let lastError;
    for (const candidate of candidates) {
        try {
            return normalizeDecision(JSON.parse(candidate), fallbackWorkflowDecision);
        }
        catch (error) {
            lastError = error;
        }
    }
    throw new Error(`Agent 决策不是合法 JSON：${lastError?.message || "无法解析"}`);
}
function normalizeDecision(value, fallbackWorkflowDecision = null) {
    const state = String(value?.state || "").toLowerCase();
    if (!["answer", "investigate", "plan", "execute", "needs_confirmation", "complete"].includes(state))
        throw new Error(`无效决策状态：${state || "空"}`);
    const tool = value?.tool && value.tool.name ? { name: String(value.tool.name), arguments: value.tool.arguments && typeof value.tool.arguments === "object" ? value.tool.arguments : {} } : null;
    const rawCompletion = value?.completion && typeof value.completion === "object" ? value.completion : null;
    const compactItem = (item) => typeof item === "string" ? item : JSON.stringify(item);
    const rawWorkflowDecision = value?.workflowDecision || value?.workflow_decision || null;
    const derivedWorkflowDecision = {
        actionRequired: !!tool,
        requiresCodeChanges: tool?.name === "decompose_requirement_epic",
        needsEpicDecomposition: tool?.name === "decompose_requirement_epic",
        reason: "根据大模型返回的状态和工具选择生成工作流记录",
        confidence: Number(value?.intent?.confidence ?? 0.8),
    };
    const workflowDecision = (0, workflow_decision_1.normalizeWorkflowDecision)({
        ...(fallbackWorkflowDecision || {}),
        ...(rawWorkflowDecision || derivedWorkflowDecision),
    });
    const intent = value?.intent && typeof value.intent === "object" ? value.intent : {
        category: workflowDecision.riskLevel === "high"
            ? "high_risk"
            : workflowDecision.actionRequired
                ? "execution"
                : workflowDecision.readAction === "inspect_status"
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
        plan: Array.isArray(value?.plan) ? value.plan.map((item) => String(item).slice(0, 500)).slice(0, 12) : [],
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
function buildBoundedGlobalModelContext(context) {
    const text = (value, limit) => {
        const source = typeof value === "string" ? value : JSON.stringify(value ?? "");
        return source.length > limit ? `${source.slice(0, Math.max(0, limit - 32)).trimEnd()}\n[已按上下文预算截断]` : source;
    };
    const rows = (value, limit) => Array.isArray(value) ? value.slice(0, limit) : [];
    const toolCatalog = context?.tools || {};
    const workspace = rows(toolCatalog.workspace, 32).map((tool) => ({
        name: String(tool?.name || ""),
        description: text(tool?.description || "", 260),
        schema_available_on_demand: true,
    })).filter((tool) => tool.name);
    const mcp = rows(toolCatalog.mcp, 32).map((tool) => ({
        name: String(tool?.name || tool?.canonicalName || ""),
        server: String(tool?.server || ""),
        description: text(tool?.description || "", 260),
        // The runtime validates arguments against the authoritative schema.  Full
        // schemas can be loaded on demand and are too large for every turn.
        schema_available_on_demand: true,
    })).filter((tool) => tool.name);
    const skills = rows(toolCatalog.skills, 20).map((skill) => ({
        name: String(skill?.name || ""),
        description: text(skill?.description || "", 240),
    })).filter((skill) => skill.name);
    const projects = rows(context?.projects, 48).map((project) => ({
        name: String(project?.name || ""),
        display_name: String(project?.display_name || ""),
        agent: String(project?.agent || ""),
        platform: String(project?.platform || ""),
    })).filter((project) => project.name);
    const groups = rows(context?.groups, 48).map((group) => ({
        id: String(group?.id || ""),
        name: String(group?.name || ""),
        members: rows(group?.members, 16).map((member) => ({ project: String(member?.project || ""), agent: String(member?.agent || "") })),
    })).filter((group) => group.id || group.name);
    const sharedFiles = context?.global_shared_files || {};
    return {
        projects,
        groups,
        requested_dispatch_targets: context?.requested_dispatch_targets || { targets: [], policy: "only_these_targets_may_receive_tasks" },
        task_summary: {
            policy: context?.task_summary?.policy || "global_agent_owned_tasks_only",
            total: Number(context?.task_summary?.total || 0),
            active: Number(context?.task_summary?.active || 0),
            recent: rows(context?.task_summary?.recent, 12).map((task) => ({
                id: String(task?.id || ""), title: text(task?.title || "", 240), status: String(task?.status || ""),
                status_detail: text(task?.status_detail || "", 260), target_project: String(task?.target_project || ""), updated_at: String(task?.updated_at || ""),
            })),
        },
        cron_jobs: rows(context?.cron_jobs, 24).map((job) => ({ id: String(job?.id || ""), name: text(job?.name || "", 160), schedule: String(job?.schedule || ""), enabled: job?.enabled !== false, target_type: String(job?.target_type || "") })),
        tools: {
            policy: toolCatalog.policy || "global_scope_authorized_only",
            available_counts: toolCatalog.available_counts || toolCatalog.configured_counts || {},
            loaded_tool_names: rows(toolCatalog.loaded_tool_names, 80).map(String),
            workspace,
            deferred_workspace: rows(toolCatalog.deferred_workspace, 48).map((tool) => ({ name: String(tool?.name || tool || "") })).filter((tool) => tool.name),
            mcp,
            deferred_mcp: rows(toolCatalog.deferred_mcp, 48).map((tool) => ({ name: String(tool?.name || tool || "") })).filter((tool) => tool.name),
            skills,
        },
        global_memory: text(context?.global_memory || "", 18_000),
        global_knowledge: text(context?.global_knowledge || "", 10_000),
        context_source_catalog: text(context?.context_source_catalog || "", 12_000),
        global_shared_files: {
            context: text(sharedFiles.context || "", 12_000),
            manifest_checksum: String(sharedFiles.manifest_checksum || ""),
            complete: sharedFiles.complete === true,
            files: rows(sharedFiles.files, 30).map((file) => ({ id: String(file?.id || ""), name: String(file?.name || ""), checksum: String(file?.checksum || ""), chunks: Number(file?.chunks || 0) })),
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
async function buildGlobalAgentModelMessages(run, runtime, options = {}) {
    const context = runtime.getContext ? await runtime.getContext(run) : {};
    const boundaryValidation = runtime.verifyContextBoundary?.(context, run);
    if (boundaryValidation === false || (typeof boundaryValidation === "object" && boundaryValidation?.valid !== true)) {
        const issues = typeof boundaryValidation === "object" && Array.isArray(boundaryValidation?.issues) ? boundaryValidation.issues : ["context_boundary_rejected"];
        throw new Error(`global agent model context boundary failed: ${issues.join(", ")}`);
    }
    (0, reasoning_loop_1.captureReasoningFacts)(run.reasoning_loop, "current_system_context", context);
    const priorSteps = run.steps.map(step => ({
        index: step.index,
        state: step.state,
        tool: step.tool ? { name: step.tool.name, arguments: redactGroupSessionFields(step.tool.arguments), risk: step.tool.risk } : null,
        observation: projectGlobalAgentObservationForModel(step.tool?.name || "", step.observation),
        error: step.error ? "tool_failed" : "",
    }));
    const roleSkills = (0, role_skills_1.buildRoleSkillPrompt)("global-agent", run.reasoning_loop.effective_goal || run.user_message, {
        source: run.source || "",
        phase: "planning",
        selectedSkillNames: (run.workflow_decision || run.workflowDecision)?.selectedSkills || [],
        modelDecision: run.workflow_decision || run.workflowDecision || null,
    });
    const sessionId = String(run.session_id || "");
    const loadedToolNames = run.loaded_tool_names || run.loadedToolNames || [];
    const authorizedTools = (0, global_agent_tool_authorization_1.buildGlobalAgentToolRuntimeContext)({ taskId: run.id, sessionId, source: run.source || "global-agent-model-messages" }, loadedToolNames, { executionSkills: roleSkills.names });
    const sessionGuidance = (0, main_agent_identity_1.buildGlobalMainSessionGuidance)();
    const identityRules = (0, main_agent_identity_1.buildGlobalMainIdentityRules)({
        sessionDirective: (0, slash_command_session_state_1.renderSlashCommandSessionDirective)("global", "global", sessionId),
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
        .map((item) => ({ role: item?.role === "assistant" ? "assistant" : "user", content: String(item?.content || "") }))
        .filter((item) => item.content.trim());
    const currentGoal = String(run.reasoning_loop.effective_goal || run.user_message || "").trim();
    const continuationWithoutCurrent = continuationMessages.filter((item) => !(item.role === "user" && item.content.trim() === currentGoal));
    const continuationKeys = new Set(continuationWithoutCurrent.map((item) => `${item.role}\0${item.content.trim()}`));
    const runHistoryMessages = (Array.isArray(run.history) ? run.history : [])
        .map((item) => ({ role: item?.role === "assistant" ? "assistant" : "user", content: String(item?.content || "") }))
        .filter((item) => item.content.trim() && item.content.trim() !== currentGoal)
        .filter((item) => {
        const key = `${item.role}\0${item.content.trim()}`;
        if (continuationKeys.has(key))
            return false;
        continuationKeys.add(key);
        return true;
    });
    const { messages: _continuationMessages, ...continuationMetadata } = continuation || {};
    const modelContext = buildBoundedGlobalModelContext(continuation
        ? { ...context, session_continuity: continuationMetadata }
        : context);
    const summaryMessages = continuation?.summary
        ? [{ role: "user", content: `[Current global session compaction summary]\n${JSON.stringify(continuation.summary)}` }]
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
                available: Number(run.source_ingestion?.source_count || 0) > 0
                    || !!run.requirement_extraction
                    || !!run.requirement_decomposition,
                content_hash: String(run.requirement_content_hash || ""),
                source_count: Number(run.source_ingestion?.source_count || 0),
                has_extraction: !!run.requirement_extraction,
                has_decomposition: !!run.requirement_decomposition,
                decomposition_item_count: Array.isArray(run.requirement_decomposition?.items)
                    ? run.requirement_decomposition.items.length
                    : 0,
                clarification_question_count: Array.isArray(run.requirement_decomposition?.clarification_questions)
                    ? run.requirement_decomposition.clarification_questions.length
                    : 0,
            },
        },
        reasoning_loop: projectGlobalAgentReasoningForModel(run.reasoning_loop),
        context: modelContext,
        prior_steps: priorSteps,
    });
    const currentUserText = `[Current user goal]\n${currentGoal}`;
    const nativeMessages = (0, global_native_messages_1.tryBuildGlobalNativeModelMessages)({
        sessionId,
        currentUserText,
        identityRules,
        sessionGuidance,
        mcpPolicy,
        continuation,
        runHistory: run.history,
        metaBlocks: [{
                title: "Current run state",
                body: state,
            }],
        observations: run.steps.map(step => step.observation),
    });
    if (nativeMessages)
        return nativeMessages;
    return (0, transient_model_content_1.attachTransientModelBlocks)([
        { role: "system", content: identitySystem },
        ...(mcpPolicy ? [{ role: "system", contextBlockType: "mcp", content: mcpPolicy }] : []),
        ...summaryMessages,
        ...continuationWithoutCurrent,
        ...runHistoryMessages,
        { role: "user", content: `[Current user goal]\n${run.reasoning_loop.effective_goal || run.user_message}\n\n[Current run state]\n${state}\n\nChoose the next action: answer directly, call a tool, or call ccm_ask_user.` },
    ], (0, transient_model_content_1.collectTransientModelBlocks)(run.steps.map(step => step.observation)));
}
//# sourceMappingURL=global-agent-run-projection.js.map