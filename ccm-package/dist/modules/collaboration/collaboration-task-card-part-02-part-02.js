"use strict";
// Behavior-freeze split from collaboration-task-card-part-02.ts (part 2/2).
// Behavior-freeze split from collaboration-task-card.ts (part 2/3).
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildUserWorkOrderPreview = buildUserWorkOrderPreview;
exports.executionStoryStatus = executionStoryStatus;
exports.buildUserExecutionStory = buildUserExecutionStory;
exports.buildUserCompletionReadinessSummary = buildUserCompletionReadinessSummary;
exports.sanitizeAcceptanceVisibleText = sanitizeAcceptanceVisibleText;
exports.normalizeUserAcceptanceCheck = normalizeUserAcceptanceCheck;
const collaboration_1 = require("./collaboration");
const display_1 = require("./display");
const memory_1 = require("./memory");
const collaboration_task_card_part_01_1 = require("./collaboration-task-card-part-01");
const collaboration_task_card_part_02_part_01_1 = require("./collaboration-task-card-part-02-part-01");
function buildUserWorkOrderPreview(task, summary = {}, planMode = null) {
    const plan = planMode || (0, collaboration_task_card_part_02_part_01_1.getTaskPlanMode)(task);
    const assignmentEvidence = Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [];
    const sandboxPlan = Array.isArray(task?.sandbox_rehearsal?.agent_plan)
        ? task.sandbox_rehearsal.agent_plan
        : Array.isArray(task?.workflow_meta?.sandbox_rehearsal?.agent_plan)
            ? task.workflow_meta.sandbox_rehearsal.agent_plan
            : [];
    const planProjects = Array.isArray(plan?.impact_scope?.projects) ? plan.impact_scope.projects : [];
    const fallbackProjects = (0, collaboration_1.uniqueStrings)([
        ...planProjects,
        task?.target_project,
    ].filter(Boolean)).slice(0, 6);
    const sourceRows = assignmentEvidence.length
        ? assignmentEvidence
        : sandboxPlan.length
            ? sandboxPlan
            : fallbackProjects.map((project) => ({ project, task: task?.title || task?.business_goal || "等待主 Agent 细化工作单", reason: "来自执行前计划影响范围" }));
    const acceptance = (0, collaboration_task_card_part_02_part_01_1.splitUserAcceptanceText)(plan?.acceptance || task?.acceptance_criteria || task?.acceptanceCriteria);
    const areas = Array.isArray(plan?.impact_scope?.areas) ? plan.impact_scope.areas : [];
    const fileHints = Array.isArray(plan?.impact_scope?.file_hints) ? plan.impact_scope.file_hints : [];
    const boundaries = Array.isArray(plan?.permission_boundaries) ? plan.permission_boundaries : [];
    const orders = sourceRows.map((item, index) => {
        const project = String(item.project || item.agent || item.target_project || item.targetName || `Agent ${index + 1}`).trim();
        const objective = (0, memory_1.compactMemoryText)(item.task || item.summary || item.description || task?.business_goal || task?.title || "等待主 Agent 细化工作单", 220);
        const projectRole = (0, collaboration_task_card_part_01_1.userAgentRole)(project);
        return {
            id: item.assignment_id || item.id || `work_order_${index + 1}_${(0, collaboration_task_card_part_02_part_01_1.stableTaskEntityId)("agent", project).slice(-8)}`,
            order: index + 1,
            project,
            role: projectRole,
            title: `${projectRole} · ${project}`,
            objective,
            reason: (0, memory_1.compactMemoryText)(item.reason || plan?.risk?.summary || "主 Agent 根据只读探索和影响范围分派", 180),
            depends_on: Array.isArray(item.dependsOn || item.depends_on) ? (item.dependsOn || item.depends_on).slice(0, 6) : (item.dependsOn || item.depends_on ? [item.dependsOn || item.depends_on] : []),
            allowed_scope: (0, collaboration_1.uniqueStrings)([
                project ? `仅在 ${project} 项目职责范围内修改` : "",
                ...areas,
                ...fileHints,
            ].filter(Boolean)).slice(0, 8),
            forbidden_scope: (0, collaboration_1.uniqueStrings)([
                "不要修改无关模块或用户已有改动",
                "不要编造未执行的验证结果",
                ...boundaries.filter((line) => /不得|禁止|等待|只能|边界|确认|删除|部署|迁移|生产/i.test(String(line || ""))),
            ].filter(Boolean)).slice(0, 8),
            acceptance: acceptance.length ? acceptance.slice(0, 6) : [
                "返回结构化结果说明",
                (0, collaboration_1.taskRequiresCodeChanges)(task) ? "提供真实文件变更" : "说明无需代码变更的依据",
                (0, collaboration_1.taskRequiresVerification)(task) ? "提供已执行验证记录" : "说明检查依据",
            ],
            status: item.status || (summary.assignment_count ? "dispatched" : task?.intake_state === "awaiting_confirmation" ? "waiting_confirmation" : "planned"),
        };
    }).slice(0, 8);
    return {
        title: summary.assignment_count ? "子 Agent 工作单" : "准备派发的工作单",
        source: assignmentEvidence.length ? "dispatch_evidence" : sandboxPlan.length ? "sandbox_rehearsal" : "plan_mode_preview",
        ready: orders.length > 0,
        requires_confirmation: task?.intake_state === "awaiting_confirmation" || plan?.requires_confirmation === true,
        summary: orders.length
            ? `主 Agent 准备让 ${orders.length} 个子 Agent 按边界执行；每个 Agent 必须回传文件、验证和阻塞情况。`
            : "主 Agent 还没有形成可展示的子 Agent 工作单。",
        orders,
    };
}
function executionStoryStatus(conditionDone, conditionActive, phase) {
    if (conditionDone)
        return "done";
    if (conditionActive)
        return "active";
    if (["blocked", "needs_user"].includes(phase))
        return "warning";
    if (phase === "cancelled" || phase === "reverted")
        return "failed";
    return "pending";
}
function buildUserExecutionStory(task, summary = {}, executions = [], phase = "planning", workOrderPreview = null) {
    const files = Array.isArray(summary.actual_file_changes) ? summary.actual_file_changes : [];
    const verification = Array.isArray(summary.verification_executed) ? summary.verification_executed : [];
    const acceptancePassed = (0, collaboration_task_card_part_01_1.hasStrongTaskAcceptanceEvidence)(task, executions, summary);
    const receipts = [
        ...(Array.isArray(summary.receipts) ? summary.receipts : []),
        ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
    ];
    const qaRows = Array.isArray(summary.agent_qa) ? summary.agent_qa : [];
    const runningExecutions = executions.filter((item) => ["spawning", "ready", "prompt_accepted", "running"].includes(String(item.state || "")));
    const reviewingExecutions = executions.filter((item) => String(item.state || "") === "reviewing");
    const failedExecutions = executions.filter((item) => String(item.state || "") === "failed");
    const steps = [
        {
            id: "read_context",
            label: "读取项目和上下文",
            detail: task?.workflow_meta?.plan_mode || task?.intake_draft ? "已完成只读探索，形成执行边界" : "读取群聊上下文、项目记忆和必要代码快照",
            status: executionStoryStatus(!!(task?.workflow_meta?.plan_mode || task?.intake_draft || summary.coordination_plan_count), phase === "planning", phase),
            evidence: (0, memory_1.compactMemoryText)((task?.workflow_meta?.plan_mode || task?.intake_draft)?.read_only_exploration?.summary || "", 180),
        },
        {
            id: "prepare_work_orders",
            label: "准备子 Agent 工作单",
            detail: workOrderPreview?.orders?.length ? `${workOrderPreview.orders.length} 个工作单已形成` : "等待主 Agent 细化派发范围",
            status: executionStoryStatus(!!workOrderPreview?.orders?.length, phase === "dispatching", phase),
            evidence: workOrderPreview?.orders?.map((item) => item.project).join("、") || "",
        },
        {
            id: "dispatch_agents",
            label: "派发给子 Agent",
            detail: Number(summary.assignment_count || 0) > 0 ? `已派发 ${summary.assignment_count} 条` : "确认后才会派发",
            status: executionStoryStatus(Number(summary.assignment_count || 0) > 0, ["queued", "dispatching"].includes(phase), phase),
            evidence: receipts.length ? `${receipts.length} 条结果说明/状态` : "",
        },
        {
            id: "edit_files",
            label: "修改文件",
            detail: files.length ? `已捕获 ${files.length} 个文件改动` : runningExecutions.length ? `${runningExecutions.length} 个 Agent 正在修改` : "等待实际文件改动",
            status: executionStoryStatus(files.length > 0, runningExecutions.length > 0 || phase === "executing", phase),
            evidence: files.slice(0, 4).map((item) => item.path || item).join("、"),
        },
        {
            id: "run_checks",
            label: "运行验证",
            detail: verification.length ? `已执行 ${verification.length} 项检查` : reviewingExecutions.length ? "正在验收/检查" : "等待验证结果",
            status: executionStoryStatus(verification.length > 0, reviewingExecutions.length > 0 || phase === "reviewing", phase),
            evidence: verification.slice(0, 3).join("；"),
        },
        {
            id: "resolve_dependencies",
            label: "处理依赖/返工",
            detail: qaRows.length ? `Agent 问答 ${qaRows.length} 条` : failedExecutions.length ? `${failedExecutions.length} 个执行失败，等待恢复` : "暂无开放依赖",
            status: failedExecutions.length ? "warning" : qaRows.some((item) => !item.answer && item.status !== "resumed") ? "active" : qaRows.length ? "done" : "pending",
            evidence: qaRows.slice(-2).map((item) => `${item.from_agent || "Agent"}→${item.to_agent || "Agent"}`).join("、"),
        },
        {
            id: "final_review",
            label: "主 Agent 验收",
            detail: acceptancePassed ? "验收通过，可以交付" : summary.acceptance_gate ? `仍有 ${summary.acceptance_gate.failed_count || 0} 个缺口` : "等待交付证据",
            status: acceptancePassed ? "done" : phase === "reviewing" ? "active" : summary.acceptance_gate?.failed_count ? "warning" : "pending",
            evidence: summary.acceptance_gate?.failed_checks?.slice?.(0, 3)?.map((item) => item.label).join("、") || "",
        },
    ];
    return {
        title: "执行过程",
        style: "codex-cursor-lite",
        current_step: steps.find((item) => item.status === "active")?.id || steps.find((item) => item.status === "warning")?.id || "",
        steps,
    };
}
function buildUserCompletionReadinessSummary(task, summary = {}, workItems = [], phase = "planning") {
    const teamShutdown = summary.team_shutdown || summary.teamShutdown || {};
    const unresolved = (workItems || []).filter((item) => String(item?.status || "") !== "completed");
    const openSessionCount = Number(teamShutdown.open_session_count || teamShutdown.openSessionCount || 0);
    const nearCompletion = ["reviewing", "needs_user", "blocked", "completed"].includes(String(phase || ""))
        || task?.status === "done"
        || teamShutdown.required === true;
    if (!nearCompletion || (!workItems.length && teamShutdown.required !== true))
        return null;
    const pass = unresolved.length === 0 && openSessionCount === 0;
    const rows = unresolved.slice(0, 8).map((item) => ({
        target: (0, collaboration_task_card_part_01_1.sanitizeUserAgentProgressText)(item.target || item.owner || "执行成员", "执行成员", 80),
        subject: (0, memory_1.compactMemoryText)(item.subject || item.description || "未完成工作项", 180),
        status: String(item.status || "pending"),
        status_label: item.status === "in_progress" ? "执行中" : item.status === "blocked" ? "等待处理" : item.status === "failed" ? "需要修复" : "等待开始",
    }));
    return {
        schema: "ccm-main-agent-completion-readiness-v1",
        title: "完成前收尾",
        status: pass ? "ready" : "blocked",
        status_label: pass ? "可以总结" : "尚未收尾",
        headline: pass
            ? "执行队列和执行成员会话都已收尾，可以进入最终验收与总结。"
            : `还有 ${unresolved.length} 个工作项未完成${openSessionCount ? `，${openSessionCount} 个执行成员会话仍在处理` : ""}，我不会提前宣布完成。`,
        rows,
        open_session_count: openSessionCount,
        unresolved_work_item_count: unresolved.length,
        next_action: pass
            ? "继续核对验收证据并整理最终总结。"
            : unresolved.length
                ? "先完成或处理这些工作项；全部收敛后再做最终总结。"
                : "等待执行成员会话结束，再做最终验收和总结。",
        display_policy: {
            user_text_first: true,
            technical_default_collapsed: true,
            hide_internal_protocols: true,
            show_for_ordinary_conversation: false,
        },
        technical: {
            unresolved_work_item_ids: unresolved.map((item) => item.id).filter(Boolean),
            open_session_ids: Array.isArray(teamShutdown.open_sessions) ? teamShutdown.open_sessions.map((item) => item?.id).filter(Boolean) : [],
        },
    };
}
function sanitizeAcceptanceVisibleText(value, fallback = "验收检查已整理。", max = 220) {
    return (0, display_1.sanitizeMainAgentUserText)(value, fallback, max)
        .replace(/\bACK\b/g, "接单说明")
        .replace(/接单确认/g, "接单说明")
        .replace(/API\s*microcompact\s*edit\s*plan/gi, "上下文压缩计划")
        .replace(/API\s*microcompact/gi, "上下文压缩")
        .replace(/\bmicrocompact\b/gi, "上下文压缩")
        .replace(/native[_\s-]*applied/gi, "已实际应用")
        .replace(/\bnative\s*apply\b/gi, "实际应用")
        .replace(/\badvisory\b/gi, "参考使用")
        .replace(/\bignored\b/gi, "未使用")
        .replace(/\bused\b/gi, "已使用")
        .replace(/\bverified\b/gi, "已核对")
        .replace(/used\s*\/\s*ignored\s*\/\s*verified/gi, "已使用/未使用/已核对");
}
function normalizeUserAcceptanceCheck(item, context = {}) {
    const id = String(item?.id || "");
    const labels = {
        ack_gate: "接单说明完整",
        receipt_quality: "结果说明完整",
        memory_gate_receipt: "记忆使用声明",
        global_memory_health_gate_receipt: "全局记忆使用说明",
        read_plan_revalidation_gate_receipt: "读取计划已复核",
        post_compact_reinjection_gate_receipt: "压缩后上下文恢复声明",
        api_microcompact_receipt: "上下文压缩计划使用说明",
        actual_diff: "真实文件改动",
    };
    let detail = item?.detail || "";
    if (id === "ack_gate") {
        const rejectedCount = Number(context.summary?.ack_review?.rejected?.length || 0);
        detail = item.ok
            ? "执行成员的目标、范围和验证安排已确认"
            : rejectedCount
                ? `还有 ${rejectedCount} 个接单说明需要补齐目标、范围和验证安排`
                : "等待执行成员补齐接单说明";
    }
    else if (id === "receipt_quality") {
        const weakCount = Number(context.summary?.weak_receipt_quality?.length || 0);
        detail = item.ok
            ? "结果说明已包含完成内容、文件改动和验证证据"
            : weakCount
                ? `还有 ${weakCount} 条结果说明需要补齐改动、验证或阻塞信息`
                : "等待执行成员提交完整结果说明";
    }
    else if (id === "memory_gate_receipt") {
        const info = context.memoryGateSummary || {};
        detail = !info.required
            ? "本轮不需要额外记忆使用声明"
            : info.pass
                ? "执行成员已说明本轮群聊记忆使用情况"
                : `还有 ${Number(info.missing_count || info.missing_gate_ids?.length || 1)} 条记忆使用声明需要补齐`;
    }
    else if (id === "global_memory_health_gate_receipt") {
        const info = context.globalMemoryHealthGateSummary || {};
        detail = !info.required
            ? "本轮不需要额外全局记忆说明"
            : info.pass
                ? "执行成员已说明全局记忆使用风险和处理情况"
                : `还有 ${Number(info.missing_count || 1)} 条全局记忆使用说明需要补齐`;
    }
    else if (id === "read_plan_revalidation_gate_receipt") {
        const info = context.readPlanRevalidationGateSummary || {};
        detail = !info.required
            ? "本轮不需要额外读取计划复核"
            : info.pass
                ? "执行成员已重新核对读取计划和当前来源"
                : `还有 ${Number(info.missing_count || info.missing_gate_ids?.length || 1)} 条读取计划复核说明需要补齐`;
    }
    else if (id === "post_compact_reinjection_gate_receipt") {
        const info = context.reinjectionGateSummary || {};
        detail = !info.required
            ? "本轮不需要压缩后上下文恢复说明"
            : info.pass
                ? "执行成员已说明压缩后上下文如何恢复和使用"
                : `还有 ${Number(info.missing_count || info.missing_gate_ids?.length || 1)} 条压缩后上下文恢复声明需要补齐`;
    }
    else if (id === "api_microcompact_receipt") {
        const info = context.apiMicrocompactSummary || {};
        detail = !info.required
            ? "本轮不需要上下文压缩计划使用说明"
            : info.pass
                ? "执行成员已说明上下文压缩计划的使用状态"
                : info.status === "unsafe_native_applied"
                    ? `还有 ${Number(info.missing_count || info.unsafe_native_applied_plan_checksums?.length || 1)} 个上下文压缩计划的实际应用状态需要更正`
                    : `还有 ${Number(info.missing_count || info.missing_plan_checksums?.length || 1)} 个上下文压缩计划缺少使用状态`;
    }
    return {
        ...item,
        label: sanitizeAcceptanceVisibleText(labels[id] || item.label || "验收检查", "验收检查", 80),
        detail: sanitizeAcceptanceVisibleText(detail, "验收检查已整理。", 220),
    };
}
//# sourceMappingURL=collaboration-task-card-part-02-part-02.js.map