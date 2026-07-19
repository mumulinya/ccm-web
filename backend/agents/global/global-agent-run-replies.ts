import { GLOBAL_DISPATCH_TOOL_NAMES } from "./global-agent-run-store";
import { sanitizeMainAgentRoleLanguage, sanitizeMainAgentUserFacingText } from "../user-facing-text";
import type { GlobalAgentDecision, GlobalAgentLoopRuntime, GlobalAgentRun, GlobalAgentRunStatus, GlobalAgentToolRisk } from "./loop";

export function nowIso(runtime?: GlobalAgentLoopRuntime) {
  return new Date(runtime?.now ? runtime.now() : Date.now()).toISOString();
}

export function stripNonExecutionReportSections(value: any) {
  return String(value || "")
    .replace(/\n*验证\/证据\s*[:：][\s\S]*?(?=\n+\s*(?:风险|下一步|处理总结|验证与验收|需要留意)\s*[:：]|$)/g, "")
    .replace(/\n*风险\s*[:：][\s\S]*?(?=\n+\s*(?:下一步|处理总结|验证与验收|需要留意)\s*[:：]|$)/g, "")
    .replace(/\n*处理总结\s*[:：][\s\S]*?(?=\n+\s*(?:验证与验收|需要留意|下一步|风险)\s*[:：]|$)/g, "")
    .replace(/\n*验证与验收\s*[:：][\s\S]*?(?=\n+\s*(?:需要留意|下一步|风险)\s*[:：]|$)/g, "")
    .replace(/\n*需要留意\s*[:：][\s\S]*?(?=\n+\s*(?:下一步)\s*[:：]|$)/g, "")
    .replace(/\n*下一步\s*[:：][^\n]*(?:\n|$)/g, "")
    .replace(/\n*[-•]?\s*指令\s*ID\s*[:：]\s*\S+/gi, "")
    .replace(/\n*【(?:任务交付完成|任务交付|交付完成)】[\s\S]*$/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const GLOBAL_USER_SUMMARY_INTERNAL_PATTERN = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|<\s*\/?\s*task-notification|task-notification|receipt[-_\s]*status|trace_id|session_id|run_id|WorkerContextPacket|raw[_\s-]*payload|raw[_\s-]*receipt|raw_report|Runtime Kernel|workflow_timeline|native_session|task_agent_session|scratchpad|execution_lease|workchain|shouldDelegate|Trace Replay|回执要求/i;
export const GLOBAL_USER_SUMMARY_TECHNICAL_EVIDENCE_PATTERN = /(?:[A-Za-z]:[\\/][^\r\n]*(?:test-agent-artifacts|artifact-manifest\.json|report\.md|report\.json|verdict\.json))|(?:test-agent-artifacts|artifact-manifest\.json|verdict\.json|raw[_\s-]*stack|stack\s+trace)/i;

export function hasGlobalUserSummaryTechnicalDetails(value: any) {
  const text = String(value || "");
  return GLOBAL_USER_SUMMARY_INTERNAL_PATTERN.test(text) || GLOBAL_USER_SUMMARY_TECHNICAL_EVIDENCE_PATTERN.test(text);
}

export function compactGlobalUserSummaryText(value: any, fallback = "信息已整理。", max = 320) {
  const raw = String(value || "").replace(/\s+/g, " ").trim();
  const text = raw && !hasGlobalUserSummaryTechnicalDetails(raw) ? raw : fallback;
  const sanitized = sanitizeMainAgentUserFacingText(text);
  return sanitized.length > max ? `${sanitized.slice(0, max)}...` : sanitized;
}

export function uniqueGlobalStrings(values: any[]) {
  const seen = new Set<string>();
  const rows: string[] = [];
  for (const value of values || []) {
    const text = String(value || "").trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    rows.push(text);
  }
  return rows;
}

export function sanitizeGlobalVisibleReplyTerminology(value: string) {
  return sanitizeMainAgentUserFacingText(String(value || "")
    .replace(/\bCoordinator\b/g, "我")
    .replace(/\bPipeline\b/g, "协作看板")
    .replace(/\bRuntime Kernel\b/g, "技术运行信息")
    .replace(/\bTrace Replay\b/g, "技术回放"));
}

export function globalVisibleReplyFallback(status?: GlobalAgentRunStatus) {
  if (status === "failed") return "这次处理没有完成；原因和排障信息已放在技术详情里。";
  if (status === "cancelled") return "本次处理已停止，不会继续执行。";
  if (status === "supervising") return "已受理并进入持续跟踪；最终交付通过验收后，我会再给你完整总结。";
  return "我已整理处理结果，技术细节已放入技术详情。";
}

export function buildGlobalVisibleReplyContent(input: { value?: any; rawSource?: any; fallback?: string; status?: GlobalAgentRunStatus; max?: number } = {}) {
  const max = Math.max(80, Number(input.max || 8000));
  const fallback = input.fallback || globalVisibleReplyFallback(input.status);
  const rawVisible = String(input.value || "").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  const rawSource = String(input.rawSource === undefined ? input.value || "" : input.rawSource || "").replace(/\r/g, "").trim();
  let text = rawVisible || fallback;
  const hiddenForProtocol = hasGlobalUserSummaryTechnicalDetails(text);
  if (hiddenForProtocol) text = fallback;
  text = sanitizeGlobalVisibleReplyTerminology(text).trim() || fallback;
  if (text.length > max) text = `${text.slice(0, max)}...`;
  const sourceHasProtocol = hasGlobalUserSummaryTechnicalDetails(rawSource);
  const visibleChanged = !!rawSource && rawSource !== text;
  const technicalContent = (sourceHasProtocol || hiddenForProtocol || visibleChanged) ? rawSource.slice(0, 20_000) : "";
  return {
    text,
    user_text: text,
    technical_content: technicalContent,
    changed: !!technicalContent,
    hidden_protocol: sourceHasProtocol || hiddenForProtocol,
    hidden_visible_protocol: hiddenForProtocol,
  };
}

export function attachGlobalReplyTechnicalContent(target: any, content: any) {
  const text = String(content || "").trim();
  if (!target || !text) return;
  target.technical_content = text;
  target.technicalContent = text;
  if (!Array.isArray(target.technical_details)) target.technical_details = [];
  let section = target.technical_details.find((item: any) => item?.id === "raw_global_reply");
  if (!section) {
    section = { id: "raw_global_reply", title: "原始回复", items: [] };
    target.technical_details.push(section);
  }
  if (!Array.isArray(section.items)) section.items = [];
  if (!section.items.some((item: any) => item?.label === "原始回复")) {
    section.items.push({ label: "原始回复", value: text.slice(0, 1600) });
  }
}

export function getGlobalToolUserLabel(toolName: string) {
  const labels: Record<string, string> = {
    inspect_system: "读取系统状态",
    list_projects: "读取项目列表",
    inspect_project: "读取项目上下文",
    list_groups: "读取群聊列表",
    list_tasks: "读取任务列表",
    list_cron: "读取定时任务",
    query_knowledge: "查询知识库",
    query_global_memory: "查询全局记忆",
    manage_global_memory: "管理全局记忆",
    inspect_mission: "查询全局任务",
    inspect_supervision: "查询持续跟进状态",
    orchestrate_development: "创建跨项目开发任务",
    manage_supervision: "管理持续跟进",
    create_task: "创建开发任务",
    send_project_cmd: "发送项目执行指令",
    send_group_cmd: "发送协作群指令",
    manage_cron: "管理定时任务",
    manage_group: "管理群聊",
    manage_project: "管理项目",
    manage_task: "管理任务",
    manage_tool: "管理工具",
    git_review: "审查代码变更",
    git_commit: "提交代码",
    create_template: "创建模板",
    play_music: "播放音乐",
    stop_music: "停止音乐",
    toggle_pet: "控制桌面宠物",
    create_pet_from_image: "根据参考图创建宠物",
    navigate: "切换页面",
  };
  return labels[String(toolName || "").trim()] || String(toolName || "工具操作");
}

export function summarizeGlobalToolTarget(args: any = {}) {
  const target = args.project || args.projectName || args.group_id || args.groupId || args.task_id || args.taskId || args.id || args.name || args.title || args.operation || "";
  return compactGlobalUserSummaryText(target, "目标将在技术详情中保留。", 120);
}

export function buildGlobalClarificationSummary(input: { run: GlobalAgentRun; question?: string; decision?: any; reason?: string }) {
  const question = compactGlobalUserSummaryText(input.question || input.run.clarification_question || input.run.final_reply, "请补充目标、范围或验收标准。", 420);
  const rawReasons = [
    input.reason,
    ...(Array.isArray(input.decision?.clarificationReasons) ? input.decision.clarificationReasons : []),
    input.decision?.intent?.reason,
    input.decision?.reason,
  ].filter(Boolean);
  const reason = compactGlobalUserSummaryText(rawReasons.join("；"), "目标、范围或授权信息还不够明确。", 320);
  return {
    schema: "ccm-global-main-agent-clarification-summary-v1",
    surface: "global",
    title: "需要你补充信息",
    status: "waiting_user",
    status_label: "等待你回复",
    headline: "我已停在需要你补充信息的位置，不会猜测目标或擅自执行。",
    question,
    reason,
    answer_suggestions: [
      "说明要处理的对象：项目、群聊、任务或具体页面。",
      "说明允许的范围：只分析、创建任务、修改代码或执行管理操作。",
      "说明你希望看到的验收结果：例如改动文件、验证命令或最终效果。",
    ],
    next_action: "你回复后，我会沿用同一个运行继续规划、执行和总结。",
    display_policy: {
      user_text_first: true,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
      show_todo: false,
      show_for_ordinary_conversation: false,
    },
    technical: {
      run_id: input.run.id,
      trace_id: input.run.trace_id,
      phase: input.run.phase,
      source: "global-agent-loop",
    },
  };
}

export function buildGlobalConfirmationSummary(input: { run: GlobalAgentRun; pendingTool?: { name: string; arguments: any; risk: GlobalAgentToolRisk; signature: string } | null; reply?: string; decision?: any; permission?: any }) {
  const pending = input.pendingTool || input.run.pending_tool || null;
  const action = getGlobalToolUserLabel(String(pending?.name || ""));
  const riskLabel = pending?.risk === "high" ? "高风险操作" : pending?.risk === "write" ? "写入操作" : "需要确认";
  const target = summarizeGlobalToolTarget(pending?.arguments || {});
  const reason = compactGlobalUserSummaryText(
    input.decision?.intent?.reason || input.reply || input.run.final_reply,
    "这一步可能改变系统状态，需要你确认后才会继续。",
    360,
  );
  return {
    schema: "ccm-global-main-agent-confirmation-summary-v1",
    surface: "global",
    title: "等待授权确认",
    status: "waiting_user",
    status_label: riskLabel,
    headline: `我已准备执行“${action}”，确认前不会执行这一步。`,
    action,
    risk: pending?.risk || "write",
    risk_label: riskLabel,
    target,
    question: "是否允许我继续执行这一步？",
    reason,
    answer_suggestions: [
      "确认并继续：执行这一步，然后继续检查结果并总结。",
      "取消：停止本次操作，不产生这一步写入变更。",
    ],
    next_action: "使用卡片按钮确认或取消；确认后会继续执行并给出结果总结。",
    display_policy: {
      user_text_first: true,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
      show_todo: false,
      show_for_ordinary_conversation: false,
    },
    technical: {
      run_id: input.run.id,
      trace_id: input.run.trace_id,
      tool: pending?.name || "",
      risk: pending?.risk || "",
      signature: pending?.signature || "",
      permission_decision: input.permission?.rule?.decision || (input.permission?.allowed ? "allow" : input.permission?.denied ? "deny" : "ask"),
      source: "global-agent-loop",
    },
  };
}

export function buildGlobalPlanSteps(decision: GlobalAgentDecision, toolName = "") {
  const rawSteps = Array.isArray(decision.plan) ? decision.plan : [];
  const fallbackSteps = [
    decision.message || "理解目标和影响范围",
    toolName ? `执行：${getGlobalToolUserLabel(toolName)}` : "",
    "检查结果并向用户总结",
  ].filter(Boolean);
  const total = rawSteps.length ? rawSteps.length : fallbackSteps.length;
  return (rawSteps.length ? rawSteps : fallbackSteps).slice(0, 8).map((item, index) => ({
    id: `global-plan-step-${index + 1}`,
    label: compactGlobalUserSummaryText(item, `计划步骤 ${index + 1}`, 180),
    detail: index === 0
      ? "先核对目标、范围和现有上下文。"
      : index === total - 1
        ? "完成后必须给出用户可读总结。"
        : "",
    status: index === 0 ? "in_progress" : "pending",
  }));
}

export function buildGlobalPlanExecutionFollowup(planMode: any = {}, at = nowIso(), feedback = "") {
  const toolLabel = compactGlobalUserSummaryText(planMode.action || "", "", 120);
  const acceptedFeedback = compactGlobalUserSummaryText(
    feedback || planMode.accepted_feedback || planMode.acceptedFeedback || "",
    "",
    320,
  );
  return {
    schema: "ccm-main-agent-plan-execution-followup-v1",
    status: "confirmed_tracking",
    title: "计划已确认，正在按计划执行",
    headline: toolLabel
      ? acceptedFeedback
        ? `我会带着你的补充要求继续执行「${toolLabel}」，并在最终总结前逐项核对验收标准。`
        : `我会按已确认的计划继续执行「${toolLabel}」，并在最终总结前逐项核对验收标准。`
      : acceptedFeedback
        ? "我会带着你的补充要求继续执行，并在最终总结前逐项核对验收标准。"
        : "我会按已确认的计划继续执行，并在最终总结前逐项核对验收标准。",
    accepted_at: at,
    accepted_feedback: acceptedFeedback,
    next_action: "等待下游执行目标、工具结果或验证证据；如有偏离，我会先返工或说明原因再总结。",
    display_policy: {
      user_text_first: true,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
      show_for_ordinary_conversation: false,
    },
  };
}

export function buildGlobalPlanModeSummary(input: { run: GlobalAgentRun; decision: GlobalAgentDecision; risk: GlobalAgentToolRisk; pendingTool?: { name: string; arguments: any; risk: GlobalAgentToolRisk; signature: string } | null; requiresConfirmation?: boolean; confirmationStatus?: string }) {
  const pending = input.pendingTool || (input.decision.tool ? { name: input.decision.tool.name, arguments: input.decision.tool.arguments || {}, risk: input.risk, signature: "" } : null);
  const toolLabel = getGlobalToolUserLabel(String(pending?.name || input.decision.tool?.name || ""));
  const riskLevel = input.risk === "high" ? "high" : input.risk === "write" ? "medium" : "low";
  const intent = input.decision.intent || {};
  const args = pending?.arguments || input.decision.tool?.arguments || {};
  const targetRefs = Array.isArray(intent.target_refs) ? intent.target_refs : [];
  const impactScope = Array.isArray(intent.impact_scope) ? intent.impact_scope : [];
  const projects = [
    args.project,
    args.projectName,
    ...targetRefs,
  ].map(item => compactGlobalUserSummaryText(item, "", 80)).filter(Boolean).slice(0, 8);
  const areas = impactScope.length
    ? impactScope.map(item => compactGlobalUserSummaryText(item, "", 100)).filter(Boolean).slice(0, 6)
    : [
        /project|项目|代码|修复|实现|send_project_cmd/i.test(`${pending?.name || ""} ${input.run.user_message}`) ? "项目代码与验证结果" : "",
        /group|群聊|任务|派发|create_task|send_group_cmd|orchestrate/i.test(`${pending?.name || ""} ${input.run.user_message}`) ? "群聊协作与执行成员派发" : "",
        /delete|remove|清理|删除|manage/i.test(`${pending?.name || ""} ${input.run.user_message}`) ? "系统管理与数据状态" : "",
      ].filter(Boolean);
  if (!areas.length) areas.push("当前请求涉及的系统状态和执行结果");
  const requiresConfirmation = input.requiresConfirmation === true;
  const generatedAt = nowIso();
  const planMode = {
    schema: "ccm-global-main-agent-plan-mode-v1",
    title: "执行前计划",
    mode: "cc-style-plan-mode",
    source: "global-main-agent-plan-mode-v1",
    requirement: compactGlobalUserSummaryText(input.run.original_user_message || input.run.user_message, "本轮全局任务", 520),
    action: toolLabel,
    steps: buildGlobalPlanSteps(input.decision, pending?.name || ""),
    risk: {
      level: riskLevel,
      summary: requiresConfirmation
        ? `${toolLabel}需要你确认后才会执行。`
        : `${toolLabel}会在当前授权范围内继续执行。`,
      reasons: [
        input.risk === "high" ? "高风险操作" : input.risk === "write" ? "会改变系统状态" : "只读或低风险动作",
        compactGlobalUserSummaryText(intent.reason || input.decision.message, "我已形成执行判断。", 180),
      ],
    },
    impact_scope: {
      projects,
      areas,
      multi_agent: ["orchestrate_development", "send_group_cmd", "create_task"].includes(String(pending?.name || "")),
    },
    read_only_exploration: {
      summary: input.run.steps.some(step => step.observation !== undefined)
        ? "已结合前序工具观察和当前上下文整理执行计划。"
        : "已根据当前消息和可用上下文整理执行计划。",
      projects,
      knowledge_used: input.run.steps.some(step => /knowledge|memory/i.test(String(step.tool?.name || ""))),
      code_snapshot_used: input.run.steps.some(step => /inspect_project|list_projects/i.test(String(step.tool?.name || ""))),
    },
    acceptance: [
      "执行后必须检查工具返回结果，不能把已派发当成已完成。",
      "涉及执行成员或项目改动时，最终总结必须说明完成内容、验证结果、风险和下一步。",
      "底层参数、Trace 和原始执行记录默认只放在技术详情里。",
    ],
    permission_boundaries: requiresConfirmation
      ? ["确认前不会执行这一步写入或高风险操作。", "取消后本次操作会停止，不继续产生该写入影响。"]
      : ["只在当前用户请求和已授权范围内执行。", "高风险或未授权写入仍会再次等待用户确认。"],
    requires_confirmation: requiresConfirmation,
    auto_continue: !requiresConfirmation,
    confirmation_status: input.confirmationStatus || (requiresConfirmation ? "awaiting_confirmation" : "auto_continue"),
    next_step: requiresConfirmation ? "等待你确认执行前计划；确认后继续执行并总结。" : "继续执行计划，并在完成后给出总结。",
    display_policy: {
      user_text_first: true,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
      show_for_ordinary_conversation: false,
    },
    generated_at: generatedAt,
  };
  return requiresConfirmation
    ? planMode
    : { ...planMode, plan_execution_followup: buildGlobalPlanExecutionFollowup(planMode, generatedAt) };
}

export function updateGlobalPlanModeStatus(planMode: any, status: "confirmed" | "completed" | "cancelled" | "failed", at: string, feedback = "") {
  if (!planMode) return planMode;
  const terminal = ["completed", "cancelled", "failed"].includes(status);
  const acceptedFeedback = status === "confirmed"
    ? compactGlobalUserSummaryText(feedback, "", 720)
    : compactGlobalUserSummaryText(planMode.accepted_feedback || planMode.acceptedFeedback || planMode.last_accept_feedback || "", "", 720);
  const acceptedFeedbackHistory = acceptedFeedback && status === "confirmed"
    ? [
        ...(Array.isArray(planMode.accepted_feedback_history) ? planMode.accepted_feedback_history : []),
        { feedback: acceptedFeedback, at, status: "accepted" },
      ].slice(-10)
    : Array.isArray(planMode.accepted_feedback_history) ? planMode.accepted_feedback_history : [];
  const acceptance = Array.isArray(planMode.acceptance) ? planMode.acceptance : [];
  return {
    ...planMode,
    requires_confirmation: status === "confirmed" ? false : planMode.requires_confirmation === true && !terminal,
    auto_continue: status === "confirmed" ? true : planMode.auto_continue,
    confirmation_status: status === "confirmed" ? "confirmed" : status,
    accepted_at: status === "confirmed" ? at : planMode.accepted_at || "",
    confirmed_at: status === "confirmed" ? at : planMode.confirmed_at || "",
    accepted_feedback: acceptedFeedback,
    acceptedFeedback,
    last_accept_feedback: acceptedFeedback,
    accepted_feedback_history: acceptedFeedbackHistory,
    acceptance: status === "confirmed" && acceptedFeedback
      ? uniqueGlobalStrings([...acceptance, `执行时纳入用户补充要求：${acceptedFeedback}`]).slice(0, 8)
      : acceptance,
    completed_at: terminal ? at : planMode.completed_at || "",
    next_step: status === "confirmed"
      ? acceptedFeedback
        ? "计划已确认，我会带着补充要求继续执行并总结结果。"
        : "计划已确认，我会继续执行并总结结果。"
      : status === "completed"
        ? "计划已执行完成，可以查看最终总结和技术详情。"
        : status === "cancelled"
          ? "计划已取消；需要继续时可以重新发起或调整需求。"
          : status === "failed"
            ? "计划未完整完成，失败原因已整理到总结和技术详情。"
            : planMode.next_step,
    steps: Array.isArray(planMode.steps) ? planMode.steps.map((step: any, index: number) => ({
      ...step,
      status: status === "confirmed" ? (index === 0 ? "completed" : index === 1 ? "in_progress" : step.status || "pending") : terminal ? status : step.status,
    })) : planMode.steps,
    plan_execution_followup: status === "confirmed"
      ? buildGlobalPlanExecutionFollowup(planMode, at, acceptedFeedback)
      : planMode.plan_execution_followup || planMode.planExecutionFollowup || null,
  };
}


export const GLOBAL_DISPATCH_VISIBLE_TEXT_PATTERN = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|WorkerContextPacket|task-notification|receipt[-_\s]*status|trace_id|session_id|run_id|native_session|task_agent_session|raw[_\s-]*payload|raw[_\s-]*receipt|scratchpad|Runtime Kernel|Trace Replay|回执要求/i;

export function sanitizeGlobalDispatchVisibleText(value: any, fallback = "派发信息已整理，技术细节已放入技术详情。", max = 260) {
  let text = String(value || "").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return sanitizeMainAgentRoleLanguage(fallback);
  if (GLOBAL_DISPATCH_VISIBLE_TEXT_PATTERN.test(text)) return sanitizeMainAgentRoleLanguage(fallback);
  text = sanitizeMainAgentUserFacingText(text.replace(/结构化完成信息/g, "结构化结果说明")).trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function normalizeDispatchDependency(item: any) {
  const text = typeof item === "string" ? item : item?.project || item?.agent || item?.name || item?.target || item?.reason || "";
  return sanitizeGlobalDispatchVisibleText(text, "", 90);
}

export function buildGlobalDispatchRow(input: {
  id: string;
  kind: string;
  agent: string;
  role: string;
  task: string;
  reason: string;
  status?: string;
  statusLabel?: string;
  dependsOn?: any[];
}) {
  const agent = sanitizeGlobalDispatchVisibleText(input.agent, "", 90);
  const task = sanitizeGlobalDispatchVisibleText(input.task, "", 220);
  if (!agent || !task) return null;
  return {
    id: sanitizeGlobalDispatchVisibleText(input.id || `${input.kind}:${agent}:${task}`, `${input.kind}:${agent}`, 120),
    kind: input.kind,
    agent,
    role: sanitizeGlobalDispatchVisibleText(input.role, "执行成员", 80),
    task,
    reason: sanitizeGlobalDispatchVisibleText(input.reason, "我已根据当前目标整理派发。", 180),
    depends_on: (input.dependsOn || []).map(normalizeDispatchDependency).filter(Boolean).slice(0, 4),
    status: input.status || "dispatched",
    status_label: input.statusLabel || "已派发",
  };
}

export function isGlobalDispatchTool(name: any) {
  return GLOBAL_DISPATCH_TOOL_NAMES.includes(String(name || ""));
}

export function normalizeGlobalDispatchLaunchRowStatus(target: any = {}, fallback = "dispatched") {
  if (target?.queued === true) return { status: "queued", label: "已入队" };
  const raw = String(target?.status || fallback || "").toLowerCase();
  if (["done", "completed", "complete", "success", "succeeded", "ok"].includes(raw)) {
    return { status: "reviewing", label: "已回传结果，待验收" };
  }
  if (["running", "in_progress", "executing"].includes(raw)) return { status: "running", label: "执行中" };
  if (["failed", "error", "blocked"].includes(raw)) return { status: "failed", label: "待排查" };
  return { status: raw || "dispatched", label: "已派发" };
}

export function buildGlobalDispatchLaunchSummary(run: GlobalAgentRun, status: GlobalAgentRunStatus, stepsOverride?: any[]) {
  const rows: any[] = [];
  const dispatchSteps = (stepsOverride || run.steps).filter(step => isGlobalDispatchTool(step.tool?.name));
  for (const step of dispatchSteps) {
    const toolName = String(step.tool?.name || "");
    const args = step.tool?.arguments || {};
    const observation = step.observation || {};
    const baseTask = args.message || args.prompt || args.command || args.business_goal || args.goal || args.title || run.original_user_message || run.user_message;
    if (toolName === "orchestrate_development") {
      const targets = Array.isArray(args.targets) && args.targets.length
        ? args.targets
        : Array.isArray(observation.children)
          ? observation.children.map((child: any) => ({ type: child.type || "project", project: child.target || child.project || child.name || child.task_id, status: child.status, queued: child.queued }))
          : [];
      targets.forEach((target: any, index: number) => {
        const targetType = String(target.type || target.target_type || (target.group_id || target.groupId ? "group" : "project")).toLowerCase();
        const agent = target.name || target.project || target.group_id || target.groupId || target.id || target.target || `target-${index + 1}`;
        const rowStatus = normalizeGlobalDispatchLaunchRowStatus(target);
        const row = buildGlobalDispatchRow({
          id: `global-dispatch-${toolName}-${index}-${agent}`,
          kind: targetType === "group" ? "group" : "project",
          agent,
          role: targetType === "group" ? "协作群" : "项目执行成员",
          task: target.task || target.message || baseTask,
          reason: target.reason || "我已创建跨项目开发任务，并交给对应执行目标处理。",
          status: rowStatus.status,
          statusLabel: rowStatus.label,
          dependsOn: target.depends_on || target.dependsOn || target.dependencies || [],
        });
        if (row) rows.push(row);
      });
    } else if (toolName === "send_group_cmd" || toolName === "create_task") {
      const groupId = args.group_id || args.groupId || args.id || "目标群聊";
      const row = buildGlobalDispatchRow({
        id: `global-dispatch-${toolName}-${groupId}`,
        kind: "group",
        agent: groupId,
        role: "协作群",
        task: baseTask,
        reason: toolName === "create_task"
          ? "我已创建协作任务，并交给协作群跟踪执行。"
          : "我判断该需求需要协作群接管并继续拆分执行。",
        status: "dispatched",
        statusLabel: observation.taskId || observation.task?.id ? "已进入任务链路" : "已派发",
      });
      if (row) rows.push(row);
    } else if (toolName === "send_project_cmd") {
      const project = args.project || args.projectName || "目标项目";
      const row = buildGlobalDispatchRow({
        id: `global-dispatch-${toolName}-${project}`,
        kind: "project",
        agent: project,
        role: "项目执行成员",
        task: baseTask,
        reason: "我判断该需求适合由这个项目的执行成员直接处理。",
        status: run.supervisor_id ? "running" : status === "completed" ? "reviewing" : "dispatched",
        statusLabel: run.supervisor_id ? "已进入持续监督" : status === "completed" ? "已回传结果，待验收" : "已派发",
      });
      if (row) rows.push(row);
    }
  }
  const uniqueRows = rows.filter((row, index, arr) => arr.findIndex(item => item.id === row.id) === index).slice(0, 8);
  if (!uniqueRows.length) return null;
  const agents = uniqueRows.map(row => row.agent).slice(0, 4).join("、");
  const hasAcceptedGroupDispatch = uniqueRows.some(row => row.kind === "group" && ["send_group_cmd", "create_task"].some(name => row.id.includes(name)));
  const showWhenPlanArchived = status === "supervising" || hasAcceptedGroupDispatch;
  return {
    schema: "ccm-main-agent-dispatch-launch-summary-v1",
    source: "global-agent-direct-dispatch",
    title: "已派发的工作",
    count_label: `${uniqueRows.length} 个执行目标`,
    headline: `我已把这次需求交给 ${uniqueRows.length} 个执行目标：${agents}。`,
    rows: uniqueRows,
    acceptance: [
      "下游执行目标需要给出用户能看懂的处理结果、验证情况和风险。",
      "我会继续区分已派发、执行中和最终完成，不能把派发当成交付。",
    ],
    next_action: status === "supervising"
      ? "等待下游任务卡更新执行、验收和最终总结。"
      : hasAcceptedGroupDispatch
        ? "后续进度以群聊任务卡的计划、执行和最终总结为准。"
        : "查看执行结果和验证结论；如有风险，按下一步建议继续处理。",
    technical_hint: "全局运行 ID、Trace、原始工作单和底层执行记录默认收在技术详情里。",
    display_policy: {
      user_text_first: true,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
      show_for_ordinary_conversation: false,
      show_when_plan_archived: showWhenPlanArchived,
    },
  };
}

