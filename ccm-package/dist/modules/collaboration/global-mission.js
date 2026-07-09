"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasStrongGlobalMissionChildAcceptanceEvidence = hasStrongGlobalMissionChildAcceptanceEvidence;
exports.getGlobalMissionChildDeliveryEvidence = getGlobalMissionChildDeliveryEvidence;
exports.globalMissionChildGatePassed = globalMissionChildGatePassed;
exports.refreshGlobalMissionParentInTaskList = refreshGlobalMissionParentInTaskList;
exports.runGlobalMissionStrongAcceptanceSelfTest = runGlobalMissionStrongAcceptanceSelfTest;
function flattenMissionEvidenceRows(...values) {
    const rows = [];
    const visit = (value) => {
        if (!value)
            return;
        if (Array.isArray(value)) {
            for (const item of value)
                visit(item);
            return;
        }
        if (typeof value === "object") {
            const hasOwnConclusion = value.verdict || value.status || value.summary || value.detail || value.reason || value.label || value.title || value.command || value.name;
            if (!hasOwnConclusion && Array.isArray(value.items)) {
                for (const item of value.items)
                    visit(item);
                return;
            }
            if (!hasOwnConclusion && Array.isArray(value.evidence)) {
                for (const item of value.evidence)
                    visit(item);
                return;
            }
        }
        rows.push(value);
    };
    for (const value of values)
        visit(value);
    return rows;
}
function splitMissionEvidenceList(value) {
    if (Array.isArray(value))
        return value.flatMap(item => splitMissionEvidenceList(item));
    const text = String(value || "").trim();
    if (!text || text === "无" || text === "未提供" || text === "未填写")
        return [];
    return text.split(/[；;,\n]/).map(item => item.trim()).filter(Boolean);
}
function uniqueMissionEvidenceStrings(...values) {
    const seen = new Set();
    const result = [];
    for (const value of values) {
        for (const item of splitMissionEvidenceList(value)) {
            if (seen.has(item))
                continue;
            seen.add(item);
            result.push(item);
        }
    }
    return result;
}
function missionEvidenceText(row) {
    if (!row || typeof row !== "object")
        return String(row || "");
    return [
        row.summary,
        row.detail,
        row.reason,
        row.message,
        row.label,
        row.title,
        row.verdict,
        row.status,
        row.command,
        row.name,
        row.reviewer,
    ].filter(Boolean).join(" ");
}
function missionRowEvidenceCount(row) {
    if (!row || typeof row !== "object")
        return 0;
    return uniqueMissionEvidenceStrings(row.evidence, row.verification, row.checks, row.files, row.files_changed, row.filesChanged, row.artifacts).length;
}
function isPositiveMissionAcceptanceText(value) {
    const text = String(value || "").trim();
    if (!text)
        return false;
    if (/未通过|失败|待补|待处理|缺口|证据不足|无法确认|无法验证|failed|failure|partial|incomplete|missing|blocked/i.test(text))
        return false;
    return /已通过|通过|可以接受|已覆盖|已执行|已复核|已验证|passed|pass|success|ok/i.test(text);
}
function isBareMissionAcceptanceMarker(value) {
    return /^(最终验收|主\s*Agent\s*验收|验收结论)\s*[：:]?\s*(已通过|通过)$/i.test(String(value || "").trim());
}
function isSuggestedOnlyMissionVerification(value) {
    const text = String(value || "").trim();
    if (!text)
        return true;
    return /建议|可运行|可以运行|待运行|未运行|未执行|未验证|没有运行|无法运行|未提供|todo|not\s+run|not\s+executed|suggest/i.test(text);
}
function isFailedMissionVerification(value) {
    const text = String(value || "").trim();
    if (!text)
        return false;
    const normalized = text
        .replace(/\b0\s+(?:failed|failures?|errors?)\b/gi, "")
        .replace(/\b(?:no|zero)\s+(?:failed|failures?|errors?)\b/gi, "")
        .replace(/(?:零|0)\s*(?:个|项|条)?\s*(?:失败|错误)/g, "")
        .replace(/(?:无失败|没有失败|全部通过|全数通过)/g, "");
    return /失败|未通过|报错|错误|超时|中断|无法执行|无法自动执行|无法运行|被.*拦截|拦截|阻塞|审批|failed|failure|error|timeout|denied|blocked|not\s+allowed|requires\s+approval|permission/i.test(normalized);
}
function isStrongMissionVerificationText(value) {
    const text = missionEvidenceText(value).trim();
    if (!text || isSuggestedOnlyMissionVerification(text) || isFailedMissionVerification(text))
        return false;
    return /已实际执行|已执行|外部 Runner|验证来源|命令|npm|pnpm|yarn|test|check|lint|build|playwright|pytest|exit\s*0|passed|success|ok/i.test(text);
}
function isStrongPositiveMissionReviewRow(row) {
    if (!row || typeof row !== "object")
        return isPositiveMissionAcceptanceText(row) && !isBareMissionAcceptanceMarker(row);
    const verdict = String(row.verdict || row.status || "").toLowerCase();
    const passed = /pass|passed|approved|accepted|success|ok|通过|已通过/.test(verdict)
        && !/fail|failed|rejected|partial|incomplete|blocked|未通过|失败|待补/.test(verdict);
    const text = missionEvidenceText(row);
    return passed && (missionRowEvidenceCount(row) > 0 || (isPositiveMissionAcceptanceText(text) && !isBareMissionAcceptanceMarker(text)));
}
function getMissionDeliverySummary(task) {
    return task?.delivery_summary || task?.deliverySummary || {};
}
function getMissionDeliveryReport(task, summary = getMissionDeliverySummary(task)) {
    return summary?.delivery_report || summary?.deliveryReport || task?.delivery_report || task?.deliveryReport || null;
}
function missionAcceptanceGatePassed(summary, report = null) {
    const gate = summary?.acceptance_gate || summary?.acceptanceGate || {};
    return summary?.acceptance_gate_passed === true
        || summary?.acceptanceGatePassed === true
        || gate?.pass === true
        || report?.status === "done";
}
function hasSubstantiveMissionGateChecks(summary) {
    const gate = summary?.acceptance_gate || summary?.acceptanceGate || {};
    const gateChecks = Array.isArray(gate?.checks) ? gate.checks : (Array.isArray(gate?.items) ? gate.items : []);
    const failedCount = Number(gate?.failed_count || gate?.failedCount || gateChecks.filter((item) => item?.ok === false || item?.pass === false).length || 0);
    const substantiveGateIds = new Set([
        "actual_changes",
        "actual_diff",
        "verification",
        "required_verification",
        "verification_source",
        "independent_review",
        "final_review",
        "worker_receipt",
        "receipt_quality",
        "work_items",
        "team_shutdown",
    ]);
    return gateChecks.length > 0
        && failedCount === 0
        && gateChecks.every((item) => item?.ok !== false && item?.pass !== false)
        && gateChecks.some((item) => substantiveGateIds.has(String(item?.id || "")) && (item?.detail || item?.label || item?.title));
}
function missionActualFileChangeCount(task) {
    const summary = getMissionDeliverySummary(task);
    return Number(summary.actual_file_change_count
        || summary.actualFileChangeCount
        || (Array.isArray(summary.actual_file_changes) ? summary.actual_file_changes.length : 0)
        || (Array.isArray(summary.actualFileChanges) ? summary.actualFileChanges.length : 0)
        || task?.file_changes?.count
        || 0);
}
function missionStrongVerificationRows(task) {
    const summary = getMissionDeliverySummary(task);
    const report = getMissionDeliveryReport(task, summary);
    return flattenMissionEvidenceRows(summary?.verification_executed, summary?.external_runner_verification, summary?.verification_results, summary?.verification, report?.verification, report?.verification_evidence?.executed, report?.verificationEvidence?.executed, report?.verification_evidence?.items, report?.verificationEvidence?.items, task?.verification, task?.verification_results).filter(isStrongMissionVerificationText);
}
function missionFailedVerificationRows(task) {
    const summary = getMissionDeliverySummary(task);
    return flattenMissionEvidenceRows(summary?.verification_failed, summary?.verificationFailed)
        .filter((item) => isFailedMissionVerification(missionEvidenceText(item)));
}
function hasStrongGlobalMissionChildAcceptanceEvidence(task, deps, executionsInput = null) {
    const summary = getMissionDeliverySummary(task);
    const report = getMissionDeliveryReport(task, summary);
    if (!missionAcceptanceGatePassed(summary, report))
        return false;
    if (hasSubstantiveMissionGateChecks(summary))
        return true;
    if (missionStrongVerificationRows(task).length > 0)
        return true;
    if (summary?.verification_source_gate_passed === true && Number(summary?.external_runner_verification_count || 0) > 0)
        return true;
    const reviewRows = flattenMissionEvidenceRows(summary?.independent_review, summary?.independentReview, summary?.independent_review_evidence, summary?.independent_review_gate?.evidence, report?.independent_review, report?.independentReview);
    if (summary?.independent_review_gate_passed === true && Number(summary?.independent_review_gate?.evidence_count || reviewRows.length || 0) > 0)
        return true;
    if (reviewRows.some(isStrongPositiveMissionReviewRow))
        return true;
    const acceptanceRows = flattenMissionEvidenceRows(summary?.acceptance, summary?.acceptance_evidence, summary?.acceptanceEvidence, report?.acceptance, report?.acceptance_evidence, report?.acceptanceEvidence);
    if (acceptanceRows.some((row) => {
        const text = missionEvidenceText(row);
        return isPositiveMissionAcceptanceText(text) && !isBareMissionAcceptanceMarker(text);
    }))
        return true;
    const executions = executionsInput || (task?.id ? deps.listExecutions({ taskId: task.id }) : []);
    const executionGreen = executions.some((item) => item?.green?.pass === true && ["project", "workspace", "merge_ready"].includes(String(item?.green?.level || "")));
    return executionGreen && hasSubstantiveMissionGateChecks(summary);
}
function classifyGlobalMissionChildAcceptanceEvidence(task, deps, executions) {
    const summary = getMissionDeliverySummary(task);
    const report = getMissionDeliveryReport(task, summary);
    const strong = hasStrongGlobalMissionChildAcceptanceEvidence(task, deps, executions);
    const gatePassed = missionAcceptanceGatePassed(summary, report);
    const status = strong ? "strong" : gatePassed ? "weak" : "missing";
    return {
        strong_acceptance_passed: strong,
        acceptance_evidence_status: status,
        acceptance_evidence_detail: strong
            ? "已有真实验证或复核证据"
            : gatePassed
                ? "验收结论缺少真实验证或复核证据"
                : "等待交付验收证据",
    };
}
function getGlobalMissionChildDeliveryEvidence(task, deps) {
    const executions = task?.id ? deps.listExecutions({ taskId: task.id }) : [];
    const worktrees = executions.filter((item) => item?.workspace?.mode === "worktree");
    const unmerged = worktrees.filter((item) => !item?.workspace?.mergedAt || !item?.workspace?.mergeCommit);
    const acceptanceEvidence = classifyGlobalMissionChildAcceptanceEvidence(task, deps, executions);
    return {
        execution_count: executions.length,
        execution_states: executions.map((item) => ({
            execution_id: item.id,
            agent: item.agent || item.project || "",
            state: item.state || "",
            green_level: item.green?.level || "none",
            green_passed: item.green?.pass === true,
            workspace_mode: item.workspace?.mode || "shared",
            merge_status: item.workspace?.mode === "worktree"
                ? (item.workspace?.mergedAt && item.workspace?.mergeCommit ? "merged" : "merge_pending")
                : "not_required",
            merge_commit: item.workspace?.mergeCommit || "",
        })),
        merge_required: worktrees.length > 0,
        merge_passed: unmerged.length === 0,
        merge_pending_execution_ids: unmerged.map((item) => item.id),
        merge_commits: worktrees.map((item) => item.workspace?.mergeCommit).filter(Boolean),
        ...acceptanceEvidence,
    };
}
function globalMissionChildGatePassedFromEvidence(task, deps, evidence) {
    if (!task || task.status !== "done")
        return false;
    const summary = getMissionDeliverySummary(task);
    if (!evidence.merge_passed)
        return false;
    if (evidence.strong_acceptance_passed !== true)
        return false;
    const requiresCode = deps.taskRequiresCodeChanges(task);
    const requiresVerification = deps.taskRequiresVerification(task);
    const actualChanges = missionActualFileChangeCount(task);
    const executedVerification = missionStrongVerificationRows(task).length;
    const failedVerification = missionFailedVerificationRows(task).length;
    if (requiresCode && actualChanges <= 0)
        return false;
    if (requiresVerification && executedVerification <= 0)
        return false;
    if (failedVerification > 0 || summary.verification_required_gate_passed === false || (requiresVerification && summary.verification_source_gate_passed !== true))
        return false;
    if (summary.independent_review_required === true && summary.independent_review_gate_passed !== true)
        return false;
    return true;
}
function globalMissionChildGatePassed(task, deps) {
    const evidence = getGlobalMissionChildDeliveryEvidence(task, deps);
    return globalMissionChildGatePassedFromEvidence(task, deps, evidence);
}
function refreshGlobalMissionParentInTaskList(tasks, parentId, deps) {
    if (!parentId)
        return null;
    const parent = tasks.find((item) => item.id === parentId && item.workflow_type === "global_mission");
    if (!parent)
        return null;
    const children = tasks.filter((item) => item.parent_task_id === parentId);
    const rows = children.map((child) => {
        const evidence = getGlobalMissionChildDeliveryEvidence(child, deps);
        const gatePassed = globalMissionChildGatePassedFromEvidence(child, deps, evidence);
        return {
            ...evidence,
            task_id: child.id,
            title: child.title,
            target_type: child.mission_target?.type || child.assign_type,
            target: child.mission_target?.name || child.group_id || child.target_project || "",
            status: child.status,
            display_status: child.status === "done" && !gatePassed ? "reviewing" : child.status,
            status_detail: child.status_detail || child.result || "",
            gate_passed: gatePassed,
            actual_file_change_count: missionActualFileChangeCount(child),
            actual_file_changes: Array.isArray(child.delivery_summary?.actual_file_changes)
                ? child.delivery_summary.actual_file_changes.map((item) => ({
                    ...(item || {}),
                    project: item?.project || item?.target_project || child.target_project || child.mission_target?.name || "",
                }))
                : [],
            verification_count: missionStrongVerificationRows(child).length,
            receipt_status: child.receipt?.status || "",
            blockers: [
                ...(Array.isArray(child.delivery_summary?.blockers) ? child.delivery_summary.blockers : []),
                ...(Array.isArray(child.delivery_summary?.needs) ? child.delivery_summary.needs : []),
            ],
        };
    });
    const completed = rows.filter((item) => item.gate_passed).length;
    const passed = rows.filter((item) => item.gate_passed).length;
    const failed = rows.filter((item) => item.status === "failed").length;
    const blocked = rows.filter((item) => item.status === "failed" || item.blockers.length > 0 || (item.status === "done" && !item.gate_passed)).length;
    const reviewing = rows.filter((item) => item.status === "done" && !item.gate_passed).length;
    const pending = rows.filter((item) => !item.gate_passed && !["done", "failed"].includes(String(item.status || ""))).length;
    const allPassed = rows.length > 0 && passed === rows.length;
    const now = new Date().toISOString();
    const actualFileChanges = rows
        .flatMap((row) => Array.isArray(row.actual_file_changes) ? row.actual_file_changes : [])
        .filter((item) => item?.path);
    const controlMode = parent.supervisor_control?.mode || "automatic";
    const cancelled = parent.status === "cancelled";
    parent.status = allPassed ? "done" : cancelled ? "cancelled" : "in_progress";
    parent.status_detail = allPassed
        ? "所有执行成员子任务都已通过交付验收"
        : cancelled
            ? (parent.status_detail || "全局任务已取消")
            : controlMode === "manual"
                ? "全局任务已由用户人工接管"
                : controlMode === "paused"
                    ? "全局任务跟进已暂停"
                    : failed > 0
                        ? `${failed} 个子任务执行失败，等待全局 Agent重试或用户干预`
                        : blocked > 0
                            ? `${blocked} 个子任务存在验收缺口或阻塞`
                            : `跨项目任务执行中：${completed}/${rows.length} 已完成`;
    parent.mission_summary = {
        total: rows.length,
        completed,
        passed,
        failed,
        blocked,
        reviewing,
        pending,
        all_passed: allPassed,
        children: rows,
        updated_at: now,
    };
    parent.delivery_summary = {
        headline: allPassed ? "全局开发任务已完成并通过全部交付验收" : "全局开发任务仍在执行或验收中",
        global_mission: true,
        child_tasks: rows,
        actual_file_changes: actualFileChanges,
        actual_file_change_count: actualFileChanges.length,
        child_task_count: rows.length,
        completed_count: completed,
        passed_count: passed,
        failed_count: failed,
        blocked_count: blocked,
        reviewing_count: reviewing,
        acceptance_gate_passed: allPassed,
        acceptance_evidence_status_counts: {
            strong: rows.filter((item) => item.acceptance_evidence_status === "strong").length,
            weak: rows.filter((item) => item.acceptance_evidence_status === "weak").length,
            missing: rows.filter((item) => item.acceptance_evidence_status === "missing").length,
        },
        generated_at: now,
    };
    parent.updated_at = now;
    if (allPassed)
        parent.completed_at = parent.completed_at || now;
    else if (!cancelled)
        delete parent.completed_at;
    return parent;
}
function runGlobalMissionStrongAcceptanceSelfTest() {
    const deps = {
        listExecutions: () => [],
        taskRequiresCodeChanges: (task) => task.requires_code_changes === true,
        taskRequiresVerification: (task) => task.requires_verification === true,
    };
    const weakChild = {
        id: "weak-child",
        parent_task_id: "mission-weak",
        workflow_type: "daily_dev",
        assign_type: "group",
        title: "弱验收子任务",
        status: "done",
        delivery_summary: {
            acceptance_gate_passed: true,
            acceptance: ["验收结论：已通过"],
            delivery_report: {
                status: "done",
                acceptance: ["验收结论：已通过"],
                verification_evidence: { items: [] },
            },
        },
    };
    const strongChild = {
        id: "strong-child",
        parent_task_id: "mission-strong",
        workflow_type: "daily_dev",
        assign_type: "project",
        title: "强验收子任务",
        status: "done",
        requires_code_changes: true,
        requires_verification: true,
        delivery_summary: {
            acceptance_gate_passed: true,
            acceptance_gate: {
                pass: true,
                checks: [
                    { id: "actual_changes", ok: true, label: "真实文件变更" },
                    { id: "verification_source", ok: true, label: "外部 Runner 验证" },
                ],
            },
            actual_file_change_count: 1,
            actual_file_changes: [{ path: "src/feature.ts" }],
            verification_executed: ["npm test passed by external runner (exit 0)"],
            verification_source_gate_passed: true,
            external_runner_verification_count: 1,
            acceptance: ["外部 Runner 已验证 npm test 通过，可以接受本次交付"],
            blockers: [],
            needs: [],
        },
    };
    const weakParent = { id: "mission-weak", workflow_type: "global_mission", status: "in_progress" };
    const strongParent = { id: "mission-strong", workflow_type: "global_mission", status: "in_progress" };
    const weakTasks = [weakParent, weakChild];
    const strongTasks = [strongParent, strongChild];
    const refreshedWeak = refreshGlobalMissionParentInTaskList(weakTasks, "mission-weak", deps);
    const refreshedStrong = refreshGlobalMissionParentInTaskList(strongTasks, "mission-strong", deps);
    const weakRow = refreshedWeak?.mission_summary?.children?.[0] || {};
    const strongRow = refreshedStrong?.mission_summary?.children?.[0] || {};
    const checks = {
        globalMissionWeakAcceptanceGateRejected: globalMissionChildGatePassed(weakChild, deps) === false,
        globalMissionWeakAcceptanceMarkedWeak: weakRow.strong_acceptance_passed === false && weakRow.acceptance_evidence_status === "weak",
        globalMissionWeakAcceptanceParentStaysInProgress: refreshedWeak?.status === "in_progress" && refreshedWeak?.mission_summary?.all_passed === false,
        globalMissionWeakAcceptanceDoesNotCountCompleted: refreshedWeak?.mission_summary?.completed === 0 && refreshedWeak?.delivery_summary?.completed_count === 0,
        globalMissionStrongAcceptanceGatePasses: globalMissionChildGatePassed(strongChild, deps) === true,
        globalMissionStrongAcceptanceParentCompletes: refreshedStrong?.status === "done" && refreshedStrong?.mission_summary?.all_passed === true,
        globalMissionStrongAcceptanceEvidenceVisible: strongRow.strong_acceptance_passed === true && strongRow.acceptance_evidence_status === "strong",
    };
    return { pass: Object.values(checks).every(Boolean), checks, weak: refreshedWeak, strong: refreshedStrong };
}
//# sourceMappingURL=global-mission.js.map