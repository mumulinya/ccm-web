"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GLOBAL_AGENT_VISIBLE_COMPLETED_EVENT_FALLBACK = exports.GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK = exports.GLOBAL_PET_AGENT_NAME = void 0;
exports.compactPetText = compactPetText;
exports.globalVisibleText = globalVisibleText;
exports.globalSafeArray = globalSafeArray;
exports.globalUniqueStrings = globalUniqueStrings;
exports.globalTestAgentCoverageItemKey = globalTestAgentCoverageItemKey;
exports.globalUniqueCoverageItems = globalUniqueCoverageItems;
exports.globalTestAgentCoverageLabel = globalTestAgentCoverageLabel;
exports.globalTestAgentCoverageByStatus = globalTestAgentCoverageByStatus;
exports.globalTestAgentSummaryObjects = globalTestAgentSummaryObjects;
exports.globalTestAgentSummaryItems = globalTestAgentSummaryItems;
exports.globalTestAgentSummaryByStatus = globalTestAgentSummaryByStatus;
exports.globalTestAgentAcceptanceWeakReason = globalTestAgentAcceptanceWeakReason;
exports.globalTestAgentWeakAcceptanceItems = globalTestAgentWeakAcceptanceItems;
exports.summarizeGlobalTestAgentCoverageGap = summarizeGlobalTestAgentCoverageGap;
exports.collectGlobalTestAgentCoverageGaps = collectGlobalTestAgentCoverageGaps;
exports.globalTestAgentFailureTypeLabel = globalTestAgentFailureTypeLabel;
exports.scrubGlobalTestAgentEvidencePathText = scrubGlobalTestAgentEvidencePathText;
exports.collectGlobalTestAgentFailureItemsFromSource = collectGlobalTestAgentFailureItemsFromSource;
exports.collectGlobalTestAgentFailureItems = collectGlobalTestAgentFailureItems;
exports.summarizeGlobalTestAgentFailureItem = summarizeGlobalTestAgentFailureItem;
exports.summarizeGlobalTestAgentDiagnosticItem = summarizeGlobalTestAgentDiagnosticItem;
exports.collectGlobalTestAgentFailureSummaries = collectGlobalTestAgentFailureSummaries;
exports.globalRunVisibleReply = globalRunVisibleReply;
exports.getGlobalPetToolState = getGlobalPetToolState;
exports.getGlobalToolDisplayName = getGlobalToolDisplayName;
exports.buildGlobalAgentEventUi = buildGlobalAgentEventUi;
exports.relayGlobalPetEvent = relayGlobalPetEvent;
const display_1 = require("../collaboration/display");
const loop_1 = require("../../agents/global/loop");
exports.GLOBAL_PET_AGENT_NAME = "global-agent";
exports.GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK = "我已整理这次处理结果，是否已经交付以任务卡验收和最终总结为准。";
exports.GLOBAL_AGENT_VISIBLE_COMPLETED_EVENT_FALLBACK = "这轮处理结果已整理，最终是否交付以总结和验收结果为准。";
function compactPetText(value, max = 260) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > max ? `${text.slice(0, max)}...` : text;
}
function globalVisibleText(value, fallback = "我正在处理当前请求。", max = 260) {
    return (0, display_1.sanitizeMainAgentUserText)(value, fallback, max);
}
function globalSafeArray(value) {
    return Array.isArray(value) ? value : [];
}
function globalUniqueStrings(...lists) {
    const seen = new Set();
    const result = [];
    for (const list of lists) {
        for (const value of globalSafeArray(list)) {
            const text = String(value || "").trim();
            if (!text || seen.has(text))
                continue;
            seen.add(text);
            result.push(text);
        }
    }
    return result;
}
function globalTestAgentCoverageItemKey(item = {}) {
    const evidence = Array.isArray(item.evidence) ? item.evidence.join("|") : "";
    return [item.check || item.criterion || "", item.status || "", item.missingReason || "", evidence].join("|") || JSON.stringify(item || {});
}
function globalUniqueCoverageItems(...lists) {
    const seen = new Set();
    const result = [];
    for (const list of lists) {
        for (const item of globalSafeArray(list)) {
            const key = globalTestAgentCoverageItemKey(item);
            if (seen.has(key))
                continue;
            seen.add(key);
            result.push(item);
        }
    }
    return result;
}
function globalTestAgentCoverageLabel(type) {
    const value = String(type || "").trim().toLowerCase();
    const labels = {
        commands: "命令验证",
        command: "命令验证",
        build: "构建检查",
        unit_tests: "单元测试",
        http: "接口检查",
        api: "接口检查",
        browser_e2e: "浏览器流程",
        screenshots: "截图证据",
        console_errors: "控制台错误检查",
        independent_review: "独立复核",
    };
    return labels[value] || String(type || "检查项");
}
function globalTestAgentCoverageByStatus(report, key, status) {
    return globalSafeArray(report?.[key]).filter((item) => item?.status === status);
}
function globalTestAgentSummaryObjects(...values) {
    return values.filter(value => value && typeof value === "object" && !Array.isArray(value));
}
function globalTestAgentSummaryItems(summary, key, fallbackStatus) {
    return globalSafeArray(summary?.[key])
        .map((item) => ({ ...item, status: item?.status || fallbackStatus }));
}
function globalTestAgentSummaryByStatus(report, verdict, kind, status) {
    const summaryKey = kind === "required" ? "requiredCheckSummary" : "acceptanceSummary";
    const summarySnakeKey = kind === "required" ? "required_check_summary" : "acceptance_summary";
    const listKey = status === "not_verified" ? "notVerified" : "unknown";
    const summaries = globalTestAgentSummaryObjects(verdict?.[summaryKey], verdict?.[summarySnakeKey], report?.[summaryKey], report?.[summarySnakeKey], report?.verdict?.[summaryKey], report?.verdict?.[summarySnakeKey]);
    return summaries.flatMap(summary => globalTestAgentSummaryItems(summary, listKey, status));
}
function globalTestAgentAcceptanceWeakReason(item) {
    const strength = String(item?.matchStrength || item?.match_strength || "").toLowerCase();
    const source = String(item?.evidenceSource || item?.evidence_source || "").toLowerCase();
    const evidence = globalSafeArray(item?.evidence).filter(Boolean);
    if (strength === "fallback" || source === "single_criterion_report_status")
        return "只是从整体复核结果推断，建议补一条直接验证证据";
    if (strength === "none" || source === "none")
        return "缺少可直接对应到该验收条件的证据";
    if (!evidence.length && (strength || source))
        return "缺少可展示的验收证据样本";
    return "";
}
function globalTestAgentWeakAcceptanceItems(report, verdict) {
    const summaryObjects = globalTestAgentSummaryObjects(verdict?.acceptanceSummary, verdict?.acceptance_summary, report?.acceptanceSummary, report?.acceptance_summary, report?.verdict?.acceptanceSummary, report?.verdict?.acceptance_summary);
    const summaryItems = summaryObjects.flatMap(summary => globalTestAgentSummaryItems(summary, "verified", "verified"));
    const coverageItems = [
        ...globalSafeArray(verdict?.acceptanceCoverage),
        ...globalSafeArray(verdict?.acceptance_coverage),
        ...globalSafeArray(report?.acceptanceCoverage),
        ...globalSafeArray(report?.acceptance_coverage),
    ].filter((item) => item?.status === "verified");
    return globalUniqueCoverageItems(summaryItems, coverageItems)
        .filter((item) => !!globalTestAgentAcceptanceWeakReason(item));
}
function summarizeGlobalTestAgentCoverageGap(item, kind, state) {
    if (kind === "required") {
        const reason = item?.missingReason ? `：${globalVisibleText(item.missingReason, "", 140)}` : "";
        return `必检项：${globalTestAgentCoverageLabel(item?.check)}${state === "failed" ? "未覆盖" : "待确认"}${reason}`;
    }
    const criterion = globalVisibleText(item?.criterion || "未命名验收条件", "未命名验收条件", 180);
    return `验收条件${state === "failed" ? "未通过" : "待确认"}：${criterion}`;
}
function collectGlobalTestAgentCoverageGaps(report = {}, verdict = null) {
    const failedRequiredChecks = globalUniqueCoverageItems(verdict?.failedRequiredChecks, globalTestAgentCoverageByStatus(report, "requiredCheckCoverage", "not_verified"), globalTestAgentSummaryByStatus(report, verdict, "required", "not_verified"));
    const unknownRequiredChecks = globalUniqueCoverageItems(verdict?.unknownRequiredChecks, globalTestAgentCoverageByStatus(report, "requiredCheckCoverage", "unknown"), globalTestAgentSummaryByStatus(report, verdict, "required", "unknown"));
    const failedAcceptanceCriteria = globalUniqueCoverageItems(verdict?.failedAcceptanceCriteria, globalTestAgentCoverageByStatus(report, "acceptanceCoverage", "not_verified"), globalTestAgentSummaryByStatus(report, verdict, "acceptance", "not_verified"));
    const unknownAcceptanceCriteria = globalUniqueCoverageItems(verdict?.unknownAcceptanceCriteria, globalTestAgentCoverageByStatus(report, "acceptanceCoverage", "unknown"), globalTestAgentSummaryByStatus(report, verdict, "acceptance", "unknown"));
    const weakAcceptanceCriteria = globalTestAgentWeakAcceptanceItems(report, verdict);
    const failedLines = [
        ...failedRequiredChecks.map(item => summarizeGlobalTestAgentCoverageGap(item, "required", "failed")),
        ...failedAcceptanceCriteria.map(item => summarizeGlobalTestAgentCoverageGap(item, "acceptance", "failed")),
    ];
    const unknownLines = [
        ...unknownRequiredChecks.map(item => summarizeGlobalTestAgentCoverageGap(item, "required", "unknown")),
        ...unknownAcceptanceCriteria.map(item => summarizeGlobalTestAgentCoverageGap(item, "acceptance", "unknown")),
    ];
    const weakLines = weakAcceptanceCriteria.map((item) => {
        const criterion = globalVisibleText(item?.criterion || "未命名验收条件", "未命名验收条件", 180);
        const reason = globalVisibleText(globalTestAgentAcceptanceWeakReason(item), "建议补充直接验证证据。", 180);
        return `验收证据待确认：${criterion}（${reason}）`;
    });
    return {
        failedRequiredChecks,
        unknownRequiredChecks,
        failedAcceptanceCriteria,
        unknownAcceptanceCriteria,
        weakAcceptanceCriteria,
        failedLines: globalUniqueStrings(failedLines).slice(0, 8),
        unknownLines: globalUniqueStrings(unknownLines).slice(0, 8),
        weakLines: globalUniqueStrings(weakLines).slice(0, 8),
    };
}
function globalTestAgentFailureTypeLabel(type) {
    const value = String(type || "").trim().toLowerCase();
    const labels = {
        issue: "工作单问题",
        server: "服务启动",
        command: "命令验证",
        http: "接口检查",
        browser: "浏览器检查",
        required_check: "必检项",
        acceptance: "验收条件",
    };
    return labels[value] || "复核问题";
}
function scrubGlobalTestAgentEvidencePathText(value) {
    return String(value || "")
        .replace(/[A-Za-z]:[\\/][^\s；;，。)）]+/g, "技术详情里的证据文件")
        .replace(/(^|[\s（(])\/[^\s；;，。)）]*(?:test-agent-artifacts|screenshots|browser-artifacts|report\.json|report\.md|verdict\.json|artifact-manifest\.json)[^\s；;，。)）]*/gi, "$1技术详情里的证据文件")
        .replace(/\bccm-test-agent-[\w-]+\b/gi, "TestAgent 结构化记录")
        .replace(/\b(?:browser_har|artifactDir|artifact_manifest|report_json|report\.json|report\.md|verdict\.json|artifact-manifest\.json)\b/gi, "证据文件");
}
function collectGlobalTestAgentFailureItemsFromSource(source, depth = 0, seenObjects = new Set()) {
    if (!source || typeof source !== "object" || depth > 5)
        return [];
    if (seenObjects.has(source))
        return [];
    seenObjects.add(source);
    if (Array.isArray(source)) {
        return source.flatMap(item => collectGlobalTestAgentFailureItemsFromSource(item, depth + 1, seenObjects));
    }
    const rows = [
        ...globalSafeArray(source.failureSummary),
        ...globalSafeArray(source.failure_summary),
    ].filter((item) => item && typeof item === "object" && (item.type || item.title || item.reason || item.nextAction || item.diagnostics));
    const nestedKeys = [
        "test_agent_report",
        "testAgentReport",
        "test_agent_verdict",
        "testAgentVerdict",
        "verdict",
        "technical",
        "delivery_report",
        "deliveryReport",
        "final_report",
        "finalReport",
        "receipt",
    ];
    for (const key of nestedKeys) {
        if (source[key])
            rows.push(...collectGlobalTestAgentFailureItemsFromSource(source[key], depth + 1, seenObjects));
    }
    return rows;
}
function collectGlobalTestAgentFailureItems(report = {}, verdict = null) {
    const seen = new Set();
    const result = [];
    for (const item of [
        ...collectGlobalTestAgentFailureItemsFromSource(report),
        ...collectGlobalTestAgentFailureItemsFromSource(verdict),
    ]) {
        const key = [
            item?.type || "",
            item?.project || "",
            item?.title || "",
            item?.reason || "",
            item?.nextAction || "",
        ].join("|");
        if (seen.has(key))
            continue;
        seen.add(key);
        result.push(item);
    }
    return result.slice(0, 8);
}
function summarizeGlobalTestAgentFailureItem(item) {
    const type = globalTestAgentFailureTypeLabel(item?.type);
    const project = globalVisibleText(scrubGlobalTestAgentEvidencePathText(item?.project || ""), "", 70);
    const title = globalVisibleText(scrubGlobalTestAgentEvidencePathText(item?.title || item?.reason || ""), "复核发现问题", 100);
    const reason = globalVisibleText(scrubGlobalTestAgentEvidencePathText(item?.reason || item?.status || ""), "需要补齐或修复后再验收。", 160);
    const prefix = project ? `${project}：${type}` : type;
    return `${prefix}「${title}」未通过：${reason}`;
}
function summarizeGlobalTestAgentDiagnosticItem(item) {
    const diagnostics = globalSafeArray(item?.diagnostics);
    const nextActions = item?.nextAction ? [item.nextAction] : [];
    const [first] = [...diagnostics, ...nextActions]
        .map((value) => globalVisibleText(scrubGlobalTestAgentEvidencePathText(value), "", 180))
        .filter(Boolean);
    if (!first)
        return "";
    const title = globalVisibleText(scrubGlobalTestAgentEvidencePathText(item?.title || item?.type), "该问题", 70);
    return `${title}：${first}`;
}
function collectGlobalTestAgentFailureSummaries(report = {}, verdict = null) {
    const items = collectGlobalTestAgentFailureItems(report, verdict);
    const failureLines = items.map(summarizeGlobalTestAgentFailureItem).filter(Boolean);
    const diagnosticLines = items.map(summarizeGlobalTestAgentDiagnosticItem).filter(Boolean);
    const hasRework = items.some((item) => /failed|fail|not_verified|rework|未通过|失败|返工/i.test(String(item?.status || item?.result || item?.recommendation || item?.reason || "")));
    const hasNeedsUser = items.some((item) => /blocked|unknown|need_human|needs_human|manual|人工|确认|待确认|阻塞/i.test(String(item?.status || item?.result || item?.recommendation || item?.reason || "")));
    return {
        failureLines: globalUniqueStrings(failureLines).slice(0, 5),
        diagnosticLines: globalUniqueStrings(diagnosticLines).slice(0, 4),
        items,
        hasRework,
        hasNeedsUser,
    };
}
function globalRunVisibleReply(run, fallback = exports.GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK, max = 8000) {
    return (0, loop_1.buildGlobalVisibleReplyContent)({
        value: run?.final_reply || run?.finalReply || fallback,
        rawSource: run?.final_report?.technical_content
            || run?.finalReport?.technicalContent
            || run?.final_delivery_report?.technical_content
            || run?.finalDeliveryReport?.technicalContent
            || run?.final_reply
            || run?.finalReply
            || "",
        fallback,
        status: run?.status,
        max,
    }).text;
}
function getGlobalPetToolState(toolName) {
    const name = String(toolName || "").toLowerCase();
    if (!name)
        return "working";
    if (/(inspect|list|query|search|recall|memory|read|status|diagnostic|probe)/.test(name))
        return "carrying";
    if (/(review|verify|check|quality|git_review|diff|receipt|acceptance)/.test(name))
        return "reviewing";
    if (/(recover|retry|repair|rollback|fix|debug|failure|watchdog)/.test(name))
        return "debugging";
    if (/(orchestrate|create|send|dispatch|run|execute|task|mission|project|group|agent|cmd|write|manage|commit|merge|build)/.test(name))
        return "building";
    return "working";
}
function getGlobalToolDisplayName(toolName) {
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
        decompose_requirement_epic: "拆解需求文档",
        create_requirement_epic: "创建需求 Epic",
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
        navigate: "切换页面",
    };
    const key = String(toolName || "").trim();
    return labels[key] || key || "工具操作";
}
function buildGlobalAgentEventUi(event = {}) {
    const type = String(event.type || "");
    const toolName = event.tool?.name || event.pending_tool?.name || event.step?.tool?.name || event.step?.toolName || "";
    const toolLabel = getGlobalToolDisplayName(toolName);
    const text = (value, max = 220, fallback = "状态已更新。") => globalVisibleText(value, fallback, max);
    const dispatchSummary = event.dispatch_launch_summary || event.dispatchLaunchSummary || null;
    const clarificationSummary = event.clarification_summary || event.clarificationSummary || null;
    const confirmationSummary = event.confirmation_summary || event.confirmationSummary || null;
    const dispatchSummaryText = () => {
        const rows = Array.isArray(dispatchSummary?.rows) ? dispatchSummary.rows : [];
        const targets = rows
            .map((row) => [row.role || "执行 Agent", row.agent].filter(Boolean).join(" · "))
            .filter(Boolean)
            .slice(0, 4)
            .join("、");
        const parts = [
            dispatchSummary?.headline || (targets ? `我已把这次需求交给：${targets}。` : ""),
            dispatchSummary?.next_action ? `下一步：${dispatchSummary.next_action}` : "",
        ].filter(Boolean).join(" ");
        return text(parts, 280, "派发已发出，正在等待执行目标更新结果。");
    };
    const withCheckpoint = (ui) => ({
        ...ui,
        checkpoint: {
            schema: "ccm-main-agent-live-checkpoint-v1",
            id: event.id || `${type || "event"}:${event.run_id || event.trace_id || Date.now()}`,
            label: ui.title,
            detail: ui.text,
            status: ui.tone === "ok" ? "done" : ui.tone === "error" ? "failed" : ui.tone === "waiting" ? "warning" : "active",
            phase: ui.phase || "",
            at: event.at || new Date().toISOString(),
            run_id: event.run_id || "",
            source: "global-agent-stream",
        },
    });
    if (event.progress_checkpoint?.label || event.progressCheckpoint?.label) {
        const checkpoint = event.progress_checkpoint || event.progressCheckpoint;
        return withCheckpoint({
            phase: checkpoint.phase || "planning",
            tone: checkpoint.status === "done" ? "ok" : checkpoint.status === "failed" ? "error" : checkpoint.status === "warning" ? "waiting" : "running",
            title: checkpoint.label,
            text: text(checkpoint.detail || ""),
        });
    }
    if (type === "started")
        return withCheckpoint({ phase: "understanding", tone: "running", title: "理解需求", text: "正在理解你的消息，判断是普通对话还是需要执行操作。" });
    if (type === "user_steer_applied") {
        const steering = event.steering || event.user_steer || event.userSteer || {};
        const revised = steering.kind === "revise_goal" || event.replan_required === true;
        return withCheckpoint({
            phase: revised ? "planning" : "understanding",
            tone: "running",
            title: revised ? "目标调整已纳入" : "补充要求已纳入",
            text: text(event.message, 260, revised
                ? "新的目标边界已纳入，我会先重新核对计划再继续。"
                : "补充要求已纳入当前任务，我会带着它继续处理。"),
        });
    }
    if (type === "test_agent_execution_plan_ready") {
        const plan = event.test_agent_execution_plan || event.testAgentExecutionPlan || event.technical?.test_agent_execution_plan || null;
        const blocked = plan?.valid === false || String(event.status || "").toLowerCase() === "warn";
        return withCheckpoint({
            phase: "reviewing",
            tone: blocked ? "waiting" : "running",
            title: "TestAgent 复核计划",
            text: text(blocked
                ? "TestAgent 复核计划预检未通过，我会先修复交接信息再执行。"
                : "TestAgent 已生成复核计划，我会按计划启动独立复核。"),
        });
    }
    if (type === "test_agent_review_ready") {
        const summary = event.test_agent_review_summary || event.testAgentReviewSummary || event.independent_review_summary || event.independentReviewSummary || {};
        const reviewRows = globalSafeArray(summary.rows)
            .filter((item) => /返工重点|排查建议|待处理|操作结果验证|浏览器会话恢复|边界与异常验证|重新复验/i.test(String(item || "")))
            .slice(0, 2)
            .join(" ");
        return withCheckpoint({
            phase: "reviewing",
            tone: summary.status === "passed" ? "ok" : ["needs_rework", "needs_recheck", "needs_environment", "needs_user"].includes(summary.status) ? "waiting" : "running",
            title: summary.title || "独立复核",
            text: text([summary.headline || event.detail, reviewRows].filter(Boolean).join(" "), 360, "TestAgent 已提交独立复核结论，我会纳入最终验收。"),
        });
    }
    if (type === "plan_mode_ready") {
        const planMode = event.plan_mode || event.planMode || {};
        return withCheckpoint({
            phase: "planning",
            tone: "running",
            title: planMode.title || "执行前计划已整理",
            text: text(planMode.next_step || planMode.risk?.summary || event.message || "我已整理计划，会继续执行并在完成后总结。", 280, "我已整理计划，会继续执行并在完成后总结。"),
        });
    }
    if (type === "decision") {
        const state = String(event.step?.state || "");
        const message = text(event.step?.message || event.step?.decision?.intent?.reason || "");
        if (toolName)
            return withCheckpoint({ phase: "planning", tone: "running", title: "形成行动计划", text: message || `准备执行：${toolLabel}` });
        if (state === "answer" || state === "complete")
            return withCheckpoint({ phase: "answering", tone: "running", title: "组织回复", text: message || "已经形成回答，正在整理给你。" });
        if (state === "needs_confirmation")
            return withCheckpoint({ phase: "waiting", tone: "waiting", title: "需要确认", text: message || "需要你确认目标或授权范围。" });
        return withCheckpoint({ phase: "planning", tone: "running", title: "规划下一步", text: message || "正在规划下一步。" });
    }
    if (type === "tool_started")
        return withCheckpoint({ phase: "executing", tone: "running", title: "执行动作", text: `正在${toolLabel}。` });
    if (type === "dispatch_launch_summary")
        return withCheckpoint({ phase: "dispatching", tone: "ok", title: dispatchSummary?.title || "已派发的工作", text: dispatchSummaryText() });
    if (type === "tool_completed")
        return withCheckpoint({ phase: "reviewing", tone: "ok", title: "动作已返回", text: `${toolLabel}已返回结果，我正在检查。` });
    if (type === "tool_failed" || type === "tool_validation_failed")
        return withCheckpoint({ phase: "debugging", tone: "error", title: "执行遇到问题", text: text(event.reply || event.step?.message, 220, `${toolLabel}执行遇到问题，我正在重新判断下一步。`) });
    if (type === "clarification_required")
        return withCheckpoint({ phase: "waiting", tone: "waiting", title: clarificationSummary?.title || "需要补充信息", text: text(clarificationSummary?.question || clarificationSummary?.headline || event.reply || "需要你补充目标、范围或验收标准。") });
    if (type === "confirmation_required")
        return withCheckpoint({ phase: "waiting", tone: "waiting", title: confirmationSummary?.title || "等待授权确认", text: text(confirmationSummary?.headline || confirmationSummary?.question || event.reply || "这个操作需要你确认后才会继续。") });
    if (type === "paused")
        return withCheckpoint({ phase: "paused", tone: "waiting", title: "已暂停", text: text(event.reply || "全局 Agent 已暂停。") });
    if (type === "supervising")
        return withCheckpoint({ phase: "supervising", tone: "running", title: "持续跟进中", text: text(event.reply || "已经创建长期任务，正在跟进协作群/项目执行成员交付。") });
    if (type === "completed")
        return withCheckpoint({ phase: "completed", tone: "ok", title: "处理结果", text: text(event.reply || exports.GLOBAL_AGENT_VISIBLE_COMPLETED_EVENT_FALLBACK) });
    if (type === "failed")
        return withCheckpoint({ phase: "failed", tone: "error", title: "失败", text: text(event.reply, 220, "任务没有完成，我已整理未完成原因和下一步。") });
    if (type === "cancelled")
        return withCheckpoint({ phase: "cancelled", tone: "waiting", title: "已取消", text: text(event.reply || "本轮处理已取消。") });
    return null;
}
function relayGlobalPetEvent(ctx, event = {}, options = {}) {
    const type = String(event.type || "");
    const run = options.finalRun || event.run || {};
    const toolName = event.tool?.name || event.pending_tool?.name || event.step?.tool?.name || event.step?.toolName || "";
    const speech = (role, text, final = false) => ctx.broadcastPetSpeech(exports.GLOBAL_PET_AGENT_NAME, { role, text: compactPetText(text), final, source: "global" });
    if (type === "started") {
        ctx.setAgentActivity(exports.GLOBAL_PET_AGENT_NAME, "thinking", "全局 Agent 正在理解你的需求...", { tab: "global-agent" }, 12 * 60 * 1000);
        speech("status", "我正在理解你的需求...", false);
        return;
    }
    if (type === "decision") {
        const message = event.step?.message || event.step?.tool?.name || "正在规划下一步";
        ctx.setAgentActivity(exports.GLOBAL_PET_AGENT_NAME, toolName ? "planning" : "thinking", compactPetText(message), { tab: "global-agent" }, 12 * 60 * 1000);
        speech("status", message, false);
        return;
    }
    if (type === "tool_started") {
        const message = toolName ? `正在执行：${getGlobalToolDisplayName(toolName)}` : "正在执行操作...";
        ctx.setAgentActivity(exports.GLOBAL_PET_AGENT_NAME, getGlobalPetToolState(toolName), message, { tab: "global-agent" }, 12 * 60 * 1000);
        speech("status", message, false);
        return;
    }
    if (type === "tool_completed") {
        const message = toolName ? `动作已返回：${getGlobalToolDisplayName(toolName)}` : "执行动作已返回";
        ctx.setAgentActivity(exports.GLOBAL_PET_AGENT_NAME, "reviewing", message, { tab: "global-agent" }, 45 * 1000);
        speech("assistant", message, false);
        return;
    }
    if (type === "dispatch_launch_summary") {
        const summary = event.dispatch_launch_summary || event.dispatchLaunchSummary || {};
        const message = globalVisibleText(summary.headline || summary.next_action, "派发已发出，正在等待执行目标更新结果。", 180);
        ctx.setAgentActivity(exports.GLOBAL_PET_AGENT_NAME, "building", compactPetText(message), { tab: "global-agent" }, 90 * 1000);
        speech("status", message, false);
        return;
    }
    if (type === "tool_failed" || type === "tool_validation_failed") {
        const message = globalVisibleText(event.reply || event.step?.message, "工具执行遇到问题，我正在重新判断下一步。", 180);
        ctx.setAgentActivity(exports.GLOBAL_PET_AGENT_NAME, "debugging", compactPetText(message), { tab: "global-agent" }, 90 * 1000);
        speech("error", message, true);
        return;
    }
    if (type === "clarification_required" || type === "confirmation_required" || type === "paused") {
        const summary = event.clarification_summary || event.clarificationSummary || event.confirmation_summary || event.confirmationSummary || null;
        const message = summary?.question || summary?.headline || event.reply || "全局 Agent 需要你确认后继续";
        ctx.setAgentActivity(exports.GLOBAL_PET_AGENT_NAME, "waiting", compactPetText(message), { tab: "global-agent" }, 5 * 60 * 1000);
        speech("status", message, true);
        return;
    }
    if (type === "supervising") {
        const message = event.reply || "我正在跟进协作任务";
        ctx.setAgentActivity(exports.GLOBAL_PET_AGENT_NAME, "building", compactPetText(message), { tab: "global-agent" }, 12 * 60 * 1000);
        speech("status", message, false);
        return;
    }
    if (type === "completed" || options.finalRun) {
        const finalReply = (0, loop_1.buildGlobalVisibleReplyContent)({
            value: options.finalRun?.final_reply || run.final_reply || event.reply || exports.GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK,
            rawSource: options.finalRun?.final_report?.technical_content || run.final_report?.technical_content || event.reply || "",
            fallback: exports.GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK,
            status: options.finalRun?.status || run.status || "completed",
            max: 8000,
        }).text;
        ctx.setAgentActivity(exports.GLOBAL_PET_AGENT_NAME, "happy", compactPetText(finalReply, 120), { tab: "global-agent" }, 90 * 1000);
        speech("assistant", finalReply, true);
        return;
    }
    if (type === "failed" || type === "cancelled" || options.error) {
        const message = globalVisibleText(options.finalRun?.final_reply || run.final_reply || event.reply, type === "cancelled" ? "任务已取消，当前状态已整理。" : "任务没有完成，我已整理未完成原因和下一步。", 180);
        ctx.setAgentActivity(exports.GLOBAL_PET_AGENT_NAME, "error", compactPetText(message), { tab: "global-agent" }, 90 * 1000);
        speech("error", message, true);
    }
}
//# sourceMappingURL=global-agent-test-agent-display.js.map