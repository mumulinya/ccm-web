"use strict";
// Global task, mission, supervision, and acceptance status projection.
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGlobalAgentStatusRuntime = createGlobalAgentStatusRuntime;
function createGlobalAgentStatusRuntime(deps) {
    const { collectGlobalTestAgentFailureItemsFromSource, getConfigs, getGlobalAgentRun, globalSafeArray, globalUniqueStrings, globalVisibleText, hasExplicitDevelopmentExecutionIntent, hasExplicitGlobalWriteAuthorization, listGlobalAgentRuns, loadCronJobs, loadGroups, loadTasks, normalizeText, refreshGlobalDevelopmentMissions, sanitizeGlobalDirectAgentOutput, scrubGlobalTestAgentEvidencePathText, summarizeGlobalTestAgentDiagnosticItem, summarizeGlobalTestAgentFailureItem } = deps;
    function isGlobalProgressStatusRequest(message) {
        const text = normalizeText(message);
        if (!text)
            return false;
        if (hasExplicitDevelopmentExecutionIntent(text) || hasExplicitGlobalWriteAuthorization(text))
            return false;
        if (/^(?:\/status|status|progress|任务状态|查看任务状态|全局任务|最近任务)$/i.test(text))
            return true;
        if (/(设置|修改|标记|改成|更新|创建|新建|删除|移除)/.test(text) && /(任务状态|状态)/.test(text))
            return false;
        return /(进展|进度|做到哪|处理到哪|现在怎么样|怎么样了|完成了吗|有结果了吗|还在(?:执行|处理|跑)|任务状态|最近任务|全局任务|how'?s it going|how is it going|what'?s the status)/i.test(text);
    }
    function globalStatusLabel(status) {
        const value = String(status || "").toLowerCase();
        if (["done", "completed", "success"].includes(value))
            return "已完成";
        if (["failed", "error"].includes(value))
            return "未完成";
        if (["cancelled", "canceled"].includes(value))
            return "已取消";
        if (["waiting_confirmation"].includes(value))
            return "等待你确认";
        if (["waiting_clarification", "waiting_user", "needs_user", "paused"].includes(value))
            return "等待你补充";
        if (["blocked", "needs_attention", "needs_info"].includes(value))
            return "待补齐";
        if (["pending", "queued", "planned"].includes(value))
            return "排队中";
        if (["reviewing", "review", "verifying"].includes(value))
            return "验收中";
        if (["reworking", "needs_rework", "retrying", "repairing"].includes(value))
            return "返工中";
        if (["in_progress", "running"].includes(value))
            return "处理中";
        return value || "状态未记录";
    }
    function flattenGlobalAcceptanceRows(...values) {
        const rows = [];
        const visit = (value) => {
            if (!value)
                return;
            if (Array.isArray(value)) {
                for (const item of value)
                    visit(item);
                return;
            }
            if (typeof value === "object" && !value.summary && !value.detail && !value.reason && !value.label && !value.verdict && !value.status) {
                if (Array.isArray(value.items)) {
                    for (const item of value.items)
                        visit(item);
                    return;
                }
                if (Array.isArray(value.evidence)) {
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
    function globalEvidenceText(row) {
        if (!row || typeof row !== "object")
            return String(row || "");
        return [row.summary, row.detail, row.reason, row.message, row.label, row.title, row.verdict, row.status].filter(Boolean).join(" ");
    }
    function isPositiveGlobalAcceptanceText(value) {
        const text = String(value || "").trim();
        if (!text)
            return false;
        if (/未通过|失败|待补|待处理|缺口|证据不足|无法确认|无法验证|failed|failure|partial|incomplete|missing|blocked/i.test(text))
            return false;
        return /已通过|通过|可以接受|已覆盖|已执行|已复核|已验证|passed|pass|success|ok/i.test(text);
    }
    function isBareGlobalAcceptanceMarker(value) {
        return /^(最终验收|主\s*Agent\s*验收|验收结论)\s*[：:]?\s*(已通过|通过)$/i.test(String(value || "").trim());
    }
    function isStrongGlobalVerificationText(value) {
        const text = String(value || "").trim();
        if (!text)
            return false;
        if (/建议|可运行|可以运行|待运行|未运行|未执行|未验证|没有运行|无法运行|未提供|失败|未通过|报错|错误|failed|failure|error|not\s+run|not\s+executed|suggest/i.test(text))
            return false;
        return /已实际执行|已执行|外部 Runner|验证来源|命令|npm|pnpm|yarn|test|check|lint|build|playwright|pytest|exit\s*0|passed|success|ok/i.test(text);
    }
    function globalTaskHasStrongAcceptanceEvidence(task = {}) {
        const summary = task?.delivery_summary || task?.deliverySummary || {};
        const report = summary?.delivery_report || summary?.deliveryReport || task?.delivery_report || task?.deliveryReport || null;
        const gate = summary?.acceptance_gate || summary?.acceptanceGate || {};
        const gatePass = summary?.acceptance_gate_passed === true || summary?.acceptanceGatePassed === true || gate?.pass === true || report?.status === "done";
        if (!gatePass)
            return false;
        const gateChecks = Array.isArray(gate?.checks) ? gate.checks : (Array.isArray(gate?.items) ? gate.items : []);
        const failedCount = Number(gate?.failed_count || gate?.failedCount || gateChecks.filter((item) => item?.ok === false || item?.pass === false).length || 0);
        const substantiveGateIds = new Set(["actual_changes", "actual_diff", "verification", "required_verification", "verification_source", "independent_review", "final_review", "worker_receipt", "receipt_quality", "work_items", "team_shutdown"]);
        if (gateChecks.length > 0
            && failedCount === 0
            && gateChecks.every((item) => item?.ok !== false && item?.pass !== false)
            && gateChecks.some((item) => substantiveGateIds.has(String(item?.id || "")))) {
            return true;
        }
        const verificationRows = flattenGlobalAcceptanceRows(summary?.verification_executed, summary?.external_runner_verification, summary?.verification_results, summary?.verification, report?.verification, report?.verification_evidence?.executed, report?.verificationEvidence?.executed, report?.verification_evidence?.items, report?.verificationEvidence?.items, task?.verification, task?.verification_results);
        if (verificationRows.some(isStrongGlobalVerificationText))
            return true;
        if (summary?.verification_source_gate_passed === true && Number(summary?.external_runner_verification_count || 0) > 0)
            return true;
        const reviewRows = flattenGlobalAcceptanceRows(summary?.independent_review, summary?.independentReview, summary?.independent_review_evidence, summary?.independent_review_gate?.evidence, report?.independent_review, report?.independentReview);
        if (summary?.independent_review_gate_passed === true && Number(summary?.independent_review_gate?.evidence_count || reviewRows.length || 0) > 0)
            return true;
        if (reviewRows.some((row) => isPositiveGlobalAcceptanceText(globalEvidenceText(row)) && !isBareGlobalAcceptanceMarker(globalEvidenceText(row))))
            return true;
        const acceptanceRows = flattenGlobalAcceptanceRows(summary?.acceptance, summary?.acceptance_evidence, summary?.acceptanceEvidence, report?.acceptance, report?.acceptance_evidence, report?.acceptanceEvidence);
        return acceptanceRows.some((row) => {
            const text = globalEvidenceText(row);
            return isPositiveGlobalAcceptanceText(text) && !isBareGlobalAcceptanceMarker(text);
        });
    }
    function globalTaskDisplayStatus(task = {}, rawStatus = task?.status) {
        const value = String(rawStatus || "").toLowerCase();
        if (["done", "completed", "complete", "success", "succeeded", "ok"].includes(value)
            && !globalTaskHasStrongAcceptanceEvidence(task)) {
            return "reviewing";
        }
        return rawStatus;
    }
    function globalMissionSummaryRows(mission = {}) {
        return Array.isArray(mission?.mission_summary?.children) ? mission.mission_summary.children : [];
    }
    function globalMissionSummaryRowStrongPassed(row) {
        return row?.gate_passed === true
            && row?.strong_acceptance_passed !== false
            && row?.acceptance_evidence_status !== "weak"
            && row?.acceptance_evidence_status !== "missing";
    }
    function globalMissionTaskIds(mission = {}) {
        return new Set([
            ...(Array.isArray(mission?.child_task_ids) ? mission.child_task_ids : []),
            ...globalMissionSummaryRows(mission).map((row) => row?.task_id),
        ].map((id) => String(id || "")).filter(Boolean));
    }
    function childTasksForGlobalMission(mission, tasks = []) {
        const ids = globalMissionTaskIds(mission);
        const missionId = String(mission?.id || mission?.mission_id || mission?.missionId || "");
        return tasks.filter((task) => {
            const taskId = String(task?.id || "");
            if (taskId && ids.has(taskId))
                return true;
            return missionId && String(task?.parent_task_id || task?.parentTaskId || "") === missionId;
        });
    }
    function globalMissionStatusCounts(mission, tasks = []) {
        const summary = mission?.mission_summary || {};
        const rows = globalMissionSummaryRows(mission);
        const children = childTasksForGlobalMission(mission, tasks);
        const rowById = new Map(rows.map((row) => [String(row?.task_id || ""), row]));
        const total = Math.max(Number(summary.total || 0), globalMissionTaskIds(mission).size, children.length);
        const childCompleted = children.filter((task) => {
            const row = rowById.get(String(task?.id || ""));
            const status = String(globalTaskDisplayStatus(task) || "").toLowerCase();
            if (["done", "completed", "success", "ok"].includes(status) && globalTaskHasStrongAcceptanceEvidence(task))
                return true;
            return rows.length > 0 && globalMissionSummaryRowStrongPassed(row);
        }).length;
        const rowCompleted = rows.filter(globalMissionSummaryRowStrongPassed).length;
        const completed = children.length > 0 || rows.length > 0
            ? Math.max(childCompleted, rowCompleted)
            : Number(summary.completed || summary.passed || 0);
        const failed = Math.max(Number(summary.failed || 0), children.filter((task) => ["failed", "error"].includes(String(task?.status || "").toLowerCase())).length, rows.filter((row) => ["failed", "error"].includes(String(row?.status || "").toLowerCase())).length);
        const weakRows = rows.filter((row) => row?.gate_passed === true && !globalMissionSummaryRowStrongPassed(row)).length;
        const weakDoneChildren = children.filter((task) => {
            const rawStatus = String(task?.status || "").toLowerCase();
            return ["done", "completed", "success", "ok"].includes(rawStatus) && !globalTaskHasStrongAcceptanceEvidence(task);
        }).length;
        const reviewing = Math.max(Number(summary.reviewing || 0), weakRows, weakDoneChildren);
        const rowBlockers = rows.filter((row) => Array.isArray(row?.blockers) && row.blockers.length > 0).length;
        const rawBlocked = Number(summary.blocked || 0);
        const blocked = Math.max(rowBlockers, rawBlocked > reviewing ? rawBlocked : 0);
        const allPassed = total > 0 && completed >= total && failed === 0 && reviewing === 0 && blocked === 0;
        return { total, completed, failed, blocked, reviewing, allPassed };
    }
    function globalMissionDisplayStatus(mission, counts = globalMissionStatusCounts(mission, [])) {
        const raw = String(mission?.status || "").toLowerCase();
        if (["done", "completed", "complete", "success", "succeeded", "ok"].includes(raw) && !counts.allPassed)
            return "reviewing";
        if (counts.reviewing > 0 && ["in_progress", "running", "reviewing"].includes(raw || "in_progress"))
            return "reviewing";
        return mission?.status;
    }
    function latestReadableTimeline(task) {
        const timeline = Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : [];
        const latest = [...timeline].reverse().find((item) => item?.title || item?.detail || item?.message);
        return sanitizeGlobalDirectAgentOutput(latest?.detail || latest?.message || latest?.title || task?.status_detail || "", "最近进展已更新，详细记录在任务卡技术详情里。", 220);
    }
    const GLOBAL_STATUS_PROGRESS_REFRESH_STALE_MS = 15 * 60 * 1000;
    function globalStatusTimeMs(...values) {
        const times = values
            .map(value => Date.parse(String(value || "")))
            .filter(value => Number.isFinite(value) && value > 0);
        return times.length ? Math.max(...times) : 0;
    }
    function globalStatusAgeLabel(ageMs) {
        if (!Number.isFinite(ageMs) || ageMs <= 0)
            return "";
        const minutes = Math.max(1, Math.round(ageMs / 60_000));
        if (minutes < 60)
            return `${minutes} 分钟`;
        const hours = Math.max(1, Math.round(minutes / 60));
        if (hours < 24)
            return `${hours} 小时`;
        return `${Math.max(1, Math.round(hours / 24))} 天`;
    }
    function getGlobalStatusPickupSummary(source) {
        const report = source?.delivery_summary?.delivery_report
            || source?.deliverySummary?.deliveryReport
            || source?.final_delivery_report
            || source?.finalDeliveryReport
            || source?.delivery_report
            || source?.deliveryReport
            || source?.display_stream?.delivery_report
            || source?.displayStream?.deliveryReport
            || null;
        const rawStatus = report?.status
            || source?.pickup_summary?.status
            || source?.pickupSummary?.status
            || source?.delivery_summary?.status
            || source?.deliverySummary?.status
            || source?.status;
        const displayStatus = String(globalTaskDisplayStatus(source, rawStatus) || "").toLowerCase();
        const rawLooksDone = ["done", "completed", "complete", "success", "succeeded", "ok"].includes(String(rawStatus || "").toLowerCase());
        if (rawLooksDone && !["done", "completed", "success"].includes(displayStatus))
            return null;
        const pickup = source?.pickup_summary
            || source?.pickupSummary
            || source?.delivery_summary?.pickup_summary
            || source?.deliverySummary?.pickupSummary
            || report?.pickup_summary
            || report?.pickupSummary
            || null;
        if (!pickup && !report)
            return null;
        const title = sanitizeGlobalDirectAgentOutput(pickup?.title || "回来继续看这里", "回来继续看这里", 80);
        const headline = sanitizeGlobalDirectAgentOutput(pickup?.current_state || pickup?.currentState || pickup?.headline || report?.headline || source?.status_detail || "", "我已整理当前任务状态。", 220);
        const reviewItems = Array.isArray(pickup?.review_items || pickup?.reviewItems)
            ? (pickup.review_items || pickup.reviewItems)
                .map((item) => sanitizeGlobalDirectAgentOutput(item, "", 120))
                .filter(Boolean)
                .slice(0, 4)
            : [];
        const resumeAction = sanitizeGlobalDirectAgentOutput(pickup?.resume_action || pickup?.resumeAction || (Array.isArray(report?.next_action) ? report.next_action[0] : report?.next_action) || "", "", 180);
        return { title, headline, reviewItems, resumeAction };
    }
    function getGlobalStatusProgressRefreshSummary(source, childTasks = [], nowMs = Date.now()) {
        const statusValue = String(globalTaskDisplayStatus(source) || "").toLowerCase();
        if (["done", "completed", "success", "cancelled", "canceled"].includes(statusValue))
            return null;
        const staleMs = Math.max(60_000, Number(source?.progress_refresh_stale_ms || source?.progressRefreshStaleMs || GLOBAL_STATUS_PROGRESS_REFRESH_STALE_MS));
        const rows = (Array.isArray(childTasks) && childTasks.length ? childTasks : [source]).filter(Boolean);
        const ageRows = rows.map((task) => {
            const lastMs = globalStatusTimeMs(task?.updated_at, task?.updatedAt, task?.started_at, task?.startedAt, task?.created_at, task?.createdAt, source?.updated_at, source?.updatedAt);
            const ageMs = lastMs ? Math.max(0, nowMs - lastMs) : 0;
            return { task, ageMs };
        });
        const stalled = ageRows.filter(({ task, ageMs }) => {
            const value = String(globalTaskDisplayStatus(task) || "").toLowerCase();
            return ["in_progress", "running", "reviewing", "reworking"].includes(value) && ageMs >= staleMs;
        });
        const staleQueued = ageRows.filter(({ task, ageMs }) => {
            const value = String(globalTaskDisplayStatus(task) || "").toLowerCase();
            return ["pending", "queued", "planned"].includes(value) && ageMs >= staleMs;
        });
        const sourceAgeMs = Math.max(...ageRows.map(row => row.ageMs), 0);
        const sourceLong = sourceAgeMs >= staleMs;
        const supervisorWaiting = Array.isArray(source?.workflow_timeline)
            ? source.workflow_timeline.some((item) => /stalled|timeout|超时|长时间|等待|卡住|恢复/i.test(`${item?.type || ""} ${item?.title || ""} ${item?.detail || ""} ${item?.message || ""}`))
            : false;
        if (!stalled.length && !staleQueued.length && !sourceLong && !supervisorWaiting)
            return null;
        const first = stalled[0]?.task || staleQueued[0]?.task || rows[0] || source;
        const target = targetNameForTask(first);
        const ageLabel = globalStatusAgeLabel(stalled[0]?.ageMs || staleQueued[0]?.ageMs || sourceAgeMs);
        const headline = stalled.length
            ? `${stalled.length} 个执行目标已经 ${ageLabel || "一段时间"} 没有新的可展示进展，我会先刷新状态，再决定继续等待、重派或请你确认。`
            : staleQueued.length
                ? `${staleQueued.length} 个下游任务排队较久，我会检查执行通道并接上下一步。`
                : `这项全局任务已经 ${ageLabel || "一段时间"} 没有新的可展示进展，我会主动刷新状态。`;
        const reviewItems = [
            target ? `关注对象：${target}` : "",
            first?.status_detail ? `当前说明：${sanitizeGlobalDirectAgentOutput(first.status_detail, "进展已整理。", 120)}` : "",
            source?.workflow_timeline?.length ? `最近节点：${sanitizeGlobalDirectAgentOutput(source.workflow_timeline[source.workflow_timeline.length - 1]?.title || source.workflow_timeline[source.workflow_timeline.length - 1]?.detail || "", "", 120)}` : "",
        ].filter(Boolean).slice(0, 4);
        const nextAction = stalled.length
            ? "先刷新下游任务卡；如果仍没有新结果，就重新派发或定向补充。"
            : staleQueued.length
                ? "检查执行通道和队列状态，能恢复就继续推进；不能恢复会提示你处理。"
                : "刷新全局任务状态，并继续等待执行目标的可验收结果。";
        return {
            title: "进度刷新提醒",
            headline: sanitizeGlobalDirectAgentOutput(headline, "我已整理进度刷新状态。", 240),
            reviewItems: reviewItems.map(item => sanitizeGlobalDirectAgentOutput(item, "", 140)).filter(Boolean),
            nextAction: sanitizeGlobalDirectAgentOutput(nextAction, "我会刷新任务状态并继续跟进。", 220),
        };
    }
    function getGlobalStatusDirectDispatchMeta(task) {
        const meta = task?.workflow_meta?.global_direct_dispatch
            || task?.workflowMeta?.global_direct_dispatch
            || task?.global_direct_dispatch
            || null;
        if (!meta || typeof meta !== "object")
            return null;
        return String(meta.schema || "") === "ccm-global-direct-dispatch-v1" ? meta : null;
    }
    function targetNameForTask(task) {
        return sanitizeGlobalDirectAgentOutput(task?.mission_target?.name || task?.mission_target?.project || task?.target_project || task?.group_id || task?.project || "执行目标", "执行目标", 80);
    }
    function summarizeDirectDispatchContinuationForStatus(task) {
        const state = task?.collaboration_state || {};
        const last = state.last_continuation || task?.last_continuation || null;
        const interruption = state.goal_revision_interruption || {};
        const kind = String(last?.kind || last?.rework_kind || "").toLowerCase();
        const replanRequired = kind === "revise_goal"
            || last?.replan_required === true
            || task?.plan_revision_required === true
            || interruption.requested === true;
        if (!last?.at && !interruption.requested_at && !replanRequired)
            return "";
        const reason = sanitizeGlobalDirectAgentOutput(last?.reason || interruption.reason || task?.status_detail || "用户补充了新的要求", "用户补充了新的要求", 140);
        const route = interruption.requested && !interruption.resolved_at
            ? "正在停止旧执行轮，再按新目标重核计划"
            : replanRequired
                ? "正在按最新要求重核计划和验收标准"
                : "补充要求已接到同一任务里继续处理";
        return `接续状态：${reason ? `${reason}；` : ""}${route}`;
    }
    function summarizeMissionChildren(mission, tasks) {
        const ids = Array.isArray(mission?.child_task_ids) ? mission.child_task_ids : [];
        const byId = new Map(tasks.map((task) => [String(task?.id || ""), task]));
        return ids
            .map((id) => byId.get(String(id)))
            .filter(Boolean)
            .slice(0, 4)
            .map((task) => `${targetNameForTask(task)} ${globalStatusLabel(globalTaskDisplayStatus(task))}${task.status_detail ? `：${sanitizeGlobalDirectAgentOutput(task.status_detail, "进展已整理。", 90)}` : ""}`);
    }
    function summarizeGlobalChildAgentWaiting(mission, tasks) {
        const ids = Array.isArray(mission?.child_task_ids) ? mission.child_task_ids : [];
        const byId = new Map(tasks.map((task) => [String(task?.id || ""), task]));
        const rows = ids
            .map((id) => byId.get(String(id)))
            .filter(Boolean)
            .slice(0, 8)
            .map((task) => {
            const value = String(globalTaskDisplayStatus(task) || "").toLowerCase();
            const agent = targetNameForTask(task);
            if (["done", "completed", "success", "ok"].includes(value))
                return { agent, status: "completed" };
            if (["failed", "error", "blocked", "needs_user", "waiting_confirmation", "waiting_clarification"].includes(value))
                return { agent, status: "attention" };
            if (["pending", "queued", "planned"].includes(value))
                return { agent, status: "waiting" };
            return { agent, status: "running" };
        });
        if (!rows.length)
            return "";
        const namesFor = (status) => rows.filter(row => row.status === status).map(row => row.agent).slice(0, 5);
        const completed = namesFor("completed");
        const running = namesFor("running");
        const waiting = namesFor("waiting");
        const attention = namesFor("attention");
        return [
            completed.length ? `已回传：${completed.join("、")}` : "",
            running.length ? `处理中：${running.join("、")}` : "",
            waiting.length ? `等待中：${waiting.join("、")}` : "",
            attention.length ? `待处理：${attention.join("、")}` : "",
        ].filter(Boolean).join("；");
    }
    function getGlobalStatusRunFromMission(mission, runs) {
        const candidates = Array.isArray(runs) ? runs : [];
        const runId = String(mission?.global_run_id || mission?.globalRunId || "").trim();
        const supervisorId = String(mission?.supervisor_id || mission?.supervisorId || "").trim();
        const missionId = String(mission?.id || mission?.mission_id || mission?.missionId || "").trim();
        const matched = candidates.find((run) => {
            if (!run)
                return false;
            if (runId && String(run.id || "") === runId)
                return true;
            if (supervisorId && String(run.supervisor_id || run.supervisorId || "") === supervisorId)
                return true;
            if (missionId && String(run.mission_id || run.missionId || "") === missionId)
                return true;
            return false;
        });
        if (matched)
            return matched;
        if (runId) {
            try {
                return getGlobalAgentRun(runId);
            }
            catch { }
        }
        return null;
    }
    function summarizeGlobalSupervisionRunForStatus(mission, runs) {
        const run = getGlobalStatusRunFromMission(mission, runs);
        if (!run)
            return null;
        const status = String(run.supervision_state || run.supervisionState || run.status || "").toLowerCase();
        const nextAction = sanitizeGlobalDirectAgentOutput(run?.workchain?.completion_summary?.next_action
            || run?.workchain?.completionSummary?.nextAction
            || run?.display_stream?.workchain?.completion_summary?.next_action
            || run?.displayStream?.workchain?.completionSummary?.nextAction
            || "", "", 180);
        const userText = sanitizeGlobalDirectAgentOutput(run?.final_reply
            || run?.finalReply
            || run?.display_stream?.workchain?.user_visible_text
            || run?.displayStream?.workchain?.userVisibleText
            || run?.workchain?.user_visible_text
            || run?.workchain?.userVisibleText
            || "", "", 240);
        if (["waiting_user", "needs_user", "blocked", "paused"].includes(status)) {
            return {
                headline: userText || "等你处理阻塞点；这还不是完成结果。",
                nextAction: nextAction || "你处理完阻塞点后，我会继续推动执行成员返工或复核。",
            };
        }
        if (/rework|reworking|repair|retry|返工|修复/.test(status)) {
            return {
                headline: userText || "正在返工，修复后会重新运行 TestAgent 或独立复核。",
                nextAction: nextAction || "原执行成员修复后，重新运行 TestAgent/独立复核，再给你最终总结。",
            };
        }
        if (status === "supervising" || status === "monitoring") {
            return {
                headline: userText || "我正在持续跟进执行、验收和最终总结。",
                nextAction: nextAction || "继续等待执行成员更新可验收结果。",
            };
        }
        return null;
    }
    function getGlobalStatusRunNextAction(run) {
        return sanitizeGlobalDirectAgentOutput(run?.workchain?.completion_summary?.next_action
            || run?.workchain?.completionSummary?.nextAction
            || run?.display_stream?.workchain?.completion_summary?.next_action
            || run?.displayStream?.workchain?.completionSummary?.nextAction
            || run?.confirmation_summary?.question
            || run?.confirmationSummary?.question
            || run?.clarification_summary?.question
            || run?.clarificationSummary?.question
            || run?.plan_mode?.next_step
            || run?.planMode?.nextStep
            || "", "", 180);
    }
    function firstGlobalStatusObject(...values) {
        return values.find(value => value && typeof value === "object" && !Array.isArray(value)) || null;
    }
    function buildGlobalStatusIndependentReviewSummaryFromTestAgentFailure(...sources) {
        const seen = new Set();
        const items = [];
        for (const source of sources) {
            for (const item of collectGlobalTestAgentFailureItemsFromSource(source)) {
                const key = [item?.type || "", item?.project || "", item?.title || "", item?.reason || "", item?.nextAction || ""].join("|");
                if (seen.has(key))
                    continue;
                seen.add(key);
                items.push(item);
            }
        }
        if (!items.length)
            return null;
        const stateText = items.map(item => [item?.status, item?.result, item?.recommendation, item?.reason].filter(Boolean).join(" ")).join(" ");
        const needsUser = /blocked|unknown|need_human|needs_human|manual|人工|确认|待确认|阻塞/i.test(stateText);
        const needsRework = !needsUser || /failed|fail|not_verified|rework|未通过|失败|返工/i.test(stateText);
        const status = needsRework ? "needs_rework" : "needs_user";
        const failureLines = globalUniqueStrings(items.map(summarizeGlobalTestAgentFailureItem).filter(Boolean)).slice(0, 3);
        const diagnosticLines = globalUniqueStrings(items.map(summarizeGlobalTestAgentDiagnosticItem).filter(Boolean)).slice(0, 2);
        const rows = [
            status === "needs_rework" ? "TestAgent：需返工" : "TestAgent：等你确认",
            ...failureLines.map((item) => `返工重点：${item}`),
            ...diagnosticLines.map((item) => `排查建议：${item}`),
        ].map((item) => sanitizeGlobalDirectAgentOutput(item, "", 180)).filter(Boolean);
        return {
            schema: "ccm-main-agent-independent-review-summary-v1",
            title: "独立复核",
            status,
            status_label: status === "needs_rework" ? "需返工" : "等你确认",
            headline: status === "needs_rework"
                ? "TestAgent 复核未通过，我会先安排返工，再重新验收。"
                : "TestAgent 复核需要你确认，我会先暂停最终验收。",
            rows,
            next_action: status === "needs_rework"
                ? "先处理复核指出的缺口，再重新运行 TestAgent/独立复核。"
                : "等待你确认复核标记的问题，确认后我再继续。",
            display_policy: {
                user_text_first: true,
                technical_default_collapsed: true,
                hide_internal_protocols: true,
                show_for_ordinary_conversation: false,
            },
        };
    }
    function getGlobalStatusIndependentReviewSummary(source = {}) {
        const delivery = source?.delivery_summary || source?.deliverySummary || {};
        const report = source?.final_report
            || source?.finalReport
            || source?.final_delivery_report
            || source?.finalDeliveryReport
            || source?.delivery_report
            || source?.deliveryReport
            || delivery?.delivery_report
            || delivery?.deliveryReport
            || {};
        const displayStream = source?.display_stream || source?.displayStream || {};
        const workchain = source?.workchain || displayStream?.workchain || {};
        const explicitSummary = firstGlobalStatusObject(source?.independent_review_summary, source?.independentReviewSummary, source?.test_agent_review_summary, source?.testAgentReviewSummary, delivery?.independent_review_summary, delivery?.independentReviewSummary, delivery?.test_agent_review_summary, delivery?.testAgentReviewSummary, report?.independent_review_summary, report?.independentReviewSummary, report?.test_agent_review_summary, report?.testAgentReviewSummary, workchain?.independent_review_summary, workchain?.independentReviewSummary, workchain?.test_agent_review_summary, workchain?.testAgentReviewSummary);
        if (explicitSummary)
            return explicitSummary;
        return buildGlobalStatusIndependentReviewSummaryFromTestAgentFailure(source, delivery, report, workchain, displayStream);
    }
    function globalIndependentReviewStatusKind(summary = {}) {
        const text = [
            summary.status,
            summary.verdict,
            summary.recommendation,
            summary.status_label,
            summary.statusLabel,
            summary.headline,
            ...(Array.isArray(summary.rows) ? summary.rows : []),
        ].filter(Boolean).join(" ");
        if (/needs[_-]?rework|rework|changes_requested|failed|fail|reject|not_verified|需返工|返工|未通过|缺口|未覆盖/i.test(text))
            return "needs_rework";
        if (/needs[_-]?user|waiting[_-]?user|unknown|manual|人工确认|等你确认|待确认|需要你确认|需要用户/i.test(text))
            return "needs_user";
        if (/passed|pass|accept|approved|已通过|通过|可以继续/i.test(text))
            return "passed";
        return "recorded";
    }
    function summarizeGlobalStatusIndependentReview(source = {}) {
        const summary = getGlobalStatusIndependentReviewSummary(source);
        if (!summary)
            return null;
        const status = globalIndependentReviewStatusKind(summary);
        const statusLabel = sanitizeGlobalDirectAgentOutput(summary.status_label || summary.statusLabel || (status === "needs_rework" ? "需返工" : status === "needs_user" ? "等你确认" : status === "passed" ? "已通过" : "已记录"), status === "needs_rework" ? "需返工" : status === "needs_user" ? "等你确认" : status === "passed" ? "已通过" : "已记录", 60);
        const rows = (Array.isArray(summary.rows) ? summary.rows : Array.isArray(summary.items) ? summary.items : [])
            .map((item) => sanitizeGlobalDirectAgentOutput(item, "", 140))
            .filter(Boolean)
            .slice(0, 3);
        const headline = sanitizeGlobalDirectAgentOutput(summary.headline || summary.summary || rows[0] || "", status === "needs_rework"
            ? "独立复核发现待处理缺口。"
            : status === "needs_user"
                ? "独立复核需要你确认。"
                : status === "passed"
                    ? "独立复核已通过。"
                    : "独立复核结论已记录。", 200);
        const nextAction = sanitizeGlobalDirectAgentOutput(summary.next_action || summary.nextAction || "", status === "needs_rework"
            ? "先按复核缺口返工，修复后重新运行 TestAgent/独立复核，再给最终总结。"
            : status === "needs_user"
                ? "等待你确认复核标记的问题，确认后我再继续。"
                : status === "passed"
                    ? "继续核对交付总结、改动和验证结果。"
                    : "继续等待完整复核证据或最终总结。", 220);
        return {
            status,
            statusLabel,
            displayStatus: status === "needs_rework" ? "needs_rework" : status === "needs_user" ? "needs_user" : status === "passed" ? "reviewing" : "",
            blocking: status === "needs_rework" || status === "needs_user",
            headline,
            rows,
            nextAction,
        };
    }
    function globalStatusTestAgentPlanRowText(item) {
        if (!item || typeof item !== "object")
            return item;
        return [item.summary, item.detail, item.message, item.label, item.title, item.status].filter(Boolean).join(" ");
    }
    function globalStatusTestAgentPlanStatusKind(summary = {}, plan = null) {
        const text = [
            summary.status,
            summary.verdict,
            summary.status_label,
            summary.statusLabel,
            summary.headline,
            ...(Array.isArray(summary.rows) ? summary.rows.map(globalStatusTestAgentPlanRowText) : []),
            ...(Array.isArray(summary.issues) ? summary.issues.map(globalStatusTestAgentPlanRowText) : []),
        ].filter(Boolean).join(" ");
        if (plan?.valid === false || /blocked|invalid|error|failed|fail|需修复|预检未通过|缺少|阻塞/i.test(text))
            return "blocked";
        if (plan?.valid === true || /ready|valid|可执行|已生成|启动|真实复核/i.test(text))
            return "ready";
        return "recorded";
    }
    function getGlobalStatusTestAgentExecutionPlanSummary(source = {}) {
        const delivery = source?.delivery_summary || source?.deliverySummary || {};
        const report = source?.final_report
            || source?.finalReport
            || source?.final_delivery_report
            || source?.finalDeliveryReport
            || source?.delivery_report
            || source?.deliveryReport
            || delivery?.delivery_report
            || delivery?.deliveryReport
            || {};
        const displayStream = source?.display_stream || source?.displayStream || {};
        const workchain = source?.workchain || displayStream?.workchain || {};
        const technical = source?.technical || delivery?.technical || report?.technical || {};
        const explicitSummary = firstGlobalStatusObject(source?.test_agent_execution_plan_summary, source?.testAgentExecutionPlanSummary, delivery?.test_agent_execution_plan_summary, delivery?.testAgentExecutionPlanSummary, report?.test_agent_execution_plan_summary, report?.testAgentExecutionPlanSummary, displayStream?.test_agent_execution_plan_summary, displayStream?.testAgentExecutionPlanSummary, workchain?.test_agent_execution_plan_summary, workchain?.testAgentExecutionPlanSummary, technical?.test_agent_execution_plan_summary, technical?.testAgentExecutionPlanSummary);
        const plan = firstGlobalStatusObject(source?.test_agent_execution_plan, source?.testAgentExecutionPlan, delivery?.test_agent_execution_plan, delivery?.testAgentExecutionPlan, report?.test_agent_execution_plan, report?.testAgentExecutionPlan, displayStream?.test_agent_execution_plan, displayStream?.testAgentExecutionPlan, workchain?.test_agent_execution_plan, workchain?.testAgentExecutionPlan, technical?.test_agent_execution_plan, technical?.testAgentExecutionPlan);
        if (explicitSummary)
            return { summary: explicitSummary, plan };
        const detail = source?.test_agent_execution_plan_detail
            || source?.testAgentExecutionPlanDetail
            || delivery?.test_agent_execution_plan_detail
            || delivery?.testAgentExecutionPlanDetail
            || report?.test_agent_execution_plan_detail
            || report?.testAgentExecutionPlanDetail
            || source?.detail
            || source?.message
            || "";
        const rawTextSummary = source?.test_agent_execution_plan_summary
            || source?.testAgentExecutionPlanSummary
            || delivery?.test_agent_execution_plan_summary
            || delivery?.testAgentExecutionPlanSummary
            || report?.test_agent_execution_plan_summary
            || report?.testAgentExecutionPlanSummary
            || "";
        if (!plan && !detail && !rawTextSummary)
            return null;
        const planSummary = plan?.summary || {};
        const issues = globalSafeArray(plan?.issues)
            .map((item) => globalVisibleText(scrubGlobalTestAgentEvidencePathText(globalStatusTestAgentPlanRowText(item)), "", 160))
            .filter(Boolean)
            .slice(0, 5);
        const commandCount = Number(planSummary.commands || globalSafeArray(plan?.commands).length || 0);
        const httpCount = Number(planSummary.httpChecks || 0) + Number(planSummary.adversarialHttpChecks || 0);
        const browserCount = Number(planSummary.browserChecks || 0);
        const projectCount = Number(planSummary.projects || globalSafeArray(plan?.projects).length || 0);
        const rows = [
            projectCount ? `复核范围：${projectCount} 个项目` : "",
            commandCount ? `命令检查：${commandCount} 项` : "",
            httpCount ? `HTTP 检查：${httpCount} 项` : "",
            browserCount ? `浏览器检查：${browserCount} 项` : "",
        ].filter(Boolean);
        const status = globalStatusTestAgentPlanStatusKind({}, plan);
        const fallbackHeadline = globalVisibleText(rawTextSummary || detail, "TestAgent 复核计划已生成，我会先确认计划可执行，再启动真实复核。", 260);
        return {
            summary: {
                schema: "ccm-test-agent-execution-plan-summary-v1",
                title: "TestAgent 复核计划",
                status,
                status_label: status === "ready" ? "可执行" : status === "blocked" ? "需修复" : "已生成",
                headline: status === "ready"
                    ? "TestAgent 已生成复核计划，我会按这份计划启动真实验证。"
                    : status === "blocked"
                        ? "TestAgent 复核计划预检未通过，我会先修复交接信息再执行。"
                        : fallbackHeadline,
                rows: rows.length ? rows : [fallbackHeadline],
                issues,
                next_action: status === "ready"
                    ? "启动 TestAgent 真实复核，并把结论纳入最终验收。"
                    : status === "blocked"
                        ? "修复 TestAgent 工作单或项目路径后重新生成复核计划。"
                        : "等待 TestAgent 复核计划补齐更多结构化信息。",
            },
            plan,
        };
    }
    function summarizeGlobalStatusTestAgentExecutionPlan(source = {}) {
        const payload = getGlobalStatusTestAgentExecutionPlanSummary(source);
        if (!payload?.summary)
            return null;
        const summary = payload.summary;
        const status = globalStatusTestAgentPlanStatusKind(summary, payload.plan);
        const fallbackLabel = status === "ready" ? "可执行" : status === "blocked" ? "需修复" : "已生成";
        const statusLabel = sanitizeGlobalDirectAgentOutput(summary.status_label || summary.statusLabel || fallbackLabel, fallbackLabel, 60);
        const rows = globalUniqueStrings(globalSafeArray(summary.rows).map((item) => globalVisibleText(scrubGlobalTestAgentEvidencePathText(globalStatusTestAgentPlanRowText(item)), "", 140)), globalSafeArray(summary.issues).map((item) => `预检问题：${globalVisibleText(scrubGlobalTestAgentEvidencePathText(globalStatusTestAgentPlanRowText(item)), "", 120)}`)).filter(Boolean).slice(0, 4);
        const headline = sanitizeGlobalDirectAgentOutput(scrubGlobalTestAgentEvidencePathText(summary.headline || summary.summary || rows[0] || ""), status === "ready"
            ? "TestAgent 复核计划已生成，我会按计划启动真实验证。"
            : status === "blocked"
                ? "TestAgent 复核计划预检未通过，我会先修复交接信息再执行。"
                : "TestAgent 复核计划已记录，正在等待下一步复核。", 220);
        const nextAction = sanitizeGlobalDirectAgentOutput(scrubGlobalTestAgentEvidencePathText(summary.next_action || summary.nextAction || ""), status === "ready"
            ? "启动 TestAgent 真实复核，并把结论纳入最终验收。"
            : status === "blocked"
                ? "修复 TestAgent 工作单或项目路径后重新生成复核计划。"
                : "等待 TestAgent 复核计划补齐更多结构化信息。", 220);
        return {
            status,
            statusLabel,
            displayStatus: "reviewing",
            headline,
            rows,
            nextAction,
        };
    }
    function getGlobalStatusRunTitle(run) {
        return sanitizeGlobalDirectAgentOutput(run?.plan_mode?.title
            || run?.planMode?.title
            || run?.display_stream?.workchain?.title
            || run?.displayStream?.workchain?.title
            || run?.user_message
            || run?.original_user_message
            || "全局运行", "全局运行", 120);
    }
    function isGlobalStatusRunRelevant(run) {
        const status = String(run?.status || "").toLowerCase();
        if (["running", "supervising", "paused", "waiting_confirmation", "waiting_clarification", "failed"].includes(status))
            return true;
        if (run?.mission_id || run?.missionId || run?.supervisor_id || run?.supervisorId)
            return true;
        if (run?.final_delivery_report || run?.finalDeliveryReport || run?.display_stream?.delivery_report || run?.displayStream?.deliveryReport)
            return true;
        if (getGlobalStatusIndependentReviewSummary(run))
            return true;
        if (getGlobalStatusTestAgentExecutionPlanSummary(run))
            return true;
        if (run?.plan_mode || run?.planMode || run?.pending_tool || run?.pendingTool)
            return true;
        return Number(run?.tool_calls || run?.toolCalls || 0) > 0;
    }
    function buildGlobalStatusRunRepresentedIds(missions, tasks) {
        const missionIds = new Set(missions.map((mission) => String(mission?.id || mission?.mission_id || mission?.missionId || "")).filter(Boolean));
        const runIds = new Set(missions.map((mission) => String(mission?.global_run_id || mission?.globalRunId || "")).filter(Boolean));
        const supervisorIds = new Set(missions.map((mission) => String(mission?.supervisor_id || mission?.supervisorId || "")).filter(Boolean));
        for (const task of tasks) {
            const meta = getGlobalStatusDirectDispatchMeta(task);
            const directRunId = String(meta?.global_run_id || meta?.globalRunId || "").trim();
            if (directRunId)
                runIds.add(directRunId);
        }
        return { missionIds, runIds, supervisorIds };
    }
    function summarizeStandaloneGlobalRunForStatus(run) {
        const status = String(run?.status || "").toLowerCase();
        const review = summarizeGlobalStatusIndependentReview(run);
        const testAgentPlan = review ? null : summarizeGlobalStatusTestAgentExecutionPlan(run);
        const displayStatus = review?.blocking ? review.displayStatus : testAgentPlan ? testAgentPlan.displayStatus : status;
        const title = getGlobalStatusRunTitle(run);
        const nextAction = getGlobalStatusRunNextAction(run);
        const visible = sanitizeGlobalDirectAgentOutput(run?.final_reply
            || run?.finalReply
            || run?.display_stream?.workchain?.user_visible_text
            || run?.displayStream?.workchain?.userVisibleText
            || run?.workchain?.user_visible_text
            || run?.workchain?.userVisibleText
            || "", "", 220);
        const waiting = status === "waiting_confirmation"
            ? "等待你确认授权或影响范围，确认前不会执行。"
            : status === "waiting_clarification"
                ? "需要你补充目标、范围或验收标准后继续。"
                : "";
        const current = waiting || (review?.blocking ? review.headline : "") || testAgentPlan?.headline || visible || review?.headline || (status === "running"
            ? "正在理解需求并执行下一步。"
            : status === "supervising"
                ? "正在跟进执行、验收和最终总结。"
                : status === "failed"
                    ? "上一轮没有完成，失败原因已整理。"
                    : "状态已更新。");
        const next = (review?.blocking ? review.nextAction : "")
            || testAgentPlan?.nextAction
            || nextAction
            || review?.nextAction
            || (status === "waiting_confirmation" ? "你确认后我再继续执行。"
                : status === "waiting_clarification" ? "你补充信息后我再继续规划和执行。"
                    : status === "failed" ? "按失败原因修复或重新发起。"
                        : "继续跟进，拿到可验收结果后再总结。");
        return [
            `- ${title}：${globalStatusLabel(displayStatus)}`,
            `  当前进展：${current}`,
            review ? `  独立复核：${review.statusLabel}${review.headline ? `，${review.headline}` : ""}` : "",
            review?.rows?.length ? `  复核要点：${review.rows.join("；")}。` : "",
            testAgentPlan ? `  TestAgent 计划：${testAgentPlan.statusLabel}${testAgentPlan.headline ? `，${testAgentPlan.headline}` : ""}` : "",
            testAgentPlan?.rows?.length ? `  计划要点：${testAgentPlan.rows.join("；")}。` : "",
            `  下一步：${next}`,
        ].filter(Boolean).join("\n");
    }
    function collectStandaloneGlobalStatusRuns(inputRuns, missions, tasks) {
        const runs = Array.isArray(inputRuns) ? inputRuns : listGlobalAgentRuns({ limit: 12 });
        const represented = buildGlobalStatusRunRepresentedIds(missions, tasks);
        return runs
            .filter((run) => {
            if (!run || !isGlobalStatusRunRelevant(run))
                return false;
            const runId = String(run?.id || "").trim();
            const missionId = String(run?.mission_id || run?.missionId || "").trim();
            const supervisorId = String(run?.supervisor_id || run?.supervisorId || "").trim();
            if (runId && represented.runIds.has(runId))
                return false;
            if (missionId && represented.missionIds.has(missionId))
                return false;
            if (supervisorId && represented.supervisorIds.has(supervisorId))
                return false;
            return true;
        })
            .sort((a, b) => String(b?.updated_at || b?.updatedAt || b?.created_at || "").localeCompare(String(a?.updated_at || a?.updatedAt || a?.created_at || "")))
            .slice(0, 4);
    }
    function formatMissionStatus(input = {}) {
        const tasks = Array.isArray(input.tasks) ? input.tasks : loadTasks();
        const missions = Array.isArray(input.missions) ? input.missions : refreshGlobalDevelopmentMissions();
        const directDispatchTasks = tasks
            .filter((task) => getGlobalStatusDirectDispatchMeta(task))
            .sort((a, b) => String(b.updated_at || b.completed_at || b.created_at || "").localeCompare(String(a.updated_at || a.completed_at || a.created_at || "")))
            .slice(0, 4);
        const standaloneRuns = collectStandaloneGlobalStatusRuns(input.globalRuns, missions, tasks);
        if (!missions.length && !directDispatchTasks.length && !standaloneRuns.length)
            return "当前还没有全局开发任务、全局直派任务或正在跟进的全局运行。";
        const missionRows = missions.slice(-6).reverse().map((mission) => {
            const counts = globalMissionStatusCounts(mission, tasks);
            const total = counts.total;
            const completed = counts.completed;
            const failed = counts.failed;
            const blocked = counts.blocked;
            const reviewing = counts.reviewing;
            const displayStatus = globalMissionDisplayStatus(mission, counts);
            const details = [`${completed}/${total || "?"} 已通过验收`];
            if (failed > 0)
                details.push(`${failed} 失败`);
            if (reviewing > 0)
                details.push(`${reviewing} 验收中`);
            if (blocked > 0)
                details.push(`${blocked} 阻塞`);
            const title = sanitizeGlobalDirectAgentOutput(mission.title || mission.business_goal || mission.id, "全局开发任务", 120);
            const current = latestReadableTimeline(mission);
            const children = summarizeMissionChildren(mission, tasks);
            const childWaiting = summarizeGlobalChildAgentWaiting(mission, tasks);
            const pickup = getGlobalStatusPickupSummary(mission);
            const supervision = summarizeGlobalSupervisionRunForStatus(mission, input.globalRuns);
            const review = summarizeGlobalStatusIndependentReview(mission);
            const testAgentPlan = review ? null : summarizeGlobalStatusTestAgentExecutionPlan(mission);
            const childIds = new Set((Array.isArray(mission?.child_task_ids) ? mission.child_task_ids : []).map((id) => String(id)));
            const progressRefresh = getGlobalStatusProgressRefreshSummary(mission, tasks.filter((task) => childIds.has(String(task?.id || ""))));
            const statusForDisplay = review?.blocking ? review.displayStatus : testAgentPlan ? testAgentPlan.displayStatus : displayStatus;
            const currentForDisplay = review?.blocking ? review.headline : testAgentPlan?.headline || current;
            const next = review?.blocking
                ? `下一步：${review.nextAction}`
                : testAgentPlan
                    ? `下一步：${testAgentPlan.nextAction}`
                    : supervision?.nextAction
                        ? `下一步：${supervision.nextAction}`
                        : failed || blocked
                            ? "下一步：需要我处理失败/阻塞项，不能直接宣称完成。"
                            : reviewing > 0
                                ? "下一步：补齐真实验证或复核证据，通过验收后再给最终交付总结。"
                                : counts.allPassed
                                    ? `下一步：${supervision?.nextAction || pickup?.resumeAction || "等待或查看最终交付总结。"}`
                                    : `下一步：${supervision?.nextAction || progressRefresh?.nextAction || "继续等待执行成员更新结果，我会汇总验收。"}`;
            return [
                `- ${title}：${globalStatusLabel(statusForDisplay)}（${details.join("，")}）`,
                currentForDisplay ? `  当前进展：${currentForDisplay}` : "",
                review ? `  独立复核：${review.statusLabel}${review.headline ? `，${review.headline}` : ""}` : "",
                review?.rows?.length ? `  复核要点：${review.rows.join("；")}。` : "",
                testAgentPlan ? `  TestAgent 计划：${testAgentPlan.statusLabel}${testAgentPlan.headline ? `，${testAgentPlan.headline}` : ""}` : "",
                testAgentPlan?.rows?.length ? `  计划要点：${testAgentPlan.rows.join("；")}。` : "",
                supervision?.headline ? `  持续跟进：${supervision.headline}` : "",
                pickup?.headline ? `  ${pickup.title}：${pickup.headline}` : "",
                pickup?.reviewItems?.length ? `  回看要点：${pickup.reviewItems.join("；")}。` : "",
                progressRefresh?.headline ? `  ${progressRefresh.title}：${progressRefresh.headline}` : "",
                progressRefresh?.reviewItems?.length ? `  接续要点：${progressRefresh.reviewItems.join("；")}。` : "",
                children.length ? `  子目标：${children.join("；")}` : "",
                childWaiting ? `  执行成员等待情况：${childWaiting}` : "",
                `  ${next}`,
            ].filter(Boolean).join("\n");
        });
        const directRows = directDispatchTasks.map((task) => {
            const meta = getGlobalStatusDirectDispatchMeta(task) || {};
            const title = sanitizeGlobalDirectAgentOutput(meta.user_goal || task.business_goal || task.title || "全局直派任务", "全局直派任务", 120);
            const target = targetNameForTask(task);
            const current = latestReadableTimeline(task);
            const displayStatus = globalTaskDisplayStatus(task);
            const strongAcceptance = globalTaskHasStrongAcceptanceEvidence(task);
            const acceptance = strongAcceptance ? "已通过验收" : "等待任务卡验收";
            const continuation = summarizeDirectDispatchContinuationForStatus(task);
            const pickup = getGlobalStatusPickupSummary(task);
            const progressRefresh = getGlobalStatusProgressRefreshSummary(task);
            const review = summarizeGlobalStatusIndependentReview(task);
            const testAgentPlan = review ? null : summarizeGlobalStatusTestAgentExecutionPlan(task);
            const statusForDisplay = review?.blocking ? review.displayStatus : testAgentPlan ? testAgentPlan.displayStatus : displayStatus;
            const currentForDisplay = review?.blocking ? review.headline : testAgentPlan?.headline || current;
            const next = review?.blocking
                ? review.nextAction
                : testAgentPlan
                    ? testAgentPlan.nextAction
                    : pickup?.resumeAction || progressRefresh?.nextAction || "以群聊任务卡的计划、执行、验收和最终总结为准。";
            return [
                `- ${title}：${globalStatusLabel(statusForDisplay)}（${target}，${acceptance}）`,
                continuation ? `  ${continuation}` : "",
                currentForDisplay ? `  当前进展：${currentForDisplay}` : "",
                review ? `  独立复核：${review.statusLabel}${review.headline ? `，${review.headline}` : ""}` : "",
                review?.rows?.length ? `  复核要点：${review.rows.join("；")}。` : "",
                testAgentPlan ? `  TestAgent 计划：${testAgentPlan.statusLabel}${testAgentPlan.headline ? `，${testAgentPlan.headline}` : ""}` : "",
                testAgentPlan?.rows?.length ? `  计划要点：${testAgentPlan.rows.join("；")}。` : "",
                pickup?.headline ? `  ${pickup.title}：${pickup.headline}` : "",
                pickup?.reviewItems?.length ? `  回看要点：${pickup.reviewItems.join("；")}。` : "",
                progressRefresh?.headline ? `  ${progressRefresh.title}：${progressRefresh.headline}` : "",
                progressRefresh?.reviewItems?.length ? `  接续要点：${progressRefresh.reviewItems.join("；")}。` : "",
                `  下一步：${next}`,
            ].filter(Boolean).join("\n");
        });
        const runRows = standaloneRuns.map((run) => summarizeStandaloneGlobalRunForStatus(run));
        return [
            missionRows.length ? `最近全局任务进展：\n${missionRows.join("\n")}` : "",
            directRows.length ? `最近全局直派任务：\n${directRows.join("\n")}` : "",
            runRows.length ? `最近全局运行：\n${runRows.join("\n")}` : "",
            "我不会猜测还没返回的执行成员结果；未完成的部分会继续等待执行目标更新，技术记录默认在任务卡技术详情里。",
        ].filter(Boolean).join("\n\n");
    }
    function formatSystemStatus() {
        const projects = getConfigs();
        const groups = loadGroups();
        const tasks = loadTasks();
        const cronJobs = loadCronJobs();
        const activeTasks = tasks.filter((item) => ["pending", "queued", "in_progress", "running"].includes(String(item.status))).length;
        return [
            "CCM 当前状态：",
            `- 项目：${projects.length} 个`,
            `- 协作群聊：${groups.length} 个`,
            `- 开发任务：${tasks.length} 个，活跃 ${activeTasks} 个`,
            `- 定时任务：${cronJobs.length} 个，启用 ${cronJobs.filter((item) => item.enabled !== false).length} 个`,
        ].join("\n");
    }
    return {
        isGlobalProgressStatusRequest,
        formatMissionStatus,
        formatSystemStatus,
    };
}
//# sourceMappingURL=global-agent-status.js.map