"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeTaskNotificationUserText = sanitizeTaskNotificationUserText;
exports.extractTaskNotificationTag = extractTaskNotificationTag;
exports.parseTaskNotificationsFromText = parseTaskNotificationsFromText;
exports.getCollectedOutputAgent = getCollectedOutputAgent;
exports.getCollectedOutputReceiptStatus = getCollectedOutputReceiptStatus;
exports.formatCollectedAgentOutput = formatCollectedAgentOutput;
exports.runTaskNotificationDisplaySelfTest = runTaskNotificationDisplaySelfTest;
const memory_1 = require("./memory");
const agent_receipts_1 = require("./agent-receipts");
const user_facing_text_1 = require("../../agents/user-facing-text");
const TASK_NOTIFICATION_INTERNAL_TEXT_PATTERN = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|<\s*\/?\s*task-notification|receipt-status|task-id|WorkerContextPacket|trace_id|session_id|native_session|scratchpad|raw\s+receipt|raw\s+payload|Worker\s+completed/i;
const TASK_NOTIFICATION_XML_TAG_PATTERN = /<\/?(?:task-notification|task-id|status|receipt-status|summary|result|usage|duration_ms|total_tokens|tool_uses)>/gi;
function escapeTaskNotificationText(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
function unescapeTaskNotificationText(value) {
    return String(value || "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");
}
function normalizeTaskNotificationStatus(text, receipt = null) {
    const receiptStatus = String(receipt?.status || "").trim();
    if (!receipt)
        return "missing_receipt";
    if (receiptStatus === "done")
        return "completed";
    if (receiptStatus === "failed" || (0, agent_receipts_1.checkTaskFailure)(text))
        return "failed";
    if (receiptStatus === "blocked" || receiptStatus === "needs_info")
        return "blocked";
    if (receiptStatus === "partial")
        return "partial";
    return "completed";
}
function buildTaskNotificationStatusSummary(agent, status, receiptStatus = "") {
    const name = (0, user_facing_text_1.sanitizeMainAgentRoleLanguage)(String(agent || "执行成员").trim() || "执行成员");
    const normalizedStatus = String(status || "").trim();
    const normalizedReceiptStatus = String(receiptStatus || "").trim();
    if (normalizedStatus === "missing_receipt" || normalizedReceiptStatus === "missing") {
        return `${name} 已返回结果，但缺少可验收的结构化结果说明。`;
    }
    if (normalizedStatus === "failed" || normalizedReceiptStatus === "failed") {
        return `${name} 的执行没有通过，我会根据缺口继续处理。`;
    }
    if (normalizedStatus === "blocked" || ["blocked", "needs_info"].includes(normalizedReceiptStatus)) {
        return `${name} 遇到阻塞，需要补充信息或调整后继续。`;
    }
    if (normalizedStatus === "partial" || normalizedReceiptStatus === "partial") {
        return `${name} 只完成了部分工作，我会继续跟进剩余缺口。`;
    }
    return `${name} 已提交结果说明，我正在汇总验收。`;
}
function sanitizeTaskNotificationUserText(value, fallback = "", max = 600) {
    const fallbackText = (0, memory_1.compactMemoryText)((0, user_facing_text_1.sanitizeMainAgentRoleLanguage)(fallback || "执行成员已返回结果，我正在汇总验收。"), max);
    const raw = String(value || "").trim();
    if (!raw)
        return fallbackText;
    const normalizedRaw = raw
        .replace(/Worker completed without\s+CCM_AGENT_RECEIPT/gi, "执行成员已返回结果，但缺少可验收的结构化结果说明");
    const beforeReceipt = normalizedRaw.split(/CCM_AGENT_RECEIPT/i)[0].trim();
    const source = beforeReceipt && beforeReceipt.length >= 8 ? beforeReceipt : normalizedRaw;
    const text = (0, user_facing_text_1.sanitizeMainAgentRoleLanguage)((0, memory_1.compactMemoryText)(source, max)
        .replace(TASK_NOTIFICATION_XML_TAG_PATTERN, " ")
        .replace(/Worker completed without\s+CCM_AGENT_RECEIPT/gi, "执行成员已返回结果，但缺少可验收的结构化结果说明")
        .replace(/CCM_AGENT_RECEIPT/gi, "结构化结果说明")
        .replace(/CCM_AGENT_REQUESTS/gi, "内部协作请求")
        .replace(/task-notification/gi, "执行成员完成通知")
        .replace(/receipt-status/gi, "结果说明状态")
        .replace(/task-id/gi, "执行成员")
        .replace(/\bWorker\b/g, "执行成员")
        .replace(/WorkerContextPacket/gi, "任务上下文包")
        .replace(/\b(?:trace_id|session_id|native_session|scratchpad|runtime kernel|workflow_timeline)\s*[:=]\s*[\w.-]+/gi, " ")
        .replace(/trace_id|session_id|native_session|scratchpad/gi, "技术详情")
        .replace(/raw\s+receipt|raw\s+payload/gi, "底层执行数据")
        .replace(/回执/g, "结果说明")
        .replace(/\s+/g, " ")
        .replace(/\s+([。！？；，、,.!?;:])/g, "$1")
        .replace(/([。！？])\s*([。！？])+/g, "$1")
        .trim());
    if (!text)
        return fallbackText;
    return TASK_NOTIFICATION_INTERNAL_TEXT_PATTERN.test(text) ? fallbackText : (0, memory_1.compactMemoryText)(text, max);
}
function buildTaskNotificationSummary(agent, text, receipt, status) {
    const fallback = buildTaskNotificationStatusSummary(agent, status, receipt?.status || "missing");
    if (!receipt)
        return fallback;
    return sanitizeTaskNotificationUserText(receipt.summary || text, fallback, 240);
}
function buildTaskNotification(agent, text, receipt = null) {
    const status = normalizeTaskNotificationStatus(text, receipt);
    const summary = buildTaskNotificationSummary(agent, text, receipt, status);
    const result = sanitizeTaskNotificationUserText(text, summary, 1800);
    return [
        "<task-notification>",
        `<task-id>${escapeTaskNotificationText(agent)}</task-id>`,
        `<status>${escapeTaskNotificationText(status)}</status>`,
        `<receipt-status>${escapeTaskNotificationText(receipt?.status || "missing")}</receipt-status>`,
        `<summary>${escapeTaskNotificationText(summary)}</summary>`,
        `<result>${escapeTaskNotificationText(result)}</result>`,
        `<usage><duration_ms>0</duration_ms></usage>`,
        "</task-notification>",
    ].join("\n");
}
function extractTaskNotificationTag(text, tag) {
    const pattern = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
    const match = String(text || "").match(pattern);
    return match ? unescapeTaskNotificationText(match[1].trim()) : "";
}
function parseTaskNotificationsFromText(text) {
    const raw = String(text || "");
    const blocks = [...raw.matchAll(/<task-notification>([\s\S]*?)<\/task-notification>/gi)];
    return blocks.map((match) => {
        const block = `<task-notification>${match[1]}</task-notification>`;
        const taskId = extractTaskNotificationTag(block, "task-id");
        const status = extractTaskNotificationTag(block, "status");
        const receiptStatus = extractTaskNotificationTag(block, "receipt-status");
        const fallback = buildTaskNotificationStatusSummary(taskId, status, receiptStatus);
        const summary = sanitizeTaskNotificationUserText(extractTaskNotificationTag(block, "summary"), fallback, 600);
        const result = sanitizeTaskNotificationUserText(extractTaskNotificationTag(block, "result"), summary || fallback, 1000);
        return {
            task_id: taskId,
            status,
            receipt_status: receiptStatus,
            summary,
            result,
        };
    }).filter((item) => item.task_id || item.status || item.summary);
}
function getCollectedOutputAgent(output) {
    const notificationAgent = extractTaskNotificationTag(output, "task-id");
    if (notificationAgent)
        return notificationAgent;
    return (String(output || "").match(/^【([^】]+)】/) || [])[1]?.trim() || "";
}
function getCollectedOutputReceiptStatus(output) {
    const receiptStatus = extractTaskNotificationTag(output, "receipt-status");
    if (receiptStatus)
        return receiptStatus;
    return (String(output || "").match(/-\s*状态：\s*([a-zA-Z_]+)/) || [])[1]?.trim() || "";
}
function formatCollectedAgentOutput(agent, text, receipt = null) {
    const body = String(text || "").trim();
    return [
        buildTaskNotification(agent, body, receipt),
        "",
        `【${agent}】`,
        body,
        "",
        (0, agent_receipts_1.formatAgentReceiptForReview)(receipt),
    ].join("\n");
}
function runTaskNotificationDisplaySelfTest() {
    const missingReceiptOutput = formatCollectedAgentOutput("web-app", "已处理页面入口，但未提交回执。", null);
    const completedOutput = formatCollectedAgentOutput("backend-service", "已实现退款审核接口。\n\nCCM_AGENT_RECEIPT {\"status\":\"done\"}", {
        agent: "backend-service",
        status: "done",
        summary: "完成退款审核接口",
        actions: ["实现 POST /api/refunds/:id/audit"],
        filesChanged: ["src/refunds/audit.ts"],
        verification: ["npm test passed"],
        blockers: [],
        needs: [],
    });
    const missing = parseTaskNotificationsFromText(missingReceiptOutput)[0] || {};
    const completed = parseTaskNotificationsFromText(completedOutput)[0] || {};
    const visiblePayload = JSON.stringify([
        { summary: missing.summary, result: missing.result },
        { summary: completed.summary, result: completed.result },
    ]);
    const checks = {
        keepsInternalEnvelopeForCoordinator: missingReceiptOutput.includes("<task-notification>") && missingReceiptOutput.includes("<receipt-status>"),
        missingReceiptSummaryFriendly: String(missing.summary || "").includes("结构化结果说明") && String(missing.summary || "").includes("web-app"),
        missingReceiptResultKeepsUsefulText: String(missing.result || "").includes("已处理页面入口"),
        completedSummaryPreserved: completed.summary === "完成退款审核接口",
        visibleNotificationTextHidesProtocol: !/CCM_AGENT_RECEIPT|task-notification|receipt-status|Worker completed|trace_id|session_id|raw receipt|raw payload|回执/i.test(visiblePayload),
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
        samples: {
            missing,
            completed,
        },
    };
}
//# sourceMappingURL=agent-notifications.js.map