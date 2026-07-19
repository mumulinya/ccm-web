"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.independentReviewVerdictState = independentReviewVerdictState;
exports.parseIndependentReviewLine = parseIndependentReviewLine;
exports.collectIndependentReviewEvidence = collectIndependentReviewEvidence;
exports.buildIndependentReviewGate = buildIndependentReviewGate;
exports.buildAcceptanceGate = buildAcceptanceGate;
exports.taskRequiresCodeChanges = taskRequiresCodeChanges;
exports.selectLatestDurableReceipts = selectLatestDurableReceipts;
exports.buildDeliverySummary = buildDeliverySummary;
exports.getTaskExecutionFromReceipt = getTaskExecutionFromReceipt;
exports.getGroupTaskExecutionStatus = getGroupTaskExecutionStatus;
const memory_1 = require("./memory");
const agent_qa_service_1 = require("./agent-qa-service");
const post_review_spot_check_1 = require("../../agents/post-review-spot-check");
const agent_receipts_1 = require("./agent-receipts");
const agent_notifications_1 = require("./agent-notifications");
const collaboration_runtime_task_queue_1 = require("./collaboration-runtime-task-queue");
const collaboration_runtime_daily_dev_1 = require("./collaboration-runtime-daily-dev");
const collaboration_runtime_cross_agent_runtime_1 = require("./collaboration-runtime-cross-agent-runtime");
const collaboration_runtime_status_helpers_part_01_1 = require("./collaboration-runtime-status-helpers-part-01");
function independentReviewVerdictState(value) {
    const text = String(value || "").trim();
    if (!text)
        return "unknown";
    const normalized = text.toLowerCase();
    const riskText = normalized
        .replace(/未发现.{0,20}(?:阻塞|问题|风险|缺陷)/g, "")
        .replace(/无.{0,12}(?:阻塞|问题|风险|缺陷)/g, "")
        .replace(/\bno\s+(?:blocking\s+)?(?:blockers?|issues?|risks?|critical\s+issues?)\b/g, "")
        .replace(/\bwithout\s+(?:blocking\s+)?(?:blockers?|issues?|risks?)\b/g, "");
    if (/needs?[_\s-]*recheck|recheck|需复验|重新复验|重新验证|复核.{0,18}(?:未闭环|没有闭环)|证据.{0,18}(?:未闭环|没有闭环)/.test(normalized))
        return "needs_recheck";
    if (/needs?[_\s-]*environment|补齐环境|补充环境|环境.{0,18}(?:阻塞|不足|缺失)|登录条件.{0,18}(?:阻塞|不足|缺失)|运行条件.{0,18}(?:阻塞|不足|缺失)/.test(normalized))
        return "needs_environment";
    if (/needs?[_\s-]*(?:human|user)|需要人工确认|等待用户确认|等你确认|待确认/.test(normalized))
        return "needs_user";
    if (/fail|failed|reject|rejected|block|blocked|问题|风险未解决|不通过|未通过|拒绝|阻塞/.test(riskText))
        return "failed";
    if (/pass|passed|approve|approved|lgtm|ok|success|通过|批准|已复核|无阻塞|无高风险/.test(normalized))
        return "passed";
    return "unknown";
}
function normalizeIndependentReviewEntry(raw, fallback = {}) {
    const item = typeof raw === "string" ? { summary: raw } : raw;
    if (!item || typeof item !== "object")
        return null;
    const verdict = String(item.verdict || item.status || item.result || fallback.verdict || "").trim();
    const summary = String(item.summary || item.note || item.comment || item.message || fallback.summary || "").trim();
    const evidence = (0, collaboration_runtime_status_helpers_part_01_1.uniqueStrings)(item.evidence, item.checks, item.findings, item.filesReviewed, item.files_reviewed, fallback.evidence).slice(0, 12);
    const reviewer = String(item.reviewer || item.agent || item.by || item.reviewedBy || item.reviewed_by || fallback.reviewer || "").trim();
    const requester = String(item.requester || item.from_agent || fallback.requester || "").trim();
    const reviewSubject = String(item.reviewSubject || item.review_subject || item.subject || fallback.reviewSubject || fallback.review_subject || "").trim();
    if (!reviewer && !verdict && !summary && evidence.length === 0)
        return null;
    const state = independentReviewVerdictState([verdict, summary, ...evidence].join("\n"));
    return {
        reviewer,
        requester,
        reviewSubject,
        verdict: verdict || state,
        status: state,
        summary: (0, memory_1.compactMemoryText)(summary || evidence.join("；") || "独立复核已记录", 700),
        evidence,
        source: fallback.source || "receipt",
        qa_id: fallback.qa_id || "",
    };
}
function parseIndependentReviewLine(value) {
    const text = String(value || "").trim();
    if (!text || ["无", "暂无", "未提供", "未填写"].includes(text))
        return [];
    return (0, collaboration_runtime_status_helpers_part_01_1.splitEvidenceList)(text).map((item) => {
        const parts = item.split(/\s+-\s+/).map(part => part.trim()).filter(Boolean);
        const subjectPart = parts.find(part => /^(?:复核对象|reviewSubject|review_subject|subject)\s*[:=：]\s*/i.test(part)) || "";
        const reviewSubject = subjectPart.replace(/^(?:复核对象|reviewSubject|review_subject|subject)\s*[:=：]\s*/i, "").trim();
        const summaryParts = parts.slice(2).filter(part => part !== subjectPart);
        return normalizeIndependentReviewEntry({
            reviewer: parts[0] || "",
            verdict: parts[1] || "",
            reviewSubject,
            summary: summaryParts.join(" - ") || item,
        });
    }).filter(Boolean);
}
function collectIndependentReviewEvidence(receipts = [], agentQa = []) {
    const evidence = [];
    for (const receipt of receipts || []) {
        const reviewItems = [
            ...(Array.isArray(receipt?.independentReview) ? receipt.independentReview : []),
            ...(Array.isArray(receipt?.independent_review) ? receipt.independent_review : []),
            ...(Array.isArray(receipt?.codeReview) ? receipt.codeReview : []),
            ...(Array.isArray(receipt?.code_review) ? receipt.code_review : []),
        ];
        for (const review of reviewItems) {
            const normalized = normalizeIndependentReviewEntry(review, {
                source: "receipt_independent_review",
                reviewer: review?.reviewer || receipt?.reviewer || receipt?.agent || "",
                requester: receipt?.agent || "",
                reviewSubject: review?.reviewSubject || review?.review_subject || receipt?.reviewSubject || receipt?.review_subject || "",
            });
            if (normalized)
                evidence.push(normalized);
        }
        if (reviewItems.length === 0 && /review|verifier|verification|qa|tester|审查|复核|验证/i.test(String(receipt?.role || ""))) {
            const normalized = normalizeIndependentReviewEntry({
                reviewer: receipt?.reviewer || receipt?.agent,
                verdict: receipt?.status === "done" ? "passed" : receipt?.status,
                summary: receipt?.summary,
                evidence: (0, collaboration_runtime_status_helpers_part_01_1.uniqueStrings)(receipt?.actions, receipt?.verification, receipt?.filesChanged),
            }, { source: "reviewer_receipt", requester: receipt?.target || "" });
            if (normalized)
                evidence.push(normalized);
        }
    }
    for (const qa of agentQa || []) {
        if (String(qa?.type || "") !== "request_review")
            continue;
        const accepted = qa?.acceptance?.accepted === true;
        const resumed = qa?.status === "resumed" || !!qa?.resumed_at || qa?.status === "injected" || qa?.status === "answered";
        const normalized = normalizeIndependentReviewEntry({
            reviewer: qa?.to_agent,
            verdict: accepted && resumed ? "passed" : qa?.status || "pending",
            summary: qa?.answer || qa?.acceptance?.reason || qa?.question,
            evidence: qa?.answer_evidence || qa?.evidence || [],
        }, {
            source: "agent_qa_request_review",
            requester: qa?.from_agent,
            qa_id: qa?.id || "",
        });
        if (normalized)
            evidence.push(normalized);
    }
    const latestReviewKeys = new Set();
    const exactKeys = new Set();
    const latestEvidence = [];
    for (const item of [...evidence].reverse()) {
        const reviewer = String(item?.reviewer || "").trim().toLowerCase();
        const subject = String(item?.reviewSubject || "").trim().toLowerCase();
        const reviewKey = reviewer && subject ? `${reviewer}|${subject}` : "";
        if (reviewKey) {
            if (latestReviewKeys.has(reviewKey))
                continue;
            latestReviewKeys.add(reviewKey);
        }
        else {
            const exactKey = `${item.source}|${item.reviewer}|${item.requester}|${item.verdict}|${item.summary}`;
            if (exactKeys.has(exactKey))
                continue;
            exactKeys.add(exactKey);
        }
        latestEvidence.push(item);
    }
    return latestEvidence.reverse().slice(0, 20);
}
function buildIndependentReviewGate(task, actualFileChanges = [], receipts = [], agentQa = []) {
    return require("./collaboration-acceptance").buildIndependentReviewGate(task, actualFileChanges, receipts, agentQa);
}
function buildAcceptanceGate(task, execution, summary, finalStatus) {
    return require("./collaboration-acceptance").buildAcceptanceGate(task, execution, summary, finalStatus);
}
function taskRequiresCodeChanges(task) {
    if (task?.requires_code_changes === false || task?.requiresCodeChanges === false)
        return false;
    return task?.workflow_type === "daily_dev";
}
function selectLatestDurableReceipts(receiptCandidates = []) {
    return require("./collaboration-acceptance").selectLatestDurableReceipts(receiptCandidates);
}
function buildDeliverySummary(task, execution, finalStatus) {
    return require("./collaboration-acceptance").buildDeliverySummary(task, execution, finalStatus);
}
function getTaskExecutionFromReceipt(response, receipt, details = {}) {
    return require("./collaboration-acceptance").getTaskExecutionFromReceipt(response, receipt, details);
}
function getGroupTaskExecutionStatus(review, coordinatorResult, outputText, task = null) {
    const dispatchPolicy = coordinatorResult?.dispatchPolicy || {};
    const action = String(dispatchPolicy.action || "");
    const runtime = String(coordinatorResult?.runtime || "");
    const isDailyDev = task?.workflow_type === "daily_dev";
    const receipts = (0, collaboration_runtime_status_helpers_part_01_1.parseFormattedReceiptsFromText)(outputText);
    const childReceipts = receipts.filter((receipt) => receipt.agent && receipt.agent !== coordinatorResult?.agent);
    const workerNotifications = (0, agent_notifications_1.parseTaskNotificationsFromText)(outputText);
    const verificationGate = (0, collaboration_runtime_status_helpers_part_01_1.getVerificationEvidenceGate)(childReceipts);
    const requiredVerificationCoverage = (0, collaboration_runtime_status_helpers_part_01_1.getRequiredVerificationCoverage)(childReceipts);
    const actualChangesForTask = isDailyDev ? (0, collaboration_runtime_status_helpers_part_01_1.collectTaskActualFileChanges)(task, {}) : [];
    const coordinatorEvidence = {
        assignments: (0, collaboration_runtime_task_queue_1.normalizePlanAssignments)(Array.isArray(coordinatorResult?.assignments) ? coordinatorResult.assignments : []),
        coordinationPlan: coordinatorResult?.coordinationPlan || null,
        dispatchPolicy,
        executionOrder: coordinatorResult?.executionOrder || "parallel",
        coordinatorRuntime: runtime,
        coordinatorAgent: coordinatorResult?.agent || "",
    };
    const childAgents = (0, collaboration_runtime_status_helpers_part_01_1.uniqueStrings)(childReceipts.map((receipt) => receipt.agent));
    const assignedProjects = new Set(coordinatorEvidence.assignments.map((item) => String(item.project || item.targetName || "").trim()).filter(Boolean));
    const notifiedProjects = new Set(workerNotifications.map((item) => String(item.task_id || "").trim()).filter(Boolean));
    const coordinationPlan = coordinatorEvidence.coordinationPlan || {};
    const hasCoordinationPlan = !!coordinationPlan && (Array.isArray(coordinationPlan.phases) && coordinationPlan.phases.length > 0
        || Array.isArray(coordinationPlan.targets) && coordinationPlan.targets.length > 0
        || String(coordinationPlan.strategy || "").trim());
    const missingAssignedProjects = childAgents.filter((agent) => !(0, collaboration_runtime_cross_agent_runtime_1.isCoordinatorTestAgentName)(agent) && !assignedProjects.has(agent));
    const missingWorkerNotifications = childAgents.filter((agent) => !notifiedProjects.has(agent));
    const buildGroupResult = (status, details = {}) => (0, collaboration_runtime_status_helpers_part_01_1.buildTaskExecutionResult)(status, outputText, {
        ...coordinatorEvidence,
        ...details,
    });
    if (/llm-error|llm-not-configured/.test(runtime) || (0, agent_receipts_1.checkTaskFailure)(outputText)) {
        return buildGroupResult("failed", {
            review,
            detail: runtime ? `主 Agent 运行失败：${runtime}` : "协作输出包含失败标记",
        });
    }
    const hasExecutedDailyDevWorkers = isDailyDev && childReceipts.length > 0;
    if ((dispatchPolicy.requiresConfirmation || action === "ask_user" || action === "hold") && !hasExecutedDailyDevWorkers) {
        return buildGroupResult("waiting", {
            review,
            detail: dispatchPolicy.reason || "主 Agent 需要用户确认后继续",
        });
    }
    if (isDailyDev && childReceipts.length === 0) {
        return buildGroupResult("waiting", {
            review,
            detail: "业务开发任务缺少子 Agent 结果说明，不能判定完成；主 Agent 需要派发至少一个项目 Agent 执行代码工作或明确等待用户调整范围",
        });
    }
    if (isDailyDev && childReceipts.some((receipt) => receipt.status !== "done")) {
        const failed = childReceipts
            .filter((receipt) => receipt.status === "failed")
            .map((receipt) => `${receipt.agent}:${receipt.summary || receipt.blockers?.join("；") || "failed"}`)
            .join("；");
        if (failed) {
            return buildGroupResult("failed", {
                review,
                detail: `业务开发任务子 Agent 执行失败：${failed}`,
            });
        }
        const pending = childReceipts
            .filter((receipt) => receipt.status !== "done")
            .map((receipt) => `${receipt.agent}:${receipt.status}`)
            .join("；");
        return buildGroupResult("waiting", {
            review,
            detail: `业务开发任务仍有子 Agent 未完成：${pending}`,
        });
    }
    const doneReceiptsWithOpenNeeds = childReceipts.filter((receipt) => receipt.status === "done" && (0, collaboration_runtime_status_helpers_part_01_1.receiptHasOpenNeeds)(receipt, task));
    if (isDailyDev && doneReceiptsWithOpenNeeds.length > 0) {
        const open = doneReceiptsWithOpenNeeds
            .map((receipt) => `${receipt.agent}:${[...((0, collaboration_runtime_status_helpers_part_01_1.splitEvidenceList)(receipt.blockers || [])), ...((0, collaboration_runtime_status_helpers_part_01_1.splitEvidenceList)(receipt.needs || []))].join("；")}`)
            .join("；");
        return buildGroupResult("waiting", {
            review,
            detail: `业务开发任务子 Agent 结果说明仍有未解决阻塞/需要补充：${open}`,
        });
    }
    if (isDailyDev && (0, collaboration_runtime_daily_dev_1.taskRequiresAgentQa)(task)) {
        const qaGate = (0, collaboration_runtime_daily_dev_1.getTaskAgentQaGate)(task);
        if (!qaGate.pass) {
            return buildGroupResult("waiting", {
                review,
                detail: `任务明确要求 Agent 协作问答，但证据不足：问答 ${qaGate.total}，已采纳 ${qaGate.accepted}，已唤醒续跑 ${qaGate.resumed}。主 Agent 必须让相关子 Agent 通过 ask_agent 提问、采纳带证据回答并恢复原任务会话后再验收。`,
                agentQaGate: qaGate,
            });
        }
    }
    if (isDailyDev && !hasCoordinationPlan) {
        return buildGroupResult("waiting", {
            review,
            detail: "业务开发任务缺少主 Agent 协调计划证据，不能判定完成",
        });
    }
    if (isDailyDev && coordinatorEvidence.assignments.length === 0) {
        return buildGroupResult("waiting", {
            review,
            detail: "业务开发任务缺少主 Agent 派发子 Agent 的 assignment evidence，不能判定完成",
        });
    }
    if (isDailyDev && missingAssignedProjects.length > 0) {
        return buildGroupResult("waiting", {
            review,
            detail: `业务开发任务缺少目标子 Agent 的派发证据：${missingAssignedProjects.join("、")}`,
        });
    }
    if (isDailyDev && missingWorkerNotifications.length > 0) {
        return buildGroupResult("waiting", {
            review,
            detail: `业务开发任务缺少目标子 Agent 的 task-notification：${missingWorkerNotifications.join("、")}`,
        });
    }
    if (isDailyDev && !review) {
        return buildGroupResult("waiting", {
            detail: "业务开发任务缺少主 Agent 最终复盘，不能判定完成",
        });
    }
    if (isDailyDev && taskRequiresCodeChanges(task) && actualChangesForTask.length === 0) {
        return buildGroupResult("waiting", {
            review,
            detail: "业务开发任务缺少系统实际捕获的代码变更，不能判定完成；请让子 Agent 执行代码修改，或在创建任务时关闭代码变更要求",
        });
    }
    if (isDailyDev && (0, collaboration_runtime_status_helpers_part_01_1.taskRequiresVerification)(task) && !verificationGate.pass) {
        const failed = verificationGate.failed.length ? `失败验证：${verificationGate.failed.join("；")}` : "";
        const suggested = verificationGate.suggested.length ? `仅建议/未执行验证：${verificationGate.suggested.join("；")}` : "";
        return buildGroupResult("waiting", {
            review,
            detail: ["业务开发任务缺少可验收的已执行验证记录，不能判定完成", failed, suggested].filter(Boolean).join("；"),
        });
    }
    if (isDailyDev && (0, collaboration_runtime_status_helpers_part_01_1.taskRequiresVerification)(task) && !requiredVerificationCoverage.pass) {
        const missing = requiredVerificationCoverage.missing
            .map((item) => `${item.agent}: ${item.required.join(" / ")}`)
            .join("；");
        return buildGroupResult("waiting", {
            review,
            detail: `业务开发任务缺少项目配置验证命令的执行证据，不能判定完成；缺失：${missing}`,
        });
    }
    if (isDailyDev) {
        const agentQaForTask = task?.group_id
            ? (0, agent_qa_service_1.getAgentQaItemsForGroup)(String(task.group_id), 120).filter((item) => !task?.id || !item.task_id || item.task_id === task.id)
            : [];
        const independentReviewGate = buildIndependentReviewGate(task, actualChangesForTask, childReceipts, agentQaForTask);
        if (independentReviewGate.required && !independentReviewGate.pass) {
            return buildGroupResult("waiting", {
                review,
                detail: `复杂代码变更还缺少独立复核，不能判定完成；原因：${independentReviewGate.reason}`,
                independentReviewGate,
            });
        }
        const postReviewSpotCheckGate = (0, post_review_spot_check_1.buildPostReviewSpotCheckGate)({
            required: independentReviewGate.required && independentReviewGate.pass,
            receipts: childReceipts,
        });
        if (postReviewSpotCheckGate.required && !postReviewSpotCheckGate.pass) {
            return buildGroupResult("waiting", {
                review,
                detail: `TestAgent 已通过，但主 Agent 的完成前抽查尚未通过；原因：${postReviewSpotCheckGate.reason}`,
                independentReviewGate,
                postReviewSpotCheckGate,
            });
        }
    }
    if (review) {
        const status = String(review.status || "");
        if (status === "complete") {
            return buildGroupResult("done", { review, detail: "主 Agent 复盘判定完成" });
        }
        if (status === "needs_user" || status === "needs_followup") {
            return buildGroupResult("waiting", { review, detail: status === "needs_user" ? "主 Agent 需要用户补充" : "主 Agent 仍发现返工项" });
        }
    }
    if (Array.isArray(coordinatorResult?.assignments) && coordinatorResult.assignments.length > 0) {
        return buildGroupResult("waiting", {
            review,
            detail: "已派发子 Agent，但缺少最终复盘完成证据",
        });
    }
    return buildGroupResult("done", {
        review,
        detail: "我已直接处理且未产生子任务",
    });
}
//# sourceMappingURL=collaboration-runtime-status-helpers-part-02.js.map