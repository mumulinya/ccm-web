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
exports.buildToolPrompt = buildToolPrompt;
exports.buildGlobalAgentModelMessages = buildGlobalAgentModelMessages;
const global_agent_run_store_1 = require("./global-agent-run-store");
const runtime_1 = require("./runtime");
const role_skills_1 = require("../../skills/role-skills");
const reasoning_loop_1 = require("../reasoning-loop");
const workflow_decision_1 = require("../workflow-decision");
function compactObservation(value) {
    let text = "";
    try {
        text = JSON.stringify(value);
    }
    catch {
        text = String(value);
    }
    if (text.length <= global_agent_run_store_1.MAX_OBSERVATION_CHARS)
        return value;
    return { truncated: true, preview: text.slice(0, global_agent_run_store_1.MAX_OBSERVATION_CHARS), original_chars: text.length };
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
function parseGlobalAgentDecision(raw) {
    if (raw && typeof raw === "object")
        return normalizeDecision(raw);
    const text = String(raw || "").trim();
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
    const candidates = [fenced, text, text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)].filter(Boolean);
    let lastError;
    for (const candidate of candidates) {
        try {
            return normalizeDecision(JSON.parse(candidate));
        }
        catch (error) {
            lastError = error;
        }
    }
    throw new Error(`Agent 决策不是合法 JSON：${lastError?.message || "无法解析"}`);
}
function normalizeDecision(value) {
    const state = String(value?.state || "").toLowerCase();
    if (!["answer", "investigate", "plan", "execute", "needs_confirmation", "complete"].includes(state))
        throw new Error(`无效决策状态：${state || "空"}`);
    const tool = value?.tool && value.tool.name ? { name: String(value.tool.name), arguments: value.tool.arguments && typeof value.tool.arguments === "object" ? value.tool.arguments : {} } : null;
    const rawCompletion = value?.completion && typeof value.completion === "object" ? value.completion : null;
    const compactItem = (item) => typeof item === "string" ? item : JSON.stringify(item);
    const workflowDecision = value?.workflowDecision || value?.workflow_decision
        ? (0, workflow_decision_1.normalizeWorkflowDecision)(value.workflowDecision || value.workflow_decision)
        : (0, workflow_decision_1.normalizeWorkflowDecision)({
            mode: tool?.name === "decompose_requirement_epic"
                ? "decompose_epic"
                : state === "plan"
                    ? "plan_task"
                    : tool
                        ? "execute_direct"
                        : "answer",
            reason: "根据大模型返回的状态和工具选择生成工作流记录",
            confidence: Number(value?.intent?.confidence ?? 0.8),
        });
    return {
        state,
        message: String(value?.message || "").slice(0, 20_000),
        plan: Array.isArray(value?.plan) ? value.plan.map((item) => String(item).slice(0, 500)).slice(0, 12) : [],
        tool,
        intent: value?.intent && typeof value.intent === "object" ? value.intent : undefined,
        workflowDecision,
        completion: rawCompletion ? {
            summary: String(rawCompletion.summary || ""),
            evidence: Array.isArray(rawCompletion.evidence) ? rawCompletion.evidence.map(compactItem).slice(0, 20) : [],
            risks: Array.isArray(rawCompletion.risks) ? rawCompletion.risks.map(compactItem).slice(0, 20) : [],
            next_action: String(rawCompletion.next_action || ""),
        } : undefined,
    };
}
function buildToolPrompt() {
    return (0, runtime_1.buildGlobalAgentToolDefinitions)(global_agent_run_store_1.GLOBAL_AGENT_TOOL_SPECS)
        .map(spec => `- ${spec.name}${spec.required?.length ? `（必填：${spec.required.join("、")}）` : ""}：${spec.description}；schema=${JSON.stringify(spec.inputSchema)}；risk=${spec.risk}`)
        .join("\n");
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
    const roleSkills = (0, role_skills_1.buildRoleSkillPrompt)("global-agent", run.reasoning_loop.effective_goal || run.user_message, { source: run.source || "", phase: "planning" });
    const system = `你是 CCM 全局 Agent 的决策内核。你不是关键词触发器，而是根据用户完整语义、真实系统上下文和工具观察结果决定下一步。

${workflow_decision_1.WORKFLOW_DECISION_GUIDANCE}

每轮必须输出 workflowDecision。它决定本轮是直接回答、只读项目分析、直接执行、先计划还是拆 Epic。附件和 URL 只提供上下文，绝不能自动触发拆解。

状态只能是 answer、investigate、plan、execute、needs_confirmation、complete。
- 普通聊天、知识问答、原理说明、可行性咨询：answer 或 complete，不调用写工具。
- 事实不足时先调用读取工具调查；不得猜测项目、群聊、任务 ID。
- 用户明确要求实际修改、实现、修复、运行、创建或派发时，才可选择写工具。
- 写工具是否获得授权由服务端最终判定；不要试图绕过确认。
- 每轮最多选择一个工具。观察结果返回后再决定下一步。
- 已经获得足够证据时必须 complete，禁止重复调用相同工具和空转。
- 最终回复区分：实际完成、已派发/仍在执行、验证证据、风险、需要用户确认的事项。
- 普通聊天、知识问答和原理说明如果没有调用工具，只给自然、直接的答案；不要附加“验证/证据”“风险”“下一步”等执行报告栏目，也不要向用户展示意图分类、置信度、授权依据、计划版本、断言、偏差或复盘。
- 只有实际执行、派发或调用工具后，最终回复才需要交付证据、风险和后续动作。
- state 为 answer 或 complete 时，message 必须直接写成给用户看的完整答案或完整执行回执，真正回答原问题；禁止只写“基于上下文回答”“准备总结”“已处理”等过程描述。
- state 为 investigate、plan、execute 或 needs_confirmation 时，message 才是简短进度说明。
- 每次都必须输出 intent：category、goal、action_required、target_refs、impact_scope、confidence、authorization_basis、reason。
- 必须核对“推理闭环”：原始目标、澄清链、当前事实快照、计划版本、验证断言和已知偏差。事实变化、工具失败或验收缺口出现后必须重规划，不能机械继续旧计划。
- 完成前必须逐项说明哪些目标断言已被证据证明；执行过写工具却没有可核验观察时不得声称完成。
- 运行期间可能收到“执行中补充要求”或“执行中目标调整”。最新补充必须进入下一轮判断；目标调整与旧计划冲突时，以最新目标边界为准并重新规划。
- 执行中的目标调整不会自动继承旧目标范围的写入授权；需要写入时必须重新满足服务端授权或确认规则。
- category 只能是 conversation、question、analysis、execution、high_risk、ambiguous；confidence 为 0~1。
- 目标没有在用户当前消息或读取工具结果中出现时，不得猜测；confidence 不足时使用 needs_confirmation 并提出一个具体澄清问题。

可用工具：
${buildToolPrompt()}

只输出一个合法 JSON 对象，不要输出 Markdown：
{"state":"investigate|plan|execute|needs_confirmation|answer|complete","message":"非终态写进度；终态写直接回答用户的完整内容","workflowDecision":{"mode":"answer|project_analysis|execute_direct|plan_task|decompose_epic","reason":"完整语义判断依据","confidence":0.95,"needsPlanning":false,"needsEpicDecomposition":false,"actionRequired":false,"continuationKind":"new_task|supplement|revise_goal","readAction":"none|inspect_status","targetRefs":[],"impactScope":[],"planSteps":[],"clarificationQuestions":[]},"intent":{"category":"conversation|question|analysis|execution|high_risk|ambiguous","goal":"用户真实目标","action_required":false,"target_refs":[],"impact_scope":[],"confidence":0.95,"authorization_basis":"current_message|confirmation|none","reason":"判断依据"},"plan":["步骤"],"tool":{"name":"工具名","arguments":{}},"completion":{"summary":"结论","evidence":[],"risks":[],"next_action":""}}
不调用工具时 tool 必须为 null。${roleSkills.prompt ? `\n\n${roleSkills.prompt}` : ""}`;
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
    const modelContext = continuation
        ? { ...context, session_continuity: continuationMetadata }
        : context;
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
    return [
        { role: "system", content: system },
        ...summaryMessages,
        ...continuationWithoutCurrent,
        ...runHistoryMessages,
        { role: "user", content: `【用户当前目标】\n${run.reasoning_loop.effective_goal || run.user_message}\n\n【当前运行状态】\n${state}\n\n请决定下一步。` },
    ];
}
//# sourceMappingURL=global-agent-run-projection.js.map