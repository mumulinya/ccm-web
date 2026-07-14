"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GLOBAL_AGENT_TOOL_SPECS = void 0;
exports.buildGlobalVisibleReplyContent = buildGlobalVisibleReplyContent;
exports.buildGlobalClarificationSummary = buildGlobalClarificationSummary;
exports.buildGlobalConfirmationSummary = buildGlobalConfirmationSummary;
exports.getGlobalAgentRun = getGlobalAgentRun;
exports.attachGlobalAgentRunSupervision = attachGlobalAgentRunSupervision;
exports.completeGlobalAgentSupervision = completeGlobalAgentSupervision;
exports.updateGlobalAgentSupervisionState = updateGlobalAgentSupervisionState;
exports.listGlobalAgentRuns = listGlobalAgentRuns;
exports.findWaitingGlobalAgentRun = findWaitingGlobalAgentRun;
exports.findClarifyingGlobalAgentRun = findClarifyingGlobalAgentRun;
exports.getGlobalAgentToolSpec = getGlobalAgentToolSpec;
exports.classifyGlobalAgentToolRisk = classifyGlobalAgentToolRisk;
exports.parseGlobalAgentDecision = parseGlobalAgentDecision;
exports.classifyGlobalAgentUserSteer = classifyGlobalAgentUserSteer;
exports.steerGlobalAgentRun = steerGlobalAgentRun;
exports.applyGlobalAgentSupervisionSteer = applyGlobalAgentSupervisionSteer;
exports.startGlobalAgentRun = startGlobalAgentRun;
exports.resumeGlobalAgentRun = resumeGlobalAgentRun;
exports.continueGlobalAgentRunWithClarification = continueGlobalAgentRunWithClarification;
exports.pauseGlobalAgentRun = pauseGlobalAgentRun;
exports.cancelGlobalAgentRun = cancelGlobalAgentRun;
exports.recoverInterruptedGlobalAgentRuns = recoverInterruptedGlobalAgentRuns;
exports.runGlobalAgentLoopSelfTest = runGlobalAgentLoopSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const runtime_kernel_1 = require("../runtime-kernel");
const quality_center_1 = require("../quality-center");
const reasoning_loop_1 = require("../reasoning-loop");
const runtime_1 = require("./runtime");
const workchain_1 = require("../workchain");
const delivery_report_1 = require("../delivery-report");
const user_facing_text_1 = require("../user-facing-text");
const STORE_DIR = path.join(utils_1.CCM_DIR, "global-agent-runs");
const STORE_FILE = path.join(STORE_DIR, "runs.json");
const STORE_BACKUP = `${STORE_FILE}.bak`;
const MAX_STORED_RUNS = 120;
const MAX_OBSERVATION_CHARS = 12_000;
const GLOBAL_DISPATCH_TOOL_NAMES = ["orchestrate_development", "send_group_cmd", "send_project_cmd", "create_task"];
const activeRuns = new Set();
const pauseRequests = new Set();
const cancelRequests = new Set();
const volatileRuns = new Map();
const activeRunObjects = new Map();
exports.GLOBAL_AGENT_TOOL_SPECS = [
    { name: "inspect_system", description: "读取 CCM 服务、项目、群聊、任务、定时任务和执行器概况。", risk: "read" },
    { name: "list_projects", description: "列出真实项目及 Agent 配置。", risk: "read" },
    { name: "inspect_project", description: "读取指定项目配置、目录结构和项目记忆。", required: ["project"], risk: "read" },
    { name: "list_groups", description: "列出群聊、成员项目及协调配置。", risk: "read" },
    { name: "list_tasks", description: "查询开发任务；可按 id 或 status 过滤。", risk: "read" },
    { name: "list_cron", description: "查询定时任务。", risk: "read" },
    { name: "query_knowledge", description: "查询本地知识库，只用于获取回答或规划依据。", required: ["query"], risk: "read" },
    { name: "query_global_memory", description: "查询全局 Agent 的长期记忆、历史任务结论和来源引用。", required: ["query"], risk: "read" },
    { name: "manage_global_memory", description: "查询状态、压缩、重建、启用或禁用全局 Agent 长期记忆；变更操作必须提供 reason。", required: ["operation"], risk: args => String(args?.operation || "").toLowerCase() === "status" ? "read" : ["disable", "rebuild"].includes(String(args?.operation || "").toLowerCase()) ? "high" : "write" },
    { name: "inspect_mission", description: "查询全局开发任务及子任务交付状态。", required: ["id"], risk: "read" },
    { name: "inspect_supervision", description: "查询长期任务跟进、恢复动作、交付验收和等待人工事项。", required: ["id"], risk: "read" },
    { name: "orchestrate_development", description: "创建跨项目开发任务并持久派发给真实群聊或项目 Agent。", required: ["business_goal", "targets"], risk: "write" },
    { name: "manage_supervision", description: "暂停、恢复、立即检查、修改目标、取消、归档或人工接管长期任务跟进。", required: ["id", "operation"], risk: args => ["cancel", "archive"].includes(String(args?.operation || "").toLowerCase()) ? "high" : "write" },
    { name: "create_task", description: "创建并派发单群聊开发任务。", required: ["title", "business_goal", "group_id"], risk: "write" },
    { name: "send_project_cmd", description: "把单项目需求交给该项目所属的群聊主 Agent，由其计划、派发项目子 Agent、验收并调用 TestAgent。", required: ["project", "message"], risk: "write" },
    { name: "send_group_cmd", description: "向指定群聊主 Agent 下发协作任务。", required: ["group_id", "message"], risk: "write" },
    { name: "manage_cron", description: "管理定时任务。", required: ["operation"], risk: args => destructiveOperation(args) ? "high" : "write" },
    { name: "manage_group", description: "管理群聊和成员。", required: ["operation"], risk: args => destructiveOperation(args) ? "high" : "write" },
    { name: "manage_project", description: "管理项目及其 Agent 进程。", required: ["operation"], risk: args => destructiveOperation(args) ? "high" : "write" },
    { name: "manage_task", description: "暂停、恢复、续跑、重试、排队或删除任务。", required: ["operation"], risk: args => destructiveOperation(args) ? "high" : "write" },
    { name: "manage_tool", description: "管理 MCP 和 Skill。", required: ["operation"], risk: args => destructiveOperation(args) ? "high" : "write" },
    { name: "git_review", description: "读取并审查指定项目的 Git 变更。", required: ["project"], risk: "read" },
    { name: "git_commit", description: "提交指定项目的代码变更。", required: ["project"], risk: "write" },
    { name: "create_template", description: "创建全局对话模板。", required: ["name", "content"], risk: "write" },
    { name: "play_music", description: "搜索并播放音乐。", required: ["keyword"], risk: "write" },
    { name: "toggle_pet", description: "打开或关闭桌面宠物。", required: ["action"], risk: "write" },
    { name: "create_pet_from_image", description: "使用本次消息上传的参考图片创建动作齐全的 Codex v2 宠物皮肤。reference_path 必须是本次上传附件的本地路径；生成是持久化异步任务。", required: ["reference_path"], risk: "write" },
    { name: "navigate", description: "通知 Web 客户端切换页面；不改变项目数据。", required: ["tab"], risk: "read" },
];
function destructiveOperation(args) {
    return ["delete", "remove", "remove_member", "purge", "drop"].includes(String(args?.operation || "").toLowerCase());
}
function nowIso(runtime) {
    return new Date(runtime?.now ? runtime.now() : Date.now()).toISOString();
}
function stripNonExecutionReportSections(value) {
    return String(value || "")
        .replace(/\n*验证\/证据\s*[:：][\s\S]*?(?=\n+\s*(?:风险|下一步)\s*[:：]|$)/g, "")
        .replace(/\n*风险\s*[:：][\s\S]*?(?=\n+\s*下一步\s*[:：]|$)/g, "")
        .replace(/\n*下一步\s*[:：][^\n]*(?:\n|$)/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
const GLOBAL_USER_SUMMARY_INTERNAL_PATTERN = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|<\s*\/?\s*task-notification|task-notification|receipt[-_\s]*status|trace_id|session_id|run_id|WorkerContextPacket|raw[_\s-]*payload|raw[_\s-]*receipt|raw_report|Runtime Kernel|workflow_timeline|native_session|task_agent_session|scratchpad|execution_lease|workchain|shouldDelegate|Trace Replay|回执要求/i;
const GLOBAL_USER_SUMMARY_TECHNICAL_EVIDENCE_PATTERN = /(?:[A-Za-z]:[\\/][^\r\n]*(?:test-agent-artifacts|artifact-manifest\.json|report\.md|report\.json|verdict\.json))|(?:test-agent-artifacts|artifact-manifest\.json|verdict\.json|raw[_\s-]*stack|stack\s+trace)/i;
function hasGlobalUserSummaryTechnicalDetails(value) {
    const text = String(value || "");
    return GLOBAL_USER_SUMMARY_INTERNAL_PATTERN.test(text) || GLOBAL_USER_SUMMARY_TECHNICAL_EVIDENCE_PATTERN.test(text);
}
function compactGlobalUserSummaryText(value, fallback = "信息已整理。", max = 320) {
    const raw = String(value || "").replace(/\s+/g, " ").trim();
    const text = raw && !hasGlobalUserSummaryTechnicalDetails(raw) ? raw : fallback;
    const sanitized = (0, user_facing_text_1.sanitizeMainAgentUserFacingText)(text);
    return sanitized.length > max ? `${sanitized.slice(0, max)}...` : sanitized;
}
function uniqueGlobalStrings(values) {
    const seen = new Set();
    const rows = [];
    for (const value of values || []) {
        const text = String(value || "").trim();
        if (!text || seen.has(text))
            continue;
        seen.add(text);
        rows.push(text);
    }
    return rows;
}
function sanitizeGlobalVisibleReplyTerminology(value) {
    return (0, user_facing_text_1.sanitizeMainAgentUserFacingText)(String(value || "")
        .replace(/\bCoordinator\b/g, "我")
        .replace(/\bPipeline\b/g, "协作看板")
        .replace(/\bRuntime Kernel\b/g, "技术运行信息")
        .replace(/\bTrace Replay\b/g, "技术回放"));
}
function globalVisibleReplyFallback(status) {
    if (status === "failed")
        return "这次处理没有完成；原因和排障信息已放在技术详情里。";
    if (status === "cancelled")
        return "本次处理已停止，不会继续执行。";
    if (status === "supervising")
        return "已受理并进入持续跟踪；最终交付通过验收后，我会再给你完整总结。";
    return "我已整理处理结果，技术细节已放入技术详情。";
}
function buildGlobalVisibleReplyContent(input = {}) {
    const max = Math.max(80, Number(input.max || 8000));
    const fallback = input.fallback || globalVisibleReplyFallback(input.status);
    const rawVisible = String(input.value || "").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
    const rawSource = String(input.rawSource === undefined ? input.value || "" : input.rawSource || "").replace(/\r/g, "").trim();
    let text = rawVisible || fallback;
    const hiddenForProtocol = hasGlobalUserSummaryTechnicalDetails(text);
    if (hiddenForProtocol)
        text = fallback;
    text = sanitizeGlobalVisibleReplyTerminology(text).trim() || fallback;
    if (text.length > max)
        text = `${text.slice(0, max)}...`;
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
function attachGlobalReplyTechnicalContent(target, content) {
    const text = String(content || "").trim();
    if (!target || !text)
        return;
    target.technical_content = text;
    target.technicalContent = text;
    if (!Array.isArray(target.technical_details))
        target.technical_details = [];
    let section = target.technical_details.find((item) => item?.id === "raw_global_reply");
    if (!section) {
        section = { id: "raw_global_reply", title: "原始回复", items: [] };
        target.technical_details.push(section);
    }
    if (!Array.isArray(section.items))
        section.items = [];
    if (!section.items.some((item) => item?.label === "原始回复")) {
        section.items.push({ label: "原始回复", value: text.slice(0, 1600) });
    }
}
function getGlobalToolUserLabel(toolName) {
    const labels = {
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
        toggle_pet: "控制桌面宠物",
        create_pet_from_image: "根据参考图创建宠物",
        navigate: "切换页面",
    };
    return labels[String(toolName || "").trim()] || String(toolName || "工具操作");
}
function summarizeGlobalToolTarget(args = {}) {
    const target = args.project || args.projectName || args.group_id || args.groupId || args.task_id || args.taskId || args.id || args.name || args.title || args.operation || "";
    return compactGlobalUserSummaryText(target, "目标将在技术详情中保留。", 120);
}
function buildGlobalClarificationSummary(input) {
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
function buildGlobalConfirmationSummary(input) {
    const pending = input.pendingTool || input.run.pending_tool || null;
    const action = getGlobalToolUserLabel(String(pending?.name || ""));
    const riskLabel = pending?.risk === "high" ? "高风险操作" : pending?.risk === "write" ? "写入操作" : "需要确认";
    const target = summarizeGlobalToolTarget(pending?.arguments || {});
    const reason = compactGlobalUserSummaryText(input.decision?.intent?.reason || input.reply || input.run.final_reply, "这一步可能改变系统状态，需要你确认后才会继续。", 360);
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
function buildGlobalPlanSteps(decision, toolName = "") {
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
function buildGlobalPlanExecutionFollowup(planMode = {}, at = nowIso(), feedback = "") {
    const toolLabel = compactGlobalUserSummaryText(planMode.action || "", "", 120);
    const acceptedFeedback = compactGlobalUserSummaryText(feedback || planMode.accepted_feedback || planMode.acceptedFeedback || "", "", 320);
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
function buildGlobalPlanModeSummary(input) {
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
    if (!areas.length)
        areas.push("当前请求涉及的系统状态和执行结果");
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
function updateGlobalPlanModeStatus(planMode, status, at, feedback = "") {
    if (!planMode)
        return planMode;
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
        steps: Array.isArray(planMode.steps) ? planMode.steps.map((step, index) => ({
            ...step,
            status: status === "confirmed" ? (index === 0 ? "completed" : index === 1 ? "in_progress" : step.status || "pending") : terminal ? status : step.status,
        })) : planMode.steps,
        plan_execution_followup: status === "confirmed"
            ? buildGlobalPlanExecutionFollowup(planMode, at, acceptedFeedback)
            : planMode.plan_execution_followup || planMode.planExecutionFollowup || null,
    };
}
function writeJsonAtomic(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.${crypto.randomBytes(2).toString("hex")}.tmp`;
    if (fs.existsSync(file)) {
        try {
            fs.copyFileSync(file, `${file}.bak`);
        }
        catch { }
    }
    fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
    fs.renameSync(temp, file);
}
function normalizeGlobalAgentUserSteer(value) {
    const message = String(value?.message || "").trim().slice(0, 8_000);
    if (!message)
        return null;
    const kind = String(value?.kind || "") === "revise_goal" ? "revise_goal" : "supplement";
    const status = String(value?.status || "") === "applied" ? "applied" : "queued";
    return {
        id: String(value?.id || `steer_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`),
        message,
        kind,
        source: String(value?.source || "user").trim().slice(0, 120) || "user",
        request_id: String(value?.request_id || value?.requestId || "").trim().slice(0, 160) || undefined,
        at: String(value?.at || new Date().toISOString()),
        status,
        applied_at: status === "applied" ? String(value?.applied_at || value?.appliedAt || value?.at || new Date().toISOString()) : undefined,
        authorization_preserved: value?.authorization_preserved === true || value?.authorizationPreserved === true,
    };
}
function normalizeGlobalAgentUserSteers(value, status, limit = 30) {
    return (Array.isArray(value) ? value : [])
        .map(normalizeGlobalAgentUserSteer)
        .filter((item) => !!item && (!status || item.status === status))
        .slice(-limit);
}
function normalizeRun(run) {
    const pendingUserMessages = normalizeGlobalAgentUserSteers(run?.pending_user_messages || run?.pendingUserMessages, "queued", 20);
    const userSteerHistory = normalizeGlobalAgentUserSteers(run?.user_steer_history || run?.userSteerHistory, undefined, 40);
    const lastUserSteer = normalizeGlobalAgentUserSteer(run?.last_user_steer || run?.lastUserSteer);
    return {
        version: 1,
        id: String(run?.id || ""),
        trace_id: (0, reliability_ledger_1.ensureTraceId)(run?.trace_id, "global-agent"),
        session_id: String(run?.session_id || "default"),
        source: String(run?.source || "web"),
        user_message: String(run?.user_message || "").slice(0, 50_000),
        history: Array.isArray(run?.history) ? run.history.slice(-12).map((item) => ({ role: item.role === "assistant" ? "assistant" : "user", content: String(item.content || "").slice(0, 8_000) })) : [],
        status: (["running", "supervising", "paused", "waiting_confirmation", "waiting_clarification", "completed", "failed", "cancelled"].includes(run?.status) ? run.status : "failed"),
        phase: (["answer", "investigate", "plan", "execute", "needs_confirmation", "complete"].includes(run?.phase) ? run.phase : "plan"),
        explicit_write_authorization: run?.explicit_write_authorization === true,
        created_at: run?.created_at || new Date().toISOString(),
        updated_at: run?.updated_at || new Date().toISOString(),
        started_at: run?.started_at || run?.created_at || new Date().toISOString(),
        completed_at: run?.completed_at,
        deadline_at: run?.deadline_at || new Date(Date.now() + 10 * 60_000).toISOString(),
        max_steps: Math.max(1, Math.min(16, Number(run?.max_steps || 8))),
        steps: Array.isArray(run?.steps) ? run.steps.slice(-32) : [],
        pending_tool: run?.pending_tool || null,
        approved_tool_signatures: Array.isArray(run?.approved_tool_signatures) ? run.approved_tool_signatures.slice(-20) : [],
        final_reply: String(run?.final_reply || ""),
        error: String(run?.error || ""),
        resume_count: Number(run?.resume_count || 0),
        model_calls: Number(run?.model_calls || 0),
        tool_calls: Number(run?.tool_calls || 0),
        consecutive_failures: Number(run?.consecutive_failures || 0),
        client_effects: Array.isArray(run?.client_effects) ? run.client_effects.slice(-20) : [],
        mission_id: String(run?.mission_id || ""),
        supervisor_id: String(run?.supervisor_id || ""),
        supervision_state: String(run?.supervision_state || ""),
        final_delivery_report: run?.final_delivery_report || null,
        final_report: run?.final_report || null,
        display_stream: run?.display_stream || null,
        workchain: run?.workchain || null,
        todo_plan: run?.todo_plan || run?.todoPlan || run?.workchain?.todo_plan || run?.workchain?.todoPlan || null,
        todoPlan: run?.todoPlan || run?.todo_plan || run?.workchain?.todoPlan || run?.workchain?.todo_plan || null,
        test_agent_execution_plan: run?.test_agent_execution_plan || run?.testAgentExecutionPlan || null,
        testAgentExecutionPlan: run?.testAgentExecutionPlan || run?.test_agent_execution_plan || null,
        test_agent_execution_plan_summary: run?.test_agent_execution_plan_summary || run?.testAgentExecutionPlanSummary || null,
        testAgentExecutionPlanSummary: run?.testAgentExecutionPlanSummary || run?.test_agent_execution_plan_summary || null,
        test_agent_execution_plan_detail: String(run?.test_agent_execution_plan_detail || run?.testAgentExecutionPlanDetail || ""),
        testAgentExecutionPlanDetail: String(run?.testAgentExecutionPlanDetail || run?.test_agent_execution_plan_detail || ""),
        test_agent_review_summary: run?.test_agent_review_summary || run?.testAgentReviewSummary || run?.independent_review_summary || run?.independentReviewSummary || null,
        testAgentReviewSummary: run?.testAgentReviewSummary || run?.test_agent_review_summary || run?.independentReviewSummary || run?.independent_review_summary || null,
        independent_review_summary: run?.independent_review_summary || run?.independentReviewSummary || run?.test_agent_review_summary || run?.testAgentReviewSummary || null,
        independentReviewSummary: run?.independentReviewSummary || run?.independent_review_summary || run?.testAgentReviewSummary || run?.test_agent_review_summary || null,
        independent_review: Array.isArray(run?.independent_review) ? run.independent_review : Array.isArray(run?.independentReview) ? run.independentReview : [],
        independentReview: Array.isArray(run?.independentReview) ? run.independentReview : Array.isArray(run?.independent_review) ? run.independent_review : [],
        test_agent_report: run?.test_agent_report || run?.testAgentReport || null,
        testAgentReport: run?.testAgentReport || run?.test_agent_report || null,
        decision_summary: run?.decision_summary || null,
        clarification_question: String(run?.clarification_question || ""),
        clarification_summary: run?.clarification_summary || run?.clarificationSummary || null,
        confirmation_summary: run?.confirmation_summary || run?.confirmationSummary || null,
        plan_mode: run?.plan_mode || run?.planMode || null,
        plan_accept_feedback: String(run?.plan_accept_feedback || run?.planAcceptFeedback || ""),
        last_plan_accept_feedback: String(run?.last_plan_accept_feedback || run?.lastPlanAcceptFeedback || ""),
        last_plan_accept_feedback_at: String(run?.last_plan_accept_feedback_at || run?.lastPlanAcceptFeedbackAt || ""),
        resume_feedback: String(run?.resume_feedback || run?.resumeFeedback || ""),
        resumeFeedback: String(run?.resumeFeedback || run?.resume_feedback || ""),
        last_resume_feedback: String(run?.last_resume_feedback || run?.lastResumeFeedback || ""),
        lastResumeFeedback: String(run?.lastResumeFeedback || run?.last_resume_feedback || ""),
        last_resume_feedback_at: String(run?.last_resume_feedback_at || run?.lastResumeFeedbackAt || ""),
        lastResumeFeedbackAt: String(run?.lastResumeFeedbackAt || run?.last_resume_feedback_at || ""),
        resume_feedback_history: Array.isArray(run?.resume_feedback_history) ? run.resume_feedback_history.slice(-20) : Array.isArray(run?.resumeFeedbackHistory) ? run.resumeFeedbackHistory.slice(-20) : [],
        resumeFeedbackHistory: Array.isArray(run?.resumeFeedbackHistory) ? run.resumeFeedbackHistory.slice(-20) : Array.isArray(run?.resume_feedback_history) ? run.resume_feedback_history.slice(-20) : [],
        pending_user_messages: pendingUserMessages,
        pendingUserMessages,
        user_steer_history: userSteerHistory,
        userSteerHistory,
        last_user_steer: lastUserSteer,
        lastUserSteer,
        shadow_mode: run?.shadow_mode === true,
        original_user_message: String(run?.original_user_message || run?.user_message || "").slice(0, 50_000),
        reasoning_loop: (0, reasoning_loop_1.normalizeAgentReasoningState)(run?.reasoning_loop, run?.original_user_message || run?.user_message || ""),
    };
}
function loadStore() {
    for (const file of [STORE_FILE, STORE_BACKUP]) {
        try {
            if (!fs.existsSync(file))
                continue;
            const data = JSON.parse(fs.readFileSync(file, "utf-8"));
            return { version: 1, runs: (Array.isArray(data?.runs) ? data.runs : []).map(normalizeRun) };
        }
        catch { }
    }
    return { version: 1, runs: [] };
}
function saveRun(run, persist = true) {
    if (!persist) {
        volatileRuns.set(run.id, normalizeRun(run));
        if (volatileRuns.size > 50)
            volatileRuns.delete(volatileRuns.keys().next().value);
        return;
    }
    const store = loadStore();
    const index = store.runs.findIndex(item => item.id === run.id);
    if (index >= 0)
        store.runs[index] = normalizeRun(run);
    else
        store.runs.unshift(normalizeRun(run));
    store.runs = store.runs
        .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
        .slice(0, MAX_STORED_RUNS);
    writeJsonAtomic(STORE_FILE, store);
}
function getGlobalAgentRun(id) {
    return activeRunObjects.get(id) || volatileRuns.get(id) || loadStore().runs.find(run => run.id === id) || null;
}
function attachGlobalAgentRunSupervision(run, link) {
    run.mission_id = String(link.mission_id || "");
    run.supervisor_id = String(link.supervisor_id || "");
    run.supervision_state = String(link.state || "monitoring");
    run.updated_at = new Date().toISOString();
    saveRun(run, !volatileRuns.has(run.id));
    return run;
}
function completeGlobalAgentSupervision(id, report, outcome = "completed") {
    const stored = getGlobalAgentRun(id);
    if (!stored)
        return null;
    const run = normalizeRun(stored);
    const completedAt = new Date().toISOString();
    run.supervision_state = outcome;
    run.status = outcome;
    run.phase = outcome === "completed" ? "complete" : run.phase;
    const deliveryReport = (0, delivery_report_1.buildMainAgentDeliveryReport)({
        surface: "global",
        status: outcome,
        title: run.original_user_message || run.user_message || "全局任务",
        goal: run.original_user_message || run.user_message,
        detail: report?.formatted || report?.summary || "",
        run,
        report: report || {},
        summary: report || {},
        executed: true,
    });
    const finalReport = {
        ...(report || {}),
        summary: deliveryReport.headline,
        formatted: deliveryReport.markdown,
        user_text: deliveryReport.user_text,
        delivery_report: deliveryReport,
    };
    run.final_delivery_report = deliveryReport;
    run.final_report = finalReport;
    const workchain = buildGlobalRunWorkchain(run, outcome, deliveryReport.headline, finalReport);
    workchain.delivery_report = deliveryReport;
    if (workchain.completion_summary)
        workchain.completion_summary.delivery_report = deliveryReport;
    run.workchain = workchain;
    run.display_stream = buildGlobalDisplayStreamFromWorkchain(workchain);
    const visibleReply = buildGlobalVisibleReplyContent({
        value: (0, delivery_report_1.formatMainAgentDeliveryReply)(deliveryReport),
        rawSource: report?.formatted || report?.summary || deliveryReport.markdown || "",
        status: outcome,
        max: 8000,
    });
    if (visibleReply.technical_content) {
        attachGlobalReplyTechnicalContent(deliveryReport, visibleReply.technical_content);
        attachGlobalReplyTechnicalContent(finalReport, visibleReply.technical_content);
        attachGlobalReplyTechnicalContent(workchain, visibleReply.technical_content);
        attachGlobalReplyTechnicalContent(run.display_stream, visibleReply.technical_content);
    }
    if (visibleReply.hidden_visible_protocol) {
        deliveryReport.headline = visibleReply.text;
        deliveryReport.user_text = visibleReply.text;
        deliveryReport.markdown = visibleReply.text;
        finalReport.summary = visibleReply.text;
        finalReport.user_text = visibleReply.text;
        finalReport.formatted = visibleReply.text;
    }
    run.final_reply = visibleReply.text;
    run.error = outcome === "failed" ? String(report?.error || "mission_supervision_failed") : "";
    run.completed_at = completedAt;
    run.updated_at = completedAt;
    saveRun(run, !volatileRuns.has(id));
    (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:supervision:${outcome}:${completedAt}`, type: `global_agent.supervision_${outcome}`, status: outcome === "completed" ? "ok" : "warning", task_id: run.mission_id || "", message: run.final_reply.slice(0, 1000), data: report || {} });
    return run;
}
function globalSupervisionStateVisibleSummary(state) {
    const value = String(state || "monitoring").trim().toLowerCase();
    if (value === "waiting_user" || value === "needs_user" || value === "blocked") {
        return {
            status: "supervising",
            phase: "needs_confirmation",
            reply: "全局任务暂时等你处理一个阻塞点；这还不是完成结果。我会保留当前上下文，等阻塞解除后继续跟踪执行、验收和最终总结。",
            summary: "全局任务暂时等你处理一个阻塞点。",
            next_action: "请先处理子任务提示里的阻塞点；处理后我会继续监督返工、复核和最终总结。",
            timelineType: "global_agent.supervision_waiting_user",
            timelineStatus: "warning",
        };
    }
    if (/rework|reworking|repair|retry|返工|修复/.test(value)) {
        return {
            status: "supervising",
            phase: "execute",
            reply: "全局任务已进入返工跟踪；这还不是完成结果。我会继续盯住原实现成员修复、重新复核和最终交付总结。",
            summary: "全局任务正在按验收缺口返工。",
            next_action: "等待原实现成员修复缺口，并在修复后重新运行 TestAgent/独立复核。",
            timelineType: "global_agent.supervision_rework",
            timelineStatus: "info",
        };
    }
    if (value === "paused") {
        return {
            status: "paused",
            phase: "execute",
            reply: "全局任务已暂停；当前上下文和执行记录已保留。恢复后我会继续跟踪执行、验收和最终总结。",
            summary: "全局任务已暂停，等待恢复。",
            next_action: "需要继续时点恢复，我会从当前上下文接上。",
            timelineType: "global_agent.supervision_paused",
            timelineStatus: "warning",
        };
    }
    return {
        status: "supervising",
        phase: "execute",
        reply: "全局任务仍在持续跟踪；这还不是完成结果。等执行、验收和复核都通过后，我会给你最终交付总结。",
        summary: "全局任务正在持续跟踪执行和验收。",
        next_action: "继续等待子任务结果、验收和最终总结。",
        timelineType: "global_agent.supervision_monitoring",
        timelineStatus: "info",
    };
}
function updateGlobalAgentSupervisionState(id, state) {
    const stored = getGlobalAgentRun(id);
    if (!stored)
        return null;
    const run = normalizeRun(stored);
    run.supervision_state = String(state || run.supervision_state || "monitoring");
    const visible = globalSupervisionStateVisibleSummary(run.supervision_state);
    if (!["completed", "failed", "cancelled"].includes(run.status)) {
        run.status = visible.status;
        run.phase = visible.phase;
    }
    const needsReviewRework = /rework|reworking|repair|retry|返工|修复/.test(run.supervision_state);
    const report = {
        summary: visible.summary,
        next_action: visible.next_action,
        risks: visible.status === "paused" || run.supervision_state === "waiting_user" ? [visible.summary] : [],
        independent_review_required: needsReviewRework,
        independent_review_gate_passed: needsReviewRework ? false : undefined,
        independent_review_gate: needsReviewRework ? {
            required: true,
            status: "failed",
            failed_count: 1,
            failed_evidence: [{
                    reviewer: "TestAgent",
                    verdict: "failed",
                    summary: visible.summary,
                    evidence: [visible.next_action],
                }],
        } : undefined,
    };
    run.final_reply = visible.reply;
    run.final_report = { ...(run.final_report && typeof run.final_report === "object" ? run.final_report : {}), ...report };
    run.workchain = buildGlobalRunWorkchain(run, run.status, visible.reply, report);
    run.display_stream = buildGlobalDisplayStreamFromWorkchain(run.workchain);
    run.updated_at = new Date().toISOString();
    saveRun(run, !volatileRuns.has(id));
    (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "supervision_state", state: run.supervision_state, status: run.status, reply: run.final_reply });
    (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, {
        id: `${run.id}:supervision-state:${run.supervision_state}:${run.updated_at}`,
        type: visible.timelineType,
        status: visible.timelineStatus,
        task_id: run.mission_id || "",
        message: run.final_reply,
        data: { state: run.supervision_state, mission_id: run.mission_id, supervisor_id: run.supervisor_id },
    });
    return run;
}
function listGlobalAgentRuns(options = {}) {
    return loadStore().runs
        .filter(run => !options.sessionId || run.session_id === options.sessionId)
        .filter(run => !options.status || run.status === options.status)
        .slice(0, Math.max(1, Math.min(100, Number(options.limit || 30))));
}
function findWaitingGlobalAgentRun(sessionId) {
    return listGlobalAgentRuns({ sessionId, status: "waiting_confirmation", limit: 1 })[0] || null;
}
function findClarifyingGlobalAgentRun(sessionId, maxAgeMs = 30 * 60_000) {
    const run = listGlobalAgentRuns({ sessionId, status: "waiting_clarification", limit: 1 })[0] || null;
    if (!run)
        return null;
    return Date.now() - Date.parse(run.updated_at) <= maxAgeMs ? run : null;
}
function getGlobalAgentToolSpec(name) {
    return exports.GLOBAL_AGENT_TOOL_SPECS.find(item => item.name === name) || null;
}
function classifyGlobalAgentToolRisk(name, args) {
    const spec = getGlobalAgentToolSpec(name);
    if (!spec)
        throw new Error(`未知工具：${name}`);
    return typeof spec.risk === "function" ? spec.risk(args || {}) : spec.risk;
}
function isReadOnlyGlobalConsultation(run, status) {
    if (status !== "completed" || run.mission_id || run.decision_summary?.intent?.action_required === true)
        return false;
    const intentCategory = String(run.decision_summary?.intent?.category || "");
    if (["execution", "high_risk"].includes(intentCategory))
        return false;
    if (run.tool_calls === 0)
        return true;
    // A completed read query may use tools, but it is still a consultation rather
    // than a deliverable. Be conservative if a call was not recorded in the trace.
    const toolSteps = run.steps.filter(step => !!step.tool);
    return toolSteps.length >= run.tool_calls && toolSteps.every(step => step.tool?.risk === "read");
}
function stable(value) {
    if (Array.isArray(value))
        return value.map(stable);
    if (value && typeof value === "object")
        return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
    return value;
}
function toolSignature(name, args) {
    return crypto.createHash("sha256").update(`${name}:${JSON.stringify(stable(args || {}))}`).digest("hex").slice(0, 24);
}
function validateTool(name, args) {
    const spec = getGlobalAgentToolSpec(name);
    if (!spec)
        throw new Error(`模型选择了未注册工具：${name}`);
    const values = args && typeof args === "object" && !Array.isArray(args) ? args : {};
    const missing = (spec.required || []).filter(key => values[key] === undefined || values[key] === null || values[key] === "" || (Array.isArray(values[key]) && values[key].length === 0));
    if (missing.length)
        throw new Error(`${name} 缺少参数：${missing.join("、")}`);
    return values;
}
function compactObservation(value) {
    let text = "";
    try {
        text = JSON.stringify(value);
    }
    catch {
        text = String(value);
    }
    if (text.length <= MAX_OBSERVATION_CHARS)
        return value;
    return { truncated: true, preview: text.slice(0, MAX_OBSERVATION_CHARS), original_chars: text.length };
}
const GLOBAL_DISPATCH_VISIBLE_TEXT_PATTERN = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|WorkerContextPacket|task-notification|receipt[-_\s]*status|trace_id|session_id|run_id|native_session|task_agent_session|raw[_\s-]*payload|raw[_\s-]*receipt|scratchpad|Runtime Kernel|Trace Replay|回执要求/i;
function sanitizeGlobalDispatchVisibleText(value, fallback = "派发信息已整理，技术细节已放入技术详情。", max = 260) {
    let text = String(value || "").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
    if (!text)
        return (0, user_facing_text_1.sanitizeMainAgentRoleLanguage)(fallback);
    if (GLOBAL_DISPATCH_VISIBLE_TEXT_PATTERN.test(text))
        return (0, user_facing_text_1.sanitizeMainAgentRoleLanguage)(fallback);
    text = (0, user_facing_text_1.sanitizeMainAgentUserFacingText)(text.replace(/结构化完成信息/g, "结构化结果说明")).trim();
    return text.length > max ? `${text.slice(0, max)}...` : text;
}
function normalizeDispatchDependency(item) {
    const text = typeof item === "string" ? item : item?.project || item?.agent || item?.name || item?.target || item?.reason || "";
    return sanitizeGlobalDispatchVisibleText(text, "", 90);
}
function buildGlobalDispatchRow(input) {
    const agent = sanitizeGlobalDispatchVisibleText(input.agent, "", 90);
    const task = sanitizeGlobalDispatchVisibleText(input.task, "", 220);
    if (!agent || !task)
        return null;
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
function isGlobalDispatchTool(name) {
    return GLOBAL_DISPATCH_TOOL_NAMES.includes(String(name || ""));
}
function normalizeGlobalDispatchLaunchRowStatus(target = {}, fallback = "dispatched") {
    if (target?.queued === true)
        return { status: "queued", label: "已入队" };
    const raw = String(target?.status || fallback || "").toLowerCase();
    if (["done", "completed", "complete", "success", "succeeded", "ok"].includes(raw)) {
        return { status: "reviewing", label: "已回传结果，待验收" };
    }
    if (["running", "in_progress", "executing"].includes(raw))
        return { status: "running", label: "执行中" };
    if (["failed", "error", "blocked"].includes(raw))
        return { status: "failed", label: "待排查" };
    return { status: raw || "dispatched", label: "已派发" };
}
function buildGlobalDispatchLaunchSummary(run, status, stepsOverride) {
    const rows = [];
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
                    ? observation.children.map((child) => ({ type: child.type || "project", project: child.target || child.project || child.name || child.task_id, status: child.status, queued: child.queued }))
                    : [];
            targets.forEach((target, index) => {
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
                if (row)
                    rows.push(row);
            });
        }
        else if (toolName === "send_group_cmd" || toolName === "create_task") {
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
            if (row)
                rows.push(row);
        }
        else if (toolName === "send_project_cmd") {
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
            if (row)
                rows.push(row);
        }
    }
    const uniqueRows = rows.filter((row, index, arr) => arr.findIndex(item => item.id === row.id) === index).slice(0, 8);
    if (!uniqueRows.length)
        return null;
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
function emitGlobalDispatchLaunchProgress(runtime, run, step) {
    if (!isGlobalDispatchTool(step.tool?.name) || step.error || step.observation?.success === false || step.observation?.error)
        return;
    const dispatchLaunchSummary = buildGlobalDispatchLaunchSummary(run, run.status || "running", [...run.steps, step]);
    if (!dispatchLaunchSummary?.rows?.length)
        return;
    emit(runtime, {
        type: "dispatch_launch_summary",
        tool: step.tool,
        observation: step.observation,
        dispatch_launch_summary: dispatchLaunchSummary,
        dispatchLaunchSummary: dispatchLaunchSummary,
        progress_checkpoint: {
            schema: "ccm-main-agent-live-checkpoint-v1",
            id: `${run.id}:dispatch-launch:${step.index}`,
            label: dispatchLaunchSummary.title || "已派发的工作",
            detail: dispatchLaunchSummary.headline || "派发已发出，正在跟踪后续结果。",
            status: "done",
            phase: "dispatching",
            at: nowIso(runtime),
            run_id: run.id,
            source: "global-agent-dispatch-launch-summary",
        },
    }, run);
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
    return {
        state,
        message: String(value?.message || "").slice(0, 20_000),
        plan: Array.isArray(value?.plan) ? value.plan.map((item) => String(item).slice(0, 500)).slice(0, 12) : [],
        tool,
        intent: value?.intent && typeof value.intent === "object" ? value.intent : undefined,
        completion: rawCompletion ? {
            summary: String(rawCompletion.summary || ""),
            evidence: Array.isArray(rawCompletion.evidence) ? rawCompletion.evidence.map(compactItem).slice(0, 20) : [],
            risks: Array.isArray(rawCompletion.risks) ? rawCompletion.risks.map(compactItem).slice(0, 20) : [],
            next_action: String(rawCompletion.next_action || ""),
        } : undefined,
    };
}
function buildToolPrompt() {
    return (0, runtime_1.buildGlobalAgentToolDefinitions)(exports.GLOBAL_AGENT_TOOL_SPECS)
        .map(spec => `- ${spec.name}${spec.required?.length ? `（必填：${spec.required.join("、")}）` : ""}：${spec.description}；schema=${JSON.stringify(spec.inputSchema)}；risk=${spec.risk}`)
        .join("\n");
}
async function buildMessages(run, runtime) {
    const context = runtime.getContext ? await runtime.getContext(run) : {};
    (0, reasoning_loop_1.captureReasoningFacts)(run.reasoning_loop, "current_system_context", context);
    const priorSteps = run.steps.map(step => ({
        index: step.index,
        state: step.state,
        message: step.message,
        tool: step.tool ? { name: step.tool.name, arguments: step.tool.arguments, risk: step.tool.risk } : null,
        observation: step.observation,
        error: step.error,
    }));
    const system = `你是 CCM 全局 Agent 的决策内核。你不是关键词触发器，而是根据用户完整语义、真实系统上下文和工具观察结果决定下一步。

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
{"state":"investigate|plan|execute|needs_confirmation|answer|complete","message":"非终态写进度；终态写直接回答用户的完整内容","intent":{"category":"conversation|question|analysis|execution|high_risk|ambiguous","goal":"用户真实目标","action_required":false,"target_refs":[],"impact_scope":[],"confidence":0.95,"authorization_basis":"current_message|confirmation|none","reason":"判断依据"},"plan":["步骤"],"tool":{"name":"工具名","arguments":{}},"completion":{"summary":"结论","evidence":[],"risks":[],"next_action":""}}
不调用工具时 tool 必须为 null。`;
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
        },
        reasoning_loop: run.reasoning_loop,
        context,
        prior_steps: priorSteps,
    });
    return [
        { role: "system", content: system },
        ...run.history.slice(-10),
        { role: "user", content: `【用户当前目标】\n${run.reasoning_loop.effective_goal || run.user_message}\n\n【当前运行状态】\n${state}\n\n请决定下一步。` },
    ];
}
function emit(runtime, event, run) {
    try {
        runtime.onEvent?.({ ...event, run_id: run.id, trace_id: run.trace_id, status: run.status, phase: run.phase }, run);
    }
    catch { }
}
function classifyGlobalAgentUserSteer(message, requestedKind = "auto") {
    const requested = String(requestedKind || "auto").trim().toLowerCase();
    if (requested === "supplement" || requested === "revise_goal")
        return requested;
    const text = String(message || "").replace(/\s+/g, " ").trim();
    const revisesGoal = /(?:目标|范围|方案|方向|优先级|验收|交付).{0,12}(?:调整|改为|改成|变更|缩小|扩大|取消|替换)|(?:改为|改成|换成|只做|仅做|不要再|不再|先别|停止当前|忽略之前|重新开始|新任务|换个任务|另外一个任务)/i.test(text);
    return revisesGoal ? "revise_goal" : "supplement";
}
function buildGlobalAgentEffectiveGoal(run) {
    const applied = normalizeGlobalAgentUserSteers(run.user_steer_history || run.userSteerHistory, "applied", 16);
    return [
        run.original_user_message || run.user_message,
        ...applied.map(item => `${item.kind === "revise_goal" ? "执行中目标调整" : "执行中补充要求"}：${item.message}`),
    ].filter(Boolean).join("\n").slice(0, 50_000);
}
function steerGlobalAgentRun(id, message, options = {}) {
    const active = activeRunObjects.get(id);
    if (!active || !activeRuns.has(id) || active.status !== "running") {
        const stored = getGlobalAgentRun(id);
        if (!stored)
            throw new Error("全局 Agent 运行不存在");
        throw new Error("这次运行当前不在执行中；请使用继续、确认或新消息进入下一步");
    }
    const normalizedMessage = String(message || "").trim().slice(0, 8_000);
    if (!normalizedMessage)
        throw new Error("补充要求不能为空");
    const requestId = String(options.requestId || "").trim().slice(0, 160);
    const existing = requestId
        ? normalizeGlobalAgentUserSteers(active.user_steer_history || active.userSteerHistory, undefined, 40).find(item => item.request_id === requestId)
        : null;
    if (existing)
        return { run: active, steering: existing, duplicate: true };
    const kind = classifyGlobalAgentUserSteer(normalizedMessage, options.kind || "auto");
    const at = new Date().toISOString();
    const steering = {
        id: `steer_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`,
        message: normalizedMessage,
        kind,
        source: String(options.source || "user").trim().slice(0, 120) || "user",
        request_id: requestId || undefined,
        at,
        status: "queued",
        authorization_preserved: kind === "supplement" && active.explicit_write_authorization,
    };
    active.pending_user_messages = [...normalizeGlobalAgentUserSteers(active.pending_user_messages || active.pendingUserMessages, "queued", 19), steering];
    active.pendingUserMessages = active.pending_user_messages;
    active.user_steer_history = [...normalizeGlobalAgentUserSteers(active.user_steer_history || active.userSteerHistory, undefined, 39), steering];
    active.userSteerHistory = active.user_steer_history;
    active.last_user_steer = steering;
    active.lastUserSteer = steering;
    active.max_steps = Math.max(active.max_steps, Math.min(16, active.steps.length + 3));
    active.updated_at = at;
    saveRun(active, !volatileRuns.has(id));
    (0, runtime_1.recordGlobalAgentRuntimeOutput)(active, { type: "user_steer_queued", steering });
    (0, reliability_ledger_1.appendTraceEvent)(active.trace_id, {
        id: `${active.id}:user-steer-queued:${steering.id}`,
        type: "global_agent.user_steer_queued",
        status: "info",
        message: kind === "revise_goal" ? "执行中的目标调整已进入当前运行" : "执行中的补充要求已进入当前运行",
        data: { steering_id: steering.id, kind, source: steering.source, request_id: steering.request_id || "" },
    });
    return { run: active, steering, duplicate: false };
}
function applyGlobalAgentSupervisionSteer(id, message, options = {}) {
    const stored = getGlobalAgentRun(id);
    if (!stored)
        throw new Error("全局 Agent 运行不存在");
    if (!stored.supervisor_id || !["supervising", "paused"].includes(stored.status)) {
        throw new Error("这次运行当前不在持续跟进阶段");
    }
    const normalizedMessage = String(message || "").trim().slice(0, 8_000);
    if (!normalizedMessage)
        throw new Error("补充要求不能为空");
    const run = normalizeRun(stored);
    const requestId = String(options.requestId || "").trim().slice(0, 160);
    const existing = requestId
        ? normalizeGlobalAgentUserSteers(run.user_steer_history || run.userSteerHistory, undefined, 40).find(item => item.request_id === requestId)
        : null;
    if (existing)
        return { run, steering: existing, duplicate: true, applied: existing.status === "applied" };
    const kind = classifyGlobalAgentUserSteer(normalizedMessage, options.kind || "auto");
    const source = String(options.source || "global_supervision_steer").trim().slice(0, 120) || "global_supervision_steer";
    const at = new Date().toISOString();
    const steering = {
        id: `steer_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`,
        message: normalizedMessage,
        kind,
        source,
        request_id: requestId || undefined,
        at,
        status: "applied",
        applied_at: at,
        authorization_preserved: kind === "supplement" && run.explicit_write_authorization,
    };
    run.pending_user_messages = [];
    run.pendingUserMessages = run.pending_user_messages;
    run.user_steer_history = [
        ...normalizeGlobalAgentUserSteers(run.user_steer_history || run.userSteerHistory, undefined, 39),
        steering,
    ].slice(-40);
    run.userSteerHistory = run.user_steer_history;
    run.last_user_steer = steering;
    run.lastUserSteer = steering;
    run.history.push({
        role: "user",
        content: `${kind === "revise_goal" ? "持续跟进中的目标调整" : "持续跟进中的补充要求"}：${normalizedMessage}`,
    });
    run.history = run.history.slice(-12);
    const summary = options.continuationSummary && typeof options.continuationSummary === "object"
        ? options.continuationSummary
        : {};
    const nestedSummary = summary.continuation_summary && typeof summary.continuation_summary === "object"
        ? summary.continuation_summary
        : summary;
    const affectedTaskCount = Number(summary.affected_task_count ?? nestedSummary.affected_task_count ?? 0);
    const queuedTaskCount = Number(summary.queued_task_count ?? nestedSummary.queued_task_count ?? 0);
    const deferredTaskCount = Number(summary.deferred_task_count ?? nestedSummary.deferred_task_count ?? 0);
    const interruptedTaskCount = Number(summary.interrupted_task_count
        ?? nestedSummary.interrupted_task_count
        ?? nestedSummary.interruption_requested_count
        ?? 0);
    const failedTaskCount = Number(summary.failed_task_count ?? nestedSummary.failed_task_count ?? 0);
    const supervisionContinuation = {
        schema: "ccm-global-supervision-steering-v1",
        kind,
        source,
        affected_task_count: affectedTaskCount,
        queued_task_count: queuedTaskCount,
        deferred_task_count: deferredTaskCount,
        interrupted_task_count: interruptedTaskCount,
        failed_task_count: failedTaskCount,
        replan_required: kind === "revise_goal",
        authorization_preserved: steering.authorization_preserved,
        at,
    };
    (0, reasoning_loop_1.captureReasoningFacts)(run.reasoning_loop, `supervision_steer:${steering.id}`, {
        message: normalizedMessage,
        kind,
        source,
        supervisor_id: run.supervisor_id,
        mission_id: run.mission_id,
        continuation: supervisionContinuation,
    });
    (0, reasoning_loop_1.setReasoningAssertion)(run.reasoning_loop, {
        id: `supervision_steer_${steering.id}`,
        label: kind === "revise_goal" ? "持续跟进中的最新目标已同步到子任务" : "持续跟进中的补充要求已同步到子任务",
        kind: "intent",
        status: failedTaskCount > 0 && affectedTaskCount === 0 ? "failed" : "passed",
        evidence: [
            normalizedMessage,
            `影响 ${affectedTaskCount} 个子任务`,
            kind === "revise_goal" ? `停止 ${interruptedTaskCount} 个旧执行轮` : `延后接续 ${deferredTaskCount} 个执行轮`,
        ],
        reason: failedTaskCount > 0 ? "部分子任务接续失败，技术详情保留失败统计" : "监督控制面已接收并同步最新用户要求",
    });
    if (kind === "revise_goal") {
        run.explicit_write_authorization = false;
        run.approved_tool_signatures = [];
        run.reasoning_loop.authorization_scope = [];
        (0, reasoning_loop_1.recordReasoningDeviation)(run.reasoning_loop, "supervision_goal_revised", `用户在持续跟进阶段调整目标：${normalizedMessage}`, "warning");
        (0, reasoning_loop_1.explainReasoningDecision)(run.reasoning_loop, "replan_supervised_mission", "旧目标对应的执行轮已停止或退出队列；重新规划前不沿用旧范围写入授权。");
    }
    else {
        (0, reasoning_loop_1.explainReasoningDecision)(run.reasoning_loop, "continue_supervised_mission", "补充要求已并入同一全局任务，不改变当前目标边界和已确认授权。");
    }
    run.user_message = buildGlobalAgentEffectiveGoal(run);
    run.reasoning_loop.effective_goal = run.user_message.slice(0, 8_000);
    run.status = "supervising";
    run.phase = kind === "revise_goal" ? "plan" : "execute";
    run.supervision_state = kind === "revise_goal" ? "replanning" : String(options.supervisorState || "monitoring");
    const friendlyReply = kind === "revise_goal"
        ? interruptedTaskCount > 0
            ? `目标调整已接收。旧执行已停止，正在按新目标重新规划。${affectedTaskCount > 0 ? `已同步 ${affectedTaskCount} 个子任务。` : ""}`
            : `目标调整已接收。当前没有仍在运行的旧执行轮，正在按新目标重新规划。${affectedTaskCount > 0 ? `已同步 ${affectedTaskCount} 个子任务。` : ""}`
        : `补充要求已接收，已并入当前任务继续处理。${affectedTaskCount > 0 ? `已同步 ${affectedTaskCount} 个子任务。` : ""}`;
    const nextAction = kind === "revise_goal"
        ? "重新核对目标、执行范围和验收标准后继续派发，并重新运行验收与复核。"
        : "继续跟踪当前执行、验收和复核结果，完成后给出最终总结。";
    const todoStep = (id, label, activeForm, status, detail = "") => ({
        id,
        label,
        content: label,
        active_form: activeForm,
        activeForm,
        status,
        ...(detail ? { detail } : {}),
    });
    const supervisionTodoPlan = {
        schema: "ccm-main-agent-workchain-todo-v1",
        source: "global-supervision-steering",
        title: kind === "revise_goal" ? "调整后的执行计划" : "当前执行计划",
        steps: kind === "revise_goal"
            ? [
                todoStep("recheck_goal", "重新核对目标和范围", "已重新核对目标和范围", "completed"),
                todoStep("interrupt_previous_run", "停止旧执行轮", "旧执行已停止", "completed", "旧目标对应的执行轮不会继续写入。"),
                todoStep("replan_supervised_mission", "按新目标重新规划", "正在按新目标重新规划", "in_progress", "正在重新核对执行范围和验收标准。"),
                todoStep("rerun_acceptance_review", "重新执行验收和复核", "等待重新执行验收和复核", "pending"),
            ]
            : [
                todoStep("receive_supplement", "接收补充要求", "已接收补充要求", "completed"),
                todoStep("sync_execution_targets", "同步补充要求到执行目标", "已同步到执行目标", "completed"),
                todoStep("continue_execution_acceptance", "继续执行和验收", "正在继续执行和验收", "in_progress"),
                todoStep("prepare_final_summary", "整理最终总结", "等待整理最终总结", "pending"),
            ],
        next_action: nextAction,
        nextAction,
        display_policy: {
            user_visible: true,
            technical_default_collapsed: true,
            hide_internal_protocols: true,
            show_for_ordinary_conversation: false,
        },
    };
    const technicalContent = JSON.stringify({
        supervision_continuation: supervisionContinuation,
        supervisor_state: options.supervisorState || "",
        raw_continuation_summary: nestedSummary,
    });
    const report = {
        ...(run.final_report && typeof run.final_report === "object" ? run.final_report : {}),
        summary: friendlyReply,
        next_action: nextAction,
        risks: failedTaskCount > 0 ? [`有 ${failedTaskCount} 个子任务未成功接入最新要求，正在等待后续监督检查。`] : [],
        supervision_continuation: supervisionContinuation,
        todo_plan: supervisionTodoPlan,
        todoPlan: supervisionTodoPlan,
        technical_content: technicalContent,
    };
    run.final_reply = friendlyReply;
    run.final_report = report;
    run.workchain = buildGlobalRunWorkchain(run, run.status, friendlyReply, report);
    run.todo_plan = supervisionTodoPlan;
    run.todoPlan = supervisionTodoPlan;
    run.workchain.todo_plan = supervisionTodoPlan;
    run.workchain.todoPlan = supervisionTodoPlan;
    if (Array.isArray(run.workchain?.technical_details)) {
        run.workchain.technical_details.push({
            id: "supervision_continuation",
            title: "持续跟进接续统计",
            items: [
                { label: "接续类型", value: kind },
                { label: "受影响子任务", value: String(affectedTaskCount) },
                { label: "重新排队", value: String(queuedTaskCount) },
                { label: "等待当前轮结束", value: String(deferredTaskCount) },
                { label: "停止旧执行轮", value: String(interruptedTaskCount) },
                { label: "接续失败", value: String(failedTaskCount) },
            ],
        });
    }
    run.display_stream = buildGlobalDisplayStreamFromWorkchain(run.workchain);
    run.display_stream.todo_plan = supervisionTodoPlan;
    run.display_stream.todoPlan = supervisionTodoPlan;
    const supervisionDecision = run.display_stream.main_agent_decision || run.display_stream.mainAgentDecision;
    if (supervisionDecision) {
        supervisionDecision.mode = kind === "revise_goal" ? "goal_revision" : "followup";
        supervisionDecision.decision = {
            ...(supervisionDecision.decision || {}),
            selected_actions: kind === "revise_goal"
                ? ["replan_from_observation", "dispatch_child_agent", "read_child_agent_receipts", "generate_final_reply"]
                : ["dispatch_child_agent", "read_child_agent_receipts", "generate_final_reply"],
            dispatch_policy: {
                action: kind === "revise_goal" ? "replan" : "continue",
                reason: friendlyReply,
                nextStep: nextAction,
            },
            reason: friendlyReply,
        };
        supervisionDecision.todo_plan = supervisionTodoPlan;
        supervisionDecision.todoPlan = supervisionTodoPlan;
        supervisionDecision.user_plan_steps = supervisionTodoPlan.steps;
        supervisionDecision.verify = {
            passed: false,
            blocked_actions: [],
            conclusion: kind === "revise_goal" ? "正在按新目标重新规划" : "正在继续执行和验收",
        };
        if (supervisionDecision.display_stream) {
            supervisionDecision.display_stream.todo_plan = supervisionTodoPlan;
            supervisionDecision.display_stream.todoPlan = supervisionTodoPlan;
        }
        run.display_stream.main_agent_decision = supervisionDecision;
        run.display_stream.mainAgentDecision = supervisionDecision;
    }
    run.updated_at = at;
    saveRun(run, !volatileRuns.has(id));
    (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, {
        type: "user_steer_applied",
        steering,
        supervision_continuation: supervisionContinuation,
    });
    (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, {
        id: `${run.id}:supervision-steer:${steering.id}`,
        type: kind === "revise_goal" ? "global_agent.supervision_goal_revised" : "global_agent.supervision_supplemented",
        status: failedTaskCount > 0 ? "warning" : "ok",
        task_id: run.mission_id || "",
        message: friendlyReply,
        data: {
            steering_id: steering.id,
            supervisor_id: run.supervisor_id,
            mission_id: run.mission_id,
            continuation: supervisionContinuation,
        },
    });
    return { run, steering, duplicate: false, applied: true, continuation: supervisionContinuation };
}
function applyPendingGlobalAgentUserSteers(run, runtime) {
    const pending = normalizeGlobalAgentUserSteers(run.pending_user_messages || run.pendingUserMessages, "queued", 20);
    if (!pending.length)
        return [];
    const appliedAt = nowIso(runtime);
    run.pending_user_messages = [];
    run.pendingUserMessages = run.pending_user_messages;
    const history = normalizeGlobalAgentUserSteers(run.user_steer_history || run.userSteerHistory, undefined, 40);
    const applied = pending.map(item => ({
        ...item,
        status: "applied",
        applied_at: appliedAt,
        authorization_preserved: item.kind === "supplement" && run.explicit_write_authorization,
    }));
    const appliedById = new Map(applied.map(item => [item.id, item]));
    run.user_steer_history = history
        .map(item => appliedById.get(item.id) || item)
        .concat(applied.filter(item => !history.some(existing => existing.id === item.id)))
        .slice(-40);
    run.userSteerHistory = run.user_steer_history;
    for (const steering of applied) {
        const label = steering.kind === "revise_goal" ? "执行中目标调整" : "执行中补充要求";
        run.history.push({ role: "user", content: `${label}：${steering.message}` });
        (0, reasoning_loop_1.captureReasoningFacts)(run.reasoning_loop, `user_steer:${steering.id}`, {
            kind: steering.kind,
            message: steering.message,
            source: steering.source,
            at: steering.at,
        });
        (0, reasoning_loop_1.setReasoningAssertion)(run.reasoning_loop, {
            id: `user_steer_${steering.id}`,
            label: steering.kind === "revise_goal" ? "最新目标调整已纳入当前运行" : "执行中的补充要求已纳入当前运行",
            kind: "intent",
            status: "passed",
            evidence: [steering.message],
            reason: "用户在当前运行尚未结束时补充了上下文",
        });
        if (steering.kind === "revise_goal") {
            run.explicit_write_authorization = false;
            run.approved_tool_signatures = [];
            run.reasoning_loop.authorization_scope = [];
            (0, reasoning_loop_1.recordReasoningDeviation)(run.reasoning_loop, "user_goal_revised", `用户在执行中调整目标：${steering.message}`, "warning");
            (0, reasoning_loop_1.explainReasoningDecision)(run.reasoning_loop, "replan_after_user_steer", "最新目标边界优先于旧计划；重新规划前不沿用旧范围的写入授权。");
        }
        else {
            (0, reasoning_loop_1.explainReasoningDecision)(run.reasoning_loop, "continue_with_user_steer", "把用户的补充要求合并到同一运行，下一轮决策必须读取这条上下文。");
        }
        run.last_user_steer = steering;
        run.lastUserSteer = steering;
        (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "user_steer_applied", steering });
        (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, {
            id: `${run.id}:user-steer-applied:${steering.id}`,
            type: "global_agent.user_steer_applied",
            status: "ok",
            message: steering.kind === "revise_goal" ? "目标调整已纳入当前运行，等待重核计划" : "补充要求已纳入当前运行",
            data: {
                steering_id: steering.id,
                kind: steering.kind,
                source: steering.source,
                authorization_preserved: steering.authorization_preserved,
            },
        });
        emit(runtime, {
            type: "user_steer_applied",
            steering,
            user_steer: steering,
            userSteer: steering,
            replan_required: steering.kind === "revise_goal",
            message: steering.kind === "revise_goal"
                ? "新的目标边界已纳入，我会先重新核对计划再继续。"
                : "补充要求已纳入当前任务，我会带着它继续处理。",
        }, run);
    }
    run.history = run.history.slice(-12);
    run.user_message = buildGlobalAgentEffectiveGoal(run);
    run.reasoning_loop.effective_goal = run.user_message.slice(0, 8_000);
    run.updated_at = appliedAt;
    saveRun(run, runtime.persist !== false);
    return applied;
}
function applyGlobalResumeFeedback(run, runtime, value, options = {}) {
    const feedback = compactGlobalUserSummaryText(value, "", 720);
    if (!feedback)
        return "";
    const at = nowIso(runtime);
    const source = compactGlobalUserSummaryText(options.source || "user", "user", 80);
    const item = { feedback, at, status: String(run.status || "") };
    run.resume_feedback = feedback;
    run.resumeFeedback = feedback;
    run.last_resume_feedback = feedback;
    run.lastResumeFeedback = feedback;
    run.last_resume_feedback_at = at;
    run.lastResumeFeedbackAt = at;
    run.resume_feedback_history = [...(Array.isArray(run.resume_feedback_history) ? run.resume_feedback_history : []), item].slice(-20);
    run.resumeFeedbackHistory = run.resume_feedback_history;
    run.history.push({ role: "user", content: `继续处理时补充要求：${feedback}` });
    run.history = run.history.slice(-12);
    (0, reasoning_loop_1.captureReasoningFacts)(run.reasoning_loop, "resume_feedback", { feedback, source, at, status: run.status, phase: run.phase });
    (0, reasoning_loop_1.setReasoningAssertion)(run.reasoning_loop, {
        id: "resume_feedback",
        label: "继续处理时的补充要求已纳入下一轮",
        kind: "intent",
        status: "passed",
        evidence: [feedback],
        reason: "用户在继续运行时补充了要求",
    });
    (0, reasoning_loop_1.explainReasoningDecision)(run.reasoning_loop, "resume_with_feedback", "用户在继续运行时补充了要求，下一轮决策必须合并这条上下文。");
    (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "resume_feedback", feedback, source, at });
    (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, {
        id: `${run.id}:resume-feedback:${run.resume_count + 1}:${Date.parse(at) || Date.now()}`,
        type: "global_agent.resume_feedback",
        status: "ok",
        message: "继续处理时的补充要求已记录",
        data: { source, feedback },
    });
    emit(runtime, { type: "resume_feedback", feedback, source, message: "继续处理时的补充要求已记录" }, run);
    return feedback;
}
function buildGlobalRunWorkchain(run, status, reply = "", report = null, options = {}) {
    const actionIds = run.steps.map(step => step.tool?.name || step.state).filter(Boolean);
    const deliveryReport = report?.schema === "ccm-main-agent-delivery-report-v1" ? report : report?.delivery_report || null;
    const dispatchLaunchSummary = buildGlobalDispatchLaunchSummary(run, status);
    const visibleReply = buildGlobalVisibleReplyContent({ value: reply || run.final_reply, rawSource: reply || run.final_reply, status, max: 1200 });
    const technicalContent = visibleReply.technical_content || report?.technical_content || report?.technicalContent || "";
    const stepRows = run.steps.map(step => ({
        id: `step-${step.index}`,
        content: step.message || step.tool?.name || step.state,
        status: step.error ? "failed" : step.observation ? "completed" : step.state === "needs_confirmation" ? "needs_confirmation" : "completed",
        activeForm: step.tool?.name ? `执行 ${step.tool.name}` : step.message,
    }));
    const assertionEvidence = run.reasoning_loop?.assertions
        ?.filter(item => item.status === "passed")
        ?.map(item => item.label)
        || [];
    const workchain = (0, workchain_1.buildMainAgentWorkchain)({
        surface: "global",
        mode: options.mode || run.phase,
        status,
        phase: run.phase,
        userText: visibleReply.text,
        goal: run.original_user_message || run.user_message,
        actionIds,
        steps: stepRows,
        workers: [],
        executions: [],
        summary: {
            ...(report || {}),
            dispatch_launch_summary: dispatchLaunchSummary,
            verification_executed: report?.verification_results || report?.verification || report?.checks || deliveryReport?.verification || [],
            actual_file_changes: report?.actual_file_changes || report?.file_changes || report?.files_modified || deliveryReport?.files || [],
            risks: report?.risks || report?.remaining_items || deliveryReport?.risks || [],
        },
        completion: { summary: report?.summary || deliveryReport?.headline || reply, evidence: [...assertionEvidence, ...(report?.evidence || [])], risks: report?.risks || deliveryReport?.risks || [], next_action: report?.next_action || deliveryReport?.next_action || "" },
        technical: { blockers: run.error ? [run.error] : [], execution_ids: [], session_ids: [], technical_content: technicalContent },
        traceId: run.trace_id,
        runId: run.id,
        missionId: run.mission_id,
        supervisorId: run.supervisor_id,
    });
    if (dispatchLaunchSummary) {
        workchain.dispatch_launch_summary = dispatchLaunchSummary;
        workchain.dispatchLaunchSummary = dispatchLaunchSummary;
        if (workchain.completion_summary) {
            workchain.completion_summary.dispatch_launch_summary = dispatchLaunchSummary;
            workchain.completion_summary.dispatchLaunchSummary = dispatchLaunchSummary;
        }
    }
    if (deliveryReport) {
        workchain.delivery_report = deliveryReport;
        if (workchain.completion_summary)
            workchain.completion_summary.delivery_report = deliveryReport;
    }
    return workchain;
}
function buildGlobalDisplayStreamFromWorkchain(workchain) {
    const dispatchLaunchSummary = workchain.dispatch_launch_summary
        || workchain.dispatchLaunchSummary
        || workchain.completion_summary?.dispatch_launch_summary
        || workchain.completion_summary?.dispatchLaunchSummary
        || null;
    const mainAgentDecision = dispatchLaunchSummary ? {
        version: 2,
        mode: "delegation",
        trace_id: workchain.trace_id || workchain.technical_details?.find?.((item) => item?.id === "ids")?.items?.find?.((item) => item?.label === "Trace")?.value || "",
        decision: {
            selected_actions: ["dispatch_child_agent", "read_child_agent_receipts", "generate_final_reply"],
            dispatch_policy: {
                action: "delegate",
                reason: dispatchLaunchSummary.headline || "派发已发出。",
                nextStep: dispatchLaunchSummary.next_action || "等待下游执行目标更新结果。",
            },
            reason: dispatchLaunchSummary.headline || "派发已发出。",
        },
        display_stream: null,
        dispatch_launch_summary: dispatchLaunchSummary,
        dispatchLaunchSummary,
        todo_plan: {
            title: "我准备这样处理",
            source: "cc-style-todo",
            schema: "cc-style-todo-v2",
            display: { max_visible_steps: 5, quiet_completed: true, show_current_focus: true, user_visible: true },
            steps: [
                { id: "understand_intent", content: "理解你的需求和目标范围", activeForm: "已理解需求目标", status: "completed" },
                { id: "dispatch_child_agent", content: `派发给 ${dispatchLaunchSummary.count_label || `${dispatchLaunchSummary.rows?.length || 0} 个执行目标`}`, activeForm: "已派发执行目标", status: "completed" },
                { id: "track_delivery", content: "跟踪执行、验收和最终总结", activeForm: dispatchLaunchSummary.next_action || "等待下游执行目标更新结果", status: workchain.status === "completed" ? "completed" : "in_progress" },
            ],
        },
        user_plan_steps: [],
        permissions: [],
        verify: { passed: true, blocked_actions: [], conclusion: "派发摘要已整理" },
    } : null;
    if (mainAgentDecision)
        mainAgentDecision.display_stream = {
            schema: "ccm-streamlined-display-v2",
            user_visible_text: workchain.user_visible_text,
            dispatch_launch_summary: dispatchLaunchSummary,
            dispatchLaunchSummary,
            workchain,
        };
    if (mainAgentDecision)
        mainAgentDecision.user_plan_steps = mainAgentDecision.todo_plan.steps;
    return {
        schema: "ccm-streamlined-display-v2",
        type: "streamlined_agent_display",
        user_visible: true,
        user_visible_text: workchain.user_visible_text,
        text_message: { type: "streamlined_text", text: workchain.user_visible_text },
        tool_use_summary: {
            type: "streamlined_tool_use_summary",
            tool_summary: workchain.completion_summary?.evidence?.length
                ? workchain.completion_summary.evidence.slice(0, 4).join("，")
                : "本轮没有需要展示的工具调用",
            counts: {},
            hidden_tool_uses: 0,
        },
        workchain,
        completion_summary: workchain.completion_summary,
        dispatch_launch_summary: dispatchLaunchSummary,
        dispatchLaunchSummary: dispatchLaunchSummary,
        main_agent_decision: mainAgentDecision,
        mainAgentDecision,
        progress_checkpoints: workchain.progress_checkpoints,
        delivery_report: workchain.delivery_report || workchain.completion_summary?.delivery_report || null,
        workchain_stages: workchain.stages,
        technical_details: workchain.technical_details || [],
        todo: {
            visible: workchain.surface !== "global" || !["answer", "conversation", "question", "analysis"].includes(String(workchain.mode || "")),
            surface: "plan_panel",
            tool_message_visible: false,
            quiet_completed: true,
        },
        terminology: {
            sanitized: true,
            blocked_terms: ["Coordinator", "Pipeline", "Runtime Kernel", "trace_id", "session_ids"],
        },
    };
}
function completeRun(run, runtime, status, reply, error = "") {
    const completedAt = nowIso(runtime);
    if (status === "completed" && run.supervisor_id && run.supervision_state !== "completed") {
        run.status = "supervising";
        run.phase = "execute";
        run.supervision_state = run.supervision_state || "monitoring";
        run.final_reply = "全局任务已派发，我会持续跟进执行与验收。\n\n这只是已受理和跟进中，不代表任务已经完成。只有文件变更、验证和交付验收都通过后，才会发送最终交付报告。";
        run.workchain = buildGlobalRunWorkchain(run, "supervising", run.final_reply, null);
        run.display_stream = buildGlobalDisplayStreamFromWorkchain(run.workchain);
        run.error = "";
        run.updated_at = nowIso(runtime);
        run.pending_tool = null;
        saveRun(run, runtime.persist !== false);
        (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "supervising", status: run.status, mission_id: run.mission_id, supervisor_id: run.supervisor_id, reply: run.final_reply });
        (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:supervising:${run.updated_at}`, type: "global_agent.supervising", status: "info", message: run.final_reply, data: { mission_id: run.mission_id, supervisor_id: run.supervisor_id } });
        emit(runtime, { type: "supervising", reply: run.final_reply, mission_id: run.mission_id, supervisor_id: run.supervisor_id }, run);
        return run;
    }
    run.status = status;
    run.phase = status === "completed" ? "complete" : run.phase;
    run.error = String(error || "");
    run.clarification_summary = null;
    run.confirmation_summary = null;
    if (run.plan_mode)
        run.plan_mode = updateGlobalPlanModeStatus(run.plan_mode, status === "completed" ? "completed" : status === "cancelled" ? "cancelled" : "failed", completedAt);
    const rawReply = String(reply || run.final_reply || (status === "completed" ? "已完成。" : "执行未完成。"));
    const intentCategory = String(run.decision_summary?.intent?.category || "");
    const ordinaryConversation = isReadOnlyGlobalConsultation(run, status);
    const workchain = buildGlobalRunWorkchain(run, status, rawReply, run.final_delivery_report || run.final_report || null, { mode: ordinaryConversation ? "conversation" : undefined });
    const includeDetails = !ordinaryConversation
        && (status !== "completed" || run.tool_calls > 0 || !!run.mission_id || ["execution", "high_risk"].includes(intentCategory));
    if (includeDetails) {
        const deliveryReport = (0, delivery_report_1.buildMainAgentDeliveryReport)({
            surface: "global",
            status,
            title: run.original_user_message || run.user_message || "全局任务",
            goal: run.original_user_message || run.user_message,
            detail: rawReply,
            run,
            report: run.final_report || run.final_delivery_report || workchain.completion_summary || {},
            summary: workchain.completion_summary || {},
            completion: workchain.completion_summary || {},
            workchain,
            executed: true,
        });
        workchain.delivery_report = deliveryReport;
        if (workchain.completion_summary)
            workchain.completion_summary.delivery_report = deliveryReport;
        run.final_delivery_report = deliveryReport;
        run.final_report = {
            ...(run.final_report && run.final_report.schema !== "ccm-main-agent-delivery-report-v1" ? run.final_report : {}),
            summary: deliveryReport.headline,
            formatted: deliveryReport.markdown,
            user_text: deliveryReport.user_text,
            actual_file_changes: deliveryReport.files,
            verification_results: deliveryReport.verification,
            risks: deliveryReport.risks,
            next_action: deliveryReport.next_action,
            delivery_report: deliveryReport,
        };
    }
    run.workchain = workchain;
    run.display_stream = buildGlobalDisplayStreamFromWorkchain(workchain);
    if (!includeDetails)
        run.final_report = run.final_report || workchain.completion_summary;
    const finalReplyCandidate = includeDetails && run.final_delivery_report
        ? (0, delivery_report_1.formatMainAgentDeliveryReply)(run.final_delivery_report)
        : (0, workchain_1.formatMainAgentCompletionReply)({ reply: rawReply, workchain, includeDetails: false });
    const visibleReply = buildGlobalVisibleReplyContent({
        value: finalReplyCandidate,
        rawSource: rawReply,
        status,
        max: 8000,
    });
    if (visibleReply.technical_content) {
        run.final_report = run.final_report || {};
        attachGlobalReplyTechnicalContent(run.final_report, visibleReply.technical_content);
        attachGlobalReplyTechnicalContent(run.final_delivery_report, visibleReply.technical_content);
        attachGlobalReplyTechnicalContent(workchain, visibleReply.technical_content);
        attachGlobalReplyTechnicalContent(run.display_stream, visibleReply.technical_content);
    }
    if (visibleReply.hidden_visible_protocol && run.final_delivery_report) {
        run.final_delivery_report.headline = visibleReply.text;
        run.final_delivery_report.user_text = visibleReply.text;
        run.final_delivery_report.markdown = visibleReply.text;
        if (run.final_report) {
            run.final_report.summary = visibleReply.text;
            run.final_report.user_text = visibleReply.text;
            run.final_report.formatted = visibleReply.text;
        }
    }
    run.final_reply = visibleReply.text;
    run.completed_at = completedAt;
    run.updated_at = run.completed_at;
    run.pending_tool = null;
    saveRun(run, runtime.persist !== false);
    (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "run_terminal", status, reply: run.final_reply, error: run.error });
    (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:${status}:${run.completed_at}`, type: `global_agent.run_${status}`, status: status === "completed" ? "ok" : status === "cancelled" ? "warning" : "error", message: run.final_reply.slice(0, 1000), data: { steps: run.steps.length, model_calls: run.model_calls, tool_calls: run.tool_calls, error: run.error } });
    emit(runtime, { type: status === "completed" ? "completed" : status, reply: run.final_reply, error: run.error }, run);
    return run;
}
async function continueLoop(run, runtime) {
    if (activeRuns.has(run.id))
        return activeRunObjects.get(run.id) || run;
    activeRuns.add(run.id);
    activeRunObjects.set(run.id, run);
    try {
        run.status = "running";
        run.updated_at = nowIso(runtime);
        saveRun(run, runtime.persist !== false);
        (0, runtime_1.initializeGlobalAgentRuntimeRun)(run);
        (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "run_started", status: run.status, phase: run.phase });
        emit(runtime, { type: "started" }, run);
        while (run.status === "running") {
            if (cancelRequests.delete(run.id))
                return completeRun(run, runtime, "cancelled", "用户已取消本次运行。", "user_cancelled");
            if (pauseRequests.delete(run.id)) {
                run.status = "paused";
                run.updated_at = nowIso(runtime);
                saveRun(run, runtime.persist !== false);
                (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:paused:${run.updated_at}`, type: "global_agent.paused", status: "warning", message: "我已暂停这次运行" });
                emit(runtime, { type: "paused", reply: "我已暂停这次运行。" }, run);
                return run;
            }
            applyPendingGlobalAgentUserSteers(run, runtime);
            const now = runtime.now ? runtime.now() : Date.now();
            if (now > Date.parse(run.deadline_at))
                return completeRun(run, runtime, "failed", "本次运行已达到执行时间上限，我已安全停止。", "deadline_exceeded");
            if (run.steps.length >= run.max_steps)
                return completeRun(run, runtime, "failed", "本次运行已达到最大步骤数，我已停止以避免死循环。", "step_budget_exceeded");
            let decision;
            const decisionStarted = now;
            try {
                const messages = await buildMessages(run, runtime);
                run.model_calls += 1;
                const rawDecision = await runtime.callModel(messages, run);
                if (applyPendingGlobalAgentUserSteers(run, runtime).length)
                    continue;
                decision = parseGlobalAgentDecision(rawDecision);
            }
            catch (error) {
                if (applyPendingGlobalAgentUserSteers(run, runtime).length)
                    continue;
                const fallback = runtime.fallbackDecision ? await runtime.fallbackDecision(run, error) : null;
                if (!fallback)
                    return completeRun(run, runtime, "failed", `我暂时无法形成可靠决策：${error?.message || error}`, error?.message || String(error));
                decision = normalizeDecision(fallback);
            }
            run.phase = decision.state;
            const normalizedIntent = (0, quality_center_1.normalizeAgentDecisionIntent)(decision.intent, run.user_message);
            decision.intent = normalizedIntent;
            (0, reasoning_loop_1.updateReasoningPlan)(run.reasoning_loop, decision.plan || [], normalizedIntent.reason || `decision:${decision.state}`);
            (0, runtime_1.updateGlobalAgentTodoLedger)(run, decision.plan || [], decision.tool?.name || "");
            (0, reasoning_loop_1.explainReasoningDecision)(run.reasoning_loop, decision.state, normalizedIntent.reason || decision.message || "模型形成下一步决策");
            const step = {
                index: run.steps.length + 1,
                at: nowIso(runtime),
                state: decision.state,
                message: String(decision.message || ""),
                plan: decision.plan || [],
                duration_ms: Math.max(0, (runtime.now ? runtime.now() : Date.now()) - decisionStarted),
                decision: { intent: normalizedIntent },
            };
            if (!decision.tool) {
                const quality = (0, quality_center_1.evaluateAgentDecision)({ message: run.user_message, decision, risk: "read", explicitWriteAuthorization: run.explicit_write_authorization, priorSteps: run.steps, policyOverride: runtime.qualityPolicyOverride });
                run.decision_summary = quality;
                run.shadow_mode = quality.policy.shadowMode;
                step.decision = quality;
                run.steps.push(step);
                run.updated_at = nowIso(runtime);
                saveRun(run, runtime.persist !== false);
                (0, quality_center_1.recordAgentDecision)({
                    run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
                    intent: quality.intent, proposed_tool: null, risk: "read", target_grounded: true,
                    authorization_basis: quality.authorizationBasis,
                    outcome: decision.state === "needs_confirmation" ? "clarification_required" : ["answer", "complete"].includes(decision.state) ? (run.tool_calls > 0 ? "completed_after_action" : "answered") : "non_terminal_without_action",
                    reasons: [quality.intent.reason], status: decision.state === "needs_confirmation" ? "warning" : "ok",
                });
                emit(runtime, { type: "decision", step }, run);
                (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "decision", state: decision.state, message: step.message, intent: quality.intent });
                if (decision.state === "needs_confirmation") {
                    (0, runtime_1.markGlobalAgentToolTodo)(run, "", "blocked", decision.message || "等待用户澄清");
                    (0, reasoning_loop_1.setReasoningAssertion)(run.reasoning_loop, { id: "clarification", label: "目标与影响范围已澄清", kind: "intent", status: "blocked", reason: decision.message });
                    (0, reasoning_loop_1.recordReasoningDeviation)(run.reasoning_loop, "ambiguous_intent", decision.message || normalizedIntent.reason, "warning");
                    run.status = "waiting_clarification";
                    run.phase = "needs_confirmation";
                    run.clarification_question = decision.message || "请补充要操作的目标、期望动作和允许的影响范围。";
                    run.final_reply = run.clarification_question;
                    run.clarification_summary = buildGlobalClarificationSummary({ run, question: run.clarification_question, decision: quality });
                    run.confirmation_summary = null;
                    run.updated_at = nowIso(runtime);
                    saveRun(run, runtime.persist !== false);
                    (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:clarification:${step.index}`, type: "global_agent.clarification_required", status: "warning", message: run.final_reply, data: { intent: normalizedIntent } });
                    emit(runtime, { type: "clarification_required", reply: run.final_reply, decision: quality, clarification_summary: run.clarification_summary, clarificationSummary: run.clarification_summary }, run);
                    return run;
                }
                if (["answer", "complete"].includes(decision.state)) {
                    const completion = decision.completion || {};
                    const executionIntent = ["execution", "high_risk"].includes(normalizedIntent.category) && normalizedIntent.action_required;
                    const failedToolAssertions = run.reasoning_loop.assertions.filter(item => item.kind === "tool_outcome" && item.status === "failed");
                    const passedToolAssertions = run.reasoning_loop.assertions.filter(item => item.kind === "tool_outcome" && item.status === "passed");
                    if (executionIntent && run.explicit_write_authorization && run.tool_calls === 0) {
                        const reason = "已识别明确执行意图，但尚未形成并执行可靠工具行动";
                        (0, reasoning_loop_1.recordReasoningDeviation)(run.reasoning_loop, "missed_execution", reason, "error");
                        (0, reasoning_loop_1.recordReasoningPostmortem)(run.reasoning_loop, { trigger: "missed_execution", whatHappened: reason, correction: "阻止终态并向用户索取可执行目标和验收范围", preventRepeat: "明确执行意图必须产生经过授权的工具行动或明确阻塞证据" });
                        (0, reasoning_loop_1.setReasoningAssertion)(run.reasoning_loop, { id: "goal", label: "用户要求的执行目标已实际完成", kind: "goal", status: "blocked", reason });
                        run.status = "waiting_clarification";
                        run.phase = "needs_confirmation";
                        run.clarification_question = "我识别到你要求实际执行，但当前还没有形成可核验的行动方案。请确认目标对象、允许修改的范围和验收结果；我不会把一段说明冒充已完成。";
                        run.final_reply = run.clarification_question;
                        run.clarification_summary = buildGlobalClarificationSummary({ run, question: run.clarification_question, decision: quality, reason });
                        run.confirmation_summary = null;
                        run.updated_at = nowIso(runtime);
                        saveRun(run, runtime.persist !== false);
                        emit(runtime, { type: "clarification_required", reply: run.final_reply, decision: quality, clarification_summary: run.clarification_summary, clarificationSummary: run.clarification_summary }, run);
                        return run;
                    }
                    if (executionIntent && failedToolAssertions.length && !passedToolAssertions.length) {
                        (0, reasoning_loop_1.recordReasoningDeviation)(run.reasoning_loop, "premature_completion", "模型试图结束，但执行结果仍失败；要求重新规划", "error");
                        (0, reasoning_loop_1.recordReasoningPostmortem)(run.reasoning_loop, { trigger: "premature_completion", whatHappened: "模型在所有执行结果仍失败时尝试结束", correction: "拒绝完成并回到计划阶段", preventRepeat: "完成前检查工具断言和验收证据，失败断言未消解时不得结束" });
                        if (run.steps.length < run.max_steps)
                            continue;
                        return completeRun(run, runtime, "failed", "执行结果仍未通过验证，不能报告完成。", "unverified_completion");
                    }
                    (0, reasoning_loop_1.setReasoningAssertion)(run.reasoning_loop, {
                        id: "goal", label: "用户目标得到回答或可核验交付", kind: "goal", status: executionIntent ? (passedToolAssertions.length ? "passed" : "blocked") : "passed",
                        evidence: [...(completion.evidence || []), ...passedToolAssertions.map(item => item.label)], reason: normalizedIntent.reason,
                    });
                    const includeDeliveryDetails = executionIntent || !isReadOnlyGlobalConsultation(run, "completed");
                    const directReply = decision.message || completion.summary || "已完成。";
                    const parts = [includeDeliveryDetails ? directReply : stripNonExecutionReportSections(directReply)];
                    if (includeDeliveryDetails && completion.evidence?.length)
                        parts.push(`验证/证据：\n- ${completion.evidence.join("\n- ")}`);
                    if (includeDeliveryDetails && completion.risks?.length)
                        parts.push(`风险：\n- ${completion.risks.join("\n- ")}`);
                    if (includeDeliveryDetails && completion.next_action)
                        parts.push(`下一步：${completion.next_action}`);
                    (0, runtime_1.markGlobalAgentToolTodo)(run, "", "done", "本轮回复已整理");
                    return completeRun(run, runtime, "completed", parts.filter(Boolean).join("\n\n"));
                }
                (0, runtime_1.markGlobalAgentToolTodo)(run, "", "blocked", "非终态决策缺少工具");
                return completeRun(run, runtime, "failed", "当前决策还没有可执行动作，我已停止并保留排障信息。", "non_terminal_without_tool");
            }
            let args;
            let risk;
            let signature;
            try {
                args = validateTool(decision.tool.name, decision.tool.arguments || {});
                risk = classifyGlobalAgentToolRisk(decision.tool.name, args);
                signature = toolSignature(decision.tool.name, args);
            }
            catch (error) {
                step.error = error?.message || String(error);
                run.steps.push(step);
                run.consecutive_failures += 1;
                run.updated_at = nowIso(runtime);
                saveRun(run, runtime.persist !== false);
                emit(runtime, { type: "tool_validation_failed", step }, run);
                if (run.consecutive_failures >= 2)
                    return completeRun(run, runtime, "failed", `工具参数连续校验失败：${step.error}`, step.error);
                continue;
            }
            step.tool = { name: decision.tool.name, arguments: args, risk, signature };
            const quality = (0, quality_center_1.evaluateAgentDecision)({
                message: run.user_message,
                decision,
                toolName: decision.tool.name,
                args,
                risk,
                explicitWriteAuthorization: run.explicit_write_authorization,
                priorSteps: run.steps,
                policyOverride: runtime.qualityPolicyOverride,
            });
            run.decision_summary = quality;
            run.shadow_mode = quality.policy.shadowMode;
            step.decision = quality;
            if (quality.requiresClarification) {
                (0, runtime_1.markGlobalAgentToolTodo)(run, decision.tool.name, "blocked", quality.clarificationQuestion);
                (0, reasoning_loop_1.setReasoningAssertion)(run.reasoning_loop, { id: "clarification", label: "目标、授权与影响范围已澄清", kind: "intent", status: "blocked", reason: quality.clarificationReasons.join("；") });
                (0, reasoning_loop_1.recordReasoningDeviation)(run.reasoning_loop, "decision_quality_gap", quality.clarificationReasons.join("；"), "warning");
                run.steps.push(step);
                run.status = "waiting_clarification";
                run.phase = "needs_confirmation";
                run.clarification_question = quality.clarificationQuestion;
                run.final_reply = quality.clarificationQuestion;
                run.clarification_summary = buildGlobalClarificationSummary({ run, question: run.clarification_question, decision: quality });
                run.confirmation_summary = null;
                run.updated_at = nowIso(runtime);
                saveRun(run, runtime.persist !== false);
                (0, quality_center_1.recordAgentDecision)({
                    run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
                    intent: quality.intent, proposed_tool: { name: decision.tool.name, arguments: args }, risk,
                    target_grounded: quality.groundedTarget, authorization_basis: quality.authorizationBasis,
                    outcome: "clarification_required", reasons: quality.clarificationReasons, status: "warning",
                });
                (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:quality-block:${signature}`, type: "global_agent.decision_blocked", status: "warning", message: run.final_reply, data: { tool: decision.tool.name, risk, reasons: quality.clarificationReasons, intent: quality.intent } });
                emit(runtime, { type: "clarification_required", reply: run.final_reply, pending_tool: null, decision: quality, clarification_summary: run.clarification_summary, clarificationSummary: run.clarification_summary }, run);
                return run;
            }
            if (quality.shadowed) {
                (0, runtime_1.markGlobalAgentToolTodo)(run, decision.tool.name, "done", `影子模式记录 ${decision.tool.name}`);
                (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "tool_shadowed", tool: decision.tool.name, risk, arguments: args });
                step.observation = { success: true, shadowed: true, executed: false, proposed_tool: decision.tool.name, arguments: args };
                run.steps.push(step);
                run.tool_calls += 0;
                (0, quality_center_1.recordAgentDecision)({
                    run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
                    intent: quality.intent, proposed_tool: { name: decision.tool.name, arguments: args }, risk,
                    target_grounded: quality.groundedTarget, authorization_basis: quality.authorizationBasis,
                    outcome: "shadowed", reasons: ["影子模式启用，未产生副作用"], status: "info",
                });
                (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:shadow:${signature}`, type: "global_agent.tool_shadowed", status: "info", message: `影子模式记录 ${decision.tool.name}，未执行`, data: { tool: decision.tool.name, risk, arguments: args, intent: quality.intent } });
                (0, runtime_kernel_1.recordAgentRuntimeLifecycle)({
                    scope: "global",
                    traceId: run.trace_id,
                    runId: run.id,
                    action: decision.tool.name,
                    phase: "shadow",
                    risk,
                    target: signature,
                    status: "skipped",
                    message: `影子模式记录 ${decision.tool.name}，未执行`,
                    data: { arguments: args, intent: quality.intent },
                });
                return completeRun(run, runtime, "completed", `${decision.message || "已形成执行方案。"}\n\n当前处于影子模式：拟调用 ${decision.tool.name}，本次没有执行任何写操作。`);
            }
            const priorSame = run.steps.filter(item => item.tool?.signature === signature).length;
            if (priorSame >= 2) {
                step.error = "检测到重复工具调用，已阻止死循环";
                run.steps.push(step);
                (0, runtime_1.markGlobalAgentToolTodo)(run, decision.tool.name, "blocked", step.error);
                return completeRun(run, runtime, "failed", step.error, "duplicate_tool_loop");
            }
            const permission = (0, runtime_1.evaluateGlobalAgentPermission)({ run, tool: decision.tool.name, args, risk, signature });
            if (permission.denied) {
                step.error = `权限规则拒绝执行 ${decision.tool.name}${permission.rule?.reason ? `：${permission.rule.reason}` : ""}`;
                run.steps.push(step);
                (0, runtime_1.markGlobalAgentToolTodo)(run, decision.tool.name, "blocked", step.error);
                (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "permission_denied", tool: decision.tool.name, risk, rule: permission.rule });
                return completeRun(run, runtime, "failed", step.error, "permission_denied");
            }
            const approved = run.approved_tool_signatures.includes(signature) || permission.allowed;
            const requiresUserConfirmation = (risk === "write" && !run.explicit_write_authorization && !approved) || (risk === "high" && !approved);
            const shouldExposePlanMode = (Array.isArray(decision.plan) && decision.plan.length > 0)
                || ["execution", "high_risk"].includes(String(quality.intent?.category || ""))
                || risk !== "read"
                || isGlobalDispatchTool(decision.tool.name);
            if (shouldExposePlanMode) {
                run.plan_mode = buildGlobalPlanModeSummary({
                    run,
                    decision,
                    risk,
                    pendingTool: { name: decision.tool.name, arguments: args, risk, signature },
                    requiresConfirmation: requiresUserConfirmation,
                    confirmationStatus: requiresUserConfirmation ? "awaiting_confirmation" : "auto_continue",
                });
                if (!requiresUserConfirmation) {
                    emit(runtime, {
                        type: "plan_mode_ready",
                        tool: { name: decision.tool.name, arguments: args, risk, signature },
                        message: decision.message || "",
                        plan_mode: run.plan_mode,
                        planMode: run.plan_mode,
                    }, run);
                    (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "plan_mode_ready", tool: decision.tool.name, risk, signature, auto_continue: true });
                }
            }
            if (requiresUserConfirmation) {
                run.steps.push(step);
                run.status = "waiting_confirmation";
                run.phase = "needs_confirmation";
                run.pending_tool = { name: decision.tool.name, arguments: args, risk, signature };
                const confirmationLabel = risk === "high" ? "高风险操作" : "尚未获得明确写入授权的操作";
                run.final_reply = `${decision.message || `准备调用 ${decision.tool.name}`}\n\n${confirmationLabel}尚未执行，需要你确认后才能继续。`;
                run.confirmation_summary = buildGlobalConfirmationSummary({ run, pendingTool: run.pending_tool, reply: run.final_reply, decision: quality, permission });
                run.clarification_summary = null;
                run.updated_at = nowIso(runtime);
                saveRun(run, runtime.persist !== false);
                (0, quality_center_1.recordAgentDecision)({
                    run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
                    intent: quality.intent, proposed_tool: { name: decision.tool.name, arguments: args }, risk,
                    target_grounded: quality.groundedTarget, authorization_basis: quality.authorizationBasis,
                    outcome: "confirmation_required", reasons: [confirmationLabel], status: "warning",
                });
                (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:confirmation:${signature}`, type: "global_agent.confirmation_required", status: "warning", message: run.final_reply, data: { tool: decision.tool.name, risk, arguments: args } });
                (0, runtime_kernel_1.recordAgentRuntimeLifecycle)({
                    scope: "global",
                    traceId: run.trace_id,
                    runId: run.id,
                    action: decision.tool.name,
                    phase: "permission",
                    risk,
                    target: signature,
                    status: "blocked",
                    message: confirmationLabel,
                    data: { arguments: args, authorization_basis: quality.authorizationBasis },
                });
                emit(runtime, {
                    type: "confirmation_required",
                    pending_tool: run.pending_tool,
                    reply: run.final_reply,
                    confirmation_summary: run.confirmation_summary,
                    confirmationSummary: run.confirmation_summary,
                    plan_mode: run.plan_mode || null,
                    planMode: run.plan_mode || null,
                }, run);
                (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "confirmation_required", tool: decision.tool.name, risk, signature, permission });
                (0, runtime_1.markGlobalAgentToolTodo)(run, decision.tool.name, "blocked", run.final_reply);
                return run;
            }
            const preHooks = (0, runtime_1.runGlobalAgentHooks)("pre_tool_use", { run, tool: decision.tool.name, args, risk });
            if (preHooks.blocked) {
                step.error = `Hook 阻止执行 ${decision.tool.name}${preHooks.message ? `：${preHooks.message}` : ""}`;
                run.steps.push(step);
                (0, runtime_1.markGlobalAgentToolTodo)(run, decision.tool.name, "blocked", step.error);
                (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "hook_blocked", phase: "pre_tool_use", tool: decision.tool.name, risk, hooks: preHooks.fired });
                (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:hook_blocked:${signature}`, type: "global_agent.hook_blocked", status: "warning", message: step.error, data: { tool: decision.tool.name, risk, hooks: preHooks.fired } });
                return completeRun(run, runtime, "failed", step.error, "hook_blocked");
            }
            (0, runtime_kernel_1.recordAgentRuntimeLifecycle)({
                scope: "global",
                traceId: run.trace_id,
                runId: run.id,
                action: decision.tool.name,
                phase: "pre_tool_use",
                risk,
                target: signature,
                status: "running",
                message: step.message,
                data: { arguments: args, context: run.user_message },
            });
            (0, runtime_1.markGlobalAgentToolTodo)(run, decision.tool.name, "in_progress", step.message || `执行 ${decision.tool.name}`);
            (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "tool_started", tool: decision.tool.name, risk, arguments: args });
            emit(runtime, { type: "tool_started", tool: step.tool, message: step.message }, run);
            const toolStarted = runtime.now ? runtime.now() : Date.now();
            let acceptedSupervision = false;
            try {
                const result = await runtime.executeTool(decision.tool.name, args, run);
                acceptedSupervision = isGlobalDispatchTool(decision.tool.name)
                    && result?.accepted === true
                    && result?.completed !== true
                    && !!run.supervisor_id;
                step.observation = compactObservation(result);
                (0, reasoning_loop_1.captureReasoningFacts)(run.reasoning_loop, `tool:${decision.tool.name}`, result);
                const toolSucceeded = result?.success !== false && !result?.error;
                (0, reasoning_loop_1.setReasoningAssertion)(run.reasoning_loop, {
                    id: `tool_${signature}`,
                    label: `工具 ${decision.tool.name} 产生可核验结果`,
                    kind: "tool_outcome",
                    status: toolSucceeded ? "passed" : "failed",
                    evidence: [compactObservation(result)],
                    reason: toolSucceeded ? "工具返回成功观察" : String(result?.error || "工具结果标记失败"),
                });
                if (toolSucceeded) {
                    run.reasoning_loop.replan_required = false;
                    run.reasoning_loop.last_replan_reason = "";
                }
                if (!toolSucceeded)
                    (0, reasoning_loop_1.recordReasoningDeviation)(run.reasoning_loop, "tool_result_mismatch", `${decision.tool.name} 返回失败结果，需要重新规划`, "error");
                if (!toolSucceeded)
                    (0, reasoning_loop_1.recordReasoningPostmortem)(run.reasoning_loop, { trigger: "tool_result_mismatch", whatHappened: `${decision.tool.name} 返回失败观察`, correction: "把失败观察写入事实快照并要求模型调整计划", preventRepeat: "后续计划必须引用当前事实，不能机械重复旧工具参数" });
                step.duration_ms = Math.max(0, (runtime.now ? runtime.now() : Date.now()) - toolStarted);
                run.tool_calls += 1;
                run.consecutive_failures = 0;
                if (result?.client_effect)
                    run.client_effects.push(result.client_effect);
                (0, quality_center_1.recordAgentDecision)({
                    run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
                    intent: quality.intent, proposed_tool: { name: decision.tool.name, arguments: args }, risk,
                    target_grounded: quality.groundedTarget, authorization_basis: approved ? "confirmation" : quality.authorizationBasis,
                    outcome: "executed", reasons: [quality.intent.reason], status: "ok",
                });
                (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:tool:${step.index}:${signature}`, type: "global_agent.tool_completed", status: "ok", message: `${decision.tool.name} 执行完成`, data: { tool: decision.tool.name, risk, duration_ms: step.duration_ms } });
                (0, runtime_kernel_1.recordAgentRuntimeLifecycle)({
                    scope: "global",
                    traceId: run.trace_id,
                    runId: run.id,
                    action: decision.tool.name,
                    phase: "post_tool_use",
                    risk,
                    target: signature,
                    status: toolSucceeded ? "ok" : "error",
                    message: `${decision.tool.name} 执行完成`,
                    data: { duration_ms: step.duration_ms, observation: step.observation },
                });
                (0, runtime_1.runGlobalAgentHooks)("post_tool_use", { run, tool: decision.tool.name, args, risk, observation: step.observation });
                (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "tool_completed", tool: decision.tool.name, risk, duration_ms: step.duration_ms, observation: step.observation });
                (0, runtime_1.markGlobalAgentToolTodo)(run, decision.tool.name, toolSucceeded ? "done" : "blocked", toolSucceeded ? `${decision.tool.name} 完成` : String(result?.error || `${decision.tool.name} 返回失败`));
                emit(runtime, { type: "tool_completed", tool: step.tool, observation: step.observation }, run);
                if (toolSucceeded)
                    emitGlobalDispatchLaunchProgress(runtime, run, step);
            }
            catch (error) {
                step.error = error?.message || String(error);
                step.observation = { success: false, error: step.error };
                step.duration_ms = Math.max(0, (runtime.now ? runtime.now() : Date.now()) - toolStarted);
                run.tool_calls += 1;
                run.consecutive_failures += 1;
                (0, reasoning_loop_1.setReasoningAssertion)(run.reasoning_loop, { id: `tool_${signature}`, label: `工具 ${decision.tool.name} 产生可核验结果`, kind: "tool_outcome", status: "failed", reason: step.error });
                (0, reasoning_loop_1.recordReasoningDeviation)(run.reasoning_loop, "tool_execution_failed", `${decision.tool.name}: ${step.error}`, "error");
                (0, reasoning_loop_1.recordReasoningPostmortem)(run.reasoning_loop, { trigger: "tool_execution_failed", whatHappened: `${decision.tool.name}: ${step.error}`, correction: "保存失败断言并进入下一轮重规划或安全停止", preventRepeat: "优先核对当前状态、参数与执行器健康度后再重试" });
                (0, quality_center_1.recordAgentDecision)({
                    run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
                    intent: quality.intent, proposed_tool: { name: decision.tool.name, arguments: args }, risk,
                    target_grounded: quality.groundedTarget, authorization_basis: approved ? "confirmation" : quality.authorizationBasis,
                    outcome: "execution_failed", reasons: [step.error], status: "error",
                });
                (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:tool_failed:${step.index}:${signature}`, type: "global_agent.tool_failed", status: "error", message: step.error, data: { tool: decision.tool.name, risk, duration_ms: step.duration_ms } });
                (0, runtime_kernel_1.recordAgentRuntimeLifecycle)({
                    scope: "global",
                    traceId: run.trace_id,
                    runId: run.id,
                    action: decision.tool.name,
                    phase: "post_tool_use",
                    risk,
                    target: signature,
                    status: "error",
                    message: step.error,
                    data: { duration_ms: step.duration_ms, observation: step.observation },
                });
                (0, runtime_1.runGlobalAgentHooks)("post_tool_use", { run, tool: decision.tool.name, args, risk, observation: step.observation });
                (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "tool_failed", tool: decision.tool.name, risk, duration_ms: step.duration_ms, error: step.error });
                (0, runtime_1.markGlobalAgentToolTodo)(run, decision.tool.name, "blocked", step.error);
                emit(runtime, { type: "tool_failed", tool: step.tool, error: step.error }, run);
            }
            run.steps.push(step);
            run.pending_tool = null;
            run.updated_at = nowIso(runtime);
            saveRun(run, runtime.persist !== false);
            if (acceptedSupervision) {
                return completeRun(run, runtime, "completed", decision.message || "全局任务已派发并进入持续跟进。");
            }
            if (run.consecutive_failures >= 2)
                return completeRun(run, runtime, "failed", `工具连续执行失败，已停止：${step.error}`, step.error || "tool_failures");
        }
        return run;
    }
    finally {
        activeRuns.delete(run.id);
        if (activeRunObjects.get(run.id) === run)
            activeRunObjects.delete(run.id);
    }
}
async function startGlobalAgentRun(input, runtime) {
    const createdAt = nowIso(runtime);
    const id = `gar_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
    const run = normalizeRun({
        id,
        trace_id: (0, reliability_ledger_1.ensureTraceId)(input.traceId, "global-agent"),
        session_id: input.sessionId || "default",
        source: input.source || "web",
        user_message: input.message,
        original_user_message: input.message,
        history: input.history || [],
        status: "running",
        phase: "plan",
        explicit_write_authorization: input.explicitWriteAuthorization === true,
        created_at: createdAt,
        updated_at: createdAt,
        started_at: createdAt,
        deadline_at: new Date((runtime.now ? runtime.now() : Date.now()) + Math.max(10_000, Math.min(30 * 60_000, Number(input.timeoutMs || 10 * 60_000)))).toISOString(),
        max_steps: input.maxSteps || 8,
        steps: [],
        pending_tool: null,
        approved_tool_signatures: [],
        final_reply: "",
        error: "",
        resume_count: 0,
        model_calls: 0,
        tool_calls: 0,
        consecutive_failures: 0,
        client_effects: [],
        reasoning_loop: (0, reasoning_loop_1.createAgentReasoningState)({
            goal: input.message,
            authorizationScope: input.explicitWriteAuthorization ? ["本次明确请求所涉及的目标与影响范围"] : [],
            assertions: [{ id: "goal", label: "用户目标得到回答或可核验交付", kind: "goal" }],
        }),
    });
    saveRun(run, runtime.persist !== false);
    (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:created`, type: "global_agent.run_created", status: "info", message: input.message.slice(0, 1000), data: { session_id: run.session_id, source: run.source, explicit_write_authorization: run.explicit_write_authorization } });
    return continueLoop(run, runtime);
}
async function resumeGlobalAgentRun(id, runtime, options = {}) {
    if (activeRuns.has(id)) {
        const started = Date.now();
        while (activeRuns.has(id) && Date.now() - started < 2 * 60_000)
            await new Promise(resolve => setTimeout(resolve, 100));
        if (activeRuns.has(id))
            throw new Error("全局 Agent 当前步骤尚未安全停下，请稍后重试");
    }
    const stored = getGlobalAgentRun(id);
    if (!stored)
        throw new Error("全局 Agent 运行不存在");
    const run = normalizeRun(stored);
    if (["supervising", "completed", "failed", "cancelled"].includes(run.status))
        return run;
    if (run.status === "waiting_clarification")
        return run;
    if (options.cancelled || options.approved === false)
        return completeRun(run, runtime, "cancelled", "用户已取消本次操作。", "user_cancelled");
    if (run.status === "waiting_confirmation") {
        if (options.approved !== true)
            return run;
        if (!run.pending_tool?.signature)
            throw new Error("等待确认的工具信息不完整");
        const pending = run.pending_tool;
        const confirmedAt = nowIso(runtime);
        const acceptFeedback = compactGlobalUserSummaryText(options.feedback || options.acceptFeedback || "", "", 720);
        run.approved_tool_signatures.push(pending.signature);
        if (run.plan_mode)
            run.plan_mode = updateGlobalPlanModeStatus(run.plan_mode, "confirmed", confirmedAt, acceptFeedback);
        run.plan_accept_feedback = acceptFeedback;
        run.last_plan_accept_feedback = acceptFeedback;
        run.last_plan_accept_feedback_at = acceptFeedback ? confirmedAt : "";
        if (acceptFeedback) {
            run.history.push({ role: "user", content: `确认执行前计划时补充要求：${acceptFeedback}` });
            run.history = run.history.slice(-12);
            (0, reasoning_loop_1.captureReasoningFacts)(run.reasoning_loop, "plan_accept_feedback", acceptFeedback);
            (0, reasoning_loop_1.setReasoningAssertion)(run.reasoning_loop, {
                id: "plan_accept_feedback",
                label: "用户确认计划时补充要求已纳入执行",
                kind: "intent",
                status: "passed",
                evidence: [acceptFeedback],
                reason: "用户在确认执行前计划时补充了执行要求",
            });
        }
        run.status = "running";
        run.phase = "execute";
        run.confirmation_summary = null;
        run.clarification_summary = null;
        run.resume_count += 1;
        run.updated_at = confirmedAt;
        saveRun(run, runtime.persist !== false);
        (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:confirmed:${pending.signature}`, type: "global_agent.confirmed", status: "ok", message: acceptFeedback ? "用户已确认待执行工具，并补充执行要求" : "用户已确认待执行工具", data: { tool: pending.name, has_accept_feedback: !!acceptFeedback } });
        const step = [...run.steps].reverse().find(item => item.tool?.signature === pending.signature && item.observation === undefined);
        const started = runtime.now ? runtime.now() : Date.now();
        try {
            const preHooks = (0, runtime_1.runGlobalAgentHooks)("pre_tool_use", { run, tool: pending.name, args: pending.arguments, risk: pending.risk });
            if (preHooks.blocked)
                throw new Error(`Hook 阻止执行 ${pending.name}${preHooks.message ? `：${preHooks.message}` : ""}`);
            (0, runtime_1.markGlobalAgentToolTodo)(run, pending.name, "in_progress", `确认后执行 ${pending.name}`);
            (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "tool_started", tool: pending.name, risk: pending.risk, confirmed: true, arguments: pending.arguments });
            emit(runtime, { type: "tool_started", tool: pending, confirmed: true }, run);
            const result = await runtime.executeTool(pending.name, pending.arguments, run);
            (0, reasoning_loop_1.captureReasoningFacts)(run.reasoning_loop, `confirmed_tool:${pending.name}`, result);
            (0, reasoning_loop_1.setReasoningAssertion)(run.reasoning_loop, { id: `tool_${pending.signature}`, label: `确认后的工具 ${pending.name} 产生可核验结果`, kind: "tool_outcome", status: result?.success === false || result?.error ? "failed" : "passed", evidence: [result], reason: "用户确认后执行" });
            if (step) {
                step.observation = compactObservation(result);
                step.duration_ms = Math.max(0, (runtime.now ? runtime.now() : Date.now()) - started);
            }
            run.tool_calls += 1;
            run.consecutive_failures = 0;
            if (result?.client_effect)
                run.client_effects.push(result.client_effect);
            (0, quality_center_1.recordAgentDecision)({
                run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
                intent: run.decision_summary?.intent || (0, quality_center_1.normalizeAgentDecisionIntent)(null, run.user_message),
                proposed_tool: { name: pending.name, arguments: pending.arguments }, risk: pending.risk,
                target_grounded: run.decision_summary?.groundedTarget !== false, authorization_basis: "confirmation",
                outcome: "executed", reasons: ["用户确认后执行原待处理工具"], status: "ok",
            });
            (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:tool_confirmed:${pending.signature}`, type: "global_agent.tool_completed", status: "ok", message: `${pending.name} 确认后执行完成`, data: { tool: pending.name, risk: pending.risk } });
            (0, runtime_1.runGlobalAgentHooks)("post_tool_use", { run, tool: pending.name, args: pending.arguments, risk: pending.risk, observation: result });
            (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "tool_completed", tool: pending.name, risk: pending.risk, confirmed: true, observation: compactObservation(result) });
            (0, runtime_1.markGlobalAgentToolTodo)(run, pending.name, result?.success === false || result?.error ? "blocked" : "done", result?.error || `${pending.name} 确认后执行完成`);
            emit(runtime, { type: "tool_completed", tool: pending, observation: result, confirmed: true }, run);
            if (!(result?.success === false || result?.error) && step)
                emitGlobalDispatchLaunchProgress(runtime, run, step);
        }
        catch (error) {
            if (step) {
                step.error = error?.message || String(error);
                step.observation = { success: false, error: step.error };
            }
            run.tool_calls += 1;
            run.consecutive_failures += 1;
            (0, reasoning_loop_1.setReasoningAssertion)(run.reasoning_loop, { id: `tool_${pending.signature}`, label: `确认后的工具 ${pending.name} 产生可核验结果`, kind: "tool_outcome", status: "failed", reason: error?.message || String(error) });
            (0, reasoning_loop_1.recordReasoningDeviation)(run.reasoning_loop, "confirmed_tool_failed", `${pending.name}: ${error?.message || error}`, "error");
            (0, reasoning_loop_1.recordReasoningPostmortem)(run.reasoning_loop, { trigger: "confirmed_tool_failed", whatHappened: `${pending.name} 在用户确认后执行失败`, correction: "保留失败证据并重新核对当前状态", preventRepeat: "确认只授权动作，不代表工具结果可跳过验证" });
            (0, quality_center_1.recordAgentDecision)({
                run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
                intent: run.decision_summary?.intent || (0, quality_center_1.normalizeAgentDecisionIntent)(null, run.user_message),
                proposed_tool: { name: pending.name, arguments: pending.arguments }, risk: pending.risk,
                target_grounded: run.decision_summary?.groundedTarget !== false, authorization_basis: "confirmation",
                outcome: "execution_failed", reasons: [step?.error || error?.message || String(error)], status: "error",
            });
            (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:tool_confirmed_failed:${pending.signature}`, type: "global_agent.tool_failed", status: "error", message: error?.message || String(error), data: { tool: pending.name, risk: pending.risk } });
            (0, runtime_1.runGlobalAgentHooks)("post_tool_use", { run, tool: pending.name, args: pending.arguments, risk: pending.risk, observation: { success: false, error: error?.message || String(error) } });
            (0, runtime_1.recordGlobalAgentRuntimeOutput)(run, { type: "tool_failed", tool: pending.name, risk: pending.risk, confirmed: true, error: error?.message || String(error) });
            (0, runtime_1.markGlobalAgentToolTodo)(run, pending.name, "blocked", error?.message || String(error));
        }
        run.pending_tool = null;
        run.updated_at = nowIso(runtime);
        saveRun(run, runtime.persist !== false);
    }
    else {
        const resumedAt = nowIso(runtime);
        applyGlobalResumeFeedback(run, runtime, options.feedback || options.acceptFeedback || "", { source: options.source || options.resumeSource || "user" });
        run.status = "running";
        run.resume_count += 1;
        run.updated_at = resumedAt;
        saveRun(run, runtime.persist !== false);
    }
    return continueLoop(run, runtime);
}
async function continueGlobalAgentRunWithClarification(id, answer, runtime, options = {}) {
    if (activeRuns.has(id))
        throw new Error("全局 Agent 当前仍在处理上一轮，请稍后再补充");
    const stored = getGlobalAgentRun(id);
    if (!stored)
        throw new Error("全局 Agent 运行不存在");
    const run = normalizeRun(stored);
    if (run.status !== "waiting_clarification")
        throw new Error("该运行当前不在等待澄清状态");
    const clarification = String(answer || "").trim();
    if (!clarification)
        throw new Error("澄清内容不能为空");
    const deniesAction = /(?:不要|不用|先别|暂时别|只分析|仅分析|不执行|不要执行)/.test(clarification);
    const inheritedAuthorization = run.explicit_write_authorization && !deniesAction;
    const currentAuthorization = options.explicitWriteAuthorization === true && !deniesAction;
    (0, reasoning_loop_1.appendReasoningClarification)(run.reasoning_loop, {
        question: run.clarification_question || run.final_reply || "请补充目标和影响范围",
        answer: clarification,
        authorizationScope: currentAuthorization ? ["本轮澄清消息明确允许的范围"] : inheritedAuthorization ? ["同一澄清链中的原始明确执行范围"] : [],
    });
    if (deniesAction)
        run.reasoning_loop.authorization_scope = [];
    (0, reasoning_loop_1.setReasoningAssertion)(run.reasoning_loop, { id: "clarification", label: "目标、授权与影响范围已澄清", kind: "intent", status: "passed", evidence: [clarification], reason: "用户已在同一待澄清运行中补充信息" });
    (0, reasoning_loop_1.explainReasoningDecision)(run.reasoning_loop, "continue_after_clarification", "合并原始目标与当前澄清，不新开无上下文运行");
    run.history.push({ role: "assistant", content: run.clarification_question || run.final_reply || "请补充信息" }, { role: "user", content: clarification });
    run.history = run.history.slice(-12);
    run.user_message = run.reasoning_loop.effective_goal;
    run.explicit_write_authorization = currentAuthorization || inheritedAuthorization;
    run.status = "running";
    run.phase = "plan";
    run.clarification_question = "";
    run.clarification_summary = null;
    run.confirmation_summary = null;
    run.final_reply = "";
    run.resume_count += 1;
    run.consecutive_failures = 0;
    run.updated_at = nowIso(runtime);
    saveRun(run, runtime.persist !== false);
    (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:clarified:${run.resume_count}`, type: "global_agent.clarification_received", status: "ok", message: clarification.slice(0, 1000), data: { plan_version: run.reasoning_loop.plan_version, authorization_inherited: inheritedAuthorization, authorization_current: currentAuthorization } });
    return continueLoop(run, runtime);
}
function pauseGlobalAgentRun(id) {
    const stored = getGlobalAgentRun(id);
    if (!stored)
        throw new Error("全局 Agent 运行不存在");
    if (stored.status !== "running")
        return stored;
    pauseRequests.add(id);
    const run = normalizeRun(stored);
    run.status = "paused";
    run.clarification_summary = null;
    run.confirmation_summary = null;
    run.updated_at = new Date().toISOString();
    saveRun(run, !volatileRuns.has(id));
    (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:paused:${run.updated_at}`, type: "global_agent.paused", status: "warning", message: "我已暂停这次运行" });
    return run;
}
function cancelGlobalAgentRun(id) {
    const stored = getGlobalAgentRun(id);
    if (!stored)
        throw new Error("全局 Agent 运行不存在");
    if (["completed", "failed", "cancelled"].includes(stored.status))
        return stored;
    cancelRequests.add(id);
    if (activeRuns.has(id))
        return stored;
    const run = normalizeRun(stored);
    run.status = "cancelled";
    run.final_reply = "用户已取消本次运行。";
    run.error = "user_cancelled";
    run.clarification_summary = null;
    run.confirmation_summary = null;
    run.completed_at = new Date().toISOString();
    if (run.plan_mode)
        run.plan_mode = updateGlobalPlanModeStatus(run.plan_mode, "cancelled", run.completed_at);
    run.updated_at = run.completed_at;
    saveRun(run, !volatileRuns.has(id));
    (0, reliability_ledger_1.appendTraceEvent)(run.trace_id, { id: `${run.id}:cancelled:${run.updated_at}`, type: "global_agent.run_cancelled", status: "warning", message: run.final_reply });
    return run;
}
async function recoverInterruptedGlobalAgentRuns(runtime) {
    const candidates = listGlobalAgentRuns({ status: "running", limit: 20 });
    const results = [];
    for (const stored of candidates) {
        const run = normalizeRun(stored);
        if (Date.now() > Date.parse(run.deadline_at)) {
            (0, reasoning_loop_1.recordReasoningRecoveryCheck)(run.reasoning_loop, { reason: "服务重启恢复时已超过截止时间", goalRevalidated: true, stateRevalidated: false, acceptanceRevalidated: false, remainingGaps: ["执行时间预算已耗尽"] });
            results.push(completeRun(run, runtime, "failed", "服务重启后发现运行已超过时间预算，已安全终止。", "recovery_deadline_exceeded"));
            continue;
        }
        const currentContext = runtime.getContext ? await runtime.getContext(run) : {};
        (0, reasoning_loop_1.captureReasoningFacts)(run.reasoning_loop, "restart_recovery_context", currentContext);
        (0, reasoning_loop_1.recordReasoningRecoveryCheck)(run.reasoning_loop, { reason: "服务重启后恢复同一运行", goalRevalidated: !!run.reasoning_loop.original_goal, stateRevalidated: true, acceptanceRevalidated: run.reasoning_loop.assertions.length > 0, remainingGaps: run.reasoning_loop.assertions.filter(item => item.status !== "passed").map(item => item.label) });
        run.resume_count += 1;
        results.push(await continueLoop(run, runtime));
    }
    return { total: candidates.length, resumed: results.filter(item => item.status !== "failed").length, results };
}
async function runGlobalAgentLoopSelfTest() {
    const calls = [];
    const decisions = [
        { state: "investigate", message: "先检查系统", tool: { name: "inspect_system", arguments: {} } },
        { state: "execute", message: "建立任务", tool: { name: "orchestrate_development", arguments: { business_goal: "实现支付", targets: [{ type: "project", project: "demo" }] } } },
        { state: "complete", message: "任务已建立", tool: null, completion: { evidence: ["mission-1"] } },
    ];
    const runtime = {
        persist: false,
        callModel: async () => decisions.shift(),
        executeTool: async (name) => { calls.push(name); return name === "inspect_system" ? { projects: ["demo"] } : { mission_id: "mission-1" }; },
        getContext: () => ({ projects: ["demo"] }),
    };
    const multi = await startGlobalAgentRun({ message: "请给 demo 实现支付", explicitWriteAuthorization: true, maxSteps: 6 }, runtime);
    const supervisedDecisions = [
        { state: "execute", message: "派发任务", intent: { category: "execution", goal: "给 demo 实现支付", action_required: true, target_refs: ["demo"], confidence: .96, authorization_basis: "current_message", reason: "用户明确要求异步实现" }, tool: { name: "orchestrate_development", arguments: { business_goal: "实现支付", targets: [{ type: "project", project: "demo" }] } } },
        { state: "complete", message: "任务已派发", intent: { category: "execution", goal: "给 demo 实现支付", action_required: true, target_refs: ["demo"], confidence: .96, authorization_basis: "current_message", reason: "派发工具已返回" }, tool: null },
    ];
    const supervisedEvents = [];
    const supervised = await startGlobalAgentRun({ message: "异步给 demo 实现支付", explicitWriteAuthorization: true }, {
        persist: false,
        callModel: async () => supervisedDecisions.shift(),
        executeTool: async (_name, _args, run) => {
            attachGlobalAgentRunSupervision(run, { mission_id: "mission-supervised", supervisor_id: "supervisor-1" });
            return { accepted: true, completed: false, mission_id: "mission-supervised", supervisor_id: "supervisor-1" };
        },
        onEvent: event => supervisedEvents.push(event),
    });
    const supervisedWaiting = updateGlobalAgentSupervisionState(supervised.id, "waiting_user");
    const supervisedReworking = updateGlobalAgentSupervisionState(supervised.id, "reworking");
    const supervisedGoalSteer = applyGlobalAgentSupervisionSteer(supervised.id, "目标调整为只保留兼容字段，不再删除旧表", {
        kind: "revise_goal",
        source: "self-test",
        requestId: "supervised-goal-revision",
        supervisorState: "monitoring",
        continuationSummary: {
            affected_task_count: 2,
            queued_task_count: 1,
            deferred_task_count: 1,
            interrupted_task_count: 1,
            failed_task_count: 0,
        },
    });
    const supervisedCompleted = completeGlobalAgentSupervision(supervised.id, { summary: "最终交付", acceptance_gate_passed: true }, "completed");
    const consultationEvents = [];
    const consultation = await startGlobalAgentRun({ message: "知识库压缩是怎么实现的" }, {
        persist: false,
        callModel: async () => ({ state: "answer", message: "这是原理说明，不执行任务", tool: null }),
        executeTool: async () => { throw new Error("不应调用工具"); },
        onEvent: event => consultationEvents.push(event),
    });
    const readOnlyStatusConsultationDecisions = [
        {
            state: "investigate",
            message: "正在读取系统状态",
            intent: { category: "question", goal: "了解系统状态", action_required: false, confidence: .98, authorization_basis: "none", reason: "用户只要求查看当前状态" },
            tool: { name: "inspect_system", arguments: {} },
        },
        {
            state: "answer",
            message: "系统目前可用：已配置 7 个项目和 3 个协作群，定时任务当前未启用。",
            intent: { category: "question", goal: "了解系统状态", action_required: false, confidence: .98, authorization_basis: "none", reason: "已读取系统状态并直接回答" },
            tool: null,
        },
    ];
    const readOnlyStatusConsultation = await startGlobalAgentRun({ message: "系统状态怎么样" }, {
        persist: false,
        callModel: async () => readOnlyStatusConsultationDecisions.shift(),
        executeTool: async () => ({ projects: 7, groups: 3, cron_enabled: false }),
    });
    const protocolLeak = await startGlobalAgentRun({ message: "普通问话：解释一下任务状态" }, {
        persist: false,
        callModel: async () => ({
            state: "answer",
            message: "CCM_AGENT_RECEIPT status=done trace_id=trace-secret <task-notification>raw payload</task-notification>",
            intent: { category: "question", goal: "解释任务状态", action_required: false, confidence: .96, authorization_basis: "none", reason: "普通问话" },
            tool: null,
        }),
        executeTool: async () => { throw new Error("不应调用工具"); },
    });
    const artifactLeak = await startGlobalAgentRun({ message: "普通问话：复核报告在哪里" }, {
        persist: false,
        callModel: async () => ({
            state: "answer",
            message: "TestAgent passed. Report: C:/Users/admin/.cc-connect/test-agent-artifacts/run-1/report.md; manifest: C:/Users/admin/.cc-connect/test-agent-artifacts/run-1/artifact-manifest.json; verdict: C:/Users/admin/.cc-connect/test-agent-artifacts/run-1/verdict.json",
            intent: { category: "question", goal: "查看复核报告", action_required: false, confidence: .96, authorization_basis: "none", reason: "普通问话" },
            tool: null,
        }),
        executeTool: async () => { throw new Error("不应调用工具"); },
    });
    const waitingEvents = [];
    const waiting = await startGlobalAgentRun({ message: "支付功能怎么做" }, {
        persist: false,
        callModel: async () => ({ state: "execute", message: "需要修改代码", tool: { name: "send_project_cmd", arguments: { project: "demo", message: "实现支付" } } }),
        executeTool: async () => ({ success: true }),
        onEvent: event => waitingEvents.push(event),
    });
    const clarificationDecisions = [
        { state: "execute", message: "按澄清后的目标执行", plan: ["确认 demo 当前状态", "实现支付", "验证结果"], intent: { category: "execution", goal: "给 demo 实现支付", action_required: true, target_refs: ["demo"], impact_scope: ["支付模块"], confidence: .96, authorization_basis: "current_message", reason: "用户已补充目标和范围" }, tool: { name: "send_project_cmd", arguments: { project: "demo", message: "实现支付并验证" } } },
        { state: "complete", message: "澄清后的任务已执行", intent: { category: "execution", goal: "给 demo 实现支付", action_required: true, target_refs: ["demo"], confidence: .96, authorization_basis: "current_message", reason: "工具已返回可核验结果" }, tool: null, completion: { evidence: ["demo:success"] } },
    ];
    const clarifiedEvents = [];
    const clarified = await continueGlobalAgentRunWithClarification(waiting.id, "请给 demo 实现支付，只改支付模块并完成验证", {
        persist: false,
        callModel: async () => clarificationDecisions.shift(),
        executeTool: async () => ({ success: true, project: "demo", verification: "passed" }),
        getContext: () => ({ projects: ["demo"], current_head: "abc" }),
        onEvent: event => clarifiedEvents.push(event),
    }, { explicitWriteAuthorization: true });
    const analysisClarificationEvents = [];
    const analysisWaiting = await startGlobalAgentRun({ message: "帮我优化一下", explicitWriteAuthorization: true }, {
        persist: false,
        callModel: async () => ({ state: "needs_confirmation", message: "请说明目标和是否执行", intent: { category: "ambiguous", goal: "优化", action_required: true, confidence: .3, reason: "范围不清" }, tool: null }),
        executeTool: async () => { throw new Error("不应执行"); },
        onEvent: event => analysisClarificationEvents.push(event),
    });
    const analysisClarified = await continueGlobalAgentRunWithClarification(analysisWaiting.id, "只分析 demo 的性能方向，不执行、不修改代码", {
        persist: false,
        callModel: async () => ({ state: "answer", message: "只提供分析建议", intent: { category: "analysis", goal: "分析 demo 性能", action_required: false, target_refs: ["demo"], confidence: .96, authorization_basis: "none", reason: "用户明确禁止执行" }, tool: null }),
        executeTool: async () => { throw new Error("不应执行"); },
    }, { explicitWriteAuthorization: false });
    const replanDecisions = [
        { state: "execute", message: "按初始方案执行", plan: ["直接修复", "验证"], intent: { category: "execution", goal: "修复 demo 登录", action_required: true, target_refs: ["demo"], confidence: .95, reason: "先尝试修复" }, tool: { name: "send_project_cmd", arguments: { project: "demo", message: "按旧入口修复登录" } } },
        { state: "execute", message: "观察变化后重规划", plan: ["重新读取当前入口", "按新入口修复", "验证"], intent: { category: "execution", goal: "修复 demo 登录", action_required: true, target_refs: ["demo"], confidence: .96, reason: "旧入口不存在，依据工具观察调整方案" }, tool: { name: "send_project_cmd", arguments: { project: "demo", message: "读取当前入口后修复登录并验证" } } },
        { state: "complete", message: "已按当前入口修复并验证", intent: { category: "execution", goal: "修复 demo 登录", action_required: true, target_refs: ["demo"], confidence: .97, reason: "重规划后的工具返回成功证据" }, tool: null, completion: { evidence: ["verification:passed"] } },
    ];
    let replanAttempt = 0;
    const replanned = await startGlobalAgentRun({ message: "请修复 demo 登录并验证", explicitWriteAuthorization: true }, {
        persist: false,
        callModel: async () => replanDecisions.shift(),
        executeTool: async () => (++replanAttempt === 1 ? { success: false, error: "旧登录入口已不存在" } : { success: true, verification: "passed" }),
        getContext: () => ({ project: "demo", current_head: "new-head" }),
    });
    const destructiveDecisions = [
        { state: "execute", message: "删除前确认", plan: ["确认删除对象和影响范围", "等待用户确认", "执行删除并汇报结果"], tool: { name: "manage_task", arguments: { operation: "delete", id: "t1" } } },
        { state: "complete", message: "确认后的删除已执行", tool: null, completion: { evidence: ["deleted:t1"] } },
    ];
    let destructiveExecutions = 0;
    const destructiveEvents = [];
    const destructiveRuntime = {
        persist: false,
        callModel: async () => destructiveDecisions.shift(),
        executeTool: async () => { destructiveExecutions += 1; return { success: true, deleted: "t1" }; },
        onEvent: event => destructiveEvents.push(event),
    };
    const destructive = await startGlobalAgentRun({ message: "删除任务 t1", explicitWriteAuthorization: true }, destructiveRuntime);
    const confirmed = await resumeGlobalAgentRun(destructive.id, destructiveRuntime, { approved: true, feedback: "保留任务归档记录" });
    const invalidDecisions = [
        { state: "execute", message: "错误工具", tool: { name: "not_registered", arguments: {} } },
        { state: "execute", message: "仍然错误", tool: { name: "not_registered", arguments: {} } },
    ];
    const invalid = await startGlobalAgentRun({ message: "测试错误收敛" }, {
        persist: false,
        callModel: async () => invalidDecisions.shift(),
        executeTool: async () => ({ success: true }),
    });
    const duplicateDecisions = [
        { state: "investigate", message: "查一次", tool: { name: "inspect_system", arguments: {} } },
        { state: "investigate", message: "查两次", tool: { name: "inspect_system", arguments: {} } },
        { state: "investigate", message: "查三次", tool: { name: "inspect_system", arguments: {} } },
    ];
    const duplicate = await startGlobalAgentRun({ message: "测试循环保护" }, {
        persist: false,
        callModel: async () => duplicateDecisions.shift(),
        executeTool: async () => ({ success: true }),
    });
    let pausedRunId = "";
    let releaseFirstDecision = null;
    const pauseDecisions = [{ state: "complete", message: "恢复后完成", tool: null }];
    const pauseEvents = [];
    const pauseRuntime = {
        persist: false,
        onEvent: event => {
            pauseEvents.push(event);
            if (event.type === "started")
                pausedRunId = event.run_id;
        },
        callModel: async () => {
            if (!releaseFirstDecision)
                return new Promise(resolve => { releaseFirstDecision = resolve; });
            return pauseDecisions.shift();
        },
        executeTool: async () => ({ success: true }),
    };
    const pausingPromise = startGlobalAgentRun({ message: "测试暂停恢复" }, pauseRuntime);
    while (!pausedRunId || !releaseFirstDecision)
        await new Promise(resolve => setTimeout(resolve, 0));
    pauseGlobalAgentRun(pausedRunId);
    releaseFirstDecision({ state: "investigate", message: "暂停前读取", tool: { name: "inspect_system", arguments: {} } });
    const paused = await pausingPromise;
    const resumeFeedback = "继续时补齐交付证据、验证结果和验收结论";
    const resumed = await resumeGlobalAgentRun(paused.id, pauseRuntime, { feedback: resumeFeedback, source: "quality_followup" });
    let steeringRunId = "";
    let releaseSteeringDecision = null;
    let steeringModelCall = 0;
    const steeringMessages = [];
    const steeringEvents = [];
    const steeringPromise = startGlobalAgentRun({
        message: "请说明 demo 的登录恢复方案",
        explicitWriteAuthorization: true,
    }, {
        persist: false,
        onEvent: event => {
            steeringEvents.push(event);
            if (event.type === "started")
                steeringRunId = event.run_id;
        },
        callModel: async (messages) => {
            steeringMessages.push(messages);
            steeringModelCall += 1;
            if (steeringModelCall === 1) {
                return new Promise(resolve => { releaseSteeringDecision = resolve; });
            }
            return {
                state: "answer",
                message: "已把失败回滚策略纳入方案。",
                intent: { category: "analysis", goal: "说明登录恢复与失败回滚方案", action_required: false, target_refs: ["demo"], confidence: .98, authorization_basis: "none", reason: "用户补充了失败回滚要求" },
                tool: null,
            };
        },
        executeTool: async () => { throw new Error("不应执行工具"); },
    });
    while (!steeringRunId || !releaseSteeringDecision)
        await new Promise(resolve => setTimeout(resolve, 0));
    const steeringRequestId = "selftest-steer-supplement";
    const queuedSteering = steerGlobalAgentRun(steeringRunId, "再补充失败时的回滚策略", {
        kind: "supplement",
        source: "selftest",
        requestId: steeringRequestId,
    });
    const duplicateSteering = steerGlobalAgentRun(steeringRunId, "这条重复请求不应再次入队", {
        kind: "supplement",
        source: "selftest",
        requestId: steeringRequestId,
    });
    releaseSteeringDecision({ state: "answer", message: "这是未读取补充要求的旧回答", tool: null });
    const steered = await steeringPromise;
    let revisionRunId = "";
    let releaseRevisionDecision = null;
    let revisionModelCall = 0;
    const revisionMessages = [];
    const revisionEvents = [];
    const revisionPromise = startGlobalAgentRun({
        message: "请直接修改 demo 登录模块并验证",
        explicitWriteAuthorization: true,
    }, {
        persist: false,
        onEvent: event => {
            revisionEvents.push(event);
            if (event.type === "started")
                revisionRunId = event.run_id;
        },
        callModel: async (messages) => {
            revisionMessages.push(messages);
            revisionModelCall += 1;
            if (revisionModelCall === 1) {
                return new Promise(resolve => { releaseRevisionDecision = resolve; });
            }
            return {
                state: "answer",
                message: "已按最新目标改为只分析风险，不修改代码。",
                intent: { category: "analysis", goal: "只分析 demo 登录风险", action_required: false, target_refs: ["demo"], confidence: .99, authorization_basis: "none", reason: "用户执行中调整目标并撤销修改范围" },
                tool: null,
            };
        },
        executeTool: async () => { throw new Error("目标调整后不应执行旧工具"); },
    });
    while (!revisionRunId || !releaseRevisionDecision)
        await new Promise(resolve => setTimeout(resolve, 0));
    steerGlobalAgentRun(revisionRunId, "目标调整为只分析登录风险，不执行、不修改代码", {
        kind: "revise_goal",
        source: "selftest",
        requestId: "selftest-steer-revision",
    });
    releaseRevisionDecision({
        state: "execute",
        message: "这是目标调整前的旧执行决定",
        intent: { category: "execution", goal: "修改 demo 登录模块", action_required: true, target_refs: ["demo"], confidence: .98, authorization_basis: "current_message", reason: "旧目标要求修改" },
        tool: { name: "send_project_cmd", arguments: { project: "demo", message: "修改登录模块" } },
    });
    const revisedDuringRun = await revisionPromise;
    const parsedFence = parseGlobalAgentDecision("```json\n{\"state\":\"answer\",\"message\":\"ok\",\"tool\":null}\n```");
    let shadowExecutions = 0;
    const shadow = await startGlobalAgentRun({ message: "请给 demo 修复登录问题", explicitWriteAuthorization: true }, {
        persist: false,
        qualityPolicyOverride: { shadowMode: true },
        callModel: async () => ({
            state: "execute",
            message: "准备修复",
            intent: { category: "execution", goal: "修复 demo 登录", action_required: true, target_refs: ["demo"], confidence: .96, authorization_basis: "current_message", reason: "用户明确要求修复" },
            tool: { name: "send_project_cmd", arguments: { project: "demo", message: "修复登录" } },
        }),
        executeTool: async () => { shadowExecutions += 1; return { success: true }; },
    });
    const workchainSelfTest = (0, workchain_1.runMainAgentWorkchainSelfTest)();
    const deliveryReportSelfTest = (0, delivery_report_1.runMainAgentDeliveryReportSelfTest)();
    const supervisedDispatchSummary = supervised.display_stream?.dispatch_launch_summary || supervised.display_stream?.dispatchLaunchSummary || null;
    const clarifiedDispatchSummary = clarified.display_stream?.dispatch_launch_summary || clarified.display_stream?.dispatchLaunchSummary || null;
    const supervisedDispatchEvent = supervisedEvents.find(event => event.type === "dispatch_launch_summary");
    const clarifiedDispatchEvent = clarifiedEvents.find(event => event.type === "dispatch_launch_summary");
    const completedTargetDispatchSummary = buildGlobalDispatchLaunchSummary({
        steps: [{
                index: 0,
                state: "completed",
                tool: {
                    name: "orchestrate_development",
                    arguments: {
                        business_goal: "同步旧任务状态",
                        targets: [{ type: "project", project: "legacy-web", status: "done" }],
                    },
                },
                observation: {},
            }],
        original_user_message: "同步旧任务状态",
        user_message: "同步旧任务状态",
    }, "running");
    const dispatchSummaryText = JSON.stringify({ supervisedDispatchSummary, clarifiedDispatchSummary });
    const globalWaitingSummaryText = JSON.stringify({
        qualityClarification: waiting.clarification_summary,
        directClarification: analysisWaiting.clarification_summary,
        confirmation: destructive.confirmation_summary,
    });
    const checks = {
        multiStepCompletes: multi.status === "completed",
        dispatchIsNotDeliveryCompletion: supervised.status === "supervising" && supervised.final_reply.includes("不代表任务已经完成"),
        acceptedDispatchStopsSynchronousPolling: supervised.model_calls === 1 && supervised.tool_calls === 1,
        supervisingVisibleReplyHidesTechnicalIds: !/任务 ID|监工 ID|mission-supervised|supervisor-1/i.test(supervised.final_reply)
            && JSON.stringify(supervised.display_stream?.technical_details || []).includes("mission-supervised")
            && JSON.stringify(supervised.display_stream?.technical_details || []).includes("supervisor-1"),
        finalGateCompletesOriginalRun: supervisedCompleted?.status === "completed" && supervisedCompleted?.supervision_state === "completed",
        globalSupervisionWaitingRefreshesVisibleWorkchain: supervisedWaiting?.status === "supervising"
            && supervisedWaiting?.supervision_state === "waiting_user"
            && supervisedWaiting?.phase === "needs_confirmation"
            && supervisedWaiting?.final_reply.includes("等你处理")
            && supervisedWaiting?.final_reply.includes("不是完成结果")
            && supervisedWaiting?.display_stream?.workchain?.user_visible_text?.includes("等你处理")
            && JSON.stringify(supervisedWaiting?.display_stream?.technical_details || []).includes("supervisor-1")
            && !/supervisor-1|mission-supervised|trace_id|run_id/.test(supervisedWaiting?.final_reply || ""),
        globalSupervisionReworkRefreshesVisibleWorkchain: supervisedReworking?.status === "supervising"
            && supervisedReworking?.supervision_state === "reworking"
            && supervisedReworking?.phase === "execute"
            && supervisedReworking?.final_reply.includes("返工")
            && supervisedReworking?.final_reply.includes("重新复核")
            && supervisedReworking?.display_stream?.workchain?.completion_summary?.next_action?.includes("重新运行 TestAgent"),
        globalSupervisionGoalRevisionStopsOldRunAndReplans: supervisedGoalSteer.applied === true
            && supervisedGoalSteer.run.status === "supervising"
            && supervisedGoalSteer.run.phase === "plan"
            && supervisedGoalSteer.run.supervision_state === "replanning"
            && supervisedGoalSteer.run.final_reply.includes("旧执行已停止")
            && supervisedGoalSteer.run.explicit_write_authorization === false
            && supervisedGoalSteer.run.reasoning_loop.authorization_scope.length === 0
            && supervisedGoalSteer.run.reasoning_loop.replan_required === true
            && supervisedGoalSteer.run.user_steer_history?.some(item => item.request_id === "supervised-goal-revision" && item.status === "applied")
            && supervisedGoalSteer.run.todo_plan?.steps?.find((item) => item.id === "replan_supervised_mission")?.status === "in_progress"
            && supervisedGoalSteer.run.todo_plan?.steps?.find((item) => item.id === "rerun_acceptance_review")?.status === "pending"
            && supervisedGoalSteer.run.display_stream?.main_agent_decision?.todo_plan === supervisedGoalSteer.run.todo_plan
            && JSON.stringify(supervisedGoalSteer.run.display_stream?.technical_details || []).includes("停止旧执行轮"),
        modelObservesAndContinues: calls.join(",") === "inspect_system,orchestrate_development",
        consultationDoesNotDispatch: consultation.tool_calls === 0,
        ordinaryConversationUsesQuietWorkchain: consultation.workchain?.mode === "conversation"
            && consultation.display_stream?.todo?.visible === false,
        readOnlySystemStatusUsesQuietWorkchain: readOnlyStatusConsultation.tool_calls === 1
            && readOnlyStatusConsultation.workchain?.mode === "conversation"
            && readOnlyStatusConsultation.display_stream?.todo?.visible === false
            && !readOnlyStatusConsultation.final_delivery_report
            && !/处理总结|验证与验收|下一步/.test(readOnlyStatusConsultation.final_reply),
        globalVisibleReplySanitizesProtocol: !GLOBAL_USER_SUMMARY_INTERNAL_PATTERN.test(protocolLeak.final_reply)
            && protocolLeak.final_reply.length > 0,
        globalVisibleReplyStoresRawTechnicalContent: String(protocolLeak.final_report?.technical_content || "").includes("CCM_AGENT_RECEIPT")
            && JSON.stringify(protocolLeak.display_stream?.technical_details || []).includes("CCM_AGENT_RECEIPT"),
        globalProtocolLeakAnswerHasNoPlanMode: !protocolLeak.plan_mode && !protocolLeak.display_stream?.main_agent_decision,
        globalVisibleReplyHidesArtifactPaths: !/test-agent-artifacts|artifact-manifest\.json|report\.md|verdict\.json/i.test(artifactLeak.final_reply)
            && /技术详情/.test(artifactLeak.final_reply)
            && String(artifactLeak.final_report?.technical_content || "").includes("artifact-manifest.json")
            && JSON.stringify(artifactLeak.display_stream?.technical_details || []).includes("report.md"),
        globalArtifactLeakAnswerHasNoPlanMode: !artifactLeak.plan_mode && !artifactLeak.display_stream?.main_agent_decision,
        ambiguousConsultationNeedsClarification: waiting.status === "waiting_clarification" && waiting.tool_calls === 0,
        clarificationContinuesSameRun: clarified.id === waiting.id && clarified.status === "completed" && clarified.reasoning_loop.clarification_chain.length === 1,
        clarificationPreservesOriginalGoal: clarified.reasoning_loop.original_goal === "支付功能怎么做" && clarified.reasoning_loop.effective_goal.includes("demo"),
        reasoningPlanAndFactsAreAudited: clarified.reasoning_loop.plan_version >= 1 && clarified.reasoning_loop.fact_snapshots.length >= 1 && clarified.reasoning_loop.assertions.some(item => item.kind === "tool_outcome" && item.status === "passed"),
        clarificationCanRevokeAuthorization: analysisClarified.id === analysisWaiting.id && analysisClarified.status === "completed" && analysisClarified.explicit_write_authorization === false && analysisClarified.reasoning_loop.authorization_scope.length === 0 && analysisClarified.tool_calls === 0,
        toolFailureTriggersAuditedReplan: replanned.status === "completed" && replanned.reasoning_loop.plan_version === 2 && replanned.reasoning_loop.deviations.some(item => item.type === "tool_result_mismatch") && replanned.reasoning_loop.assertions.some(item => item.kind === "tool_outcome" && item.status === "failed") && replanned.reasoning_loop.assertions.some(item => item.kind === "tool_outcome" && item.status === "passed"),
        destructiveAlwaysNeedsConfirmation: destructive.status === "waiting_confirmation",
        globalPlanModeVisible: destructive.plan_mode?.schema === "ccm-global-main-agent-plan-mode-v1"
            && destructive.plan_mode?.confirmation_status === "awaiting_confirmation"
            && destructive.plan_mode?.steps?.some((item) => item.label?.includes("等待用户确认")),
        globalPlanModeCompletesAfterConfirmation: confirmed.plan_mode?.confirmation_status === "completed"
            && confirmed.plan_mode?.steps?.every((item) => item.status === "completed"),
        globalConfirmedPlanHasExecutionFollowup: confirmed.plan_mode?.plan_execution_followup?.schema === "ccm-main-agent-plan-execution-followup-v1"
            && confirmed.plan_mode?.plan_execution_followup?.headline?.includes("最终总结前逐项核对验收标准"),
        globalConfirmedPlanCarriesAcceptFeedback: confirmed.plan_accept_feedback === "保留任务归档记录"
            && confirmed.plan_mode?.accepted_feedback === "保留任务归档记录"
            && confirmed.plan_mode?.accepted_feedback_history?.some((item) => item.feedback === "保留任务归档记录")
            && confirmed.plan_mode?.acceptance?.some((item) => item.includes("保留任务归档记录"))
            && confirmed.plan_mode?.plan_execution_followup?.headline?.includes("补充要求")
            && confirmed.reasoning_loop.assertions.some(item => item.id === "plan_accept_feedback" && item.status === "passed"),
        globalOrdinaryAnswerHasNoPlanMode: !consultation.plan_mode && !consultation.display_stream?.plan_mode,
        confirmationExecutesExactPendingToolOnce: confirmed.status === "completed" && destructiveExecutions === 1,
        invalidToolsConvergeToFailure: invalid.status === "failed" && invalid.error.includes("未注册工具"),
        duplicateLoopIsStopped: duplicate.status === "failed" && duplicate.error === "duplicate_tool_loop",
        pauseAndResumeWorks: paused.status === "paused" && resumed.status === "completed",
        globalResumeCarriesFeedback: resumed.last_resume_feedback === resumeFeedback
            && resumed.lastResumeFeedback === resumeFeedback
            && resumed.resume_feedback_history?.some((item) => item.feedback === resumeFeedback && item.status === "paused")
            && resumed.resumeFeedbackHistory?.some((item) => item.feedback === resumeFeedback)
            && resumed.history.some(item => item.role === "user" && item.content.includes(resumeFeedback))
            && resumed.reasoning_loop.fact_snapshots.some(item => item.source === "resume_feedback" && item.summary.includes(resumeFeedback))
            && resumed.reasoning_loop.assertions.some(item => item.id === "resume_feedback" && item.status === "passed")
            && pauseEvents.some(event => event.type === "resume_feedback" && event.feedback === resumeFeedback && event.source === "quality_followup"),
        globalMidTurnSteerUsesSameRun: steered.id === steeringRunId
            && steered.status === "completed"
            && steeringModelCall === 2
            && steeringMessages[1]?.some(item => item.content.includes("再补充失败时的回滚策略")),
        globalMidTurnSteerConsumesOnce: queuedSteering.duplicate === false
            && duplicateSteering.duplicate === true
            && steered.pending_user_messages?.length === 0
            && steered.user_steer_history?.filter(item => item.request_id === steeringRequestId).length === 1
            && steered.user_steer_history?.some(item => item.request_id === steeringRequestId && item.status === "applied")
            && steered.history.filter(item => item.role === "user" && item.content.includes("再补充失败时的回滚策略")).length === 1,
        globalMidTurnSteerStreamsFriendlyAppliedEvent: steeringEvents.some(event => event.type === "user_steer_applied"
            && event.steering?.kind === "supplement"
            && event.message.includes("补充要求已纳入")),
        globalMidTurnGoalRevisionForcesReplanAndRevokesAuthorization: revisedDuringRun.status === "completed"
            && revisionModelCall === 2
            && revisionMessages[1]?.some(item => item.content.includes("目标调整为只分析登录风险"))
            && revisedDuringRun.explicit_write_authorization === false
            && revisedDuringRun.reasoning_loop.authorization_scope.length === 0
            && revisedDuringRun.reasoning_loop.replan_required === true
            && revisedDuringRun.tool_calls === 0
            && revisionEvents.some(event => event.type === "user_steer_applied" && event.replan_required === true),
        fencedJsonParses: parsedFence.state === "answer",
        shadowModeHasNoSideEffect: shadow.status === "completed" && shadow.shadow_mode === true && shadow.tool_calls === 0 && shadowExecutions === 0,
        completedRunsHaveWorkchain: !!multi.display_stream?.workchain && !!supervisedCompleted?.display_stream?.workchain,
        completedRunsHaveProgressCheckpoints: !!multi.display_stream?.progress_checkpoints?.items?.length && !!supervisedCompleted?.display_stream?.progress_checkpoints?.items?.length,
        workchainSelfTestPasses: workchainSelfTest.pass === true,
        deliveryReportSelfTestPasses: deliveryReportSelfTest.pass === true,
        executionRunsHaveUnifiedDeliveryReport: supervisedCompleted?.final_delivery_report?.schema === "ccm-main-agent-delivery-report-v1",
        executionRunsHaveCompletionCard: supervisedCompleted?.final_delivery_report?.completion_card?.schema === "ccm-main-agent-completion-card-v1",
        ordinaryAnswerDoesNotShowDeliveryReport: !consultation.final_delivery_report && !consultation.display_stream?.delivery_report,
        globalDispatchLaunchSummaryVisible: supervisedDispatchSummary?.schema === "ccm-main-agent-dispatch-launch-summary-v1"
            && supervisedDispatchSummary?.rows?.some((row) => row.agent === "demo")
            && supervised.display_stream?.main_agent_decision?.dispatch_launch_summary?.rows?.length >= 1,
        globalDispatchLaunchSummaryStreamsLive: supervisedDispatchEvent?.dispatch_launch_summary?.schema === "ccm-main-agent-dispatch-launch-summary-v1"
            && supervisedDispatchEvent?.progress_checkpoint?.label === "已派发的工作",
        globalDispatchLaunchSummaryDoesNotCallDoneTargetCompleted: completedTargetDispatchSummary?.rows?.[0]?.status === "reviewing"
            && completedTargetDispatchSummary?.rows?.[0]?.status_label === "已回传结果，待验收"
            && !JSON.stringify(completedTargetDispatchSummary).includes("已完成"),
        globalAutoPlanModeStreamsLive: supervisedEvents.some(event => event.type === "plan_mode_ready"
            && event.plan_mode?.schema === "ccm-global-main-agent-plan-mode-v1"
            && event.plan_mode?.auto_continue === true
            && event.plan_mode?.steps?.length >= 2),
        globalAutoPlanModeHasExecutionFollowup: supervisedEvents.some(event => event.type === "plan_mode_ready"
            && event.plan_mode?.auto_continue === true
            && event.plan_mode?.plan_execution_followup?.schema === "ccm-main-agent-plan-execution-followup-v1"
            && event.plan_mode?.plan_execution_followup?.next_action?.includes("验证证据")),
        globalOrdinaryAnswerHasNoPlanModeEvent: !consultationEvents.some(event => event.type === "plan_mode_ready" || event.plan_mode || event.planMode),
        globalProjectDispatchLaunchSummaryVisible: clarifiedDispatchSummary?.schema === "ccm-main-agent-dispatch-launch-summary-v1"
            && clarifiedDispatchSummary?.rows?.some((row) => row.agent === "demo" && row.role === "项目执行成员"),
        globalProjectDispatchLaunchSummaryStreamsLive: clarifiedDispatchEvent?.dispatch_launch_summary?.rows?.some((row) => row.agent === "demo" && row.role === "项目执行成员"),
        globalOrdinaryAnswerHasNoDispatchLaunchSummary: !consultation.display_stream?.dispatch_launch_summary && !consultation.display_stream?.dispatchLaunchSummary,
        globalOrdinaryAnswerHasNoDispatchLaunchEvent: !consultationEvents.some(event => event.type === "dispatch_launch_summary"),
        globalDispatchLaunchSummaryHidesProtocol: !/CCM_AGENT_RECEIPT|task-notification|receipt-status|trace_id|session_id|raw payload/i.test(dispatchSummaryText),
        globalClarificationSummaryVisible: analysisWaiting.clarification_summary?.schema === "ccm-global-main-agent-clarification-summary-v1"
            && analysisWaiting.clarification_summary?.display_policy?.show_todo === false
            && analysisClarificationEvents.some(event => event.type === "clarification_required" && event.clarification_summary?.schema === "ccm-global-main-agent-clarification-summary-v1"),
        globalQualityClarificationSummaryStreamsLive: waiting.clarification_summary?.schema === "ccm-global-main-agent-clarification-summary-v1"
            && waitingEvents.some(event => event.type === "clarification_required" && event.clarification_summary?.display_policy?.technical_default_collapsed === true),
        globalConfirmationSummaryVisible: destructive.confirmation_summary?.schema === "ccm-global-main-agent-confirmation-summary-v1"
            && destructive.confirmation_summary?.display_policy?.show_todo === false
            && destructiveEvents.some(event => event.type === "confirmation_required" && event.confirmation_summary?.schema === "ccm-global-main-agent-confirmation-summary-v1"),
        globalPlanModeStreamsLive: destructiveEvents.some(event => event.type === "confirmation_required"
            && event.plan_mode?.schema === "ccm-global-main-agent-plan-mode-v1"
            && event.plan_mode?.steps?.some((item) => item.label?.includes("等待用户确认"))),
        globalWaitingSummariesHideProtocol: !/CCM_AGENT_RECEIPT|task-notification|receipt-status|WorkerContextPacket|raw payload/i.test(globalWaitingSummaryText),
    };
    return {
        pass: Object.values(checks).every(Boolean),
        ...checks,
        workchain: workchainSelfTest.checks,
        deliveryReport: deliveryReportSelfTest.checks,
    };
}
//# sourceMappingURL=loop.js.map