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
exports.buildTaskReplayPresentation = buildTaskReplayPresentation;
exports.runTaskReplayPresentationSelfTest = runTaskReplayPresentationSelfTest;
const crypto = __importStar(require("crypto"));
const task_replay_shared_1 = require("./task-replay-shared");
const COMPLETED = new Set(["done", "completed", "passed", "accepted", "success"]);
const FAILED = new Set(["failed", "error", "rejected"]);
const BLOCKED = new Set(["blocked", "waiting", "needs_info", "recovery_required"]);
function list(value, max = 60) {
    return (Array.isArray(value) ? value : value == null || value === "" ? [] : [value])
        .map(item => (0, task_replay_shared_1.safeText)(typeof item === "string" ? item : item?.description || item?.criterion || item?.label || item?.title || item?.summary || item?.message, 700))
        .filter(Boolean)
        .slice(0, max);
}
function unique(values) {
    const seen = new Set();
    return values.filter(value => {
        const key = value.replace(/\s+/g, "").toLowerCase();
        if (!key || seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function timeMs(value) {
    const parsed = Date.parse(String(value || ""));
    return Number.isFinite(parsed) ? parsed : 0;
}
function duration(start, end) {
    const from = timeMs(start);
    const to = timeMs(end);
    return from > 0 && to >= from ? to - from : undefined;
}
function normalizedOutcome(value) {
    const status = String(value || "pending").toLowerCase();
    if (COMPLETED.has(status))
        return "completed";
    if (FAILED.has(status))
        return "failed";
    if (status === "cancelled" || status === "reverted")
        return "cancelled";
    if (BLOCKED.has(status))
        return "blocked";
    return "running";
}
function evidenceFreshness(item) {
    const value = String(item?.freshness || item?.repo_state_status || item?.status || "").toLowerCase();
    if (["stale", "expired", "drifted", "deleted", "permission_revoked", "invalid"].includes(value))
        return "stale";
    if (["current", "available", "valid", "passed", "verified"].includes(value))
        return "current";
    return "unknown";
}
function coverageRows(events) {
    return events.flatMap(event => {
        const rows = event?.technical?.criterion_coverage;
        return Array.isArray(rows) ? rows.map(row => ({ ...row, event })) : [];
    });
}
function coverageStatus(value) {
    const status = String(value || "").toLowerCase();
    if (["verified", "passed", "satisfied", "covered", "success"].includes(status))
        return "satisfied";
    if (["failed", "rejected", "invalid"].includes(status))
        return "failed";
    if (["stale", "drifted", "expired"].includes(status))
        return "stale";
    return "not_run";
}
function buildAcceptanceMatrix(input) {
    const criteria = unique([
        ...input.deliveries.flatMap(row => list(row?.acceptance_criteria, 30)),
        ...input.plans.flatMap(row => list(row?.acceptance, 30)),
        ...input.tasks.flatMap(task => list(task?.acceptance_criteria || task?.acceptanceCriteria, 30)),
    ]).slice(0, 80);
    const coverage = coverageRows(input.events);
    return criteria.map((description, index) => {
        const normalized = description.replace(/\s+/g, "").toLowerCase();
        const exact = coverage.find(row => String(row.criterion || row.description || row.label || "").replace(/\s+/g, "").toLowerCase() === normalized);
        const related = exact || coverage.find(row => {
            const candidate = String(row.criterion || row.description || row.label || "").replace(/\s+/g, "").toLowerCase();
            return candidate.length >= 8 && (candidate.includes(normalized) || normalized.includes(candidate));
        });
        const evidenceIds = unique([
            ...list(related?.evidence_ids || related?.evidenceIds, 30),
            ...list(related?.event?.evidence_ids, 30),
        ]);
        const evidenceRows = evidenceIds.map(id => input.evidence.find(item => String(item.id) === id)).filter(Boolean);
        let status = coverageStatus(related?.status);
        let freshness = evidenceRows.length
            ? (evidenceRows.some(item => evidenceFreshness(item) === "stale") ? "stale" : evidenceRows.every(item => evidenceFreshness(item) === "current") ? "current" : "unknown")
            : "unknown";
        if (status === "satisfied" && freshness === "stale")
            status = "stale";
        if (!related && normalizedOutcome(input.status) === "completed" && input.acceptanceState.toLowerCase() === "accepted")
            status = "not_run";
        return {
            criterionId: (0, task_replay_shared_1.safeText)(related?.criterion_id || related?.criterionId, 100) || `criterion_${index + 1}`,
            description,
            status,
            verifier: (0, task_replay_shared_1.safeText)(related?.verifier || related?.event?.actor?.label, 100) || (related ? "TestAgent" : "未记录"),
            evidenceIds,
            freshness,
            reason: (0, task_replay_shared_1.safeText)(related?.reason || related?.detail, 500),
        };
    });
}
const CHAPTER_STAGES = {
    requirement: ["intake"],
    planning: ["planning"],
    implementation: ["dispatch", "execution", "change"],
    verification: ["test", "review"],
    rework: ["rework"],
    delivery: ["completion"],
};
const CHAPTER_LABELS = {
    requirement: "需求与目标",
    planning: "计划与方案",
    implementation: "实施过程",
    verification: "独立验收",
    rework: "返工与复验",
    delivery: "最终交付",
};
function chapterStatus(rows, outcome) {
    if (!rows.length)
        return "pending";
    if (rows.some(row => row.status === "running"))
        return "running";
    const latest = rows.at(-1);
    if (outcome === "completed" && ["failed", "blocked", "warning"].includes(String(latest?.status)))
        return "completed_with_history";
    if (rows.some(row => row.status === "failed"))
        return "failed";
    if (rows.some(row => row.status === "blocked"))
        return "blocked";
    return "completed";
}
function chapterSummary(kind, rows, input) {
    if (kind === "requirement")
        return (0, task_replay_shared_1.safeText)(input.root?.business_goal || input.root?.description || input.deliveries[0]?.business_goal, 500) || "已记录任务目标。";
    if (kind === "planning")
        return input.plans.length ? `主 Agent形成 ${input.plans.length} 份计划，共 ${input.plans.reduce((sum, row) => sum + Number(row.step_count || 0), 0)} 个步骤。` : "此任务没有保存可回放的用户计划。";
    if (kind === "implementation")
        return input.workItems.length ? `${input.workItems.length} 个执行步骤，涉及 ${unique(input.workItems.map(row => (0, task_replay_shared_1.safeText)(row.target || row.owner, 100))).filter(Boolean).length} 个项目或成员。` : "尚未形成项目执行步骤。";
    if (kind === "verification")
        return input.evidence.length ? `保存了 ${input.evidence.length} 项验证与交付证据。` : "尚未保存独立验证证据。";
    if (kind === "rework") {
        const count = input.deliveries.reduce((sum, row) => sum + Number(row.rework_count || 0), 0);
        return count ? `经历 ${count} 轮返工或复验，历史原因可展开查看。` : "没有发生返工。";
    }
    const report = input.deliveries.map(row => row.final_report || row.user_report || row.headline).find(Boolean);
    return (0, task_replay_shared_1.safeText)(report, 700) || (normalizedOutcome(input.status) === "completed" ? "任务已完成并形成最终交付。" : "等待形成最终交付。");
}
function buildChapters(input) {
    const outcome = normalizedOutcome(input.status);
    return Object.keys(CHAPTER_STAGES).map(kind => {
        const rows = input.events.filter(event => CHAPTER_STAGES[kind].includes(String(event.stage)));
        const startedAt = rows[0]?.at || "";
        const completedAt = rows.at(-1)?.at || "";
        return {
            kind,
            title: CHAPTER_LABELS[kind],
            status: chapterStatus(rows, outcome),
            summary: chapterSummary(kind, rows, input),
            startedAt,
            completedAt,
            durationMs: duration(startedAt, completedAt),
            eventIds: rows.map(row => String(row.id)).filter(Boolean),
            evidenceIds: unique(rows.flatMap(row => list(row.evidence_ids, 30))),
            taskIds: unique(rows.map(row => (0, task_replay_shared_1.safeText)(row.task_id, 100))),
        };
    });
}
function buildAttempts(input) {
    const rows = new Map();
    for (const item of input.workItems) {
        const attempt = Math.max(1, Number(item.attempt || 1));
        const key = `${item.task_id}|${item.id}|${attempt}`;
        rows.set(key, {
            workItemId: String(item.id || ""),
            taskId: String(item.task_id || ""),
            project: (0, task_replay_shared_1.safeText)(item.target || item.owner, 100),
            agent: (0, task_replay_shared_1.safeText)(item.agent_type || item.owner || item.target, 100),
            attempt,
            outcome: (0, task_replay_shared_1.safeText)(item.receipt_status || item.status, 40),
            summary: (0, task_replay_shared_1.safeText)(item.receipt_summary || item.subject, 500),
            failureReason: list(item.blockers, 3).join("；"),
            repairScope: (0, task_replay_shared_1.safeText)(item.description, 500),
            evidenceIds: unique(list(item.evidence_ids, 30)),
            filesChanged: Math.max(0, Number(item.files_changed_count || 0)),
            verificationCount: Math.max(0, Number(item.verification_count || item.verification?.length || 0)),
            startedAt: (0, task_replay_shared_1.iso)(item.created_at),
            completedAt: (0, task_replay_shared_1.iso)(item.completed_at || item.updated_at),
        });
    }
    for (const event of input.events) {
        const attempt = Math.max(1, Number(event?.technical?.attempt || 1));
        if (!event?.technical?.work_item_id || !["execution", "rework", "test"].includes(String(event.stage)))
            continue;
        const key = `${event.task_id}|${event.technical.work_item_id}|${attempt}`;
        if (rows.has(key))
            continue;
        rows.set(key, {
            workItemId: String(event.technical.work_item_id), taskId: String(event.task_id || ""), project: (0, task_replay_shared_1.safeText)(event.project, 100), agent: (0, task_replay_shared_1.safeText)(event.actor?.label, 100), attempt,
            outcome: String(event.status || ""), summary: (0, task_replay_shared_1.safeText)(event.summary || event.title, 500), failureReason: event.status === "failed" || event.status === "blocked" ? (0, task_replay_shared_1.safeText)(event.summary, 500) : "",
            repairScope: "", evidenceIds: unique(list(event.evidence_ids, 30)), filesChanged: 0, verificationCount: 0, startedAt: (0, task_replay_shared_1.iso)(event.at), completedAt: (0, task_replay_shared_1.iso)(event.at),
        });
    }
    return [...rows.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt) || a.attempt - b.attempt).slice(0, 120);
}
function explicitActions(value, fallbackTaskId = "") {
    const allowed = new Set(["retry", "resolve_permission", "view_error", "recheck", "takeover"]);
    return (Array.isArray(value) ? value : []).flatMap((row, index) => {
        const kind = String(row?.kind || "");
        if (!allowed.has(kind))
            return [];
        return [{
                id: (0, task_replay_shared_1.safeText)(row?.id, 120) || `${fallbackTaskId}:${kind}:${index}`,
                taskId: (0, task_replay_shared_1.safeText)(row?.taskId || row?.task_id || fallbackTaskId, 120),
                kind,
                label: (0, task_replay_shared_1.safeText)(row?.label, 80) || { retry: "重试", resolve_permission: "处理授权", view_error: "查看错误", recheck: "重新核验", takeover: "人工接管" }[kind],
                enabled: row?.enabled === true,
                disabledReason: (0, task_replay_shared_1.safeText)(row?.disabledReason || row?.disabled_reason, 300),
                revision: Math.max(0, Number(row?.revision || 0)),
                generation: Math.max(0, Number(row?.generation || 0)),
                bindingChecksum: (0, task_replay_shared_1.safeText)(row?.bindingChecksum || row?.binding_checksum, 160),
            }];
    });
}
function buildActionCenter(input) {
    const rows = [
        ...input.tasks.flatMap(task => explicitActions(task?.available_actions || task?.availableActions, String(task?.id || ""))),
        ...input.events.flatMap(event => explicitActions(event?.available_actions || event?.technical?.available_actions, String(event?.task_id || ""))),
    ];
    const seen = new Set();
    return rows.filter(row => {
        const key = `${row.taskId}|${row.id}|${row.kind}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    }).slice(0, 80);
}
function buildIntegrity(input) {
    const expected = ["requirement", "plan", "execution", "delivery"];
    const observed = new Set();
    const gaps = [];
    if (input.tasks.some(task => task?.business_goal || task?.description || task?.title))
        observed.add("requirement");
    if (input.plans.length)
        observed.add("plan");
    if (input.workItems.length || input.events.some(event => ["dispatch", "execution", "change", "rework"].includes(String(event.stage))))
        observed.add("execution");
    if (input.deliveries.length || input.events.some(event => event.stage === "completion"))
        observed.add("delivery");
    const verificationExpected = input.tasks.some(task => task?.test_agent_enabled !== false && task?.skip_independent_verification !== true)
        || input.events.some(event => event.actor?.type === "test_agent" || ["test", "review"].includes(String(event.stage)));
    if (verificationExpected)
        expected.push("verification");
    if (input.evidence.length || input.events.some(event => ["test", "review"].includes(String(event.stage))))
        observed.add("verification");
    const terminalExpected = normalizedOutcome(input.status) !== "running";
    if (terminalExpected)
        expected.push("terminal_gate");
    if (input.tasks.some(task => task?.terminal_gate || task?.terminal_decision || task?.terminal_state_receipt))
        observed.add("terminal_gate");
    const projectAgentExpected = input.workItems.length > 0 || input.events.some(event => event.actor?.type === "project_agent");
    if (projectAgentExpected)
        expected.push("agent_progress");
    const hasAgentReported = input.events.some(event => event.actor?.type === "project_agent" && (event?.technical?.progress_source === "agent_reported"
        || (event.category === "assistant_progress" && event?.technical?.progress_source !== "system_observed")));
    const hasAgentObserved = input.events.some(event => event.actor?.type === "project_agent");
    if (hasAgentReported)
        observed.add("agent_progress");
    else if (hasAgentObserved)
        gaps.push({ source: "agent_progress", label: "第三方 Agent 业务说明不完整", reason: "当前仅有系统观察记录；第三方 Agent 未主动汇报具体业务进度。" });
    for (const source of expected) {
        if (observed.has(source) || gaps.some(gap => gap.source === source))
            continue;
        const labels = { requirement: "需求记录缺失", plan: "执行计划缺失", execution: "执行过程缺失", verification: "验证记录缺失", delivery: "交付记录缺失", terminal_gate: "终态验收证据缺失" };
        gaps.push({ source, label: labels[source] || "记录来源缺失", reason: source === "terminal_gate" ? "任务存在终态，但历史数据未保存结构化 Terminal Gate 回执。" : "该来源没有可验证的结构化记录。" });
    }
    const legacy = input.events.length > 0 && input.plans.length === 0 && input.workItems.length === 0 && input.deliveries.length === 0;
    const coreMissing = gaps.filter(gap => ["requirement", "plan", "execution", "verification", "delivery", "terminal_gate"].includes(gap.source)).length;
    const level = legacy ? "legacy" : coreMissing > 0 ? "partial" : gaps.length ? "mostly_complete" : "complete";
    return { level, expectedSources: unique(expected), observedSources: unique([...observed]), gaps };
}
function causalNodeId(kind, id) {
    return `${kind}:${(0, task_replay_shared_1.safeText)(id, 160) || crypto.randomUUID()}`;
}
function buildCausalChain(input, acceptanceMatrix) {
    const nodes = [];
    const edges = [];
    const nodeIds = new Set();
    const addNode = (node) => { if (!nodeIds.has(node.id)) {
        nodeIds.add(node.id);
        nodes.push(node);
    } return node.id; };
    const addEdge = (from, to, relation) => { if (from && to && nodeIds.has(from) && nodeIds.has(to))
        edges.push({ from, to, relation }); };
    const rootId = addNode({ id: causalNodeId("requirement", input.root?.id || "root"), kind: "requirement", title: (0, task_replay_shared_1.safeText)(input.root?.business_goal || input.root?.description || input.root?.title, 300) || "任务需求", status: normalizedOutcome(input.status), taskId: String(input.root?.id || "") });
    const stepIndex = new Map();
    for (const plan of input.plans)
        for (const step of plan.steps || []) {
            const id = addNode({ id: causalNodeId("plan", `${plan.task_id}:${step.id}`), kind: "plan", title: (0, task_replay_shared_1.safeText)(step.title, 240), status: String(step.status || "pending"), taskId: String(plan.task_id || ""), eventIds: [] });
            stepIndex.set(`${plan.task_id}:${step.id}`, id);
            addEdge(rootId, id, "planned_as");
        }
    const workIndex = new Map();
    for (const item of input.workItems) {
        const id = addNode({ id: causalNodeId("agent", `${item.task_id}:${item.id}:${item.attempt || 1}`), kind: "agent", title: (0, task_replay_shared_1.safeText)(item.subject || `${item.target || item.owner || "项目 Agent"}执行`, 240), status: String(item.receipt_status || item.status || "pending"), taskId: String(item.task_id || ""), project: (0, task_replay_shared_1.safeText)(item.target || item.owner, 100), attempt: Math.max(1, Number(item.attempt || 1)), evidenceIds: unique(list(item.evidence_ids, 30)) });
        workIndex.set(`${item.task_id}:${item.id}`, id);
        const planStepId = (0, task_replay_shared_1.safeText)(item.plan_step_id || item.planStepId, 100);
        if (planStepId)
            addEdge(stepIndex.get(`${item.task_id}:${planStepId}`) || "", id, "assigned_to");
    }
    for (const event of input.events) {
        const technical = event?.technical || {};
        const workId = (0, task_replay_shared_1.safeText)(technical.work_item_id || technical.workItemId, 120);
        const planStepId = (0, task_replay_shared_1.safeText)(technical.plan_step_id || technical.planStepId, 120);
        const batchId = (0, task_replay_shared_1.safeText)(technical.batch_id || technical.batchId, 120);
        const taskId = String(event.task_id || "");
        const parent = workIndex.get(`${taskId}:${workId}`) || stepIndex.get(`${taskId}:${planStepId}`) || "";
        if (batchId) {
            const relatedToolCallIds = new Set(list(technical.related_tool_call_ids || technical.relatedToolCallIds, 80));
            const relatedEvents = relatedToolCallIds.size ? input.events.filter(row => relatedToolCallIds.has(String(row?.technical?.tool_call_id || row?.technical?.toolCallId || ""))) : [];
            const failed = relatedEvents.filter(row => row.status === "failed").length;
            const running = relatedEvents.some(row => row.status === "running" || row.status === "pending");
            const outcome = relatedEvents.length ? (failed ? `${relatedEvents.length} 项中 ${failed} 项失败` : running ? `${relatedEvents.length} 项执行中` : `${relatedEvents.length} 项完成`) : "";
            const businessTitle = (0, task_replay_shared_1.safeText)(event.summary || event.title, 190) || "工具批次";
            const id = addNode({ id: causalNodeId("tool_batch", `${taskId}:${batchId}`), kind: "tool_batch", title: outcome ? `${businessTitle} · ${outcome}` : businessTitle, status: failed ? "failed" : running ? "running" : String(event.status), taskId, project: (0, task_replay_shared_1.safeText)(event.project, 100), attempt: Math.max(1, Number(technical.attempt || 1)), eventIds: [String(event.id), ...relatedEvents.map(row => String(row.id))] });
            addEdge(parent, id, "executed_by");
        }
        for (const dependencyId of list(technical.dependency_ids || technical.dependencyIds || technical.blocked_by, 20)) {
            const id = addNode({ id: causalNodeId("dependency", dependencyId), kind: "dependency", title: `依赖 ${dependencyId}`, status: String(event.status), taskId, project: (0, task_replay_shared_1.safeText)(event.project, 100), eventIds: [String(event.id)] });
            addEdge(parent, id, "depends_on");
        }
    }
    for (const item of input.evidence.filter(row => row.type === "code_changes")) {
        const id = addNode({ id: causalNodeId("file_change", item.id), kind: "file_change", title: (0, task_replay_shared_1.safeText)(item.title, 240) || `${item.file_count || 0} 个文件变化`, status: String(item.status || "available"), taskId: String(item.task_id || ""), project: (0, task_replay_shared_1.safeText)(item.project, 100), evidenceIds: [String(item.id)] });
        const related = [...workIndex.entries()].find(([key]) => key.startsWith(`${item.task_id}:`))?.[1] || "";
        addEdge(related, id, "changed");
    }
    const verificationEvents = input.events.filter(event => ["test", "review"].includes(String(event.stage)));
    for (const event of verificationEvents.slice(0, 80)) {
        const id = addNode({ id: causalNodeId("verification", event.id), kind: "verification", title: (0, task_replay_shared_1.safeText)(event.title, 240), status: String(event.status), taskId: String(event.task_id || ""), project: (0, task_replay_shared_1.safeText)(event.project, 100), eventIds: [String(event.id)], evidenceIds: unique(list(event.evidence_ids, 30)) });
        const workItemId = (0, task_replay_shared_1.safeText)(event?.technical?.work_item_id || event?.technical?.workItemId, 120);
        if (workItemId)
            addEdge(workIndex.get(`${event.task_id}:${workItemId}`) || "", id, "verified_by");
    }
    for (const criterion of acceptanceMatrix) {
        const id = addNode({ id: causalNodeId("criterion", criterion.criterionId), kind: "criterion", title: (0, task_replay_shared_1.safeText)(criterion.description, 240), status: String(criterion.status), taskId: String(input.root?.id || ""), evidenceIds: unique(list(criterion.evidenceIds, 30)) });
        const verifier = verificationEvents.find(event => (event.evidence_ids || []).some((evidenceId) => criterion.evidenceIds.includes(evidenceId)));
        if (verifier)
            addEdge(causalNodeId("verification", verifier.id), id, "satisfies");
    }
    const delivery = input.deliveries[0];
    if (delivery || normalizedOutcome(input.status) !== "running") {
        const id = addNode({ id: causalNodeId("delivery", input.root?.id || "root"), kind: "delivery", title: (0, task_replay_shared_1.safeText)(delivery?.headline || delivery?.final_report || "最终交付", 240), status: normalizedOutcome(input.status), taskId: String(input.root?.id || ""), evidenceIds: unique(input.evidence.map(row => String(row.id || "")).filter(Boolean)) });
        for (const criterion of acceptanceMatrix)
            addEdge(causalNodeId("criterion", criterion.criterionId), id, "delivered_as");
    }
    const uniqueEdges = [...new Map(edges.map(edge => [`${edge.from}|${edge.to}|${edge.relation}`, edge])).values()];
    return { nodes: nodes.slice(0, 300), edges: uniqueEdges.slice(0, 500) };
}
function buildAttemptComparisons(input, attempts) {
    const grouped = new Map();
    for (const row of attempts) {
        const key = String(row.workItemId || row.taskId || "unknown");
        if (!grouped.has(key))
            grouped.set(key, []);
        grouped.get(key).push(row);
    }
    return [...grouped.entries()].map(([workItemId, rows]) => {
        rows.sort((a, b) => a.attempt - b.attempt);
        const acceptedAttempt = [...rows].reverse().find(row => COMPLETED.has(String(row.outcome || "").toLowerCase()))?.attempt;
        return {
            workItemId,
            project: rows.find(row => row.project)?.project || "",
            attempts: rows.map(row => ({
                attempt: row.attempt,
                status: row.outcome,
                accepted: row.attempt === acceptedAttempt,
                superseded: acceptedAttempt != null && row.attempt < acceptedAttempt,
                summary: row.summary,
                failureReason: row.failureReason,
                filesChanged: row.filesChanged,
                verificationCount: row.verificationCount,
                evidenceIds: row.evidenceIds,
            })),
        };
    }).slice(0, 80);
}
function buildIssues(input) {
    const outcome = normalizedOutcome(input.status);
    const rows = input.events.filter(event => ["failed", "blocked", "warning"].includes(String(event.status)));
    return rows.slice(0, 120).map((event, index) => {
        const explicitlyResolved = !!event?.technical?.resolved_at;
        const laterResolution = input.events.find(candidate => candidate.task_id === event.task_id && timeMs(candidate.at) > timeMs(event.at) && ["rework", "test", "review", "completion"].includes(String(candidate.stage)) && candidate.status === "passed");
        const status = explicitlyResolved || laterResolution ? "resolved" : outcome === "completed" ? "superseded" : "open";
        return {
            issueId: String(event.id || `issue_${index + 1}`),
            summary: (0, task_replay_shared_1.safeText)(event.summary || event.title, 500),
            status,
            project: (0, task_replay_shared_1.safeText)(event.project, 100),
            foundAt: (0, task_replay_shared_1.iso)(event.at),
            resolvedAt: (0, task_replay_shared_1.iso)(event?.technical?.resolved_at || laterResolution?.at),
            resolution: explicitlyResolved ? "已由结构化恢复记录解决" : laterResolution ? (0, task_replay_shared_1.safeText)(laterResolution.summary || laterResolution.title, 500) : status === "superseded" ? "最终验收已通过，此历史问题不再阻塞交付" : "仍需处理",
            evidenceIds: unique([...list(event.evidence_ids, 30), ...list(laterResolution?.evidence_ids, 30)]),
        };
    });
}
function buildRecoveryJourney(input) {
    return input.tasks.flatMap(task => {
        const rows = [];
        const pause = task?.pause_control?.schema === "ccm-task-pause-control-v1"
            ? task.pause_control
            : task?.last_pause_control?.schema === "ccm-task-pause-control-v1" ? task.last_pause_control : null;
        if (pause) {
            const pausedAt = (0, task_replay_shared_1.iso)(pause.pausedAt);
            const recoveredAt = (0, task_replay_shared_1.iso)(pause.resumedAt || task.resumed_at);
            rows.push({
                kind: "pause",
                taskId: String(task.id || pause.taskId || ""),
                reasonCode: "user_pause",
                reasonLabel: "任务已安全暂停",
                interruptedAt: (0, task_replay_shared_1.iso)(pause.requestedAt),
                pausedAt,
                resumePhase: (0, task_replay_shared_1.safeText)(pause.checkpoint?.phase, 120),
                completedWorkItemCount: Math.max(0, Number(pause.checkpoint?.completedWorkItemIds?.length || 0)),
                suspendedSessionCount: Math.max(0, Number(pause.checkpoint?.suspendedSessionCount || 0)),
                pauseDurationMs: pausedAt && recoveredAt ? Math.max(0, timeMs(recoveredAt) - timeMs(pausedAt)) : 0,
                mode: "safe_pause",
                state: String(pause.state || "paused"),
                attempt: Math.max(0, Number(pause.attempt || 0)),
                maxAttempts: Math.max(1, Number(pause.attempt || 0) + 1),
                nextRetryAt: "",
                recoveredAt,
                result: recoveredAt ? "resumed" : pause.state === "blocked" ? "needs_user" : "paused",
            });
        }
        const receipt = task?.interruption_receipt;
        if (receipt?.schema !== "ccm-task-interruption-receipt-v1")
            return rows;
        const checkpoint = receipt.resume_checkpoint || task.resume_checkpoint || {};
        const recovery = task.recovery || receipt.recovery || {};
        const reasonLabels = {
            provider_unavailable: "模型服务暂时不可用",
            model_stream_interrupted: "模型流式输出中断",
            agent_runtime_unavailable: "项目 Agent 执行通道不可用",
            temporary_network: "网络连接中断",
            service_restart: "CCM 服务重启",
            lease_lost: "执行租约中断",
        };
        rows.push({
            kind: "interruption",
            taskId: String(task.id || receipt.task_id || ""),
            reasonCode: String(receipt.reason_code || "unknown"),
            reasonLabel: reasonLabels[String(receipt.reason_code || "")] || "任务执行中断",
            interruptedAt: (0, task_replay_shared_1.iso)(receipt.interrupted_at),
            resumePhase: (0, task_replay_shared_1.safeText)(checkpoint.phase || receipt.checkpoint, 120),
            completedWorkItemCount: Math.max(0, Number(checkpoint.completedWorkItemIds?.length || 0)),
            mode: recovery.mode || (receipt.auto_resume_allowed ? "safe_auto" : "manual"),
            state: recovery.state || (receipt.auto_resume_allowed ? "waiting_provider" : "needs_user"),
            attempt: Math.max(0, Number(recovery.attempt || 0)),
            maxAttempts: Math.max(1, Number(recovery.maxAttempts || 3)),
            nextRetryAt: (0, task_replay_shared_1.iso)(recovery.nextRetryAt),
            recoveredAt: (0, task_replay_shared_1.iso)(task.resumed_at || recovery.recovered_at || recovery.revalidated_at),
            result: task.resumed_at ? "resumed" : recovery.state === "needs_user" ? "needs_user" : "waiting",
        });
        return rows;
    }).sort((a, b) => a.interruptedAt.localeCompare(b.interruptedAt));
}
function buildTaskReplayPresentation(input) {
    const chapters = buildChapters(input);
    const acceptanceMatrix = buildAcceptanceMatrix(input);
    const attempts = buildAttempts(input);
    const issues = buildIssues(input);
    const recoveryJourney = buildRecoveryJourney(input);
    const integrity = buildIntegrity(input);
    const causalChain = buildCausalChain(input, acceptanceMatrix);
    const attemptComparisons = buildAttemptComparisons(input, attempts);
    const actionCenter = buildActionCenter(input);
    const outcomeStatus = normalizedOutcome(input.status);
    const unresolvedIssueCount = issues.filter(row => row.status === "open").length;
    const current = chapters.find(row => row.status === "running") || [...chapters].reverse().find(row => row.eventIds.length) || chapters[0];
    const delivery = input.deliveries.find(row => row.final_report || row.user_report || row.headline) || input.deliveries[0];
    const satisfied = acceptanceMatrix.filter(row => row.status === "satisfied").length;
    const stale = acceptanceMatrix.filter(row => row.status === "stale").length;
    const headline = outcomeStatus === "completed" ? "任务已完成" : outcomeStatus === "failed" ? "任务执行失败" : outcomeStatus === "blocked" ? "任务需要处理" : outcomeStatus === "cancelled" ? "任务已取消" : `${current?.title || "任务"}进行中`;
    const summary = (0, task_replay_shared_1.safeText)(delivery?.final_report || delivery?.user_report || delivery?.headline || delivery?.detail, 1000)
        || (outcomeStatus === "completed" ? `任务已完成；${satisfied} 项验收标准具有结构化覆盖。` : current?.summary || "任务正在推进。");
    const nextAction = outcomeStatus === "running" ? (0, task_replay_shared_1.safeText)(input.plans.find(row => row.next_step)?.next_step, 500) || `继续${current?.title || "执行任务"}`
        : unresolvedIssueCount ? "处理仍未解决的问题并重新核验" : stale ? "代码或证据已变化，建议重新核验" : "查看最终交付与验证证据";
    const checksum = crypto.createHash("sha256").update(JSON.stringify({ outcomeStatus, chapters, acceptanceMatrix, attempts, issues, recoveryJourney, integrity, causalChain, attemptComparisons, actionCenter })).digest("hex");
    return {
        schema: "ccm-task-replay-presentation-v5",
        outcome: { status: outcomeStatus, headline, summary, currentStage: current?.kind || "", currentStageLabel: current?.title || "", nextAction, unresolvedIssueCount, acceptance: { total: acceptanceMatrix.length, satisfied, stale, failed: acceptanceMatrix.filter(row => row.status === "failed").length, notRun: acceptanceMatrix.filter(row => row.status === "not_run").length } },
        chapters,
        acceptanceMatrix,
        attempts,
        issues,
        recoveryJourney,
        integrity,
        causalChain,
        attemptComparisons,
        actionCenter,
        generatedAt: new Date().toISOString(),
        checksum,
        contentStored: false,
    };
}
function runTaskReplayPresentationSelfTest() {
    const presentation = buildTaskReplayPresentation({
        root: { id: "root", business_goal: "完成登录状态恢复" },
        tasks: [{ id: "root", status: "done", acceptance_criteria: "刷新后保持登录" }],
        plans: [{ task_id: "root", step_count: 2, acceptance: ["刷新后保持登录"], next_step: "" }],
        workItems: [{ id: "work", task_id: "root", target: "web", status: "completed", attempt: 2, files_changed_count: 3, verification_count: 2 }],
        deliveries: [{ task_id: "root", final_report: "登录状态恢复已经完成。", acceptance_criteria: ["刷新后保持登录"], rework_count: 1 }],
        evidence: [{ id: "ev-1", status: "available" }],
        events: [
            { id: "failed", at: "2026-08-01T00:00:00.000Z", stage: "test", status: "failed", task_id: "root", summary: "首次验证失败", evidence_ids: [] },
            { id: "passed", at: "2026-08-01T00:01:00.000Z", stage: "test", status: "passed", task_id: "root", summary: "复验通过", evidence_ids: ["ev-1"], technical: { criterion_coverage: [{ criterion: "刷新后保持登录", status: "verified", evidence_ids: ["ev-1"] }] } },
            { id: "done", at: "2026-08-01T00:02:00.000Z", stage: "completion", status: "passed", task_id: "root", summary: "完成", evidence_ids: [] },
        ],
        status: "done", acceptanceState: "accepted", startedAt: "2026-08-01T00:00:00.000Z", finishedAt: "2026-08-01T00:02:00.000Z",
    });
    const checks = {
        schema: presentation.schema === "ccm-task-replay-presentation-v5",
        six_chapters: presentation.chapters.length === 6,
        acceptance_verified: presentation.acceptanceMatrix[0]?.status === "satisfied",
        historical_failure_resolved: presentation.issues[0]?.status === "resolved",
        attempt_preserved: presentation.attempts[0]?.attempt === 2,
        integrity_present: !!presentation.integrity?.level,
        causal_chain_present: presentation.causalChain?.nodes?.length > 0,
        no_content: presentation.contentStored === false,
    };
    return { schema: "ccm-task-replay-presentation-selftest-v1", pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=task-replay-presentation.js.map