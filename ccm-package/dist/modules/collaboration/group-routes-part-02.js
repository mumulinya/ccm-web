"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGroupMainAgentStatus = buildGroupMainAgentStatus;
exports.isGroupProgressStatusRequest = isGroupProgressStatusRequest;
exports.cleanGroupStatusFollowupText = cleanGroupStatusFollowupText;
exports.buildGroupStatusFollowupSummary = buildGroupStatusFollowupSummary;
exports.runGroupStatusFollowupSelfTest = runGroupStatusFollowupSelfTest;
const delivery_report_1 = require("../../agents/delivery-report");
const group_routes_part_01_1 = require("./group-routes-part-01");
function buildGroupMainAgentStatus(input) {
    const activeStatusValues = new Set(["pending", "queued", "in_progress", "running", "reviewing", "reworking", "needs_rework", "blocked", "needs_user", "waiting_user", "needs_confirmation"]);
    const groupTasks = (input.tasks || [])
        .filter((task) => String(task?.group_id || task?.groupId || "") === input.groupId)
        .filter((task) => !task?.archived && !task?.deleted_at)
        .sort((a, b) => (0, group_routes_part_01_1.taskUpdatedMs)(b) - (0, group_routes_part_01_1.taskUpdatedMs)(a));
    const activeTasks = groupTasks.filter((task) => activeStatusValues.has(String(task?.status || "").toLowerCase()));
    const latestTask = activeTasks[0] || groupTasks[0] || null;
    const latestRuntime = latestTask ? input.getRuntime(latestTask) : null;
    const latestCard = latestRuntime?.taskCard || latestRuntime?.task_card || null;
    const latestSummary = latestTask?.delivery_summary || {};
    const latestDisplayStatus = (0, group_routes_part_01_1.groupTaskDisplayStatus)(latestTask, latestSummary, latestCard, latestTask?.status || latestCard?.phase);
    const latestStatusMeta = (0, group_routes_part_01_1.groupTaskStatusMeta)(latestDisplayStatus);
    const completionSummary = (0, group_routes_part_01_1.buildGroupCompletionSummary)(latestTask, latestSummary, latestCard);
    const pickupSummary = (0, group_routes_part_01_1.buildGroupPickupSummary)(latestTask, latestSummary, completionSummary, latestCard);
    const checkpointSource = latestCard?.progress_checkpoints || latestCard?.progressCheckpoints || latestCard?.display_stream?.progress_checkpoints || latestCard?.displayStream?.progressCheckpoints || null;
    const currentTodoSummary = (0, group_routes_part_01_1.buildGroupCurrentTodoSummary)(latestCard, latestTask, latestStatusMeta);
    const checkpointItems = Array.isArray(checkpointSource?.items)
        ? checkpointSource.items
        : Array.isArray(checkpointSource)
            ? checkpointSource
            : [];
    const baseMeaningfulCheckpoints = checkpointItems
        .map((item) => ({
        id: item?.id || "",
        label: (0, group_routes_part_01_1.compactGroupStatusText)(item?.label || item?.title, 120),
        detail: (0, group_routes_part_01_1.compactGroupStatusText)(item?.detail || "", 180),
        status: (0, group_routes_part_01_1.checkpointStatus)(item?.status),
        phase: item?.phase || latestCard?.phase || "",
        at: item?.at || "",
        task_id: latestTask?.id || "",
    }))
        .filter((item) => item.label && item.status !== "pending");
    const completionCheckpoint = completionSummary && latestStatusMeta.terminal ? {
        id: `completion-${latestTask?.id || "latest"}`,
        label: (0, group_routes_part_01_1.groupDeliveryCheckpointLabel)(completionSummary.status),
        detail: completionSummary.headline,
        status: completionSummary.status === "failed" ? "failed" : completionSummary.status === "done" ? "done" : "warning",
        phase: latestStatusMeta.phase,
        at: latestTask?.completed_at || latestTask?.updated_at || "",
        task_id: latestTask?.id || "",
    } : null;
    const meaningfulCheckpoints = completionCheckpoint
        ? [...baseMeaningfulCheckpoints.filter((item) => item.id !== completionCheckpoint.id), completionCheckpoint]
        : baseMeaningfulCheckpoints;
    const latestCheckpoint = meaningfulCheckpoints[meaningfulCheckpoints.length - 1] || null;
    const runningAgents = latestStatusMeta.terminal
        ? []
        : latestCard?.active_agents?.length
            ? latestCard.active_agents
            : (latestRuntime?.agents || [])
                .filter((agent) => ["spawning", "ready", "prompt_accepted", "running", "reviewing"].includes(String(agent?.state || "")))
                .map((agent) => agent.project)
                .filter(Boolean);
    const childAgentStatusSummary = buildGroupChildAgentStatusSummary(latestCard, latestSummary, latestStatusMeta);
    const progressRefreshSummary = (0, group_routes_part_01_1.buildGroupProgressRefreshSummary)(latestTask, latestCard, latestStatusMeta, childAgentStatusSummary, latestCheckpoint);
    const independentReviewSummary = (0, group_routes_part_01_1.getGroupStatusIndependentReviewSummary)({
        latest_delivery_summary: latestSummary,
        latestDeliverySummary: latestSummary,
        latest_card: latestCard,
        latestCard,
        task_card: latestCard,
        taskCard: latestCard,
        completion_summary: completionSummary,
        completionSummary,
    });
    const independentReviewStatus = (0, group_routes_part_01_1.summarizeGroupStatusIndependentReview)({ independent_review_summary: independentReviewSummary });
    const testAgentExecutionPlanSummary = independentReviewSummary ? null : (0, group_routes_part_01_1.getGroupStatusTestAgentExecutionPlanSummary)({
        latest_delivery_summary: latestSummary,
        latestDeliverySummary: latestSummary,
        latest_card: latestCard,
        latestCard,
        task_card: latestCard,
        taskCard: latestCard,
    });
    const testAgentPlanStatus = independentReviewStatus ? null : (0, group_routes_part_01_1.summarizeGroupStatusTestAgentExecutionPlan)({ test_agent_execution_plan_summary: testAgentExecutionPlanSummary?.summary, test_agent_execution_plan: testAgentExecutionPlanSummary?.plan });
    const openQa = (input.agentQa || []).filter((item) => ["waiting", "asking", "queued", "needs_user", "timeout", "manual"].includes(String(item?.status || "")));
    const blockers = [
        ...(Array.isArray(latestCard?.blockers) ? latestCard.blockers : []),
        ...(Array.isArray(latestSummary?.blockers) ? latestSummary.blockers : []),
    ].map((item) => (0, group_routes_part_01_1.compactGroupStatusText)(item, 120)).filter(Boolean).slice(0, 5);
    const needs = [
        ...(Array.isArray(latestSummary?.needs) ? latestSummary.needs : []),
        ...(Array.isArray(latestSummary?.remaining_items) ? latestSummary.remaining_items : []),
        ...(Array.isArray(latestCard?.delivery?.risks) ? latestCard.delivery.risks : []),
    ].map((item) => (0, group_routes_part_01_1.compactGroupStatusText)(item, 120)).filter(Boolean).slice(0, 5);
    return {
        schema: "ccm-group-main-agent-status-v1",
        group_id: input.groupId,
        phase: independentReviewStatus?.blocking
            ? (independentReviewStatus.status === "needs_user" ? "needs_user" : "reworking")
            : testAgentPlanStatus ? "reviewing"
                : latestStatusMeta.terminal ? latestStatusMeta.phase : latestCard?.phase || latestStatusMeta.phase,
        label: independentReviewStatus?.blocking
            ? (independentReviewStatus.status === "needs_user" ? "等待你确认" : "返工中")
            : testAgentPlanStatus
                ? (testAgentPlanStatus.status === "blocked" ? "复核计划需修复" : "复核准备中")
                : latestStatusMeta.terminal
                    ? completionSummary?.status_label || latestStatusMeta.label
                    : latestCard?.phase_label || latestStatusMeta.label,
        task_id: latestTask?.id || "",
        latest_task_title: latestTask?.title || "",
        active_task_count: activeTasks.length,
        running_child_agents: (childAgentStatusSummary?.running_agents?.length ? childAgentStatusSummary.running_agents : runningAgents).slice(0, 8),
        current_todo_summary: currentTodoSummary,
        currentTodoSummary,
        progress_refresh_summary: progressRefreshSummary,
        progressRefreshSummary,
        child_agent_status_summary: childAgentStatusSummary,
        childAgentStatusSummary,
        open_qa_count: openQa.length,
        latest_progress_checkpoint: latestCheckpoint ? { ...latestCheckpoint, at: latestCheckpoint.at || latestTask?.updated_at || "" } : null,
        recent_progress_checkpoints: meaningfulCheckpoints.slice(-3),
        progress_checkpoints: checkpointItems.slice(-6),
        completion_summary: independentReviewStatus?.blocking || testAgentPlanStatus ? null : completionSummary,
        independent_review_summary: independentReviewSummary,
        independentReviewSummary: independentReviewSummary,
        test_agent_review_summary: independentReviewSummary,
        testAgentReviewSummary: independentReviewSummary,
        test_agent_execution_plan_summary: testAgentExecutionPlanSummary?.summary || null,
        testAgentExecutionPlanSummary: testAgentExecutionPlanSummary?.summary || null,
        pickup_summary: independentReviewStatus?.blocking || testAgentPlanStatus ? null : pickupSummary,
        pickupSummary: independentReviewStatus?.blocking || testAgentPlanStatus ? null : pickupSummary,
        latest_delivery_summary: latestTask?.delivery_summary ? {
            ...latestTask.delivery_summary,
            progress_checkpoints: checkpointSource || undefined,
            completion_summary: independentReviewStatus?.blocking || testAgentPlanStatus ? undefined : completionSummary || undefined,
            independent_review_summary: independentReviewSummary || latestTask.delivery_summary.independent_review_summary,
            independentReviewSummary: independentReviewSummary || latestTask.delivery_summary.independentReviewSummary,
            test_agent_review_summary: independentReviewSummary || latestTask.delivery_summary.test_agent_review_summary,
            testAgentReviewSummary: independentReviewSummary || latestTask.delivery_summary.testAgentReviewSummary,
            test_agent_execution_plan_summary: testAgentExecutionPlanSummary?.summary || latestTask.delivery_summary.test_agent_execution_plan_summary,
            testAgentExecutionPlanSummary: testAgentExecutionPlanSummary?.summary || latestTask.delivery_summary.testAgentExecutionPlanSummary,
            pickup_summary: independentReviewStatus?.blocking || testAgentPlanStatus ? undefined : pickupSummary || undefined,
            progress_refresh_summary: progressRefreshSummary || undefined,
        } : null,
        failed_gates: latestSummary?.acceptance_gate?.failed_checks || latestSummary?.failed_gates || [],
        blockers,
        needs,
        updated_at: latestTask?.updated_at || new Date().toISOString(),
    };
}
const GROUP_PROGRESS_STATUS_TOPIC_PATTERN = /(?:任务状态|当前状态|现在状态|状态怎么样|进度|进展|做到哪|做到哪儿|做到哪了|完成了吗|完成了没|好了吗|有结果了吗|结果出来了吗|现在怎么样|怎么样了|how'?s it going|progress|status)/i;
const GROUP_PROGRESS_STATUS_MUTATION_PATTERN = /(?:设置|修改|标记|改成|更新|创建|新建|删除|移除|归档|取消|停止|恢复|重试)/;
const GROUP_PROGRESS_STATUS_INTERNAL_PATTERN = /CCM_AGENT_RECEIPT|<task-notification>|receipt-status|trace_id|session_id|WorkerContextPacket|raw payload/i;
function isGroupProgressStatusRequest(message) {
    const text = String(message || "").replace(/\s+/g, " ").trim();
    if (!text)
        return false;
    if (!GROUP_PROGRESS_STATUS_TOPIC_PATTERN.test(text))
        return false;
    if (GROUP_PROGRESS_STATUS_MUTATION_PATTERN.test(text) && /(?:任务状态|当前状态|状态|status)/i.test(text))
        return false;
    return true;
}
function cleanGroupStatusFollowupText(value, fallback, max = 180) {
    const text = (0, group_routes_part_01_1.compactGroupStatusText)(value, max);
    const fallbackText = (0, delivery_report_1.sanitizeMainAgentDeliveryText)(fallback, fallback, max);
    if (!text)
        return fallbackText;
    if (GROUP_PROGRESS_STATUS_INTERNAL_PATTERN.test(text))
        return fallbackText;
    return (0, delivery_report_1.sanitizeMainAgentDeliveryText)(text, fallback, max);
}
function joinGroupStatusItems(items, fallback = "") {
    const values = (Array.isArray(items) ? items : [])
        .map((item) => cleanGroupStatusFollowupText(item, "", 120))
        .filter(Boolean)
        .slice(0, 3);
    return values.length ? values.join("；") : fallback;
}
function groupChildAgentStatus(value) {
    const text = String(value || "").toLowerCase();
    if (["done", "completed", "complete", "success", "succeeded", "ok", "passed"].includes(text))
        return "completed";
    if (["failed", "fail", "error", "rejected"].includes(text))
        return "failed";
    if (["blocked", "needs_attention", "needs_rework", "needs_followup", "missing_receipt"].includes(text))
        return "blocked";
    if (["running", "in_progress", "executing", "active", "reviewing", "reworking"].includes(text))
        return "running";
    if (["pending", "queued", "waiting", "wait", "assigned"].includes(text))
        return "pending";
    return text ? "running" : "pending";
}
function groupChildAgentStatusLabel(status) {
    if (status === "completed")
        return "已回传结果";
    if (status === "failed")
        return "失败";
    if (status === "blocked")
        return "待补齐";
    if (status === "running")
        return "处理中";
    return "等待中";
}
function groupChildStatusPriority(status) {
    if (status === "failed")
        return 5;
    if (status === "blocked")
        return 4;
    if (status === "running")
        return 3;
    if (status === "completed")
        return 2;
    if (status === "pending")
        return 1;
    return 0;
}
function normalizeGroupChildAgentRow(row, fallbackStatus = "pending") {
    if (!row || typeof row !== "object")
        return null;
    const agent = cleanGroupStatusFollowupText(row.agent || row.project || row.target || row.owner || row.name, "", 80);
    if (!agent)
        return null;
    const status = groupChildAgentStatus(row.status || row.state || row.phase || fallbackStatus);
    const detail = cleanGroupStatusFollowupText(row.summary || row.current_focus || row.currentFocus || row.detail || row.reason || row.task || row.subject || "", "", 150);
    const filesCount = Number(row.files_changed_count || row.filesChangedCount || row.file_count || row.fileCount || 0) || 0;
    const verificationCount = Number(row.verification_count || row.verificationCount || 0) || 0;
    return {
        agent,
        status,
        status_label: groupChildAgentStatusLabel(status),
        detail,
        files_changed_count: filesCount,
        verification_count: verificationCount,
    };
}
function buildGroupChildAgentStatusSummary(latestCard, latestSummary, latestStatusMeta) {
    const rawRows = [];
    const progressSummary = latestCard?.agent_progress_summary
        || latestCard?.agentProgressSummary
        || latestCard?.technical?.agent_progress_summary
        || latestCard?.technical?.agentProgressSummary
        || latestSummary?.agent_progress_summary
        || latestSummary?.agentProgressSummary
        || null;
    if (Array.isArray(progressSummary?.rows))
        rawRows.push(...progressSummary.rows);
    const receiptStatuses = Array.isArray(latestSummary?.receipt_statuses) ? latestSummary.receipt_statuses : [];
    for (const item of receiptStatuses) {
        rawRows.push({
            agent: item?.agent || item?.project || item?.target,
            status: item?.status === "done" ? "completed" : item?.status || "blocked",
            summary: item?.summary || item?.reason || "",
        });
    }
    const assignments = Array.isArray(latestSummary?.assignment_evidence) ? latestSummary.assignment_evidence : [];
    for (const item of assignments) {
        rawRows.push({
            agent: item?.project || item?.agent || item?.target,
            status: latestStatusMeta?.terminal ? "completed" : "pending",
            task: item?.task || item?.reason || "",
        });
    }
    const normalized = rawRows
        .map(row => normalizeGroupChildAgentRow(row, latestStatusMeta?.terminal ? "completed" : "pending"))
        .filter(Boolean);
    if (!normalized.length)
        return null;
    const byAgent = new Map();
    for (const row of normalized) {
        const existing = byAgent.get(row.agent);
        if (!existing || groupChildStatusPriority(row.status) >= groupChildStatusPriority(existing.status)) {
            byAgent.set(row.agent, {
                ...existing,
                ...row,
                detail: row.detail || existing?.detail || "",
                files_changed_count: Math.max(Number(existing?.files_changed_count || 0), Number(row.files_changed_count || 0)),
                verification_count: Math.max(Number(existing?.verification_count || 0), Number(row.verification_count || 0)),
            });
        }
    }
    const rows = [...byAgent.values()].slice(0, 12);
    const namesFor = (statuses) => rows.filter(row => statuses.includes(row.status)).map(row => row.agent).slice(0, 6);
    const completedAgents = namesFor(["completed"]);
    const runningAgents = namesFor(["running"]);
    const waitingAgents = namesFor(["pending"]);
    const attentionAgents = namesFor(["failed", "blocked"]);
    const summaryParts = [
        completedAgents.length ? `已回传：${completedAgents.join("、")}` : "",
        runningAgents.length ? `处理中：${runningAgents.join("、")}` : "",
        waitingAgents.length ? `等待中：${waitingAgents.join("、")}` : "",
        attentionAgents.length ? `待补齐：${attentionAgents.join("、")}` : "",
    ].filter(Boolean);
    const status = attentionAgents.length
        ? "needs_attention"
        : runningAgents.length || waitingAgents.length
            ? "waiting"
            : "completed";
    return {
        schema: "ccm-group-child-agent-status-summary-v1",
        title: "执行成员等待情况",
        status,
        status_label: status === "completed" ? "已收齐" : status === "needs_attention" ? "需补齐" : "等待中",
        rows,
        completed_agents: completedAgents,
        running_agents: runningAgents,
        waiting_agents: waitingAgents,
        attention_agents: attentionAgents,
        summary_text: summaryParts.length ? summaryParts.join("；") : "暂无可展示的执行成员状态。",
        next_action: status === "completed"
            ? "我会把已收齐的结果合并进验收和最终总结。"
            : status === "needs_attention"
                ? "我会优先处理待补齐的结果说明、验证证据或阻塞项。"
                : "我会继续等待执行成员返回可验收结果，不会提前编造结论。",
        display_policy: {
            user_visible: true,
            task_card_visible: false,
            todo_visible: false,
            technical_details_default_collapsed: true,
            hide_internal_protocols: true,
        },
    };
}
function groupStatusNextAction(status) {
    const phase = String(status?.phase || "").toLowerCase();
    if (!status?.task_id)
        return "你可以直接分派一个新需求，我会先整理计划，再进入执行和验收。";
    if (["completed", "done", "success"].includes(phase))
        return "可以查看任务卡里的交付总结，或者继续补充新的要求。";
    if (["failed"].includes(phase))
        return "请先看未完成原因；如果要继续，我会按缺口重新派发或返工。";
    if (["cancelled", "canceled"].includes(phase))
        return "任务已经停止；如需继续，请重新说明希望恢复的范围。";
    if (["reworking"].includes(phase))
        return "我会让原执行成员按失败点或复核缺口返工，修复后重新验收和总结。";
    if (["needs_user"].includes(phase))
        return "当前需要你确认或补充信息，确认后我才会继续推进。";
    if (["queued", "pending"].includes(phase))
        return "任务已在队列中，等执行通道开始后会继续更新任务卡。";
    if (status?.child_agent_status_summary?.status === "needs_attention")
        return "我会先处理待补齐的执行成员结果说明、验证证据或阻塞项。";
    if (Array.isArray(status?.running_child_agents) && status.running_child_agents.length)
        return "我会等执行成员返回可验收结果后再汇总，不会提前编造结果。";
    return "我会继续检查任务卡里的结果说明、验证证据和阻塞项。";
}
function buildGroupStatusCurrentTodoFollowup(status) {
    const todo = status?.current_todo_summary || status?.currentTodoSummary || null;
    if (!todo)
        return null;
    const active = cleanGroupStatusFollowupText(todo.active_form || todo.activeForm || todo.label, "", 160);
    const detail = cleanGroupStatusFollowupText(todo.detail, "", 160);
    const recent = cleanGroupStatusFollowupText(todo.recent_action || todo.recentAction, "", 140);
    const next = cleanGroupStatusFollowupText(todo.next_action || todo.nextAction, "", 180);
    if (!active && !detail && !recent && !next)
        return null;
    return {
        schema: "ccm-group-status-current-todo-followup-v1",
        title: cleanGroupStatusFollowupText(todo.title, "当前 Todo", 80),
        headline: active || detail || "我正在推进当前 Todo。",
        detail,
        recent_action: recent,
        next_action: next,
        status_label: cleanGroupStatusFollowupText(todo.status_label || todo.statusLabel, "进行中", 60),
        display_policy: {
            user_visible: true,
            task_card_visible: false,
            todo_visible: false,
            technical_details_default_collapsed: true,
            hide_internal_protocols: true,
        },
    };
}
function buildGroupStatusUserActionSummary(status) {
    const phase = String(status?.phase || "").toLowerCase();
    const todo = status?.current_todo_summary || status?.currentTodoSummary || null;
    const rawNeedsAction = todo?.needs_action || todo?.needsAction || "";
    const needsAction = (0, group_routes_part_01_1.groupTodoTextNeedsUserAction)(rawNeedsAction, phase)
        ? cleanGroupStatusFollowupText(rawNeedsAction, "", 180)
        : "";
    const needs = Array.isArray(status?.needs) ? status.needs : [];
    const blockers = Array.isArray(status?.blockers) ? status.blockers : [];
    const phaseNeedsUser = (0, group_routes_part_01_1.groupStatusPhaseNeedsUserAction)(status);
    const userNeeds = needs.filter((item) => (0, group_routes_part_01_1.groupTodoTextNeedsUserAction)(item, phase));
    const userBlockers = blockers.filter((item) => (0, group_routes_part_01_1.groupTodoTextNeedsUserAction)(item, phase));
    const openQaCount = Number(status?.open_qa_count || 0);
    if (phaseNeedsUser || needsAction || openQaCount > 0 || userNeeds.length || userBlockers.length) {
        const headline = phaseNeedsUser
            ? "当前需要你确认或补充信息，我确认后才会继续推进。"
            : needsAction
                ? needsAction
                : openQaCount > 0
                    ? `还有 ${openQaCount} 个问答需要你处理。`
                    : userBlockers.length
                        ? cleanGroupStatusFollowupText(userBlockers[0], "有阻塞项需要你处理。", 160)
                        : cleanGroupStatusFollowupText(userNeeds[0], "还有信息需要你补齐。", 160);
        const actionItems = [
            needsAction,
            openQaCount > 0 ? `处理 ${openQaCount} 个待确认问答` : "",
            ...userBlockers,
            ...userNeeds,
        ]
            .map((item) => cleanGroupStatusFollowupText(item, "", 120))
            .filter(Boolean)
            .filter((item, index, arr) => arr.indexOf(item) === index)
            .slice(0, 4);
        return {
            schema: "ccm-group-status-user-action-summary-v1",
            title: "需要你处理",
            headline,
            action_items: actionItems,
            next_action: actionItems[0] || headline,
            display_policy: {
                user_visible: true,
                task_card_visible: false,
                todo_visible: false,
                technical_details_default_collapsed: true,
                hide_internal_protocols: true,
            },
        };
    }
    return null;
}
function buildGroupStatusFollowupSummary(input) {
    const status = input.status || buildGroupMainAgentStatus({
        groupId: String(input.groupId || ""),
        tasks: input.tasks || [],
        agentQa: input.agentQa || [],
        getRuntime: input.getRuntime || (() => null),
    });
    const lines = [];
    const latestTitle = cleanGroupStatusFollowupText(status.latest_task_title, "这项任务", 120);
    const independentReview = (0, group_routes_part_01_1.summarizeGroupStatusIndependentReview)(status);
    const testAgentPlan = independentReview ? null : (0, group_routes_part_01_1.summarizeGroupStatusTestAgentExecutionPlan)(status);
    const label = independentReview?.blocking
        ? (independentReview.status === "needs_user" ? "等待你确认" : "返工中")
        : testAgentPlan
            ? (testAgentPlan.status === "blocked" ? "复核计划需修复" : "复核准备中")
            : cleanGroupStatusFollowupText(status.label, "正在处理", 80);
    const latestCheckpoint = status.latest_progress_checkpoint || null;
    const completion = status.completion_summary || null;
    const pickup = status.pickup_summary
        || status.pickupSummary
        || status.latest_delivery_summary?.pickup_summary
        || status.latestDeliverySummary?.pickupSummary
        || null;
    const progressRefresh = status.progress_refresh_summary
        || status.progressRefreshSummary
        || status.latest_delivery_summary?.progress_refresh_summary
        || status.latestDeliverySummary?.progressRefreshSummary
        || null;
    const currentTodoFollowup = status.current_todo_followup
        || status.currentTodoFollowup
        || buildGroupStatusCurrentTodoFollowup(status);
    const userActionSummary = status.user_action_summary
        || status.userActionSummary
        || buildGroupStatusUserActionSummary(status);
    if (!status.task_id) {
        lines.push("当前群聊还没有正在跟踪的开发任务。");
    }
    else {
        lines.push(`最近群聊任务进展：${latestTitle}，当前状态是${label}。`);
    }
    if (independentReview?.blocking) {
        lines.push(`当前进展：${independentReview.headline}。`);
    }
    else if (testAgentPlan) {
        lines.push(`当前进展：${testAgentPlan.headline}。`);
    }
    else if (latestCheckpoint?.label) {
        const checkpointLabel = cleanGroupStatusFollowupText(latestCheckpoint.label, "我已更新进展", 120);
        const checkpointDetail = cleanGroupStatusFollowupText(latestCheckpoint.detail, "", 160);
        lines.push(`当前进展：${checkpointLabel}${checkpointDetail ? `，${checkpointDetail}` : ""}。`);
    }
    else if (status.task_id) {
        lines.push("当前进展：我已记录任务，但还没有新的可展示节点。");
    }
    if (completion?.headline && !independentReview?.blocking) {
        lines.push(`交付总结：${cleanGroupStatusFollowupText(completion.headline, "我已整理阶段总结。", 200)}`);
    }
    if (currentTodoFollowup?.headline && !completion && !independentReview?.blocking) {
        const todoBits = [
            currentTodoFollowup.headline,
            currentTodoFollowup.detail && currentTodoFollowup.detail !== currentTodoFollowup.headline ? currentTodoFollowup.detail : "",
        ].filter(Boolean).join("，");
        lines.push(`${cleanGroupStatusFollowupText(currentTodoFollowup.title, "当前 Todo", 80)}：${cleanGroupStatusFollowupText(todoBits, "我正在推进当前 Todo。", 220)}`);
    }
    if (currentTodoFollowup?.recent_action && !completion && !independentReview?.blocking) {
        lines.push(`刚完成：${cleanGroupStatusFollowupText(currentTodoFollowup.recent_action, "上一项 Todo 已完成。", 160)}。`);
    }
    if (!independentReview?.blocking && (pickup?.current_state || pickup?.currentState || pickup?.headline)) {
        const pickupState = cleanGroupStatusFollowupText(pickup.current_state || pickup.currentState || pickup.headline, "我已整理当前任务状态。", 220);
        lines.push(`${cleanGroupStatusFollowupText(pickup.title, "回来继续看这里", 80)}：${pickupState}`);
    }
    const pickupReviewItems = Array.isArray(pickup?.review_items || pickup?.reviewItems)
        ? (pickup.review_items || pickup.reviewItems)
            .map((item) => cleanGroupStatusFollowupText(item, "", 120))
            .filter(Boolean)
            .slice(0, 4)
        : [];
    if (pickupReviewItems.length && !independentReview?.blocking) {
        lines.push(`回看要点：${pickupReviewItems.join("；")}。`);
    }
    if (progressRefresh?.headline || progressRefresh?.current_state || progressRefresh?.currentState) {
        const refreshState = cleanGroupStatusFollowupText(progressRefresh.current_state || progressRefresh.currentState || progressRefresh.headline, "我已整理进度刷新状态。", 220);
        lines.push(`${cleanGroupStatusFollowupText(progressRefresh.title, "进度刷新提醒", 80)}：${refreshState}`);
    }
    const progressReviewItems = Array.isArray(progressRefresh?.review_items || progressRefresh?.reviewItems)
        ? (progressRefresh.review_items || progressRefresh.reviewItems)
            .map((item) => cleanGroupStatusFollowupText(item, "", 120))
            .filter(Boolean)
            .slice(0, 4)
        : [];
    if (progressReviewItems.length) {
        lines.push(`接续要点：${progressReviewItems.join("；")}。`);
    }
    if (independentReview) {
        lines.push(`独立复核：${independentReview.statusLabel}${independentReview.headline ? `，${independentReview.headline}` : ""}`);
    }
    if (independentReview?.rows?.length) {
        lines.push(`复核要点：${independentReview.rows.join("；")}。`);
    }
    if (testAgentPlan) {
        lines.push(`TestAgent 计划：${testAgentPlan.statusLabel}${testAgentPlan.headline ? `，${testAgentPlan.headline}` : ""}`);
    }
    if (testAgentPlan?.rows?.length) {
        lines.push(`计划要点：${testAgentPlan.rows.join("；")}。`);
    }
    const childAgentSummary = status.child_agent_status_summary || status.childAgentStatusSummary || null;
    if (childAgentSummary?.summary_text) {
        lines.push(`执行成员等待情况：${cleanGroupStatusFollowupText(childAgentSummary.summary_text, "执行成员状态已整理。", 220)}。`);
    }
    if (Array.isArray(childAgentSummary?.rows) && childAgentSummary.rows.length) {
        const details = childAgentSummary.rows
            .filter((row) => ["running", "pending", "failed", "blocked"].includes(String(row?.status || "")))
            .slice(0, 4)
            .map((row) => {
            const agent = cleanGroupStatusFollowupText(row.agent, "执行成员", 80);
            const label = cleanGroupStatusFollowupText(row.status_label || groupChildAgentStatusLabel(row.status), "处理中", 60);
            const detail = cleanGroupStatusFollowupText(row.detail, "", 120);
            return `${agent} ${label}${detail ? `：${detail}` : ""}`;
        })
            .filter(Boolean);
        if (details.length)
            lines.push(`正在等待/处理：${details.join("；")}。`);
    }
    const runningAgents = Array.isArray(status.running_child_agents) ? status.running_child_agents.filter(Boolean) : [];
    if (!childAgentSummary && runningAgents.length) {
        lines.push(`执行成员：${runningAgents.slice(0, 4).join("、")} 正在处理。`);
    }
    else if (!childAgentSummary && status.task_id && !completion) {
        lines.push("执行成员：当前没有正在运行的执行成员。");
    }
    if (Number(status.open_qa_count || 0) > 0) {
        lines.push(`待确认：还有 ${Number(status.open_qa_count || 0)} 个待确认问答需要你确认。`);
    }
    if (userActionSummary?.headline) {
        lines.push(`${cleanGroupStatusFollowupText(userActionSummary.title, "需要你处理", 80)}：${cleanGroupStatusFollowupText(userActionSummary.headline, "当前需要你确认或补充信息。", 220)}`);
    }
    if (Array.isArray(userActionSummary?.action_items) && userActionSummary.action_items.length) {
        lines.push(`你可以处理：${userActionSummary.action_items.map((item) => cleanGroupStatusFollowupText(item, "", 120)).filter(Boolean).slice(0, 4).join("；")}。`);
    }
    const blockers = joinGroupStatusItems(status.blockers, "");
    const needs = joinGroupStatusItems(status.needs, "");
    if (blockers)
        lines.push(`阻塞项：${blockers}。`);
    if (needs)
        lines.push(`还需要：${needs}。`);
    const pickupNextAction = cleanGroupStatusFollowupText(pickup?.resume_action || pickup?.resumeAction, "", 220);
    const progressRefreshNextAction = cleanGroupStatusFollowupText(progressRefresh?.next_action || progressRefresh?.nextAction, "", 220);
    const userActionNextAction = cleanGroupStatusFollowupText(userActionSummary?.next_action || userActionSummary?.nextAction, "", 220);
    const currentTodoNextAction = cleanGroupStatusFollowupText(currentTodoFollowup?.next_action || currentTodoFollowup?.nextAction, "", 220);
    const phaseNextAction = String(status?.phase || "").toLowerCase() === "reworking" ? groupStatusNextAction(status) : "";
    const reviewNextAction = independentReview?.blocking ? independentReview.nextAction : "";
    const planNextAction = testAgentPlan?.nextAction || "";
    const nextAction = reviewNextAction || planNextAction || userActionNextAction || currentTodoNextAction || pickupNextAction || phaseNextAction || progressRefreshNextAction || groupStatusNextAction(status);
    lines.push(`下一步：${nextAction}`);
    lines.push("我不会猜测还没返回的执行成员结果；底层记录默认收在任务卡的技术详情里。");
    const text = lines
        .map(line => cleanGroupStatusFollowupText(line, line, 260))
        .filter(Boolean)
        .join("\n");
    return {
        schema: "ccm-group-status-followup-summary-v1",
        kind: "group_status_followup",
        text,
        next_action: nextAction,
        status,
        display_policy: {
            user_visible: true,
            task_card_visible: false,
            todo_visible: false,
            technical_details_default_collapsed: true,
            hide_internal_protocols: true,
        },
    };
}
function runGroupStatusFollowupSelfTest() {
    const mockStatus = {
        schema: "ccm-group-main-agent-status-v1",
        phase: "executing",
        label: "正在处理",
        task_id: "task_demo",
        latest_task_title: "优化协作群工作链路",
        running_child_agents: ["web", "api"],
        child_agent_status_summary: {
            schema: "ccm-group-child-agent-status-summary-v1",
            title: "执行成员等待情况",
            status: "waiting",
            status_label: "等待中",
            completed_agents: ["web"],
            running_agents: ["api"],
            waiting_agents: ["qa"],
            attention_agents: ["docs"],
            summary_text: "已回传：web；处理中：api；等待中：qa；待补齐：docs",
            rows: [
                { agent: "web", status: "completed", status_label: "已回传结果", detail: "已提交结果说明" },
                { agent: "api", status: "running", status_label: "处理中", detail: "正在运行验证" },
                { agent: "qa", status: "pending", status_label: "等待中", detail: "等待派发" },
                { agent: "docs", status: "blocked", status_label: "待补齐", detail: "缺少验证证据" },
            ],
        },
        open_qa_count: 1,
        latest_progress_checkpoint: {
            label: "我已安排执行成员",
            detail: "等待 web 和 api 返回验证结果",
            status: "active",
        },
        blockers: ["CCM_AGENT_RECEIPT trace_id=abc"],
        needs: ["补齐验证证据"],
    };
    const summary = buildGroupStatusFollowupSummary({ status: mockStatus });
    const derivedStatus = buildGroupMainAgentStatus({
        groupId: "group-status-demo",
        tasks: [{
                id: "task-status-demo",
                group_id: "group-status-demo",
                title: "状态追问任务",
                status: "in_progress",
                updated_at: "2026-07-07T10:00:00.000Z",
                delivery_summary: {
                    assignment_evidence: [{ project: "web", task: "修复登录态" }, { project: "api", task: "补接口验证" }],
                    receipt_statuses: [{ agent: "web", status: "done", summary: "已完成登录态修复" }],
                },
            }],
        agentQa: [],
        getRuntime: () => ({
            taskCard: {
                live_todo_plan: {
                    steps: [
                        { id: "plan", content: "确认目标和范围", activeForm: "已确认目标和范围", status: "completed" },
                        { id: "execute", content: "等待执行成员提交结果", activeForm: "正在等待执行成员提交结果", status: "in_progress" },
                    ],
                    next_action: "等待执行成员提交结果说明，然后我验收。",
                },
                agent_progress_summary: {
                    rows: [
                        { agent: "api", status: "running", current_focus: "正在验证接口" },
                        { agent: "docs", status: "blocked", summary: "缺少验证证据" },
                    ],
                },
            },
        }),
    });
    const derivedFollowup = buildGroupStatusFollowupSummary({ status: derivedStatus });
    const pickupStatus = buildGroupMainAgentStatus({
        groupId: "group-status-pickup-demo",
        tasks: [{
                id: "task-status-pickup-demo",
                group_id: "group-status-pickup-demo",
                title: "状态回看任务",
                status: "completed",
                updated_at: "2026-07-07T10:00:00.000Z",
                delivery_summary: {
                    delivery_report: {
                        schema: "ccm-main-agent-delivery-report-v1",
                        title: "状态回看任务交付总结",
                        status: "done",
                        status_label: "已完成",
                        headline: "状态回看任务已经完成。",
                        files: ["frontend/src/demo.ts"],
                        verification: ["npm test"],
                        risks: [],
                        next_action: "可以继续补充新的要求。",
                        pickup_summary: {
                            schema: "ccm-main-agent-pickup-summary-v1",
                            title: "回来继续看这里",
                            status: "done",
                            status_label: "已完成",
                            headline: "状态回看任务已经完成。",
                            current_state: "可以直接查看完成内容；原始执行记录在技术详情里。",
                            review_items: ["改动：frontend/src/demo.ts", "验证：npm test"],
                            resume_action: "可以继续补充新的要求。",
                        },
                    },
                },
            }],
        agentQa: [],
        getRuntime: () => null,
    });
    const pickupFollowup = buildGroupStatusFollowupSummary({ status: pickupStatus });
    const progressRefreshStatus = buildGroupMainAgentStatus({
        groupId: "group-progress-refresh-demo",
        tasks: [{
                id: "task-progress-refresh-demo",
                group_id: "group-progress-refresh-demo",
                title: "长时间等待执行成员的任务",
                status: "in_progress",
                updated_at: "2020-01-01T00:00:00.000Z",
                work_items: [{
                        id: "wi-web-stalled",
                        target: "web",
                        owner: "web",
                        subject: "补齐筛选 UI 验证",
                        status: "in_progress",
                        updatedAt: "2020-01-01T00:00:00.000Z",
                    }],
                delivery_summary: {
                    work_item_state: {
                        last_requeue: { at: "2020-01-01T00:20:00.000Z", reason: "执行成员工作项长时间无进展" },
                    },
                },
            }],
        agentQa: [],
        getRuntime: () => ({
            taskCard: {
                progress_checkpoints: {
                    items: [
                        { id: "cp-refresh-dispatch", label: "已派发给 web", detail: "等待 web 提交验证证据。", status: "active", at: "2020-01-01T00:00:00.000Z" },
                    ],
                },
                agent_progress_summary: {
                    rows: [{ agent: "web", status: "running", current_focus: "补齐筛选 UI 验证" }],
                },
            },
        }),
    });
    const progressRefreshFollowup = buildGroupStatusFollowupSummary({ status: progressRefreshStatus });
    const weakAcceptanceStatus = buildGroupMainAgentStatus({
        groupId: "group-weak-acceptance-status-demo",
        tasks: [{
                id: "task-weak-acceptance-status",
                group_id: "group-weak-acceptance-status-demo",
                title: "弱验收状态任务",
                status: "done",
                updated_at: "2026-07-09T10:00:00.000Z",
                completed_at: "2026-07-09T10:00:00.000Z",
                delivery_summary: {
                    headline: "旧摘要声称已完成",
                    acceptance_gate_passed: true,
                    acceptance: ["验收结论：已通过"],
                    delivery_report: {
                        schema: "ccm-main-agent-delivery-report-v1",
                        status: "done",
                        status_label: "已完成",
                        headline: "旧摘要声称已完成",
                        acceptance: ["验收结论：已通过"],
                        verification_evidence: { status: "ready", items: [] },
                    },
                },
            }],
        agentQa: [],
        getRuntime: () => ({
            taskCard: {
                phase: "reviewing",
                phase_label: "验收中",
                delivery: { acceptance_passed: false },
                acceptance_review: { pass: false, missing: ["目标覆盖"], headline: "还缺 1 项证据，不能宣布完成" },
                mainAgentDecision: { verify: { passed: false } },
                live_todo_plan: {
                    steps: [
                        { id: "coordinator_review", content: "最终验收执行成员结果", activeForm: "我正在验收", status: "reviewing", detail: "最终验收缺少真实验证或复核证据" },
                        { id: "final_delivery_report", content: "等待验收完成后生成交付报告", activeForm: "正在生成交付报告", status: "pending" },
                    ],
                    next_action: "补齐真实验证或复核证据后再总结。",
                },
                blockers: ["最终验收缺少真实验证或复核证据"],
            },
        }),
    });
    const weakAcceptanceFollowup = buildGroupStatusFollowupSummary({ status: weakAcceptanceStatus });
    const independentReviewStatus = buildGroupMainAgentStatus({
        groupId: "group-independent-review-status-demo",
        tasks: [{
                id: "task-independent-review-status",
                group_id: "group-independent-review-status-demo",
                title: "登录恢复复核",
                status: "completed",
                updated_at: "2026-07-09T11:00:00.000Z",
                delivery_summary: {
                    headline: "任务已完成，可以查看改动详情。",
                    independent_review_summary: {
                        schema: "ccm-main-agent-independent-review-summary-v1",
                        title: "独立复核",
                        status: "needs_rework",
                        status_label: "需返工",
                        headline: "TestAgent 复核指出仍有未覆盖项，需要先返工。",
                        rows: [
                            "TestAgent：需返工",
                            "待返工：验收条件未通过：登录恢复验证必须通过",
                        ],
                        next_action: "先处理复核指出的缺口，再重新运行 TestAgent/独立复核。",
                    },
                    delivery_report: {
                        schema: "ccm-main-agent-delivery-report-v1",
                        status: "done",
                        headline: "任务已完成，可以查看改动详情。",
                        technical: {
                            schema: "ccm-test-agent-report-v1",
                            report_json: "C:/tmp/test-agent/report.json",
                            artifact_manifest: "C:/tmp/test-agent/artifact-manifest.json",
                        },
                    },
                },
            }],
        agentQa: [],
        getRuntime: () => null,
    });
    const independentReviewFollowup = buildGroupStatusFollowupSummary({ status: independentReviewStatus });
    const testAgentPlanOnlyStatus = buildGroupMainAgentStatus({
        groupId: "group-test-agent-plan-only-status-demo",
        tasks: [{
                id: "task-test-agent-plan-only-status",
                group_id: "group-test-agent-plan-only-status-demo",
                title: "只生成 TestAgent 复核计划的群聊任务",
                status: "completed",
                updated_at: "2026-07-09T11:30:00.000Z",
                delivery_summary: {
                    headline: "任务已完成，可以查看改动详情。",
                    test_agent_execution_plan_summary: {
                        schema: "ccm-test-agent-execution-plan-summary-v1",
                        title: "TestAgent 复核计划",
                        status: "ready",
                        status_label: "可执行",
                        headline: "TestAgent 已生成复核计划，我会按这份计划启动真实验证。",
                        rows: [
                            "复核范围：1 个项目",
                            "浏览器检查：1 项",
                        ],
                        next_action: "启动 TestAgent 真实复核，并把结论纳入最终验收。",
                    },
                    delivery_report: {
                        schema: "ccm-main-agent-delivery-report-v1",
                        status: "done",
                        headline: "任务已完成，可以查看改动详情。",
                        technical: {
                            test_agent_execution_plan: {
                                artifactDir: "C:/tmp/test-agent-artifacts/group-plan-only",
                                browser_har: "C:/tmp/test-agent-artifacts/group-plan-only/browser.har",
                            },
                        },
                    },
                },
            }],
        agentQa: [],
        getRuntime: () => null,
    });
    const testAgentPlanOnlyFollowup = buildGroupStatusFollowupSummary({ status: testAgentPlanOnlyStatus });
    const testAgentFailureSummaryOnlyStatus = buildGroupMainAgentStatus({
        groupId: "group-test-agent-failure-summary-status-demo",
        tasks: [{
                id: "task-test-agent-failure-summary-only",
                group_id: "group-test-agent-failure-summary-status-demo",
                title: "登录恢复 TestAgent 复核",
                status: "completed",
                updated_at: "2026-07-09T12:00:00.000Z",
                delivery_summary: {
                    headline: "任务已完成，可以查看改动详情。",
                    delivery_report: {
                        schema: "ccm-main-agent-delivery-report-v1",
                        status: "done",
                        headline: "任务已完成，可以查看改动详情。",
                        technical: {
                            schema: "ccm-test-agent-report-v1",
                            test_agent_report: {
                                schema: "ccm-test-agent-report-v1",
                                status: "failed",
                                recommendation: "rework",
                                artifactDir: "C:/tmp/test-agent-artifacts/failure-summary-only",
                                failureSummary: [{
                                        type: "browser",
                                        project: "web-app",
                                        title: "登录恢复浏览器复核",
                                        status: "failed",
                                        reason: "会话请求没有恢复登录态；失败截图在 C:/tmp/test-agent-artifacts/failure-summary-only/screenshots/login.failure.png。",
                                        nextAction: "先修复会话恢复请求，再重新运行浏览器复核。",
                                        diagnostics: ["打开失败截图核对页面是否仍停留在登录态。"],
                                    }],
                                metadata: {
                                    artifactFiles: {
                                        reportMarkdownPath: "C:/tmp/test-agent-artifacts/failure-summary-only/report.md",
                                        manifestPath: "C:/tmp/test-agent-artifacts/failure-summary-only/artifact-manifest.json",
                                    },
                                },
                            },
                        },
                    },
                },
            }],
        agentQa: [],
        getRuntime: () => null,
    });
    const testAgentFailureSummaryOnlyFollowup = buildGroupStatusFollowupSummary({ status: testAgentFailureSummaryOnlyStatus });
    const reworkStatus = buildGroupMainAgentStatus({
        groupId: "group-rework-status-demo",
        tasks: [{
                id: "task-status-completed-newer",
                group_id: "group-rework-status-demo",
                title: "较新的已完成任务",
                status: "done",
                updated_at: "2026-07-09T10:00:00.000Z",
                delivery_summary: { delivery_report: { status: "done", headline: "这项旧任务已完成。" } },
            }, {
                id: "task-status-rework",
                group_id: "group-rework-status-demo",
                title: "登录复核返工",
                status: "reworking",
                updated_at: "2026-07-08T10:00:00.000Z",
                delivery_summary: {},
            }],
        agentQa: [],
        getRuntime: (task) => task?.id === "task-status-rework" ? ({
            taskCard: {
                phase: "reworking",
                progress_checkpoints: {
                    items: [
                        { id: "cp-review-failed", label: "复核未通过", detail: "正在让原执行成员按失败点返工。", status: "active", at: "2026-07-08T10:00:00.000Z" },
                    ],
                },
                agent_progress_summary: {
                    rows: [{ agent: "web", status: "reworking", current_focus: "修复复核发现的问题" }],
                },
            },
        }) : null,
    });
    const reworkFollowup = buildGroupStatusFollowupSummary({ status: reworkStatus });
    const needsUserFollowup = buildGroupStatusFollowupSummary({
        status: {
            schema: "ccm-group-main-agent-status-v1",
            phase: "needs_user",
            label: "等待确认",
            task_id: "task-needs-user-demo",
            latest_task_title: "执行前计划确认",
            latest_progress_checkpoint: {
                label: "计划已整理",
                detail: "等待你确认影响范围后再派发执行成员",
                status: "warning",
            },
            current_todo_summary: {
                schema: "ccm-group-main-agent-current-todo-v1",
                recent_action: "已整理执行前计划",
                needs_action: "确认执行前计划，确认后才会派发执行成员。",
            },
            open_qa_count: 1,
            blockers: ["CCM_AGENT_RECEIPT trace_id=secret"],
            needs: ["确认影响范围仅限登录页"],
        },
    });
    const internalNeedsUserFollowup = buildGroupStatusFollowupSummary({
        status: {
            schema: "ccm-group-main-agent-status-v1",
            phase: "needs_user",
            label: "待补齐",
            task_id: "task-internal-needs-user-demo",
            latest_task_title: "内部验收补齐",
            latest_progress_checkpoint: {
                label: "验收证据不足",
                detail: "需要补齐真实验证或复核证据后再总结",
                status: "warning",
            },
            current_todo_summary: {
                schema: "ccm-group-main-agent-current-todo-v1",
                recent_action: "已发现验收证据不足",
                needs_action: "等待执行成员提交结果说明，然后我会验收并总结。",
                next_action: "补齐真实验证或复核证据后再总结。",
            },
            blockers: ["最终验收缺少真实验证或复核证据"],
            needs: ["补齐真实验证或复核证据"],
        },
    });
    const legacyAgentQaNeedsHandlingCopy = "Agent 问答" + "需要处理";
    const checks = {
        groupStatusFollowupRecognized: isGroupProgressStatusRequest("现在进展怎么样了？"),
        groupStatusFollowupAvoidsManagementMutation: !isGroupProgressStatusRequest("把任务状态设置为 done"),
        groupStatusFollowupFriendly: summary.text.includes("最近群聊任务进展") && summary.text.includes("下一步"),
        groupStatusFollowupShowsChildAgentWaitingState: summary.text.includes("执行成员等待情况")
            && summary.text.includes("已回传：web")
            && summary.text.includes("处理中：api")
            && summary.text.includes("待补齐：docs")
            && summary.text.includes("正在等待/处理")
            && !summary.text.includes("已完成：web"),
        groupStatusDerivesChildAgentRows: derivedStatus.child_agent_status_summary?.completed_agents?.includes("web")
            && derivedStatus.child_agent_status_summary?.running_agents?.includes("api")
            && derivedStatus.child_agent_status_summary?.attention_agents?.includes("docs")
            && derivedStatus.child_agent_status_summary?.rows?.some((row) => row.agent === "web" && row.status_label === "已回传结果")
            && derivedStatus.child_agent_status_summary?.summary_text?.includes("已回传：web")
            && !derivedStatus.child_agent_status_summary?.summary_text?.includes("已完成：web"),
        groupStatusCurrentTodoPostTurnVisible: derivedStatus.current_todo_summary?.recent_action === "已确认目标和范围"
            && !derivedStatus.current_todo_summary?.needs_action
            && derivedStatus.current_todo_summary?.next_action === "等待执行成员提交结果说明，然后我验收。"
            && derivedFollowup.text.includes("当前 Todo")
            && derivedFollowup.text.includes("等待执行成员提交结果说明，然后我验收")
            && !derivedFollowup.text.includes("需要你处理：等待执行成员提交结果说明"),
        groupStatusDerivesPickupSummary: pickupStatus.pickup_summary?.schema === "ccm-group-main-agent-pickup-summary-v1"
            && pickupStatus.pickup_summary?.title === "回来继续看这里"
            && pickupStatus.pickup_summary?.review_items?.some((item) => item.includes("frontend/src/demo.ts"))
            && pickupStatus.latest_delivery_summary?.pickup_summary?.display_policy?.technical_details_default_collapsed === true,
        groupStatusFollowupUsesPickupSummary: pickupFollowup.text.includes("回来继续看这里")
            && pickupFollowup.text.includes("回看要点")
            && pickupFollowup.text.includes("frontend/src/demo.ts")
            && pickupFollowup.next_action === "可以继续补充新的要求。",
        groupStatusShowsProgressRefreshSummary: progressRefreshStatus.progress_refresh_summary?.schema === "ccm-group-main-agent-progress-refresh-v1"
            && progressRefreshStatus.progress_refresh_summary?.title === "进度刷新提醒"
            && progressRefreshStatus.progress_refresh_summary?.review_items?.some((item) => item.includes("web"))
            && progressRefreshStatus.latest_delivery_summary?.progress_refresh_summary?.display_policy?.technical_details_default_collapsed === true,
        groupStatusFollowupUsesProgressRefreshSummary: progressRefreshFollowup.text.includes("进度刷新提醒")
            && progressRefreshFollowup.text.includes("接续要点")
            && progressRefreshFollowup.text.includes("补齐筛选 UI 验证")
            && !GROUP_PROGRESS_STATUS_INTERNAL_PATTERN.test(progressRefreshFollowup.text),
        groupStatusWeakAcceptanceStaysReviewing: weakAcceptanceStatus.phase === "reviewing"
            && weakAcceptanceStatus.label === "验收中"
            && weakAcceptanceStatus.completion_summary === null
            && weakAcceptanceStatus.pickup_summary === null
            && weakAcceptanceStatus.current_todo_summary?.step_id === "coordinator_review"
            && weakAcceptanceStatus.current_todo_summary?.status === "reviewing"
            && weakAcceptanceFollowup.text.includes("当前状态是验收中")
            && weakAcceptanceFollowup.text.includes("补齐真实验证或复核证据")
            && !weakAcceptanceFollowup.text.includes("需要你处理：最终验收缺少真实验证或复核证据")
            && !weakAcceptanceFollowup.text.includes("交付总结：旧摘要声称已完成"),
        groupStatusFollowupShowsIndependentReviewRework: independentReviewStatus.phase === "reworking"
            && independentReviewStatus.label === "返工中"
            && independentReviewStatus.completion_summary === null
            && independentReviewStatus.pickup_summary === null
            && independentReviewFollowup.text.includes("登录恢复复核，当前状态是返工中")
            && independentReviewFollowup.text.includes("独立复核：需返工")
            && independentReviewFollowup.text.includes("验收条件未通过：登录恢复验证必须通过")
            && independentReviewFollowup.text.includes("重新运行 TestAgent/独立复核")
            && !independentReviewFollowup.text.includes("任务已完成，可以查看改动详情")
            && !/ccm-test-agent-report-v1|report\.json|artifact-manifest|task-independent-review-status/i.test(independentReviewFollowup.text),
        groupStatusFollowupShowsTestAgentPlanOnly: testAgentPlanOnlyStatus.phase === "reviewing"
            && testAgentPlanOnlyStatus.label === "复核准备中"
            && testAgentPlanOnlyStatus.completion_summary === null
            && testAgentPlanOnlyStatus.pickup_summary === null
            && testAgentPlanOnlyFollowup.text.includes("只生成 TestAgent 复核计划的群聊任务，当前状态是复核准备中")
            && testAgentPlanOnlyFollowup.text.includes("TestAgent 计划：可执行")
            && testAgentPlanOnlyFollowup.text.includes("浏览器检查：1 项")
            && testAgentPlanOnlyFollowup.text.includes("启动 TestAgent 真实复核")
            && !testAgentPlanOnlyFollowup.text.includes("任务已完成，可以查看改动详情")
            && !/browser_har|test-agent-artifacts|C:\/tmp|task-test-agent-plan-only-status/i.test(testAgentPlanOnlyFollowup.text),
        groupStatusSynthesizesTestAgentFailureSummary: testAgentFailureSummaryOnlyStatus.phase === "reworking"
            && testAgentFailureSummaryOnlyStatus.label === "返工中"
            && testAgentFailureSummaryOnlyStatus.independent_review_summary?.rows?.some((item) => item.includes("返工重点") && item.includes("浏览器检查"))
            && testAgentFailureSummaryOnlyStatus.independent_review_summary?.rows?.some((item) => item.includes("排查建议") && item.includes("打开失败截图核对页面"))
            && testAgentFailureSummaryOnlyFollowup.text.includes("登录恢复 TestAgent 复核，当前状态是返工中")
            && testAgentFailureSummaryOnlyFollowup.text.includes("返工重点")
            && testAgentFailureSummaryOnlyFollowup.text.includes("排查建议")
            && testAgentFailureSummaryOnlyFollowup.text.includes("重新运行 TestAgent/独立复核")
            && !testAgentFailureSummaryOnlyFollowup.text.includes("任务已完成，可以查看改动详情")
            && !/ccm-test-agent-report-v1|report\.json|report\.md|artifact-manifest|test-agent-artifacts|C:\/tmp|task-test-agent-failure-summary-only/i.test(testAgentFailureSummaryOnlyFollowup.text),
        groupStatusFollowupShowsReworkState: reworkStatus.task_id === "task-status-rework"
            && reworkStatus.phase === "reworking"
            && reworkStatus.label === "返工中"
            && reworkFollowup.text.includes("登录复核返工")
            && reworkFollowup.text.includes("当前状态是返工中")
            && reworkFollowup.text.includes("重新验收和总结")
            && !GROUP_PROGRESS_STATUS_INTERNAL_PATTERN.test(reworkFollowup.text),
        groupStatusFollowupShowsUserActionSummary: needsUserFollowup.text.includes("需要你处理")
            && needsUserFollowup.text.includes("确认执行前计划")
            && needsUserFollowup.text.includes("处理 1 个待确认问答")
            && needsUserFollowup.text.includes("1 个待确认问答需要你确认")
            && !needsUserFollowup.text.includes(legacyAgentQaNeedsHandlingCopy)
            && needsUserFollowup.next_action.includes("确认执行前计划")
            && !GROUP_PROGRESS_STATUS_INTERNAL_PATTERN.test(needsUserFollowup.text),
        groupStatusFollowupAvoidsInternalNeedsUserAction: !internalNeedsUserFollowup.text.includes("需要你处理")
            && internalNeedsUserFollowup.text.includes("内部验收补齐")
            && internalNeedsUserFollowup.text.includes("补齐真实验证或复核证据")
            && !internalNeedsUserFollowup.text.includes("需要你处理：等待执行成员提交结果说明"),
        groupStatusFollowupHidesProtocol: !GROUP_PROGRESS_STATUS_INTERNAL_PATTERN.test(summary.text),
        groupStatusFollowupNoTodo: summary.display_policy.todo_visible === false && summary.display_policy.task_card_visible === false,
    };
    return { pass: Object.values(checks).every(Boolean), checks, sample: summary.text };
}
//# sourceMappingURL=group-routes-part-02.js.map